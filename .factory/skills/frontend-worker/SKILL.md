---
name: frontend-worker
description: React frontend worker for error boundary implementation
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving React component creation, route wiring, and unit test authoring for the error boundaries mission.

## Required Skills

None. All work is done with file editing tools, shell commands (npm, npx, vitest), and optionally agent-browser for visual verification.

## Work Procedure

### 1. Read Mission Context

Read these files before starting any work:
- Mission dir AGENTS.md — boundaries, conventions, allowed files
- Mission dir features.json — your assigned feature (first pending)
- `.factory/library/architecture.md` — system architecture
- `.factory/services.yaml` — available commands and services
- Root `AGENTS.md` — project-wide conventions

### 2. Run Init

Run `.factory/init.sh` to install dependencies. Kill any existing dev server before starting work.

### 3. Run Baseline Tests

```bash
npx vitest run 2>&1
npx tsc --noEmit 2>&1
```

Note the test count and any failures. If tests fail for reasons unrelated to your feature, note them but continue.

### 4. Study Existing Patterns

Before writing code, read these files:
- `src/main.tsx` — current entry point structure
- `src/App.tsx` — current route structure
- `src/components/Layout.tsx` — layout renders nav + Outlet (stays outside boundary)
- `tests/promotion-page.test.tsx` — test patterns (MemoryRouter, ThemeProvider, ProfileProvider wrapping, ResizeObserver mocks)
- `tests/setup.js` — test setup (localStorage mock)

**CRITICAL**: Follow existing patterns exactly. Don't invent new approaches.

### 5. Implement Feature (TDD)

For each feature:

a) **Write tests first** (red phase):
   - Create `tests/error-boundary.test.tsx` with comprehensive tests
   - Test error catching, fallback rendering (app vs route level), reset behavior, navigation, custom fallback, non-Error throws
   - Use `MemoryRouter` for navigation tests
   - Mock `console.error` with `vi.spyOn` for logging assertions
   - Mock `window.location.reload` for app-level tests
   - Tests must FAIL before you write implementation

b) **Implement** (green phase):
   - `src/components/ErrorBoundary.tsx` — class component with getDerivedStateFromError + componentDidCatch
   - TypeScript strict mode, no `any` types
   - Tailwind utility classes for fallback UI (use CSS variables: `bg-background`, `text-foreground`, etc.)
   - Two default fallback styles: app-level (full-screen + reload) and route-level (inline + retry + go home)
   - Support custom fallback via prop (ReactNode or render function)
   - For "Go to home" in route-level fallback: use a regular `<a>` tag with `href="/"` (simpler than importing router Link, and works outside router context if needed)

c) **Wire into app**:
   - Edit `src/main.tsx`: wrap `<App />` with `<ErrorBoundary level="app">` OUTSIDE StrictMode
   - Edit `src/App.tsx`: wrap each route element with `<ErrorBoundary level="route">`
   - Import from `@/components/ErrorBoundary`

d) **Verify**:
   ```bash
   npx tsc --noEmit
   npx vitest run
   npx eslint src/
   ```

### 6. Manual Verification (if dev server is available)

Start the dev server and verify:
```bash
npm run dev &
sleep 3
```

Use agent-browser to spot-check:
- All 4 routes render normally (no regressions)
- Error boundary fallback renders when a component throws

### 7. Clean Up

- Kill any running dev server processes (`lsof -ti :8080 | xargs kill 2>/dev/null || true`)
- Ensure no watch processes are running

## Example Handoff

```json
{
  "salientSummary": "Created ErrorBoundary component with app-level and route-level fallbacks. Wired into main.tsx (outside StrictMode) and App.tsx (per-route). 15 new unit tests passing, all 713 existing tests still green.",
  "whatWasImplemented": "Created src/components/ErrorBoundary.tsx (class component with getDerivedStateFromError, componentDidCatch, resetErrorBoundary). App-level fallback: full-screen centered card with 'Reload app' button. Route-level fallback: inline card with 'Try again' + 'Go to home'. Custom fallback prop support (ReactNode or render function). Updated src/main.tsx to wrap App with app-level boundary outside StrictMode. Updated src/App.tsx to wrap all 4 route elements with route-level boundary.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "No TypeScript errors" },
      { "command": "npx vitest run", "exitCode": 0, "observation": "728 tests passing (15 new + 713 existing)" },
      { "command": "npx eslint src/", "exitCode": 0, "observation": "No lint errors" }
    ],
    "interactiveChecks": [
      { "action": "Navigated to all 4 routes", "observed": "All pages render normally, no regressions" },
      { "action": "Verified ErrorBoundary wraps App in main.tsx outside StrictMode", "observed": "Boundary is outside StrictMode as required" },
      { "action": "Verified all 4 routes wrapped in App.tsx", "observed": "All route elements have ErrorBoundary wrapper" }
    ]
  },
  "tests": {
    "added": [
      { "file": "tests/error-boundary.test.tsx", "cases": [
        { "name": "catches render errors and shows fallback", "verifies": "VAL-COMP-001" },
        { "name": "renders app-level fallback with reload button", "verifies": "VAL-COMP-005" },
        { "name": "renders route-level fallback with try again and go home", "verifies": "VAL-COMP-006" },
        { "name": "resetErrorBoundary clears error state", "verifies": "VAL-COMP-003" },
        { "name": "custom fallback prop overrides default", "verifies": "VAL-COMP-007" },
        { "name": "renders children normally when no error", "verifies": "VAL-COMP-008" },
        { "name": "handles non-Error thrown values", "verifies": "VAL-COMP-009" },
        { "name": "logs error to console.error with component stack", "verifies": "VAL-COMP-004" },
        { "name": "props API accepts level and fallback", "verifies": "VAL-COMP-002" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- TypeScript compilation produces errors that seem unrelated to your changes
- Existing tests fail for reasons unrelated to your feature
- You discover existing code patterns that conflict with the feature requirements
- You cannot complete the feature within the allowed file changes listed in AGENTS.md
