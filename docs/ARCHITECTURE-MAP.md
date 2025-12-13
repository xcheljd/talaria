# Architecture Map

This document summarizes the high-level architecture of the main web app: entry points, core modules, and their relationships.

> Scope: this describes the **source** modules under `src/js/` and the main HTML entry points (`index.html`, `start.html`). It does **not** cover built assets under `dist/`.

---

## 1. HTML Entry Points

### `index.html`

- Main application UI for the **Communication Template Generator**.
- Key sections:
  - Header with theme toggle and link to `start.html` (profile setup).
  - Template select, search box, and category tabs (`All`, `Email`, `Phone`, `Text`).
  - Form card for template fields (`#formFields`), initially showing a placeholder.
  - Output card (`#outputCard`) for generated message/email/HTML.
- JS bootstrap:
  - Loads `src/js/app.js` as a **type=module** script:
    - `app.js` → initializes theme, IndexedDB, and UI.

### `start.html`

- Profile & theme setup page (user/store info, theme palettes, Electron download folder UI).
- Uses **inline scripts** for:
  - Theme initialization and palette handling (mirroring `theme.js` behavior).
  - Form validation (phone, email, store hours, plus code, company email).
  - Profile export/import to JSON.
  - Persistence of profile to `localStorage.userProfile`.
- Independent from the `src/js/app.js`/`ui.js` module graph.

### `promotion.html`

- Standalone UI for the **Promotion Email Generator**.
- JS bootstrap:
  - Loads `src/js/promotion-app.js` as a **type=module** script:
    - `promotion-app.js` → initializes theme, IndexedDB, and promotion UI.

---

## 2. Module Bootstrap Flow

### `src/js/app.js`

Entry point for `index.html`.

```mermaid
flowchart TD
    A[DOMContentLoaded] --> B[initTheme()]
    B --> C[initIndexedDB()]
    C --> D[init()]
```

- Imports:
  - `initIndexedDB` from `db.js`.
  - `initTheme` from `theme.js`.
  - `init` from `ui.js`.
- On `DOMContentLoaded`:
  1. Initializes theme (`theme.js`).
  2. Initializes IndexedDB (`db.js`).
  3. Initializes UI (`ui.js`).

### `src/js/promotion-app.js`

Entry point for `promotion.html`.

High-level flow:
1. Initialize theme and page transitions
2. Initialize IndexedDB
3. Initialize the promotion UI (`promotion-ui.js`)

---

## 3. Core UI & State Modules

### `src/js/ui.js` – Main UI Controller

**Responsibility:** glue between DOM, templates, and email utilities for the main template generator (`index.html`).

Key exports (non-exhaustive):
- View state: `currentTemplate`.
- Initialization & wiring: `init()`, `cacheElements()`, `attachEventListeners()`, `setCurrentTemplate(template)`.
- Output: `showRegularOutput()`, `updateEmailPreview()`, `clearEmailPreview()`, `writeEmptyStateToIframe(iframe)`.
- Template selection/search: `populateDropdown()`, `renderSearchResults(query)`, `selectTemplate(key)`.
- Email helpers: `extractSubjectLine(message)`, `renderEditableSubjectLine(...)`, `openEmailClientUniversal(...)`, `downloadEmailFile(...)`.

Imports and dependencies (high level):
- **State:** `appState` from `src/js/state.js`.
- **Templates:** `templates`, `templateHelp`, `fieldConfig`, plus sanitization and helper utilities from `src/js/templates.js`.
- **Theme:** `toggleTheme` from `src/js/shared/theme.js` (which emits `theme:changed`).
- **Email utilities:** `src/js/shared/emailUtils.js` + `src/js/shared/emailPreviewUtils.js`.

### `src/js/state.js` – Core App State

**Responsibility:** minimal shared state used across modules (primarily for profile access and current template/category selection).

- Exports:
  - `appState` with: `currentCategory`, `currentTemplate`, `searchActive`, `userProfile`.

### `src/js/promotion-state.js` – Promotion Page State

**Responsibility:** state container for the standalone promotion email generator.

- Exports:
  - `promotionState` with: `promotionEntries`, `specialHours`, `howToShopItems`, `importantNotesItems`, `attachedPDFs`, subject line state, and UI expansion/collapse state.

**Used by:** `promotion-ui.js`.

---

## 4. Template & Signature Modules

### `src/js/templates.js` – Template Catalog & Shared Helpers

- Imports:
  - `appState` from `state.js`.
  - `getEmployeeSignature as signatureFunction` from `src/js/shared/signature.js`.
- Exports:
  - Re-export: `getEmployeeSignature` – for backwards compatibility.
  - Security/formatting helpers:
    - `sanitizeHTML(str)`, `escapeAttr(str)`, `sanitizeTemplateData(data)`.
  - Store/profile helpers:
    - `getStorePhone()`, `getStoreName()`, `getStoreLocation()`, `getFullStoreLocation()`.
  - Body formatting:
    - `convertTextToHTML(textBody)` – plain text → HTML body with signature.
  - Template metadata:
    - `templateHelp` – per-template help text.
    - `fieldConfig` – per-field config (examples, required flags, validation hints, suggestions).
    - `getFieldSuggestions(field)` – convenience wrapper.
  - Validation helpers:
    - `formatPhoneNumber(value)`, `validateTracking(value)`.
  - Core catalog:
    - `templates` – all defined templates with fields + `generate(data)` functions.

**Used by:** `ui.js` for dynamic form rendering and template generation.

### `src/js/shared/signature.js` – Employee Signature System

- Imports:
  - `appState` from `state.js`.
- Exports (summary):
  - `getEmployeeSignature(format = 'text' | 'html')` – returns appropriate signature variant.
  - Configuration objects for company/store branding (company info, links, styles, etc.).

