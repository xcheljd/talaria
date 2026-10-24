/**
 * Saved sets for one section: a "Sets" menu (load a set, delete one, save the
 * current entries as a set, manage sets) plus its Save and Manage dialogs.
 *
 * Loading replaces the section and offers Undo; deleting a set offers Undo.
 * Saving under an existing name asks before replacing it.
 */
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  BookmarkPlus,
  ChevronDown,
  FolderOpen,
  Pencil,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { toastWithUndo } from '@/lib/undo-toast';
import {
  captureSection,
  loadSection,
  selectSectionHasContent,
} from '@/lib/saved-sets-actions';
import { usePromotionStore } from '@/stores/promotion-store';
import {
  useSavedSetsStore,
  sameSetName,
  type SavedSet,
  type SavedSetSection,
} from '@/stores/saved-sets-store';

export interface SavedSetsMenuProps {
  section: SavedSetSection;
  /** Plural noun for copy, e.g. "entries", "notes", "hours". */
  noun: string;
  /** Button look: compact header button or the empty state's outline button. */
  appearance?: 'header' | 'empty';
}

function describeSet(set: SavedSet): string {
  const d = set.data as unknown;
  if (Array.isArray(d)) return d.length === 1 ? '1 line' : `${d.length} lines`;
  const body = (d as { body: string }).body ?? '';
  const text = body
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 60 ? `${text.slice(0, 60)}…` : text || 'Empty';
}

