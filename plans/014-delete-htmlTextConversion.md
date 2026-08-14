# Plan 014: Delete dead `htmlTextConversion.ts` module + test

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/lib/htmlTextConversion.ts tests/htmlTextConversion.test.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

`src/lib/htmlTextConversion.ts` is a dead module: its four exports
(`extractEditableContent`, `htmlToPlainText`, `insertPlainText`,
`getPlainTextFromPreview`) have zero callers outside the file itself. It is
the legacy "contenteditable preview" HTML↔text path that TipTap superseded.
A test file exists for it (`tests/htmlTextConversion.test.ts`). Dead code
that passes typecheck/lint/test is a standing trap — it's a second HTML→text
implementation whose drift gets "fixed" independently (see plan 018, which
consolidates the converters; this module's deletion is a prerequisite
simplification).

## Current state

`grep -rn "htmlTextConversion" src/ tests/` matches only:
- `src/lib/htmlTextConversion.ts` itself
- `tests/htmlTextConversion.test.ts` (its own test)

`htmlToPlainText`'s only call is `htmlTextConversion.ts:144` from
`getPlainTextFromPreview`, which nothing imports.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- Delete `src/lib/htmlTextConversion.ts`
- Delete `tests/htmlTextConversion.test.ts`
- `docs/ARCHITECTURE-MAP.md` — if it references the module (check §9/§11;
  it lists `html-utils.ts` / `htmlTextConversion.ts` in the lib section —
  remove the `htmlTextConversion.ts` reference)

**Out of scope** (do NOT touch, even though they look related):
- Any other converter (plan 018 owns consolidation).
- `src/lib/html-utils.ts`, `src/lib/emailPreviewUtils.ts` — stay as-is.
- The newsletter editor's own HTML handling.

## Git workflow

- Branch: `advisor/014-delete-htmlTextConversion`
- Commit style: conventional commits, e.g.
  `chore: remove dead htmlTextConversion module`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Re-verify zero importers

Run `grep -rn "htmlTextConversion" src/ --include="*.ts" --include="*.tsx"` —
the only match must be the module file itself. Also check
`grep -rn "extractEditableContent\|htmlToPlainText\|insertPlainText\|getPlainTextFromPreview" src/ --include="*.ts" --include="*.tsx"` for any caller outside the module.

**Verify**: no matches outside the module file.

### Step 2: Delete the files

`git rm src/lib/htmlTextConversion.ts tests/htmlTextConversion.test.ts`

**Verify**: `git status` shows both files deleted, nothing else staged.

### Step 3: Update ARCHITECTURE-MAP if it references the module

Check `docs/ARCHITECTURE-MAP.md` §9 — if it lists `htmlTextConversion.ts`,
remove the reference (keep `html-utils.ts` / `htmlTextConversion` → the
converter line).

**Verify**: `grep -rn "htmlTextConversion" docs/` returns no matches (or
only an intentional "removed" note).

### Step 4: Run the quality gates

`npm run typecheck && npm run lint && npm test` → all exit 0. The test suite
must pass with the deleted test file — nothing should have depended on it.

**Verify**: all three commands exit 0.

## Test plan

- No new tests — the deleted module had no callers; the suite passing is
  the verification.
- If `npm test` fails on a missing import, that means an importer exists
  that Step 1 missed — STOP and report (do not re-add the module).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "htmlTextConversion" src/` returns no matches
- [ ] `git status` shows only the two deleted files + docs edit
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0
- [ ] `plans/README.md` status row for 014 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 finds any importer outside the module (the audit may have missed
  one) — report the caller instead of deleting.
- `npm test` fails after deletion with a missing-import error — STOP.
- `docs/ARCHITECTURE-MAP.md` references the module in a way that requires
  more than removing a bullet (e.g. a whole section) — report.

## Maintenance notes

- Plan 018 (consolidate converters) no longer has to account for this
  module after this deletion — it's one less divergent implementation.
- If the newsletter editor ever needs `getPlainTextFromPreview` semantics,
  the editor owns that behavior now (see `NewsletterEditor.tsx`).
