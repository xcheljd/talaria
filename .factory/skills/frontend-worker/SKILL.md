---
name: frontend-worker
description: React + shadcn/ui frontend implementation worker for the migration mission
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

All features in this mission: React + TypeScript + shadcn/ui migration of the Communication Template Generator. Handles project setup, theme system, shared utilities, page components, Zustand stores, and build cleanup.

## Required Skills

None. All work is done with file editing tools, shell commands (npm, npx, vitest), and optionally agent-browser for visual verification.

## Work Procedure

### 1. Read Mission Context
Read these files before starting any work:
- `/home/x/.factory/missions/91c0d29d-2ea7-4ab2-a28e-2ff28fcc3d7f/mission.md` -- mission proposal and goals
- `/home/x/.factory/missions/91c0d29d-2ea7-4ab2-a28e-2ff28fcc3d7f/AGENTS.md` -- boundaries, conventions, testing guidance
- `/home/x/.factory/missions/91c0d29d-2ea7-4ab2-a28e-2ff28fcc3d7f/features.json` -- your assigned feature (first pending)
- `.factory/library/architecture.md` -- system architecture
- `.factory/library/environment.md` -- dependencies and setup notes
- `.factory/services.yaml` -- available commands and services

### 2. Run Init
Run `.factory/init.sh` to install dependencies. Kill any existing dev server before starting work.

### 3. Run Baseline Tests
```bash
npx vitest run 2>&1
npx tsc --noEmit 2>&1
```
If tests fail, note the failures but continue -- the existing codebase may have issues unrelated to your feature.

### 4. Study Existing Code Before Migrating
Before writing any React code, read the corresponding vanilla JS source files:
- For setup features: read `vite.config.js`, `package.json`, existing HTML entry points
- For theme: read `src/js/shared/theme.js`, `src/css/theme-base.css`, `src/css/theme-palettes.css`
- For utilities: read the corresponding file in `src/js/shared/`
- For profile page: read `src/js/start-app.js`, `start.html`
- For templates page: read `src/js/ui.js`, `src/js/templates.js`, `index.html`
- For promotion page: read `src/js/promotion-ui.js`, `src/js/promotion-state.js`, `src/js/promotionConfig.js`, `promotion.html`

**CRITICAL**: The vanilla JS source is the ground truth. Your React implementation must produce identical behavior and output. Do not guess at behavior -- read the source.

### 5. Implement Feature (TDD)
For each feature:

a) **Write tests first** (red phase):
   - For utility modules: write unit tests that verify identical behavior to the vanilla JS versions
   - For React components: write component tests using `@testing-library/react`
   - For stores: write Zustand store tests
   - Tests must fail before you write implementation

b) **Implement** (green phase):
   - TypeScript strict mode
   - shadcn/ui components from `src/components/ui/`
   - Tailwind CSS v4 utility classes (no custom CSS files)
   - Pure business logic in `src/lib/` (no React imports)
   - React components in `src/pages/` and `src/components/`
   - Zustand stores in `src/stores/`

c) **Verify**:
   ```bash
   npx tsc --noEmit
   npx vitest run
   npx eslint src/
   ```

### 6. Manual Verification
Start the dev server and manually verify key functionality:
```bash
npm run dev &
sleep 3
curl -sf http://localhost:8080/
```
For features with visual components, use agent-browser to verify rendering and interactions.

### 7. Clean Up
- Kill any running dev server processes
- Ensure no watch processes are running
- Do NOT delete legacy files unless your feature explicitly says to (only `build-and-cleanup` does this)

## Example Handoff

```json
{
  "salientSummary": "Migrated the theme system to React with ThemeProvider context and useTheme() hook. All 16 palettes converted to oklch. Light/dark toggle works with localStorage persistence. Theme tests rewritten and passing (44 tests).",
  "whatWasImplemented": "Created src/contexts/ThemeProvider.tsx with light/dark mode and palette selection. Converted 16 palettes from hex to oklch in src/index.css with @theme inline directives. Created useTheme() hook. Theme toggle uses shadcn Switch. Migrated tests/theme.test.js to tests/theme.test.tsx (44 passing).",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "No TypeScript errors" },
      { "command": "npx vitest run --grep theme", "exitCode": 0, "observation": "44 tests passing" },
      { "command": "npx eslint src/contexts/ src/hooks/", "exitCode": 0, "observation": "No lint errors" }
    ],
    "interactiveChecks": [
      { "action": "Toggle light/dark mode", "observed": "All component colors change, localStorage updated" },
      { "action": "Select Catppuccin Latte palette", "observed": "Colors update across all components" },
      { "action": "Reload page", "observed": "Theme persists, no flash of wrong theme" }
    ]
  },
  "tests": {
    "added": [
      { "file": "tests/theme.test.tsx", "cases": [
        { "name": "toggles dark mode", "verifies": "VAL-THEME-001" },
        { "name": "persists theme in localStorage", "verifies": "VAL-THEME-001" },
        { "name": "applies all 16 palettes correctly", "verifies": "VAL-THEME-002" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on a precondition that hasn't been completed yet
- shadcn/ui CLI commands fail or produce unexpected results
- TypeScript compilation produces errors that seem unrelated to your changes
- You discover that existing vanilla JS behavior differs from what the feature description expects
- Tauri toolchain is not available and your feature requires it
