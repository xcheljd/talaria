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
let initPromise: Promise<boolean> | null = null;

/** Get the current database instance (for testing/debugging) */
export function getDb(): IDBDatabase | null {
  return db;
}

/** Set the database instance (for testing) */
export function setDb(database: IDBDatabase | null): void {
  db = database;
  initPromise = null;
}

/**
 * Initialize IndexedDB for PDF storage.
 * Returns cached promise if init is already in flight.
 */
export function initIndexedDB(): Promise<boolean> {
  if (db) return Promise.resolve(true);
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve) => {
    const indexedDB =
      window.indexedDB ||
      (window as unknown as { webkitIndexedDB?: IDBFactory }).webkitIndexedDB ||
      (window as unknown as { mozIndexedDB?: IDBFactory }).mozIndexedDB;

    if (!indexedDB) {
      console.warn(
        'IndexedDB not supported, PDFs will not persist across refresh'
      );
      initPromise = null;
      resolve(false);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB initialization failed:', request.error);
      initPromise = null;
      resolve(false);
    };

    request.onsuccess = () => {
      db = request.result;
      // If another tab upgrades the schema, the browser fires `versionchange`
      // on open connections. Close and forget so the next call re-initializes.
      db.onversionchange = () => {
        db?.close();
        db = null;
        initPromise = null;
      };
      // Mirrors `onversionchange` for abnormal closes (tab quota, etc.).
      db.onclose = () => {
        db = null;
        initPromise = null;
      };
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
  return initPromise;
}

/**
 * Save PDF to IndexedDB.
 */
export async function savePDFToIndexedDB(pdfData: PDFRecord): Promise<string> {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('IndexedDB not available'));
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
export async function getPDFFromIndexedDB(
  pdfId: string
): Promise<PDFRecord | null> {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve(null);
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(pdfId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as PDFRecord) || null);
  });
}

/**
 * Delete PDF from IndexedDB.
 */
export async function deletePDFFromIndexedDB(pdfId: string): Promise<void> {
  if (!db) await initIndexedDB();
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
export async function clearAllPDFsFromIndexedDB(): Promise<void> {
  if (!db) await initIndexedDB();
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
 * Get all PDF keys from IndexedDB.
 * Used for orphan cleanup.
 */
export async function getAllPDFKeysFromIndexedDB(): Promise<string[]> {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve([]);
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const keys = request.result as IDBValidKey[];
      resolve(keys.map(String));
    };
  });
}

/**
 * Save bulk email recipients to IndexedDB.
 */
export async function saveBulkEmailRecipientsToIndexedDB(
  recipients: string
): Promise<void> {
  if (!db) await initIndexedDB();
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('IndexedDB not available'));
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
export async function getBulkEmailRecipientsFromIndexedDB(): Promise<string> {
  if (!db) await initIndexedDB();
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
export async function clearBulkEmailRecipientsFromIndexedDB(): Promise<void> {
  if (!db) await initIndexedDB();
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
