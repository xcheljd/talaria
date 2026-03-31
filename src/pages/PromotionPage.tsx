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
 * - Sidebar collapse/expand navigation (desktop only)
 * - Responsive layout below 1024px (single column, all stacked)
 * - Profile redirect if no profile saved
 * - Live HTML preview in iframe (right column)
 * - Preview/HTML Code tabs (shadcn Tabs)
 * - HTML Code tab shows raw source in readonly textarea
 * - Download buttons: Generate Email Batches, Download Email Draft (single EML), Download HTML
 * - Start Over button with shadcn AlertDialog confirmation
 * - Import/Export promotion config as JSON
 * - Auto-save state to IndexedDB with debounced persistence
 */

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  RotateCcw,
  Eye,
  Code,
  Mail,
  FileDown,
  FileCode,
  Download,
  Upload,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useHasProfile } from '@/contexts/ProfileProvider';
import { usePromotionStore } from '@/stores/promotion-store';
import { CollapsibleCard } from '@/components/promotion/CollapsibleCard';
import {
  SidebarBar,
  type SidebarCardInfo,
} from '@/components/promotion/SidebarBar';
import { BasicDetailsEditor } from '@/components/promotion/BasicDetailsEditor';
import { DiscountEntriesEditor } from '@/components/promotion/DiscountEntriesEditor';
import { FormattableItemEditor } from '@/components/promotion/FormattableItemEditor';
import { SpecialHoursEditor } from '@/components/promotion/SpecialHoursEditor';
import { PDFAttachments } from '@/components/promotion/PDFAttachments';
import { SubjectLineGenerator } from '@/components/promotion/SubjectLineGenerator';
import { BulkEmailTools } from '@/components/promotion/BulkEmailTools';
import {
  generatePromotionEmailHTML,
  buildExportConfig,
  validateImportConfig,
  type PromotionEmailData,
} from '@/lib/promotion-email-html';
import { createEMLFile } from '@/lib/emailUtils';
import { getEmployeeSignature } from '@/lib/signature';
import { getStoreEmail, getEmployeeName } from '@/lib/profile';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

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

// ===== Card Content Components =====

/** Get content component for a specific card */
function getCardContent(cardId: string) {
  switch (cardId) {
    case 'basicDetailsCard':
      return <BasicDetailsEditor />;
    case 'discountEntriesCard':
      return <DiscountEntriesEditor />;
    case 'howToShopCard':
      return <HowToShopEditor />;
    case 'importantNotesCard':
      return <ImportantNotesEditor />;
    case 'specialHoursCard':
      return <SpecialHoursEditor />;
    case 'pdfCard':
      return <PDFAttachments />;
    case 'subjectCard':
      return <SubjectLineGenerator />;
    case 'bulkEmailCard':
      return <BulkEmailTools />;
    default:
      return <CardPlaceholderContent cardId={cardId} />;
  }
}

/** How to Shop editor connected to store */
function HowToShopEditor() {
  const store = usePromotionStore();
  return (
    <FormattableItemEditor
      items={store.howToShopItems}
      actions={{
        addItem: store.addHowToShopItem,
        removeItem: store.removeHowToShopItem,
        updateItem: store.updateHowToShopItem,
        moveItemUp: store.moveHowToShopItemUp,
        moveItemDown: store.moveHowToShopItemDown,
        toggleFormat: store.toggleHowToShopFormat,
      }}
      placeholder="e.g., Visit us in-store for outlet-exclusive deals"
      itemLabel="Item"
      emptyMessage={
        'No shopping instructions yet. Click "Add Item" to get started.'
      }
    />
  );
}

