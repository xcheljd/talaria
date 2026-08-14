# Plan 010: Add tests for the Tauri IPC save/read/optimize commands

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- src-tauri/src/lib.rs src-tauri/Cargo.toml`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

The desktop app's core file path — the Tauri IPC save/read commands — has
zero tests. The `#[cfg(test)]` module in `lib.rs` covers only pure helpers
(`is_safe_filename`, `has_pdf_extension`, `validate_readable_pdf`). The
actual commands `read_file_as_data_url`, `save_file_to_path`,
`save_file_to_dir`, `save_file_as`, and `amatl_optimize` — the
base64-decode → `fs::write`/`fs::read` bodies — are untested. A regression
in write/read behavior (wrong file mode, broken decode, path handling) on
the desktop download path — the app's reason to exist — is caught only by
manual QA. This is also high-churn territory (5 amatl perf commits in the
last 15).

## Current state

`src-tauri/src/lib.rs` — commands and test module:

- `read_file_as_data_url` (~line 122) — canonicalizes + re-checks `.pdf`
  extension + `is_file` + 25MB cap, then base64-encodes the file
- `save_file_to_path` (~line 197) — validates filename, writes base64-decoded
  bytes to an explicit path
- `save_file_to_dir` (~line 232) — resolves the configured download dir,
  then writes
- `save_file_as` (~line 274) — uses the OS save dialog
- `amatl_optimize` (~line 333) — base64-decodes, calls amatl, re-encodes
- `#[cfg(test)] mod tests` (~line 381-489) — currently tests only the pure
  helpers

The commands are plain functions (Tauri commands are just async fns taking
`app`/`window` handles), so the bodies can be exercised directly with
`temp_dir()` fixtures — no webview needed.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Rust tests | `cargo test --manifest-path src-tauri/Cargo.toml` | exit 0, all pass |
| Clippy    | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | exit 0 |
| Format    | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | exit 0 |

> **Build note**: mozjpeg compiles libjpeg-turbo, which needs NASM and a C
> compiler/cmake — already present in this dev environment per prior plans.
> If `cargo test` fails to *compile* with an error from
> `tauri::generate_context!()` about a missing frontend `dist` directory,
> create the same stub CI uses and retry:
> `mkdir -p dist && printf '<!doctype html><title>ci</title>' > dist/index.html`
> (`dist/` is a build artifact, not source — do not commit it).

## Scope

**In scope** (the only files you should modify):
- `src-tauri/src/lib.rs` — add tests to the existing `#[cfg(test)]` module;
  extract small free functions if needed for testability (e.g. the
  decode-and-write body)

**Out of scope** (do NOT touch, even though they look related):
- `src-tauri/src/amatl.rs` — has its own 23 tests; not part of this plan.
- `src-tauri/src/main.rs` — the entry point.
- `src/lib/file-save.ts` / `src/lib/pdf-utils.ts` — the TS side.
- The actual command signatures/behavior — tests only, no production changes
  unless extraction is strictly needed (see STOP conditions).

## Git workflow

- Branch: `advisor/010-tauri-ipc-tests`
- Commit style: conventional commits, e.g.
  `test(tauri): cover the save/read/optimize IPC commands`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read the command bodies and the test module

Read `src-tauri/src/lib.rs:110-489` fully. Identify which commands can be
called directly in tests (those that take `app: AppHandle` need a Tauri app
handle — check whether the tests can construct one with
`tauri::test::mock_app()` or whether the body is extractable into a free
function that takes plain args).

**Verify**: you can name, for each command, whether it's testable directly
or needs extraction.

### Step 2: Extract testable bodies (only if needed)

If a command's body mixes `AppHandle` plumbing with the file logic, extract
the file logic into a free function (private, same module) that tests can
call directly — e.g.:

```rust
fn write_base64_to_path(base64_data: &str, path: &Path) -> Result<(), String> { ... }
fn read_file_as_base64(path: &Path, max_bytes: u64) -> Result<String, String> { ... }
```

Keep the command functions as thin wrappers. Do NOT change command
signatures (the TS side depends on them).

**Verify**: `cargo test --manifest-path src-tauri/Cargo.toml` still compiles
(no production behavior change yet).

### Step 3: Add tests

In the `#[cfg(test)] mod tests` block in `lib.rs`, using `std::env::temp_dir()`
+ a unique subdir per test (create with `std::fs::create_dir_all`, clean up
in the test or leave to the OS temp cleaner):

1. **`save_file_to_dir` happy path**: write bytes to a temp dir via the
   command (or its extracted body), assert the file exists and its contents
   match the decoded input.
2. **Unsafe filename rejection**: a filename containing `/`, `\`, or `..`
   is rejected (assert the error return).
3. **Missing-dir behavior**: saving into a non-existent dir returns an error
   (or creates it — assert the actual documented behavior).
4. **`read_file_as_data_url` happy path**: write a small PDF-ish file to
   temp, read it back, assert the data URL prefix and base64 round-trip.
5. **`read_file_as_data_url` over-limit rejection**: a file larger than
   `MAX_READ_BYTES` is rejected.
6. **`amatl_optimize` fail-safe passthrough on garbage input**: feed a
   non-PDF / garbage base64 payload, assert the original is returned (the
   documented fail-safe contract).

Model the test style on the existing helper tests in the module (they
already exist at `lib.rs:381-489`).

**Verify**: `cargo test --manifest-path src-tauri/Cargo.toml` → all pass,
including the new tests.

### Step 4: Lint and format

`cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
→ exit 0. `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` →
exit 0 (run `cargo fmt` first if it fails).

**Verify**: both commands pass.

## Test plan

- New tests per Step 3 — happy paths, rejection paths, and the fail-safe
  passthrough. Model after the existing helper tests in the module.
- Existing amatl tests (`cargo test`) must still pass — no production
  behavior changes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` exits 0; the new
      IPC-command tests exist and pass
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` exits 0
- [ ] `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` exits 0
- [ ] Command signatures are unchanged (verify with `git diff --stat` — no
      `src/lib/*.ts` changes)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 010 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Constructing a real `AppHandle` for the commands requires Tauri test
  infrastructure that isn't available (report which commands can't be
  tested directly, and which bodies were extracted instead).
- A command's behavior (e.g. missing-dir handling) is ambiguous — assert
  only what the code clearly does; do not "fix" behavior to match a guess.
- A verification fails twice after a reasonable fix attempt.
- The extraction in Step 2 requires changing a command's public signature —
  report instead (the TS side pins those signatures).

## Maintenance notes

- The 5 amatl perf commits show this file churns; the new tests are the
  regression net for the next refactor.
- When the amatl crate is extracted (roadmap), `amatl_optimize` becomes a
  thin wrapper over the external crate — its fail-safe test should survive
  the extraction unchanged.
- `save_file_as` (OS dialog) is intentionally not unit-tested (native UI);
  note that in the test module comment so nobody adds a flaky test for it.
