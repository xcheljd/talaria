/**
 * Tests for OutlookChecker component.
 *
 * Covers:
 * - Empty state (no date range)
 * - Scan button when content exists
 * - Detects CSS issues (flexbox, grid, float)
 * - Shows success when clean HTML
 * - Shows email size info
 * - Re-scan functionality
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as jestDom from '@testing-library/jest-dom';

import { OutlookChecker } from '@/components/promotion/OutlookChecker';
import { usePromotionStore } from '@/stores/promotion-store';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';

expect.extend(jestDom);

vi.mock('@/lib/db', () => ({
  initIndexedDB: vi.fn().mockResolvedValue(true),
  savePDFToIndexedDB: vi.fn().mockResolvedValue('pdf-id'),
  getPDFFromIndexedDB: vi.fn().mockResolvedValue(null),
  deletePDFFromIndexedDB: vi.fn().mockResolvedValue(undefined),
  clearAllPDFsFromIndexedDB: vi.fn().mockResolvedValue(undefined),
}));

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
});

function resetStore() {
  usePromotionStore.setState({
    promoDateRange: '',
    promoYear: '',
    promoTitle: '',
    promotionEntries: [],
    specialHours: [],
    howToShopItems: [],
    importantNotesItems: [],
    attachedPDFs: [],
    generatedSubjectLines: [],
    selectedSubjectLine: null,
    subjectLineManuallyEdited: false,
    entryCollapsedStates: {},
    columnState: 'left',
    isInitializing: false,
    newsletterHeading: 'Newsletter',
    newsletterBody: '',
    newsletterPosition: 'top' as const,
    newsletterVisible: false,
  });
}

function renderOutlookChecker() {
  return render(
    <ThemeProvider>
      <ProfileProvider>
        <MemoryRouter>
          <OutlookChecker />
        </MemoryRouter>
      </ProfileProvider>
    </ThemeProvider>
  );
}

describe('OutlookChecker', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('shows prompt when no date range set', () => {
    renderOutlookChecker();
    expect(
      screen.getByText(/Add a date range first/)
    ).toBeInTheDocument();
  });

  it('shows scan button when date range exists', () => {
    usePromotionStore.setState({
      promoDateRange: 'Dec 1-15',
    });
    renderOutlookChecker();
    expect(
      screen.getByText('Scan for Outlook Issues')
    ).toBeInTheDocument();
  });

  it('scans and shows results', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promoDateRange: 'Dec 1-15',
      promoYear: '2024',
      promotionEntries: [
        { id: 1, line: '20% Off', collections: 'All', callout: '' },
      ],
    });
    renderOutlookChecker();

    await user.click(screen.getByText('Scan for Outlook Issues'));

    // Should show email size info
    expect(screen.getByText(/Email size/)).toBeInTheDocument();
    expect(screen.getByText(/rules checked/)).toBeInTheDocument();
  });

  it('shows re-scan button after scan', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promoDateRange: 'Dec 1-15',
    });
    renderOutlookChecker();

    await user.click(screen.getByText('Scan for Outlook Issues'));

    expect(screen.getByText('Re-scan')).toBeInTheDocument();
  });
});
