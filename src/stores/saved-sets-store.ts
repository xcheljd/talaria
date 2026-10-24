/**
 * Saved entry sets — named, reusable snapshots of one section's content
 * (How to Shop, Important Notes, Special Hours, Newsletter). Loading a set
 * replaces that section; the caller offers Undo.
 *
 * Linked lines (store phone / email / directions) are stored as links
 * (`autoField`), not text, so loading a set always uses the current profile.
 *
 * Persisted to localStorage under `StorageKeys.savedSets` and validated on
 * read: a corrupt or tampered entry is dropped, never thrown.
 */

import { create } from 'zustand';
import { z } from 'zod';

import { StorageKeys } from '@/lib/storage-keys';
import { parseNewsletterStyle } from '@/lib/promotion-config-schema';
import type { AutoField, NewsletterStyle } from '@/stores/promotion-store';

// ===== Types =====

export type SavedSetSection =
  'howToShop' | 'importantNotes' | 'specialHours' | 'newsletter';

export interface SavedListLine {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Linked to a profile field; text is regenerated from the profile on load. */
  autoField?: AutoField;
}

export interface SavedHour {
  day: string;
  hours: string;
}

export interface SavedNewsletter {
  heading: string;
  body: string;
  style: NewsletterStyle;
}

export interface SectionData {
  howToShop: SavedListLine[];
  importantNotes: SavedListLine[];
  specialHours: SavedHour[];
  newsletter: SavedNewsletter;
}

export interface SavedSet<S extends SavedSetSection = SavedSetSection> {
  id: string;
  name: string;
  updatedAt: number;
  data: SectionData[S];
}

export type SavedSets = { [S in SavedSetSection]: SavedSet<S>[] };

export const SAVED_SET_SECTIONS: SavedSetSection[] = [
  'howToShop',
  'importantNotes',
  'specialHours',
  'newsletter',
];

// ===== Validation =====

const lineSchema = z.object({
  text: z.string().catch(''),
  bold: z.boolean().catch(false),
  italic: z.boolean().catch(false),
  underline: z.boolean().catch(false),
  autoField: z
    .enum(['storeEmail', 'storePhone', 'storeDirections'])
    .optional()
    .catch(undefined),
});

const hourSchema = z.object({
  day: z.string().catch(''),
  hours: z.string().catch(''),
});

const newsletterSchema = z.object({
  heading: z.string().catch('Newsletter'),
  body: z.string().catch(''),
  style: z.unknown().transform((raw) => parseNewsletterStyle(raw)),
});

const dataSchemas = {
  howToShop: z.array(lineSchema),
  importantNotes: z.array(lineSchema),
  specialHours: z.array(hourSchema),
  newsletter: newsletterSchema,
} as const;

function parseSection<S extends SavedSetSection>(
  section: S,
  raw: unknown
): SavedSet<S>[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedSet<S>[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name.trim() : '';
    if (!name) continue;
    const data = dataSchemas[section].safeParse(e.data);
    if (!data.success) continue;
    out.push({
      id: typeof e.id === 'string' && e.id ? e.id : newSetId(),
      name,
      updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
      data: data.data as SectionData[S],
    });
  }
  return out;
}

export function emptySavedSets(): SavedSets {
  return {
    howToShop: [],
    importantNotes: [],
    specialHours: [],
    newsletter: [],
  };
}

/** Parse whatever is stored; anything unreadable becomes an empty list. */
export function parseSavedSets(raw: unknown): SavedSets {
  const sets = emptySavedSets();
  if (!raw || typeof raw !== 'object') return sets;
  const r = raw as Record<string, unknown>;
  for (const section of SAVED_SET_SECTIONS) {
    (sets[section] as SavedSet[]) = parseSection(section, r[section]);
  }
  return sets;
}

export function readSavedSets(): SavedSets {
  const stored = localStorage.getItem(StorageKeys.savedSets);
  if (!stored) return emptySavedSets();
  try {
    return parseSavedSets(JSON.parse(stored));
  } catch {
    return emptySavedSets();
  }
}

function writeSavedSets(sets: SavedSets) {
  localStorage.setItem(
    StorageKeys.savedSets,
    JSON.stringify({ version: 1, ...sets })
  );
}

