/**
 * usePreviewActions — the download / import / export / generate / print actions
 * (and their dialog state) for the promotion preview pane. Split out of
 * PreviewColumn so that component is just preview presentation + wiring.
 *
 * Takes the preview store slice (see `selectPreviewStore`) and the current
 * email HTML; returns the handlers, the export/generate dialog state, and the
 * hidden import-file input ref.
 */

import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import {
  usePromotionStore,
  type PromotionState,
} from '@/stores/promotion-store';
import {
  buildExportConfig,
  validateImportConfig,
} from '@/lib/promotion-config';
import { buildPromotionEmailData } from '@/lib/newsletter-utils';
import { prependHeadingIfMissing } from '@/lib/html-utils';
import {
  createEMLFile,
  formatDateRangeForFilename,
  resolvePromoSubject,
} from '@/lib/emailUtils';
import { getRecommendedFormat } from '@/lib/ui-utils';
import { saveBlob, getSaveAsDialog } from '@/lib/file-save';
import { getStoreEmail, getEmployeeName } from '@/lib/profile';
import {
  generateEmailBatches,
  computeEmailStats,
} from '@/lib/bulk-email-generation';
import { StorageKeys } from '@/lib/storage-keys';
import {
  saveBulkEmailRecipientsToIndexedDB,
  clearBulkEmailRecipientsFromIndexedDB,
} from '@/lib/db';

import { selectEmailDataSource } from './email-data-source';

// ===== Store slice =====

/** The store fields the preview pane (rendering + actions) reads. */
export const selectPreviewStore = (s: PromotionState) => ({
  ...selectEmailDataSource(s),
  attachedPDFs: s.attachedPDFs,
  generatedSubjectLines: s.generatedSubjectLines,
  selectedSubjectLine: s.selectedSubjectLine,
  bulkEmailGenerating: s.bulkEmailGenerating,
  bulkEmailProgress: s.bulkEmailProgress,
  bulkEmailRecipients: s.bulkEmailRecipients,
  setBulkEmailRecipients: s.setBulkEmailRecipients,
  addPDF: s.addPDF,
  clearAllPDFs: s.clearAllPDFs,
  setPromoDateRange: s.setPromoDateRange,
  setPromoYear: s.setPromoYear,
  setPromoTitle: s.setPromoTitle,
  resetState: s.resetState,
  initializeDefaultItems: s.initializeDefaultItems,
});

export type PreviewStore = ReturnType<typeof selectPreviewStore>;

// ===== Download Helpers =====

function promoDraftDateSuffix(dateRange: string): string {
  if (dateRange) {
    const formatted = formatDateRangeForFilename(dateRange);
    if (formatted) return formatted;
  }
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  await saveBlob(blob, filename, { dialog: getSaveAsDialog() });
}

// ===== Hook =====

