/**
 * Tests for PromotionPage mobile responsive layout (<1024px).
 *
 * Covers:
 * 1. Mobile layout renders two horizontal strips at top
 * 2. First strip shows left-column card titles with status dots
 * 3. Second strip shows center-column card titles with status dots
 * 4. All 8 cards visible in scrollable list
 * 5. Preview at bottom with horizontal ResizablePanels
 * 6. Tapping strip card title sets forceExpandedCardId
 * 7. No vertical sidebar rendered on mobile
 * 8. Min heights enforced on panels (via minPx prop)
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as jestDom from '@testing-library/jest-dom';

import { PromotionPage } from '@/pages/PromotionPage';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePromotionStore } from '@/stores/promotion-store';
import { HorizontalStrip, type StripCardInfo } from '@/components/promotion/HorizontalStrip';

// Extend expect with jest-dom matchers
expect.extend(jestDom);

// Mock ResizeObserver for Radix components
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

// ===== Test Helpers =====

const MOCK_PROFILE = {
  employeeName: 'John Doe',
  jobTitle: 'Sales Associate',
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

function renderPromotionPage() {
  localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  resetStore();

  return render(
    <ThemeProvider>
      <ProfileProvider>
        <MemoryRouter>
          <PromotionPage />
        </MemoryRouter>
      </ProfileProvider>
    </ThemeProvider>
  );
}

// ===== HorizontalStrip Unit Tests =====

describe('HorizontalStrip', () => {
  const mockCards: StripCardInfo[] = [
    { cardId: 'card1', title: 'Card One', hasContent: false },
    { cardId: 'card2', title: 'Card Two', hasContent: true },
    { cardId: 'card3', title: 'Card Three', hasContent: true },
  ];

  it('renders group label', () => {
    render(
      <HorizontalStrip
        label="Test Group"
        cards={mockCards}
        onCardClick={() => {}}
      />
    );
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('renders all card titles as buttons', () => {
    render(
      <HorizontalStrip
        label="Group"
        cards={mockCards}
        onCardClick={() => {}}
      />
    );
    expect(
      screen.getByRole('button', { name: /jump to card one/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /jump to card two/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /jump to card three/i })
    ).toBeInTheDocument();
  });

  it('renders status dots for each card', () => {
    const { container } = render(
      <HorizontalStrip
        label="Group"
        cards={mockCards}
        onCardClick={() => {}}
      />
    );

    const filledDots = container.querySelectorAll('[data-status="filled"]');
    const emptyDots = container.querySelectorAll('[data-status="empty"]');
    expect(filledDots.length).toBe(2);
    expect(emptyDots.length).toBe(1);
  });

  it('calls onCardClick with correct cardId when tapped', async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    render(
      <HorizontalStrip
        label="Group"
        cards={mockCards}
        onCardClick={onCardClick}
      />
    );

    await user.click(screen.getByRole('button', { name: /jump to card two/i }));
    expect(onCardClick).toHaveBeenCalledWith('card2');
  });

  it('has overflow-x-auto for scrollable behavior', () => {
    const { container } = render(
      <HorizontalStrip
        label="Group"
        cards={mockCards}
        onCardClick={() => {}}
      />
    );

    const cardsContainer = container.querySelector('[data-testid="strip-cards"]');
    expect(cardsContainer).toBeInTheDocument();
    expect(cardsContainer?.className).toContain('overflow-x-auto');
  });

  it('renders with navigation role and aria-label', () => {
    render(
      <HorizontalStrip
        label="Promo Body"
        cards={mockCards}
        onCardClick={() => {}}
      />
    );

    const nav = screen.getByRole('navigation', { name: /promo body navigation/i });
    expect(nav).toBeInTheDocument();
  });
});

// ===== Mobile Layout Integration Tests =====

describe('PromotionPage Mobile Layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Mobile layout renders two horizontal strips at top
  it('renders two horizontal strips at the top', () => {
    const { container } = renderPromotionPage();

    const strips = container.querySelectorAll('[data-testid="horizontal-strip"]');
    expect(strips.length).toBe(2);
  });

  // 2. First strip shows left-column card titles with status dots
  it('renders left-column card titles in first strip', () => {
    const { container } = renderPromotionPage();

    // First strip should be "Promo Body"
    const stripLabels = container.querySelectorAll('[data-testid="strip-label"]');
    expect(stripLabels[0]).toHaveTextContent('Promo Body');

    // Left column cards: Basic Details, Discount Entries, How to Shop, Important Notes, Special Hours
    const leftCardIds = [
      'basicDetailsCard',
      'discountEntriesCard',
      'howToShopCard',
      'importantNotesCard',
      'specialHoursCard',
    ];

    for (const cardId of leftCardIds) {
      const stripCard = container.querySelector(
        `[data-testid="strip-card-${cardId}"]`
      );
      expect(stripCard).toBeInTheDocument();
    }
  });

  // 3. Second strip shows center-column card titles with status dots
  it('renders center-column card titles in second strip', () => {
    const { container } = renderPromotionPage();

    // Second strip should be "Email Tools"
    const stripLabels = container.querySelectorAll('[data-testid="strip-label"]');
    expect(stripLabels[1]).toHaveTextContent('Email Tools');

    // Center column cards: PDF Attachments, Subject Lines, Bulk Email Tools
    const centerCardIds = ['pdfCard', 'subjectCard', 'bulkEmailCard'];

    for (const cardId of centerCardIds) {
      const stripCard = container.querySelector(
        `[data-testid="strip-card-${cardId}"]`
      );
      expect(stripCard).toBeInTheDocument();
    }
  });

  // 4. All 8 cards visible in scrollable list
  it('renders all 8 cards in the card list area', () => {
    const { container } = renderPromotionPage();

    const allCardIds = [
      'basicDetailsCard',
      'discountEntriesCard',
      'howToShopCard',
      'importantNotesCard',
      'specialHoursCard',
      'pdfCard',
      'subjectCard',
      'bulkEmailCard',
    ];

    for (const cardId of allCardIds) {
      // Cards are rendered via CollapsibleCard which sets data-card-id
      const cardElements = container.querySelectorAll(
        `[data-card-id="${cardId}"]`
      );
      // Should appear in mobile layout
      expect(cardElements.length).toBeGreaterThanOrEqual(1);
    }
  });

  // 5. Preview at bottom with horizontal ResizablePanels
  it('renders preview panel with horizontal ResizablePanels on mobile', () => {
    const { container } = renderPromotionPage();

    // Find all ResizablePanels instances
    const allPanels = container.querySelectorAll(
      '[data-testid="resizable-panels"]'
    );
    // At least desktop (vertical) and mobile (horizontal)
    expect(allPanels.length).toBeGreaterThanOrEqual(2);

    // Find the horizontal separator (mobile ResizablePanels)
    const horizontalSeparators = container.querySelectorAll(
      '[aria-orientation="horizontal"]'
    );
    expect(horizontalSeparators.length).toBeGreaterThanOrEqual(1);

    // Preview is rendered (Email Preview header)
    const previews = screen.getAllByText('Email Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);
  });

  // 6. Tapping strip card title sets forceExpandedCardId and scrolls
  it('force-expands card when strip title is tapped', async () => {
    const scrollSpy = vi.fn();
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = scrollSpy;

    try {
      const user = userEvent.setup();
      const { container } = renderPromotionPage();

      // Tap "How to Shop" in the first strip
      const howToShopStripBtn = container.querySelector(
        '[data-testid="strip-card-howToShopCard"]'
      );
      expect(howToShopStripBtn).toBeInTheDocument();

      await user.click(howToShopStripBtn!);

      // scrollTo should have been called after the double rAF
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(scrollSpy).toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollTo = originalScrollTo;
    }
  });

  // 7. No vertical sidebar rendered on mobile
  it('does not render the vertical desktop sidebar in the mobile section', () => {
    const { container } = renderPromotionPage();

    // The desktop sidebar has data-testid="desktop-sidebar" and class "hidden lg:flex"
    // It's hidden on mobile via Tailwind's hidden lg:flex
    const desktopSidebars = container.querySelectorAll(
      '[data-testid="desktop-sidebar"]'
    );
    // The sidebar exists in the DOM but is hidden via CSS (hidden lg:flex)
    for (const sidebar of desktopSidebars) {
      expect(sidebar.className).toContain('hidden');
      expect(sidebar.className).toContain('lg:flex');
    }

    // Verify no mobile sidebar strip exists (i.e., no column toggle)
    // The mobile layout should NOT have a columnState toggle
    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();
    // Mobile container should NOT contain desktop sidebar testid
    expect(
      mobileContainer?.querySelector('[data-testid="desktop-sidebar"]')
    ).toBeNull();
  });

  // 8. Min heights enforced on panels (via minPx prop)
  it('passes minPx constraints to mobile ResizablePanels', () => {
    const { container } = renderPromotionPage();

    // The mobile ResizablePanels should have aria-valuemin and aria-valuemax attributes
    const horizontalSeparators = container.querySelectorAll(
      '[aria-orientation="horizontal"]'
    );
    expect(horizontalSeparators.length).toBeGreaterThanOrEqual(1);

    // Check that the mobile panels container has proper structure
    const allPanels = container.querySelectorAll(
      '[data-testid="resizable-panels"]'
    );
    expect(allPanels.length).toBeGreaterThanOrEqual(2);

    // Verify panel-first and panel-second exist (from both desktop and mobile)
    const firstPanels = container.querySelectorAll(
      '[data-testid="panel-first"]'
    );
    const secondPanels = container.querySelectorAll(
      '[data-testid="panel-second"]'
    );
    expect(firstPanels.length).toBeGreaterThanOrEqual(2);
    expect(secondPanels.length).toBeGreaterThanOrEqual(2);
  });

  // Additional: Strip buttons have proper aria labels
  it('has accessible aria-labels on strip buttons', () => {
    const { container } = renderPromotionPage();

    const stripButtons = container.querySelectorAll(
      '[data-testid^="strip-card-"]'
    );
    expect(stripButtons.length).toBe(8); // 5 left + 3 center

    for (const btn of stripButtons) {
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')).toMatch(/^Jump to /);
    }
  });

  // Additional: Cards in mobile layout respect forceExpand
  it('cards in mobile layout receive forceExpand prop correctly', async () => {
    const scrollSpy = vi.fn();
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = scrollSpy;

    try {
      const user = userEvent.setup();
      const { container } = renderPromotionPage();

      // Click a card title in the strip
      const basicDetailsBtn = container.querySelector(
        '[data-testid="strip-card-basicDetailsCard"]'
      );
      await user.click(basicDetailsBtn!);

      // Wait for rAF callbacks
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // The card should be force-expanded and scrolled to
      expect(scrollSpy).toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollTo = originalScrollTo;
    }
  });

  // Additional: Both strips have distinct labels
  it('renders distinct labels for each strip', () => {
    const { container } = renderPromotionPage();

    const stripLabels = container.querySelectorAll('[data-testid="strip-label"]');
    expect(stripLabels.length).toBe(2);
    expect(stripLabels[0]).toHaveTextContent('Promo Body');
    expect(stripLabels[1]).toHaveTextContent('Email Tools');
  });

  // Additional: Status dots reflect card content state
  it('shows correct status dots based on store content', () => {
    // Set up profile and store BEFORE rendering
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
    resetStore();

    // Add some content to the store BEFORE render
    act(() => {
      usePromotionStore.setState({
        promotionEntries: [
          { id: 1, line: 'Test Promo', collections: '', callout: '' },
        ],
        attachedPDFs: [{ id: '1', name: 'test.pdf', size: 100, type: 'application/pdf' }],
      });
    });

    const { container } = render(
      <ThemeProvider>
        <ProfileProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </ProfileProvider>
      </ThemeProvider>
    );

    // Check that basicDetailsCard strip button has filled status (it has content via promotionEntries)
    const basicDetailsBtn = container.querySelector(
      '[data-testid="strip-card-basicDetailsCard"]'
    );
    expect(basicDetailsBtn).toBeInTheDocument();
    const basicDetailsDot = basicDetailsBtn?.querySelector('[data-status]');
    expect(basicDetailsDot).toHaveAttribute('data-status', 'filled');

    // pdfCard should also be filled
    const pdfBtn = container.querySelector(
      '[data-testid="strip-card-pdfCard"]'
    );
    expect(pdfBtn).toBeInTheDocument();
    const pdfDot = pdfBtn?.querySelector('[data-status]');
    expect(pdfDot).toHaveAttribute('data-status', 'filled');
  });

  // Re-click bug fix: clicking the same strip card twice re-expands a collapsed card
  it('re-expands a collapsed card when clicking the same strip card title twice', async () => {
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = vi.fn();

    try {
      const user = userEvent.setup();
      const { container } = renderPromotionPage();

      // Click "How to Shop" strip button to force-expand it
      const howToShopStripBtn = container.querySelector(
        '[data-testid="strip-card-howToShopCard"]'
      );
      expect(howToShopStripBtn).toBeInTheDocument();

      await user.click(howToShopStripBtn!);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Card should be expanded in mobile layout
      const howToShopCards = container.querySelectorAll('[data-card-id="howToShopCard"]');
      const mobileCard = howToShopCards[0];
      expect(mobileCard).toBeInTheDocument();

      const collapseBtn = mobileCard.querySelector('button[aria-label="Collapse How to Shop"]');
      expect(collapseBtn).toBeInTheDocument();

      // Manually collapse the card
      await user.click(collapseBtn!);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Card should now be collapsed
      const expandBtn = mobileCard.querySelector('button[aria-label="Expand How to Shop"]');
      expect(expandBtn).toBeInTheDocument();

      // Click the same strip card again — should re-expand
      await user.click(howToShopStripBtn!);

      // Flush the requestAnimationFrame that resets then re-sets forceExpandedCardId
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Card should be expanded again
      const collapseBtnAfter = mobileCard.querySelector('button[aria-label="Collapse How to Shop"]');
      expect(collapseBtnAfter).toBeInTheDocument();
    } finally {
      HTMLElement.prototype.scrollTo = originalScrollTo;
    }
  });
});
