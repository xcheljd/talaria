# Plan 012: Per-row Zustand subscriptions + `memo` in the three list editors

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/components/promotion/DiscountEntriesEditor.tsx src/components/promotion/SpecialHoursEditor.tsx src/components/promotion/FormattableItemEditor.tsx src/components/promotion/SortableItem.tsx src/components/promotion/PromotionCards.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

All three list editors subscribe every row to the *entire* list slice. One
keystroke in entry N of a 20-entry promotion causes 20 row re-renders, each
re-running `useSortable`/dnd-kit context registration (`SortableItem.tsx:36-46`),
3 controlled inputs and ~7 buttons. This is O(n) row renders per keystroke
on the app's most-used editing surface. The rest of the codebase carefully
avoids this (see the boolean-gated `PromotionCard` at
`PromotionCards.tsx:389`) — these three editors are the exception.

## Current state

`src/components/promotion/DiscountEntriesEditor.tsx:39-49` — the shared
slice returns the whole array:

```typescript
const selectEntryState = (s: PromotionState) => ({
  promotionEntries: s.promotionEntries,
  entryCollapsedStates: s.entryCollapsedStates,
  addPromotionEntry: s.addPromotionEntry,
  ...
});
```

`EntryItem` (line 60-61) subscribes with `useShallow(selectEntryState)` — so
every row re-renders when the array identity changes (any edit). Rows are
mapped at 278-286 with no `memo` on `EntryItem`.

Identical pattern in:
- `src/components/promotion/SpecialHoursEditor.tsx:36-44,55` — `selectHoursState`, every `HourRow` subscribes
- `src/components/promotion/FormattableItemEditor.tsx:263-272` — unmemoized `ItemRow`s; the `actions` object recreated inline at `PromotionCards.tsx:213-221` defeats `ItemRow`'s `useCallback`

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test -- promotion discount-entries special-hours formattable sortable` | all pass |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/components/promotion/DiscountEntriesEditor.tsx`
- `src/components/promotion/SpecialHoursEditor.tsx`
- `src/components/promotion/FormattableItemEditor.tsx`
- `src/components/promotion/SortableItem.tsx` (only if a `memo` wrapper is
  needed there rather than at the row component)
- Tests: extend the relevant editor test files (search `tests/` for
  `discount-entries`, `special-hours`, `formattable`)

**Out of scope** (do NOT touch, even though they look related):
- The Zustand store itself (`promotion-store.ts`) — no state-shape changes.
- dnd-kit context setup — reordering behavior must stay identical.
- The promotion card list (`PromotionCards.tsx`) — already gated correctly;
  only the `actions` object recreation at 213-221 is in scope if it defeats
  the memoization in `FormattableItemEditor`.

## Git workflow

- Branch: `advisor/012-per-row-store-subscriptions`
- Commit style: conventional commits, e.g.
  `perf(promotion): subscribe each row to its own store slice`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: DiscountEntriesEditor — per-row selector + memo

In `DiscountEntriesEditor.tsx`:

1. Add `memo` to `EntryItem` (wrap the export/definition:
   `const EntryItem = memo(function EntryItem(...) { ... })`).
2. Change `EntryItem`'s subscription from `selectEntryState` (whole array)
   to a per-row selector keyed on `entry.id`:

```typescript
const useEntrySlice = (id: number) =>
  usePromotionStore(
    useShallow((s) => ({
      entry: s.promotionEntries.find((e) => e.id === id),
      collapsed: !!s.entryCollapsedStates[id],
      updatePromotionEntry: s.updatePromotionEntry,
      removePromotionEntry: s.removePromotionEntry,
      movePromotionEntryUp: s.movePromotionEntryUp,
      movePromotionEntryDown: s.movePromotionEntryDown,
      toggleEntryCollapse: s.toggleEntryCollapse,
    }))
  );
```

The actions are stable references, so `useShallow` keeps the slice identity
stable across unrelated edits; the `entry` object only changes when that
specific row changes. Keep `EntryItem`'s props (`entry`, `index`, `total`,
`isCollapsed`) or read them from the slice — pick one source of truth and
keep the `DndContext`/`SortableContext` mapping (278-286) passing `entry.id`
and `index` for dnd-kit.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: SpecialHoursEditor — same pattern

Apply the same per-row selector + `memo` to `HourRow` in
`SpecialHoursEditor.tsx` (select by `s.specialHours.find((h) => h.id === id)`
plus the row's actions).

**Verify**: `npm run typecheck` → exit 0.

### Step 3: FormattableItemEditor — same pattern + fix actions identity

Apply the same per-row selector + `memo` to `ItemRow` in
`FormattableItemEditor.tsx`. Check `PromotionCards.tsx:213-221` — if it
builds an `actions` object inline each render that is passed down to
`ItemRow`, hoist it (memoize with `useMemo` keyed on stable action
references, or read actions from the store directly inside `ItemRow`) so the
`memo` wrapper actually works.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Add a render-count regression test

For at least one editor, add a test asserting that editing one row does not
re-render a sibling row. Approach: render the editor with two entries, spy
on one row's render (e.g. a `data-testid` on the row with a counter in the
component body, or `vi.spyOn` on the row component), update entry A's text
via the store, and assert entry B's render count is unchanged.

If a straightforward render-count test is impractical with the existing
test setup, assert instead that the row component is `memo`-wrapped
(`React.memo` check) AND that the slice selector returns a stable identity
for unrelated edits (unit-test the selector function directly).

**Verify**: `npm test -- <the editor's test file>` → all pass, including the
new test.

## Test plan

- New render-isolation test per Step 4 for at least one editor.
- Existing editor tests must still pass — the visible behavior is
  unchanged; only render scheduling differs.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; the new render-isolation test exists and passes
- [ ] `grep -n "memo(" src/components/promotion/DiscountEntriesEditor.tsx src/components/promotion/SpecialHoursEditor.tsx src/components/promotion/FormattableItemEditor.tsx` shows a match in each
- [ ] No row subscribes to `s.promotionEntries` / `s.specialHours` /
      `s.formattableItems` (the whole array) anymore — grep for
      `promotionEntries: s.promotionEntries` and confirm only the list
      container (not rows) uses it
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 012 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- dnd-kit reordering breaks under per-row memoization (drag state lives in
  context, but if a row's `index` prop is stale under `memo`, reordering
  misbehaves) — report the failure mode rather than removing `memo`
  wholesale.
- A row component needs props that change on every list render (e.g.
  `total` or `index`) — those are fine as props to a `memo` component only
  if they change when they should; if `total` changing on unrelated edits
  defeats the memo, derive it inside the slice or accept the re-render for
  that specific prop.
- A verification fails twice after a reasonable fix attempt.
- The store's action functions are not referentially stable (recreated per
  `set`) — verify with a quick test; if unstable, that's a store-level issue
  to report.

## Maintenance notes

- When a new list editor is added (e.g. a fourth formattable list), copy the
  per-row selector pattern — the container subscribes to the array, rows
  subscribe to their own item.
- Plan 022 (store slice) will move these selectors with their domains; the
  per-row pattern survives the move.
- The render-isolation test is the guard against a future refactor
  re-broadening the row subscriptions.
