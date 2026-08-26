/**
 * Zustand store for promotion page state.
 * Manages all promotion builder data: entries, special hours,
 * how-to-shop items, important notes, PDFs, subject lines,
 * column collapse state, and auto-save to localStorage (PDF blobs go to
 * IndexedDB separately, at attach time).
 */

import { create } from 'zustand';
import {
  initIndexedDB,
  savePDFToIndexedDB,
  getPDFFromIndexedDB,
  deletePDFFromIndexedDB,
  clearAllPDFsFromIndexedDB,
  getAllPDFKeysFromIndexedDB,
  getBulkEmailRecipientsFromIndexedDB,
  type PDFRecord,
} from '@/lib/db';
import { getStorePhone, getStoreEmail, getDirections } from '@/lib/profile';
import { prependHeadingIfMissing } from '@/lib/html-utils';
import { StorageKeys } from '@/lib/storage-keys';
import { sanitizePersistedStyles } from '@/lib/promotion-config-schema';

// ===== Types =====

export interface PromotionEntry {
  id: number;
  line: string;
  collections: string;
  callout: string;
}

export interface SpecialHour {
  id: number;
  day: string;
  hours: string;
}

/**
 * Marks a seeded contact/info line as auto-managed from the profile: its text
 * is regenerated from the named profile field every time the builder loads
 * (see `refreshAutoLines`), and the tag is cleared the moment the user edits
 * the line, so manual edits are never overwritten. How-to-Shop uses
 * `storeEmail`/`storePhone`; Important Notes uses `storeDirections`.
 */
export type AutoField = 'storeEmail' | 'storePhone' | 'storeDirections';

export interface HowToShopItem {
  id: number;
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** When set, this line is auto-managed from the profile — see {@link AutoField}. */
  autoField?: AutoField;
}

export interface ImportantNotesItem {
  id: number;
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** When set, this line is auto-managed from the profile — see {@link AutoField}. */
  autoField?: AutoField;
}

export interface AttachedPDF {
  id: string;
  name: string;
  size: number;
  type: string;
  data?: string; // data URL (base64)
}

/** Metadata-only type for localStorage serialization (no data field) */
export interface AttachedPDFMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface SubjectLine {
  text: string;
}

export type ColumnState = 'left' | 'center';

/** Serialized state for localStorage persistence */
export type NewsletterPosition = 'top' | 'bottom';

export interface NewsletterStyle {
  borderColor: string | null; // null = auto (use palette primary)
  backgroundColor: string | null; // null = auto (use palette muted)
  headingColor: string | null; // null = auto (use palette primary)
  borderStyle: 'left' | 'full' | 'none' | 'top'; // default 'left'
  headingAlign: 'left' | 'center'; // default 'left'
  tableBorderColor: string | null; // null = auto (use palette text)
  tableBorderWidth: 1 | 2 | 3; // default 1
  tableBorderStyle: 'solid' | 'dashed' | 'dotted' | 'none'; // default 'solid'
  tableHeaderBg: string | null; // null = auto (use palette sectionBg)
}

/** Resolved newsletter style with all colors filled in (no nulls) */
export interface ResolvedNewsletterStyle {
  borderColor: string;
  backgroundColor: string;
  headingColor: string;
  borderStyle: 'left' | 'full' | 'none' | 'top';
  headingAlign: 'left' | 'center';
  tableBorderColor: string;
  tableBorderWidth: 1 | 2 | 3;
  tableBorderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  tableHeaderBg: string;
}

export const DEFAULT_NEWSLETTER_STYLE: NewsletterStyle = {
  borderColor: null,
  backgroundColor: null,
  headingColor: null,
  borderStyle: 'left',
  headingAlign: 'left',
  tableBorderColor: null,
  tableBorderWidth: 1,
  tableBorderStyle: 'solid',
  tableHeaderBg: null,
};

/** User-customizable email color palette */
export interface EmailPaletteConfig {
  footerBg: string;
  sectionBg: string;
  unsubscribeBg: string;
  accent: string;
  text: string;
  link: string;
  noteBorder: string;
  headerBorder: string;
  bodyBg: string;
  footerText: string;
}

export const DEFAULT_EMAIL_PALETTE: EmailPaletteConfig = {
  footerBg: '#2c3e50',
  sectionBg: '#f5f5f5',
  unsubscribeBg: '#f4f4f4',
  accent: '#ffd700',
  text: '#333333',
  link: '#0066cc',
  noteBorder: '#ddd',
  headerBorder: 'gray',
  bodyBg: 'white',
  footerText: 'white',
};

/** Style overrides for How to Shop / Important Notes boxes */
export interface SectionBoxStyle {
  borderColor: string | null; // null = use palette default
  backgroundColor: string | null; // null = use palette default
}

export const DEFAULT_HOW_TO_SHOP_STYLE: SectionBoxStyle = {
  borderColor: null, // no border by default
  backgroundColor: null, // uses palette sectionBg
};

