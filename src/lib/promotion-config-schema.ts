/**
 * Zod schemas for the promotion import config.
 *
 * The import file is user-supplied JSON; before this existed the arrays and
 * palette were blindly cast, so a malformed config silently produced broken
 * state or let arbitrary strings flow into style="" attributes of the
 * generated email. These schemas are deliberately lenient: invalid fields
 * fall back to safe defaults instead of rejecting the whole file.
 */

import { z } from 'zod';
import {
  DEFAULT_NEWSLETTER_STYLE,
  DEFAULT_EMAIL_PALETTE,
  generateId,
  type PromotionEntry,
  type SpecialHour,
  type HowToShopItem,
  type ImportantNotesItem,
  type NewsletterStyle,
  type SectionBoxStyle,
  type EmailPaletteConfig,
} from '@/stores/promotion-store';
import { dataURLByteSize, MAX_PDF_SIZE } from '@/lib/pdf-utils';

// ===== Color validation =====

/**
 * Safe CSS color value: hex, simple named color, or rgb()/rgba()/hsl()/hsla().
 * Excludes quotes, semicolons, and angle brackets so a value can never break
 * out of the style="" attribute it is interpolated into.
 */
export const SAFE_COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(rgb|rgba|hsl|hsla)\([0-9.,\s%deg-]*\))$/;

const safeColor = z.string().regex(SAFE_COLOR_RE);
const colorOrNull = safeColor.nullable().catch(null);

// ===== Item schemas (lenient: bad fields fall back, bad items get defaults) =====

const promotionEntrySchema = z
  .object({
    id: z.coerce.number().catch(0),
    line: z.string().catch(''),
    collections: z.string().catch(''),
    callout: z.string().catch(''),
  })
  .catch({ id: 0, line: '', collections: '', callout: '' });

const specialHourSchema = z
  .object({
    id: z.coerce.number().catch(0),
    day: z.string().catch(''),
    hours: z.string().catch(''),
  })
  .catch({ id: 0, day: '', hours: '' });

const formattableItemSchema = z
  .object({
    id: z.coerce.number().catch(0),
    text: z.string().catch(''),
    bold: z.boolean().catch(false),
    italic: z.boolean().catch(false),
    underline: z.boolean().catch(false),
    // Only How-to-Shop contact lines set this; it round-trips so the one-time
    // legacy adoption never has to re-run. Inert on Important Notes items.
    autoField: z
      .enum(['storeEmail', 'storePhone', 'storeDirections'])
      .optional()
      .catch(undefined),
  })
  .catch({ id: 0, text: '', bold: false, italic: false, underline: false });

const sectionBoxStyleSchema = z.object({
  borderColor: colorOrNull,
  backgroundColor: colorOrNull,
});

// NOTE: the .catch() defaults below take lazy function form so this module
// never reads promotion-store exports at evaluation time. promotion-store.ts
// imports sanitizePersistedStyles from here (closing a module cycle), and an
// eager default would read DEFAULT_NEWSLETTER_STYLE / DEFAULT_EMAIL_PALETTE
// before the store's body has run. Lazy catch values are computed only when
// a parse actually fails, long after module init.

const newsletterStyleSchema = z
  .object({
    borderColor: colorOrNull,
    backgroundColor: colorOrNull,
    headingColor: colorOrNull,
    borderStyle: z.enum(['left', 'full', 'none', 'top']).catch('left'),
    headingAlign: z.enum(['left', 'center']).catch('left'),
    tableBorderColor: colorOrNull,
    tableBorderWidth: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .catch(1),
    tableBorderStyle: z
      .enum(['solid', 'dashed', 'dotted', 'none'])
      .catch('solid'),
    tableHeaderBg: colorOrNull,
  })
  .catch(() => ({ ...DEFAULT_NEWSLETTER_STYLE }));

const emailPaletteSchema = z.object({
  footerBg: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.footerBg),
  sectionBg: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.sectionBg),
  unsubscribeBg: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.unsubscribeBg),
  accent: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.accent),
  text: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.text),
  link: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.link),
  noteBorder: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.noteBorder),
  headerBorder: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.headerBorder),
  bodyBg: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.bodyBg),
  footerText: safeColor.catch(() => DEFAULT_EMAIL_PALETTE.footerText),
});

const stringArraySchema = z.array(z.string().catch('')).catch([]);

