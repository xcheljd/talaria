/**
 * ResizablePanels — Generic split-pane component with drag handle.
 *
 * Supports vertical (side-by-side) and horizontal (stacked) orientations
 * using Pointer Events API for unified mouse+touch drag handling.
 *
 * Features:
 * - Configurable default/min/max split ratio (percentage)
 * - Optional per-panel pixel minimums (stricter than percentage constraints)
 * - Smooth resize via requestAnimationFrame batching
 * - Keyboard accessibility (role="separator", ARIA attributes, arrow keys, Home/End)
 * - Visual drag handle with hover/active states via Tailwind
 * - user-select: none on document.body during drag
 * - pointer-events: none on iframes during drag
 * - Clean event listener cleanup on unmount
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ===== Types =====

export interface ResizablePanelsProps {
  /** Panel content — exactly two children required */
  children: [React.ReactNode, React.ReactNode];
  /**
   * Layout orientation:
   * - 'vertical' = side-by-side panels with vertical divider (default)
   * - 'horizontal' = stacked panels with horizontal divider
   */
  orientation?: 'vertical' | 'horizontal';
  /** Default split position as percentage for first panel (default: 50) */
  defaultSplit?: number;
  /** Min percentage for first panel (default: 20) — alias: minSize */
  minSplit?: number;
  /** Max percentage for first panel (default: 80) — alias: maxSize */
  maxSplit?: number;
  /** Alias for minSplit */
  minSize?: number;
  /** Alias for maxSize */
  maxSize?: number;
  /** Optional minimum pixel sizes for [panel1, panel2] */
  minPx?: [number, number];
  /** Additional class name for the outer container */
  className?: string;
  /** Callback when split position changes */
  onSplitChange?: (split: number) => void;
}

// ===== Constants =====

const KEYBOARD_STEP = 2; // percentage per arrow key press

// ===== Component =====

