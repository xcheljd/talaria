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

export function dataURLtoBlob(dataURL: string): Blob {
  const byteCharacters = atob(dataURL.split(',')[1]);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteArray], { type: 'application/pdf' });
}
