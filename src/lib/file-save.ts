/**
 * Unified file-save helper.
 *
 * In a regular browser, falls back to the standard anchor-click download flow
 * (the browser decides where the file goes; usually the system Downloads folder).
 *
 * In the Tauri desktop app, invokes the `save_file_to_dir` Rust command, which
 * writes the file to the directory configured in Settings → Download Folder
 * (or the system Downloads folder if none is configured).
 */

import { invoke, isTauri } from '@tauri-apps/api/core';
import { StorageKeys } from '@/lib/storage-keys';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Returns true if the user prefers a Save As dialog for each download. Default true. */
export function getSaveAsDialog(): boolean {
  return localStorage.getItem(StorageKeys.downloadSaveAs) !== 'false';
}

/** True when running inside the Tauri desktop app. */
export function isInTauri(): boolean {
  return isTauri();
}

/**
 * Open a native folder-picker dialog (Tauri only).
 * Returns the chosen absolute path, or null if the user cancelled or if running
 * in a browser (where folder selection is not applicable).
 */
export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string | null>('pick_folder');
}

/**
 * Save a Blob to disk. Returns the absolute saved path in Tauri, or `null` in
 * the browser (where the path is unknown — the browser handles it).
 *
 * Options:
 *   `dialog: true`  — opens a native Save As dialog (Tauri). Use for single,
 *                      user-initiated downloads. Respects `getSaveAsDialog()`.
 *   `folder`        — save to this specific directory (Tauri). Use for batch
 *                      individual files after a one-time folder pick.
 *
 * Batch exports that need a folder-picker first should call `pickFolder()` once,
 * then pass the result as `{ folder }` for each file.
 */
export async function saveBlob(
  blob: Blob,
  filename: string,
  options?: { dialog?: boolean; folder?: string }
): Promise<string | null> {
  if (isTauri()) {
    const buffer = await blob.arrayBuffer();
    const dataBase64 = arrayBufferToBase64(buffer);

    if (options?.folder) {
      return invoke<string>('save_file_to_path', {
        dir: options.folder,
        filename,
        dataBase64,
      });
    }

    const command = options?.dialog ? 'save_file_as' : 'save_file_to_dir';
    const savedPath = await invoke<string | null>(command, {
      filename,
      dataBase64,
    });
    return savedPath;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return null;
}