import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

export interface ClearableInputProps extends Omit<
  React.ComponentProps<'input'>,
  'onChange' | 'value'
> {
  /** Controlled value — X button is shown when truthy (non-empty / non-whitespace) */
  value?: string;
  /** Called with the new value on every keystroke */
  onChange?: (value: string) => void;
  /** Optional extra callback after the field is cleared */
  onClear?: () => void;
  /** Classes for the outer box (border tint, width). `className` styles the text control. */
  groupClassName?: string;
  /** Shown inside the box at the end, before the × (e.g. a character count). */
  trailing?: React.ReactNode;
}

/** Height utilities size the box, not the borderless control inside it. */
const HEIGHT = /^(?:h|min-h|max-h)-\S+$/;

/**
 * ClearableInput — shadcn `InputGroup` with an X clear button at the end.
 *
 * Works with both React Hook Form Controller (field.value / field.onChange) and
 * plain controlled inputs (useState). The X icon turns red on hover.
 */
export function ClearableInput({
  value,
  onChange,
  onClear,
  className,
  groupClassName,
  trailing,
  disabled,
  ...rest
}: ClearableInputProps) {
  const hasValue = !!value && value.trim().length > 0;
  const tokens = (className ?? '').split(/\s+/).filter(Boolean);
  const heights = tokens.filter((t) => HEIGHT.test(t));
  const control = tokens.filter((t) => !HEIGHT.test(t));

  const handleClear = () => {
    onChange?.('');
    onClear?.();
  };

  return (
    <InputGroup
      data-disabled={disabled || undefined}
      className={cn(heights, groupClassName)}
    >
      <InputGroupInput
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn('h-full', control)}
        {...rest}
      />
      {(trailing || (hasValue && !disabled)) && (
        <InputGroupAddon align="inline-end" className="gap-1">
          {trailing}
          {hasValue && !disabled && (
            <InputGroupButton
              size="icon-xs"
              className="text-muted-foreground hover:bg-transparent hover:text-destructive-text"
              onClick={handleClear}
              aria-label="Clear field"
            >
              <X aria-hidden="true" />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
