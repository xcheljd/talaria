# Plan 001: Dropping a file anywhere outside the PDF drop zone no longer replaces the app with the file

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c469626..HEAD -- src/App.tsx src/hooks src/components/promotion/PDFAttachments.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c469626`, 2026-06-17

## Why this matters

When a user drags a PDF (or any file) and drops it **anywhere except** the small
PDF Attachments drop zone, the browser/webview's default action navigates the
whole window to that file (`file://…` or the file's blob), so the file viewer
**replaces the entire app** and the user loses their in-progress work view. This
is reported as "the PDF takes over the entire viewport of the whole app."

The cause: the only `preventDefault` for drag/drop lives on the PDFAttachments
drop zone element (`PDFAttachments.tsx:122-135`). There is **no
window/document-level guard**, so a drop outside that element hits the default
handler. This affects both the web build and the Tauri desktop build, because
the Tauri window is configured with `dragDropEnabled: false`
(`src-tauri/tauri.conf.json:22`), which means the webview receives standard
HTML5 drag-and-drop events just like a browser.

After this plan: a file dropped outside any registered drop zone is swallowed
(no navigation), the app stays put, and the user optionally sees a gentle hint
to use the attachment area.

## Current state

- `src/App.tsx` — top-level component; composes providers
  (`ThemeProvider` → `ProfileProvider` → `TooltipProvider`) and the router.
  No global event effects today. This is where the guard hook will be mounted.
- `src/components/promotion/PDFAttachments.tsx` — the only legitimate file drop
  target. Its handlers call `e.preventDefault()` on `dragover`/`drop`:

  ```tsx
  // PDFAttachments.tsx:122-135
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  ...
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dt = e.dataTransfer;
    ...
  ```

  This element handler runs during the **bubbling** phase before a
  window-level bubbling listener, and it does **not** call `stopPropagation`.
  A window listener added with default options (bubbling phase) will therefore
  run *after* the drop zone has already read `dataTransfer`, so adding one does
  **not** break the attachment flow — it only calls `preventDefault` a second
  time, which is a no-op.

- Repo conventions for global effects: small focused hooks under `src/hooks/`
  (see `src/hooks/useTauri.ts`) and page-level effect hooks under feature
  folders (see `src/components/promotion/promotion-page-hooks.ts`, which uses
  `useEffect` + cleanup and a leading JSDoc comment). Match that style: a
  documented hook, `useEffect` with a cleanup that removes every listener.
- Toast convention: `import { toast } from 'sonner'`; deduped toasts pass an
  `id` (see `promotion-page-hooks.ts:64-66` using `{ id: 'promo-save-warning' }`).

## Commands you will need

| Purpose   | Command                                   | Expected on success |
|-----------|-------------------------------------------|---------------------|
| Install   | `npm ci`                                  | exit 0              |
| Typecheck | `npm run typecheck`                       | exit 0, no errors   |
| Lint      | `npm run lint`                            | exit 0              |
| One test  | `npx vitest run tests/drop-guard.test.ts` | all pass            |
| All tests | `npm test`                                | all pass            |

## Scope

**In scope** (the only files you should modify or create):
- `src/hooks/useGlobalDropGuard.ts` (create)
- `src/App.tsx` (mount the hook)
- `tests/drop-guard.test.ts` (create)

**Out of scope** (do NOT touch):
- `src/components/promotion/PDFAttachments.tsx` — its drop handling already
  works and must keep working; do not add `stopPropagation` there.
- `src-tauri/tauri.conf.json` — leave `dragDropEnabled: false`. Switching it to
  `true` changes the whole desktop drop model and is a different design.
- The TipTap editor image drop/paste behavior in
  `src/components/promotion/newsletter/extensions.ts` — that editor handles its
  own drops; the guard must not interfere (see Step 1 design note).

## Git workflow

