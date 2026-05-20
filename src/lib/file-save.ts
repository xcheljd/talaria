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

type TauriInvoke = (
  cmd: string,
  args?: Record<string, unknown>
) => Promise<unknown>;

interface TauriWindow {
  __TAURI__?: {
    core?: {
      invoke?: TauriInvoke;
    };
  };
}

function getTauriInvoke(): TauriInvoke | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as TauriWindow).__TAURI__?.core?.invoke ?? null;
}

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
 */
export async function saveBlob(
  blob: Blob,
  filename: string
): Promise<string | null> {
  const invoke = getTauriInvoke();

  if (invoke) {
    const buffer = await blob.arrayBuffer();
    const dataBase64 = arrayBufferToBase64(buffer);
    const savedPath = (await invoke('save_file_to_dir', {
      filename,
      dataBase64,
    })) as string;
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
