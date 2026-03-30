/**
 * Subject line generation from promotion content.
 * Migrated from src/js/promotion-ui.js generateSubjectLines()
 * Pure functions with no React or DOM dependencies.
 */

import type { PromotionEntry } from '@/stores/promotion-store';

// ===== Types =====

export interface SubjectLineInput {
  promoDateRange: string;
  promotionEntries: PromotionEntry[];
}

// ===== Holiday / Date Utilities =====

/**
 * Get nth occurrence of a weekday in a month
 */
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

/** Get the last occurrence of a weekday in a month */
function getLastWeekday(year: number, month: number, dayOfWeek: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfWeek = lastDay.getDay();
  let dayOffset = lastDayOfWeek - dayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month, lastDay.getDate() - dayOffset);
}

interface HolidayDates {
  newYear: Date;
  valentines: Date;
  independence: Date;
  halloween: Date;
  christmas: Date;
  presidentsDay: Date;
  mothersDay: Date;
  memorialDay: Date;
  fathersDay: Date;
  laborDay: Date;
  thanksgiving: Date;
  blackFriday: Date;
  cyberMonday: Date;
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

// ===== Date Range Parsing =====

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

interface DateRange {
  start: Date;
  end: Date;
}

function parseDate(dateRangeStr: string): DateRange | null {
  if (!dateRangeStr || !dateRangeStr.trim()) return null;

  const str = dateRangeStr.toLowerCase().trim();
  const now = new Date();
  const currentYear = now.getFullYear();

  const parts = str.split(/\s*[-–—]\s*|\s+to\s+/);

  const parseSingleDate = (
    part: string,
    fallbackMonth: number | null = null
  ): Date | null => {
    const monthMatch = part.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
    );
    const dayMatch = part.match(/\b(\d{1,2})\b/);

    let month: number | null = fallbackMonth;
    if (monthMatch) {
      month = MONTHS[monthMatch[1].toLowerCase()] ?? null;
    }

    if (month === null) return null;

    const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;

    let year = currentYear;
    const tentativeDate = new Date(year, month, day);
    if (
      tentativeDate.getTime() <
      now.getTime() - 60 * 24 * 60 * 60 * 1000
    ) {
      year = currentYear + 1;
    }

    return new Date(year, month, day);
  };

  if (parts.length === 1) {
    const date = parseSingleDate(parts[0]);
    return date ? { start: date, end: date } : null;
  } else if (parts.length >= 2) {
    const startDate = parseSingleDate(parts[0]);
    if (!startDate) return null;

    const endDate = parseSingleDate(parts[1], startDate.getMonth());
    if (!endDate) return null;

    if (endDate < startDate) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return { start: startDate, end: endDate };
  }

  return null;
}

// ===== Occasion Detection =====

interface Occasion {
  name: string;
  title: string;
  start: Date;
  end: Date;
}