- Branch: `advisor/001-global-drop-guard`
- Conventional-commit style (match `git log`, e.g. `fix(dnd): …`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the global drop-guard hook

Create `src/hooks/useGlobalDropGuard.ts`. It attaches `dragover` and `drop`
listeners to `window` that call `preventDefault()` so the browser/webview never
navigates away when a file is dropped outside a registered drop zone.

Design requirements:
- Attach on mount, remove on unmount (cleanup), to avoid duplicate listeners.
- Use the **bubbling** phase (default `addEventListener`, no `capture: true`) so
  element-level drop handlers (PDFAttachments, TipTap editor) still receive and
  process the event first.
- On `drop`, only act when the drag actually carried files. Check
  `e.dataTransfer?.types?.includes('Files')`. If it did **not** carry files
  (e.g. an internal text/HTML drag inside the rich-text editor or a dnd-kit
  sortable drag), return without preventing default.
- Optional gentle UX: when a file drop reaches `window` (i.e. it was dropped
  outside a registered zone — detectable because if a zone handled it, that
  handler ran but the event still bubbles, so we cannot tell from bubbling
  alone). To keep this simple and avoid a misleading toast on legitimate drops,
  do **not** show a toast in this step. (A smarter "dropped outside the zone"
  hint is deferred — see Maintenance notes.)

Target shape:

```ts
/**
 * Prevent the browser/webview from navigating to a file when the user drops it
 * outside a registered drop zone. Without this, a stray PDF drop replaces the
 * whole app with the file viewer. Element-level drop handlers (PDF attachments,
 * the rich-text editor) still run first because this listens on the bubbling
 * phase and only prevents the browser default.
 */
import { useEffect } from 'react';

export function useGlobalDropGuard(): void {
  useEffect(() => {
    const carriesFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');

    const onDragOver = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (carriesFiles(e)) e.preventDefault();
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Mount the hook in App

In `src/App.tsx`, import and call `useGlobalDropGuard()` at the top of the `App`
component body (before the `return`). It takes no arguments and renders nothing.

**Verify**: `npm run typecheck` → exit 0, and `npm run lint` → exit 0.

### Step 3: Add a regression test

Create `tests/drop-guard.test.ts` (a plain unit test — no React render needed;
the hook's effect can be exercised by rendering a trivial component, OR test the
listener behavior directly). Use the existing test style in `tests/` (Vitest,
`import { describe, it, expect, vi } from 'vitest'`). Render a component that
calls the hook with `@testing-library/react` `render`, then dispatch a
`DragEvent` on `window` and assert `defaultPrevented`.

jsdom note: jsdom does not implement `DragEvent` with a real `dataTransfer`.
Construct the event and attach a stub `dataTransfer`:

```ts
import { render } from '@testing-library/react';
import { useGlobalDropGuard } from '@/hooks/useGlobalDropGuard';

function Harness() {
  useGlobalDropGuard();
  return null;
}

function fileDrop(type: 'drop' | 'dragover') {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', {
    value: { types: ['Files'] },
  });
  return ev as unknown as DragEvent;
}
```

Tests to write:
1. A `drop` carrying files dispatched on `window` is `defaultPrevented`.
2. A `dragover` carrying files is `defaultPrevented`.
3. A `drop` whose `dataTransfer.types` is `['text/plain']` (no files) is **not**
   prevented (so internal editor/sortable drags are untouched).
4. After unmount, a file `drop` on `window` is **not** prevented (listeners are
   cleaned up). Use `render(...).unmount()`.

**Verify**: `npx vitest run tests/drop-guard.test.ts` → all 4 pass.

### Step 4: Full gate

**Verify**: `npm run typecheck && npm run lint && npm test` → all exit 0, full
suite green (existing tests unaffected).

## Test plan

- New file `tests/drop-guard.test.ts`, 4 cases above. Model the structure after
  an existing hook/behavior test such as `tests/theme.test.tsx` (uses `render`
  + assertions) — match its imports and `describe/it` layout.
- Manual confirmation (optional, document result if you run the app): start
  `npm run dev`, open `/promotion`, drag a PDF onto the header/sidebar (NOT the
  attachment card) — the app must stay; nothing navigates. Drop a PDF onto the
  attachment card — it still attaches.

## Done criteria

ALL must hold:

- [ ] `src/hooks/useGlobalDropGuard.ts` exists and is called once in `src/App.tsx`
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npx vitest run tests/drop-guard.test.ts` passes all 4 cases
- [ ] `npm test` exits 0 (no existing test regressed)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:
- `src/App.tsx` no longer matches the provider structure in "Current state"
  (drifted since this plan was written).
- Adding the global `drop` listener breaks an existing test that exercises
  PDFAttachments or the newsletter editor drop/paste — that means an element
  handler relied on the default action; report which test and stop.
- You find an existing window/document-level drag listener already present
  (search `window.addEventListener('drop'` / `'dragover'`) — reconcile, don't
  add a duplicate; report what you found.

## Maintenance notes

- If a second legitimate drop zone is added later (e.g. drag images into the
  newsletter), confirm its element handler runs in the bubbling phase before
  this guard (it will, since the guard is on `window`) and that it carries
  `dataTransfer.types` including `'Files'`.
- Deferred: a friendly "Drop PDFs in the Attachments area" toast specifically
  when a file is dropped *outside* a zone. Doing that reliably needs the drop
  zone to mark events as handled (e.g. set a flag on the event or call a shared
  ref); it was left out here to avoid false-positive toasts on valid drops.
- Reviewer should confirm the cleanup removes both listeners (no leak across
  hot-reload / route changes).
