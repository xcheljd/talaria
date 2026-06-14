/**
 * PromotionPage — React migration of promotion.html
 *
 * Desktop layout (>=1024px): ResizablePanels 50/50 split
 *   Left panel  → Icon toolbar + all cards in single scrollable column
 *   Right panel → Sticky live preview (iframe)
 *
 * Mobile layout (<1024px): IconToolbar + all cards stacked + preview
 *
 * This file is the page shell: profile guard, mount/init, the desktop/mobile
 * layouts, and card-navigation wiring. The pieces live alongside it:
 *   - card registry + per-card content → PromotionCards.tsx
 *   - preview/actions pane             → PreviewColumn.tsx
 *   - page hooks (auto-save, etc.)     → promotion-page-hooks.ts
 *   - shared store selector            → email-data-source.ts
 */

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
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
import { getScrollBehavior } from '@/lib/ui-utils';
import { ResizablePanels } from '@/components/ui/resizable-panels';

import { selectEmailDataSource } from '@/components/promotion/email-data-source';
import {
  CARD_CONFIGS,
  PromotionCard,
} from '@/components/promotion/PromotionCards';
import { PreviewColumn } from '@/components/promotion/PreviewColumn';
import {
  useAutoSave,
  useSaveStatusToast,
  useScrollSpy,
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

  // Tracks which card should be force-expanded (from toolbar/strip click)
  const [forceExpandedCardId, setForceExpandedCardId] = useState<
    string | undefined
  >(undefined);

  // Active card ID for scroll spy highlighting
  const [activeCardId, setActiveCardId] = useState<string | undefined>(
    undefined
  );

  // True when highlight came from click/expand; false when from scroll
  const isUserActionRef = useRef(false);

  // Ref to the scrollable card container of whichever layout is mounted
  // (only one layout renders at a time)
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Computed once at page level and passed down to PreviewColumn, so the
  // 1,300-line HTML generation runs once per edit. The useShallow slice
  // above changes identity only when an EmailDataSource field changes.
  const emailHTML = useMemo(() => {
    if (!store.promoDateRange) return '';
    return generatePromotionEmailHTML(buildPromotionEmailData(store));
  }, [store]);

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

  // Icon toolbar click handler (shared by both layouts — only one mounts)
  const handleIconClick = useCallback(
    (cardId: string) => {
      // Highlight the clicked icon and lock it
      setActiveCardId(cardId);
      isUserActionRef.current = true;

      // Force expand if not already (re-trigger via undefined when re-clicked)
      if (forceExpandedCardId === cardId) {
        setForceExpandedCardId(undefined);
        requestAnimationFrame(() => {
          setForceExpandedCardId(cardId);
        });
      } else {
        setForceExpandedCardId(cardId);
      }

      // Scroll the card into view after the expand has rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const cardEl = cardsContainerRef.current?.querySelector(
            `[data-card-id="${cardId}"]`
          );
          cardEl?.scrollIntoView({
            behavior: getScrollBehavior(),
            block: 'nearest',
          });
        });
      });
    },
    [forceExpandedCardId]
  );

  // Handle card expand/collapse via title — lock highlight to that card
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCardToggle = useCallback((cardId: string, _isOpen: boolean) => {
    setActiveCardId(cardId);
    isUserActionRef.current = true;
  }, []);

  useScrollSpy(cardsContainerRef, isUserActionRef, setActiveCardId, isDesktop);

  // Profile redirect — if no profile, redirect to /start
  if (!hasProfile) {
    return <Navigate to="/start" replace state={{ from: '/promotion' }} />;
  }

  // Only one layout is mounted at a time (driven by matchMedia, not CSS
  // hiding) — previously both rendered, doubling every card, editor, and
  // preview iframe.

  // Card list shared by both layouts
  const cardList = (
    <div className="space-y-3 p-4">
      {CARD_CONFIGS.map((config) => {
        const showDivider =
          config.id === 'subjectCard' || config.id === 'emailThemeCard';
        return (
          <div key={config.id}>
            {showDivider && <div className="h-px bg-border mb-3" />}
            <PromotionCard
              config={config}
              forceExpand={forceExpandedCardId === config.id}
              onToggle={handleCardToggle}
              versionRefreshKey={versionRefreshKey}
            />
          </div>
        );
      })}
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
          {/* Left panel: Icon toolbar + all cards */}
          <div className="flex h-full min-w-0 flex-col">
            <IconToolbar
              activeCardId={activeCardId}
              onCardClick={handleIconClick}
            />
            <div
              className="flex-1 overflow-y-auto min-w-0"
              ref={cardsContainerRef}
            >
              {cardList}
            </div>
          </div>

          {/* Right panel: Email Preview */}
          <PreviewColumn emailHTML={emailHTML} />
        </ResizablePanels>
      </div>
    );
  }

  // ===== Mobile Layout (<1024px): IconToolbar + all cards + preview =====
  return (
    <div className="flex flex-col h-full" data-testid="mobile-layout">
      {/* Icon toolbar for mobile navigation */}
      <IconToolbar activeCardId={activeCardId} onCardClick={handleIconClick} />

      {/* Resizable split: cards on top, preview on bottom */}
      <ResizablePanels
        orientation="horizontal"
        defaultSplit={60}
        minPx={[200, 150]}
      >
        {/* All cards */}
        <div className="overflow-y-auto h-full" ref={cardsContainerRef}>
          {cardList}
        </div>

        {/* Email preview */}
        <PreviewColumn emailHTML={emailHTML} />
      </ResizablePanels>
    </div>
  );
}