function getOccasionForDateRange(
  startDate: Date,
  endDate: Date
): string | null {
  const year = startDate.getFullYear();
  const holidays = getHolidayDates(year);
  const dayMs = 24 * 60 * 60 * 1000;
  const daysBefore = (date: Date, days: number) =>
    new Date(date.getTime() - days * dayMs);

  const occasions: Occasion[] = [
    {
      name: 'blackFriday',
      title: 'BLACK FRIDAY OUTLET EVENT',
      start: daysBefore(holidays.blackFriday, 1),
      end: new Date(holidays.blackFriday.getTime() + 2 * dayMs),
    },
    {
      name: 'cyberMonday',
      title: 'CYBER MONDAY SALE',
      start: daysBefore(holidays.cyberMonday, 1),
      end: new Date(holidays.cyberMonday.getTime() + 1 * dayMs),
    },
    {
      name: 'memorialDay',
      title: 'MEMORIAL DAY SALE',
      start: daysBefore(holidays.memorialDay, 4),
      end: holidays.memorialDay,
    },
    {
      name: 'laborDay',
      title: 'LABOR DAY SALE',
      start: daysBefore(holidays.laborDay, 4),
      end: holidays.laborDay,
    },
    {
      name: 'presidentsDay',
      title: 'PRESIDENTS DAY SALE',
      start: daysBefore(holidays.presidentsDay, 4),
      end: holidays.presidentsDay,
    },
    {
      name: 'valentines',
      title: "VALENTINE'S DAY EVENT",
      start: new Date(year, 1, 1),
      end: holidays.valentines,
    },
    {
      name: 'mothersDay',
      title: "MOTHER'S DAY GIFT EVENT",
      start: daysBefore(holidays.mothersDay, 14),
      end: holidays.mothersDay,
    },
    {
      name: 'fathersDay',
      title: "FATHER'S DAY GIFT EVENT",
      start: daysBefore(holidays.fathersDay, 14),
      end: holidays.fathersDay,
    },
    {
      name: 'independence',
      title: 'JULY 4TH SALE',
      start: new Date(year, 5, 25),
      end: holidays.independence,
    },
    {
      name: 'halloween',
      title: 'HALLOWEEN SALE',
      start: new Date(year, 9, 15),
      end: holidays.halloween,
    },
    {
      name: 'backToSchool',
      title: 'BACK TO SCHOOL SALE',
      start: new Date(year, 7, 1),
      end: new Date(year, 8, 10),
    },
    {
      name: 'newYear',
      title: 'NEW YEAR SALE',
      start: new Date(year, 11, 26),
      end: new Date(year + 1, 0, 7),
    },
    {
      name: 'newYearEarly',
      title: 'NEW YEAR SALE',
      start: new Date(year, 0, 1),
      end: new Date(year, 0, 7),
    },
    {
      name: 'holiday',
      title: 'HOLIDAY SALE EVENT',
      start: new Date(year, 11, 1),
      end: new Date(year, 11, 25),
    },
    {
      name: 'summer',
      title: 'SUMMER CLEARANCE',
      start: new Date(year, 5, 1),
      end: new Date(year, 7, 31),
    },
    {
      name: 'spring',
      title: 'SPRING SALE',
      start: new Date(year, 2, 1),
      end: new Date(year, 4, 31),
    },
    {
      name: 'fall',
      title: 'FALL SALE',
      start: new Date(year, 8, 1),
      end: new Date(year, 10, 30),
    },
    {
      name: 'winter',
      title: 'WINTER SALE',
      start: new Date(year, 0, 1),
      end: new Date(year, 1, 28),
    },
  ];

  for (const occasion of occasions) {
    if (startDate <= occasion.end && endDate >= occasion.start) {
      return occasion.title;
    }
  }

  return null;
}

/** Auto-generate title from date range */
export function generatePromoTitle(dateRange: string): string {
  if (!dateRange) return 'WEEKLY SALE';

  const parsed = parseDate(dateRange);
  if (!parsed) return 'WEEKLY SALE';

  const occasionTitle = getOccasionForDateRange(parsed.start, parsed.end);
  if (occasionTitle) return occasionTitle;

  return 'WEEKLY SALE';
}

// ===== Season & Occasion Detection =====

interface SeasonOccasions {
  season: string;
  occasions: Array<{ name: string; type: string }>;
}

function getSeasonAndOccasions(): SeasonOccasions {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  let season = 'winter';
  if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else if (month >= 8 && month <= 10) season = 'fall';

  const occasions: Array<{ name: string; type: string }> = [];

  if (month === 1 && day <= 14) {
    occasions.push({ name: "Valentine's Day", type: 'gift' });
  }
  if (month === 4 && day <= 14) {
    occasions.push({ name: "Mother's Day", type: 'gift' });
  }
  if (month === 5 && day <= 21) {
    occasions.push({ name: "Father's Day", type: 'gift' });
  }
  if ((month === 5 && day >= 20) || (month === 6 && day <= 4)) {
    occasions.push({ name: 'July 4th', type: 'sale' });
  }
  if ((month === 6 && day >= 20) || month === 7 || (month === 8 && day <= 7)) {
    occasions.push({ name: 'Back to School', type: 'sale' });
  }
  if (month === 9 && day >= 15) {
    occasions.push({ name: 'Halloween', type: 'theme' });
  }
  if (month === 10 && day >= 20) {
    occasions.push({ name: 'Black Friday', type: 'sale' });
  }
  if (month === 11 && day <= 25) {
    occasions.push({ name: 'Holiday', type: 'gift' });
  }
  if ((month === 11 && day >= 26) || (month === 0 && day <= 7)) {
    occasions.push({ name: 'New Year', type: 'sale' });
  }

  return { season, occasions };
}

