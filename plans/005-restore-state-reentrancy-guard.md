# Plan 005: Re-arm `isInitializing` in `restoreState` and guard auto-save + orphan sweep

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/stores/promotion-store.ts src/components/promotion/promotion-page-hooks.ts src/components/promotion/VersionHistory.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

`restoreState` (the promotion store's snapshot/import restore) never re-arms
the `isInitializing` flag at entry. `isInitializing` is only true on first
mount (`promotion-store.ts:661`); any later call to `restoreState` — from
Version History snapshot restore or config import — runs with the flag
`false`, so the auto-save debounce stays armed across its awaited IndexedDB
reads. Two race windows result:

1. **Snapshot restore clobber**: `VersionHistory.tsx:177-200` writes snapshot
   JSON to localStorage, then awaits `restoreState()`. A store change during
   that await (e.g. a pending keystroke-save) rewrites old in-memory state
   over the snapshot.
2. **Orphan sweep deletes fresh blobs**: the orphan sweep
   (`promotion-store.ts:1011-1018`) deletes any IndexedDB key not in
   `currentIds`. A PDF attached while the restore loop is still awaiting
   per-PDF `getPDFFromIndexedDB` reads is not yet in `currentIds` and gets
   its blob deleted — the state shows the attachment but the blob is gone
   after refresh (surfacing as `pdfRestoreWarning`).

The fix is one flag set at `restoreState` entry plus a skip in the two
consumers.

## Current state

`src/stores/promotion-store.ts:938` — the function starts without arming the
flag:

```typescript
restoreState: async () => {
  try {
    await initIndexedDB();
    // ... reads recipients, parses localStorage, hydrates PDFs in a loop,
    // ... runs the orphan sweep, then:
    set({
      // ... all restored fields ...
      isInitializing: false,   // line 1074 — the ONLY place the flag is set false
      saveStatus: 'ok',
    });
  } catch (error) {
    console.warn('Failed to load promotion state:', error);
    set({ isInitializing: false, saveStatus: 'ok' });
  }
},
```

The flag is only ever set `true` at store creation (`:661`) and via the
`setInitializing` action (`:790`). Nothing re-arms it before a second
`restoreState` call.

`src/components/promotion/promotion-page-hooks.ts:32-49` — `useAutoSave`
skips while the flag is true:

```typescript
useEffect(() => {
  // Don't auto-save during initialization
  if (store.isInitializing) return;
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }
  timerRef.current = setTimeout(() => {
    store.persistState();
  }, 500);
  return () => { ... };
}, [store]);
```

`src/stores/promotion-store.ts:1011-1018` — the orphan sweep (runs after the
hydration loop, before the final `set`):

```typescript
try {
  const allKeys = await getAllPDFKeysFromIndexedDB();
  const currentIds = new Set((parsed.attachedPDFs || []).map((p) => p.id));
  // deletes every key not in currentIds ...
```

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test -- promotion-store version-history` | all pass |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/stores/promotion-store.ts` — re-arm the flag in `restoreState`; guard
  the orphan sweep
- `src/components/promotion/promotion-page-hooks.ts` — no change expected
  (the existing `isInitializing` check covers it once the flag is re-armed);
  only touch if a test reveals a gap
- Tests: `tests/promotion-store.test.ts` (extend), and a new/updated
  VersionHistory test if one exists (`tests/version-history.test.tsx`)

**Out of scope** (do NOT touch, even though they look related):
- The PDF hydration loop itself — plan 013 parallelizes it; this plan only
  guards the race.
- `src/components/promotion/VersionHistory.tsx` — the snapshot-write-then-
  restore ordering is fine once auto-save is suppressed during restore.
- Any change to the `isInitializing` semantics on first mount.

## Git workflow

- Branch: `advisor/005-restore-state-reentrancy-guard`
- Commit style: conventional commits, e.g.
  `fix(promotion): re-arm isInitializing during restoreState`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Re-arm the flag at `restoreState` entry

At the top of `restoreState` (before `await initIndexedDB()`):

```typescript
restoreState: async () => {
  set({ isInitializing: true });
  try {
    await initIndexedDB();
    ...
```

This suppresses auto-save for the whole restore, exactly like first mount.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Guard the orphan sweep

The orphan sweep should not delete blobs that were attached *during* the
restore's awaited reads. Compute `currentIds` from the metadata *plus* any
PDFs already restored in-memory, or simply skip the sweep when the restore
is being driven by a user action (import/snapshot). The minimal, safe
version: build `currentIds` from `parsed.attachedPDFs` AND the store's
current `attachedPDFs` (which includes any PDFs added while the loop was
awaiting):

```typescript
const currentIds = new Set([
  ...(parsed.attachedPDFs || []).map((p) => p.id),
  ...get().attachedPDFs.map((p) => p.id),
]);
```

(If `get()` is not available in that scope, use the store's existing
pattern — check how other actions read current state inside `restoreState`
and match it.)

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add regression tests

In `tests/promotion-store.test.ts` (or the closest existing store test):

1. Calling `restoreState` sets `isInitializing` to `true` immediately (spy
   on the store's `set` or assert state right after the call starts).
2. While `isInitializing` is true, `persistState` is not scheduled by
   `useAutoSave` (render the hook with `renderHook` from `@testing-library/react`,
   advance fake timers 500ms, assert `persistState` not called).
3. (If feasible) the orphan sweep does not delete a blob whose id is in the
   current in-memory `attachedPDFs` but not in the parsed metadata.

**Verify**: `npm test -- promotion-store version-history` → all pass,
including the new tests.

## Test plan

- New tests in `tests/promotion-store.test.ts` per Step 3.
- Existing store tests must still pass — the flag is now set true at
  restoreState entry, so any test that asserts `isInitializing` state during
  restore needs to account for it (update assertions if they assumed the
  old behavior).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; new tests for the restore guard exist and pass
- [ ] `grep -n "isInitializing: true" src/stores/promotion-store.ts` shows a
      match inside `restoreState` (in addition to `:661`)
- [ ] The orphan sweep's `currentIds` includes the in-memory `attachedPDFs`
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 005 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (drift since `02050dd`).
- `useAutoSave` does not actually read `isInitializing` anymore (the hook
  changed) — report the new mechanism instead of re-adding a check.
- A verification fails twice after a reasonable fix attempt.
- Adding the orphan-sweep guard requires restructuring the restore flow
  beyond the two-line change (report — plan 013 may need to land first).

## Maintenance notes

- Plan 013 (parallel PDF hydration) touches the same `restoreState`; it
  depends on this plan's guard so the parallelized loop is race-free.
- Any future action that calls `restoreState` (e.g. a "revert to last
  snapshot" button) inherits the guard for free.
- The auto-save debounce constant (500ms) is unchanged; only its suppression
  window is fixed.
