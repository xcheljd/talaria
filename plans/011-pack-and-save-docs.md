# Plan 011: Fix the `pack_and_save` doc comment that wrongly calls itself a stub

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
> "Current state" excerpt below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `63e4c47`, 2026-06-20

## Why this matters

The doc comment on `pack_and_save` in `amatl.rs` describes the function as an
unimplemented stub:

> *"Currently a stub that falls back to the classic save … NOTE: this is the
> placeholder … Until implemented, callers requesting packing silently get the
> classic output — fail-safe, but does not actually pack."*

That is **false**. The function body directly below the comment does real PDF
1.5 object-stream packing via lopdf's `save_with_options`, and the app **ships
with packing enabled** (`src/lib/pdf-utils.ts:78` passes
`packObjectStreams: true`). The function's *own inline comment* (just inside the
body) correctly describes the real implementation, so the file contradicts
itself: a maintainer debugging the packer reads "it's a placeholder, it doesn't
pack" while the code is actively packing in production.

Actively-wrong documentation is worse than missing documentation — it sends the
next reader in exactly the wrong direction. This plan replaces the stale doc
comment with one that matches the implementation. No code behavior changes.

## Current state

- `src-tauri/src/amatl.rs` — the optimizer. The stale comment is the doc comment
  (`///` lines) immediately above `fn pack_and_save`, at lines 549–556:

  ```rust
  /// Pack eligible non-stream objects into a PDF 1.5 `ObjStm` stream and emit a
  /// binary cross-reference stream. Currently a stub that falls back to the
  /// classic save; see Phase 3+ of the implementation plan in AGENTS.md.
  ///
  /// NOTE: this is the placeholder. The real implementation builds the ObjStm,
  /// computes byte-exact offsets in two passes, and writes the xref stream.
  /// Until implemented, callers requesting packing silently get the classic
  /// output — fail-safe, but does not actually pack.
  fn pack_and_save(doc: &mut Document) -> Result<Vec<u8>, lopdf::Error> {
  ```

- The function **body** (lines 557–578) is correct and must NOT change. For
  reference, it does this (the inline comment inside it, lines 558–568, already
  describes the real behavior accurately — leave it):

  ```rust
  fn pack_and_save(doc: &mut Document) -> Result<Vec<u8>, lopdf::Error> {
      // Pack non-stream objects into an ObjStm + cross-reference stream via
      // lopdf's own writer. ...
      let options = lopdf::SaveOptions::builder()
          .use_object_streams(true)
          .use_xref_streams(true)
          .max_objects_per_stream(100_000_000)
          .compression_level(9)
          .build();
      let mut out: Vec<u8> = Vec::new();
      doc.save_with_options(&mut out, options)?;
      Ok(add_xref_self_entry(out))
  }
  ```

- Authoritative description of the real behavior to align with:
  `src-tauri/src/AGENTS.md`, section **"Object-stream packing
  (`pack_object_streams`) — implemented, off by default"** (note: the app's TS
  wrapper turns it ON; AGENTS.md's "off by default" refers to the Rust library
  default `OptimizeOptions::pack_object_streams = false`). It confirms packing
  uses lopdf's `save_with_options`, is strictly `qpdf --check`-clean, and relies
  on `add_xref_self_entry` to patch the one xref entry lopdf 0.41 omits.

### Conventions to match

- Match the `///` doc-comment style and the concise, technical tone of the other
  function docs in this file (e.g. the doc on `add_xref_self_entry` at lines
  580–590, which correctly cross-references AGENTS.md and the lopdf workaround).
