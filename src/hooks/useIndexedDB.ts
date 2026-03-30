/**
 * React hook for IndexedDB operations.
 * Wraps the pure db.ts utility functions with React state management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initIndexedDB,
  savePDFToIndexedDB,
  getPDFFromIndexedDB,
  deletePDFFromIndexedDB,
  clearAllPDFsFromIndexedDB,
  saveBulkEmailRecipientsToIndexedDB,
  getBulkEmailRecipientsFromIndexedDB,
  clearBulkEmailRecipientsFromIndexedDB,
  type PDFRecord,
} from '../lib/db';

export interface UseIndexedDBReturn {
  /** Whether the database has been initialized */
  isInitialized: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Last error encountered */
  error: Error | null;

  // PDF operations
  savePDF: (pdf: PDFRecord) => Promise<string>;
  getPDF: (id: string) => Promise<PDFRecord | null>;
  deletePDF: (id: string) => Promise<void>;
  clearAllPDFs: () => Promise<void>;

  // Bulk email operations
  saveBulkRecipients: (recipients: string) => Promise<void>;
  getBulkRecipients: () => Promise<string>;
  clearBulkRecipients: () => Promise<void>;
}

/**
 * React hook wrapping IndexedDB operations.
 * Initializes the database on first use and provides typed CRUD operations.
 */
export function useIndexedDB(): UseIndexedDBReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    initIndexedDB().then((success) => {
      setIsInitialized(success);
      if (!success) {
        setError(new Error('Failed to initialize IndexedDB'));
      }
    });
  }, []);

  const wrapOp = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isInitialized,
    isLoading,
    error,

    savePDF: useCallback(
      (pdf: PDFRecord) => wrapOp(() => savePDFToIndexedDB(pdf)),
      [wrapOp]
    ),

    getPDF: useCallback(
      (id: string) => wrapOp(() => getPDFFromIndexedDB(id)),
      [wrapOp]
    ),

    deletePDF: useCallback(
      (id: string) => wrapOp(() => deletePDFFromIndexedDB(id)),
      [wrapOp]
    ),

    clearAllPDFs: useCallback(
      () => wrapOp(() => clearAllPDFsFromIndexedDB()),
      [wrapOp]
    ),

    saveBulkRecipients: useCallback(
      (recipients: string) =>
        wrapOp(() => saveBulkEmailRecipientsToIndexedDB(recipients)),
      [wrapOp]
    ),

    getBulkRecipients: useCallback(
      () => wrapOp(() => getBulkEmailRecipientsFromIndexedDB()),
      [wrapOp]
    ),

    clearBulkRecipients: useCallback(
      () => wrapOp(() => clearBulkEmailRecipientsFromIndexedDB()),
      [wrapOp]
    ),
  };
}