export const DEFAULT_IMPORTANT_NOTES_STYLE: SectionBoxStyle = {
  borderColor: null, // uses palette noteBorder
  backgroundColor: null, // no background by default
};

export interface PromotionPersistedState {
  promoDateRange: string;
  promoYear: string;
  promoTitle: string;
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  howToShopStyle: SectionBoxStyle;
  importantNotesStyle: SectionBoxStyle;
  attachedPDFs: AttachedPDFMetadata[];
  generatedSubjectLines: string[];
  selectedSubjectLine: string | null;
  preheaderText: string;
  newsletterHeading: string;
  newsletterBody: string;
  newsletterPosition: NewsletterPosition;
  newsletterStyle: NewsletterStyle;
  newsletterVisible: boolean;
  emailPalette: EmailPaletteConfig;
}

// ===== Store State & Actions =====

export interface PromotionState {
  // Data
  promoDateRange: string;
  promoYear: string;
  promoTitle: string;
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  howToShopStyle: SectionBoxStyle;
  importantNotesStyle: SectionBoxStyle;
  attachedPDFs: AttachedPDF[];
  generatedSubjectLines: string[];
  selectedSubjectLine: string | null;
  preheaderText: string;
  subjectLineManuallyEdited: boolean;
  entryCollapsedStates: Record<number, boolean>;
  columnState: ColumnState;
  isInitializing: boolean;

  // Newsletter
  newsletterHeading: string;
  newsletterBody: string;
  newsletterPosition: NewsletterPosition;
  newsletterStyle: NewsletterStyle;
  newsletterVisible: boolean;

  // Email palette
  emailPalette: EmailPaletteConfig;

  // Save status
  saveStatus: 'ok' | 'warning';

  // Transient: set when one or more PDF attachments couldn't be restored on
  // load. Not persisted (a persisted warning flag would re-fire forever).
  pdfRestoreWarning: boolean;

  // Bulk email generation state (shared between card and preview button)
  bulkEmailGenerating: boolean;
  bulkEmailProgress: string;
  setBulkEmailGenerating: (generating: boolean, progress?: string) => void;
  bulkEmailHasRecipients: boolean;
  setBulkEmailHasRecipients: (has: boolean) => void;
  /** Raw recipient list text, shared so both layouts and the preview panel see one value */
  bulkEmailRecipients: string;
  setBulkEmailRecipients: (text: string) => void;

  // Promotion entry actions
  addPromotionEntry: () => void;
  removePromotionEntry: (id: number) => void;
  updatePromotionEntry: (
    id: number,
    field: keyof Pick<PromotionEntry, 'line' | 'collections' | 'callout'>,
    value: string
  ) => void;
  movePromotionEntryUp: (id: number) => void;
  movePromotionEntryDown: (id: number) => void;
  reorderPromotionEntries: (oldIndex: number, newIndex: number) => void;
  clearPromotionEntries: () => void;
  toggleEntryCollapse: (id: number) => void;

  // Special hours actions
  addSpecialHour: () => void;
  removeSpecialHour: (id: number) => void;
  updateSpecialHour: (
    id: number,
    field: keyof Pick<SpecialHour, 'day' | 'hours'>,
    value: string
  ) => void;
  moveSpecialHourUp: (id: number) => void;
  moveSpecialHourDown: (id: number) => void;
  reorderSpecialHours: (oldIndex: number, newIndex: number) => void;
  clearSpecialHours: () => void;

  // How-to-shop actions
  addHowToShopItem: () => void;
  removeHowToShopItem: (id: number) => void;
  updateHowToShopItem: (id: number, text: string) => void;
  moveHowToShopItemUp: (id: number) => void;
  moveHowToShopItemDown: (id: number) => void;
  reorderHowToShopItems: (oldIndex: number, newIndex: number) => void;
  toggleHowToShopFormat: (
    id: number,
    format: 'bold' | 'italic' | 'underline'
  ) => void;
  clearHowToShopItems: () => void;

  // Important notes actions
  addImportantNotesItem: () => void;
  removeImportantNotesItem: (id: number) => void;
  updateImportantNotesItem: (id: number, text: string) => void;
  moveImportantNotesItemUp: (id: number) => void;
  moveImportantNotesItemDown: (id: number) => void;
  reorderImportantNotesItems: (oldIndex: number, newIndex: number) => void;
  toggleImportantNotesFormat: (
    id: number,
    format: 'bold' | 'italic' | 'underline'
  ) => void;
  clearImportantNotesItems: () => void;

  // Section box style actions
  setHowToShopStyle: (style: Partial<SectionBoxStyle>) => void;
  setImportantNotesStyle: (style: Partial<SectionBoxStyle>) => void;

  // PDF actions
  addPDF: (pdf: AttachedPDF) => Promise<void>;
  removePDF: (id: string) => Promise<void>;
  clearAllPDFs: () => Promise<void>;

