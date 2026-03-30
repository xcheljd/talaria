/**
 * PDFAttachments — PDF upload/attachment section for promotion email builder.
 *
 * Features:
 * - Drag-and-drop upload zone (shadcn Card)
 * - File picker fallback
 * - Attached PDF list with name/size/remove
 * - PDF preview in shadcn Dialog with iframe
 * - Download button in preview
 *
 * Uses Zustand store for state and IndexedDB for persistence.
 */

import { useState, useRef, useCallback, type DragEvent } from 'react';
import { Upload, FileText, X, Download } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { usePromotionStore, type AttachedPDF } from '@/stores/promotion-store';
import {
  validatePDFFile,
  readPDFAsDataURL,
  dataURLtoBlob,
  formatFileSize,
} from '@/lib/subject-line-generator';
import { deletePDFFromIndexedDB, savePDFToIndexedDB } from '@/lib/db';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// ===== Component =====

export function PDFAttachments() {
  const store = usePromotionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewPDF, setPreviewPDF] = useState<AttachedPDF | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Handle validated PDF files
  const processFiles = useCallback(
    async (files: File[]) => {
      let hasErrors = false;

      for (const file of files) {
        const error = validatePDFFile(file);
        if (error) {
          toast.error(error);
          hasErrors = true;
          continue;
        }

        // Check for duplicate names
        if (store.attachedPDFs.some((pdf) => pdf.name === file.name)) {
          toast.warning(`${file.name} is already attached`);
          continue;
        }

        try {
          const data = await readPDFAsDataURL(file);
          const pdf: AttachedPDF = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            data,
          };

          // Save to IndexedDB for persistence
          try {
            await savePDFToIndexedDB({
              id: pdf.id,
              name: pdf.name,
              data: pdf.data,
            });
          } catch {
            toast.warning(
              'PDF saved to memory but may not persist after refresh'
            );
          }

          store.addPDF(pdf);
        } catch (e) {
          toast.error(`Error reading ${file.name}`);
          hasErrors = true;
        }
      }

      if (!hasErrors && files.length === 1) {
        toast.success(`${files[0].name} attached successfully`);
      } else if (!hasErrors && files.length > 1) {
        toast.success(`${files.length} PDFs attached successfully`);
      }
    },
    [store]
  );

  // Drag-and-drop handlers
  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const pdfFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf'
      );
      if (pdfFiles.length > 0) {
        processFiles(pdfFiles);
      } else {
        toast.error('Please drop only PDF files');
      }
    },
    [processFiles]
  );

  // File picker handler
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        processFiles(files);
      }
      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFiles]
  );

  // Remove PDF handler
  const handleRemovePDF = useCallback(
    async (pdf: AttachedPDF) => {
      try {
        await deletePDFFromIndexedDB(pdf.id);
      } catch {
        // Non-blocking
      }
      store.removePDF(pdf.id);
      toast.success(`${pdf.name} removed`);
    },
    [store]
  );

  // Preview handlers
  const openPreview = useCallback((pdf: AttachedPDF) => {
    if (!pdf.data) {
      toast.error('PDF data not available for preview');
      return;
    }

    const blob = dataURLtoBlob(pdf.data);
    const blobUrl = URL.createObjectURL(blob);
    setPreviewPDF(pdf);
    setPreviewBlobUrl(blobUrl);
  }, []);

  const closePreview = useCallback(() => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewPDF(null);
    setPreviewBlobUrl(null);
  }, [previewBlobUrl]);

  const handleDownload = useCallback(() => {
    if (!previewPDF?.data) return;
    const link = document.createElement('a');
    link.href = previewPDF.data;
    link.download = previewPDF.name;
    link.click();
  }, [previewPDF]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Upload PDF files to attach to your promotional email (max 10MB per file)
      </p>

      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <Upload className="mb-2 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          Click to upload or drag and drop PDF files
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Maximum 10MB per file
        </p>
      </div>

      {/* Attached PDFs List */}
      {store.attachedPDFs.length > 0 && (
        <div className="space-y-2">
          {store.attachedPDFs.map((pdf) => (
            <div
              key={pdf.id}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
            >
              <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className={cn(
                    'truncate text-left text-sm font-medium',
                    pdf.data
                      ? 'cursor-pointer text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary'
                      : 'cursor-default text-muted-foreground'
                  )}
                  title={
                    pdf.data
                      ? `Click to preview ${pdf.name}`
                      : `${pdf.name} - Preview unavailable`
                  }
                  onClick={() => pdf.data && openPreview(pdf)}
                  disabled={!pdf.data}
                >
                  {pdf.name}
                  {!pdf.data && (
                    <span
                      className="ml-1 text-orange-500"
                      title="Preview unavailable"
                    >
                      ⚠
                    </span>
                  )}
                </button>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(pdf.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRemovePDF(pdf)}
                aria-label={`Remove ${pdf.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* PDF Preview Dialog */}
      <Dialog
        open={previewPDF !== null}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewPDF?.name ?? 'PDF Preview'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden rounded-md border">
            {previewBlobUrl && (
              <iframe
                src={previewBlobUrl}
                className="h-[70vh] w-full"
                title={`Preview of ${previewPDF?.name}`}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePreview}
            >
              Close
            </Button>
            <Button onClick={handleDownload} className="gap-1.5">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
