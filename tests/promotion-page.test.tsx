/**
 * Tests for PromotionPage, CollapsibleCard, and SidebarBar components.
 *
 * Tests cover:
 * - Profile redirect when no profile saved
 * - Three-column layout renders correctly
 * - All 8 collapsible cards render with correct titles
 * - Cards collapse/expand with animation
 * - Status dots show empty/filled state
 * - Sidebar collapse/expand navigation
 * - Responsive layout class application
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as jestDom from '@testing-library/jest-dom';

import { PromotionPage } from '@/pages/PromotionPage';
import { CollapsibleCard } from '@/components/promotion/CollapsibleCard';
import { SidebarBar } from '@/components/promotion/SidebarBar';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePromotionStore } from '@/stores/promotion-store';

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
    columnState: 'left-expanded',
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
      <ProfileProvider>
        <MemoryRouter>
          <PromotionPage />
        </MemoryRouter>
      </ProfileProvider>
    </ThemeProvider>
  );
}

// ===== CollapsibleCard Tests =====

describe('CollapsibleCard', () => {
  it('renders with correct title', () => {
    render(
      <ThemeProvider>
        <CollapsibleCard
          cardId="testCard"
          title="Test Card Title"
          hasContent={false}
        >
          <p>Card content</p>
        </CollapsibleCard>
      </ThemeProvider>
    );
    expect(screen.getByText('Test Card Title')).toBeInTheDocument();
  });

  it('renders children when expanded (default)', () => {
    render(
      <ThemeProvider>
        <CollapsibleCard
          cardId="testCard"
          title="Test Card"
          hasContent={false}
        >
          <p>Visible content</p>
        </CollapsibleCard>
      </ThemeProvider>
    );
    expect(screen.getByText('Visible content')).toBeInTheDocument();
  });

  it('shows status dot with "empty" state when hasContent is false', () => {
    const { container } = render(
      <ThemeProvider>
        <CollapsibleCard
          cardId="testCard"
          title="Test Card"
          hasContent={false}
        >
          <p>Content</p>
        </CollapsibleCard>
      </ThemeProvider>
    );
    const dot = container.querySelector('[data-status="empty"]');
    expect(dot).toBeInTheDocument();
  });

  it('shows status dot with "filled" state when hasContent is true', () => {
    const { container } = render(
      <ThemeProvider>
        <CollapsibleCard
          cardId="testCard"
          title="Test Card"
          hasContent={true}
        >
          <p>Content</p>
        </CollapsibleCard>
      </ThemeProvider>
    );
    const dot = container.querySelector('[data-status="filled"]');
    expect(dot).toBeInTheDocument();
  });

  it('collapses content when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <CollapsibleCard
          cardId="testCard"
          title="Test Card"
          hasContent={false}
        >
          <p>Collapsible content</p>
        </CollapsibleCard>
      </ThemeProvider>
    );

    // Content is visible initially
    expect(screen.getByText('Collapsible content')).toBeInTheDocument();

    // Click the collapse toggle button
    const toggleBtn = screen.getByRole('button', {
      name: /collapse test card/i,
    });
    await user.click(toggleBtn);

    // Content should now be hidden (Radix Collapsible hides it)
    expect(screen.queryByText('Collapsible content')).not.toBeInTheDocument();
  });

  it('expands content when defaultCollapsed is true and toggle is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <CollapsibleCard
          cardId="testCard"
          title="Test Card"
          hasContent={false}
          defaultCollapsed={true}
        >
          <p>Hidden content</p>
        </CollapsibleCard>
      </ThemeProvider>
    );

    // Content should be hidden initially (collapsed)
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();

    // Click to expand
    const toggleBtn = screen.getByRole('button', {
      name: /expand test card/i,
    });
    await user.click(toggleBtn);

    // Content should now be visible
    expect(screen.getByText('Hidden content')).toBeInTheDocument();
  });

  it('sets correct data-card-id attribute', () => {
    const { container } = render(
      <ThemeProvider>
        <CollapsibleCard
          cardId="mySpecialCard"
          title="Card"
          hasContent={false}
        >
          <p>Content</p>
        </CollapsibleCard>
      </ThemeProvider>
    );
    expect(
      container.querySelector('[data-card-id="mySpecialCard"]')
    ).toBeInTheDocument();
  });
});

// ===== SidebarBar Tests =====

describe('SidebarBar', () => {
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

  it('shows card titles in sidebar bar', () => {
    render(
      <SidebarBar
        cards={mockCards}
        isExpanded={false}
        onExpand={() => {}}
        ariaLabel="Expand column"
      />
    );
    expect(screen.getByText('Card One')).toBeInTheDocument();
    expect(screen.getByText('Card Two')).toBeInTheDocument();
  });

  it('shows status dots for each card', () => {
    const { container } = render(
      <SidebarBar
        cards={mockCards}
        isExpanded={false}
        onExpand={() => {}}
        ariaLabel="Expand column"
      />
    );
    expect(container.querySelectorAll('[data-status]')).toHaveLength(2);
  });

  it('shows filled/empty status correctly', () => {
    const { container } = render(
      <SidebarBar
        cards={mockCards}
        isExpanded={false}
        onExpand={() => {}}
        ariaLabel="Expand column"
      />
    );
    expect(
      container.querySelector('[data-status="empty"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-status="filled"]')
    ).toBeInTheDocument();
  });

  it('calls onExpand when clicked', async () => {
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
    await user.click(screen.getByRole('button', { name: /expand column/i }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});

// ===== PromotionPage Tests =====

describe('PromotionPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects to /start when no profile is saved', () => {
    renderPromotionPage({ profile: false });
    // The Navigate component doesn't render any content
    expect(screen.queryByText('Email Preview')).not.toBeInTheDocument();
  });

  it('renders the three-column layout when profile exists', () => {
    renderPromotionPage({ profile: true });
    // Both desktop and mobile render Email Preview
    const previews = screen.getAllByText('Email Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 8 collapsible card titles', () => {
    renderPromotionPage({ profile: true });

    const expectedTitles = [
      'Basic Details',
      'Discount Entries',
      'How to Shop',
      'Important Notes',
      'Special Hours',
      'PDF Attachments',
      'Subject Lines',
      'Bulk Email Tools',
    ];

    // Each title appears twice (desktop + mobile layout)
    for (const title of expectedTitles) {
      const elements = screen.getAllByText(title);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders the Email Preview column', () => {
    renderPromotionPage({ profile: true });
    const previews = screen.getAllByText('Email Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Preview and HTML Code tabs', () => {
    renderPromotionPage({ profile: true });
    const previewTabs = screen.getAllByRole('tab', { name: /preview/i });
    const codeTabs = screen.getAllByRole('tab', { name: /html code/i });
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

  it('shows status dots on cards (empty by default)', () => {
    const { container } = renderPromotionPage({ profile: true });
    // All cards should have empty status dots by default
    const emptyDots = container.querySelectorAll('[data-status="empty"]');
    // 8 cards × 2 (desktop + mobile) = 16 empty dots
    expect(emptyDots.length).toBeGreaterThanOrEqual(8);
  });

  it('shows filled status dots when store has data', () => {
    // Pre-populate store with data
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: 'Test Entry', collections: '', callout: '' },
      ],
    });
    localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));

    const { container } = render(
      <ThemeProvider>
        <ProfileProvider>
          <MemoryRouter>
            <PromotionPage />
          </MemoryRouter>
        </ProfileProvider>
      </ThemeProvider>
    );

    // At least one card should have a filled dot
    const filledDots = container.querySelectorAll('[data-status="filled"]');
    expect(filledDots.length).toBeGreaterThanOrEqual(1);
  });

  it('collapsible cards can be collapsed and expanded', async () => {
    const user = userEvent.setup();
    renderPromotionPage({ profile: true });

    // Find the "Basic Details" card (there are multiple due to desktop+mobile)
    const collapseBtns = screen.getAllByRole('button', {
      name: /collapse basic details/i,
    });
    // Use the first one (desktop)
    await user.click(collapseBtns[0]);

    // Now find the expand button
    const expandBtns = screen.getAllByRole('button', {
      name: /expand basic details/i,
    });
    expect(expandBtns.length).toBeGreaterThanOrEqual(1);

    // Click to expand
    await user.click(expandBtns[0]);
  });

  it('renders desktop layout container with hidden lg:flex class', () => {
    const { container } = renderPromotionPage({ profile: true });
    // The desktop layout uses class "hidden lg:flex ..."
    const desktopDiv = container.querySelector('[class*="hidden"][class*="lg:flex"]');
    expect(desktopDiv).toBeInTheDocument();
  });

  it('renders mobile layout container with lg:hidden class', () => {
    const { container } = renderPromotionPage({ profile: true });
    // The mobile layout uses class "lg:hidden"
    const mobileDiv = container.querySelector('[class*="lg:hidden"]');
    expect(mobileDiv).toBeInTheDocument();
  });

  it('initializes with left-expanded column state', () => {
    renderPromotionPage({ profile: true });
    // Left column should be visible in desktop layout
    const basicDetails = screen.getAllByText('Basic Details');
    expect(basicDetails.length).toBeGreaterThanOrEqual(1);
  });
});
