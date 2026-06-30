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
  })
  .catch({ id: 0, text: '', bold: false, italic: false, underline: false });

const sectionBoxStyleSchema = z.object({
  borderColor: colorOrNull,
  backgroundColor: colorOrNull,
});

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
  .catch({ ...DEFAULT_NEWSLETTER_STYLE });

const emailPaletteSchema = z.object({
  footerBg: safeColor.catch(DEFAULT_EMAIL_PALETTE.footerBg),
  sectionBg: safeColor.catch(DEFAULT_EMAIL_PALETTE.sectionBg),
  unsubscribeBg: safeColor.catch(DEFAULT_EMAIL_PALETTE.unsubscribeBg),
  accent: safeColor.catch(DEFAULT_EMAIL_PALETTE.accent),
  text: safeColor.catch(DEFAULT_EMAIL_PALETTE.text),
  link: safeColor.catch(DEFAULT_EMAIL_PALETTE.link),
  noteBorder: safeColor.catch(DEFAULT_EMAIL_PALETTE.noteBorder),
  headerBorder: safeColor.catch(DEFAULT_EMAIL_PALETTE.headerBorder),
  bodyBg: safeColor.catch(DEFAULT_EMAIL_PALETTE.bodyBg),
  footerText: safeColor.catch(DEFAULT_EMAIL_PALETTE.footerText),
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

export function parseStringArray(raw: unknown): string[] {
  return stringArraySchema.parse(raw);
}

// ===== Attached PDF schema =====

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
    data: z.string().optional().catch(undefined),
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
