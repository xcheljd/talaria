/**
 * Newsletter domain store (plan 022 slice).
 *
 * The newsletter fields are PERSISTED through the main promotion store's
 * persistData/restoreState (the import/export config and auto-save read them
 * from the main store via selectEmailDataSource), so the fields stay there and
 * this store MIRRORS them:
 *
 * - Setters write to BOTH stores (write-through), so the main store — and
 *   therefore persistence, export/import, and email HTML generation — always
 *   sees the latest newsletter values.
 * - A subscription mirrors main-store changes back into this store, so a
 *   restoreState/import/reset that updates the main store's newsletter fields
 *   is reflected here without components having to resubscribe.
 *
 * Components in the newsletter domain read/write THIS store; everything else
 * keeps reading the main store (kept fresh by the write-through).
 */

import { create } from 'zustand';
import {
  usePromotionStore,
  type NewsletterPosition,
  type NewsletterStyle,
} from './promotion-store';

export interface NewsletterState {
  newsletterHeading: string;
  newsletterBody: string;
  newsletterPosition: NewsletterPosition;
  newsletterStyle: NewsletterStyle;
  newsletterVisible: boolean;
  setNewsletterHeading: (value: string) => void;
  setNewsletterBody: (value: string) => void;
  setNewsletterPosition: (value: NewsletterPosition) => void;
  setNewsletterStyle: (style: Partial<NewsletterStyle>) => void;
  setNewsletterVisible: (visible: boolean) => void;
  clearNewsletter: () => void;
}

export const useNewsletterStore = create<NewsletterState>((set) => ({
  // Seed from the main store so the mirror is correct from first render.
  newsletterHeading: usePromotionStore.getState().newsletterHeading,
  newsletterBody: usePromotionStore.getState().newsletterBody,
  newsletterPosition: usePromotionStore.getState().newsletterPosition,
  newsletterStyle: usePromotionStore.getState().newsletterStyle,
  newsletterVisible: usePromotionStore.getState().newsletterVisible,

  setNewsletterHeading: (value) => {
    set({ newsletterHeading: value });
    // Write through the main store's ACTION (not setState) so any action
    // side effects run and the mock/main store sees the same call path.
    usePromotionStore.getState().setNewsletterHeading(value);
  },

  setNewsletterBody: (value) => {
    set({ newsletterBody: value });
    usePromotionStore.getState().setNewsletterBody(value);
  },

  setNewsletterPosition: (value) => {
    set({ newsletterPosition: value });
    usePromotionStore.getState().setNewsletterPosition(value);
  },

  setNewsletterStyle: (style) => {
    set((state) => ({
      newsletterStyle: { ...state.newsletterStyle, ...style },
    }));
    usePromotionStore.getState().setNewsletterStyle(style);
  },

  setNewsletterVisible: (visible) => {
    set({ newsletterVisible: visible });
    usePromotionStore.getState().setNewsletterVisible(visible);
  },

  clearNewsletter: () => {
    // Mirror the main store's clearNewsletter semantics exactly (it resets
    // heading/body/position/style — NOT newsletterVisible).
    const main = usePromotionStore.getState();
    main.clearNewsletter();
    set({
      newsletterHeading: main.newsletterHeading,
      newsletterBody: main.newsletterBody,
      newsletterPosition: main.newsletterPosition,
      newsletterStyle: main.newsletterStyle,
    });
  },
}));

// Mirror main → newsletter so restoreState / import / reset keep the domain
// store coherent without components having to know which store wrote last.
usePromotionStore.subscribe((state, prev) => {
  if (
    state.newsletterHeading === prev.newsletterHeading &&
    state.newsletterBody === prev.newsletterBody &&
    state.newsletterPosition === prev.newsletterPosition &&
    state.newsletterStyle === prev.newsletterStyle &&
    state.newsletterVisible === prev.newsletterVisible
  ) {
    return;
  }
  useNewsletterStore.setState({
    newsletterHeading: state.newsletterHeading,
    newsletterBody: state.newsletterBody,
    newsletterPosition: state.newsletterPosition,
    newsletterStyle: state.newsletterStyle,
    newsletterVisible: state.newsletterVisible,
  });
});
