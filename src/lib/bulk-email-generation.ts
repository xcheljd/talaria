/**
 * Bulk email batch generation.
 *
 * Pure of any component state: reads recipients and promotion data from the
 * promotion store at call time, and batch size / download format from
 * localStorage. This lets the preview panel trigger generation even when the
 * Bulk Email Tools card has never been mounted (collapsed cards unmount their
 * content), and avoids stale state when the card is mounted in both the
 * desktop and mobile layouts.
 */

import { toast } from 'sonner';

import { usePromotionStore } from '@/stores/promotion-store';
import {
  isValidEmail,
  parseEmailList,
  resolvePromoSubject,
  createBCCBatchEML,
  generateZipFilenameFromHTML,
  type PDFAttachment,
} from '@/lib/emailUtils';
import { generatePromotionEmailHTML } from '@/lib/promotion-email-html';
import { buildPromotionEmailData } from '@/lib/newsletter-utils';
import { getRecommendedFormat } from '@/lib/ui-utils';
import { saveBlob } from '@/lib/file-save';
import { StorageKeys } from '@/lib/storage-keys';

// ===== Types =====

export interface EmailStats {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  validEmails: string[];
  invalidEmails: string[];
}

export type DownloadFormat = 'individual' | 'zip';

// ===== Recipient / batch helpers =====

/** Parse and analyze the raw email text, computing stats */
export function computeEmailStats(rawText: string): EmailStats {
  const rawTokens = rawText
    .split(/[\s,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const uniqueEmails = parseEmailList(rawText);
  const duplicateCount = rawTokens.length - uniqueEmails.length;
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
export function clampBatchSize(value: number): number {
  const clamped = Math.round(value / 50) * 50;
  return Math.min(Math.max(clamped, 50), 1000);
}

export const DEFAULT_BATCH_SIZE = 500;

/** Read the persisted batch size from localStorage (falls back to default). */
export function getSavedBatchSize(): number {
  const saved = localStorage.getItem(StorageKeys.bulkEmailBatchSize);
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed)) return clampBatchSize(parsed);
  }
  return DEFAULT_BATCH_SIZE;
}

/** Read the persisted download format from localStorage. */
export function getSavedDownloadFormat(): DownloadFormat {
  const saved = localStorage.getItem(StorageKeys.bulkEmailDownloadFormat);
  return saved === 'zip' ? 'zip' : 'individual';
}

// ===== Generation =====

/**
 * Generate and download the email batches from current store state.
 * Returns true if batches were generated, false if there was nothing to do.
 */
export async function generateEmailBatches(): Promise<boolean> {
  const store = usePromotionStore.getState();
  const stats = computeEmailStats(store.bulkEmailRecipients);

  if (stats.valid === 0) {
    toast.warning('Add recipient emails in the Bulk Email Tools card first');
    return false;
  }

  const batchSize = getSavedBatchSize();
  const downloadFormat = getSavedDownloadFormat();
  const setBulkState = store.setBulkEmailGenerating;

  setBulkState(true, '0/0');

  try {
    const htmlContent = generatePromotionEmailHTML(
      buildPromotionEmailData(store)
    );
    const subject = resolvePromoSubject(
      store.selectedSubjectLine,
      store.promoTitle
    );

    // Get PDF attachments
    const pdfAttachments: PDFAttachment[] = store.attachedPDFs
      .filter((pdf) => pdf.data)
      .map((pdf) => ({ name: pdf.name, data: pdf.data }));

    // Split into batches
    const validEmails = stats.validEmails;
    const batches: string[][] = [];
    for (let i = 0; i < validEmails.length; i += batchSize) {
      batches.push(validEmails.slice(i, i + batchSize));
    }

    setBulkState(true, `0/${batches.length}`);

    const emailFormat = getRecommendedFormat();

    if (downloadFormat === 'zip') {
      // Create ZIP file with all EML files
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < batches.length; i++) {
        setBulkState(true, `Creating ${i + 1}/${batches.length}`);
        const batch = batches[i];
        const emlContent = createBCCBatchEML(
          subject,
          htmlContent,
          batch,
          pdfAttachments,
          emailFormat,
          i + 1
        );
        zip.file(emlContent.filename, emlContent.data);
      }

      setBulkState(true, 'Zipping...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFilename =
        generateZipFilenameFromHTML(htmlContent) ||
        'promotion-email-batches.zip';
      await saveBlob(zipBlob, zipFilename);
    } else {
      // Download individual files
      for (let i = 0; i < batches.length; i++) {
        setBulkState(true, `${i + 1}/${batches.length}`);
        const batch = batches[i];
        const emlContent = createBCCBatchEML(
          subject,
          htmlContent,
          batch,
          pdfAttachments,
          emailFormat,
          i + 1
        );

        const blob = new Blob([emlContent.data as BlobPart], {
          type: 'message/rfc822',
        });
        await saveBlob(blob, emlContent.filename);

        // Small delay between downloads to prevent browser issues
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error generating batches:', error);
    toast.error('Failed to generate email batches');
    return false;
  } finally {
    setBulkState(false, '');
  }
}
