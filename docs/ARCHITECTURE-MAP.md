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
  - PDF preview modal (`#pdfPreviewModal`).
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

---

## 3. Core UI & State Modules

### `src/js/ui.js` – Main UI Controller

**Responsibility:** glue between DOM, state, templates, persistence, and email utilities. This is the central module the UI logic lives in.

Key exports (non-exhaustive):

- Global view state:
  - `currentTemplate`, `promotionEntries`, `specialHours`, `howToShopItems`, `importantNotesItems`, `attachedPDFs`, `generatedSubjectLines`, `selectedSubjectLine`, `howToShopExpanded`, `importantNotesExpanded`, `entryCollapsedStates`.
- Initialization & wiring:
  - `init()` – called from `app.js`.
  - `cacheElements()`, `getDynamicElement(id)`, `setCurrentTemplate(template)`.
- Toasts & undo/redo:
  - `showToast(message, duration?)`.
  - `updateUndoRedoButtons()`, `undo()`, `redo()`.
- Output views:
  - `showTabbedOutput()` – promotion email bulk tools + preview/code tabs.
  - `showRegularOutput()` – regular templates (preview + HTML tabs).
  - `writeEmptyStateToIframe(iframe)`, `updateEmailPreview()`, `clearEmailPreview()`.
- Template selection & search:
  - `populateDropdown()`, `renderSearchResults(query)`, `selectTemplate(key)`.
- Promotion email builder:
  - Entry lists: `addPromotionEntry()`, `removePromotionEntry()`, `movePromotionEntryUp()`, `movePromotionEntryDown()`, `renderPromotionEntries()`, `updateEntryData(e)`.
  - Special hours: `addSpecialHour()`, `removeSpecialHour()`, `moveSpecialHourUp()`, `moveSpecialHourDown()`, `renderSpecialHours()`, `updateSpecialHourData(e)`.
  - How to Shop / Important Notes: add/remove/move + `renderHowToShopSection()`, `renderImportantNotesSection()`.
  - Section toggles: `toggleHowToShop()`, `toggleImportantNotes()`, `toggleEntryCollapse(entryId)`.
  - Defaults & form: `initializeDefaultItems()`, `renderPromotionEmailForm()`.
- Promotion template persistence:
  - `savePromotionTemplate()` – build config + save to localStorage + sync PDFs/recipients.
  - `exportPromotionTemplate()` – build config + export JSON.
  - `importPromotionTemplate()` – file-based import.
  - `importFromLocalStorage()` – legacy import.
  - `applyImportedConfig(config, collapseEntries?)` – validate/normalize + apply.
- Bulk email tooling:
  - `validateBatchSize()`, `detectDuplicates(emails)`, `updateBulkAnalysis()`, `generateBulkEmailFiles()`.
- Email helpers:
  - `extractSubjectLine(message)`, `renderEditableSubjectLine(container, initialSubject)`.
  - `openEmailClientUniversal(templateId, content)` – `mailto:` workflow.
  - `downloadEmailFile(templateId, content)` – EML/EMLTPL file download.
  - `copyToClipboard()`, `validateSubject(subject)`, `createGenericEMLFile(subject, body)`, `isComplexEmail(templateType)`, `updateFormatStatus()`.

Imports and dependencies:

- **State:** `appState`, `captureState`, `restoreState`, `setUIUpdateCallbacks` from `state.js`.
- **Templates:** `templates`, `templateHelp`, `fieldConfig`, `getFieldSuggestions`, `getStorePhone`, `getStoreName`, `getStoreLocation`, `getEmployeeSignature`, `convertTextToHTML`, `sanitizeHTML`, `escapeAttr` from `templates.js`.
- **Persistence:** `db`, `savePDFToIndexedDB`, `getPDFFromIndexedDB`, `deletePDFFromIndexedDB`, `clearAllPDFsFromIndexedDB`, `saveBulkEmailRecipientsToIndexedDB`, `getBulkEmailRecipientsFromIndexedDB` from `db.js`.
- **Theme:** `toggleTheme`, `updateSelectArrows` from `theme.js`.
- **Email/MIME utilities:** from `emailUtils.js`:
  - `parseEmailList`, `isValidEmail`, `encodeQuotedPrintable`, `encodeFilename`, `createEMLFile`, `generateZipFilenameFromHTML`, `createBCCBatchEML`.
- **Promotion config:** from `promotionConfig.js`:
  - `buildSavedPromotionConfig`, `buildExportedPromotionConfig`, `validateAndNormalizeImportedConfig`.
- **Email preview formatting:** from `emailPreviewUtils.js`:
  - `escapeHtml`, `plainTextToPreviewHTML`, `wrapHtmlForEmailPreview`.
- **Promotion UI utilities:** from `promotionUiUtils.js`:
  - `moveItemInArray`, `setupDragAndDrop`.

### `src/js/state.js` – Promotion State & Undo/Redo

**Responsibility:** store promotion-related state and manage undo/redo history, while delegating UI updates via callbacks.

