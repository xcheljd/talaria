/**
 * The "Add …" button used by the list editors. When the list can also re-add
 * profile-linked lines (store phone / email / directions), it becomes a small
 * menu: plain Add plus one entry per available linked line.
 */
import { ChevronDown, Phone, Mail, MapPin, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { linkedLineAvailable, type AutoField } from '@/stores/promotion-store';

const LINKED_LINES: Record<AutoField, { label: string; icon: typeof Phone }> = {
  storePhone: { label: 'Store phone line', icon: Phone },
  storeEmail: { label: 'Store email line', icon: Mail },
  storeDirections: { label: 'Directions line', icon: MapPin },
};

export interface AddButtonProps {
  label: string;
  onAdd: () => void;
  /** Linked lines offered in the menu (only the ones set in Settings appear). */
  linked?: AutoField[];
  /** Linked lines already in the list — never offered twice. */
  existing?: AutoField[];
  onAddLinked?: (field: AutoField) => void;
  size?: 'xs' | 'sm';
  appearance?: 'outline' | 'default';
}

export function AddButton({
  label,
  onAdd,
  linked,
  existing,
  onAddLinked,
  size = 'xs',
  appearance = 'outline',
}: AddButtonProps) {
  const available = (linked ?? []).filter(
    (field) => linkedLineAvailable(field) && !(existing ?? []).includes(field)
  );
  if (!onAddLinked || available.length === 0) {
    return (
      <Button variant={appearance} size={size} onClick={onAdd}>
        <Plus aria-hidden="true" />
        {label}
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={appearance} size={size} aria-label={label}>
          <Plus aria-hidden="true" />
          {label}
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onAdd}>
          <Plus aria-hidden="true" />
          {label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Linked to Settings
        </DropdownMenuLabel>
        {available.map((field) => {
          const { label: lineLabel, icon: Icon } = LINKED_LINES[field];
          return (
            <DropdownMenuItem
              key={field}
              onSelect={() => onAddLinked(field)}
              data-testid={`add-linked-${field}`}
            >
              <Icon aria-hidden="true" />
              {lineLabel}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
