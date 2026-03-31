/**
 * Promotion Email HTML Generation
 * Pure functions for generating the promotion email HTML from store data.
 * Migrated from src/js/promotion-ui.js generatePromotionEmailHTML()
 */

import { sanitizeHTML } from './html-utils';
import {
  getStorePhone,
  getStoreAddress,
  getStoreEmail,
  getStoreHours,
  getStorePlusCode,
} from './profile';
import type {
  PromotionEntry,
  SpecialHour,
  HowToShopItem,
  ImportantNotesItem,
  NewsletterPosition,
} from '@/stores/promotion-store';

// ===== Types =====

export interface PromotionEmailData {
  promoDateRange: string;
  promoYear: string;
  promoTitle: string;
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  newsletterHeading: string;
  newsletterBody: string;
  newsletterPosition: NewsletterPosition;
}

export interface PromotionConfigForExport {
  templateType: 'promotion-email';
  version: number;
  dateRange: string;
  year: string;
  title: string;
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  attachedPDFs: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
  generatedSubjectLines: string[];
  selectedSubjectLine: string | null;
  newsletterHeading: string;
  newsletterBody: string;
  newsletterPosition: NewsletterPosition;
}

// ===== Helpers =====

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return sanitizeHTML(text);
}

/** Apply formatting (bold/italic/underline) to item text */
function formatItemText(item: {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}): string {
  let text = escapeHtml(item.text);
  if (item.bold) text = `<strong>${text}</strong>`;
  if (item.italic) text = `<em>${text}</em>`;
  if (item.underline) text = `<u>${text}</u>`;
  return text;
}

/**
 * Generate a promotion title based on date range.
 * Uses holiday-aware matching for common sale events.
 */
export function generatePromoTitle(dateRange: string): string {
  if (!dateRange) return 'WEEKLY SALE';

  // Parse the date range to detect holidays
  const title = getOccasionTitle(dateRange);
  return title || 'WEEKLY SALE';
}

// ===== Holiday Date Utilities =====

interface HolidayDates {
  blackFriday: Date;
  cyberMonday: Date;
  memorialDay: Date;
  laborDay: Date;
  presidentsDay: Date;
  valentines: Date;
  mothersDay: Date;
  fathersDay: Date;
  independence: Date;
  halloween: Date;
  newYear: Date;
  christmas: Date;
  thanksgiving: Date;
}

function getOrdinalWeekday(
  year: number,
  month: number,
  dayOfWeek: number,
  ordinal: number
): Date {
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  let dayOffset = dayOfWeek - firstDayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  const date = 1 + dayOffset + (ordinal - 1) * 7;
  return new Date(year, month, date);
}

function getLastWeekday(year: number, month: number, dayOfWeek: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfWeek = lastDay.getDay();
  let dayOffset = lastDayOfWeek - dayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month, lastDay.getDate() - dayOffset);
}

function getHolidayDates(year: number): HolidayDates {
  const thanksgiving = getOrdinalWeekday(year, 10, 4, 4);
  const dayMs = 24 * 60 * 60 * 1000;

  return {
    newYear: new Date(year, 0, 1),
    valentines: new Date(year, 1, 14),
    independence: new Date(year, 6, 4),
    halloween: new Date(year, 9, 31),
    christmas: new Date(year, 11, 25),
    presidentsDay: getOrdinalWeekday(year, 1, 1, 3),
    mothersDay: getOrdinalWeekday(year, 4, 0, 2),
    memorialDay: getLastWeekday(year, 4, 1),
    fathersDay: getOrdinalWeekday(year, 5, 0, 3),
    laborDay: getOrdinalWeekday(year, 8, 1, 1),
    thanksgiving,
    blackFriday: new Date(thanksgiving.getTime() + dayMs),
    cyberMonday: new Date(thanksgiving.getTime() + 4 * dayMs),
  };
}

interface ParsedDateRange {
  start: Date;
  end: Date;
}

