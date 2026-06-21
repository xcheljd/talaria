# Plan 010: Make the optimizer's fail-safe contract hold on panics

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 63e4c47..HEAD -- src-tauri/src/amatl.rs`
> If `src-tauri/src/amatl.rs` changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (independent of plan 009; both touch `amatl.rs` but
  different functions — if doing both, do 009 first to keep diffs clean)
- **Category**: security
- **Planned at**: commit `63e4c47`, 2026-06-20

## Why this matters

`amatl` optimizes **arbitrary user-supplied PDFs** (the drag-and-drop attachment
flow). Its documented contract, repeated in the module header and in
`src-tauri/src/AGENTS.md`, is: *"Any failure (parse, decode, save) falls back to
the original bytes."* The public entry point enforces this only for `Result::Err`:

```rust
pub fn optimize_with_options(input: &[u8], options: OptimizeOptions) -> Vec<u8> {
    match try_optimize(input, options) {
        Ok(out) if out.len() < input.len() => out,
        _ => input.to_vec(),
    }
}
```

A **panic** inside `try_optimize` — reachable in principle from the JPEG decoder
(`image::load_from_memory_with_format`, `amatl.rs:314`), the mozjpeg encoder
(`amatl.rs:340-356`), or `lopdf` on a crafted/edge-case PDF — unwinds straight
past this `match`. There is no `catch_unwind`, so the "any failure returns the
original bytes" guarantee does not hold for panics.

In the app, the TypeScript wrapper (`src/lib/pdf-utils.ts:81`) catches a rejected
IPC call and returns the original data URL, so the end user is shielded today.
But the contract is asserted at the **Rust library** level, and `amatl` is
explicitly intended to be extracted to its own crate for external distribution
(`src-tauri/src/AGENTS.md`). A library that claims to be fail-safe on untrusted
input but can panic is a real defect for that goal — and it is exactly the threat
model the project cites when it rejects Ghostscript ("ingests arbitrary
user-supplied PDFs"). Wrapping `try_optimize` in `catch_unwind` makes the
documented guarantee true at the library boundary: a panic becomes the same
graceful "return the original bytes" fallback as any other failure.

## Current state

- `src-tauri/src/amatl.rs` — the optimizer. Relevant pieces:
  - `optimize_with_options` (lines 86–94) — the public entry point that must be
    made panic-safe (excerpt above; it currently only handles `Ok`/`Err`).
  - `try_optimize` (lines 468–530) — the fallible worker. Signature:
    `fn try_optimize(input: &[u8], options: OptimizeOptions) -> Result<Vec<u8>, lopdf::Error>`.
    It calls `Document::load_mem`, `collect_placements`, `plan_replacement`
    (which decodes JPEGs via the `image` crate at line 314 and re-encodes via
    mozjpeg at lines 340–356), then dedups/prunes/compresses/renumbers and saves.
  - The module-header contract (lines 21–25) and `AGENTS.md` both state the
    fail-safe guarantee — this change makes the code match it; **do not edit the
    comments** (they are already correct once the code upholds them).
  - `OptimizeOptions` (lines 60–72) is `#[derive(Debug, Clone, Copy, Default)]`
    over two `bool` fields — it is `Copy` and `UnwindSafe`, so it can be moved
    into a `catch_unwind` closure freely.

- `src-tauri/Cargo.toml` — confirmed at planning time to contain **no**
  `[profile.*]` section, so the build uses the default `panic = "unwind"`
  strategy. `catch_unwind` only works under `unwind`; under `panic = "abort"`
  it is a no-op (see STOP conditions).

### Conventions to match

- Single-file Rust change in a small, well-commented module. Add a short comment
  explaining *why* the `catch_unwind` is there (untrusted input + fail-safe
  contract), matching the surrounding comment style.
