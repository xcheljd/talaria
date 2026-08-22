# Amatl — Independence Roadmap

This document plans the transition of **amatl** — the pure-Rust PDF size
optimizer currently living at `src-tauri/src/amatl.rs` — from an embedded module
of this app into a standalone, openly published project.

> **Primary goal: credibility / portfolio.** Amatl is being extracted first and
> foremost as a polished open-source showcase of engineering quality. Reach and
> reputation are the success metrics; revenue is an explicit non-goal for now
> (kept only as deliberate optionality — see [§7](#7-monetization-optionality-deferred)).
> Every decision below is weighed against "does this make Amatl a stronger,
> more credible thing to put my name on," not "does this make money."

> Scope: the optimizer in `src-tauri/src/amatl.rs` and its binding in
> `src-tauri/src/lib.rs` (`amatl_optimize`) + `src/lib/pdf-utils.ts` (`amatl.optimize`).
> The deep engineering rationale already lives in `src-tauri/src/AGENTS.md` and is
> the source material for Amatl's public README — this doc is the *transition
> plan*, not a re-derivation of the design.

---

## 1. What Amatl is (the honest core)

Stripped of the app, Amatl is ~1,000 lines of pure Rust that does one clever
thing well: it walks each PDF page's content stream tracking the current
transformation matrix, computes the **effective DPI** of every embedded JPEG at
the size it is actually rendered, and downsamples only the over-resolution images
to ~130 DPI / Q78 via mozjpeg — matching Ghostscript's image bytes within 0.01%.
Plus optional accessibility-strip, duplicate-object merge, and PDF 1.5
object-stream packing.

Four library dependencies — `lopdf` (MIT), `image` (MIT OR Apache-2.0),
`mozjpeg` (IJG/BSD-3-Clause), `rayon` (MIT OR Apache-2.0; pure Rust, no native
deps, used for parallel image planning) — all permissive. No native runtime
dependency.

**Amatl's differentiators are not "best compression ratio."** It deliberately
ties Ghostscript on image payload. Its actual edges:

1. **CTM-aware, effective-DPI downsampling.** Each image is sized to its *largest
   actual on-page placement* (`collect_placements`), not to a blind fixed DPI.
   This is the genuinely novel engineering and the centerpiece of the story.
2. **A hard fail-safe contract.** `catch_unwind` boundary, never returns larger
   output, never returns a corrupt PDF, always returns valid bytes. Safe to run
   on untrusted input in a pipeline.
3. **Permissive license, no Ghostscript / AGPL / RCE surface.** The reason it
   exists instead of shelling out to `gs` (see "Why NOT Ghostscript" in
   `AGENTS.md`). This is the commercial-embedding unlock.
4. **Dependency-light and local.** Nothing leaves the machine.

> **Framing that should appear in the README:** Amatl's audience is not an
> end-user shrinking one PDF — it's a **developer or company embedding PDF
> compression into their own product or pipeline** who can't ship AGPL
> Ghostscript and won't upload customer documents to a third-party web tool. The
> commoditized consumer "shrink my PDF" market is not the target.

---

## 2. Viability (read before investing further)

| Lens | Verdict |
| --- | --- |
| Direct paid product | **Low.** Compression is commoditized; free web tools own consumer mindshare; the compression delta over Ghostscript is ~zero by design. |
| Permissively-licensed dev infrastructure | **Genuinely viable & differentiated.** "Embeddable PDF compression without AGPL or a SaaS upload" is a concrete, recurring need. |
| Portfolio / credibility asset & funnel | **High.** The code quality and the *documented reasoning* (`AGENTS.md`) make it a standout showcase even if it never earns a dollar. |

Given the credibility/portfolio goal, the asset is the project itself: clean
code, a compelling story, rigorous tests, and visible engineering judgment. The
roadmap optimizes for *that*, with adoption as a credibility signal and revenue
as deferred optionality.

---

## 3. Licensing decision

| Model | Fit |
| --- | --- |
| **Pure OSS** (MIT OR Apache-2.0 crate + CLI + WASM) | **Chosen.** Matches the license already recorded in `Cargo.toml`, maximizes reach and reputation. |
| Open-core (core MIT, paid layer on top) | Deferred option if traction appears ([§7](#7-monetization-optionality-deferred)). |
| Dual-license for revenue | **Rejected.** Only bites when the open license is copyleft; making it bite means relicensing the core, which destroys the embeddability that is Amatl's entire reason to exist. |
| Hosted SaaS / consumer app | **Rejected for now.** Re-enters the crowded Smallpdf/iLovePDF field and takes on the document-privacy liability the local-first story sells against. |

> **The one tension to internalize:** you cannot both maximize permissive
> embeddability *and* force payment through licensing. Pick embeddability (it is
> the moat) and, if ever monetizing, do it through adjacent things — support,
> hosting, pro modules — never by gating the core.

`amatl` is **available on crates.io** (404 on the registry API as of this
writing). npm availability is unconfirmed (only relevant if the WASM path ships).

---

## 4. Phase 0 — Identity & boundaries

- **Name:** claim `amatl` on crates.io, the GitHub repo, and ideally a domain
  before any public announcement.
- **Surfaces, in priority order:** crate → CLI → WASM demo. The CLI is the
  single highest-leverage artifact for reach.
- **API stability:** start at `0.x`; pin `optimize` / `optimize_with_options` /
  `OptimizeOptions` as the public surface and treat changes to it as semver
  events.

---

## 5. Phase 1 — Extraction (the "git mv")

The seam is already clean: `lib.rs` only calls `amatl::optimize_with_options`,
and every test in `amatl.rs` is library-level with zero Tauri coupling. The
author pre-recorded the license in `Cargo.toml` specifically so this step is a
move, not a rewrite.

- `git mv src-tauri/src/amatl.rs` → new repo `amatl/src/lib.rs`; tests travel
  with it.
- New `Cargo.toml`: `name = "amatl"`, `license = "MIT OR Apache-2.0"` (already
  chosen), plus `keywords`, `categories`, and docs.rs metadata. Carry over
  `rust-version = "1.85.0"` (MSRV, recorded in the app's `Cargo.toml`; the
  floor is dependency-driven — lopdf 0.42.0 ships an edition-2024 manifest,
  which needs Cargo/Rust >= 1.85, as amatl's CI MSRV job proved when 1.77.2
  failed to resolve) and add a CI job that verifies the crate builds on that
  toolchain. Deps: `lopdf`,
  `image` (default-features off, `jpeg` only), `mozjpeg`, `rayon = "1"` (locked
  1.12.0; pure Rust, MIT OR Apache-2.0, no native deps — used for parallel
  image planning).
  - **lopdf hard ceiling: 0.42.** 0.43 and 0.44 do not compile against current
    `time` (their `datetime.rs` calls `FormatItem::StringLiteral`, which no
    longer exists in `time` 0.3.47 — the error is inside lopdf itself, not our
    code). Re-test the bump when lopdf publishes a release that fixes this.
- Add `LICENSE-MIT` + `LICENSE-APACHE` (Rust dual-license convention).
- **README** assembled from material that already exists in `AGENTS.md`: the
  Nahuatl etymology, the effective-DPI insight, the measured benchmark table, and
  the "Why NOT Ghostscript" section. This narrative *is* the portfolio value —
  invest in it.
- CI: replicate the Rust test/lint setup from `.github/workflows/rust.yml`
  (pinned `dtolnay/rust-toolchain` stable + clippy, `ilammy/setup-nasm` for
  mozjpeg's SIMD build, `Swatinem/rust-cache`, `cargo test`, and
  `cargo clippy --all-targets -- -D warnings`). On extraction, drop the
  Tauri-specific steps (the apt system-library install and the frontend
  dist-stub) — they exist only because the app crate links the webview.
- The app then depends on the published/path/git crate. The Tauri
  `amatl_optimize` command and the TS wrapper (`src/lib/pdf-utils.ts`) **stay in
  the app** — they are the binding, not the library.

> Verification bar for the extraction: the existing Rust tests pass unchanged in
> the new crate, and the app builds and produces byte-identical optimizer output
> against a known promo PDF before and after the switch.

---

## 6. Phase 2 — Make it reachable

- **crates.io publish** → Rust developers; `docs.rs` renders the (already
  excellent) doc comments for free.
- **`amatl` CLI:** e.g. `amatl in.pdf -o out.pdf --target-dpi 130 --quality 78
  --strip-accessibility`. The tunables are already in `OptimizeOptions` (shipped
  in 9a68bd3/b7f0cf9) — the CLI is just a thin binary over
  `optimize_with_options`. Ship prebuilt binaries via `cargo-binstall`,
  Homebrew, and GitHub Releases.
- **WASM build + demo site:** "compress in your browser — nothing uploaded" is
  the strongest privacy story and doubles as a portfolio centerpiece.
  - **Decision required:** mozjpeg is C (libjpeg-turbo). It *can* compile to WASM
    (Squoosh does it) but it's non-trivial. The pure-Rust `image` JPEG encoder is
    WASM-trivial but compresses worse — the exact gap mozjpeg was added to close.
    So the WASM path forks into easy-but-worse vs. hard-but-best. For a portfolio
    demo, even the easy path is a compelling artifact; the hard path is a
    credibility flex if time allows.

---

## 7. Phase 3 — "Cover other tools' use cases, but better"

Today Amatl does one thing (over-resolution baseline-JPEG downsampling + strip +
pack). To genuinely rival general-purpose tools, expand deliberately — each item
is a real differentiator, roughly in value/effort order:

| Capability | Why it matters | Lift |
| --- | --- | --- |
| Configurable targets (DPI/quality/margin) | Table stakes for a general tool | Low (done in Phase 2) |
| **More image filters** — `FlateDecode` (PNG-like), then `CCITT`/`JBIG2` | Currently only `DCTDecode`. Flate widens applicability; CCITT/JBIG2 unlocks the huge scanned-document → email use case | Medium → High |
| **Font subsetting** | The biggest win on text-heavy PDFs with no large images — exactly where qpdf/mutool/gs beat Amatl today, and where it does nothing. **Tractable in pure Rust:** [`typst/subsetter`](https://crates.io/crates/subsetter) is MIT OR Apache-2.0, `forbid(unsafe)`, a single dependency, ~2.6M downloads, actively maintained (v0.2.6, 2026-06), and purpose-built for embedding subset fonts in PDFs (it powers Typst's PDF export). | Medium (integrate `subsetter`) / High (hand-rolled) |
| **Accessibility-preserving compression as a *feature*** | Amatl's default already preserves the structure tree, unlike gs `/ebook` which silently strips it. "The compressor that keeps your PDFs accessible / PDF·UA-safe" is positioning no mainstream tool owns | Low (positioning) |
| Transparency/`SMask` images; batch/folder CLI mode | Closes the "skipped image" gaps and adds bulk ergonomics | Medium |

> The accessibility-preserving angle is the cheapest credibility differentiator
> and aligns with the library default (`strip_accessibility: false`). Lead with it.

### Dependency philosophy — the two-axis rule

"Pure Rust" was never the actual goal; it is a proxy for two *separate* properties
that should be decided independently:

- **Axis A — toolchain purity** (pure Rust vs. allowing C/C++ libraries). Buys
  trivial cross-compilation, an easy WASM build, and simple distribution. A
  convenience/portability property — **negotiable**.
- **Axis B — license + attack surface** (permissive + narrow vs. AGPL +
  interpreter). The reason Amatl exists instead of shelling out to Ghostscript:
  no AGPL landmine, and a narrow parser instead of a PostScript interpreter with
  an RCE history. **Non-negotiable — this is the moat.**

Amatl already relaxed Axis A once (mozjpeg is C/libjpeg-turbo, statically linked,
build-time NASM, no runtime dep). So the question is never "pure Rust or not" — it
is *where to draw the C line*, and the rule is: **relax Axis A only for
permissively-licensed, narrow-purpose leaf libraries, never for AGPL engines
(Ghostscript, MuPDF) regardless of capability.**

The practical resolution after the 2026-06 ecosystem review:

- **Fonts (the tempting case): no C needed.** `typst/subsetter` provides
  production-grade, MIT-OR-Apache, `forbid(unsafe)` PDF font subsetting in pure
  Rust. The highest-value expansion stays on Axis A. (Verify CID-keyed/Type0 CJK
  coverage on real samples — the README emphasizes TrueType/CFF outlines, though
  Typst ships CJK PDFs with it.)
- **If a genuinely exotic need appears** (CFF2, color fonts COLR/CBDT, or color
  management via lcms2), prefer feature-gated C leaf deps over a wholesale switch:
  ship a default pure-Rust build plus an opt-in Cargo feature (e.g.
  `font-subset-hb` → `hb-subset`, HarfBuzz "Old MIT") so the embeddable/WASM story
  survives for consumers who don't need the extra. Keep the `catch_unwind`
  fail-safe boundary around any C parser, since font parsing is a classic
  memory-safety exploit surface and Amatl ingests untrusted PDFs.

Bottom line: the maturity of the Rust font ecosystem makes the *capability*
argument for abandoning Axis A weak. Keep the Rust core + fail-safe contract;
treat C as an optional, feature-gated last resort, never the default.

---

## 8. Monetization optionality (deferred)

Not a current goal. Recorded so the door stays open without compromising the
permissive core:

- **GitHub Sponsors / Open Collective** from day one (near-zero effort).
- **Open-core pro layer** if traction appears: hosted batch API, GUI app, or
  advanced modules (OCR, redaction, PDF/A certification) — core stays MIT.
- **Commercial support / indemnification** contracts — work *even with MIT*,
  because you're selling a warranty and support, not the bits.

If a forcing-function is ever wanted, apply a source-available license (BSL /
fair-source) to a **separate pro module**, never to the optimizer core.

---

## 9. Concrete code deltas extraction requires

Items 2–8 remain; item 1 shipped:

1. ~~Promote `TARGET_DPI` / `JPEG_QUALITY` / `DPI_MARGIN` (`amatl.rs:34–39`) from
   `const`s to `OptimizeOptions` fields — unblocks the CLI and general use.~~
   **Shipped**: `OptimizeOptions` now carries `target_dpi` / `jpeg_quality` /
   `dpi_margin` with `#[non_exhaustive]` + builder setters (9a68bd3, b7f0cf9;
   plans/001+002).
2. Drop the two `#[allow(dead_code)]` attributes: on the `OptimizeOptions`
   builder impl block (`amatl.rs:132`) and on `optimize()` (`amatl.rs:177`).
   Both exist only because the app doesn't call those surfaces; both come off
   at extraction once the module is public and they're reachable from outside.
3. Un-ignore the `OptimizeOptions` doctest (`amatl.rs:63–70`). It is `ignore`d
   today only because `amatl` is a private module in this app; making the
   module `pub` at extraction turns it into a compiled doctest.
4. De-app-ify the wording: doc comments still reference the
   "communication-templates" app (`amatl.rs` lines 44, 55, 175, 843, plus the
   real-file test's doc comment near 1447) — rewrite for a standalone library.
   (The opt-in test env vars have already been renamed `CCT_TEST_*` →
   `AMATL_TEST_PDF` / `AMATL_TEST_PACK` / `AMATL_TEST_OUT` in-repo.)
5. Add crate metadata (keywords/categories/docs.rs) and a README.
   `LICENSE-MIT` + `LICENSE-APACHE` now exist at this repo's root and travel
   with the extraction. A redistributable test fixture
   (`src-tauri/fixtures/sample.pdf`, regenerable via the programmatic generator
   `src-tauri/tests/generate_fixture.rs`) and a Ghostscript-comparison
   benchmark script (`scripts/bench-vs-gs.sh`) also exist in-repo and travel
   with it.
6. New-repo CI with NASM + a C compiler for mozjpeg (port from `rust.yml`,
   dropping the Tauri-only steps — see [§5](#5-phase-1--extraction-the-git-mv)).
7. **Phase 2 licensing note:** mozjpeg's IJG license requires the statement
   "this software is based in part on the work of the Independent JPEG Group"
   in documentation accompanying **binary** distributions. Source-only
   distribution (crates.io) doesn't trigger it; create a `NOTICE` file when
   Phase 2 ships prebuilt binaries (deferred by approved decision).
8. App switches from `mod amatl;` to a Cargo dependency; the IPC command and TS
   wrapper are unchanged.

---

## 10. Recommended sequence

1. **Phase 0 + 1** — claim the name, extract to its own repo with README +
   licenses + CI. Lowest risk, highest credibility-per-hour; the code was built
   for it.
2. **Phase 2 CLI** — the tunables are already in `OptimizeOptions` (9a68bd3) —
   the CLI is now just a thin binary over `optimize_with_options`; the artifact
   most people can actually run.
3. **Phase 2 WASM demo** — the portfolio centerpiece (pick the encoder trade-off).
4. **Phase 3** — expand format coverage / font subsetting only as interest and
   time warrant; lead public messaging with the accessibility-preserving angle.
5. **Phase 4 (monetization)** — only if and when adoption signals it.