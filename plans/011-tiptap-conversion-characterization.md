# Plan 011: Characterization tests for `convertTipTapToInlineHTML`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/lib/promotion-email-html.ts tests/promotion-email-html.test.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

`convertTipTapToInlineHTML` (`src/lib/promotion-email-html.ts:468-693`) is
the email-compatibility conversion layer — ~15 regex passes that turn TipTap
rich-text output into inline-styled HTML that renders correctly in Outlook,
Gmail, and Apple Mail (tables, blockquote, pre/code, hr, img, lists,
headings). It has **zero targeted tests**: `promotion-email-html.test.ts`
has only 5 tests, all on palette keys and `<mark>` sanitization. A regex
change that silently stops converting `<table>` or `<img>` passes CI today.
This is the classic "characterization tests first" candidate — high business
value (newsletter rendering is a headline feature), currently behavior-pinned
only by accident.

## Current state

`src/lib/promotion-email-html.ts:468-693` — the function is module-private
(no `export`), taking TipTap HTML and returning inline-styled HTML. The
existing test file `tests/promotion-email-html.test.ts` covers palette keys
and `<mark>` only (lines 14-118). The newsletter integration suite
(`tests/newsletter-email-integration.test.tsx`) exercises some of it
indirectly, but grep confirms zero assertions on `border-collapse`,
`blockquote`, `table style`, `colspan`, `pre style`, `hr style`,
`padding-left: 24px`.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test -- promotion-email-html newsletter-email-integration` | all pass |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/promotion-email-html.ts` — export `convertTipTapToInlineHTML` (or
  add a test-only export; prefer a real `export` if nothing prevents it)
- `tests/promotion-email-html.test.ts` — add characterization tests
- Possibly `tests/newsletter-email-integration.test.tsx` if the tests belong
  there instead

**Out of scope** (do NOT touch, even though they look related):
- The function's behavior — characterization tests LOCK IN current behavior;
  do not "improve" the regexes while writing them.
- The palette/`<mark>` tests that already exist.
- `src/lib/emailPreviewUtils.ts` / other converters — plan 018 consolidates
  converters and depends on these tests.

## Git workflow

- Branch: `advisor/011-tiptap-conversion-characterization`
- Commit style: conventional commits, e.g.
  `test(email): characterize convertTipTapToInlineHTML output`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Export the function

In `src/lib/promotion-email-html.ts`, add `export` to
`convertTipTapToInlineHTML` (line ~468). If the function is nested or
otherwise not exportable as-is, add a thin public wrapper:

```typescript
export function convertTipTapToInlineHTML(tiptapHTML: string): string {
  return /* existing implementation */;
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Build fixture-based characterization tests

In `tests/promotion-email-html.test.ts`, add a new `describe` block. For
each conversion case, feed a representative TipTap HTML fragment and assert
the *specific* inline styles the converter should emit. Read the actual
implementation first (lines 468-693) and write assertions for what it
**does** emit, not what you'd like it to emit:

1. **Table**: `<table><tr><td>cell</td></tr></table>` → assert
   `border-collapse` is present and the `td` gets inline styles.
2. **Blockquote**: `<blockquote>quote</blockquote>` → assert the emitted
   border/margin styling.
3. **Pre/code**: `<pre><code>code</code></pre>` → assert monospace/styling.
4. **HR**: `<hr>` → assert the emitted style (height/border).
5. **Image**: `<img src="data:image/png;base64,...">` → assert `src` is
   preserved and max-width styling present.
6. **List**: `<ul><li>item</li></ul>` → assert `padding-left: 24px` (or the
   actual value the code emits).
7. **Colspan**: a `td colspan="2"` → assert `colspan` survives.
8. **Heading**: `<h2>Title</h2>` → assert font-size/weight styling.

Use minimal fixtures — one element per test — so a failure names the exact
regression. Model the harness on the existing `<mark>` tests in the same
file.

**Verify**: `npm test -- promotion-email-html` → all pass, including the
new tests.

### Step 3: Add a sanitization regression case

One test asserting that a `<mark data-color="...">` with a malicious color
value (e.g. `"; background-image: url(x)"`) is sanitized/neutralized — this
extends the existing coverage to the converter's output path (the `<mark>`
tests already exist at `promotion-email-html.test.ts:14-118`; add the
converter-level variant).

**Verify**: `npm test -- promotion-email-html` → all pass.

## Test plan

- New characterization tests per Step 2 — each a minimal fixture asserting
  the emitted inline styles.
- One sanitization regression per Step 3.
- Existing tests in the file must still pass — the export is additive.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test -- promotion-email-html` exits 0; the new characterization
      tests exist and pass
- [ ] `grep -rn "convertTipTapToInlineHTML" tests/` shows assertions on it
      (imported and tested)
- [ ] The test file asserts at least: `border-collapse`, `blockquote`,
      `padding-left: 24px` (or the code's actual list padding), `colspan`,
      and `<img src` preservation
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 011 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The function at `promotion-email-html.ts:468-693` no longer matches the
  description (drift) — re-read it and report the actual behavior.
- Exporting the function requires restructuring the module (e.g. it's
  nested inside another function) — report the structure instead of forcing
  a refactor.
- A characterization test fails because the current behavior is visibly
  broken (e.g. the regex never matches) — that's a finding, not a test bug;
  record what you observed and STOP before "fixing" it (plan 018 may own
  the fix).

## Maintenance notes

- Plan 018 (consolidate converters) depends on these tests as its safety
  net. Do NOT merge 018 before 011.
- When the newsletter editor changes its TipTap configuration, run these
  tests first — they're the fastest signal that email rendering changed.
- If a future email-client quirk requires changing the emitted styles,
  update the affected fixture assertion in the same PR (the test documents
  intent; a deliberate change is a test update, not a lie).
