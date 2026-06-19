# Plan 007: PDFAttachments drag-and-drop (direct files + `file://` URI path) is covered by component tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c469626..HEAD -- src/components/promotion/PDFAttachments.tsx`
> If it changed since this plan was written, compare against the "Current state"
> excerpts before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001 (recommended — see note)
- **Category**: tests
- **Planned at**: commit `c469626`, 2026-06-17

> **Depends-on note**: Plan 001 adds a global drop guard but does **not** modify
> `PDFAttachments.tsx`, so these tests do not strictly require it. Do 001 first
> if both are queued, so the component's drop behavior is tested in its final
> context. If 001 is not done, proceed anyway — nothing here references it.

## Why this matters

`PDFAttachments.tsx` has the app's most intricate untested logic: the drop
handler parses three different drag payload shapes (direct `File` objects,
`text/uri-list`, `text/html`), converts `file://` URIs to OS paths with
per-platform handling (Windows drive-letter slicing), de-dupes by filename, and
invokes a Tauri command. This per-OS code path (~lines 132-206) is largely
unexercised by `tests/pdf-and-subjects.test.tsx`. A regression here breaks PDF
attachment on desktop with no test to catch it.

## Current state

`src/components/promotion/PDFAttachments.tsx` — the drop handler (lines 132-206),
abridged to the branches under test:

```tsx
const handleDrop = useCallback((e: DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);
  const dt = e.dataTransfer;

  // (A) Direct file drop
  const directFiles = Array.from(dt.files).filter(
    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  );
  if (directFiles.length > 0) { processFiles(directFiles); return; }

  // (B) file:// URIs from text/uri-list, else from text/html
  let fileUrls: string[] = [];
  const uriData = dt.getData('text/uri-list');
  if (uriData) {
    fileUrls = uriData.split('\n').map((u) => u.trim()).filter((u) => u.startsWith('file://'));
  }
  if (fileUrls.length === 0) {
    const htmlData = dt.getData('text/html');
    if (htmlData) {
      const matches = htmlData.match(/file:\/\/[^"<>\s]+/g);
      if (matches) fileUrls = matches;
    }
  }
  const pdfUrls = fileUrls.filter((u) => u.toLowerCase().endsWith('.pdf'));
  if (pdfUrls.length > 0) {
    (async () => {
      try {
        for (const uri of pdfUrls) {
          let filePath = decodeURIComponent(new URL(uri).pathname);
          if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1); // Windows
          const name = filePath.split(/[/\\]/).pop() || 'file.pdf';
          if (store.attachedPDFs.some((p) => p.name === name)) { toast.warning(`${name} is already attached`); continue; }
          const dataUrl = await invoke<string>('read_file_as_data_url', { path: filePath });
          const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
          const size = Math.floor(b64.length * 0.75);
          await persistPDF({ id: generatePdfId(), name, size, type: 'application/pdf', data: dataUrl });
          toast.success(`${name} attached successfully`);
        }
      } catch (err) { toast.error(`Failed to read dropped PDF: ${err}`); }
    })();
    return;
  }

  toast.error('Please drop only PDF files');
}, [processFiles, persistPDF, store]);
```

Things the test must stub:
- `@tauri-apps/api/core` `invoke` (the URI path calls
  `invoke('read_file_as_data_url', { path })`). Mock it like other component
  tests do — see `tests/pdf-and-subjects.test.tsx` for the existing Tauri/store
  mock setup and reuse it.
- The Zustand store: `usePromotionStore` provides `attachedPDFs`, `addPDF`,
  `removePDF`, `saveStatus`. `tests/pdf-and-subjects.test.tsx` already renders
  `PDFAttachments` with a working store — **start from that file's setup**.
- `validatePDFFile` / `readPDFAsDataURL` from `@/lib/pdf-utils` (direct-file path).
- `toast` from `sonner` — spy to assert success/warn/error messages.

Firing a drop in jsdom: build a synthetic `DataTransfer`-like object and dispatch
via `fireEvent.drop(dropZone, { dataTransfer })`. The drop zone element has
`role="button"` (`PDFAttachments.tsx:283`), so query it with
`screen.getByRole('button')` (or a more specific selector if multiple buttons
exist — scope with the upload text "Click to upload or drag and drop").

```ts
function makeDataTransfer(opts: {
  files?: File[];
  uriList?: string;
  html?: string;
}): DataTransfer {
  const data: Record<string, string> = {};
  if (opts.uriList) data['text/uri-list'] = opts.uriList;
  if (opts.html) data['text/html'] = opts.html;
  return {
    files: opts.files ?? [],
    getData: (t: string) => data[t] ?? '',
  } as unknown as DataTransfer;
}
```

## Commands you will need

| Purpose    | Command                                          | Expected on success |
|------------|--------------------------------------------------|---------------------|
| Install    | `npm ci`                                          | exit 0              |
| Typecheck  | `npm run typecheck`                               | exit 0              |
| This test  | `npx vitest run tests/pdf-attachments-dnd.test.tsx`| all pass            |
| All tests  | `npm test`                                        | all pass            |