// ===== Subject Line Generation =====

/**
 * Generate subject line suggestions from promotion content.
 * Returns an array of unique, filtered subject lines sorted by optimal length.
 */
export function generateSubjectLines(input: SubjectLineInput): string[] {
  const { promoDateRange, promotionEntries } = input;

  // Extract brands from promotion lines
  const brandKeywords = ['Citizen', 'Bulova', 'Alpina', 'Frederique Constant'];
  const brands = [
    ...new Set(
      promotionEntries
        .map((e) => e.line || '')
        .flatMap((line) =>
          brandKeywords.filter((brand) =>
            line.toLowerCase().includes(brand.toLowerCase())
          )
        )
        .filter(Boolean)
    ),
  ];

  // Extract max discount percentage
  const discountPattern = /(\d+)[\s%]*%/;
  const maxDiscount = Math.max(
    0,
    ...promotionEntries.map((e) => {
      const match = (e.line || '').match(discountPattern);
      return match ? parseInt(match[1], 10) || 0 : 0;
    })
  );

  // Extract collections
  const collections: string[] = [];
  const collectionsByBrand: Record<string, string[]> = {};
  promotionEntries.forEach((e) => {
    if (e.collections) {
      const entryBrand = brandKeywords.find((brand) =>
        (e.line || '').toLowerCase().includes(brand.toLowerCase())
      );

      e.collections.split(',').forEach((c) => {
        const trimmed = c.trim();
        if (trimmed && !collections.includes(trimmed)) {
          collections.push(trimmed);
          if (entryBrand) {
            if (!collectionsByBrand[entryBrand]) {
              collectionsByBrand[entryBrand] = [];
            }
            collectionsByBrand[entryBrand].push(trimmed);
          }
        }
      });
    }
  });
  const topCollections = collections.slice(0, 3);

  // Check callouts for scarcity/urgency
  const callouts = promotionEntries
    .filter((e) => e.callout && e.callout.trim())
    .map((e) => e.callout!.toLowerCase());
  const hasLimitedStock = callouts.some(
    (c) => c.includes('limited') || c.includes('while supplies')
  );
  const hasFinalSale = callouts.some((c) => c.includes('final'));

  // Build discount phrase
  const getDiscountPhrase = (discount: number): string => {
    if (discount >= 50) return `Up to ${discount}% OFF`;
    if (discount >= 30) return `Up to ${discount}% OFF`;
    if (discount > 0) return `Up to ${discount}% OFF`;
    return 'Special Savings';
  };

  const subjects: string[] = [];

  const { season, occasions } = getSeasonAndOccasions();

  // TIER 1: High-Impact Contextual
  if (occasions.length > 0) {
    const occasion = occasions[0];
    if (occasion.type === 'gift') {
      subjects.push(`${occasion.name} Watch Gifts`);
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Gifts – ${getDiscountPhrase(maxDiscount)}`
        );
      }
      if (brands.length > 0) {
        subjects.push(`${occasion.name}: ${brands[0]} Picks`);
      }
    } else if (occasion.type === 'sale') {
      subjects.push(`${occasion.name} Watch Sale`);
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Savings – ${getDiscountPhrase(maxDiscount)}`
        );
      }
    } else if (occasion.type === 'theme') {
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Sale – ${getDiscountPhrase(maxDiscount)}`
        );
      }
    }
  } else {
    const seasonCapitalized =
      season.charAt(0).toUpperCase() + season.slice(1);
    if (maxDiscount > 0) {
      subjects.push(
        `${seasonCapitalized} Watch Sale – ${getDiscountPhrase(maxDiscount)}`
      );
    }
  }

  // Scarcity/urgency
  if (hasLimitedStock) {
    subjects.push('Limited Stock – Shop Now');
  }
  if (hasFinalSale) {
    subjects.push('Final Sale: Extra Savings Inside');
  }

  // Brand + discount
  if (brands.length > 0 && maxDiscount > 0) {
    if (brands.length === 1) {
      subjects.push(`${brands[0]}: ${getDiscountPhrase(maxDiscount)}`);
    } else {
      subjects.push(
        `${brands[0]} & ${brands[1]}: ${getDiscountPhrase(maxDiscount)}`
      );
    }
  } else if (brands.length > 0) {
    subjects.push(`${brands[0]} Sale Event`);
  }

  // TIER 2: Value & Aspiration
  if (maxDiscount >= 30) {
    subjects.push(`Perfect Watch Gifts – Up to ${maxDiscount}% OFF`);
  }

  subjects.push('Elevate Your Style');
  subjects.push('Time for an Upgrade');
  if (maxDiscount > 0) {
    subjects.push(
      `Timeless Style, Limited Time – ${getDiscountPhrase(maxDiscount)}`
    );
  }
  if (brands.length > 0) {
    subjects.push(`Discover ${brands[0]} Excellence`);
  }
  if (maxDiscount >= 25) {
    subjects.push('Luxury Within Reach');
  }

  // TIER 3: Engagement
  subjects.push('Your New Watch Awaits');
  if (maxDiscount >= 20) {
    subjects.push('Ready for a New Watch?');
  }

  // Discount-focused
  if (maxDiscount > 0) {
    subjects.push(`Up to ${maxDiscount}% OFF This Week`);
  }

  // TIER 4: Informational
  if (promoDateRange) {
    subjects.push(`Sale: ${promoDateRange}`);
    const lowerDate = promoDateRange.toLowerCase();
    if (
      lowerDate.includes('fri') ||
      lowerDate.includes('sat') ||
      lowerDate.includes('sun')
    ) {
      subjects.push(`This Weekend: ${getDiscountPhrase(maxDiscount)}`);
    }
  }

  // Brand + Collections
  if (brands.length > 0 && topCollections.length > 0) {
    const collectionsStr = topCollections.slice(0, 3).join(', ');
    subjects.push(`${brands[0]} including ${collectionsStr}`);
  }
  if (
    brands.length >= 2 &&
    collectionsByBrand[brands[0]]?.length > 0 &&
    collectionsByBrand[brands[1]]?.length > 0
  ) {
    const collection1 = collectionsByBrand[brands[0]][0];
    const collection2 = collectionsByBrand[brands[1]][0];
    subjects.push(
      `${brands[0]} & ${brands[1]} including ${collection1}, ${collection2}`
    );
  }

  // TIER 5: Generic
  if (maxDiscount > 0) {
    subjects.push("Don't Miss These Watch Deals");
  }
  if (brands.length > 0) {
    subjects.push(`VIP Watch Sale: ${brands[0]} & More`);
  }

  if (subjects.length < 3) {
    if (maxDiscount > 0) {
      subjects.push(`Up to ${maxDiscount}% OFF – This Week Only`);
    } else {
      subjects.push('New Deals This Week');
    }
  }

  // Filter: deduplicate and remove overly long subjects
  const uniqueSubjects = [...new Set(subjects)];
  const filteredSubjects = uniqueSubjects
    .filter((s) => s.length <= 60)
    .sort((a, b) => {
      const aScore = a.length >= 20 && a.length <= 45 ? 0 : 1;
      const bScore = b.length >= 20 && b.length <= 45 ? 0 : 1;
      return aScore - bScore;
    });

  return filteredSubjects.length > 0 ? filteredSubjects : uniqueSubjects;
}

// ===== PDF Utilities =====

/** Maximum PDF file size in bytes (10MB) */
export const MAX_PDF_SIZE = 10 * 1024 * 1024;

/** Format file size for display */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** Validate a PDF file */
export function validatePDFFile(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return `${file.name} is not a PDF file`;
  }
  if (file.size > MAX_PDF_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `${file.name} is too large (${sizeMB}MB). Max size is 10MB.`;
  }
  return null;
}

/** Read a PDF file as a data URL (base64) */
export function readPDFAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error(`Failed to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Error reading ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Convert a base64 data URL to a Blob */
export function dataURLtoBlob(dataURL: string): Blob {
  const byteCharacters = atob(dataURL.split(',')[1]);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteArray], { type: 'application/pdf' });
}
