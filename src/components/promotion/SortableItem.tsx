/**
 * SortableItem — Reusable wrapper for @dnd-kit/sortable items.
 *
 * Provides drag handle connectivity, sortable context, and visual feedback
 * for any list item that needs drag-to-reorder behavior.
 * Uses React context to connect the DragHandle to the useSortable listeners.
 */

import { createContext, useContext, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getScrollBehavior } from '@/lib/ui-utils';

// ===== Context for connecting DragHandle to SortableItem =====

const SortableItemContext = createContext<ReturnType<
  typeof useSortable
> | null>(null);

// ===== Types =====

export interface SortableItemProps {
  /** Unique identifier for this sortable item */
  id: number | string;
  /** The content to render inside the sortable wrapper */
  children: React.ReactNode;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

// ===== Component =====

export function SortableItem({ id, children, className }: SortableItemProps) {
  const sortable = useSortable({ id });
  const localRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sortable.isDragging) {
      localRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: getScrollBehavior(),
      });
    }
  }, [sortable.isDragging]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <SortableItemContext value={sortable}>
      <div
        ref={(node) => {
          sortable.setNodeRef(node);
          (localRef as React.MutableRefObject<HTMLDivElement | null>).current =
            node;
        }}
        style={style}
        className={cn(
          'relative',
          sortable.isDragging && 'z-50 opacity-50',
          className
        )}
        {...sortable.attributes}
      >
        {children}
      </div>
    </SortableItemContext>
  );
}

// ===== Drag Handle =====

export interface DragHandleProps {
  /** Additional CSS classes */
  className?: string;
}

export function DragHandle({ className }: DragHandleProps) {
  const sortable = useContext(SortableItemContext);

  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center p-0 border-none bg-transparent',
        'text-muted-foreground hover:text-foreground',
        'cursor-grab active:cursor-grabbing touch-none',
        className
      )}
      aria-label="Drag to reorder"
      {...(sortable?.listeners ?? {})}
    >
      <GripVertical className="h-4 w-4 shrink-0" />
    </button>
  );
}
