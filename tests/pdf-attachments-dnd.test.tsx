/**
 * Drag-and-drop coverage for PDFAttachments.
 *
 * The drop handler in src/components/promotion/PDFAttachments.tsx parses three
 * drag payload shapes and converts file:// URIs to OS paths (with Windows
 * drive-letter slicing) before invoking the Tauri read_file_as_data_url
 * command. This file exercises:
 *   - Branch A: direct File drop (valid PDF + filtered-out non-PDF)
 *   - Branch B: file:// URIs from text/uri-list (Linux/macOS + Windows drive)
 *   - text/html fallback extraction
 *   - De-dupe by filename (warning toast, invoke not called)
 *   - invoke-error path (error toast, no attachment added)
 *
 * Setup mirrors tests/pdf-and-subjects.test.tsx (store reset, Tauri invoke
 * mock, sonner spy) and adds a pdf-utils mock + the @tauri-apps/api/core mock
 * pattern from tests/file-save.test.ts.
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import { PDFAttachments } from '@/components/promotion/PDFAttachments';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePromotionStore } from '@/stores/promotion-store';

// Mock ResizeObserver / scrollIntoView for Radix components (mirrors
// pdf-and-subjects.test.tsx).
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

// Mock sonner toast — spies let us assert success / warning / error messages.
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock IndexedDB functions so store.addPDF persistence resolves.
vi.mock('@/lib/db', () => ({
  savePDFToIndexedDB: vi.fn().mockResolvedValue('mock-id'),
  getPDFFromIndexedDB: vi.fn().mockResolvedValue(null),
  deletePDFFromIndexedDB: vi.fn().mockResolvedValue(undefined),
  clearAllPDFsFromIndexedDB: vi.fn().mockResolvedValue(undefined),
  initIndexedDB: vi.fn().mockResolvedValue(true),
}));

// Mock pdf-utils so the direct-file path is deterministic and does not depend
// on FileReader behavior in jsdom. validatePDFFile(null) means "valid".
const validatePDFFile = vi.fn();
const readPDFAsDataURL = vi.fn();
vi.mock('@/lib/pdf-utils', () => ({
  validatePDFFile: (file: File) => validatePDFFile(file),
  readPDFAsDataURL: (file: File) => readPDFAsDataURL(file),
  formatFileSize: (bytes: number) => `${bytes} B`,
  dataURLtoBlob: (dataURL: string) =>
    new Blob([dataURL], { type: 'application/pdf' }),
  // Identity optimize keeps the DnD paths deterministic; optimization itself is
  // covered by the Rust tests. dataURLByteSize mirrors the real implementation.
  amatl: { optimize: (dataURL: string) => Promise.resolve(dataURL) },
  dataURLByteSize: (dataURL: string) => {
    const comma = dataURL.indexOf(',');
    const b64 = comma >= 0 ? dataURL.slice(comma + 1) : dataURL;
    if (b64.length === 0) return 0;
    const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    return Math.floor((b64.length * 3) / 4) - padding;
  },
  MAX_PDF_SIZE: 10 * 1024 * 1024,
}));

// Mock @tauri-apps/api/core BEFORE importing the component (the URI path calls
// invoke('read_file_as_data_url', { path })). Pattern from file-save.test.ts.
const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
  invoke: (...args: unknown[]) => invoke(...args),
}));

// ===== Helpers =====

function resetStore() {
  usePromotionStore.setState({
    promotionEntries: [],
    specialHours: [],
    howToShopItems: [],
    importantNotesItems: [],
    attachedPDFs: [],
    generatedSubjectLines: [],
    selectedSubjectLine: null,
    subjectLineManuallyEdited: false,
    entryCollapsedStates: {},
    columnState: 'left',
    isInitializing: false,
  });
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

/**
 * The drop zone is a div[role="button"] wrapping the "Click to upload..."
 * text. Other role="button" elements (remove buttons) appear only when PDFs
 * are attached, so resolve the drop zone via the upload label to stay robust
 * across the de-dupe test (which pre-seeds the store).
 */
function getDropZone(): HTMLElement {
  const label = screen.getByText('Click to upload or drag and drop PDF files');
  // The drop zone is the closest ancestor with role="button".
  const zone = label.closest('[role="button"]');
  if (!(zone instanceof HTMLElement)) {
    throw new Error('Drop zone (role="button") not found');
  }
  return zone;
}

/**
 * Synthetic DataTransfer. Only the bits the handler reads are populated:
 * dt.files (for branch A) and dt.getData(type) (for branch B / html fallback).
 */
function makeDataTransfer(opts: {
  files?: File[];
  uriList?: string;
  html?: string;
}): DataTransfer {
  const data: Record<string, string> = {};
  if (opts.uriList !== undefined) data['text/uri-list'] = opts.uriList;
  if (opts.html !== undefined) data['text/html'] = opts.html;
  return {
    files: opts.files ?? [],
    getData: (t: string) => data[t] ?? '',
  } as unknown as DataTransfer;
}

function makePDFFile(name = 'flyer.pdf'): File {
  return new File(['%PDF-1.4 fake'], name, { type: 'application/pdf' });
}

// ===== Tests =====

