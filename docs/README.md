# Talaria

A modern, secure web application for generating professional communication
templates for retail/store operations — short customer emails, phone scripts,
text messages, and a full promotion-email builder with bulk BCC export. It ships
both as a web app and as a Tauri desktop app (Windows + macOS).

This document is the high-level overview. For deeper detail, see:

- [ARCHITECTURE-MAP.md](ARCHITECTURE-MAP.md) – module-level architecture
- [../AGENTS.md](../AGENTS.md) – contributor / agent quick reference
- [CHANGELOG.md](CHANGELOG.md) – version history
- [SIGNATURE-FORMAT.md](SIGNATURE-FORMAT.md) – email signature structure

---

## 🚀 Key Features

### Template System
- **Customer Email Templates**: welcome emails, new-model arrivals, limited
  editions, warranty information, order confirmations
- **Phone Order Templates**: order processing, shipping notifications,
  approval/verification flows
- **Text Message Templates**: availability checks, thank-you messages, sale alerts
- **Promotion Email Builder**: advanced HTML email builder with PDF attachments,
  drag-and-drop reordering, version history, and bulk BCC generation
- **Enhanced Email Features**: editable subject lines, live HTML preview, and
  EML/EMLTPL download for Outlook and other clients

### Promotion Email Builder
- Dynamic brand/product entries with add/remove/reorder (dnd-kit drag-and-drop)
- Special hours, "How to Shop", and "Important Notes" sections with defaults
- PDF attachment support (size-validated) with an interactive preview modal,
  persisted in IndexedDB
- Live HTML preview (desktop/mobile widths, light/dark toggle) wired to the
  selected email theme
- Bulk email generation with BCC recipients, batch sizing, and ZIP export
- Export/import of the full builder configuration as JSON (optionally embedding
  PDF data and the recipient list)
- Accessibility and Outlook-compatibility checkers

### User Profile & Theme
- Store-specific configuration (name, phone, location, employee details) saved
  locally and reused across templates
- Light/dark mode with multiple palettes per theme
- Real-time template search and keyboard-accessible navigation

---

## 🛠️ Architecture Overview

The app is a **React 19 + TypeScript single-page application** built with Vite,
all source under `src/`. It is wrapped by a **Tauri 2** desktop shell
(`src-tauri/`) for the Windows/macOS builds.

**Stack:** React 19, TypeScript (strict), Vite 8, Tailwind v4, shadcn/ui on the
unified `radix-ui` package, TipTap (rich-text), Zustand (state), React Router 7,
Zod + React Hook Form. There is no backend — all state lives in `localStorage`
and IndexedDB.

### Entry & structure
- `index.html` → `src/main.tsx` mounts `<App />` (single SPA entry).
- `src/App.tsx` composes providers (Theme, Profile, Sonner) and declares routes.
- Routes: `/` (templates), `/settings` (profile + settings), `/promotion` (builder),
  and `/components` (dev-only showcase).
- `src/pages/` – one container per route.
- `src/components/` – shared components; `src/components/promotion/` – builder
  components; `src/components/ui/` – shadcn primitives.
- `src/stores/promotion-store.ts` – Zustand store, the source of truth for the
  promotion builder.
- `src/lib/` – pure logic: template catalog, email/MIME generation, persistence,
  validation. See [ARCHITECTURE-MAP.md](ARCHITECTURE-MAP.md) for the function-level map.

---

## 💾 Data & Persistence

Every localStorage key is enumerated in `src/lib/storage-keys.ts` (`StorageKeys`)
— always import from there rather than inlining string literals.

| Surface | Backend | Source of truth |
| --- | --- | --- |
| User profile | localStorage | `src/lib/profile.ts` |
| Theme/palette prefs | localStorage | `src/contexts/ThemeProvider.tsx` |
| Promotion builder state | localStorage | `src/stores/promotion-store.ts` |
| Version snapshots | localStorage | `src/components/promotion/VersionHistory.tsx` |
| PDF blobs | IndexedDB (`Talaria` → `promotionPDFs`) | `src/lib/db.ts` |
| Bulk recipients | IndexedDB (`Talaria` → `bulkEmailRecipients`) | `src/lib/db.ts` |

Metadata lives in localStorage; binary file data (PDFs) and recipient lists live
in IndexedDB.

---

## 🔐 Security

- **XSS prevention:** all user-supplied content is escaped/sanitized through the
  centralized helpers in `src/lib/html-utils.ts` (`sanitizeHTML`,
  `sanitizeRichHTML`, `escapeAttr`) before it reaches generated email HTML.
- **Input validation:** Zod schemas validate the user profile and imported
  builder configs; PDF uploads are size/type-validated.
- **Desktop CSP:** a Content-Security-Policy is enforced in the Tauri webview via
  `src-tauri/tauri.conf.json` (`app.security.csp`).
- **File handling:** desktop writes go through the Tauri `save_file_to_dir`
  command into the user-chosen download folder; the browser build falls back to
  an anchor download.

---

## 🚀 Getting Started

### Prerequisites
- Node.js and npm
- For desktop builds: the [Tauri 2 prerequisites](https://tauri.app/start/prerequisites/)
  (Rust toolchain + platform deps)

### Install & run
```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
```

The app is a single SPA — navigate within it (`/`, `/promotion`,
`/profile/settings`); there are no separate HTML entry pages.

### Build
```bash
npm run build        # web build into dist/
npm run tauri:build  # desktop app (Windows .exe / macOS .app/.dmg)
```

---

## 🔧 Development

### Quality gates
```bash
npm run typecheck    # two-pass: app (tsc) + tests (tsconfig.test.json)
npm run lint         # eslint src/
npm test             # vitest run
npm run format       # prettier --write
```
Run typecheck + lint + test before committing.

### Testing
- **Unit/component:** Vitest + Testing Library + jsdom (`tests/*.test.ts(x)`).
- **E2E:** Playwright (`npm run test:e2e`).
- **Coverage:** `npm run test:coverage`.

### Desktop (Tauri)
```bash
npm run tauri:dev    # run the desktop shell in dev
npm run tauri:build  # package the desktop app
```
Desktop builds (Windows + macOS) are also produced by the GitHub Actions
`build.yml` workflow. CI (`ci.yml`) runs typecheck, lint, and tests on every
push to `main`.

### Adding templates
Define new templates in `src/lib/templates.ts` (`templates`, `fieldConfig`,
`templateHelp`). The generator page picks them up automatically. See the
"Common tasks" section of [../AGENTS.md](../AGENTS.md) for other recipes
(persisted settings, promotion state, download paths).

---

## 📈 Version History

See [CHANGELOG.md](CHANGELOG.md) for the authoritative changelog.

---

## 📄 License & Support

MIT licensed — free for any use. See Git history and
[CHANGELOG.md](CHANGELOG.md) for change tracking.
