/**
 * Tests for PromotionPage desktop layout refactor with ResizablePanels.
 *
 * Covers:
 * 1. Desktop layout renders icon toolbar + selected card + preview
 * 2. Only the selected tool's card is shown in the column
 * 3. Icon toolbar renders all 9 icon buttons
 * 4. Clicking a toolbar icon shows that tool's card
 * 5. Preview panel always visible
 * 6. ResizablePanels used with correct props (orientation, minPx)
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
  // These are desktop-layout tests: make the lg media query match so the
  // page renders the desktop layout (only one layout mounts at a time).
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
    // The "always renders the preview panel" test asserts the dev-only
    // HTML Code tab is present.
    localStorage.setItem(StorageKeys.devMode, 'true');
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

  // 2. Only the selected tool's card is shown in the column
  it('shows only the selected tool card in the column', () => {
    const { container } = renderPromotionPage();

    // Basic Details is selected on open — its card is the only one mounted.
    const mounted = container.querySelectorAll('[data-card-id]');
    expect(mounted.length).toBe(1);
    expect(mounted[0]).toHaveAttribute('data-card-id', 'basicDetailsCard');
    expect(screen.getByText('Basic Details')).toBeInTheDocument();
  });

  // 3. Icon toolbar renders all 9 icon buttons
  it('renders all 9 icon buttons in the icon toolbar', () => {
    const { container } = renderPromotionPage();

    const expectedCardIds = [
      'basicDetailsCard',
      'newsletterCard',
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

  // 4. Icon toolbar click shows the picked tool's card
  it('shows the picked tool card when clicking its icon toolbar button', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage();

    // Click the "How to Shop" tool.
    const howToShopBtn = container.querySelector('[data-testid="toolbar-icon-howToShopCard"]');
    expect(howToShopBtn).toBeInTheDocument();

    await user.click(howToShopBtn!);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Its card is now the one mounted, and Basic Details is gone.
    expect(
      container.querySelector('[data-card-id="howToShopCard"]')
    ).toBeInTheDocument();
    expect(screen.getByText('How to Shop')).toBeInTheDocument();
    expect(
      container.querySelector('[data-card-id="basicDetailsCard"]')
    ).not.toBeInTheDocument();
  });

  // 5. Preview panel always visible
  it('always renders the preview panel', () => {
    renderPromotionPage();

    // Preview tab should be present
    const previewTabs = screen.getAllByRole('tab', { name: /preview/i });
    expect(previewTabs.length).toBeGreaterThanOrEqual(1);

    // HTML tab should also be present
    const codeTabs = screen.getAllByRole('tab', { name: /^html$/i });
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

  // Selection model: exactly one card is mounted; switching tools swaps it.
  it('keeps a single card mounted as tools are switched', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage();

    const oneCardMounted = () =>
      container.querySelectorAll('[data-card-id]').length;

    // Default: only Basic Details.
    expect(oneCardMounted()).toBe(1);
    expect(
      container.querySelector('[data-card-id="basicDetailsCard"]')
    ).toBeInTheDocument();

    // Switch to How to Shop — still exactly one card, now that one.
    await user.click(
      container.querySelector('[data-testid="toolbar-icon-howToShopCard"]')!
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(oneCardMounted()).toBe(1);
    expect(
      container.querySelector('[data-card-id="howToShopCard"]')
    ).toBeInTheDocument();

    // Switch back to Basic Details.
    await user.click(
      container.querySelector('[data-testid="toolbar-icon-basicDetailsCard"]')!
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(oneCardMounted()).toBe(1);
    expect(
      container.querySelector('[data-card-id="basicDetailsCard"]')
    ).toBeInTheDocument();
  });

  // No desktop sidebar in new architecture
  it('does not render desktop sidebar', () => {
    const { container } = renderPromotionPage();

    // No desktop sidebar should exist
    expect(container.querySelector('[data-testid="desktop-sidebar"]')).not.toBeInTheDocument();
  });
});