- Exports:
  - `appState` – central state object with:
    - `currentCategory`, `currentTemplate`, `searchActive`, `userProfile`.
    - `promotionEntries`, `specialHours`, `howToShopItems`, `importantNotesItems`, `attachedPDFs`, `generatedSubjectLines`, `selectedSubjectLine`, `howToShopExpanded`, `importantNotesExpanded`, `entryCollapsedStates`.
    - Undo/redo: `historyStack`, `historyIndex`.
  - `MAX_HISTORY` – history depth.
  - `setUIUpdateCallbacks(callbacks)` – UI provides:
    - `updateUndoRedoButtons`, `renderPromotionEntries`, `renderSpecialHours`, `renderHowToShopSection`, `renderImportantNotesSection`, `renderAttachedPDFs`, `renderSubjectLines`.
  - `captureState()` – snapshot promotion-related slices (when `currentTemplate === 'promotion-email'`).
  - `restoreState(state)` – replace `appState` slices and call the registered callbacks.

**Used by:** `ui.js` (registers callbacks and triggers `captureState`/`restoreState`).

---

## 4. Template & Signature Modules

### `src/js/templates.js` – Template Catalog & Shared Helpers

- Imports:
  - `appState` from `state.js`.
  - `getEmployeeSignature as signatureFunction` from `signature.js`.
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

### `src/js/signature.js` – Employee Signature System

- Imports:
  - `appState` from `state.js`.
- Exports (summary):
  - `getEmployeeSignature(format = 'text' | 'html')` – returns appropriate signature variant.
  - Configuration objects for company/store branding (company info, links, styles, etc.).

**Used by:** `templates.js` (and through it, `ui.js`) to append signatures to email bodies and previews.

---

## 5. Persistence & Theme Modules

### `src/js/db.js` – IndexedDB Persistence

**Responsibility:** persistence for promotion PDFs and bulk email recipients.

- Exports (from usage):
  - `initIndexedDB()` and `db` handle.
  - PDF storage:
    - `savePDFToIndexedDB(pdfData)`, `getAllPDFsFromIndexedDB()`, `getPDFFromIndexedDB(id)`, `deletePDF...`, `clearAllPDFsFromIndexedDB()`.
  - Bulk recipient storage:
    - `saveBulkEmailRecipientsToIndexedDB(recipients)`, `getBulkEmailRecipientsFromIndexedDB()`, `clearBulkEmailRecipientsFromIndexedDB()`.

**Used by:** `app.js` (init), `ui.js` (promotion save/load and bulk-email persistence).

### `src/js/theme.js` – Theme & Palette Management

- Exports:
  - `initTheme()` – read `localStorage` and set `data-theme`, `data-light-palette`, `data-dark-palette` attributes.
  - `toggleTheme()` – switch between light/dark and update relevant UI.
  - `updateSelectArrows()` – apply themed SVG arrows to `<select>` elements.

**Used by:** `app.js` (initial theme), `ui.js` (theme toggle), and mirrored inline on `start.html`.

---

## 6. Email Utilities & Preview Formatting

### `src/js/emailUtils.js` – Email/MIME Utilities

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

**Used by:** `ui.js` for download/EML generation and bulk email tooling.

### `src/js/emailPreviewUtils.js` – Preview Formatting Helpers

- `escapeHtml(text)` – HTML escaping.
- `plainTextToPreviewHTML(plainText)` – plain text → HTML paragraphs/lists.
- `wrapHtmlForEmailPreview(htmlContent)` – wraps body HTML in a full email document (subject, header, body container).

**Used by:** `ui.js` for regular email preview and HTML-tab conversions.

---

## 7. Promotion Template Config & UI Utilities

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

**Used by:** `ui.js` in `savePromotionTemplate`, `exportPromotionTemplate`, and `applyImportedConfig`.

### `src/js/promotionUiUtils.js` – Movement & Drag-and-Drop

- `moveItemInArray(array, itemId, direction, idKey = 'id')`
  - Generic helper for moving items up/down in any promotion-related list.
- `setupDragAndDrop(container, itemsArray, renderFunction, selector = '.editable-item-row')`
  - Attaches drag-and-drop handlers to list rows.
  - Reorders the underlying `itemsArray` and calls `renderFunction()` + `captureState()`.

**Used by:** `ui.js` for promotion entries, special hours, How to Shop, and Important Notes reordering.

---

## 8. How to Use This Map

- **Adding new templates:**
  - Update `templates.js` (`templates`, `fieldConfig`, `templateHelp`), then rely on `ui.js`’s dynamic rendering.
- **Changing email formatting/EML behavior:**
  - Prefer editing `emailUtils.js` and `emailPreviewUtils.js` rather than touching `ui.js`.
- **Changing promotion config persistence/import/export:**
  - Adjust `promotionConfig.js` and keep `ui.js` focused on DOM + wiring.
- **Promotion UI behaviors (reordering, drag/drop):**
  - Extend or reuse `promotionUiUtils.js` instead of duplicating logic.

This map should remain roughly stable even as individual features evolve; if major module boundaries change, update this file to keep a quick, accurate overview available for future housekeeping and refactors.