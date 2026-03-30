/**
 * PromotionPage — React migration of promotion.html
 *
 * Three-column layout:
 *   Left column  → Promo body details (Basic Details, Discount Entries, How to Shop, Important Notes, Special Hours)
 *   Center column → Email tools (PDF Attachments, Subject Lines, Bulk Email Tools)
 *   Right column → Sticky live preview (iframe)
 *
 * Features:
 * - Collapsible cards with status dots (filled/empty)
 * - Skinny column collapse/expand navigation (desktop only)
 * - Responsive layout below 1024px (single column, all stacked)
 * - Profile redirect if no profile saved
 */

import { useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  RotateCcw,
  Eye,
  Code,
  Mail,
  FileDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useHasProfile } from '@/contexts/ProfileProvider';
import { usePromotionStore } from '@/stores/promotion-store';
import { CollapsibleCard } from '@/components/promotion/CollapsibleCard';
import {
  SkinnyColumnBar,
  type SkinnyCardInfo,
} from '@/components/promotion/SkinnyColumnBar';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ===== Card Configuration =====

interface CardConfig {
  id: string;
  title: string;
  column: 'left' | 'center';
  defaultCollapsed: boolean;
}

const CARD_CONFIGS: CardConfig[] = [
  {
    id: 'basicDetailsCard',
    title: 'Basic Details',
    column: 'left',
    defaultCollapsed: false,
  },
  {
    id: 'discountEntriesCard',
    title: 'Discount Entries',
    column: 'left',
    defaultCollapsed: false,
  },
  {
    id: 'howToShopCard',
    title: 'How to Shop',
    column: 'left',
    defaultCollapsed: true,
  },
  {
    id: 'importantNotesCard',
    title: 'Important Notes',
    column: 'left',
    defaultCollapsed: true,
  },
  {
    id: 'specialHoursCard',
    title: 'Special Hours',
    column: 'left',
    defaultCollapsed: true,
  },
  {
    id: 'pdfCard',
    title: 'PDF Attachments',
    column: 'center',
    defaultCollapsed: false,
  },
  {
    id: 'subjectCard',
    title: 'Subject Lines',
    column: 'center',
    defaultCollapsed: false,
  },
  {
    id: 'bulkEmailCard',
    title: 'Bulk Email Tools',
    column: 'center',
    defaultCollapsed: false,
  },
];

// ===== Placeholder Content for Cards =====

function CardPlaceholderContent({ cardId }: { cardId: string }) {
  const messages: Record<string, string> = {
    basicDetailsCard:
      'Promotion title, dates, and intro text will be configured here.',
    discountEntriesCard:
      'Add discount entries with brand, discount percentage, and details.',
    howToShopCard:
      'Add shopping instructions with bold/italic/underline formatting.',
    importantNotesCard:
      'Add important notes and fine print for the promotion.',
    specialHoursCard:
      'Add special hours for the promotion period (e.g., extended hours).',
    pdfCard: 'Upload PDF attachments to include with the promotion email.',
    subjectCard: 'Generate email subject lines from promotion content.',
    bulkEmailCard:
      'Manage recipients and generate email batches for bulk sending.',
  };

  return <p className="text-sm text-muted-foreground">{messages[cardId]}</p>;
}

// ===== Check if a card has content =====

