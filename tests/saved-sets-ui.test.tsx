/**
 * Saved Sets UI: the Sets menu, save-name dialog (including replacing an
 * existing name), loading with Undo, and the linked-line Add menu.
 */
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/profile', () => ({
  getStorePhone: vi.fn().mockReturnValue('702-555-0190'),
  getStoreEmail: vi.fn().mockReturnValue('store@example.com'),
  getDirections: vi.fn().mockReturnValue('Entrance E'),
}));

const toastSpies = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), toastSpies),
}));

import { SavedSetsMenu } from '@/components/promotion/SavedSetsMenu';
import { FormattableItemEditor } from '@/components/promotion/FormattableItemEditor';
import { useSavedSetsStore } from '@/stores/saved-sets-store';
import { usePromotionStore, createLinkedLine } from '@/stores/promotion-store';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

const wrap = (ui: React.ReactElement) =>
  render(
    <ThemeProvider>
      <TooltipProvider>{ui}</TooltipProvider>
    </ThemeProvider>
  );

beforeEach(() => {
  localStorage.clear();
  useSavedSetsStore.getState().reload();
  usePromotionStore.getState().resetState();
  toastSpies.success.mockClear();
});

describe('SavedSetsMenu', () => {
  it('saves the current entries under a name, then offers to load them', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      specialHours: [{ id: 1, day: 'Thu Nov 26', hours: 'CLOSED' }],
    });
    wrap(<SavedSetsMenu section="specialHours" noun="hours" />);

    await user.click(screen.getByTestId('sets-specialHours'));
    await user.click(
      screen.getByRole('menuitem', { name: /save current hours/i })
    );

    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText(/set name/i),
      'Thanksgiving 2026'
    );
    await user.click(within(dialog).getByRole('button', { name: /save set/i }));

    expect(useSavedSetsStore.getState().sets.specialHours[0].name).toBe(
      'Thanksgiving 2026'
    );
    expect(toastSpies.success).toHaveBeenCalledWith(
      'Saved set “Thanksgiving 2026”'
    );
  });

  it('asks before replacing a set with the same name', async () => {
    const user = userEvent.setup();
    useSavedSetsStore
      .getState()
      .saveSet('specialHours', 'Thanksgiving', [{ day: 'Old', hours: 'x' }]);
    usePromotionStore.setState({
      specialHours: [{ id: 1, day: 'Thu Nov 26', hours: 'CLOSED' }],
    });
    wrap(<SavedSetsMenu section="specialHours" noun="hours" />);

    await user.click(screen.getByTestId('sets-specialHours'));
    await user.click(
      screen.getByRole('menuitem', { name: /save current hours/i })
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/set name/i), 'thanksgiving');
    await user.click(within(dialog).getByRole('button', { name: /save set/i }));

    // Still one set, unchanged, with a warning and a Replace action.
    expect(useSavedSetsStore.getState().sets.specialHours).toHaveLength(1);
    expect(useSavedSetsStore.getState().sets.specialHours[0].data).toEqual([
      { day: 'Old', hours: 'x' },
    ]);
    expect(within(dialog).getByText(/already exists/i)).toBeTruthy();

    await user.click(
      within(dialog).getByRole('button', { name: /replace set/i })
    );
    expect(useSavedSetsStore.getState().sets.specialHours[0].data).toEqual([
      { day: 'Thu Nov 26', hours: 'CLOSED' },
    ]);
  });

  it('loading a set replaces the list and the toast can undo it', async () => {
    const user = userEvent.setup();
    useSavedSetsStore
      .getState()
      .saveSet('specialHours', 'Holiday', [
        { day: 'Thu Nov 26', hours: 'CLOSED' },
      ]);
    const before = [{ id: 7, day: 'Sat', hours: '9AM-5PM' }];
    usePromotionStore.setState({ specialHours: before });

    wrap(<SavedSetsMenu section="specialHours" noun="hours" />);
    await user.click(screen.getByTestId('sets-specialHours'));
    await user.click(screen.getByRole('menuitem', { name: /Holiday/ }));

    expect(usePromotionStore.getState().specialHours.map((h) => h.day)).toEqual(
      ['Thu Nov 26']
    );
    const opts = toastSpies.success.mock.calls.at(-1)?.[1];
    expect(opts.action.label).toBe('Undo');
    await opts.action.onClick();
    expect(usePromotionStore.getState().specialHours).toEqual(before);
  });

  it('deleting a set from the menu restores it on Undo', async () => {
    const user = userEvent.setup();
    useSavedSetsStore
      .getState()
      .saveSet('specialHours', 'Temp', [{ day: 'd', hours: 'h' }]);
    wrap(<SavedSetsMenu section="specialHours" noun="hours" />);

    await user.click(screen.getByTestId('sets-specialHours'));
    await user.click(screen.getByRole('button', { name: /delete set Temp/i }));
    expect(useSavedSetsStore.getState().sets.specialHours).toHaveLength(0);

    const opts = toastSpies.success.mock.calls.at(-1)?.[1];
    await opts.action.onClick();
    expect(useSavedSetsStore.getState().sets.specialHours[0].name).toBe('Temp');
  });

  it('renaming in Manage sets rejects a name already in use', async () => {
    const user = userEvent.setup();
    const store = useSavedSetsStore.getState();
    store.saveSet('specialHours', 'A', [{ day: 'a', hours: 'a' }]);
    store.saveSet('specialHours', 'B', [{ day: 'b', hours: 'b' }]);
    wrap(<SavedSetsMenu section="specialHours" noun="hours" />);

    await user.click(screen.getByTestId('sets-specialHours'));
    await user.click(screen.getByRole('menuitem', { name: /manage sets/i }));
    await user.click(screen.getByRole('button', { name: /rename B/i }));
    const input = screen.getByLabelText(/new name for B/i);
    await user.clear(input);
    await user.type(input, 'a');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/is already used/i)).toBeTruthy();
    expect(
      useSavedSetsStore.getState().sets.specialHours.map((s) => s.name)
    ).toEqual(['A', 'B']);
  });
});

