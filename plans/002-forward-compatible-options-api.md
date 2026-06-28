# Plan 002: Make `OptimizeOptions` forward-compatible for crate publication (`#[non_exhaustive]` + builder methods)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in the "STOP conditions" section occurs, stop and report — do
> not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat d3239b6..HEAD -- src-tauri/src/amatl.rs src-tauri/src/lib.rs`
> This plan assumes plan 001 has already landed (it depends on the three fields
> 001 adds). If 001 is not DONE in `plans/README.md`, STOP. Otherwise, compare the
> "Current state" excerpts below against the live code; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-configurable-image-tunables.md
- **Category**: tech-debt (direction: crate publication)
- **Planned at**: commit `d3239b6`, 2026-06-24

## Why this matters

Once `amatl` is published to crates.io, its public API shape becomes a semver
contract. With plain `pub` fields, **every future option added is a breaking
(semver-major) release**, because downstream code constructs the struct with
literals and a new field breaks them — unless they used `..Default::default()`,
which is easy to forget and impossible to enforce. The idiomatic Rust answer is
`#[non_exhaustive]` plus constructor/builder methods: external crates then *must*
go through `OptimizeOptions::default()` and chainable `with_*` setters, so new
fields can be added in a *minor* release forever. This is small, low-risk, and is
exactly the kind of API hygiene that distinguishes a credible published crate
from an internal module. It is recommended but optional (see `plans/README.md`).

## Current state

After plan 001, `OptimizeOptions` has five `pub` fields, a manual `Default`, and
derives `Debug, Clone, Copy`. It is constructed with struct literals at three
call sites:

- `src-tauri/src/lib.rs` (the `amatl_optimize` command), shaped like:
  ```rust
      let options = amatl::OptimizeOptions {
          strip_accessibility,
          pack_object_streams,
          ..Default::default()
      };
  ```
- `src-tauri/src/amatl.rs` test `pack_object_streams_produces_loadable_output`:
  ```rust
      let opts = OptimizeOptions {
          strip_accessibility: false,
          pack_object_streams: true,
          ..Default::default()
      };
  ```
- `src-tauri/src/amatl.rs` test `real_file_shrinks_when_present`:
  ```rust
      let opts = OptimizeOptions {
          strip_accessibility: true,
          pack_object_streams: std::env::var("CCT_TEST_PACK").is_ok(),
          ..Default::default()
      };
  ```
- One more literal in test `strip_accessibility_runs_even_without_image_work`
  (`amatl.rs`, around the `strip_accessibility: true, ..Default::default()` form)
  and the three custom-field literals plan 001 added in its new tests
  (`OptimizeOptions { target_dpi: 72.0, ..Default::default() }`, etc.).

> **Find every literal before editing.** Run
> `grep -n "OptimizeOptions {" src-tauri/src/amatl.rs src-tauri/src/lib.rs`
> and convert *all* of them. The list above is the expected set after 001; if the
> grep shows a literal not accounted for, see STOP conditions.

Why struct literals still compile today: `#[non_exhaustive]` only restricts
construction **from other crates**. Right now `amatl.rs` and `lib.rs` are the same
crate, so literals work regardless. The value of this plan is realized after
extraction, when `lib.rs` / the CLI become external consumers — so this plan also
**switches the call sites to the builder API** to exercise and lock in the real
external surface.

### Repo conventions to match

- Thorough `///` rustdoc with rationale (match the existing field docs).
- Fail-safe contract is unchanged by this plan (it only reshapes construction).
- Tests live in `#[cfg(test)] mod tests` at the bottom of `amatl.rs`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `cargo test --manifest-path src-tauri/Cargo.toml` | exit 0, all pass |
| Clippy (deny warnings) | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | exit 0 |
| Format check | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | exit 0 |
| Doc build (catches broken rustdoc/doctests) | `cargo test --manifest-path src-tauri/Cargo.toml --doc` | exit 0 |

> Same build-toolchain note as plan 001: if compilation fails on
> `generate_context!()` for a missing `dist/`, stub it with
> `mkdir -p dist && printf '<!doctype html><title>ci</title>' > dist/index.html`.

## Scope

**In scope** (the only files you may modify):
- `src-tauri/src/amatl.rs`
- `src-tauri/src/lib.rs`