function getCardHasContent(cardId: string, store: ReturnType<typeof usePromotionStore.getState>): boolean {
  switch (cardId) {
    case 'basicDetailsCard':
      return (
        store.promotionEntries.length > 0 ||
        store.specialHours.length > 0 ||
        store.howToShopItems.length > 0 ||
        store.importantNotesItems.length > 0
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
      return store.specialHours.some(
        (h) => h.day?.trim() || h.hours?.trim()
      );
    case 'pdfCard':
      return store.attachedPDFs.length > 0;
    case 'subjectCard':
      return !!(
        store.selectedSubjectLine ||
        store.generatedSubjectLines.length > 0
      );
    case 'bulkEmailCard':
      return false;
    default:
      return false;
  }
}

// ===== Individual Card Component =====
// Subscribes to store to compute hasContent per-card

function PromotionCard({ config }: { config: CardConfig }) {
  const store = usePromotionStore();

  const hasContent = useMemo(
    () => getCardHasContent(config.id, store),
    [
      config.id,
      store.promotionEntries,
      store.specialHours,
      store.howToShopItems,
      store.importantNotesItems,
      store.attachedPDFs,
      store.selectedSubjectLine,
      store.generatedSubjectLines,
    ]
  );

  return (
    <CollapsibleCard
      cardId={config.id}
      title={config.title}
      hasContent={hasContent}
      defaultCollapsed={config.defaultCollapsed}
    >
      <CardPlaceholderContent cardId={config.id} />
    </CollapsibleCard>
  );
}

// ===== Column Card List =====

function ColumnCards({ column }: { column: 'left' | 'center' }) {
  const cards = CARD_CONFIGS.filter((c) => c.column === column);
  return (
    <div className="space-y-3 p-4">
      {cards.map((card) => (
        <PromotionCard key={card.id} config={card} />
      ))}
    </div>
  );
}

// ===== Skinny Bar Data =====

function useSkinnyCards(column: 'left' | 'center'): SkinnyCardInfo[] {
  const store = usePromotionStore();
  const cards = CARD_CONFIGS.filter((c) => c.column === column);

  return useMemo(
    () =>
      cards.map((config) => ({
        cardId: config.id,
        title: config.title,
        hasContent: getCardHasContent(config.id, store),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      column,
      store.promotionEntries,
      store.specialHours,
      store.howToShopItems,
      store.importantNotesItems,
      store.attachedPDFs,
      store.selectedSubjectLine,
      store.generatedSubjectLines,
    ]
  );
}

// ===== Preview Column Component =====

function PreviewColumn() {
  return (
    <div className="flex h-full flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-semibold">Email Preview</h2>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Start Over
        </Button>
      </div>

      {/* Preview Tabs */}
      <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="preview"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Code className="h-3.5 w-3.5" />
            HTML Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          <div className="flex h-full items-center justify-center p-4">
            <div className="flex min-h-[400px] w-full items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                Enter promotion details to see preview
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
          <div className="h-full p-4">
            <textarea
              className="h-full w-full rounded-md border bg-muted/50 p-3 font-mono text-xs"
              placeholder="HTML code will appear here..."
              readOnly
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Actions */}
      <div className="flex flex-wrap gap-2 border-t px-4 py-3">
        <Button size="sm" className="gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Generate Email Batches
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5">
          <FileDown className="h-3.5 w-3.5" />
          Download Email Draft
        </Button>
      </div>
    </div>
  );
}

// ===== Main Page Component =====

export function PromotionPage() {
  const hasProfile = useHasProfile();
  const store = usePromotionStore();

  // Load persisted state on mount
  useEffect(() => {
    store.loadFromIndexedDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Column visibility based on store state
  const leftExpanded = store.columnState === 'left-expanded';
  const centerExpanded = store.columnState === 'center-expanded';

  // Skinny bar data
  const leftSkinnyCards = useSkinnyCards('left');
  const centerSkinnyCards = useSkinnyCards('center');

  // Column toggle handlers
  const handleExpandLeft = useCallback(() => {
    store.setColumnState('left-expanded');
  }, [store]);

  const handleExpandCenter = useCallback(() => {
    store.setColumnState('center-expanded');
  }, [store]);

  // Profile redirect — if no profile, redirect to /start
  if (!hasProfile) {
    return <Navigate to="/start" replace state={{ from: '/promotion' }} />;
  }

  return (
    <>
      {/* ===== Desktop Layout (>=1024px): Three columns with skinny bars ===== */}
      <div className="hidden lg:flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left Skinny Bar — shown when left column is collapsed */}
        {!leftExpanded && (
          <SkinnyColumnBar
            cards={leftSkinnyCards}
            isExpanded={false}
            onExpand={handleExpandLeft}
            ariaLabel="Expand Promo Body Details column"
          />
        )}

        {/* Left Column: Promo Body Details */}
        <div
          className={cn(
            'flex-shrink-0 overflow-y-auto border-r transition-all duration-300',
            leftExpanded ? 'w-[40%] min-w-0' : 'w-0 overflow-hidden'
          )}
        >
          <ColumnCards column="left" />
        </div>

        {/* Center Skinny Bar — shown when center column is collapsed */}
        {!centerExpanded && (
          <SkinnyColumnBar
            cards={centerSkinnyCards}
            isExpanded={false}
            onExpand={handleExpandCenter}
            ariaLabel="Expand Email Tools column"
          />
        )}

        {/* Center Column: Email Tools */}
        <div
          className={cn(
            'flex-shrink-0 overflow-y-auto border-r transition-all duration-300',
            centerExpanded ? 'w-[30%] min-w-0' : 'w-0 overflow-hidden'
          )}
        >
          <ColumnCards column="center" />
        </div>

        {/* Right Column: Sticky Live Preview */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <PreviewColumn />
        </div>
      </div>

      {/* ===== Mobile Layout (<1024px): Single column, all stacked ===== */}
      <div className="lg:hidden">
        {/* Left Column Cards */}
        <div className="border-b">
          <ColumnCards column="left" />
        </div>

        {/* Center Column Cards */}
        <div className="border-b">
          <ColumnCards column="center" />
        </div>

        {/* Right Column: Preview */}
        <div className="min-h-[500px]">
          <PreviewColumn />
        </div>
      </div>
    </>
  );
}
