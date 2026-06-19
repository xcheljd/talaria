# Plan 005: A failed PDF restore on load surfaces a warning instead of silently dropping attachments

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c469626..HEAD -- src/stores/promotion-store.ts src/components/promotion/promotion-page-hooks.ts`
> If either changed since this plan was written, compare against the "Current
> state" excerpts before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (correctness)
- **Planned at**: commit `c469626`, 2026-06-17

## Why this matters

On load, the promotion store rehydrates each attached PDF from IndexedDB. If an
individual read **throws** (transient IndexedDB failure, corruption) and there is
no legacy localStorage copy, the PDF is **silently omitted** — the user opens the
app and their attachment is simply gone, with no explanation. The save path
already has a global warning toast for this class of problem
(`useSaveStatusToast` → "Auto-save failed…"); the **load** path has nothing.
This plan makes load-time partial failures observable, mirroring the existing
save-warning pattern.

## Current state

`src/stores/promotion-store.ts` — the restore loop inside the load action
(`loadFromIndexedDB`), around lines 866-898:

```ts
const restoredPDFs: AttachedPDF[] = [];
for (const metadata of parsed.attachedPDFs || []) {
  // Try IndexedDB first
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
  // If no IndexedDB data and no legacy data, omit the PDF   <-- silent loss
}
```

Key facts the executor needs:
- `parsed.attachedPDFs` is the list of PDF **metadata** that was persisted; its
  length is the number the user expects to see restored.
- `restoredPDFs` is what actually comes back. When
  `restoredPDFs.length < (parsed.attachedPDFs?.length ?? 0)`, at least one
  attachment was dropped.
- The store already has a `saveStatus` field with values `'ok' | 'warning'`
  used by the save path. **Do not overload `saveStatus`** for load failures —
  they are a different condition and would confuse the existing save toast.
  Introduce a distinct flag.

Existing global-toast pattern to mirror — `src/components/promotion/promotion-page-hooks.ts:58-74`:

```ts
export function useSaveStatusToast() {
  const saveStatus = usePromotionStore((s) => s.saveStatus);
  const prev = useRef(saveStatus);
  useEffect(() => {
    if (prev.current !== 'warning' && saveStatus === 'warning') {
      toast.warning('Auto-save failed — …', { id: 'promo-save-warning', duration: Infinity });
    } else if (prev.current === 'warning' && saveStatus === 'ok') {
      toast.dismiss('promo-save-warning');
      toast.success('Auto-save recovered');
    }
    prev.current = saveStatus;
  }, [saveStatus]);
}
```

Both `useSaveStatusToast` and `useAutoSave` are mounted by `PromotionPage`
(verify with `grep -n "useSaveStatusToast\|useAutoSave" src/pages/PromotionPage.tsx`)
— the new hook will be mounted the same way.

Store conventions: state fields + actions defined in the `create(...)` body of
`promotion-store.ts`; new persisted fields are added to the auto-save selector
in `promotion-page-hooks.ts` (this flag is **not** persisted — see Step 1).
Tests live in `tests/`; `tests/promotion-store.test.ts` is the model for store
tests.

## Commands you will need

| Purpose   | Command                                          | Expected on success |
|-----------|--------------------------------------------------|---------------------|
| Install   | `npm ci`                                          | exit 0              |
| Typecheck | `npm run typecheck`                               | exit 0              |
| Store test| `npx vitest run tests/promotion-store.test.ts`    | all pass            |
| All tests | `npm test`                                        | all pass            |

## Scope

**In scope**:
- `src/stores/promotion-store.ts` — add a `pdfRestoreWarning` flag + set it in
  the load loop; add a way to clear it.
- `src/components/promotion/promotion-page-hooks.ts` — add `usePdfRestoreToast`
  hook (mirrors `useSaveStatusToast`).
- `src/pages/PromotionPage.tsx` — mount the new hook.
- `tests/promotion-store.test.ts` — add coverage for the flag.

**Out of scope** (do NOT touch):
- The IndexedDB wrappers in `src/lib/db.ts` — do not change read behavior.
- The orphan-cleanup `try/catch` at `promotion-store.ts:902-912` — leave it;
  best-effort cleanup failing is not user-facing data loss.
- The save path / `saveStatus` — do not reuse it for this.

## Git workflow

- Branch: `advisor/005-pdf-hydration-warning`
- Conventional-commit style (e.g. `fix(promotion): warn when a PDF fails to restore`).
- Do NOT push unless instructed.

## Steps

### Step 1: Add a non-persisted `pdfRestoreWarning` flag to the store

In `promotion-store.ts`:
- Add to the state type/interface: `pdfRestoreWarning: boolean` (initial `false`).
- Add an action `clearPdfRestoreWarning: () => void` that sets it back to `false`.
- This flag is **transient UI state**, like `isInitializing`. Do **not** add it
  to `persistData` / the persisted-state type, and do **not** add it to the
  auto-save selector in `promotion-page-hooks.ts` (`useAutoSave`). Confirm it is
  absent from whatever object is JSON-stringified for `localStorage`.

### Step 2: Set the flag when restore drops attachments

In the load loop region (lines 866-898), after the loop completes and before the
store is populated, compute whether any expected PDF is missing and set the flag:

```ts
const expectedCount = parsed.attachedPDFs?.length ?? 0;
const pdfRestoreWarning = restoredPDFs.length < expectedCount;
```

Include `pdfRestoreWarning` in the `set({ ... })` call that finalizes the load
(the same `set` that assigns `attachedPDFs: restoredPDFs` and clears
`isInitializing`). Add a `console.warn` when it is true, naming the count, e.g.
`console.warn(`PDF restore: ${expectedCount - restoredPDFs.length} of ${expectedCount} attachment(s) could not be restored`);`.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add the load-warning toast hook

In `promotion-page-hooks.ts`, add (mirroring `useSaveStatusToast`):

```ts
/**
 * One-time warning when PDF attachments couldn't be restored on load. Mirrors
 * the save-failure toast, but for the rehydration path: a user whose PDF card is
 * collapsed would otherwise never know an attachment silently vanished.
 */
