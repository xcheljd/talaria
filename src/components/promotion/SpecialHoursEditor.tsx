/**
 * SpecialHoursEditor — Dynamic list of special hour rows.
 *
 * Each row has: day field and hours field.
 * Supports add, remove, reorder (up/down), and drag-to-reorder via @dnd-kit.
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

// Shared slice for both HourRow and the list component
const selectHoursState = (s: PromotionState) => ({
  specialHours: s.specialHours,
  addSpecialHour: s.addSpecialHour,
  removeSpecialHour: s.removeSpecialHour,
  updateSpecialHour: s.updateSpecialHour,
  moveSpecialHourUp: s.moveSpecialHourUp,
  moveSpecialHourDown: s.moveSpecialHourDown,
  reorderSpecialHours: s.reorderSpecialHours,
});

// ===== Single Hour Row Component =====

interface HourRowProps {
  hour: SpecialHour;
  index: number;
  total: number;
}

function HourRow({ hour, index, total }: HourRowProps) {
  const store = usePromotionStore(useShallow(selectHoursState));

  const handleChange = useCallback(
    (field: keyof Pick<SpecialHour, 'day' | 'hours'>) => (val: string) => {
      store.updateSpecialHour(hour.id, field, val);
    },
    [store, hour.id]
  );

  const handleMoveUp = useCallback(() => {
    store.moveSpecialHourUp(hour.id);
  }, [store, hour.id]);

  const handleMoveDown = useCallback(() => {
    store.moveSpecialHourDown(hour.id);
  }, [store, hour.id]);

  const handleRemove = useCallback(() => {
    store.removeSpecialHour(hour.id);
  }, [store, hour.id]);

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
}

// ===== Main Editor Component =====

export function SpecialHoursEditor() {
  const store = usePromotionStore(useShallow(selectHoursState));
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
                  hour={hour}
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