**Out of scope** (do NOT touch):
- The optimizer algorithm, the `Default` values, and the clamping logic from
  plan 001.
- `src/lib/pdf-utils.ts` and the `amatl_optimize` IPC signature.

## Git workflow

- Branch: `advisor/002-forward-compatible-options-api`.
- Commit style: conventional commits, e.g.
  `refactor(amatl): make OptimizeOptions non_exhaustive with builder methods`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Mark the struct `#[non_exhaustive]` and add builder methods

In `src-tauri/src/amatl.rs`, add the attribute to `OptimizeOptions` (keep the
existing derives and the manual `Default` from plan 001):

```rust
#[derive(Debug, Clone, Copy)]
#[non_exhaustive]
pub struct OptimizeOptions {
    // ...fields unchanged...
}
```

Add an `impl OptimizeOptions` block (place it after the `Default` impl) with one
chainable, `#[must_use]` setter per field. Each takes `mut self` and returns
`Self` (cheap — the struct is `Copy`):

```rust
impl OptimizeOptions {
    /// Set the target downsampling resolution in DPI. See the field docs.
    #[must_use]
    pub fn with_target_dpi(mut self, dpi: f32) -> Self {
        self.target_dpi = dpi;
        self
    }

    /// Set the JPEG quality (1-100) for re-encoded images.
    #[must_use]
    pub fn with_jpeg_quality(mut self, quality: u8) -> Self {
        self.jpeg_quality = quality;
        self
    }

    /// Set the over-resolution margin factor (minimum 1.0 at use).
    #[must_use]
    pub fn with_dpi_margin(mut self, margin: f32) -> Self {
        self.dpi_margin = margin;
        self
    }

    /// Enable/disable stripping the PDF structure tree (accessibility metadata).
    #[must_use]
    pub fn with_strip_accessibility(mut self, strip: bool) -> Self {
        self.strip_accessibility = strip;
        self
    }

    /// Enable/disable PDF 1.5 object-stream packing.
    #[must_use]
    pub fn with_pack_object_streams(mut self, pack: bool) -> Self {
        self.pack_object_streams = pack;
        self
    }
}
```

Add a short usage example to the `OptimizeOptions` struct-level doc comment so it
renders on docs.rs (this becomes a compiled doctest — keep it correct):

```rust
/// # Example
///
/// ```
/// use talaria_lib::amatl::OptimizeOptions;
/// let opts = OptimizeOptions::default()
///     .with_strip_accessibility(true)
///     .with_target_dpi(110.0);
/// ```
```

> **Doctest path caveat:** the crate's library name is
> `talaria_lib` (see `src-tauri/Cargo.toml` `[lib]`) and
> `amatl` is currently a private `mod amatl;` in `lib.rs`. A doctest can only
> reference public paths. If `amatl` is **not** publicly re-exported, the
> `use ...::amatl::OptimizeOptions;` line will fail to compile as a doctest. In
> that case, make the doctest `ignore` (```` ```ignore ````) **and** report this
> in your final summary as a signal that `mod amatl` should be `pub mod amatl`
> (or re-exported) — but do NOT change the module visibility yourself; that is a
> separate decision tied to extraction. Prefer the `ignore` route over changing
> visibility.

**Verify**: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
→ exit 0. (The builder methods and `#[non_exhaustive]` compile cleanly; existing
same-crate literals still compile too, so nothing breaks yet.)

### Step 2: Switch all call sites to the builder API

Convert every `OptimizeOptions { ... }` literal found by
`grep -n "OptimizeOptions {" src-tauri/src/amatl.rs src-tauri/src/lib.rs` to the
builder form. Examples:

- `lib.rs`:
  ```rust
      let options = amatl::OptimizeOptions::default()
          .with_strip_accessibility(strip_accessibility)
          .with_pack_object_streams(pack_object_streams);
  ```
- test `pack_object_streams_produces_loadable_output`:
  ```rust
      let opts = OptimizeOptions::default().with_pack_object_streams(true);
  ```
- test `real_file_shrinks_when_present`:
  ```rust
      let opts = OptimizeOptions::default()
          .with_strip_accessibility(true)
          .with_pack_object_streams(std::env::var("CCT_TEST_PACK").is_ok());
  ```
