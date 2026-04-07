import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initIndexedDB,
  savePDFToIndexedDB,
  getPDFFromIndexedDB,
  deletePDFFromIndexedDB,
  clearAllPDFsFromIndexedDB,
  saveBulkEmailRecipientsToIndexedDB,
  getBulkEmailRecipientsFromIndexedDB,
  clearBulkEmailRecipientsFromIndexedDB,
  getDb,
  setDb,
  DB_NAME,
  DB_VERSION,
  STORE_NAME,
  BULK_EMAIL_STORE,
  type PDFRecord,
} from '../src/lib/db';

/**
 * Helper to create a mock request that can be resolved/rejected.
 * Simulates the IDBRequest pattern used by IndexedDB APIs.
 */
function createMockRequest<T = unknown>(result?: T) {
  let onsuccess: (() => void) | null = null;
  let onerror: (() => void) | null = null;

  const request = {
    result: result ?? null,
    error: null as DOMException | null,
    get onsuccess() { return onsuccess; },
    set onsuccess(fn: (() => void) | null) { onsuccess = fn; },
    get onerror() { return onerror; },
    set onerror(fn: (() => void) | null) { onerror = fn; },
    _success() {
      if (onsuccess) onsuccess();
    },
    _error(err?: DOMException) {
      request.error = err || new DOMException('Test error');
      if (onerror) onerror();
    },
  };

  return request;
}

/**
 * Create a mock IDBDatabase that simulates real IndexedDB behavior.
 */
function createMockDB(): {
  db: IDBDatabase;
  stores: Record<string, Map<string, unknown>>;
  pendingRequests: ReturnType<typeof createMockRequest>[];
} {
  const stores: Record<string, Map<string, unknown>> = {
    [STORE_NAME]: new Map(),
    [BULK_EMAIL_STORE]: new Map(),
  };

  const pendingRequests: ReturnType<typeof createMockRequest>[] = [];

  const mockDB = {
    transaction: vi.fn((storeNames: string[], _mode: string) => {
      const storeName = storeNames[0];
      const storeMap = stores[storeName] || new Map();

      const mockStore = {
        put: vi.fn((value: { id: string }) => {
          const req = createMockRequest(value.id);
          // Simulate async success on next tick
          setTimeout(() => {
            storeMap.set(value.id, value);
            req.result = value.id;
            req._success();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
        get: vi.fn((key: string) => {
          const req = createMockRequest(storeMap.get(key) || null);
          setTimeout(() => {
            req._success();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
        delete: vi.fn((key: string) => {
          const req = createMockRequest(undefined);
          setTimeout(() => {
            storeMap.delete(key);
            req._success();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
        clear: vi.fn(() => {
          const req = createMockRequest(undefined);
          setTimeout(() => {
            storeMap.clear();
            req._success();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
      };

      return {
        objectStore: vi.fn(() => mockStore),
      };
    }),
    close: vi.fn(),
    objectStoreNames: {
      contains: vi.fn(() => true),
    },
  } as unknown as IDBDatabase;

  return { db: mockDB, stores, pendingRequests };
}

describe('db', () => {
  beforeEach(() => {
    setDb(null);
  });

  describe('constants', () => {
    it('exports correct DB name', () => {
      expect(DB_NAME).toBe('CitizenTemplates');
    });

    it('exports correct DB version', () => {
      expect(DB_VERSION).toBe(2);
    });

    it('exports correct store names', () => {
      expect(STORE_NAME).toBe('promotionPDFs');
      expect(BULK_EMAIL_STORE).toBe('bulkEmailRecipients');
    });
  });

  describe('getDb / setDb', () => {
    it('returns null initially', () => {
      expect(getDb()).toBeNull();
    });

    it('returns the set database', () => {
      const { db } = createMockDB();
      setDb(db);
      expect(getDb()).toBe(db);
    });
  });

  describe('PDF operations', () => {
    let mockDB: IDBDatabase;

    beforeEach(() => {
      const { db } = createMockDB();
      mockDB = db;
      setDb(mockDB);
    });

    it('savePDFToIndexedDB saves and returns id', async () => {
      const pdf: PDFRecord = {
        id: 'test-pdf',
        name: 'test.pdf',
        data: 'data:application/pdf;base64,SGVsbG8=',
      };
      const id = await savePDFToIndexedDB(pdf);
      expect(id).toBe('test-pdf');
    });

    it('savePDFToIndexedDB rejects when db is not initialized', async () => {
      setDb(null);
      await expect(
        savePDFToIndexedDB({ id: 'test', name: 'test.pdf' })
      ).rejects.toThrow('IndexedDB not available');
    });

    it('getPDFFromIndexedDB returns null when db is not initialized', async () => {
      setDb(null);
      const result = await getPDFFromIndexedDB('test');
      expect(result).toBeNull();
    });

    it('getPDFFromIndexedDB retrieves saved PDF', async () => {
      const pdf: PDFRecord = { id: 'test-pdf', name: 'test.pdf' };
      await savePDFToIndexedDB(pdf);
      const result = await getPDFFromIndexedDB('test-pdf');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('test-pdf');
    });

    it('deletePDFFromIndexedDB resolves when db is not initialized', async () => {
      setDb(null);
      await expect(deletePDFFromIndexedDB('test')).resolves.toBeUndefined();
    });

    it('clearAllPDFsFromIndexedDB resolves when db is not initialized', async () => {
      setDb(null);
      await expect(clearAllPDFsFromIndexedDB()).resolves.toBeUndefined();
    });
  });

  describe('Bulk email operations', () => {
    let mockDB: IDBDatabase;

    beforeEach(() => {
      const { db } = createMockDB();
      mockDB = db;
      setDb(mockDB);
    });

    it('saveBulkEmailRecipientsToIndexedDB saves data', async () => {
      await expect(
        saveBulkEmailRecipientsToIndexedDB('a@test.com, b@test.com')
      ).resolves.toBeUndefined();
    });

    it('saveBulkEmailRecipientsToIndexedDB rejects when db is not initialized', async () => {
      setDb(null);
      await expect(
        saveBulkEmailRecipientsToIndexedDB('a@test.com')
      ).rejects.toThrow('IndexedDB not available');
    });

    it('getBulkEmailRecipientsFromIndexedDB returns empty string when db is not initialized', async () => {
      setDb(null);
      const result = await getBulkEmailRecipientsFromIndexedDB();
      expect(result).toBe('');
    });

    it('getBulkEmailRecipientsFromIndexedDB retrieves saved data', async () => {
      await saveBulkEmailRecipientsToIndexedDB('a@test.com');
      const result = await getBulkEmailRecipientsFromIndexedDB();
      expect(result).toBe('a@test.com');
    });

    it('clearBulkEmailRecipientsFromIndexedDB resolves when db is not initialized', async () => {
      setDb(null);
      await expect(
        clearBulkEmailRecipientsFromIndexedDB()
      ).resolves.toBeUndefined();
    });
  });
});
