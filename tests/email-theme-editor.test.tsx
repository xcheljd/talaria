/**
 * Tests for EmailThemeEditor component.
 *
 * Covers:
 * - Renders color picker fields
 * - Preset palette application
 * - Reset to defaults
 * - Custom color changes via picker
 * - Save/load custom palettes in localStorage
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { EmailThemeEditor } from '@/components/promotion/EmailThemeEditor';
import {
  usePromotionStore,
  DEFAULT_EMAIL_PALETTE,
} from '@/stores/promotion-store';
import { ProfileProvider } from '@/contexts/ProfileProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
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
  });
  // Reset palette to defaults
  usePromotionStore.getState().resetEmailPalette();
}

function renderEmailThemeEditor() {
  return render(
    <ThemeProvider>
      <ProfileProvider>
        <TooltipProvider>
          <MemoryRouter>
            <EmailThemeEditor />
          </MemoryRouter>
        </TooltipProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}

describe('EmailThemeEditor', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
  });

  it('renders color swatches for all palette fields', () => {
    renderEmailThemeEditor();
    // Should have swatches for each editable field
    expect(screen.getByTestId('theme-swatch-footerBg')).toBeInTheDocument();
    expect(screen.getByTestId('theme-swatch-accent')).toBeInTheDocument();
    expect(screen.getByTestId('theme-swatch-text')).toBeInTheDocument();
    expect(screen.getByTestId('theme-swatch-link')).toBeInTheDocument();
  });

  it('renders color picker inputs', () => {
    renderEmailThemeEditor();
    const picker = screen.getByTestId('theme-picker-footerBg');
    expect(picker).toBeInTheDocument();
    expect(picker).toHaveAttribute('type', 'color');
  });

  it('changes color when picker value changes', () => {
    renderEmailThemeEditor();
    const picker = screen.getByTestId('theme-picker-footerBg');

    fireEvent.input(picker, { target: { value: '#ff0000' } });

    const state = usePromotionStore.getState();
    expect(state.emailPalette.footerBg).toBe('#ff0000');
  });

  it('shows reset button when palette differs from default', () => {
    renderEmailThemeEditor();

    // Initially default — no reset button
    expect(screen.queryByTestId('reset-email-palette')).not.toBeInTheDocument();

    // Change a color
    const picker = screen.getByTestId('theme-picker-footerBg');
    fireEvent.input(picker, { target: { value: '#ff0000' } });

    // Re-render to pick up state change
    renderEmailThemeEditor();
    expect(screen.getAllByTestId('reset-email-palette').length).toBeGreaterThan(
      0
    );
  });

  it('resets all colors to defaults', async () => {
    const user = userEvent.setup();

    // Set a custom color first
    usePromotionStore.getState().setEmailPalette({ footerBg: '#ff0000' });

    renderEmailThemeEditor();
    const resetBtn = screen.getAllByTestId('reset-email-palette')[0];
    await user.click(resetBtn);

    const state = usePromotionStore.getState();
    expect(state.emailPalette.footerBg).toBe(DEFAULT_EMAIL_PALETTE.footerBg);
  });

  it('renders preset palette buttons', () => {
    renderEmailThemeEditor();
    // Should have General presets
    expect(screen.getByText('Classic (Default)')).toBeInTheDocument();
    expect(screen.getByText('Ocean Blue')).toBeInTheDocument();
  });

  it('applies a preset palette on click', async () => {
    const user = userEvent.setup();
    renderEmailThemeEditor();

    await user.click(screen.getByText('Ocean Blue'));

    const state = usePromotionStore.getState();
    // Ocean Blue should change the palette from defaults
    expect(state.emailPalette.footerBg).not.toBe(
      DEFAULT_EMAIL_PALETTE.footerBg
    );
  });

  it('saves custom palette to localStorage', async () => {
    const user = userEvent.setup();

    // Set a custom color
    usePromotionStore.getState().setEmailPalette({ footerBg: '#123456' });

    renderEmailThemeEditor();

    // Find save input and button
    const saveInput = screen.getByPlaceholderText('Palette name...');
    await user.type(saveInput, 'My Custom');
    // The Save button has icon + text
    const saveButtons = screen.getAllByText('Save');
    await user.click(saveButtons[saveButtons.length - 1]);

    // Check localStorage
    const saved = JSON.parse(localStorage.getItem('emailPaletteSaved') || '[]');
    expect(saved.length).toBeGreaterThan(0);
    expect(saved[0].name).toBe('My Custom');
  });
});
