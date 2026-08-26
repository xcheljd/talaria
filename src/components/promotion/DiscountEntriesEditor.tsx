/**
 * DiscountEntriesEditor — Dynamic list of discount entries.
 *
 * Each entry has three fields: line (promotion line), collections, callout.
 * Supports add, remove, reorder (up/down), drag-to-reorder via @dnd-kit,
 * and collapse/expand per entry.
 * Shows summary text (the promotion line) when collapsed.
 * All mutations go through the Zustand promotion store.
 */

import { memo, useCallback, useMemo, useState } from 'react';
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
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';

import {
  usePromotionStore,
  type PromotionEntry,
  type PromotionState,
} from '@/stores/promotion-store';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClearableInput } from '@/components/ui/clearable-input';
import { SortableItem, DragHandle } from '@/components/promotion/SortableItem';

// List container slice: the array itself plus the actions the container needs
// directly (add + reorder). Rows never touch this — they subscribe per-row.
const selectEntryListState = (s: PromotionState) => ({
  promotionEntries: s.promotionEntries,
  addPromotionEntry: s.addPromotionEntry,
  reorderPromotionEntries: s.reorderPromotionEntries,
  clearPromotionEntries: s.clearPromotionEntries,
});

/**
 * Per-row slice. Rows subscribe only to their own entry object, their own
 * collapse flag, and the (referentially stable) actions. `useShallow` keeps
 * the slice identity stable across edits to other rows, so editing entry N
 * re-renders only entry N instead of every row.
 */
const useEntrySlice = (id: number) =>
  usePromotionStore(
    useShallow((s) => ({
      entry: s.promotionEntries.find((e) => e.id === id),
      collapsed: !!s.entryCollapsedStates[id],
      updatePromotionEntry: s.updatePromotionEntry,
      removePromotionEntry: s.removePromotionEntry,
      movePromotionEntryUp: s.movePromotionEntryUp,
      movePromotionEntryDown: s.movePromotionEntryDown,
      toggleEntryCollapse: s.toggleEntryCollapse,
    }))
  );

// ===== Single Entry Component =====

interface EntryItemProps {
  id: number;
  index: number;
  total: number;
}

const EntryItem = memo(function EntryItem({
  id,
  index,
  total,
}: EntryItemProps) {
  const {
    entry,
    collapsed,
    updatePromotionEntry,
    removePromotionEntry,
    movePromotionEntryUp,
    movePromotionEntryDown,
    toggleEntryCollapse,
  } = useEntrySlice(id);

  const handleChange = useCallback(
    (field: keyof Pick<PromotionEntry, 'line' | 'collections' | 'callout'>) =>
      (val: string) => {
        updatePromotionEntry(id, field, val);
      },
    [updatePromotionEntry, id]
  );

  const handleMoveUp = useCallback(() => {
    movePromotionEntryUp(id);
  }, [movePromotionEntryUp, id]);

  const handleMoveDown = useCallback(() => {
    movePromotionEntryDown(id);
  }, [movePromotionEntryDown, id]);

  const handleRemove = useCallback(() => {
    removePromotionEntry(id);
  }, [removePromotionEntry, id]);

  const handleToggleCollapse = useCallback(() => {
    toggleEntryCollapse(id);
  }, [toggleEntryCollapse, id]);

  // A row can briefly render with no entry while it is being removed: the
  // container drops it from the list in the same commit that unmounts it.
  if (!entry) return null;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Summary text for collapsed state
  const summaryText = entry.line?.trim() || 'Entry not filled out';

  return (
    <SortableItem id={entry.id}>
      <div
        className={cn(
          'rounded-lg border bg-card transition-colors',
          collapsed && 'bg-muted/30'
        )}
        data-entry-id={entry.id}
        aria-label={`Discount entry ${index + 1}`}
      >
        {/* Entry Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <DragHandle />
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleMoveUp}
                disabled={isFirst}
                aria-label={`Move entry ${index + 1} up`}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleMoveDown}
                disabled={isLast}
                aria-label={`Move entry ${index + 1} down`}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Entry {index + 1}
            </span>
            {collapsed && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {summaryText}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="xs"
              onClick={handleToggleCollapse}
              aria-label={collapsed ? 'Expand entry' : 'Collapse entry'}
            >
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  !collapsed && 'rotate-90'
                )}
              />
              {collapsed ? 'Expand' : 'Collapse'}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleRemove}
              aria-label={`Remove entry ${index + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Entry Fields (hidden when collapsed) */}
        {!collapsed && (
          <div className="grid gap-3 px-3 pb-3">
            <div className="space-y-1">
              <label
                htmlFor={`entry-${entry.id}-line`}
                className="text-xs font-medium"
              >
                Promotion Line *
              </label>
              <ClearableInput
                id={`entry-${entry.id}-line`}
                value={entry.line}
                onChange={handleChange('line')}
                placeholder="BRAND – ADDITIONAL 20% OFF"
                data-field="line"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`entry-${entry.id}-collections`}
                className="text-xs font-medium"
              >
                Collections (comma-separated)
              </label>
              <ClearableInput
                id={`entry-${entry.id}-collections`}
                value={entry.collections}
                onChange={handleChange('collections')}
                placeholder="Collection A, Collection B"
                data-field="collections"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`entry-${entry.id}-callout`}
                className="text-xs font-medium"
              >
                Special Callout (optional)
              </label>
              <ClearableInput
                id={`entry-${entry.id}-callout`}
                value={entry.callout}
                onChange={handleChange('callout')}
                placeholder="Final sale items excluded"
                data-field="callout"
              />
            </div>
          </div>
        )}
      </div>
    </SortableItem>
  );
});

// ===== Main Editor Component =====

export function DiscountEntriesEditor() {
  const store = usePromotionStore(useShallow(selectEntryListState));
  const entries = store.promotionEntries;

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleAdd = useCallback(() => {
    store.addPromotionEntry();
  }, [store]);

  const clearAll = useCallback(() => {
    const count = entries.length;
    store.clearPromotionEntries();
    toast.success(count === 1 ? 'Entry removed' : `${count} entries removed`);
  }, [store, entries]);

  // Clearing several entries at once is destructive and can't be undone, so
  // confirm first. A single entry is cheap to re-add, so it clears directly.
  const handleClearAll = useCallback(() => {
    if (entries.length >= 2) {
      setConfirmClearOpen(true);
      return;
    }
    clearAll();
  }, [entries, clearAll]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const entryIds = useMemo(() => entries.map((e) => e.id), [entries]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = entries.findIndex((e) => e.id === active.id);
      const newIndex = entries.findIndex((e) => e.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        store.reorderPromotionEntries(oldIndex, newIndex);
      }
    },
    [store, entries]
  );

  return (
    <div className="space-y-3">
      {/* Add Entry + Clear All Buttons */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Entry
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 flex-shrink-0 gap-1 text-xs text-muted-foreground hover:text-destructive"
          onClick={handleClearAll}
          disabled={entries.length === 0}
        >
          <Trash2 className="h-3 w-3" />
          Clear all
        </Button>
      </div>

      {/* Entry List */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No discount entries yet. Click &quot;Add Entry&quot; to get started.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={entryIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <EntryItem
                  key={entry.id}
                  id={entry.id}
                  index={index}
                  total={entries.length}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Clear All confirmation */}
      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all discount entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {entries.length} discount entries from this
              promotion and cannot be undone. You&apos;ll need to add them
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearAll}>Clear all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
