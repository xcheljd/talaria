/**
 * TemplateSelector — Searchable template selector using shadcn Command.
 * Displays templates grouped by category (Customer Email, Phone Orders, Text).
 */

import { useState } from 'react';
import {
  Mail,
  Phone,
  MessageSquare,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import {
  templates,
  getTemplateGroups,
  templateHelp,
  type TemplateCategory,
} from '@/lib/templates';

// ─── Category icon mapping ─────────────────────────────────────────────────

const categoryIcons: Record<TemplateCategory, typeof Mail> = {
  'Customer Email': Mail,
  'Phone Orders': Phone,
  Text: MessageSquare,
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface TemplateSelectorProps {
  value: string | null;
  onValueChange: (key: string | null) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TemplateSelector({
  value,
  onValueChange,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const groups = getTemplateGroups();
  const selectedTemplate = value ? templates[value] : null;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a template"
            className="w-[320px] justify-between"
          >
            {selectedTemplate ? (
              <span className="truncate">{selectedTemplate.name}</span>
            ) : (
              <span className="text-muted-foreground">
                Select a template...
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search templates..." />
            <CommandList>
              <CommandEmpty>No template found.</CommandEmpty>
              {groups.map((group) => {
                const Icon = categoryIcons[group.category] || Mail;
                return (
                  <CommandGroup
                    key={group.category}
                    heading={
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        {group.category}
                      </span>
                    }
                  >
                    {group.templates.map((item) => (
                      <CommandItem
                        key={item.key}
                        value={`${item.name} ${group.category}`}
                        onSelect={() => {
                          onValueChange(item.key);
                          setOpen(false);
                          const help = templateHelp[item.key];
                          if (help) {
                            toast.info(help, { duration: 4000 });
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4',
                            value === item.key ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span>{item.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
