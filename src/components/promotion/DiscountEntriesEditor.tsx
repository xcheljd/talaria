/**
 * DiscountEntriesEditor — Dynamic list of discount entries.
 *
 * Each entry has three fields: line (promotion line), collections, callout.
 * Supports add, remove, reorder (up/down), drag-to-reorder via @dnd-kit,
 * and collapse/expand per entry.
 * Shows summary text (the promotion line) when collapsed.
 * All mutations go through the Zustand promotion store.
 */

import { useCallback, useMemo } from 'react';
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
import { Plus, X, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShallow } from 'zustand/react/shallow';

import {
  usePromotionStore,
  type PromotionEntry,
  type PromotionState,
} from '@/stores/promotion-store';
import { Button } from '@/components/ui/button';
import { ClearableInput } from '@/components/ui/clearable-input';
import { SortableItem, DragHandle } from '@/components/promotion/SortableItem';

// Shared slice for both EntryItem and the list component
const selectEntryState = (s: PromotionState) => ({
  promotionEntries: s.promotionEntries,
  entryCollapsedStates: s.entryCollapsedStates,
  addPromotionEntry: s.addPromotionEntry,
  removePromotionEntry: s.removePromotionEntry,
  updatePromotionEntry: s.updatePromotionEntry,
  movePromotionEntryUp: s.movePromotionEntryUp,
  movePromotionEntryDown: s.movePromotionEntryDown,
  reorderPromotionEntries: s.reorderPromotionEntries,
  toggleEntryCollapse: s.toggleEntryCollapse,
});

// ===== Single Entry Component =====

interface EntryItemProps {
  entry: PromotionEntry;
  index: number;
  total: number;
  isCollapsed: boolean;
}

function EntryItem({ entry, index, total, isCollapsed }: EntryItemProps) {
  const store = usePromotionStore(useShallow(selectEntryState));

  const handleChange = useCallback(
    (field: keyof Pick<PromotionEntry, 'line' | 'collections' | 'callout'>) =>
      (val: string) => {
        store.updatePromotionEntry(entry.id, field, val);
      },
    [store, entry.id]
  );

  const handleMoveUp = useCallback(() => {
    store.movePromotionEntryUp(entry.id);
  }, [store, entry.id]);

  const handleMoveDown = useCallback(() => {
    store.movePromotionEntryDown(entry.id);
  }, [store, entry.id]);

  const handleRemove = useCallback(() => {
    store.removePromotionEntry(entry.id);
  }, [store, entry.id]);

  const handleToggleCollapse = useCallback(() => {
    store.toggleEntryCollapse(entry.id);
  }, [store, entry.id]);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Summary text for collapsed state
  const summaryText = entry.line?.trim() || 'Entry not filled out';

  return (
    <SortableItem id={entry.id}>
      <div
        className={cn(
          'rounded-lg border bg-card transition-colors',
          isCollapsed && 'bg-muted/30'
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
            {isCollapsed && (
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
              aria-label={isCollapsed ? 'Expand entry' : 'Collapse entry'}
            >
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  !isCollapsed && 'rotate-90'
                )}
              />
              {isCollapsed ? 'Expand' : 'Collapse'}
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
        {!isCollapsed && (
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
                placeholder="CITIZEN – ADDITIONAL 20% OFF"
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
                placeholder="Corso, Avion, Marine Star"
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
}

// ===== Main Editor Component =====

export function DiscountEntriesEditor() {
  const store = usePromotionStore(useShallow(selectEntryState));
  const entries = store.promotionEntries;

  const handleAdd = useCallback(() => {
    store.addPromotionEntry();
  }, [store]);

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
      {/* Add Entry Button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Entry
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
                  entry={entry}
                  index={index}
                  total={entries.length}
                  isCollapsed={!!store.entryCollapsedStates[entry.id]}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
