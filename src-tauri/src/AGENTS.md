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
├── lib.rs                  # IPC handlers (download dir + PDF optimize)
└── pdf_optimize.rs         # PDF optimizer: mozjpeg downsample (see strategy below)
```

## WHERE TO LOOK

| Component       | Location                                          | Purpose                          |
| --------------- | ------------------------------------------------- | -------------------------------- |
| Download config | lib.rs: config_path()                             | appDataDir/downloads-config.json |
| IPC handlers    | lib.rs: get_download_dir(), choose_download_dir() | Folder dialog + persistence      |
| PDF optimize    | lib.rs: optimize_pdf() + pdf_optimize.rs          | Shrink attached PDFs at upload   |
| Tauri setup     | lib.rs: run()                                     | Plugin init, invoke_handler      |

## IPC COMMANDS

```rust
get_download_dir()          // Returns configured folder or system downloads
choose_download_dir()       // Opens folder dialog, saves selection
read_file_as_data_url(path) // Drag-drop file:// URI handler (scoped reads)
save_file_to_dir(...)       // Writes base64 blob into download dir (silent; batch)
save_file_as(...)           // Native Save-As dialog; OS prompts on overwrite
optimize_pdf(data_url)      // Returns (possibly smaller) PDF data URL
```

## CONVENTIONS

- **Config path**: `app.path().app_data_dir()/downloads-config.json`
- **Default**: Falls back to `dirs::download_dir()` if not configured
- **Plugins**: tauri-plugin-dialog, tauri-plugin-fs
- **Storage**: JSON with DownloadConfig struct
- **PDF optimize**: always fail-safe — on any error, parse failure, or when the
  result is not smaller, the original bytes are returned unchanged. Callers
  never need to special-case errors.

## PDF OPTIMIZATION STRATEGY

Promotion PDFs are ~80% embedded JPEG product thumbnails by byte count, so the
only meaningful compression lever is **image downsampling**. The shipped path is
pure Rust — no sidecar, no external binary, fully permissive-licensed:

**`pdf_optimize.rs`** walks each page's content stream tracking the CTM to
compute effective DPI per image placement, downsamples over-resolution JPEGs to
130 DPI, re-encodes via **mozjpeg** (optimized Huffman + trellis quantization),
swaps the streams back via `lopdf`, then `renumber_objects()` + classic save so
the output is `qpdf --check`-clean. MIT/BSD licensed.

Build note: mozjpeg compiles libjpeg-turbo, which needs **NASM** (+ a C
compiler) at build time. CI installs it via `ilammy/setup-nasm` in
`.github/workflows/build.yml`; cmake is already on the GitHub runners.

### Measured results (real promo file, 1376 KB original)

| Pipeline | Size | Reduction | `qpdf --check` | License |
| --- | --- | --- | --- | --- |
| Rust (basic encoder) | 1031 KB | 27% | clean | MIT |
| **Rust (mozjpeg) — SHIPPED** | **821 KB** | **40%** | clean | MIT/BSD |
| Rust (mozjpeg) + qpdf pack | 608 KB | 56% | clean | + Apache |
| Ghostscript 130/Q78 | 530 KB | 62% | clean | AGPL |

mozjpeg makes the image payload **byte-identical to Ghostscript (422 KB)** — the
images are fully optimized. The shipped 40% leaves structural objects
uncompressed; the remaining gap to 56%/62% is *entirely* PDF structure, not
image quality. Validated: the 56% output opened correctly (images intact) in
the user's real Outlook + Apple Mail via an actual EML round-trip, and the
shipped 40% output has byte-identical images.

### Optional future upgrade: qpdf object-stream packing (~56%)

`qpdf --object-streams=generate` packs the ~2700 uncompressed structural
objects, reaching 56% — clean and Apache-2.0. **Deferred, not implemented**,
because the only way to invoke it (sidecar binary or the `qpdf-sys` bindgen
crate) adds a fragile cross-platform native build for a marginal 16% structural
gain. Revisit only if 40% proves insufficient in the field. Do NOT use lopdf's
`save_modern()` to pack structure in-process — it emits **invalid object
streams** (`qpdf --check`: "supposed object stream N is not a stream"). Verified.

### Why NOT Ghostscript (evaluated and rejected)

- **AGPL-3.0.** A commercialization landmine. The whole point of the permissive
  pipeline is that internal → commercial needs **zero** backend re-work.
- **Security surface.** Ghostscript has a long CVE history of RCE via crafted
  PostScript/PDF (`-dSAFER` escapes). This app ingests **arbitrary
  user-supplied PDFs** — exactly that threat model. The pure-Rust path is far
  narrower.
- **Bundling cost.** The Homebrew `gs` is not portable (10+ dylib deps, needs a
  static build, Windows build, per-platform code-signing).
- **Marginal upside.** Only ~6 points smaller than the (already-deferred) qpdf
  option, all of it structure — and the images already match it byte-for-byte.

### lopdf save caveat (why `renumber_objects()` is required)

`lopdf` 0.41's classic save emits a benign xref inconsistency (`/Size` slightly
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
  RCE surface on untrusted input. The mozjpeg image payload already matches it
  byte-for-byte; the only gap is marginal structure (see strategy).
- Never use lopdf's `save_modern()` (object streams) — it emits invalid object
  streams. Use classic save + `renumber_objects()` (and an external `qpdf` pack
  pass only if structure packing is ever needed).
- Keep the optimizer fail-safe: any error or non-smaller result returns the
  original bytes unchanged.