/** Important Notes editor connected to store */
function ImportantNotesEditor() {
  const store = usePromotionStore();
  return (
    <FormattableItemEditor
      items={store.importantNotesItems}
      actions={{
        addItem: store.addImportantNotesItem,
        removeItem: store.removeImportantNotesItem,
        updateItem: store.updateImportantNotesItem,
        moveItemUp: store.moveImportantNotesItemUp,
        moveItemDown: store.moveImportantNotesItemDown,
        toggleFormat: store.toggleImportantNotesFormat,
      }}
      placeholder="e.g., Important safety information or key details"
      itemLabel="Note"
      emptyMessage={'No important notes yet. Click "Add Note" to get started.'}
    />
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

function getCardHasContent(
  cardId: string,
  store: ReturnType<typeof usePromotionStore.getState>
): boolean {
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
      return store.specialHours.some((h) => h.day?.trim() || h.hours?.trim());
    case 'pdfCard':
      return store.attachedPDFs.length > 0;
    case 'subjectCard':
      return !!(
        store.selectedSubjectLine || store.generatedSubjectLines.length > 0
      );
    case 'bulkEmailCard':
      return false;
    default:
      return false;
  }
}

// ===== Individual Card Component =====
// Subscribes to store to compute hasContent per-card

function PromotionCard({
  config,
  forceExpand,
}: {
  config: CardConfig;
  forceExpand?: boolean;
}) {
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
      forceExpand={forceExpand}
    >
      {getCardContent(config.id)}
    </CollapsibleCard>
  );
}

// ===== Column Card List =====

function ColumnCards({
  column,
  forceExpandedCardId,
}: {
  column: 'left' | 'center';
  forceExpandedCardId?: string;
}) {
  const cards = CARD_CONFIGS.filter((c) => c.column === column);
  return (
    <div className="space-y-3 p-4">
      {cards.map((card) => (
        <PromotionCard
          key={card.id}
          config={card}
          forceExpand={forceExpandedCardId === card.id}
        />
      ))}
    </div>
  );
}

// ===== Sidebar Bar Data =====