const MONTHS_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function parseDateRange(dateRangeStr: string): ParsedDateRange | null {
  if (!dateRangeStr || !dateRangeStr.trim()) return null;

  const str = dateRangeStr.toLowerCase().trim();
  const now = new Date();
  const currentYear = now.getFullYear();

  const parts = str.split(/\s*[-–—]\s*|\s+to\s+/);

  const parseDate = (
    part: string,
    fallbackMonth: number | null = null
  ): Date | null => {
    const monthMatch = part.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
    );
    const dayMatch = part.match(/\b(\d{1,2})\b/);

    let month = fallbackMonth;
    if (monthMatch) {
      month = MONTHS_MAP[monthMatch[1].toLowerCase()];
    }
    if (month === null) return null;

    const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;

    let year = currentYear;
    const tentativeDate = new Date(year, month, day);
    if (tentativeDate < new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)) {
      year = currentYear + 1;
    }

    return new Date(year, month, day);
  };

  if (parts.length === 1) {
    const date = parseDate(parts[0]);
    return date ? { start: date, end: date } : null;
  } else if (parts.length >= 2) {
    const startDate = parseDate(parts[0]);
    if (!startDate) return null;
    const endDate = parseDate(parts[1], startDate.getMonth());
    if (!endDate) return null;
    if (endDate < startDate) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    return { start: startDate, end: endDate };
  }

  return null;
}

function getOccasionTitle(dateRange: string): string | null {
  const parsed = parseDateRange(dateRange);
  if (!parsed) return null;

  const { start, end } = parsed;
  const year = start.getFullYear();
  const holidays = getHolidayDates(year);
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAfter = (date: Date, days: number) =>
    new Date(date.getTime() + days * dayMs);
  const daysBefore = (date: Date, days: number) =>
    new Date(date.getTime() - days * dayMs);

  const occasions = [
    {
      title: 'BLACK FRIDAY OUTLET EVENT',
      start: daysBefore(holidays.blackFriday, 1),
      end: daysAfter(holidays.blackFriday, 2),
    },
    {
      title: 'CYBER MONDAY SALE',
      start: daysBefore(holidays.cyberMonday, 1),
      end: daysAfter(holidays.cyberMonday, 1),
    },
    {
      title: 'MEMORIAL DAY SALE',
      start: daysBefore(holidays.memorialDay, 4),
      end: holidays.memorialDay,
    },
    {
      title: 'LABOR DAY SALE',
      start: daysBefore(holidays.laborDay, 4),
      end: holidays.laborDay,
    },
    {
      title: 'PRESIDENTS DAY SALE',
      start: daysBefore(holidays.presidentsDay, 4),
      end: holidays.presidentsDay,
    },
    {
      title: "VALENTINE'S DAY EVENT",
      start: new Date(year, 1, 1),
      end: holidays.valentines,
    },
    {
      title: "MOTHER'S DAY GIFT EVENT",
      start: daysBefore(holidays.mothersDay, 14),
      end: holidays.mothersDay,
    },
    {
      title: "FATHER'S DAY GIFT EVENT",
      start: daysBefore(holidays.fathersDay, 14),
      end: holidays.fathersDay,
    },
    {
      title: 'JULY 4TH SALE',
      start: new Date(year, 5, 25),
      end: holidays.independence,
    },
    {
      title: 'HALLOWEEN SALE',
      start: new Date(year, 9, 15),
      end: holidays.halloween,
    },
    {
      title: 'BACK TO SCHOOL SALE',
      start: new Date(year, 7, 1),
      end: new Date(year, 8, 10),
    },
    {
      title: 'NEW YEAR SALE',
      start: new Date(year, 11, 26),
      end: new Date(year + 1, 0, 7),
    },
    {
      title: 'NEW YEAR SALE',
      start: new Date(year, 0, 1),
      end: new Date(year, 0, 7),
    },
    {
      title: 'HOLIDAY SALE EVENT',
      start: new Date(year, 11, 1),
      end: new Date(year, 11, 25),
    },
    {
      title: 'SUMMER CLEARANCE',
      start: new Date(year, 5, 1),
      end: new Date(year, 7, 31),
    },
    {
      title: 'SPRING SALE',
      start: new Date(year, 2, 1),
      end: new Date(year, 4, 31),
    },
    {
      title: 'FALL SALE',
      start: new Date(year, 8, 1),
      end: new Date(year, 10, 30),
    },
    {
      title: 'WINTER SALE',
      start: new Date(year, 0, 1),
      end: new Date(year, 1, 28),
    },
  ];

  for (const occasion of occasions) {
    if (start <= occasion.end && end >= occasion.start) {
      return occasion.title;
    }
  }

  return null;
}

