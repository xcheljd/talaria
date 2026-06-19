/**
 * Page-level hooks for the promotion builder: debounced auto-save, the global
 * save-failure toast, and the scroll-spy that highlights the active card.
 * Extracted from PromotionPage to keep the page component focused on layout.
 */

import { useEffect, useRef, type RefObject } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

import { usePromotionStore } from '@/stores/promotion-store';
import { selectEmailDataSource } from './email-data-source';

/** Debounced auto-save to IndexedDB. */
export function useAutoSave() {
  // Selects exactly the persisted fields: the useShallow slice changes
  // identity only when one of them changes, which is what should trigger
  // a save. New persisted fields added to the store must be added here.
  const store = usePromotionStore(
    useShallow((s) => ({
      ...selectEmailDataSource(s),
      attachedPDFs: s.attachedPDFs,
      generatedSubjectLines: s.generatedSubjectLines,
      selectedSubjectLine: s.selectedSubjectLine,
      isInitializing: s.isInitializing,
      saveToIndexedDB: s.saveToIndexedDB,
    }))
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Watch for state changes and trigger debounced save
  useEffect(() => {
    // Don't auto-save during initialization
    if (store.isInitializing) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      store.saveToIndexedDB();
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [store]);
}

/**
 * Surface auto-save failures globally. The PDF card shows a small badge, but
 * it's collapsed by default — a user editing any other section would never see
 * a failed save. Fire a persistent, deduped toast on the ok→warning transition
 * (not on every debounced save) and clear it when saving recovers.
 */
export function useSaveStatusToast() {
  const saveStatus = usePromotionStore((s) => s.saveStatus);
  const prev = useRef(saveStatus);

  useEffect(() => {
    if (prev.current !== 'warning' && saveStatus === 'warning') {
      toast.warning(
        'Auto-save failed — your changes are kept in memory but may not survive a refresh. Free up device storage and keep this tab open.',
        { id: 'promo-save-warning', duration: Infinity }
      );
    } else if (prev.current === 'warning' && saveStatus === 'ok') {
      toast.dismiss('promo-save-warning');
      toast.success('Auto-save recovered');
    }
    prev.current = saveStatus;
  }, [saveStatus]);
}

/**
 * One-time warning when PDF attachments couldn't be restored on load. Mirrors
 * the save-failure toast, but for the rehydration path: a user whose PDF card is
 * collapsed would otherwise never know an attachment silently vanished.
 */
export function usePdfRestoreToast() {
  const pdfRestoreWarning = usePromotionStore((s) => s.pdfRestoreWarning);
  const clear = usePromotionStore((s) => s.clearPdfRestoreWarning);
  useEffect(() => {
    if (pdfRestoreWarning) {
      toast.warning(
        'Some PDF attachments could not be restored from storage. Re-attach them if needed.',
        { id: 'promo-pdf-restore-warning', duration: Infinity }
      );
      clear();
    }
  }, [pdfRestoreWarning, clear]);
}

/** Highlight the card scrolled into view; re-attaches on layout change. */
export function useScrollSpy(
  containerRef: RefObject<HTMLDivElement | null>,
  isUserActionRef: RefObject<boolean>,
  setActiveCardId: (id: string) => void,
  /** Re-attach when the active layout (and thus the container) changes */
  layoutKey: boolean
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let debounceTimer: ReturnType<typeof setTimeout>;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isUserActionRef.current) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          let best: { id: string; ratio: number } | null = null;
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const id = (entry.target as HTMLElement).dataset.cardId;
              if (id && entry.intersectionRatio > (best?.ratio ?? 0)) {
                best = { id, ratio: entry.intersectionRatio };
              }
            }
          }
          if (best) setActiveCardId(best.id);
        }, 300);
      },
      { root: container, threshold: 0.3 }
    );

    const cards = container.querySelectorAll('[data-card-id]');
    cards.forEach((card) => observer.observe(card));

    const handleScroll = () => {
      isUserActionRef.current = false;
    };
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(debounceTimer);
    };
    // containerRef and isUserActionRef are stable refs; setActiveCardId is a
    // stable state setter. layoutKey forces re-attachment when the rendered
    // layout (desktop vs mobile) switches and the old container unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);
}