- This is a comment-only change. Do not touch any executable line.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 63e4c47..HEAD -- src-tauri/src/amatl.rs` | empty (or you reconcile first) |
| Build + test (comment compiles) | `cargo test --manifest-path src-tauri/Cargo.toml` | exit 0, all tests pass |
| Lint | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | exit 0, no warnings |

> **Environment note**: the first `cargo` build compiles `mozjpeg` (needs NASM,
> cmake, a C compiler). If the build fails due to those tools rather than a Rust
> error, STOP and report — it is an environment problem, not a code problem.

## Scope

**In scope** (the only file you should modify):
- `src-tauri/src/amatl.rs` — only the doc comment at lines 549–556.

**Out of scope** (do NOT touch):
- The `pack_and_save` function body and its inline comment (lines 557–578).
- `src-tauri/src/AGENTS.md` — see the maintenance note about its size numbers;
  it is intentionally NOT edited here.
- Every other file.

## Git workflow

- Branch: `advisor/011-pack-and-save-docs` (matches the convention of plans
  001–008). The maintainer may instead commit directly to `main` per repo
  preference — do NOT push or open a PR unless explicitly instructed.
- Commit style: conventional commits, matching `git log` (e.g.
  `docs(amatl): correct pack_and_save comment — it packs, not a stub`).

## Steps

### Step 1: Replace the stale doc comment

Replace the doc comment at lines 549–556 (the eight `///` lines above
`fn pack_and_save`) with an accurate one. Target shape:

```rust
/// Serialize the document with PDF 1.5 object-stream packing: eligible
/// non-stream objects are packed into a single `ObjStm` stream and the
/// cross-reference table is emitted as a binary xref stream. Uses lopdf's own
/// `save_with_options` (not a hand-rolled writer and not qpdf), then
/// `add_xref_self_entry` patches the one xref entry lopdf 0.41 omits, so the
/// output is strictly `qpdf --check`-clean.
///
/// Reached only when `OptimizeOptions.pack_object_streams` is true (the
/// citizen-communications app enables it). See the "Object-stream packing"
/// section of `src-tauri/src/AGENTS.md` for the cost/benefit trade-off and the
/// lopdf workaround rationale.
```

Leave `fn pack_and_save(...)` and its entire body unchanged.

**Verify**:
- `cargo test --manifest-path src-tauri/Cargo.toml` → exit 0 (the comment change
  must still compile and all tests pass).
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
  → exit 0, no warnings.

## Test plan

No new tests — this is a documentation-only change with no behavior change. The
existing `pack_object_streams_produces_loadable_output` and
`add_xref_self_entry_is_fail_safe_on_unexpected_input` tests already cover the
function's behavior, and must continue to pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "stub" src-tauri/src/amatl.rs` returns no matches.
- [ ] `grep -n "placeholder" src-tauri/src/amatl.rs` returns no matches.
- [ ] `grep -n "does not actually pack" src-tauri/src/amatl.rs` returns no
      matches.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` exits 0.
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
      exits 0.
- [ ] `git status` shows only `src-tauri/src/amatl.rs` modified (plus
      `plans/README.md` for the status update).
- [ ] `plans/README.md` status row for 011 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The doc comment at lines 549–556 does not match the "Current state" excerpt
  (the file drifted, or the comment was already fixed — if already fixed, mark
  this plan DONE/obsolete and report).
- The function body no longer matches the reference excerpt (e.g. packing was
  rewritten or reverted to an actual stub) — in that case the *body* may now be
  the source of truth; report rather than guessing which is correct.
- `cargo` fails to build because of a missing `nasm`/`cmake`/C compiler.

## Maintenance notes

- For the reviewer: confirm the diff is comment-only (no executable line
  changed). The new comment should agree with both the inline body comment and
  the AGENTS.md "Object-stream packing" section.
- **Flagged, deliberately out of scope**: `src-tauri/src/AGENTS.md` reports the
  shipped output size inconsistently — the results table lists the shipped
  (strip+pack) output as **572 KB**, while the prose twice calls the shipped
  output **597 KB** ("the shipped 597 KB output opened correctly…", "530 vs
  597 KB"). These appear to describe the same shipped artifact and cannot both
  be right. This plan does not change them because the correct figure needs a
  real measurement, which an executor cannot produce. The maintainer should
  re-measure a representative promo PDF through the shipped pipeline and make the
  table and prose agree.