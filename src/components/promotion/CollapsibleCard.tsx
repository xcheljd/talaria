/**
 * CollapsibleCard — A card with collapsible content and status dot indicator.
 *
 * Wraps shadcn Collapsible + Card to provide:
 * - Click-to-collapse/expand header with chevron animation
 * - Status dot (filled/empty) indicating whether the section has content
 * - Smooth content transitions via Radix Collapsible animations
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface CollapsibleCardProps {
  /** Unique identifier for this card */
  cardId: string;
  /** Card title shown in the header */
  title: string;
  /** Whether the section has content (drives status dot state) */
  hasContent: boolean;
  /** Whether the card starts collapsed */
  defaultCollapsed?: boolean;
  /** When true, forces the card to expand (used by sidebar navigation) */
  forceExpand?: boolean;
  /** Card content (rendered inside the collapsible area) */
  children: ReactNode;
  /** Optional extra class name for the outer container */
  className?: string;
}

export function CollapsibleCard({
  cardId,
  title,
  hasContent,
  defaultCollapsed = false,
  forceExpand,
  children,
  className,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  // Respond to external force-expand requests (one-shot: only fires on true transition)
  const prevForceExpandRef = useRef(forceExpand);

  useEffect(() => {
    if (forceExpand && !prevForceExpandRef.current) {
      setIsOpen(true);
    }
    prevForceExpandRef.current = forceExpand;
  }, [forceExpand]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      data-card-id={cardId}
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm',
        className
      )}
    >
      {/* Card Header — entire row is clickable */}
      <CollapsibleTrigger asChild>
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-xl"
          role="button"
          tabIndex={0}
          aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
        >
          <div className="flex items-center gap-2">
            {/* Status Dot */}
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 rounded-full transition-colors',
                hasContent ? 'bg-primary' : 'bg-muted-foreground/30'
              )}
              data-status={hasContent ? 'filled' : 'empty'}
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold leading-none">{title}</h2>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isOpen ? 'rotate-180' : 'rotate-0'
            )}
          />
        </div>
      </CollapsibleTrigger>

      {/* Card Content */}
      <CollapsibleContent>
        <div className="border-t px-4 py-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
