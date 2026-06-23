/**
 * Promotion builder card registry and per-card content.
 *
 * CARD_CONFIGS drives the order/titles of the editor cards; PromotionCard wires
 * one config to its content component and the filled/empty status dot. Extracted
 * from PromotionPage to keep the page focused on layout.
 */

import { lazy, memo, Suspense } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  usePromotionStore,
  DEFAULT_EMAIL_PALETTE,
  type PromotionState,
} from '@/stores/promotion-store';
import { CollapsibleCard } from '@/components/promotion/CollapsibleCard';
import { BasicDetailsEditor } from '@/components/promotion/BasicDetailsEditor';
import { DiscountEntriesEditor } from '@/components/promotion/DiscountEntriesEditor';
import { FormattableItemEditor } from '@/components/promotion/FormattableItemEditor';
import { SpecialHoursEditor } from '@/components/promotion/SpecialHoursEditor';
import { PDFAttachments } from '@/components/promotion/PDFAttachments';
import { SubjectLineGenerator } from '@/components/promotion/SubjectLineGenerator';
import { BulkEmailTools } from '@/components/promotion/BulkEmailTools';
import { AccessibilityChecker } from '@/components/promotion/AccessibilityChecker';
import { VersionHistory } from '@/components/promotion/VersionHistory';
import { OutlookChecker } from '@/components/promotion/OutlookChecker';
import { EmailThemeEditor } from '@/components/promotion/EmailThemeEditor';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// The newsletter editor pulls in TipTap + ~16 extensions (incl. lowlight/
// highlight.js) — the bulk of this route's JS. Its card is collapsed by
// default, so load it on demand when the card first opens instead of at
// startup, keeping it out of the initial parse.
const NewsletterEditor = lazy(() =>
  import('@/components/promotion/NewsletterEditor').then((m) => ({
    default: m.NewsletterEditor,
  }))
);

// ===== Card Configuration =====

export interface CardConfig {
  id: string;
  title: string;
  defaultCollapsed: boolean;
  /** When true, the card is only rendered in dev mode. */
  devOnly?: boolean;
}

export const CARD_CONFIGS: CardConfig[] = [
  { id: 'basicDetailsCard', title: 'Basic Details', defaultCollapsed: false },
  {
    id: 'newsletterCard',
    title: 'Newsletter',
    defaultCollapsed: true,
  },
  {
    id: 'discountEntriesCard',
    title: 'Discount Entries',
    defaultCollapsed: true,
  },
  { id: 'howToShopCard', title: 'How to Shop', defaultCollapsed: true },
  {
    id: 'importantNotesCard',
    title: 'Important Notes',
    defaultCollapsed: true,
  },
  { id: 'specialHoursCard', title: 'Special Hours', defaultCollapsed: true },
  { id: 'subjectCard', title: 'Subject Lines', defaultCollapsed: true },
  { id: 'pdfCard', title: 'PDF Attachments', defaultCollapsed: true },
  { id: 'bulkEmailCard', title: 'Bulk Email Tools', defaultCollapsed: true },
  {
    id: 'emailThemeCard',
    title: 'Email Theme',
    defaultCollapsed: true,
    devOnly: true,
  },
  {
    id: 'accessibilityCard',
    title: 'Accessibility Check',
    defaultCollapsed: true,
    devOnly: true,
  },
  {
    id: 'versionHistoryCard',
    title: 'Version History',
    defaultCollapsed: true,
  },
  {
    id: 'outlookCard',
    title: 'Outlook Compatibility',
    defaultCollapsed: true,
    devOnly: true,
  },
];

/**
 * Returns the visible card configs for the given dev mode state. Dev-only
 * cards are filtered out when dev mode is off.
 */
export function getVisibleCardConfigs(devMode: boolean): CardConfig[] {
  return CARD_CONFIGS.filter((c) => devMode || !c.devOnly);
}

// ===== Card Content Components =====

