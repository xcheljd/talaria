/**
 * Tests for PromotionPage desktop layout refactor with ResizablePanels.
 *
 * Covers:
 * 1. Desktop layout renders icon toolbar + all cards + preview
 * 2. All 8 cards always visible in desktop scrollable column
 * 3. Icon toolbar renders all 8 icon buttons
 * 4. Icon toolbar click force-expands and scrolls to card
 * 5. Preview panel always visible
 * 6. ResizablePanels used with correct props (orientation, minPx)
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
import { SidebarBar, type SidebarCardGroup } from '@/components/promotion/SidebarBar';

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

// ===== Tests =====

describe('PromotionPage Desktop Layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Desktop layout renders icon toolbar + all cards + preview
  it('renders icon toolbar, all cards, and preview panel', () => {
    const { container } = renderPromotionPage();

    // Icon toolbar exists
    expect(container.querySelector('[data-testid="icon-toolbar"]')).toBeInTheDocument();

    // Preview is rendered (Email Preview header)
    const previews = screen.getAllByText('Email Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);

    // ResizablePanels container exists
    expect(container.querySelector('[data-testid="resizable-panels"]')).toBeInTheDocument();
  });

  // 2. All 8 cards always visible in desktop scrollable column
  it('shows all 8 cards in the desktop scrollable column', () => {
    renderPromotionPage();

    const allCardTitles = [
      'Basic Details',
      'Discount Entries',
      'How to Shop',
      'Important Notes',
      'Special Hours',
      'PDF Attachments',
      'Subject Lines',
      'Bulk Email Tools',
    ];

    for (const title of allCardTitles) {
      const elements = screen.getAllByText(title);
      // Should appear in desktop + mobile (both render all cards now)
      expect(elements.length).toBeGreaterThanOrEqual(1);
    }
  });

  // 3. Icon toolbar renders all 8 icon buttons
  it('renders all 8 icon buttons in the icon toolbar', () => {
    const { container } = renderPromotionPage();

    const expectedCardIds = [
      'basicDetailsCard',
      'discountEntriesCard',
      'howToShopCard',
      'importantNotesCard',
      'specialHoursCard',
      'pdfCard',
      'subjectCard',
      'bulkEmailCard',
    ];

    for (const cardId of expectedCardIds) {
      const iconBtn = container.querySelector(`[data-testid="toolbar-icon-${cardId}"]`);
      expect(iconBtn).toBeInTheDocument();
    }
  });

  // 4. Icon toolbar click force-expands card
  it('force-expands card when clicking icon toolbar button', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage();

    // Click "How to Shop" icon button (defaultCollapsed: true)
    const howToShopBtn = container.querySelector('[data-testid="toolbar-icon-howToShopCard"]');
    expect(howToShopBtn).toBeInTheDocument();

    await user.click(howToShopBtn!);

    // Wait for state updates and rAF
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Card should be expanded — find the card's collapse button in the desktop layout
    const howToShopCards = container.querySelectorAll('[data-card-id="howToShopCard"]');
    const desktopCard = howToShopCards[0];
    expect(desktopCard).toBeInTheDocument();

    const collapseBtn = desktopCard.querySelector('[aria-label="Collapse How to Shop"]');
    expect(collapseBtn).toBeInTheDocument();
  });

  // 5. Preview panel always visible
  it('always renders the preview panel', () => {
    renderPromotionPage();

    // Preview tab should be present
    const previewTabs = screen.getAllByRole('tab', { name: /preview/i });
    expect(previewTabs.length).toBeGreaterThanOrEqual(1);

    // HTML Code tab should also be present
    const codeTabs = screen.getAllByRole('tab', { name: /html code/i });
    expect(codeTabs.length).toBeGreaterThanOrEqual(1);
  });

  // 6. ResizablePanels used with correct props
  it('renders ResizablePanels with correct data-testid and structure', () => {
    const { container } = renderPromotionPage();

    // Check for resizable panels container
    const panels = container.querySelector('[data-testid="resizable-panels"]');
    expect(panels).toBeInTheDocument();

    // Check for separator (drag handle) — multiple separators exist (desktop + mobile)
    const separators = screen.getAllByRole('separator');
    // At least the desktop ResizablePanels separator
    expect(separators.length).toBeGreaterThanOrEqual(1);
    // Desktop separator should have vertical orientation
    const verticalSeparators = separators.filter(
      (s) => s.getAttribute('aria-orientation') === 'vertical'
    );
    expect(verticalSeparators.length).toBeGreaterThanOrEqual(1);

    // Check for first and second panels (desktop panels)
    const firstPanels = container.querySelectorAll('[data-testid="panel-first"]');
    const secondPanels = container.querySelectorAll('[data-testid="panel-second"]');
    expect(firstPanels.length).toBeGreaterThanOrEqual(1);
    expect(secondPanels.length).toBeGreaterThanOrEqual(1);
  });

  // Re-click bug fix: clicking the same icon twice re-expands a collapsed card
  it('re-expands a collapsed card when clicking the same icon toolbar button twice', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage();

    // Click "How to Shop" icon button to force-expand it
    const howToShopBtn = container.querySelector('[data-testid="toolbar-icon-howToShopCard"]');
    expect(howToShopBtn).toBeInTheDocument();

    await user.click(howToShopBtn!);

    // Wait for state updates and rAF
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Card should be expanded
    const howToShopCards = container.querySelectorAll('[data-card-id="howToShopCard"]');
    const desktopCard = howToShopCards[0];
    expect(desktopCard).toBeInTheDocument();

    const collapseBtn = desktopCard.querySelector('[aria-label="Collapse How to Shop"]');
    expect(collapseBtn).toBeInTheDocument();

    // Manually collapse the card by clicking the collapse button
    await user.click(collapseBtn!);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Card should now be collapsed
    const expandBtn = desktopCard.querySelector('[aria-label="Expand How to Shop"]');
    expect(expandBtn).toBeInTheDocument();

    // Click the same icon button again — this should re-expand it
    await user.click(howToShopBtn!);

    // Need to flush the requestAnimationFrame that resets then re-sets forceExpandedCardId
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Card should be expanded again
    const collapseBtnAfter = desktopCard.querySelector('[aria-label="Collapse How to Shop"]');
    expect(collapseBtnAfter).toBeInTheDocument();
  });

  // No desktop sidebar in new architecture
  it('does not render desktop sidebar', () => {
    const { container } = renderPromotionPage();

    // No desktop sidebar should exist
    expect(container.querySelector('[data-testid="desktop-sidebar"]')).not.toBeInTheDocument();
  });
});

// ===== SidebarBar Desktop Mode Unit Tests =====
// (These still test the SidebarBar component in isolation — it's just no longer used in desktop layout)

describe('SidebarBar desktop mode', () => {
  it('renders card groups with active indicator', () => {
    const groups: SidebarCardGroup[] = [
      {
        columnKey: 'left',
        label: 'Body',
        isActive: true,
        cards: [
          { cardId: 'card1', title: 'Card One', hasContent: false },
          { cardId: 'card2', title: 'Card Two', hasContent: true },
        ],
      },
      {
        columnKey: 'center',
        label: 'Tools',
        isActive: false,
        cards: [
          { cardId: 'card3', title: 'Card Three', hasContent: false },
        ],
      },
    ];

    const onCardClick = vi.fn();

    const { container } = render(
      <SidebarBar mode="desktop" groups={groups} onCardClick={onCardClick} />
    );

    // All cards rendered
    expect(screen.getByText('Card One')).toBeInTheDocument();
    expect(screen.getByText('Card Two')).toBeInTheDocument();
    expect(screen.getByText('Card Three')).toBeInTheDocument();

    // Active indicator on left group only
    expect(
      container.querySelector('[data-testid="sidebar-active-indicator-left"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="sidebar-active-indicator-center"]')
    ).not.toBeInTheDocument();

    // Group labels
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Tools')).toBeInTheDocument();

    // Separator between groups
    expect(
      container.querySelector('[data-testid="sidebar-group-separator"]')
    ).toBeInTheDocument();
  });

  it('calls onCardClick with correct columnKey and cardId', async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();

    const groups: SidebarCardGroup[] = [
      {
        columnKey: 'left',
        label: 'Body',
        isActive: true,
        cards: [
          { cardId: 'card1', title: 'Card One', hasContent: false },
        ],
      },
      {
        columnKey: 'center',
        label: 'Tools',
        isActive: false,
        cards: [
          { cardId: 'card3', title: 'Card Three', hasContent: false },
        ],
      },
    ];

    render(
      <SidebarBar mode="desktop" groups={groups} onCardClick={onCardClick} />
    );

    // Click Card Three (in center group)
    await user.click(screen.getByText('Card Three'));
    expect(onCardClick).toHaveBeenCalledWith('center', 'card3');

    // Click Card One (in left group)
    await user.click(screen.getByText('Card One'));
    expect(onCardClick).toHaveBeenCalledWith('left', 'card1');
  });

  it('shows status dots for cards', () => {
    const groups: SidebarCardGroup[] = [
      {
        columnKey: 'left',
        label: 'Body',
        isActive: true,
        cards: [
          { cardId: 'card1', title: 'Card One', hasContent: false },
          { cardId: 'card2', title: 'Card Two', hasContent: true },
        ],
      },
    ];

    const { container } = render(
      <SidebarBar mode="desktop" groups={groups} onCardClick={() => {}} />
    );

    const emptyDots = container.querySelectorAll('[data-status="empty"]');
    const filledDots = container.querySelectorAll('[data-status="filled"]');
    expect(emptyDots.length).toBe(1);
    expect(filledDots.length).toBe(1);
  });
});

// ===== SidebarBar Collapsed Mode (legacy) Tests =====

describe('SidebarBar collapsed mode (legacy)', () => {
  const mockCards = [
    { cardId: 'card1', title: 'Card One', hasContent: false },
    { cardId: 'card2', title: 'Card Two', hasContent: true },
  ];

  it('renders nothing when isExpanded is true', () => {
    const { container } = render(
      <SidebarBar
        cards={mockCards}
        isExpanded={true}
        onExpand={() => {}}
        ariaLabel="Expand column"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when isExpanded is false', () => {
    render(
      <SidebarBar
        cards={mockCards}
        isExpanded={false}
        onExpand={() => {}}
        ariaLabel="Expand column"
      />
    );
    expect(
      screen.getByRole('button', { name: /expand column/i })
    ).toBeInTheDocument();
  });

  it('calls onExpand with cardId when card clicked', async () => {
    const user = userEvent.setup();
    const onExpand = vi.fn();
    render(
      <SidebarBar
        cards={mockCards}
        isExpanded={false}
        onExpand={onExpand}
        ariaLabel="Expand column"
      />
    );

    await user.click(screen.getByText('Card One'));
    expect(onExpand).toHaveBeenCalledWith('card1');
  });
});
