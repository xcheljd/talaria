# TAURI BACKEND

**Generated:** 2025-01-06T20:36:02Z
**Commit:** 8cbaba1
**Branch:** main

## OVERVIEW

Rust IPC backend for desktop app. Manages download folder configuration via
Tauri dialogs, and provides in-app PDF optimization for promotion attachments.

## STRUCTURE

```
src-tauri/src/
├── main.rs                 # Entry point (calls lib::run())
├── lib.rs                  # IPC handlers (download dir + amatl_optimize)
└── amatl.rs                # PDF optimizer: mozjpeg downsample (see strategy below)
```

## WHERE TO LOOK

| Component       | Location                                          | Purpose                          |
| --------------- | ------------------------------------------------- | -------------------------------- |
| Download config | lib.rs: config_path()                             | appDataDir/downloads-config.json |
| IPC handlers    | lib.rs: get_download_dir(), choose_download_dir() | Folder dialog + persistence      |
| amatl (PDF opt) | lib.rs: amatl_optimize() + amatl.rs               | Shrink attached PDFs at upload   |
| Tauri setup     | lib.rs: run()                                     | Plugin init, invoke_handler      |

## IPC COMMANDS

```rust
get_download_dir()          // Returns configured folder or system downloads
choose_download_dir()       // Opens folder dialog, saves selection
read_file_as_data_url(path) // Drag-drop file:// URI handler (scoped reads)
save_file_to_dir(...)       // Writes base64 blob into download dir (silent; batch)
save_file_as(...)           // Native Save-As dialog; OS prompts on overwrite
amatl_optimize(data_url)    // Returns (possibly smaller) PDF data URL
```

## CONVENTIONS

- **Config path**: `app.path().app_data_dir()/downloads-config.json`
- **Default**: Falls back to `dirs::download_dir()` if not configured
- **Plugins**: tauri-plugin-dialog, tauri-plugin-fs
- **Storage**: JSON with DownloadConfig struct
- **amatl**: always fail-safe — on any error, parse failure, or when the result
  is not smaller, the original bytes are returned unchanged. Callers never need
  to special-case errors.

## amatl — PDF OPTIMIZATION STRATEGY

Promotion PDFs are ~80% embedded JPEG product thumbnails by byte count, and
~17% of file bytes are the PDF structure tree (`/StructTreeRoot` + ~2000
`/StructElem` objects — accessibility metadata for screen readers). amatl
attacks both:

**`amatl.rs`** (named for the Nahuatl word for fig-bark paper; intentionally
library-neutral so it can be extracted to its own crate for future
distribution) walks each page's content stream tracking the CTM to compute
effective DPI per image placement, downsamples over-resolution JPEGs to 130
DPI, re-encodes via **mozjpeg** (optimized Huffman + trellis quantization),
swaps the streams back via `lopdf`, optionally strips the structure tree, then
`renumber_objects()` + classic save so the output is `qpdf --check`-clean.
MIT/BSD licensed.

**Public API (library-neutral):**
- `optimize(bytes)` — convenience, accessibility-preserving (default).
- `optimize_with_options(bytes, OptimizeOptions)` — configurable. Currently the
  only option is `strip_accessibility: bool`.
- `OptimizeOptions::default()` is `strip_accessibility: false`, so the library
  is accessibility-preserving by default. Future external consumers of amatl
  would opt in deliberately.

**This app's binding (TS):** `amatl.optimize(dataURL)` in
`src/lib/pdf-utils.ts` calls `optimize_with_options` with
`strip_accessibility: true`. This is the Talaria app's
deliberate choice, hardcoded in the wrapper: promotion flyers are visual
documents for a sighted retail audience, and the gain matches industry behavior
(Ghostscript's `/ebook` and `/screen` presets strip the same data silently).
The IPC command `amatl_optimize` takes `strip_accessibility: bool` so the
configurability is preserved across the boundary; a different consumer could
pass `false`.

### Accessibility-strip decision (read before changing)

Stripping removes `/StructTreeRoot`, `/MarkInfo`, and `/Lang` from the catalog.
**Visually lossless; accessibility-lossy.** Every page and image renders
identically; the output degrades from "tagged" (PDF/UA-compatible) to
"untagged" — still readable as a flat image-like document, but no longer
navigable by screen readers (VoiceOver, NVDA, JAWS).

The decision to strip in this app was deliberate, not accidental:
- Audience: retail store managers reading promotion flyers — sighted use case.
- Content: watch photos + prices + dates, inherently visual.
- Precedent: Ghostscript's industry-standard presets do the same thing silently.
- Trade: ~18 percentage points of compression for accessibility data that has
  near-zero realistic use on this document type.

If this app's audience or content ever shifts (e.g. documents with substantial
semantic text that screen-reader users might actually consume), revisit this.
The library default of `strip_accessibility: false` means a future externalized
amatl would preserve accessibility unless the caller opts in.

Build note: mozjpeg compiles libjpeg-turbo, which needs **NASM** (+ a C
compiler) at build time. CI installs it via `ilammy/setup-nasm` in
`.github/workflows/build.yml`; cmake is already on the GitHub runners.

### Measured results (real promo file, 1376 KB original)

| Pipeline | Size | Reduction | `qpdf --check` | Accessibility | License |
| --- | --- | --- | --- | --- | --- |
| amatl library default (no strip) | 821 KB | 40% | clean | preserved | MIT/BSD |
| **amatl (this app, strip+pack) — SHIPPED** | **572 KB** | **59%** | clean | **stripped** | MIT/BSD |
| Ghostscript 130/Q78 /ebook | 530 KB | 62% | clean | stripped | AGPL |

