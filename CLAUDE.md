# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Communication Template Generator is a multi-page web application for generating customer communication templates (emails, text messages, phone orders). Built as a Vite-based SPA with Electron desktop support, it features:

- **Multi-page structure**: 3 main pages (index.html, start.html, promotion.html)
- **Template generation**: 15+ communication templates across categories (Customer Email, Phone Orders, Text Messages)
- **Email features**: EML/EMLTPL file generation with RFC 5322/2045 compliance, quoted-printable encoding
- **Profile management**: User profile persistence with localStorage and IndexedDB for PDFs
- **Electron desktop app**: Native Windows/Mac builds with custom download folder selection

## Build Commands

```bash
# Development
npm run dev                    # Start Vite dev server on port 8080

# Build
npm run build                  # Build for web (outputs to dist/)
npm run preview                # Preview production build

# Code quality
npm run lint                   # ESLint on src/js/**/*.js
npm run format                 # Prettier on JS and CSS files

# Desktop app
npm run electron:dev           # Build and run in Electron
npm run build:desktop:win      # Build Windows portable exe
npm run build:desktop:mac      # Build Mac .app as zip
```

**Important**: After `npm run build`, helper files from `dist-helpers/` are copied to `dist/`. The built app requires a local server due to ES modules (CORS).

## Architecture

### Multi-Page Application Structure

Three entry points defined in `vite.config.js`:
- **index.html** → Template generator (main app)
- **start.html** → Profile setup/configuration
- **promotion.html** → Promotion email generator

Each page has its own app entry point:
- `src/js/app.js` (index.html)
- `src/js/promotion-app.js` (promotion.html)
- start.html uses inline scripts

### Module Organization

```
src/js/
├── app.js                    # Main app entry point
├── promotion-app.js          # Promotion app entry point
├── state.js                  # Global app state management
├── promotion-state.js        # Promotion page state
├── templates.js              # Template definitions and utilities
├── ui.js                     # Main UI logic and event handlers
├── promotion-ui.js           # Promotion UI logic
├── promotionConfig.js        # Promotion template configuration
├── promotionUiUtils.js       # Promotion UI helper functions
├── promotion-column-collapse.js  # Column collapse feature
└── shared/
    ├── db.js                 # IndexedDB wrapper for PDF storage
    ├── profile.js            # User profile utilities
    ├── signature.js          # Email signature generation
    ├── emailUtils.js         # EML file generation utilities
    ├── emailPreviewUtils.js  # Email preview functionality
    ├── theme.js              # Theme system (light/dark + palettes)
    ├── pageTransitions.js    # Page transition effects
    └── icons.js              # SVG icon utilities
```

**Key Pattern**: Shared utilities live in `src/js/shared/`, page-specific logic at the root level.

### State Management

- **appState** (`state.js`): Stores current template, field data, user profile
- **promotionState** (`promotion-state.js`): Stores promotion-specific state
- **localStorage**: User profile, theme preferences, template configurations
- **IndexedDB**: PDF file storage (via `db.js`)

### Template System

Templates are defined in `templates.js` with:
- `category`: "Customer Email", "Phone Orders", "Text", "Inter-store"
- `fields`: Array of field definitions (text, email, textarea, radio, etc.)
- `template`: Function that generates output from field values
- `emailConfig`: (Optional) Enhanced email features with EML export

Enhanced email templates support:
- Editable subject lines
- EML/EMLTPL file generation with proper RFC encoding
- Both mailto links and EML downloads

### Email Generation

Email files (EML/EMLTPL) are generated in `src/js/shared/emailUtils.js`:
- **RFC 5322** compliance: Proper headers (From, To, Subject, Date, Message-ID)
- **RFC 2045** quoted-printable encoding for body
- **CRLF line endings** (`\r\n`) for email client compatibility
- **Subject encoding**: UTF-8 base64 encoding for non-ASCII characters
- **File naming**: Sanitized, date-stamped filenames

### Signature Generation

`src/js/shared/signature.js` generates email signatures based on job title:
- **Non-management**: Uses store email from profile
- **Management** (Assistant Store Manager and above): Uses company email from profile
- Includes store location, phone, hours, address, Google Plus Code

