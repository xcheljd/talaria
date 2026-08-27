# Talaria

Talaria is a campaign email and customer-communication template generator that any brand can make its own. Set your company, store, products, and branding once on the Settings page, then generate promotion campaigns, newsletters, and email/text/phone templates — there are no hardcoded brand assumptions, so it works for any store or company out of the box.

It's a single-page React app built with Vite 8, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui, with an optional Tauri desktop shell. The desktop build embeds the **amatl** Rust library for on-the-fly PDF optimization (lossy compression, DPI-based JPEG downscaling, stream packing) — used to shrink attached PDFs in the promotion builder.

## Quick Start

```bash
npm install
npm run dev          # Start dev server on http://localhost:5173
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript (strict mode) |
| Build | Vite 8 + @vitejs/plugin-react + @tailwindcss/vite |
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
| Template picker | `/` | Choose a template category (promotions, emails, text, phone) |
| Settings | `/settings` | Fill in profile + app settings (brand, contact info) |
| Promotion builder | `/promotion` | Campaign email builder with collapsible editors, bulk export, PDF attachments |
| Component showcase | `/components` | Dev-only shadcn component preview |

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
