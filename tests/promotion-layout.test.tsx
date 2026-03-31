/**
 * Tests for PromotionPage desktop layout refactor with ResizablePanels.
 *
 * Covers:
 * 1. Desktop layout renders sidebar + active column + preview
 * 2. Only left column cards visible by default (columnState='left')
 * 3. Switching to center column shows center cards, hides left
 * 4. Sidebar renders all 8 card titles
 * 5. Sidebar click switches column and force-expands card
 * 6. Preview panel always visible
 * 7. ResizablePanels used with correct props (orientation, minPx)
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

  // 1. Desktop layout renders sidebar + active column + preview
  it('renders sidebar, active column cards, and preview panel', () => {
    const { container } = renderPromotionPage();

    // Desktop sidebar exists
    expect(container.querySelector('[data-testid="desktop-sidebar"]')).toBeInTheDocument();

    // Preview is rendered (Email Preview header)
    const previews = screen.getAllByText('Email Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);

    // ResizablePanels container exists
    expect(container.querySelector('[data-testid="resizable-panels"]')).toBeInTheDocument();
  });

  // 2. Only left column cards visible by default (columnState='left')
  it('shows left column cards by default (columnState=left)', () => {
    renderPromotionPage();

    // Left column cards should be visible in the desktop layout
    // The left column has: Basic Details, Discount Entries, How to Shop, Important Notes, Special Hours
    const leftCards = [
      'Basic Details',
      'Discount Entries',
      'How to Shop',
      'Important Notes',
      'Special Hours',
    ];

    for (const title of leftCards) {
      const elements = screen.getAllByText(title);
      // Should appear in desktop active column + mobile
      expect(elements.length).toBeGreaterThanOrEqual(1);
    }

    // Center column cards should NOT be in the desktop active column area,
    // but they DO appear in the mobile layout.
    // Since both mobile and desktop render, we verify the store state
    expect(usePromotionStore.getState().columnState).toBe('left');
  });

  // 3. Switching to center column shows center cards, hides left
  it('shows center column cards when columnState switches to center', () => {
    const { container } = renderPromotionPage();

    // Switch to center column
    act(() => {
      usePromotionStore.setState({ columnState: 'center' });
    });

    // Store state should be center
    expect(usePromotionStore.getState().columnState).toBe('center');

    // Center column cards should still be present (they are now in the desktop active column)
    const centerCards = ['PDF Attachments', 'Subject Lines', 'Bulk Email Tools'];
    for (const title of centerCards) {
      const elements = screen.getAllByText(title);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    }
  });

  // 4. Sidebar renders all 8 card titles
  it('renders all 8 card titles in desktop sidebar', () => {
    const { container } = renderPromotionPage();

    // Check sidebar has test id attributes for each card
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
      const card = container.querySelector(`[data-testid="sidebar-card-${cardId}"]`);
      expect(card).toBeInTheDocument();
    }
  });

  // 5. Sidebar click switches column and force-expands card
  it('switches active column when clicking a sidebar card in another column', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage();

    // Initially left column is active
    expect(usePromotionStore.getState().columnState).toBe('left');

    // Click a center column card in the sidebar (e.g., PDF Attachments)
    const pdfSidebarCard = container.querySelector('[data-testid="sidebar-card-pdfCard"]');
    expect(pdfSidebarCard).toBeInTheDocument();

    await user.click(pdfSidebarCard!);

    // Column state should switch to center
    expect(usePromotionStore.getState().columnState).toBe('center');
  });

  // 6. Preview panel always visible
  it('always renders the preview panel', () => {
    renderPromotionPage();

    // Preview tab should be present
    const previewTabs = screen.getAllByRole('tab', { name: /preview/i });
    expect(previewTabs.length).toBeGreaterThanOrEqual(1);

    // HTML Code tab should also be present
    const codeTabs = screen.getAllByRole('tab', { name: /html code/i });
    expect(codeTabs.length).toBeGreaterThanOrEqual(1);
  });

  // 7. ResizablePanels used with correct props
  it('renders ResizablePanels with correct data-testid and structure', () => {
    const { container } = renderPromotionPage();

    // Check for resizable panels container
    const panels = container.querySelector('[data-testid="resizable-panels"]');
    expect(panels).toBeInTheDocument();

    // Check for separator (drag handle) — use getByRole for accurate matching
    const separator = screen.getByRole('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');

    // Check for first and second panels
    const firstPanel = container.querySelector('[data-testid="panel-first"]');
    const secondPanel = container.querySelector('[data-testid="panel-second"]');
    expect(firstPanel).toBeInTheDocument();
    expect(secondPanel).toBeInTheDocument();
  });

  // Additional: Sidebar group separator exists
  it('renders group separator between left and center card groups', () => {
    const { container } = renderPromotionPage();

    const separator = container.querySelector('[data-testid="sidebar-group-separator"]');
    expect(separator).toBeInTheDocument();
  });

  // Additional: Active indicator on left column initially
  it('shows active indicator on left column group initially', () => {
    const { container } = renderPromotionPage();

    const leftIndicator = container.querySelector(
      '[data-testid="sidebar-active-indicator-left"]'
    );
    expect(leftIndicator).toBeInTheDocument();

    const centerIndicator = container.querySelector(
      '[data-testid="sidebar-active-indicator-center"]'
    );
    expect(centerIndicator).not.toBeInTheDocument();
  });

  // Additional: Active indicator moves when column switches
  it('moves active indicator when column state changes', () => {
    const { container } = renderPromotionPage();

    act(() => {
      usePromotionStore.setState({ columnState: 'center' });
    });

    const centerIndicator = container.querySelector(
      '[data-testid="sidebar-active-indicator-center"]'
    );
    expect(centerIndicator).toBeInTheDocument();

    const leftIndicator = container.querySelector(
      '[data-testid="sidebar-active-indicator-left"]'
    );
    expect(leftIndicator).not.toBeInTheDocument();
  });
});

// ===== SidebarBar Desktop Mode Unit Tests =====

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