mozjpeg makes the image payload match Ghostscript within ~0.01% (422 KB image
bytes in both). The structure-tree strip closes 18 of the 22 percentage points
to Ghostscript. Object-stream packing (off by default) closes only ~2 more
points post-strip and carries one benign warning — see "Object-stream packing"
below.

Validated: the shipped 597 KB output opened correctly (images intact) in the
user's real Outlook + Apple Mail via an actual EML round-trip through
`emailUtils.createEMLFile`.

### Object-stream packing (`pack_object_streams`) — implemented, off by default

Packing is implemented behind `OptimizeOptions.pack_object_streams` (default
`false`). It uses **lopdf's own** `save_with_options(use_object_streams,
use_xref_streams)` — not a hand-rolled writer and not qpdf. See `pack_and_save`.

It is **strictly `qpdf --check`-clean** (exit 0, zero warnings) across the whole
promo archive, all images intact — no sidecar, no qpdf, no hand-rolled writer.
Getting there took two findings about lopdf:

1. **`renumber_objects()` before save** (done by the caller) clears the hard
   "supposed object stream N is not a stream" errors an earlier attempt hit —
   those were a symptom of a non-contiguous id space, not a real packer bug.
   Still required.
2. **lopdf ≤ 0.41 omitted the xref stream's own self-entry** — `create_xref_steam`
   looped to a stale `xref.size` captured *before* the ObjStm/CRS object ids were
   assigned, so the highest id was skipped, leaving qpdf's benign warning
   "xref entry for the xref stream itself is missing". This needed a narrow
   byte-patching post-pass (`add_xref_self_entry`). **Fixed upstream in
   J-F-Liu/lopdf#501 and released in 0.42**, so the post-pass was deleted when
   the dep was bumped — `pack_and_save` now packs and saves directly. Verified:
   raw lopdf 0.42 packed output is `qpdf --check` exit 0 with zero warnings.

**Version ceiling.** lopdf is pinned at **0.42**. 0.43 and 0.44 do not compile
against current `time` (their `datetime.rs` calls `FormatItem::StringLiteral`,
which no longer exists in `time` 0.3.47 — the error is inside lopdf itself, not
our code). Re-test the bump when lopdf publishes a release that fixes this.

**Gain.** Post-strip the file is ~217 objects and only **1.9% of bytes** are
packable dict/scalar text:

| Category (unpacked output, 583 KB) | Bytes | % of file |
| --- | --- | --- |
| Stream bytes (183 streams — images + content) | 552,496 | 92.5% |
| Dict/scalar objects (34 remaining objects) | 11,523 | 1.9% |
| Overhead (xref, trailer) | 33,205 | 5.6% |

Measured packed output: **572 KB vs 583 KB unpacked — ~11 KB / 1.9% gain**, with
zero warnings. **The app enables it** (`packObjectStreams: true` in the TS
wrapper) — small but free now that it's strictly clean and EML-round-trip
validated. On accessibility-preserving / object-dense inputs (structure tree
*not* stripped) packing closes far more, which is the productization case. Do
NOT bundle qpdf: the per-file gain is a constant ~11 KB that doesn't compound,
against ongoing cross-platform native-build/maintenance cost.

### Why NOT Ghostscript (evaluated and rejected)

- **AGPL-3.0.** A commercialization landmine. The whole point of the permissive
  pipeline is that internal → commercial needs **zero** backend re-work.
- **Security surface.** Ghostscript has a long CVE history of RCE via crafted
  PostScript/PDF (`-dSAFER` escapes). This app ingests **arbitrary
  user-supplied PDFs** — exactly that threat model. The pure-Rust path is far
  narrower.
- **Bundling cost.** The Homebrew `gs` is not portable (10+ dylib deps, needs a
  static build, Windows build, per-platform code-signing).
- **Marginal upside.** Only ~4 points smaller than the shipped amatl output
  (530 vs 597 KB), all of it micro-optimizations across many small pieces —
  and the images already match it byte-for-byte. The same compression behavior
  (strip + downsample) is what gets amatl to 58%; the last 4% is not worth
  AGPL + RCE + bundling.

### lopdf save caveat (why `renumber_objects()` is required)

`lopdf`'s classic save emits a benign xref inconsistency (`/Size` slightly
higher than highest object number + 1) that trips `qpdf --check`. It's harmless
(`/Size` is an allocation hint; too-high just over-allocates), but
`renumber_objects()` before save makes the id space contiguous so `/Size` is
exact and the output is strictly clean.

### Acceptance bar for any change to the optimizer

Verify on real promo PDFs:
- `qpdf --check` reports zero warnings (not just poppler success).
- Pages and image count unchanged (`pdfinfo`, `pdfimages -list`).
- The optimized PDF opens and renders images correctly in Outlook + Apple Mail
  via an actual EML round-trip through `emailUtils.createEMLFile`. Poppler
  rendering alone is NOT sufficient.

## ANTI-PATTERNS

- Never hardcode paths - use `app.path().app_data_dir()`
- Never skip config parent directory creation - use `fs::create_dir_all()`
- Never reach for Ghostscript to "just compress harder" — it's AGPL and a known
  RCE surface on untrusted input. amatl already matches its image payload
  byte-for-byte, and after the structure-tree strip the gap is only ~4 points
  of micro-optimizations (see strategy). Not worth the cost.
- Always `renumber_objects()` before saving — both the classic (default) and
  the packed (`save_with_options`) paths depend on a contiguous id space.
  Without it the classic save warns on `/Size` and the packed save emits
  *invalid* object streams.
- Don't bump `lopdf` past 0.42 without checking it compiles — 0.43/0.44 fail to
  build against current `time` (see "Version ceiling" in the packing section).
  The `add_xref_self_entry` post-pass that used to be required is gone as of
  0.42; don't reintroduce it.
- Keep the optimizer fail-safe: any error or non-smaller result returns the
  original bytes unchanged.
