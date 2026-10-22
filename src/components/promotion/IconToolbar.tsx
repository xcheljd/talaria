/**
 * IconToolbar — Horizontal row of icon buttons for selecting which promotion
 * tool's card is shown. Exactly one tool is active at a time; clicking one
 * swaps the card displayed in the left column.
 *
 * Each button (one per card) has:
 * - Lucide SVG icon
 * - Short text label underneath (hidden in compact mode, except on the
 *   active tool)
 * - Tooltip via native title attribute
 *
 * - Active state highlighting via activeCardId prop (aria-pressed)
 *
 * The toolbar never wraps: it is fixed at h-12 so its bottom border lines up
 * with the Email Preview header next to it. As the panel narrows (window
 * resize or splitter drag) it steps down through density levels:
 *   0 labeled — icon + label on every button
 *   1 icons   — icon-only, the active tool keeps its label
 *   2 tight   — 28px icon-only buttons, no labels
 *   3 more    — (dev mode only) dev tools fold into a "More" menu
 * Normal-mode tools are never hidden. If level 2/3 still overflows the row
 * scrolls horizontally as a last resort.
 */

import { Fragment, memo, useLayoutEffect, useRef, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Percent,
  ShoppingCart,
  StickyNote,
  Clock,
  Paperclip,
  MessageSquare,
  Mail,
  Newspaper,
  Palette,
  ScanEye,
  History,
  MonitorCheck,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevMode } from '@/hooks/useDevMode';

// ===== Card Icon Configuration =====

interface CardIconConfig {
  icon: LucideIcon;
  label: string;
  tooltip: string;
  /** When true, only render in dev mode. */
  devOnly?: boolean;
}

const CARD_ICONS: Record<string, CardIconConfig> = {
  basicDetailsCard: {
    icon: FileText,
    label: 'Details',
    tooltip: 'Basic Details',
  },
  emailThemeCard: {
    icon: Palette,
    label: 'Theme',
    tooltip: 'Email Theme',
    devOnly: true,
  },
  newsletterCard: {
    icon: Newspaper,
    label: 'Newsletter',
    tooltip: 'Newsletter',
  },
  discountEntriesCard: {
    icon: Percent,
    label: 'Discounts',
    tooltip: 'Discount Entries',
  },
  howToShopCard: {
    icon: ShoppingCart,
    label: 'Shopping',
    tooltip: 'How to Shop',
  },
  importantNotesCard: {
    icon: StickyNote,
    label: 'Notes',
    tooltip: 'Important Notes',
  },
  specialHoursCard: { icon: Clock, label: 'Hours', tooltip: 'Special Hours' },
  pdfCard: { icon: Paperclip, label: 'PDFs', tooltip: 'PDF Attachments' },
  subjectCard: {
    icon: MessageSquare,
    label: 'Subjects',
    tooltip: 'Subject Lines',
  },
  accessibilityCard: {
    icon: ScanEye,
    label: 'A11y',
    tooltip: 'Accessibility Checker',
    devOnly: true,
  },
  versionHistoryCard: {
    icon: History,
    label: 'Versions',
    tooltip: 'Version History',
  },
  outlookCard: {
    icon: MonitorCheck,
    label: 'Outlook',
    tooltip: 'Outlook Compatibility',
    devOnly: true,
  },
  bulkEmailCard: { icon: Mail, label: 'Email', tooltip: 'Bulk Email Tools' },
};

/** Ordered list of card IDs to render in the toolbar */
const TOOLBAR_CARD_ORDER = [
  'basicDetailsCard',
  'newsletterCard',
  'discountEntriesCard',
  'howToShopCard',
  'importantNotesCard',
  'specialHoursCard',
  'subjectCard',
  'pdfCard',
  'bulkEmailCard',
  'emailThemeCard',
  'accessibilityCard',
  'versionHistoryCard',
  'outlookCard',
];

// ===== Props =====

export interface IconToolbarProps {
  /** Currently active (most visible) card ID for highlighting */
  activeCardId?: string;
  /** Callback when an icon is clicked */
  onCardClick: (cardId: string) => void;
}

// ===== Density levels =====

type Density = 0 | 1 | 2 | 3;

/**
 * Picks the densest-needed level for the current toolbar width.
 * Each level's row width is measured (scrollWidth) while that level is
 * rendered and cached; we step up a level while the current one overflows
 * and step back down only when the less dense level's measured width fits —
 * so there's no flip-flopping at a threshold. `resetKey` changes whenever
 * the button set or active label changes, dropping the cache.
 */