function useSidebarCards(column: 'left' | 'center'): SidebarCardInfo[] {
  const store = usePromotionStore();
  const cards = CARD_CONFIGS.filter((c) => c.column === column);

  return useMemo(
    () =>
      cards.map((config) => ({
        cardId: config.id,
        title: config.title,
        hasContent: getCardHasContent(config.id, store),
      })),
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

// ===== Download Helper =====

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ===== Preview Column Component =====

function PreviewColumn() {
  const store = usePromotionStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activeTab, setActiveTab] = useState('preview');

  // Generate email HTML from current store data
  const emailHTML = useMemo(() => {
    if (!store.promoDateRange) return '';

    const data: PromotionEmailData = {
      promoDateRange: store.promoDateRange,
      promoYear: store.promoYear,
      promoTitle: store.promoTitle,
      promotionEntries: store.promotionEntries,
      specialHours: store.specialHours,
      howToShopItems: store.howToShopItems,
      importantNotesItems: store.importantNotesItems,
    };

    return generatePromotionEmailHTML(data);
  }, [
    store.promoDateRange,
    store.promoYear,
    store.promoTitle,
    store.promotionEntries,
    store.specialHours,
    store.howToShopItems,
    store.importantNotesItems,
  ]);

  // Update iframe when emailHTML changes
  useEffect(() => {
    if (!iframeRef.current) return;

    if (!emailHTML) {
      // Write empty state
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <body style="display:flex;align-items:center;justify-content:center;min-height:400px;font-family:system-ui,sans-serif;color:#888;">
              <p style="text-align:center;">Enter promotion details to see preview</p>
            </body>
          </html>
        `);
        doc.close();
      }
      return;
    }

    const doc = iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(emailHTML);
      doc.close();
    }
  }, [emailHTML]);

  // Download Email Draft (single EML)
  const handleDownloadDraft = useCallback(async () => {
    if (!emailHTML) {
      toast.error('No email content to download');
      return;
    }

    try {
      const fromName = getEmployeeName();
      const fromEmail = getStoreEmail();
      const subject = store.selectedSubjectLine || 'Weekly Sale';

      // Include signature in the email body
      const signature = getEmployeeSignature('html');
      const fullHTML = emailHTML.replace(
        '</body>',
        `<br><br>${signature}</body>`
      );

      // Get PDF attachments
      const attachments = store.attachedPDFs
        .filter((pdf) => pdf.data)
        .map((pdf) => ({ name: pdf.name, data: pdf.data }));

      const emlContent = await createEMLFile(
        fromName,
        fromEmail,
        '',
        '',
        subject,
        fullHTML,
        attachments
      );

      const blob = new Blob([emlContent], {
        type: 'message/rfc822',
      });
      downloadBlob(blob, `promotion-email-${Date.now()}.eml`);
      toast.success('Email draft downloaded');
    } catch (error) {
      console.error('Download draft error:', error);
      toast.error('Failed to download email draft');
    }
  }, [emailHTML, store.selectedSubjectLine, store.attachedPDFs]);

  // Download HTML
  const handleDownloadHTML = useCallback(() => {
    if (!emailHTML) {
      toast.error('No HTML content to download');
      return;
    }

    const blob = new Blob([emailHTML], { type: 'text/html' });
    downloadBlob(blob, `promotion-email-${Date.now()}.html`);
    toast.success('HTML file downloaded');
  }, [emailHTML]);

  // Start Over
  const handleStartOver = useCallback(() => {
    store.resetState();
    store.initializeDefaultItems();
    localStorage.removeItem('promotionBuilderState');
    toast.success('Reset to defaults completed');
  }, [store]);

  // Export Config
  const handleExportConfig = useCallback(() => {
    try {
      const data: PromotionEmailData = {
        promoDateRange: store.promoDateRange,
        promoYear: store.promoYear,
        promoTitle: store.promoTitle,
        promotionEntries: store.promotionEntries,
        specialHours: store.specialHours,
        howToShopItems: store.howToShopItems,
        importantNotesItems: store.importantNotesItems,
      };

      const config = buildExportConfig(
        data,
        store.attachedPDFs,
        store.generatedSubjectLines,
        store.selectedSubjectLine
      );

      const jsonStr = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      downloadBlob(
        blob,
        `promotion-template-${new Date().toISOString().split('T')[0]}.json`
      );
      toast.success('Config exported successfully');
    } catch (error) {
      console.error('Export config error:', error);
      toast.error('Failed to export config');
    }
  }, [store]);

  // Import Config
  const importInputRef = useRef<HTMLInputElement>(null);
  const handleImportConfig = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = JSON.parse(event.target?.result as string);
          const validation = validateImportConfig(raw);

          if (!validation.ok) {
            toast.error(`Invalid config: ${validation.reason}`);
            return;
          }

          const config = validation.config;

          // Apply imported config to store
          store.setPromoDateRange(config.dateRange);
          store.setPromoYear(config.year);
          store.setPromoTitle(config.title);

          // Replace entries
          usePromotionStore.setState({
            promotionEntries: config.promotionEntries,
            specialHours: config.specialHours,
            howToShopItems: config.howToShopItems,
            importantNotesItems: config.importantNotesItems,
            generatedSubjectLines: config.generatedSubjectLines,
            selectedSubjectLine: config.selectedSubjectLine,
          });

          toast.success('Config imported successfully');
        } catch (error) {
          console.error('Import config error:', error);
          toast.error('Failed to import config — invalid JSON');
        }
      };
      reader.readAsText(file);

      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [store]
  );

  const hasContent = !!emailHTML;

  return (
    <div className="flex h-full flex-col">
      {/* Hidden file input for import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFileChange}
        data-testid="import-config-input"
      />

      {/* Preview Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-semibold">Email Preview</h2>

        <div className="flex items-center gap-1.5">
          {/* Import */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleImportConfig}
            aria-label="Import"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>

          {/* Export */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleExportConfig}
            disabled={!hasContent}
            aria-label="Export"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>

          {/* Start Over with AlertDialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Start Over
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to Defaults</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset everything to defaults and cannot be undone.
                  All promotion data, entries, and attachments will be cleared.
                  Continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStartOver}>
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Preview Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
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
          {hasContent ? (
            <iframe
              ref={iframeRef}
              className="h-full w-full border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <div className="flex min-h-[400px] w-full items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Enter promotion details to see preview
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="code" className="flex-1 m-0 overflow-hidden">
          <div className="h-full p-4">
            <textarea
              className="h-full w-full rounded-md border bg-muted/50 p-3 font-mono text-xs"
              value={emailHTML || ''}
              placeholder="HTML code will appear here..."
              readOnly
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Actions */}
      <div className="flex flex-wrap gap-2 border-t px-4 py-3">
        <Button size="sm" className="gap-1.5" disabled>
          <Mail className="h-3.5 w-3.5" />
          Generate Email Batches
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleDownloadDraft}
          disabled={!hasContent}
        >
          <FileDown className="h-3.5 w-3.5" />
          Download Email Draft
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleDownloadHTML}
          disabled={!hasContent}
        >
          <FileCode className="h-3.5 w-3.5" />
          Download HTML
        </Button>
      </div>
    </div>
  );
}

// ===== Auto-Save Hook =====

/** Debounced auto-save to IndexedDB */
function useAutoSave() {
  const store = usePromotionStore();
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
  }, [
    store.isInitializing,
    store.promoDateRange,
    store.promoYear,
    store.promoTitle,
    store.promotionEntries,
    store.specialHours,
    store.howToShopItems,
    store.importantNotesItems,
    store.attachedPDFs,
    store.generatedSubjectLines,
    store.selectedSubjectLine,
    store.saveToIndexedDB,
  ]);
}

// ===== Main Page Component =====

export function PromotionPage() {
  const hasProfile = useHasProfile();
  const store = usePromotionStore();

  // Tracks which card should be force-expanded (from sidebar click)
  const [forceExpandedCardId, setForceExpandedCardId] = useState<
    string | undefined
  >(undefined);

  // Load persisted state on mount
  useEffect(() => {
    const init = async () => {
      await store.loadFromIndexedDB();
      // Populate defaults only when arrays are empty (fresh state)
      store.initializeDefaultItems();
    };
    init();
  }, []);

  // Auto-save with debounce
  useAutoSave();

  // Column visibility based on store state
  const isLeftActive = store.columnState === 'left';
  const isCenterActive = store.columnState === 'center';

  // Sidebar bar data
  const leftSidebarCards = useSidebarCards('left');
  const centerSidebarCards = useSidebarCards('center');

  // Column toggle handlers — accept optional cardId for sidebar card click
  const handleExpandLeft = useCallback(
    (cardId?: string) => {
      store.setColumnState('left');
      setForceExpandedCardId(cardId);

      if (cardId) {
        // Wait for column to expand and card to render, then scroll
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
            cardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
    },
    [store]
  );

  const handleExpandCenter = useCallback(
    (cardId?: string) => {
      store.setColumnState('center');
      setForceExpandedCardId(cardId);

      if (cardId) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
            cardEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
    },
    [store]
  );

  // Profile redirect — if no profile, redirect to /start
  if (!hasProfile) {
    return <Navigate to="/start" replace state={{ from: '/promotion' }} />;
  }

  return (
    <>
      {/* ===== Desktop Layout (>=1024px): Three columns with sidebar ===== */}
      <div className="hidden lg:flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Sidebar — always on far left, shows collapsed column's cards */}
        {!isLeftActive && (
          <SidebarBar
            cards={leftSidebarCards}
            isExpanded={false}
            onExpand={handleExpandLeft}
            ariaLabel="Expand Promo Body Details"
          />
        )}
        {!isCenterActive && (
          <SidebarBar
            cards={centerSidebarCards}
            isExpanded={false}
            onExpand={handleExpandCenter}
            ariaLabel="Expand Email Tools"
          />
        )}

        {/* Left Column: Promo Body Details */}
        <div
          className={cn(
            'flex-shrink-0 overflow-y-auto border-r transition-all duration-300',
            isLeftActive ? 'w-[40%] min-w-0' : 'w-0 overflow-hidden'
          )}
        >
          <ColumnCards
            column="left"
            forceExpandedCardId={isLeftActive ? forceExpandedCardId : undefined}
          />
        </div>

        {/* Center Column: Email Tools */}
        <div
          className={cn(
            'flex-shrink-0 overflow-y-auto border-r transition-all duration-300',
            isCenterActive ? 'w-[30%] min-w-0' : 'w-0 overflow-hidden'
          )}
        >
          <ColumnCards
            column="center"
            forceExpandedCardId={
              isCenterActive ? forceExpandedCardId : undefined
            }
          />
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
