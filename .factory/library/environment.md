# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Dependencies

- **Node.js** — required for dev server, build, tests
- **npm** — package manager (no yarn/pnpm)
- **Vite 7.x** — dev server and bundler
- **Vitest 4.x** — unit test runner with jsdom environment
- **Playwright** — e2e test runner
- **Tauri CLI** — optional, for desktop app builds

## No External Services

This is a fully client-side SPA. No databases, APIs, or external services required for development or testing.

## No Environment Variables

No `.env` files or environment variables needed.

## Tauri Desktop Mode

The app detects Tauri via `window.__TAURI__` and enables native folder picker dialogs. In a regular browser, Tauri-specific features degrade gracefully (disabled buttons, fallback text).

## Build Notes

- `npm run build` builds all three entry points via Vite's multi-page config
- `dist-helpers/*` is copied to `dist/` after build
- Built app requires a local server (CORS) due to ES module format
