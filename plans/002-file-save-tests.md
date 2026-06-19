# Plan 002: `saveBlob` (the single download chokepoint) has direct unit tests for both the Tauri and browser branches

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c469626..HEAD -- src/lib/file-save.ts`
> If `file-save.ts` changed since this plan was written, compare the
> "Current state" excerpt against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `c469626`, 2026-06-17

## Why this matters

Every download in the app — single EML, full-HTML, bulk BCC batches, PDF
re-download — routes through `saveBlob()` in `src/lib/file-save.ts`. It has two
branches (Tauri desktop vs browser anchor) and **no dedicated test** today
(only an indirect mock inside `tests/bulk-email-generation.test.ts`). A
regression in either branch silently breaks all downloads with nothing to catch
it. This adds a focused unit test so the chokepoint is verified.

## Current state

`src/lib/file-save.ts` (full file, 52 lines):

```ts
import { invoke, isTauri } from '@tauri-apps/api/core';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function saveBlob(
  blob: Blob,
  filename: string
): Promise<string | null> {
  if (isTauri()) {
    const buffer = await blob.arrayBuffer();
    const dataBase64 = arrayBufferToBase64(buffer);
    const savedPath = await invoke<string>('save_file_to_dir', {
      filename,
      dataBase64,
    });
    return savedPath;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return null;
}
```

Behavior to pin down:
- **Browser branch** (`isTauri()` false): creates an object URL, creates an `<a>`
  with `download = filename`, appends it, clicks it, removes it, revokes the
  URL, returns `null`.
- **Tauri branch** (`isTauri()` true): reads the blob to an ArrayBuffer,
  base64-encodes it, calls `invoke('save_file_to_dir', { filename, dataBase64 })`,
  returns whatever path the invoke resolves to.

The module to mock is `@tauri-apps/api/core` (named exports `invoke`, `isTauri`).
Existing tests already mock Tauri this way — see how `tests/bulk-email-generation.test.ts`
and component tests stub it; reuse the same `vi.mock('@tauri-apps/api/core', …)`
pattern.

Test conventions: tests live in `tests/`, Vitest + jsdom, import app code via
the `@/` alias (`@/lib/file-save`). See any file under `tests/` for the
`import { describe, it, expect, vi, beforeEach } from 'vitest'` header.

## Commands you will need

| Purpose   | Command                                   | Expected on success |
|-----------|-------------------------------------------|---------------------|
| Install   | `npm ci`                                  | exit 0              |
| Typecheck | `npm run typecheck`                       | exit 0              |
| One test  | `npx vitest run tests/file-save.test.ts`  | all pass            |
| All tests | `npm test`                                | all pass            |

## Scope

**In scope** (only this file):
- `tests/file-save.test.ts` (create)

**Out of scope** (do NOT touch):
- `src/lib/file-save.ts` — this is a test-only plan; do not change source.
  If you believe the source has a bug, STOP and report it rather than editing.

## Git workflow

- Branch: `advisor/002-file-save-tests`
- Conventional-commit style (e.g. `test(file-save): …`).
- Do NOT push unless instructed.

## Steps

### Step 1: Create the test file with both branches mocked

Create `tests/file-save.test.ts`. Mock `@tauri-apps/api/core` so each test can
flip `isTauri` and assert on `invoke`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const isTauri = vi.fn();
const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => isTauri(),
  invoke: (...args: unknown[]) => invoke(...args),
}));

import { saveBlob } from '@/lib/file-save';

beforeEach(() => {
  vi.clearAllMocks();
});
```

### Step 2: Browser-branch tests

With `isTauri.mockReturnValue(false)`:
- Spy on `URL.createObjectURL` (return a fake `'blob:fake'`) and
  `URL.revokeObjectURL`. jsdom may not implement these — define them with
  `vi.stubGlobal` / `Object.defineProperty(URL, …)` or assign
  `URL.createObjectURL = vi.fn(() => 'blob:fake')`.
- Spy on `HTMLAnchorElement.prototype.click` with `vi.fn()` (jsdom anchors don't
  trigger navigation, but `click` exists; spy to assert it was called).
- Call `await saveBlob(new Blob(['hi'], { type: 'text/plain' }), 'out.eml')`.
- Assert: returns `null`; `URL.createObjectURL` called once with the blob;
  anchor `click` called once; `URL.revokeObjectURL` called once with
  `'blob:fake'`; `invoke` **not** called.
- Assert the created anchor had `download === 'out.eml'`. Capture it by spying on
  `document.createElement` for `'a'`, or by asserting on the appended element via
  a `document.body.appendChild` spy — pick whichever is cleanest; the simplest is
  to spy `document.createElement` and inspect the returned element's `download`.

### Step 3: Tauri-branch tests

With `isTauri.mockReturnValue(true)` and
`invoke.mockResolvedValue('/Users/me/Downloads/out.eml')`:
- Call `await saveBlob(new Blob(['hi']), 'out.eml')`.
- Assert: returns `'/Users/me/Downloads/out.eml'`; `invoke` called once with
  `'save_file_to_dir'` and an object whose `filename === 'out.eml'` and whose
  `dataBase64` is a non-empty base64 string; the browser anchor path was **not**
  taken (`URL.createObjectURL` not called).
- Add one test that `invoke.mockRejectedValue(new Error('disk full'))` causes
  `saveBlob` to reject (propagates) — `await expect(saveBlob(...)).rejects.toThrow('disk full')`.

### Step 4: Base64 correctness for a larger blob

- With the Tauri branch, pass a blob built from a `Uint8Array` of length ~70000
  (exceeds the 0x8000 chunk size) so the chunked `arrayBufferToBase64` loop runs
  more than once. Decode the captured `dataBase64` with `atob` and assert the
  byte length round-trips to the original length. This guards the chunking loop.

### Step 5: Full gate

**Verify**: `npm run typecheck && npm test` → exit 0; new file passes.

## Test plan

- New file `tests/file-save.test.ts`: browser branch (happy path + correct
  `download`/revoke), Tauri branch (happy path + invoke args + rejection
  propagation), and the large-blob base64 round-trip.
- Structural pattern: model the mock + `describe/it` layout on
  `tests/ui-utils.ts`-style pure tests and the Tauri mock used in
  `tests/bulk-email-generation.test.ts`.
- Verification: `npx vitest run tests/file-save.test.ts` → all pass (expect ~6
  tests).

## Done criteria

ALL must hold:
- [ ] `tests/file-save.test.ts` exists with both Tauri and browser branches covered
- [ ] `npx vitest run tests/file-save.test.ts` passes
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0
- [ ] `src/lib/file-save.ts` is unchanged (`git diff --stat` shows only the test file)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `file-save.ts` no longer matches the "Current state" excerpt.
- jsdom cannot be made to support the anchor/URL spies after two reasonable
  approaches — report the blocker rather than rewriting `saveBlob`.
- A test reveals an actual behavioral bug in `saveBlob` — report it; do not fix
  source in this plan.

## Maintenance notes

- If `saveBlob` ever gains a third target (e.g. a Web Share or File System
  Access path), add a branch test here.
- Reviewer should confirm the Tauri mock is reset between tests
  (`vi.clearAllMocks` in `beforeEach`) so branch state doesn't leak.
