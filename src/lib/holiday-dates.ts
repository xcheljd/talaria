/**
 * Shared holiday/date utilities for promotion title and subject generation.
 *
 * Previously duplicated between promotion-email-html.ts and
 * subject-line-generator.ts (~250 lines that could drift independently).
 */

// ===== Holiday Date Utilities =====

export interface HolidayDates {
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

/** Get nth occurrence of a weekday in a month */
export function getOrdinalWeekday(
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
export function getLastWeekday(
  year: number,
  month: number,
  dayOfWeek: number
): Date {
  const lastDay = new Date(year, month + 1, 0);
  const lastDayOfWeek = lastDay.getDay();
  let dayOffset = lastDayOfWeek - dayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month, lastDay.getDate() - dayOffset);
}

export function getHolidayDates(year: number): HolidayDates {
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

export interface ParsedDateRange {
  start: Date;
  end: Date;
}

export const MONTHS_MAP: Record<string, number> = {
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

/**
 * Parse a free-form promo date range like "Nov 28 - Dec 1" or "March 15-20".
 * Dates more than ~60 days in the past roll forward to next year; an end
 * date before the start rolls forward across the year boundary.
 */
export function parsePromoDateRange(
  dateRangeStr: string
): ParsedDateRange | null {
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
    // Accept an optional ordinal suffix ("20th", "3rd") — otherwise the
    // trailing letters break the \b after the digits and the day is lost.
    const dayMatch = part.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/i);

    let month = fallbackMonth;
    if (monthMatch) {
      month = MONTHS_MAP[monthMatch[1].toLowerCase()] ?? null;
    }
    if (month === null) return null;

    const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;

    let year = currentYear;
    const tentativeDate = new Date(year, month, day);
    if (tentativeDate.getTime() < now.getTime() - 60 * 24 * 60 * 60 * 1000) {
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

// ===== Occasion Detection =====

/**
 * Return a sale-event title when the date range overlaps a known occasion
 * window. Windows are checked in priority order (specific events first,
 * broad seasons last).
 */
export function getOccasionTitle(start: Date, end: Date): string | null {
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

/**
 * Generate a promotion title based on date range.
 * Uses holiday-aware matching for common sale events.
 */
export function generatePromoTitle(dateRange: string): string {
  if (!dateRange) return 'WEEKLY SALE';

  const parsed = parsePromoDateRange(dateRange);
  if (!parsed) return 'WEEKLY SALE';

  return getOccasionTitle(parsed.start, parsed.end) || 'WEEKLY SALE';
}
