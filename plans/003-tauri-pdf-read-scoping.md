# Plan 003: `read_file_as_data_url` enforces the safety guarantee its own comment claims (scoped, not "any PDF on disk")

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c469626..HEAD -- src-tauri/src/lib.rs src/components/promotion/PDFAttachments.tsx`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c469626`, 2026-06-17

## Why this matters

The Tauri command `read_file_as_data_url` is documented as preventing the
webview from reading arbitrary files:

> "Restricted to `.pdf` files under `MAX_READ_BYTES` so the webview can't ask
> the backend to read arbitrary files off disk." (`src-tauri/src/lib.rs:91-93`)

But the implementation only checks the **extension** and **size** — it does not
constrain the **path**. Any caller in the webview can read **any `.pdf` anywhere
on disk** (e.g. another user's documents) and receive its bytes as base64. This
is a defense-in-depth gap and, separately, the comment overstates the guarantee
(decision-drift between the doc and the code). The sibling write command
`save_file_to_dir` already scopes its target (`lib.rs:125-130`); this command
should be at least as careful, or the comment must be corrected to match
reality.

Impact is bounded (PDF-only, base64-returned, and reaching the command requires
script execution in a CSP-locked webview), so this is LOW/MED severity — but the
fix is small and the existing Rust test harness makes verification clean.

## Current state

`src-tauri/src/lib.rs` relevant pieces:

```rust
/// Reject filenames that could escape the configured download directory.
fn is_safe_filename(filename: &str) -> bool {              // lib.rs:16
    !filename.is_empty()
        && !filename.contains('/')
        && !filename.contains('\\')
        && !filename.contains("..")
}

fn has_pdf_extension(path: &str) -> bool {                 // lib.rs:24
    path.to_lowercase().ends_with(".pdf")
}

/// Read a local PDF and return its contents as a base64 data URL.
/// Restricted to `.pdf` files under `MAX_READ_BYTES` so the webview can't ask
/// the backend to read arbitrary files off disk.
#[tauri::command]
fn read_file_as_data_url(path: String) -> Result<String, String> {  // lib.rs:94
    use base64::{engine::general_purpose::STANDARD, Engine};

    if !has_pdf_extension(&path) {
        return Err(format!("Refusing to read non-PDF file: {path}"));
    }

    let metadata = fs::metadata(&path).map_err(|e| format!("Failed to read {path}: {e}"))?;
    if metadata.len() > MAX_READ_BYTES {
        return Err(format!(
            "File too large to read ({} bytes, max {MAX_READ_BYTES})",
            metadata.len()
        ));
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read {path}: {e}"))?;
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:application/pdf;base64,{b64}"))
}
```

There is an existing Rust unit-test module at the bottom of `lib.rs:162-190`
(`#[cfg(test)] mod tests`) with helper-level tests like `only_pdf_paths_are_readable`.
**Match that style** — add pure helper functions and test them there; do not try
to test the `#[tauri::command]` (it needs an `AppHandle`).

**The legitimate caller** is the drag-and-drop attach flow:
`src/components/promotion/PDFAttachments.tsx:181-183`:

```tsx
const dataUrl = await invoke<string>('read_file_as_data_url', {
  path: filePath,
});
```

`filePath` is an absolute OS path the user just dragged in (`file://` URI →
path, see `PDFAttachments.tsx:170-174`). **This is a user-initiated, arbitrary
location** (the user can drag a PDF from anywhere they have access). So a pure
"must live under the download dir" scope would break the feature. The correct
hardening here is **path normalization + canonicalization + symlink/`..`
rejection + confirming it resolves to a regular file with a real `.pdf`
extension** — not confining to one directory. See Step 1.

## Commands you will need

| Purpose           | Command                                            | Expected on success |
|-------------------|----------------------------------------------------|---------------------|
| Rust tests        | `cd src-tauri && cargo test`                        | all pass, exit 0    |
| Rust build check  | `cd src-tauri && cargo check`                       | exit 0              |
| Rust lint (if set)| `cd src-tauri && cargo clippy 2>/dev/null \|\| true` | no new errors       |
| App typecheck     | `npm run typecheck`                                 | exit 0 (unchanged)  |

> Note: building Tauri natively requires the Rust toolchain. `cargo test`
> compiles only the lib crate's unit tests, which is enough here. If `cargo` is
> unavailable in the environment, this is a STOP condition — report it.

## Scope

**In scope**:
- `src-tauri/src/lib.rs` — add a path-safety helper, call it in
  `read_file_as_data_url`, correct the doc comment, and add unit tests.

**Out of scope** (do NOT touch):
- `src/components/promotion/PDFAttachments.tsx` — the caller is correct; the
  guarantee belongs in the backend. Do not change the call site.
- `save_file_to_dir` / `is_safe_filename` — leave the write path as-is.
- `src-tauri/tauri.conf.json` / capabilities — not part of this fix.

## Git workflow

- Branch: `advisor/003-tauri-pdf-read-scoping`
- Conventional-commit style (e.g. `fix(tauri): scope read_file_as_data_url …`).
- Do NOT push unless instructed.

## Steps

### Step 1: Add a path-safety helper

Add a helper that takes the requested path and returns a validated, canonical
`PathBuf` or an error. Requirements:
- Reject empty paths.
- Reject paths whose canonicalized form does not end in `.pdf` (case-insensitive).
- `fs::canonicalize` the path (this also resolves `..` and symlinks and fails if
  the file does not exist). Use the canonical path for the subsequent metadata
  and read calls.
- Reject if the canonical target is not a regular file (`metadata.is_file()`).

Target shape (adapt names to match the file's style):

```rust
/// Validate a path the webview asked us to read: it must point at an existing,
/// regular `.pdf` file. Canonicalization collapses `..` and resolves symlinks,
/// so a crafted path can't smuggle the read somewhere unexpected.
fn validate_readable_pdf(path: &str) -> Result<PathBuf, String> {
    if path.is_empty() {
        return Err("Empty path".to_string());
    }
    if !has_pdf_extension(path) {
        return Err(format!("Refusing to read non-PDF file: {path}"));
    }
    let canonical = fs::canonicalize(path)
        .map_err(|e| format!("Failed to resolve {path}: {e}"))?;
    if !has_pdf_extension(&canonical.to_string_lossy()) {
        return Err(format!("Refusing to read non-PDF file: {path}"));
    }
    let meta = fs::metadata(&canonical)
        .map_err(|e| format!("Failed to read {path}: {e}"))?;
    if !meta.is_file() {
        return Err(format!("Not a regular file: {path}"));
    }
    Ok(canonical)
}
```

### Step 2: Use the helper and correct the comment

Rewrite `read_file_as_data_url` to call `validate_readable_pdf`, then apply the
existing size check against the canonical path, then read. **Correct the doc
comment** so it states the real guarantee — e.g.:

```rust
/// Read a local PDF and return its contents as a base64 data URL. The path is
/// canonicalized and must resolve to an existing regular `.pdf` file under
/// `MAX_READ_BYTES`. This supports the drag-and-drop attach flow, where the
/// user supplies the file location; it does not let the webview read non-PDF
/// files or traverse via `..`/symlinks to a non-PDF target.
#[tauri::command]
fn read_file_as_data_url(path: String) -> Result<String, String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let canonical = validate_readable_pdf(&path)?;

    let metadata = fs::metadata(&canonical).map_err(|e| format!("Failed to read {path}: {e}"))?;
    if metadata.len() > MAX_READ_BYTES {
        return Err(format!(
            "File too large to read ({} bytes, max {MAX_READ_BYTES})",
            metadata.len()
        ));
    }

    let bytes = fs::read(&canonical).map_err(|e| format!("Failed to read {path}: {e}"))?;
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:application/pdf;base64,{b64}"))
}
```

**Verify**: `cd src-tauri && cargo check` → exit 0.

### Step 3: Add unit tests in the existing `mod tests`

Extend `#[cfg(test)] mod tests` (lib.rs:162) with tests for
`validate_readable_pdf` using a temp directory (`std::env::temp_dir()` + a
unique subdir, or the `tempfile` crate only if it is already a dev-dependency —
check `src-tauri/Cargo.toml`; if not present, use `std::env::temp_dir()` and
clean up). Cover:
1. A real `.pdf` file under temp resolves Ok and the returned path exists.
2. A non-`.pdf` path is rejected before any filesystem access.
3. A non-existent `.pdf` path returns Err (canonicalize fails).
4. A path to a directory named `something.pdf` is rejected (`is_file()` false).
5. The empty string is rejected.

Keep the existing `rejects_path_traversal_filenames`, `accepts_plain_download_filenames`,
and `only_pdf_paths_are_readable` tests intact.

**Verify**: `cd src-tauri && cargo test` → all pass (existing + new).

### Step 4: Confirm the frontend is unaffected

**Verify**: `npm run typecheck` → exit 0 (no frontend change was needed).

## Test plan

- New Rust unit tests in `src-tauri/src/lib.rs` `mod tests` (5 cases above),
  modeled on the existing `only_pdf_paths_are_readable` test already in that file.
- Verification: `cd src-tauri && cargo test` → all pass.

## Done criteria

ALL must hold:
- [ ] `validate_readable_pdf` (or equivalently-named helper) exists and is called by `read_file_as_data_url`
- [ ] The doc comment no longer claims a guarantee the code doesn't enforce
- [ ] `cd src-tauri && cargo test` passes (existing + ≥5 new tests)
- [ ] `cd src-tauri && cargo check` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] Only `src-tauri/src/lib.rs` changed (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `cargo` is not available in the environment (cannot compile/test Rust).
- The live `read_file_as_data_url` differs from the "Current state" excerpt.
- Canonicalization breaks the drag-and-drop attach flow in a way you can observe
  (e.g. a legitimate path the frontend sends would now be rejected) — report
  before shipping. (It should not: the frontend sends a real absolute path to an
  existing file.)
- You discover `tempfile` is needed but adding a dev-dependency is required —
  prefer `std::env::temp_dir()`; only add a dep if truly unavoidable, and report it.

## Maintenance notes

- If a future feature needs to read non-PDF files (e.g. images), extend
  `validate_readable_pdf` into an allowlist of extensions rather than dropping
  the check.
- Reviewer should confirm canonicalization happens **before** the size/read and
  that all three filesystem calls use the canonical path, not the raw input.
- This pairs conceptually with the CSP and `is_safe_filename` write-path guard;
  keep the read and write paths symmetric in future audits.
