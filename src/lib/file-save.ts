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

/**
 * Save a Blob to disk. Returns the absolute saved path in Tauri, or `null` in
 * the browser (where the path is unknown — the browser handles it).
 *
 * Pass `{ dialog: true }` for single, user-initiated downloads: in Tauri this
 * opens a native "Save As" dialog (the OS prompts before overwriting a
 * same-named file) and returns `null` if the user cancels. Batch exports should
 * omit it and keep writing silently to the configured download folder.
 */
export async function saveBlob(
  blob: Blob,
  filename: string,
  options?: { dialog?: boolean }
): Promise<string | null> {
  if (isTauri()) {
    const buffer = await blob.arrayBuffer();
    const dataBase64 = arrayBufferToBase64(buffer);
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
