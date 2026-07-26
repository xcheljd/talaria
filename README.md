# Talaria

Talaria is a campaign email and customer-communication template generator that any brand can make its own. Set your company, store, products, and branding once on the Settings page, then generate promotion campaigns, newsletters, and email/text/phone templates — there are no hardcoded brand assumptions, so it works for any store or company out of the box.

It's a single-page React app built with Vite 7, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui, with an optional Tauri desktop shell.

## Quick Start

```bash
npm install
npm run dev          # Start dev server on http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript (strict mode) |
| Build | Vite 7 + @vitejs/plugin-react + @tailwindcss/vite |
| Styling | Tailwind CSS v4 with `@theme` inline config |
| UI Components | shadcn/ui (New York style) + Radix UI primitives |
| Icons | lucide-react |
| Routing | React Router v7 (BrowserRouter) |
| State | React Context (theme/profile) + Zustand (promotion) |
| Forms | React Hook Form + Zod validation |
| Storage | IndexedDB (PDF storage, bulk email recipients) |
| Packaging | jszip (bulk email ZIP packaging) |
| Desktop | Tauri v2 (Rust backend) |

## Routes

| Page | Route | Description |
|---|---|---|
| Templates landing | `/` | Pick a template category |
| Template generator | `/templates` | Main template generator |
| Promotions | `/promotion` | Promotion email generator with collapsible editors |
| Profile (read-only) | `/profile` | View current profile |
| Profile settings | `/profile/settings` | Edit profile + app settings |
| Legacy redirect | `/start` | Redirects to `/profile/settings` |
| Components showcase | `/components` | Dev-only shadcn component preview |

See [docs/ARCHITECTURE-MAP.md](docs/ARCHITECTURE-MAP.md) for the canonical, up-to-date architecture overview.

## Development

```bash
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build to dist/ + copy dist-helpers/
npm run preview          # Serve built dist/ via Vite preview
npm run typecheck        # TypeScript check (tsc --noEmit)
npm run lint             # ESLint on src/
npm run format           # Prettier on JS/TS/CSS
```

## Testing

```bash
npm run test             # Vitest unit tests
npm run test:watch       # Vitest in watch mode
npm run test:coverage    # Vitest with coverage report
npm run test:e2e         # Playwright end-to-end tests
```

## Desktop App (Tauri)

```bash
npm run tauri:dev          # Tauri dev mode
npm run tauri:build        # Build desktop app (Linux)
npm run tauri:build:win    # Build for Windows
npm run tauri:build:mac    # Build for macOS
```

## Project Structure

```
src/
├── main.tsx                    # React entry point
├── App.tsx                     # BrowserRouter with 3 routes
├── index.css                   # Tailwind v4 + CSS variable tokens (oklch)
├── components/
│   ├── Layout.tsx              # Shared header/navigation shell
│   ├── ThemeToggle.tsx         # Light/dark mode + palette switcher
│   ├── ui/                     # shadcn/ui components
│   └── promotion/              # Promotion page components
│       ├── CollapsibleCard.tsx
│       ├── SkinnyColumnBar.tsx
│       └── ...                 # Editors, previews, etc.
├── pages/
│   ├── TemplatesPage.tsx       # Main template generator
│   ├── ProfilePage.tsx         # Profile setup
│   └── PromotionPage.tsx       # Promotion email builder
├── contexts/
│   ├── ThemeProvider.tsx        # Light/dark + 16 color palettes
│   └── ProfileProvider.tsx     # User profile context
├── stores/
│   └── promotion-store.ts      # Zustand store (IndexedDB persistence)
├── lib/                        # Pure utility modules
│   ├── emailUtils.ts           # EML/EMLTPL generation (RFC 5322/2045)
│   ├── html-utils.ts           # XSS sanitization
│   ├── signature.ts            # Email signature generation
│   ├── db.ts                   # IndexedDB wrapper
│   ├── profile.ts              # Profile data helpers
│   ├── templates.ts            # 15+ communication template definitions
│   └── theme-utils.ts          # Palette/theme utilities
├── hooks/
│   ├── useMediaQuery.ts        # Responsive breakpoint hook
│   └── useTauri.ts             # Tauri IPC hook
└── vite-env.d.ts               # Vite type declarations
```

## Theming

16 color palettes (8 light + 8 dark) using oklch CSS custom properties. Theme state managed by `ThemeProvider` with persistence via `localStorage`. The `ThemeToggle` component allows switching between light/dark modes and selecting palettes.

## Profile & Data

- **Profile**: Stored in `localStorage` under key `userProfile`. Access via `ProfileProvider` hooks (`useProfile()`, `useStorePhone()`).
- **PDFs**: IndexedDB database `PDFStorage` with store `pdfs`.
- **Promotion state**: Zustand store with IndexedDB persistence for durability across sessions.

## Notes

- **Path alias**: `@/` maps to `src/` (TypeScript + Vite)
- **EML files**: Use CRLF line endings (`\r\n`) for email client compatibility
- **XSS prevention**: All user input sanitized with `sanitizeHTML()` from `html-utils`
- **Helper files**: `dist-helpers/` copied to `dist/` after build
