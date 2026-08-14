/**
 * Characterization tests pinning the persistData/restoreState round-trip for
 * the newsletter and bulk-email domains (plan 022 safety net).
 *
 * These tests run BEFORE the store slices move anywhere: they document the
 * exact persistence contract the new stores must preserve — newsletter fields
 * round-trip through the localStorage JSON blob, while bulk-email fields are
 * transient (recipients live in IndexedDB, not the persistData JSON).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  usePromotionStore,
  _resetIdCounter,
  DEFAULT_NEWSLETTER_STYLE,
} from '@/stores/promotion-store';
import {
  getBulkEmailRecipientsFromIndexedDB,
  initIndexedDB,
} from '@/lib/db';

vi.mock('@/lib/db', () => ({
  initIndexedDB: vi.fn().mockResolvedValue(true),
  savePDFToIndexedDB: vi.fn().mockResolvedValue('pdf-id'),
  getPDFFromIndexedDB: vi.fn().mockResolvedValue(null),
  deletePDFFromIndexedDB: vi.fn().mockResolvedValue(undefined),
  clearAllPDFsFromIndexedDB: vi.fn().mockResolvedValue(undefined),
  getAllPDFKeysFromIndexedDB: vi.fn().mockResolvedValue([]),
  saveBulkEmailRecipientsToIndexedDB: vi.fn().mockResolvedValue(undefined),
  getBulkEmailRecipientsFromIndexedDB: vi.fn().mockResolvedValue(''),
  clearBulkEmailRecipientsFromIndexedDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/profile', () => ({
  getStorePhone: vi.fn().mockReturnValue('702-555-0190'),
  getStoreEmail: vi.fn().mockReturnValue('store@example.com'),
  getDirections: vi.fn().mockReturnValue(''),
}));

describe('persistData round-trip (plan 022 characterization)', () => {
  beforeEach(() => {
    usePromotionStore.getState().resetState();
    _resetIdCounter();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('newsletter fields', () => {
    it('persists every newsletter field with its exact value', async () => {
      const store = usePromotionStore.getState();
      store.setNewsletterHeading('Holiday Hours');
      store.setNewsletterBody('<p>Closed on Sunday</p>');
      store.setNewsletterPosition('bottom');
      store.setNewsletterStyle({
        borderColor: '#ff0000',
        backgroundColor: '#00ff00',
        borderStyle: 'full',
      });
      store.setNewsletterVisible(true);

      await store.persistState();

      const saved = JSON.parse(
        localStorage.getItem('promotionBuilderState')!
      );
      expect(saved.newsletterHeading).toBe('Holiday Hours');
      expect(saved.newsletterBody).toBe('<p>Closed on Sunday</p>');
      expect(saved.newsletterPosition).toBe('bottom');
      expect(saved.newsletterStyle.borderColor).toBe('#ff0000');
      expect(saved.newsletterStyle.backgroundColor).toBe('#00ff00');
      expect(saved.newsletterStyle.borderStyle).toBe('full');
      expect(saved.newsletterVisible).toBe(true);
    });

    it('round-trips newsletter fields through restoreState', async () => {
      const store = usePromotionStore.getState();
      store.setNewsletterHeading('Holiday Hours');
      store.setNewsletterBody('<p>Closed on Sunday</p>');
      store.setNewsletterPosition('bottom');
      store.setNewsletterStyle({
        borderColor: '#ff0000',
        headingAlign: 'center',
        tableBorderWidth: 2,
      });
      store.setNewsletterVisible(true);
      await store.persistState();

      // Wipe in-memory state, then restore from the persisted JSON.
      usePromotionStore.getState().resetState();
      expect(usePromotionStore.getState().newsletterHeading).toBe(
        'Newsletter'
      );

      await usePromotionStore.getState().restoreState();

      const state = usePromotionStore.getState();
      expect(state.newsletterHeading).toBe('Holiday Hours');
      // Restore migration prepends the heading as an H2 when it differs from
      // the default — pin the real behavior.
      expect(state.newsletterBody).toBe(
        '<h2>Holiday Hours</h2><p>Closed on Sunday</p>'
      );
      expect(state.newsletterPosition).toBe('bottom');
      expect(state.newsletterStyle.borderColor).toBe('#ff0000');
      expect(state.newsletterStyle.headingAlign).toBe('center');
      expect(state.newsletterStyle.tableBorderWidth).toBe(2);
      expect(state.newsletterVisible).toBe(true);
    });

    it('round-trips defaults when nothing was persisted', async () => {
      await usePromotionStore.getState().persistState();
      usePromotionStore.getState().resetState();
      await usePromotionStore.getState().restoreState();

      const state = usePromotionStore.getState();
      expect(state.newsletterHeading).toBe('Newsletter');
      expect(state.newsletterBody).toBe('');
      expect(state.newsletterPosition).toBe('top');
      expect(state.newsletterStyle).toEqual(DEFAULT_NEWSLETTER_STYLE);
      expect(state.newsletterVisible).toBe(false);
    });
  });

  describe('bulk-email fields', () => {
    it('does NOT write bulk-email state into the persistData JSON', async () => {
      const store = usePromotionStore.getState();
      store.setBulkEmailRecipients('a@x.com, b@x.com');
      store.setBulkEmailGenerating(true, '3 of 10');
      store.setBulkEmailHasRecipients(true);

      await store.persistState();

      const saved = JSON.parse(
        localStorage.getItem('promotionBuilderState')!
      );
      expect(saved.bulkEmailRecipients).toBeUndefined();
      expect(saved.bulkEmailGenerating).toBeUndefined();
      expect(saved.bulkEmailProgress).toBeUndefined();
      expect(saved.bulkEmailHasRecipients).toBeUndefined();
    });

    it('restores recipients from IndexedDB during restoreState', async () => {
      vi.mocked(getBulkEmailRecipientsFromIndexedDB).mockResolvedValue(
        'x@x.com, y@y.com'
      );

      usePromotionStore.getState().resetState();
      expect(usePromotionStore.getState().bulkEmailRecipients).toBe('');

      await usePromotionStore.getState().restoreState();

      const state = usePromotionStore.getState();
      expect(state.bulkEmailRecipients).toBe('x@x.com, y@y.com');
      expect(state.bulkEmailHasRecipients).toBe(true);
      expect(initIndexedDB).toHaveBeenCalled();
    });

    it('starts with empty recipients when IndexedDB has none', async () => {
      vi.mocked(getBulkEmailRecipientsFromIndexedDB).mockResolvedValue('');

      usePromotionStore.getState().resetState();
      await usePromotionStore.getState().restoreState();

      const state = usePromotionStore.getState();
      expect(state.bulkEmailRecipients).toBe('');
      expect(state.bulkEmailHasRecipients).toBe(false);
    });
  });
});
