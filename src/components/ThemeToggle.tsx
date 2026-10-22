import { Sun, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/ThemeProvider';
import { cn } from '@/lib/utils';

/**
 * Theme toggle component using shadcn Switch.
 * Toggles between light and dark mode.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Sun className="size-4 text-muted-foreground" />
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      />
      <Moon className="size-4 text-muted-foreground" />
    </div>
  );
}
