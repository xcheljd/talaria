/**
 * DiscountEntriesEditor — Dynamic list of discount entries.
 *
 * Each entry has three fields: line (promotion line), collections, callout.
 * Supports add, remove, reorder (up/down), and collapse/expand per entry.
 * Shows summary text (the promotion line) when collapsed.
 * All mutations go through the Zustand promotion store.
 */

import { useCallback, type ChangeEvent } from 'react';
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePromotionStore,
  type PromotionEntry,
} from '@/stores/promotion-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ===== Single Entry Component =====

interface EntryItemProps {
  entry: PromotionEntry;
  index: number;
  total: number;
  isCollapsed: boolean;
}

function EntryItem({ entry, index, total, isCollapsed }: EntryItemProps) {
  const store = usePromotionStore();

  const handleChange = useCallback(
    (field: keyof Pick<PromotionEntry, 'line' | 'collections' | 'callout'>) =>
      (e: ChangeEvent<HTMLInputElement>) => {
        store.updatePromotionEntry(entry.id, field, e.target.value);
      },
    [store, entry.id]
  );

  const handleMoveUp = useCallback(() => {
    store.movePromotionEntryUp(entry.id);
  }, [store, entry.id]);

  const handleMoveDown = useCallback(() => {
    store.movePromotionEntryDown(entry.id);
  }, [store, entry.id]);

  const handleRemove = useCallback(() => {
    store.removePromotionEntry(entry.id);
  }, [store, entry.id]);

  const handleToggleCollapse = useCallback(() => {
    store.toggleEntryCollapse(entry.id);
  }, [store, entry.id]);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Summary text for collapsed state
  const summaryText = entry.line?.trim() || 'Entry not filled out';

  return (
    <div
      className={cn(
        'rounded-lg border bg-card transition-colors',
        isCollapsed && 'bg-muted/30'
      )}
      data-entry-id={entry.id}
      aria-label={`Discount entry ${index + 1}`}
    >
      {/* Entry Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleMoveUp}
              disabled={isFirst}
              aria-label={`Move entry ${index + 1} up`}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleMoveDown}
              disabled={isLast}
              aria-label={`Move entry ${index + 1} down`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Entry {index + 1}
          </span>
          {isCollapsed && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {summaryText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? 'Expand entry' : 'Collapse entry'}
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                !isCollapsed && 'rotate-90'
              )}
            />
            {isCollapsed ? 'Expand' : 'Collapse'}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleRemove}
            aria-label={`Remove entry ${index + 1}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Entry Fields (hidden when collapsed) */}
      {!isCollapsed && (
        <div className="grid gap-3 px-3 pb-3">
          <div className="space-y-1">
            <label
              htmlFor={`entry-${entry.id}-line`}
              className="text-xs font-medium"
            >
              Promotion Line *
            </label>
            <Input
              id={`entry-${entry.id}-line`}
              value={entry.line}
              onChange={handleChange('line')}
              placeholder="CITIZEN – ADDITIONAL 20% OFF"
              data-field="line"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`entry-${entry.id}-collections`}
              className="text-xs font-medium"
            >
              Collections (comma-separated)
            </label>
            <Input
              id={`entry-${entry.id}-collections`}
              value={entry.collections}
              onChange={handleChange('collections')}
              placeholder="Corso, Avion, Marine Star"
              data-field="collections"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`entry-${entry.id}-callout`}
              className="text-xs font-medium"
            >
              Special Callout (optional)
            </label>
            <Input
              id={`entry-${entry.id}-callout`}
              value={entry.callout}
              onChange={handleChange('callout')}
              placeholder="Final sale items excluded"
              data-field="callout"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Main Editor Component =====

export function DiscountEntriesEditor() {
  const store = usePromotionStore();
  const entries = store.promotionEntries;

  const handleAdd = useCallback(() => {
    store.addPromotionEntry();
  }, [store]);

  return (
    <div className="space-y-3">
      {/* Add Entry Button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add Entry
        </Button>
      </div>

      {/* Entry List */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          No discount entries yet. Click &quot;Add Entry&quot; to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <EntryItem
              key={entry.id}
              entry={entry}
              index={index}
              total={entries.length}
              isCollapsed={!!store.entryCollapsedStates[entry.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
