use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize, Default)]
struct DownloadConfig {
    download_base_dir: Option<String>,
}

fn config_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap()
        .join("downloads-config.json")
}

fn load_config(app: &tauri::AppHandle) -> DownloadConfig {
    let path = config_path(app);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_config(app: &tauri::AppHandle, config: &DownloadConfig) {
    let path = config_path(app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(&path, serde_json::to_string_pretty(config).unwrap());
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

/// Read a local file and return its contents as a base64 data URL.
#[tauri::command]
fn read_file_as_data_url(path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read {path}: {e}"))?;
    let mime = if path.to_lowercase().ends_with(".pdf") {
        "application/pdf"
    } else {
        "application/octet-stream"
    };
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
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

    if filename.contains('/') || filename.contains('\\') || filename.contains("..") {
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
