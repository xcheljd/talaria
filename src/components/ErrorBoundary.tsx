import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: ReactNode;
  level?: 'app' | 'route';
  fallback?:
    | ReactNode
    | ((error: Error, resetErrorBoundary: () => void) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    // Normalize non-Error thrown values into proper Error objects
    const normalizedError =
      error instanceof Error
        ? error
        : new Error(
            typeof error === 'string' ? error : 'An unknown error occurred'
          );

    return { hasError: true, error: normalizedError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      error,
      errorInfo.componentStack
    );
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Custom fallback prop overrides defaults
      if (this.props.fallback !== undefined) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.resetErrorBoundary);
        }
        return this.props.fallback;
      }

      // Default fallbacks based on level
      const level = this.props.level ?? 'route';
      if (level === 'app') {
        return this.renderAppFallback(this.state.error);
      }
      return this.renderRouteFallback(this.state.error);
    }

    return this.props.children;
  }

  private renderAppFallback(error: Error): ReactNode {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }

  private renderRouteFallback(error: Error): ReactNode {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{error.message}</p>
          <details className="mb-4">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Error details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto text-xs text-muted-foreground">
              {error.stack}
            </pre>
          </details>
          <div className="flex gap-3">
            <button
              onClick={this.resetErrorBoundary}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
            <Link
              to="/"
              className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Go to home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
