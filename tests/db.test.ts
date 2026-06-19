import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePDFToIndexedDB,
  getPDFFromIndexedDB,
  deletePDFFromIndexedDB,
  clearAllPDFsFromIndexedDB,
  getAllPDFKeysFromIndexedDB,
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

      // Mock transaction with oncomplete/onabort, fired after request
      // success to mirror real IndexedDB commit ordering.
      const txn = {
        error: null as DOMException | null,
        oncomplete: null as (() => void) | null,
        onabort: null as (() => void) | null,
        objectStore: vi.fn(() => mockStore),
      };

      const completeTxn = () => {
        setTimeout(() => txn.oncomplete?.(), 0);
      };

      const mockStore = {
        put: vi.fn((value: { id: string }) => {
          const req = createMockRequest(value.id);
          // Simulate async success on next tick
          setTimeout(() => {
            storeMap.set(value.id, value);
            req.result = value.id;
            req._success();
            completeTxn();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
        get: vi.fn((key: string) => {
          const req = createMockRequest(storeMap.get(key) || null);
          setTimeout(() => {
            req._success();
            completeTxn();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
        delete: vi.fn((key: string) => {
          const req = createMockRequest(undefined);
          setTimeout(() => {
            storeMap.delete(key);
            req._success();
            completeTxn();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
        clear: vi.fn(() => {
          const req = createMockRequest(undefined);
          setTimeout(() => {
            storeMap.clear();
            req._success();
            completeTxn();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
        getAllKeys: vi.fn(() => {
          const req = createMockRequest(Array.from(storeMap.keys()));
          setTimeout(() => {
            // Refresh in case writes landed between call and flush.
            req.result = Array.from(storeMap.keys());
            req._success();
            completeTxn();
          }, 0);
          pendingRequests.push(req);
          return req;
        }),
      };

      return txn;
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

  // ====================================================================
  // Error / resilience branches (Plan 008)
  //
  // These are characterization tests: each asserts the *current* contract
  // of the error path — readers swallow failures and resolve a fallback
  // (null / '' / []), while writers propagate the rejection. The existing
  // createMockDB harness auto-fires request success on a setTimeout; to
  // force an error we grab the shared mockStore and override its method to
  // return a request that we fail synchronously via _error().
  // ====================================================================

  /**
   * Force the next call to `storeMethod` (e.g. 'get', 'put') to produce a
   * request that errors. db.ts calls db.transaction(...) once per operation;
   * we spy on the next such call, let the original implementation build the
   * store (so all other store methods keep working), then override only the
   * target method to return a request we fail.
   */
  function failNextRequest(
    db: IDBDatabase,
    _storeName: string,
    storeMethod: string
  ) {
    // Save the real transaction implementation (from createMockDB) before
    // wrapping it for one call. Cast to a loose shape: db here is the mock,
    // not a real IDBDatabase, and we need to call its transaction fn with
    // the (string[], mode) shape the mock expects.
    type LooseTxn = {
      objectStore: (name: string) => Record<string, ReturnType<typeof vi.fn>>;
    };
    type LooseDB = {
      transaction: (
        storeNames: string[],
        mode: string
      ) => LooseTxn;
    };
    const looseDb = db as unknown as LooseDB;
    const realTransaction = looseDb.transaction.bind(looseDb);
    const txnSpy = vi.spyOn(db, 'transaction');
    txnSpy.mockImplementationOnce(((storeNames: string[], mode: string) => {
      const txn = realTransaction(storeNames, mode);
      const store = txn.objectStore(storeNames[0]);
      vi.spyOn(store, storeMethod as never).mockImplementationOnce((() => {
        const req = createMockRequest();
        setTimeout(() => req._error(new DOMException('boom')), 0);
        return req;
      }) as never);
      return txn as unknown as ReturnType<IDBDatabase['transaction']>;
    }) as never);
  }

  describe('request-error branches', () => {
    let mockDB: IDBDatabase;

    beforeEach(() => {
      const { db } = createMockDB();
      mockDB = db;
      setDb(mockDB);
    });

    it('getPDFFromIndexedDB resolves null when the get request errors', async () => {
      failNextRequest(mockDB, STORE_NAME, 'get');
      // Reader wraps runRequest in try/catch and returns null on failure.
      await expect(getPDFFromIndexedDB('any')).resolves.toBeNull();
    });

    it('savePDFToIndexedDB rejects when the put request errors', async () => {
      failNextRequest(mockDB, STORE_NAME, 'put');
      // Writer has no try/catch — rejection propagates from runRequest.
      await expect(
        savePDFToIndexedDB({ id: 'x', name: 'x.pdf' })
      ).rejects.toThrow('boom');
    });

    it('deletePDFFromIndexedDB resolves when the delete request errors', async () => {
      failNextRequest(mockDB, STORE_NAME, 'delete');
      // delete wraps in try/catch and swallows.
      await expect(
        deletePDFFromIndexedDB('x')
      ).resolves.toBeUndefined();
    });

    it('saveBulkEmailRecipientsToIndexedDB rejects when the put request errors', async () => {
      failNextRequest(mockDB, BULK_EMAIL_STORE, 'put');
      // Bulk save is a writer: no try/catch, rejects on error.
      await expect(
        saveBulkEmailRecipientsToIndexedDB('a@test.com')
      ).rejects.toThrow('boom');
    });

    it('getBulkEmailRecipientsFromIndexedDB resolves empty string when get errors', async () => {
      failNextRequest(mockDB, BULK_EMAIL_STORE, 'get');
      await expect(
        getBulkEmailRecipientsFromIndexedDB()
      ).resolves.toBe('');
    });
  });

  describe('getAllPDFKeysFromIndexedDB (orphan-key path)', () => {
    let mockDB: IDBDatabase;

    beforeEach(() => {
      const { db } = createMockDB();
      mockDB = db;
      setDb(mockDB);
    });

    it('returns all stored PDF keys when several PDFs are present', async () => {
      await savePDFToIndexedDB({ id: 'a', name: 'a.pdf' });
      await savePDFToIndexedDB({ id: 'b', name: 'b.pdf' });
      await savePDFToIndexedDB({ id: 'c', name: 'c.pdf' });

      const keys = await getAllPDFKeysFromIndexedDB();
      expect(keys.sort()).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array when the store is empty', async () => {
      const keys = await getAllPDFKeysFromIndexedDB();
      expect(keys).toEqual([]);
    });

    it('resolves an empty array when getAllKeys errors (swallowed)', async () => {
      failNextRequest(mockDB, STORE_NAME, 'getAllKeys');
      await expect(getAllPDFKeysFromIndexedDB()).resolves.toEqual([]);
    });
  });

  describe('round-trip integrity', () => {
    let mockDB: IDBDatabase;

    beforeEach(() => {
      const { db } = createMockDB();
      mockDB = db;
      setDb(mockDB);
    });

    it('PDF record survives a save → read round-trip unchanged', async () => {
      const pdf: PDFRecord = {
        id: 'rt-1',
        name: 'round-trip.pdf',
        data: 'data:application/pdf;base64,' + 'A'.repeat(2048),
      };
      await savePDFToIndexedDB(pdf);

      const back = await getPDFFromIndexedDB('rt-1');
      expect(back).not.toBeNull();
      expect(back!.id).toBe('rt-1');
      expect(back!.name).toBe('round-trip.pdf');
      expect(back!.data).toBe(pdf.data);
    });

    it('bulk recipients (multi-line string) survive a save → read round-trip', async () => {
      const recipients = 'a@test.com\nb@test.com\nc@test.com';
      await saveBulkEmailRecipientsToIndexedDB(recipients);

      const back = await getBulkEmailRecipientsFromIndexedDB();
      expect(back).toBe(recipients);
    });
  });
});