- Tests live in the `#[cfg(test)] mod tests` block at the bottom of the same
  file (starts at line 675), using `use super::*;`, `use lopdf::content::Operation;`,
  and `use lopdf::{dictionary, Stream};` (all already imported there). The
  existing `build_pdf` / `invalid_pdf_falls_back_to_original` tests are the
  structural pattern for new tests.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 63e4c47..HEAD -- src-tauri/src/amatl.rs` | empty (or you reconcile first) |
| Confirm no abort profile | `grep -rn "panic" src-tauri/Cargo.toml` | no `panic = "abort"` line |
| Build + test | `cargo test --manifest-path src-tauri/Cargo.toml` | exit 0, all tests pass |
| Lint (warnings = errors) | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | exit 0, no warnings |

> **Environment note**: the first `cargo` build compiles `mozjpeg`, which needs
> **NASM**, **cmake**, and a **C compiler**. If the build fails with an error
> about those tools (not a Rust error in `amatl.rs`), STOP and report it — it is
> an environment problem, not a code problem.

## Scope

**In scope** (the only file you should modify):
- `src-tauri/src/amatl.rs`

**Out of scope** (do NOT touch):
- `try_optimize` and everything it calls — the fallible logic is unchanged; this
  plan only adds a catch boundary around it.
- The module-header and function comments asserting the fail-safe contract —
  they are already correct.
- `src-tauri/src/lib.rs`, `src/lib/pdf-utils.ts`, `src-tauri/Cargo.toml`, any
  other file. Do **not** add a `[profile]` section or change the panic strategy.

## Git workflow

- Branch: `advisor/010-panic-safe-optimizer` (matches the convention of plans
  001–008). The maintainer may instead commit directly to `main` per repo
  preference — do NOT push or open a PR unless explicitly instructed.
- Commit style: conventional commits, matching `git log` (e.g.
  `fix(amatl): catch panics so the fail-safe contract holds on crafted PDFs`).

## Steps

### Step 1: Wrap `try_optimize` in `catch_unwind`

Replace the body of `optimize_with_options` (lines 89–94) so a panic in
`try_optimize` is caught and falls back to the original bytes, exactly like an
`Err`. Target shape:

```rust
pub fn optimize_with_options(input: &[u8], options: OptimizeOptions) -> Vec<u8> {
    // amatl optimizes arbitrary user-supplied PDFs, and its contract is to
    // return the original bytes on ANY failure. try_optimize handles the
    // expected error paths (Result::Err), but a crafted PDF could still trigger
    // a panic deep in the JPEG decoder, the mozjpeg encoder, or lopdf. Catch it
    // here so a panic becomes the same graceful fallback as any other failure.
    let result = std::panic::catch_unwind(|| try_optimize(input, options));
    match result {
        Ok(Ok(out)) if out.len() < input.len() => out,
        _ => input.to_vec(),
    }
}
```

Notes:
- The closure captures `input: &[u8]` (a shared reference to `[u8]: Sync`) and
  `options: OptimizeOptions` (`Copy`), both of which are `UnwindSafe`, so this
  should compile as written. If — and only if — the compiler reports an
  `UnwindSafe`/`RefUnwindSafe` bound error, wrap the closure:
  `std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| try_optimize(input, options)))`.
  Do not change anything else to satisfy the bound.

**Verify**:
- `cargo test --manifest-path src-tauri/Cargo.toml` → exit 0 (existing tests
  still pass — the happy paths still return optimized bytes, the
  `invalid_pdf_falls_back_to_original` test still returns the original).
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
  → exit 0, no warnings.

### Step 2: Add a corrupt-image fallback test

This characterizes the graceful handling of unparseable image data: a
structurally valid PDF whose image XObject is declared `DCTDecode` but whose
bytes are not a decodable JPEG. Add it to the `#[cfg(test)] mod tests` block:

```rust
#[test]
fn corrupt_jpeg_stream_falls_back_without_crashing() {
    // Structurally valid PDF, but the image's "JPEG" bytes are garbage. The
    // effective DPI (400px drawn into a 100pt box ≈ 288 DPI) is above target,
    // so plan_replacement attempts to decode — and must fail gracefully,
    // leaving the document untouched and returning the original bytes.
    let mut doc = Document::with_version("1.5");
    let img_id = doc.add_object(Stream::new(
        dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => 400_i64,
            "Height" => 400_i64,
            "ColorSpace" => "DeviceRGB",
            "BitsPerComponent" => 8,
            "Filter" => "DCTDecode",
        },
        b"\xff\xd8\xff not a real jpeg payload".to_vec(),
    ));
    let content = Content {
        operations: vec![
            Operation::new("q", vec![]),
            Operation::new(
                "cm",
                vec![100.into(), 0.into(), 0.into(), 100.into(), 0.into(), 0.into()],
            ),
            Operation::new("Do", vec![Object::Name(b"Im0".to_vec())]),
            Operation::new("Q", vec![]),
        ],
    };
    let content_id = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));
    let pages_id = doc.new_object_id();
    let page_id = doc.add_object(dictionary! {
        "Type" => "Page",
        "Parent" => pages_id,
        "Contents" => content_id,
        "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
        "Resources" => dictionary! { "XObject" => dictionary! { "Im0" => img_id } },
    });
    doc.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type" => "Pages",
            "Kids" => vec![page_id.into()],
            "Count" => 1,
        }),
    );
    let catalog_id = doc.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    doc.trailer.set("Root", catalog_id);
    let mut input: Vec<u8> = Vec::new();
    doc.save_to(&mut input).unwrap();

    let out = optimize(&input);
    assert_eq!(out, input, "corrupt image must leave the document unchanged");
    assert!(Document::load_mem(&out).is_ok(), "output must remain a valid PDF");
}
```