// ===== Main Generation Function =====

/**
 * Generate the complete HTML for a promotion email.
 *
 * This is a pure function that takes promotion data and returns
 * an HTML string suitable for email preview and EML export.
 */
export function generatePromotionEmailHTML(data: PromotionEmailData): string {
  const dateRangeRaw = data.promoDateRange || '';
  const dateRange = escapeHtml(dateRangeRaw);
  const title =
    data.promoTitle && data.promoTitle.trim()
      ? escapeHtml(data.promoTitle)
      : generatePromoTitle(dateRangeRaw);

  const year =
    data.promoYear && data.promoYear.trim()
      ? escapeHtml(data.promoYear.trim())
      : new Date().getFullYear().toString();

  const storePhoneRaw = getStorePhone();
  const storePhone = escapeHtml(storePhoneRaw);

  // Build brand sections from entries
  let brandSections = '';
  for (const entry of data.promotionEntries) {
    // Backwards compatibility: map old brand/discount fields
    // Use unknown intermediate cast for compatibility with strict type checking
    const entryAny = entry as unknown as Record<string, unknown>;
    if (!entry.line && (entryAny.brand || entryAny.discount)) {
      const brand = (entryAny.brand as string) || '';
      const discountText = entryAny.discount
        ? `${String(entryAny.discount).trim()}% OFF`
        : '';
      const pieces = [brand, discountText].filter((p) => p && p.trim());
      if (pieces.length > 0) {
        const _line = pieces.join(' – ');
        brandSections += buildEntryHTML(
          _line,
          entry.collections,
          entry.callout
        );
      }
      continue;
    }

    if (!entry.line || !entry.line.trim()) continue;

    brandSections += buildEntryHTML(
      entry.line,
      entry.collections,
      entry.callout
    );
  }

  // Store info
  const rawAddress = getStoreAddress();
  const storeAddress = escapeHtml(rawAddress).replace(/\n/g, '<br>');
  const storeEmailRaw = getStoreEmail();
  const storeEmail = escapeHtml(storeEmailRaw);
  const storeHours = escapeHtml(getStoreHours());
  const plusCode = getStorePlusCode();

  let storeMapLink =
    'https://www.google.com/maps?q=36.05145495363422,-115.16933573536541';
  if (plusCode && plusCode.trim()) {
    storeMapLink = `https://www.google.com/maps?q=${encodeURIComponent(plusCode)}`;
  } else {
    const addressForSearch = getStoreAddress()
      .replace(/<br>/g, ' ')
      .replace(/\n/g, ' ');
    if (addressForSearch.trim()) {
      storeMapLink = `https://www.google.com/maps?q=${encodeURIComponent(addressForSearch)}`;
    }
  }

  // How to Shop section
  const howToShopHTML = data.howToShopItems
    .filter((item) => item.text && item.text.trim())
    .map((item) => `• ${formatItemText(item)}`)
    .join('<br>\n                    ');

  // Important Notes section
  const importantNotesHTML = data.importantNotesItems
    .filter((item) => item.text && item.text.trim())
    .map((item) => `• ${formatItemText(item)}`)
    .join('<br>\n                    ');

  // Special Hours section
  const specialHoursHTML =
    data.specialHours.length > 0
      ? `
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>SPECIAL HOURS</b><br>
                    ${data.specialHours
                      .map((hour) =>
                        hour.day && hour.hours
                          ? `${escapeHtml(hour.day)}: ${escapeHtml(hour.hours)}`
                          : ''
                      )
                      .filter((h) => h)
                      .join('<br>')}
                </p>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
    <title>Weekly Sale</title>
</head>
<body style="font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #333333; background-color: white; margin: 0; padding: 0;">

    <center>
    <table width="600" style="background-color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif;">

        <!-- HEADER -->
        <tr>
            <td style="padding: 20px; text-align: center; border-bottom: 2px solid gray;">
                <h1 style="font-size: 24px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">${title}</h1>
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 10px 0 0 0;">${dateRange}, ${year} • While Supplies Last</p>
            </td>
        </tr>

        <!-- MAIN CONTENT -->
        <tr>
            <td style="padding: 25px;">

                <!-- BRAND SECTIONS -->
${brandSections}

                <!-- HOW TO SHOP BOX -->
                <div style="background-color: #f5f5f5; color: #333333; padding: 15px; margin-bottom: 20px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>HOW TO SHOP</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${howToShopHTML}</p>
                </div>

                <!-- IMPORTANT NOTES BOX -->
                <div style="border: 1px solid #ddd; color: #333333; padding: 15px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>IMPORTANT NOTES</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${importantNotesHTML}</p>
                </div>

            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style="background-color: #2c3e50; padding: 20px; text-align: center;">
                <h3 style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">CITIZEN COMPANY STORE</h3>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📍 <a href="${storeMapLink}" target="_blank" style="color: white;">
                    ${storeAddress}</a>
                </p>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📞 <a href="tel:+1${storePhoneRaw.replace(/\D/g, '')}" target="_blank" style="color: white;">${storePhone}</a> |
                    📧 <a href="mailto:${storeEmailRaw}" target="_blank" style="color: white;">${storeEmail}</a>
                </p>
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>STORE HOURS</b><br>
                    ${storeHours}
                </p>${specialHoursHTML}
            </td>
        </tr>

        <!-- UNSUBSCRIBE -->
        <tr>
            <td style="background-color: #f4f4f4; padding: 15px; text-align: center;">
                <p style="font-size: 12px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; color: #333333; margin: 0;">
                    No longer interested? Simply reply to this email with <b>"UNSUBSCRIBE"</b>
                </p>
            </td>
        </tr>

    </table>
    </center>

</body>
</html>`;
}

