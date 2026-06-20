use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

mod pdf_optimize;

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

/// Validate a path the webview asked us to read: it must point at an existing,
/// regular `.pdf` file. Canonicalization collapses `..` and resolves symlinks,
/// so a crafted path can't smuggle the read somewhere unexpected.
fn validate_readable_pdf(path: &str) -> Result<PathBuf, String> {
    if path.is_empty() {
        return Err("Empty path".to_string());
    }
    if !has_pdf_extension(path) {
        return Err(format!("Refusing to read non-PDF file: {path}"));
    }
    let canonical = fs::canonicalize(path)
        .map_err(|e| format!("Failed to resolve {path}: {e}"))?;
    if !has_pdf_extension(&canonical.to_string_lossy()) {
        return Err(format!("Refusing to read non-PDF file: {path}"));
    }
    let meta = fs::metadata(&canonical)
        .map_err(|e| format!("Failed to read {path}: {e}"))?;
    if !meta.is_file() {
        return Err(format!("Not a regular file: {path}"));
    }
    Ok(canonical)
}

/// Read a local PDF and return its contents as a base64 data URL. The path is
/// canonicalized and must resolve to an existing regular `.pdf` file under
/// `MAX_READ_BYTES`. This supports the drag-and-drop attach flow, where the
/// user supplies the file location; it does not let the webview read non-PDF
/// files or traverse via `..`/symlinks to a non-PDF target.
#[tauri::command]
fn read_file_as_data_url(path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let canonical = validate_readable_pdf(&path)?;

    let metadata = fs::metadata(&canonical).map_err(|e| format!("Failed to read {path}: {e}"))?;
    if metadata.len() > MAX_READ_BYTES {
        return Err(format!(
            "File too large to read ({} bytes, max {MAX_READ_BYTES})",
            metadata.len()
        ));
    }

    let bytes = fs::read(&canonical).map_err(|e| format!("Failed to read {path}: {e}"))?;
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

/// Save a base64-encoded blob via a native "Save As" dialog, so the user
/// chooses the destination and the OS handles overwrite confirmation. Returns
/// the chosen path, or `None` if the user cancelled. Used for single,
/// user-initiated downloads (e.g. the PDF preview) where silently overwriting a
/// same-named file would be surprising; batch exports keep `save_file_to_dir`.
#[tauri::command]
async fn save_file_as(
    app: tauri::AppHandle,
    filename: String,
    data_base64: String,
) -> Result<Option<String>, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use tauri_plugin_dialog::DialogExt;

    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("Invalid base64 payload: {e}"))?;

    let start_dir = get_download_dir(app.clone());

    let chosen = app
        .dialog()
        .file()
        .set_directory(&start_dir)
        .set_file_name(&filename)
        .set_title("Save file")
        .blocking_save_file();

    match chosen {
        Some(path) => {
            let pb = path
                .into_path()
                .map_err(|e| format!("Invalid save path: {e}"))?;
            fs::write(&pb, &bytes)
                .map_err(|e| format!("Failed to write {}: {e}", pb.display()))?;
            Ok(Some(pb.to_string_lossy().to_string()))
        }
        // User cancelled the dialog — not an error.
        None => Ok(None),
    }
}

/// Optimize an attached PDF, returning a (possibly smaller) base64 data URL.
///
/// Decodes the `data:application/pdf;base64,...` URL, downsamples
/// over-resolution embedded JPEGs (see [`pdf_optimize`]), and re-encodes the
/// result. On any failure — or if optimization doesn't shrink the file — the
/// original data URL is returned unchanged, so callers can use the result
/// directly without special-casing errors.
#[tauri::command]
fn optimize_pdf(data_url: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let Some(comma) = data_url.find(',') else {
        return Err("Not a data URL".to_string());
    };
    let b64 = &data_url[comma + 1..];
    let bytes = STANDARD
        .decode(b64.as_bytes())
        .map_err(|e| format!("Invalid base64 payload: {e}"))?;

    let optimized = pdf_optimize::optimize_pdf_bytes(&bytes);

    // Reuse the original (already-valid) data URL when nothing was saved.
    if optimized.len() >= bytes.len() {
        return Ok(data_url);
    }

    let out_b64 = STANDARD.encode(&optimized);
    Ok(format!("data:application/pdf;base64,{out_b64}"))
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
            save_file_to_dir,
            save_file_as,
            optimize_pdf
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

    /// Create a unique temp dir rooted under std::env::temp_dir() using the
    /// process id and current time nanos so parallel test runs don't collide.
    fn make_test_dir(label: &str) -> PathBuf {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .subsec_nanos();
        let dir = std::env::temp_dir()
            .join(format!("cct_test_{}_{}_{}", std::process::id(), nanos, label));
        fs::create_dir_all(&dir).expect("failed to create test dir");
        dir
    }

    #[test]
    fn validate_readable_pdf_accepts_real_pdf() {
        let dir = make_test_dir("real_pdf");
        let file = dir.join("test.pdf");
        fs::write(&file, b"%PDF-1.4 fake").unwrap();

        let result = validate_readable_pdf(file.to_str().unwrap());
        assert!(result.is_ok(), "expected Ok, got {result:?}");
        assert!(result.unwrap().exists());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn validate_readable_pdf_rejects_non_pdf_extension() {
        // Non-existent path is fine — extension check happens before fs access
        let result = validate_readable_pdf("/tmp/secret_config.txt");
        assert!(result.is_err());
        let msg = result.unwrap_err();
        assert!(
            msg.contains("Refusing"),
            "unexpected error message: {msg}"
        );
    }

    #[test]
    fn validate_readable_pdf_rejects_nonexistent_pdf() {
        let result = validate_readable_pdf("/tmp/does_not_exist_at_all_cct_test.pdf");
        assert!(result.is_err());
        // canonicalize fails for a nonexistent path
        let msg = result.unwrap_err();
        assert!(
            msg.contains("Failed to resolve"),
            "unexpected error message: {msg}"
        );
    }

    #[test]
    fn validate_readable_pdf_rejects_directory_named_pdf() {
        let dir = make_test_dir("dir_pdf");
        // Create a sub-directory whose name ends in .pdf
        let fake = dir.join("not_a_file.pdf");
        fs::create_dir_all(&fake).unwrap();

        let result = validate_readable_pdf(fake.to_str().unwrap());
        assert!(result.is_err());
        let msg = result.unwrap_err();
        assert!(
            msg.contains("Not a regular file"),
            "unexpected error message: {msg}"
        );

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn validate_readable_pdf_rejects_empty_path() {
        let result = validate_readable_pdf("");
        assert!(result.is_err());
        let msg = result.unwrap_err();
        assert!(
            msg.contains("Empty path"),
            "unexpected error message: {msg}"
        );
    }
}