describe('PDFAttachments drag-and-drop', () => {
  let toast: typeof import('sonner')['toast'];

  beforeEach(async () => {
    resetStore();
    vi.clearAllMocks();
    // Default: pdf-utils says every file is valid and reads a fixed data URL.
    validatePDFFile.mockReturnValue(null);
    readPDFAsDataURL.mockResolvedValue('data:application/pdf;base64,QUJD');
    // Default: invoke resolves a data URL whose base64 body decodes to 3 bytes.
    invoke.mockResolvedValue('data:application/pdf;base64,QUJD');
    toast = (await import('sonner')).toast;
  });

  // ---- Branch A: direct File drop ----

  it('attaches a directly-dropped PDF and fires a success toast', async () => {
    renderWithProviders(<PDFAttachments />);
    const zone = getDropZone();

    const file = makePDFFile('flyer.pdf');
    fireEvent.drop(zone, { dataTransfer: makeDataTransfer({ files: [file] }) });

    await waitFor(() => {
      expect(usePromotionStore.getState().attachedPDFs).toHaveLength(1);
    });

    const attached = usePromotionStore.getState().attachedPDFs[0];
    expect(attached.name).toBe('flyer.pdf');
    expect(attached.data).toBe('data:application/pdf;base64,QUJD');

    expect(readPDFAsDataURL).toHaveBeenCalledWith(file);
    expect(toast.success).toHaveBeenCalledWith('flyer.pdf attached successfully');
    // URI path must NOT run for direct-file drops.
    expect(invoke).not.toHaveBeenCalled();
  });

  it('falls through to the "only PDF files" error when a non-PDF is dropped', async () => {
    renderWithProviders(<PDFAttachments />);
    const zone = getDropZone();

    const txt = new File(['hi'], 'notes.txt', { type: 'text/plain' });
    fireEvent.drop(zone, { dataTransfer: makeDataTransfer({ files: [txt] }) });

    // No files (filtered out at handleDrop), no URIs -> final error toast.
    expect(toast.error).toHaveBeenCalledWith('Please drop only PDF files');
    expect(usePromotionStore.getState().attachedPDFs).toHaveLength(0);
    expect(invoke).not.toHaveBeenCalled();
  });

  // ---- Branch B: file:// URI via text/uri-list (Linux/macOS) ----

  it('converts a Linux/macOS file:// URI to a path and invokes the Tauri reader', async () => {
    renderWithProviders(<PDFAttachments />);
    const zone = getDropZone();

    fireEvent.drop(zone, {
      dataTransfer: makeDataTransfer({
        uriList: 'file:///home/user/report.pdf',
      }),
    });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('read_file_as_data_url', {
        path: '/home/user/report.pdf',
      });
    });

    await waitFor(() => {
      expect(usePromotionStore.getState().attachedPDFs).toHaveLength(1);
    });
    const attached = usePromotionStore.getState().attachedPDFs[0];
    expect(attached.name).toBe('report.pdf');
    expect(toast.success).toHaveBeenCalledWith('report.pdf attached successfully');
  });

  // ---- Branch B: Windows drive-letter handling ----

  it('strips the leading slash for a Windows drive-letter file:// URI', async () => {
    renderWithProviders(<PDFAttachments />);
    const zone = getDropZone();

    fireEvent.drop(zone, {
      dataTransfer: makeDataTransfer({
        uriList: 'file:///C:/Users/me/sale.pdf',
      }),
    });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('read_file_as_data_url', {
        // The ^\/[A-Za-z]: rule slices the leading slash -> C:/Users/me/sale.pdf
        path: 'C:/Users/me/sale.pdf',
      });
    });

    await waitFor(() => {
      expect(usePromotionStore.getState().attachedPDFs).toHaveLength(1);
    });
    expect(
      usePromotionStore.getState().attachedPDFs[0].name
    ).toBe('sale.pdf');
  });

  // ---- Branch B: text/html fallback ----

  it('extracts a file:// URI from text/html when no uri-list is present', async () => {
    renderWithProviders(<PDFAttachments />);
    const zone = getDropZone();

    fireEvent.drop(zone, {
      dataTransfer: makeDataTransfer({
        html: '<a href="file:///home/user/a.pdf">a</a>',
      }),
    });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('read_file_as_data_url', {
        path: '/home/user/a.pdf',
      });
    });
    await waitFor(() => {
      expect(usePromotionStore.getState().attachedPDFs).toHaveLength(1);
    });
    expect(
      usePromotionStore.getState().attachedPDFs[0].name
    ).toBe('a.pdf');
  });

  // ---- De-dupe by filename ----

  it('warns and skips when a file:// URI matches an already-attached filename', async () => {
    // Pre-seed the store with an attachment named a.pdf.
    usePromotionStore.setState({
      attachedPDFs: [
        {
          id: 'existing',
          name: 'a.pdf',
          size: 3,
          type: 'application/pdf',
          data: 'data:application/pdf;base64,QUJD',
        },
      ],
    });

    renderWithProviders(<PDFAttachments />);
    const zone = getDropZone();

    fireEvent.drop(zone, {
      dataTransfer: makeDataTransfer({
        uriList: 'file:///home/user/a.pdf',
      }),
    });

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith('a.pdf is already attached');
    });

    // Still only the one pre-seeded attachment; invoke never ran for the dup.
    expect(usePromotionStore.getState().attachedPDFs).toHaveLength(1);
    expect(invoke).not.toHaveBeenCalled();
  });

  // ---- Error path ----

  it('shows an error toast and adds nothing when invoke rejects', async () => {
    renderWithProviders(<PDFAttachments />);
    const zone = getDropZone();

    invoke.mockRejectedValue(new Error('nope'));

    fireEvent.drop(zone, {
      dataTransfer: makeDataTransfer({
        uriList: 'file:///home/user/broken.pdf',
      }),
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to read dropped PDF: Error: nope'
      );
    });
    expect(usePromotionStore.getState().attachedPDFs).toHaveLength(0);
  });
});
