/**
 * IndexedDB wrapper for PDF storage and bulk email recipients.
 * Migrated from src/js/shared/db.js
 */

/** PDF data stored in IndexedDB */
export interface PDFRecord {
  id: string;
  name: string;
  data?: string; // data URL
  [key: string]: unknown;
}

/** Bulk email recipients record */
export interface BulkEmailRecord {
  id: string;
  data: string;
  savedAt: string;
}

export const DB_NAME = 'CitizenTemplates';
export const DB_VERSION = 2;
export const STORE_NAME = 'promotionPDFs';
export const BULK_EMAIL_STORE = 'bulkEmailRecipients';

let db: IDBDatabase | null = null;

/** Get the current database instance (for testing/debugging) */
export function getDb(): IDBDatabase | null {
  return db;
}

/** Set the database instance (for testing) */
export function setDb(database: IDBDatabase | null): void {
  db = database;
}

/**
 * Initialize IndexedDB for PDF storage.
 * @returns true if initialization succeeded, false otherwise
 */
export function initIndexedDB(): Promise<boolean> {
  return new Promise((resolve) => {
    const indexedDB =
      window.indexedDB ||
      (window as unknown as { webkitIndexedDB?: IDBFactory }).webkitIndexedDB ||
      (window as unknown as { mozIndexedDB?: IDBFactory }).mozIndexedDB;

    if (!indexedDB) {
      console.warn(
        'IndexedDB not supported, PDFs will not persist across refresh'
      );
      resolve(false);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB initialization failed:', request.error);
      resolve(false);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized successfully');
      resolve(true);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(BULK_EMAIL_STORE)) {
        database.createObjectStore(BULK_EMAIL_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Save PDF to IndexedDB.
 */
export function savePDFToIndexedDB(pdfData: PDFRecord): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('IndexedDB not initialized'));
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(pdfData);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(pdfData.id);
  });
}

/**
 * Get specific PDF from IndexedDB.
 */
export function getPDFFromIndexedDB(
  pdfId: string
): Promise<PDFRecord | null> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve(null);
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(pdfId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve((request.result as PDFRecord) || null);
  });
}

/**
 * Delete PDF from IndexedDB.
 */
export function deletePDFFromIndexedDB(pdfId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(pdfId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Clear all PDFs from IndexedDB.
 */
export function clearAllPDFsFromIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Save bulk email recipients to IndexedDB.
 */
export function saveBulkEmailRecipientsToIndexedDB(
  recipients: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('IndexedDB not initialized'));
      return;
    }

    const transaction = db.transaction([BULK_EMAIL_STORE], 'readwrite');
    const store = transaction.objectStore(BULK_EMAIL_STORE);
    const request = store.put({
      id: 'bulk-email-recipients',
      data: recipients,
      savedAt: new Date().toISOString(),
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get bulk email recipients from IndexedDB.
 */
export function getBulkEmailRecipientsFromIndexedDB(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve('');
      return;
    }

    const transaction = db.transaction([BULK_EMAIL_STORE], 'readonly');
    const store = transaction.objectStore(BULK_EMAIL_STORE);
    const request = store.get('bulk-email-recipients');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as BulkEmailRecord | undefined;
      resolve(result && result.data ? result.data : '');
    };
  });
}

/**
 * Clear bulk email recipients from IndexedDB.
 */
export function clearBulkEmailRecipientsFromIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    const transaction = db.transaction([BULK_EMAIL_STORE], 'readwrite');
    const store = transaction.objectStore(BULK_EMAIL_STORE);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
