/**
 * CollapsibleCard — A card with collapsible content and status dot indicator.
 *
 * Wraps shadcn Collapsible + Card to provide:
 * - Click-to-collapse/expand header with chevron animation
 * - Status dot (filled/empty) indicating whether the section has content
 * - Smooth content transitions via Radix Collapsible animations
 */

import { useState, useEffect, type ReactNode } from 'react';
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

  // Respond to external force-expand requests
  useEffect(() => {
    if (forceExpand && !isOpen) {
      setIsOpen(true);
    }
  }, [forceExpand, isOpen]);

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
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3">
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
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="rounded-md p-1 transition-colors hover:bg-accent"
            aria-label={isOpen ? `Collapse ${title}` : `Expand ${title}`}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpen ? 'rotate-180' : 'rotate-0'
              )}
            />
          </button>
        </CollapsibleTrigger>
      </div>

      {/* Card Content */}
      <CollapsibleContent>
        <div className="border-t px-4 py-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
