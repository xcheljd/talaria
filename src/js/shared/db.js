export let db = null;
export const DB_NAME = 'CitizenTemplates';
export const DB_VERSION = 2; // Incremented to create bulkEmailRecipients store
export const STORE_NAME = 'promotionPDFs';
export const BULK_EMAIL_STORE = 'bulkEmailRecipients';

// Initialize IndexedDB for PDF storage
export function initIndexedDB() {
  return new Promise((resolve) => {
    // Check browser support
    const indexedDB =
      window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
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

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      // Create object store for PDFs with id as key
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      // Create object store for bulk email recipients
      if (!database.objectStoreNames.contains(BULK_EMAIL_STORE)) {
        database.createObjectStore(BULK_EMAIL_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Save PDF to IndexedDB
export function savePDFToIndexedDB(pdfData) {
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

// Get all PDFs from IndexedDB
export function getAllPDFsFromIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve([]);
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// Get specific PDF from IndexedDB
export function getPDFFromIndexedDB(pdfId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve(null);
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(pdfId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// Delete PDF from IndexedDB
export function deletePDFFromIndexedDB(pdfId) {
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

// Clear all PDFs from IndexedDB
export function clearAllPDFsFromIndexedDB() {
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

// Save bulk email recipients to IndexedDB
export function saveBulkEmailRecipientsToIndexedDB(recipients) {
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

// Get bulk email recipients from IndexedDB
export function getBulkEmailRecipientsFromIndexedDB() {
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
      const result = request.result;
      resolve(result && result.data ? result.data : '');
    };
  });
}

// Clear bulk email recipients from IndexedDB
export function clearBulkEmailRecipientsFromIndexedDB() {
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