  // Subject line actions
  setGeneratedSubjectLines: (lines: string[]) => void;
  setSelectedSubjectLine: (line: string | null) => void;
  setSubjectLineManuallyEdited: (edited: boolean) => void;
  setPreheaderText: (text: string) => void;

  // Column state
  setColumnState: (state: ColumnState) => void;

  // Basic details
  setPromoDateRange: (value: string) => void;
  setPromoYear: (value: string) => void;
  setPromoTitle: (value: string) => void;
  // Newsletter actions
  setNewsletterHeading: (value: string) => void;
  setNewsletterBody: (value: string) => void;
  setNewsletterPosition: (value: NewsletterPosition) => void;
  setNewsletterStyle: (style: Partial<NewsletterStyle>) => void;
  setNewsletterVisible: (visible: boolean) => void;
  clearNewsletter: () => void;

  // Email palette actions
  setEmailPalette: (palette: Partial<EmailPaletteConfig>) => void;
  resetEmailPalette: () => void;

  // Initialization
  setInitializing: (value: boolean) => void;
  clearPdfRestoreWarning: () => void;
  initializeDefaultItems: () => void;

  // Auto-save / persistence
  persistState: () => Promise<void>;
  restoreState: () => Promise<void>;
  resetState: () => void;
}

// ===== Helpers =====

// Monotonic counter to guarantee unique IDs even within the same millisecond
let _idCounter = 0;

/** Generate a unique numeric item id (also used by config import). */
export function generateId(): number {
  // Combine timestamp with counter for uniqueness. The counter wraps at
  // 1000 so it stays within the millisecond slot and can't drift into a
  // future timestamp's range over a long session.
  _idCounter = (_idCounter + 1) % 1000;
  return Date.now() * 1000 + _idCounter;
}

/** Reset ID counter (useful for testing) */
export function _resetIdCounter(): void {
  _idCounter = 0;
}

/**
 * Config for the auto-managed profile-driven lines (How-to-Shop Email/Call,
 * Important Notes "Find us at"): each field maps to how its value is read, how
 * it renders, and the legacy template used to adopt pre-tagging lines. Single
 * source of truth shared by seeding, the on-load refresh, and `autoLineText`,
 * so they can never disagree. Add a line by adding a key here and to the
 * `AutoField` union.
 */
const AUTO_LINE_CONFIG: Record<
  AutoField,
  {
    getValue: () => string;
    render: (value: string) => string;
    /** Matches the app's own default template, for one-time legacy adoption. */
    legacyPattern: RegExp;
  }
> = {
  storePhone: {
    getValue: getStorePhone,
    render: (value) => `Call ${value} for availability`,
    legacyPattern: /^Call\s+.*\d.*\s+for availability\s*$/,
  },
  storeEmail: {
    getValue: getStoreEmail,
    render: (value) => `Email ${value}`,
    legacyPattern: /^Email\s+\S+@\S+\.\S+\s*$/,
  },
  storeDirections: {
    getValue: getDirections,
    render: (value) => `Find us at ${value}`,
    legacyPattern: /^Find us at\s+\S.*$/,
  },
};

/** An item that may be auto-managed from the profile. */
type AutoManaged = { text: string; autoField?: AutoField };

/**
 * Canonical text for an auto-managed line, derived live from the current
 * profile via {@link AUTO_LINE_CONFIG}.
 */
export function autoLineText(field: AutoField): string {
  const { getValue, render } = AUTO_LINE_CONFIG[field];
  return render(getValue());
}

/**
 * One-time migration: tag lines matching one of `fields`' canonical default
 * templates (created before auto-managed tagging existed) so they can follow
 * the profile. Deliberately conservative — only lines that look like the app's
 * own defaults are adopted, so a hand-written line is very unlikely to be
 * captured. Callers pass the fields valid for that list (email/phone for
 * How-to-Shop, directions for Important Notes).
 */
export function adoptLegacyAutoLines<T extends AutoManaged>(
  items: T[],
  fields: AutoField[]
): T[] {
  return items.map((item) => {
    if (item.autoField) return item;
    const match = fields.find((f) =>
      AUTO_LINE_CONFIG[f].legacyPattern.test(item.text)
    );
    return match ? { ...item, autoField: match } : item;
  });
}

/**
 * Regenerate every auto-managed line's text from the current profile, and DROP
 * any auto-managed line whose profile field is empty — an unset field produces
 * no blank entry. Untagged lines (manual edits, other defaults) pass through
 * untouched.
 */
export function refreshAutoLines<T extends AutoManaged>(items: T[]): T[] {
  return items.flatMap((item) => {
    if (!item.autoField) return [item];
    const { getValue, render } = AUTO_LINE_CONFIG[item.autoField];
    const value = getValue();
    if (!value.trim()) return [];
    return [{ ...item, text: render(value) }];
  });
}