/** Get content component for a specific card */
function getCardContent(
  cardId: string,
  extra?: {
    versionRefreshKey?: number;
  }
) {
  switch (cardId) {
    case 'basicDetailsCard':
      return <BasicDetailsEditor />;
    case 'emailThemeCard':
      return <EmailThemeEditor />;
    case 'newsletterCard':
      return (
        <ErrorBoundary level="component">
          <Suspense
            fallback={
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading editor…
              </div>
            }
          >
            <NewsletterEditor />
          </Suspense>
        </ErrorBoundary>
      );
    case 'discountEntriesCard':
      return <DiscountEntriesEditor />;
    case 'howToShopCard':
      return <HowToShopEditor />;
    case 'importantNotesCard':
      return <ImportantNotesEditor />;
    case 'specialHoursCard':
      return <SpecialHoursEditor />;
    case 'pdfCard':
      return (
        <ErrorBoundary level="component">
          <PDFAttachments />
        </ErrorBoundary>
      );
    case 'subjectCard':
      return <SubjectLineGenerator />;
    case 'accessibilityCard':
      return <AccessibilityChecker />;
    case 'versionHistoryCard':
      return <VersionHistory refreshKey={extra?.versionRefreshKey} />;
    case 'outlookCard':
      return (
        <ErrorBoundary level="component">
          <OutlookChecker />
        </ErrorBoundary>
      );
    case 'bulkEmailCard':
      return (
        <ErrorBoundary level="component">
          <BulkEmailTools />
        </ErrorBoundary>
      );
    default:
      return <CardPlaceholderContent cardId={cardId} />;
  }
}

/** Color picker row for section box border/background */
function SectionColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  const isActive = value !== null;
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground w-20 shrink-0">
        {label}
      </label>
      {isActive ? (
        <>
          <div
            className="h-5 w-5 rounded border border-border shrink-0"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-6 w-8 cursor-pointer rounded border-0 p-0"
            aria-label={`Pick ${label} color`}
          />
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => onChange(null)}
          >
            reset
          </button>
        </>
      ) : (
        <button
          type="button"
          className="text-[10px] rounded border px-2 py-0.5 hover:bg-accent/50 transition-colors text-muted-foreground"
          onClick={() => onChange('#cccccc')}
        >
          Set custom color
        </button>
      )}
    </div>
  );
}

/** How to Shop editor connected to store */
function HowToShopEditor() {
  const store = usePromotionStore(
    useShallow((s) => ({
      howToShopItems: s.howToShopItems,
      howToShopStyle: s.howToShopStyle,
      setHowToShopStyle: s.setHowToShopStyle,
      addHowToShopItem: s.addHowToShopItem,
      removeHowToShopItem: s.removeHowToShopItem,
      updateHowToShopItem: s.updateHowToShopItem,
      moveHowToShopItemUp: s.moveHowToShopItemUp,
      moveHowToShopItemDown: s.moveHowToShopItemDown,
      toggleHowToShopFormat: s.toggleHowToShopFormat,
      reorderHowToShopItems: s.reorderHowToShopItems,
    }))
  );
  return (
    <div className="space-y-3">
      <FormattableItemEditor
        items={store.howToShopItems}
        actions={{
          addItem: store.addHowToShopItem,
          removeItem: store.removeHowToShopItem,
          updateItem: store.updateHowToShopItem,
          moveItemUp: store.moveHowToShopItemUp,
          moveItemDown: store.moveHowToShopItemDown,
          toggleFormat: store.toggleHowToShopFormat,
          reorderItems: store.reorderHowToShopItems,
        }}
        placeholder="e.g., Visit us in-store for outlet-exclusive deals"
        itemLabel="Item"
        emptyMessage={
          'No shopping instructions yet. Click "Add Item" to get started.'
        }
      />
      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Box Style</p>
        <SectionColorPicker
          label="Background"
          value={store.howToShopStyle.backgroundColor}
          onChange={(c) => store.setHowToShopStyle({ backgroundColor: c })}
        />
        <SectionColorPicker
          label="Border"
          value={store.howToShopStyle.borderColor}
          onChange={(c) => store.setHowToShopStyle({ borderColor: c })}
        />
      </div>
    </div>
  );
}

/** Important Notes editor connected to store */
function ImportantNotesEditor() {
  const store = usePromotionStore(
    useShallow((s) => ({
      importantNotesItems: s.importantNotesItems,
      importantNotesStyle: s.importantNotesStyle,
      setImportantNotesStyle: s.setImportantNotesStyle,
      addImportantNotesItem: s.addImportantNotesItem,
      removeImportantNotesItem: s.removeImportantNotesItem,
      updateImportantNotesItem: s.updateImportantNotesItem,
      moveImportantNotesItemUp: s.moveImportantNotesItemUp,
      moveImportantNotesItemDown: s.moveImportantNotesItemDown,
      toggleImportantNotesFormat: s.toggleImportantNotesFormat,
      reorderImportantNotesItems: s.reorderImportantNotesItems,
    }))
  );
  return (
    <div className="space-y-3">
      <FormattableItemEditor
        items={store.importantNotesItems}
        actions={{
          addItem: store.addImportantNotesItem,
          removeItem: store.removeImportantNotesItem,
          updateItem: store.updateImportantNotesItem,
          moveItemUp: store.moveImportantNotesItemUp,
          moveItemDown: store.moveImportantNotesItemDown,
          toggleFormat: store.toggleImportantNotesFormat,
          reorderItems: store.reorderImportantNotesItems,
        }}
        placeholder="e.g., Important safety information or key details"
        itemLabel="Note"
        emptyMessage={
          'No important notes yet. Click "Add Note" to get started.'
        }
      />
      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Box Style</p>
        <SectionColorPicker
          label="Border"
          value={store.importantNotesStyle.borderColor}
          onChange={(c) => store.setImportantNotesStyle({ borderColor: c })}
        />
        <SectionColorPicker
          label="Background"
          value={store.importantNotesStyle.backgroundColor}
          onChange={(c) => store.setImportantNotesStyle({ backgroundColor: c })}
        />
      </div>
    </div>
  );
}

