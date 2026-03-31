/**
 * SidebarBar — Thin sidebar showing card titles with status dots.
 *
 * Two modes:
 * 1. **Collapsed-column mode** (legacy): shows one column's cards with a chevron,
 *    used when a column is collapsed and can be expanded.
 * 2. **Desktop mode** (new): shows BOTH columns' cards grouped together,
 *    with an active indicator on the currently visible column's group.
 *    Always visible on desktop alongside the active column + preview.
 */

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarCardInfo {
  cardId: string;
  title: string;
  hasContent: boolean;
}

/** A group of cards belonging to one column */
export interface SidebarCardGroup {
  /** Column key for identification */
  columnKey: string;
  /** Human-readable label for the group */
  label: string;
  /** Whether this column is currently active */
  isActive: boolean;
  /** Cards in this group */
  cards: SidebarCardInfo[];
}

export interface SidebarBarProps {
  /** Column label for aria (used in collapsed-column mode) */
  ariaLabel?: string;
  /** Card titles and status for the sidebar bar (used in collapsed-column mode) */
  cards?: SidebarCardInfo[];
  /** Whether this bar's column is currently expanded (used in collapsed-column mode) */
  isExpanded?: boolean;
  /** Callback when the sidebar bar is clicked to expand. Accepts optional cardId to scroll to a specific card. */
  onExpand?: (cardId?: string) => void;

  /** Card groups for desktop dual-column mode */
  groups?: SidebarCardGroup[];
  /** Callback when a card is clicked in desktop mode: (columnKey, cardId) */
  onCardClick?: (columnKey: string, cardId: string) => void;

  /** Render mode: 'desktop' for always-visible grouped sidebar, 'collapsed' for legacy collapsed-column sidebar */
  mode?: 'desktop' | 'collapsed';
}

// ===== Desktop mode sidebar =====

function DesktopSidebar({
  groups,
  onCardClick,
}: {
  groups: SidebarCardGroup[];
  onCardClick?: (columnKey: string, cardId: string) => void;
}) {
  return (
    <nav
      className={cn(
        'flex h-full w-12 flex-col items-center gap-1 border-r bg-card py-3',
        'hidden lg:flex' /* Only show on large screens (>=1024px) */
      )}
      aria-label="Sidebar navigation"
      data-testid="desktop-sidebar"
    >
      {groups.map((group, groupIndex) => (
        <div
          key={group.columnKey}
          className="flex w-full flex-col items-center"
        >
          {/* Active indicator bar */}
          {group.isActive && (
            <div
              className={cn(
                'mb-1 h-1 w-6 rounded-full bg-primary',
                'transition-colors'
              )}
              data-testid={`sidebar-active-indicator-${group.columnKey}`}
              aria-hidden="true"
            />
          )}

          {/* Group label */}
          <span
            className={cn(
              'mb-1 text-[9px] font-bold uppercase tracking-wider',
              group.isActive ? 'text-primary' : 'text-muted-foreground/50'
            )}
            data-testid={`sidebar-group-label-${group.columnKey}`}
          >
            {group.label}
          </span>

          {/* Cards in this group */}
          {group.cards.map((card) => (
            <div
              key={card.cardId}
              className={cn(
                'flex flex-col items-center gap-0.5 cursor-pointer rounded px-0.5 py-0.5',
                'transition-colors hover:bg-accent/70',
                group.isActive && 'opacity-100',
                !group.isActive && 'opacity-60 hover:opacity-100'
              )}
              data-card={card.cardId}
              data-testid={`sidebar-card-${card.cardId}`}
              onClick={() => onCardClick?.(group.columnKey, card.cardId)}
              role="button"
              tabIndex={0}
              aria-label={`Scroll to ${card.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCardClick?.(group.columnKey, card.cardId);
                }
              }}
            >
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full transition-colors',
                  card.hasContent ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
                data-status={card.hasContent ? 'filled' : 'empty'}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'max-w-[2.5rem] text-center text-[9px] leading-tight [writing-mode:vertical-lr]',
                  group.isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {card.title}
              </span>
            </div>
          ))}

          {/* Separator between groups */}
          {groupIndex < groups.length - 1 && (
            <div
              className="my-1.5 h-px w-6 bg-border"
              role="separator"
              aria-hidden="true"
              data-testid="sidebar-group-separator"
            />
          )}
        </div>
      ))}
    </nav>
  );
}

// ===== Collapsed-column mode sidebar (legacy) =====

function CollapsedSidebar({
  ariaLabel,
  cards,
  onExpand,
}: {
  ariaLabel: string;
  cards: SidebarCardInfo[];
  onExpand: (cardId?: string) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-full w-10 flex-col items-center gap-3 border-r bg-card py-4',
        'cursor-pointer transition-colors hover:bg-accent/50',
        'hidden lg:flex' /* Only show on large screens (>=1024px) */
      )}
      onClick={() => onExpand()}
      aria-label={ariaLabel}
      aria-expanded={false}
    >
      {cards.map((card) => (
        <div
          key={card.cardId}
          className="flex flex-col items-center gap-1 cursor-pointer rounded px-0.5 py-0.5 transition-colors hover:bg-accent/70"
          data-card={card.cardId}
          onClick={(e) => {
            e.stopPropagation();
            onExpand(card.cardId);
          }}
          role="button"
          tabIndex={0}
          aria-label={`Expand and scroll to ${card.title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onExpand(card.cardId);
            }
          }}
        >
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full transition-colors',
              card.hasContent ? 'bg-primary' : 'bg-muted-foreground/30'
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

// ===== Main component =====

export function SidebarBar({
  ariaLabel,
  cards,
  isExpanded,
  onExpand,
  groups,
  onCardClick,
  mode = 'collapsed',
}: SidebarBarProps) {
  // Desktop mode: always visible, shows both column groups
  if (mode === 'desktop' && groups) {
    return <DesktopSidebar groups={groups} onCardClick={onCardClick} />;
  }

  // Collapsed-column mode (legacy): only renders when column is collapsed
  if (isExpanded || !cards || !onExpand) return null;

  return (
    <CollapsedSidebar
      ariaLabel={ariaLabel ?? 'Expand column'}
      cards={cards}
      onExpand={onExpand}
    />
  );
}