function reorderItems<T>(items: T[], oldIndex: number, newIndex: number): T[] {
  if (oldIndex === newIndex) return items;
  const result = [...items];
  const [removed] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, removed);
  return result;
}

function moveItemUp<T extends { id: number }>(items: T[], id: number): T[] {
  const index = items.findIndex((item) => item.id === id);
  if (index <= 0) return items;
  const newItems = [...items];
  [newItems[index - 1], newItems[index]] = [
    newItems[index],
    newItems[index - 1],
  ];
  return newItems;
}

function moveItemDown<T extends { id: number }>(items: T[], id: number): T[] {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0 || index >= items.length - 1) return items;
  const newItems = [...items];
  [newItems[index], newItems[index + 1]] = [
    newItems[index + 1],
    newItems[index],
  ];
  return newItems;
}

function toggleItemFormat<T extends { id: number }>(
  items: T[],
  id: number,
  format: keyof T
): T[] {
  return items.map((i) => (i.id === id ? { ...i, [format]: !i[format] } : i));
}

/** State keys whose value is an array of items with a numeric `id`. */
type ListStateKey = {
  [K in keyof PromotionState]: PromotionState[K] extends Array<{ id: number }>
    ? K
    : never;
}[keyof PromotionState];

type StoreSet = (
  partial:
    | Partial<PromotionState>
    | ((state: PromotionState) => Partial<PromotionState>)
) => void;

/**
 * Build the standard add/remove/update/move/reorder actions for one of the
 * store's `{ id }[]` list fields. Collapses four near-identical CRUD families
 * into one typed factory.
 */
function createListActions<K extends ListStateKey>(
  set: StoreSet,
  key: K,
  createItem: () => PromotionState[K][number]
) {
  type Item = PromotionState[K][number];
  const writeList = (next: (items: Item[]) => Item[]) =>
    set((s) => ({ [key]: next(s[key] as Item[]) }) as Partial<PromotionState>);
  return {
    add: () => writeList((items) => [...items, createItem()]),
    remove: (id: number) =>
      writeList((items) => items.filter((i) => i.id !== id)),
    update: (id: number, patch: Partial<Item>) =>
      writeList((items) =>
        items.map((i) => (i.id === id ? { ...i, ...patch } : i))
      ),
    moveUp: (id: number) => writeList((items) => moveItemUp(items, id)),
    moveDown: (id: number) => writeList((items) => moveItemDown(items, id)),
    reorder: (oldIndex: number, newIndex: number) =>
      writeList((items) => reorderItems(items, oldIndex, newIndex)),
  };
}

function getEmptyState() {
  return {
    promoDateRange: '' as string,
    promoYear: '' as string,
    promoTitle: '' as string,
    promotionEntries: [] as PromotionEntry[],
    specialHours: [] as SpecialHour[],
    howToShopItems: [] as HowToShopItem[],
    importantNotesItems: [] as ImportantNotesItem[],
    howToShopStyle: { ...DEFAULT_HOW_TO_SHOP_STYLE } as SectionBoxStyle,
    importantNotesStyle: {
      ...DEFAULT_IMPORTANT_NOTES_STYLE,
    } as SectionBoxStyle,
    attachedPDFs: [] as AttachedPDF[],
    generatedSubjectLines: [] as string[],
    selectedSubjectLine: null as string | null,
    preheaderText: '' as string,
    newsletterHeading: 'Newsletter' as string,
    newsletterBody: '' as string,
    newsletterPosition: 'top' as NewsletterPosition,
    newsletterStyle: { ...DEFAULT_NEWSLETTER_STYLE } as NewsletterStyle,
    newsletterVisible: false as boolean,
    emailPalette: { ...DEFAULT_EMAIL_PALETTE } as EmailPaletteConfig,
    saveStatus: 'ok' as 'ok' | 'warning',
  };
}

/** The list-CRUD slice of the store, built from the generic factory above. */
type PromotionListActions = Pick<
  PromotionState,
  | 'addPromotionEntry'
  | 'removePromotionEntry'
  | 'updatePromotionEntry'
  | 'movePromotionEntryUp'
  | 'movePromotionEntryDown'
  | 'reorderPromotionEntries'
  | 'addSpecialHour'
  | 'removeSpecialHour'
  | 'updateSpecialHour'
  | 'moveSpecialHourUp'
  | 'moveSpecialHourDown'
  | 'reorderSpecialHours'
  | 'addHowToShopItem'
  | 'removeHowToShopItem'
  | 'updateHowToShopItem'
  | 'moveHowToShopItemUp'
  | 'moveHowToShopItemDown'
  | 'reorderHowToShopItems'
  | 'toggleHowToShopFormat'
  | 'addImportantNotesItem'
  | 'removeImportantNotesItem'
  | 'updateImportantNotesItem'
  | 'moveImportantNotesItemUp'
  | 'moveImportantNotesItemDown'
  | 'reorderImportantNotesItems'
  | 'toggleImportantNotesFormat'
