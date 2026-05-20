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

/** Shared wrapper: init → open transaction → run operation → extract result. */
async function runRequest<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operate: (store: IDBObjectStore) => IDBRequest,
  extractResult: (req: IDBRequest) => T
): Promise<T> {
  if (!db) await initIndexedDB();
  if (!db) throw new Error('IndexedDB not available');
  const database = db;
  return new Promise<T>((resolve, reject) => {
    const txn = database.transaction([storeName], mode);
    const objectStore = txn.objectStore(storeName);
    const req = operate(objectStore);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(extractResult(req));
  });
}

export async function savePDFToIndexedDB(pdfData: PDFRecord): Promise<string> {
  return runRequest(STORE_NAME, 'readwrite', (s) => s.put(pdfData), () => pdfData.id);
}

export async function getPDFFromIndexedDB(pdfId: string): Promise<PDFRecord | null> {
  try {
    return await runRequest(STORE_NAME, 'readonly', (s) => s.get(pdfId), (r) => (r.result as PDFRecord) || null);
  } catch {
    return null;
  }
}

export async function deletePDFFromIndexedDB(pdfId: string): Promise<void> {
  try {
    await runRequest(STORE_NAME, 'readwrite', (s) => s.delete(pdfId), () => undefined);
  } catch { /* no-op if db unavailable */ }
}

export async function clearAllPDFsFromIndexedDB(): Promise<void> {
  try {
    await runRequest(STORE_NAME, 'readwrite', (s) => s.clear(), () => undefined);
  } catch { /* no-op if db unavailable */ }
}

/** Get all PDF keys from IndexedDB. Used for orphan cleanup. */
export async function getAllPDFKeysFromIndexedDB(): Promise<string[]> {
  try {
    return await runRequest(
      STORE_NAME, 'readonly',
      (s) => s.getAllKeys(),
      (r) => (r.result as IDBValidKey[]).map(String)
    );
  } catch {
    return [];
  }
}

export async function saveBulkEmailRecipientsToIndexedDB(recipients: string): Promise<void> {
  return runRequest(
    BULK_EMAIL_STORE, 'readwrite',
    (s) => s.put({ id: 'bulk-email-recipients', data: recipients, savedAt: new Date().toISOString() }),
    () => undefined
  );
}

export async function getBulkEmailRecipientsFromIndexedDB(): Promise<string> {
  try {
    return await runRequest(
      BULK_EMAIL_STORE, 'readonly',
      (s) => s.get('bulk-email-recipients'),
      (r) => { const rec = r.result as BulkEmailRecord | undefined; return rec?.data ?? ''; }
    );
  } catch {
    return '';
  }
}

export async function clearBulkEmailRecipientsFromIndexedDB(): Promise<void> {
  try {
    await runRequest(BULK_EMAIL_STORE, 'readwrite', (s) => s.clear(), () => undefined);
  } catch { /* no-op if db unavailable */ }
}
