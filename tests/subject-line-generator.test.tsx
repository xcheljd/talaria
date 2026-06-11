/**
 * Tests for SubjectLineGenerator component.
 *
 * Covers:
 * - Empty state (no entries)
 * - Generate button when entries exist
 * - Subject line selection from dropdown
 * - Character count badge (optimal vs long)
 * - Inbox preview rendering
 * - Manual edit sets edited flag
 * - Regenerate clears manual edit
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { SubjectLineGenerator } from '@/components/promotion/SubjectLineGenerator';
import { usePromotionStore } from '@/stores/promotion-store';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { ThemeProvider } from '@/contexts/ThemeProvider';


// Mock db
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

const MOCK_PROFILE = {
  employeeName: 'John Doe',
  jobTitle: 'Sales Associate',
  storeName: 'Test Store',
  storeLocation: 'Test Location',
  storeAddress: '123 Test St',
  storePhone: '555-1234',
  storeEmail: 'test@store.com',
  storeHours: 'Mon-Sat: 10AM-8PM',
  storePlusCode: 'ABC123',
  storeDirections: 'Near the mall',
};

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
  });
}

function renderSubjectLineGenerator() {
  localStorage.setItem('userProfile', JSON.stringify(MOCK_PROFILE));
  return render(
    <ThemeProvider>
      <ProfileProvider>
        <MemoryRouter>
          <SubjectLineGenerator />
        </MemoryRouter>
      </ProfileProvider>
    </ThemeProvider>
  );
}

describe('SubjectLineGenerator', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('shows prompt when no promotion entries exist', () => {
    renderSubjectLineGenerator();
    expect(
      screen.getByText(/Add discount entries first/)
    ).toBeInTheDocument();
  });

  it('shows generate button when entries exist', () => {
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: '20% Off Watches', collections: '', callout: '' },
      ],
    });
    renderSubjectLineGenerator();
    expect(
      screen.getByText('Generate Subject Lines')
    ).toBeInTheDocument();
  });

  it('generates subject lines and shows first one selected', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promoDateRange: 'Dec 1-15',
      promotionEntries: [
        { id: 1, line: '20% Off Watches', collections: '', callout: '' },
      ],
    });

    renderSubjectLineGenerator();
    await user.click(screen.getByText('Generate Subject Lines'));

    // Should have generated lines in store
    const state = usePromotionStore.getState();
    expect(state.generatedSubjectLines.length).toBeGreaterThan(0);
    expect(state.selectedSubjectLine).toBeTruthy();
  });

  it('renders inbox preview after generation', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promoDateRange: 'Dec 1-15',
      promotionEntries: [
        { id: 1, line: '20% Off', collections: '', callout: '' },
      ],
    });

    renderSubjectLineGenerator();
    await user.click(screen.getByText('Generate Subject Lines'));

    expect(screen.getByTestId('inbox-preview')).toBeInTheDocument();
    expect(screen.getByText('Citizen Watch Company')).toBeInTheDocument();
  });

  it('shows character count badge', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: '20% Off', collections: '', callout: '' },
      ],
    });

    renderSubjectLineGenerator();
    await user.click(screen.getByText('Generate Subject Lines'));

    // Should show character count
    const state = usePromotionStore.getState();
    const len = state.selectedSubjectLine?.length ?? 0;
    expect(screen.getByText(new RegExp(`${len}`))).toBeInTheDocument();
  });

  it('sets manually edited flag when editing subject input', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: '20% Off', collections: '', callout: '' },
      ],
    });

    renderSubjectLineGenerator();
    await user.click(screen.getByText('Generate Subject Lines'));

    // Find and edit the subject input
    const input = screen.getByDisplayValue(
      usePromotionStore.getState().selectedSubjectLine!
    );
    await user.clear(input);
    await user.type(input, 'Custom Subject');

    expect(usePromotionStore.getState().subjectLineManuallyEdited).toBe(true);
    expect(usePromotionStore.getState().selectedSubjectLine).toBe(
      'Custom Subject'
    );
  });

  it('regenerate clears manual edit flag', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      promotionEntries: [
        { id: 1, line: '20% Off', collections: '', callout: '' },
      ],
    });

    renderSubjectLineGenerator();
    await user.click(screen.getByText('Generate Subject Lines'));

    // Edit the subject
    const input = screen.getByDisplayValue(
      usePromotionStore.getState().selectedSubjectLine!
    );
    await user.clear(input);
    await user.type(input, 'Manual Edit');
    expect(usePromotionStore.getState().subjectLineManuallyEdited).toBe(true);

    // Click regenerate
    await user.click(screen.getByText('Regenerate'));

    expect(usePromotionStore.getState().subjectLineManuallyEdited).toBe(false);
  });
});
