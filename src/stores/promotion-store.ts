/**
 * Zustand store for promotion page state.
 * Manages all promotion builder data: entries, special hours,
 * how-to-shop items, important notes, PDFs, subject lines,
 * column collapse state, and auto-save to IndexedDB.
 */

import { create } from 'zustand';
import {
  savePDFToIndexedDB,
  getPDFFromIndexedDB,
  type PDFRecord,
} from '@/lib/db';

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

export interface HowToShopItem {
  id: number;
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface ImportantNotesItem {
  id: number;
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface AttachedPDF {
  id: string;
  name: string;
  size: number;
  type: string;
  data?: string; // data URL (base64)
}

export interface SubjectLine {
  text: string;
}

export type ColumnState = 'left-expanded' | 'center-expanded';

/** Serialized state for IndexedDB persistence */
export interface PromotionPersistedState {
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  attachedPDFs: AttachedPDF[];
  generatedSubjectLines: string[];
  selectedSubjectLine: string | null;
}

// ===== Store State & Actions =====

export interface PromotionState {
  // Data
  promotionEntries: PromotionEntry[];
  specialHours: SpecialHour[];
  howToShopItems: HowToShopItem[];
  importantNotesItems: ImportantNotesItem[];
  attachedPDFs: AttachedPDF[];
  generatedSubjectLines: string[];
  selectedSubjectLine: string | null;
  subjectLineManuallyEdited: boolean;
  entryCollapsedStates: Record<number, boolean>;
  columnState: ColumnState;
  isInitializing: boolean;

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

  // How-to-shop actions
  addHowToShopItem: () => void;
  removeHowToShopItem: (id: number) => void;
  updateHowToShopItem: (id: number, text: string) => void;
  moveHowToShopItemUp: (id: number) => void;
  moveHowToShopItemDown: (id: number) => void;
  toggleHowToShopFormat: (
    id: number,
    format: 'bold' | 'italic' | 'underline'
  ) => void;

  // Important notes actions
  addImportantNotesItem: () => void;
  removeImportantNotesItem: (id: number) => void;
  updateImportantNotesItem: (id: number, text: string) => void;
  moveImportantNotesItemUp: (id: number) => void;
  moveImportantNotesItemDown: (id: number) => void;
  toggleImportantNotesFormat: (
    id: number,
    format: 'bold' | 'italic' | 'underline'
  ) => void;

  // PDF actions
  addPDF: (pdf: AttachedPDF) => void;
  removePDF: (id: string) => void;
  clearAllPDFs: () => void;

  // Subject line actions
  setGeneratedSubjectLines: (lines: string[]) => void;
  setSelectedSubjectLine: (line: string | null) => void;
  setSubjectLineManuallyEdited: (edited: boolean) => void;

  // Column state
  setColumnState: (state: ColumnState) => void;

  // Initialization
  setInitializing: (value: boolean) => void;

  // Auto-save / persistence
  saveToIndexedDB: () => Promise<void>;
  loadFromIndexedDB: () => Promise<void>;
  resetState: () => void;
}

// ===== Helpers =====

// Monotonic counter to guarantee unique IDs even within the same millisecond
let _idCounter = 0;

function generateId(): number {
  // Combine timestamp with counter for uniqueness
  return Date.now() * 1000 + ++_idCounter;
}

/** Reset ID counter (useful for testing) */
export function _resetIdCounter(): void {
  _idCounter = 0;
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

const STORAGE_KEY = 'promotionBuilderState';

function getEmptyState() {
  return {
    promotionEntries: [] as PromotionEntry[],
    specialHours: [] as SpecialHour[],
    howToShopItems: [] as HowToShopItem[],
    importantNotesItems: [] as ImportantNotesItem[],
    attachedPDFs: [] as AttachedPDF[],
    generatedSubjectLines: [] as string[],
    selectedSubjectLine: null as string | null,
  };
}

// ===== Store =====

export const usePromotionStore = create<PromotionState>((set, get) => ({
  // Initial state
  ...getEmptyState(),
  subjectLineManuallyEdited: false,
  entryCollapsedStates: {},
  columnState: 'left-expanded' as ColumnState,
  isInitializing: true,

  // ===== Promotion Entry Actions =====

  addPromotionEntry: () =>
    set((state) => ({
      promotionEntries: [
        ...state.promotionEntries,
        {
          id: generateId(),
          line: '',
          collections: '',
          callout: '',
        },
      ],
    })),

  removePromotionEntry: (id: number) =>
    set((state) => ({
      promotionEntries: state.promotionEntries.filter((e) => e.id !== id),
    })),

  updatePromotionEntry: (
    id: number,
    field: keyof Pick<PromotionEntry, 'line' | 'collections' | 'callout'>,
    value: string
  ) =>
    set((state) => ({
      promotionEntries: state.promotionEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    })),

  movePromotionEntryUp: (id: number) =>
    set((state) => ({
      promotionEntries: moveItemUp(state.promotionEntries, id),
    })),

  movePromotionEntryDown: (id: number) =>
    set((state) => ({
      promotionEntries: moveItemDown(state.promotionEntries, id),
    })),

  toggleEntryCollapse: (id: number) =>
    set((state) => ({
      entryCollapsedStates: {
        ...state.entryCollapsedStates,
        [id]: !state.entryCollapsedStates[id],
      },
    })),

  // ===== Special Hours Actions =====

  addSpecialHour: () =>
    set((state) => ({
      specialHours: [
        ...state.specialHours,
        {
          id: generateId(),
          day: '',
          hours: '',
        },
      ],
    })),

  removeSpecialHour: (id: number) =>
    set((state) => ({
      specialHours: state.specialHours.filter((h) => h.id !== id),
    })),

  updateSpecialHour: (
    id: number,
    field: keyof Pick<SpecialHour, 'day' | 'hours'>,
    value: string
  ) =>
    set((state) => ({
      specialHours: state.specialHours.map((hour) =>
        hour.id === id ? { ...hour, [field]: value } : hour
      ),
    })),

  moveSpecialHourUp: (id: number) =>
    set((state) => ({
      specialHours: moveItemUp(state.specialHours, id),
    })),

  moveSpecialHourDown: (id: number) =>
    set((state) => ({
      specialHours: moveItemDown(state.specialHours, id),
    })),

  // ===== How to Shop Actions =====

  addHowToShopItem: () =>
    set((state) => ({
      howToShopItems: [
        ...state.howToShopItems,
        {
          id: generateId(),
          text: '',
          bold: false,
          italic: false,
          underline: false,
        },
      ],
    })),

  removeHowToShopItem: (id: number) =>
    set((state) => ({
      howToShopItems: state.howToShopItems.filter((i) => i.id !== id),
    })),

  updateHowToShopItem: (id: number, text: string) =>
    set((state) => ({
      howToShopItems: state.howToShopItems.map((item) =>
        item.id === id ? { ...item, text } : item
      ),
    })),

  moveHowToShopItemUp: (id: number) =>
    set((state) => ({
      howToShopItems: moveItemUp(state.howToShopItems, id),
    })),

  moveHowToShopItemDown: (id: number) =>
    set((state) => ({
      howToShopItems: moveItemDown(state.howToShopItems, id),
    })),

  toggleHowToShopFormat: (
    id: number,
    format: 'bold' | 'italic' | 'underline'
  ) =>
    set((state) => ({
      howToShopItems: state.howToShopItems.map((item) =>
        item.id === id ? { ...item, [format]: !item[format] } : item
      ),
    })),

  // ===== Important Notes Actions =====

  addImportantNotesItem: () =>
    set((state) => ({
      importantNotesItems: [
        ...state.importantNotesItems,
        {
          id: generateId(),
          text: '',
          bold: false,
          italic: false,
          underline: false,
        },
      ],
    })),

  removeImportantNotesItem: (id: number) =>
    set((state) => ({
      importantNotesItems: state.importantNotesItems.filter(
        (i) => i.id !== id
      ),
    })),

  updateImportantNotesItem: (id: number, text: string) =>
    set((state) => ({
      importantNotesItems: state.importantNotesItems.map((item) =>
        item.id === id ? { ...item, text } : item
      ),
    })),

  moveImportantNotesItemUp: (id: number) =>
    set((state) => ({
      importantNotesItems: moveItemUp(state.importantNotesItems, id),
    })),

  moveImportantNotesItemDown: (id: number) =>
    set((state) => ({
      importantNotesItems: moveItemDown(state.importantNotesItems, id),
    })),

  toggleImportantNotesFormat: (
    id: number,
    format: 'bold' | 'italic' | 'underline'
  ) =>
    set((state) => ({
      importantNotesItems: state.importantNotesItems.map((item) =>
        item.id === id ? { ...item, [format]: !item[format] } : item
      ),
    })),

  // ===== PDF Actions =====

  addPDF: (pdf: AttachedPDF) =>
    set((state) => ({
      attachedPDFs: [...state.attachedPDFs, pdf],
    })),

  removePDF: (id: string) =>
    set((state) => ({
      attachedPDFs: state.attachedPDFs.filter((p) => p.id !== id),
    })),

  clearAllPDFs: () =>
    set({
      attachedPDFs: [],
    }),

  // ===== Subject Line Actions =====

  setGeneratedSubjectLines: (lines: string[]) =>
    set({ generatedSubjectLines: lines }),

  setSelectedSubjectLine: (line: string | null) =>
    set({ selectedSubjectLine: line }),

  setSubjectLineManuallyEdited: (edited: boolean) =>
    set({ subjectLineManuallyEdited: edited }),

  // ===== Column State =====

  setColumnState: (columnState: ColumnState) => set({ columnState }),

  // ===== Initialization =====

  setInitializing: (value: boolean) => set({ isInitializing: value }),

  // ===== Auto-Save / Persistence =====

  saveToIndexedDB: async () => {
    const state = get();
    const persistData: PromotionPersistedState = {
      promotionEntries: state.promotionEntries,
      specialHours: state.specialHours,
      howToShopItems: state.howToShopItems,
      importantNotesItems: state.importantNotesItems,
      attachedPDFs: state.attachedPDFs.map((pdf) => ({
        id: pdf.id,
        name: pdf.name,
        size: pdf.size,
        type: pdf.type,
        // Include data if available
        ...(pdf.data ? { data: pdf.data } : {}),
      })),
      generatedSubjectLines: state.generatedSubjectLines,
      selectedSubjectLine: state.selectedSubjectLine,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistData));

      // Also persist PDF data to IndexedDB if available
      for (const pdf of state.attachedPDFs) {
        if (pdf.data) {
          try {
            await savePDFToIndexedDB({
              id: pdf.id,
              name: pdf.name,
              data: pdf.data,
            });
          } catch {
            // Non-blocking: PDF save failure shouldn't disrupt user
            console.warn(`Failed to save PDF ${pdf.name} to IndexedDB`);
          }
        }
      }
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  },

  loadFromIndexedDB: async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        set({ isInitializing: false });
        return;
      }

      const parsed: PromotionPersistedState = JSON.parse(stored);

      // Restore PDFs: merge metadata from localStorage with data from IndexedDB
      const restoredPDFs: AttachedPDF[] = [];
      for (const metadata of parsed.attachedPDFs || []) {
        if (metadata.data) {
          // Data was included in localStorage
          restoredPDFs.push({
            id: metadata.id,
            name: metadata.name,
            size: metadata.size,
            type: metadata.type,
            data: metadata.data,
          });
        } else {
          // Try to get data from IndexedDB
          try {
            const fullPdfData: PDFRecord | null = await getPDFFromIndexedDB(
              metadata.id
            );
            if (fullPdfData && fullPdfData.data) {
              restoredPDFs.push({
                id: metadata.id,
                name: metadata.name,
                size: metadata.size,
                type: metadata.type,
                data: fullPdfData.data,
              });
            } else {
              // No data available, skip this PDF
              console.warn(
                `PDF ${metadata.name} data not found, skipping.`
              );
            }
          } catch (error) {
            console.warn(
              `Failed to restore PDF ${metadata.name}:`,
              error
            );
          }
        }
      }

      set({
        promotionEntries: parsed.promotionEntries || [],
        specialHours: parsed.specialHours || [],
        howToShopItems: parsed.howToShopItems || [],
        importantNotesItems: parsed.importantNotesItems || [],
        attachedPDFs: restoredPDFs,
        generatedSubjectLines: parsed.generatedSubjectLines || [],
        selectedSubjectLine: parsed.selectedSubjectLine || null,
        isInitializing: false,
      });
    } catch (error) {
      console.warn('Failed to load promotion state:', error);
      set({ isInitializing: false });
    }
  },

  resetState: () =>
    set({
      ...getEmptyState(),
      subjectLineManuallyEdited: false,
      entryCollapsedStates: {},
      columnState: 'left-expanded' as ColumnState,
      isInitializing: false,
    }),
}));
