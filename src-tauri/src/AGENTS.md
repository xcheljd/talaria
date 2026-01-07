# TAURI BACKEND

**Generated:** 2025-01-06T20:36:02Z
**Commit:** 8cbaba1
**Branch:** main

## OVERVIEW

Rust IPC backend for desktop app. Manages download folder configuration via Tauri dialogs.

## STRUCTURE

```
src-tauri/src/
├── main.rs                 # Entry point (calls lib::run())
└── lib.rs                  # IPC handlers for download folder
```

## WHERE TO LOOK

| Component       | Location                                          | Purpose                          |
| --------------- | ------------------------------------------------- | -------------------------------- |
| Download config | lib.rs: config_path()                             | appDataDir/downloads-config.json |
| IPC handlers    | lib.rs: get_download_dir(), choose_download_dir() | Folder dialog + persistence      |
| Tauri setup     | lib.rs: run()                                     | Plugin init, invoke_handler      |

## IPC COMMANDS

```rust
get_download_dir()          // Returns configured folder or system downloads
choose_download_dir()       // Opens folder dialog, saves selection
```

## CONVENTIONS

- **Config path**: `app.path().app_data_dir()/downloads-config.json`
- **Default**: Falls back to `dirs::download_dir()` if not configured
- **Plugins**: tauri-plugin-dialog, tauri-plugin-fs
- **Storage**: JSON with DownloadConfig struct

## ANTI-PATTERNS

- Never hardcode paths - use `app.path().app_data_dir()`
- Never skip config parent directory creation - use `fs::create_dir_all()`