export function SavedSetsMenu({
  section,
  noun,
  appearance = 'header',
}: SavedSetsMenuProps) {
  const sets = useSavedSetsStore(useShallow((s) => s.sets[section]));
  const hasContent = usePromotionStore(selectSectionHasContent(section));
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const load = (set: SavedSet) => {
    const undo = loadSection(section, set.data as never);
    toastWithUndo(`Loaded “${set.name}”`, undo);
  };

  const remove = (set: SavedSet) => {
    const removed = useSavedSetsStore.getState().deleteSet(section, set.id);
    if (!removed) return;
    toastWithUndo(
      `Deleted set “${set.name}”`,
      () =>
        useSavedSetsStore
          .getState()
          .restoreSet(section, removed.set, removed.index),
      'Set restored'
    );
  };

  // Nothing to load and nothing to save: no menu at all.
  if (sets.length === 0 && !hasContent) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {appearance === 'empty' ? (
            <Button size="sm" variant="outline" data-testid={`sets-${section}`}>
              <FolderOpen aria-hidden="true" />
              Load saved set
              <ChevronDown aria-hidden="true" />
            </Button>
          ) : (
            <Button
              size="xs"
              variant="ghost"
              className="text-muted-foreground"
              data-testid={`sets-${section}`}
            >
              <FolderOpen aria-hidden="true" />
              Sets
              <ChevronDown aria-hidden="true" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {sets.length
              ? 'Load a saved set (replaces the list)'
              : 'No saved sets yet'}
          </DropdownMenuLabel>
          {sets.map((set) => (
            <div key={set.id} className="flex items-center gap-1">
              <DropdownMenuItem
                className="min-w-0 flex-1"
                onSelect={() => load(set)}
                data-testid={`load-set-${set.name}`}
              >
                <span className="truncate">{set.name}</span>
              </DropdownMenuItem>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive-text"
                aria-label={`Delete set ${set.name}`}
                onClick={() => remove(set)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!hasContent}
            onSelect={() => setSaveOpen(true)}
          >
            <BookmarkPlus aria-hidden="true" />
            Save current {noun} as a set…
          </DropdownMenuItem>
          {sets.length > 0 && (
            <DropdownMenuItem onSelect={() => setManageOpen(true)}>
              <Settings2 aria-hidden="true" />
              Manage sets…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveSetDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        section={section}
        noun={noun}
      />
      <ManageSetsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        section={section}
        noun={noun}
        onDelete={remove}
      />
    </>
  );
}

// ===== Save dialog =====

function SaveSetDialog({
  open,
  onOpenChange,
  section,
  noun,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SavedSetSection;
  noun: string;
}) {
  const [name, setName] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const existing = useSavedSetsStore((s) =>
    name.trim()
      ? s.sets[section].find((x) => sameSetName(x.name, name))
      : undefined
  );

  const close = (next: boolean) => {
    if (!next) {
      setName('');
      setConfirmReplace(false);
    }
    onOpenChange(next);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existing && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    useSavedSetsStore
      .getState()
      .saveSet(section, trimmed, captureSection(section));
    toast.success(
      existing ? `Replaced set “${trimmed}”` : `Saved set “${trimmed}”`
    );
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save {noun} as a set</DialogTitle>
          <DialogDescription>
            Load it into any future email in one click. Store phone, email and
            directions lines stay linked to Settings.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4"
        >
          <Field className="gap-2" data-invalid={confirmReplace || undefined}>
            <FieldLabel htmlFor={`set-name-${section}`} className="text-xs">
              Set name
            </FieldLabel>
            <Input
              id={`set-name-${section}`}
              value={name}
              autoFocus
              maxLength={60}
              placeholder="e.g., Holiday 2026"
              onChange={(e) => {
                setName(e.target.value);
                setConfirmReplace(false);
              }}
            />
            {confirmReplace && existing && (
              <FieldError>
                A set named “{existing.name}” already exists. Save again to
                replace it.
              </FieldError>
            )}
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => close(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              variant={confirmReplace ? 'destructive' : 'default'}
            >
              {confirmReplace ? 'Replace set' : 'Save set'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== Manage dialog =====

function ManageSetsDialog({
  open,
  onOpenChange,
  section,
  noun,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SavedSetSection;
  noun: string;
  onDelete: (set: SavedSet) => void;
}) {
  const sets = useSavedSetsStore(useShallow((s) => s.sets[section]));
  const hasContent = usePromotionStore(selectSectionHasContent(section));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const startRename = (set: SavedSet) => {
    setEditingId(set.id);
    setDraft(set.name);
    setError('');
  };

  const commitRename = (set: SavedSet) => {
    const trimmed = draft.trim();
    if (!trimmed) return setError('Name can’t be empty');
    const clash = sets.find(
      (s) => s.id !== set.id && sameSetName(s.name, trimmed)
    );
    if (clash) return setError(`“${clash.name}” is already used`);
    useSavedSetsStore.getState().renameSet(section, set.id, trimmed);
    setEditingId(null);
  };

  const update = (set: SavedSet) => {
    const previous = set.data;
    useSavedSetsStore
      .getState()
      .updateSet(section, set.id, captureSection(section));
    toastWithUndo(
      `Updated “${set.name}” with the current ${noun}`,
      () =>
        useSavedSetsStore
          .getState()
          .updateSet(section, set.id, previous as never),
      'Set restored'
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setEditingId(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage saved sets</DialogTitle>
          <DialogDescription>
            Rename, delete, or replace a set with the {noun} in this email.
          </DialogDescription>
        </DialogHeader>
        {sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved sets.</p>
        ) : (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {sets.map((set) => (
              <Item
                key={set.id}
                variant="outline"
                size="sm"
                className="px-3 py-2"
              >
                <ItemContent className="min-w-0 gap-0.5">
                  {editingId === set.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        commitRename(set);
                      }}
                      className="flex flex-col gap-1"
                    >
                      <Input
                        aria-label={`New name for ${set.name}`}
                        value={draft}
                        autoFocus
                        maxLength={60}
                        className="h-8"
                        onChange={(e) => {
                          setDraft(e.target.value);
                          setError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.stopPropagation();
                            setEditingId(null);
                          }
                        }}
                      />
                      {error && <FieldError>{error}</FieldError>}
                    </form>
                  ) : (
                    <>
                      <ItemTitle className="truncate">{set.name}</ItemTitle>
                      <ItemDescription className="truncate text-xs">
                        {describeSet(set)}
                      </ItemDescription>
                    </>
                  )}
                </ItemContent>
                <ItemActions className="gap-1">
                  {editingId === set.id ? (
                    <>
                      <Button size="xs" onClick={() => commitRename(set)}>
                        Save
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Rename ${set.name}`}
                        onClick={() => startRename(set)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Update ${set.name} with current ${noun}`}
                        title={`Update with current ${noun}`}
                        disabled={!hasContent}
                        onClick={() => update(set)}
                      >
                        <RefreshCw aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive-text"
                        aria-label={`Delete set ${set.name}`}
                        onClick={() => onDelete(set)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </ItemActions>
              </Item>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
