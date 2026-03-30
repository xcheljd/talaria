/**
 * FormattableItemEditor — Reusable dynamic list with formatting toggles.
 *
 * Used for both How to Shop and Important Notes sections.
 * Each item has a text input and Bold/Italic/Underline formatting toggles.
 * Supports add, remove, reorder (up/down).
 * All mutations go through the Zustand promotion store.
 */

import { useCallback, type ChangeEvent } from 'react';
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Bold,
  Italic,
  Underline,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ===== Types =====

export interface FormattableItem {
  id: number;
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface FormattableItemActions {
  addItem: () => void;
  removeItem: (id: number) => void;
  updateItem: (id: number, text: string) => void;
  moveItemUp: (id: number) => void;
  moveItemDown: (id: number) => void;
  toggleFormat: (id: number, format: 'bold' | 'italic' | 'underline') => void;
}

export interface FormattableItemEditorProps {
  /** Items to render */
  items: FormattableItem[];
  /** Store actions for this list */
  actions: FormattableItemActions;
  /** Placeholder text for the input */
  placeholder: string;
  /** Label for "Add Item" button and aria */
  itemLabel: string;
  /** Empty state message */
  emptyMessage: string;
}

// ===== Format Button Component =====

interface FormatButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function FormatButton({ active, onClick, label, children }: FormatButtonProps) {
  return (
    <Button
      variant={active ? 'default' : 'ghost'}
      size="icon-xs"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      data-active={active || undefined}
      className={cn('h-6 w-6', active && 'bg-primary text-primary-foreground')}
    >
      {children}
    </Button>
  );
}

// ===== Single Item Component =====

interface ItemRowProps {
  item: FormattableItem;
  index: number;
  total: number;
  actions: FormattableItemActions;
  placeholder: string;
}

function ItemRow({ item, index, total, actions, placeholder }: ItemRowProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      actions.updateItem(item.id, e.target.value);
    },
    [actions, item.id]
  );

  return (
    <div
      className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
      data-item-id={item.id}
      aria-label={`${item.text || `Item ${index + 1}`}`}
    >
      {/* Drag handle */}
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />

      {/* Reorder buttons */}
      <div className="flex flex-col">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => actions.moveItemUp(item.id)}
          disabled={isFirst}
          aria-label={`Move ${index + 1} up`}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => actions.moveItemDown(item.id)}
          disabled={isLast}
          aria-label={`Move ${index + 1} down`}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {/* Text Input */}
      <div className="flex-1 min-w-0">
        <Input
          value={item.text}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="h-8 text-sm"
          data-field="text"
        />
      </div>

      {/* Format Toggle Buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <FormatButton
          active={item.bold}
          onClick={() => actions.toggleFormat(item.id, 'bold')}
          label="Toggle bold"
        >
          <Bold className="h-3 w-3" />
        </FormatButton>
        <FormatButton
          active={item.italic}
          onClick={() => actions.toggleFormat(item.id, 'italic')}
          label="Toggle italic"
        >
          <Italic className="h-3 w-3" />
        </FormatButton>
        <FormatButton
          active={item.underline}
          onClick={() => actions.toggleFormat(item.id, 'underline')}
          label="Toggle underline"
        >
          <Underline className="h-3 w-3" />
        </FormatButton>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => actions.removeItem(item.id)}
        aria-label={`Remove item ${index + 1}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ===== Main Editor Component =====

export function FormattableItemEditor({
  items,
  actions,
  placeholder,
  itemLabel,
  emptyMessage,
}: FormattableItemEditorProps) {
  const handleAdd = useCallback(() => {
    actions.addItem();
  }, [actions]);

  return (
    <div className="space-y-3">
      {/* Add Item Button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add {itemLabel}
        </Button>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              index={index}
              total={items.length}
              actions={actions}
              placeholder={placeholder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
