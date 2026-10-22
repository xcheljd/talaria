/**
 * BasicDetailsEditor — Promotion basic details form.
 *
 * Provides fields for:
 * - Date Range (start/end date pickers, auto-formatted)
 * - Title (optional, auto-generates based on date)
 *
 * Date range format:
 * - Single day (start === end): "Saturday, March 4th"
 * - Same month: "March 4 - 10"
 * - Different months: "March 28 - April 2"
 * - Cross-year: "December 30 - January 3" (year auto-derived)
 *
 * All mutations go through the Zustand promotion store.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { useShallow } from 'zustand/react/shallow';

import { usePromotionStore } from '@/stores/promotion-store';
import { ClearableInput } from '@/components/ui/clearable-input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';

// ===== Date Formatting =====

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** "20" -> "20th", "21" -> "21st", "22" -> "22nd", "23" -> "23rd". */
function ordinalDay(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate) return '';
  const start = new Date(startDate + 'T00:00:00');
  if (isNaN(start.getTime())) return '';

  if (!endDate) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  }

  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(end.getTime())) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  }

  const startMonth = MONTHS[start.getMonth()];
  const endMonth = MONTHS[end.getMonth()];

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    // Single day (start === end): "Saturday, March 4th"
    return `${WEEKDAYS[start.getDay()]}, ${startMonth} ${ordinalDay(start.getDate())}`;
  }

  if (
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  ) {
    // Same month: "March 4 - 10"
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
  }

  // Different months (same or different year): "March 28 - April 2"
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
}

function deriveYear(startDate: string, endDate: string): string {
  const end = endDate || startDate;
  if (!end) return new Date().getFullYear().toString();

  const d = new Date(end + 'T00:00:00');
  if (isNaN(d.getTime())) return new Date().getFullYear().toString();

  return d.getFullYear().toString();
}