>;

function createPromotionListActions(set: StoreSet): PromotionListActions {
  const entries = createListActions(set, 'promotionEntries', () => ({
    id: generateId(),
    line: '',
    collections: '',
    callout: '',
  }));
  const hours = createListActions(set, 'specialHours', () => ({
    id: generateId(),
    day: '',
    hours: '',
  }));
  const howToShop = createListActions(set, 'howToShopItems', () => ({
    id: generateId(),
    text: '',
    bold: false,
    italic: false,
    underline: false,
  }));
  const notes = createListActions(set, 'importantNotesItems', () => ({
    id: generateId(),
    text: '',
    bold: false,
    italic: false,
    underline: false,
  }));

  return {
    addPromotionEntry: entries.add,
    removePromotionEntry: entries.remove,
    updatePromotionEntry: (id, field, value) =>
      entries.update(id, { [field]: value } as Partial<PromotionEntry>),
    movePromotionEntryUp: entries.moveUp,
    movePromotionEntryDown: entries.moveDown,
    reorderPromotionEntries: entries.reorder,

    addSpecialHour: hours.add,
    removeSpecialHour: hours.remove,
    updateSpecialHour: (id, field, value) =>
      hours.update(id, { [field]: value } as Partial<SpecialHour>),
    moveSpecialHourUp: hours.moveUp,
    moveSpecialHourDown: hours.moveDown,
    reorderSpecialHours: hours.reorder,

    addHowToShopItem: howToShop.add,
    removeHowToShopItem: howToShop.remove,
    updateHowToShopItem: (id, text) =>
      howToShop.update(id, { text, autoField: undefined }),
    moveHowToShopItemUp: howToShop.moveUp,
    moveHowToShopItemDown: howToShop.moveDown,
    reorderHowToShopItems: howToShop.reorder,
    toggleHowToShopFormat: (id, format) =>
      set((s) => ({
        howToShopItems: toggleItemFormat(s.howToShopItems, id, format),
      })),

    addImportantNotesItem: notes.add,
    removeImportantNotesItem: notes.remove,
    updateImportantNotesItem: (id, text) =>
      notes.update(id, { text, autoField: undefined }),
    moveImportantNotesItemUp: notes.moveUp,
    moveImportantNotesItemDown: notes.moveDown,
    reorderImportantNotesItems: notes.reorder,
    toggleImportantNotesFormat: (id, format) =>
      set((s) => ({
        importantNotesItems: toggleItemFormat(
          s.importantNotesItems,
          id,
          format
        ),
      })),
  };
}

// ===== Store =====

