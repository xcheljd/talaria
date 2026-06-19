# Plan 008: `db.ts` error/resilience branches (request errors, missing db, orphan keys) are tested, not just the happy path

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c469626..HEAD -- src/lib/db.ts tests/db.test.ts`
> If either changed since this plan was written, compare against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `c469626`, 2026-06-17

## Why this matters

PDFs and bulk-email recipients persist to IndexedDB through `src/lib/db.ts`.
`tests/db.test.ts` covers happy-path CRUD and the "db not initialized" guards,
but the **error branches** — an IndexedDB request firing `onerror`, the
`getAllPDFKeys` path used by orphan cleanup, and rejection propagation — are
unexercised. These are exactly the branches that decide whether the app
silently loses data under storage pressure (and that Plan 005's load-warning
depends on behaving predictably). This plan raises confidence in the persistence
layer without touching production code.

## Current state

- `src/lib/db.ts` (~250 lines) — thin IndexedDB wrappers. Read it in full before
  writing tests. Functions include (confirm exact names/signatures against the
  file): `getDb`/`setDb`, `savePDFToIndexedDB`, `getPDFFromIndexedDB`,
  `deletePDFFromIndexedDB`, `clearAllPDFsFromIndexedDB`, `getAllPDFKeysFromIndexedDB`,
  and the bulk-recipient equivalents. Error handling lives around lines 185-203
  and 244-245 (catch/`onerror` paths).
- `tests/db.test.ts` — existing coverage (read it first; mirror its structure):

  ```ts
  describe('db', () => {
    describe('constants', () => { /* DB name, version, store names */ });
    describe('getDb / setDb', () => { /* null initially, returns set db */ });
    describe('PDF operations', () => {
      it('savePDFToIndexedDB saves and returns id', …)
      it('savePDFToIndexedDB rejects when db is not initialized', …)
      it('getPDFFromIndexedDB returns null when db is not initialized', …)
      it('getPDFFromIndexedDB retrieves saved PDF', …)
      it('deletePDFFromIndexedDB resolves when db is not initialized', …)
      it('clearAllPDFsFromIndexedDB resolves when db is not initialized', …)
    });
    describe('Bulk email operations', () => { /* save/get/clear */ });
  });
  ```

  This file already constructs a working fake/real IndexedDB to drive the happy
  paths — **reuse that exact harness**. Determine from the file whether it uses
  a real in-memory IndexedDB (e.g. `fake-indexeddb`, check `package.json`/imports)
  or hand-rolled request stubs; match it. Do NOT introduce a new mocking
  approach.

## Commands you will need

| Purpose   | Command                               | Expected on success |
|-----------|---------------------------------------|---------------------|
| Install   | `npm ci`                               | exit 0              |
| Typecheck | `npm run typecheck`                    | exit 0              |
| This test | `npx vitest run tests/db.test.ts`      | all pass            |
| All tests | `npm test`                             | all pass            |

## Scope

**In scope**:
- `tests/db.test.ts` — extend with error-branch and orphan-key cases.

**Out of scope** (do NOT touch):
- `src/lib/db.ts` — test-only plan. If a test reveals that an error path is
  actually wrong (e.g. swallows an error that should reject), STOP and report it
  as a finding; do not change source here.

## Git workflow

- Branch: `advisor/008-db-resilience-tests`
- Conventional-commit style (e.g. `test(db): cover IndexedDB error branches`).
- Do NOT push unless instructed.

## Steps

### Step 1: Read and characterize the error branches

Read `src/lib/db.ts` fully. For each write/read helper, identify how it signals
failure: does an `IDBRequest.onerror` reject the returned promise, or resolve a
fallback (`null` / `''` / no-op)? Write down the intended contract per function
— your tests assert the **current** contract (characterization), not a desired
one. (If a contract looks like a bug, that's a STOP/report, not a test that
forces new behavior.)

### Step 2: Add request-error tests

For at least these functions, simulate the underlying IndexedDB request failing
and assert the documented behavior:
- `getPDFFromIndexedDB` — when the `get` request errors, confirm whether it
  rejects or resolves `null` (assert what the code does).
- `savePDFToIndexedDB` — when the `put`/`add` request errors, assert it rejects.
- `deletePDFFromIndexedDB` — when the `delete` request errors, assert behavior.
- The bulk-recipient save/get equivalents — one error case each.

How to force an error depends on the harness from Step 0/1:
- If the suite uses an in-memory IndexedDB, you can force errors by, e.g.,
  closing/deleting the store or spying on the store method to return a request
  whose `onerror` you trigger.
- If it uses hand-rolled request stubs, drive `request.onerror(new Event('error'))`
  with `request.error` set.

Pick the approach the existing tests already use; do not mix both.

### Step 3: Orphan-key path

Add tests for `getAllPDFKeysFromIndexedDB` (used by the store's orphan cleanup at
`promotion-store.ts:902-912`):
- Returns all stored PDF keys when several PDFs are present.
- Returns an empty array when the store is empty.
- Behaves per-contract (reject vs empty) when the `getAllKeys` request errors.

### Step 4: Round-trip integrity (guards silent corruption)

- Save a PDF record with a non-trivial `data` string, read it back, assert the
  `data`, `name`, `size`, and `type` survive unchanged.
- Save bulk recipients (a multi-line string), read back, assert equality.

### Step 5: Full gate

**Verify**: `npx vitest run tests/db.test.ts` → all pass (existing + new), then
`npm run typecheck && npm test` → exit 0.

## Test plan

- Extend `tests/db.test.ts` with: request-error cases per CRUD function,
  `getAllPDFKeys` (happy + empty + error), and round-trip integrity for PDFs and
  bulk recipients.
- Pattern: the existing `describe` blocks in the same file.
- Verification: `npx vitest run tests/db.test.ts` → all pass.

## Done criteria

ALL must hold:
- [ ] `tests/db.test.ts` covers request-error branches for save/get/delete (PDF + bulk)
- [ ] `getAllPDFKeysFromIndexedDB` has happy, empty, and error tests
- [ ] PDF and bulk-recipient round-trip integrity tested
- [ ] `npx vitest run tests/db.test.ts` passes
- [ ] `npm run typecheck && npm test` exit 0
- [ ] `src/lib/db.ts` unchanged (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `db.ts` no longer matches what the existing `tests/db.test.ts` harness assumes
  (drifted), or the harness type (real in-memory vs stubbed) is unclear after
  reading both files.
- An error path turns out to swallow a failure that should propagate (a real
  bug) — report it as a finding; do not change `db.ts`.
- Forcing an IndexedDB request error proves infeasible with the existing harness
  after two reasonable approaches — report the blocker; do not add a new mocking
  library without flagging it.

## Maintenance notes

- These are characterization tests: if `db.ts`'s error contract is intentionally
  changed later, update the assertions deliberately (they should fail loudly
  first).
- Plan 005's PDF-restore warning relies on `getPDFFromIndexedDB` rejecting (not
  silently resolving data) on failure — keep that contract test green.
- Reviewer should confirm no test depends on real disk/browser IndexedDB timing
  (no real timers / network), keeping the suite deterministic.
