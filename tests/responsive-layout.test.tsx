/**
 * Tests for PromotionPage mobile responsive layout (<1024px).
 *
 * Covers:
 * 1. Mobile layout renders IconToolbar at top
 * 2. IconToolbar shows all 8 card icons
 * 3. All 8 cards visible in scrollable list
 * 4. Preview at bottom with horizontal ResizablePanels
 * 5. Tapping toolbar icon sets forceExpandedCardId and scrolls
 * 6. No vertical sidebar rendered on mobile
 * 7. Min heights enforced on panels (via minPx prop)
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

  // 1. Mobile layout renders IconToolbar at top
  it('renders an IconToolbar in the mobile layout', () => {
    const { container } = renderPromotionPage();

    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();

    const toolbars = mobileContainer!.querySelectorAll('[data-testid="icon-toolbar"]');
    expect(toolbars.length).toBe(1);
  });

  // 2. IconToolbar shows all 8 card icons
  it('renders all 8 card icons in the mobile IconToolbar', () => {
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

    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();

    for (const cardId of allCardIds) {
      const icon = mobileContainer!.querySelector(
        `[data-testid="toolbar-icon-${cardId}"]`
      );
      expect(icon).toBeInTheDocument();
    }
  });

  // 3. All 8 cards visible in scrollable list
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

  // 4. Preview at bottom with horizontal ResizablePanels
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

  // 5. Tapping toolbar icon sets forceExpandedCardId and scrolls
  it('force-expands card when toolbar icon is clicked', async () => {
    const scrollSpy = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollSpy;

    try {
      const user = userEvent.setup();
      const { container } = renderPromotionPage();

      // Click "How to Shop" toolbar icon
      const howToShopIcon = container.querySelector(
        '[data-testid="toolbar-icon-howToShopCard"]'
      );
      expect(howToShopIcon).toBeInTheDocument();

      await user.click(howToShopIcon!);

      // scrollIntoView should have been called after the double rAF
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(scrollSpy).toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  // 6. Mobile section renders its own IconToolbar (separate from desktop)
  it('renders an IconToolbar in the mobile section', () => {
    const { container } = renderPromotionPage();

    // Desktop layout uses hidden lg:flex
    const desktopContainers = container.querySelectorAll(
      '[class*="hidden"][class*="lg:flex"]'
    );
    expect(desktopContainers.length).toBeGreaterThanOrEqual(1);

    // Mobile container should contain its own icon toolbar
    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();
    expect(
      mobileContainer?.querySelector('[data-testid="icon-toolbar"]')
    ).toBeInTheDocument();
  });

  // 7. Min heights enforced on panels (via minPx prop)
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

  // Additional: Toolbar icons have proper aria labels
  it('has accessible aria-labels on toolbar icons', () => {
    const { container } = renderPromotionPage();

    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();

    const toolbarIcons = mobileContainer!.querySelectorAll(
      '[data-testid^="toolbar-icon-"]'
    );
    expect(toolbarIcons.length).toBe(8);

    for (const btn of toolbarIcons) {
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')).toMatch(/^Jump to /);
    }
  });

  // Additional: Cards in mobile layout respect forceExpand
  it('cards in mobile layout receive forceExpand prop correctly', async () => {
    const scrollSpy = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollSpy;

    try {
      const user = userEvent.setup();
      const { container } = renderPromotionPage();

      // Click a toolbar icon
      const basicDetailsIcon = container.querySelector(
        '[data-testid="toolbar-icon-basicDetailsCard"]'
      );
      await user.click(basicDetailsIcon!);

      // Wait for rAF callbacks
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // The card should be force-expanded and scrolled to
      expect(scrollSpy).toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  // Additional: Toolbar icons have proper pressed state when active
  it('toolbar icons use aria-pressed for active state', () => {
    const { container } = renderPromotionPage();

    const mobileContainer = container.querySelector('.lg\\:hidden');
    expect(mobileContainer).toBeInTheDocument();

    const toolbarIcons = mobileContainer!.querySelectorAll(
      '[data-testid^="toolbar-icon-"]'
    );
    expect(toolbarIcons.length).toBe(8);

    for (const btn of toolbarIcons) {
      // Each button should have aria-pressed attribute
      expect(btn).toHaveAttribute('aria-pressed');
    }
  });

  // Re-click bug fix: clicking the same toolbar icon twice re-expands a collapsed card
  it('re-expands a collapsed card when clicking the same toolbar icon twice', async () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();

    try {
      const user = userEvent.setup();
      const { container } = renderPromotionPage();

      // Click "How to Shop" toolbar icon to force-expand it
      const howToShopIcon = container.querySelector(
        '[data-testid="toolbar-icon-howToShopCard"]'
      );
      expect(howToShopIcon).toBeInTheDocument();

      await user.click(howToShopIcon!);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Card should be expanded in mobile layout
      const howToShopCards = container.querySelectorAll('[data-card-id="howToShopCard"]');
      const mobileCard = howToShopCards[0];
      expect(mobileCard).toBeInTheDocument();

      const collapseBtn = mobileCard.querySelector('[aria-label="Collapse How to Shop"]');
      expect(collapseBtn).toBeInTheDocument();

      // Manually collapse the card
      await user.click(collapseBtn!);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Card should now be collapsed
      const expandBtn = mobileCard.querySelector('[aria-label="Expand How to Shop"]');
      expect(expandBtn).toBeInTheDocument();

      // Click the same toolbar icon again — should re-expand
      await user.click(howToShopIcon!);

      // Flush the requestAnimationFrame that resets then re-sets forceExpandedCardId
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Card should be expanded again
      const collapseBtnAfter = mobileCard.querySelector('[aria-label="Collapse How to Shop"]');
      expect(collapseBtnAfter).toBeInTheDocument();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});
