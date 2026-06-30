/**
 * PromotionPage — React migration of promotion.html
 *
 * Desktop layout (>=1024px): ResizablePanels 50/50 split
 *   Left panel  → Icon toolbar + the selected tool's card
 *   Right panel → Sticky live preview (iframe)
 *
 * Mobile layout (<1024px): IconToolbar + selected tool's card + preview
 *
 * The toolbar acts as a selector: exactly one card is shown at a time — the one
 * whose tool is active in the toolbar (Basic Details on first open). Picking a
 * different tool swaps the card in the same left-column slot.
 *
 * This file is the page shell: profile guard, mount/init, the desktop/mobile
 * layouts, and card-navigation wiring. The pieces live alongside it:
 *   - card registry + per-card content → PromotionCards.tsx
 *   - preview/actions pane             → PreviewColumn.tsx
 *   - page hooks (auto-save, etc.)     → promotion-page-hooks.ts
 *   - shared store selector            → email-data-source.ts
 */

import {
  useEffect,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from 'react';
import { Navigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

import { useHasProfile } from '@/contexts/ProfileProvider';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { usePromotionStore } from '@/stores/promotion-store';
import { IconToolbar } from '@/components/promotion/IconToolbar';
import {
  loadSnapshots,
  persistSnapshots,
  buildSummary,
  MAX_SNAPSHOTS,
} from '@/components/promotion/VersionHistory';
import { StorageKeys } from '@/lib/storage-keys';
import { generatePromotionEmailHTML } from '@/lib/promotion-email-html';
import { buildPromotionEmailData } from '@/lib/newsletter-utils';
import { ResizablePanels } from '@/components/ui/resizable-panels';

import { selectEmailDataSource } from '@/components/promotion/email-data-source';
import {
  getVisibleCardConfigs,
  PromotionCard,
} from '@/components/promotion/PromotionCards';
import { PreviewColumn } from '@/components/promotion/PreviewColumn';
import { useDevMode } from '@/hooks/useDevMode';
import {
  useAutoSave,
  useSaveStatusToast,
  usePdfRestoreToast,
} from '@/components/promotion/promotion-page-hooks';

// VersionHistory is rendered via the card registry, but the page owns the
// 5-minute snapshot loop, so it imports the snapshot helpers directly.

// ===== Main Page Component =====

export function PromotionPage() {
  const hasProfile = useHasProfile();
  const isDesktop = useIsDesktop();
  const store = usePromotionStore(
    useShallow((s) => ({
      ...selectEmailDataSource(s),
      loadFromIndexedDB: s.loadFromIndexedDB,
      initializeDefaultItems: s.initializeDefaultItems,
    }))
  );
  const { devMode } = useDevMode();
  const visibleCards = useMemo(() => getVisibleCardConfigs(devMode), [devMode]);

  // The toolbar is a selector: this is the single card currently shown in the
  // left column. Basic Details is first, so it's what greets the user on open.
  const [selectedCardId, setSelectedCardId] = useState<string>(
    () => getVisibleCardConfigs(devMode)[0]?.id ?? 'basicDetailsCard'
  );

  // Keep the selection valid when the visible set changes (e.g. dev mode turns
  // off while a dev-only tool is selected) — fall back to the first card.
  useEffect(() => {
    if (!visibleCards.some((c) => c.id === selectedCardId)) {
      setSelectedCardId(visibleCards[0]?.id ?? 'basicDetailsCard');
    }
  }, [visibleCards, selectedCardId]);

  // Computed once at page level and passed down to PreviewColumn, so the
  // 1,300-line HTML generation runs once per edit. The useShallow slice
  // above changes identity only when an EmailDataSource field changes.
  //
  // Built from a *deferred* copy of that slice: while the user is typing, React
  // keeps the inputs on the urgent path and lets this build (and the iframe
  // re-parse it drives) coalesce on a pause instead of running every keystroke.
  // Exports read this same value but are click-initiated, so it has settled to
  // the latest content by then.
  const deferredStore = useDeferredValue(store);
  const emailHTML = useMemo(() => {
    if (!deferredStore.promoDateRange) return '';
    return generatePromotionEmailHTML(buildPromotionEmailData(deferredStore));
  }, [deferredStore]);

  // Load persisted state on mount
  useEffect(() => {
    const init = async () => {
      await store.loadFromIndexedDB();
      // Populate defaults only when arrays are empty (fresh state)
      store.initializeDefaultItems();
    };
    init();
    // Mount-only: load persisted state and seed defaults exactly once. The store
    // action identities are stable, so re-running on `store` changes is unwanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save with debounce
  useAutoSave();
  useSaveStatusToast();
  usePdfRestoreToast();

  // Version history: auto-save snapshot every 5 minutes
  const [versionRefreshKey, setVersionRefreshKey] = useState(0);
  useEffect(() => {
    const interval = setInterval(
      () => {
        const data = localStorage.getItem(StorageKeys.promotionBuilderState);
        if (!data || data === '{}') return;

        // Skip if unchanged since last auto-save
        const existing = loadSnapshots();
        const lastAuto = existing.find((s) => s.auto);
        if (lastAuto && lastAuto.data === data) return;

        const snapshot = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: 'Auto-save',
          timestamp: new Date().toISOString(),
          auto: true,
          data,
          summary: buildSummary(data),
        };
        const updated = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
        if (persistSnapshots(updated)) {
          setVersionRefreshKey((k) => k + 1);
          toast.info('Auto-saved snapshot', { duration: 2000 });
        }
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  // Toolbar selection — show the picked tool's card in the left column.
  const handleIconClick = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  // Settings redirect — if no profile, redirect to /settings
  if (!hasProfile) {
    return <Navigate to="/settings" replace state={{ from: '/promotion' }} />;
  }

  // Only one layout is mounted at a time (driven by matchMedia, not CSS
  // hiding) — previously both rendered, doubling every card, editor, and
  // preview iframe.

  // The selected tool's card — the only one shown, shared by both layouts.
  // Keyed by id so swapping tools remounts cleanly (fresh editor state, no
  // stale scroll position carried between unrelated cards).
  const selectedCard = visibleCards.find((c) => c.id === selectedCardId);
  const activeCard = (
    <div className="p-4">
      {selectedCard && (
        <PromotionCard
          key={selectedCard.id}
          config={selectedCard}
          versionRefreshKey={versionRefreshKey}
        />
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="flex h-full overflow-hidden" data-testid="desktop-layout">
        <ResizablePanels
          orientation="vertical"
          defaultSplit={50}
          minPx={[280, 280]}
        >
          {/* Left panel: Icon toolbar + the selected tool's card */}
          <div className="flex h-full min-w-0 flex-col">
            <IconToolbar
              activeCardId={selectedCardId}
              onCardClick={handleIconClick}
            />
            <div className="flex-1 overflow-y-auto min-w-0">{activeCard}</div>
          </div>

          {/* Right panel: Email Preview */}
          <PreviewColumn emailHTML={emailHTML} />
        </ResizablePanels>
      </div>
    );
  }

  // ===== Mobile Layout (<1024px): IconToolbar + selected card + preview =====
  return (
    <div className="flex flex-col h-full" data-testid="mobile-layout">
      {/* Icon toolbar for tool selection */}
      <IconToolbar
        activeCardId={selectedCardId}
        onCardClick={handleIconClick}
      />

      {/* Resizable split: selected card on top, preview on bottom */}
      <ResizablePanels
        orientation="horizontal"
        defaultSplit={60}
        minPx={[200, 150]}
      >
        {/* Selected tool's card */}
        <div className="overflow-y-auto h-full">{activeCard}</div>

        {/* Email preview */}
        <PreviewColumn emailHTML={emailHTML} />
      </ResizablePanels>
    </div>
  );
}