function newSetId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `set-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Names compare trimmed and case-insensitively ("Holiday 2026" = "holiday 2026 "). */
export function sameSetName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// ===== Store =====

interface SavedSetsState {
  sets: SavedSets;
  /**
   * Save `data` under `name`. If a set with that name exists it is replaced
   * in place (the UI confirms first via `findByName`).
   */
  saveSet: <S extends SavedSetSection>(
    section: S,
    name: string,
    data: SectionData[S]
  ) => SavedSet<S>;
  findByName: <S extends SavedSetSection>(
    section: S,
    name: string
  ) => SavedSet<S> | undefined;
  renameSet: (section: SavedSetSection, id: string, name: string) => void;
  updateSet: <S extends SavedSetSection>(
    section: S,
    id: string,
    data: SectionData[S]
  ) => void;
  /** Remove a set; returns it with its index so the caller can offer Undo. */
  deleteSet: (
    section: SavedSetSection,
    id: string
  ) => { set: SavedSet; index: number } | undefined;
  /** Put a deleted set back at its old position (Undo). */
  restoreSet: (section: SavedSetSection, set: SavedSet, index: number) => void;
  /** Re-read localStorage (tests, cross-tab). */
  reload: () => void;
}

export const useSavedSetsStore = create<SavedSetsState>((set, get) => {
  const commit = (sets: SavedSets) => {
    writeSavedSets(sets);
    set({ sets });
  };
  const withSection = <S extends SavedSetSection>(
    section: S,
    fn: (list: SavedSet<S>[]) => SavedSet<S>[]
  ) => {
    const sets = get().sets;
    commit({ ...sets, [section]: fn(sets[section] as SavedSet<S>[]) });
  };

  return {
    sets: readSavedSets(),

    saveSet: (section, name, data) => {
      const trimmed = name.trim();
      const existing = get().findByName(section, trimmed);
      const saved = {
        id: existing?.id ?? newSetId(),
        name: trimmed,
        updatedAt: Date.now(),
        data,
      } as SavedSet<typeof section>;
      withSection(section, (list) =>
        existing
          ? list.map((s) => (s.id === existing.id ? saved : s))
          : [...list, saved]
      );
      return saved;
    },

    findByName: (section, name) =>
      (get().sets[section] as SavedSet<typeof section>[]).find((s) =>
        sameSetName(s.name, name)
      ),

    renameSet: (section, id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      withSection(section, (list) =>
        list.map((s) =>
          s.id === id ? { ...s, name: trimmed, updatedAt: Date.now() } : s
        )
      );
    },

    updateSet: (section, id, data) => {
      withSection(section, (list) =>
        list.map((s) =>
          s.id === id ? { ...s, data, updatedAt: Date.now() } : s
        )
      );
    },

    deleteSet: (section, id) => {
      const list = get().sets[section] as SavedSet[];
      const index = list.findIndex((s) => s.id === id);
      if (index === -1) return undefined;
      const removed = list[index];
      withSection(section, (l) => l.filter((s) => s.id !== id));
      return { set: removed, index };
    },

    restoreSet: (section, saved, index) => {
      withSection(section, (list) => {
        if (list.some((s) => s.id === saved.id)) return list;
        const next = [...list];
        next.splice(Math.min(index, next.length), 0, saved as never);
        return next;
      });
    },

    reload: () => set({ sets: readSavedSets() }),
  };
});

// ===== One-time "Defaults" migration =====

/**
 * The text lines the builder used to seed into every new session. They now
 * live in a saved set named "Defaults" (linked lines stay built-in).
 */
export const LEGACY_DEFAULT_SETS: Pick<
  SectionData,
  'howToShop' | 'importantNotes'
> = {
  howToShop: [
    { text: 'Visit us in-store for outlet-exclusive deals' },
    { text: '', autoField: 'storePhone' },
    { text: '$20 flat-rate ground shipping in US' },
    { text: '', autoField: 'storeEmail' },
  ].map((l) => ({
    bold: false,
    italic: false,
    underline: false,
    ...l,
  })) as SavedListLine[],
  importantNotes: [
    { text: '*Select models only' },
    { text: 'See attached PDF for complete model details' },
    { text: 'Limited availability - while supplies last' },
    { text: 'Email response time up to 48 hours' },
    { text: '', autoField: 'storeDirections' },
  ].map((l) => ({
    bold: false,
    italic: false,
    underline: false,
    ...l,
  })) as SavedListLine[],
};

/**
 * Runs once per browser profile. Existing users (they already have builder
 * state) get the old built-in lines as a "Defaults" set in How to Shop and
 * Important Notes; brand-new users start with no sets. Either way the
 * savedSets key is written, so this never runs again.
 */
export function migrateLegacyDefaults(): boolean {
  if (localStorage.getItem(StorageKeys.savedSets) !== null) return false;
  const isExistingUser =
    localStorage.getItem(StorageKeys.promotionBuilderState) !== null;
  const sets = emptySavedSets();
  if (isExistingUser) {
    const now = Date.now();
    sets.howToShop.push({
      id: newSetId(),
      name: 'Defaults',
      updatedAt: now,
      data: LEGACY_DEFAULT_SETS.howToShop,
    });
    sets.importantNotes.push({
      id: newSetId(),
      name: 'Defaults',
      updatedAt: now,
      data: LEGACY_DEFAULT_SETS.importantNotes,
    });
  }
  writeSavedSets(sets);
  useSavedSetsStore.setState({ sets });
  return isExistingUser;
}