export function usePreviewActions(emailHTML: string, store: PreviewStore) {
  // Export options dialog (Recipients OFF, PDFs ON; reset to defaults each open)
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportIncludeRecipients, setExportIncludeRecipients] = useState(false);
  const [exportIncludePdfData, setExportIncludePdfData] = useState(true);

  const [showGenerateWarning, setShowGenerateWarning] = useState(false);
  const [generateWarnings, setGenerateWarnings] = useState<string[]>([]);

  const importInputRef = useRef<HTMLInputElement>(null);

  const openExportDialog = useCallback(() => {
    // Always reset to defaults when opening (no persistence)
    setExportIncludeRecipients(false);
    setExportIncludePdfData(true);
    setExportDialogOpen(true);
  }, []);

  // Download Email Draft (single EML)
  const handleDownloadDraft = useCallback(async () => {
    if (!emailHTML) {
      toast.error('No email content to download');
      return;
    }

    try {
      const fromName = getEmployeeName();
      const fromEmail = getStoreEmail();
      const subject = resolvePromoSubject(
        store.selectedSubjectLine,
        store.promoTitle
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
        emailHTML,
        attachments
      );

      const blob = new Blob([emlContent], {
        type: 'message/rfc822',
      });
      const suffix = promoDraftDateSuffix(store.promoDateRange);
      const extension = getRecommendedFormat();
      await downloadBlob(blob, `promo-email-draft.${suffix}.${extension}`);
      toast.success('Email draft downloaded');
    } catch (error) {
      console.error('Download draft error:', error);
      toast.error('Failed to download email draft');
    }
  }, [
    emailHTML,
    store.selectedSubjectLine,
    store.promoTitle,
    store.attachedPDFs,
    store.promoDateRange,
  ]);

  // Download HTML
  const handleDownloadHTML = useCallback(async () => {
    if (!emailHTML) {
      toast.error('No HTML content to download');
      return;
    }

    const blob = new Blob([emailHTML], { type: 'text/html' });
    const suffix = promoDraftDateSuffix(store.promoDateRange);
    await downloadBlob(blob, `promo-email-draft.${suffix}.html`);
    toast.success('HTML file downloaded');
  }, [emailHTML, store.promoDateRange]);

  // Start Over
  const handleStartOver = useCallback(() => {
    store.resetState();
    store.initializeDefaultItems();
    localStorage.removeItem(StorageKeys.promotionBuilderState);
    // resetState clears the in-memory recipients; also drop the persisted copy.
    void clearBulkEmailRecipientsFromIndexedDB();
    toast.success('Reset to defaults completed');
  }, [store]);

  // Export Config — runs with the options chosen in the export dialog
  const handleExportConfig = useCallback(async () => {
    setExportDialogOpen(false);
    try {
      const data = buildPromotionEmailData(store);

      const config = buildExportConfig(
        data,
        store.attachedPDFs,
        store.generatedSubjectLines,
        store.selectedSubjectLine,
        store.newsletterStyle,
        store.emailPalette,
        {
          includeRecipients: exportIncludeRecipients,
          includePdfData: exportIncludePdfData,
          bulkEmailRecipients: store.bulkEmailRecipients,
        }
      );

      const jsonStr = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      await downloadBlob(
        blob,
        `promotion-template-${new Date().toISOString().split('T')[0]}.json`
      );
      toast.success('Config exported successfully');
    } catch (error) {
      console.error('Export config error:', error);
      toast.error('Failed to export config');
    }
  }, [store, exportIncludeRecipients, exportIncludePdfData]);

  // Import Config
  const handleImportConfig = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
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

          // Migration: if imported body doesn't start with an H2 but has
          // a heading, prepend the heading as an H2 element in the body
          const importedHeading = config.newsletterHeading || '';
          const importedBody = prependHeadingIfMissing(
            config.newsletterBody || '',
            importedHeading
          );

          usePromotionStore.setState({
            promotionEntries: config.promotionEntries,
            specialHours: config.specialHours,
            howToShopItems: config.howToShopItems,
            importantNotesItems: config.importantNotesItems,
            howToShopStyle: config.howToShopStyle || {
              borderColor: null,
              backgroundColor: null,
            },
            importantNotesStyle: config.importantNotesStyle || {
              borderColor: null,
              backgroundColor: null,
            },
            generatedSubjectLines: config.generatedSubjectLines,
            selectedSubjectLine: config.selectedSubjectLine,
            preheaderText: config.preheaderText || '',
            newsletterHeading: importedHeading,
            newsletterBody: importedBody,
            newsletterPosition: config.newsletterPosition,
            newsletterVisible: config.newsletterVisible ?? false,
            newsletterStyle: config.newsletterStyle || {
              borderColor: null,
              backgroundColor: null,
              headingColor: null,
              borderStyle: 'left',
              headingAlign: 'left',
            },
            ...(config.emailPalette
              ? { emailPalette: config.emailPalette }
              : {}),
          });

          // Restore embedded PDF files, if the export included their data.
          // Replaces current attachments only when the import actually carries
          // file bytes; metadata-only exports leave existing PDFs untouched.
          const importedPDFs = (config.attachedPDFs ?? []).filter(
            (p) => typeof p.data === 'string'
          );
          if (importedPDFs.length > 0) {
            await store.clearAllPDFs();
            for (const p of importedPDFs) {
              await store.addPDF({
                id: p.id,
                name: p.name,
                size: p.size,
                type: p.type,
                data: p.data,
              });
            }
          }

          // Restore bulk recipients, if the export included them.
          if (typeof config.bulkEmailRecipients === 'string') {
            store.setBulkEmailRecipients(config.bulkEmailRecipients);
            try {
              await saveBulkEmailRecipientsToIndexedDB(
                config.bulkEmailRecipients
              );
            } catch {
              // Non-blocking: recipients are in memory even if persistence fails
            }
          }

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

  const handleGenerateClick = useCallback(() => {
    const warnings: string[] = [];
    const stats = computeEmailStats(store.bulkEmailRecipients);
    if (stats.invalid > 0) {
      warnings.push(
        `${stats.invalid} invalid email${stats.invalid === 1 ? '' : 's'} will be skipped`
      );
    }
    if (stats.duplicates > 0) {
      warnings.push(
        `${stats.duplicates} duplicate recipient${stats.duplicates === 1 ? '' : 's'} removed`
      );
    }
    if (!store.selectedSubjectLine?.trim()) {
      warnings.push(
        'Subject line is empty — emails will send with "Promotion" as the subject'
      );
    }
    if (!store.preheaderText?.trim()) {
      warnings.push(
        'Preheader text is empty — inbox preview will show your email title instead'
      );
    }
    if (store.attachedPDFs.length === 0) {
      warnings.push(
        'No PDF attachments — add any flyers or documents if needed'
      );
    }
    if (warnings.length > 0) {
      setGenerateWarnings(warnings);
      setShowGenerateWarning(true);
    } else {
      generateEmailBatches();
    }
  }, [
    store.bulkEmailRecipients,
    store.selectedSubjectLine,
    store.preheaderText,
    store.attachedPDFs,
  ]);

  const handleGenerateAnyway = useCallback(() => {
    generateEmailBatches();
  }, []);

  const handlePrint = useCallback(() => {
    if (!emailHTML) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.width = '600px';
    iframe.style.height = '800px';
    // Sandbox the print iframe so any <script> in the generated HTML cannot
    // execute with app privileges. allow-same-origin (without allow-scripts)
    // keeps contentDocument/print() reachable from the parent while blocking
    // all script execution — an empty sandbox would be stricter but makes the
    // frame cross-origin, which breaks doc.write() and contentWindow.print().
    iframe.setAttribute('sandbox', 'allow-same-origin');
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(emailHTML);
    doc.close();
    const fallback = setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 5000);
    iframe.contentWindow?.addEventListener(
      'afterprint',
      () => {
        clearTimeout(fallback);
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      },
      { once: true }
    );
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, [emailHTML]);

  return {
    importInputRef,
    openExportDialog,
    handleDownloadDraft,
    handleDownloadHTML,
    handleStartOver,
    handleExportConfig,
    handleImportConfig,
    handleImportFileChange,
    handleGenerateClick,
    handleGenerateAnyway,
    handlePrint,
    // Export options dialog
    exportDialogOpen,
    setExportDialogOpen,
    exportIncludeRecipients,
    setExportIncludeRecipients,
    exportIncludePdfData,
    setExportIncludePdfData,
    // Pre-generate warning dialog
    showGenerateWarning,
    setShowGenerateWarning,
    generateWarnings,
  };
}
