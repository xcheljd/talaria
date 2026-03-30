# PROJECT KNOWLEDGE BASE

**Updated:** 2026-03-29
**Branch:** main

## OVERVIEW

Single-page React app for customer communications (email, text, phone). Vite SPA with React Router, TypeScript, Tailwind CSS v4, shadcn/ui, and Tauri desktop shell.

## STRUCTURE

```
./
├── index.html               # Single entry point (React root)
├── src/
│   ├── main.tsx             # React entry
│   ├── App.tsx              # Router + providers
│   ├── index.css            # Tailwind + CSS variables (palettes)
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── promotion/       # Promotion page components
│   │   ├── Layout.tsx       # App shell with header/nav
│   │   ├── ThemeToggle.tsx  # Light/dark toggle
│   │   └── ...              # Other shared components
│   ├── pages/               # Route page components
│   ├── contexts/            # React contexts (Theme, Profile)
│   ├── stores/              # Zustand stores (promotion)
│   ├── hooks/               # Custom hooks (useTauri, useIndexedDB)
│   ├── lib/                 # Pure utilities (emailUtils, templates, etc.)
│   └── vite-env.d.ts        # Vite type declarations
├── dist-helpers/            # Copied to dist/ after build
└── src-tauri/src/           # Rust backend (IPC handlers)
```

## WHERE TO LOOK

| Task                 | Location                                    | Notes                              |
| -------------------- | ------------------------------------------- | ---------------------------------- |
| Entry point          | index.html → src/main.tsx                   | Single-page React app              |
| Routes               | src/App.tsx                                 | React Router: /, /start, /promotion |
| Template definitions | src/lib/templates.ts                        | 15+ communication templates        |
| Email generation     | src/lib/emailUtils.ts                       | EML/EMLTPL with RFC 5322/2045      |
| Theme system         | src/contexts/ThemeProvider.tsx, src/lib/theme-utils.ts | Light/dark + 16 palettes |
| Profile management   | src/contexts/ProfileProvider.tsx, src/lib/profile.ts | localStorage-backed    |
| PDF storage          | src/lib/db.ts                               | IndexedDB wrapper                  |
| Promotion state      | src/stores/promotion-store.ts               | Zustand with IndexedDB persistence |
| Tauri IPC            | src/hooks/useTauri.ts, src-tauri/src/lib.rs | Download folder dialog             |

## CONVENTIONS

- **Path alias**: `@/` maps to `src/` (TypeScript + Vite)
- **Pure utilities**: Business logic in `src/lib/` with no React imports
- **Components**: React components in `src/components/` and `src/pages/`
- **XSS prevention**: Use `sanitizeHTML()` from `html-utils` on all user input
- **Profile data**: Access via ProfileProvider hooks (`useProfile()`, `useStorePhone()`)
- **EML files**: Must use CRLF line endings (`\r\n`) for email client compatibility
- **Forms**: React Hook Form + Zod validation schemas
- **State**: React Context for theme/profile, Zustand for promotion page

## ANTI-PATTERNS (THIS PROJECT)

- Never access localStorage directly for profile data - use hooks from ProfileProvider
- Never suppress XSS warnings - always sanitize template data
- Never use `\n` line endings in EML files - use `\r\n`
- Never hardcode paths - use Tauri's `app.path().app_data_dir()`
- Never add custom CSS files - use Tailwind utility classes

## UNIQUE STYLES

- **Multi-palette themes**: Light/dark mode with 8 palettes each (CSS custom properties → Tailwind)
- **Signature generation**: Job title-based email selection (management → company email, staff → store email)
- **SPA routing**: React Router with BrowserRouter for client-side navigation
- **Tauri integration**: Desktop app wraps the SPA with native IPC for file dialogs

## COMMANDS

```bash
npm run dev                    # Vite dev server (port 8080)
npm run build                  # Build + copy dist-helpers/* to dist/
npm run preview                # Serve built dist/ via Vite preview
npm run test                   # Vitest unit tests
npm run typecheck              # TypeScript type check
npm run lint                   # ESLint on src/
npm run format                 # Prettier on JS/TS/CSS
npm run tauri:dev              # Tauri dev mode
npm run tauri:build            # Build desktop app
```

## NOTES

- **TypeScript strict mode**: All source is TypeScript with strict compilation
- **Helper files**: dist-helpers/ copied to dist/ after build
- **Tauri config**: Stored in app userData/downloads-config.json (JSON)
- **IndexedDB**: Database name "PDFStorage", store "pdfs"
- **Profile keys**: `userProfile`, `theme`, `lightPalette`, `darkPalette`
- **Tests**: 700 tests in tests/ using Vitest + React Testing Library

## DOCUMENTATION

- `docs/ARCHITECTURE-MAP.md` - Module architecture with data flow
- `docs/SIGNATURE-FORMAT.md` - Email signature structure
- `docs/CHANGELOG.md` - Version history
- `.factory/library/architecture.md` - Detailed React architecture