export const usePromotionStore = create<PromotionState>((set, get) => ({
  // Initial state
  ...getEmptyState(),
  saveStatus: 'ok' as 'ok' | 'warning',
  pdfRestoreWarning: false,
  subjectLineManuallyEdited: false,
  entryCollapsedStates: {},
  columnState: 'left' as ColumnState,
  isInitializing: true,
  bulkEmailGenerating: false,
  bulkEmailProgress: '',
  bulkEmailHasRecipients: false,
  bulkEmailRecipients: '',

  setBulkEmailGenerating: (generating, progress = '') =>
    set({ bulkEmailGenerating: generating, bulkEmailProgress: progress }),

  setBulkEmailHasRecipients: (has) => set({ bulkEmailHasRecipients: has }),

  setBulkEmailRecipients: (text) =>
    set({
      bulkEmailRecipients: text,
      bulkEmailHasRecipients: text.trim().length > 0,
    }),

  // ===== List CRUD Actions (entries, hours, how-to-shop, notes) =====
  ...createPromotionListActions(set),

  // Not part of createPromotionListActions: dropping every entry also has to
  // drop the per-entry collapse flags, which are keyed by entry id and live
  // outside the list itself. Leaving them behind would leak ids forever, since
  // nothing else prunes entryCollapsedStates.
  clearPromotionEntries: () =>
    set({ promotionEntries: [], entryCollapsedStates: {} }),

  // The other lists have no side-state keyed by item id, so clearing them is
  // just an empty-array set.
  clearSpecialHours: () => set({ specialHours: [] }),
  clearHowToShopItems: () => set({ howToShopItems: [] }),
  clearImportantNotesItems: () => set({ importantNotesItems: [] }),

  toggleEntryCollapse: (id: number) =>
    set((state) => ({
      entryCollapsedStates: {
        ...state.entryCollapsedStates,
        [id]: !state.entryCollapsedStates[id],
      },
    })),

  // ===== Section Box Style Actions =====

  setHowToShopStyle: (style: Partial<SectionBoxStyle>) =>
    set((state) => ({
      howToShopStyle: { ...state.howToShopStyle, ...style },
    })),

  setImportantNotesStyle: (style: Partial<SectionBoxStyle>) =>
    set((state) => ({
      importantNotesStyle: { ...state.importantNotesStyle, ...style },
    })),

  // ===== PDF Actions =====

  addPDF: async (pdf: AttachedPDF) => {
    set((state) => ({
      attachedPDFs: [...state.attachedPDFs, pdf],
    }));
    // Persist the blob to IndexedDB once, at add time. Auto-save then only
    // rewrites the lightweight metadata JSON — not the base64 payload — so a
    // few multi-MB PDFs no longer get serialized to disk on every keystroke.
    // Errors propagate so the caller can surface a "won't persist" warning.
    if (pdf.data) {
      await savePDFToIndexedDB({ id: pdf.id, name: pdf.name, data: pdf.data });
    }
  },

  removePDF: async (id: string) => {
    try {
      await deletePDFFromIndexedDB(id);
    } catch {
      // Non-blocking: state update proceeds even if IndexedDB fails
    }
    set((state) => ({
      attachedPDFs: state.attachedPDFs.filter((p) => p.id !== id),
    }));
  },

  clearAllPDFs: async () => {
    try {
      await clearAllPDFsFromIndexedDB();
    } catch {
      // Non-blocking: state update proceeds even if IndexedDB fails
    }
    set({
      attachedPDFs: [],
    });
  },

  // ===== Subject Line Actions =====

  setGeneratedSubjectLines: (lines: string[]) =>
    set({ generatedSubjectLines: lines }),

  setSelectedSubjectLine: (line: string | null) =>
    set({ selectedSubjectLine: line }),

  setSubjectLineManuallyEdited: (edited: boolean) =>
    set({ subjectLineManuallyEdited: edited }),

  setPreheaderText: (text: string) => set({ preheaderText: text }),

  // ===== Column State =====

  setColumnState: (columnState: ColumnState) => set({ columnState }),

  // ===== Basic Details =====

  setPromoDateRange: (value: string) => set({ promoDateRange: value }),
  setPromoYear: (value: string) => set({ promoYear: value }),
  setPromoTitle: (value: string) => set({ promoTitle: value }),
  // ===== Newsletter Actions =====

  setNewsletterHeading: (value: string) => set({ newsletterHeading: value }),
  setNewsletterBody: (value: string) => set({ newsletterBody: value }),
  setNewsletterPosition: (value: NewsletterPosition) =>
    set({ newsletterPosition: value }),
  setNewsletterStyle: (style: Partial<NewsletterStyle>) =>
    set((state) => ({
      newsletterStyle: { ...state.newsletterStyle, ...style },
    })),
  setNewsletterVisible: (visible: boolean) =>
    set({ newsletterVisible: visible }),
  clearNewsletter: () =>
    set({
      newsletterHeading: 'Newsletter',
      newsletterBody: '',
      newsletterPosition: 'top',
      newsletterStyle: { ...DEFAULT_NEWSLETTER_STYLE },
    }),

  // ===== Email Palette Actions =====

  setEmailPalette: (palette: Partial<EmailPaletteConfig>) =>
    set((state) => ({
      emailPalette: { ...state.emailPalette, ...palette },
    })),
  resetEmailPalette: () => set({ emailPalette: { ...DEFAULT_EMAIL_PALETTE } }),

  // ===== Initialization =====

  setInitializing: (value: boolean) => set({ isInitializing: value }),

  clearPdfRestoreWarning: () => set({ pdfRestoreWarning: false }),

  initializeDefaultItems: () => {
    const state = get();

    // Only populate defaults when arrays are empty (i.e., no saved state)
    const updates: Partial<PromotionState> = {};

    if (state.howToShopItems.length === 0) {
      // Fixed seed order; auto lines carry an `autoField` and are dropped when
      // their profile field is empty, so an unset store phone/email never
      // produces a blank entry.
      const seed: Array<
        { text: string } | { autoField: 'storeEmail' | 'storePhone' }
      > = [
        { text: 'Visit us in-store for outlet-exclusive deals' },
        { autoField: 'storePhone' },
        { text: '$20 flat-rate ground shipping in US' },
        { autoField: 'storeEmail' },
      ];

      updates.howToShopItems = seed.flatMap((entry) => {
        const base = {
          id: generateId(),
          bold: false,
          italic: false,
          underline: false,
        };
        if ('text' in entry) return [{ ...base, text: entry.text }];
        const { getValue, render } = AUTO_LINE_CONFIG[entry.autoField];
        const value = getValue();
        if (!value.trim()) return [];
        return [{ ...base, text: render(value), autoField: entry.autoField }];
      });
    }

    if (state.importantNotesItems.length === 0) {
      const defaultNotes: ImportantNotesItem[] = [
        {
          id: generateId(),
          text: '*Select models only',
          bold: false,
          italic: false,
          underline: false,
        },
        {
          id: generateId(),
          text: 'See attached PDF for complete model details',
          bold: false,
          italic: false,
          underline: false,
        },
        {
          id: generateId(),
          text: 'Limited availability - while supplies last',
          bold: false,
          italic: false,
          underline: false,
        },
        {
          id: generateId(),
          text: 'Email response time up to 48 hours',
          bold: false,
          italic: false,
          underline: false,
        },
      ];

      // Add store directions note if available. Tagged storeDirections so it
      // follows the profile like the How-to-Shop contact lines do.
      const directions = getDirections().trim();
      if (directions) {
        const directionsLower = directions.toLowerCase();
        const hasDirectionsNote = defaultNotes.some(
          (item) =>
            item.text.toLowerCase().includes(directionsLower) ||
            item.text.toLowerCase().includes('find us at') ||
            item.text.toLowerCase().includes('directions')
        );

        if (!hasDirectionsNote) {
          defaultNotes.push({
            id: generateId(),
            text: autoLineText('storeDirections'),
            bold: false,
            italic: false,
            underline: false,
            autoField: 'storeDirections',
          });
        }
      }

      updates.importantNotesItems = defaultNotes;
    }

    if (Object.keys(updates).length > 0) {
      set(updates as Partial<PromotionState>);
    }
  },

  // ===== Auto-Save / Persistence =====

  persistState: async () => {
    const state = get();
    const persistData: PromotionPersistedState = {
      promoDateRange: state.promoDateRange,
      promoYear: state.promoYear,
      promoTitle: state.promoTitle,
      promotionEntries: state.promotionEntries,
      specialHours: state.specialHours,
      howToShopItems: state.howToShopItems,
      importantNotesItems: state.importantNotesItems,
      howToShopStyle: state.howToShopStyle,
      importantNotesStyle: state.importantNotesStyle,
      attachedPDFs: state.attachedPDFs.map((pdf) => ({
        id: pdf.id,
        name: pdf.name,
        size: pdf.size,
        type: pdf.type,
      })),
      generatedSubjectLines: state.generatedSubjectLines,
      selectedSubjectLine: state.selectedSubjectLine,
      preheaderText: state.preheaderText,
      newsletterHeading: state.newsletterHeading,
      newsletterBody: state.newsletterBody,
      newsletterPosition: state.newsletterPosition,
      newsletterStyle: state.newsletterStyle,
      newsletterVisible: state.newsletterVisible,
      emailPalette: state.emailPalette,
    };

    // PDF blobs are persisted to IndexedDB once, at add time (see addPDF), and
    // removed in removePDF/clearAllPDFs. Stale blobs are swept on load. So the
    // hot auto-save path only writes the lightweight metadata JSON below.
    try {
      localStorage.setItem(
        StorageKeys.promotionBuilderState,
        JSON.stringify(persistData)
      );
      set({ saveStatus: 'ok' });
    } catch (error) {
      console.warn('Auto-save failed:', error);
      set({ saveStatus: 'warning' });
    }
  },

  restoreState: async () => {
    // Re-arm the initialization flag so auto-save stays suppressed for the
    // whole restore (IndexedDB reads, hydration loop, orphan sweep) — exactly
    // like first mount. Without this, a second restore (snapshot/import) runs
    // with the flag false and a pending keystroke-save can clobber the
    // snapshot mid-restore.
    set({ isInitializing: true });
    try {
      await initIndexedDB();

      // Restore bulk email recipients so generation works even before the
      // Bulk Email Tools card is opened.
      try {
        const recipients = await getBulkEmailRecipientsFromIndexedDB();
        if (recipients) {
          set({
            bulkEmailRecipients: recipients,
            bulkEmailHasRecipients: recipients.trim().length > 0,
          });
        }
      } catch {
        // Non-blocking: recipients just start empty
      }

      const stored = localStorage.getItem(StorageKeys.promotionBuilderState);
      if (!stored) {
        set({ isInitializing: false, saveStatus: 'ok' });
        return;
      }

      const parsed: PromotionPersistedState & {
        attachedPDFs?: Array<AttachedPDFMetadata & { data?: string }>;
      } = JSON.parse(stored);

      // Restore PDFs: prefer IndexedDB data, fallback to legacy localStorage
      // data. Reads run in parallel (allSettled so one failing blob can't
      // abort the rest); the results array preserves input order.
      const restoredPDFs: AttachedPDF[] = [];
      const pdfRestoreResults = await Promise.allSettled(
        (parsed.attachedPDFs || []).map(
          async (metadata: AttachedPDFMetadata & { data?: string }) => {
            // Try IndexedDB first
            try {
              const fullPdfData: PDFRecord | null = await getPDFFromIndexedDB(
                metadata.id
              );
              if (fullPdfData && fullPdfData.data) {
                return {
                  id: metadata.id,
                  name: metadata.name,
                  size: metadata.size,
                  type: metadata.type,
                  data: fullPdfData.data,
                };
              }
            } catch {
              // IndexedDB read failed, try legacy fallback
            }

            // Legacy fallback: if localStorage had data (old format)
            if (metadata.data) {
              return {
                id: metadata.id,
                name: metadata.name,
                size: metadata.size,
                type: metadata.type,
                data: metadata.data,
              };
            }
            // If no IndexedDB data and no legacy data, omit the PDF
            return null;
          }
        )
      );

      for (const result of pdfRestoreResults) {
        if (result.status === 'fulfilled' && result.value) {
          restoredPDFs.push(result.value);
        }
      }

      const expectedCount = parsed.attachedPDFs?.length ?? 0;
      const pdfRestoreWarning = restoredPDFs.length < expectedCount;
      if (pdfRestoreWarning) {
        console.warn(
          `PDF restore: ${expectedCount - restoredPDFs.length} of ${expectedCount} attachment(s) could not be restored`
        );
      }

      // Orphan cleanup: remove IndexedDB blobs no longer referenced by the
      // restored metadata. Runs once per load instead of on every auto-save.
      try {
        const allKeys = await getAllPDFKeysFromIndexedDB();
        // Guard the sweep against PDFs attached while the restore's awaited
        // reads were in flight: their blobs are in IndexedDB but not yet in
        // the restored metadata, so include the in-memory list too.
        const currentIds = new Set([
          ...(parsed.attachedPDFs || []).map((p) => p.id),
          ...get().attachedPDFs.map((p) => p.id),
        ]);
        // Issue the deletes in parallel; allSettled so one failing delete
        // can't abort the rest of the sweep.
        const toDelete = allKeys.filter((k) => !currentIds.has(k));
        await Promise.allSettled(
          toDelete.map((k) => deletePDFFromIndexedDB(k))
        );
      } catch {
        // Best-effort orphan cleanup
      }

      // Migration: if body doesn't start with an H2 but has a heading,
      // prepend the heading as an H2 element in the body
      let loadedBody = parsed.newsletterBody || '';
      const loadedHeading = parsed.newsletterHeading || 'Newsletter';
      if (loadedHeading !== 'Newsletter') {
        loadedBody = prependHeadingIfMissing(loadedBody, loadedHeading);
      }

      // Auto-managed lines follow the profile: adopt any legacy lines that
      // match the default templates, then refresh every tagged line from the
      // current profile. Manually edited lines are untagged (see the update
      // actions) and therefore left untouched. How-to-Shop carries the
      // Email/Call lines; Important Notes carries the "Find us at" line.
      const loadedHowToShop = refreshAutoLines(
        adoptLegacyAutoLines(parsed.howToShopItems || [], [
          'storeEmail',
          'storePhone',
        ])
      );
      const loadedImportantNotes = refreshAutoLines(
        adoptLegacyAutoLines(parsed.importantNotesItems || [], [
          'storeDirections',
        ])
      );

      set({
        promotionEntries: parsed.promotionEntries || [],
        specialHours: parsed.specialHours || [],
        howToShopItems: loadedHowToShop,
        importantNotesItems: loadedImportantNotes,
        howToShopStyle: sanitizePersistedStyles(parsed.howToShopStyle, {
          ...DEFAULT_HOW_TO_SHOP_STYLE,
        }),
        importantNotesStyle: sanitizePersistedStyles(
          parsed.importantNotesStyle,
          {
            ...DEFAULT_IMPORTANT_NOTES_STYLE,
          }
        ),
        attachedPDFs: restoredPDFs,
        generatedSubjectLines: parsed.generatedSubjectLines || [],
        selectedSubjectLine: parsed.selectedSubjectLine || null,
        preheaderText: parsed.preheaderText || '',
        promoDateRange: parsed.promoDateRange || '',
        promoYear: parsed.promoYear || '',
        promoTitle: parsed.promoTitle || '',
        newsletterHeading: loadedHeading,
        newsletterBody: loadedBody,
        newsletterPosition: parsed.newsletterPosition || 'top',
        newsletterStyle: sanitizePersistedStyles(parsed.newsletterStyle, {
          ...DEFAULT_NEWSLETTER_STYLE,
        }),
        newsletterVisible: parsed.newsletterVisible ?? false,
        emailPalette: sanitizePersistedStyles(parsed.emailPalette, {
          ...DEFAULT_EMAIL_PALETTE,
        }),
        isInitializing: false,
        saveStatus: 'ok',
        pdfRestoreWarning,
      });
    } catch (error) {
      console.warn('Failed to load promotion state:', error);
      set({ isInitializing: false, saveStatus: 'ok' });
    }
  },

  resetState: () =>
    set({
      ...getEmptyState(),
      subjectLineManuallyEdited: false,
      entryCollapsedStates: {},
      columnState: 'left' as ColumnState,
      isInitializing: false,
      bulkEmailRecipients: '',
      bulkEmailHasRecipients: false,
    }),
}));