function useDensity(maxLevel: Density, resetKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  const widths = useRef<Partial<Record<Density, number>>>({});
  const [level, setLevel] = useState<Density>(0);

  useLayoutEffect(() => {
    widths.current = {};
    setLevel(0);
  }, [resetKey]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      widths.current[level] = el.scrollWidth;
      const avail = el.clientWidth;
      if (widths.current[level]! > avail && level < maxLevel) {
        setLevel((level + 1) as Density);
        return;
      }
      const lighter = widths.current[(level - 1) as Density];
      if (level > 0 && lighter !== undefined && lighter <= avail) {
        setLevel((level - 1) as Density);
      }
    };
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [level, maxLevel, resetKey]);

  return { ref, level };
}

// ===== Component =====

export const IconToolbar = memo(function IconToolbar({
  activeCardId,
  onCardClick,
}: IconToolbarProps) {
  const { devMode } = useDevMode();
  const { ref, level } = useDensity(
    devMode ? 3 : 2,
    `${devMode}:${activeCardId ?? ''}`
  );
  const tight = level >= 2;
  const folded = level === 3;

  const cardIds = TOOLBAR_CARD_ORDER.filter((id) => {
    const config = CARD_ICONS[id];
    return config && (!config.devOnly || devMode);
  });
  const rowIds = folded
    ? cardIds.filter((id) => !CARD_ICONS[id].devOnly)
    : cardIds;
  const moreIds = folded ? cardIds.filter((id) => CARD_ICONS[id].devOnly) : [];
  const moreActive = moreIds.includes(activeCardId ?? '');

  const buttonClass = (isActive: boolean) =>
    cn(
      'flex h-[38px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors',
      level === 0 && 'px-2',
      level === 1 && 'min-w-8 px-1.5',
      // 28px at level 2; 26px once More joins the row (still above the
      // 24px WCAG 2.2 target-size minimum)
      level === 2 && 'w-7 px-0',
      level === 3 && 'w-[26px] px-0',
      isActive
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:bg-accent/50'
    );

  return (
    <div
      ref={ref}
      className={cn(
        'flex h-12 shrink-0 flex-nowrap items-center overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none]',
        // `safe` keeps the first icon reachable if the row ever scrolls
        '[justify-content:safe_center]',
        level === 0 && 'gap-1 px-2',
        level === 1 && 'gap-0.5 px-2',
        tight && 'gap-px px-1'
      )}
      data-testid="icon-toolbar"
      data-density={level}
      role="toolbar"
      aria-label="Tool selection"
    >
      {rowIds.map((cardId) => {
        const config = CARD_ICONS[cardId];
        const Icon = config.icon;
        const isActive = activeCardId === cardId;
        const showLabel = level === 0 || (level === 1 && isActive);
        // Dividers split Content | Sending | Extras. The Extras group starts
        // after Email, whichever tool lands there once dev tools fold away.
        const showDivider =
          cardId === 'subjectCard' ||
          rowIds[rowIds.indexOf(cardId) - 1] === 'bulkEmailCard';

        return (
          <Fragment key={cardId}>
            {showDivider && (
              <div
                className={cn(
                  'h-8 w-px shrink-0 bg-border',
                  tight ? 'mx-px' : 'mx-0.5'
                )}
              />
            )}
            <button
              type="button"
              title={config.tooltip}
              data-testid={`toolbar-icon-${cardId}`}
              className={buttonClass(isActive)}
              onClick={() => onCardClick(cardId)}
              // Voice-control users say the visible label, so the name must
              // contain it (WCAG 2.5.3) even when the tooltip words it longer.
              aria-label={
                config.tooltip.includes(config.label)
                  ? `Show ${config.tooltip}`
                  : `Show ${config.label}: ${config.tooltip}`
              }
              aria-pressed={isActive}
            >
              <Icon className="size-4" />
              {showLabel && (
                <span className="whitespace-nowrap text-[10px] leading-none">
                  {config.label}
                </span>
              )}
            </button>
          </Fragment>
        );
      })}
      {folded && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={
                moreActive
                  ? `More tools (${CARD_ICONS[activeCardId!].tooltip})`
                  : 'More tools'
              }
              data-testid="toolbar-more"
              className={buttonClass(moreActive)}
              aria-label="More tools"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {moreIds.map((cardId) => {
              const config = CARD_ICONS[cardId];
              const Icon = config.icon;
              const isActive = activeCardId === cardId;
              return (
                <DropdownMenuItem
                  key={cardId}
                  data-testid={`toolbar-more-${cardId}`}
                  className={cn(isActive && 'bg-accent/60 font-medium')}
                  onSelect={() => onCardClick(cardId)}
                >
                  <Icon className="size-4" />
                  {config.tooltip}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});
