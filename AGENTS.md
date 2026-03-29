# PROJECT KNOWLEDGE BASE

**Generated:** 2025-01-06T20:36:02Z
**Commit:** 8cbaba1
**Branch:** main

## OVERVIEW

Multi-page template generator app for customer communications (email, text, phone). Vite SPA with Tauri desktop shell.

## STRUCTURE

```
./
├── index.html            # Main template generator
├── start.html            # Profile setup
├── promotion.html        # Promotion email generator
├── src/
│   ├── css/              # Stylesheets (theme system)
│   ├── js/               # App logic
│   └── js/shared/        # Cross-page utilities (email, DB, theme)
└── src-tauri/src/        # Rust backend (IPC handlers)
```

## WHERE TO LOOK

| Task                 | Location                               | Notes                         |
| -------------------- | -------------------------------------- | ----------------------------- |
| Entry points         | index.html, start.html, promotion.html | Multi-page via vite.config.js |
| App state            | src/js/state.js, promotion-state.js    | localStorage persistence      |
| Profile page entry   | src/js/start-app.js                    | ES module for start.html      |
| Template definitions | src/js/templates.js                    | 15+ communication templates   |
| Email generation     | src/js/shared/emailUtils.js            | EML/EMLTPL with RFC 5322/2045 |
| Theme system         | src/js/shared/theme.js                 | Light/dark + 16 palettes      |
| PDF storage          | src/js/shared/db.js                    | IndexedDB wrapper             |
| Tauri IPC            | src-tauri/src/lib.rs                   | Download folder dialog        |

## CONVENTIONS

- **Shared utilities**: All reusable code in `src/js/shared/`, page-specific logic at root level
- **State management**: `appState` object with localStorage sync
- **XSS prevention**: Use `sanitizeHTML()` from templates.js on all user input
- **Profile data**: Access via helpers (`getStorePhone()`, `getStoreName()`) not direct localStorage
- **EML files**: Must use CRLF line endings (`\r\n`) for email client compatibility
- **Module boundary**: No index.js - explicit imports from shared/

## ANTI-PATTERNS (THIS PROJECT)

- Never access localStorage directly for profile data - use helper functions
- Never suppress XSS warnings - always sanitize template data
- Never use `\n` line endings in EML files - use `\r\n`
- Never hardcode paths - use Tauri's `app.path().app_data_dir()`

## UNIQUE STYLES

- **Multi-palette themes**: Light/dark mode with 8 palettes each (CSS custom properties)
- **Signature generation**: Job title-based email selection (management → company email, staff → store email)
- **Multi-page entry points**: Vite builds 3 separate pages from one config

## COMMANDS

```bash
npm run dev                    # Vite dev server (port 8080)
npm run build                  # Build + copy dist-helpers/* to dist/
npm run lint                   # ESLint on src/js/**/*.js
npm run format                 # Prettier on JS/CSS
npm run tauri:dev              # Tauri dev mode
npm run tauri:build            # Build desktop app
npm run tauri:build:win        # Windows portable exe
npm run tauri:build:mac        # Mac .app as zip
```

## NOTES

- **ES modules**: Built app requires local server (CORS) due to ES format
- **Helper files**: dist-helpers/ copied to dist/ after build
- **Tauri config**: Stored in app userData/downloads-config.json (JSON)
- **IndexedDB**: Database name "PDFStorage", store "pdfs"
- **Profile keys**: `userProfile`, `theme`, `lightPalette`, `darkPalette`

## DOCUMENTATION

- `docs/ARCHITECTURE-MAP.md` - Module architecture with data flow
- `docs/SIGNATURE-FORMAT.md` - Email signature structure
- `docs/CHANGELOG.md` - Version history
