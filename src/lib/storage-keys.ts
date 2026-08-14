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

  /**
   * Whether downloads show a native Save As dialog (true) or save silently to
   * the configured download folder (false). Default true.
   */
  downloadSaveAs: 'download.saveAs',

  /**
   * Whether amatl PDF optimization runs at all when attaching PDFs.
   * Default true. Set to 'false' to attach PDFs as-is with no processing.
   */
  pdfOptimize: 'pdf.optimize',

  /**
   * Whether amatl strips accessibility metadata (StructTreeRoot, MarkInfo,
   * Lang) from attached PDFs. Default true — promotion flyers are visual
   * documents for a sighted audience (~18% size reduction). Set to the string
   * 'false' to preserve screen-reader metadata.
   */
  pdfStripAccessibility: 'pdf.stripAccessibility',

  /**
   * Whether the live email preview is showing dark mode. 'true' | 'false'.
   * Default false (light). Persists so the chosen preview theme survives
   * app restarts. Ignored while `previewSyncTheme` is on — then the preview
   * follows the app theme instead.
   */
  previewDark: 'preview.dark',
  /**
   * Whether the live email preview's light/dark follows the app theme.
   * 'true' | 'false'. Default true (linked). When on, switching the app's
   * light/dark toggle switches the preview too, and vice-versa. Set to 'false'
   * to keep the preview's own light/dark toggle independent (uses previewDark).
   */
  previewSyncTheme: 'preview.syncTheme',
  /**
   * Which client dark-mode model the preview emulates: 'full' | 'partial'.
   * Only meaningful while the dark preview is on. Default 'full'. Persists
   * alongside previewDark.
   */
  previewInversion: 'preview.inversion',

  /** Last-selected template key on the generator page */
  selectedTemplate: 'selectedTemplate',

  /** Saved email palettes for the promotion theme editor (JSON array) */
  emailPaletteSaved: 'emailPaletteSaved',

  /**
   * Whether dev mode is enabled. Default false (off). When off, advanced
   * surfaces are hidden from regular users: the Templates page (route + nav),
   * the promotion HTML Code tab, and the Email Theme / Accessibility /
   * Outlook cards. Persists across sessions.
   */
  devMode: 'dev.mode',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];
