/**
 * Tests for AccessibilityChecker component.
 *
 * Covers:
 * - Empty state (no newsletter content)
 * - Scan button appears when content exists
 * - Detects missing alt text on images
 * - Detects empty links
 * - Detects heading hierarchy gaps
 * - Detects long alt text
 * - Shows success when no issues found
 * - Re-scan button after initial scan
 * - Results are a snapshot; staleness is flagged after edits
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AccessibilityChecker } from '@/components/promotion/AccessibilityChecker';
import { usePromotionStore } from '@/stores/promotion-store';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';

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
  });
}

function renderAccessibilityChecker() {
  return render(
    <ThemeProvider>
      <ProfileProvider>
        <MemoryRouter>
          <AccessibilityChecker />
        </MemoryRouter>
      </ProfileProvider>
    </ThemeProvider>
  );
}

describe('AccessibilityChecker', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('shows prompt when no newsletter content', () => {
    renderAccessibilityChecker();
    expect(
      screen.getByText(/Add newsletter content first/)
    ).toBeInTheDocument();
  });

  it('shows scan button when newsletter content exists', () => {
    usePromotionStore.setState({
      newsletterBody: '<p>Hello world</p>',
    });
    renderAccessibilityChecker();
    expect(screen.getByText('Run Accessibility Scan')).toBeInTheDocument();
  });

  it('shows success when content has no issues', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      newsletterBody: '<p>Clean content with no issues.</p>',
    });
    renderAccessibilityChecker();

    await user.click(screen.getByText('Run Accessibility Scan'));

    expect(
      screen.getByText(/No accessibility issues found/)
    ).toBeInTheDocument();
  });

  it('detects images missing alt text', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      newsletterBody: '<p>Text</p><img src="photo.jpg">',
    });
    renderAccessibilityChecker();

    await user.click(screen.getByText('Run Accessibility Scan'));

    expect(screen.getByTestId('a11y-issues-list')).toBeInTheDocument();
    expect(screen.getByText(/missing alt/i)).toBeInTheDocument();
  });

  it('detects empty links', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      newsletterBody: '<a href="https://example.com"></a>',
    });
    renderAccessibilityChecker();

    await user.click(screen.getByText('Run Accessibility Scan'));

    expect(screen.getByText(/empty link/i)).toBeInTheDocument();
  });

  it('detects heading hierarchy gaps', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      newsletterBody: '<h2>Title</h2><h4>Subtitle</h4>',
    });
    renderAccessibilityChecker();

    await user.click(screen.getByText('Run Accessibility Scan'));

    expect(screen.getByText(/heading level/i)).toBeInTheDocument();
  });

  it('detects very long alt text', async () => {
    const user = userEvent.setup();
    const longAlt = 'A'.repeat(130);
    usePromotionStore.setState({
      newsletterBody: `<img src="photo.jpg" alt="${longAlt}">`,
    });
    renderAccessibilityChecker();

    await user.click(screen.getByText('Run Accessibility Scan'));

    expect(screen.getByText(/alt text is very long/i)).toBeInTheDocument();
  });

  it('shows re-scan button after initial scan', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      newsletterBody: '<p>Content</p>',
    });
    renderAccessibilityChecker();

    await user.click(screen.getByText('Run Accessibility Scan'));

    expect(screen.getByText('Re-scan')).toBeInTheDocument();
  });

  it('detects ALL CAPS text blocks', async () => {
    const user = userEvent.setup();
    const caps = 'A'.repeat(55);
    usePromotionStore.setState({
      newsletterBody: `<p>${caps}</p>`,
    });
    renderAccessibilityChecker();

    await user.click(screen.getByText('Run Accessibility Scan'));

    expect(screen.getByText(/ALL CAPS/i)).toBeInTheDocument();
  });

  it('keeps results as a snapshot and flags staleness after edits', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      newsletterBody: '<p>Text</p><img src="photo.jpg">', // missing alt
    });
    renderAccessibilityChecker();

    await user.click(screen.getByText('Run Accessibility Scan'));
    expect(screen.getByText(/missing alt/i)).toBeInTheDocument();
    expect(screen.queryByTestId('a11y-stale')).not.toBeInTheDocument();

    // Editing after a scan must NOT recompute results, but should flag staleness.
    act(() => {
      usePromotionStore.setState({ newsletterBody: '<p>All fixed now</p>' });
    });
    expect(screen.getByTestId('a11y-stale')).toBeInTheDocument();
    expect(screen.getByText(/missing alt/i)).toBeInTheDocument(); // snapshot intact

    // Re-scanning clears staleness and refreshes results.
    await user.click(screen.getByText('Re-scan'));
    expect(screen.queryByTestId('a11y-stale')).not.toBeInTheDocument();
    expect(screen.queryByText(/missing alt/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/No accessibility issues found/)
    ).toBeInTheDocument();
  });
});
