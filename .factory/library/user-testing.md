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
- The `/promotion` route redirects to legacy `start.html?return=promotion.html` when no profile is saved (expected per VAL-PROMO-021). This can prevent direct testing of palette persistence on the React promotion page. Verify via localStorage + computed CSS vars instead.

### Known Frictions
- `/promotion` page redirect: When no profile is saved, navigating to `/promotion` redirects to the legacy `start.html` page instead of the React `/start` route. This is expected behavior but can complicate cross-page palette persistence testing.

## Known Issues (from setup milestone)
- ~~**VAL-THEME-004**: `theme-transitions.css` is not imported into the React app's `src/index.css`.~~ **RESOLVED in Round 2** — Transition rules (background-color, color, border-color, box-shadow at 0.3s cubic-bezier) added directly to `src/index.css`. Assertion now passes.
