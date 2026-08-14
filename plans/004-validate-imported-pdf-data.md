# Plan 004: Validate imported PDF `data` fields (prefix + size) before persisting

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src/lib/promotion-config-schema.ts src/lib/pdf-utils.ts src/components/promotion/PDFAttachments.tsx src/components/promotion/usePreviewActions.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

The promotion config **import** path trusts embedded PDF `data` fields with
no size/type/data-URL validation. A crafted import JSON can:

1. Balloon IndexedDB/localStorage without bound — `data: z.string()` with no
   length cap is written straight to IndexedDB via `addPDF` (`usePreviewActions.ts:280-294`,
   `promotion-store.ts:703-714`), bypassing the 10MB upload cap that
   `validatePDFFile` enforces on the normal file-upload path.
2. Attach non-PDF bytes (HTML/script payloads) to customer-bound EML as
   `.pdf` — `emailUtils.ts:288-297` embeds whatever follows the comma as
   `application/pdf` based only on `parts[0].includes('base64')`.
3. Crash the PDF preview — `dataURLtoBlob` (`pdf-utils.ts:84-91`) calls
   `atob()` on the payload, which throws on invalid base64 (e.g. `%` chars);
   `openPreview` (`PDFAttachments.tsx:260-270`) calls it with no try/catch.

There is no validation boundary between an untrusted file and persisted
attachment state.

## Current state

`src/lib/promotion-config-schema.ts:179-199` — the lenient attachment schema:

```typescript
const attachedPDFSchema = z
  .object({
    id: z.string().catch(''),
    name: z.string().catch(''),
    size: z.coerce.number().catch(0),
    type: z.string().catch('application/pdf'),
    data: z.string().optional().catch(undefined),
  })
  .catch({ id: '', name: '', size: 0, type: 'application/pdf' });
```

`src/lib/pdf-utils.ts` — the size/type helpers that already exist and should
be reused:

```typescript
/** Maximum PDF file size in bytes (10MB) */
export const MAX_PDF_SIZE = 10 * 1024 * 1024;
// ...
/** Bytes represented by a base64 data URL's payload (accounts for padding). */
export function dataURLByteSize(dataURL: string): number { ... }  // line 38
// ...
export function dataURLtoBlob(dataURL: string): Blob {
  const byteCharacters = atob(dataURL.split(',')[1]);   // line 85 — throws on bad base64
  ...
}
```

`src/components/promotion/usePreviewActions.ts:280-294` — import writes
every entry with a string `data` to IndexedDB:

```typescript
const importedPDFs = (config.attachedPDFs ?? []).filter(
  (p) => typeof p.data === 'string'
);
if (importedPDFs.length > 0) {
  await store.clearAllPDFs();
  for (const p of importedPDFs) {
    await store.addPDF({ id: p.id, name: p.name, size: p.size, type: p.type, data: p.data });
  }
}
```

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test -- promotion-config-schema pdf-utils promotion-config` | all pass |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/promotion-config-schema.ts` — validate `data` in `attachedPDFSchema`
- `src/lib/pdf-utils.ts` — make `dataURLtoBlob` fail gracefully (return null
  or throw a typed error on invalid input)
- `src/components/promotion/PDFAttachments.tsx` — `openPreview` guards
- `src/components/promotion/usePreviewActions.ts` — skip invalid entries on import
- Tests: `tests/promotion-config-schema.test.ts` (create if absent; else add
  to the closest existing config test file), `tests/pdf-attachments-dnd.test.tsx`
  or `tests/pdf-and-subjects.test.tsx` for the preview guard

**Out of scope** (do NOT touch, even though they look related):
- `src/stores/promotion-store.ts` — the `addPDF`/`restoreState` persistence
  paths (restore validation is a separate concern; the import boundary is
  this plan).
- The EML attachment assembly (`emailUtils.ts`) — if the import boundary
  rejects non-PDF data, EML never sees it. (Do not change emailUtils here.)
- `amatl` / Rust side.

## Git workflow

- Branch: `advisor/004-validate-imported-pdf-data`
- Commit style: conventional commits, e.g.
  `fix(promotion): validate embedded PDF data on config import`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Validate `data` in the import schema

In `src/lib/promotion-config-schema.ts`, tighten `data` to require the PDF
data-URL prefix and cap the size. The schema module already imports from
`@/stores/promotion-store`; import `MAX_PDF_SIZE` and `dataURLByteSize` from
`@/lib/pdf-utils` (check for a circular-import risk: pdf-utils imports
`@tauri-apps/api/core` lazily inside the function body, so a static import
of pdf-utils from the schema module is safe — verify with `npm run typecheck`).