- test `strip_accessibility_runs_even_without_image_work`:
  ```rust
      let opts = OptimizeOptions::default().with_strip_accessibility(true);
  ```
- the plan-001 tests that set custom numeric fields, e.g.:
  ```rust
      let opts = OptimizeOptions::default().with_target_dpi(72.0);
      // and
      let opts = OptimizeOptions::default().with_target_dpi(0.0);
  ```

Leave bare `OptimizeOptions::default()` calls (no field overrides) as they are.

**Verify**:
`grep -n "OptimizeOptions {" src-tauri/src/amatl.rs src-tauri/src/lib.rs`
→ no matches (every literal converted). Then
`cargo test --manifest-path src-tauri/Cargo.toml` → all pass, and
`cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
→ exit 0.

### Step 3: Add a test for the builder

Add to `#[cfg(test)] mod tests` in `amatl.rs`:

```rust
#[test]
fn builder_methods_set_each_field() {
    let o = OptimizeOptions::default()
        .with_target_dpi(96.0)
        .with_jpeg_quality(60)
        .with_dpi_margin(1.5)
        .with_strip_accessibility(true)
        .with_pack_object_streams(true);
    assert_eq!(o.target_dpi, 96.0);
    assert_eq!(o.jpeg_quality, 60);
    assert_eq!(o.dpi_margin, 1.5);
    assert!(o.strip_accessibility);
    assert!(o.pack_object_streams);
}
```

**Verify**: `cargo test --manifest-path src-tauri/Cargo.toml builder_methods_set_each_field`
→ 1 test runs and passes.

## Test plan

- New test: `builder_methods_set_each_field` (happy path: every setter writes its
  field; chaining works).
- The doctest on `OptimizeOptions` (Step 1) is itself a test — verify with
  `cargo test --manifest-path src-tauri/Cargo.toml --doc` (passes, or is `ignore`d
  per the path caveat).
- All plan-001 tests must still pass after the call-site conversion — they are the
  proof that switching from literals to builders changed shape, not behavior.
- Structural pattern: any existing small unit test in the `mod tests` block.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` exits 0; `builder_methods_set_each_field` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml --doc` exits 0.
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` exits 0.
- [ ] `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` exits 0.
- [ ] `grep -n "OptimizeOptions {" src-tauri/src/amatl.rs src-tauri/src/lib.rs` returns no matches.
- [ ] `grep -n "non_exhaustive" src-tauri/src/amatl.rs` shows the attribute on `OptimizeOptions`.
- [ ] Only `src-tauri/src/amatl.rs` and `src-tauri/src/lib.rs` modified (plus `plans/README.md`).
- [ ] `plans/README.md` status row for 002 updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 001 is not marked DONE in `plans/README.md`, or the three numeric fields it
  adds are not present in `OptimizeOptions`.
- The "Current state" excerpts do not match the live code (drift).
- `grep` finds an `OptimizeOptions { ... }` literal whose fields you cannot map to
  the builder methods (an unexpected field exists → the API drifted; report it).
- A verification fails twice after a reasonable fix attempt.
- Making the doctest compile appears to require changing `mod amatl` to
  `pub mod amatl` — do NOT change module visibility; use ```` ```ignore ```` and
  report it (see the path caveat in Step 1).

## Maintenance notes

- For the reviewer: confirm `#[non_exhaustive]` is present and that **no**
  `OptimizeOptions { ... }` struct literals remain in this crate — the point is
  that the builder is the only construction path, matching what external consumers
  will be forced to use after extraction.
- Adding a future option becomes: add the field + its `Default` value + its
  `with_*` method. Because of `#[non_exhaustive]`, this is a non-breaking minor
  release for downstream crates.
- Deferred: a dedicated `OptimizeOptionsBuilder` type is unnecessary here — the
  consuming-`self` setters on a `Copy` struct are simpler and idiomatic for this
  small option set. Revisit only if construction grows interdependent validation
  (e.g. one option constrains another), which it currently does not.
- Deferred: making `mod amatl` public / re-exporting it for the doctest path.
  That is part of the crate-extraction work in `docs/amatl-roadmap.md`, not this
  plan.