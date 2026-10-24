/**
 * Clear-all is instant and reversible: no confirm dialog, and the toast's
 * Undo puts the exact list back.
 */
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const toastSuccess = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: toastSuccess,
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import { SpecialHoursEditor } from '@/components/promotion/SpecialHoursEditor';
import { DiscountEntriesEditor } from '@/components/promotion/DiscountEntriesEditor';
import { usePromotionStore } from '@/stores/promotion-store';
import { ThemeProvider } from '@/contexts/ThemeProvider';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
});

const undoFromLastToast = async () => {
  const opts = toastSuccess.mock.calls.at(-1)?.[1];
  expect(opts?.action?.label).toBe('Undo');
  await opts.action.onClick();
};

describe('clear all with undo', () => {
  beforeEach(() => {
    toastSuccess.mockClear();
    usePromotionStore.setState({
      specialHours: [
        { id: 1, day: 'Fri Nov 27', hours: '6AM-10PM' },
        { id: 2, day: 'Sat Nov 28', hours: '8AM-9PM' },
      ],
      promotionEntries: [],
      entryCollapsedStates: {},
    });
  });

  it('clears special hours without a dialog and restores them on Undo', async () => {
    const before = usePromotionStore.getState().specialHours;
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <SpecialHoursEditor />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(usePromotionStore.getState().specialHours).toEqual([]);
    expect(toastSuccess.mock.calls.at(-1)?.[0]).toBe('2 hours removed');
    await undoFromLastToast();
    expect(usePromotionStore.getState().specialHours).toEqual(before);
  });

  it('restores discount entries and their collapse flags', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <DiscountEntriesEditor />
      </ThemeProvider>
    );
    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.click(screen.getByRole('button', { name: /add entry/i }));
    const entries = usePromotionStore.getState().promotionEntries;
    const collapsed = usePromotionStore.getState().entryCollapsedStates;
    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(usePromotionStore.getState().promotionEntries).toEqual([]);
    await undoFromLastToast();
    expect(usePromotionStore.getState().promotionEntries).toEqual(entries);
    expect(usePromotionStore.getState().entryCollapsedStates).toEqual(
      collapsed
    );
  });
});
