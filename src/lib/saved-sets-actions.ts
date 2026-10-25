/**
 * Bridges saved sets and the promotion store: capture a section's current
 * content as set data, and load a set into a section (replacing it) with an
 * undo snapshot.
 */

import { create } from 'zustand';
import { StorageKeys } from '@/lib/storage-keys';
import {
  usePromotionStore,
  generateId,
  refreshAutoLines,
  type HowToShopItem,
  type ImportantNotesItem,
  type SpecialHour,
  type PromotionState,
} from '@/stores/promotion-store';
import type {
  SavedListLine,
  SavedSetSection,
  SectionData,
} from '@/stores/saved-sets-store';

type Snapshot = Partial<PromotionState>;

const toLines = (items: (HowToShopItem | ImportantNotesItem)[]) =>
  items.map(({ text, bold, italic, underline, autoField }): SavedListLine => ({
    // Linked lines are saved as links; their text comes from the profile.
    text: autoField ? '' : text,
    bold,
    italic,
    underline,
    ...(autoField ? { autoField } : {}),
  }));

const fromLines = (lines: SavedListLine[]) =>
  refreshAutoLines(
    lines.map((l) => ({
      id: generateId(),
      text: l.text,
      bold: l.bold,
      italic: l.italic,
      underline: l.underline,
      ...(l.autoField ? { autoField: l.autoField } : {}),
    }))
  );

/** Current content of a section, in saved-set form. */
export function captureSection<S extends SavedSetSection>(
  section: S
): SectionData[S] {
  const s = usePromotionStore.getState();
  const data: SectionData = {
    howToShop: toLines(s.howToShopItems),
    importantNotes: toLines(s.importantNotesItems),
    specialHours: s.specialHours.map(({ day, hours }) => ({ day, hours })),
    newsletter: {
      heading: s.newsletterHeading,
      body: s.newsletterBody,
      style: { ...s.newsletterStyle },
    },
  };
  return data[section];
}

/** Selector: does the section have something worth saving? (reactive use) */
export const selectSectionHasContent =
  (section: SavedSetSection) =>
  (s: PromotionState): boolean => {
    switch (section) {
      case 'howToShop':
        return s.howToShopItems.length > 0;
      case 'importantNotes':
        return s.importantNotesItems.length > 0;
      case 'specialHours':
        return s.specialHours.length > 0;
      case 'newsletter':
        // Only a newsletter that's in the email counts (a cleared one keeps a
        // placeholder heading in the editor).
        return (
          s.newsletterVisible &&
          s.newsletterBody.replace(/<[^>]*>/g, '').trim().length > 0
        );
    }
  };

/** True when the section has something worth saving. */
export function sectionHasContent(section: SavedSetSection): boolean {
  return selectSectionHasContent(section)(usePromotionStore.getState());
}

/**
 * Replace a section with a saved set. Returns an undo function that puts the
 * section back exactly as it was.
 */
export function loadSection<S extends SavedSetSection>(
  section: S,
  data: SectionData[S]
): () => void {
  const s = usePromotionStore.getState();
  let before: Snapshot;
  let after: Snapshot;
  switch (section) {
    case 'howToShop':
      before = { howToShopItems: s.howToShopItems };
      after = { howToShopItems: fromLines(data as SavedListLine[]) };
      break;
    case 'importantNotes':
      before = { importantNotesItems: s.importantNotesItems };
      after = { importantNotesItems: fromLines(data as SavedListLine[]) };
      break;
    case 'specialHours':
      before = { specialHours: s.specialHours };
      after = {
        specialHours: (data as SectionData['specialHours']).map(
          (h): SpecialHour => ({ id: generateId(), day: h.day, hours: h.hours })
        ),
      };
      break;
    default: {
      const n = data as SectionData['newsletter'];
      before = {
        newsletterHeading: s.newsletterHeading,
        newsletterBody: s.newsletterBody,
        newsletterStyle: s.newsletterStyle,
        newsletterVisible: s.newsletterVisible,
      };
      after = {
        newsletterVisible: true,
        newsletterHeading: n.heading,
        newsletterBody: n.body,
        newsletterStyle: { ...n.style },
      };
    }
  }
  usePromotionStore.setState(after);
  return () => usePromotionStore.setState(before);
}

// ===== Link to the set that was loaded (for "edited" + one-click Update) =====

/**
 * Which saved set each section was last loaded from or saved as. Stored in
 * localStorage (`loadedSets`) so it survives a restart, like the email.
 */

interface LoadedSetsState {
  loaded: Partial<Record<SavedSetSection, string>>;
  link: (section: SavedSetSection, id: string) => void;
  unlink: (section: SavedSetSection) => void;
}

const SECTION_KEYS: SavedSetSection[] = [
  'howToShop',
  'importantNotes',
  'specialHours',
  'newsletter',
];

/** Read the persisted links; anything malformed is dropped. */
function readLoadedSets(): Partial<Record<SavedSetSection, string>> {
  try {
    const raw = JSON.parse(
      localStorage.getItem(StorageKeys.loadedSets) || '{}'
    );
    const out: Partial<Record<SavedSetSection, string>> = {};
    for (const k of SECTION_KEYS) {
      if (typeof raw?.[k] === 'string' && raw[k]) out[k] = raw[k];
    }
    return out;
  } catch {
    return {};
  }
}

function writeLoadedSets(loaded: Partial<Record<SavedSetSection, string>>) {
  try {
    localStorage.setItem(StorageKeys.loadedSets, JSON.stringify(loaded));
  } catch {
    // Best effort: losing the link only hides the edited dot.
  }
}

/**
 * Persisted like the builder state it describes: the email autosaves, so
 * after a restart the card still holds the edited content — and the dot
 * still says it differs from the set it came from.
 */
export const useLoadedSets = create<LoadedSetsState>((set) => ({
  loaded: readLoadedSets(),
  link: (section, id) =>
    set((s) => {
      const loaded = { ...s.loaded, [section]: id };
      writeLoadedSets(loaded);
      return { loaded };
    }),
  unlink: (section) =>
    set((s) => {
      const loaded = { ...s.loaded };
      delete loaded[section];
      writeLoadedSets(loaded);
      return { loaded };
    }),
}));

/** Stable comparison of set data (key order and ids don't matter). */
export function sameSetData(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([k, x]) => k !== 'format' && x !== undefined)
          .sort(([x], [y]) => x.localeCompare(y))
          .map(([k, x]) => [k, norm(x)])
      );
    }
    return v;
  };
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

// Clearing a section (Clear all, Start Over) ends its link to a set, whether
// or not that card is on screen.
usePromotionStore.subscribe((state, prev) => {
  const { loaded, unlink } = useLoadedSets.getState();
  for (const section of Object.keys(loaded) as SavedSetSection[]) {
    if (
      selectSectionHasContent(section)(prev) &&
      !selectSectionHasContent(section)(state)
    ) {
      unlink(section);
    }
  }
});
