# Plan 004: Standardize dev port on 5173, repair two stale/flaky E2E specs, and run the suite in CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c469626..HEAD -- .github/workflows playwright.config.js vite.config.ts src-tauri/tauri.conf.json tests/e2e`
> Compare against the "Current state" excerpts before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `c469626`, 2026-06-17 — **refreshed twice (2026-06-18)**:
  first for the port mismatch, then to include two e2e spec repairs that the
  port-aligned run surfaced.

## Why this matters

The repo has a real E2E suite but **CI never runs it**, so regressions in the
flagship flows ship green. Two prior execution attempts revealed *why* nobody
noticed: the suite couldn't even run.

## What two prior runs found (so you don't rediscover it)

1. **Port mismatch** — Playwright targets `5173`, the app served on `8080`, so
   Playwright's `webServer` timed out before any spec ran. **Decision: standardize
   on 5173** (move the app to 5173; Playwright config/specs already use 5173).
2. With the port aligned, the suite ran: **95/99 passed**. The remaining hard
   failures are **two stale/fragile specs**, NOT app bugs:
   - `tests/e2e/qa-verification.spec.ts:456` "export and re-import round-trips
     state" — clicks `button[aria-label="Export"]` and waits for a download. But
     that button now only **opens an export-options dialog** (added in commit
     `3f69ad3`); the download fires from the dialog's confirm button. The spec
     never clicks confirm, so the download never happens → 15s timeout. **Export
     works in the app; the test is stale.**
   - `tests/e2e/patterns.e2e.test.js` "sets light palette attribute" — sets
     `data-light-palette` directly via `page.evaluate`, which **races the
     ThemeProvider mount effect** that applies the persisted/default palette
     ("github") over the test's "nord". Flaky (passes on retry under `retries:2`).

## Current state

Port references to change (to 5173):
- `vite.config.ts:27` → `server: { port: 8080 }`
- `src-tauri/tauri.conf.json:8` → `"devUrl": "http://localhost:8080"`
- `README.md:9`, `README.md:45`, `docs/README.md:120` → docs say 8080
- `playwright.config.js:11`/`:34` and `tests/e2e/qa-verification.spec.ts:22`
  already use 5173 — **leave those**.

The `webServer` block in `playwright.config.js` exists **only when `CI` is set**,
so the local gate must run as `CI=1 npm run test:e2e`.

The stale export spec, `tests/e2e/qa-verification.spec.ts:456-470` (current):
```js
test('export and re-import round-trips state', async ({ page }) => {
  await fillBasics(page);
  await page.waitForTimeout(1000);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.locator('button[aria-label="Export"]').click(),
  ]);
  // ... reads the download, re-imports, asserts title
```

The export dialog it must now drive — `src/components/promotion/PreviewColumn.tsx:690-735`:
the trigger `button[aria-label="Export"]` calls `openExportDialog`; the dialog is
a Radix `AlertDialog` (role `alertdialog`) whose footer has
`<AlertDialogCancel>Cancel</AlertDialogCancel>` and
`<AlertDialogAction onClick={handleExportConfig}>Export</AlertDialogAction>` —
the **confirm** button (accessible name "Export") is what triggers the download.

The flaky palette specs — `tests/e2e/patterns.e2e.test.js` "sets light palette
attribute" and "sets dark palette attribute" both set the `data-*-palette`
attribute directly and read it back. The app's ThemeProvider
(`src/contexts/ThemeProvider.tsx:37-39`) sets `data-theme`/`data-light-palette`/
`data-dark-palette` from `localStorage` keys `theme`/`lightPalette`/`darkPalette`
(literal strings; see `src/lib/storage-keys.ts:11-15`) on mount — that effect is
what overwrites the test's manual set.

`.github/workflows/ci.yml` (current) runs one `check` job (typecheck, lint, unit
tests); no e2e.

## Commands you will need

| Purpose          | Command                                                                     | Expected            |
|------------------|-----------------------------------------------------------------------------|---------------------|
| Install          | `npm ci`                                                                    | exit 0              |
| Install browsers | `npx playwright install` (macOS) / `--with-deps` (Linux)                    | browsers installed  |
| Run E2E locally  | `CI=1 npm run test:e2e`                                                      | all pass (0 failed) |
| One e2e spec     | `CI=1 npx playwright test tests/e2e/qa-verification.spec.ts`                 | pass                |
| YAML sanity      | `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` | exit 0              |
| Typecheck        | `npm run typecheck`                                                          | exit 0              |

## Scope

**In scope**:
- `vite.config.ts`, `src-tauri/tauri.conf.json`, `README.md`, `docs/README.md` — port 5173.
- `tests/e2e/qa-verification.spec.ts` — repair ONLY the export test (Step 2).
- `tests/e2e/patterns.e2e.test.js` — stabilize the two "sets … palette attribute"
  tests (Step 3).
- `.github/workflows/ci.yml` — add the `e2e` job (Step 5).

