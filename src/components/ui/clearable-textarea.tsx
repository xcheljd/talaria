import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';

export interface ClearableTextareaProps extends Omit<
  React.ComponentProps<'textarea'>,
  'onChange' | 'value'
> {
  /** Controlled value — X button is shown when truthy (non-empty / non-whitespace) */
  value?: string;
  /** Called with the new value on every keystroke */
  onChange?: (value: string) => void;
  /** Optional extra callback after the field is cleared */
  onClear?: () => void;
  /** Classes for the outer box (border tint, width). `className` styles the textarea. */
  groupClassName?: string;
}

/**
 * ClearableTextarea — shadcn `InputGroup` around a textarea, with an X clear
 * button pinned to the top-right corner.
 *
 * Works with both React Hook Form Controller (field.value / field.onChange) and
 * plain controlled textareas (useState). The X icon turns red on hover.
 */
export function ClearableTextarea({
  value,
  onChange,
  onClear,
  className,
  groupClassName,
  disabled,
  ...rest
}: ClearableTextareaProps) {
  const hasValue = !!value && value.trim().length > 0;

  const handleClear = () => {
    onChange?.('');
    onClear?.();
  };

  return (
    <InputGroup
      data-disabled={disabled || undefined}
      className={cn('items-start', groupClassName)}
    >
      <InputGroupTextarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn('py-2', className)}
        {...rest}
      />
      {hasValue && !disabled && (
        <InputGroupAddon align="inline-end" className="self-start py-1.5">
          <InputGroupButton
            size="icon-xs"
            className="text-muted-foreground hover:bg-transparent hover:text-destructive-text"
            onClick={handleClear}
            aria-label="Clear field"
          >
            <X aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
