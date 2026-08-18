/**
 * Tests for the "sync email preview with app theme" preference.
 *
 * The live preview's light/dark can either follow the app theme (linked,
 * default) or use its own persisted toggle (independent). These tests exercise
 * PreviewColumn's toolbar light/dark segmented control to verify which value
 * drives it and that, while linked, the toggle also flips the app theme.
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import userEvent from '@testing-library/user-event';

import { PreviewColumn } from '@/components/promotion/PreviewColumn';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { usePromotionStore } from '@/stores/promotion-store';
import { StorageKeys } from '@/lib/storage-keys';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
});

function renderPreview() {
  return render(
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <PreviewColumn emailHTML="" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

/** Is a toolbar toggle item (queried by aria-label) the active one? */
function isActive(label: string): boolean {
  return screen.getByLabelText(label).getAttribute('data-state') === 'on';
}

beforeEach(() => {
  localStorage.clear();
  usePromotionStore.setState({ isInitializing: false });
  vi.restoreAllMocks();
});

describe('preview theme sync', () => {
  it('linked (default): preview follows a dark app theme', () => {
    localStorage.setItem(StorageKeys.theme, 'dark');
    renderPreview();
    expect(isActive('Dark preview')).toBe(true);
    expect(isActive('Light preview')).toBe(false);
  });

  it('linked (default): preview follows a light app theme', () => {
    localStorage.setItem(StorageKeys.theme, 'light');
    renderPreview();
    expect(isActive('Light preview')).toBe(true);
    expect(isActive('Dark preview')).toBe(false);
  });

  it('linked: clicking the preview dark toggle flips the app theme too', async () => {
    const user = userEvent.setup();
    localStorage.setItem(StorageKeys.theme, 'light');
    renderPreview();

    await user.click(screen.getByLabelText('Dark preview'));

    expect(localStorage.getItem(StorageKeys.theme)).toBe('dark');
    expect(isActive('Dark preview')).toBe(true);
  });

  it('independent: preview uses its own toggle, ignoring the app theme', () => {
    localStorage.setItem(StorageKeys.previewSyncTheme, 'false');
    localStorage.setItem(StorageKeys.previewDark, 'true');
    localStorage.setItem(StorageKeys.theme, 'light'); // app is light…
    renderPreview();
    expect(isActive('Dark preview')).toBe(true); // …preview stays dark
  });

  it('independent: clicking the preview toggle does not change the app theme', async () => {
    const user = userEvent.setup();
    localStorage.setItem(StorageKeys.previewSyncTheme, 'false');
    localStorage.setItem(StorageKeys.theme, 'light');
    renderPreview();

    await user.click(screen.getByLabelText('Dark preview'));

    expect(localStorage.getItem(StorageKeys.theme)).toBe('light');
    expect(localStorage.getItem(StorageKeys.previewDark)).toBe('true');
    expect(isActive('Dark preview')).toBe(true);
  });
});