**Used by:** `templates.js` (and through it, `ui.js`) to append signatures to email bodies and previews.

---

## 5. Persistence & Theme Modules

### `src/js/shared/db.js` – IndexedDB Persistence

**Responsibility:** persistence for promotion PDFs and bulk email recipients.

- Exports (from usage):
  - `initIndexedDB()` and `db` handle.
  - PDF storage:
    - `savePDFToIndexedDB(pdfData)`, `getAllPDFsFromIndexedDB()`, `getPDFFromIndexedDB(id)`, `deletePDF...`, `clearAllPDFsFromIndexedDB()`.
  - Bulk recipient storage:
    - `saveBulkEmailRecipientsToIndexedDB(recipients)`, `getBulkEmailRecipientsFromIndexedDB()`, `clearBulkEmailRecipientsFromIndexedDB()`.

**Used by:** `app.js` (init) and the promotion app (`promotion-app.js` / `promotion-ui.js`).

### `src/js/shared/theme.js` – Theme & Palette Management

- Exports:
  - `initTheme()` – read `localStorage` and set `data-theme`, `data-light-palette`, `data-dark-palette` attributes.
  - `toggleTheme()` – switch between light/dark, update the indicator, and emit `theme:changed`.

**Used by:** `app.js` (initial theme), `ui.js` (theme toggle), and mirrored inline on `start.html`.

---

## 6. Email Utilities & Preview Formatting

### `src/js/shared/emailUtils.js` – Email/MIME Utilities

- Text/encoding:
  - `extractPlainText(htmlBody)` – HTML → plain text for text/plain parts.
  - `encodeQuotedPrintable(str)` – quoted-printable encoder.
  - `encodeSubject(subject)` – RFC 2047 encoded-word subject.
  - `utf8ToBase64(str)` – UTF-8 Base64 body encoding.
  - `encodeFilename(filename)` – RFC 2231 filename encoding.
- Email addresses:
  - `isValidEmail(email)` – format validation.
  - `parseEmailList(list)` – split, trim, deduplicate.
- EML/MIME builders:
  - `createEMLFile(fromName, fromEmail, to, bcc, subject, htmlBody, attachments)` – single message.
  - `extractDateRangeFromHTML(htmlContent)`, `formatDateRangeForFilename(text)`, `generateZipFilenameFromHTML(htmlContent)`.
  - `createBCCBatchEML(subject, htmlBody, recipients, pdfAttachments, format, batchNumber)` – multi-recipient BCC drafts.

**Used by:** `ui.js` (single-email downloads) and the promotion app (bulk email tooling).

### `src/js/shared/emailPreviewUtils.js` – Preview Formatting Helpers

- `escapeHtml(text)` – HTML escaping.
- `plainTextToPreviewHTML(plainText)` – plain text → HTML paragraphs/lists.
- `wrapHtmlForEmailPreview(htmlContent)` – wraps body HTML in a full email document (subject, header, body container).

**Used by:** `ui.js` for regular email preview and HTML-tab conversions.

---

## 7. Promotion Template Config & UI Utilities

Promotion-specific code is isolated to the `promotion.html` entry point:

- `src/js/promotion-app.js` – promotion page bootstrap
- `src/js/promotion-ui.js` – promotion UI/controller layer (PDF attachments, subject lines, bulk tools, preview)
- `src/js/promotionConfig.js` – config shaping/validation for save/export/import
- `src/js/promotionUiUtils.js` – drag-and-drop and common UI utilities
- `src/js/promotion-column-collapse.js` – column collapse UI

### `src/js/promotionConfig.js` – Config Shaping & Validation

- `buildSavedPromotionConfig({ ... })`
  - For saving to `localStorage['savedPromotionTemplate']`.
  - Stores PDF **metadata only** (IDs, names, sizes, types) – binary data remains in IndexedDB.
- `buildExportedPromotionConfig({ ... })`
  - For export JSON files.
  - Includes full `attachedPDFs`, including `data` if present.
- `validateAndNormalizeImportedConfig(rawConfig)`
  - Validates object shape and required array fields.
  - Normalizes missing arrays to `[]`.
  - Returns `{ ok: true, config }` or `{ ok: false, reason }`.

**Used by:** `promotion-ui.js` for save/export/import.

### `src/js/promotionUiUtils.js` – Movement & Drag-and-Drop

- `moveItemInArray(array, itemId, direction, idKey = 'id')`
  - Generic helper for moving items up/down in any promotion-related list.
- `setupDragAndDrop(container, itemsArray, renderFunction, selector = '.editable-item-row')`
  - Attaches drag-and-drop handlers to list rows.
  - Reorders the underlying `itemsArray` and calls `renderFunction()`.

**Used by:** `promotion-ui.js` for promotion entries, special hours, How to Shop, and Important Notes reordering.

---

## 8. How to Use This Map

- **Adding new templates:**
  - Update `templates.js` (`templates`, `fieldConfig`, `templateHelp`), then rely on `ui.js`’s dynamic rendering.
- **Changing email formatting/EML behavior:**
  - Prefer editing `src/js/shared/emailUtils.js` and `src/js/shared/emailPreviewUtils.js` rather than touching `ui.js`.
- **Changing promotion config persistence/import/export:**
  - Adjust `promotionConfig.js` and keep `promotion-ui.js` focused on DOM + wiring.
- **Promotion UI behaviors (reordering, drag/drop):**
  - Extend or reuse `promotionUiUtils.js` instead of duplicating logic.

This map should remain roughly stable even as individual features evolve; if major module boundaries change, update this file to keep a quick, accurate overview available for future housekeeping and refactors.