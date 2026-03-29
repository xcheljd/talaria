# Architecture

How the multi-page Communication Template Generator app works.

## Overview

Multi-page Vite SPA with three entry points (`index.html`, `start.html`, `promotion.html`) and an optional Tauri desktop shell. Each HTML page has a corresponding ES module entry point in `src/js/`:

| Page | Entry Module | Purpose |
|---|---|---|
| `index.html` | `src/js/app.js` | Main template generator |
| `start.html` | *(currently inline JS)* | Profile setup / settings |
| `promotion.html` | `src/js/promotion-app.js` | Promotion email generator |

## Module Structure

```
src/js/
├── app.js                  # Main page entry: init theme, page transitions, IndexedDB, UI
├── start-app.js            # (TO BE CREATED) Profile page entry
├── promotion-app.js        # Promotion page entry
├── ui.js                   # Main page UI logic (template selection, generation, export)
├── promotion-ui.js         # Promotion page UI logic
├── promotion-state.js      # Promotion state management
├── promotionConfig.js      # Promotion configuration
├── promotion-column-collapse.js  # Column collapse behavior
├── promotionUiUtils.js     # Shared promotion UI helpers
├── templates.js            # 15+ communication template definitions
└── shared/
    ├── theme.js            # Theme init/toggle/palette validation/CSS helpers
    ├── profile.js          # Profile CRUD (getUserProfile/saveUserProfile + field getters)
    ├── pageTransitions.js  # Fade-out navigation + bfcache handling
    ├── ui-utils.js         # showToast, detectOS, scroll helpers, SR announcements
    ├── db.js               # IndexedDB wrapper for PDF storage
    ├── emailUtils.js       # EML/EMLTPL generation (RFC 5322/2045)
    ├── emailPreviewUtils.js # Email preview rendering
    ├── signature.js        # Email signature generation
    ├── icons.js            # SVG icon definitions
    ├── html-utils.js       # HTML sanitization helpers
    └── htmlTextConversion.js # HTML ↔ text conversion
```

## Data Flow

- **Profile data:** Stored in `localStorage` as JSON under key `userProfile`. All access goes through `shared/profile.js` helper functions.
- **Theme preferences:** `localStorage` keys: `theme`, `lightPalette`, `darkPalette`. Applied via `data-*` attributes on `<html>`.
- **Template data:** Template definitions in `templates.js`, generated content in `ui.js`.
- **PDF storage:** IndexedDB (database "PDFStorage", store "pdfs") via `shared/db.js`.

## Page Initialization Pattern

Each page follows this pattern:
1. Inline `<head>` script: synchronous IIFE reads theme from localStorage, sets `data-*` attributes (flash prevention)
2. `<script type="module">` at end of body: imports shared modules, wires event listeners

The refactoring mission brings `start.html` in line with this pattern by replacing its 4 inline `<script>` blocks with a single `<script type="module" src="/src/js/start-app.js">`.

## Key Invariants

- Profile data is always accessed via `shared/profile.js` helpers, never direct `localStorage`
- Theme is initialized synchronously in `<head>` before first paint
- EML files use CRLF (`\r\n`) line endings
- All user input rendered as HTML must be sanitized via `sanitizeHTML()`
