/**
 * Tests for promotion editor components:
 * - DiscountEntriesEditor
 * - FormattableItemEditor (used by How to Shop and Important Notes)
 * - SpecialHoursEditor
 *
 * Tests cover:
 * - Adding items
 * - Editing items (text input)
 * - Removing items
 * - Reordering items (move up/down)
 * - Formatting toggles (bold/italic/underline)
 * - Collapse/expand for discount entries
 * - Summary text when collapsed
 * - Empty state messages
 * - Integration with Zustand store
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DiscountEntriesEditor } from '@/components/promotion/DiscountEntriesEditor';
import {
  FormattableItemEditor,
  type FormattableItemActions,
} from '@/components/promotion/FormattableItemEditor';
import { SpecialHoursEditor } from '@/components/promotion/SpecialHoursEditor';
import { usePromotionStore } from '@/stores/promotion-store';
import { ThemeProvider } from '@/contexts/ThemeProvider';

// ===== Render-isolation instrumentation =====
// Per-row render counts: wrap SortableItem (rendered once per row, and not
// itself memoized, so its render count tracks the row's) with a counting
// component. The wrapper delegates to the real SortableItem, preserving all
// existing behavior. Used by the render-isolation tests below.
const sortableRenderCounts = vi.hoisted(
  () => new Map<string | number, number>()
);

vi.mock('@/components/promotion/SortableItem', async (importOriginal) => {
  const mod = await importOriginal<
    typeof import('@/components/promotion/SortableItem')
  >();
  return {
    ...mod,
    SortableItem: (props: React.ComponentProps<typeof mod.SortableItem>) => {
      sortableRenderCounts.set(
        props.id,
        (sortableRenderCounts.get(props.id) ?? 0) + 1
      );
      return <mod.SortableItem {...props} />;
    },
  };
});


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

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// ===== DiscountEntriesEditor Tests =====

describe('DiscountEntriesEditor', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders empty state message when no entries', () => {
    renderWithTheme(<DiscountEntriesEditor />);
    expect(
      screen.getByText(/no discount entries yet/i)
    ).toBeInTheDocument();
  });

  it('renders "Add Entry" button', () => {
    renderWithTheme(<DiscountEntriesEditor />);
    expect(
      screen.getByRole('button', { name: /add entry/i })
    ).toBeInTheDocument();
  });

  it('adds a new entry when "Add Entry" is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));

    // Should show "Entry 1" label
    expect(screen.getByText('Entry 1')).toBeInTheDocument();
    // Should have 3 input fields
    expect(screen.getByPlaceholderText(/BRAND – ADDITIONAL 20% OFF/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Collection A, Collection B/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Final sale items excluded/i)).toBeInTheDocument();
  });

  it('adds multiple entries', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    expect(screen.getByText('Entry 1')).toBeInTheDocument();
    expect(screen.getByText('Entry 2')).toBeInTheDocument();
  });

  it('updates entry fields on input', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));

    const lineInput = screen.getByPlaceholderText(/BRAND – ADDITIONAL 20% OFF/i);
    await user.type(lineInput, 'Test Brand – 30% OFF');

    expect(lineInput).toHaveValue('Test Brand – 30% OFF');

    // Verify store is updated
    const store = usePromotionStore.getState();
    expect(store.promotionEntries[0].line).toBe('Test Brand – 30% OFF');
  });

  it('removes an entry when remove button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    expect(screen.getByText('Entry 1')).toBeInTheDocument();
    expect(screen.getByText('Entry 2')).toBeInTheDocument();

    // Remove Entry 1
    const removeBtn = screen.getAllByRole('button', { name: /remove entry/i })[0];
    await user.click(removeBtn);

    // Only one entry remains
    expect(screen.getByText('Entry 1')).toBeInTheDocument();
    expect(screen.queryByText('Entry 2')).not.toBeInTheDocument();
  });

  it('moves an entry up when move up button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    // Add two entries and fill them
    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    const lineInputs = screen.getAllByPlaceholderText(/BRAND – ADDITIONAL 20% OFF/i);
    await user.type(lineInputs[0], 'First Entry');
    await user.type(lineInputs[1], 'Second Entry');

    // Move second entry up
    const moveUpBtns = screen.getAllByRole('button', { name: /move entry.*up/i });
    // Click the second entry's move up button
    await user.click(moveUpBtns[1]);

    const store = usePromotionStore.getState();
    expect(store.promotionEntries[0].line).toBe('Second Entry');
    expect(store.promotionEntries[1].line).toBe('First Entry');
  });

  it('moves an entry down when move down button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    const lineInputs = screen.getAllByPlaceholderText(/BRAND – ADDITIONAL 20% OFF/i);
    await user.type(lineInputs[0], 'First Entry');
    await user.type(lineInputs[1], 'Second Entry');

    // Move first entry down
    const moveDownBtns = screen.getAllByRole('button', { name: /move entry.*down/i });
    await user.click(moveDownBtns[0]);

    const store = usePromotionStore.getState();
    expect(store.promotionEntries[0].line).toBe('Second Entry');
    expect(store.promotionEntries[1].line).toBe('First Entry');
  });

  it('disables move up button for first entry', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));

    const moveUpBtn = screen.getByRole('button', { name: /move entry 1 up/i });
    expect(moveUpBtn).toBeDisabled();
  });

  it('disables move down button for last entry', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));

    const moveDownBtn = screen.getByRole('button', { name: /move entry 1 down/i });
    expect(moveDownBtn).toBeDisabled();
  });

  it('collapses entry and shows summary text', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));

    // Fill in the line field
    const lineInput = screen.getByPlaceholderText(/BRAND – ADDITIONAL 20% OFF/i);
    await user.type(lineInput, 'Test Promotion Line');

    // Click collapse
    const collapseBtn = screen.getByRole('button', { name: /collapse entry/i });
    await user.click(collapseBtn);

    // Summary text should be visible
    expect(screen.getByText('Test Promotion Line')).toBeInTheDocument();

    // Input fields should be hidden
    expect(screen.queryByPlaceholderText(/BRAND – ADDITIONAL 20% OFF/i)).not.toBeInTheDocument();
  });

  it('shows "Entry not filled out" summary when collapsed with no data', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));

    const collapseBtn = screen.getByRole('button', { name: /collapse entry/i });
    await user.click(collapseBtn);

    expect(screen.getByText('Entry not filled out')).toBeInTheDocument();
  });

  it('expands a collapsed entry when expand is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));

    // Collapse
    await user.click(screen.getByRole('button', { name: /collapse entry/i }));
    expect(screen.getByRole('button', { name: /expand entry/i })).toBeInTheDocument();

    // Expand
    await user.click(screen.getByRole('button', { name: /expand entry/i }));
    expect(screen.getByPlaceholderText(/BRAND – ADDITIONAL 20% OFF/i)).toBeInTheDocument();
  });

  it('updates collections and callout fields', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));

    const collectionsInput = screen.getByPlaceholderText(/Collection A, Collection B/i);
    await user.type(collectionsInput, 'Brand1, Brand2');

    const calloutInput = screen.getByPlaceholderText(/Final sale items excluded/i);
    await user.type(calloutInput, 'Some callout');

    const store = usePromotionStore.getState();
    expect(store.promotionEntries[0].collections).toBe('Brand1, Brand2');
    expect(store.promotionEntries[0].callout).toBe('Some callout');
  });

  it('does not re-render sibling rows when one entry is edited', async () => {
    const user = userEvent.setup();
    sortableRenderCounts.clear();
    renderWithTheme(<DiscountEntriesEditor />);

    await user.click(screen.getByRole('button', { name: /add entry/i }));
    await user.click(screen.getByRole('button', { name: /add entry/i }));

    const [firstId, secondId] = usePromotionStore
      .getState()
      .promotionEntries.map((e: { id: number }) => e.id);
    expect(firstId).toBeDefined();
    expect(secondId).toBeDefined();

    const firstBefore = sortableRenderCounts.get(firstId) ?? 0;
    const secondBefore = sortableRenderCounts.get(secondId) ?? 0;
    expect(firstBefore).toBeGreaterThan(0);
    expect(secondBefore).toBeGreaterThan(0);

    // Type into the first row's line input (a per-keystroke store update).
    const lineInputs = screen.getAllByPlaceholderText(
      /BRAND – ADDITIONAL 20% OFF/i
    );
    await user.type(lineInputs[0], 'Edited line');

    // The edited row re-rendered (its own value changed)...
    expect(sortableRenderCounts.get(firstId) ?? 0).toBeGreaterThan(
      firstBefore
    );
    // ...but the sibling row did not re-render at all.
    expect(sortableRenderCounts.get(secondId) ?? 0).toBe(secondBefore);
  });
});

// ===== FormattableItemEditor Tests =====

describe('FormattableItemEditor', () => {
  let mockActions: FormattableItemActions;

  beforeEach(() => {
    resetStore();
    mockActions = {
      addItem: vi.fn(() => {
        usePromotionStore.getState().addHowToShopItem();
      }),
      removeItem: vi.fn((id: number) => {
        usePromotionStore.getState().removeHowToShopItem(id);
      }),
      updateItem: vi.fn((id: number, text: string) => {
        usePromotionStore.getState().updateHowToShopItem(id, text);
      }),
      moveItemUp: vi.fn((id: number) => {
        usePromotionStore.getState().moveHowToShopItemUp(id);
      }),
      moveItemDown: vi.fn((id: number) => {
        usePromotionStore.getState().moveHowToShopItemDown(id);
      }),
      toggleFormat: vi.fn((id: number, format: 'bold' | 'italic' | 'underline') => {
        usePromotionStore.getState().toggleHowToShopFormat(id, format);
      }),
    };
  });

  it('renders empty state message when no items', () => {
    renderWithTheme(
      <FormattableItemEditor
        items={[]}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('renders "Add Item" button', () => {
    renderWithTheme(
      <FormattableItemEditor
        items={[]}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );
    expect(
      screen.getByRole('button', { name: /add item/i })
    ).toBeInTheDocument();
  });

  it('adds a new item when button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <FormattableItemEditor
        items={[]}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(mockActions.addItem).toHaveBeenCalledTimes(1);
  });

  it('renders items with input fields and format buttons', () => {
    const items = [
      { id: 1, text: 'Test item', bold: false, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    expect(screen.getByDisplayValue('Test item')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle italic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle underline/i })).toBeInTheDocument();
  });

  it('updates item text on input', async () => {
    const user = userEvent.setup();
    const items = [
      { id: 1, text: '', bold: false, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    const input = screen.getByPlaceholderText('Enter text');
    await user.type(input, 'Hello world');

    expect(mockActions.updateItem).toHaveBeenCalled();
  });

  it('removes item when remove button is clicked', async () => {
    const user = userEvent.setup();
    const items = [
      { id: 1, text: 'Item 1', bold: false, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /remove item/i }));
    expect(mockActions.removeItem).toHaveBeenCalledWith(1);
  });

  it('toggles bold format when bold button is clicked', async () => {
    const user = userEvent.setup();
    const items = [
      { id: 1, text: 'Test', bold: false, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /toggle bold/i }));
    expect(mockActions.toggleFormat).toHaveBeenCalledWith(1, 'bold');
  });

  it('toggles italic format when italic button is clicked', async () => {
    const user = userEvent.setup();
    const items = [
      { id: 1, text: 'Test', bold: false, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /toggle italic/i }));
    expect(mockActions.toggleFormat).toHaveBeenCalledWith(1, 'italic');
  });

  it('toggles underline format when underline button is clicked', async () => {
    const user = userEvent.setup();
    const items = [
      { id: 1, text: 'Test', bold: false, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /toggle underline/i }));
    expect(mockActions.toggleFormat).toHaveBeenCalledWith(1, 'underline');
  });

  it('shows active state on bold button when bold is true', () => {
    const items = [
      { id: 1, text: 'Bold text', bold: true, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    const boldBtn = screen.getByRole('button', { name: /toggle bold/i });
    expect(boldBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows active state on italic button when italic is true', () => {
    const items = [
      { id: 1, text: 'Italic text', bold: false, italic: true, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    const italicBtn = screen.getByRole('button', { name: /toggle italic/i });
    expect(italicBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves item up and down', async () => {
    const user = userEvent.setup();
    const items = [
      { id: 1, text: 'First', bold: false, italic: false, underline: false },
      { id: 2, text: 'Second', bold: false, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    const moveUpBtns = screen.getAllByRole('button', { name: /move.*up/i });
    const moveDownBtns = screen.getAllByRole('button', { name: /move.*down/i });

    // Second item's move up
    await user.click(moveUpBtns[1]);
    expect(mockActions.moveItemUp).toHaveBeenCalledWith(2);

    // First item's move down
    await user.click(moveDownBtns[0]);
    expect(mockActions.moveItemDown).toHaveBeenCalledWith(1);
  });

  it('renders with custom itemLabel for notes', () => {
    const items = [
      { id: 1, text: 'A note', bold: false, italic: false, underline: false },
    ];
    renderWithTheme(
      <FormattableItemEditor
        items={items}
        actions={mockActions}
        placeholder="e.g., Important details"
        itemLabel="Note"
        emptyMessage="No notes yet"
      />
    );

    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
  });

  it('does not re-render sibling rows when one item changes', async () => {
    sortableRenderCounts.clear();

    // Seed the store with two items, then drive the editor with store-backed
    // props exactly like the real HowToShopEditor wiring does.
    usePromotionStore.setState({
      howToShopItems: [
        { id: 1, text: 'First', bold: false, italic: false, underline: false },
        { id: 2, text: 'Second', bold: false, italic: false, underline: false },
      ],
    });
    const store = usePromotionStore.getState();
    const actions = {
      addItem: store.addHowToShopItem,
      removeItem: store.removeHowToShopItem,
      updateItem: store.updateHowToShopItem,
      moveItemUp: store.moveHowToShopItemUp,
      moveItemDown: store.moveHowToShopItemDown,
      toggleFormat: store.toggleHowToShopFormat,
    };

    const { rerender } = renderWithTheme(
      <FormattableItemEditor
        items={usePromotionStore.getState().howToShopItems}
        actions={actions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    const firstBefore = sortableRenderCounts.get(1) ?? 0;
    const secondBefore = sortableRenderCounts.get(2) ?? 0;
    expect(firstBefore).toBeGreaterThan(0);
    expect(secondBefore).toBeGreaterThan(0);

    // Edit item 1 through the store. The items array identity changes, but
    // item 2's object reference is preserved by the store's map update.
    usePromotionStore.getState().updateHowToShopItem(1, 'First edited');

    rerender(
      <ThemeProvider>
        <FormattableItemEditor
          items={usePromotionStore.getState().howToShopItems}
          actions={actions}
          placeholder="Enter text"
          itemLabel="Item"
          emptyMessage="No items yet"
        />
      </ThemeProvider>
    );

    // The edited row re-rendered (its own item object changed)...
    expect(sortableRenderCounts.get(1) ?? 0).toBeGreaterThan(firstBefore);
    // ...but the sibling row did not.
    expect(sortableRenderCounts.get(2) ?? 0).toBe(secondBefore);
  });
});

// ===== HowToShop Integration Tests =====

describe('HowToShop via FormattableItemEditor', () => {
  beforeEach(() => {
    resetStore();
  });

  it('adds and edits a how-to-shop item via store', async () => {
    const user = userEvent.setup();
    const store = usePromotionStore.getState();
    const actions = {
      addItem: store.addHowToShopItem,
      removeItem: store.removeHowToShopItem,
      updateItem: store.updateHowToShopItem,
      moveItemUp: store.moveHowToShopItemUp,
      moveItemDown: store.moveHowToShopItemDown,
      toggleFormat: store.toggleHowToShopFormat,
    };

    const { rerender } = renderWithTheme(
      <FormattableItemEditor
        items={usePromotionStore.getState().howToShopItems}
        actions={actions}
        placeholder="e.g., Shop in-store"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /add item/i }));

    // Rerender with updated store state
    const updatedItems = usePromotionStore.getState().howToShopItems;
    rerender(
      <ThemeProvider>
        <FormattableItemEditor
          items={updatedItems}
          actions={actions}
          placeholder="e.g., Shop in-store"
          itemLabel="Item"
          emptyMessage="No items yet"
        />
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText('e.g., Shop in-store')).toBeInTheDocument();
  });

  it('toggles bold format through the store', async () => {
    const user = userEvent.setup();

    // Pre-populate store with one item
    usePromotionStore.setState({
      howToShopItems: [
        { id: 100, text: 'Test item', bold: false, italic: false, underline: false },
      ],
    });

    const store = usePromotionStore.getState();
    const actions = {
      addItem: store.addHowToShopItem,
      removeItem: store.removeHowToShopItem,
      updateItem: store.updateHowToShopItem,
      moveItemUp: store.moveHowToShopItemUp,
      moveItemDown: store.moveHowToShopItemDown,
      toggleFormat: store.toggleHowToShopFormat,
    };

    renderWithTheme(
      <FormattableItemEditor
        items={usePromotionStore.getState().howToShopItems}
        actions={actions}
        placeholder="Enter text"
        itemLabel="Item"
        emptyMessage="No items yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /toggle bold/i }));

    expect(usePromotionStore.getState().howToShopItems[0].bold).toBe(true);
  });
});

// ===== ImportantNotes Integration Tests =====

describe('ImportantNotes via FormattableItemEditor', () => {
  beforeEach(() => {
    resetStore();
  });

  it('adds an important notes item via store', async () => {
    const user = userEvent.setup();
    const store = usePromotionStore.getState();
    const actions = {
      addItem: store.addImportantNotesItem,
      removeItem: store.removeImportantNotesItem,
      updateItem: store.updateImportantNotesItem,
      moveItemUp: store.moveImportantNotesItemUp,
      moveItemDown: store.moveImportantNotesItemDown,
      toggleFormat: store.toggleImportantNotesFormat,
    };

    const { rerender } = renderWithTheme(
      <FormattableItemEditor
        items={usePromotionStore.getState().importantNotesItems}
        actions={actions}
        placeholder="e.g., Important details"
        itemLabel="Note"
        emptyMessage="No notes yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /add note/i }));

    // Rerender with updated store state
    const updatedItems = usePromotionStore.getState().importantNotesItems;
    rerender(
      <ThemeProvider>
        <FormattableItemEditor
          items={updatedItems}
          actions={actions}
          placeholder="e.g., Important details"
          itemLabel="Note"
          emptyMessage="No notes yet"
        />
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText('e.g., Important details')).toBeInTheDocument();
  });

  it('toggles formatting on important notes item via store', async () => {
    const user = userEvent.setup();

    usePromotionStore.setState({
      importantNotesItems: [
        { id: 200, text: 'Important note', bold: false, italic: false, underline: false },
      ],
    });

    const store = usePromotionStore.getState();
    const actions = {
      addItem: store.addImportantNotesItem,
      removeItem: store.removeImportantNotesItem,
      updateItem: store.updateImportantNotesItem,
      moveItemUp: store.moveImportantNotesItemUp,
      moveItemDown: store.moveImportantNotesItemDown,
      toggleFormat: store.toggleImportantNotesFormat,
    };

    renderWithTheme(
      <FormattableItemEditor
        items={usePromotionStore.getState().importantNotesItems}
        actions={actions}
        placeholder="Enter text"
        itemLabel="Note"
        emptyMessage="No notes yet"
      />
    );

    await user.click(screen.getByRole('button', { name: /toggle italic/i }));
    expect(usePromotionStore.getState().importantNotesItems[0].italic).toBe(true);
  });
});

// ===== SpecialHoursEditor Tests =====

describe('SpecialHoursEditor', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders empty state message when no hours', () => {
    renderWithTheme(<SpecialHoursEditor />);
    expect(
      screen.getByText(/no special hours added yet/i)
    ).toBeInTheDocument();
  });

  it('renders "Add Hours" button', () => {
    renderWithTheme(<SpecialHoursEditor />);
    expect(
      screen.getByRole('button', { name: /add hours/i })
    ).toBeInTheDocument();
  });

  it('adds a new special hour row when "Add Hours" is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));

    expect(screen.getByPlaceholderText(/e.g., Friday Nov 29/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g., 6AM–10PM or CLOSED/i)).toBeInTheDocument();
  });

  it('adds multiple special hour rows', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));
    await user.click(screen.getByRole('button', { name: /add hours/i }));

    const dayInputs = screen.getAllByPlaceholderText(/e.g., Friday Nov 29/i);
    expect(dayInputs).toHaveLength(2);
  });

  it('updates day field on input', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));

    const dayInput = screen.getByPlaceholderText(/e.g., Friday Nov 29/i);
    await user.type(dayInput, 'Friday Nov 29');

    const store = usePromotionStore.getState();
    expect(store.specialHours[0].day).toBe('Friday Nov 29');
  });

  it('updates hours field on input', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));

    const hoursInput = screen.getByPlaceholderText(/e.g., 6AM–10PM or CLOSED/i);
    await user.type(hoursInput, '9AM-9PM');

    const store = usePromotionStore.getState();
    expect(store.specialHours[0].hours).toBe('9AM-9PM');
  });

  it('removes a special hour row when remove button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));
    await user.click(screen.getByRole('button', { name: /add hours/i }));

    expect(screen.getAllByPlaceholderText(/e.g., Friday Nov 29/i)).toHaveLength(2);

    const removeBtns = screen.getAllByRole('button', { name: /remove special hour/i });
    await user.click(removeBtns[0]);

    expect(screen.getAllByPlaceholderText(/e.g., Friday Nov 29/i)).toHaveLength(1);
  });

  it('moves a special hour row up', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));
    await user.click(screen.getByRole('button', { name: /add hours/i }));

    // Fill in values
    const dayInputs = screen.getAllByPlaceholderText(/e.g., Friday Nov 29/i);
    await user.type(dayInputs[0], 'Friday');
    await user.type(dayInputs[1], 'Saturday');

    // Move second row up
    const moveUpBtns = screen.getAllByRole('button', { name: /move hour.*up/i });
    await user.click(moveUpBtns[1]);

    const store = usePromotionStore.getState();
    expect(store.specialHours[0].day).toBe('Saturday');
    expect(store.specialHours[1].day).toBe('Friday');
  });

  it('moves a special hour row down', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));
    await user.click(screen.getByRole('button', { name: /add hours/i }));

    // Fill in values
    const dayInputs = screen.getAllByPlaceholderText(/e.g., Friday Nov 29/i);
    await user.type(dayInputs[0], 'Friday');
    await user.type(dayInputs[1], 'Saturday');

    // Move first row down
    const moveDownBtns = screen.getAllByRole('button', { name: /move hour.*down/i });
    await user.click(moveDownBtns[0]);

    const store = usePromotionStore.getState();
    expect(store.specialHours[0].day).toBe('Saturday');
    expect(store.specialHours[1].day).toBe('Friday');
  });

  it('disables move up for first row', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));

    const moveUpBtn = screen.getByRole('button', { name: /move hour 1 up/i });
    expect(moveUpBtn).toBeDisabled();
  });

  it('disables move down for last row', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SpecialHoursEditor />);

    await user.click(screen.getByRole('button', { name: /add hours/i }));

    const moveDownBtn = screen.getByRole('button', { name: /move hour 1 down/i });
    expect(moveDownBtn).toBeDisabled();
  });
});
