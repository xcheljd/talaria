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

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type DragEvent,
} from 'react';
import { Upload, FileText, X, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { toastWithUndo } from '@/lib/undo-toast';
import { CardHeaderActions } from '@/components/promotion/card-header-actions';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
} from '@/components/ui/item';
import { invoke } from '@tauri-apps/api/core';

import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';

import { usePromotionStore, type AttachedPDF } from '@/stores/promotion-store';
import {
  validatePDFFile,
  readPDFAsDataURL,
  dataURLtoBlob,
  dataURLByteSize,
  picamatl,
  formatFileSize,
} from '@/lib/pdf-utils';
import { StorageKeys } from '@/lib/storage-keys';
import { saveBlob, getSaveAsDialog } from '@/lib/file-save';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// ===== Component =====

export function PDFAttachments() {
  const store = usePromotionStore(
    useShallow((s) => ({
      attachedPDFs: s.attachedPDFs,
      addPDF: s.addPDF,
      removePDF: s.removePDF,
      clearAllPDFs: s.clearAllPDFs,
      saveStatus: s.saveStatus,
    }))
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewPDF, setPreviewPDF] = useState<AttachedPDF | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const generatePdfId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const persistPDF = useCallback(
    async (pdf: AttachedPDF) => {
      // addPDF updates state synchronously, then persists the blob to
      // IndexedDB. If persistence fails the PDF is still in memory for this
      // session, so warn rather than error.
      try {
        await store.addPDF(pdf);
      } catch {
        toast.warning('PDF kept in memory but will not persist after refresh');
      }
    },
    [store]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      const optimize =
        localStorage.getItem(StorageKeys.pdfOptimize) !== 'false';
      const stripAccessibility =
        localStorage.getItem(StorageKeys.pdfStripAccessibility) !== 'false';
      let hasErrors = false;

      for (const file of files) {
        const error = validatePDFFile(file);
        if (error) {
          toast.error(error);
          hasErrors = true;
          continue;
        }

        if (store.attachedPDFs.some((pdf) => pdf.name === file.name)) {
          toast.warning(`${file.name} is already attached`);
          continue;
        }

        try {
          const original = await readPDFAsDataURL(file);
          const data = optimize
            ? await picamatl.optimize(original, stripAccessibility)
            : original;
          const size = dataURLByteSize(data);
          if (optimize && size < file.size) {
            toast.info(
              `${file.name} optimized: ${formatFileSize(file.size)} → ${formatFileSize(size)}`
            );
          }
          await persistPDF({
            id: generatePdfId(),
            name: file.name,
            size,
            type: file.type,
            data,
          });
        } catch {
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
    [store, persistPDF]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dt = e.dataTransfer;

      // Direct file drop (works in browsers, some Tauri configs)
      const directFiles = Array.from(dt.files).filter(
        (f) =>
          f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (directFiles.length > 0) {
        processFiles(directFiles);
        return;
      }

      // File managers may drop file:// URIs instead of File objects
      // (common on Linux/WebKitGTK, possible fallback on macOS/Windows)
      let fileUrls: string[] = [];
      const uriData = dt.getData('text/uri-list');
      if (uriData) {
        fileUrls = uriData
          .split('\n')
          .map((u) => u.trim())
          .filter((u) => u.startsWith('file://'));
      }
      if (fileUrls.length === 0) {
        const htmlData = dt.getData('text/html');
        if (htmlData) {
          const matches = htmlData.match(/file:\/\/[^"<>\s]+/g);
          if (matches) fileUrls = matches;
        }
      }
      const pdfUrls = fileUrls.filter((u) => u.toLowerCase().endsWith('.pdf'));
      if (pdfUrls.length > 0) {
        (async () => {
          try {
            for (const uri of pdfUrls) {
              // Convert file:// URI to OS path
              // Linux/macOS: file:///home/... → /home/...  |  Windows: file:///C:/... → C:/...
              let filePath = decodeURIComponent(new URL(uri).pathname);
              if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1);
              const name = filePath.split(/[/\\]/).pop() || 'file.pdf';

              if (store.attachedPDFs.some((p) => p.name === name)) {
                toast.warning(`${name} is already attached`);
                continue;
              }

              const original = await invoke<string>('read_file_as_data_url', {
                path: filePath,
              });
              const originalSize = dataURLByteSize(original);
              const shouldOptimize =
                localStorage.getItem(StorageKeys.pdfOptimize) !== 'false';
              const stripA =
                localStorage.getItem(StorageKeys.pdfStripAccessibility) !==
                'false';
              const dataUrl = shouldOptimize
                ? await picamatl.optimize(original, stripA)
                : original;
              const size = dataURLByteSize(dataUrl);

              await persistPDF({
                id: generatePdfId(),
                name,
                size,
                type: 'application/pdf',
                data: dataUrl,
              });
              if (shouldOptimize && size < originalSize) {
                toast.success(
                  `${name} attached & optimized: ${formatFileSize(originalSize)} → ${formatFileSize(size)}`
                );
              } else {
                toast.success(`${name} attached successfully`);
              }
            }
          } catch (err) {
            toast.error(`Failed to read dropped PDF: ${err}`);
          }
        })();
        return;
      }

      toast.error('Please drop only PDF files');
    },
    [processFiles, persistPDF, store]
  );

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

  const handleRemovePDF = useCallback(
    async (pdf: AttachedPDF) => {
      await store.removePDF(pdf.id);
      toast.success(`${pdf.name} removed`);
    },
    [store]
  );

  const clearAll = useCallback(async () => {
    const snapshot = store.attachedPDFs;
    const count = snapshot.length;
    await store.clearAllPDFs();
    // Undo re-adds each file (and re-saves it to IndexedDB, which the clear
    // emptied) in the original order.
    toastWithUndo(
      count === 1 ? 'PDF removed' : `${count} PDFs removed`,
      async () => {
        for (const pdf of snapshot) await store.addPDF(pdf);
      }
    );
  }, [store]);

  const openPreview = useCallback((pdf: AttachedPDF) => {
    if (!pdf.data) {
      toast.error('PDF data not available for preview');
      return;
    }

    const blob = dataURLtoBlob(pdf.data);
    if (!blob) {
      toast.error('This PDF preview is unavailable — the file data is invalid');
      return;
    }
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

  // Revoke blob URL on unmount or when it changes (covers route-away, Start Over, error boundary)
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const handleDownload = useCallback(async () => {
    if (!previewPDF?.data) return;
    const blob = dataURLtoBlob(previewPDF.data);
    if (!blob) {
      toast.error('This PDF preview is unavailable — the file data is invalid');
      return;
    }
    // Use a Save-As dialog: this is a single user-initiated download, and the
    // attachment is the optimized PDF — silently overwriting a same-named source
    // file in the download folder would be surprising (and lossy vs. the source).
    await saveBlob(blob, previewPDF.name, { dialog: getSaveAsDialog() });
  }, [previewPDF]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground">
          Upload PDF files to attach to your promotional email (max 10MB per
          file)
        </p>
        {store.saveStatus === 'warning' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                <AlertTriangle className="size-3" />
                Save issue
              </span>
            </TooltipTrigger>
            <TooltipContent>Last save may not have completed</TooltipContent>
          </Tooltip>
        )}
        {store.attachedPDFs.length > 0 && (
          <CardHeaderActions>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground hover:text-destructive-text"
              onClick={clearAll}
            >
              <Trash2 aria-hidden="true" />
              Clear all
            </Button>
          </CardHeaderActions>
        )}
      </div>

      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={0}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
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
        <Upload className="size-10 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">
          Click to upload or drag and drop PDF files
        </p>
        <p className="text-xs text-muted-foreground">Maximum 10MB per file</p>
      </div>

      {/* Attached PDFs List */}
      {store.attachedPDFs.length > 0 && (
        <div className="flex flex-col gap-2">
          {store.attachedPDFs.map((pdf) => (
            <Item
              key={pdf.id}
              variant="muted"
              size="sm"
              className="border-border px-3 py-2"
            >
              <ItemMedia variant="icon" className="text-primary">
                <FileText aria-hidden="true" />
              </ItemMedia>
              <ItemContent className="min-w-0 gap-0.5">
                <Tooltip>
                  {/* span trigger: a disabled <button> emits no pointer events */}
                  <TooltipTrigger asChild>
                    <span className="block min-w-0">
                      <button
                        type="button"
                        className={cn(
                          'max-w-full truncate text-left text-sm font-medium',
                          pdf.data
                            ? 'cursor-pointer text-primary-text underline decoration-primary/30 underline-offset-2 hover:decoration-primary'
                            : 'cursor-default text-muted-foreground'
                        )}
                        onClick={() => pdf.data && openPreview(pdf)}
                        disabled={!pdf.data}
                      >
                        {pdf.name}
                        {!pdf.data && (
                          <span className="ml-1 text-warning">⚠</span>
                        )}
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {pdf.data
                      ? `Click to preview ${pdf.name}`
                      : `${pdf.name} - Preview unavailable`}
                  </TooltipContent>
                </Tooltip>
                <ItemDescription className="text-xs">
                  {formatFileSize(pdf.size)}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 flex-shrink-0 text-muted-foreground hover:text-destructive-text"
                  onClick={() => handleRemovePDF(pdf)}
                  aria-label={`Remove ${pdf.name}`}
                >
                  <X className="size-4" />
                </Button>
              </ItemActions>
            </Item>
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
            <DialogDescription className="sr-only">
              Preview of attached PDF file
            </DialogDescription>
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
            <Button variant="outline" onClick={closePreview}>
              Close
            </Button>
            <Button onClick={handleDownload} className="gap-1.5">
              <Download className="size-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
