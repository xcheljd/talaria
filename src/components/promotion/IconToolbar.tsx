/**
 * IconToolbar — Horizontal row of icon buttons for navigating promotion cards.
 *
 * Displays 8 icon buttons (one per card) with:
 * - Lucide SVG icon
 * - Short text label underneath
 * - Tooltip via native title attribute
 * - Active state highlighting via activeCardId prop
 * - Click handler to scroll + expand target card
 */

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
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== Card Icon Configuration =====

interface CardIconConfig {
  icon: LucideIcon;
  label: string;
  tooltip: string;
}

const CARD_ICONS: Record<string, CardIconConfig> = {
  basicDetailsCard: {
    icon: FileText,
    label: 'Details',
    tooltip: 'Basic Details',
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
  'pdfCard',
  'subjectCard',
  'bulkEmailCard',
];

// ===== Props =====

export interface IconToolbarProps {
  /** Currently active (most visible) card ID for highlighting */
  activeCardId?: string;
  /** Callback when an icon is clicked */
  onCardClick: (cardId: string) => void;
}

// ===== Component =====

export function IconToolbar({ activeCardId, onCardClick }: IconToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1 border-b px-2 py-2"
      data-testid="icon-toolbar"
      role="toolbar"
      aria-label="Card navigation"
    >
      {TOOLBAR_CARD_ORDER.map((cardId) => {
        const config = CARD_ICONS[cardId];
        if (!config) return null;

        const Icon = config.icon;
        const isActive = activeCardId === cardId;

        return (
          <button
            key={cardId}
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
            aria-label={`Jump to ${config.tooltip}`}
            aria-pressed={isActive}
          >
            <Icon className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] leading-tight">
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
