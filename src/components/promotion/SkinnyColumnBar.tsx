/**
 * SkinnyColumnBar — Thin sidebar showing collapsed card titles with status dots.
 *
 * Appears when a column is collapsed. Clicking it expands that column.
 * Shows card titles with status dots for quick reference.
 */

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SkinnyCardInfo {
  cardId: string;
  title: string;
  hasContent: boolean;
}

export interface SkinnyColumnBarProps {
  /** Column label for aria */
  ariaLabel: string;
  /** Card titles and status for the skinny bar */
  cards: SkinnyCardInfo[];
  /** Whether this bar's column is currently expanded */
  isExpanded: boolean;
  /** Callback when the skinny bar is clicked to expand */
  onExpand: () => void;
}

export function SkinnyColumnBar({
  ariaLabel,
  cards,
  isExpanded,
  onExpand,
}: SkinnyColumnBarProps) {
  if (isExpanded) return null;

  return (
    <button
      type="button"
      className={cn(
        'flex h-full w-10 flex-col items-center gap-3 border-r bg-card py-4',
        'cursor-pointer transition-colors hover:bg-accent/50',
        'hidden lg:flex' /* Only show on large screens (>=1024px) */
      )}
      onClick={onExpand}
      aria-label={ariaLabel}
      aria-expanded={isExpanded}
    >
      {cards.map((card) => (
        <div
          key={card.cardId}
          className="flex flex-col items-center gap-1"
          data-card={card.cardId}
        >
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full transition-colors',
              card.hasContent
                ? 'bg-primary'
                : 'bg-muted-foreground/30'
            )}
            data-status={card.hasContent ? 'filled' : 'empty'}
            aria-hidden="true"
          />
          <span className="max-w-[2rem] text-center text-[10px] leading-tight text-muted-foreground [writing-mode:vertical-lr]">
            {card.title}
          </span>
        </div>
      ))}
      <ChevronRight className="mt-1 h-3 w-3 text-muted-foreground" />
    </button>
  );
}
