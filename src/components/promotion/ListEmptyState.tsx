/**
 * Shared empty state for the list editors (shadcn Empty): icon, title, one
 * line of guidance, and the Add button right where the eye lands.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

interface ListEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  /** Label for the add button; omit to show no button. */
  addLabel?: string;
  onAdd?: () => void;
  /** Extra actions shown beside Add (e.g. Load saved set). */
  extraActions?: ReactNode;
}

export function ListEmptyState({
  icon: Icon,
  title,
  description,
  addLabel,
  onAdd,
  extraActions,
}: ListEmptyStateProps) {
  return (
    <Empty className="gap-4 border border-dashed p-6 md:p-6">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-muted-foreground">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-sm font-medium">{title}</EmptyTitle>
        <EmptyDescription className="text-xs/relaxed">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {(addLabel && onAdd) || extraActions ? (
        <EmptyContent className="flex-row justify-center gap-2">
          {addLabel && onAdd && (
            <Button size="sm" onClick={onAdd}>
              <Plus aria-hidden="true" />
              {addLabel}
            </Button>
          )}
          {extraActions}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
