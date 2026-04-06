/**
 * BasicDetailsEditor — Promotion basic details form.
 *
 * Provides fields for:
 * - Date Range (start/end date pickers, auto-formatted)
 * - Title (optional, auto-generates based on date)
 *
 * Date range format:
 * - Same month: "March 4 - 10"
 * - Different months: "March 28 - April 2"
 * - Cross-year: "December 30 - January 3" (year auto-derived)
 *
 * All mutations go through the Zustand promotion store.
 */

import { useState, useCallback, useEffect } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { usePromotionStore } from '@/stores/promotion-store';
import { ClearableInput } from '@/components/ui/clearable-input';
import { Button } from '@/components/ui/button';

// ===== Date Formatting =====

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
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

  // Match "Month D - D" or "Month D - Month D"
  const sameMonth = dateRange.match(
    /^(\w+)\s+(\d{1,2})\s*-\s*(\d{1,2})$/
  );
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
  const store = usePromotionStore();

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

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setStartDate(val);
      // Auto-set end to start if end is empty or before start
      if (!endDate || (val && endDate < val)) {
        setEndDate(val);
        syncToStore(val, val);
      } else {
        syncToStore(val, endDate);
      }
    },
    [endDate, syncToStore]
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setEndDate(val);
      syncToStore(startDate, val);
    },
    [startDate, syncToStore]
  );

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
    // Only react to store changes, not local state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.promoDateRange, store.promoYear]);

  const handleTitleChange = useCallback(
    (val: string) => {
      store.setPromoTitle(val);
    },
    [store]
  );

  return (
    <div className="space-y-3">
      {/* Date Range */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          Date Range *
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-0.5">
            <label htmlFor="promoStartDate" className="text-[11px] text-muted-foreground">
              Start
            </label>
            <input
              id="promoStartDate"
              type="date"
              value={startDate}
              onChange={handleStartChange}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="promo-start-date"
            />
          </div>
          <span className="text-xs text-muted-foreground pt-4">to</span>
          <div className="flex-1 space-y-0.5">
            <label htmlFor="promoEndDate" className="text-[11px] text-muted-foreground">
              End
            </label>
            <input
              id="promoEndDate"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={handleEndChange}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="promo-end-date"
            />
          </div>
          {startDate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 mt-4 shrink-0"
              onClick={handleClearDates}
              aria-label="Clear dates"
            >
              <X className="h-3.5 w-3.5" />
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
      </div>

      {/* Title Override */}
      <div className="space-y-1">
        <label htmlFor="promoTitle" className="text-xs font-medium">
          Title (optional)
        </label>
        <ClearableInput
          id="promoTitle"
          value={store.promoTitle}
          onChange={handleTitleChange}
          placeholder="Leave blank for auto-generation"
          data-testid="promo-title"
        />
        <p className="text-xs text-muted-foreground">
          Auto-generates based on date (Black Friday, Holiday Sale, etc.)
        </p>
      </div>
    </div>
  );
}
