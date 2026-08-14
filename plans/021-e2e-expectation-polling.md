# Plan 021: Replace E2E fixed sleeps with expectation polling; make webServer unconditional

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- tests/e2e/qa-verification.spec.ts playwright.config.js`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

The E2E suite costs ~60 seconds of fixed sleeps per browser project — 79
`waitForTimeout` calls totaling 60.3s, ×3 browsers ≈ 3 minutes of pure
sleeping per CI run. Fixed sleeps race the 5-min snapshot interval and the
debounced auto-save (e.g. the "snapshot summary reflects just-typed edit"
test), so they flake on slow runners. Separately, `playwright.config.js`
starts the dev server **only when `CI` is set**, so local
`npm run test:e2e` silently depends on a manually started `npm run dev`
(with `reuseExistingServer: true` and no fallback error) — a confusing
first-run DX. 30 tests across 3 projects is the entire e2e surface; its
flakiness risk is concentrated.

## Current state

`playwright.config.js:31-38`:

```javascript
webServer: process.env.CI
  ? {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  : undefined,
```

`tests/e2e/qa-verification.spec.ts` — 79 `waitForTimeout` calls totaling
~60.3s (computed). The suite is QA-checklist-style: it navigates the app,
types edits, checks previews, snapshots, and exports.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| E2E local | `npm run test:e2e`            | passes (with webServer running) |
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Lint      | `npm run lint`                | exit 0              |

> Note: e2e may take several minutes and needs the dev server; if your
> environment can't run a full 3-browser pass, run with a single project:
> `npx playwright test --project=chromium`.

## Scope

**In scope** (the only files you should modify):
- `tests/e2e/qa-verification.spec.ts` — replace `waitForTimeout` with
  expectation-based polling
- `playwright.config.js` — make `webServer` unconditional (always start the
  dev server; keep `reuseExistingServer: true` so a manually running server
  is reused)

**Out of scope** (do NOT touch, even though they look related):
- The test scenarios themselves — only the timing mechanism changes.
- The dev server config (`vite.config.ts`) — the webServer command stays
  `npm run dev`.
- CI caching (plan 020 owns that) — but this plan's changes make the e2e
  job faster and less flaky too.

## Git workflow

- Branch: `advisor/021-e2e-expectation-polling`
- Commit style: conventional commits, e.g.
  `test(e2e): replace fixed sleeps with expectation polling`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Inventory the sleeps

Grep `tests/e2e/qa-verification.spec.ts` for every `waitForTimeout`. Group
them by what they're waiting for: a visible element, a state change, a
toast, an IndexedDB round-trip, the debounced auto-save, a snapshot
refresh.

**Verify**: each sleep maps to a wait condition you can express as a
Playwright expectation or `page.waitForSelector`/`waitForFunction`.

### Step 2: Replace sleeps with expectation polling

For each sleep, replace with the appropriate auto-waiting assertion:

- Visible UI: `await expect(page.getByText('...')).toBeVisible()`
- Input value: `await expect(page.getByLabel('...')).toHaveValue('...')`
- Disabled/enabled: `toBeEnabled()` / `toBeDisabled()`
- State not directly assertable (e.g. debounce settling): use
  `await expect.poll(() => page.getByTestId('save-status').textContent()).toBe('Saved')`
  or `page.waitForFunction` on the underlying store/state — prefer
  `expect.poll` for user-visible state.
- IndexedDB round-trips that surface as UI (e.g. PDF restore): wait for the
  resulting UI state, not a fixed time.

Where a sleep guards a genuinely async operation with no observable
state, keep a **bounded** wait (`page.waitForTimeout`) but only after
trying `expect` polling first, and add a comment explaining what it's
waiting for. The goal is to eliminate the 60s of *fixed* waits, not to
forbid waits entirely.

**Verify**: `grep -c "waitForTimeout" tests/e2e/qa-verification.spec.ts`
drops substantially (target: only the documented bounded waits remain,
ideally zero).

### Step 3: Make webServer unconditional

In `playwright.config.js`, replace the conditional with:

```javascript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: true,
  timeout: 120000,
},
```

`reuseExistingServer: true` means a locally running `npm run dev` is reused
(no conflict), and without one, Playwright starts it. This makes
`npm run test:e2e` a one-command local experience and keeps CI behavior
(CI doesn't have a server running, so Playwright starts one).

**Verify**: `grep -n "webServer" playwright.config.js` shows the
unconditional block.

### Step 4: Run the suite (at least chromium)

Run `npx playwright test --project=chromium` (or full `npm run test:e2e` if
the environment allows). Fix any failures caused by the timing changes —
an assertion that now polls should be *more* stable, but if a poll
condition is wrong (the UI never reaches the asserted state), the test was
previously passing only because the sleep duration was lucky; investigate
and report rather than re-adding sleeps.

**Verify**: the chromium project passes. If all three projects can run,
run the full suite.

## Test plan

- The e2e suite itself is the test — the change is to how it waits.
- Run at least the chromium project locally; CI runs all three.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -c "waitForTimeout" tests/e2e/qa-verification.spec.ts` shows a
      substantial reduction (target 0, or only commented bounded waits)
- [ ] `grep -n "webServer" playwright.config.js` shows the unconditional
      block (no `process.env.CI ?` conditional)
- [ ] `npx playwright test --project=chromium` passes locally
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 021 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- A sleep guards something with genuinely no observable state (e.g. waiting
  out a toast animation) — keep a bounded wait with a comment, and report
  it in your summary.
- Replacing a sleep exposes a real bug (the test was passing by luck) —
  report the bug; do NOT re-add the sleep to hide it.
- A verification fails twice after a reasonable fix attempt.
- The full 3-browser suite can't run in your environment — report what ran
  (chromium only) and what's unverified.

## Maintenance notes

- The QA-checklist style of this suite makes it the app's regression
  surface; expectation polling makes it flake-resistant, which matters as
  the suite grows.
- `reuseExistingServer: true` is the standard Playwright pattern for local
  DX; keep it — a developer's own dev server is never clobbered.
- If the suite grows past ~30 tests, consider splitting projects or
  sharding in CI (out of scope here).
