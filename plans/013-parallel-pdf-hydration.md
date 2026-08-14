# Plan 013: Parallelize PDF hydration and orphan sweep in `restoreState`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/stores/promotion-store.ts`
> If the in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition. **This plan depends on plan 005
> being DONE** — verify `plans/README.md` shows 005 DONE before starting; if
> not, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW-MED
- **Depends on**: plans/005-restore-state-reentrancy-guard.md
- **Category**: perf
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

`restoreState` hydrates attached PDFs one at a time with an awaited
per-PDF IndexedDB read loop, then runs the orphan sweep serially. Startup
time is the **sum** of per-PDF reads (each a multi-MB base64 string decode
in jsdom/WebKit) instead of the **max**. A promotion with several multi-MB
flyers makes every app launch pay the full serial cost, and the preview/PDF
card stays empty until the whole loop finishes.

## Current state

`src/stores/promotion-store.ts:966-1021` — serial hydration + orphan sweep:

```typescript
// Restore PDFs: prefer IndexedDB data, fallback to legacy localStorage data
const restoredPDFs: AttachedPDF[] = [];
for (const metadata of parsed.attachedPDFs || []) {
  try {
    const fullPdfData: PDFRecord | null = await getPDFFromIndexedDB(metadata.id);
    if (fullPdfData && fullPdfData.data) {
      restoredPDFs.push({ id: metadata.id, name: metadata.name, size: metadata.size, type: metadata.type, data: fullPdfData.data });
      continue;
    }
  } catch {
    // IndexedDB read failed, try legacy fallback
  }
  // Legacy fallback: if localStorage had data (old format)
  if (metadata.data) {
    restoredPDFs.push({ id: metadata.id, name: metadata.name, size: metadata.size, type: metadata.type, data: metadata.data });
  }
  // If no IndexedDB data and no legacy data, omit the PDF
}

const expectedCount = parsed.attachedPDFs?.length ?? 0;
const pdfRestoreWarning = restoredPDFs.length < expectedCount;
...
// Orphan cleanup: remove IndexedDB blobs no longer referenced by the restored metadata.
try {
  const allKeys = await getAllPDFKeysFromIndexedDB();
  const currentIds = new Set((parsed.attachedPDFs || []).map((p) => p.id));
  // ... deletes every key not in currentIds
```

Plan 005 (DONE prerequisite) already added the `isInitializing` re-arm at
entry and hardened `currentIds` — this plan builds on that.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test -- promotion-store` | all pass            |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/stores/promotion-store.ts` — the hydration loop and orphan sweep
- Tests: `tests/promotion-store.test.ts` (or the closest existing store
  test)

**Out of scope** (do NOT touch, even though they look related):
- The `isInitializing` guard from plan 005 — already landed; don't rework it.
- The IndexedDB wrapper (`src/lib/db.ts`) — the `getPDFFromIndexedDB` /
  `getAllPDFKeysFromIndexedDB` / `deletePDFFromIndexedDB` functions stay
  as-is.
- The order of `restoredPDFs` — it must remain the same as the serial
  version (IndexedDB-first, legacy-fallback per item, omit when neither).

## Git workflow

- Branch: `advisor/013-parallel-pdf-hydration`
- Commit style: conventional commits, e.g.
  `perf(promotion): hydrate PDFs in parallel during restore`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Parallelize the hydration loop

Replace the serial `for` loop with `Promise.allSettled` (allSettled so one
failing blob can't abort the rest):

```typescript
const restoredPDFs: AttachedPDF[] = [];
const results = await Promise.allSettled(
  (parsed.attachedPDFs || []).map(async (metadata) => {
    try {
      const fullPdfData: PDFRecord | null = await getPDFFromIndexedDB(metadata.id);
      if (fullPdfData && fullPdfData.data) {
        return { id: metadata.id, name: metadata.name, size: metadata.size, type: metadata.type, data: fullPdfData.data };
      }
    } catch {
      // IndexedDB read failed, try legacy fallback
    }
    if (metadata.data) {
      return { id: metadata.id, name: metadata.name, size: metadata.size, type: metadata.type, data: metadata.data };
    }
    return null; // no IndexedDB data and no legacy data — omit
  })
);

for (const result of results) {
  if (result.status === 'fulfilled' && result.value) {
    restoredPDFs.push(result.value);
  }
}
```

This preserves per-item ordering (the `results` array is in input order),
the IndexedDB-first/legacy-fallback logic per item, and the omit-when-empty
behavior.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Parallelize the orphan-sweep deletes

After the sweep's `allKeys` read, issue the deletes in parallel:

```typescript
const toDelete = allKeys.filter((k) => !currentIds.has(k));
await Promise.allSettled(toDelete.map((k) => deletePDFFromIndexedDB(k)));
```

(`currentIds` here is the plan-005-hardened set that includes in-memory
`attachedPDFs`.) Preserve any logging per-delete if the current code logs
deletions.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add/adjust tests

In `tests/promotion-store.test.ts`:

1. Restore with multiple PDFs still returns all of them, in the same order,
   with IndexedDB data preferred over legacy fallback (existing test — must
   still pass unchanged).
2. Restore where one PDF's IndexedDB read rejects — the others still
   restore (allSettled behavior).
3. Orphan sweep still deletes only unreferenced keys (existing test — must
   still pass).

If mocking `getPDFFromIndexedDB` per-call is needed, follow the existing
mock pattern in the test file.

**Verify**: `npm test -- promotion-store` → all pass, including any new
tests.

## Test plan

- Existing store tests are the primary gate (order + fallback semantics).
- New test for the single-failure-doesn't-abort case (allSettled).
- The orphan-sweep behavior test (if one exists) must still pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test -- promotion-store` exits 0
- [ ] `grep -n "Promise.allSettled" src/stores/promotion-store.ts` shows it
      in the hydration path
- [ ] The hydration loop no longer contains an `await` inside a serial
      `for` (grep the old `for (const metadata of parsed.attachedPDFs` — it
      should be gone or converted)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 013 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 005 is not DONE (the re-entrancy guard must be in place first).
- The per-item fallback semantics (IndexedDB-first, legacy-fallback) are not
  preserved by the parallel version — restore the serial behavior and report.
- A verification fails twice after a reasonable fix attempt.
- IndexedDB has a concurrency limit that makes parallel reads worse (verify
  empirically if you can; if you cannot verify, note it in the report and
  keep the parallel version only if tests pass).

## Maintenance notes

- The parallel version is bounded by the max per-PDF read time instead of
  the sum — the win scales with PDF count/size.
- If a future change adds per-PDF processing that depends on order (e.g.
  sequential IDs), the `results` array preserves input order, so the mapping
  stays correct.
- Plan 005's orphan-sweep hardening (in-memory `attachedPDFs` in
  `currentIds`) must remain intact — the parallel delete uses the same set.