**Verify**: `cargo test --manifest-path src-tauri/Cargo.toml` → exit 0; the
output lists `corrupt_jpeg_stream_falls_back_without_crashing` as passing.

## Test plan

- New test (in `src-tauri/src/amatl.rs`, `mod tests`):
  - `corrupt_jpeg_stream_falls_back_without_crashing` — a valid PDF carrying an
    undecodable "JPEG"; the optimizer must return the original bytes and the
    output must still load.
- Structural pattern to follow: the existing `build_pdf` helper and
  `invalid_pdf_falls_back_to_original` test in the same block.
- **Honest scope note**: this test exercises the decode-*failure* (graceful
  `None`/`Err`) path, not a true panic — a guaranteed panic inside `try_optimize`
  cannot be triggered from outside the module without adding a test-only seam to
  production code, which this plan deliberately does not do. The `catch_unwind`
  added in Step 1 is defense-in-depth whose correctness is established by
  construction; this test plus the existing fallback tests guard the surrounding
  behavior and prove no regression.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` exits 0; the new test
      `corrupt_jpeg_stream_falls_back_without_crashing` appears and passes.
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
      exits 0 with no warnings.
- [ ] `grep -n "catch_unwind" src-tauri/src/amatl.rs` shows the wrapper in
      `optimize_with_options`.
- [ ] `grep -n 'panic = "abort"' src-tauri/Cargo.toml` returns no matches
      (the unwind assumption still holds).
- [ ] `git status` shows only `src-tauri/src/amatl.rs` modified (plus
      `plans/README.md` for the status update).
- [ ] `plans/README.md` status row for 010 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- `optimize_with_options` or `try_optimize` does not match the "Current state"
  excerpts (the file drifted since this plan was written).
- `grep -rn "panic" src-tauri/Cargo.toml` reveals a `panic = "abort"` profile
  setting. Under `abort`, `catch_unwind` does NOT catch panics, so this plan's
  approach is ineffective — report it so the fix can be reconsidered (e.g. input
  pre-validation) rather than shipping a no-op.
- `cargo` fails to build because of a missing `nasm`/`cmake`/C compiler (an
  environment problem — see the environment note).
- The compiler reports an `UnwindSafe` error that `AssertUnwindSafe` (per Step 1)
  does not resolve.

## Maintenance notes

- For the reviewer: the diff should be the small `catch_unwind` wrapper in
  `optimize_with_options` plus one new test — nothing in `try_optimize` or its
  callees should change.
- `catch_unwind` relies on the default `panic = "unwind"` strategy. If a release
  profile with `panic = "abort"` is ever added to `Cargo.toml` (e.g. to shrink
  the binary), this guard silently stops working. Watch for that in any
  Cargo.toml change.
- A caught panic still runs the default panic hook, which prints the panic
  message to stderr. That is acceptable for a fail-safe library (the bytes are
  still returned), but if it ever becomes noisy in practice, consider a scoped
  hook — do not install a global hook from a library function.
- **Deferred (not in this plan)**: the `image` crate decode at line 314 uses
  default decode limits. A decompression-bomb JPEG (tiny file, enormous declared
  dimensions) could still allocate a large buffer before failing. Setting
  explicit `image` decode limits is a worthwhile follow-up hardening but needs
  care with the `image` 0.25 `Limits` API; it is intentionally left out here to
  keep this change small and certain. The `catch_unwind` already turns an
  allocation-failure panic into the graceful fallback.