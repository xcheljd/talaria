/**
 * Presentational toolbar primitives for the Newsletter editor: a toggle
 * button, a separator, and a color-picker trigger. No editor state lives here.
 */

import React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { shortcutKeys, shortcutLabel } from '@/lib/shortcut';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={active}
          data-active={active}
          className={cn(
            'size-7',
            active && 'bg-accent text-accent-foreground',
            className
          )}
          {...rest}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && (
          // One cap per key, in the OS's own symbols (⌘⇧7 on Mac).
          <KbdGroup aria-label={shortcutLabel(shortcut)}>
            {shortcutKeys(shortcut).map((k, i) => (
              <Kbd key={i} aria-hidden="true">
                {k}
              </Kbd>
            ))}
          </KbdGroup>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ===== Toolbar Separator =====

export function ToolbarSeparator() {
  return (
    <Separator
      orientation="vertical"
      className="mx-0.5 data-[orientation=vertical]:h-5"
    />
  );
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
  // The transparent <input type="color"> overlay handles mouse clicks directly;
  // the button only needs to forward keyboard activation to it, via a ref (no
  // global lookup, so the same label can appear in more than one toolbar).
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="relative flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label={label}
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </Button>
      <input
        ref={inputRef}
        type="color"
        value={color}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        onChange={(e) => onChange(e.target.value)}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
