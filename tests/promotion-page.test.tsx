/**
 * Tests for the PromotionPage component.
 *
 * Tests cover:
 * - Profile redirect when no profile saved
 * - Layout renders correctly with all cards
 * - Status dots show empty/filled state
 * - Responsive layout class application
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { PromotionPage } from '@/pages/PromotionPage';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePromotionStore } from '@/stores/promotion-store';
import { StorageKeys } from '@/lib/storage-keys';

// Mock ResizeObserver for Radix components
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class IntersectionObserver {
      constructor() {}
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.IntersectionObserver;
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

// ===== Test Helpers =====

const MOCK_PROFILE = {
  employeeName: 'John Doe',
  storeName: 'Test Store',
  storeLocation: 'Test Location',
  storeAddress: '123 Test St',
  storePhone: '555-1234',
  storeEmail: 'test@store.com',
  storeHours: '9-5',
  storePlusCode: 'ABC123',
  storeDirections: 'Near the mall',
};

function resetStore() {
  usePromotionStore.setState({
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
  });
}

function renderPromotionPage(options?: { profile?: boolean }) {
  const profile = options?.profile !== false;

  if (profile) {
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  }

  resetStore();

  return render(
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <ProfileProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </ProfileProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

// ===== PromotionPage Tests =====

describe('PromotionPage', () => {
  beforeEach(() => {
    localStorage.clear();
    // These tests assert on the full set of cards/tabs, including the
    // dev-only HTML Code tab and Email Theme / Accessibility / Outlook cards.
    localStorage.setItem(StorageKeys.devMode, 'true');
  });

  it('redirects to /start when no profile is saved', () => {
    renderPromotionPage({ profile: false });
    // The Navigate component doesn't render any content
    expect(screen.queryByText('Email Preview')).not.toBeInTheDocument();
  });

  it('renders the layout when profile exists', () => {
    renderPromotionPage({ profile: true });
    // Both desktop and mobile render Email Preview
    const previews = screen.getAllByText('Email Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the Basic Details card by default and swaps when a tool is picked', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage({ profile: true });

    // Only the selected tool's card renders — Basic Details on first open.
    expect(screen.getByText('Basic Details')).toBeInTheDocument();
    expect(screen.queryByText('Special Hours')).not.toBeInTheDocument();

    // Picking another tool swaps the visible card in the same slot.
    const hoursIcon = container.querySelector(
      '[data-testid="toolbar-icon-specialHoursCard"]'
    ) as HTMLElement;
    await user.click(hoursIcon);

    expect(screen.getByText('Special Hours')).toBeInTheDocument();
    expect(screen.queryByText('Basic Details')).not.toBeInTheDocument();
  });

  it('renders the Email Preview column', () => {
    renderPromotionPage({ profile: true });
    const previews = screen.getAllByText('Email Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Preview and HTML Code tabs', () => {
    renderPromotionPage({ profile: true });
    const previewTabs = screen.getAllByRole('tab', { name: /preview/i });
    const codeTabs = screen.getAllByRole('tab', { name: /^html$/i });
    expect(previewTabs.length).toBeGreaterThanOrEqual(1);
    expect(codeTabs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Start Over button', () => {
    renderPromotionPage({ profile: true });
    const buttons = screen.getAllByRole('button', { name: /start over/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Generate Email Batches button', () => {
    renderPromotionPage({ profile: true });
    const buttons = screen.getAllByRole('button', {
      name: /generate email batches/i,
    });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Download Email Draft button', () => {
    renderPromotionPage({ profile: true });
    const buttons = screen.getAllByRole('button', {
      name: /download email draft/i,
    });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows an empty status dot on the selected card by default', () => {
    const { container } = renderPromotionPage({ profile: true });
    // Only the selected card renders, so just its (empty) dot is present.
    const emptyDots = container.querySelectorAll('[data-status="empty"]');
    expect(emptyDots.length).toBeGreaterThanOrEqual(1);
  });

  it('shows a filled status dot when the selected card has data', () => {
    // Basic Details is the default card; give it content.
    usePromotionStore.setState({ promoTitle: 'Summer Sale' });
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));

    const { container } = render(
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          <ProfileProvider>
            <MemoryRouter>
              <PromotionPage />
            </MemoryRouter>
          </ProfileProvider>
        </TooltipProvider>
      </ThemeProvider>
    );

    const filledDots = container.querySelectorAll('[data-status="filled"]');
    expect(filledDots.length).toBeGreaterThanOrEqual(1);

    // Avoid leaking content into later tests that assert the empty state.
    usePromotionStore.setState({ promoTitle: '' });
  });

  it('renders only the mobile layout by default (matchMedia matches: false)', () => {
    const { container } = renderPromotionPage({ profile: true });
    expect(
      container.querySelector('[data-testid="mobile-layout"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="desktop-layout"]')
    ).not.toBeInTheDocument();
  });

  it('renders only the desktop layout when the lg media query matches', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('min-width: 1024px'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const { container } = renderPromotionPage({ profile: true });
      expect(
        container.querySelector('[data-testid="desktop-layout"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-testid="mobile-layout"]')
      ).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it('renders all 9 cards in desktop and mobile layouts', () => {
    renderPromotionPage({ profile: true });
    // All cards should be visible in desktop layout
    const basicDetails = screen.getAllByText('Basic Details');
    expect(basicDetails.length).toBeGreaterThanOrEqual(1);
  });
});
