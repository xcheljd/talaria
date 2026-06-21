import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDevMode } from '@/hooks/useDevMode';

const navLinks = [
  { to: '/', label: 'Templates', icon: Layers },
  { to: '/start', label: 'Profile', icon: User },
] as const;

// nav entries visible to regular users (dev mode off)
const regularNavLinks = [
  { to: '/start', label: 'Profile', icon: User },
] as const;

export function Layout() {
  const location = useLocation();
  const { devMode } = useDevMode();
  const links = devMode ? navLinks : regularNavLinks;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link
            to={devMode ? '/' : '/promotion'}
            className="mr-6 flex items-center space-x-2"
          >
            <Layers className="h-5 w-5" />
            <span className="font-bold">Template Generator</span>
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