**Out of scope** (do NOT touch):
- `playwright.config.js` — already correct.
- Any e2e spec OTHER than the two named above. Do not "improve" passing tests.
- `src/**` and `src-tauri/src/**` — the app is correct; do not change app code.
  If you believe an app bug exists, STOP and report it.
- The unrelated `8080` in `.github/workflows/simplify-and-harden-ci.lock.yml`.

## Git workflow
- Branch: `advisor/004-e2e-in-ci`
- Conventional-commit style (e.g. `ci: align dev port to 5173, repair e2e specs, run e2e in CI`).
- Do NOT push.

## Steps

### Step 1: Move the dev port to 5173
- `vite.config.ts`: `port: 8080` → `port: 5173`.
- `src-tauri/tauri.conf.json`: `devUrl` → `http://localhost:5173`.
- `README.md:9`, `README.md:45`, `docs/README.md:120`: `8080` → `5173` (text only).

**Verify**: `npm run typecheck` → exit 0; `grep -rn 8080 vite.config.ts src-tauri/tauri.conf.json README.md docs/README.md` → no matches.

### Step 2: Repair the stale export spec
In `tests/e2e/qa-verification.spec.ts`, change the export test so it opens the
dialog, then awaits the download while clicking the dialog's **confirm** button:

```js
// Open the export-options dialog
await page.locator('button[aria-label="Export"]').click();
// Confirm export in the dialog → this is what triggers the download
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 15000 }),
  page.getByRole('alertdialog').getByRole('button', { name: 'Export' }).click(),
]);
```
Leave the rest of the test (reading the download, re-import, title assertion)
unchanged. Do not change any other test in this file.

**Verify**: `CI=1 npx playwright test tests/e2e/qa-verification.spec.ts` → all pass.

### Step 3: Stabilize the two palette-attribute specs
In `tests/e2e/patterns.e2e.test.js`, rewrite "sets light palette attribute" and
"sets dark palette attribute" to drive the palette through the app's own storage
(so the ThemeProvider applies it on reload) instead of racing it:

```js
test('sets light palette attribute', async ({ page }) => {
  await page.goto('/index.html');
  // Persist via the app's own keys, then reload so ThemeProvider applies it.
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('lightPalette', 'nord');
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-light-palette', 'nord');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('sets dark palette attribute', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('darkPalette', 'monokai');
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-dark-palette', 'monokai');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
```
Leave the other tests in this file ("switches between palettes", the CSS-variable
tests) unchanged. If `nord`/`monokai` turn out to be rejected by the palette
validator (the attribute comes back as a different value after reload), STOP and
report — do not guess another palette name.

**Verify**: `CI=1 npx playwright test tests/e2e/patterns.e2e.test.js` → all pass on all 3 browsers (no flaky).

### Step 4 (gate): Full e2e suite green
```
npx playwright install   # browsers (macOS); --with-deps on Linux
CI=1 npm run test:e2e
```
Expected: 0 failed, 0 flaky. If any OTHER spec (not the three you touched) fails,
STOP and report it — do not edit it.

### Step 5: Add the E2E job to CI
Add a SEPARATE `e2e` job after `check` (do not modify `check`):
```yaml
  e2e:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload Playwright report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Step 6: Validate and confirm no regression
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` → exit 0.
- `npm run typecheck && npm run lint && npm test` → all exit 0 (unit suite unaffected).

## Done criteria

ALL must hold:
- [ ] Port is 5173 in `vite.config.ts` + `src-tauri/tauri.conf.json`; no `8080` in the 4 in-scope app/doc files
- [ ] `CI=1 npm run test:e2e` reports 0 failed AND 0 flaky on a clean `npm ci`
- [ ] Only the export test (in `qa-verification.spec.ts`) and the two palette tests (in `patterns.e2e.test.js`) were changed among e2e specs; no app code changed
- [ ] `.github/workflows/ci.yml` has an `e2e` job; the `check` job is unchanged
- [ ] Workflow YAML parses; `npm run typecheck && npm run lint && npm test` exit 0
- [ ] No files outside the in-scope list changed (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions
Stop and report if:
- After Step 2/3, a spec you touched still fails for a reason other than what's
  described here (e.g. the export download produces no JSON, or the palette
  validator rejects `nord`/`monokai`).
- Any spec you did NOT touch fails once the port is aligned — report it as a
  separate finding (potential real regression); do not edit it.
- Moving to 5173 causes an unresolvable port conflict in the clean worktree.

## Maintenance notes
- `qa-verification.spec.ts:22` still hardcodes `BASE = 'http://localhost:5173'`;
  the port is now defined in three places (vite, tauri, playwright/specs). If it
  changes again, update all of them. Deferred: have specs read `baseURL` from the
  Playwright config instead of a hardcoded `BASE`.
- The "switches between palettes" test in `patterns.e2e.test.js` uses the same
  direct-attribute pattern as the two tests fixed here; it passed but is
  theoretically racy. If it later flakes, apply the same localStorage-seed fix.
- If the e2e job is flaky in CI, prefer sharding or `continue-on-error` over
  deletion.
