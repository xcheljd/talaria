use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize, Default)]
struct DownloadConfig {
    download_base_dir: Option<String>,
}

/// Largest file we'll read back as a data URL. Promotion PDFs are small; this
/// is a guard against a dropped path pointing at something huge.
const MAX_READ_BYTES: u64 = 25 * 1024 * 1024; // 25 MB

/// Reject filenames that could escape the configured download directory.
fn is_safe_filename(filename: &str) -> bool {
    !filename.is_empty()
        && !filename.contains('/')
        && !filename.contains('\\')
        && !filename.contains("..")
}

/// Only PDFs may be read back as data URLs (the drag-and-drop attachment flow).
fn has_pdf_extension(path: &str) -> bool {
    path.to_lowercase().ends_with(".pdf")
}

/// Path to downloads-config.json, or None if the OS data dir can't be resolved.
fn config_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join("downloads-config.json"))
}

fn load_config(app: &tauri::AppHandle) -> DownloadConfig {
    config_path(app)
        .and_then(|path| fs::read_to_string(&path).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_config(app: &tauri::AppHandle, config: &DownloadConfig) {
    let Some(path) = config_path(app) else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(config) {
        let _ = fs::write(&path, json);
    }
}

#[tauri::command]
fn get_download_dir(app: tauri::AppHandle) -> String {
    load_config(&app).download_base_dir.unwrap_or_else(|| {
        dirs::download_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .to_string_lossy()
            .to_string()
    })
}

#[tauri::command]
async fn choose_download_dir(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let current = get_download_dir(app.clone());

    let folder = app
        .dialog()
        .file()
        .set_directory(&current)
        .set_title("Choose folder for email downloads")
        .blocking_pick_folder();

    match folder {
        Some(file_path) => {
            // FilePath implements Display, so we can use to_string() directly
            let path_str = file_path.to_string();
            let mut config = load_config(&app);
            config.download_base_dir = Some(path_str.clone());
            save_config(&app, &config);
            Ok(path_str)
        }
        None => Err("No folder selected".to_string()),
    }
}

/// Read a local PDF and return its contents as a base64 data URL.
/// Restricted to `.pdf` files under `MAX_READ_BYTES` so the webview can't ask
/// the backend to read arbitrary files off disk.
#[tauri::command]
fn read_file_as_data_url(path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    if !has_pdf_extension(&path) {
        return Err(format!("Refusing to read non-PDF file: {path}"));
    }

    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to read {path}: {e}"))?;
    if metadata.len() > MAX_READ_BYTES {
        return Err(format!(
            "File too large to read ({} bytes, max {MAX_READ_BYTES})",
            metadata.len()
        ));
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read {path}: {e}"))?;
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:application/pdf;base64,{b64}"))
}

/// Save a base64-encoded blob to the configured download directory.
/// Returns the absolute path of the written file on success.
#[tauri::command]
fn save_file_to_dir(
    app: tauri::AppHandle,
    filename: String,
    data_base64: String,
) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    if !is_safe_filename(&filename) {
        return Err(format!("Refusing to write unsafe filename: {filename}"));
    }

    let dir = get_download_dir(app.clone());
    let dir_path = PathBuf::from(&dir);
    if !dir_path.exists() {
        fs::create_dir_all(&dir_path)
            .map_err(|e| format!("Failed to create directory {dir}: {e}"))?;
    }

    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("Invalid base64 payload: {e}"))?;

    let final_path = dir_path.join(&filename);
    fs::write(&final_path, &bytes)
        .map_err(|e| format!("Failed to write {}: {e}", final_path.display()))?;

    Ok(final_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_download_dir,
            choose_download_dir,
            read_file_as_data_url,
            save_file_to_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_path_traversal_filenames() {
        assert!(!is_safe_filename("../secret.txt"));
        assert!(!is_safe_filename("dir/file.eml"));
        assert!(!is_safe_filename("dir\\file.eml"));
        assert!(!is_safe_filename("..\\..\\etc\\passwd"));
        assert!(!is_safe_filename(""));
    }

    #[test]
    fn accepts_plain_download_filenames() {
        assert!(is_safe_filename("promo-batch-001.eml"));
        assert!(is_safe_filename("promo-email-draft.2026-06-13.emltpl"));
        assert!(is_safe_filename("promotion-template-2026-06-13.json"));
    }

    #[test]
    fn only_pdf_paths_are_readable() {
        assert!(has_pdf_extension("/home/user/flyer.pdf"));
        assert!(has_pdf_extension("/home/user/FLYER.PDF"));
        assert!(!has_pdf_extension("/etc/passwd"));
        assert!(!has_pdf_extension("/home/user/notes.txt"));
        assert!(!has_pdf_extension("/home/user/evil.pdf.exe"));
    }
}
