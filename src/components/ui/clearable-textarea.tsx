import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

export interface ClearableTextareaProps
  extends Omit<React.ComponentProps<'textarea'>, 'onChange' | 'value'> {
  /** Controlled value — X button is shown when truthy (non-empty / non-whitespace) */
  value?: string;
  /** Called with the new value on every keystroke */
  onChange?: (value: string) => void;
  /** Optional extra callback after the field is cleared */
  onClear?: () => void;
}

/**
 * ClearableTextarea — wraps the shadcn `Textarea` with an X clear button.
 *
 * Works with both React Hook Form Controller (field.value / field.onChange) and
 * plain controlled textareas (useState). The X icon turns red on hover.
 */
export function ClearableTextarea({
  value,
  onChange,
  onClear,
  className,
  ...rest
}: ClearableTextareaProps) {
  const hasValue = !!value && value.trim().length > 0;

  const handleClear = () => {
    onChange?.('');
    onClear?.();
  };

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn('pr-8', className)}
        {...rest}
      />
      {hasValue && (
        <button
          type="button"
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive"
          onClick={handleClear}
          aria-label="Clear field"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
