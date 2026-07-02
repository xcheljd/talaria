/**
 * Promotion config export/import: builds the JSON config written by the
 * Export button and validates/normalizes a config read back by Import or the
 * Version History card. Kept separate from the email HTML renderer so each
 * file has one job.
 */

import {
  DEFAULT_NEWSLETTER_STYLE,
  type NewsletterStyle,
} from '@/stores/promotion-store';
import {
  parsePromotionEntries,
  parseSpecialHours,
  parseFormattableItems,
  parseSectionBoxStyle,
  parseNewsletterStyle,
  parseEmailPalette,
  parseStringArray,
  parseAttachedPDFs,
} from './promotion-config-schema';
import type {
  EmailPalette,
  PromotionEmailData,
  PromotionConfigForExport,
} from './promotion-email-html';

// ===== Export Config Builder =====

/** Optional payloads the user can opt into when exporting. */
export interface ExportOptions {
  /** Embed the bulk-email recipient list in the config (PII; off by default). */
  includeRecipients?: boolean;
  /** Embed each PDF's base64 file data, not just metadata (larger file). */
  includePdfData?: boolean;
  /** The recipient text to embed when includeRecipients is set. */
  bulkEmailRecipients?: string;
}

/**
 * Build a promotion config object for JSON export.
 */
export function buildExportConfig(
  data: PromotionEmailData,
  attachedPDFs: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    data?: string;
  }>,
  generatedSubjectLines: string[],
  selectedSubjectLine: string | null,
  newsletterStyle?: NewsletterStyle,
  emailPalette?: EmailPalette,
  options: ExportOptions = {}
): PromotionConfigForExport {
  const {
    includeRecipients = false,
    includePdfData = false,
    bulkEmailRecipients,
  } = options;
  return {
    templateType: 'promotion-email',
    version: 1,
    dateRange: data.promoDateRange,
    year: data.promoYear,
    title: data.promoTitle,
    promotionEntries: data.promotionEntries.map((e) => ({
      id: e.id,
      line: e.line,
      collections: e.collections,
      callout: e.callout,
    })),
    specialHours: data.specialHours.map((h) => ({
      id: h.id,
      day: h.day,
      hours: h.hours,
    })),
    howToShopItems: data.howToShopItems.map((i) => ({
      id: i.id,
      text: i.text,
      bold: i.bold,
      italic: i.italic,
      underline: i.underline,
      // Carry the auto-managed tag so a round-trip keeps profile-driven lines
      // tracking the profile (rather than losing the tag and relying on the
      // legacy regex re-adoption on next load).
      ...(i.autoField ? { autoField: i.autoField } : {}),
    })),
    importantNotesItems: data.importantNotesItems.map((i) => ({
      id: i.id,
      text: i.text,
      bold: i.bold,
      italic: i.italic,
      underline: i.underline,
      // Carry the auto-managed tag (e.g. the "Find us at" directions line) so a
      // round-trip keeps profile-driven lines tracking the profile.
      ...(i.autoField ? { autoField: i.autoField } : {}),
    })),
    howToShopStyle: data.howToShopStyle,
    importantNotesStyle: data.importantNotesStyle,
    attachedPDFs: attachedPDFs.map((p) => ({
      id: p.id,
      name: p.name,
      size: p.size,
      type: p.type,
      // Embed the file bytes only when the user opted in; otherwise metadata only.
      ...(includePdfData && p.data ? { data: p.data } : {}),
    })),
    generatedSubjectLines: [...generatedSubjectLines],
    selectedSubjectLine,
    preheaderText: data.preheaderText,
    newsletterHeading: data.newsletterHeading,
    newsletterBody: data.newsletterBody,
    newsletterPosition: data.newsletterPosition,
    newsletterStyle: newsletterStyle || { ...DEFAULT_NEWSLETTER_STYLE },
    newsletterVisible: data.newsletterVisible,
    emailPalette: emailPalette || data.emailPalette,
    // Recipients are PII, so only embedded when explicitly included.
    ...(includeRecipients
      ? { bulkEmailRecipients: bulkEmailRecipients ?? '' }
      : {}),
  };
}

/**
 * Validate and normalize an imported config object.
 */
export function validateImportConfig(
  raw: unknown
):
  | { ok: true; config: PromotionConfigForExport }
  | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'notObject' };
  }

  const config = raw as Record<string, unknown>;

  if (config.templateType && config.templateType !== 'promotion-email') {
    return { ok: false, reason: 'wrongType' };
  }

  if (!Array.isArray(config.promotionEntries)) {
    return { ok: false, reason: 'promotionEntriesNotArray' };
  }

  if (!Array.isArray(config.specialHours)) {
    return { ok: false, reason: 'specialHoursNotArray' };
  }

  // Normalize: howToShopItems and importantNotesItems default to []
  if (config.howToShopItems && !Array.isArray(config.howToShopItems)) {
    return { ok: false, reason: 'howToShopItemsNotArray' };
  }

  if (
    config.importantNotesItems &&
    !Array.isArray(config.importantNotesItems)
  ) {
    return { ok: false, reason: 'importantNotesItemsNotArray' };
  }

  const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

  return {
    ok: true,
    config: {
      templateType: 'promotion-email',
      version: typeof config.version === 'number' ? config.version : 1,
      dateRange: asString(config.dateRange) || asString(config.promoDateRange),
      year: asString(config.year) || asString(config.promoYear),
      title: asString(config.title) || asString(config.promoTitle),
      promotionEntries: parsePromotionEntries(config.promotionEntries),
      specialHours: parseSpecialHours(config.specialHours),
      howToShopItems: parseFormattableItems(config.howToShopItems),
      importantNotesItems: parseFormattableItems(config.importantNotesItems),
      howToShopStyle: parseSectionBoxStyle(config.howToShopStyle),
      importantNotesStyle: parseSectionBoxStyle(config.importantNotesStyle),
      attachedPDFs: parseAttachedPDFs(config.attachedPDFs),
      generatedSubjectLines: parseStringArray(config.generatedSubjectLines),
      selectedSubjectLine: asString(config.selectedSubjectLine) || null,
      preheaderText: asString(config.preheaderText),
      newsletterHeading: asString(config.newsletterHeading) || 'Newsletter',
      newsletterBody: asString(config.newsletterBody),
      newsletterPosition:
        config.newsletterPosition === 'bottom' ? 'bottom' : 'top',
      newsletterStyle: parseNewsletterStyle(config.newsletterStyle),
      newsletterVisible: config.newsletterVisible === true,
      emailPalette: parseEmailPalette(config.emailPalette),
      // Optional; only present when the export embedded it.
      ...(typeof config.bulkEmailRecipients === 'string'
        ? { bulkEmailRecipients: config.bulkEmailRecipients }
        : {}),
    },
  };
}
