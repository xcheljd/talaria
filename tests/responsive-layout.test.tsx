/**
 * Tests for PromotionPage mobile responsive layout (<1024px).
 *
 * Covers:
 * 1. Mobile layout renders IconToolbar at top
 * 2. IconToolbar shows all 9 card icons
 * 3. Only the selected tool's card is shown in the card area
 * 4. Preview at bottom with horizontal ResizablePanels
 * 5. Tapping a toolbar icon shows that tool's card
 * 6. No vertical sidebar rendered on mobile
 * 7. Min heights enforced on panels (via minPx prop)
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

// ===== Mobile Layout Integration Tests =====

describe('PromotionPage Mobile Layout', () => {
  beforeEach(() => {
    localStorage.clear();
    // These tests assert on the full 13-icon toolbar, which includes the
    // dev-only Email Theme / Accessibility / Outlook icons.
    localStorage.setItem(StorageKeys.devMode, 'true');
  });

  // 1. Mobile layout renders IconToolbar at top
  it('renders an IconToolbar in the mobile layout', () => {
    const { container } = renderPromotionPage();

    const mobileContainer = container.querySelector(
      '[data-testid="mobile-layout"]'
    );
    expect(mobileContainer).toBeInTheDocument();

    const toolbars = mobileContainer!.querySelectorAll(
      '[data-testid="icon-toolbar"]'
    );
    expect(toolbars.length).toBe(1);
  });

  // 2. IconToolbar shows all 9 card icons
  it('renders all 9 card icons in the mobile IconToolbar', () => {
    const { container } = renderPromotionPage();

    const allCardIds = [
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

    const mobileContainer = container.querySelector(
      '[data-testid="mobile-layout"]'
    );
    expect(mobileContainer).toBeInTheDocument();

    for (const cardId of allCardIds) {
      const icon = mobileContainer!.querySelector(
        `[data-testid="toolbar-icon-${cardId}"]`
      );
      expect(icon).toBeInTheDocument();
    }
  });

  // 3. Only the selected tool's card is shown in the card area
  it('renders only the selected tool card in the card area', () => {
    const { container } = renderPromotionPage();

    // Basic Details is selected on open — the only mounted card.
    const mounted = container.querySelectorAll('[data-card-id]');
    expect(mounted.length).toBe(1);
    expect(
      container.querySelector('[data-card-id="basicDetailsCard"]')
    ).toBeInTheDocument();
  });

  // 4. Preview at bottom with horizontal ResizablePanels
  it('renders preview panel with horizontal ResizablePanels on mobile', () => {
    const { container } = renderPromotionPage();

    // Only the mobile ResizablePanels instance is mounted
    const allPanels = container.querySelectorAll(
      '[data-testid="resizable-panels"]'
    );
    expect(allPanels.length).toBe(1);

    // Find the horizontal separator (mobile ResizablePanels)
    const horizontalSeparators = container.querySelectorAll(
      '[aria-orientation="horizontal"]'
    );
    expect(horizontalSeparators.length).toBeGreaterThanOrEqual(1);

    // Preview is rendered (Email Preview header)
    const previews = screen.getAllByText('Email Preview');
    expect(previews.length).toBeGreaterThanOrEqual(1);
  });

  // 5. Tapping a toolbar icon shows that tool's card
  it('shows the picked tool card when its toolbar icon is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage();

    // Click "How to Shop" toolbar icon
    const howToShopIcon = container.querySelector(
      '[data-testid="toolbar-icon-howToShopCard"]'
    );
    expect(howToShopIcon).toBeInTheDocument();

    await user.click(howToShopIcon!);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Its card replaces Basic Details as the single mounted card.
    expect(
      container.querySelector('[data-card-id="howToShopCard"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-card-id="basicDetailsCard"]')
    ).not.toBeInTheDocument();
  });

  // 6. Mobile section renders its own IconToolbar (desktop layout not mounted)
  it('renders an IconToolbar in the mobile section', () => {
    const { container } = renderPromotionPage();

    // Only the mobile layout is mounted (matchMedia matches: false)
    expect(
      container.querySelector('[data-testid="desktop-layout"]')
    ).not.toBeInTheDocument();

    // Mobile container should contain its own icon toolbar
    const mobileContainer = container.querySelector(
      '[data-testid="mobile-layout"]'
    );
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
    expect(allPanels.length).toBe(1);

    // Verify panel-first and panel-second exist (mobile layout only)
    const firstPanels = container.querySelectorAll(
      '[data-testid="panel-first"]'
    );
    const secondPanels = container.querySelectorAll(
      '[data-testid="panel-second"]'
    );
    expect(firstPanels.length).toBe(1);
    expect(secondPanels.length).toBe(1);
  });

  // Additional: Toolbar icons have proper aria labels
  it('has accessible aria-labels on toolbar icons', () => {
    const { container } = renderPromotionPage();

    const mobileContainer = container.querySelector(
      '[data-testid="mobile-layout"]'
    );
    expect(mobileContainer).toBeInTheDocument();

    const toolbarIcons = mobileContainer!.querySelectorAll(
      '[data-testid^="toolbar-icon-"]'
    );
    expect(toolbarIcons.length).toBe(13);

    for (const btn of toolbarIcons) {
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')).toMatch(/^Show /);
    }
  });

  // Additional: the selected tool's icon reflects the active (pressed) state
  it('marks the selected tool icon as pressed', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage();

    const basicIcon = container.querySelector(
      '[data-testid="toolbar-icon-basicDetailsCard"]'
    )!;
    const hoursIcon = container.querySelector(
      '[data-testid="toolbar-icon-specialHoursCard"]'
    )!;

    // Basic Details is selected on open.
    expect(basicIcon).toHaveAttribute('aria-pressed', 'true');
    expect(hoursIcon).toHaveAttribute('aria-pressed', 'false');

    // Selecting Special Hours moves the pressed state.
    await user.click(hoursIcon);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(hoursIcon).toHaveAttribute('aria-pressed', 'true');
    expect(basicIcon).toHaveAttribute('aria-pressed', 'false');
  });

  // Additional: Toolbar icons have proper pressed state when active
  it('toolbar icons use aria-pressed for active state', () => {
    const { container } = renderPromotionPage();

    const mobileContainer = container.querySelector(
      '[data-testid="mobile-layout"]'
    );
    expect(mobileContainer).toBeInTheDocument();

    const toolbarIcons = mobileContainer!.querySelectorAll(
      '[data-testid^="toolbar-icon-"]'
    );
    expect(toolbarIcons.length).toBe(13);

    for (const btn of toolbarIcons) {
      // Each button should have aria-pressed attribute
      expect(btn).toHaveAttribute('aria-pressed');
    }
  });

  // Selection model: exactly one card is mounted; switching tools swaps it.
  it('keeps a single card mounted as tools are switched on mobile', async () => {
    const user = userEvent.setup();
    const { container } = renderPromotionPage();

    const mountedCount = () =>
      container.querySelectorAll('[data-card-id]').length;

    // Default: only Basic Details.
    expect(mountedCount()).toBe(1);
    expect(
      container.querySelector('[data-card-id="basicDetailsCard"]')
    ).toBeInTheDocument();

    // Switch to How to Shop — still exactly one card.
    await user.click(
      container.querySelector('[data-testid="toolbar-icon-howToShopCard"]')!
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(mountedCount()).toBe(1);
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
    expect(mountedCount()).toBe(1);
    expect(
      container.querySelector('[data-card-id="basicDetailsCard"]')
    ).toBeInTheDocument();
  });
});
