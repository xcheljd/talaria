# User Testing

## Validation Surface
- **Primary surface:** Browser (agent-browser) at http://localhost:8080
- **Routes:** / (templates), /start (profile), /promotion (promotion builder)
- **Tool:** agent-browser skill for all UI assertions
- **Unit tests:** vitest for utility functions and React component tests

## Validation Concurrency
- **Max concurrent browser validators:** 3
- **Machine specs:** 7.7 GB RAM, 8 CPU cores, ~2.6 GB available (as of 2026-03-29)
- **Per-instance cost:** ~300 MB (browser) + ~200 MB (dev server)
- **Rationale:** 3 × 300 MB + 200 MB = 1.1 GB, within 70% headroom of 2.6 GB available

## Flow Validator Guidance: Browser

### Isolation Rules
- Each browser session uses a unique `--session` ID (e.g., `2d08ac2d6394__setup-ui`, `2d08ac2d6394__theme`)
- localStorage is shared across sessions on the same origin — validators touching theme state (VAL-THEME-*) should be aware of potential interference
- The `/promotion` route redirects to React `/start` (via React Router `<Navigate>`) when no profile is saved. The redirect works correctly but no "profile required" banner is displayed (VAL-PROMO-021 failed). Profile must be seeded via `localStorage.setItem('userProfile', ...)` before testing promotion features.

### Known Frictions
- **Profile redirect on /promotion:** When no profile is saved, navigating to `/promotion` redirects to the React `/start` route. However, no "profile required" banner/notification is displayed on the profile page (VAL-PROMO-021 is a known failure). Always seed a profile via localStorage before testing promotion features.
- **Direct URL navigation serves vanilla JS:** Navigating directly to `http://localhost:8080/start` or `http://localhost:8080/promotion` serves the legacy vanilla JS HTML files, not the React SPA. Must always navigate to `http://localhost:8080/` first (React root), then use React Router (nav links or `router.navigate()`) to reach `/start` or `/promotion`. This is because Vite serves static HTML files for matching paths before SPA client-side routing takes over.
- **Plus Code validation regex:** The regex (`/^[A-Z0-9]{2,4}\+[A-Z0-9]{2,3}$/i`) accepts 2-4 chars before `+` and 2-3 chars after. The example in the error message (`849VCWC8+R9`) doesn't match — use shorter codes like `CWCV+R9` for testing.
- **Hidden file input for import:** Profile import uses a hidden `<input type="file">` triggered by button click. In headless testing, use `DataTransfer` API + `change` event dispatch to set the file programmatically.
- **Collapsed center column intercepts clicks:** When the "Email Tools" center column is collapsed (width: 0), the skinny sidebar button intercepts pointer events on PDF section elements (PDF name buttons, remove buttons). Must expand the Email Tools column before interacting with PDF elements in that section.
- **PDF upload area is a div, not file input:** The PDF upload zone uses a `<div role="button">` not an `<input type="file">`. To upload files programmatically, find the hidden `<input type="file">` within the container and use `DataTransfer` API + `change` event dispatch.
- **Radio buttons unreliable via agent-browser click:** Radio buttons (e.g., Individual Files / ZIP Archive) may fail with Playwright strict mode / overlay detection. Workaround: use `element.click()` via agent-browser eval instead of the click command.
- **Company email domain validation:** The Company Email field requires `@citizenwatchgroup.com` domain for management positions. Use this domain when seeding test profiles.

## Known Issues (from setup milestone)
- ~~**VAL-THEME-004**: `theme-transitions.css` is not imported into the React app's `src/index.css`.~~ **RESOLVED in Round 2** — Transition rules (background-color, color, border-color, box-shadow at 0.3s cubic-bezier) added directly to `src/index.css`. Assertion now passes.
