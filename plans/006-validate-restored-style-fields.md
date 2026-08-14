# Plan 006: Validate persisted style/color fields on restore (reuse import schemas)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/stores/promotion-store.ts src/lib/promotion-config-schema.ts src/lib/promotion-email-html.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

The import path validates every color/style field through Zod's
`SAFE_COLOR_RE` (`promotion-config-schema.ts:32-36`), but the **restore**
path — reading the same shape from localStorage — assigns style fields from
raw `JSON.parse` output with no validation (`promotion-store.ts:1053-1073`).
Those values are later interpolated **unescaped** into `style=""` attributes
of the generated email (`promotion-email-html.ts:917-938, 969, 976, 1009,
1022`; only `mark data-color` is validated at `:525`).

A tampered or corrupt `promotionBuilderState` entry can inject arbitrary CSS
declarations into the email every recipient opens — e.g.
`background-image: url(https://attacker/track...)` as a pixel beacon, or
broken branding. The editor itself is safe (`type="color"` in
EmailThemeEditor), so this is a persisted-state trust gap: the localStorage
surface is treated as trusted while the import surface is not. Both should
be validated identically.

## Current state

`src/lib/promotion-config-schema.ts:32-36` — the import validator:

```typescript
export const SAFE_COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|(rgb|rgba|hsl|hsla)\([0-9.,\s%deg-]*\))$/;

const safeColor = z.string().regex(SAFE_COLOR_RE);
const colorOrNull = safeColor.nullable().catch(null);
```

`src/stores/promotion-store.ts:1053-1073` — the restore path assigns raw
values:

```typescript
howToShopStyle: parsed.howToShopStyle || { ...DEFAULT_HOW_TO_SHOP_STYLE },
importantNotesStyle: parsed.importantNotesStyle || { ...DEFAULT_IMPORTANT_NOTES_STYLE },
// ...
newsletterStyle: parsed.newsletterStyle || { ...DEFAULT_NEWSLETTER_STYLE },
// ...
emailPalette: parsed.emailPalette || { ...DEFAULT_EMAIL_PALETTE },
```

`parsed` comes from `JSON.parse(stored)` at `:962-964` with a type assertion
only — no Zod pass.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test -- promotion-store promotion-email-html` | all pass |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/stores/promotion-store.ts` — run restored style fields through the
  existing schema helpers
- `src/lib/promotion-config-schema.ts` — export the style/palette sub-schemas
  (or a single `sanitizePersistedStyles` function) for reuse
- Tests: `tests/promotion-store.test.ts` (restore validation), possibly
  `tests/promotion-config-schema.test.ts`

**Out of scope** (do NOT touch, even though they look related):
- The email-HTML interpolation sites (`promotion-email-html.ts`) — with
  restore validated, the persisted values reaching them are safe; the
  generator itself stays as-is.
- `restoreState`'s other fields (entries, hours, PDFs) — covered by other
  plans; this plan is strictly the style/color surface.
- The import path — already validated; don't change it.

## Git workflow

- Branch: `advisor/006-validate-restored-style-fields`
- Commit style: conventional commits, e.g.
  `fix(promotion): validate persisted style fields on restore`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Export a reusable sanitizer from the schema module

In `src/lib/promotion-config-schema.ts`, export a function that sanitizes a
raw style/palette object through the existing safe-color schemas. The
schemas `safeColor` and `colorOrNull` are already defined; add (near the
existing style schemas, which are further down the file — find the
`newsletterStyleSchema`/`emailPaletteSchema` definitions and match their
shape):

```typescript
/** Sanitize a raw persisted style/palette object through the safe-color
 *  schemas. Used by restoreState so the localStorage surface gets the same
 *  validation as the import surface. */
export function sanitizePersistedStyles<T>(raw: unknown, fallback: T): T {
  // If a dedicated schema for T exists (e.g. newsletterStyleSchema),
  // use it; otherwise apply safeColor/colorOrNull per known key.
  // Implement against the actual style shapes in this file.
}
```

Check what style schemas already exist in this file (there is a
`newsletterStyleSchema`, an `emailPaletteSchema`, and section-box schemas
used by the import path — read the rest of the file and reuse them directly
rather than writing new ones).

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Apply the sanitizer in `restoreState`

In `src/stores/promotion-store.ts`, import the sanitizer and wrap the four
style assignments:

```typescript
howToShopStyle: sanitizePersistedStyles(parsed.howToShopStyle, { ...DEFAULT_HOW_TO_SHOP_STYLE }),
importantNotesStyle: sanitizePersistedStyles(parsed.importantNotesStyle, { ...DEFAULT_IMPORTANT_NOTES_STYLE }),
// ...
newsletterStyle: sanitizePersistedStyles(parsed.newsletterStyle, { ...DEFAULT_NEWSLETTER_STYLE }),
emailPalette: sanitizePersistedStyles(parsed.emailPalette, { ...DEFAULT_EMAIL_PALETTE }),
```

The fallback is the existing default — a tampered value falls back to the
safe default instead of reaching the email.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add regression tests

In `tests/promotion-store.test.ts` (or the closest existing store test):

1. Restoring a `promotionBuilderState` whose `emailPalette` contains a
   malicious value (e.g. `"; background-image: url(https://evil/)"`) results
   in the default palette, not the injected value.
2. Same for `howToShopStyle` / `newsletterStyle`.
3. A valid persisted style round-trips unchanged (no regression on the
   normal save/load path).

**Verify**: `npm test -- promotion-store` → all pass, including the new
tests.

## Test plan

- New tests in `tests/promotion-store.test.ts` per Step 3.
- Existing restore tests must still pass — valid persisted state is
  unchanged by the sanitizer (only invalid values are replaced).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; new tests for restore-time style sanitization
      exist and pass
- [ ] `grep -n "sanitizePersistedStyles" src/stores/promotion-store.ts` shows
      it applied to all four style/palette assignments
- [ ] A manually injected malicious palette value in a test fixture no
      longer reaches the store state
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 006 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The style schemas in `promotion-config-schema.ts` do not cover the exact
  shape of the persisted style objects (the import path may normalize them
  differently than restore) — report the shape mismatch instead of forcing
  the schemas.
- A verification fails twice after a reasonable fix attempt.
- The fix appears to require touching `promotion-email-html.ts` (the
  interpolation sites) — that is out of scope; report instead.

## Maintenance notes

- This closes the import/restore validation asymmetry: both surfaces now
  run the same safe-color schemas.
- When plan 022 (store slice) lands, the style sanitization moves with the
  store slice it belongs to — keep the `sanitizePersistedStyles` helper
  exported so the slice can reuse it.
- If a future style field is added to the persisted shape, it must be added
  to the sanitizer too; the fallback default is the safe value.
