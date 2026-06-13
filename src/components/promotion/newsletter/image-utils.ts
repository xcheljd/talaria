/**
 * Image helpers for the Newsletter editor: client-side compression of pasted
 * or dropped images so the resulting email HTML stays small.
 */

export const MAX_IMAGE_WIDTH = 600;
export const MAX_IMAGE_SIZE_KB = 200;

/**
 * Compress an image data URL using canvas resize.
 * Returns the compressed data URL and a warning if the image is still large.
 */
export function compressImage(
  dataUrl: string
): Promise<{ src: string; warning?: string }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      // Only resize if wider than email width
      if (
        img.width <= MAX_IMAGE_WIDTH &&
        dataUrl.length < MAX_IMAGE_SIZE_KB * 1024
      ) {
        resolve({ src: dataUrl });
        return;
      }

      const scale = Math.min(1, MAX_IMAGE_WIDTH / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ src: dataUrl });
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.8);

      const sizeKB = Math.round(compressed.length / 1024);
      const warning =
        sizeKB > MAX_IMAGE_SIZE_KB
          ? `Image is ${sizeKB}KB (base64). Large images may not display in some email clients.`
          : undefined;

      resolve({ src: compressed, warning });
    };
    img.onerror = () => resolve({ src: dataUrl });
    img.src = dataUrl;
  });
}
