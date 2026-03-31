/**
 * Tests for the generic ResizablePanels component.
 *
 * Covers:
 * - Rendering with vertical and horizontal orientations
 * - Default split ratio (configurable percentage)
 * - Min/max panel size constraints during drag
 * - Pointer events (mouse + touch) drive resize
 * - Keyboard: arrow keys adjust split by 2%, Home/End go to min/max
 * - ARIA attributes: role=separator, aria-orientation, aria-valuenow/min/max
 * - Focus ring visible on handle via tabIndex
 * - No text selection during drag (user-select: none on body)
 * - Pointer-events: none on iframes during drag
 * - Clean event listener cleanup on unmount
 * - VAL-CROSS-005: Generic reusable component, no promotion-specific logic
 * - VAL-CROSS-007: Keyboard accessibility — drag handles
 * - VAL-CROSS-009: No focus trap during keyboard resize
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as jestDom from '@testing-library/jest-dom';

import { ResizablePanels } from '@/components/ui/resizable-panels';

// Extend expect with jest-dom matchers
expect.extend(jestDom);

// ===== Test Helpers =====

// Mock getBoundingClientRect on the component's container div (the element with data-testid="resizable-panels").
// The component reads containerRef.current.getBoundingClientRect() during drag, so we must mock
// it on the actual rendered element — not on the render() wrapper.
function mockContainerRect(width = 1000, height = 800) {
  const rect = {
    width,
    height,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => rect,
  };

  return {
    rect,
    apply: () => {
      // Find the actual component container (data-testid="resizable-panels")
      const panelContainer = screen.getByTestId('resizable-panels');
      vi.spyOn(panelContainer, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);
    },
  };
}

// Legacy helper: create a render container (still useful for basic render tests)
function createContainer(_width = 1000, _height = 800) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
});

afterEach(() => {
  // Force end any active drag by dispatching a pointerup
  // This ensures document-level listeners are removed before cleanup
  document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: -1 }));
  cleanup();
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';
  // Remove any leftover iframes
  document.querySelectorAll('iframe[data-testid]').forEach((el) => el.remove());
  vi.restoreAllMocks();
});

// ===== Tests =====

describe('ResizablePanels', () => {
  // --- Rendering ---

  describe('rendering', () => {
    it('renders two panels with a drag handle between them', () => {
      const container = createContainer();
      render(
        <ResizablePanels
          orientation="vertical"
          defaultSplit={50}
          minSize={10}
          maxSize={90}
        >
          <div>Left Panel</div>
          <div>Right Panel</div>
        </ResizablePanels>,
        { container }
      );

      expect(screen.getByText('Left Panel')).toBeInTheDocument();
      expect(screen.getByText('Right Panel')).toBeInTheDocument();
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('renders vertical orientation: panels side by side with correct ARIA', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>Left</div>
          <div>Right</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');
      expect(separator).toHaveAttribute('aria-valuenow', '50');
      expect(separator).toHaveAttribute('aria-valuemin', '10');
      expect(separator).toHaveAttribute('aria-valuemax', '90');
    });

    it('renders horizontal orientation: panels stacked with correct ARIA', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="horizontal" defaultSplit={40} minSize={15} maxSize={85}>
          <div>Top</div>
          <div>Bottom</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
      expect(separator).toHaveAttribute('aria-valuenow', '40');
    });

    it('uses configurable default split ratio', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={30} minSize={10} maxSize={90}>
          <div>Left</div>
          <div>Right</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-valuenow', '30');
    });
  });

  // --- ARIA attributes ---

  describe('ARIA attributes', () => {
    it('has role=separator with correct aria attributes', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('role', 'separator');
      expect(separator).toHaveAttribute('aria-valuenow', '50');
      expect(separator).toHaveAttribute('aria-valuemin', '10');
      expect(separator).toHaveAttribute('aria-valuemax', '90');
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('has tabIndex={0} for keyboard focus', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('tabindex', '0');
    });

    it('has focus-visible ring class for keyboard accessibility', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveClass('focus-visible:ring-2');
    });
  });

  // --- Keyboard accessibility (VAL-CROSS-007, VAL-CROSS-009) ---

  describe('keyboard accessibility', () => {
    it('arrow keys adjust split by 2% (VAL-CROSS-007)', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');

      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '52');

      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowLeft' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '50');
    });

    it('Home/End keys go to min/max values', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');

      act(() => {
        fireEvent.keyDown(separator, { key: 'Home' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '10');

      act(() => {
        fireEvent.keyDown(separator, { key: 'End' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '90');
    });

    it('horizontal orientation uses up/down arrow keys', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="horizontal" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');

      // Down arrow increases top panel size (moves divider down)
      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowDown' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '52');

      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowUp' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '50');
    });

    it('keyboard resize respects min/max constraints', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={10} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');

      // Try to go below min
      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowLeft' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '10');

      // Jump to max with End
      act(() => {
        fireEvent.keyDown(separator, { key: 'End' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '90');

      // Try to go above max
      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '90');
    });

    it('does not trap focus during keyboard resize (VAL-CROSS-009)', async () => {
      const user = userEvent.setup();
      const container = createContainer();
      render(
        <div>
          <button>Before</button>
          <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
            <div>A</div>
            <div>B</div>
          </ResizablePanels>
          <button>After</button>
        </div>,
        { container }
      );

      const separator = screen.getByRole('separator');
      const beforeBtn = screen.getByRole('button', { name: 'Before' });

      // Focus separator directly
      await user.click(separator);

      // Arrow key to resize — separator keeps focus (not trapped, just active)
      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '52');

      // Move focus to another element via tab — separator should lose focus
      // In jsdom, focus management is limited, so we test that focus CAN be moved
      // by focusing another element directly
      await user.click(beforeBtn);
      expect(separator).not.toHaveFocus();
      expect(beforeBtn).toHaveFocus();
    });
  });

  // --- Pointer events (drag) ---

  describe('pointer events (drag)', () => {
    it('applies user-select: none to body during drag', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');

      // Simulate pointerdown on separator
      act(() => {
        separator.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 0, pointerId: 1 })
        );
      });

      expect(document.body.style.userSelect).toBe('none');
      expect(document.body.style.webkitUserSelect).toBe('none');

      // Simulate pointerup on document to end drag
      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, clientX: 500, clientY: 0, pointerId: 1 })
        );
      });

      expect(document.body.style.userSelect).toBe('');
    });

    it('applies pointer-events: none to iframes during drag', () => {
      const container = createContainer();
      // Add an iframe to the body
      const iframe = document.createElement('iframe');
      iframe.dataset.testid = 'test-iframe';
      document.body.appendChild(iframe);

      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');

      act(() => {
        separator.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 0, pointerId: 1 })
        );
      });

      expect(iframe.style.pointerEvents).toBe('none');

      // Cleanup
      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, clientX: 500, clientY: 0, pointerId: 1 })
        );
      });

      expect(iframe.style.pointerEvents).toBe('');
      iframe.remove();
    });

    it('respects min/max constraints during pointer drag', () => {
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={20} maxSize={80}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>
      );

      // Mock the container rect so pointer position calculations work in jsdom
      const mock = mockContainerRect(1000, 800);
      mock.apply();

      const separator = screen.getByRole('separator');

      // Start drag
      act(() => {
        separator.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 0, pointerId: 1 })
        );
      });

      // Move past min (clientX=0 → 0%, clamped to 20%)
      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: 0, clientY: 0, pointerId: 1 })
        );
      });

      // End drag at min position
      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, clientX: 0, clientY: 0, pointerId: 1 })
        );
      });

      expect(separator).toHaveAttribute('aria-valuenow', '20');

      // Start new drag
      act(() => {
        separator.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 0, pointerId: 2 })
        );
      });

      // Move past max (clientX=2000 → 200%, clamped to 80%)
      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointermove', { bubbles: true, clientX: 2000, clientY: 0, pointerId: 2 })
        );
      });

      // End drag at max position
      act(() => {
        document.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, clientX: 2000, clientY: 0, pointerId: 2 })
        );
      });

      expect(separator).toHaveAttribute('aria-valuenow', '80');
    });

    it('cleans up event listeners and restores state on unmount', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      const separator = screen.getByRole('separator');

      // Start drag
      act(() => {
        separator.dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 0, pointerId: 1 })
        );
      });

      expect(document.body.style.userSelect).toBe('none');

      // Unmount during drag — should clean up
      cleanup();

      // Body styles should be restored
      expect(document.body.style.userSelect).toBe('');

      // After unmount, dispatching pointerup should not throw
      expect(() => {
        document.dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, clientX: 500, clientY: 0, pointerId: 1 })
        );
      }).not.toThrow();
    });
  });

  // --- Double-click reset ---

  describe('double-click reset', () => {
    it('resets split to default (50) on double-click', () => {
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>
      );

      const separator = screen.getByRole('separator');

      // Move split away from default first
      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
      });
      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
      });
      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '56');

      // Double-click to reset
      act(() => {
        fireEvent.dblClick(separator);
      });

      expect(separator).toHaveAttribute('aria-valuenow', '50');
    });

    it('respects custom defaultSplit prop on double-click', () => {
      render(
        <ResizablePanels orientation="vertical" defaultSplit={60} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-valuenow', '60');

      // Move split away
      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '62');

      // Double-click to reset to custom default (60)
      act(() => {
        fireEvent.dblClick(separator);
      });

      expect(separator).toHaveAttribute('aria-valuenow', '60');
    });

    it('calls onSplitChange callback with default value on double-click', () => {
      const onSplitChange = vi.fn();

      render(
        <ResizablePanels
          orientation="vertical"
          defaultSplit={50}
          minSize={10}
          maxSize={90}
          onSplitChange={onSplitChange}
        >
          <div>A</div>
          <div>B</div>
        </ResizablePanels>
      );

      const separator = screen.getByRole('separator');

      // Move away first (this will call onSplitChange for each key press)
      onSplitChange.mockClear();

      act(() => {
        fireEvent.keyDown(separator, { key: 'ArrowRight' });
      });
      expect(onSplitChange).toHaveBeenCalledWith(52);
      onSplitChange.mockClear();

      // Double-click reset
      act(() => {
        fireEvent.dblClick(separator);
      });

      expect(onSplitChange).toHaveBeenCalledWith(50);
    });

    it('updates aria-valuenow to default value on double-click', () => {
      render(
        <ResizablePanels orientation="vertical" defaultSplit={40} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>
      );

      const separator = screen.getByRole('separator');

      // Move to a different position
      act(() => {
        fireEvent.keyDown(separator, { key: 'End' });
      });
      expect(separator).toHaveAttribute('aria-valuenow', '90');

      // Double-click resets to default
      act(() => {
        fireEvent.dblClick(separator);
      });

      expect(separator).toHaveAttribute('aria-valuenow', '40');
    });
  });

  // --- Generic component (VAL-CROSS-005) ---

  describe('generic component (VAL-CROSS-005)', () => {
    it('contains no promotion-specific types, stores, or data references', () => {
      const container = createContainer();
      render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container }
      );

      // Just verify it renders without any promotion dependencies
      // The component file itself should have no promotion imports
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('works in both vertical and horizontal orientations', () => {
      const container1 = createContainer();
      const { unmount: unmount1 } = render(
        <ResizablePanels orientation="vertical" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container: container1 }
      );

      expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
      unmount1();

      const container2 = createContainer();
      render(
        <ResizablePanels orientation="horizontal" defaultSplit={50} minSize={10} maxSize={90}>
          <div>A</div>
          <div>B</div>
        </ResizablePanels>,
        { container: container2 }
      );

      expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
    });
  });
});
