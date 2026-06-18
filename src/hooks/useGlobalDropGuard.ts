/**
 * Prevent the browser/webview from navigating to a file when the user drops it
 * outside a registered drop zone. Without this, a stray PDF drop replaces the
 * whole app with the file viewer. Element-level drop handlers (PDF attachments,
 * the rich-text editor) still run first because this listens on the bubbling
 * phase and only prevents the browser default.
 *
 * When a file is dropped outside any registered drop zone (i.e. no element-level
 * handler has already called preventDefault), this hook also shows a gentle hint
 * toast pointing the user to where file drop is supported. The toast is deduped
 * via a stable id so rapid drops show only one notification.
 */
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useGlobalDropGuard(): void {
  useEffect(() => {
    const carriesFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onDragOver = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      if (e.defaultPrevented) return; // a registered drop zone already handled it
      e.preventDefault();
      toast.info(
        'To attach a PDF, drop it on the PDF Attachments area in the Promotion builder.',
        { id: 'drop-outside-zone' }
      );
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);
}
