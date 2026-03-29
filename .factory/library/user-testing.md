# User Testing

Testing surface, tools, and resource cost classification for validation.

## Validation Surface

**Surface:** Browser (web application)
**URL:** `http://localhost:8080/start.html`
**Tool:** `agent-browser` for all browser-based assertions
**Dev server:** `npm run dev` (Vite on port 8080)

### Pages under test
- `start.html` — profile setup page (primary surface for this mission)

### Pre-test setup
1. Start dev server: `npm run dev`
2. Clear browser localStorage before each assertion (unless assertion requires pre-existing data)
3. Navigate to `http://localhost:8080/start.html`

### What to verify
- Theme system (toggle, palette selectors, flash prevention)
- Profile form (all fields, validation on blur, company email toggle)
- Profile save (valid/invalid submission, redirect behavior, data persistence)
- Export/import (JSON file round-trip, validation, theme restoration)
- Page transitions (fade-out on navigation)
- Tauri integration (browser fallback for download folder)
- Cross-area flows (profile gate redirect, import→theme refresh, job title mid-session)

## Validation Concurrency

**Machine profile:** Tested on dev machine with Vite dev server consuming ~200MB RAM.

**Max concurrent agent-browser validators:** 5
- Each agent-browser instance: ~300MB RAM
- Dev server: ~200MB RAM (shared across validators)
- 5 validators × 300MB = 1.5GB + 200MB server = 1.7GB total
- Well within typical dev machine headroom (8GB+ available)

**Isolation approach:** Each validator clears localStorage and reloads the page before testing its assigned assertions. No shared state between validators.

## Unit Test Assertions

**Tool:** `npm run test` (Vitest with jsdom)
**No setup needed** — test environment mocks localStorage automatically via `tests/setup.js`.

Assertions: VAL-UNIT-001, VAL-UNIT-002, VAL-UNIT-003