describe('linked-line Add menu', () => {
  it('offers only linked lines that are set and not already listed', async () => {
    const user = userEvent.setup();
    usePromotionStore.setState({
      howToShopItems: [createLinkedLine('storeEmail')],
    });
    wrap(
      <FormattableItemEditor
        items={usePromotionStore.getState().howToShopItems}
        actions={{
          addItem: () => usePromotionStore.getState().addHowToShopItem(),
          removeItem: () => {},
          updateItem: () => {},
          moveItemUp: () => {},
          moveItemDown: () => {},
          toggleFormat: () => {},
        }}
        placeholder="x"
        itemLabel="Item"
        emptyMessage="Empty"
        linkedFields={['storePhone', 'storeEmail']}
        onAddLinked={(field) =>
          usePromotionStore.setState((state) => ({
            howToShopItems: [...state.howToShopItems, createLinkedLine(field)],
          }))
        }
      />
    );

    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(
      screen.getByRole('menuitem', { name: /store phone line/i })
    ).toBeTruthy();
    // Email is already in the list, so it is not offered again.
    expect(
      screen.queryByRole('menuitem', { name: /store email line/i })
    ).toBeNull();

    await user.click(
      screen.getByRole('menuitem', { name: /store phone line/i })
    );
    expect(
      usePromotionStore.getState().howToShopItems.map((i) => i.autoField)
    ).toEqual(['storeEmail', 'storePhone']);
  });
});

describe('Settings → Saved Sets', () => {
  it('lists every section and deletes with Undo', async () => {
    const { SavedSetsSection } =
      await import('@/components/profile/SavedSetsSection');
    const user = userEvent.setup();
    useSavedSetsStore
      .getState()
      .saveSet('specialHours', 'Holiday', [{ day: 'Thu', hours: 'CLOSED' }]);
    wrap(<SavedSetsSection />);

    for (const s of [
      'howToShop',
      'importantNotes',
      'specialHours',
      'newsletter',
    ]) {
      expect(screen.getByTestId(`saved-sets-group-${s}`)).toBeTruthy();
    }
    const hours = screen.getByTestId('saved-sets-group-specialHours');
    expect(within(hours).getByText('Holiday')).toBeTruthy();
    expect(within(hours).getByText('1 line')).toBeTruthy();
    // No "update with current" outside the builder.
    expect(within(hours).queryByRole('button', { name: /update/i })).toBeNull();

    await user.click(
      within(hours).getByRole('button', { name: /delete set Holiday/i })
    );
    expect(useSavedSetsStore.getState().sets.specialHours).toHaveLength(0);
    await toastSpies.success.mock.calls.at(-1)?.[1].action.onClick();
    expect(useSavedSetsStore.getState().sets.specialHours[0].name).toBe(
      'Holiday'
    );
  });
});

describe('Sets menu notices edits to a loaded set', () => {
  it('shows the edited dot and Update “name” after changing a loaded set', async () => {
    const { useLoadedSets } = await import('@/lib/saved-sets-actions');
    useLoadedSets.setState({ loaded: {} });
    const user = userEvent.setup();
    useSavedSetsStore
      .getState()
      .saveSet('specialHours', 'Holiday', [{ day: 'Thu', hours: 'CLOSED' }]);
    usePromotionStore.setState({
      specialHours: [{ id: 1, day: 'x', hours: 'y' }],
    });
    wrap(<SavedSetsMenu section="specialHours" noun="hours" />);

    await user.click(screen.getByTestId('sets-specialHours'));
    await user.click(screen.getByRole('menuitem', { name: /Holiday/ }));
    expect(screen.queryByTestId('sets-edited-specialHours')).toBeNull();

    act(() =>
      usePromotionStore.setState({
        specialHours: [{ id: 2, day: 'Thu', hours: '9AM-1PM' }],
      })
    );
    expect(screen.getByTestId('sets-edited-specialHours')).toBeTruthy();

    await user.click(screen.getByTestId('sets-specialHours'));
    await user.click(screen.getByTestId('update-linked-specialHours'));
    expect(useSavedSetsStore.getState().sets.specialHours[0].data).toEqual([
      { day: 'Thu', hours: '9AM-1PM' },
    ]);
    expect(screen.queryByTestId('sets-edited-specialHours')).toBeNull();
  });

  it('clearing the card ends the link to the set', async () => {
    const { useLoadedSets } = await import('@/lib/saved-sets-actions');
    usePromotionStore.setState({
      specialHours: [{ id: 1, day: 'a', hours: 'b' }],
    });
    useLoadedSets.getState().link('specialHours', 'some-id');
    act(() => usePromotionStore.setState({ specialHours: [] }));
    expect(useLoadedSets.getState().loaded.specialHours).toBeUndefined();
  });
});
