/**
 * Bulk-email domain store (plan 022 slice).
 *
 * Mirrors the bulk-email fields of the main promotion store with write-through
 * setters, so the main store (and the export config / auto-save / preview
 * actions that read it) always sees the latest values. A subscription mirrors
 * main-store changes (restore/import/reset) back into this store.
 *
 * NOTE: `bulkEmailDownloadFormat` / `bulkEmailBatchSize` are NOT store state —
 * they are raw localStorage keys read/written by BulkEmailTools and
 * bulk-email-generation.ts, so they stay where they are.
 */

import { create } from 'zustand';
import { usePromotionStore } from './promotion-store';

export interface BulkEmailState {
  bulkEmailRecipients: string;
  bulkEmailHasRecipients: boolean;
  bulkEmailGenerating: boolean;
  bulkEmailProgress: string;
  setBulkEmailRecipients: (text: string) => void;
  setBulkEmailHasRecipients: (has: boolean) => void;
  setBulkEmailGenerating: (generating: boolean, progress?: string) => void;
}

export const useBulkEmailStore = create<BulkEmailState>((set) => ({
  // Seed from the main store so the mirror is correct from first render.
  bulkEmailRecipients: usePromotionStore.getState().bulkEmailRecipients,
  bulkEmailHasRecipients: usePromotionStore.getState().bulkEmailHasRecipients,
  bulkEmailGenerating: usePromotionStore.getState().bulkEmailGenerating,
  bulkEmailProgress: usePromotionStore.getState().bulkEmailProgress,

  setBulkEmailRecipients: (text) => {
    set({
      bulkEmailRecipients: text,
      bulkEmailHasRecipients: text.trim().length > 0,
    });
    usePromotionStore.getState().setBulkEmailRecipients(text);
  },

  setBulkEmailHasRecipients: (has) => {
    set({ bulkEmailHasRecipients: has });
    usePromotionStore.setState({ bulkEmailHasRecipients: has });
  },

  setBulkEmailGenerating: (generating, progress = '') => {
    set({
      bulkEmailGenerating: generating,
      bulkEmailProgress: progress,
    });
    usePromotionStore.getState().setBulkEmailGenerating(generating, progress);
  },
}));

// Mirror main → bulk-email so restoreState (which hydrates recipients from
// IndexedDB) and resetState keep the domain store coherent.
usePromotionStore.subscribe((state, prev) => {
  if (
    state.bulkEmailRecipients === prev.bulkEmailRecipients &&
    state.bulkEmailHasRecipients === prev.bulkEmailHasRecipients &&
    state.bulkEmailGenerating === prev.bulkEmailGenerating &&
    state.bulkEmailProgress === prev.bulkEmailProgress
  ) {
    return;
  }
  useBulkEmailStore.setState({
    bulkEmailRecipients: state.bulkEmailRecipients,
    bulkEmailHasRecipients: state.bulkEmailHasRecipients,
    bulkEmailGenerating: state.bulkEmailGenerating,
    bulkEmailProgress: state.bulkEmailProgress,
  });
});
