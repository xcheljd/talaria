/**
 * SpecialHoursEditor — Dynamic list of special hour rows.
 *
 * Each row has: day field and hours field.
 * Supports add, remove, reorder (up/down), and drag-to-reorder via @dnd-kit.
 * All mutations go through the Zustand promotion store.
 */

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
import { Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import {
  usePromotionStore,
  type SpecialHour,
  type PromotionState,
} from '@/stores/promotion-store';
import { Button } from '@/components/ui/button';
import { ClearableInput } from '@/components/ui/clearable-input';
import { SortableItem, DragHandle } from '@/components/promotion/SortableItem';

// List container slice: the array itself plus the actions the container needs
// directly (add + reorder). Rows never touch this — they subscribe per-row.
const selectHoursListState = (s: PromotionState) => ({
  specialHours: s.specialHours,
  addSpecialHour: s.addSpecialHour,
  reorderSpecialHours: s.reorderSpecialHours,
});

/**
 * Per-row slice. Rows subscribe only to their own hour object and the
 * (referentially stable) actions, so editing one row re-renders only that row.
 */
const useHourSlice = (id: number) =>
  usePromotionStore(
    useShallow((s) => ({
      hour: s.specialHours.find((h) => h.id === id),
      updateSpecialHour: s.updateSpecialHour,
      removeSpecialHour: s.removeSpecialHour,
      moveSpecialHourUp: s.moveSpecialHourUp,
      moveSpecialHourDown: s.moveSpecialHourDown,
    }))
  );

// ===== Single Hour Row Component =====

interface HourRowProps {
  id: number;
  index: number;
  total: number;
}

const HourRow = memo(function HourRow({ id, index, total }: HourRowProps) {
  const {
    hour,
    updateSpecialHour,
    removeSpecialHour,
    moveSpecialHourUp,
    moveSpecialHourDown,
  } = useHourSlice(id);

  const handleChange = useCallback(
    (field: keyof Pick<SpecialHour, 'day' | 'hours'>) => (val: string) => {
      updateSpecialHour(id, field, val);
    },
    [updateSpecialHour, id]
  );

  const handleMoveUp = useCallback(() => {
    moveSpecialHourUp(id);
  }, [moveSpecialHourUp, id]);

  const handleMoveDown = useCallback(() => {
    moveSpecialHourDown(id);
  }, [moveSpecialHourDown, id]);

  const handleRemove = useCallback(() => {
    removeSpecialHour(id);
  }, [removeSpecialHour, id]);

  // A row can briefly render with no hour while it is being removed: the
  // container drops it from the list in the same commit that unmounts it.
  if (!hour) return null;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <SortableItem id={hour.id}>
      <div
        className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
        data-hour-id={hour.id}
        aria-label={`Special hour row ${index + 1}`}
      >
        {/* Drag handle */}
        <DragHandle />

        {/* Reorder buttons */}
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleMoveUp}
            disabled={isFirst}
            aria-label={`Move hour ${index + 1} up`}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleMoveDown}
            disabled={isLast}
            aria-label={`Move hour ${index + 1} down`}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        {/* Day Field */}
        <div className="flex-1 min-w-0">
          <ClearableInput
            value={hour.day}
            onChange={handleChange('day')}
            placeholder="e.g., Friday Nov 29"
            className="h-8 text-sm"
            data-field="day"
            aria-label={`Day for special hour ${index + 1}`}
          />
        </div>

        {/* Hours Field */}
        <div className="flex-1 min-w-0">
          <ClearableInput
            value={hour.hours}
            onChange={handleChange('hours')}
            placeholder="e.g., 6AM–10PM or CLOSED"
            className="h-8 text-sm"
            data-field="hours"
            aria-label={`Hours for special hour ${index + 1}`}
          />
        </div>

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleRemove}
          aria-label={`Remove special hour ${index + 1}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </SortableItem>
  );
});

// ===== Main Editor Component =====

export function SpecialHoursEditor() {
  const store = usePromotionStore(useShallow(selectHoursListState));
  const hours = store.specialHours;

  const handleAdd = useCallback(() => {
    store.addSpecialHour();
  }, [store]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const hourIds = useMemo(() => hours.map((h) => h.id), [hours]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = hours.findIndex((h) => h.id === active.id);
      const newIndex = hours.findIndex((h) => h.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        store.reorderSpecialHours(oldIndex, newIndex);
      }
    },
    [store, hours]
  );

  return (
    <div className="space-y-3">
      {/* Add Hour Button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Hours
        </Button>
      </div>

      {/* Hours List */}
      {hours.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No special hours added yet. Click &quot;Add Hours&quot; to set special
          hours for the promotion period.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={hourIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {hours.map((hour, index) => (
                <HourRow
                  key={hour.id}
                  id={hour.id}
                  index={index}
                  total={hours.length}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
