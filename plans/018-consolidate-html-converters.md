# Plan 018: Consolidate the 4–5 divergent HTML escape/convert implementations

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/lib/html-utils.ts src/lib/emailPreviewUtils.ts src/lib/promotion-email-html.ts src/components/promotion/newsletter/NewsletterEditor.tsx src/lib/emailUtils.ts src/lib/templates.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition. **This plan depends on plan 011
> being DONE** — verify `plans/README.md` shows 011 DONE before starting; if
> not, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/011-tiptap-conversion-characterization.md
- **Category**: tech-debt
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

HTML escaping and text↔HTML conversion are implemented 4–5 divergent ways:

- **Escaping**: `sanitizeHTML` (`html-utils.ts:14`, DOM round-trip) is
  canonical; `emailPreviewUtils.ts:12` defines a private `escapeHtml` with
  the identical body *while also importing `sanitizeHTML`*;
  `promotion-email-html.ts:435` defines `escapeHtml` as a thin alias;
  `NewsletterEditor.tsx:228` inlines a regex escape covering only `& < >`
  (no quotes — different behavior).
- **Text→HTML**: `plainTextToPreviewHTML` (`emailPreviewUtils.ts:29`) and
  `convertTextToHTML` (`templates.ts:209`) are near-identical (same
  `\n\n`→`<p>`, `\n`→`<br>`, bullet detection, same Aptos inline styles)
  but have drifted (`convertTextToHTML` appends the employee signature;
  `plainTextToPreviewHTML` does dark-mode text color).
- **HTML→text**: `extractPlainText` (`emailUtils.ts:20`, CRLF output, used
  in EML) — plus the dead `htmlToPlainText` (deleted by plan 014).

Five places to fix when email-client quirks change; behavior drift means the
same input renders differently depending on which converter runs.
NewsletterEditor's partial escape is a latent inconsistency if pasted text
ever reaches an attribute context.

## Current state

- `src/lib/html-utils.ts:12-16` — `sanitizeHTML` (canonical escape)
- `src/lib/emailPreviewUtils.ts:12` — private `escapeHtml` (duplicate body),
  plus `plainTextToPreviewHTML` at `:29`
- `src/lib/promotion-email-html.ts:435` — `escapeHtml` alias
- `src/components/promotion/newsletter/NewsletterEditor.tsx:228` — regex
  escape (`& < >` only)