### Theme System

Multi-palette theme system in `src/js/shared/theme.js`:
- Light/dark mode toggle
- **Light palettes**: pastel (default), golden-hour, terracotta, mint, lavender
- **Dark palettes**: midnight-blue (default), cyberpunk, forest, purple, ember
- CSS custom properties in `src/css/styles.css`
- Theme state stored in localStorage

## Electron Desktop App

Entry point: `electron/main.cjs`

**Features**:
- Custom download folder selection (stored in `userData/downloads-config.json`)
- IPC handlers: `choose-download-dir`, `get-download-dir`, `save-blob`
- Loads `dist/start.html` on launch
- Preload script: `electron/preload.js` exposes `window.electronAPI`

**Build configuration** in `package.json`:
- Uses `electron-builder`
- Mac: zip target
- Windows: portable exe target

## Important Patterns

### XSS Prevention

All user input is sanitized via `sanitizeHTML()` and `escapeAttr()` in `templates.js`:
```javascript
export function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

Use `sanitizeTemplateData()` when processing template field values.

### Profile Data Access

Use helper functions from `templates.js` instead of direct localStorage access:
- `getStorePhone()`
- `getStoreName()`
- `getStoreLocation()`
- `getEmployeeSignature()` (from `shared/signature.js`)

### IndexedDB for PDFs

Use `db.js` functions for PDF storage:
```javascript
import { savePDF, getPDF, deletePDF } from './shared/db.js';

// Store PDF
await savePDF(id, blob, filename);

// Retrieve PDF
const pdfData = await getPDF(id);
```

### EML File Generation

For enhanced email templates, use `createEMLFile()` from `emailUtils.js`:
```javascript
import { createEMLFile } from './shared/emailUtils.js';

const emlBlob = createEMLFile({
  subject: 'Email Subject',
  body: htmlBody,
  bodyPlainText: plainTextFallback
});
```

## Data Persistence

- **User Profile**: localStorage key `userProfile` (JSON)
- **Theme Preferences**: localStorage keys `theme`, `lightPalette`, `darkPalette`
- **Template Configs**: localStorage (template-specific keys)
- **PDFs**: IndexedDB database `PDFStorage`, store `pdfs`

## Common Tasks

### Adding a New Template

1. Add template definition to `templates.js`:
   ```javascript
   {
     id: 'unique-id',
     name: 'Template Name',
     category: 'Customer Email',
     fields: [/* field definitions */],
     template: (data) => `Generated template string`
   }
   ```

2. For enhanced email templates, add `emailConfig`:
   ```javascript
   emailConfig: {
     isEnhanced: true,
     defaultSubject: 'Default Subject',
     generateHTML: (data) => `<html>...</html>`,
     generatePlainText: (data) => `Plain text version`
   }
   ```

### Modifying Email Signature Format

Edit `getEmployeeSignature()` in `src/js/shared/signature.js`. The function checks job title to determine which email to use (company vs store).

### Adding a Theme Palette

1. Add CSS custom properties in `src/css/styles.css`:
   ```css
   [data-theme="light"][data-light-palette="new-palette"] { /* ... */ }
   ```

2. Add option to palette selectors in `start.html` and update `initTheme()` in `theme.js`.

### Working with Electron Features

Check for Electron context:
```javascript
if (window.electronAPI && typeof window.electronAPI.saveBlob === 'function') {
  // Use Electron file saving
} else {
  // Use browser download
}
```

## File Locations

- **Templates**: Built files in `dist/`, dev sources in root `*.html`
- **Assets**: Vite bundles to `dist/assets/`
- **Electron builds**:
  - Windows: `dist/Communication Template Generator 1.0.0.exe`
  - Mac: `dist/Communication Template Generator-1.0.0-mac.zip`
- **User data** (Electron): `app.getPath('userData')/downloads-config.json`

## Testing Notes

- Test email templates in multiple clients (Outlook, Mac Mail, Gmail)
- Verify EML files have proper CRLF line endings
- Check theme switching across all pages
- Test profile import/export functionality
- Validate IndexedDB PDF persistence across page refreshes
