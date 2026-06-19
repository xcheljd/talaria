# Plan 006: `data-color` from the rich-text editor is validated before it is inlined into a `style` attribute

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c469626..HEAD -- src/lib/promotion-email-html.ts src/lib/promotion-config-schema.ts`
> If either changed since this plan was written, compare against the "Current
> state" excerpts before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c469626`, 2026-06-17

## Why this matters

When converting TipTap `<mark>` highlights to inline styles for the generated
email, the code captures the `data-color` attribute value and interpolates it
**unvalidated** into a CSS `style` attribute. The capture group `[^"]*` forbids
a double-quote (so it can't break out of the attribute), but it **allows
semicolons and additional CSS declarations** — i.e. CSS injection into the
generated email HTML (e.g. a value like `red; background-image: url(…)`). The
repo already defines exactly the right validator (`SAFE_COLOR_RE`) for this
purpose but doesn't apply it here. This plan reuses that validator so only a
real color value is inlined, with a safe `yellow` fallback otherwise.

## Current state

`src/lib/promotion-email-html.ts:367-370` (inside `convertTipTapToInlineHTML`):

```ts
// <mark> → <span style="background-color: yellow;">
// Also handle marks with data-color attribute from TipTap highlight,
// regardless of attribute order or additional attributes.
result = result.replace(
  /<mark\b[^>]*\bdata-color="([^"]*)"[^>]*>/g,
  '<span style="background-color: $1;">'
);
result = result.replace(
  /<mark\b[^>]*>/g,
  '<span style="background-color: yellow;">'
);
result = result.replace(/<\/mark>/g, '</span>');
```

The validator already exists, in `src/lib/promotion-config-schema.ts:28-35`:

```ts
/**
 * Safe CSS color value: hex, simple named color, or rgb()/rgba()/hsl()/hsla().
 * Excludes quotes, semicolons, and angle brackets so a value can never break
 * out of the style="" attribute it is interpolated into.
 */
const SAFE_COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(rgb|rgba|hsl|hsla)\([0-9.,\s%deg-]*\))$/;
```

`SAFE_COLOR_RE` is currently **not exported**. The cleanest fix exports it and
reuses it in the HTML generator (single source of truth for "what is a safe
color"), rather than duplicating the regex.

Conventions: `promotion-email-html.ts` is a pure generation module (no React);
tests for it live in `tests/promotion-email-html.test.ts`. Match the existing
`describe/it` style there.

## Commands you will need

| Purpose   | Command                                              | Expected on success |
|-----------|------------------------------------------------------|---------------------|
| Install   | `npm ci`                                              | exit 0              |
| Typecheck | `npm run typecheck`                                   | exit 0              |
| Module test| `npx vitest run tests/promotion-email-html.test.ts`  | all pass            |
| All tests | `npm test`                                            | all pass            |

## Scope

**In scope**:
- `src/lib/promotion-config-schema.ts` — export `SAFE_COLOR_RE`.
- `src/lib/promotion-email-html.ts` — replace the unvalidated `$1` interpolation
  with a validated replacement using a function callback.
- `tests/promotion-email-html.test.ts` — add regression tests.

**Out of scope** (do NOT touch):
- The TipTap editor/extension config — the fix belongs at the generation
  boundary, which is where untrusted markup is turned into email HTML.
- Other `replace` chains in `convertTipTapToInlineHTML` — only the `data-color`
  one is in scope. Do not refactor the rest.

## Git workflow

- Branch: `advisor/006-data-color-validation`
- Conventional-commit style (e.g. `fix(promotion): validate mark data-color before inlining`).
- Do NOT push unless instructed.

## Steps

### Step 1: Export the validator

In `src/lib/promotion-config-schema.ts`, change `const SAFE_COLOR_RE =` to
`export const SAFE_COLOR_RE =`. Leave everything else (the `safeColor` zod usage)
unchanged — it references the same binding.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Validate in the generator using a replace callback

In `src/lib/promotion-email-html.ts`:
- Import the validator near the top with the other imports:
  `import { SAFE_COLOR_RE } from './promotion-config-schema';`
  (confirm relative path; both files are in `src/lib/`).
- Replace the unvalidated `data-color` substitution with a function replacement
  that validates the captured value and falls back to `yellow`:

```ts
result = result.replace(
  /<mark\b[^>]*\bdata-color="([^"]*)"[^>]*>/g,
  (_match, color: string) => {
    const safe = SAFE_COLOR_RE.test(color) ? color : 'yellow';
    return `<span style="background-color: ${safe};">`;
  }
);
```

Leave the two following `replace` calls (the plain `<mark>` and `</mark>`) as-is.

**Verify**: `npm run typecheck && npm run lint` → exit 0.

### Step 3: Regression tests

In `tests/promotion-email-html.test.ts`, add a `describe('mark data-color sanitization', …)`.
You can test `convertTipTapToInlineHTML` if it is exported; if it is **not**
exported, drive it through the public generation function that already runs the
conversion (find the exported entry that the existing tests call, e.g.
`generatePromotionEmailHTML` / `buildPromotionEmailData`) and assert on the
output string. Cases:
1. A valid hex color (`data-color="#ff0000"`) appears as
   `background-color: #ff0000;` in the output.
2. A valid named color (`data-color="red"`) appears as `background-color: red;`.
3. An injection attempt with a semicolon
   (`data-color="red; background-image: url(x)"`) does **not** appear verbatim;
   the output falls back to `background-color: yellow;` and contains no
   `background-image`.
4. A `<mark>` with no `data-color` still yields `background-color: yellow;`
   (unchanged behavior).

**Verify**: `npx vitest run tests/promotion-email-html.test.ts` → all pass.

### Step 4: Full gate

**Verify**: `npm run typecheck && npm run lint && npm test` → all exit 0.

## Test plan

- New cases in `tests/promotion-email-html.test.ts` (4 above). Model them on the
  existing tests in that file (same imports, same way of invoking generation).
- Verification: `npx vitest run tests/promotion-email-html.test.ts` → all pass.

## Done criteria

ALL must hold:
- [ ] `SAFE_COLOR_RE` is exported from `promotion-config-schema.ts`
- [ ] The `data-color` substitution validates against `SAFE_COLOR_RE` and falls back to `yellow`
- [ ] A semicolon-injection test confirms no extra CSS declaration survives
- [ ] `npx vitest run tests/promotion-email-html.test.ts` passes the new cases
- [ ] `npm run typecheck && npm run lint && npm test` all exit 0
- [ ] No out-of-scope files modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- The `data-color` `replace` no longer matches the "Current state" excerpt.
- `convertTipTapToInlineHTML` is not exported AND you cannot reach the code path
  through any exported generation function — report it; do not export internals
  speculatively without confirming the call path.
- Validating breaks an existing snapshot/string test that expected a now-rejected
  value — inspect whether that test encoded the vulnerable behavior; report
  before changing any other test.

## Maintenance notes

- `SAFE_COLOR_RE` is now shared by the import-config validator and the HTML
  generator — changing it affects both. Keep the comment above it accurate.
- If TipTap is later configured to also emit foreground `color` styles on text,
  apply the same validated-callback pattern to that substitution.
- Reviewer should confirm the fallback is `yellow` (the established default) and
  that valid colors pass through unchanged.
