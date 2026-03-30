/**
 * BasicDetailsEditor — Promotion basic details form.
 *
 * Provides fields for:
 * - Date Range (required for preview generation)
 * - Year (optional, auto-uses current year)
 * - Title (optional, auto-generates based on date)
 *
 * All mutations go through the Zustand promotion store.
 */

import { useCallback } from 'react';
import { usePromotionStore } from '@/stores/promotion-store';
import { ClearableInput } from '@/components/ui/clearable-input';

// ===== Main Editor Component =====

export function BasicDetailsEditor() {
  const store = usePromotionStore();

  const handleDateRangeChange = useCallback(
    (val: string) => {
      store.setPromoDateRange(val);
    },
    [store]
  );

  const handleYearChange = useCallback(
    (val: string) => {
      store.setPromoYear(val);
    },
    [store]
  );

  const handleTitleChange = useCallback(
    (val: string) => {
      store.setPromoTitle(val);
    },
    [store]
  );

  return (
    <div className="space-y-3">
      {/* Date Range */}
      <div className="space-y-1">
        <label htmlFor="promoDateRange" className="text-xs font-medium">
          Date Range *
        </label>
        <ClearableInput
          id="promoDateRange"
          value={store.promoDateRange}
          onChange={handleDateRangeChange}
          placeholder="Nov 28 - Dec 1"
          data-testid="promo-date-range"
        />
        <p className="text-xs text-muted-foreground">
          Used for auto-title generation and display
        </p>
      </div>

      {/* Year Override */}
      <div className="space-y-1">
        <label htmlFor="promoYear" className="text-xs font-medium">
          Year (optional)
        </label>
        <ClearableInput
          id="promoYear"
          value={store.promoYear}
          onChange={handleYearChange}
          placeholder="Auto-uses current year"
          data-testid="promo-year"
        />
        <p className="text-xs text-muted-foreground">
          Override for cross-year sales (e.g., Dec 30 - Jan 3)
        </p>
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
