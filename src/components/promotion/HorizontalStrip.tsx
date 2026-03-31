/**
 * HorizontalStrip — Horizontal navigation strip for mobile layout.
 *
 * Renders a horizontal row of card title buttons with status dots
 * for quick-jump navigation on screens < 1024px.
 *
 * Features:
 * - Horizontal scrollable strip (overflow-x-auto)
 * - Status dots (filled=has content, empty=no content)
 * - Group label on the left
 * - Tap to scroll to card and force-expand it
 */

import { cn } from '@/lib/utils';

export interface StripCardInfo {
  cardId: string;
  title: string;
  hasContent: boolean;
}

export interface HorizontalStripProps {
  /** Group label shown at the start of the strip */
  label: string;
  /** Card info items to render */
  cards: StripCardInfo[];
  /** Callback when a card title is tapped */
  onCardClick: (cardId: string) => void;
  /** Optional additional CSS class */
  className?: string;
}

export function HorizontalStrip({
  label,
  cards,
  onCardClick,
  className,
}: HorizontalStripProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 border-b bg-card px-3 py-2',
        className
      )}
      data-testid="horizontal-strip"
      role="navigation"
      aria-label={`${label} navigation`}
    >
      {/* Group label */}
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        data-testid="strip-label"
      >
        {label}
      </span>

      {/* Scrollable card buttons */}
      <div
        className="flex items-center gap-1 overflow-x-auto"
        data-testid="strip-cards"
      >
        {cards.map((card) => (
          <button
            key={card.cardId}
            type="button"
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1',
              'text-xs font-medium transition-colors',
              'hover:bg-accent/70 active:bg-accent',
              card.hasContent
                ? 'border-primary/30 bg-primary/5 text-foreground'
                : 'border-border bg-background text-muted-foreground'
            )}
            data-testid={`strip-card-${card.cardId}`}
            onClick={() => onCardClick(card.cardId)}
            aria-label={`Jump to ${card.title}`}
          >
            {/* Status dot */}
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                card.hasContent ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
              data-status={card.hasContent ? 'filled' : 'empty'}
              aria-hidden="true"
            />
            <span>{card.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
