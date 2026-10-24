/**
 * FormattableItemEditor — Reusable dynamic list with formatting toggles.
 *
 * Used for both How to Shop and Important Notes sections.
 * Each item has a text input and Bold/Italic/Underline formatting toggles.
 * Supports add, remove, reorder (up/down), and drag-to-reorder via @dnd-kit.
 * All mutations go through the Zustand promotion store.
 */

import { CardHeaderActions } from '@/components/promotion/card-header-actions';
import { ListEmptyState } from '@/components/promotion/ListEmptyState';
import { memo, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Trash2,
  ListPlus,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { toastWithUndo } from '@/lib/undo-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ClearableInput } from '@/components/ui/clearable-input';
import { SortableItem, DragHandle } from '@/components/promotion/SortableItem';

// ===== Types =====

export interface FormattableItem {
  id: number;
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface FormattableItemActions {
  addItem: () => void;
  removeItem: (id: number) => void;
  updateItem: (id: number, text: string) => void;
  moveItemUp: (id: number) => void;
  moveItemDown: (id: number) => void;
  reorderItems?: (oldIndex: number, newIndex: number) => void;
  toggleFormat: (id: number, format: 'bold' | 'italic' | 'underline') => void;
  /** When provided, the header renders a "Clear all" button wired to this. */
  clearAllItems?: () => void;
  /** Puts a cleared list back (Undo in the clear toast). */
  restoreItems?: (items: FormattableItem[]) => void;
}

export interface FormattableItemEditorProps {
  /** Items to render */
  items: FormattableItem[];
  /** Store actions for this list */
  actions: FormattableItemActions;
  /** Placeholder text for the input */
  placeholder: string;
  /** Label for "Add Item" button and aria */
  itemLabel: string;
  /** Empty state message */
  /** Empty-state title. */
  emptyMessage: string;
  /** Empty-state guidance line. */
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
}

// ===== Format Button Component =====

interface FormatButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function FormatButton({ active, onClick, label, children }: FormatButtonProps) {
  return (
    <Button
      variant={active ? 'default' : 'ghost'}
      size="icon-xs"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      data-active={active || undefined}
      className={cn('size-6', active && 'bg-primary text-primary-foreground')}
    >
      {children}
    </Button>
  );
}

// ===== Single Item Component =====

interface ItemRowProps {
  item: FormattableItem;
  index: number;
  total: number;
  actions: FormattableItemActions;
  placeholder: string;
}

const ItemRow = memo(function ItemRow({
  item,
  index,
  total,
  actions,
  placeholder,
}: ItemRowProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const handleTextChange = useCallback(
    (val: string) => {
      actions.updateItem(item.id, val);
    },
    [actions, item.id]
  );

  return (
    <SortableItem id={item.id}>
      <div
        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
        data-item-id={item.id}
        aria-label={`${item.text || `Item ${index + 1}`}`}
      >
        {/* Drag handle */}
        <DragHandle className="SortableItem" />

        {/* Reorder buttons */}
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => actions.moveItemUp(item.id)}
            disabled={isFirst}
            aria-label={`Move ${index + 1} up`}
          >
            <ChevronUp className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => actions.moveItemDown(item.id)}
            disabled={isLast}
            aria-label={`Move ${index + 1} down`}
          >
            <ChevronDown className="size-3" />
          </Button>
        </div>

        {/* Text Input */}
        <div className="flex-1 min-w-0">
          <ClearableInput
            value={item.text}
            onChange={handleTextChange}
            placeholder={placeholder}
            className="h-8 text-sm"
            data-field="text"
          />
        </div>

        {/* Format Toggle Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <FormatButton
            active={item.bold}
            onClick={() => actions.toggleFormat(item.id, 'bold')}
            label="Toggle bold"
          >
            <Bold className="size-3" />
          </FormatButton>
          <FormatButton
            active={item.italic}
            onClick={() => actions.toggleFormat(item.id, 'italic')}
            label="Toggle italic"
          >
            <Italic className="size-3" />
          </FormatButton>
          <FormatButton
            active={item.underline}
            onClick={() => actions.toggleFormat(item.id, 'underline')}
            label="Toggle underline"
          >
            <Underline className="size-3" />
          </FormatButton>
        </div>

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => actions.removeItem(item.id)}
          aria-label={`Remove item ${index + 1}`}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </SortableItem>
  );
});

// ===== Main Editor Component =====

export function FormattableItemEditor({
  items,
  actions,
  placeholder,
  itemLabel,
  emptyMessage,
  emptyDescription,
  emptyIcon,
}: FormattableItemEditorProps) {
  // Toast/dialog copy follows the caller's label: "Item" → item/items,
  // "Note" → note/notes.
  const singular = itemLabel.toLowerCase();
  const plural = `${singular}s`;

  const handleAdd = useCallback(() => {
    actions.addItem();
  }, [actions]);

  const clearAll = useCallback(() => {
    const snapshot = items;
    const count = snapshot.length;
    actions.clearAllItems?.();
    const message =
      count === 1 ? `${itemLabel} removed` : `${count} ${plural} removed`;
    if (actions.restoreItems) {
      const restore = actions.restoreItems;
      toastWithUndo(message, () => restore(snapshot));
    } else {
      toast.success(message);
    }
  }, [actions, items, itemLabel, plural]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !actions.reorderItems) return;

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        actions.reorderItems(oldIndex, newIndex);
      }
    },
    [actions, items]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header buttons appear once the list has items; an empty list
          shows its own Add button in the empty state. */}
      {items.length > 0 && (
        <CardHeaderActions>
          {actions.clearAllItems && (
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground hover:text-destructive-text"
              onClick={clearAll}
            >
              <Trash2 aria-hidden="true" />
              Clear all
            </Button>
          )}
          <Button variant="outline" size="xs" onClick={handleAdd}>
            <Plus aria-hidden="true" />
            Add {itemLabel}
          </Button>
        </CardHeaderActions>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <ListEmptyState
          icon={emptyIcon ?? ListPlus}
          title={emptyMessage}
          description={emptyDescription}
          addLabel={`Add ${itemLabel}`}
          onAdd={handleAdd}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  total={items.length}
                  actions={actions}
                  placeholder={placeholder}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Clear All confirmation */}
    </div>
  );
}
