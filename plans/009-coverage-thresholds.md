# Plan 009: Enforce coverage thresholds and run coverage in CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- vitest.config.js .github/workflows/ci.yml`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

Coverage is configured but never enforced: `vitest.config.js` declares the
v8 provider and reporters but **no thresholds**, and CI (`ci.yml:33-34`)
runs only `npm run test` — coverage never runs in the pipeline. The
`test:coverage` script is a local-only advisory number. Coverage can
silently regress (e.g. the lazy-loaded TipTap path, new store branches) with
CI staying green. This is the playbook's #1 verification prerequisite: a
one-command gate that fails on regression.

## Current state

`vitest.config.js:16-20`:

```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', 'tests/e2e/', 'dist/', '**/*.test.js'],
},
```

`ci.yml:33-34` (check job):

```yaml
- name: Unit tests
  run: npm run test
```

The suite currently has ~1,047 passing tests across 40+ suites.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Measure   | `npm run test:coverage`       | prints coverage table |
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `vitest.config.js` — add `thresholds`
- `.github/workflows/ci.yml` — run coverage in the check job (as a separate
  step, or replace the unit-test step with `npm run test:coverage`)
- No source code changes expected.

**Out of scope** (do NOT touch, even though they look related):
- The coverage `exclude` list — if you need to raise coverage by excluding
  more, STOP and report instead (excluding code to pass a gate is the
  anti-pattern this plan exists to prevent).
- Any test changes to raise coverage — the threshold is set to *current*
  measured values; raising it is a follow-up.
- The e2e job — coverage is unit-test-scoped.

## Git workflow

- Branch: `advisor/009-coverage-thresholds`
- Commit style: conventional commits, e.g.
  `test(ci): enforce coverage thresholds and run coverage in CI`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Measure current coverage

Run `npm run test:coverage`. Record the four numbers (lines, functions,
branches, statements). Note that `v8` coverage with jsdom can be noisy on
branches — the branch number may be notably lower than the others; that is
expected.

**Verify**: command exits 0 and prints the table.

### Step 2: Add thresholds

In `vitest.config.js`, add a `thresholds` block inside `coverage`. Set each
metric to the measured value from Step 1 (rounded down a couple points to
avoid flaky failure on minor variance, but no more than 5 points below
measured). Example shape (fill in the measured numbers):

```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['node_modules/', 'tests/e2e/', 'dist/', '**/*.test.js'],
  thresholds: {
    lines: <measured-2>,
    functions: <measured-2>,
    branches: <measured-2>,
    statements: <measured-2>,
  },
},
```

**Verify**: `npm run test:coverage` → exit 0, and the table shows all
metrics above the thresholds. If a threshold is *above* the measured value
by mistake, the run fails — that's the gate working.

### Step 3: Run coverage in CI

In `.github/workflows/ci.yml`, change the unit-tests step to run coverage:

```yaml
- name: Unit tests with coverage
  run: npm run test:coverage
```

This makes the threshold a CI gate (coverage fails the job). The
`json`/`html` reporters are harmless in CI; if you want to avoid artifacts,
switch reporters to `['text']` only when running in CI — but simplest is to
leave the reporters as-is.

**Verify**: `npm run test:coverage` exits 0 locally with the new config.

## Test plan

- No new tests — this plan changes the gate, not the suite.
- The suite's existing tests are the subject of the gate.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run test:coverage` exits 0 with thresholds in place
- [ ] `grep -n "thresholds" vitest.config.js` shows the block
- [ ] `grep -n "test:coverage" .github/workflows/ci.yml` shows coverage runs
      in CI
- [ ] `npm run typecheck` exits 0 (no config breakage)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 009 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Measured coverage is below ~50% on lines/statements — the suite may be
  misconfigured (e.g. jsdom not instrumenting the right files); report the
  numbers before setting thresholds.
- Adding thresholds requires raising coverage by excluding more files —
  report the temptation; the plan sets thresholds to measured, not to a
  target.
- A verification fails twice after a reasonable fix attempt.
- CI has a separate coverage mechanism you discover (e.g. a codecov step in
  another workflow) — report it instead of duplicating.

## Maintenance notes

- Thresholds are set to current measured values minus a small buffer. When
  coverage later rises (e.g. plans 010/011 add tests), raise the thresholds
  in the same PR that adds the tests — keep the gate meaningful.
- The branch metric will likely be the tightest; expect it to drive most
  future coverage work.
- `npm run test:coverage` is slower than `npm test` (v8 instrumentation);
  CI time cost is acceptable for the gate it provides.