// ===== Entry HTML Builder =====

function buildEntryHTML(
  line: string,
  collections: string,
  callout: string
): string {
  let html = `
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${escapeHtml(line)}</b></p>`;

  if (collections && collections.trim()) {
    const collectionItems = collections
      .split(',')
      .map((c) => escapeHtml(c.trim()))
      .filter((c) => c);
    const collectionsHTML = collectionItems.map((c) => `*${c}`).join(' • ');

    html += `
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${callout && callout.trim() ? '5px' : '20px'};">
                    ${collectionsHTML}
                </p>`;
  }

  if (callout && callout.trim()) {
    html += `
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${escapeHtml(callout)}
                </p>`;
  }

  return html;
}

// ===== Export Config Builder =====

/**
 * Build a promotion config object for JSON export.
 */
export function buildExportConfig(
  data: PromotionEmailData,
  attachedPDFs: Array<{ id: string; name: string; size: number; type: string }>,
  generatedSubjectLines: string[],
  selectedSubjectLine: string | null
): PromotionConfigForExport {
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
    })),
    importantNotesItems: data.importantNotesItems.map((i) => ({
      id: i.id,
      text: i.text,
      bold: i.bold,
      italic: i.italic,
      underline: i.underline,
    })),
    attachedPDFs: attachedPDFs.map((p) => ({
      id: p.id,
      name: p.name,
      size: p.size,
      type: p.type,
    })),
    generatedSubjectLines: [...generatedSubjectLines],
    selectedSubjectLine,
    newsletterHeading: data.newsletterHeading,
    newsletterBody: data.newsletterBody,
    newsletterPosition: data.newsletterPosition,
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

  return {
    ok: true,
    config: {
      templateType: 'promotion-email',
      version: (config.version as number) || 1,
      dateRange:
        (config.dateRange as string) || (config.promoDateRange as string) || '',
      year: (config.year as string) || (config.promoYear as string) || '',
      title: (config.title as string) || (config.promoTitle as string) || '',
      promotionEntries: config.promotionEntries as PromotionEntry[],
      specialHours: config.specialHours as SpecialHour[],
      howToShopItems: (config.howToShopItems as HowToShopItem[]) || [],
      importantNotesItems:
        (config.importantNotesItems as ImportantNotesItem[]) || [],
      attachedPDFs:
        (config.attachedPDFs as PromotionConfigForExport['attachedPDFs']) || [],
      generatedSubjectLines: (config.generatedSubjectLines as string[]) || [],
      selectedSubjectLine:
        (config.selectedSubjectLine as string | null) || null,
      newsletterHeading: (config.newsletterHeading as string) || 'Newsletter',
      newsletterBody: (config.newsletterBody as string) || '',
      newsletterPosition:
        (config.newsletterPosition as NewsletterPosition) || 'top',
    },
  };
}
