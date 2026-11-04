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
  /**
   * One-line value that only *wraps* visually. Enter is blocked and pasted
   * line breaks become spaces, so the editor never shows a break that the
   * output (e.g. the email HTML) would drop.
   */
  singleLine?: boolean;
}

/** True when the engine sizes textareas to their content natively. */
const supportsFieldSizing =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('field-sizing', 'content');

/**
 * ClearableTextarea — shadcn `InputGroup` around a textarea, with an X clear
 * button pinned to the top-right corner.
 *
 * Works with both React Hook Form Controller (field.value / field.onChange) and
 * plain controlled textareas (useState). The X icon turns red on hover.
 *
 * Grows with its content: natively via `field-sizing: content` (ui/textarea),
 * with a scrollHeight fallback for engines that lack it (older WebKit).
 */
export function ClearableTextarea({
  value,
  onChange,
  onClear,
  className,
  groupClassName,
  disabled,
  singleLine = false,
  onKeyDown,
  ref,
  ...rest
}: ClearableTextareaProps) {
  const hasValue = !!value && value.trim().length > 0;
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  // Fallback auto-grow where field-sizing isn't supported.
  React.useLayoutEffect(() => {
    if (supportsFieldSizing) return;
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

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
        ref={setRefs}
        value={value}
        onChange={(e) =>
          onChange?.(
            singleLine ? e.target.value.replace(/\r?\n/g, ' ') : e.target.value
          )
        }
        onKeyDown={(e) => {
          if (singleLine && e.key === 'Enter') e.preventDefault();
          onKeyDown?.(e);
        }}
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