export function ResizablePanels({
  children,
  orientation = 'vertical',
  defaultSplit = 50,
  minSplit: minSplitProp = 20,
  maxSplit: maxSplitProp = 80,
  minSize,
  maxSize,
  minPx,
  className,
  onSplitChange,
}: ResizablePanelsProps) {
  // Support both minSplit/maxSplit and minSize/maxSize aliases
  const minSplit = minSize ?? minSplitProp;
  const maxSplit = maxSize ?? maxSplitProp;
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Split position as percentage (first panel size)
  const [splitPercent, setSplitPercent] = React.useState(defaultSplit);

  // Drag state in refs to avoid re-renders during drag
  const isDraggingRef = React.useRef(false);
  const rafIdRef = React.useRef<number | null>(null);
  const pendingPercentRef = React.useRef<number>(splitPercent);

  // Keep latest callback in ref to avoid stale closures in document listeners
  const onSplitChangeRef = React.useRef(onSplitChange);
  onSplitChangeRef.current = onSplitChange;

  // ===== Compute effective constraints =====

  const getEffectiveConstraints = React.useCallback(() => {
    let effectiveMin = minSplit;
    let effectiveMax = maxSplit;

    const container = containerRef.current;
    if (container && minPx) {
      const rect = container.getBoundingClientRect();
      const totalSize = orientation === 'vertical' ? rect.width : rect.height;

      if (totalSize > 0) {
        // Panel 1 pixel minimum → raises the effective min
        if (minPx[0] > 0) {
          effectiveMin = Math.max(effectiveMin, (minPx[0] / totalSize) * 100);
        }
        // Panel 2 pixel minimum → lowers the effective max
        if (minPx[1] > 0) {
          const maxFromPx2 = ((totalSize - minPx[1]) / totalSize) * 100;
          effectiveMax = Math.min(effectiveMax, maxFromPx2);
        }
      }
    }

    return { effectiveMin, effectiveMax };
  }, [orientation, minSplit, maxSplit, minPx]);

  // ===== Clamp helper =====

  const clampPercent = React.useCallback(
    (percent: number) => {
      const { effectiveMin, effectiveMax } = getEffectiveConstraints();
      return Math.min(effectiveMax, Math.max(effectiveMin, percent));
    },
    [getEffectiveConstraints]
  );

  // Keep refs for document-level handlers
  const clampPercentRef = React.useRef(clampPercent);
  clampPercentRef.current = clampPercent;

  // ===== Calculate percent from pointer position =====

  const calcPercent = React.useCallback(
    (clientX: number, clientY: number): number => {
      const container = containerRef.current;
      if (!container) return defaultSplit;

      const rect = container.getBoundingClientRect();
      const isVertical = orientation === 'vertical';
      const totalSize = isVertical ? rect.width : rect.height;
      if (totalSize <= 0) return defaultSplit;

      return isVertical
        ? ((clientX - rect.left) / totalSize) * 100
        : ((clientY - rect.top) / totalSize) * 100;
    },
    [orientation, defaultSplit]
  );

  const calcPercentRef = React.useRef(calcPercent);
  calcPercentRef.current = calcPercent;

  // ===== Apply pending percent via rAF =====

  const flushRaf = React.useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    const percent = pendingPercentRef.current;
    setSplitPercent(percent);
    onSplitChangeRef.current?.(percent);
  }, []);

  const flushRafRef = React.useRef(flushRaf);
  flushRafRef.current = flushRaf;

  // ===== Document-level pointer handlers =====

  const handleDocPointerMove = React.useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return;

    const rawPercent = calcPercentRef.current(e.clientX, e.clientY);
    const clamped = clampPercentRef.current(rawPercent);

    // Batch via requestAnimationFrame for smooth performance
    pendingPercentRef.current = clamped;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        flushRafRef.current();
        rafIdRef.current = null;
      });
    }
  }, []);

  const handleDocPointerUp = React.useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      // Final position
      const rawPercent = calcPercentRef.current(e.clientX, e.clientY);
      const clamped = clampPercentRef.current(rawPercent);
      pendingPercentRef.current = clamped;

      // Flush any pending rAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setSplitPercent(clamped);
      onSplitChangeRef.current?.(clamped);

      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';

      // Restore iframe pointer events
      document.querySelectorAll('iframe').forEach((iframe) => {
        iframe.style.pointerEvents = '';
      });

      isDraggingRef.current = false;

      // Remove document-level listeners
      document.removeEventListener('pointermove', handleDocPointerMove);
      document.removeEventListener('pointerup', handleDocPointerUp);
    },
    [handleDocPointerMove]
  );

  // ===== Pointer Down handler =====

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();

      isDraggingRef.current = true;

      // Disable text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';

      // Disable pointer events on iframes
      document.querySelectorAll('iframe').forEach((iframe) => {
        iframe.style.pointerEvents = 'none';
      });

      // Attach document-level listeners
      document.addEventListener('pointermove', handleDocPointerMove);
      document.addEventListener('pointerup', handleDocPointerUp);
    },
    [handleDocPointerMove, handleDocPointerUp]
  );

  // ===== Keyboard Handler =====

  const clampedSplit = clampPercent(splitPercent);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let delta = 0;

      switch (e.key) {
        case 'ArrowRight':
          if (orientation === 'vertical') delta = KEYBOARD_STEP;
          break;
        case 'ArrowLeft':
          if (orientation === 'vertical') delta = -KEYBOARD_STEP;
          break;
        case 'ArrowDown':
          if (orientation === 'horizontal') delta = KEYBOARD_STEP;
          break;
        case 'ArrowUp':
          if (orientation === 'horizontal') delta = -KEYBOARD_STEP;
          break;
        case 'Home': {
          e.preventDefault();
          const minVal = clampPercentRef.current(minSplit);
          setSplitPercent(minVal);
          onSplitChangeRef.current?.(minVal);
          return;
        }
        case 'End': {
          e.preventDefault();
          const maxVal = clampPercentRef.current(maxSplit);
          setSplitPercent(maxVal);
          onSplitChangeRef.current?.(maxVal);
          return;
        }
        default:
          return;
      }

      if (delta !== 0) {
        e.preventDefault();
        const newPercent = clampPercent(clampedSplit + delta);
        setSplitPercent(newPercent);
        onSplitChangeRef.current?.(newPercent);
      }
    },
    [orientation, minSplit, maxSplit, clampPercent, clampedSplit]
  );

  // ===== Double-click reset handler =====

  const handleDoubleClick = React.useCallback(() => {
    const resetValue = defaultSplit;
    const clamped = clampPercent(resetValue);
    setSplitPercent(clamped);
    onSplitChangeRef.current?.(clamped);
  }, [defaultSplit, clampPercent]);

  // ===== Cleanup on unmount =====

  React.useEffect(() => {
    return () => {
      // Flush any pending rAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Restore body styles
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      // Restore iframe pointer events
      document.querySelectorAll('iframe').forEach((iframe) => {
        iframe.style.pointerEvents = '';
      });
      // Remove document-level listeners
      document.removeEventListener('pointermove', handleDocPointerMove);
      document.removeEventListener('pointerup', handleDocPointerUp);
      isDraggingRef.current = false;
    };
  }, [handleDocPointerMove, handleDocPointerUp]);

  // ===== Render =====

  const isVertical = orientation === 'vertical';

  const firstPanelStyle: React.CSSProperties = isVertical
    ? { width: `${clampedSplit}%` }
    : { height: `${clampedSplit}%` };

  const secondPanelStyle: React.CSSProperties = isVertical
    ? { width: `${100 - clampedSplit}%` }
    : { height: `${100 - clampedSplit}%` };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex',
        isVertical ? 'flex-row' : 'flex-col',
        'h-full w-full overflow-hidden',
        className
      )}
      data-testid="resizable-panels"
    >
      {/* First panel */}
      <div
        className={cn('overflow-auto', isVertical ? 'h-full' : 'w-full')}
        style={firstPanelStyle}
        data-testid="panel-first"
      >
        {children[0]}
      </div>

      {/* Drag handle / separator */}
      <div
        role="separator"
        aria-orientation={orientation}
        aria-valuenow={Math.round(clampedSplit)}
        aria-valuemin={minSplit}
        aria-valuemax={maxSplit}
        aria-label={`Resize panels`}
        tabIndex={0}
        className={cn(
          // Layout — touch target larger than visual bar
          'shrink-0 flex items-center justify-center relative',
          isVertical ? `h-full cursor-col-resize` : `w-full cursor-row-resize`,
          // Visual bar is 4px, touch target is HANDLE_SIZE via padding
          isVertical ? 'w-1 px-[4px]' : 'h-1 py-[4px]',
          // Colors
          'bg-border hover:bg-primary/50 active:bg-primary/70',
          'transition-colors',
          // Focus ring
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
        )}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        title="Double-click to reset"
      />

      {/* Second panel */}
      <div
        className={cn('overflow-auto', isVertical ? 'h-full' : 'w-full')}
        style={secondPanelStyle}
        data-testid="panel-second"
      >
        {children[1]}
      </div>
    </div>
  );
}
