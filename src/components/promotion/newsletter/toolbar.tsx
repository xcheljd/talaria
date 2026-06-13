/**
 * Presentational toolbar primitives for the Newsletter editor: a toggle
 * button, a separator, and a color-picker trigger. No editor state lives here.
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ===== Toolbar Button =====

interface ToolbarButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  'children'
> {
  active: boolean;
  label: string;
  children: React.ReactNode;
  shortcut?: string;
}

export function ToolbarButton({
  active,
  label,
  children,
  shortcut,
  className,
  ref,
  ...rest
}: ToolbarButtonProps) {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      data-active={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        'h-7 w-7',
        active && 'bg-accent text-accent-foreground',
        className
      )}
      {...rest}
    >
      {children}
    </Button>
  );
}

// ===== Toolbar Separator =====

export function ToolbarSeparator() {
  return <div className="mx-0.5 h-5 w-px bg-border" />;
}

// ===== Color Input =====

interface ColorInputProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
  children: React.ReactNode;
}

export function ColorInput({
  label,
  color,
  onChange,
  children,
}: ColorInputProps) {
  return (
    <div className="relative flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label={label}
        tabIndex={0}
        onClick={() => {
          // Trigger the hidden color input
          const input = document.querySelector(
            `[data-color-input="${label}"]`
          ) as HTMLInputElement;
          input?.click();
        }}
      >
        {children}
      </Button>
      <input
        type="color"
        value={color}
        data-color-input={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => onChange(e.target.value)}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