```typescript
const pdfDataURLSchema = z
  .string()
  .refine((s) => /^data:application\/pdf;base64,/.test(s), {
    message: 'must be a PDF data URL',
  })
  .refine((s) => dataURLByteSize(s) <= MAX_PDF_SIZE, {
    message: 'PDF data exceeds 10MB',
  })
  .optional()
  .catch(undefined);
```

Replace `data: z.string().optional().catch(undefined)` with
`data: pdfDataURLSchema`.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Make `dataURLtoBlob` fail gracefully

In `src/lib/pdf-utils.ts`, wrap the `atob` in a validation that returns
`null` on invalid base64 instead of throwing:

```typescript
export function dataURLtoBlob(dataURL: string): Blob | null {
  const match = /^data:([^,]*);base64,(.+)$/s.exec(dataURL);
  if (!match) return null;
  try {
    const byteCharacters = atob(match[2]);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteArray], { type: 'application/pdf' });
  } catch {
    return null;
  }
}
```

(If the regex `s` flag is unsupported in the repo's TS target, use
`[^]*` in place of `.` to match newlines.)

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Guard `openPreview`

In `src/components/promotion/PDFAttachments.tsx:260-270`, where `openPreview`
calls `dataURLtoBlob`, handle the null return with a toast/error state
instead of crashing:

```typescript
const blob = dataURLtoBlob(pdf.data);
if (!blob) {
  // show an error toast ("This PDF preview is unavailable — the file data is invalid")
  return;
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Skip invalid entries on import

In `src/components/promotion/usePreviewActions.ts:280-294`, the
`importedPDFs` filter already requires `typeof p.data === 'string'`. With
Step 1 in place, `parseAttachedPDFs` (which runs before this in the import
flow — verify the import path calls it) drops non-PDF/oversized `data`
fields. Confirm the import actually routes through `parseAttachedPDFs`; if
it does not (the import may read `config.attachedPDFs` directly), add the
same prefix/size check to the filter here so no invalid entry reaches
`addPDF`.

**Verify**: `grep -n "parseAttachedPDFs" src/lib/promotion-config.ts src/components/promotion/usePreviewActions.ts` → confirm the import path calls it; if not, the filter in Step 4 is the boundary.

### Step 5: Add tests

- Schema test: `parseAttachedPDFs` (or `validateImportConfig`) drops entries
  whose `data` is not a PDF data URL, drops oversized payloads, keeps valid
  small PDF data URLs, and keeps entries with no `data` (metadata-only).
- pdf-utils test: `dataURLtoBlob` returns `null` for non-data-URL strings,
  invalid base64 (e.g. `data:application/pdf;base64,%%%`), and a valid blob
  for a minimal `data:application/pdf;base64,JVBERi0xLjQK...` payload.
- Preview guard test: `openPreview` with invalid data shows an error instead
  of throwing (model after existing PDF attachment tests).

**Verify**: `npm test -- promotion-config-schema pdf-utils` → all pass,
including the new tests.

## Test plan

- New tests per Step 5, modeled after existing tests in
  `tests/pdf-attachments-dnd.test.tsx` and `tests/db.test.ts`.
- Existing config round-trip tests must still pass — valid exports with
  embedded PDFs must still import.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0; new tests for PDF-data validation exist and pass
- [ ] `grep -n "atob" src/lib/pdf-utils.ts` shows the call inside a
      try/catch (or removed)
- [ ] `grep -n "data: z.string()" src/lib/promotion-config-schema.ts` returns
      no matches (replaced by the refined schema)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 004 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The import path does not route through `parseAttachedPDFs` and adding the
  check to `usePreviewActions.ts` requires touching `promotion-store.ts`
  (report instead — the boundary moved).
- `dataURLtoBlob` has callers that depend on it throwing (search all callers
  first; if a caller expects a `Blob` and never handles `null`, that caller
  is now in scope — report it).
- A verification fails twice after a reasonable fix attempt.
- You discover a circular import between `promotion-config-schema.ts` and
  `pdf-utils.ts` that `npm run typecheck` cannot resolve (report the import
  graph instead of restructuring it).

## Maintenance notes

- The 10MB cap is now enforced in two places: upload (`validatePDFFile`) and
  import (`pdfDataURLSchema`). Keep both in sync with `MAX_PDF_SIZE`.
- If a future import format supports non-PDF attachments, extend
  `pdfDataURLSchema` to a per-type prefix map rather than weakening the PDF
  check.
- `dataURLByteSize` already accounts for base64 padding — trust it over
  `data.length` estimates.
