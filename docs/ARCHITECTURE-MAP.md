# Architecture Map

This document summarizes the high-level architecture of the app: entry point,
routing, providers, page layouts, state, and shared libraries. It's intended as
a quick orientation for new contributors and as a sanity check before a
refactor.

> Scope: source under `src/`. The Tauri desktop wrapper lives in `src-tauri/`
> (see [Desktop / Tauri](#10-desktop--tauri)).

---

## 1. Single Entry Point

The whole app is a single Vite/React SPA. `index.html` loads `src/main.tsx`,
which mounts `<App />` into `#root`.

`src/main.tsx`:

- Imports `index.css` (Tailwind v4 + design tokens).
- Wraps `<App />` in `BrowserRouter` and renders into `#root`.

`src/App.tsx`:

- Composes the global providers (Theme, Profile, Sonner toaster).
- Declares routes (see below).
- Renders an `<ErrorBoundary>` around the route outlet.

---

## 2. Providers (cross-cutting state)

Located in `src/contexts/`:

| Provider          | File                                  | Purpose                                                                                                   |
| ----------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `ThemeProvider`   | `src/contexts/ThemeProvider.tsx`      | Light/dark mode + palette selection. Reads/writes `theme`, `lightPalette`, `darkPalette` via `StorageKeys`. Applies `data-theme`, `data-light-palette`, `data-dark-palette` attributes to `<html>`. |
| `ProfileProvider` | `src/contexts/ProfileProvider.tsx`    | User/store profile (employee name, store info, signature data). Reads/writes `userProfile`. Exposes the `useProfile()` hook and individual selector hooks (`useStorePhone`, `useEmployeeName`, etc.). |

Both providers wrap the entire app in `App.tsx`.

The Sonner `<Toaster />` (toast notifications) is also rendered at the App
level.

---

## 3. Routing

React Router v7 (`react-router-dom`), declared in `App.tsx`. Routes:

- `/` → `TemplatesPage` (landing — pick a template category)
- `/templates` → `TemplateGeneratorPage` (main template generator UI)
- `/promotion` → `PromotionPage` (promotion email builder)
- `/profile` → `ProfilePage` (read-only profile view)
- `/profile/settings` → `ProfileSettingsPage` (edit profile + app settings)
- `/start` → redirects to `/profile/settings` (legacy URL)
- `/components` → `ComponentsShowcase` (shadcn component preview; route is
  registered only when `import.meta.env.DEV`, so it is absent from production builds)

All routes render inside `<Layout>` (`src/components/Layout.tsx`), which holds
the header (logo, nav, theme toggle) and the route outlet.

---

## 4. Pages

Located in `src/pages/`. Each page is the top-level container for one route.

### `TemplatesPage.tsx`

Lightweight chooser: cards linking to the template generator, the promotion
builder, and the profile settings page.

### `TemplateGeneratorPage.tsx`

Main template-generation UI for short customer emails, phone scripts, text
messages, etc.

- Persists the last-selected template under `StorageKeys.selectedTemplate`.
- Composes `<TemplateSelector>` (searchable combobox), `<TemplateFormFields>`
  (dynamic form driven by `fieldConfig`), and `<OutputPanel>` (preview + EML
  download).
- Single-message EML downloads go through `saveBlob()` and honor the recommended
  format (`.eml` or `.emltpl` based on OS).

### `PromotionPage.tsx`

The largest page — full builder for the promotion email. Hosts a 2-column
resizable layout (editor on the left, preview/tools on the right):

- Editor column: collapsible cards for Basic Details, Discount Entries, Special
  Hours, How To Shop, Important Notes, Newsletter, Email Theme, PDF Attachments,
  Subject Line Generator, Version History, Accessibility/Outlook checkers, and
  Bulk Email Tools.
- Preview column: live HTML preview (Desktop/Mobile widths, light/dark toggle),
  plus a download menu (single draft `.eml/.emltpl`, full HTML, bulk batches).
- Drives `usePromotionStore` (Zustand) for all state.

### `ProfileSettingsPage.tsx`

Form-based settings page:

- React Hook Form + Zod (`profile-validation.ts`) validates employee name, job
  title, store info, hours.
- Light/dark palette selectors (driven by `ThemeProvider`).
- Download Folder picker (Tauri-only — picks the directory `saveBlob` writes to).
- Export/Import profile JSON.

### `ProfilePage.tsx`

Read-only view of the current profile with an edit link to `/profile/settings`.

### `ComponentsShowcase.tsx`

Dev-only inventory of shadcn primitives. Not linked from the main nav.

---

## 5. Shared Components

Located in `src/components/`. Most cross-page components live here at the top
level; promotion-specific ones live under `src/components/promotion/`.

Top-level (`src/components/`):

- `Layout.tsx` — global app shell (header, nav, theme toggle, route outlet).
- `EmailPreview.tsx` — empty-state + plain-text-to-HTML preview for single
  emails.
- `OutputPanel.tsx` — preview/text tabs, copy, and download-EML for the
  template generator.
- `TemplateSelector.tsx` / `TemplateFormFields.tsx` — search-driven template
  picker and dynamic form.
- `ThemeToggle.tsx` — light/dark toggle wired to `ThemeProvider`.
- `ErrorBoundary.tsx` — top-level React error boundary.
- `ui/` — shadcn-generated primitives (Button, Card, Tabs, Toast, etc.). Do not
  edit by hand unless you understand the shadcn generator; prefer composing in
  feature components.

Promotion-specific (`src/components/promotion/`):

- Editors: `BasicDetailsEditor`, `DiscountEntriesEditor`, `SpecialHoursEditor`,
  `FormattableItemEditor`, `NewsletterEditor`, `EmailThemeEditor`.
- Layout: `CollapsibleCard`, `IconToolbar`, `SortableItem` (dnd-kit drag handle),
  `PreviewColumn`/`PreviewToolbar` (preview pane split into focused modules).
- Tools: `PDFAttachments`, `SubjectLineGenerator`, `BulkEmailTools`,
  `VersionHistory`, `OutlookChecker`, `AccessibilityChecker`.

---

## 6. State Management

### `usePromotionStore` — Zustand store

`src/stores/promotion-store.ts` is the single source of truth for the
promotion builder. It owns all editor state (promo title, date range, entries,
hours, newsletter, palette, etc.) plus PDF attachment metadata and bulk-email
UI flags.

- Auto-saves the full state JSON to `localStorage` under
  `StorageKeys.promotionBuilderState` on every change (debounced via a save
  status indicator).
- Mounts an init effect that pulls saved state + IndexedDB PDFs back into the
  store on first render.

### Per-page local state

Pages and components use `useState` / `useReducer` for transient state. Only
state that needs to survive reloads or be shared across the page goes through
the store.

### `localStorage` key registry

`src/lib/storage-keys.ts` exports `StorageKeys`, the typed registry of every
localStorage key in the app. Always import keys from this module instead of
typing string literals at call sites.

---

## 7. Persistence

| Surface       | Backend       | Key / store                                                               | Source of truth                                |
| ------------- | ------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| User profile  | localStorage  | `userProfile`                                                             | `src/lib/profile.ts`                           |
| Theme prefs   | localStorage  | `theme`, `lightPalette`, `darkPalette`                                    | `src/contexts/ThemeProvider.tsx`               |
| Promo state   | localStorage  | `promotionBuilderState`                                                   | `src/stores/promotion-store.ts`                |
| Versioned snapshots | localStorage | `promotionVersionHistory`                                              | `src/components/promotion/VersionHistory.tsx`  |
| Bulk-email UI | localStorage  | `bulkEmail.downloadFormat`, `bulkEmail.batchSize`                         | `src/components/promotion/BulkEmailTools.tsx`  |
| Saved palettes | localStorage | `emailPaletteSaved`                                                       | `src/components/promotion/EmailThemeEditor.tsx`|
| Last template | localStorage  | `selectedTemplate`                                                        | `src/pages/TemplateGeneratorPage.tsx`          |
| Download folder | Tauri config (only)         | `downloads-config.json` (read via `get_download_dir`)                     | `src-tauri/src/lib.rs`                         |
| PDF blobs     | IndexedDB     | DB `Talaria`, store `promotionPDFs`                              | `src/lib/db.ts`                                |
| Bulk recipients | IndexedDB   | DB `Talaria`, store `bulkEmailRecipients`                        | `src/lib/db.ts`                                |

The whole localStorage key surface is also enumerated in
`src/lib/storage-keys.ts`.

---

## 8. Template & Email Generation

### `src/lib/templates.ts`

Catalog of every template (customer emails, phone scripts, text messages, etc.):

- `templates` — object keyed by template id, each with `fields`, `generate(data)`,
  and metadata flags.
- `fieldConfig` — per-field config (placeholder examples, required flags,
  validation hints).
- `templateHelp` — long-form help text shown next to the template picker.
- Helpers: `sanitizeHTML`, `escapeAttr`, `sanitizeTemplateData`,
  `convertTextToHTML` (plain-text body → HTML with signature).

### `src/lib/signature.ts`

Builds the employee email signature (plain text + HTML). Reads from the user
profile via `extractSignatureData()` and uses
`isIframePreviewDarkMode()` from `theme-utils` to switch preview colors when
the host page is dark.

### `src/lib/emailUtils.ts`

EML / MIME utilities:

- `createEMLFile(...)` — single-message EML with multipart/alternative + optional
  PDF attachments.
- `createBCCBatchEML(subject, html, recipients, pdfs, format, batchNumber)` —
  bulk BCC drafts. `format` is required (`'eml' | 'emltpl'`); callers should
  derive it via `getRecommendedFormat()`.
- `parseEmailList`, `isValidEmail`, `resolvePromoSubject`, `DEFAULT_PROMO_SUBJECT`.
- Filename helpers: `extractDateRangeFromHTML`, `formatDateRangeForFilename`,
  `generateZipFilenameFromHTML`.

### `src/lib/promotion-email-html.ts`

Generates the promotion email's full HTML document from the store state.
Includes the export-config builder and the import validator/normalizer used
by the Version History card and the Export/Import buttons.

### `src/lib/emailPreviewUtils.ts`

Preview formatters used in the on-screen preview (NOT in the generated email
itself): `plainTextToPreviewHTML`, `wrapHtmlForEmailPreview`. Uses
`isIframePreviewDarkMode()` to swap preview colors.

---

## 9. Shared `lib` Utilities

Located in `src/lib/`:

- `storage-keys.ts` — typed registry of every localStorage key. **Always use this.**
- `theme-utils.ts` — palette validation, CSS-injection helpers for the
  preview, and `isIframePreviewDarkMode()` (shared dark-mode detector for
  preview/signature renderers).
- `ui-utils.ts` — small browser helpers: `prefersReducedMotion`,
  `getScrollBehavior`, `detectOS`, `getRecommendedFormat`. Use
  `getScrollBehavior()` for all programmatic scrolls.
- `file-save.ts` — `saveBlob(blob, filename)`. Routes through the Tauri
  `save_file_to_dir` command when running under the desktop app (honors the
  configured download folder); falls back to a browser-anchor download
  otherwise.
- `db.ts` — IndexedDB wrappers for PDFs and bulk recipients.
- `profile.ts` / `profile-validation.ts` — profile read/write + Zod schema.
- `html-utils.ts` — HTML escaping and sanitization.
- `newsletter-utils.ts` — newsletter card color/border resolvers.
- `subject-line-generator.ts` — AI-style subject line generation + PDF data
  helpers (`dataURLtoBlob`, `validatePDFFile`).
- `utils.ts` — `cn()` className helper (tailwind-merge wrapper).

---

## 10. Desktop / Tauri

`src-tauri/` holds the Tauri 2 wrapper. Rust commands registered in
`src-tauri/src/lib.rs`:

- `get_download_dir(app)` — returns the configured download dir, or the OS
  Downloads folder. The single source of truth for the download folder: the
  Settings screen reads it on mount so the folder it displays is the folder
  `save_file_to_dir` actually writes to. It previously rendered a separate
  `downloadFolderPath` localStorage copy, which was written alongside the Rust
  config but read independently and could silently drift out of agreement.
- `choose_download_dir(app)` — opens the native folder picker, persists the
  selection to `downloads-config.json`.
- `read_file_as_data_url(path)` — used for drag-and-drop file URI handling.
- `save_file_to_dir(app, filename, dataBase64)` — writes a base64-encoded blob
  into the configured download dir. Powers `saveBlob()` for every download in
  the app.
- `amatl_optimize(data_url, strip_accessibility, pack_object_streams)` — shrinks
  an attached PDF at upload time by downsampling its embedded JPEG thumbnails
  and (when `strip_accessibility` is true) removing the PDF structure tree, then
  (when `pack_object_streams` is true) packing structural objects into object
  streams (pure Rust + mozjpeg in `amatl.rs`, ~59% on real promo files). Wired
  into both upload paths in `PDFAttachments.tsx`, so the stored bytes — and
  therefore the list size and preview modal — reflect the optimized PDF.
  Fail-safe: returns the original on any error or non-shrink. The TS wrapper
  `amatl.optimize()` in `pdf-utils.ts` passes `stripAccessibility: true` and
  `packObjectStreams: true` for this app; the Rust library defaults are both
  `false` (accessibility-preserving, classic save). Fully permissive-licensed.
  Ghostscript was rejected (AGPL + RCE surface for ~4 marginal points).
  Object-stream packing is **strictly `qpdf --check`-clean** (lopdf's own
  object/xref-stream save, made valid by `renumber_objects()`). The byte-patching
  post-pass this used to need was removed when lopdf was bumped to 0.42, which
  carries the upstream xref fix. See `src-tauri/src/AGENTS.md` for the
  accessibility decision, the packing finding, and cost/benefit math.

`src/hooks/useTauri.ts` exposes `isTauri`, `invoke`, and `openFolderDialog`.

---

## 11. How to Use This Map

- **Adding a new template:** add to `templates`, `fieldConfig`, `templateHelp`
  in `src/lib/templates.ts`. The form and preview will pick it up via the
  generator page.
- **Adding a new persisted setting:** add the key to `storage-keys.ts`, then
  read/write through `StorageKeys.<yourKey>` at the call site. Don't inline
  string literals.
- **Adding a new download path:** route through `saveBlob()` so the desktop
  download-folder setting and browser fallback both work.
- **Changing dark-mode handling in any preview/signature renderer:** use
  `isIframePreviewDarkMode()` from `theme-utils.ts`.
- **Changing promotion editor state:** add the field to `promotion-store.ts`
  (state, action, persistence). The auto-save effect will handle persistence
  if the field is included in `persistData`.
- **Changing scroll behavior:** call `getScrollBehavior()` instead of
  hardcoding `'smooth'` so reduced-motion users get instant jumps.

This map should stay roughly stable as features evolve. When the major module
boundaries shift, update this file.