- `src/lib/templates.ts:209` — `convertTextToHTML`
- `src/lib/emailUtils.ts:20` — `extractPlainText` (CRLF variant for EML)

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/html-utils.ts` — the canonical escape home (+ the new shared
  `textToHtml` helper if it belongs there)
- `src/lib/emailPreviewUtils.ts` — remove the private `escapeHtml`, import
  from html-utils; route `plainTextToPreviewHTML` through the shared helper
- `src/lib/promotion-email-html.ts` — remove the alias, import from
  html-utils
- `src/components/promotion/newsletter/NewsletterEditor.tsx:228` — replace
  the partial regex with `sanitizeHTML` (verify it doesn't break the
  editor's attribute-context usage)
- `src/lib/templates.ts:209` — route `convertTextToHTML` through the shared
  helper (keep the signature-appending behavior as an option)
- `src/lib/emailUtils.ts` — keep `extractPlainText` but make it the explicit
  EML option on the shared HTML→text helper (do NOT change its output)

**Out of scope** (do NOT touch, even though they look related):
- Plan 014's deleted module — gone; don't resurrect it.
- `tests/` files except where imports change (test files that import the
  private `escapeHtml` need their import updated — search first).
- Behavior changes beyond consolidation — if two implementations differ and
  a shared helper must pick one behavior, the characterization tests from
  plan 011 and the existing `emailUtils`/`emailPreviewUtils` tests define
  which behavior is load-bearing; pick the tested one, do not invent a third.

## Git workflow

- Branch: `advisor/018-consolidate-html-converters`
- Commit style: conventional commits, e.g.
  `refactor: consolidate HTML escape/convert into html-utils`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Inventory call sites

Grep for every use of the four escape implementations and the two text→HTML
functions. List each call site and which behavior it depends on (CRLF vs
LF, signature vs not, dark-mode color vs not).

**Verify**: the inventory accounts for every import of the private
`escapeHtml` and both text→HTML functions.

### Step 2: Consolidate escaping

In `html-utils.ts`, keep `sanitizeHTML` as the single escape. Remove the
private `escapeHtml` in `emailPreviewUtils.ts` (replace call sites with the
html-utils import — it's already imported there per the audit), remove the
alias in `promotion-email-html.ts:435`, and replace the regex in
`NewsletterEditor.tsx:228` with `sanitizeHTML` (test the editor's
attribute-context usage; if `sanitizeHTML`'s quote-escaping breaks an
attribute it feeds, that's a STOP — the editor may need the quote-escaped
variant deliberately, in which case export it from html-utils explicitly
rather than inlining a divergent regex).

**Verify**: `npm run typecheck` → exit 0; `npm test` → all pass.

### Step 3: Consolidate text→HTML

Create one shared `textToHtml` helper in `html-utils.ts` (or the module
that owns the common behavior) with options for the two differing behaviors:

```typescript
export function textToHtml(
  text: string,
  options?: {
    appendSignature?: boolean;   // templates.ts behavior
    forPreview?: boolean;        // dark-mode text color behavior
  }
): string { ... }
```

Route `plainTextToPreviewHTML` and `convertTextToHTML` through it. Keep the
existing exported function names (call sites don't change) but have them
delegate to the shared helper with their options. The bullet-list detection
and Aptos inline styles must match what the current implementations emit —
the plan-011 characterization tests and existing tests define this.

**Verify**: `npm test -- emailPreviewUtils templates promotion-email-html` →
all pass (the existing tests lock the behavior).

### Step 4: Consolidate HTML→text

Keep `extractPlainText` in `emailUtils.ts` but make it a thin wrapper over
a shared `htmlToText` helper (if one emerges) or document it as the EML-only
CRLF variant. Do not change its output — EML correctness depends on it.

**Verify**: `npm test -- emailUtils` → all pass.

### Step 5: Update tests that imported the private function

Search `tests/` for imports of the removed private `escapeHtml` and update
them to import from html-utils.

**Verify**: `grep -rn "escapeHtml" src/ tests/` shows only the canonical
definition (and its importers).

## Test plan

- No new tests required (plan 011 supplies the characterization net) —
  this plan is consolidation; the existing suites are the gate.
- If a behavior difference is discovered between implementations that the
  tests don't pin, add a characterization test for the chosen behavior
  before consolidating (follow plan 011's pattern).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0
- [ ] `grep -n "function escapeHtml" src/` shows exactly one definition
      (in html-utils or none if fully replaced by sanitizeHTML)
- [ ] `grep -n "& < >" src/components/promotion/newsletter/NewsletterEditor.tsx`
      shows the inline regex is gone (replaced by the shared helper)
- [ ] `grep -rn "from '../lib/htmlTextConversion'\|htmlToPlainText" src/`
      returns no matches (plan 014's deletion is undisturbed)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 018 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 011 is not DONE (the characterization net must exist first).
- Consolidation changes EML output bytes (the CRLF behavior in
  `extractPlainText` is load-bearing — any change is a STOP).
- The newsletter editor's partial escape serves a deliberate purpose
  (e.g. double-escaping risk in its attribute context) — report the actual
  usage rather than forcing `sanitizeHTML`.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The single source of truth for escaping is now html-utils; future
  escaping needs import from there.
- The text→HTML helper's options (signature, dark-mode) are the documented
  seams for the two divergent behaviors — new callers pick options, not new
  implementations.
- When plan 022 slices the store, no converter logic moves with it — these
  are pure lib functions.