/** Placeholder content for cards not yet migrated */
function CardPlaceholderContent({ cardId }: { cardId: string }) {
  const messages: Record<string, string> = {
    bulkEmailCard:
      'Manage recipients and generate email batches for bulk sending.',
  };

  return <p className="text-sm text-muted-foreground">{messages[cardId]}</p>;
}

// ===== Check if a card has content =====

/** State slice needed to compute card status dots */
type CardContentState = Pick<
  PromotionState,
  | 'promoDateRange'
  | 'promoYear'
  | 'promoTitle'
  | 'promotionEntries'
  | 'specialHours'
  | 'howToShopItems'
  | 'importantNotesItems'
  | 'attachedPDFs'
  | 'selectedSubjectLine'
  | 'generatedSubjectLines'
  | 'newsletterBody'
  | 'newsletterVisible'
  | 'emailPalette'
  | 'bulkEmailHasRecipients'
>;

function getCardHasContent(cardId: string, store: CardContentState): boolean {
  switch (cardId) {
    case 'basicDetailsCard':
      return !!(
        store.promoDateRange.trim() ||
        store.promoYear.trim() ||
        store.promoTitle.trim()
      );
    case 'newsletterCard':
      return (
        store.newsletterVisible &&
        store.newsletterBody.trim() !== '' &&
        store.newsletterBody.trim() !== '<p></p>' &&
        store.newsletterBody.trim() !== '<p><br></p>'
      );
    case 'discountEntriesCard':
      return store.promotionEntries.some(
        (e) => e.line?.trim() || e.collections?.trim() || e.callout?.trim()
      );
    case 'howToShopCard':
      return store.howToShopItems.some((i) => i.text?.trim());
    case 'importantNotesCard':
      return store.importantNotesItems.some((i) => i.text?.trim());
    case 'specialHoursCard':
      return store.specialHours.some((h) => h.day?.trim() || h.hours?.trim());
    case 'pdfCard':
      return store.attachedPDFs.length > 0;
    case 'subjectCard':
      return !!(
        store.selectedSubjectLine || store.generatedSubjectLines.length > 0
      );
    case 'emailThemeCard': {
      const { emailPalette } = store;
      return Object.keys(emailPalette).some(
        (k) =>
          emailPalette[k as keyof typeof emailPalette] !==
          DEFAULT_EMAIL_PALETTE[k as keyof typeof DEFAULT_EMAIL_PALETTE]
      );
    }
    case 'bulkEmailCard':
      return store.bulkEmailHasRecipients;
    default:
      return false;
  }
}

// ===== Individual Card Component =====
// Subscribes to store to compute hasContent per-card

export const PromotionCard = memo(function PromotionCard({
  config,
  forceExpand,
  onToggle,
  versionRefreshKey,
}: {
  config: CardConfig;
  forceExpand?: boolean;
  onToggle?: (cardId: string, isOpen: boolean) => void;
  versionRefreshKey?: number;
}) {
  // Subscribe to the derived boolean only. The previous slice covered every
  // card's data, so any keystroke in any field re-rendered every card just to
  // recompute this indicator. The indicator flips rarely, so reading the
  // computed value re-renders this card only when its own content appears or
  // disappears. The editors inside subscribe to their own slices.
  const hasContent = usePromotionStore((s) => getCardHasContent(config.id, s));

  return (
    <CollapsibleCard
      cardId={config.id}
      title={config.title}
      hasContent={hasContent}
      defaultCollapsed={config.defaultCollapsed}
      forceExpand={forceExpand}
      onToggle={onToggle}
    >
      {getCardContent(config.id, { versionRefreshKey })}
    </CollapsibleCard>
  );
});