## Scope

**In scope**:
- `tests/pdf-attachments-dnd.test.tsx` (create)

**Out of scope** (do NOT touch):
- `src/components/promotion/PDFAttachments.tsx` — test-only plan. If a test
  surfaces a real bug (e.g. a path-parsing edge case that's wrong), STOP and
  report it; do not change source here.
- `tests/pdf-and-subjects.test.tsx` — leave the existing file; add a new file.

## Git workflow

- Branch: `advisor/007-pdfattachments-dnd-tests`
- Conventional-commit style (e.g. `test(promotion): cover PDF drag-and-drop`).
- Do NOT push unless instructed.

## Steps

### Step 1: Scaffold from the existing test's setup

Create `tests/pdf-attachments-dnd.test.tsx`. Copy the mock/render setup from
`tests/pdf-and-subjects.test.tsx` (store reset, Tauri `invoke` mock, `sonner`
spy). Render `<PDFAttachments />` and grab the drop zone.

**Verify**: `npx vitest run tests/pdf-attachments-dnd.test.tsx` → the scaffold
(even with one trivial assertion) runs green.

### Step 2: Direct-file drop (branch A)

- Build a `File` with `type: 'application/pdf'`, name `flyer.pdf`. Mock
  `readPDFAsDataURL` to resolve a fake data URL and `validatePDFFile` to return
  `null` (valid).
- `fireEvent.drop(zone, { dataTransfer: makeDataTransfer({ files: [file] }) })`.
- Assert the store's `addPDF` (or the rendered attached list) gains `flyer.pdf`
  and a success toast fired. Use `await waitFor(...)` since processing is async.
- Add a case where a dropped non-PDF file (`type: 'text/plain'`, `notes.txt`) is
  filtered out and triggers the "Please drop only PDF files" error toast.

### Step 3: `file://` URI drop via `text/uri-list` (branch B), Linux/macOS

- `invoke.mockResolvedValue('data:application/pdf;base64,QUJD')` (`'ABC'`).
- Drop with `uriList: 'file:///home/user/report.pdf'`.
- Assert `invoke` was called with `{ path: '/home/user/report.pdf' }` and the
  attachment `report.pdf` was added (await).

### Step 4: Windows drive-letter path handling

- Drop with `uriList: 'file:///C:/Users/me/sale.pdf'`.
- Assert `invoke` was called with `{ path: 'C:/Users/me/sale.pdf' }` (leading
  slash stripped by the `^\/[A-Za-z]:` rule) and `sale.pdf` was added.

### Step 5: `text/html` fallback + de-dupe + error path

- With no `text/uri-list` but
  `html: '<a href="file:///home/user/a.pdf">a</a>'`, assert the URI is extracted
  and `invoke` called with `{ path: '/home/user/a.pdf' }`.
- De-dupe: pre-seed the store with an attachment named `a.pdf`, drop the same
  URI, assert a "already attached" warning toast and that `invoke` is **not**
  called for it.
- Error: `invoke.mockRejectedValue(new Error('nope'))`, drop a valid URI, assert
  the "Failed to read dropped PDF" error toast fires and no attachment is added.

### Step 6: Full gate

**Verify**: `npm run typecheck && npm run lint && npm test` → all exit 0.

## Test plan

- New file `tests/pdf-attachments-dnd.test.tsx` covering branches A (direct
  file, valid + invalid), B (uri-list Linux/macOS, Windows drive letter,
  text/html fallback), de-dupe, and invoke-error. ~7-8 cases.
- Structural pattern: `tests/pdf-and-subjects.test.tsx` (render + store + Tauri
  mock).
- Verification: `npx vitest run tests/pdf-attachments-dnd.test.tsx` → all pass.

## Done criteria

ALL must hold:
- [ ] `tests/pdf-attachments-dnd.test.tsx` exists and covers direct-file, uri-list (incl. Windows path), text/html fallback, de-dupe, and invoke-error
- [ ] `npx vitest run tests/pdf-attachments-dnd.test.tsx` passes
- [ ] `npm run typecheck && npm run lint && npm test` all exit 0
- [ ] `src/components/promotion/PDFAttachments.tsx` unchanged (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- The drop handler no longer matches the "Current state" excerpt.
- A test exposes a genuine bug in path parsing or de-dupe — report it; do not
  fix source in this plan.
- jsdom cannot dispatch a usable `drop` with the synthetic `dataTransfer` after
  two reasonable attempts — report the blocker.

## Maintenance notes

- If the `file://` → path conversion logic changes (e.g. handling UNC paths or
  spaces), update Steps 3-5 to match.
- Reviewer should confirm the Windows-path assertion (Step 4) matches the
  `^\/[A-Za-z]:` slice rule, the most fragile line in the handler.
- If Plan 001 (global drop guard) lands after this, re-run this file to confirm
  the guard doesn't interfere with the component-level drop (it should not).
