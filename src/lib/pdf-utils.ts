/** Maximum PDF file size in bytes (10MB) */
export const MAX_PDF_SIZE = 10 * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function validatePDFFile(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return `${file.name} is not a PDF file`;
  }
  if (file.size > MAX_PDF_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `${file.name} is too large (${sizeMB}MB). Max size is 10MB.`;
  }
  return null;
}

export function readPDFAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error(`Failed to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Error reading ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Bytes represented by a base64 data URL's payload (accounts for padding). */
export function dataURLByteSize(dataURL: string): number {
  const comma = dataURL.indexOf(',');
  const b64 = comma >= 0 ? dataURL.slice(comma + 1) : dataURL;
  if (b64.length === 0) return 0;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/**
 * Optimize a PDF data URL via the Rust backend (downsamples over-resolution
 * embedded JPEGs). Fail-safe by contract: on any error, outside Tauri, or when
 * the backend can't shrink the file, the original data URL is returned
 * unchanged — callers can use the result directly without special-casing.
 */
export async function optimizePDF(dataURL: string): Promise<string> {
  try {
    // Imported lazily so non-Tauri contexts (browser preview, tests) don't
    // require the API to be present at module load.
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<string>('optimize_pdf', { dataUrl: dataURL });
    return typeof result === 'string' && result.length > 0 ? result : dataURL;
  } catch {
    return dataURL;
  }
}

export function dataURLtoBlob(dataURL: string): Blob {
  const byteCharacters = atob(dataURL.split(',')[1]);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteArray], { type: 'application/pdf' });
}
