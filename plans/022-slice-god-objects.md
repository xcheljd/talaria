# Plan 022: Slice the god objects (store domains, ProfileSettingsPage sections)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/stores/promotion-store.ts src/pages/ProfileSettingsPage.tsx src/lib/promotion-config-schema.ts src/lib/promotion-config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition. **This plan depends on plans
> 005, 009, and 011 being DONE** — verify `plans/README.md` before starting;
> if any is not DONE, STOP.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: plans/005-restore-state-reentrancy-guard.md, plans/009-coverage-thresholds.md, plans/011-tiptap-conversion-characterization.md
- **Category**: tech-debt
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

Two files dominate the codebase:

1. **`src/stores/promotion-store.ts`** — 1094 lines, ~45 state fields and
   30+ actions spanning five domains (promotion list editors, special
   hours, how-to-shop/important-notes, PDFs + IndexedDB orchestration,
   subject lines, newsletter, bulk-email status, save-status). AGENTS.md
   blesses the pattern ("add the field to promotion-store.ts"), so every
   new promotion feature pays a change-tax across three sections
   (state+action+persistence) in one file, and merge conflicts concentrate
   there.
2. **`src/pages/ProfileSettingsPage.tsx`** — 1363 lines, a single component
   (line 123 → EOF) mixing profile form, keywords, preferences,
   download-folder, and dev-mode surfaces — hard to test in isolation and
   slow to navigate.

The audit's verdict is measured: the store is *organized* (section
comments, deliberate pattern) but the domain sprawl and size are real. The
cleanly separable slices are **newsletter** and **bulk-email**; the rest are
tightly coupled to `persistData`.

## Current state

`src/stores/promotion-store.ts`:
- ~310-line Helpers section (lines 338-650)
- ~440-line store impl (653-1094)
- `persistData`/auto-save interlock means every persisted field touches
  three sections

`src/pages/ProfileSettingsPage.tsx`:
- 1363 lines, single component from line 123 to EOF
- Sections: profile form, brand/keywords, preferences, download folder,
  dev-mode toggle

Repo median for src files is ~250 lines.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |
| Coverage  | `npm run test:coverage`       | exit 0, above thresholds (plan 009 gate) |

## Scope

**In scope** (the only files you should modify):
- `src/stores/promotion-store.ts` — extract newsletter + bulk-email slices
  into separate Zustand stores
- `src/pages/ProfileSettingsPage.tsx` — split into per-section components
- New files: `src/stores/newsletter-store.ts`, `src/stores/bulk-email-store.ts`,
  `src/components/profile/*` (section components)
- `src/lib/promotion-config-schema.ts` / `src/lib/promotion-config.ts` —
  only if the export/import round-trip must read the new stores
- `AGENTS.md` — update the "add a field" guidance for the new structure
- Tests: characterization tests on `persistData` round-trips FIRST (see
  dependency on plan 009's gate), then move/extend tests for the slices

**Out of scope** (do NOT touch, even though they look related):
- The other store domains (promotion entries, special hours, PDFs) — they
  are tightly coupled to `persistData`; slicing them is a future plan.
- The promotion-email-html generator — plan 011's characterization tests
  pin it; do not refactor it here.
- The UI components under `src/components/promotion/*` — except where they
  import from the new stores instead of the old slice.

## Git workflow

- Branch: `advisor/022-slice-god-objects`
- Commit style: conventional commits per step, e.g.
  `refactor(promotion): extract newsletter state into its own store`
- Do NOT push or open a PR unless the operator instructed it.
- **Land this in reviewable chunks** — the store slice and the page split
  are independent; two PRs are better than one giant diff.

## Steps

### Step 1: Characterization tests on the persistence wiring (before ANY move)

Before moving anything, write tests that pin `persistData` round-trips for
the newsletter and bulk-email fields: set each field, call `persistState`,
verify the persisted JSON contains the exact values, then `restoreState`
and verify the fields come back. This is the safety net the move needs.

**Verify**: `npm test -- promotion-store` → the new round-trip tests pass.

### Step 2: Extract the newsletter store

Create `src/stores/newsletter-store.ts` as a Zustand store owning:
`newsletterHeading`, `newsletterBody`, `newsletterPosition`,
`newsletterStyle`, `newsletterVisible`, and their setters. Keep the fields
in the main store's `persistData`/`restoreState` (or move persistence into
the new store with its own localStorage key — **decide based on the
round-trip tests**: if the import/export config reads these fields from the
main store, keep them there and have the new store mirror; if the config
can read from the new store, move them). Update the newsletter components
(`NewsletterEditor.tsx`, `NewsletterStylePanel.tsx`, promotion-page-hooks)
to read from the new store.

