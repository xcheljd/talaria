---
name: refactoring-worker
description: Extracts inline JS into ES modules for pure refactor missions with zero behavior change
---

# Refactoring Worker

Extracts inline JavaScript from HTML files into standalone ES modules. This is a **pure refactor** skill — every change must preserve identical runtime behavior. TDD is mandatory: write failing tests first, then implement to make them pass.

## When to Use This Skill

- Extracting inline `<script>` blocks from HTML into separate `.js` ES module files
- Moving shared functions from page-specific code into `src/js/shared/` modules
- Adding new named exports to existing shared modules
- Any modularization refactor where the goal is zero behavior change

**Do NOT use for:** new features, bug fixes, UI changes, or any work that alters observable behavior.

## Required Skills

- **agent-browser** — Required for post-refactor browser verification. After code changes, launch the browser to confirm the page loads and behaves identically to the pre-refactor state.

## Work Procedure

### Step 1: Read Mission Context

Read these files in order to understand the scope and conventions:

1. The mission file (typically `.factory/missions/<mission-name>/mission.md`) for the specific task scope
2. `AGENTS.md` at project root for coding conventions and anti-patterns
3. `docs/ARCHITECTURE-MAP.md` for module boundaries and data flow

Identify:
- Which HTML file(s) have inline JS to extract
- Which shared modules need new exports
- The target file(s) to create or modify

### Step 2: Run Baseline Tests and Lint

Execute and **record the results** of:

```bash
npm run test
npm run lint
```

Save the output. These are your **baseline pass conditions**. If tests or lint fail at baseline, STOP and report back — do not proceed on a broken baseline.

Also note: if `npm run test:e2e` exists and can run, execute it to establish an e2e baseline. Record those results too.

### Step 3: Write Failing Tests FIRST (Red)

For every new function, export, or module you plan to create:

1. Create or update the test file (co-located in `tests/` or alongside the module following existing patterns)
2. Write tests that import the **planned** exports by their expected names
3. Run `npm run test` — tests MUST fail at this stage (red phase)
4. Record the failing test output as proof

Example test structure for a new shared module export:

```js
import { describe, it, expect } from 'vitest';
import { myNewHelper } from '../../src/js/shared/myModule.js';

describe('myNewHelper', () => {
  it('should return the expected value for given input', () => {
    expect(myNewHelper('input')).toBe('expected output');
  });
});
```

### Step 4: Implement Changes (Green)

Make the minimal code changes to pass the tests:

1. Add new exports to shared modules in `src/js/shared/`
2. Create new module files if needed
3. Extract inline JS from HTML `<script>` tags into ES module files
4. Update HTML to use `<script type="module" src="...">` instead of inline scripts
5. Run `npm run test` — all tests must now pass (green phase)

**Critical rules during implementation:**
- Never access localStorage directly for profile data — use helper functions from `src/js/shared/`
- Never hardcode paths — use Tauri APIs
- Preserve all existing function signatures and return values
- Keep imports explicit: `import { foo } from './shared/bar.js'` — no wildcard imports
- Match the existing code style (indentation, naming, quoting)

### Step 5: Lint and Fix

```bash
npm run lint
```

Fix every lint error. Run lint again until clean. Do not suppress warnings — fix the underlying issue.

### Step 6: Browser Verification with agent-browser

Use the **agent-browser** skill to verify the refactored page loads and behaves identically:

1. Start the dev server: `npm run dev` (runs on port 8080)
2. Launch agent-browser and navigate to the target page (e.g., `http://localhost:8080/start.html`)
3. Verify:
   - Page renders without console errors
   - All interactive elements are present (buttons, inputs, dropdowns)
   - Form submission / key interactions still work
   - Theme applies correctly
4. Take a screenshot for evidence
5. Stop the dev server

If any behavioral difference is detected, STOP and fix before proceeding.

### Step 7: Run Full Test Suite and E2E

```bash
npm run test
npm run lint
npm run test:e2e
```

All must pass. If e2e tests fail due to environment issues (not code), document that and proceed — but unit tests and lint must be clean.

### Step 8: Commit

Create a focused commit with a clear message:

```bash
git add <changed files>
git commit -m "refactor: extract inline JS from start.html into ES modules

- Moved <script> inline code to src/js/start-app.js
- Added new exports to src/js/shared/<module>.js
- Zero behavior change: all tests pass, browser verified
"
```

## Example Handoff

When the orchestrator invokes this worker, the handoff JSON looks like this:

```json
{
  "mission": "modularize-start-html",
  "milestone": "milestone-2-start-app-js",
  "description": "Extract all inline JavaScript from start.html into src/js/start-app.js as an ES module. Update start.html to reference the external module. Zero behavior change.",
  "files_to_read": [
    "start.html",
    "AGENTS.md",
    "docs/ARCHITECTURE-MAP.md",
    ".factory/missions/modularize-start-html/mission.md"
  ],
  "files_to_modify": [
    "start.html"
  ],
  "files_to_create": [
    "src/js/start-app.js"
  ],
  "shared_modules_to_update": [
    {
      "module": "src/js/shared/profile.js",
      "new_exports": ["initProfileForm", "saveProfileFromForm"],
      "purpose": "Extract profile form initialization and save logic currently inline in start.html"
    }
  ],
  "test_files": [
    "tests/start-app.test.js",
    "tests/shared/profile.test.js"
  ],
  "baseline_commands": {
    "test": "npm run test",
    "lint": "npm run lint",
    "e2e": "npm run test:e2e",
    "dev_server": "npm run dev"
  },
  "verification": {
    "browser_url": "http://localhost:8080/start.html",
    "browser_checks": [
      "Page loads without errors",
      "Profile form renders with all fields (name, email, phone, store, title)",
      "Save button is clickable and persists to localStorage",
      "Theme toggle works",
      "Navigation to index.html works"
    ],
    "test_assertions": [
      "initProfileForm() populates form fields from localStorage",
      "saveProfileFromForm() writes form values to localStorage via helpers",
      "start-app.js exports init() that wires DOM events",
      "All existing tests remain green"
    ]
  },
  "commit_message_template": "refactor: extract inline JS from start.html into start-app.js ES module"
}
```

### What a Successful Completion Looks Like

After the worker finishes, it should report:

```
✅ Baseline: npm run test — 47 tests passed, 0 failed
✅ Baseline: npm run lint — 0 errors, 0 warnings
✅ Red phase: 3 new tests written, all failing as expected
✅ Green phase: implemented exports in profile.js, created start-app.js — 50 tests passed, 0 failed
✅ Lint: 0 errors, 0 warnings
✅ Browser: start.html loaded at localhost:8080, all 5 checks passed, screenshot saved
✅ E2E: npm run test:e2e — 12 tests passed, 0 failed
✅ Commit: abc1234 "refactor: extract inline JS from start.html into start-app.js ES module"

Files changed:
  - start.html (removed inline <script>, added <script type="module" src="/src/js/start-app.js">)
  - src/js/start-app.js (new — extracted module entry point)
  - src/js/shared/profile.js (added initProfileForm, saveProfileFromForm exports)
  - tests/start-app.test.js (new — 3 tests)
  - tests/shared/profile.test.js (updated — 2 new test cases)
```

## When to Return to Orchestrator

Return immediately if:
- **Baseline tests fail** — do not start refactoring on a broken codebase
- **Cannot determine scope** — mission.md is ambiguous or missing required files
- **Behavior change detected** — browser verification shows a difference; report what changed

Return upon successful completion of all steps with:
- Summary of changes made
- Test results (before and after)
- Lint results
- Browser verification outcome
- Commit hash