export function usePdfRestoreToast() {
  const pdfRestoreWarning = usePromotionStore((s) => s.pdfRestoreWarning);
  const clear = usePromotionStore((s) => s.clearPdfRestoreWarning);
  useEffect(() => {
    if (pdfRestoreWarning) {
      toast.warning(
        'Some PDF attachments could not be restored from storage. Re-attach them if needed.',
        { id: 'promo-pdf-restore-warning', duration: Infinity }
      );
      clear();
    }
  }, [pdfRestoreWarning, clear]);
}
```

### Step 4: Mount the hook

In `src/pages/PromotionPage.tsx`, call `usePdfRestoreToast()` next to the
existing `useSaveStatusToast()` / `useAutoSave()` calls.

**Verify**: `npm run typecheck && npm run lint` → exit 0.

### Step 5: Tests

In `tests/promotion-store.test.ts`, add cases (model existing tests there;
they already mock `@/lib/db` — reuse that mock):
1. When `getPDFFromIndexedDB` resolves data for all metadata, after load
   `pdfRestoreWarning === false` and `attachedPDFs.length` equals the metadata count.
2. When `getPDFFromIndexedDB` **rejects** (or resolves `null`) for one of two
   PDFs that have no legacy `data`, after load `pdfRestoreWarning === true` and
   `attachedPDFs.length === 1`.
3. `clearPdfRestoreWarning()` sets the flag back to `false`.
4. The legacy fallback still works: a metadata entry with inline `data` and a
   failing IndexedDB read is restored and does **not** trip the warning.

**Verify**: `npx vitest run tests/promotion-store.test.ts` → all pass.

### Step 6: Full gate

**Verify**: `npm run typecheck && npm run lint && npm test` → all exit 0.

## Test plan

- New cases in `tests/promotion-store.test.ts` (the 4 above), reusing that
  file's existing `vi.mock('@/lib/db', …)` setup.
- Verification: `npx vitest run tests/promotion-store.test.ts` → all pass.

## Done criteria

ALL must hold:
- [ ] `pdfRestoreWarning` state + `clearPdfRestoreWarning` action exist and the flag is NOT persisted to localStorage
- [ ] The load loop sets the flag when `restoredPDFs.length < expected` and logs a `console.warn`
- [ ] `usePdfRestoreToast` is defined and mounted in `PromotionPage`
- [ ] `npx vitest run tests/promotion-store.test.ts` passes the 4 new cases
- [ ] `npm run typecheck && npm run lint && npm test` all exit 0
- [ ] No out-of-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- The load loop in `promotion-store.ts` no longer matches the "Current state"
  excerpt (drifted).
- You cannot add the flag without it ending up in the persisted state — report
  rather than persisting it (a persisted warning flag would re-fire forever).
- Adding the toast hook makes an existing `PromotionPage` test fail in a way that
  isn't a trivial mock addition — report it.

## Maintenance notes

- If PDF storage migrates off IndexedDB, revisit where the restore can fail and
  keep this warning wired to the real failure point.
- The toast fires once per load (cleared immediately). If product wants a
  persistent in-card badge as well, the PDF card already renders a `saveStatus`
  badge (`PDFAttachments.tsx:270-278`) and could render a restore badge the same way.
- Reviewer should confirm the flag is transient (not persisted) and that the
  legacy-localStorage fallback path is unaffected.
