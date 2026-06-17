# AGENTS.md

Guidance for AI agents and new contributors working in this repository. For the
deep architectural reference, see [docs/ARCHITECTURE-MAP.md](docs/ARCHITECTURE-MAP.md).
For the Rust/Tauri backend specifically, see [src-tauri/src/AGENTS.md](src-tauri/src/AGENTS.md).

## What this is

A **React 19 + TypeScript (strict) single-page app** that generates citizen /
store communication templates — short customer emails, phone scripts, and a
full promotion-email builder with bulk BCC batch export. It ships both as a web
app and as a **Tauri 2 desktop app** (Windows `.exe` + macOS) built in CI.

Stack: Vite 8, Tailwind v4, shadcn/ui (new-york) on the unified `radix-ui`
package, TipTap rich-text editor, Zustand store, React Router 7, Zod +
React Hook Form. No backend, no auth, no network calls — all state lives in
`localStorage` and IndexedDB.

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Typecheck (two-pass: app + tests) | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit/component tests (Vitest) | `npm test` |
| Coverage | `npm run test:coverage` |
| E2E (Playwright) | `npm run test:e2e` |
| Desktop dev / build | `npm run tauri:dev` / `npm run tauri:build` |

**Before committing, run `npm run typecheck && npm run lint && npm test`.** The
typecheck is two passes: the app compiles browser-only (`types: []`); the test
project (`tsconfig.test.json`) adds node types. A change can pass one and fail
the other.

## Key modules

- `src/stores/promotion-store.ts` — Zustand store; single source of truth for
  the promotion builder. Auto-persists to `localStorage`, hydrates PDFs from
  IndexedDB on mount.
- `src/lib/storage-keys.ts` — typed registry of **every** localStorage key.
  Always import `StorageKeys.<key>`; never inline a string literal.
- `src/lib/promotion-email-html.ts` — generates the promotion email HTML and the
  dark-mode palette transform.
- `src/lib/promotion-config.ts` — `buildExportConfig` / `validateImportConfig`
  for the export/import round-trip.
- `src/lib/emailUtils.ts` — EML/MIME assembly (`createEMLFile`,
  `createBCCBatchEML`) and recipient parsing.
- `src/lib/bulk-email-generation.ts` — bulk batch generation + recipient stats.
- `src/lib/file-save.ts` — `saveBlob()`; routes through the Tauri
  `save_file_to_dir` command on desktop, browser-anchor download otherwise.
- `src/lib/db.ts` — IndexedDB wrappers (PDF blobs + bulk recipients).
- `src/components/ui/` — shadcn primitives. Don't hand-edit; compose them in
  feature components. Add new ones with the shadcn CLI (`components.json`).

## Conventions

- File references in code/docs use repo-relative paths.
- Match existing patterns: Zustand for cross-page promotion state, `useState`
  for transient local state, Zod for validation, `cn()` for class merging.
- All downloads go through `saveBlob()` so the desktop download-folder setting
  and the browser fallback both work.
- Dark-mode handling in any preview/signature renderer uses
  `isIframePreviewDarkMode()` from `theme-utils.ts`.
- The `/components` showcase route is registered **only in dev**
  (`import.meta.env.DEV`).

## Common tasks

- **Add a template:** extend `templates`, `fieldConfig`, `templateHelp` in
  `src/lib/templates.ts`.
- **Add a persisted setting:** add the key to `storage-keys.ts`, then read/write
  via `StorageKeys.<key>`.
- **Add promotion editor state:** add the field (state + action + persistence)
  to `promotion-store.ts`; the auto-save effect handles it if included in
  `persistData`.
- **Add a download path:** route through `saveBlob()`.

## Desktop / Tauri notes

The CSP lives in `src-tauri/tauri.conf.json` under `app.security.csp` and
applies **only** in the Tauri webview (not Vite dev or tests). If a preview
panel shows "content blocked" or renders blank in the desktop build, it's almost
always a missing CSP source — the fix is one line there.
