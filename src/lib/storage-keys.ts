/**
 * Canonical names of every localStorage key the app reads or writes.
 *
 * Always import keys from this module instead of writing string literals at
 * call sites — that way renames stay grep-able and one place tracks the full
 * persistence surface.
 */

export const StorageKeys = {
  /** Active theme mode: 'light' | 'dark' */
  theme: 'theme',
  /** Selected light-mode palette name (e.g. 'github', 'nord') */
  lightPalette: 'lightPalette',
  /** Selected dark-mode palette name */
  darkPalette: 'darkPalette',

  /** JSON-serialized UserProfile (start/settings page values) */
  userProfile: 'userProfile',

  /** Full promotion builder state — single source of truth for the editor */
  promotionBuilderState: 'promotionBuilderState',
  /** Array of versioned snapshots of `promotionBuilderState` */
  promotionVersionHistory: 'promotionVersionHistory',

  /** Bulk email download mode: 'individual' | 'zip' */
  bulkEmailDownloadFormat: 'bulkEmail.downloadFormat',
  /** Bulk email batch size (number as string) */
  bulkEmailBatchSize: 'bulkEmail.batchSize',

  /** User-chosen folder for desktop-app downloads (Tauri) */
  downloadFolderPath: 'downloadFolderPath',

  /** Last-selected template key on the generator page */
  selectedTemplate: 'selectedTemplate',

  /** Saved email palettes for the promotion theme editor (JSON array) */
  emailPaletteSaved: 'emailPaletteSaved',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
