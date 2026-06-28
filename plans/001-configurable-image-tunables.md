# Plan 001: Make image tunables (DPI / quality / margin) configurable via `OptimizeOptions`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in the "STOP conditions" section occurs, stop and report — do
> not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat d3239b6..HEAD -- src-tauri/src/amatl.rs src-tauri/src/lib.rs`
> If either in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt (enables direction: crate + CLI extraction)
- **Planned at**: commit `d3239b6`, 2026-06-24

## Why this matters

`amatl` is being extracted into a standalone, publishable crate with a CLI (see
`docs/amatl-roadmap.md`). Its three compression tunables — target resolution,
JPEG quality, and the over-resolution margin — are currently module-level `const`
values baked into the optimizer. A library consumer or a CLI flag cannot change
them. Promoting them to fields on the existing public `OptimizeOptions` struct is
the single prerequisite that unblocks every downstream consumer surface, and it
must be done **without changing the defaults**: the values 130 DPI / Q78 / 1.15×
are a measured sweet spot and the desktop app depends on them. The risk in this
change is entirely in the `Default` impl — adding numeric fields to a struct that
currently `#[derive(Default)]`s would silently default DPI to `0.0`, which would
make the optimizer try to downsample every image to ~1px. This plan removes that
trap deliberately and pins it with a test.

## Current state

Files involved:

- `src-tauri/src/amatl.rs` — the optimizer. Contains the three consts, the
  `OptimizeOptions` struct, and `plan_replacement` (which reads the consts).
- `src-tauri/src/lib.rs` — the desktop app's Tauri binding; constructs an
  `OptimizeOptions` literal in the `amatl_optimize` command.

The three consts today (`src-tauri/src/amatl.rs:33-39`):

```rust
/// Target resolution for downsampled images, in dots per inch.
const TARGET_DPI: f32 = 130.0;
/// JPEG quality (0-100) for re-encoded images.
const JPEG_QUALITY: u8 = 78;
/// Only downsample when the effective DPI exceeds the target by this factor,
/// so we don't churn images that are already close to ideal.
const DPI_MARGIN: f32 = 1.15;
```

The struct today (`src-tauri/src/amatl.rs:59-71`) — note `Default` is **derived**:

```rust
#[derive(Debug, Clone, Copy, Default)]
pub struct OptimizeOptions {
    /// If true, remove the PDF's structure tree (accessibility metadata) for
    /// additional size reduction. Visually lossless; accessibility-lossy.
    /// Default: `false`.
    pub strip_accessibility: bool,

    /// If true, pack eligible non-stream objects into PDF 1.5 `ObjStm` streams
    /// with a binary cross-reference stream (additional structural
    /// compression). Default: `false`. See struct doc for the cost/benefit
    /// trade-off on different input shapes.
    pub pack_object_streams: bool,
}
```

Where the consts are read — `plan_replacement` (`src-tauri/src/amatl.rs:294-355`).
The relevant lines:

```rust
fn plan_replacement(doc: &Document, id: ObjectId, rendered: (f32, f32)) -> Option<Replacement> {
    // ...
    // Effective DPI = pixels / inches displayed. Skip if already near target.
    let eff_dpi = px_w as f32 / (rendered_w_pts / 72.0);
    if eff_dpi <= TARGET_DPI * DPI_MARGIN {              // <- line 324
        return None;
    }

    let target_w = ((rendered_w_pts / 72.0) * TARGET_DPI).round().max(1.0) as u32;  // <- 328
    let target_h = ((rendered_h_pts / 72.0) * TARGET_DPI).round().max(1.0) as u32;  // <- 329
    // ...
    let out = encode_jpeg(&resized, is_gray, JPEG_QUALITY)?;                        // <- 343
    // ...
}
```

`encode_jpeg` (`src-tauri/src/amatl.rs:360`) **already** takes `quality: u8` as a
parameter — no change needed there; only its caller's argument changes.

The single call site of `plan_replacement` — `try_optimize`
(`src-tauri/src/amatl.rs:491-495`):

```rust
    for (id, rendered) in placements {
        if let Some(plan) = plan_replacement(&doc, id, rendered) {
            replacements.push(plan);
        }
    }
```

The desktop app's construction — `lib.rs:301-305`:

```rust
    let options = amatl::OptimizeOptions {
        strip_accessibility,
        pack_object_streams,
    };
    let optimized = amatl::optimize_with_options(&bytes, options);
```

Two test call sites in `amatl.rs` build the struct with literals that set only
the two existing fields and will no longer compile once fields are added:

- `src-tauri/src/amatl.rs:812-815` (in `pack_object_streams_produces_loadable_output`):
  ```rust
      let opts = OptimizeOptions {
          strip_accessibility: false,
          pack_object_streams: true,
      };
  ```