**Verify**: `npm run typecheck` → exit 0; `npm test` → all pass (the
round-trip tests from Step 1 still pass).

### Step 3: Extract the bulk-email store

Create `src/stores/bulk-email-store.ts` owning: `bulkEmailRecipients`,
`bulkEmailHasRecipients`, `bulkEmailGenerating`, `bulkEmailProgress`,
`bulkEmailDownloadFormat`, `bulkEmailBatchSize`, and their actions
(incl. the IndexedDB persistence for recipients). Update `BulkEmailTools.tsx`
and any other importer.

**Verify**: `npm run typecheck` → exit 0; `npm test` → all pass.

### Step 4: Split ProfileSettingsPage

Extract each section of `ProfileSettingsPage.tsx` into a component under
`src/components/profile/` (e.g. `ProfileFormSection.tsx`,
`BrandSettingsSection.tsx`, `PreferencesSection.tsx`,
`DownloadFolderSection.tsx`, `DevModeSection.tsx`). Each gets the props it
needs (form state, handlers). The page becomes a composition:

```tsx
export function ProfileSettingsPage() {
  return (
    <div className="...">
      <ProfileFormSection ... />
      <BrandSettingsSection ... />
      <PreferencesSection ... />
      <DownloadFolderSection ... />
      <DevModeSection ... />
    </div>
  );
}
```

Move the section-specific tests (if any) with the components.

**Verify**: `npm run typecheck` → exit 0; `npm test -- profile-settings` → all pass.

### Step 5: Update AGENTS.md and the coverage gate

Update AGENTS.md's "add a field" guidance: newsletter and bulk-email fields
go in their own stores; other fields still go in promotion-store. Run
`npm run test:coverage` and confirm the thresholds (plan 009) still pass —
if the new files dropped coverage below threshold, add the missing tests
(do NOT lower the thresholds).

**Verify**: `npm run test:coverage` → exit 0, above thresholds.

## Test plan

- Step 1's round-trip characterization tests are the load-bearing net.
- Move existing tests for newsletter/bulk-email behavior with the slices.
- New section-component tests for the split page (model after
  `tests/profile-settings-page.test.tsx` if it exists).
- Existing store tests must still pass — the main store keeps its other
  domains unchanged.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `src/stores/newsletter-store.ts` and `src/stores/bulk-email-store.ts`
      exist and own their domains
- [ ] The main store no longer defines newsletter/bulk-email state/actions
      (grep the field names against promotion-store.ts — they should be
      gone or re-exported from the new stores)
- [ ] `src/pages/ProfileSettingsPage.tsx` is a composition of section
      components (its line count drops substantially; each section has its
      own file under `src/components/profile/`)
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0
- [ ] `npm run test:coverage` exits 0 above thresholds
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 022 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- A field in the newsletter/bulk-email domain is read by a component that
  also reads main-store fields in the same `useShallow` selector — the
  slice boundary isn't clean; report the coupling instead of splitting the
  selector mid-component.
- The export/import config round-trip breaks because it reads fields from
  the main store that now live in a new store — STOP and report; the config
  schema may need the new stores, which is a bigger change than this plan
  scopes.
- `persistData`'s round-trip tests (Step 1) fail after the move — revert
  the move and report (the persistence interlock is more coupled than the
  audit assessed).
- A verification fails twice after a reasonable fix attempt.
- The store split makes `npm run test:coverage` drop below the plan-009
  thresholds by more than the new tests can recover — report the numbers
  instead of lowering the gate.

## Maintenance notes

- This plan is deliberately the LAST of the audit set: it builds on the
  restore guard (005), the coverage gate (009), and the email-HTML
  characterization tests (011) — without those, the split is risky.
- The remaining store domains (entries, special hours, PDFs) are still god-
  adjacent; the pattern established here (own store + round-trip tests +
  AGENTS.md guidance) is the template for a future split.
- `persistData`'s interlock is the load-bearing constraint: any field
  touched by auto-save must have a round-trip test before it moves.
- If the codebase keeps growing, the next slice candidates are the
  how-to-shop/important-notes formattable items (they share the
  FormattableItemEditor pattern).
