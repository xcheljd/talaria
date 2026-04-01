/**
 * BulkEmailTools — Manages recipient list, batch controls, and email batch generation.
 *
 * Features:
 * - Recipient textarea (monospace) with paste-from-spreadsheet support
 * - Parse emails (one per line, comma-separated)
 * - Validate emails, show valid/invalid counts, flag duplicates, list invalid emails
 * - Batch controls: number input with up/down arrows (50-1000, step 50)
 * - Radio group for Individual Files vs ZIP Archive
 * - Batch preview showing chunk breakdown
 * - Generate Email Batches button creates EML files via emailUtils + jszip
 * - Progress indicator during generation
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Mail,
  Plus,
  Minus,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { usePromotionStore } from '@/stores/promotion-store';
import {
  isValidEmail,
  createBCCBatchEML,
  generateZipFilenameFromHTML,
  type PDFAttachment,
} from '@/lib/emailUtils';
import {
  saveBulkEmailRecipientsToIndexedDB,
  getBulkEmailRecipientsFromIndexedDB,
  clearBulkEmailRecipientsFromIndexedDB,
} from '@/lib/db';
import {
  generatePromotionEmailHTML,
  type PromotionEmailData,
} from '@/lib/promotion-email-html';

// ===== Color Resolution (mirrors PromotionPage helper) =====

function resolveNewsletterColorsForBulk(style: {
  borderColor: string | null;
  backgroundColor: string | null;
  headingColor: string | null;
}): {
  borderColor: string;
  backgroundColor: string;
  headingColor: string;
} {
  const root = document.documentElement;
  const computed = getComputedStyle(root);

  return {
    borderColor:
      style.borderColor ??
      (computed.getPropertyValue('--primary').trim() || '#2c3e50'),
    backgroundColor:
      style.backgroundColor ??
      (computed.getPropertyValue('--muted').trim() || '#f5f5f5'),
    headingColor:
      style.headingColor ??
      (computed.getPropertyValue('--primary').trim() || '#2c3e50'),
  };
}

import { Button } from '@/components/ui/button';
import { ClearableTextarea } from '@/components/ui/clearable-textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// ===== Types =====

interface EmailStats {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  validEmails: string[];
  invalidEmails: string[];
}

type DownloadFormat = 'individual' | 'zip';

// ===== Helpers =====

/** Parse and analyze the raw email text, computing stats */
function computeEmailStats(rawText: string): EmailStats {
  const rawEmails = rawText
    .split(/[\s,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const uniqueEmails = [...new Set(rawEmails)];
  const duplicateCount = rawEmails.length - uniqueEmails.length;
  const validEmails = uniqueEmails.filter(isValidEmail);
  const invalidEmails = uniqueEmails.filter((e) => !isValidEmail(e));

  return {
    total: uniqueEmails.length,
    valid: validEmails.length,
    invalid: invalidEmails.length,
    duplicates: duplicateCount,
    validEmails,
    invalidEmails,
  };
}

/** Clamp batch size within allowed range, stepping by 50 */
function clampBatchSize(value: number): number {
  const clamped = Math.round(value / 50) * 50;
  return Math.min(Math.max(clamped, 50), 1000);
}

// ===== Component =====

export function BulkEmailTools() {
  const store = usePromotionStore();

  // Recipient text state
  const [recipientText, setRecipientText] = useState('');
  const [emailStats, setEmailStats] = useState<EmailStats>({
    total: 0,
    valid: 0,
    invalid: 0,
    duplicates: 0,
    validEmails: [],
    invalidEmails: [],
  });
  const [showInvalidEmails, setShowInvalidEmails] = useState(false);

  // Batch controls
  const [batchSize, setBatchSize] = useState(500);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>(
    () =>
      (localStorage.getItem('bulkEmail.downloadFormat') as DownloadFormat) ||
      'individual'
  );

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  // Debounced save timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted recipients from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    async function loadRecipients() {
      try {
        const saved = await getBulkEmailRecipientsFromIndexedDB();
        if (!cancelled && saved) {
          setRecipientText(saved);
          setEmailStats(computeEmailStats(saved));
        }
      } catch (error) {
        console.warn('Failed to restore recipients from IndexedDB:', error);
      }
    }
    loadRecipients();
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore saved batch size from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bulkEmail.batchSize');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) {
        setBatchSize(clampBatchSize(parsed));
      }
    }
  }, []);

  // Compute batch preview
  const batchPreview = useMemo(() => {
    if (emailStats.valid === 0) {
      return null;
    }
    const numBatches = Math.ceil(emailStats.valid / batchSize);
    const lastBatchSize = emailStats.valid % batchSize || batchSize;

    return {
      numBatches,
      lastBatchSize,
      totalRecipients: emailStats.valid,
    };
  }, [emailStats.valid, batchSize]);

  // Handle recipient text changes
  const handleRecipientChange = useCallback((newText: string) => {
    setRecipientText(newText);
    const stats = computeEmailStats(newText);
    setEmailStats(stats);

    // Debounced save to IndexedDB
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (newText.trim()) {
          await saveBulkEmailRecipientsToIndexedDB(newText);
        }
      } catch (error) {
        console.warn('Failed to save recipients:', error);
      }
    }, 1000);
  }, []);

  // Handle paste with feedback
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      // Let the paste happen, then analyze after a tick
      setTimeout(() => {
        const textarea = e.target as HTMLTextAreaElement;
        const text = textarea.value;
        const stats = computeEmailStats(text);
        setRecipientText(text);
        setEmailStats(stats);
      }, 0);
    },
    []
  );

  // Clear recipients
  const handleClearRecipients = useCallback(async () => {
    setRecipientText('');
    setEmailStats({
      total: 0,
      valid: 0,
      invalid: 0,
      duplicates: 0,
      validEmails: [],
      invalidEmails: [],
    });
    setShowInvalidEmails(false);
    try {
      await clearBulkEmailRecipientsFromIndexedDB();
    } catch (error) {
      console.warn('Failed to clear saved recipients:', error);
    }
  }, []);

  // Batch size controls
  const handleBatchSizeChange = useCallback((newSize: number) => {
    const clamped = clampBatchSize(newSize);
    setBatchSize(clamped);
    localStorage.setItem('bulkEmail.batchSize', String(clamped));
  }, []);

  const incrementBatchSize = useCallback(() => {
    handleBatchSizeChange(batchSize + 50);
  }, [batchSize, handleBatchSizeChange]);

  const decrementBatchSize = useCallback(() => {
    handleBatchSizeChange(batchSize - 50);
  }, [batchSize, handleBatchSizeChange]);

  // Download format change
  const handleFormatChange = useCallback((format: DownloadFormat) => {
    setDownloadFormat(format);
    localStorage.setItem('bulkEmail.downloadFormat', format);
  }, []);

  // Generate email batches
  const handleGenerateBatches = useCallback(async () => {
    if (emailStats.valid === 0) {
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('0/0');

    try {
      // Generate email HTML from current store data
      const resolvedColors = resolveNewsletterColorsForBulk(
        store.newsletterStyle
      );
      const data: PromotionEmailData = {
        promoDateRange: store.promoDateRange,
        promoYear: store.promoYear,
        promoTitle: store.promoTitle,
        promotionEntries: store.promotionEntries,
        specialHours: store.specialHours,
        howToShopItems: store.howToShopItems,
        importantNotesItems: store.importantNotesItems,
        newsletterHeading: store.newsletterHeading,
        newsletterBody: store.newsletterBody,
        newsletterPosition: store.newsletterPosition,
        newsletterVisible: store.newsletterVisible,
        newsletterStyle: {
          ...resolvedColors,
          borderStyle: store.newsletterStyle.borderStyle,
          headingAlign: store.newsletterStyle.headingAlign,
        },
      };

      let htmlContent = generatePromotionEmailHTML(data);

      const subject = store.selectedSubjectLine || 'Weekly Promotion';

      // Get PDF attachments
      const pdfAttachments: PDFAttachment[] = store.attachedPDFs
        .filter((pdf) => pdf.data)
        .map((pdf) => ({ name: pdf.name, data: pdf.data }));

      // Split into batches
      const validEmails = emailStats.validEmails;
      const batches: string[][] = [];
      for (let i = 0; i < validEmails.length; i += batchSize) {
        batches.push(validEmails.slice(i, i + batchSize));
      }

      setGenerationProgress(`0/${batches.length}`);

      if (downloadFormat === 'zip') {
        // Create ZIP file with all EML files
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (let i = 0; i < batches.length; i++) {
          setGenerationProgress(`Creating ${i + 1}/${batches.length}`);
          const batch = batches[i];
          const emlContent = createBCCBatchEML(
            subject,
            htmlContent,
            batch,
            pdfAttachments,
            'eml',
            i + 1
          );
          zip.file(emlContent.filename, emlContent.data);
        }

        setGenerationProgress('Zipping...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
          generateZipFilenameFromHTML(htmlContent) ||
          'promotion-email-batches.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Download individual files
        for (let i = 0; i < batches.length; i++) {
          setGenerationProgress(`${i + 1}/${batches.length}`);
          const batch = batches[i];
          const emlContent = createBCCBatchEML(
            subject,
            htmlContent,
            batch,
            pdfAttachments,
            'eml',
            i + 1
          );

          const blob = new Blob([emlContent.data as BlobPart], {
            type: 'message/rfc822',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = emlContent.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Small delay between downloads to prevent browser issues
          if (i < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }
    } catch (error) {
      console.error('Error generating batches:', error);
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  }, [
    emailStats.valid,
    emailStats.validEmails,
    batchSize,
    downloadFormat,
    store.promoDateRange,
    store.promoYear,
    store.promoTitle,
    store.promotionEntries,
    store.specialHours,
    store.howToShopItems,
    store.importantNotesItems,
    store.selectedSubjectLine,
    store.attachedPDFs,
    store.newsletterVisible,
  ]);

  return (
    <div className="space-y-4">
      {/* Format status */}
      <FormatStatus />

      {/* Recipient header with clear button */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Recipient List</Label>
        {recipientText.trim() && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleClearRecipients}
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Recipient textarea */}
      <ClearableTextarea
        value={recipientText}
        onChange={handleRecipientChange}
        onPaste={handlePaste}
        placeholder="Enter email addresses (one per line, comma-separated, or paste from spreadsheet)..."
        className={cn(
          'min-h-[120px] font-mono text-sm',
          emailStats.invalid > 0 &&
            'border-destructive/50 focus-visible:ring-destructive/30'
        )}
        data-testid="bulk-email-list"
      />

      {/* Recipient stats */}
      {emailStats.total > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="default" className="gap-1 text-xs">
            {emailStats.valid} valid
          </Badge>
          {emailStats.invalid > 0 && (
            <Badge variant="destructive" className="gap-1 text-xs">
              {emailStats.invalid} invalid
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            Total: {emailStats.total}
          </Badge>
          {emailStats.duplicates > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
            >
              <AlertTriangle className="h-3 w-3" />
              {emailStats.duplicates} duplicate
              {emailStats.duplicates > 1 ? 's' : ''} removed
            </Badge>
          )}
        </div>
      )}

      {/* Invalid emails collapsible section */}
      {emailStats.invalid > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => setShowInvalidEmails(!showInvalidEmails)}
            data-testid="toggle-invalid-emails"
          >
            {showInvalidEmails ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {emailStats.invalid} invalid email
            {emailStats.invalid > 1 ? 's' : ''}
          </button>
          {showInvalidEmails && (
            <div className="border-t border-destructive/20 px-3 py-2">
              <div className="max-h-[100px] overflow-y-auto font-mono text-xs text-destructive">
                {emailStats.invalidEmails.map((email, i) => (
                  <div key={i}>{email}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Batch Size:</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={decrementBatchSize}
              disabled={batchSize <= 50}
              aria-label="Decrease batch size"
              data-testid="batch-size-decrease"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <input
              type="number"
              value={batchSize}
              min={50}
              max={1000}
              step={50}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  handleBatchSizeChange(val);
                }
              }}
              className="h-7 w-16 rounded-md border bg-background px-2 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              data-testid="batch-size-input"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={incrementBatchSize}
              disabled={batchSize >= 1000}
              aria-label="Increase batch size"
              data-testid="batch-size-increase"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Download format radio group */}
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Download Format:</Label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="downloadFormat"
                value="individual"
                checked={downloadFormat === 'individual'}
                onChange={() => handleFormatChange('individual')}
                data-testid="format-individual"
              />
              Individual Files
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="downloadFormat"
                value="zip"
                checked={downloadFormat === 'zip'}
                onChange={() => handleFormatChange('zip')}
                data-testid="format-zip"
              />
              ZIP Archive
            </label>
          </div>
        </div>
      </div>

      {/* Batch preview */}
      <div className="rounded-md border bg-muted/30 px-3 py-2">
        {batchPreview ? (
          <p className="text-xs text-muted-foreground">
            Will generate{' '}
            <span className="font-medium text-foreground">
              {batchPreview.numBatches}
            </span>{' '}
            batch{batchPreview.numBatches > 1 ? 'es' : ''}{' '}
            {batchPreview.numBatches > 1 &&
              `(last batch: ${batchPreview.lastBatchSize} recipients)`}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Enter recipient emails above to see batch preview
          </p>
        )}
      </div>

      {/* Generate Email Batches button */}
      <Button
        className="w-full gap-2"
        onClick={handleGenerateBatches}
        disabled={emailStats.valid === 0 || isGenerating}
        data-testid="generate-batches-btn"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating... {generationProgress}
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            Generate Email Batches
          </>
        )}
      </Button>
    </div>
  );
}

// ===== Format Status Sub-component =====

/** Displays the recommended email format based on OS detection */
function FormatStatus() {
  const [formatInfo, setFormatInfo] = useState({
    formatName: 'EML',
    extension: '.eml',
    osName: 'Unknown',
  });

  useEffect(() => {
    const platform = navigator.platform || '';
    const userAgent = navigator.userAgent || '';

    let os: 'windows' | 'mac' | 'other';
    if (platform.includes('Win') || userAgent.includes('Windows')) {
      os = 'windows';
    } else if (platform.includes('Mac') || userAgent.includes('Mac')) {
      os = 'mac';
    } else {
      os = 'other';
    }

    // Windows uses .eml, Mac/other uses .emltpl
    const formatName = os === 'mac' ? 'Template' : 'EML';
    const extension = os === 'mac' ? '.emltpl' : '.eml';

    const osName =
      os === 'windows' ? 'Windows' : os === 'mac' ? 'macOS' : 'Other Platform';

    setFormatInfo({ formatName, extension, osName });
  }, []);

  return (
    <div className="text-xs text-muted-foreground">
      <span className="font-medium">{formatInfo.formatName} Format:</span>{' '}
      Optimized for {formatInfo.osName} ({formatInfo.extension} files)
    </div>
  );
}
