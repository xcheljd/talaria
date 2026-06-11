/**
 * Tests for ErrorBoundary component
 *
 * Covers:
 * - Error catching and fallback rendering
 * - App-level default fallback (full-screen, reload button)
 * - Route-level default fallback (inline, try again + go to home)
 * - Custom fallback prop (ReactNode and render function)
 * - resetErrorBoundary clears error state and re-renders children
 * - console.error logging with component stack
 * - Non-Error thrown values handled gracefully
 * - Children render normally when no error (transparent wrapper)
 * - Recovery flow: error → reset → successful re-render
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';

// Mock ResizeObserver for Radix components
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof globalThis.ResizeObserver;
  }
});

// ===== Test Helpers =====

/** Component that always throws during render */
function ThrowingComponent({ error }: { error: unknown }): React.ReactNode {
  throw error;
}

/** Component that renders normally */
function NormalComponent() {
  return <div data-testid="normal">Normal content</div>;
}

/**
 * Helper to wrap ErrorBoundary in MemoryRouter.
 * Required because the route-level fallback uses React Router's <Link>,
 * which needs a router context to render.
 */
function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // ===== VAL-COMP-001: Component is a valid React class component =====

  it('catches render errors and shows fallback', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Test error')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  // ===== VAL-COMP-002: Props API =====

  it('accepts level="app" prop', () => {
    render(
      <ErrorBoundary level="app">
        <ThrowingComponent error={new Error('App error')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Reload app')).toBeInTheDocument();
  });

  it('accepts level="route" prop (default)', () => {
    renderWithRouter(
      <ErrorBoundary level="route">
        <ThrowingComponent error={new Error('Route error')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Go to home')).toBeInTheDocument();
  });

  it('defaults to route level when level is not specified', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Default level')} />
      </ErrorBoundary>
    );

    // Route-level should show "Try again" and "Go to home"
    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Go to home')).toBeInTheDocument();
  });

  // ===== VAL-COMP-005: App-level fallback =====

  it('renders app-level fallback as full-screen centered card with reload button', () => {
    render(
      <ErrorBoundary level="app">
        <ThrowingComponent error={new Error('App crash')} />
      </ErrorBoundary>
    );

    // Verify heading
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    // Verify error message
    expect(screen.getByText('App crash')).toBeInTheDocument();
    // Verify reload button exists
    const reloadButton = screen.getByText('Reload app');
    expect(reloadButton).toBeInTheDocument();
    expect(reloadButton.tagName).toBe('BUTTON');
  });

  it('clicking Reload app button calls window.location.reload', () => {
    const reloadMock = vi.fn();
    const originalReload = window.location.reload;
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary level="app">
        <ThrowingComponent error={new Error('Reload test')} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reload app'));
    expect(reloadMock).toHaveBeenCalledTimes(1);

    // Restore
    Object.defineProperty(window, 'location', {
      value: { reload: originalReload },
      writable: true,
    });
  });

  // ===== VAL-COMP-006: Route-level fallback =====

  it('renders route-level fallback with Try again and Go to home', () => {
    renderWithRouter(
      <ErrorBoundary level="route">
        <ThrowingComponent error={new Error('Route crash')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Route crash')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Go to home')).toBeInTheDocument();
  });

  it('Go to home link navigates to / via React Router Link (client-side navigation)', () => {
    renderWithRouter(
      <ErrorBoundary level="route">
        <ThrowingComponent error={new Error('Nav test')} />
      </ErrorBoundary>
    );

    const homeLink = screen.getByText('Go to home');
    expect(homeLink).toBeInTheDocument();
    // React Router's Link renders an <a> tag with href="/"
    // but it uses client-side navigation — no full page reload
    expect(homeLink.tagName).toBe('A');
    expect(homeLink).toHaveAttribute('href', '/');
    // Verify the Link component is used by checking it has the onClick handler
    // that React Router injects for client-side navigation (prevents default)
    const anchorElement = homeLink as HTMLAnchorElement;
    expect(typeof anchorElement.onclick).toBe('function');
  });

  it('Go to home does not cause full page reload (uses client-side navigation)', () => {
    // Ensure window.location.reload is NOT called when clicking "Go to home"
    const reloadMock = vi.fn();
    const originalReload = window.location.reload;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    renderWithRouter(
      <ErrorBoundary level="route">
        <ThrowingComponent error={new Error('No reload test')} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Go to home'));
    // window.location.reload should NOT have been called — this is client-side nav
    expect(reloadMock).not.toHaveBeenCalled();

    // Restore
    Object.defineProperty(window, 'location', {
      value: { reload: originalReload },
      writable: true,
    });
  });

  // ===== VAL-COMP-003: resetErrorBoundary =====

  it('resetErrorBoundary clears error state and re-renders children', () => {
    let shouldThrow = true;

    function ControlledComponent() {
      if (shouldThrow) {
        throw new Error('Controlled error');
      }
      return <div data-testid="success">Success!</div>;
    }

    renderWithRouter(
      <ErrorBoundary level="route">
        <ControlledComponent />
      </ErrorBoundary>
    );

    // Error boundary should show fallback
    expect(screen.getByText('Controlled error')).toBeInTheDocument();
    expect(screen.queryByTestId('success')).not.toBeInTheDocument();

    // Fix the error condition
    shouldThrow = false;

    // Click "Try again" to reset
    fireEvent.click(screen.getByText('Try again'));

    // After reset, children should render successfully
    expect(screen.getByTestId('success')).toBeInTheDocument();
    expect(screen.queryByText('Controlled error')).not.toBeInTheDocument();
  });

  // ===== VAL-COMP-007: Custom fallback overrides default =====

  it('renders custom fallback ReactNode when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
        <ThrowingComponent error={new Error('Custom test')} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    // Default fallback should NOT be shown
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('renders custom fallback function with error and reset callback', () => {
    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div data-testid="custom-fn-fallback">
            <span data-testid="error-msg">{error.message}</span>
            <button data-testid="reset-btn" onClick={reset}>
              Custom Reset
            </button>
          </div>
        )}
      >
        <ThrowingComponent error={new Error('Fn fallback error')} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fn-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('error-msg')).toHaveTextContent('Fn fallback error');
    expect(screen.getByTestId('reset-btn')).toHaveTextContent('Custom Reset');
  });

  it('custom fallback function reset callback resets the boundary', () => {
    let shouldThrow = true;

    function ControlledComponent() {
      if (shouldThrow) {
        throw new Error('Reset test');
      }
      return <div data-testid="recovered-content">Recovered!</div>;
    }

    render(
      <ErrorBoundary
        fallback={(_error, reset) => (
          <button data-testid="custom-reset" onClick={reset}>
            Custom Reset
          </button>
        )}
      >
        <ControlledComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-reset')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByTestId('custom-reset'));

    expect(screen.getByTestId('recovered-content')).toBeInTheDocument();
  });

  // ===== VAL-COMP-008: Children render normally when no error =====

  it('renders children normally when no error occurs (transparent wrapper)', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('normal')).toBeInTheDocument();
    expect(screen.getByText('Normal content')).toBeInTheDocument();
    // No fallback elements should be present
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('does not call console.error when children render successfully', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  // ===== VAL-COMP-004: console.error logging =====

  it('logs error to console.error with component stack', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Logged error')} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();

    // Find the call from componentDidCatch (format string for multiple args)
    const componentDidCatchCall = consoleErrorSpy.mock.calls.find(
      (call: unknown[]) => call.length >= 2 && call[0] === 'ErrorBoundary caught an error:'
    );
    expect(componentDidCatchCall).toBeDefined();
    // Second argument should be the error object
    expect(componentDidCatchCall![1]).toBeInstanceOf(Error);
    expect((componentDidCatchCall![1] as Error).message).toBe('Logged error');
    // Third argument should be the component stack string
    expect(typeof componentDidCatchCall![2]).toBe('string');
    expect(componentDidCatchCall![2]).toContain('ThrowingComponent');
  });

  // ===== VAL-COMP-009: Non-Error thrown values =====

  it('handles string thrown as error gracefully', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowingComponent error="A string error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('A string error')).toBeInTheDocument();
  });

  it('handles undefined thrown as error gracefully', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowingComponent error={undefined} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
  });

  it('handles null thrown as error gracefully', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowingComponent error={null} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
  });

  it('handles number thrown as error gracefully', () => {
    renderWithRouter(
      <ErrorBoundary>
        <ThrowingComponent error={42} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
  });

  // ===== VAL-CROSS-003: Recovery flow =====

  it('supports full recovery flow: error → reset → successful render', () => {
    let shouldThrow = true;

    function RecoverableComponent() {
      if (shouldThrow) {
        throw new Error('First render error');
      }
      return <div data-testid="fully-recovered">Fully recovered!</div>;
    }

    renderWithRouter(
      <ErrorBoundary level="route">
        <RecoverableComponent />
      </ErrorBoundary>
    );

    // Should show fallback after first throw
    expect(screen.getByText('First render error')).toBeInTheDocument();

    // Fix the error condition
    shouldThrow = false;

    // Click "Try again" - second render succeeds
    fireEvent.click(screen.getByText('Try again'));

    // Should now show recovered content
    expect(screen.getByTestId('fully-recovered')).toBeInTheDocument();
  });

  // ===== Error persisting after reset =====

  it('shows fallback again if error persists after reset', () => {
    renderWithRouter(
      <ErrorBoundary level="route">
        <ThrowingComponent error={new Error('Persistent error')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Persistent error')).toBeInTheDocument();

    // Click "Try again" - but the error persists since ThrowingComponent always throws
    fireEvent.click(screen.getByText('Try again'));

    // Fallback should still be shown
    expect(screen.getByText('Persistent error')).toBeInTheDocument();
  });

  // ===== Theme compatibility =====

  it('app-level fallback uses Tailwind CSS variable classes for theming', () => {
    const { container } = render(
      <ErrorBoundary level="app">
        <ThrowingComponent error={new Error('Theme test')} />
      </ErrorBoundary>
    );

    // Check that the outer container uses theme-compatible classes
    const outerDiv = container.querySelector('.min-h-screen');
    expect(outerDiv).toBeInTheDocument();
    expect(outerDiv?.className).toContain('bg-background');
  });

  it('route-level fallback uses Tailwind CSS variable classes for theming', () => {
    const { container } = renderWithRouter(
      <ErrorBoundary level="route">
        <ThrowingComponent error={new Error('Theme test')} />
      </ErrorBoundary>
    );

    const card = container.querySelector('.bg-card');
    expect(card).toBeInTheDocument();
    expect(card?.className).toContain('border-border');
  });

  // ===== Error details in route-level fallback =====

  it('route-level fallback shows error details in collapsible section', () => {
    const error = new Error('Detailed error');
    error.stack = 'Error: Detailed error\n    at TestComponent (test.tsx:1:1)';

    renderWithRouter(
      <ErrorBoundary level="route">
        <ThrowingComponent error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error details')).toBeInTheDocument();
  });

  // ========================================
  // Component-level boundary tests (Tier 3)
  // ========================================

  describe('level="component"', () => {
    // ===== VAL-COMP-T3-001: level prop accepts "component" value =====

    it('accepts level="component" prop and renders a distinct fallback', () => {
      renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={new Error('Component error')} />
        </ErrorBoundary>
      );

      // Should render the compact component-level fallback
      expect(screen.getByText('Component error')).toBeInTheDocument();
      // Should NOT show the route-level or app-level fallback
      expect(screen.queryByText('Go to home')).not.toBeInTheDocument();
      expect(screen.queryByText('Reload app')).not.toBeInTheDocument();
    });

    // ===== VAL-COMP-T3-002: Compact inline error with Try again button =====

    it('renders compact fallback with error message and Try again button', () => {
      renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={new Error('Card crashed')} />
        </ErrorBoundary>
      );

      // Error message is displayed
      expect(screen.getByText('Card crashed')).toBeInTheDocument();
      // Try again button exists
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('does not render navigation links or full-screen layouts', () => {
      const { container } = renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={new Error('No nav test')} />
        </ErrorBoundary>
      );

      // No "Go to home" link
      expect(screen.queryByText('Go to home')).not.toBeInTheDocument();
      // No "Reload app" button
      expect(screen.queryByText('Reload app')).not.toBeInTheDocument();
      // No viewport-sized layouts
      expect(container.querySelector('.min-h-screen')).not.toBeInTheDocument();
      // No centered card wrapper (max-w-md is for route/app level)
      expect(container.querySelector('.max-w-md')).not.toBeInTheDocument();
      // No error details/stack
      expect(screen.queryByText('Error details')).not.toBeInTheDocument();
    });

    // ===== VAL-COMP-T3-003: Try again resets boundary =====

    it('Try again resets the boundary state and re-renders children', () => {
      let shouldThrow = true;

      function RecoverableCard() {
        if (shouldThrow) throw new Error('Transient card error');
        return <div data-testid="card-recovered">Card content</div>;
      }

      renderWithRouter(
        <ErrorBoundary level="component">
          <RecoverableCard />
        </ErrorBoundary>
      );

      // Fallback shown
      expect(screen.getByText('Transient card error')).toBeInTheDocument();
      expect(screen.queryByTestId('card-recovered')).not.toBeInTheDocument();

      // Fix the error
      shouldThrow = false;

      // Click Try again
      fireEvent.click(screen.getByText('Try again'));

      // Children re-render
      expect(screen.getByTestId('card-recovered')).toBeInTheDocument();
      expect(screen.queryByText('Transient card error')).not.toBeInTheDocument();
    });

    it('shows fallback again if error persists after Try again', () => {
      renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={new Error('Persistent card error')} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Persistent card error')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Try again'));

      // Still shows fallback because ThrowingComponent always throws
      expect(screen.getByText('Persistent card error')).toBeInTheDocument();
    });

    // ===== VAL-COMP-T3-004: CSS variable classes for theme compatibility =====

    it('uses CSS variable-based Tailwind classes for theming', () => {
      const { container } = renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={new Error('Theme check')} />
        </ErrorBoundary>
      );

      // The outer wrapper should use theme-compatible classes
      const wrapper = container.firstElementChild;
      expect(wrapper).toBeInTheDocument();
      // Check for CSS variable classes (not hardcoded colors)
      const allElements = container.querySelectorAll('*');
      const classList = Array.from(allElements)
        .flatMap((el) => Array.from(el.classList))
        .join(' ');

      // Should use CSS variable-based text colors
      expect(classList).toContain('text-muted-foreground');
      // Should use CSS variable-based button styling
      expect(classList).toContain('bg-primary');
      expect(classList).toContain('text-primary-foreground');
      // Should NOT use hardcoded colors
      expect(classList).not.toContain('text-red-500');
      expect(classList).not.toContain('bg-white');
      expect(classList).not.toContain('bg-gray-100');
    });

    it('fallback has no inline styles with hardcoded colors', () => {
      const { container } = renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={new Error('Inline style check')} />
        </ErrorBoundary>
      );

      const allElements = container.querySelectorAll('[style]');
      Array.from(allElements).forEach((el) => {
        const style = el.getAttribute('style') || '';
        // No hardcoded colors in inline styles
        expect(style).not.toMatch(/#[0-9a-fA-F]{3,6}/);
        expect(style).not.toMatch(/rgb\(/);
      });
    });

    // ===== VAL-COMP-T3-006: Custom fallback overrides component default =====

    it('custom fallback ReactNode overrides component-level default', () => {
      render(
        <ErrorBoundary
          level="component"
          fallback={<div data-testid="custom-component-fallback">Custom card error</div>}
        >
          <ThrowingComponent error={new Error('Override test')} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-component-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom card error')).toBeInTheDocument();
      expect(screen.queryByText('Override test')).not.toBeInTheDocument();
    });

    it('custom fallback function overrides component-level default', () => {
      render(
        <ErrorBoundary
          level="component"
          fallback={(error, reset) => (
            <div data-testid="custom-fn">
              <span>{error.message}</span>
              <button data-testid="custom-reset" onClick={reset}>Custom Reset</button>
            </div>
          )}
        >
          <ThrowingComponent error={new Error('Fn override')} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fn')).toBeInTheDocument();
      expect(screen.getByText('Fn override')).toBeInTheDocument();
      expect(screen.getByTestId('custom-reset')).toBeInTheDocument();
    });

    // ===== VAL-CROSS-T3-005: Logs to console.error =====

    it('logs error to console.error with component stack', () => {
      renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={new Error('Component log test')} />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      const componentDidCatchCall = consoleErrorSpy.mock.calls.find(
        (call: unknown[]) => call.length >= 2 && call[0] === 'ErrorBoundary caught an error:'
      );
      expect(componentDidCatchCall).toBeDefined();
      expect(componentDidCatchCall![1]).toBeInstanceOf(Error);
      expect((componentDidCatchCall![1] as Error).message).toBe('Component log test');
      expect(typeof componentDidCatchCall![2]).toBe('string');
      expect(componentDidCatchCall![2]).toContain('ThrowingComponent');
    });

    // ===== VAL-CROSS-T3-006: Non-Error thrown values =====

    it('handles string thrown as error gracefully', () => {
      renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error="string card error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('string card error')).toBeInTheDocument();
    });

    it('handles undefined thrown as error gracefully', () => {
      renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={undefined} />
        </ErrorBoundary>
      );

      expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
    });

    // ===== VAL-CONTAIN-005: Multiple boundaries are independent =====

    it('multiple component boundaries are independent', () => {
      renderWithRouter(
        <div>
          <ErrorBoundary level="component">
            <ThrowingComponent error={new Error('Error A')} />
          </ErrorBoundary>
          <ErrorBoundary level="component">
            <NormalComponent />
          </ErrorBoundary>
        </div>
      );

      // First boundary shows error
      expect(screen.getByText('Error A')).toBeInTheDocument();
      // Second boundary renders normally
      expect(screen.getByTestId('normal')).toBeInTheDocument();
    });

    it('resetting one component boundary does not affect another', () => {
      let shouldThrowA = true;

      function CardA() {
        if (shouldThrowA) throw new Error('Card A error');
        return <div data-testid="card-a-ok">Card A OK</div>;
      }

      renderWithRouter(
        <div>
          <ErrorBoundary level="component">
            <CardA />
          </ErrorBoundary>
          <ErrorBoundary level="component">
            <ThrowingComponent error={new Error('Card B error')} />
          </ErrorBoundary>
        </div>
      );

      // Both show errors
      expect(screen.getByText('Card A error')).toBeInTheDocument();
      expect(screen.getByText('Card B error')).toBeInTheDocument();

      // Fix Card A
      shouldThrowA = false;

      // Click Try again on Card A (first one)
      const tryAgainButtons = screen.getAllByText('Try again');
      fireEvent.click(tryAgainButtons[0]);

      // Card A recovers, Card B still shows error
      expect(screen.getByTestId('card-a-ok')).toBeInTheDocument();
      expect(screen.getByText('Card B error')).toBeInTheDocument();
    });

    // ===== Compact layout verification =====

    it('fallback is compact — no large headings or padding', () => {
      const { container } = renderWithRouter(
        <ErrorBoundary level="component">
          <ThrowingComponent error={new Error('Compact test')} />
        </ErrorBoundary>
      );

      // No heading elements (h1, h2)
      expect(container.querySelector('h1')).not.toBeInTheDocument();
      expect(container.querySelector('h2')).not.toBeInTheDocument();
      // No fixed/absolute positioning
      const allElements = container.querySelectorAll('*');
      Array.from(allElements).forEach((el) => {
        expect(el.className).not.toContain('fixed');
        expect(el.className).not.toContain('absolute');
      });
    });
  });
});