/** Try to parse existing date range string back to start/end ISO dates */
function parseDateRange(
  dateRange: string,
  year: string
): { start: string; end: string } | null {
  if (!dateRange) return null;

  // Single day: "Saturday, March 4th" — the leading weekday + comma distinguish
  // it from an open-ended start-only "March 4"; ordinal suffix optional.
  const singleDay = dateRange.match(
    /^(\w+),\s*(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?$/i
  );
  if (singleDay) {
    const monthIdx = MONTHS.findIndex(
      (m) => m.toLowerCase() === singleDay[2].toLowerCase()
    );
    if (monthIdx === -1) return null;
    const y = parseInt(year, 10) || new Date().getFullYear();
    const day = parseInt(singleDay[3], 10);
    const iso = `${y}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { start: iso, end: iso };
  }

  // Match "Month D - D" or "Month D - Month D"
  const sameMonth = dateRange.match(/^(\w+)\s+(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (sameMonth) {
    const monthIdx = MONTHS.findIndex(
      (m) => m.toLowerCase() === sameMonth[1].toLowerCase()
    );
    if (monthIdx === -1) return null;
    const y = parseInt(year, 10) || new Date().getFullYear();
    const startDay = parseInt(sameMonth[2], 10);
    const endDay = parseInt(sameMonth[3], 10);
    return {
      start: `${y}-${String(monthIdx + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      end: `${y}-${String(monthIdx + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    };
  }

  const diffMonth = dateRange.match(
    /^(\w+)\s+(\d{1,2})\s*-\s*(\w+)\s+(\d{1,2})$/
  );
  if (diffMonth) {
    const startMonthIdx = MONTHS.findIndex(
      (m) => m.toLowerCase() === diffMonth[1].toLowerCase()
    );
    const endMonthIdx = MONTHS.findIndex(
      (m) => m.toLowerCase() === diffMonth[3].toLowerCase()
    );
    if (startMonthIdx === -1 || endMonthIdx === -1) return null;

    // Handle cross-year: if year is "2026-2027", split
    const yearParts = year.split('-').map((y) => parseInt(y.trim(), 10));
    const startYear = yearParts[0] || new Date().getFullYear();
    const endYear = yearParts.length > 1 ? yearParts[1] : startYear;

    const startDay = parseInt(diffMonth[2], 10);
    const endDay = parseInt(diffMonth[4], 10);
    return {
      start: `${startYear}-${String(startMonthIdx + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      end: `${endYear}-${String(endMonthIdx + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    };
  }

  return null;
}

// ===== Main Editor Component =====

export function BasicDetailsEditor() {
  const store = usePromotionStore(
    useShallow((s) => ({
      promoDateRange: s.promoDateRange,
      promoTitle: s.promoTitle,
      promoYear: s.promoYear,
      setPromoDateRange: s.setPromoDateRange,
      setPromoTitle: s.setPromoTitle,
      setPromoYear: s.setPromoYear,
    }))
  );

  // Try to seed date pickers from existing store values
  const initialDates = parseDateRange(store.promoDateRange, store.promoYear);
  const [startDate, setStartDate] = useState(initialDates?.start ?? '');
  const [endDate, setEndDate] = useState(initialDates?.end ?? '');

  // Sync date pickers → store
  const syncToStore = useCallback(
    (start: string, end: string) => {
      const formatted = formatDateRange(start, end);
      store.setPromoDateRange(formatted);
      store.setPromoYear(deriveYear(start, end));
    },
    [store]
  );

  // Range picker: dates stay ISO strings (yyyy-MM-dd) in local state so the
  // store format and parseDateRange are unchanged.
  const [pickerOpen, setPickerOpen] = useState(false);
  const clicksRef = useRef(0);
  const selectedRange: DateRange | undefined = startDate
    ? {
        from: parseISO(startDate),
        to: endDate ? parseISO(endDate) : undefined,
      }
    : undefined;

  const handlePickerOpenChange = useCallback((open: boolean) => {
    clicksRef.current = 0;
    setPickerOpen(open);
  }, []);

  const handleRangeSelect = useCallback(
    (picked: DateRange | undefined, clickedDay: Date) => {
      // The first click after opening always starts a new range; DayPicker's
      // default would stretch the existing one toward the clicked day.
      // Clicking the start day again means a one-day promo, not "deselect"
      // (DayPicker's default clears the range).
      const range: DateRange | undefined =
        clicksRef.current === 0
          ? { from: clickedDay, to: undefined }
          : (picked ?? { from: clickedDay, to: clickedDay });
      const start = range?.from ? format(range.from, 'yyyy-MM-dd') : '';
      // A single click is a one-day promo until the end date is picked.
      const end = range?.to ? format(range.to, 'yyyy-MM-dd') : start;
      setStartDate(start);
      setEndDate(end);
      syncToStore(start, end);
      // Close after the second pick (start, then end).
      clicksRef.current += 1;
      if (clicksRef.current >= 2 && range?.from && range?.to) {
        setPickerOpen(false);
      }
    },
    [syncToStore]
  );

  const rangeLabel = startDate
    ? endDate && endDate !== startDate
      ? `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d, yyyy')}`
      : format(parseISO(startDate), 'EEE, MMM d, yyyy')
    : '';

  const handleClearDates = useCallback(() => {
    setStartDate('');
    setEndDate('');
    store.setPromoDateRange('');
    store.setPromoYear('');
  }, [store]);

  // If store date range changes externally (e.g. import/restore), re-seed pickers
  useEffect(() => {
    const parsed = parseDateRange(store.promoDateRange, store.promoYear);
    if (parsed) {
      if (parsed.start !== startDate) setStartDate(parsed.start);
      if (parsed.end !== endDate) setEndDate(parsed.end);
    } else if (!store.promoDateRange) {
      if (startDate) setStartDate('');
      if (endDate) setEndDate('');
    }
    // Only react to store changes, not local state — including startDate/endDate
    // here would re-seed the pickers while the user is editing them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.promoDateRange, store.promoYear]);

  const handleTitleChange = useCallback(
    (val: string) => {
      store.setPromoTitle(val);
    },
    [store]
  );

  return (
    <FieldGroup className="gap-4">
      {/* Date Range */}
      <Field className="gap-2">
        <FieldLabel
          htmlFor="promo-date-range-trigger"
          className="flex items-center gap-1 text-xs"
        >
          <CalendarDays className="size-3.5" aria-hidden="true" />
          Date Range *
        </FieldLabel>
        {/* Wrapped: Field stretches direct children; the row holds trigger + clear. */}
        <div className="flex items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={handlePickerOpenChange}>
            <PopoverTrigger asChild>
              <Button
                id="promo-date-range-trigger"
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 flex-1 justify-start font-normal',
                  !startDate && 'text-muted-foreground'
                )}
                data-testid="promo-date-range-trigger"
              >
                <CalendarDays className="size-4" aria-hidden="true" />
                {rangeLabel || 'Pick start and end dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
              aria-label="Choose promotion dates"
            >
              <Calendar
                mode="range"
                numberOfMonths={2}
                defaultMonth={selectedRange?.from}
                selected={selectedRange}
                onSelect={handleRangeSelect}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          {startDate && (
            <Button
              variant="ghost"
              size="sm"
              className="size-8 shrink-0 p-0"
              onClick={handleClearDates}
              aria-label="Clear dates"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Formatted preview */}
        {store.promoDateRange && (
          <p className="text-sm font-medium" data-testid="promo-date-range">
            {store.promoDateRange}
            {store.promoYear && (
              <span className="text-muted-foreground font-normal">
                , {store.promoYear}
              </span>
            )}
          </p>
        )}
      </Field>

      {/* Title Override */}
      <Field className="gap-2">
        <FieldLabel htmlFor="promoTitle" className="text-xs">
          Title (optional)
        </FieldLabel>
        <ClearableInput
          id="promoTitle"
          value={store.promoTitle}
          onChange={handleTitleChange}
          placeholder="Leave blank for auto-generation"
          data-testid="promo-title"
        />
        <FieldDescription className="text-xs">
          Auto-generates based on date (Black Friday, Holiday Sale, etc.)
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}