- `src-tauri/src/amatl.rs:1012-1016` (in `real_file_shrinks_when_present`):
  ```rust
      let opts = OptimizeOptions {
          strip_accessibility: true,
          // Opt in to object-stream packing for this run via CCT_TEST_PACK=1.
          pack_object_streams: std::env::var("CCT_TEST_PACK").is_ok(),
      };
  ```

A third literal already uses `..Default::default()` and will keep compiling
unchanged (`src-tauri/src/amatl.rs:936-939`).

### Repo conventions to match

- This crate is **fail-safe by contract**: any bad input, error, or
  non-shrinking result returns the original bytes; nothing panics. See the
  module doc (`amatl.rs:1-25`) and `src-tauri/src/AGENTS.md` ("amatl — PDF
  OPTIMIZATION STRATEGY", "ANTI-PATTERNS"). New code must preserve this — a
  misconfigured option value must degrade gracefully, never panic or corrupt.
- Doc comments are thorough `///` rustdoc with rationale. Match that density on
  the new fields (see the existing field docs above as the exemplar).
- Tests live in the `#[cfg(test)] mod tests` block at the bottom of `amatl.rs`.
  Follow the existing helpers `build_pdf(px, draw_pts)` (`amatl.rs:701`) and
  `image_dims(pdf)` (`amatl.rs:776`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `cargo test --manifest-path src-tauri/Cargo.toml` | exit 0, all tests pass |
| Clippy (deny warnings, as CI does) | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | exit 0, no warnings |
| Format check | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | exit 0, no diff |

> **Build prerequisites (already satisfied in this dev environment):** `mozjpeg`
> compiles libjpeg-turbo, which needs **NASM** and a C compiler / cmake. The
> machine that builds this app already has them. If `cargo test` fails to
> *compile* with an error from `tauri::generate_context!()` about a missing
> frontend `dist` directory, create the same stub CI uses and retry:
> `mkdir -p dist && printf '<!doctype html><title>ci</title>' > dist/index.html`
> (`dist/` is a build artifact, not source — do not commit it).

## Scope

**In scope** (the only files you may modify):
- `src-tauri/src/amatl.rs`
- `src-tauri/src/lib.rs`

**Out of scope** (do NOT touch, even though they look related):
- `src/lib/pdf-utils.ts` and the `amatl_optimize` IPC *signature* — the desktop
  app keeps its fixed sweet spot; it will call `optimize_with_options` on the
  defaults via `..Default::default()`. Do not add new IPC parameters or TS knobs.
- The downsampling algorithm itself (`collect_placements`, the CTM math,
  `encode_jpeg`'s body, `dedup_objects`, `pack_and_save`). Only the *source* of
  the three tunable values changes, not how they are used.
- The `strip_accessibility` / `pack_object_streams` semantics.

## Git workflow

- Branch: `advisor/001-configurable-image-tunables` (repo default branch is
  `main`; do not commit directly to it).
- Commit style is conventional commits — recent history shows
  `refactor(newsletter): ...`, `fix(promotion): ...`. Use e.g.
  `refactor(amatl): make image tunables configurable via OptimizeOptions`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the three fields and a manual `Default` impl

In `src-tauri/src/amatl.rs`:

1. Remove `Default` from the derive list on `OptimizeOptions` (keep
   `Debug, Clone, Copy`):
   ```rust
   #[derive(Debug, Clone, Copy)]
   pub struct OptimizeOptions {
   ```
2. Add three `pub` fields to the struct, each with a `///` doc comment matching
   the existing density. Place them *before* the two existing bool fields (so the
   image tunables read first):
   ```rust
       /// Target resolution for downsampled images, in dots per inch. Images
       /// whose effective on-page DPI exceeds this (by `dpi_margin`) are
       /// downsampled to it. Values <= 0 disable downsampling entirely.
       /// Default: 130.0 (a measured visual-lossless sweet spot for business
       /// documents).
       pub target_dpi: f32,

       /// JPEG quality (1-100) for re-encoded images. Clamped to [1, 100] at
       /// use. Default: 78 (matches Ghostscript's image payload within ~0.01%).
       pub jpeg_quality: u8,

       /// Only downsample when the effective DPI exceeds `target_dpi` by this
       /// factor, so images already near the target are not churned. Clamped to
       /// a minimum of 1.0 at use. Default: 1.15.
       pub dpi_margin: f32,
   ```
3. Keep the three `const`s (`TARGET_DPI`, `JPEG_QUALITY`, `DPI_MARGIN`) where they
   are — they become the single source of truth for the defaults. Add a manual
   `Default` impl immediately after the struct definition:
   ```rust
   impl Default for OptimizeOptions {
       fn default() -> Self {
           Self {
               target_dpi: TARGET_DPI,
               jpeg_quality: JPEG_QUALITY,
               dpi_margin: DPI_MARGIN,
               strip_accessibility: false,
               pack_object_streams: false,
           }
       }
   }
   ```

> This keeps the consts "used" (referenced by `Default`), so removing them from
> `plan_replacement` in Step 2 will not trigger a `dead_code` clippy error.

**Verify**: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
→ will still FAIL at this point (the test/lib literals are now missing fields and
the consts are now unused inside `plan_replacement`). That is expected; proceed to
Step 2 before re-verifying. Do **not** "fix" the unused-const warning by deleting
the consts — Step 1 deliberately routes them through `Default`.

### Step 2: Read the tunables from `options` in `plan_replacement`, with defensive clamping

In `src-tauri/src/amatl.rs`:

1. Change the signature of `plan_replacement` to accept the options (the struct is
   `Copy`, so pass by value):
   ```rust
   fn plan_replacement(
       doc: &Document,
       id: ObjectId,
       rendered: (f32, f32),
       options: OptimizeOptions,
   ) -> Option<Replacement> {
   ```
2. At the top of the function body (after the `rendered_w_pts <= 0.0` guard that
   already exists), read and clamp the three values, and bail out safely on a
   non-positive target DPI:
   ```rust
       // Defensive: a non-positive target DPI means "do not downsample".
       // Without this guard, target_w/target_h below would collapse toward 1px.
       let target_dpi = options.target_dpi;
       if target_dpi <= 0.0 {
           return None;
       }
       let dpi_margin = options.dpi_margin.max(1.0);
       let quality = options.jpeg_quality.clamp(1, 100);
   ```
3. Replace the three const reads with these locals:
   - `if eff_dpi <= TARGET_DPI * DPI_MARGIN {` → `if eff_dpi <= target_dpi * dpi_margin {`
   - `((rendered_w_pts / 72.0) * TARGET_DPI)` → `((rendered_w_pts / 72.0) * target_dpi)`
   - `((rendered_h_pts / 72.0) * TARGET_DPI)` → `((rendered_h_pts / 72.0) * target_dpi)`
   - `encode_jpeg(&resized, is_gray, JPEG_QUALITY)?` → `encode_jpeg(&resized, is_gray, quality)?`
4. Update the single caller in `try_optimize` (`amatl.rs:~492`) to pass `options`:
   ```rust
       for (id, rendered) in placements {
           if let Some(plan) = plan_replacement(&doc, id, rendered, options) {
               replacements.push(plan);
           }
       }
   ```
   (`try_optimize` already has `options: OptimizeOptions` as a parameter.)

**Verify**: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
→ should now fail **only** on the struct-literal call sites missing fields (Step 3
fixes those). If it reports an unused `const`, you skipped wiring it into
`Default` in Step 1 — go back. If it reports `target_dpi`/`quality`/`dpi_margin`
unused, you did not replace the const reads — go back.

### Step 3: Fix the struct-literal call sites

Add `..Default::default()` to each literal that now sets only a subset of fields.

1. `src-tauri/src/lib.rs:301-304`:
   ```rust
       let options = amatl::OptimizeOptions {
           strip_accessibility,
           pack_object_streams,
           ..Default::default()
       };
   ```
2. `src-tauri/src/amatl.rs:812-815`:
   ```rust
       let opts = OptimizeOptions {
           strip_accessibility: false,
           pack_object_streams: true,
           ..Default::default()
       };
   ```
3. `src-tauri/src/amatl.rs:1012-1016`:
   ```rust
       let opts = OptimizeOptions {
           strip_accessibility: true,
           // Opt in to object-stream packing for this run via CCT_TEST_PACK=1.
           pack_object_streams: std::env::var("CCT_TEST_PACK").is_ok(),
           ..Default::default()
       };
   ```

(The literal at `amatl.rs:936-939` already uses `..Default::default()` — leave it.)

**Verify**: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
→ exit 0, no warnings. Then
`cargo test --manifest-path src-tauri/Cargo.toml` → all existing tests pass.

### Step 4: Add regression tests for the new behavior

Add these tests inside the `#[cfg(test)] mod tests` block in `amatl.rs`, using
the existing `build_pdf` and `image_dims` helpers. See the existing
`downsamples_over_resolution_image` test (`amatl.rs:826-839`) as the structural
pattern.

```rust
#[test]
fn default_options_match_documented_sweet_spot() {
    // Pins the manual Default impl: adding numeric fields must NOT regress the
    // measured 130 DPI / Q78 / 1.15 sweet spot the desktop app depends on.
    let d = OptimizeOptions::default();
    assert_eq!(d.target_dpi, 130.0);
    assert_eq!(d.jpeg_quality, 78);
    assert_eq!(d.dpi_margin, 1.15);
    assert!(!d.strip_accessibility);
    assert!(!d.pack_object_streams);
}

#[test]
fn custom_target_dpi_downsamples_more_aggressively() {
    // Same input, lower target DPI => smaller downsampled pixel dimensions.
    // 400px drawn into a 100pt box is ~288 DPI, above both targets.
    let pdf = build_pdf(400, 100);

    let at_130 = optimize_with_options(&pdf, OptimizeOptions::default());
    let opts_72 = OptimizeOptions { target_dpi: 72.0, ..Default::default() };
    let at_72 = optimize_with_options(&pdf, opts_72);

    let (w130, _) = image_dims(&at_130);
    let (w72, _) = image_dims(&at_72);
    assert!(w72 < w130, "lower target DPI must yield fewer pixels: {w72} !< {w130}");
    // 100pt / 72 * 72 DPI = 100px target.
    assert!(w72 <= 110 && w72 >= 90, "unexpected 72-DPI width: {w72}");
}

#[test]
fn zero_target_dpi_leaves_images_untouched() {
    // Defensive-clamp regression: target_dpi <= 0 must mean "no downsampling",
    // NOT "downsample to ~1px". 400px image must survive unchanged.
    let pdf = build_pdf(400, 100);
    let opts = OptimizeOptions { target_dpi: 0.0, ..Default::default() };
    let out = optimize_with_options(&pdf, opts);

    // No image work and no strip => fail-safe path returns the original bytes.
    let (w, h) = image_dims(&out);
    assert_eq!((w, h), (400, 400), "zero target DPI must not resize the image");
}
```

**Verify**: `cargo test --manifest-path src-tauri/Cargo.toml` → all pass,
including the 3 new tests. Run the targeted set to confirm they are picked up:
`cargo test --manifest-path src-tauri/Cargo.toml target_dpi` → at least 2 tests run.

## Test plan

- New tests (in `src-tauri/src/amatl.rs`, `mod tests`):
  - `default_options_match_documented_sweet_spot` — pins the manual `Default`
    (the trap this plan exists to avoid).
  - `custom_target_dpi_downsamples_more_aggressively` — happy path: a custom
    field actually changes output.
  - `zero_target_dpi_leaves_images_untouched` — the defensive-clamp edge case.
- Existing tests must continue to pass unchanged: `downsamples_over_resolution_image`,
  `leaves_low_resolution_image_untouched`, `default_options_preserve_accessibility`,
  `strip_accessibility_runs_even_without_image_work`, the fail-safe trio, dedup,
  and packing tests. They are the regression guard that the *default* behavior is
  byte-for-byte unchanged.
- Structural pattern to follow: `downsamples_over_resolution_image` (`amatl.rs:826`).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` exits 0; the 3 new tests
      exist and pass.
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
      exits 0.
- [ ] `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` exits 0.
- [ ] `grep -n "TARGET_DPI\|JPEG_QUALITY\|DPI_MARGIN" src-tauri/src/amatl.rs`
      shows the consts referenced **only** in their definitions and the `Default`
      impl — not inside `plan_replacement`.
- [ ] No files outside `src-tauri/src/amatl.rs` and `src-tauri/src/lib.rs` are
      modified (`git status --porcelain` lists only those two, plus `plans/README.md`).
- [ ] `plans/README.md` status row for 001 updated to DONE.

## STOP conditions

Stop and report back (do not improvise) if:

- The "Current state" excerpts do not match the live code (drift since `d3239b6`).
- `cargo test` fails to *compile* with an error other than the expected
  missing-field / unused-const errors between steps — especially anything from
  `mozjpeg`/NASM (a build-toolchain problem, not a code problem).
- A verification fails twice after a reasonable fix attempt.
- You find a *fourth* `OptimizeOptions { ... }` struct literal not listed in this
  plan — report it rather than editing it (the plan's call-site inventory is
  wrong and 002 depends on that inventory being complete).
- Making the change appears to require editing `pdf-utils.ts` or the
  `amatl_optimize` IPC signature — that is out of scope; report instead.

## Maintenance notes

- For the reviewer: the load-bearing change is the **manual `Default` impl**.
  Confirm it sets `target_dpi: 130.0`, `jpeg_quality: 78`, `dpi_margin: 1.15`. A
  derived `Default` here would be a silent, severe regression (downsample to
  ~1px); `default_options_match_documented_sweet_spot` guards it.
- Whoever adds a *fourth* tunable later: add the field, give it a default in the
  manual `Default` impl, and read+clamp it in `plan_replacement`. After plan 002
  lands, also add a `with_*` builder method (002 makes the struct
  `#[non_exhaustive]`, so external callers will construct via builders).
- Deferred out of this plan: exposing these knobs through the desktop app's IPC /
  UI, and the CLI flag surface. Both live downstream of crate extraction (see
  `docs/amatl-roadmap.md`) and are intentionally not part of this change.