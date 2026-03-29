import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, User, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      localStorage.getItem('theme') === 'dark' ||
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
  });

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark((prev) => !prev)}
      className={cn(
        'relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDark ? 'bg-secondary' : 'bg-primary'
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle light/dark mode"
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
          isDark ? 'translate-x-7' : 'translate-x-1'
        )}
      >
        {isDark ? (
          <Moon className="h-5 w-5 p-0.5 text-foreground" />
        ) : (
          <Sun className="h-5 w-5 p-0.5 text-primary-foreground" />
        )}
      </span>
    </button>
  );
}

const navLinks = [
  { to: '/', label: 'Templates', icon: Layers },
  { to: '/start', label: 'Profile', icon: User },
] as const;

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Layers className="h-5 w-5" />
            <span className="font-bold">Template Generator</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map(({ to, label, icon: Icon }) => (
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
      <main>
        <Outlet />
      </main>
    </div>
  );
}
