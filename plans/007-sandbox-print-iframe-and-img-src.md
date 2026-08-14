# Plan 007: Add `sandbox` to the print iframe and validate `img src` in the sanitizer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/components/promotion/usePreviewActions.ts src/lib/html-utils.ts src/lib/promotion-email-html.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

Two defense-in-depth gaps in the HTML-handling surface:

1. **Print iframe is an unsandboxed `doc.write` sink** —
   `usePreviewActions.ts:367-396` creates an iframe with **no `sandbox`
   attribute**, then `doc.open()`/`doc.write(emailHTML)`/`doc.close()`.
   Because the iframe has no sandbox, it is same-origin with the app: any
   `<script>` in the generated HTML executes with full app privileges.
   Today the HTML is generated from sanitized inputs so scripts shouldn't
   exist — but this is one sanitizer regression away from same-origin
   script execution at print time, and it's a free hardening.
2. **Sanitizer allows `img src` without scheme validation** —
   `html-utils.ts:80` allows `src` on `img`, and `sanitizeNode`
   (`html-utils.ts:179-204`) applies `isSafeURL` only to `href`, not `src`.
   So `src="javascript:..."` or `src="data:text/html,..."` survives
   (entity-escaped but intact) and is re-emitted verbatim by the email-HTML
   converter (`promotion-email-html.ts:640-668`). In email clients `img src`
   is inert, so today's impact is low — but it's the same hole class that
   compounds.

## Current state

`src/components/promotion/usePreviewActions.ts:367-396` — the print path:

```typescript
const handlePrint = useCallback(() => {
  if (!emailHTML) return;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.width = '600px';
  iframe.style.height = '800px';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(emailHTML);
  doc.close();
  ...
```

`src/lib/html-utils.ts` — `ALLOWED_TAGS` includes `img` (around line 80);
`sanitizeNode` (around line 179) validates `href` via `isSafeURL` but not
`src`.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test -- html-utils promotion-email-html` | all pass |
| Lint      | `npm run lint`                | exit 0              |
| E2E smoke | `npm run test:e2e` (only if CI runs it; see config) | passes or report env limits |

## Scope

**In scope** (the only files you should modify):
- `src/components/promotion/usePreviewActions.ts` — add `sandbox` to the
  print iframe
- `src/lib/html-utils.ts` — validate `src` on `img` through the same
  URL-safety logic used for `href`
- Tests: `tests/html-utils.test.ts`, and the closest print-path test
  (search `tests/` for `handlePrint` or `print`)

**Out of scope** (do NOT touch, even though they look related):
- The preview iframe (`PreviewColumn.tsx`) — already `sandbox="allow-same-origin"`.
- The email-HTML converter (`promotion-email-html.ts`) — if the sanitizer
  rejects bad `src`, the converter never sees them. (Do not add a second
  check there.)
- Plan 003's brand-link `href` fix — different sink, already planned.

## Git workflow

- Branch: `advisor/007-sandbox-print-iframe-and-img-src`
- Commit style: conventional commits, e.g.
  `fix(security): sandbox the print iframe and validate img src schemes`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Sandbox the print iframe

In `src/components/promotion/usePreviewActions.ts`, set the sandbox attribute
to allow only what printing needs. A print iframe only needs to render
content and call `print()` — no scripts, no same-origin:

```typescript
iframe.setAttribute('sandbox', '');
```

An empty `sandbox` (no tokens) applies the most restrictive set: no scripts,
no same-origin access, no forms, no popups. `iframe.contentWindow?.print()`
still works (printing is not blocked by sandbox). If the email HTML uses
`@media print` styles only, this is fully sufficient.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Validate `img src` in the sanitizer

In `src/lib/html-utils.ts`, in `sanitizeNode` where `href` is validated,
extend the same check to `src` for `img` elements. The allowed schemes for
images should be: `http:`, `https:`, `data:image/` (the email generator can
emit inline images), `cid:` (email clients). Reject `javascript:`, `data:
text/html`, and any other scheme. If `isSafeURL` is the existing helper and
it already allows `data:image/`, reuse it; otherwise add a
`isSafeImageURL` (or extend the helper with an allowed-schemes parameter).

**Verify**: `npm test -- html-utils` → the existing tests pass, plus the new
`src` tests from Step 3.

### Step 3: Add regression tests

In `tests/html-utils.test.ts`:

1. `sanitizeRichHTML('<img src="javascript:alert(1)">')` strips or neutralizes
   the `src` (no `javascript:` in output).
2. `sanitizeRichHTML('<img src="data:text/html,<script>">')` strips the `src`.
3. `sanitizeRichHTML('<img src="https://example.com/a.png">')` keeps the `src`.
4. (If the print path has a test file) assert the print iframe has a
   `sandbox` attribute.

**Verify**: `npm test -- html-utils` → all pass, including the new tests.

## Test plan

- New tests per Step 3 in `tests/html-utils.test.ts`.
- Existing sanitizer tests must continue to pass — legitimate `data:image/`
  and http(s) images are unchanged.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; new tests for `img src` validation exist and pass
- [ ] `grep -n "sandbox" src/components/promotion/usePreviewActions.ts` shows
      the print iframe sets it
- [ ] `grep -rn 'src="javascript:' src/` (excluding tests) returns no
      matches in emitted output paths
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 007 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `isSafeURL` doesn't exist or has different semantics than the plan assumes
  (report the actual helper instead of guessing).
- The email generator emits `data:` URLs that are *not* `data:image/` (e.g.
  `data:application/pdf`) in an `img src` — report the real usage before
  blocking it.
- A verification fails twice after a reasonable fix attempt.
- Sandboxing the print iframe breaks printing in a way the plan didn't
  anticipate (test `npm run test:e2e` if available; otherwise note it for
  manual verification).

## Maintenance notes

- `sandbox=""` is the most restrictive iframe mode; if a future print
  feature needs inline scripts (e.g. print-preview JS), re-evaluate — but
  prefer keeping the sandbox and doing the work outside the iframe.
- The `img src` validation and plan 003's `href` validation now use the same
  URL-safety logic — keep them in sync.
- The preview iframe in `PreviewColumn.tsx` is already sandboxed; the print
  iframe is the last unsandboxed document the app writes.
