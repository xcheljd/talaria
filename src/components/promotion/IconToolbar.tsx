/**
 * IconToolbar — Horizontal row of icon buttons for selecting which promotion
 * tool's card is shown. Exactly one tool is active at a time; clicking one
 * swaps the card displayed in the left column.
 *
 * Each button (one per card) has:
 * - Lucide SVG icon
 * - Short text label underneath
 * - Tooltip via native title attribute
 * - Active state highlighting via activeCardId prop (aria-pressed)
 */

import { Fragment, memo } from 'react';
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

// ===== Component =====

export const IconToolbar = memo(function IconToolbar({
  activeCardId,
  onCardClick,
}: IconToolbarProps) {
  const { devMode } = useDevMode();
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1 border-b px-2 py-2"
      data-testid="icon-toolbar"
      role="toolbar"
      aria-label="Tool selection"
    >
      {TOOLBAR_CARD_ORDER.map((cardId) => {
        const config = CARD_ICONS[cardId];
        if (!config) return null;
        if (config.devOnly && !devMode) return null;

        const Icon = config.icon;
        const isActive = activeCardId === cardId;
        const showDivider =
          cardId === 'subjectCard' || cardId === 'emailThemeCard';

        return (
          <Fragment key={cardId}>
            {showDivider && <div className="h-8 w-px bg-border mx-0.5" />}
            <button
              type="button"
              title={config.tooltip}
              data-testid={`toolbar-icon-${cardId}`}
              className={cn(
                'flex flex-col items-center rounded-lg p-2 transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50'
              )}
              onClick={() => onCardClick(cardId)}
              aria-label={`Show ${config.tooltip}`}
              aria-pressed={isActive}
            >
              <Icon className="h-5 w-5" />
              <span className="mt-0.5 text-[10px] leading-tight">
                {config.label}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
});
