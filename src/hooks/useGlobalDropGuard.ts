/**
 * Prevent the browser/webview from navigating to a file when the user drops it
 * outside a registered drop zone. Without this, a stray PDF drop replaces the
 * whole app with the file viewer. Element-level drop handlers (PDF attachments,
 * the rich-text editor) still run first because this listens on the bubbling
 * phase and only prevents the browser default.
 */
import { useEffect } from 'react';

export function useGlobalDropGuard(): void {
  useEffect(() => {
    const carriesFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onDragOver = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);
}
