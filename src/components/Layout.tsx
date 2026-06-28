import { Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDevMode } from '@/hooks/useDevMode';

const navLinks = [
  { to: '/', label: 'Templates', icon: Layers },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
] as const;

// nav entries visible to regular users (dev mode off)
const regularNavLinks = [
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
] as const;

export function Layout() {
  const location = useLocation();
  const { devMode } = useDevMode();
  const links = devMode ? navLinks : regularNavLinks;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Header — solid background on purpose: a translucent `backdrop-blur`
          here forces WebKit (Tauri's WKWebView) to recompute the blur every
          frame as the content scrolls beneath it, which jank's scrolling. */}
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link
            to={devMode ? '/' : '/promotion'}
            className="mr-6 flex items-center space-x-2"
          >
            <Layers className="h-5 w-5" />
            <span className="font-bold">CometCast</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center space-x-1 transition-colors hover:text-foreground/80',
                  location.pathname === to
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
            <Link
              to="/promotion"
              className={cn(
                'flex items-center space-x-1 transition-colors hover:text-foreground/80',
                location.pathname === '/promotion'
                  ? 'text-foreground'
                  : 'text-foreground/60'
              )}
            >
              <Layers className="h-4 w-4" />
              <span>Promotions</span>
            </Link>
          </nav>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content. Routes are code-split (React.lazy), so the header/nav
          stay painted while the page chunk loads. */}
      <main className="flex-1 overflow-auto">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