// ===== Id normalization =====

/** Ensure every item has a unique positive numeric id. */
function normalizeIds<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.map((item) => {
    let { id } = item;
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) {
      id = generateId();
    }
    seen.add(id);
    return { ...item, id };
  });
}

// ===== Public normalizers (used by validateImportConfig) =====

export function parsePromotionEntries(raw: unknown): PromotionEntry[] {
  return normalizeIds(z.array(promotionEntrySchema).catch([]).parse(raw));
}

export function parseSpecialHours(raw: unknown): SpecialHour[] {
  return normalizeIds(z.array(specialHourSchema).catch([]).parse(raw));
}

export function parseFormattableItems(
  raw: unknown
): HowToShopItem[] & ImportantNotesItem[] {
  return normalizeIds(z.array(formattableItemSchema).catch([]).parse(raw));
}

export function parseSectionBoxStyle(
  raw: unknown
): SectionBoxStyle | undefined {
  if (raw === undefined || raw === null) return undefined;
  const result = sectionBoxStyleSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}

export function parseNewsletterStyle(raw: unknown): NewsletterStyle {
  if (raw === undefined || raw === null) {
    return { ...DEFAULT_NEWSLETTER_STYLE };
  }
  return newsletterStyleSchema.parse(raw);
}

export function parseEmailPalette(
  raw: unknown
): EmailPaletteConfig | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object') return undefined;
  return emailPaletteSchema.parse(raw);
}

/**
 * Sanitize a raw persisted style/palette object through the same safe-color
 * schemas the import path uses, so the localStorage surface gets identical
 * validation to the import surface. restoreState feeds these values — with no
 * further escaping — into style="" attributes of the generated email, so a
 * tampered or corrupt localStorage entry must fall back to the safe default
 * instead of reaching the HTML. Non-object input (or a schema shape this file
 * does not know) returns `fallback`; valid persisted values pass through
 * unchanged.
 */
export function sanitizePersistedStyles<T extends object>(
  raw: unknown,
  fallback: T
): T {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return fallback;
  }
  // Dispatch on the fallback's shape: each persisted style type is validated
  // by its own dedicated schema defined above.
  if ('tableBorderWidth' in fallback) {
    return newsletterStyleSchema.parse(raw) as unknown as T;
  }
  if ('footerBg' in fallback) {
    return emailPaletteSchema.parse(raw) as unknown as T;
  }
  return sectionBoxStyleSchema.parse(raw) as unknown as T;
}

export function parseStringArray(raw: unknown): string[] {
  return stringArraySchema.parse(raw);
}

// ===== Attached PDF schema =====

/**
 * Embedded PDF `data` must be a PDF data URL within the same 10MB cap the
 * upload path enforces (validatePDFFile). Anything else — non-PDF prefixes,
 * oversized payloads — falls back to undefined, so the entry survives as
 * metadata-only and the import loop never writes invalid bytes to IndexedDB.
 */
const pdfDataURLSchema = z
  .string()
  .refine((s) => /^data:application\/pdf;base64,/.test(s), {
    message: 'must be a PDF data URL',
  })
  .refine((s) => dataURLByteSize(s) <= MAX_PDF_SIZE, {
    message: 'PDF data exceeds 10MB',
  })
  .optional()
  .catch(undefined);

/**
 * Lenient schema for an imported PDF attachment entry. Note: PDF ids are
 * **strings** (unlike the numeric item ids), so this does NOT go through
 * normalizeIds. Bad scalar fields fall back to defaults; a non-string `data`
 * field is dropped rather than discarding the whole entry. Entries with no
 * usable id are removed by parseAttachedPDFs (an id-less attachment can't be
 * matched to its IndexedDB blob).
 */
const attachedPDFSchema = z
  .object({
    id: z.string().catch(''),
    name: z.string().catch(''),
    size: z.coerce.number().catch(0),
    type: z.string().catch('application/pdf'),
    data: pdfDataURLSchema,
  })
  .catch({ id: '', name: '', size: 0, type: 'application/pdf' });

const attachedPDFsSchema = z.array(attachedPDFSchema).catch([]);

export function parseAttachedPDFs(raw: unknown): Array<{
  id: string;
  name: string;
  size: number;
  type: string;
  data?: string;
}> {
  return attachedPDFsSchema.parse(raw).filter((p) => p.id !== '');
}
