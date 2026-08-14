# Plan 003: Validate brand-link URL schemes before emitting hrefs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/lib/signature.ts src/lib/html-utils.ts src/lib/profile.ts`
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

The signature renderer emits brand-link `href` values straight from the
saved profile with only entity escaping. `sanitizeHTML` escapes `& < > " '`
but never validates the URL scheme, so a crafted profile value of
`javascript:alert(1)` is emitted verbatim as an `href`. The signature HTML
is injected into the live app DOM via `dangerouslySetInnerHTML` in
`src/components/EmailPreview.tsx:67` (a script-enabled origin in the browser
build), and embedded into every generated template/EML. The web build ships
no Content-Security-Policy, so a `javascript:` brand URL executes arbitrary
script in the app origin — reading `localStorage`/IndexedDB including the
bulk-recipient PII list. The desktop build is mitigated by the Tauri CSP
(`src-tauri/tauri.conf.json:26`), but the browser deployment is not.

The submit form already validates brand URLs as http(s) (`profile-validation.ts`),
but the read path (`getBrandLinks` in `src/lib/profile.ts`) never re-checks,
and profile import coerces with `String()` only. Defense at the sink is the
fix: one scheme check right where the `href` is emitted.

## Current state

`src/lib/signature.ts:219-243` — the brand-link renderer:

```typescript
function renderBrandLinks(
  brandLinks: BrandLink[],
  format: 'text' | 'html',
  colors: SignatureColors
): string {
  const links = brandLinks.filter((b) => b.name.trim() && b.url.trim());
  if (links.length === 0) {
    return '';
  }

  if (format === 'html') {
    const rendered = links
      .map(
        (brand) =>
          `<a href="${sanitizeHTML(brand.url)}" style="color: ${colors.link}; text-decoration: underline; font-size: ${SIGNATURE_STYLES.fontSize.details};">${sanitizeHTML(brand.name)}</a>`
      )
```

`sanitizeHTML` (`src/lib/html-utils.ts:12-16`) is escape-only:

```typescript
export function sanitizeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

There is an existing URL-safety helper for the *email* HTML path —
`isSafeURL` is referenced in the sanitizer's `sanitizeNode` for `href`
attributes (`src/lib/html-utils.ts:179-204`). Check how `isSafeURL` is
defined and exported; if it is module-private, export it. If it does not
exist (only inline checks do), add a small exported helper in `html-utils.ts`:

```typescript
/** Schemes allowed in emitted href/src attributes. */
const SAFE_URL_SCHEMES = /^(https?:|mailto:|tel:|cid:|data:image\/)/i;

export function isSafeURL(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Relative URLs (no scheme) are allowed.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return true;
  return SAFE_URL_SCHEMES.test(trimmed);
}
```

(If `isSafeURL` already exists with different semantics, reuse it and skip
the new definition — match the existing helper.)

`src/lib/profile.ts` — `getBrandLinks()` (around line 188) reads `brandLinks`
from the profile; the profile import path coerces values with `String()`
(`src/pages/ProfileSettingsPage.tsx:312-322`).

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test -- signature`       | all pass            |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/signature.ts` — the `href` sink (renderBrandLinks)
- `src/lib/html-utils.ts` — export/add the `isSafeURL` helper (only if it
  is not already exported)
- `tests/signature.test.ts` — new regression tests

**Out of scope** (do NOT touch, even though they look related):
- `src/lib/profile.ts` — read-path validation is a bonus, not required; the
  sink check is the fix. (Do not add validation there unless the sink fix
  alone cannot be tested.)
- `src/pages/ProfileSettingsPage.tsx` — form validation already exists.
- The email-HTML sanitizer (`promotion-email-html.ts`) — plan 007 covers
  `img src` validation.
- Adding a web CSP (`index.html`) — flagged in the audit as a follow-up but
  deliberately out of scope here.

## Git workflow

- Branch: `advisor/003-validate-brand-url-schemes`
- Commit style: conventional commits, e.g.
  `fix(signature): validate brand-link URL schemes before emitting hrefs`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Ensure `isSafeURL` is exported from `html-utils.ts`

If `src/lib/html-utils.ts` already exports an `isSafeURL` (or equivalent
scheme validator), use it. If not, add the helper above to `html-utils.ts`
(next to `sanitizeHTML`) and export it.

**Verify**: `grep -n "export function isSafeURL\|export const isSafeURL" src/lib/html-utils.ts` → one match.

### Step 2: Apply the scheme check in `renderBrandLinks`

In `src/lib/signature.ts`, import `isSafeURL` and filter out unsafe URLs in
the existing `links` filter:

```typescript
const links = brandLinks.filter(
  (b) => b.name.trim() && b.url.trim() && isSafeURL(b.url)
);
```

This drops `javascript:` (and any other disallowed scheme) from the emitted
signature entirely — no anchor is rendered for it, matching the existing
"no empty placeholder row" behavior for empty links.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add regression tests

In `tests/signature.test.ts` (model after the existing signature tests in
that file):

1. `javascript:` brand URL is omitted from HTML signature output (no `<a`
   with `javascript:` in the string, and no anchor for that brand).
2. `data:text/html` brand URL is omitted.
3. `https://` and relative URLs are still emitted.
4. `mailto:` and `tel:` are still emitted (if the helper allows them).

**Verify**: `npm test -- signature` → all pass, including the new tests.

## Test plan

- New tests in `tests/signature.test.ts` (see Step 3): scheme-blocked URLs
  omitted, safe schemes retained.
- Existing signature tests must continue to pass — the change only filters
  the emitted link set; the standard http(s) case is unchanged.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test -- signature` exits 0; new tests for `javascript:`/`data:`
      omission and http(s) retention exist and pass
- [ ] `grep -rn 'javascript:' src/lib/signature.ts` returns no matches in an
      emitted-href context (i.e., no `href="${...javascript...}"` path)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 003 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (drift since `02050dd`).
- `isSafeURL` already exists with *different* semantics (e.g. it rejects
  `mailto:` which the product needs) — report the existing semantics instead
  of overriding them.
- A verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- If a future feature adds a new link surface (e.g. a "view online" URL in
  the promotion builder), route it through `isSafeURL` at the sink.
- When a web CSP is eventually added to `index.html`, this sink check
  becomes defense-in-depth rather than the primary guard — keep both.
- The browser build's missing CSP is tracked as a follow-up; do not add it
  in this plan.
