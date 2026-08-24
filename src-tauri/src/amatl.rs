//! **amatl** — pure-Rust PDF size optimization.
//!
//! Named for the Nahuatl word for the fig-bark paper used in pre-Columbian
//! Mesoamerican codices. Amatl shrinks PDFs by downsampling over-resolution
//! embedded images to the resolution they are actually rendered at.
//!
//! For the dominant input shape this targets — business documents (flyers,
//! catalogs, decks, reports) exported from office suites, where embedded JPEG
//! product photos are ~80% of file bytes — a measured sweet spot of ~130 DPI /
//! JPEG quality 78 yields ~40-60% smaller files with no perceptible quality
//! loss at the displayed size. Image bytes are matched within ~0.01% of
//! Ghostscript's output via mozjpeg (optimized Huffman + trellis quantization).
//!
//! Strategy (lossy only on over-resolution images, never on text/vectors):
//!   1. Walk each page's content stream, tracking the CTM, to compute the
//!      on-page rendered size (in points) of every painted image XObject.
//!   2. For DCTDecode (JPEG) images whose *effective* DPI exceeds the target,
//!      decode, resize to the target pixel dimensions, and re-encode as JPEG.
//!      For FlateDecode raster images (screenshots, exported bitmaps), decode,
//!      resize, and re-deflate — same format, `/ColorSpace` untouched, so no
//!      JPEG artifacts are ever introduced on that content class.
//!   3. Replace the stream only when the result is actually smaller.
//!
//!   Soft-masked DCTDecode images (`/SMask`) follow the Phase 5 D-milestone
//!   rules: over-resolution pairs are **downsampled as a unit** (D-M2) — the
//!   base JPEG and its `/SMask` stream are resampled to the SAME target
//!   geometry and replaced together or not at all — while pairs at or below
//!   the target resolution take the dimension-preserving D-M1 requantization
//!   (the base is re-encoded at the configured JPEG quality at its OWN
//!   dimensions, never resized, and the `/SMask` stream is never modified).
//!   Both apply only when the mask is a plain 8-bit DeviceGray image stream
//!   with no `/Matte`. `/Mask` (stencil/color-key) images and any ineligible
//!   `/SMask` stay untouched.
//!
//!   Soft-masked FlateDecode bases (D-M3) take the coupled downsample when
//!   over-resolution; otherwise they are untouched by default, and with the
//!   `allow_lossy_reencode` consent flag they take the dimension-preserving
//!   Flate→JPEG conversion. That conversion rewrites the base stream only —
//!   the `/SMask` object keeps its bytes and its dimensions, so alignment is
//!   preserved by construction (and shared masks stay safe for the same
//!   reason the D-M1 requant is safe for them). Under the same flag the
//!   over-resolution coupled downsample also runs a JPEG competitor at its
//!   TARGET geometry, against the losslessly resampled mask, so a masked pair
//!   reaches its final encoding in one pass instead of two.
//!
//! By default (opt-out via [`OptimizeOptions::subset_fonts`]), embedded
//! Type0/CIDFontType2 (Identity-H/V) fonts and nonsymbolic simple TrueType
//! fonts (WinAnsi/MacRoman) are subset to the glyphs actually shown, using
//! techniques that never rewrite content-stream text bytes (see
//! `src/fonts.rs`).
//!
//! Hard safety guarantees:
//!   - Images we can't measure a placement for are left untouched.
//!   - Images already at/below the target DPI are left untouched (no upscaling).
//!   - A re-encode that isn't smaller is discarded.
//!   - Any failure (parse, decode, save) falls back to the original bytes.


mod bitonal {
//! B-M1: lossless recompression of bitonal (1-bit) images to CCITT G4.
//!
//! Two source shapes feed the same G4 re-encode (docs/PHASE3-PLAN.md §B):
//! CCITT-stored images (G4 `/K < 0`, or EOL-framed G3 1D `/K 0` with
//! `/EndOfLine true`) and Flate-stored 1-bit images. Both decode to the same
//! intermediate — packed 1-bit sample rows, exactly the PDF image-data layout
//! — which is re-encoded as G4 with normalized `/DecodeParms` (`/K -1`,
//! `/BlackIs1 false`). Pixels are never resampled; `/Width`/`/Height` never
//! change; the stream is replaced only when the G4 payload is strictly
//! smaller (including the `/DecodeParms` overhead) AND a decode-back pass
//! reproduces the source samples bit-for-bit.
//!
//! Eligibility posture mirrors A-M1: every gate failure returns `None` and the
//! image is left byte-identical. Gates encode the `fax` 0.3.0 decoder contract
//! verified in the vetting spike (§B.3.1): `decode_g3` is 1D-only and
//! EOL-framed, so `/K > 0` and EOL-less `/K 0` streams are skipped; the G4
//! decoder has no fill-bit handling, so `/EncodedByteAlign true` is skipped;
//! `decode_g4`'s lenient tail handling is bypassed by driving `Group4Decoder`
//! directly and demanding exactly `/Height` rows followed by a clean EOFB.

use std::convert::Infallible;

use fax::decoder::{pels, DecodeStatus, Group3Decoder, Group4Decoder};
use fax::encoder::Encoder;
use fax::{Color, VecWriter};
use lopdf::{Document, Object, ObjectId};
use rayon::prelude::*;

use super::{classify_filter, inflate_capped, num, resolve, FilterClass};

/// Pixel-count ceiling for the bitonal pass: 2^28 ≈ 268M pixels (32 MiB of
/// packed samples), roughly 2× an A4 page scanned at 1200 dpi. Guards the
/// sample-buffer allocation before any decoding happens.
const MAX_BITONAL_PIXELS: u64 = 1 << 28;

/// Serialized cost of the dictionary edits a replacement forces on the image:
/// `/Filter /CCITTFaxDecode` plus the normalized `/DecodeParms` dict
/// (`/K -1 /Columns n /Rows n /BlackIs1 false`, ~60 bytes). The never-larger
/// guard charges the new payload for it, mirroring the Flate path's
/// `PARMS_OVERHEAD` accounting.
const CCITT_PARMS_OVERHEAD: usize = 80;

/// A planned bitonal replacement, computed read-only before mutating the doc.
/// `columns`/`rows` echo the unchanged `/Width`/`/Height` for the new
/// `/DecodeParms`.
pub(crate) struct BitonalReplacement {
    pub id: ObjectId,
    pub content: Vec<u8>,
    pub columns: i64,
    pub rows: i64,
}

/// Plan G4 recompression for every eligible bitonal image XObject. Runs over
/// all image streams, not just painted ones: the transform is lossless, so
/// placement (and `/SMask`/`/Mask` presence) is irrelevant — the sample data
/// is preserved bit-for-bit under any use.
pub(crate) fn plan_bitonal_recompressions(doc: &Document) -> Vec<BitonalReplacement> {
    let ids: Vec<ObjectId> = doc
        .objects
        .iter()
        .filter_map(|(&id, obj)| {
            let stream = obj.as_stream().ok()?;
            matches!(
                stream.dict.get(b"Subtype").map(|s| resolve(doc, s)),
                Ok(Object::Name(n)) if n == b"Image"
            )
            .then_some(id)
        })
        .collect();
    ids.par_iter().filter_map(|&id| plan_one(doc, id)).collect()
}

/// Decode one bitonal image to packed samples, re-encode as G4, and return a
/// replacement if it is strictly smaller and verified. `None` = untouched.
fn plan_one(doc: &Document, id: ObjectId) -> Option<BitonalReplacement> {
    let stream = doc.get_object(id).ok()?.as_stream().ok()?;
    let dict = &stream.dict;

    // 1-bit only. `/ImageMask true` implies 1 bit per sample, so an absent
    // `/BitsPerComponent` is acceptable there; anything else must say 1.
    let image_mask = matches!(
        dict.get(b"ImageMask").map(|o| resolve(doc, o)),
        Ok(Object::Boolean(true))
    );
    let bpc = dict
        .get(b"BitsPerComponent")
        .ok()
        .map(|o| resolve(doc, o))
        .and_then(|o| o.as_i64().ok());
    match bpc {
        Some(1) => {}
        None if image_mask => {}
        _ => return None,
    }

    // DeviceGray or the implicit ImageMask colorspace only. Indexed and
    // friends remap samples; out of scope.
    match dict.get(b"ColorSpace") {
        Err(_) if image_mask => {}
        Ok(cs) => {
            if !matches!(resolve(doc, cs), Object::Name(n) if n == b"DeviceGray") {
                return None;
            }
        }
        Err(_) => return None,
    }

    // `/Decode` remaps sample values; only the identity [0 1] (a no-op) is
    // accepted. `[1 0]` could be normalized by inversion, but that changes a
    // dictionary the rest of the toolchain may key on — out of M1 scope.
    if let Ok(decode) = dict.get(b"Decode") {
        let Object::Array(items) = resolve(doc, decode) else {
            return None;
        };
        if items.len() != 2 || num(&items[0]) != 0.0 || num(&items[1]) != 1.0 {
            return None;
        }
    }

    let width = dict
        .get(b"Width")
        .ok()
        .map(|o| resolve(doc, o))
        .and_then(|o| o.as_i64().ok())?;
    let height = dict
        .get(b"Height")
        .ok()
        .map(|o| resolve(doc, o))
        .and_then(|o| o.as_i64().ok())?;
    if width <= 0 || height <= 0 {
        return None;
    }
    if (width as u64).checked_mul(height as u64)? > MAX_BITONAL_PIXELS {
        return None;
    }
    let (w, h) = (width as u32, height as usize);

    let filter = dict.get(b"Filter").ok()?;
    let samples = match classify_filter(doc, filter) {
        FilterClass::CcittOnly => decode_ccitt_source(stream, w, h)?,
        FilterClass::FlateOnly => decode_flate_bitonal(stream, w, h)?,
        _ => return None,
    };

    let g4 = encode_g4_from_samples(&samples, w, h);

    // Never-larger guard: the new payload plus its forced dictionary edits
    // must be strictly smaller than the bytes it replaces.
    if g4.len() + CCITT_PARMS_OVERHEAD >= stream.content.len() {
        return None;
    }

    // Decode-back verification: the replacement ships only if decoding it
    // under the exact `/DecodeParms` we will write reproduces the source
    // samples bit-for-bit. Turns any encoder defect into a skip, never a
    // corrupt image.
    if decode_g4_strict_to_samples(&g4, w, h, false)? != samples {
        return None;
    }

    Some(BitonalReplacement {
        id,
        content: g4,
        columns: width,
        rows: height,
    })
}

/// Decode a CCITT-stored source stream to packed samples, honoring its
/// `/DecodeParms`. Every unsupported parameter is a gate-skip, not an error.
fn decode_ccitt_source(stream: &lopdf::Stream, w: u32, h: usize) -> Option<Vec<u8>> {
    // Direct-dictionary `/DecodeParms` only, mirroring `flate_encoding`'s
    // posture (array and indirect-reference forms are out of scope).
    let parms = match stream.dict.get(b"DecodeParms") {
        Err(_) => None,
        Ok(Object::Dictionary(d)) => Some(d),
        Ok(_) => return None,
    };
    let get_i = |key: &[u8], default: i64| {
        parms
            .and_then(|p| p.get(key).ok().and_then(|o| o.as_i64().ok()))
            .unwrap_or(default)
    };
    let get_b = |key: &[u8], default: bool| {
        parms
            .and_then(|p| p.get(key).ok().and_then(|o| o.as_bool().ok()))
            .unwrap_or(default)
    };

    // `/Columns` (default 1728) and a present `/Rows` must agree with the
    // image dictionary, or the stream's own geometry can't be trusted.
    if get_i(b"Columns", 1728) != i64::from(w) {
        return None;
    }
    let rows_parm = get_i(b"Rows", 0);
    if rows_parm != 0 && rows_parm != h as i64 {
        return None;
    }
    // fax's G4 decoder reads a continuous bitstream — it has no fill-bit
    // handling between coding lines — so byte-aligned streams are undecodable
    // by it. Fail-safe skip (§B.3.1).
    if get_b(b"EncodedByteAlign", false) {
        return None;
    }
    // Our strict decoders demand proper termination (EOFB / RTC); a stream
    // declaring `/EndOfBlock false` promises neither. Skip.
    if !get_b(b"EndOfBlock", true) {
        return None;
    }
    // Lenient damaged-row recovery is the opposite of our replacement bar.
    if get_i(b"DamagedRowsBeforeError", 0) != 0 {
        return None;
    }
    let black_is_1 = get_b(b"BlackIs1", false);

    let k = get_i(b"K", 0);
    if k < 0 {
        decode_g4_strict_to_samples(&stream.content, w, h, black_is_1)
    } else if k == 0 {
        // `decode_g3` requires EOL framing (mandatory initial EOL, RTC
        // terminator); `/K 0` streams without `/EndOfLine true` are misframed
        // by it (§B.3.1), and `/K > 0` (mixed 2D) is unsupported outright.
        if !get_b(b"EndOfLine", false) {
            return None;
        }
        decode_g3_strict_to_samples(&stream.content, w, h, black_is_1)
    } else {
        None
    }
}

/// Inflate a Flate-stored 1-bit image to its packed sample rows. Only plain
/// deflate (no predictor) is in scope; the strict capped inflate plus an exact
/// length check rejects truncated or lying streams.
fn decode_flate_bitonal(stream: &lopdf::Stream, w: u32, h: usize) -> Option<Vec<u8>> {
    match stream.dict.get(b"DecodeParms") {
        Err(_) => {}
        Ok(Object::Dictionary(d)) => {
            if d.get(b"Predictor")
                .ok()
                .and_then(|o| o.as_i64().ok())
                .unwrap_or(1)
                != 1
            {
                return None;
            }
        }
        Ok(_) => return None,
    }
    let stride = (w as usize).div_ceil(8);
    let expected = stride.checked_mul(h)?;
    let data = inflate_capped(&stream.content, expected)?;
    (data.len() == expected).then_some(data)
}

/// Pack one decoded CCITT line (color-transition list) into a pre-zeroed
/// sample row. Sample value = `(pel is black) == black_is_1`, i.e. under the
/// default `BlackIs1 false`, black pels are 0 — matching DeviceGray.
fn pack_row(row: &mut [u8], transitions: &[u32], width: u32, black_is_1: bool) {
    for (x, color) in pels(transitions, width).enumerate() {
        let bit = ((color == Color::Black) == black_is_1) as u8;
        row[x / 8] |= bit << (7 - x % 8);
    }
}

/// Strict G4 decode to packed samples: exactly `height` coding lines followed
/// by a clean EOFB. Early EOFB (fax's `decode_g4` would silently white-pad),
/// surplus rows, and any coding error all return `None` — a damaged original
/// is never re-encoded as pristine-wrong data.
fn decode_g4_strict_to_samples(
    data: &[u8],
    width: u32,
    height: usize,
    black_is_1: bool,
) -> Option<Vec<u8>> {
    let reader = data.iter().cloned().map(Result::<u8, Infallible>::Ok);
    let mut dec = Group4Decoder::new(reader, width).ok()?;
    let stride = (width as usize).div_ceil(8);
    let mut out = vec![0u8; stride.checked_mul(height)?];
    for r in 0..height {
        match dec.advance().ok()? {
            DecodeStatus::Incomplete => pack_row(
                &mut out[r * stride..(r + 1) * stride],
                dec.transition(),
                width,
                black_is_1,
            ),
            DecodeStatus::End => return None, // EOFB before /Height rows
        }
    }
    match dec.advance().ok()? {
        DecodeStatus::End => Some(out),
        DecodeStatus::Incomplete => None, // stream codes more rows than /Height
    }
}

/// Strict G3 1D decode to packed samples: exactly `height` rows, each coding
/// every pel (runs sum exactly to the width — the decoder's final transition
/// for a clean T.4 row always lands on `width`), terminated by RTC.
fn decode_g3_strict_to_samples(
    data: &[u8],
    width: u32,
    height: usize,
    black_is_1: bool,
) -> Option<Vec<u8>> {
    let reader = data.iter().cloned().map(Result::<u8, Infallible>::Ok);
    let mut dec = Group3Decoder::new(reader).ok()?;
    let stride = (width as usize).div_ceil(8);
    let mut out = vec![0u8; stride.checked_mul(height)?];
    let mut r = 0;
    loop {
        let status = dec.advance().ok()?;
        let transitions = dec.transitions();
        if status == DecodeStatus::End && transitions.is_empty() {
            // RTC reached with no pending row data.
            break;
        }
        if r >= height
            || transitions.last().copied() != Some(width)
            || transitions.iter().any(|&t| t > width)
        {
            return None;
        }
        pack_row(
            &mut out[r * stride..(r + 1) * stride],
            transitions,
            width,
            black_is_1,
        );
        r += 1;
        if status == DecodeStatus::End {
            break;
        }
    }
    (r == height).then_some(out)
}

/// Re-encode packed sample rows as CCITT G4. Sample 0 encodes as a black pel,
/// the inverse of `pack_row` under the `BlackIs1 false` parms we write.
fn encode_g4_from_samples(samples: &[u8], width: u32, height: usize) -> Vec<u8> {
    let stride = (width as usize).div_ceil(8);
    let mut enc = Encoder::new(VecWriter::new());
    for r in 0..height {
        let row = &samples[r * stride..(r + 1) * stride];
        enc.encode_line(
            (0..width as usize).map(|x| {
                if row[x / 8] >> (7 - x % 8) & 1 == 0 {
                    Color::Black
                } else {
                    Color::White
                }
            }),
            width,
        )
        .unwrap(); // Infallible writer
    }
    enc.finish().unwrap().finish()
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::{deflate_level9, optimize_with_options, OptimizeOptions};
    use fax::BitWriter;
    use lopdf::{dictionary, Dictionary, Document, Stream};

    fn opts() -> OptimizeOptions {
        OptimizeOptions::default().with_recompress_bitonal_images(true)
    }

    /// Deterministic LCG so failures reproduce (same as tests/fax_spike.rs).
    struct Lcg(u64);
    impl Lcg {
        fn next(&mut self) -> u64 {
            self.0 = self
                .0
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            self.0 >> 33
        }
    }

    /// Text-like bitonal ink pattern (true = black ink) — the realistic
    /// scanned-document shape where G4 beats deflate (§B.3 measurements).
    fn doc_rows(width: usize, height: usize) -> Vec<Vec<bool>> {
        let mut rng = Lcg(42);
        let mut rows = vec![vec![false; width]; height];
        let mut y = 8;
        while y < height.saturating_sub(4) {
            let band_h = 3 + (rng.next() % 5) as usize;
            let mut x = 16 + (rng.next() % 24) as usize;
            while x < width - 16 {
                let gw = 1 + (rng.next() % 6) as usize;
                let gh = 1 + (rng.next() % band_h as u64) as usize;
                for dy in 0..gh.min(band_h) {
                    for dx in 0..gw {
                        if x + dx < width && y + dy < height {
                            rows[y + dy][x + dx] = true;
                        }
                    }
                }
                x += gw + 2 + (rng.next() % 10) as usize;
            }
            y += band_h + 6 + (rng.next() % 12) as usize;
        }
        rows
    }

    fn noise_rows(width: usize, height: usize) -> Vec<Vec<bool>> {
        let mut rng = Lcg(7);
        (0..height)
            .map(|_| (0..width).map(|_| rng.next() & 1 == 1).collect())
            .collect()
    }

    /// Pack ink rows into PDF 1-bit sample rows under the given `/BlackIs1`:
    /// sample = (ink is black) == black_is_1.
    fn pack_samples(rows: &[Vec<bool>], black_is_1: bool) -> Vec<u8> {
        let width = rows[0].len();
        let stride = width.div_ceil(8);
        let mut out = vec![0u8; stride * rows.len()];
        for (r, row) in rows.iter().enumerate() {
            for (x, &black) in row.iter().enumerate() {
                let bit = (black == black_is_1) as u8;
                out[r * stride + x / 8] |= bit << (7 - x % 8);
            }
        }
        out
    }

    /// Encode ink rows as G4 with fax (true = black pel).
    fn g4_of(rows: &[Vec<bool>]) -> Vec<u8> {
        let mut enc = Encoder::new(VecWriter::new());
        for row in rows {
            enc.encode_line(
                row.iter()
                    .map(|&b| if b { Color::Black } else { Color::White }),
                row.len() as u32,
            )
            .unwrap();
        }
        enc.finish().unwrap().finish()
    }

    /// Encode ink rows as EOL-framed G3 1D using fax's public code tables
    /// (same construction as tests/fax_spike.rs — fax ships no G3 encoder).
    fn g3_of(rows: &[Vec<bool>]) -> Vec<u8> {
        use fax::maps::{black, white, EOL};
        fn write_run(w: &mut VecWriter, color: Color, mut n: u32) {
            let table = match color {
                Color::White => &white::ENTRIES,
                Color::Black => &black::ENTRIES,
            };
            let emit = |w: &mut VecWriter, n: u32| {
                let idx = if n >= 64 { 63 + n / 64 } else { n } as usize;
                let (v, bits) = table[idx];
                assert_eq!(v as u32, n);
                w.write(bits).unwrap();
            };
            while n >= 2560 {
                emit(w, 2560);
                n -= 2560;
            }
            if n >= 64 {
                let d = n & !63;
                emit(w, d);
                n -= d;
            }
            emit(w, n);
        }
        let mut w = VecWriter::new();
        w.write(EOL).unwrap();
        for row in rows {
            let mut color = Color::White;
            let mut run = 0u32;
            for &px in row {
                let c = if px { Color::Black } else { Color::White };
                if c == color {
                    run += 1;
                } else {
                    write_run(&mut w, color, run);
                    color = c;
                    run = 1;
                }
            }
            write_run(&mut w, color, run);
            w.write(EOL).unwrap();
        }
        for _ in 0..5 {
            w.write(EOL).unwrap();
        }
        w.finish()
    }

    /// One-page PDF around a single image XObject built from the given dict.
    fn bitonal_pdf(image_dict: Dictionary, content: Vec<u8>) -> Vec<u8> {
        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(image_dict, content));
        let page_content = b"q 200 0 0 200 0 0 cm /Im0 Do Q".to_vec();
        let content_id = doc.add_object(Stream::new(dictionary! {}, page_content));
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => content_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! {
                "XObject" => dictionary! { "Im0" => img_id },
            },
        });
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Kids" => vec![page_id.into()],
                "Count" => 1,
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);
        let mut out = Vec::new();
        doc.save_to(&mut out).unwrap();
        out
    }

    /// Standard eligible dict for a W×H bitonal image with the given filter.
    fn image_dict(w: usize, h: usize, filter: &str, parms: Option<Dictionary>) -> Dictionary {
        let mut d = dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => w as i64,
            "Height" => h as i64,
            "ColorSpace" => "DeviceGray",
            "BitsPerComponent" => 1,
            "Filter" => filter,
        };
        if let Some(p) = parms {
            d.set("DecodeParms", Object::Dictionary(p));
        }
        d
    }

    fn g3_parms(w: usize, h: usize) -> Dictionary {
        dictionary! {
            "K" => 0,
            "EndOfLine" => true,
            "Columns" => w as i64,
            "Rows" => h as i64,
        }
    }

    /// The single image stream in an optimized PDF.
    fn image_stream(pdf: &[u8]) -> lopdf::Stream {
        let doc = Document::load_mem(pdf).unwrap();
        doc.objects
            .values()
            .find_map(|o| {
                let s = o.as_stream().ok()?;
                matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image")
                    .then(|| s.clone())
            })
            .expect("image stream present")
    }

    /// Assert the image was rewritten to G4 with normalized parms and that its
    /// decoded samples equal `want`; returns the stream for extra checks.
    fn assert_g4_with_samples(pdf: &[u8], w: usize, h: usize, want: &[u8]) -> lopdf::Stream {
        let img = image_stream(pdf);
        assert_eq!(
            img.dict.get(b"Filter").unwrap().as_name().unwrap(),
            b"CCITTFaxDecode"
        );
        assert_eq!(img.dict.get(b"Width").unwrap().as_i64().unwrap(), w as i64);
        assert_eq!(img.dict.get(b"Height").unwrap().as_i64().unwrap(), h as i64);
        let parms = img.dict.get(b"DecodeParms").unwrap().as_dict().unwrap();
        assert_eq!(parms.get(b"K").unwrap().as_i64().unwrap(), -1);
        assert_eq!(parms.get(b"Columns").unwrap().as_i64().unwrap(), w as i64);
        assert_eq!(parms.get(b"Rows").unwrap().as_i64().unwrap(), h as i64);
        assert!(!parms.get(b"BlackIs1").unwrap().as_bool().unwrap());
        let decoded = decode_g4_strict_to_samples(&img.content, w as u32, h, false)
            .expect("output stream decodes cleanly");
        assert_eq!(decoded, want, "samples changed by recompression");
        img
    }

    const W: usize = 1728;
    const H: usize = 512;

    #[test]
    fn flate_bitonal_recompressed_to_g4() {
        let rows = doc_rows(W, H);
        let samples = pack_samples(&rows, false);
        let flate = deflate_level9(&samples).unwrap();
        let pdf = bitonal_pdf(image_dict(W, H, "FlateDecode", None), flate);
        let out = optimize_with_options(&pdf, opts());
        assert!(out.len() < pdf.len(), "output must be smaller");
        assert_g4_with_samples(&out, W, H, &samples);
    }

    #[test]
    fn option_off_by_default_leaves_bitonal_untouched() {
        let samples = pack_samples(&doc_rows(W, H), false);
        let flate = deflate_level9(&samples).unwrap();
        let pdf = bitonal_pdf(image_dict(W, H, "FlateDecode", None), flate);
        let out = optimize_with_options(&pdf, OptimizeOptions::default());
        assert_eq!(out, pdf, "default options must not touch bitonal images");
    }

    #[test]
    fn g3_source_recompressed_to_g4() {
        let rows = doc_rows(W, 256);
        let samples = pack_samples(&rows, false);
        let g3 = g3_of(&rows);
        let pdf = bitonal_pdf(
            image_dict(W, 256, "CCITTFaxDecode", Some(g3_parms(W, 256))),
            g3,
        );
        let out = optimize_with_options(&pdf, opts());
        assert!(out.len() < pdf.len());
        assert_g4_with_samples(&out, W, 256, &samples);
    }

    #[test]
    fn filter_array_form_is_accepted() {
        let rows = doc_rows(W, 256);
        let samples = pack_samples(&rows, false);
        let g3 = g3_of(&rows);
        let mut dict = image_dict(W, 256, "CCITTFaxDecode", Some(g3_parms(W, 256)));
        dict.set(
            "Filter",
            Object::Array(vec![Object::Name(b"CCITTFaxDecode".to_vec())]),
        );
        let out = optimize_with_options(&bitonal_pdf(dict, g3), opts());
        assert_g4_with_samples(&out, W, 256, &samples);
    }

    #[test]
    fn already_g4_is_untouched_never_larger() {
        // Re-encoding our own G4 reproduces the same bytes; the strictly-
        // smaller guard must then leave the stream alone.
        let rows = doc_rows(W, 256);
        let g4 = g4_of(&rows);
        let parms = dictionary! { "K" => -1, "Columns" => W as i64, "Rows" => 256 };
        let pdf = bitonal_pdf(image_dict(W, 256, "CCITTFaxDecode", Some(parms)), g4);
        let out = optimize_with_options(&pdf, opts());
        assert_eq!(out, pdf, "already-optimal G4 must be untouched");
    }

    #[test]
    fn noise_never_larger() {
        // G4 expands on noise; the guard must leave the flate original alone.
        let samples = pack_samples(&noise_rows(256, 256), false);
        let flate = deflate_level9(&samples).unwrap();
        let pdf = bitonal_pdf(image_dict(256, 256, "FlateDecode", None), flate);
        let out = optimize_with_options(&pdf, opts());
        assert_eq!(out, pdf, "noise must never be replaced by a larger G4");
    }

    #[test]
    fn optimize_is_idempotent() {
        let rows = doc_rows(W, H);
        let flate = deflate_level9(&pack_samples(&rows, false)).unwrap();
        let pdf = bitonal_pdf(image_dict(W, H, "FlateDecode", None), flate);
        let once = optimize_with_options(&pdf, opts());
        let twice = optimize_with_options(&once, opts());
        assert_eq!(once, twice, "second pass must be a no-op");
    }

    #[test]
    fn blackis1_both_polarities_round_trip() {
        // The same CCITT bitstream under either /BlackIs1 produces different
        // sample data; recompression must preserve each faithfully while
        // normalizing the output parms to BlackIs1 false.
        let rows = doc_rows(W, 128);
        let g3 = g3_of(&rows);
        for black_is_1 in [false, true] {
            let want = pack_samples(&rows, black_is_1);
            let mut parms = g3_parms(W, 128);
            parms.set("BlackIs1", black_is_1);
            let pdf = bitonal_pdf(
                image_dict(W, 128, "CCITTFaxDecode", Some(parms)),
                g3.clone(),
            );
            let out = optimize_with_options(&pdf, opts());
            assert_g4_with_samples(&out, W, 128, &want);
        }
    }

    #[test]
    fn encoded_byte_align_is_skipped() {
        // Otherwise-eligible stream; the flag alone must gate it out.
        let rows = doc_rows(W, 256);
        let mut parms = g3_parms(W, 256);
        parms.set("EncodedByteAlign", true);
        let pdf = bitonal_pdf(
            image_dict(W, 256, "CCITTFaxDecode", Some(parms)),
            g3_of(&rows),
        );
        let out = optimize_with_options(&pdf, opts());
        assert_eq!(out, pdf, "/EncodedByteAlign true must be a fail-safe skip");
    }

    #[test]
    fn unsupported_k_modes_are_skipped() {
        let rows = doc_rows(W, 128);
        let g3 = g3_of(&rows);
        // K > 0 (mixed 2D): unsupported by fax's G3 decoder.
        let mut parms = g3_parms(W, 128);
        parms.set("K", 1);
        let pdf = bitonal_pdf(
            image_dict(W, 128, "CCITTFaxDecode", Some(parms)),
            g3.clone(),
        );
        assert_eq!(optimize_with_options(&pdf, opts()), pdf, "K > 0 must skip");
        // K == 0 without /EndOfLine true: misframed by fax's EOL-based decoder.
        let mut parms = g3_parms(W, 128);
        parms.remove(b"EndOfLine");
        let pdf = bitonal_pdf(image_dict(W, 128, "CCITTFaxDecode", Some(parms)), g3);
        assert_eq!(
            optimize_with_options(&pdf, opts()),
            pdf,
            "K == 0 without /EndOfLine true must skip"
        );
    }

    #[test]
    fn corrupt_streams_return_exact_original_bytes() {
        let rows = doc_rows(W, 256);
        let g4 = g4_of(&rows);
        let g4_parms = || dictionary! { "K" => -1, "Columns" => W as i64, "Rows" => 256 };
        // Truncated G4.
        let pdf = bitonal_pdf(
            image_dict(W, 256, "CCITTFaxDecode", Some(g4_parms())),
            g4[..g4.len() / 2].to_vec(),
        );
        assert_eq!(optimize_with_options(&pdf, opts()), pdf, "truncated G4");
        // Pure garbage as G4.
        let garbage: Vec<u8> = (0..4096u32).map(|i| (i * 37 + 13) as u8).collect();
        let pdf = bitonal_pdf(
            image_dict(W, 256, "CCITTFaxDecode", Some(g4_parms())),
            garbage,
        );
        assert_eq!(optimize_with_options(&pdf, opts()), pdf, "garbage G4");
        // Truncated G3.
        let g3 = g3_of(&rows);
        let pdf = bitonal_pdf(
            image_dict(W, 256, "CCITTFaxDecode", Some(g3_parms(W, 256))),
            g3[..g3.len() / 2].to_vec(),
        );
        assert_eq!(optimize_with_options(&pdf, opts()), pdf, "truncated G3");
        // Truncated Flate.
        let flate = deflate_level9(&pack_samples(&rows, false)).unwrap();
        let pdf = bitonal_pdf(
            image_dict(W, 256, "FlateDecode", None),
            flate[..flate.len() / 2].to_vec(),
        );
        assert_eq!(optimize_with_options(&pdf, opts()), pdf, "truncated Flate");
    }

    #[test]
    fn height_mismatch_is_skipped() {
        // Stream codes 200 rows but the dict claims 256: fax's lenient
        // decode_g4 would white-pad; the strict path must skip instead.
        let rows = doc_rows(W, 200);
        let g4 = g4_of(&rows);
        let parms = dictionary! { "K" => -1, "Columns" => W as i64, "Rows" => 256 };
        let pdf = bitonal_pdf(image_dict(W, 256, "CCITTFaxDecode", Some(parms)), g4);
        assert_eq!(
            optimize_with_options(&pdf, opts()),
            pdf,
            "row-count mismatch must never be re-encoded as padded data"
        );
    }

    #[test]
    fn image_mask_with_implicit_colorspace_recompressed() {
        let rows = doc_rows(W, H);
        let samples = pack_samples(&rows, false);
        let flate = deflate_level9(&samples).unwrap();
        let dict = dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => W as i64,
            "Height" => H as i64,
            "ImageMask" => true,
            "Filter" => "FlateDecode",
        };
        let out = optimize_with_options(&bitonal_pdf(dict, flate), opts());
        assert_g4_with_samples(&out, W, H, &samples);
    }

    #[test]
    fn non_identity_decode_is_skipped() {
        let samples = pack_samples(&doc_rows(W, H), false);
        let flate = deflate_level9(&samples).unwrap();
        let mut dict = image_dict(W, H, "FlateDecode", None);
        dict.set("Decode", vec![1.into(), 0.into()]);
        let pdf = bitonal_pdf(dict, flate);
        assert_eq!(
            optimize_with_options(&pdf, opts()),
            pdf,
            "a non-identity /Decode remap must gate the image out"
        );
    }
}

}

mod cffhint {
//! Type2 (CFF / `Type1C`) hint stripping — the CFF analogue of
//! [`crate::truetype::strip_hinting`].
//!
//! A Type2 charstring carries two interleaved programs: the *outline*
//! (movetos, linetos, curvetos) and the *hints* (`hstem`, `vstem`,
//! `hstemhm`, `vstemhm`, and the `hintmask`/`cntrmask` hint-substitution
//! masks). Hints exist only to guide a rasterizer's grid fitting at small
//! ppem; the outline they annotate is complete without them. Dropping them
//! is the same trade `--strip-hinting` already makes for TrueType, and it is
//! gated behind that same flag.
//!
//! ## What this does, and does not, rewrite
//!
//! The rewrite is *token-level*, not interpretive: each charstring is walked
//! byte by byte, the hint operators and the operands that feed them are
//! deleted, the leading width operand is re-folded onto whatever
//! stack-clearing operator survives first, and every remaining byte — every
//! coordinate delta, in its original integer encoding — is copied verbatim.
//! No outline is re-encoded, no subroutine is inlined or dropped, no
//! coordinate is recomputed. That is deliberate: it makes outline identity a
//! near-syntactic property rather than something that rests on a re-encoder's
//! rounding.
//!
//! ## Preconditions (anything else declines, fail-safe)
//!
//! * The font is a plain (non-CID) Type2 CFF with one font in its Name INDEX.
//! * No reachable subroutine contains a hint operator. Hints inside subrs
//!   would leave stem counts — and hence `hintmask` operand sizes — spread
//!   across call boundaries that this in-place rewrite does not follow. (The
//!   hunt-4 probe's two arxiv failures were exactly this shape.)
//! * At every hint operator, the operand stack was built only by literal
//!   number tokens in the same charstring since the last stack-clearing
//!   operator. A subroutine call anywhere in between poisons the stack for
//!   this purpose and declines that glyph — the font still ships, with that
//!   one charstring untouched.
//!
//! ## Verification
//!
//! Stripping is not trusted on its own. Every glyph is traced before and
//! after by [`trace`], a Type2 interpreter that follows `callsubr`/
//! `callgsubr` and emits the width plus the sequence of drawing operators
//! with their resolved operands; the strip is kept only if every glyph's
//! trace is unchanged. The whole re-emitted font is then re-parsed and traced
//! again from its own bytes, so what ships — not just what was computed — is
//! what was verified.

use super::cffmerge::{be16, dict_get, parse_dict, read_index, DictEntry};
use super::type1::{cff_index, dict_int32, dict_op};

// Type2 operators this module needs to name.
const OP_HSTEM: u16 = 1;
const OP_VSTEM: u16 = 3;
const OP_VMOVETO: u16 = 4;
const OP_CALLSUBR: u16 = 10;
const OP_RETURN: u16 = 11;
const OP_ENDCHAR: u16 = 14;
const OP_HSTEMHM: u16 = 18;
const OP_HINTMASK: u16 = 19;
const OP_CNTRMASK: u16 = 20;
const OP_RMOVETO: u16 = 21;
const OP_HMOVETO: u16 = 22;
const OP_VSTEMHM: u16 = 23;
const OP_CALLGSUBR: u16 = 29;
const OP_DOTSECTION: u16 = 0x0C00;

/// True for the operators this pass deletes.
fn is_hint(op: u16) -> bool {
    matches!(
        op,
        OP_HSTEM | OP_VSTEM | OP_HSTEMHM | OP_VSTEMHM | OP_HINTMASK | OP_CNTRMASK | OP_DOTSECTION
    )
}

/// Operand count of the stack-clearing operators that may carry a width, or
/// `None` when the operator takes a variable number of stem pairs.
fn width_nargs(op: u16) -> Option<usize> {
    match op {
        OP_RMOVETO => Some(2),
        OP_HMOVETO | OP_VMOVETO => Some(1),
        _ => None,
    }
}

/// True when `op` clears the operand stack (T.81's Type2 counterpart: the
/// hint operators, the movetos, and `endchar`).
fn clears_stack(op: u16) -> bool {
    is_hint(op)
        || matches!(op, OP_RMOVETO | OP_HMOVETO | OP_VMOVETO | OP_ENDCHAR)
        // Path-construction operators also consume everything on the stack.
        || matches!(op, 5..=8 | 24..=27 | 30 | 31)
        // hflex, flex, hflex1, flex1.
        || matches!(op, 0x0C22..=0x0C25)
}

/// A charstring token: a literal number, an operator, or a `hintmask` /
/// `cntrmask` mask operand. Numbers and operators carry their byte range in
/// the charstring — the strip splices spans, it never re-encodes a value.
enum Tok {
    Num((usize, usize)),
    Op(u16, (usize, usize)),
    Mask,
}

/// Read the number token starting at `cs[i]`, returning its value and the
/// offset just past it. Callers have already established `cs[i]` starts one.
fn read_number(cs: &[u8], i: usize) -> Option<(f64, usize)> {
    let b = *cs.get(i)?;
    Some(match b {
        28 => (
            f64::from(i16::from_be_bytes([*cs.get(i + 1)?, *cs.get(i + 2)?])),
            i + 3,
        ),
        32..=246 => (f64::from(i32::from(b) - 139), i + 1),
        247..=250 => (
            f64::from((i32::from(b) - 247) * 256 + i32::from(*cs.get(i + 1)?) + 108),
            i + 2,
        ),
        251..=254 => (
            f64::from(-(i32::from(b) - 251) * 256 - i32::from(*cs.get(i + 1)?) - 108),
            i + 2,
        ),
        255 => (
            f64::from(i32::from_be_bytes([
                *cs.get(i + 1)?,
                *cs.get(i + 2)?,
                *cs.get(i + 3)?,
                *cs.get(i + 4)?,
            ])) / 65536.0,
            i + 5,
        ),
        _ => return None,
    })
}

/// Tokenize one charstring. `stems` is threaded in and out so `hintmask`
/// operand sizes are known; the count is exact only when the caller has
/// established that no operand ever arrives from a subroutine (see the module
/// docs), which is why this is private to the strip path.
fn tokenize(cs: &[u8]) -> Option<Vec<Tok>> {
    let mut out = Vec::new();
    let mut stems = 0usize;
    let mut pending = 0usize;
    let mut i = 0usize;
    while i < cs.len() {
        let b = cs[i];
        if b >= 32 || b == 28 {
            let (_, next) = read_number(cs, i)?;
            out.push(Tok::Num((i, next)));
            pending += 1;
            i = next;
            continue;
        }
        let (op, next) = if b == 12 {
            (0x0C00 | u16::from(*cs.get(i + 1)?), i + 2)
        } else {
            (u16::from(b), i + 1)
        };
        out.push(Tok::Op(op, (i, next)));
        let mut after = next;
        match op {
            OP_HSTEM | OP_VSTEM | OP_HSTEMHM | OP_VSTEMHM => {
                stems += pending / 2;
                pending = 0;
            }
            OP_HINTMASK | OP_CNTRMASK => {
                // Operands still on the stack are an implicit `vstem`.
                stems += pending / 2;
                pending = 0;
                let mask = stems.div_ceil(8).max(1);
                if next + mask > cs.len() {
                    return None;
                }
                out.push(Tok::Mask);
                after = next + mask;
            }
            _ => {
                if clears_stack(op) {
                    pending = 0;
                } else if op == OP_CALLSUBR || op == OP_CALLGSUBR {
                    pending = pending.saturating_sub(1);
                } else {
                    // Any other operator (arithmetic, storage, `random`, …)
                    // makes the stack unpredictable for this simple model.
                    return None;
                }
            }
        }
        i = after;
    }
    Some(out)
}

/// One item of a glyph's drawing trace: an operator and its resolved
/// operands. Hint operators never appear — they are exactly what the strip
/// removes, so including them would make the comparison vacuous.
#[derive(PartialEq, Debug)]
struct TraceItem(u16, Vec<f64>);

/// A glyph's verification fingerprint: its advance width (as the charstring
/// expresses it — `None` means "the Private DICT default") and its drawing
/// operators in order.
#[derive(PartialEq, Debug)]
pub(crate) struct Trace {
    width: Option<f64>,
    items: Vec<TraceItem>,
}

/// Bias applied to a `callsubr`/`callgsubr` index (Type2 §4.7).
fn bias(n: usize) -> i32 {
    if n < 1240 {
        107
    } else if n < 33900 {
        1131
    } else {
        32768
    }
}

/// Interpret a charstring, following subroutine calls, and record the width
/// and every drawing operator with its operands.
///
/// This is the verification oracle: two charstrings with equal traces draw
/// the same outline with the same advance. `None` on anything the model does
/// not cover (arithmetic/storage operators, an unresolvable subroutine index,
/// runaway recursion), which declines the glyph rather than guessing.
fn trace(cs: &[u8], lsubrs: &[Vec<u8>], gsubrs: &[Vec<u8>]) -> Option<Trace> {
    const MAX_DEPTH: usize = 10;
    const MAX_STEPS: usize = 200_000;

    let mut frames: Vec<(&[u8], usize)> = vec![(cs, 0)];
    let mut stack: Vec<f64> = Vec::new();
    let mut items: Vec<TraceItem> = Vec::new();
    let mut width: Option<f64> = None;
    let mut first_clear = true;
    let mut stems = 0usize;
    let mut steps = 0usize;

    while let Some(&mut (code, ref mut pos)) = frames.last_mut() {
        if *pos >= code.len() {
            frames.pop();
            continue;
        }
        steps += 1;
        if steps > MAX_STEPS {
            return None;
        }
        let i = *pos;
        let b = code[i];
        if b >= 32 || b == 28 {
            let (v, next) = read_number(code, i)?;
            stack.push(v);
            *pos = next;
            continue;
        }
        let (op, next) = if b == 12 {
            (0x0C00 | u16::from(*code.get(i + 1)?), i + 2)
        } else {
            (u16::from(b), i + 1)
        };
        *pos = next;

        match op {
            OP_CALLSUBR | OP_CALLGSUBR => {
                let subrs = if op == OP_CALLSUBR { lsubrs } else { gsubrs };
                let idx = stack.pop()?;
                let idx = i32::try_from(idx as i64).ok()? + bias(subrs.len());
                let sub = subrs.get(usize::try_from(idx).ok()?)?;
                if frames.len() >= MAX_DEPTH {
                    return None;
                }
                frames.push((sub.as_slice(), 0));
            }
            OP_RETURN => {
                frames.pop();
            }
            _ => {
                // Fold the width off the first stack-clearing operator.
                if clears_stack(op) && first_clear {
                    first_clear = false;
                    let has_width = match op {
                        OP_ENDCHAR => !matches!(stack.len(), 0 | 4),
                        _ => match width_nargs(op) {
                            Some(n) => stack.len() > n,
                            // Hint operators take stem pairs: an odd count
                            // means the first operand is the width.
                            None if is_hint(op) => stack.len() % 2 == 1,
                            None => return None,
                        },
                    };
                    if has_width {
                        if stack.is_empty() {
                            return None;
                        }
                        width = Some(stack.remove(0));
                    }
                }
                if is_hint(op) {
                    if matches!(op, OP_HINTMASK | OP_CNTRMASK) {
                        stems += stack.len() / 2;
                        let mask = stems.div_ceil(8).max(1);
                        let (code, pos) = frames.last_mut()?;
                        if *pos + mask > code.len() {
                            return None;
                        }
                        *pos += mask;
                    } else {
                        stems += stack.len() / 2;
                    }
                    stack.clear();
                } else if clears_stack(op) {
                    items.push(TraceItem(op, std::mem::take(&mut stack)));
                    if op == OP_ENDCHAR {
                        break;
                    }
                } else {
                    // Nothing else is modelled; decline instead of guessing.
                    return None;
                }
            }
        }
    }
    Some(Trace { width, items })
}

/// Strip the hint operators from one charstring.
///
/// `Some(bytes)` is a rewritten charstring; `None` means "keep this glyph's
/// original bytes" — the glyph is declined, not the font.
fn strip_charstring(cs: &[u8]) -> Option<Vec<u8>> {
    let toks = tokenize(cs)?;
    let mut out: Vec<u8> = Vec::with_capacity(cs.len());
    // Byte span of the width operand, if the first stack-clearing operator
    // turns out to be a hint operator that carries one.
    let mut width_span: Option<(usize, usize)> = None;
    let mut pending: Vec<(usize, usize)> = Vec::new();
    let mut first_clear = true;
    // True once a subroutine call has made the operand stack unknowable.
    let mut foreign = false;
    let mut changed = false;

    let mut k = 0usize;
    while k < toks.len() {
        match &toks[k] {
            Tok::Num(span) => {
                pending.push(*span);
                k += 1;
            }
            Tok::Mask => return None, // only reachable right after its operator
            Tok::Op(op, span) => {
                let op = *op;
                if op == OP_CALLSUBR || op == OP_CALLGSUBR {
                    // The subroutine consumes its index and may leave
                    // anything behind: everything pending is emitted as-is
                    // and the stack is no longer ours to reason about.
                    for s in pending.drain(..) {
                        out.extend_from_slice(&cs[s.0..s.1]);
                    }
                    out.extend_from_slice(&cs[span.0..span.1]);
                    foreign = true;
                    k += 1;
                    continue;
                }
                let is_hint_op = is_hint(op);
                if is_hint_op && foreign {
                    return None; // cannot prove which operands are the stem args
                }
                if clears_stack(op) && first_clear {
                    first_clear = false;
                    if is_hint_op && pending.len() % 2 == 1 {
                        // Odd stem-pair count: the leading operand is the
                        // width. It has to survive the strip.
                        width_span = Some(pending[0]);
                    }
                }
                if is_hint_op {
                    // Drop the operator, its operands, and any mask bytes.
                    pending.clear();
                    changed = true;
                    k += 1;
                    if matches!(op, OP_HINTMASK | OP_CNTRMASK) {
                        if !matches!(toks.get(k), Some(Tok::Mask)) {
                            return None;
                        }
                        k += 1;
                    }
                    continue;
                }
                for s in pending.drain(..) {
                    out.extend_from_slice(&cs[s.0..s.1]);
                }
                out.extend_from_slice(&cs[span.0..span.1]);
                k += 1;
            }
        }
    }
    for s in pending.drain(..) {
        out.extend_from_slice(&cs[s.0..s.1]);
    }
    if !changed {
        return None;
    }
    if let Some(w) = width_span {
        let mut with_width = Vec::with_capacity(out.len() + (w.1 - w.0));
        with_width.extend_from_slice(&cs[w.0..w.1]);
        with_width.extend_from_slice(&out);
        out = with_width;
    }
    Some(out)
}

/// True when a subroutine's byte stream contains a hint operator. Deliberately
/// naive — a `hintmask` mask byte that happens to look like an operator can
/// only produce a false *positive*, which declines the font.
fn subr_has_hints(sub: &[u8]) -> bool {
    let mut i = 0usize;
    while i < sub.len() {
        let b = sub[i];
        if b >= 32 || b == 28 {
            match read_number(sub, i) {
                Some((_, next)) => i = next,
                None => return true,
            }
            continue;
        }
        let (op, next) = if b == 12 {
            match sub.get(i + 1) {
                Some(&b1) => (0x0C00 | u16::from(b1), i + 2),
                None => return true,
            }
        } else {
            (u16::from(b), i + 1)
        };
        if is_hint(op) {
            return true;
        }
        i = next;
    }
    false
}

// Top / Private DICT operators.
const OP_CHARSET: u16 = 15;
const OP_ENCODING: u16 = 16;
const OP_CHARSTRINGS: u16 = 17;
const OP_PRIVATE: u16 = 18;
const OP_SUBRS: u16 = 19;
const OP_CHARSTRING_TYPE: u16 = 0x0C06;
const OP_ROS: u16 = 0x0C1E;
const OP_FD_ARRAY: u16 = 0x0C24;
const OP_FD_SELECT: u16 = 0x0C25;

/// Private DICT operators that carry nothing but hinting parameters:
/// `BlueValues`, `OtherBlues`, `FamilyBlues`, `FamilyOtherBlues`, `StdHW`,
/// `StdVW`, `BlueScale`, `BlueShift`, `BlueFuzz`, `StemSnapH`, `StemSnapV`,
/// `ForceBold`, `ExpansionFactor`.
const PRIVATE_HINT_OPS: [u16; 13] = [
    6, 7, 8, 9, 10, 11, 0x0C09, 0x0C0A, 0x0C0B, 0x0C0C, 0x0C0D, 0x0C0E, 0x0C12,
];

/// Byte length of the charset table at `at` for a font with `n_glyphs`
/// glyphs.
fn charset_len(data: &[u8], at: usize, n_glyphs: usize) -> Option<usize> {
    match *data.get(at)? {
        0 => Some(1 + (n_glyphs - 1) * 2),
        fmt @ (1 | 2) => {
            let step = if fmt == 1 { 3 } else { 4 };
            let mut covered = 1usize; // .notdef is implicit
            let mut i = at + 1;
            while covered < n_glyphs {
                let n_left = if fmt == 1 {
                    usize::from(*data.get(i + 2)?)
                } else {
                    usize::from(be16(data, i + 2)?)
                };
                covered = covered.checked_add(n_left + 1)?;
                i += step;
            }
            Some(i - at)
        }
        _ => None,
    }
}

/// Byte length of the custom encoding table at `at`.
fn encoding_len(data: &[u8], at: usize) -> Option<usize> {
    let fmt = *data.get(at)?;
    let n = usize::from(*data.get(at + 1)?);
    let base = match fmt & 0x7F {
        0 => 2 + n,
        1 => 2 + n * 2,
        _ => return None,
    };
    if fmt & 0x80 == 0 {
        return Some(base);
    }
    let n_sups = usize::from(*data.get(at + base)?);
    Some(base + 1 + n_sups * 3)
}

/// Everything the re-emitter needs from the input font.
struct Font {
    name: Vec<u8>,
    top: Vec<DictEntry>,
    top_raw: Vec<u8>,
    strings: Vec<Vec<u8>>,
    gsubrs: Vec<Vec<u8>>,
    lsubrs: Vec<Vec<u8>>,
    charstrings: Vec<Vec<u8>>,
    charset: Vec<u8>,
    encoding: Vec<u8>,
    /// Private DICT entries with their raw bytes, minus `Subrs`.
    private: Vec<DictEntry>,
    private_raw: Vec<u8>,
    has_lsubrs: bool,
}

fn parse(data: &[u8]) -> Option<Font> {
    if *data.first()? != 1 {
        return None;
    }
    let hdr = usize::from(*data.get(2)?);
    let (names, pos) = read_index(data, hdr)?;
    if names.len() != 1 {
        return None;
    }
    let (tops, pos) = read_index(data, pos)?;
    if tops.len() != 1 {
        return None;
    }
    let (strings, pos) = read_index(data, pos)?;
    let (gsubrs, _) = read_index(data, pos)?;
    let top = parse_dict(&tops[0])?;

    // CID-keyed fonts carry per-FD Private DICTs and a different charset
    // meaning; out of scope.
    if dict_get(&top, OP_ROS).is_some()
        || dict_get(&top, OP_FD_ARRAY).is_some()
        || dict_get(&top, OP_FD_SELECT).is_some()
    {
        return None;
    }
    if let Some(e) = dict_get(&top, OP_CHARSTRING_TYPE) {
        if e.operands != [2.0] {
            return None;
        }
    }

    let charstrings_at = match dict_get(&top, OP_CHARSTRINGS)?.operands.as_slice() {
        [v] if *v >= 0.0 => *v as usize,
        _ => return None,
    };
    let (charstrings, _) = read_index(data, charstrings_at)?;
    if charstrings.is_empty() {
        return None;
    }

    // Charset and built-in encoding are copied verbatim; predefined ones
    // (operand < 3 / < 2) have no table to copy and keep their operand.
    let charset = match dict_get(&top, OP_CHARSET) {
        None => Vec::new(),
        Some(e) => match e.operands.as_slice() {
            [v] if *v >= 3.0 => {
                let at = *v as usize;
                data.get(at..at + charset_len(data, at, charstrings.len())?)?
                    .to_vec()
            }
            [v] if *v >= 0.0 => Vec::new(),
            _ => return None,
        },
    };
    let encoding = match dict_get(&top, OP_ENCODING) {
        None => Vec::new(),
        Some(e) => match e.operands.as_slice() {
            [v] if *v >= 2.0 => {
                let at = *v as usize;
                data.get(at..at + encoding_len(data, at)?)?.to_vec()
            }
            [v] if *v >= 0.0 => Vec::new(),
            _ => return None,
        },
    };

    let (private_size, private_at) = match dict_get(&top, OP_PRIVATE)?.operands.as_slice() {
        [size, at] if *size >= 0.0 && *at >= 0.0 => (*size as usize, *at as usize),
        _ => return None,
    };
    let private_raw = data
        .get(private_at..private_at.checked_add(private_size)?)?
        .to_vec();
    let private = parse_dict(&private_raw)?;
    let mut lsubrs = Vec::new();
    let mut has_lsubrs = false;
    if let Some(e) = dict_get(&private, OP_SUBRS) {
        let rel = match e.operands.as_slice() {
            [v] if *v >= 0.0 => *v as usize,
            _ => return None,
        };
        lsubrs = read_index(data, private_at.checked_add(rel)?)?.0;
        has_lsubrs = true;
    }

    Some(Font {
        name: names[0].clone(),
        top,
        top_raw: tops[0].clone(),
        strings,
        gsubrs,
        lsubrs,
        charstrings,
        charset,
        encoding,
        private,
        private_raw,
        has_lsubrs,
    })
}

/// Re-emit a font with new charstrings (and optionally a Private DICT with
/// its hinting parameters removed). Every other table is byte-spliced.
fn emit(font: &Font, charstrings: &[Vec<u8>], drop_private_hints: bool) -> Option<Vec<u8>> {
    // Private DICT: the original entries verbatim, minus `Subrs` (re-added
    // with a fixed-width offset) and minus the hint keys when asked.
    let mut private: Vec<u8> = Vec::with_capacity(font.private_raw.len());
    for e in &font.private {
        if e.op == OP_SUBRS || (drop_private_hints && PRIVATE_HINT_OPS.contains(&e.op)) {
            continue;
        }
        private.extend_from_slice(&font.private_raw[e.span.0..e.span.1]);
    }
    if font.has_lsubrs {
        let subrs_at = private.len() + 5 + 1;
        dict_int32(&mut private, u32::try_from(subrs_at).ok()?);
        dict_op(&mut private, OP_SUBRS);
    }

    // Top DICT: everything except the four offset operators, spliced
    // verbatim, then those four re-encoded at fixed width.
    let mut top_prefix: Vec<u8> = Vec::new();
    let mut has_charset = false;
    let mut has_encoding = false;
    for e in &font.top {
        match e.op {
            OP_CHARSET => has_charset = true,
            OP_ENCODING => has_encoding = true,
            OP_CHARSTRINGS | OP_PRIVATE => {}
            _ => {
                top_prefix.extend_from_slice(&font.top_raw[e.span.0..e.span.1]);
                continue;
            }
        }
    }
    // A predefined charset/encoding has no table: keep the original operand
    // instead of pointing at bytes that do not exist.
    let charset_operand = (!font.charset.is_empty()).then_some(());
    let encoding_operand = (!font.encoding.is_empty()).then_some(());
    let predefined = |op: u16| -> Option<Vec<u8>> {
        let e = dict_get(&font.top, op)?;
        Some(font.top_raw[e.span.0..e.span.1].to_vec())
    };
    if has_charset && charset_operand.is_none() {
        top_prefix.extend_from_slice(&predefined(OP_CHARSET)?);
    }
    if has_encoding && encoding_operand.is_none() {
        top_prefix.extend_from_slice(&predefined(OP_ENCODING)?);
    }

    let n_offsets = usize::from(has_charset && charset_operand.is_some())
        + usize::from(has_encoding && encoding_operand.is_some());
    let top_dict_len = top_prefix.len() + (5 + 1) * (n_offsets + 1) + (5 + 5 + 1);

    let charstrings_index = cff_index(charstrings)?;
    let lsubr_index = cff_index(&font.lsubrs)?;
    let gsubr_index = cff_index(&font.gsubrs)?;
    let header = [1u8, 0, 4, 4];
    let name_index = cff_index(std::slice::from_ref(&font.name))?;
    let top_index_size = cff_index(&[vec![0u8; top_dict_len]])?.len();
    let string_index = cff_index(&font.strings)?;

    let fixed =
        header.len() + name_index.len() + top_index_size + string_index.len() + gsubr_index.len();
    let charset_at = fixed;
    let encoding_at = charset_at + font.charset.len();
    let charstrings_at = encoding_at + font.encoding.len();
    let private_at = charstrings_at + charstrings_index.len();

    let mut top_dict = top_prefix;
    if has_charset && charset_operand.is_some() {
        dict_int32(&mut top_dict, u32::try_from(charset_at).ok()?);
        dict_op(&mut top_dict, OP_CHARSET);
    }
    if has_encoding && encoding_operand.is_some() {
        dict_int32(&mut top_dict, u32::try_from(encoding_at).ok()?);
        dict_op(&mut top_dict, OP_ENCODING);
    }
    dict_int32(&mut top_dict, u32::try_from(charstrings_at).ok()?);
    dict_op(&mut top_dict, OP_CHARSTRINGS);
    dict_int32(&mut top_dict, u32::try_from(private.len()).ok()?);
    dict_int32(&mut top_dict, u32::try_from(private_at).ok()?);
    dict_op(&mut top_dict, OP_PRIVATE);
    if top_dict.len() != top_dict_len {
        return None;
    }
    let top_index = cff_index(&[top_dict])?;

    let mut out = Vec::with_capacity(private_at + private.len() + lsubr_index.len());
    out.extend_from_slice(&header);
    out.extend_from_slice(&name_index);
    out.extend_from_slice(&top_index);
    out.extend_from_slice(&string_index);
    out.extend_from_slice(&gsubr_index);
    out.extend_from_slice(&font.charset);
    out.extend_from_slice(&font.encoding);
    out.extend_from_slice(&charstrings_index);
    out.extend_from_slice(&private);
    if font.has_lsubrs {
        out.extend_from_slice(&lsubr_index);
    }
    Some(out)
}

/// Every glyph's verification trace, in GID order.
fn traces(font: &Font) -> Option<Vec<Trace>> {
    font.charstrings
        .iter()
        .map(|cs| trace(cs, &font.lsubrs, &font.gsubrs))
        .collect()
}

/// Strip Type2 hints from a `Type1C` font program.
///
/// Returns the rewritten program, or `None` to mean "ship the original bytes"
/// — for any structure outside the preconditions in the module docs, when
/// nothing was strippable, when the result is not strictly smaller, or when
/// the re-emitted font does not trace glyph-for-glyph identically to the
/// input.
///
/// `drop_private_hints` additionally removes the Private DICT hinting keys
/// (`BlueValues` and friends), which no longer describe anything once the
/// charstring hints are gone.
pub(crate) fn strip_hints(data: &[u8], drop_private_hints: bool) -> Option<Vec<u8>> {
    let font = parse(data)?;
    // Hints inside subroutines would spread stem counts across call
    // boundaries this in-place rewrite does not follow.
    if font
        .lsubrs
        .iter()
        .chain(&font.gsubrs)
        .any(|s| subr_has_hints(s))
    {
        return None;
    }
    let before = traces(&font)?;

    let mut charstrings: Vec<Vec<u8>> = Vec::with_capacity(font.charstrings.len());
    let mut stripped_any = false;
    for cs in &font.charstrings {
        match strip_charstring(cs) {
            // Per-glyph decline: keep the original bytes, keep the font.
            Some(new) => {
                stripped_any = true;
                charstrings.push(new);
            }
            None => charstrings.push(cs.clone()),
        }
    }
    if !stripped_any {
        return None;
    }

    let out = emit(&font, &charstrings, drop_private_hints)?;
    if out.len() >= data.len() {
        return None;
    }
    // Verify what actually ships: re-parse the emitted bytes and trace them.
    let back = parse(&out)?;
    if back.charstrings.len() != font.charstrings.len() {
        return None;
    }
    let after = traces(&back)?;
    (after == before).then_some(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::type1::{dict_number, t2_number};

    /// Build a minimal one-font CFF around the given charstrings.
    fn build(charstrings: &[Vec<u8>], subrs: &[Vec<u8>]) -> Vec<u8> {
        let mut strings: Vec<Vec<u8>> = Vec::new();
        let mut charset = vec![0u8];
        for i in 1..charstrings.len() {
            strings.push(format!("g{i}").into_bytes());
            let sid = u16::try_from(391 + strings.len() - 1).unwrap();
            charset.extend_from_slice(&sid.to_be_bytes());
        }
        let mut private = Vec::new();
        // A couple of Private DICT hint keys, so the drop path has something
        // to remove, plus the width parameters.
        dict_number(&mut private, -20.0).unwrap();
        dict_number(&mut private, 0.0).unwrap();
        dict_op(&mut private, 6); // BlueValues
        dict_number(&mut private, 60.0).unwrap();
        dict_op(&mut private, 10); // StdHW
        dict_number(&mut private, 0.0).unwrap();
        dict_op(&mut private, 20); // defaultWidthX
        dict_number(&mut private, 0.0).unwrap();
        dict_op(&mut private, 21); // nominalWidthX
        let has_subrs = !subrs.is_empty();
        if has_subrs {
            let at = private.len() + 5 + 1;
            dict_int32(&mut private, u32::try_from(at).unwrap());
            dict_op(&mut private, 19);
        }

        let mut top_prefix = Vec::new();
        for v in [0.0, -200.0, 1000.0, 900.0] {
            dict_number(&mut top_prefix, v).unwrap();
        }
        dict_op(&mut top_prefix, 5); // FontBBox
        let top_dict_len = top_prefix.len() + (5 + 1) * 2 + (5 + 5 + 1);
        let header = [1u8, 0, 4, 4];
        let name_index = cff_index(&[b"Test".to_vec()]).unwrap();
        let top_index_size = cff_index(&[vec![0u8; top_dict_len]]).unwrap().len();
        let string_index = cff_index(&strings).unwrap();
        let gsubr_index = cff_index(&[]).unwrap();
        let charstrings_index = cff_index(charstrings).unwrap();
        let fixed = header.len()
            + name_index.len()
            + top_index_size
            + string_index.len()
            + gsubr_index.len();
        let charset_at = fixed;
        let charstrings_at = charset_at + charset.len();
        let private_at = charstrings_at + charstrings_index.len();
        let mut top_dict = top_prefix;
        dict_int32(&mut top_dict, u32::try_from(charset_at).unwrap());
        dict_op(&mut top_dict, 15);
        dict_int32(&mut top_dict, u32::try_from(charstrings_at).unwrap());
        dict_op(&mut top_dict, 17);
        dict_int32(&mut top_dict, u32::try_from(private.len()).unwrap());
        dict_int32(&mut top_dict, u32::try_from(private_at).unwrap());
        dict_op(&mut top_dict, 18);
        assert_eq!(top_dict.len(), top_dict_len);
        let top_index = cff_index(&[top_dict]).unwrap();

        let mut out = Vec::new();
        out.extend_from_slice(&header);
        out.extend_from_slice(&name_index);
        out.extend_from_slice(&top_index);
        out.extend_from_slice(&string_index);
        out.extend_from_slice(&gsubr_index);
        out.extend_from_slice(&charset);
        out.extend_from_slice(&charstrings_index);
        out.extend_from_slice(&private);
        if has_subrs {
            out.extend_from_slice(&cff_index(subrs).unwrap());
        }
        out
    }

    fn num(v: f64) -> Vec<u8> {
        let mut b = Vec::new();
        t2_number(&mut b, v).unwrap();
        b
    }

    fn cs(parts: &[&[u8]]) -> Vec<u8> {
        parts.concat()
    }

    /// `w 20 40 hstem 30 60 vstem 10 10 rmoveto 50 rlineto endchar`
    /// with a width operand folded onto the first (hint) operator.
    fn hinted_glyph_with_width() -> Vec<u8> {
        cs(&[
            &num(55.0), // width delta
            &num(20.0),
            &num(40.0),
            &[OP_HSTEM as u8],
            &num(30.0),
            &num(60.0),
            &[OP_VSTEM as u8],
            &num(10.0),
            &num(10.0),
            &[OP_RMOVETO as u8],
            &num(50.0),
            &[5u8], // rlineto
            &[OP_ENDCHAR as u8],
        ])
    }

    #[test]
    fn strip_removes_hints_and_refolds_the_width() {
        let original = hinted_glyph_with_width();
        let stripped = strip_charstring(&original).unwrap();
        assert!(stripped.len() < original.len());
        // The width must survive, now carried by rmoveto (3 operands).
        let a = trace(&original, &[], &[]).unwrap();
        let b = trace(&stripped, &[], &[]).unwrap();
        assert_eq!(a, b, "outline and width must be unchanged");
        assert_eq!(a.width, Some(55.0));
        assert_eq!(
            a.items.iter().map(|i| i.0).collect::<Vec<_>>(),
            vec![OP_RMOVETO, 5, OP_ENDCHAR]
        );
    }

    #[test]
    fn hintmask_and_its_operand_bytes_are_removed() {
        // 2 stems declared by hstemhm, then hintmask with a 1-byte mask, and
        // a second hintmask later in the outline (hint replacement).
        let original = cs(&[
            &num(20.0),
            &num(40.0),
            &num(30.0),
            &num(60.0),
            &[OP_HSTEMHM as u8],
            &[OP_HINTMASK as u8, 0b1100_0000],
            &num(10.0),
            &num(10.0),
            &[OP_RMOVETO as u8],
            &[OP_HINTMASK as u8, 0b0011_0000],
            &num(50.0),
            &[5u8],
            &[OP_ENDCHAR as u8],
        ]);
        let stripped = strip_charstring(&original).unwrap();
        assert_eq!(
            trace(&original, &[], &[]).unwrap(),
            trace(&stripped, &[], &[]).unwrap()
        );
        // Nothing but the outline is left: 10 10 rmoveto 50 rlineto endchar.
        assert_eq!(
            stripped,
            cs(&[
                &num(10.0),
                &num(10.0),
                &[OP_RMOVETO as u8],
                &num(50.0),
                &[5u8],
                &[OP_ENDCHAR as u8],
            ])
        );
    }

    #[test]
    fn font_round_trip_is_smaller_and_traces_identically() {
        let glyphs = vec![
            cs(&[&num(0.0), &[OP_ENDCHAR as u8]]), // .notdef
            hinted_glyph_with_width(),
            cs(&[
                &num(10.0),
                &num(20.0),
                &num(30.0),
                &num(40.0),
                &[OP_VSTEMHM as u8],
                &[OP_HINTMASK as u8, 0b1000_0000],
                &num(5.0),
                &[OP_HMOVETO as u8],
                &num(7.0),
                &num(8.0),
                &num(9.0),
                &num(10.0),
                &num(11.0),
                &num(12.0),
                &[8u8], // rrcurveto
                &[OP_ENDCHAR as u8],
            ]),
        ];
        let font = build(&glyphs, &[]);
        let stripped = strip_hints(&font, false).expect("must strip");
        assert!(stripped.len() < font.len());
        let a = traces(&parse(&font).unwrap()).unwrap();
        let b = traces(&parse(&stripped).unwrap()).unwrap();
        assert_eq!(a, b);
        // The Private DICT keys are untouched with the flag off.
        let with_private = strip_hints(&font, true).expect("must strip");
        assert!(
            with_private.len() < stripped.len(),
            "dropping BlueValues/StdHW must save more"
        );
        assert_eq!(traces(&parse(&with_private).unwrap()).unwrap(), a);
    }

    #[test]
    fn a_hint_inside_a_subroutine_declines_the_font() {
        let glyphs = vec![
            cs(&[&num(0.0), &[OP_ENDCHAR as u8]]),
            cs(&[
                &num(-107.0), // subr 0 with the standard bias
                &[OP_CALLSUBR as u8],
                &num(10.0),
                &num(10.0),
                &[OP_RMOVETO as u8],
                &[OP_ENDCHAR as u8],
            ]),
        ];
        let subrs = vec![cs(&[
            &num(20.0),
            &num(40.0),
            &[OP_HSTEM as u8],
            &[OP_RETURN as u8],
        ])];
        assert!(strip_hints(&build(&glyphs, &subrs), false).is_none());
    }

    #[test]
    fn a_subroutine_before_a_hint_declines_that_glyph() {
        // The subr's stack effect is unknown, so the operands feeding the
        // later hstem cannot be identified: that glyph must be left alone.
        let program = cs(&[
            &num(-107.0),
            &[OP_CALLSUBR as u8],
            &num(20.0),
            &num(40.0),
            &[OP_HSTEM as u8],
            &num(10.0),
            &num(10.0),
            &[OP_RMOVETO as u8],
            &[OP_ENDCHAR as u8],
        ]);
        assert!(strip_charstring(&program).is_none());
    }

    #[test]
    fn unhinted_charstring_declines() {
        let program = cs(&[
            &num(10.0),
            &num(10.0),
            &[OP_RMOVETO as u8],
            &[OP_ENDCHAR as u8],
        ]);
        assert!(strip_charstring(&program).is_none());
    }

    /// Real-corpus harness: point `AMATL_CFF_DIR` at a directory of raw
    /// `Type1C` programs (every `/FontFile3` payload extracted from amatl's
    /// own output) and this strips each one, re-verifying every glyph's
    /// outline and advance from the *emitted* bytes and reporting the size
    /// delta. Ignored by default — it needs an external corpus, and the fonts
    /// in question are not redistributable.
    #[test]
    #[ignore = "needs AMATL_CFF_DIR corpus"]
    fn corpus_report() {
        let dir = std::env::var("AMATL_CFF_DIR").unwrap_or_else(|_| "target/scratch/h5/cff".into());
        let mut entries: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(Result::ok)
            .map(|e| e.path())
            .collect();
        entries.sort();
        let (mut cur, mut new, mut done, mut skipped, mut glyphs) = (0usize, 0usize, 0, 0, 0usize);
        for path in &entries {
            let data = std::fs::read(path).unwrap();
            cur += data.len();
            match strip_hints(&data, true) {
                Some(out) => {
                    // strip_hints already gates on this; assert it here too so
                    // a corpus run is a real verification, not just a report.
                    let before = traces(&parse(&data).unwrap()).unwrap();
                    let after = traces(&parse(&out).unwrap()).unwrap();
                    assert_eq!(before, after, "outline mismatch in {}", path.display());
                    glyphs += before.len();
                    new += out.len();
                    done += 1;
                }
                None => {
                    new += data.len();
                    skipped += 1;
                    println!("declined {}", path.display());
                }
            }
        }
        println!(
            "{done} programs stripped, {skipped} declined; {glyphs} glyphs outline-verified; \
             {cur} -> {new} (save {})",
            cur - new
        );
    }

    #[test]
    fn garbage_declines() {
        assert!(strip_hints(b"", false).is_none());
        assert!(strip_hints(&[1u8; 64], false).is_none());
        assert!(strip_hints(&[0xFFu8; 256], false).is_none());
    }
}

}

mod cffmerge {
//! Union-merge of same-family CFF (`Type1C`) subset fragments.
//!
//! Producers that subset per page section leave many small fragments of the
//! same original font, each carrying its own copy of the shared subroutines
//! and overlapping charstrings. For *simple* (non-CID) PDF fonts every glyph
//! lookup goes PDF `/Encoding` → glyph *name* → CFF charset, so fragments can
//! share one union program with no content-stream rewriting at all.
//!
//! The merge is byte-conservative, not interpretive: a family merges only
//! when every fragment's global and local subroutine INDEXes are
//! byte-identical, their Private DICTs agree on everything except the
//! width parameters (`defaultWidthX`/`nominalWidthX`) and the `Subrs`
//! offset, and every shared glyph name resolves to the same charstring
//! after normalizing the leading width operand to its absolute value.
//! (The width operand is relative to the fragment's own `nominalWidthX`,
//! so byte-different charstrings are routinely the *same* glyph.) Any
//! other difference — or any structural doubt while parsing — declines
//! the whole family, fail-safe.
//!
//! The merged program keeps the base fragment's tables verbatim wherever
//! possible: subrs and Private DICT entries are byte-spliced, not
//! re-encoded; only appended charstrings get their width operand
//! re-expressed against the base's width parameters.

use super::type1::{cff_index, dict_int32, dict_number, dict_op, t2_number};
use std::collections::BTreeMap;

/// A glyph name as the merge keys it: standard SIDs (< 391) name the same
/// glyph in every CFF, custom SIDs go through the fragment's String INDEX.
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
enum NameKey {
    Std(u16),
    Custom(Vec<u8>),
}

/// One glyph, width-normalized: `width` is absolute (the fragment's
/// `nominalWidthX` already applied), `tail` is the charstring with the
/// leading width operand removed.
struct Glyph {
    width: f64,
    tail: Vec<u8>,
}

/// One parsed fragment.
struct Fragment {
    name: Vec<u8>,
    /// Token span of `FontMatrix` operands in the Top DICT (for splicing).
    font_matrix: Option<Vec<u8>>,
    font_matrix_values: Vec<f64>,
    font_bbox: Vec<f64>,
    /// Glyphs in this fragment's GID order, `.notdef` first.
    order: Vec<NameKey>,
    glyphs: BTreeMap<NameKey, Glyph>,
    gsubrs: Vec<Vec<u8>>,
    lsubrs: Vec<Vec<u8>>,
    /// Private DICT entries minus `Subrs`/`defaultWidthX`/`nominalWidthX`,
    /// as (op, operands) sorted by op — the family-equality comparand.
    /// Semantic, not byte-level: fragments routinely encode identical
    /// operand values in different integer forms.
    private_cmp: Vec<(u16, Vec<f64>)>,
    /// Private DICT bytes minus only the `Subrs` entry (the emission base).
    private_body: Vec<u8>,
    has_lsubrs: bool,
    default_width: f64,
    nominal_width: f64,
    /// True when the fragment's built-in encoding is a custom encoding that
    /// defines no codes at all (empty format 0/1, no supplements).
    builtin_empty: bool,
}

pub(crate) fn be16(d: &[u8], off: usize) -> Option<u16> {
    Some(u16::from_be_bytes([*d.get(off)?, *d.get(off + 1)?]))
}

/// Read a CFF INDEX at `pos`; returns (items, next offset).
pub(crate) fn read_index(data: &[u8], pos: usize) -> Option<(Vec<Vec<u8>>, usize)> {
    let count = usize::from(be16(data, pos)?);
    if count == 0 {
        return Some((Vec::new(), pos + 2));
    }
    let off_size = usize::from(*data.get(pos + 2)?);
    if !(1..=4).contains(&off_size) {
        return None;
    }
    let offsets_at = pos + 3;
    let read_off = |i: usize| -> Option<usize> {
        let mut v = 0usize;
        for k in 0..off_size {
            v = (v << 8) | usize::from(*data.get(offsets_at + i * off_size + k)?);
        }
        Some(v)
    };
    let data_at = offsets_at + (count + 1) * off_size - 1;
    let mut items = Vec::with_capacity(count);
    let mut prev = read_off(0)?;
    if prev != 1 {
        return None;
    }
    for i in 1..=count {
        let next = read_off(i)?;
        if next < prev {
            return None;
        }
        items.push(data.get(data_at + prev..data_at + next)?.to_vec());
        prev = next;
    }
    Some((items, data_at + prev))
}

/// One parsed DICT entry: operator, numeric operands, and the raw byte span
/// of the operands + operator (for verbatim splicing).
pub(crate) struct DictEntry {
    pub(crate) op: u16,
    pub(crate) operands: Vec<f64>,
    pub(crate) span: (usize, usize),
}

pub(crate) fn parse_dict(data: &[u8]) -> Option<Vec<DictEntry>> {
    let mut out = Vec::new();
    let mut operands: Vec<f64> = Vec::new();
    let mut i = 0usize;
    let mut entry_start = 0usize;
    while i < data.len() {
        let b = *data.get(i)?;
        match b {
            32..=246 => {
                operands.push(f64::from(i32::from(b) - 139));
                i += 1;
            }
            247..=250 => {
                let b1 = *data.get(i + 1)?;
                operands.push(f64::from((i32::from(b) - 247) * 256 + i32::from(b1) + 108));
                i += 2;
            }
            251..=254 => {
                let b1 = *data.get(i + 1)?;
                operands.push(f64::from(-(i32::from(b) - 251) * 256 - i32::from(b1) - 108));
                i += 2;
            }
            28 => {
                let v = i16::from_be_bytes([*data.get(i + 1)?, *data.get(i + 2)?]);
                operands.push(f64::from(v));
                i += 3;
            }
            29 => {
                let v = i32::from_be_bytes([
                    *data.get(i + 1)?,
                    *data.get(i + 2)?,
                    *data.get(i + 3)?,
                    *data.get(i + 4)?,
                ]);
                operands.push(f64::from(v));
                i += 5;
            }
            30 => {
                // Real: BCD nibbles until 0xf terminator.
                let mut text = String::new();
                let mut j = i + 1;
                'outer: loop {
                    let byte = *data.get(j)?;
                    j += 1;
                    for nib in [byte >> 4, byte & 0xf] {
                        match nib {
                            0..=9 => text.push((b'0' + nib) as char),
                            0xa => text.push('.'),
                            0xb => text.push('E'),
                            0xc => text.push_str("E-"),
                            0xe => text.push('-'),
                            0xf => break 'outer,
                            _ => return None,
                        }
                    }
                }
                operands.push(text.parse().ok()?);
                i = j;
            }
            0..=21 => {
                let op = if b == 12 {
                    let b1 = *data.get(i + 1)?;
                    i += 2;
                    0x0C00 | u16::from(b1)
                } else {
                    i += 1;
                    u16::from(b)
                };
                out.push(DictEntry {
                    op,
                    operands: std::mem::take(&mut operands),
                    span: (entry_start, i),
                });
                entry_start = i;
            }
            _ => return None,
        }
    }
    if operands.is_empty() {
        Some(out)
    } else {
        None
    }
}

pub(crate) fn dict_get(dict: &[DictEntry], op: u16) -> Option<&DictEntry> {
    dict.iter().find(|e| e.op == op)
}

/// Split a Type2 charstring into (absolute width, tail after the width
/// operand). `None` when the leading token structure cannot prove where the
/// width ends (e.g. the first operator is a subroutine call).
fn split_width(cs: &[u8], default_w: f64, nominal_w: f64) -> Option<(f64, Vec<u8>)> {
    let mut i = 0usize;
    let mut nums: Vec<f64> = Vec::new();
    let mut starts: Vec<usize> = Vec::new();
    while i < cs.len() {
        let b = cs[i];
        if b >= 32 || b == 28 {
            starts.push(i);
            match b {
                28 => {
                    let v = i16::from_be_bytes([*cs.get(i + 1)?, *cs.get(i + 2)?]);
                    nums.push(f64::from(v));
                    i += 3;
                }
                32..=246 => {
                    nums.push(f64::from(i32::from(b) - 139));
                    i += 1;
                }
                247..=250 => {
                    let b1 = *cs.get(i + 1)?;
                    nums.push(f64::from((i32::from(b) - 247) * 256 + i32::from(b1) + 108));
                    i += 2;
                }
                251..=254 => {
                    let b1 = *cs.get(i + 1)?;
                    nums.push(f64::from(-(i32::from(b) - 251) * 256 - i32::from(b1) - 108));
                    i += 2;
                }
                _ => {
                    // 255: 16.16 fixed
                    let v = i32::from_be_bytes([
                        *cs.get(i + 1)?,
                        *cs.get(i + 2)?,
                        *cs.get(i + 3)?,
                        *cs.get(i + 4)?,
                    ]);
                    nums.push(f64::from(v) / 65536.0);
                    i += 5;
                }
            }
            continue;
        }
        // First operator decides whether a width operand is present
        // (Type2 appendix: hstem/vstem[hm] and masks take even counts,
        // rmoveto 2, h/vmoveto 1, endchar 0 or 4).
        let has_width = match b {
            1 | 3 | 18 | 23 | 19 | 20 => nums.len() % 2 == 1,
            21 => nums.len() > 2,
            22 | 4 => nums.len() > 1,
            14 => !matches!(nums.len(), 0 | 4),
            _ => return None, // incl. callsubr/callgsubr/12-escape: unprovable
        };
        let tail_at = if has_width {
            *starts.get(1).unwrap_or(&i)
        } else {
            *starts.first().unwrap_or(&i)
        };
        let width = if has_width {
            nominal_w + nums[0]
        } else {
            default_w
        };
        return Some((width, cs[tail_at..].to_vec()));
    }
    None
}

const OP_CHARSET: u16 = 15;
const OP_ENCODING: u16 = 16;
const OP_CHARSTRINGS: u16 = 17;
const OP_PRIVATE: u16 = 18;
const OP_SUBRS: u16 = 19;
const OP_DEFAULT_WIDTH: u16 = 20;
const OP_NOMINAL_WIDTH: u16 = 21;
const OP_CHARSTRING_TYPE: u16 = 0x0C06;
const OP_FONT_MATRIX: u16 = 0x0C07;
const OP_PAINT_TYPE: u16 = 0x0C05;
const OP_FONT_BBOX: u16 = 5;
const OP_ROS: u16 = 0x0C1E;
const OP_FD_ARRAY: u16 = 0x0C24;
const OP_FD_SELECT: u16 = 0x0C25;

fn parse_fragment(data: &[u8]) -> Option<Fragment> {
    // Header: major 1, hdrSize.
    if *data.first()? != 1 {
        return None;
    }
    let hdr = usize::from(*data.get(2)?);
    let (names, pos) = read_index(data, hdr)?;
    if names.len() != 1 {
        return None;
    }
    let (tops, pos) = read_index(data, pos)?;
    if tops.len() != 1 {
        return None;
    }
    let (strings, pos) = read_index(data, pos)?;
    let (gsubrs, _) = read_index(data, pos)?;

    let top = parse_dict(&tops[0])?;
    // Shapes the merge cannot represent: CID-keyed, non-Type2, painted.
    if dict_get(&top, OP_ROS).is_some()
        || dict_get(&top, OP_FD_ARRAY).is_some()
        || dict_get(&top, OP_FD_SELECT).is_some()
    {
        return None;
    }
    if let Some(e) = dict_get(&top, OP_CHARSTRING_TYPE) {
        if e.operands != [2.0] {
            return None;
        }
    }
    if let Some(e) = dict_get(&top, OP_PAINT_TYPE) {
        if e.operands != [0.0] {
            return None;
        }
    }
    let font_matrix_values = match dict_get(&top, OP_FONT_MATRIX) {
        Some(e) if e.operands.len() == 6 => e.operands.clone(),
        Some(_) => return None,
        None => vec![0.001, 0.0, 0.0, 0.001, 0.0, 0.0],
    };
    let font_matrix = dict_get(&top, OP_FONT_MATRIX).map(|e| tops[0][e.span.0..e.span.1].to_vec());
    let font_bbox = match dict_get(&top, OP_FONT_BBOX) {
        Some(e) if e.operands.len() == 4 => e.operands.clone(),
        _ => return None,
    };

    // Built-in encoding: an absent operator or operand 0/1 selects a
    // predefined encoding (Standard/Expert, never empty); a custom one is
    // empty when it defines zero codes and carries no supplements.
    let builtin_empty = match dict_get(&top, OP_ENCODING) {
        None => false,
        Some(e) => match e.operands.as_slice() {
            [v] if *v >= 2.0 => {
                let at = *v as usize;
                let fmt = *data.get(at)?;
                let count = usize::from(*data.get(at + 1)?);
                (fmt & 0x80) == 0 && (fmt & 0x7f) <= 1 && count == 0
            }
            _ => false,
        },
    };

    let charstrings_at = match dict_get(&top, OP_CHARSTRINGS)?.operands.as_slice() {
        [v] if *v >= 0.0 => *v as usize,
        _ => return None,
    };
    let (charstrings, _) = read_index(data, charstrings_at)?;
    if charstrings.is_empty() {
        return None;
    }

    // Charset (formats 0/1/2; predefined charsets declined).
    let charset_at = match dict_get(&top, OP_CHARSET)?.operands.as_slice() {
        [v] if *v >= 3.0 => *v as usize,
        _ => return None,
    };
    let n_glyphs = charstrings.len();
    let mut sids: Vec<u16> = Vec::with_capacity(n_glyphs);
    sids.push(0); // .notdef
    match *data.get(charset_at)? {
        0 => {
            for i in 0..n_glyphs - 1 {
                sids.push(be16(data, charset_at + 1 + i * 2)?);
            }
        }
        fmt @ (1 | 2) => {
            let mut at = charset_at + 1;
            while sids.len() < n_glyphs {
                let first = be16(data, at)?;
                let n_left = if fmt == 1 {
                    usize::from(*data.get(at + 2)?)
                } else {
                    usize::from(be16(data, at + 2)?)
                };
                at += if fmt == 1 { 3 } else { 4 };
                for k in 0..=n_left {
                    if sids.len() == n_glyphs {
                        return None;
                    }
                    sids.push(first.checked_add(u16::try_from(k).ok()?)?);
                }
            }
        }
        _ => return None,
    }

    let name_of = |sid: u16| -> Option<NameKey> {
        if sid < 391 {
            Some(NameKey::Std(sid))
        } else {
            Some(NameKey::Custom(
                strings.get(usize::from(sid) - 391)?.clone(),
            ))
        }
    };

    // Private DICT + local subrs.
    let (private_size, private_at) = match dict_get(&top, OP_PRIVATE)?.operands.as_slice() {
        [size, at] if *size >= 0.0 && *at >= 0.0 => (*size as usize, *at as usize),
        _ => return None,
    };
    let private_raw = data.get(private_at..private_at.checked_add(private_size)?)?;
    let private = parse_dict(private_raw)?;
    let mut default_width = 0.0f64;
    let mut nominal_width = 0.0f64;
    if let Some(e) = dict_get(&private, OP_DEFAULT_WIDTH) {
        default_width = *e.operands.first()?;
    }
    if let Some(e) = dict_get(&private, OP_NOMINAL_WIDTH) {
        nominal_width = *e.operands.first()?;
    }
    let mut lsubrs = Vec::new();
    let mut has_lsubrs = false;
    if let Some(e) = dict_get(&private, OP_SUBRS) {
        let rel = match e.operands.as_slice() {
            [v] if *v >= 0.0 => *v as usize,
            _ => return None,
        };
        lsubrs = read_index(data, private_at.checked_add(rel)?)?.0;
        has_lsubrs = true;
    }
    let splice = |skip: &[u16]| -> Vec<u8> {
        let mut out = Vec::with_capacity(private_raw.len());
        for e in &private {
            if !skip.contains(&e.op) {
                out.extend_from_slice(&private_raw[e.span.0..e.span.1]);
            }
        }
        out
    };
    let mut private_cmp: Vec<(u16, Vec<f64>)> = private
        .iter()
        .filter(|e| ![OP_SUBRS, OP_DEFAULT_WIDTH, OP_NOMINAL_WIDTH].contains(&e.op))
        .map(|e| (e.op, e.operands.clone()))
        .collect();
    private_cmp.sort_by_key(|e| e.0);
    let private_body = splice(&[OP_SUBRS]);

    // Width-normalize every glyph; duplicate names decline the fragment.
    let mut order = Vec::with_capacity(n_glyphs);
    let mut glyphs = BTreeMap::new();
    for (i, cs) in charstrings.iter().enumerate() {
        let key = name_of(sids[i])?;
        let (width, tail) = split_width(cs, default_width, nominal_width)?;
        if glyphs.insert(key.clone(), Glyph { width, tail }).is_some() {
            return None;
        }
        order.push(key);
    }

    Some(Fragment {
        name: names[0].clone(),
        font_matrix,
        font_matrix_values,
        font_bbox,
        order,
        glyphs,
        gsubrs,
        lsubrs,
        private_cmp,
        private_body,
        has_lsubrs,
        default_width,
        nominal_width,
        builtin_empty,
    })
}

/// True when `fragment` parses as a mergeable CFF whose built-in encoding
/// defines no codes at all. The planner uses this to admit font dictionaries
/// whose `/Encoding` has no named base: their base encoding *is* the built-in
/// (ISO 32000-1 Table 114), and an empty built-in is exactly what the merged
/// program carries.
pub(crate) fn has_empty_builtin_encoding(fragment: &[u8]) -> bool {
    parse_fragment(fragment).is_some_and(|f| f.builtin_empty)
}

/// Merge same-family CFF subset fragments into one union program every
/// fragment's PDF font dictionary can share. `None` unless every safety
/// precondition holds (see module docs); the caller then keeps all fragments
/// untouched. Requires at least two fragments.
///
/// The caller must guarantee PDF-side preconditions: every font dictionary's
/// code lookups are fully determined without the fragment's built-in
/// encoding — an explicit `/Encoding` with a *named* base, or an empty
/// built-in (see [`has_empty_builtin_encoding`]; the merged program carries
/// an explicitly empty one) — and `/Widths` covers the shown codes
/// (intrinsic advance widths of glyphs appended from non-base fragments are
/// re-based, byte-exactly, on the base's width parameters).
pub(crate) fn merge_type1c(fragments: &[&[u8]], write_empty_encoding: bool) -> Option<Vec<u8>> {
    if fragments.len() < 2 {
        return None;
    }
    let parsed: Vec<Fragment> = fragments
        .iter()
        .map(|f| parse_fragment(f))
        .collect::<Option<_>>()?;

    // Base: most glyphs, ties to the earliest (deterministic given the
    // caller's sorted input).
    let base_idx = (0..parsed.len()).max_by_key(|&i| (parsed[i].glyphs.len(), usize::MAX - i))?;
    let base = &parsed[base_idx];

    // Family-wide equality requirements.
    for f in &parsed {
        if f.gsubrs != base.gsubrs
            || f.lsubrs != base.lsubrs
            || f.has_lsubrs != base.has_lsubrs
            || f.private_cmp != base.private_cmp
            || f.font_matrix_values != base.font_matrix_values
        {
            return None;
        }
    }

    // Union of glyphs: shared names must agree on (width, tail) exactly.
    let mut union: BTreeMap<&NameKey, &Glyph> = BTreeMap::new();
    for f in &parsed {
        for (key, glyph) in &f.glyphs {
            match union.get(key) {
                Some(g) if g.width == glyph.width && g.tail == glyph.tail => {}
                Some(_) => return None,
                None => {
                    union.insert(key, glyph);
                }
            }
        }
    }
    // GID order: the base's own order, then appended names sorted.
    let mut order: Vec<&NameKey> = base.order.iter().collect();
    for key in union.keys() {
        if !base.glyphs.contains_key(key) {
            order.push(key);
        }
    }
    if *order.first()? != &NameKey::Std(0) || order.len() > usize::from(u16::MAX) {
        return None;
    }

    // Re-encode each charstring's width against the base's parameters.
    let mut charstrings: Vec<Vec<u8>> = Vec::with_capacity(order.len());
    for key in &order {
        let glyph = union.get(*key)?;
        let mut cs = Vec::with_capacity(glyph.tail.len() + 3);
        if glyph.width != base.default_width {
            t2_number(&mut cs, glyph.width - base.nominal_width)?;
        }
        cs.extend_from_slice(&glyph.tail);
        charstrings.push(cs);
    }

    // Strings: custom names in first-use order.
    let mut strings: Vec<Vec<u8>> = Vec::new();
    let mut charset = vec![0u8]; // format 0
    for key in &order[1..] {
        let sid = match key {
            NameKey::Std(sid) => *sid,
            NameKey::Custom(name) => {
                let pos = match strings.iter().position(|s| s == name) {
                    Some(p) => p,
                    None => {
                        strings.push(name.clone());
                        strings.len() - 1
                    }
                };
                u16::try_from(391 + pos).ok()?
            }
        };
        charset.extend_from_slice(&sid.to_be_bytes());
    }

    // FontBBox: element-wise union (appended glyphs may exceed the base's).
    let bbox: Vec<f64> = (0..4)
        .map(|i| {
            let vals = parsed.iter().map(|f| f.font_bbox[i]);
            if i < 2 {
                vals.fold(f64::INFINITY, f64::min)
            } else {
                vals.fold(f64::NEG_INFINITY, f64::max)
            }
        })
        .collect();

    // Top DICT: FontMatrix (spliced verbatim from the base) + FontBBox +
    // fixed-width Encoding/charset/CharStrings/Private offsets. The merged
    // built-in encoding is explicitly EMPTY (format 0, zero codes): every
    // admitted font dictionary either never consults the built-in (named
    // /Encoding base) or consulted an empty one, which this reproduces.
    let mut top_prefix = Vec::new();
    if let Some(fm) = &base.font_matrix {
        top_prefix.extend_from_slice(fm);
    }
    for v in &bbox {
        dict_number(&mut top_prefix, *v)?;
    }
    dict_op(&mut top_prefix, OP_FONT_BBOX);

    // Private DICT: base's entries verbatim, plus a fixed-width Subrs offset
    // pointing just past the DICT when local subrs exist.
    let mut private = base.private_body.clone();
    if base.has_lsubrs {
        let subrs_at = private.len() + 5 + 1;
        dict_int32(&mut private, u32::try_from(subrs_at).ok()?);
        dict_op(&mut private, OP_SUBRS);
    }

    let charstrings_index = cff_index(&charstrings)?;
    let lsubr_index = cff_index(&base.lsubrs)?;
    let gsubr_index = cff_index(&base.gsubrs)?;

    // Explicit empty encoding (format 0, nCodes 0) only when some admitted
    // font dictionary actually falls back to the built-in; otherwise omit
    // the operator (predefined standard encoding, unreachable via named
    // /Encoding bases).
    let encoding: &[u8] = if write_empty_encoding { &[0, 0] } else { &[] };
    let enc_entry = if write_empty_encoding { 5 + 1 } else { 0 };
    let top_dict_len = top_prefix.len() + enc_entry + (5 + 1) * 2 + (5 + 5 + 1);
    let header = [1u8, 0, 4, 4];
    let name_index = cff_index(std::slice::from_ref(&base.name))?;
    let top_index_size = cff_index(&[vec![0u8; top_dict_len]])?.len();
    let string_index = cff_index(&strings)?;

    let fixed =
        header.len() + name_index.len() + top_index_size + string_index.len() + gsubr_index.len();
    let charset_at = fixed;
    let encoding_at = charset_at + charset.len();
    let charstrings_at = encoding_at + encoding.len();
    let private_at = charstrings_at + charstrings_index.len();

    let mut top_dict = top_prefix;
    dict_int32(&mut top_dict, u32::try_from(charset_at).ok()?);
    dict_op(&mut top_dict, OP_CHARSET);
    if write_empty_encoding {
        dict_int32(&mut top_dict, u32::try_from(encoding_at).ok()?);
        dict_op(&mut top_dict, OP_ENCODING);
    }
    dict_int32(&mut top_dict, u32::try_from(charstrings_at).ok()?);
    dict_op(&mut top_dict, OP_CHARSTRINGS);
    dict_int32(&mut top_dict, u32::try_from(private.len()).ok()?);
    dict_int32(&mut top_dict, u32::try_from(private_at).ok()?);
    dict_op(&mut top_dict, OP_PRIVATE);
    debug_assert_eq!(top_dict.len(), top_dict_len);
    let top_index = cff_index(&[top_dict])?;

    let mut out = Vec::with_capacity(private_at + private.len() + lsubr_index.len());
    out.extend_from_slice(&header);
    out.extend_from_slice(&name_index);
    out.extend_from_slice(&top_index);
    out.extend_from_slice(&string_index);
    out.extend_from_slice(&gsubr_index);
    out.extend_from_slice(&charset);
    out.extend_from_slice(encoding);
    out.extend_from_slice(&charstrings_index);
    out.extend_from_slice(&private);
    if base.has_lsubrs {
        out.extend_from_slice(&lsubr_index);
    }

    // Round-trip sanity: the merged program must parse back with exactly the
    // union's glyphs, widths, and tails.
    let back = parse_fragment(&out)?;
    if back.order.len() != order.len() {
        return None;
    }
    for key in &order {
        let a = back.glyphs.get(*key)?;
        let b = union.get(*key)?;
        if a.width != b.width || a.tail != b.tail {
            return None;
        }
    }
    Some(out)
}

/// Number of glyphs shared with the base if merged — used by the caller only
/// for logging/diagnostics. (Kept minimal; the merge re-validates.)
#[cfg(test)]
mod tests {
    use super::*;

    /// Build a small one-font CFF via the merge emitter itself is circular;
    /// instead exercise split_width directly and round-trip merge on two
    /// hand-built fragments produced by `build_fragment`.
    fn build_fragment(glyphs: &[(&[u8], f64, &[u8])], default_w: f64, nominal_w: f64) -> Vec<u8> {
        // Charstrings with width deltas against (default_w, nominal_w).
        let charstrings: Vec<Vec<u8>> = glyphs
            .iter()
            .map(|(_, w, tail)| {
                let mut cs = Vec::new();
                if *w != default_w {
                    t2_number(&mut cs, *w - nominal_w).unwrap();
                }
                cs.extend_from_slice(tail);
                cs
            })
            .collect();
        let mut strings: Vec<Vec<u8>> = Vec::new();
        let mut charset = vec![0u8];
        for (name, _, _) in &glyphs[1..] {
            strings.push(name.to_vec());
            let sid = u16::try_from(391 + strings.len() - 1).unwrap();
            charset.extend_from_slice(&sid.to_be_bytes());
        }
        let mut private = Vec::new();
        dict_number(&mut private, default_w).unwrap();
        dict_op(&mut private, 20);
        dict_number(&mut private, nominal_w).unwrap();
        dict_op(&mut private, 21);

        let charstrings_index = cff_index(&charstrings).unwrap();
        let mut top_prefix = Vec::new();
        for v in [0.0, -200.0, 1000.0, 900.0] {
            dict_number(&mut top_prefix, v).unwrap();
        }
        dict_op(&mut top_prefix, 5);
        let top_dict_len = top_prefix.len() + (5 + 1) * 2 + (5 + 5 + 1);
        let header = [1u8, 0, 4, 4];
        let name_index = cff_index(&[b"Test".to_vec()]).unwrap();
        let top_index_size = cff_index(&[vec![0u8; top_dict_len]]).unwrap().len();
        let string_index = cff_index(&strings).unwrap();
        let gsubr_index = cff_index(&[]).unwrap();
        let fixed = header.len()
            + name_index.len()
            + top_index_size
            + string_index.len()
            + gsubr_index.len();
        let charset_at = fixed;
        let charstrings_at = charset_at + charset.len();
        let private_at = charstrings_at + charstrings_index.len();
        let mut top_dict = top_prefix;
        dict_int32(&mut top_dict, u32::try_from(charset_at).unwrap());
        dict_op(&mut top_dict, 15);
        dict_int32(&mut top_dict, u32::try_from(charstrings_at).unwrap());
        dict_op(&mut top_dict, 17);
        dict_int32(&mut top_dict, u32::try_from(private.len()).unwrap());
        dict_int32(&mut top_dict, u32::try_from(private_at).unwrap());
        dict_op(&mut top_dict, 18);
        let top_index = cff_index(&[top_dict]).unwrap();
        let mut out = Vec::new();
        out.extend_from_slice(&header);
        out.extend_from_slice(&name_index);
        out.extend_from_slice(&top_index);
        out.extend_from_slice(&string_index);
        out.extend_from_slice(&gsubr_index);
        out.extend_from_slice(&charset);
        out.extend_from_slice(&charstrings_index);
        out.extend_from_slice(&private);
        out
    }

    // endchar-terminated stub outlines.
    const T1: &[u8] = &[139 + 10, 139 + 10, 21, 14]; // 10 10 rmoveto endchar
    const T2: &[u8] = &[139 + 20, 139 + 20, 21, 14];
    const T3: &[u8] = &[139 + 30, 139 + 30, 21, 14];

    #[test]
    fn split_width_detects_presence_by_parity() {
        // width 250 relative to nominal 200 -> operand 50, then rmoveto.
        let mut cs = Vec::new();
        t2_number(&mut cs, 50.0).unwrap();
        cs.extend_from_slice(T1);
        let (w, tail) = split_width(&cs, 500.0, 200.0).unwrap();
        assert_eq!(w, 250.0);
        assert_eq!(tail, T1);
        // No width -> defaultWidthX.
        let (w, tail) = split_width(T1, 500.0, 200.0).unwrap();
        assert_eq!(w, 500.0);
        assert_eq!(tail, T1);
    }

    #[test]
    fn merge_unions_glyphs_and_rebases_widths() {
        let a = build_fragment(
            &[(b".notdef".as_slice(), 0.0, T1), (b"A", 600.0, T2)],
            0.0,
            0.0,
        );
        // Same glyph A with the same absolute width under different width
        // parameters (byte-different charstring), plus a new glyph B.
        let b = build_fragment(
            &[
                (b".notdef".as_slice(), 0.0, T1),
                (b"A", 600.0, T2),
                (b"B", 700.0, T3),
            ],
            100.0,
            300.0,
        );
        let merged = merge_type1c(&[&a, &b], true).unwrap();
        let f = parse_fragment(&merged).unwrap();
        assert_eq!(f.order.len(), 3);
        let ga = f.glyphs.get(&NameKey::Custom(b"A".to_vec())).unwrap();
        assert_eq!((ga.width, ga.tail.as_slice()), (600.0, T2));
        let gb = f.glyphs.get(&NameKey::Custom(b"B".to_vec())).unwrap();
        assert_eq!((gb.width, gb.tail.as_slice()), (700.0, T3));
    }

    #[test]
    fn merge_declines_conflicting_glyphs() {
        let a = build_fragment(
            &[(b".notdef".as_slice(), 0.0, T1), (b"A", 600.0, T2)],
            0.0,
            0.0,
        );
        let b = build_fragment(
            &[(b".notdef".as_slice(), 0.0, T1), (b"A", 600.0, T3)],
            0.0,
            0.0,
        );
        assert!(merge_type1c(&[&a, &b], false).is_none());
    }
}

}

mod encodings {
//! PDF simple-font encoding tables (ISO 32000-1 Annex D) and the Adobe
//! Glyph List subset needed to resolve their glyph names to Unicode.
//!
//! Data provenance: extracted programmatically from Ghostscript's built-in
//! `/WinAnsiEncoding` and `/MacRomanEncoding` resources and its
//! `AdobeGlyphList` dictionary (the same interpreter used by the external
//! render-verification harness), then cross-checked against Python's
//! `cp1252` / `mac_roman` codecs. The only divergences are the documented
//! Annex D quirks: WinAnsi fills its undefined codes with `/bullet` and names
//! 0xA0 `/space` and 0xAD `/hyphen`; MacRoman names 0xCA `/space` and keeps
//! 0xDB as `/currency` (pre-euro).
//!
//! Empty string = no name at that code (`.notdef`).

pub(crate) const WIN_ANSI_NAMES: [&str; 256] = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "space",
    "exclam",
    "quotedbl",
    "numbersign",
    "dollar",
    "percent",
    "ampersand",
    "quotesingle",
    "parenleft",
    "parenright",
    "asterisk",
    "plus",
    "comma",
    "hyphen",
    "period",
    "slash",
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "colon",
    "semicolon",
    "less",
    "equal",
    "greater",
    "question",
    "at",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "bracketleft",
    "backslash",
    "bracketright",
    "asciicircum",
    "underscore",
    "grave",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "braceleft",
    "bar",
    "braceright",
    "asciitilde",
    "bullet",
    "Euro",
    "bullet",
    "quotesinglbase",
    "florin",
    "quotedblbase",
    "ellipsis",
    "dagger",
    "daggerdbl",
    "circumflex",
    "perthousand",
    "Scaron",
    "guilsinglleft",
    "OE",
    "bullet",
    "Zcaron",
    "bullet",
    "bullet",
    "quoteleft",
    "quoteright",
    "quotedblleft",
    "quotedblright",
    "bullet",
    "endash",
    "emdash",
    "tilde",
    "trademark",
    "scaron",
    "guilsinglright",
    "oe",
    "bullet",
    "zcaron",
    "Ydieresis",
    "space",
    "exclamdown",
    "cent",
    "sterling",
    "currency",
    "yen",
    "brokenbar",
    "section",
    "dieresis",
    "copyright",
    "ordfeminine",
    "guillemotleft",
    "logicalnot",
    "hyphen",
    "registered",
    "macron",
    "degree",
    "plusminus",
    "twosuperior",
    "threesuperior",
    "acute",
    "mu",
    "paragraph",
    "periodcentered",
    "cedilla",
    "onesuperior",
    "ordmasculine",
    "guillemotright",
    "onequarter",
    "onehalf",
    "threequarters",
    "questiondown",
    "Agrave",
    "Aacute",
    "Acircumflex",
    "Atilde",
    "Adieresis",
    "Aring",
    "AE",
    "Ccedilla",
    "Egrave",
    "Eacute",
    "Ecircumflex",
    "Edieresis",
    "Igrave",
    "Iacute",
    "Icircumflex",
    "Idieresis",
    "Eth",
    "Ntilde",
    "Ograve",
    "Oacute",
    "Ocircumflex",
    "Otilde",
    "Odieresis",
    "multiply",
    "Oslash",
    "Ugrave",
    "Uacute",
    "Ucircumflex",
    "Udieresis",
    "Yacute",
    "Thorn",
    "germandbls",
    "agrave",
    "aacute",
    "acircumflex",
    "atilde",
    "adieresis",
    "aring",
    "ae",
    "ccedilla",
    "egrave",
    "eacute",
    "ecircumflex",
    "edieresis",
    "igrave",
    "iacute",
    "icircumflex",
    "idieresis",
    "eth",
    "ntilde",
    "ograve",
    "oacute",
    "ocircumflex",
    "otilde",
    "odieresis",
    "divide",
    "oslash",
    "ugrave",
    "uacute",
    "ucircumflex",
    "udieresis",
    "yacute",
    "thorn",
    "ydieresis",
];

pub(crate) const MAC_ROMAN_NAMES: [&str; 256] = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "space",
    "exclam",
    "quotedbl",
    "numbersign",
    "dollar",
    "percent",
    "ampersand",
    "quotesingle",
    "parenleft",
    "parenright",
    "asterisk",
    "plus",
    "comma",
    "hyphen",
    "period",
    "slash",
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "colon",
    "semicolon",
    "less",
    "equal",
    "greater",
    "question",
    "at",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "bracketleft",
    "backslash",
    "bracketright",
    "asciicircum",
    "underscore",
    "grave",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "braceleft",
    "bar",
    "braceright",
    "asciitilde",
    "",
    "Adieresis",
    "Aring",
    "Ccedilla",
    "Eacute",
    "Ntilde",
    "Odieresis",
    "Udieresis",
    "aacute",
    "agrave",
    "acircumflex",
    "adieresis",
    "atilde",
    "aring",
    "ccedilla",
    "eacute",
    "egrave",
    "ecircumflex",
    "edieresis",
    "iacute",
    "igrave",
    "icircumflex",
    "idieresis",
    "ntilde",
    "oacute",
    "ograve",
    "ocircumflex",
    "odieresis",
    "otilde",
    "uacute",
    "ugrave",
    "ucircumflex",
    "udieresis",
    "dagger",
    "degree",
    "cent",
    "sterling",
    "section",
    "bullet",
    "paragraph",
    "germandbls",
    "registered",
    "copyright",
    "trademark",
    "acute",
    "dieresis",
    "",
    "AE",
    "Oslash",
    "",
    "plusminus",
    "",
    "",
    "yen",
    "mu",
    "",
    "",
    "",
    "",
    "",
    "ordfeminine",
    "ordmasculine",
    "",
    "ae",
    "oslash",
    "questiondown",
    "exclamdown",
    "logicalnot",
    "",
    "florin",
    "",
    "",
    "guillemotleft",
    "guillemotright",
    "ellipsis",
    "space",
    "Agrave",
    "Atilde",
    "Otilde",
    "OE",
    "oe",
    "endash",
    "emdash",
    "quotedblleft",
    "quotedblright",
    "quoteleft",
    "quoteright",
    "divide",
    "",
    "ydieresis",
    "Ydieresis",
    "fraction",
    "currency",
    "guilsinglleft",
    "guilsinglright",
    "fi",
    "fl",
    "daggerdbl",
    "periodcentered",
    "quotesinglbase",
    "quotedblbase",
    "perthousand",
    "Acircumflex",
    "Ecircumflex",
    "Aacute",
    "Edieresis",
    "Egrave",
    "Iacute",
    "Icircumflex",
    "Idieresis",
    "Igrave",
    "Oacute",
    "Ocircumflex",
    "",
    "Ograve",
    "Uacute",
    "Ucircumflex",
    "Ugrave",
    "dotlessi",
    "circumflex",
    "tilde",
    "macron",
    "breve",
    "dotaccent",
    "ring",
    "cedilla",
    "hungarumlaut",
    "ogonek",
    "caron",
];

/// Adobe `StandardEncoding` (ISO 32000-1 Annex D.2, "StandardEncoding"
/// column). Consumed by the Type1 path: a font program declaring
/// `/Encoding StandardEncoding def`, and `seac` accent composition (whose
/// `bchar`/`achar` operands are StandardEncoding codes by definition).
/// Empty string = no name at that code (`.notdef`).
#[rustfmt::skip]
pub(crate) const STANDARD_NAMES: [&str; 256] = [
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "space", "exclam", "quotedbl", "numbersign", "dollar", "percent",
    "ampersand", "quoteright", "parenleft", "parenright", "asterisk", "plus",
    "comma", "hyphen", "period", "slash",
    "zero", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "colon", "semicolon", "less", "equal", "greater",
    "question",
    "at", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "bracketleft", "backslash", "bracketright", "asciicircum", "underscore",
    "quoteleft", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l",
    "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "braceleft", "bar", "braceright", "asciitilde", "",
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "", "exclamdown", "cent", "sterling", "fraction", "yen", "florin",
    "section", "currency", "quotesingle", "quotedblleft", "guillemotleft",
    "guilsinglleft", "guilsinglright", "fi", "fl",
    "", "endash", "dagger", "daggerdbl", "periodcentered", "", "paragraph",
    "bullet", "quotesinglbase", "quotedblbase", "quotedblright",
    "guillemotright", "ellipsis", "perthousand", "", "questiondown",
    "", "grave", "acute", "circumflex", "tilde", "macron", "breve",
    "dotaccent", "dieresis", "", "ring", "cedilla", "", "hungarumlaut",
    "ogonek", "caron",
    "emdash", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    "", "AE", "", "ordfeminine", "", "", "", "", "Lslash", "Oslash", "OE",
    "ordmasculine", "", "", "", "",
    "", "ae", "", "", "", "dotlessi", "", "", "lslash", "oslash", "oe",
    "germandbls", "", "", "", "",
];

pub(crate) const NAME_TO_UNICODE: &[(&str, u32)] = &[
    ("A", 0x0041),
    ("AE", 0x00C6),
    ("Aacute", 0x00C1),
    ("Acircumflex", 0x00C2),
    ("Adieresis", 0x00C4),
    ("Agrave", 0x00C0),
    ("Aring", 0x00C5),
    ("Atilde", 0x00C3),
    ("B", 0x0042),
    ("C", 0x0043),
    ("Ccedilla", 0x00C7),
    ("D", 0x0044),
    ("E", 0x0045),
    ("Eacute", 0x00C9),
    ("Ecircumflex", 0x00CA),
    ("Edieresis", 0x00CB),
    ("Egrave", 0x00C8),
    ("Eth", 0x00D0),
    ("Euro", 0x20AC),
    ("F", 0x0046),
    ("G", 0x0047),
    ("H", 0x0048),
    ("I", 0x0049),
    ("Iacute", 0x00CD),
    ("Icircumflex", 0x00CE),
    ("Idieresis", 0x00CF),
    ("Igrave", 0x00CC),
    ("J", 0x004A),
    ("K", 0x004B),
    ("L", 0x004C),
    ("M", 0x004D),
    ("N", 0x004E),
    ("Ntilde", 0x00D1),
    ("O", 0x004F),
    ("OE", 0x0152),
    ("Oacute", 0x00D3),
    ("Ocircumflex", 0x00D4),
    ("Odieresis", 0x00D6),
    ("Ograve", 0x00D2),
    ("Oslash", 0x00D8),
    ("Otilde", 0x00D5),
    ("P", 0x0050),
    ("Q", 0x0051),
    ("R", 0x0052),
    ("S", 0x0053),
    ("Scaron", 0x0160),
    ("T", 0x0054),
    ("Thorn", 0x00DE),
    ("U", 0x0055),
    ("Uacute", 0x00DA),
    ("Ucircumflex", 0x00DB),
    ("Udieresis", 0x00DC),
    ("Ugrave", 0x00D9),
    ("V", 0x0056),
    ("W", 0x0057),
    ("X", 0x0058),
    ("Y", 0x0059),
    ("Yacute", 0x00DD),
    ("Ydieresis", 0x0178),
    ("Z", 0x005A),
    ("Zcaron", 0x017D),
    ("a", 0x0061),
    ("aacute", 0x00E1),
    ("acircumflex", 0x00E2),
    ("acute", 0x00B4),
    ("adieresis", 0x00E4),
    ("ae", 0x00E6),
    ("agrave", 0x00E0),
    ("ampersand", 0x0026),
    ("aring", 0x00E5),
    ("asciicircum", 0x005E),
    ("asciitilde", 0x007E),
    ("asterisk", 0x002A),
    ("at", 0x0040),
    ("atilde", 0x00E3),
    ("b", 0x0062),
    ("backslash", 0x005C),
    ("bar", 0x007C),
    ("braceleft", 0x007B),
    ("braceright", 0x007D),
    ("bracketleft", 0x005B),
    ("bracketright", 0x005D),
    ("breve", 0x02D8),
    ("brokenbar", 0x00A6),
    ("bullet", 0x2022),
    ("c", 0x0063),
    ("caron", 0x02C7),
    ("ccedilla", 0x00E7),
    ("cedilla", 0x00B8),
    ("cent", 0x00A2),
    ("circumflex", 0x02C6),
    ("colon", 0x003A),
    ("comma", 0x002C),
    ("copyright", 0x00A9),
    ("currency", 0x00A4),
    ("d", 0x0064),
    ("dagger", 0x2020),
    ("daggerdbl", 0x2021),
    ("degree", 0x00B0),
    ("dieresis", 0x00A8),
    ("divide", 0x00F7),
    ("dollar", 0x0024),
    ("dotaccent", 0x02D9),
    ("dotlessi", 0x0131),
    ("e", 0x0065),
    ("eacute", 0x00E9),
    ("ecircumflex", 0x00EA),
    ("edieresis", 0x00EB),
    ("egrave", 0x00E8),
    ("eight", 0x0038),
    ("ellipsis", 0x2026),
    ("emdash", 0x2014),
    ("endash", 0x2013),
    ("equal", 0x003D),
    ("eth", 0x00F0),
    ("exclam", 0x0021),
    ("exclamdown", 0x00A1),
    ("f", 0x0066),
    ("fi", 0xFB01),
    ("five", 0x0035),
    ("fl", 0xFB02),
    ("florin", 0x0192),
    ("four", 0x0034),
    ("fraction", 0x2044),
    ("g", 0x0067),
    ("germandbls", 0x00DF),
    ("grave", 0x0060),
    ("greater", 0x003E),
    ("guillemotleft", 0x00AB),
    ("guillemotright", 0x00BB),
    ("guilsinglleft", 0x2039),
    ("guilsinglright", 0x203A),
    ("h", 0x0068),
    ("hungarumlaut", 0x02DD),
    ("hyphen", 0x002D),
    ("i", 0x0069),
    ("iacute", 0x00ED),
    ("icircumflex", 0x00EE),
    ("idieresis", 0x00EF),
    ("igrave", 0x00EC),
    ("j", 0x006A),
    ("k", 0x006B),
    ("l", 0x006C),
    ("less", 0x003C),
    ("logicalnot", 0x00AC),
    ("m", 0x006D),
    ("macron", 0x00AF),
    ("mu", 0x00B5),
    ("multiply", 0x00D7),
    ("n", 0x006E),
    ("nine", 0x0039),
    ("ntilde", 0x00F1),
    ("numbersign", 0x0023),
    ("o", 0x006F),
    ("oacute", 0x00F3),
    ("ocircumflex", 0x00F4),
    ("odieresis", 0x00F6),
    ("oe", 0x0153),
    ("ogonek", 0x02DB),
    ("ograve", 0x00F2),
    ("one", 0x0031),
    ("onehalf", 0x00BD),
    ("onequarter", 0x00BC),
    ("onesuperior", 0x00B9),
    ("ordfeminine", 0x00AA),
    ("ordmasculine", 0x00BA),
    ("oslash", 0x00F8),
    ("otilde", 0x00F5),
    ("p", 0x0070),
    ("paragraph", 0x00B6),
    ("parenleft", 0x0028),
    ("parenright", 0x0029),
    ("percent", 0x0025),
    ("period", 0x002E),
    ("periodcentered", 0x00B7),
    ("perthousand", 0x2030),
    ("plus", 0x002B),
    ("plusminus", 0x00B1),
    ("q", 0x0071),
    ("question", 0x003F),
    ("questiondown", 0x00BF),
    ("quotedbl", 0x0022),
    ("quotedblbase", 0x201E),
    ("quotedblleft", 0x201C),
    ("quotedblright", 0x201D),
    ("quoteleft", 0x2018),
    ("quoteright", 0x2019),
    ("quotesinglbase", 0x201A),
    ("quotesingle", 0x0027),
    ("r", 0x0072),
    ("registered", 0x00AE),
    ("ring", 0x02DA),
    ("s", 0x0073),
    ("scaron", 0x0161),
    ("section", 0x00A7),
    ("semicolon", 0x003B),
    ("seven", 0x0037),
    ("six", 0x0036),
    ("slash", 0x002F),
    ("space", 0x0020),
    ("sterling", 0x00A3),
    ("t", 0x0074),
    ("thorn", 0x00FE),
    ("three", 0x0033),
    ("threequarters", 0x00BE),
    ("threesuperior", 0x00B3),
    ("tilde", 0x02DC),
    ("trademark", 0x2122),
    ("two", 0x0032),
    ("twosuperior", 0x00B2),
    ("u", 0x0075),
    ("uacute", 0x00FA),
    ("ucircumflex", 0x00FB),
    ("udieresis", 0x00FC),
    ("ugrave", 0x00F9),
    ("underscore", 0x005F),
    ("v", 0x0076),
    ("w", 0x0077),
    ("x", 0x0078),
    ("y", 0x0079),
    ("yacute", 0x00FD),
    ("ydieresis", 0x00FF),
    ("yen", 0x00A5),
    ("z", 0x007A),
    ("zcaron", 0x017E),
    ("zero", 0x0030),
];

/// AGL name -> Unicode for the names of the two supported base encodings.
/// Also accepts the `uniXXXX` / `uXXXX[XX]` self-describing name forms used
/// by `/Differences` arrays. `None` = unknown name (caller must fail safe).
pub(crate) fn glyph_name_to_unicode(name: &[u8]) -> Option<u32> {
    let name = std::str::from_utf8(name).ok()?;
    if let Ok(idx) = NAME_TO_UNICODE.binary_search_by(|(n, _)| n.cmp(&name)) {
        return Some(NAME_TO_UNICODE[idx].1);
    }
    // uniXXXX: exactly four uppercase hex digits (AGL specification); uXXXX to
    // uXXXXXX: four to six uppercase hex digits.
    let parse_hex = |s: &str, min: usize, max: usize| -> Option<u32> {
        if s.len() < min
            || s.len() > max
            || !s
                .bytes()
                .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_lowercase())
        {
            return None;
        }
        let v = u32::from_str_radix(s, 16).ok()?;
        // Surrogates are not scalar values; anything above the last plane is
        // not a character at all.
        if (0xD800..=0xDFFF).contains(&v) || v > 0x10_FFFF {
            None
        } else {
            Some(v)
        }
    };
    if let Some(rest) = name.strip_prefix("uni") {
        return parse_hex(rest, 4, 4);
    }
    if let Some(rest) = name.strip_prefix("u") {
        return parse_hex(rest, 4, 6);
    }
    None
}

/// Inverse MacRomanEncoding: glyph name -> code, for the `(1,0)` cmap lookup
/// path (ISO 32000-1 9.6.6.4: the name is looked up in the standard Mac OS
/// Roman encoding to obtain a code). First occurrence wins (`/space` appears
/// at both 0x20 and 0xCA; viewers use the canonical 0x20).
pub(crate) fn mac_roman_code_of(name: &[u8]) -> Option<u8> {
    MAC_ROMAN_NAMES
        .iter()
        .position(|&n| !n.is_empty() && n.as_bytes() == name)
        .map(|idx| idx as u8)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_table_is_sorted_for_binary_search() {
        for pair in NAME_TO_UNICODE.windows(2) {
            assert!(
                pair[0].0 < pair[1].0,
                "NAME_TO_UNICODE must be strictly sorted"
            );
        }
    }

    #[test]
    fn annex_d_quirks_hold() {
        // The documented Annex D quirks double as canaries against table
        // regeneration errors.
        assert_eq!(WIN_ANSI_NAMES[0xA0], "space");
        assert_eq!(WIN_ANSI_NAMES[0xAD], "hyphen");
        assert_eq!(WIN_ANSI_NAMES[0x81], "bullet");
        assert_eq!(WIN_ANSI_NAMES[0x41], "A");
        assert_eq!(WIN_ANSI_NAMES[0x80], "Euro");
        assert_eq!(MAC_ROMAN_NAMES[0xCA], "space");
        assert_eq!(MAC_ROMAN_NAMES[0xDB], "currency");
        assert_eq!(MAC_ROMAN_NAMES[0xA5], "bullet");
        assert_eq!(glyph_name_to_unicode(b"space"), Some(0x20));
        assert_eq!(glyph_name_to_unicode(b"hyphen"), Some(0x2D));
        assert_eq!(glyph_name_to_unicode(b"Euro"), Some(0x20AC));
        assert_eq!(glyph_name_to_unicode(b"quotesingle"), Some(0x27));
        assert_eq!(glyph_name_to_unicode(b"adieresis"), Some(0xE4));
        assert_eq!(glyph_name_to_unicode(b"uni20AC"), Some(0x20AC));
        assert_eq!(glyph_name_to_unicode(b"u1D400"), Some(0x1D400));
        assert_eq!(
            glyph_name_to_unicode(b"uni20ac"),
            None,
            "AGL uniXXXX is uppercase-only"
        );
        assert_eq!(glyph_name_to_unicode(b"no-such-glyph"), None);
        assert_eq!(mac_roman_code_of(b"space"), Some(0x20));
        assert_eq!(mac_roman_code_of(b"bullet"), Some(0xA5));
        assert_eq!(mac_roman_code_of(b"A"), Some(0x41));
        assert_eq!(
            mac_roman_code_of(b"Euro"),
            None,
            "MacRomanEncoding has no Euro"
        );
    }
}

}

mod fonts {
//! Font subsetting (Phase 3, C-M1): Type0 / CIDFontType2 / Identity-H|V
//! fonts, plus nonsymbolic simple TrueType fonts (WinAnsi / MacRoman base
//! encodings, with `/Differences`), integrated via `subsetter` 0.2.6
//! (`default-features = false`).
//!
//! The Type0 design exploits the `/CIDToGIDMap` **stream** form so that
//! content-stream text bytes are **never rewritten**: the subset font gets new
//! (remapped) glyph IDs, and a freshly written old-CID -> new-GID map stream
//! absorbs the remapping. `/W`, `/DW`, and `/ToUnicode` are keyed by CID,
//! which never changes, so they stay untouched and text extraction is
//! bit-identical pre/post. The entire "rewrote the text wrong" bug class is
//! structurally impossible here.
//!
//! The simple-TrueType path keeps the same invariant a different way: codes,
//! `/Encoding`, `/Widths`, and `/ToUnicode` never change; the subset font
//! gets a freshly written `cmap` replicating the original's subtables
//! (restricted to retained glyphs, ids remapped), so every viewer lookup
//! path of ISO 32000-1 9.6.6.4 — (3,1) via glyph name -> Unicode, (1,0) via
//! glyph name -> Mac OS Roman code, plus any (3,0) the font carries —
//! resolves each used code to the same outline as before. Any used code the
//! cmap paths cannot resolve, an unknown glyph name, a symbolic flag, an
//! absent `/Encoding`/`/Widths`, or a cmap format outside {0, 4, 6, 12}
//! disqualifies that font (untouched, fail-safe).
//!
//! Fail-safe posture (eligibility, not effort — see docs/PHASE3-PLAN.md §C):
//!
//! - **Global rule:** if ANY content-bearing stream (page, form XObject,
//!   annotation appearance, tiling pattern, Type3 char proc) fails strict
//!   decompression or strict content parsing — or text is shown in a state we
//!   cannot attribute to a font — **no font in the document is touched**.
//! - **Per-font rule:** any doubt about one font (non-Identity encoding, no
//!   `/FontFile2`, unresolvable `/CIDToGIDMap`, shared descendant/descriptor/
//!   font file, out-of-range glyph IDs, `subsetter` error, not net-smaller)
//!   leaves *that* font untouched.
//! - PDF/A-declared documents (`pdfaid` in the XMP metadata) and encrypted
//!   documents are skipped entirely (C-M2 revisits PDF/A with `/CIDSet`
//!   regeneration).
//!
//! Discovery walks every stream class with its own resource context, with
//! bounded recursion and a path-based cycle guard. Fonts reachable from
//! contexts we cannot fully verify (AcroForm `/DR` — viewers may regenerate
//! appearance streams from `/DA` strings we do not parse; ExtGState `/Font`
//! entries) are disqualified rather than guessed at.

use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};

use lopdf::content::Content;
use lopdf::{dictionary, Dictionary, Document, Object, ObjectId, Stream};
use subsetter::GlyphRemapper;

use super::{
    cffhint, cffmerge, deflate_level9, encodings, inflate_capped, resolve, truetype, type1,
    FilterClass,
};

/// Recursion bound for the form/pattern/Type3 walk (depth of nested streams).
const MAX_WALK_DEPTH: usize = 16;
/// Inflation cap for content/font/map streams walked by the subsetter path.
const MAX_STREAM_BYTES: usize = 64 * 1024 * 1024;

/// A planned, fully validated font subset, computed read-only against the
/// document.
pub(crate) enum FontPlan {
    Cid(CidFontPlan),
    Simple(SimpleFontPlan),
    Type1(Type1FontPlan),
}

impl FontPlan {
    /// The font dictionary object the plan anchors to (sort key).
    fn font_id(&self) -> ObjectId {
        match self {
            FontPlan::Cid(p) => p.type0_id,
            FontPlan::Simple(p) => p.font_id,
            FontPlan::Type1(p) => p.font_id,
        }
    }
}

/// A planned Type0/CIDFontType2 subset. Applying it replaces the
/// `/FontFile2` stream in place, points `/CIDToGIDMap` at a new map stream,
/// and re-tags the font names — nothing else changes.
pub(crate) struct CidFontPlan {
    type0_id: ObjectId,
    descendant_id: ObjectId,
    descriptor_id: ObjectId,
    font_file_id: ObjectId,
    /// Flate-compressed subset font program.
    deflated_font: Vec<u8>,
    /// Uncompressed length of the subset font (`/Length1`).
    font_len: i64,
    /// Flate-compressed old-CID -> new-GID map stream payload.
    deflated_map: Vec<u8>,
    /// `TAG+BaseFont` name applied to `/BaseFont` (both dicts) and `/FontName`.
    tagged_name: Vec<u8>,
}

/// A planned simple-TrueType subset. Applying it replaces the `/FontFile2`
/// stream in place and re-tags the font names — codes, `/Encoding`,
/// `/Widths`, and `/ToUnicode` never change.
pub(crate) struct SimpleFontPlan {
    font_id: ObjectId,
    descriptor_id: ObjectId,
    font_file_id: ObjectId,
    /// Flate-compressed subset font program (with rebuilt `cmap`).
    deflated_font: Vec<u8>,
    /// Uncompressed length of the subset font (`/Length1`).
    font_len: i64,
    /// `TAG+BaseFont` name applied to `/BaseFont` and `/FontName`.
    tagged_name: Vec<u8>,
}

/// A planned Type1 → Type1C (CFF) conversion (opt-in, `convert_type1`).
/// Applying it replaces the `/FontFile` stream object in place with a
/// `/FontFile3` (`/Subtype /Type1C`) subset, re-keys the descriptor entry,
/// and re-tags the font names — `/Encoding`, `/Widths`, and `/ToUnicode`
/// never change, so text extraction is bit-identical.
pub(crate) struct Type1FontPlan {
    font_id: ObjectId,
    descriptor_id: ObjectId,
    font_file_id: ObjectId,
    /// Flate-compressed CFF font program.
    deflated_cff: Vec<u8>,
    /// `TAG+BaseFont` name applied to `/BaseFont` and `/FontName`.
    tagged_name: Vec<u8>,
}

/// Plan every eligible font subset. Read-only; returns an empty vector (and
/// therefore changes nothing) on any global disqualifier. `subset_fonts`
/// gates the Type0/TrueType subsetting planners; `convert_type1` gates the
/// Type1 → Type1C conversion planner.
pub(crate) fn plan_font_subsets(
    doc: &Document,
    subset_fonts: bool,
    convert_type1: bool,
    strip_hinting: bool,
) -> Vec<FontPlan> {
    if doc.is_encrypted() || pdfa_blocked(doc) {
        return Vec::new();
    }

    let mut walker = Walker {
        doc,
        dr: None,
        used: HashMap::new(),
        ineligible: HashSet::new(),
        visited: HashSet::new(),
        aborted: false,
    };
    walker.walk_document();
    if walker.aborted || walker.used.is_empty() {
        return Vec::new();
    }

    // Reference counts over the whole live object graph: a descendant,
    // descriptor, or font file referenced from more than one place could be
    // shared with a font whose usage we did not attribute to it — mutating it
    // would be unsound, so such fonts are ineligible.
    let mut refcounts: HashMap<ObjectId, usize> = HashMap::new();
    for obj in doc.objects.values() {
        count_refs(obj, &mut refcounts);
    }
    for (_, val) in doc.trailer.iter() {
        count_refs(val, &mut refcounts);
    }

    let mut plans: Vec<FontPlan> = walker
        .used
        .iter()
        .filter(|(id, cids)| !walker.ineligible.contains(id) && !cids.is_empty())
        .filter_map(|(&id, cids)| {
            plan_one(
                doc,
                id,
                cids,
                &refcounts,
                subset_fonts,
                convert_type1,
                strip_hinting,
            )
        })
        .collect();
    // HashMap iteration order is arbitrary; sort so output is reproducible.
    plans.sort_by_key(FontPlan::font_id);
    plans
}

/// Dispatch a used font to the planner matching its subtype (each planner
/// gated by its own option).
#[allow(clippy::too_many_arguments)]
fn plan_one(
    doc: &Document,
    id: ObjectId,
    codes: &BTreeSet<u16>,
    refcounts: &HashMap<ObjectId, usize>,
    subset_fonts: bool,
    convert_type1: bool,
    strip_hinting: bool,
) -> Option<FontPlan> {
    let dict = doc.get_object(id).ok()?.as_dict().ok()?;
    match dict.get(b"Subtype").map(|s| resolve(doc, s)) {
        Ok(Object::Name(n)) if n == b"Type0" && subset_fonts => {
            plan_one_font(doc, id, codes, refcounts, strip_hinting).map(FontPlan::Cid)
        }
        Ok(Object::Name(n)) if n == b"TrueType" && subset_fonts => {
            plan_one_simple_font(doc, id, codes, refcounts, strip_hinting).map(FontPlan::Simple)
        }
        Ok(Object::Name(n)) if n == b"Type1" && convert_type1 => {
            plan_one_type1_font(doc, id, codes, refcounts).map(FontPlan::Type1)
        }
        _ => None,
    }
}

/// Apply planned subsets. Each plan is independent; the set may be empty.
pub(crate) fn apply_font_subsets(doc: &mut Document, plans: Vec<FontPlan>) {
    for plan in plans {
        match plan {
            FontPlan::Cid(plan) => apply_cid_plan(doc, plan),
            FontPlan::Simple(plan) => apply_simple_plan(doc, plan),
            FontPlan::Type1(plan) => apply_type1_plan(doc, plan),
        }
    }
}

/// One planned same-family Type1C union merge: every member's `FontFile3`
/// stream is replaced with the identical merged program (the document-wide
/// stream dedup then collapses them to one object), and its `/BaseFont` /
/// `/FontName` are retagged from the merged bytes.
pub(crate) struct T1cMergePlan {
    members: Vec<T1cMember>,
    deflated_font: Vec<u8>,
    tagged_name: Vec<u8>,
}

struct T1cMember {
    font_id: ObjectId,
    descriptor_id: ObjectId,
    font_file_id: ObjectId,
}

/// Plan union merges of same-family simple Type1C subset fragments
/// (lossless: see src/cffmerge.rs for the byte-conservative preconditions).
/// Read-only; any global disqualifier or per-family doubt yields no plan for
/// that family.
pub(crate) fn plan_type1c_merges(doc: &Document) -> Vec<T1cMergePlan> {
    if doc.is_encrypted() || pdfa_blocked(doc) {
        return Vec::new();
    }
    let mut refcounts: HashMap<ObjectId, usize> = HashMap::new();
    for obj in doc.objects.values() {
        count_refs(obj, &mut refcounts);
    }
    for (_, val) in doc.trailer.iter() {
        count_refs(val, &mut refcounts);
    }

    struct Candidate {
        font_id: ObjectId,
        descriptor_id: ObjectId,
        font_file_id: ObjectId,
        bytes: Vec<u8>,
        stored_len: usize,
        needs_empty_builtin: bool,
    }
    // Fragments grouped by base font name minus the subset tag; sorted maps
    // and sorted ids keep the plan order reproducible.
    let mut groups: BTreeMap<Vec<u8>, Vec<Candidate>> = BTreeMap::new();
    let mut ids: Vec<ObjectId> = doc.objects.keys().copied().collect();
    ids.sort_unstable();
    for id in ids {
        let Ok(Object::Dictionary(font)) = doc.get_object(id) else {
            continue;
        };
        let is_type1 = matches!(
            font.get(b"Type").map(|o| resolve(doc, o)),
            Ok(Object::Name(n)) if n == b"Font"
        ) && matches!(
            font.get(b"Subtype").map(|o| resolve(doc, o)),
            Ok(Object::Name(n)) if n == b"Type1"
        );
        if !is_type1 {
            continue;
        }
        // The merged program's built-in encoding is explicitly empty, so the
        // PDF-side /Encoding must determine every code lookup without the
        // fragment's built-in: a named base encoding qualifies outright; an
        // /Encoding dictionary without /BaseEncoding falls back to the
        // built-in (Table 114) and qualifies only when that built-in is
        // itself empty (checked below, once the fragment bytes are read).
        let needs_empty_builtin = match font.get(b"Encoding").map(|o| resolve(doc, o)) {
            Ok(Object::Name(_)) => false,
            Ok(Object::Dictionary(d)) => !matches!(
                d.get(b"BaseEncoding").map(|o| resolve(doc, o)),
                Ok(Object::Name(_))
            ),
            _ => continue,
        };
        // /Widths must supply the advances (appended glyphs are re-based on
        // the base fragment's width parameters; see cffmerge).
        if font.get(b"Widths").is_err() {
            continue;
        }
        let Ok(Object::Name(base_name)) = font.get(b"BaseFont").map(|o| resolve(doc, o)) else {
            continue;
        };
        let base_name = base_name.clone();
        let Ok(desc_obj) = font.get(b"FontDescriptor") else {
            continue;
        };
        let (descriptor_id, descriptor) = resolve_ref(doc, desc_obj);
        let Some(descriptor_id) = descriptor_id else {
            continue;
        };
        let Ok(descriptor) = descriptor.as_dict() else {
            continue;
        };
        if descriptor.get(b"FontFile").is_ok() || descriptor.get(b"FontFile2").is_ok() {
            continue;
        }
        let Ok(ff_obj) = descriptor.get(b"FontFile3") else {
            continue;
        };
        let (font_file_id, font_file) = resolve_ref(doc, ff_obj);
        let Some(font_file_id) = font_file_id else {
            continue;
        };
        let Ok(font_file) = font_file.as_stream() else {
            continue;
        };
        if !matches!(
            font_file.dict.get(b"Subtype").map(|o| resolve(doc, o)),
            Ok(Object::Name(n)) if n == b"Type1C"
        ) {
            continue;
        }
        let Some(bytes) = strict_stream_bytes(doc, font_file) else {
            continue;
        };
        if needs_empty_builtin && !cffmerge::has_empty_builtin_encoding(&bytes) {
            continue;
        }
        groups
            .entry(strip_subset_tag(&base_name).to_vec())
            .or_default()
            .push(Candidate {
                font_id: id,
                descriptor_id,
                font_file_id,
                bytes,
                stored_len: font_file.content.len(),
                needs_empty_builtin,
            });
    }

    let mut plans = Vec::new();
    for (base_name, mut members) in groups {
        // Producers routinely share one descriptor/FontFile3 among several
        // same-family font dicts already. Sharing is safe exactly when every
        // reference to the shared object comes from inside this group: the
        // descriptor's refcount must equal the number of member font dicts
        // pointing at it, and the font file's refcount the number of member
        // descriptors pointing at it. Anything else could serve a font whose
        // usage was not attributed here — drop that member, fail-safe.
        let mut desc_refs: HashMap<ObjectId, usize> = HashMap::new();
        let mut file_refs: HashMap<ObjectId, HashSet<ObjectId>> = HashMap::new();
        for m in &members {
            *desc_refs.entry(m.descriptor_id).or_insert(0) += 1;
            file_refs
                .entry(m.font_file_id)
                .or_default()
                .insert(m.descriptor_id);
        }
        members.retain(|m| {
            refcounts.get(&m.descriptor_id) == Some(&desc_refs[&m.descriptor_id])
                && refcounts.get(&m.font_file_id) == Some(&file_refs[&m.font_file_id].len())
        });
        // Merge over the distinct programs (shared members repeat bytes).
        let mut seen_files: HashSet<ObjectId> = HashSet::new();
        let unique: Vec<&Candidate> = members
            .iter()
            .filter(|m| seen_files.insert(m.font_file_id))
            .collect();
        if unique.len() < 2 {
            continue;
        }
        let fragments: Vec<&[u8]> = unique.iter().map(|m| m.bytes.as_slice()).collect();
        let write_empty_encoding = members.iter().any(|m| m.needs_empty_builtin);
        let Some(merged) = cffmerge::merge_type1c(&fragments, write_empty_encoding) else {
            continue;
        };
        let Some(deflated) = deflate_level9(&merged) else {
            continue;
        };
        // Net-smaller guard on stored bytes: after the stream dedup collapses
        // the identical replacements, exactly one copy ships.
        let stored: usize = unique.iter().map(|m| m.stored_len).sum();
        if deflated.len() >= stored {
            continue;
        }
        let tag = subset_tag(&merged);
        let mut tagged_name = Vec::with_capacity(base_name.len() + 7);
        tagged_name.extend_from_slice(&tag);
        tagged_name.push(b'+');
        tagged_name.extend_from_slice(&base_name);
        plans.push(T1cMergePlan {
            members: members
                .into_iter()
                .map(|m| T1cMember {
                    font_id: m.font_id,
                    descriptor_id: m.descriptor_id,
                    font_file_id: m.font_file_id,
                })
                .collect(),
            deflated_font: deflated,
            tagged_name,
        });
    }
    plans
}

/// Strip Type2 hints from every `Type1C` font program in the document
/// (opt-in, under `--strip-hinting`).
///
/// Unlike the planners around it this runs *after* the font plans have been
/// applied, over the document's final `/FontFile3` streams, so it covers
/// programs this run produced — union merges and Type1 → Type1C conversions —
/// as well as ones no other pass touched.
///
/// It needs no plan and no reference-count analysis because a hint strip is
/// PDF-side inert: glyph names, glyph order, advance widths, `/Encoding`,
/// `/Widths` and `/ToUnicode` are all unchanged, so every font dictionary
/// pointing at a stream — however many there are — keeps resolving each code
/// to the same outline. What changes is only how a rasterizer grid-fits that
/// outline at small ppem, which is exactly the consent `--strip-hinting`
/// already carries.
///
/// Per-program fail-safe: [`cffhint::strip_hints`] verifies the rewritten
/// program traces glyph-for-glyph identically to the original and is strictly
/// smaller; anything else leaves that stream exactly as it was.
pub(crate) fn strip_type1c_hints(doc: &mut Document) {
    if doc.is_encrypted() || pdfa_blocked(doc) {
        return;
    }
    let mut ids: Vec<ObjectId> = doc.objects.keys().copied().collect();
    ids.sort_unstable();
    let mut rewrites: Vec<(ObjectId, Vec<u8>)> = Vec::new();
    for id in ids {
        let Ok(Object::Stream(stream)) = doc.get_object(id) else {
            continue;
        };
        if !matches!(
            stream.dict.get(b"Subtype").map(|o| resolve(doc, o)),
            Ok(Object::Name(n)) if n == b"Type1C"
        ) {
            continue;
        }
        let Some(bytes) = strict_stream_bytes(doc, stream) else {
            continue;
        };
        // The Private DICT hinting keys (`BlueValues` and friends) describe
        // nothing once the charstring hints are gone, so they go too.
        let Some(stripped) = cffhint::strip_hints(&bytes, true) else {
            continue;
        };
        let Some(deflated) = deflate_level9(&stripped) else {
            continue;
        };
        if deflated.len() >= stream.content.len() {
            continue;
        }
        rewrites.push((id, deflated));
    }
    for (id, content) in rewrites {
        if let Ok(Object::Stream(stream)) = doc.get_object_mut(id) {
            stream
                .dict
                .set("Filter", Object::Name(b"FlateDecode".to_vec()));
            stream.dict.remove(b"DecodeParms");
            stream.set_content(content);
        }
    }
}

/// True when at least one `Type1C` program in the document has strippable
/// hints. Read-only; used only to answer "is there any work at all" for a
/// document nothing else touches. Stops at the first program that strips.
pub(crate) fn any_type1c_hint_work(doc: &Document) -> bool {
    if doc.is_encrypted() || pdfa_blocked(doc) {
        return false;
    }
    doc.objects.values().any(|obj| {
        let Object::Stream(stream) = obj else {
            return false;
        };
        matches!(
            stream.dict.get(b"Subtype").map(|o| resolve(doc, o)),
            Ok(Object::Name(n)) if n == b"Type1C"
        ) && strict_stream_bytes(doc, stream)
            .and_then(|b| cffhint::strip_hints(&b, true))
            .is_some()
    })
}

/// Apply planned Type1C family merges. Each plan is independent.
pub(crate) fn apply_type1c_merges(doc: &mut Document, plans: Vec<T1cMergePlan>) {
    for plan in plans {
        for member in &plan.members {
            let stream = Stream::new(
                dictionary! {
                    "Filter" => "FlateDecode",
                    "Subtype" => Object::Name(b"Type1C".to_vec()),
                },
                plan.deflated_font.clone(),
            )
            .with_compression(false);
            doc.objects
                .insert(member.font_file_id, Object::Stream(stream));
            if let Ok(Object::Dictionary(d)) = doc.get_object_mut(member.descriptor_id) {
                d.set("FontName", Object::Name(plan.tagged_name.clone()));
                // A stale /CharSet would misdescribe the union program; it is
                // optional metadata (PDF/A documents were skipped above).
                d.remove(b"CharSet");
            }
            if let Ok(Object::Dictionary(d)) = doc.get_object_mut(member.font_id) {
                d.set("BaseFont", Object::Name(plan.tagged_name.clone()));
            }
        }
    }
}

fn apply_cid_plan(doc: &mut Document, plan: CidFontPlan) {
    let map_stream = Stream::new(dictionary! { "Filter" => "FlateDecode" }, plan.deflated_map)
        .with_compression(false);
    let map_id = doc.add_object(map_stream);

    let font_stream = Stream::new(
        dictionary! {
            "Filter" => "FlateDecode",
            "Length1" => plan.font_len,
        },
        plan.deflated_font,
    )
    .with_compression(false);
    doc.objects
        .insert(plan.font_file_id, Object::Stream(font_stream));

    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(plan.descendant_id) {
        d.set("CIDToGIDMap", Object::Reference(map_id));
        d.set("BaseFont", Object::Name(plan.tagged_name.clone()));
    }
    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(plan.type0_id) {
        d.set("BaseFont", Object::Name(plan.tagged_name.clone()));
    }
    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(plan.descriptor_id) {
        d.set("FontName", Object::Name(plan.tagged_name));
        // A stale /CIDSet would over-claim glyph coverage after the
        // subset; it is optional metadata outside PDF/A (and PDF/A
        // documents were skipped above), so drop it. C-M2 regenerates it.
        d.remove(b"CIDSet");
    }
}

fn apply_simple_plan(doc: &mut Document, plan: SimpleFontPlan) {
    let font_stream = Stream::new(
        dictionary! {
            "Filter" => "FlateDecode",
            "Length1" => plan.font_len,
        },
        plan.deflated_font,
    )
    .with_compression(false);
    doc.objects
        .insert(plan.font_file_id, Object::Stream(font_stream));

    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(plan.font_id) {
        d.set("BaseFont", Object::Name(plan.tagged_name.clone()));
    }
    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(plan.descriptor_id) {
        d.set("FontName", Object::Name(plan.tagged_name));
    }
}

fn apply_type1_plan(doc: &mut Document, plan: Type1FontPlan) {
    // The stream object keeps its id but changes role: `/FontFile3` streams
    // carry `/Subtype /Type1C` and none of the Type1 `/Length1..3` splits.
    let font_stream = Stream::new(
        dictionary! {
            "Filter" => "FlateDecode",
            "Subtype" => "Type1C",
        },
        plan.deflated_cff,
    )
    .with_compression(false);
    doc.objects
        .insert(plan.font_file_id, Object::Stream(font_stream));

    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(plan.descriptor_id) {
        d.remove(b"FontFile");
        d.set("FontFile3", Object::Reference(plan.font_file_id));
        d.set("FontName", Object::Name(plan.tagged_name.clone()));
    }
    if let Ok(Object::Dictionary(d)) = doc.get_object_mut(plan.font_id) {
        d.set("BaseFont", Object::Name(plan.tagged_name));
    }
}

// ---------------------------------------------------------------------------
// Strict stream access
// ---------------------------------------------------------------------------

/// Strictly decode a stream's bytes: uncompressed or single-filter
/// FlateDecode without `/DecodeParms` only. Unlike lopdf's
/// `decompressed_content` (which returns *partial* data on corrupt zlib —
/// a silent under-read that would hide text-show operators from the walker),
/// corrupt input yields `None`.
fn strict_stream_bytes(doc: &Document, stream: &Stream) -> Option<Vec<u8>> {
    match stream.dict.get(b"Filter") {
        Err(_) => Some(stream.content.clone()),
        Ok(Object::Null) => Some(stream.content.clone()),
        Ok(filter) => match crate::amatl::classify_filter(doc, filter) {
            FilterClass::FlateOnly => {
                if !matches!(stream.dict.get(b"DecodeParms"), Err(_) | Ok(Object::Null)) {
                    return None;
                }
                inflate_capped(&stream.content, MAX_STREAM_BYTES)
            }
            _ => None,
        },
    }
}

/// Follow a reference chain, returning the id of the **final** reference (the
/// object that would be mutated) alongside the resolved object. `None` id
/// means the object was inline (not an indirect object).
fn resolve_ref<'a>(doc: &'a Document, mut obj: &'a Object) -> (Option<ObjectId>, &'a Object) {
    let mut last = None;
    for _ in 0..8 {
        match obj {
            Object::Reference(id) => match doc.get_object(*id) {
                Ok(next) => {
                    last = Some(*id);
                    obj = next;
                }
                Err(_) => break,
            },
            _ => break,
        }
    }
    (last, obj)
}

/// True when the document declares PDF/A conformance in its XMP metadata (or
/// when the metadata exists but cannot be read strictly — treated as "cannot
/// rule PDF/A out"). Subsetting would invalidate `/CIDSet`-style conformance
/// artifacts, so such documents are skipped wholesale in C-M1. Also consumed by
/// the final re-deflate pass in `lib.rs`, which declines conformance-claiming
/// documents for the same "do not touch a document that asserts its own byte
/// shape" reason.
pub(crate) fn pdfa_blocked(doc: &Document) -> bool {
    let Ok(catalog) = doc.catalog() else {
        return true;
    };
    match catalog.get(b"Metadata") {
        Err(_) => false,
        Ok(meta) => {
            let (_, meta) = resolve_ref(doc, meta);
            let Object::Stream(stream) = meta else {
                return true;
            };
            let Some(bytes) = strict_stream_bytes(doc, stream) else {
                return true;
            };
            // Match both the conventional prefix and the namespace URI tail,
            // since XMP prefixes are renameable.
            contains(&bytes, b"pdfaid:part") || contains(&bytes, b"pdfa/ns/id")
        }
    }
}

fn contains(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|w| w == needle)
}

fn count_refs(obj: &Object, counts: &mut HashMap<ObjectId, usize>) {
    match obj {
        Object::Reference(id) => *counts.entry(*id).or_insert(0) += 1,
        Object::Array(items) => {
            for item in items {
                count_refs(item, counts);
            }
        }
        Object::Dictionary(dict) => {
            for (_, val) in dict.iter() {
                count_refs(val, counts);
            }
        }
        Object::Stream(stream) => {
            for (_, val) in stream.dict.iter() {
                count_refs(val, counts);
            }
        }
        _ => {}
    }
}

// ---------------------------------------------------------------------------
// Glyph discovery walker
// ---------------------------------------------------------------------------

/// The font selected by the most recent `Tf` in the current stream.
enum CurrentFont {
    /// No `Tf` seen yet: a show operator here means text we cannot attribute,
    /// e.g. a form inheriting the invoker's text state — global abort.
    Unset,
    /// A font we will never touch (Type3, MMType1, non-Identity Type0,
    /// inline dictionaries): show strings are ignored.
    Other,
    /// A Type0 / Identity-H|V font: show strings are big-endian 2-byte CIDs.
    Candidate(ObjectId),
    /// A simple TrueType or Type1 font: show strings are single-byte codes.
    /// Eligibility (encoding, flags, cmap, font program) is decided at
    /// planning time, per subtype.
    Simple(ObjectId),
}

struct Walker<'a> {
    doc: &'a Document,
    /// AcroForm `/DR` resources: fallback context for appearance streams.
    dr: Option<&'a Dictionary>,
    /// Used CIDs per candidate Type0 font object.
    used: HashMap<ObjectId, BTreeSet<u16>>,
    /// Fonts disqualified during the walk (odd show strings, `/DR` exposure).
    ineligible: HashSet<ObjectId>,
    /// Self-contained streams already walked (safe to skip on re-encounter).
    visited: HashSet<ObjectId>,
    aborted: bool,
}

impl<'a> Walker<'a> {
    fn abort(&mut self) {
        self.aborted = true;
    }

    fn walk_document(&mut self) {
        self.collect_acroform();
        if self.aborted {
            return;
        }
        for (_, page_id) in self.doc.get_pages() {
            self.walk_page(page_id);
            if self.aborted {
                return;
            }
        }
    }

    /// Fonts reachable from AcroForm `/DR` are disqualified: viewers may
    /// regenerate field appearances from `/DA` strings (which we do not
    /// parse), using glyphs we never saw.
    fn collect_acroform(&mut self) {
        let Ok(catalog) = self.doc.catalog() else {
            self.abort();
            return;
        };
        let Ok(acroform) = catalog.get(b"AcroForm") else {
            return;
        };
        let Ok(acroform) = resolve(self.doc, acroform).as_dict() else {
            self.abort();
            return;
        };
        let Ok(dr) = acroform.get(b"DR") else {
            return;
        };
        let Ok(dr) = resolve(self.doc, dr).as_dict() else {
            self.abort();
            return;
        };
        self.dr = Some(dr);
        let Ok(fonts) = dr.get(b"Font") else {
            return;
        };
        let Ok(fonts) = resolve(self.doc, fonts).as_dict() else {
            self.abort();
            return;
        };
        for (_, val) in fonts.iter() {
            if let (Some(id), _) = resolve_ref(self.doc, val) {
                self.ineligible.insert(id);
            }
        }
    }

    fn walk_page(&mut self, page_id: ObjectId) {
        let mut path: Vec<ObjectId> = Vec::new();
        let resources = crate::amatl::page_resources(self.doc, page_id);

        // Concatenate the page's content streams (operators may span stream
        // boundaries, so they are parsed as one unit, per spec).
        let mut content = Vec::new();
        for stream_id in self.doc.get_page_contents(page_id) {
            let Ok(stream) = self.doc.get_object(stream_id).and_then(Object::as_stream) else {
                self.abort();
                return;
            };
            let Some(bytes) = strict_stream_bytes(self.doc, stream) else {
                self.abort();
                return;
            };
            content.extend_from_slice(&bytes);
            content.push(b'\n');
        }
        self.walk_context(&content, resources, &[], &mut path);
        if self.aborted {
            return;
        }
        self.walk_annotations(page_id, &mut path);
    }

    fn walk_annotations(&mut self, page_id: ObjectId, path: &mut Vec<ObjectId>) {
        let Ok(page) = self.doc.get_object(page_id).and_then(Object::as_dict) else {
            self.abort();
            return;
        };
        let Ok(annots) = page.get(b"Annots") else {
            return;
        };
        let Ok(annots) = resolve(self.doc, annots).as_array() else {
            self.abort();
            return;
        };
        for entry in annots {
            // A dangling annotation reference renders nothing; skip it.
            if let Object::Reference(id) = entry {
                if self.doc.get_object(*id).is_err() {
                    continue;
                }
            }
            let Ok(annot) = resolve(self.doc, entry).as_dict() else {
                self.abort();
                return;
            };
            let Ok(ap) = annot.get(b"AP") else {
                continue;
            };
            let Ok(ap) = resolve(self.doc, ap).as_dict() else {
                self.abort();
                return;
            };
            for (_, appearance) in ap.iter() {
                match resolve_ref(self.doc, appearance) {
                    (Some(id), Object::Stream(_)) => self.walk_appearance(id, path),
                    // Appearance sub-dictionary: one stream per state.
                    (_, Object::Dictionary(states)) => {
                        for (_, state) in states.iter() {
                            match resolve_ref(self.doc, state) {
                                (Some(id), Object::Stream(_)) => self.walk_appearance(id, path),
                                (_, Object::Reference(_)) => continue, // dangling
                                _ => self.abort(),
                            }
                            if self.aborted {
                                return;
                            }
                        }
                    }
                    (_, Object::Reference(_)) => continue, // dangling
                    _ => self.abort(),
                }
                if self.aborted {
                    return;
                }
            }
        }
    }

    /// Walk one annotation appearance stream. Its resource fallback is the
    /// AcroForm `/DR` (the context viewers evaluate `/DA` against), never the
    /// page resources.
    fn walk_appearance(&mut self, id: ObjectId, path: &mut Vec<ObjectId>) {
        let parent: Vec<&Dictionary> = self.dr.into_iter().collect();
        self.walk_stream_object(id, OwnResources::OfStream, &parent, path, true);
    }

    /// Walk a content-bearing stream object (form XObject, tiling pattern,
    /// appearance stream, or Type3 char proc) with cycle guard and depth
    /// bound. Returns true when any font lookup fell back past the stream's
    /// own resources (context-dependent: must be re-walked per context).
    fn walk_stream_object(
        &mut self,
        id: ObjectId,
        own: OwnResources<'a>,
        parent_chain: &[&'a Dictionary],
        path: &mut Vec<ObjectId>,
        cacheable: bool,
    ) -> bool {
        if path.contains(&id) {
            // A stream reachable from itself is malformed; walking it could
            // loop, so give up on the whole document.
            self.abort();
            return false;
        }
        if cacheable && self.visited.contains(&id) {
            return false;
        }
        if path.len() >= MAX_WALK_DEPTH {
            self.abort();
            return false;
        }
        let Ok(stream) = self.doc.get_object(id).and_then(Object::as_stream) else {
            self.abort();
            return false;
        };
        let own_res = match own {
            OwnResources::OfStream => match stream.dict.get(b"Resources") {
                Err(_) => None,
                Ok(res) => match resolve(self.doc, res).as_dict() {
                    Ok(dict) => Some(dict),
                    Err(_) => {
                        self.abort();
                        return false;
                    }
                },
            },
            OwnResources::Given(res) => res,
        };
        let Some(bytes) = strict_stream_bytes(self.doc, stream) else {
            self.abort();
            return false;
        };
        path.push(id);
        let fallback = self.walk_context(&bytes, own_res, parent_chain, path);
        path.pop();
        if cacheable && !fallback && !self.aborted {
            self.visited.insert(id);
        }
        fallback
    }

    /// Walk one content stream in its resource context: recurse into the
    /// resources' nested content (forms, patterns, Type3 char procs), then
    /// parse the operators tracking `Tf` and the four show operators.
    fn walk_context(
        &mut self,
        content: &[u8],
        own_res: Option<&'a Dictionary>,
        parent_chain: &[&'a Dictionary],
        path: &mut Vec<ObjectId>,
    ) -> bool {
        let mut chain: Vec<&'a Dictionary> = Vec::with_capacity(parent_chain.len() + 1);
        if let Some(res) = own_res {
            chain.push(res);
        }
        chain.extend_from_slice(parent_chain);
        let own_count = usize::from(own_res.is_some());

        let mut fallback = false;
        if let Some(res) = own_res {
            fallback |= self.walk_resources(res, &chain, path);
            if self.aborted {
                return fallback;
            }
        }

        // Strict parsing: the lenient `Content::decode` silently drops a
        // trailing unparseable region, which could hide show operators.
        let Ok(parsed) = Content::decode_strict(content) else {
            self.abort();
            return fallback;
        };

        let mut current = CurrentFont::Unset;
        for op in &parsed.operations {
            match op.operator.as_str() {
                "Tf" => {
                    let Some(Object::Name(name)) = op.operands.first() else {
                        self.abort();
                        return fallback;
                    };
                    let Some((font, from_fallback)) = self.lookup_font(&chain, own_count, name)
                    else {
                        self.abort();
                        return fallback;
                    };
                    fallback |= from_fallback;
                    current = self.classify_font(font);
                }
                "Tj" | "'" => match op.operands.first() {
                    Some(Object::String(s, _)) => self.record_show(&current, s),
                    _ => self.abort(),
                },
                "\"" => match op.operands.get(2) {
                    Some(Object::String(s, _)) => self.record_show(&current, s),
                    _ => self.abort(),
                },
                "TJ" => match op.operands.first() {
                    Some(Object::Array(items)) => {
                        for item in items {
                            match item {
                                Object::String(s, _) => self.record_show(&current, s),
                                Object::Integer(_) | Object::Real(_) => {}
                                _ => self.abort(),
                            }
                            if self.aborted {
                                return fallback;
                            }
                        }
                    }
                    _ => self.abort(),
                },
                // lopdf parses inline images into a "BI" operation carrying
                // the image as a stream operand; EMPTY operands mean it could
                // not parse the image and skipped bytes — parsing after that
                // point is untrustworthy.
                "BI" if op.operands.is_empty() => self.abort(),
                _ => {}
            }
            if self.aborted {
                return fallback;
            }
        }
        fallback
    }

    /// Look up a font name through the resource chain (innermost first).
    /// Returns the font object and whether the hit came from a fallback
    /// (inherited) context.
    fn lookup_font(
        &self,
        chain: &[&'a Dictionary],
        own_count: usize,
        name: &[u8],
    ) -> Option<(&'a Object, bool)> {
        for (idx, res) in chain.iter().enumerate() {
            let Ok(fonts) = res.get(b"Font") else {
                continue;
            };
            let Ok(fonts) = resolve(self.doc, fonts).as_dict() else {
                return None;
            };
            if let Ok(font) = fonts.get(name) {
                return Some((font, idx >= own_count));
            }
        }
        None
    }

    /// Classify the font selected by a `Tf`. Aborts (via the returned state
    /// being irrelevant after `self.aborted`) when the font cannot be
    /// understood well enough to be safe.
    fn classify_font(&mut self, font: &'a Object) -> CurrentFont {
        let (id, resolved) = resolve_ref(self.doc, font);
        let Ok(dict) = resolved.as_dict() else {
            self.abort();
            return CurrentFont::Other;
        };
        let subtype = match dict.get(b"Subtype").map(|s| resolve(self.doc, s)) {
            Ok(Object::Name(n)) => n.as_slice(),
            _ => return CurrentFont::Other,
        };
        if subtype == b"TrueType" || subtype == b"Type1" {
            return match id {
                Some(id) => CurrentFont::Simple(id),
                // An inline simple dict stays untouched (usage cannot be
                // keyed); sharing its descriptor or font file with a
                // candidate is caught by the refcount guard.
                None => CurrentFont::Other,
            };
        }
        if subtype != b"Type0" {
            return CurrentFont::Other;
        }
        let identity = matches!(
            dict.get(b"Encoding").map(|e| resolve(self.doc, e)),
            Ok(Object::Name(n)) if n == b"Identity-H" || n == b"Identity-V"
        );
        if !identity {
            // Predefined CJK CMaps, embedded CMap streams: never subset,
            // shows are safely ignored (the font stays untouched).
            return CurrentFont::Other;
        }
        match id {
            Some(id) => CurrentFont::Candidate(id),
            None => {
                // An inline Identity Type0 dict could share descendants with
                // a referenced font without us being able to attribute usage.
                self.abort();
                CurrentFont::Other
            }
        }
    }

    fn record_show(&mut self, current: &CurrentFont, bytes: &[u8]) {
        match current {
            CurrentFont::Unset => self.abort(),
            CurrentFont::Other => {}
            CurrentFont::Candidate(id) => {
                if !bytes.len().is_multiple_of(2) {
                    // Malformed for Identity-H/V; cannot trust this font's
                    // collected set.
                    self.ineligible.insert(*id);
                    return;
                }
                let set = self.used.entry(*id).or_default();
                for pair in bytes.as_chunks::<2>().0 {
                    set.insert(u16::from_be_bytes(*pair));
                }
            }
            CurrentFont::Simple(id) => {
                let set = self.used.entry(*id).or_default();
                for &byte in bytes {
                    set.insert(u16::from(byte));
                }
            }
        }
    }

    /// Recurse into the content-bearing streams reachable from one resource
    /// dictionary: form XObjects, tiling patterns, Type3 char procs. Also
    /// vets ExtGState entries (a `/Font` there selects a font without `Tf`,
    /// which the walker cannot attribute — global abort).
    fn walk_resources(
        &mut self,
        res: &'a Dictionary,
        chain: &[&'a Dictionary],
        path: &mut Vec<ObjectId>,
    ) -> bool {
        let mut fallback = false;

        if let Ok(states) = res.get(b"ExtGState") {
            let Ok(states) = resolve(self.doc, states).as_dict() else {
                self.abort();
                return fallback;
            };
            for (_, state) in states.iter() {
                let Ok(state) = resolve(self.doc, state).as_dict() else {
                    self.abort();
                    return fallback;
                };
                if state.get(b"Font").is_ok() {
                    self.abort();
                    return fallback;
                }
            }
        }

        if let Ok(xobjects) = res.get(b"XObject") {
            let Ok(xobjects) = resolve(self.doc, xobjects).as_dict() else {
                self.abort();
                return fallback;
            };
            for (_, val) in xobjects.iter() {
                let Object::Reference(id) = val else {
                    self.abort();
                    return fallback;
                };
                let Ok(obj) = self.doc.get_object(*id) else {
                    continue; // dangling: renders nothing
                };
                let Ok(stream) = obj.as_stream() else {
                    self.abort();
                    return fallback;
                };
                match stream.dict.get(b"Subtype").map(|s| resolve(self.doc, s)) {
                    Ok(Object::Name(n)) if n == b"Form" => {
                        fallback |=
                            self.walk_stream_object(*id, OwnResources::OfStream, chain, path, true);
                    }
                    Ok(Object::Name(n)) if n == b"Image" || n == b"PS" => {}
                    _ => {
                        self.abort();
                        return fallback;
                    }
                }
                if self.aborted {
                    return fallback;
                }
            }
        }

        if let Ok(patterns) = res.get(b"Pattern") {
            let Ok(patterns) = resolve(self.doc, patterns).as_dict() else {
                self.abort();
                return fallback;
            };
            for (_, val) in patterns.iter() {
                match resolve_ref(self.doc, val) {
                    (Some(id), Object::Stream(stream)) => {
                        match stream
                            .dict
                            .get(b"PatternType")
                            .map(|p| resolve(self.doc, p))
                            .and_then(Object::as_i64)
                        {
                            Ok(1) => {
                                fallback |= self.walk_stream_object(
                                    id,
                                    OwnResources::OfStream,
                                    chain,
                                    path,
                                    true,
                                );
                            }
                            Ok(2) => {}
                            _ => {
                                self.abort();
                                return fallback;
                            }
                        }
                    }
                    // Shading patterns may be plain dictionaries; no content.
                    (_, Object::Dictionary(dict))
                        if matches!(
                            dict.get(b"PatternType")
                                .map(|p| resolve(self.doc, p))
                                .and_then(Object::as_i64),
                            Ok(2)
                        ) => {}
                    (_, Object::Reference(_)) => continue, // dangling
                    _ => {
                        self.abort();
                        return fallback;
                    }
                }
                if self.aborted {
                    return fallback;
                }
            }
        }

        if let Ok(fonts) = res.get(b"Font") {
            let Ok(fonts) = resolve(self.doc, fonts).as_dict() else {
                self.abort();
                return fallback;
            };
            for (_, val) in fonts.iter() {
                let (_, resolved) = resolve_ref(self.doc, val);
                if let Object::Reference(id) = resolved {
                    if self.doc.get_object(*id).is_err() {
                        continue; // dangling
                    }
                }
                let Ok(dict) = resolved.as_dict() else {
                    self.abort();
                    return fallback;
                };
                let is_type3 = matches!(
                    dict.get(b"Subtype").map(|s| resolve(self.doc, s)),
                    Ok(Object::Name(n)) if n == b"Type3"
                );
                if is_type3 {
                    fallback |= self.walk_type3(dict, chain, path);
                    if self.aborted {
                        return fallback;
                    }
                }
            }
        }

        fallback
    }

    /// Walk a Type3 font's char-proc streams. Their names resolve in the
    /// font's own `/Resources` first, falling back to the invoking context
    /// (the deprecated-but-real inheritance path).
    fn walk_type3(
        &mut self,
        font: &'a Dictionary,
        chain: &[&'a Dictionary],
        path: &mut Vec<ObjectId>,
    ) -> bool {
        let mut fallback = false;
        let own_res = match font.get(b"Resources") {
            Err(_) => None,
            Ok(res) => match resolve(self.doc, res).as_dict() {
                Ok(dict) => Some(dict),
                Err(_) => {
                    self.abort();
                    return fallback;
                }
            },
        };
        let Ok(procs) = font.get(b"CharProcs") else {
            self.abort();
            return fallback;
        };
        let Ok(procs) = resolve(self.doc, procs).as_dict() else {
            self.abort();
            return fallback;
        };
        for (_, proc_ref) in procs.iter() {
            let Object::Reference(id) = proc_ref else {
                self.abort();
                return fallback;
            };
            if self.doc.get_object(*id).is_err() {
                continue; // dangling: glyph renders nothing
            }
            // Not cacheable: the same char-proc stream under a different
            // Type3 font would have a different own-resources context.
            fallback |=
                self.walk_stream_object(*id, OwnResources::Given(own_res), chain, path, false);
            if self.aborted {
                return fallback;
            }
        }
        fallback
    }
}

/// Where a walked stream's own resource dictionary comes from.
enum OwnResources<'a> {
    /// The stream's own `/Resources` entry (forms, patterns, appearances).
    OfStream,
    /// Supplied by the surrounding structure (Type3 `/Resources` for its
    /// char procs, which have no `/Resources` of their own).
    Given(Option<&'a Dictionary>),
}

// ---------------------------------------------------------------------------
// Per-font planning
// ---------------------------------------------------------------------------

/// The descendant's CID -> GID mapping on input.
enum CidToGid {
    Identity,
    Table(Vec<u8>),
}

struct CidMap {
    map: CidToGid,
    /// Stored (compressed) size of the old map stream, for the net-smaller
    /// comparison. Zero for `/Identity`.
    stored_len: usize,
}

impl CidMap {
    fn lookup(&self, cid: u16) -> u16 {
        match &self.map {
            CidToGid::Identity => cid,
            CidToGid::Table(table) => {
                let idx = usize::from(cid) * 2;
                match (table.get(idx), table.get(idx + 1)) {
                    (Some(&hi), Some(&lo)) => u16::from_be_bytes([hi, lo]),
                    // Beyond the table: .notdef, per spec.
                    _ => 0,
                }
            }
        }
    }
}

fn load_cid_map(doc: &Document, descendant: &Dictionary) -> Option<CidMap> {
    match descendant.get(b"CIDToGIDMap") {
        // Absent defaults to /Identity per spec.
        Err(_) => Some(CidMap {
            map: CidToGid::Identity,
            stored_len: 0,
        }),
        Ok(obj) => match resolve_ref(doc, obj).1 {
            Object::Name(n) if n == b"Identity" => Some(CidMap {
                map: CidToGid::Identity,
                stored_len: 0,
            }),
            Object::Stream(stream) => {
                let table = strict_stream_bytes(doc, stream)?;
                Some(CidMap {
                    map: CidToGid::Table(table),
                    stored_len: stream.content.len(),
                })
            }
            _ => None,
        },
    }
}

fn be16(data: &[u8], offset: usize) -> Option<u16> {
    Some(u16::from_be_bytes([
        *data.get(offset)?,
        *data.get(offset.checked_add(1)?)?,
    ]))
}

/// `numGlyphs` from the font's `maxp` table (single fonts only; collections
/// return `None`, which disqualifies them — FontFile2 must not be a TTC).
fn num_glyphs(font: &[u8]) -> Option<u16> {
    let table_count = usize::from(be16(font, 4)?);
    for i in 0..table_count {
        let record = 12 + i * 16;
        if font.get(record..record + 4)? == b"maxp" {
            let offset =
                u32::from_be_bytes(font.get(record + 8..record + 12)?.try_into().ok()?) as usize;
            return be16(font, offset.checked_add(4)?);
        }
    }
    None
}

/// Deterministic 6-letter subset tag derived from the subset bytes (FNV-1a;
/// no randomness, so outputs are reproducible).
fn subset_tag(data: &[u8]) -> [u8; 6] {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for &byte in data {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    let mut tag = [0u8; 6];
    for slot in &mut tag {
        *slot = b'A' + (hash % 26) as u8;
        hash /= 26;
    }
    tag
}

/// Strip an existing `ABCDEF+` subset tag so re-subsetting replaces it
/// instead of stacking a second one.
fn strip_subset_tag(name: &[u8]) -> &[u8] {
    if name.len() > 7 && name[6] == b'+' && name[..6].iter().all(u8::is_ascii_uppercase) {
        &name[7..]
    } else {
        name
    }
}

/// Validate one candidate Type0 font end to end and build its plan. Any
/// failure — wrong shapes, shared structure, subsetter error, not
/// net-smaller — returns `None` and the font ships untouched.
fn plan_one_font(
    doc: &Document,
    type0_id: ObjectId,
    cids: &BTreeSet<u16>,
    refcounts: &HashMap<ObjectId, usize>,
    strip_hinting: bool,
) -> Option<CidFontPlan> {
    let type0 = doc.get_object(type0_id).ok()?.as_dict().ok()?;

    let descendants = type0.get(b"DescendantFonts").ok()?;
    // If the array itself is indirect, it must not be shared between fonts.
    let (array_id, descendants) = resolve_ref(doc, descendants);
    if let Some(array_id) = array_id {
        if refcounts.get(&array_id) != Some(&1) {
            return None;
        }
    }
    let descendants = descendants.as_array().ok()?;
    if descendants.len() != 1 {
        return None;
    }
    let (descendant_id, descendant) = resolve_ref(doc, &descendants[0]);
    let descendant_id = descendant_id?;
    let descendant = descendant.as_dict().ok()?;
    if !matches!(
        descendant.get(b"Subtype").map(|s| resolve(doc, s)),
        Ok(Object::Name(n)) if n == b"CIDFontType2"
    ) {
        // CIDFontType0 (CFF) requires show-string rewriting — C-M2/M3.
        return None;
    }

    let (descriptor_id, descriptor) = resolve_ref(doc, descendant.get(b"FontDescriptor").ok()?);
    let descriptor_id = descriptor_id?;
    let descriptor = descriptor.as_dict().ok()?;
    // A descriptor carrying additional font programs is a shape we do not
    // understand well enough to mutate.
    if descriptor.get(b"FontFile").is_ok() || descriptor.get(b"FontFile3").is_ok() {
        return None;
    }
    let (font_file_id, font_file) = resolve_ref(doc, descriptor.get(b"FontFile2").ok()?);
    let font_file_id = font_file_id?;
    let font_file = font_file.as_stream().ok()?;

    // Shared descendant/descriptor/font-program structure could serve fonts
    // whose usage was not attributed here; mutating it would be unsound.
    if refcounts.get(&descendant_id) != Some(&1)
        || refcounts.get(&descriptor_id) != Some(&1)
        || refcounts.get(&font_file_id) != Some(&1)
    {
        return None;
    }

    let font_bytes = strict_stream_bytes(doc, font_file)?;
    let glyph_count = num_glyphs(&font_bytes)?;
    let cid_map = load_cid_map(doc, descendant)?;

    let mut gids: BTreeSet<u16> = BTreeSet::new();
    for &cid in cids {
        let gid = cid_map.lookup(cid);
        if gid != 0 && gid >= glyph_count {
            // The document references a glyph the font does not have; the
            // font is not in a state we can confidently transform.
            return None;
        }
        gids.insert(gid);
    }
    let gid_list: Vec<u16> = gids.iter().copied().collect();
    let remapper = GlyphRemapper::new_from_glyphs_sorted(&gid_list);
    let subset = subsetter::subset(&font_bytes, 0, &remapper).ok()?;
    let subset = if strip_hinting {
        truetype::strip_hinting(&subset).unwrap_or(subset)
    } else {
        subset
    };
    // Mask the producer's `name`-table subset tags so two identical subsets
    // of the same font become byte-equal and the stream dedup collapses them.
    let subset = truetype::mask_subset_tags(&subset).unwrap_or(subset);
    // Cheap structural sanity on the output before trusting it: it must have
    // at least as many glyphs as we remapped (composite closure adds more).
    if num_glyphs(&subset)? < remapper.num_gids() {
        return None;
    }

    // Old CID -> new GID, 2 bytes big-endian per CID up to the max used CID;
    // unused CIDs map to 0 (.notdef). Mostly zeros, so it deflates to nearly
    // nothing.
    let max_cid = *cids.iter().next_back()?;
    let mut map = vec![0u8; (usize::from(max_cid) + 1) * 2];
    for &cid in cids {
        let new_gid = remapper.get(cid_map.lookup(cid)).unwrap_or(0);
        let idx = usize::from(cid) * 2;
        map[idx..idx + 2].copy_from_slice(&new_gid.to_be_bytes());
    }

    let deflated_font = deflate_level9(&subset)?;
    let deflated_map = deflate_level9(&map)?;
    // Net-smaller guard on stored bytes: the new font program plus the new
    // map stream must undercut the old font program plus the old map stream.
    if deflated_font.len() + deflated_map.len() >= font_file.content.len() + cid_map.stored_len {
        return None;
    }

    let base_name = base_font_name(doc, type0, descendant, descriptor)?;
    let tag = subset_tag(&subset);
    let mut tagged_name = Vec::with_capacity(base_name.len() + 7);
    tagged_name.extend_from_slice(&tag);
    tagged_name.push(b'+');
    tagged_name.extend_from_slice(strip_subset_tag(&base_name));

    Some(CidFontPlan {
        type0_id,
        descendant_id,
        descriptor_id,
        font_file_id,
        deflated_font,
        font_len: subset.len() as i64,
        deflated_map,
        tagged_name,
    })
}

fn base_font_name(
    doc: &Document,
    type0: &Dictionary,
    descendant: &Dictionary,
    descriptor: &Dictionary,
) -> Option<Vec<u8>> {
    for (dict, key) in [
        (descendant, b"BaseFont".as_slice()),
        (type0, b"BaseFont".as_slice()),
        (descriptor, b"FontName".as_slice()),
    ] {
        if let Ok(obj) = dict.get(key) {
            if let Object::Name(name) = resolve(doc, obj) {
                return Some(name.clone());
            }
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Simple-TrueType planning
// ---------------------------------------------------------------------------

/// A base encoding's code -> glyph-name table plus `/Differences` overrides.
type SimpleEncoding = (&'static [&'static str; 256], HashMap<u8, Vec<u8>>);

/// The font's `/Encoding`, reduced to what the planner needs: the base
/// code -> glyph-name table and any `/Differences` overrides. `None` for any
/// shape outside "explicit WinAnsi/MacRoman base (+ well-formed
/// Differences)" — an absent `/Encoding` means the font's built-in encoding,
/// whose semantics we decline to guess.
fn parse_simple_encoding(doc: &Document, font: &Dictionary) -> Option<SimpleEncoding> {
    fn base_table(name: &[u8]) -> Option<&'static [&'static str; 256]> {
        match name {
            b"WinAnsiEncoding" => Some(&encodings::WIN_ANSI_NAMES),
            b"MacRomanEncoding" => Some(&encodings::MAC_ROMAN_NAMES),
            _ => None,
        }
    }
    match resolve(doc, font.get(b"Encoding").ok()?) {
        Object::Name(n) => base_table(n).map(|t| (t, HashMap::new())),
        Object::Dictionary(d) => {
            let base = match d.get(b"BaseEncoding").map(|b| resolve(doc, b)) {
                Ok(Object::Name(n)) => base_table(n)?,
                // No explicit base: per spec the *font's* encoding fills the
                // gaps, which we cannot replicate. Decline.
                _ => return None,
            };
            Some((base, parse_differences(doc, d)?))
        }
        _ => None,
    }
}

/// The `/Differences` overrides of an encoding dictionary (empty when the
/// entry is absent); `None` for any malformed shape.
fn parse_differences(doc: &Document, d: &Dictionary) -> Option<HashMap<u8, Vec<u8>>> {
    let mut diffs: HashMap<u8, Vec<u8>> = HashMap::new();
    if let Ok(arr) = d.get(b"Differences") {
        let arr = resolve(doc, arr).as_array().ok()?;
        let mut code: i64 = -1;
        for item in arr {
            match resolve(doc, item) {
                Object::Integer(i) => {
                    if !(0..=255).contains(i) {
                        return None;
                    }
                    code = *i;
                }
                Object::Name(n) => {
                    let slot = u8::try_from(code).ok()?;
                    diffs.insert(slot, n.clone());
                    code += 1;
                }
                _ => return None,
            }
        }
    }
    Some(diffs)
}

/// Validate one used simple TrueType font end to end and build its plan.
/// Any failure — symbolic flags, unknown encoding or glyph name, a used code
/// the cmap paths cannot resolve, shared structure, subsetter error, cmap
/// round-trip mismatch, not net-smaller — returns `None` and the font ships
/// untouched.
fn plan_one_simple_font(
    doc: &Document,
    font_id: ObjectId,
    codes: &BTreeSet<u16>,
    refcounts: &HashMap<ObjectId, usize>,
    strip_hinting: bool,
) -> Option<SimpleFontPlan> {
    let font = doc.get_object(font_id).ok()?.as_dict().ok()?;
    // With /Widths present every shown glyph's advance comes from the PDF,
    // not the font program; without it we would have to prove the subset's
    // metrics tables serve unused codes identically. Decline instead.
    font.get(b"Widths").ok()?;
    let (base_names, diffs) = parse_simple_encoding(doc, font)?;

    let (descriptor_id, descriptor) = resolve_ref(doc, font.get(b"FontDescriptor").ok()?);
    let descriptor_id = descriptor_id?;
    let descriptor = descriptor.as_dict().ok()?;
    let flags = resolve(doc, descriptor.get(b"Flags").ok()?).as_i64().ok()?;
    // Nonsymbolic set and Symbolic clear: exactly the fonts whose lookup the
    // nonsymbolic paths of 9.6.6.4 (replicated below) fully describe.
    if flags & 0x04 != 0 || flags & 0x20 == 0 {
        return None;
    }
    if descriptor.get(b"FontFile").is_ok() || descriptor.get(b"FontFile3").is_ok() {
        return None;
    }
    let (font_file_id, font_file) = resolve_ref(doc, descriptor.get(b"FontFile2").ok()?);
    let font_file_id = font_file_id?;
    let font_file = font_file.as_stream().ok()?;
    // Shared descriptor/font-program structure could serve fonts whose usage
    // was not attributed here; mutating it would be unsound.
    if refcounts.get(&descriptor_id) != Some(&1) || refcounts.get(&font_file_id) != Some(&1) {
        return None;
    }

    let font_bytes = strict_stream_bytes(doc, font_file)?;
    let glyph_count = num_glyphs(&font_bytes)?;
    let subtables = truetype::parse_cmap(&font_bytes)?;
    let sub = |p: u16, e: u16| {
        subtables
            .iter()
            .find(|s| s.platform == p && s.encoding == e)
    };
    let (c31, c10, c30) = (sub(3, 1), sub(1, 0), sub(3, 0));
    if c31.is_none() && c10.is_none() {
        // Neither nonsymbolic lookup path exists; a viewer would be
        // improvising and so would we.
        return None;
    }

    // Resolve every used code through the union of the 9.6.6.4 lookup paths;
    // every glyph any path could select is retained. A code no path resolves
    // disqualifies the font (the original might still render it via
    // `post`-table names, which the subset would lose).
    let mut gids: BTreeSet<u16> = BTreeSet::new();
    gids.insert(0);
    for &code in codes {
        let code = u8::try_from(code).ok()?;
        let name: &[u8] = match diffs.get(&code) {
            Some(n) => n,
            None => {
                let n = base_names[usize::from(code)];
                if n.is_empty() {
                    return None; // shown code with no name in the encoding
                }
                n.as_bytes()
            }
        };
        let mut candidates: Vec<u16> = Vec::new();
        if let Some(sub) = c31 {
            if let Some(u) = encodings::glyph_name_to_unicode(name) {
                candidates.extend(sub.map.get(&u));
            }
        }
        if let Some(sub) = c10 {
            if let Some(mac) = encodings::mac_roman_code_of(name) {
                candidates.extend(sub.map.get(&u32::from(mac)));
            }
        }
        if let Some(sub) = c30 {
            candidates.extend(sub.map.get(&(0xF000 | u32::from(code))));
            candidates.extend(sub.map.get(&u32::from(code)));
        }
        if candidates.is_empty() {
            return None;
        }
        for gid in candidates {
            if gid >= glyph_count {
                return None;
            }
            gids.insert(gid);
        }
    }

    let gid_list: Vec<u16> = gids.iter().copied().collect();
    let remapper = GlyphRemapper::new_from_glyphs_sorted(&gid_list);
    let subset = subsetter::subset(&font_bytes, 0, &remapper).ok()?;
    if num_glyphs(&subset)? < remapper.num_gids() {
        return None;
    }

    // Replicate every original cmap subtable restricted to retained glyphs,
    // ids remapped. PDF simple-font lookups are BMP-only, so supplementary
    // aliases are dropped; platform 1 codes are bytes by definition.
    let mut new_subtables: Vec<truetype::CmapSubtable> = Vec::with_capacity(subtables.len());
    for sub in &subtables {
        let limit = if sub.platform == 1 { 0xFF } else { 0xFFFE };
        let mut map = BTreeMap::new();
        for (&ch, &gid) in &sub.map {
            if ch > limit {
                continue;
            }
            if let Some(new_gid) = remapper.get(gid) {
                if new_gid != 0 {
                    map.insert(ch, new_gid);
                }
            }
        }
        new_subtables.push(truetype::CmapSubtable {
            platform: sub.platform,
            encoding: sub.encoding,
            map,
        });
    }
    let final_font = truetype::insert_cmap(&subset, &new_subtables)?;
    let final_font = if strip_hinting {
        truetype::strip_hinting(&final_font).unwrap_or(final_font)
    } else {
        final_font
    };
    // See the CID path: masking the `name`-table subset tags makes identical
    // subsets byte-equal so the stream dedup can share one program.
    let final_font = truetype::mask_subset_tags(&final_font).unwrap_or(final_font);

    // Round-trip check: what a reader parses from the rebuilt font must be
    // exactly the mappings we intended to write.
    let mut reread = truetype::parse_cmap(&final_font)?;
    reread.sort_by_key(|s| (s.platform, s.encoding));
    new_subtables.sort_by_key(|s| (s.platform, s.encoding));
    if reread.len() != new_subtables.len()
        || reread
            .iter()
            .zip(&new_subtables)
            .any(|(a, b)| (a.platform, a.encoding, &a.map) != (b.platform, b.encoding, &b.map))
    {
        return None;
    }

    let deflated_font = deflate_level9(&final_font)?;
    // Net-smaller guard on stored bytes.
    if deflated_font.len() >= font_file.content.len() {
        return None;
    }

    let base_name = match font.get(b"BaseFont").map(|o| resolve(doc, o)) {
        Ok(Object::Name(n)) => n.clone(),
        _ => match descriptor.get(b"FontName").map(|o| resolve(doc, o)) {
            Ok(Object::Name(n)) => n.clone(),
            _ => return None,
        },
    };
    let tag = subset_tag(&final_font);
    let mut tagged_name = Vec::with_capacity(base_name.len() + 7);
    tagged_name.extend_from_slice(&tag);
    tagged_name.push(b'+');
    tagged_name.extend_from_slice(strip_subset_tag(&base_name));

    Some(SimpleFontPlan {
        font_id,
        descriptor_id,
        font_file_id,
        deflated_font,
        font_len: final_font.len() as i64,
        tagged_name,
    })
}

// ---------------------------------------------------------------------------
// Type1 → Type1C planning
// ---------------------------------------------------------------------------

/// The base of a Type1 font's effective encoding: an explicit Annex D table
/// or the font program's built-in encoding.
enum Type1Base {
    Builtin,
    Table(&'static [&'static str; 256]),
}

/// The font's `/Encoding`, reduced to base + `/Differences`. Unlike the
/// TrueType path, an absent `/Encoding` (or a dictionary without
/// `/BaseEncoding`) is fully supported: the built-in encoding it defers to
/// is parsed out of the font program itself and replicated in the emitted
/// CFF, so every viewer lookup path resolves identically.
fn parse_type1_encoding(
    doc: &Document,
    font: &Dictionary,
) -> Option<(Type1Base, HashMap<u8, Vec<u8>>)> {
    fn base_table(name: &[u8]) -> Option<&'static [&'static str; 256]> {
        match name {
            b"WinAnsiEncoding" => Some(&encodings::WIN_ANSI_NAMES),
            b"MacRomanEncoding" => Some(&encodings::MAC_ROMAN_NAMES),
            _ => None,
        }
    }
    match font.get(b"Encoding") {
        Err(_) => Some((Type1Base::Builtin, HashMap::new())),
        Ok(obj) => match resolve(doc, obj) {
            Object::Name(n) => Some((Type1Base::Table(base_table(n)?), HashMap::new())),
            Object::Dictionary(d) => {
                let base = match d.get(b"BaseEncoding").map(|b| resolve(doc, b)) {
                    Ok(Object::Name(n)) => Type1Base::Table(base_table(n)?),
                    Err(_) => Type1Base::Builtin,
                    _ => return None,
                };
                Some((base, parse_differences(doc, d)?))
            }
            _ => None,
        },
    }
}

/// Validate one used Type1 font end to end and build its Type1C conversion
/// plan. Any failure — unparseable font program, unknown encoding shape,
/// charstring anomalies, shared structure, not strictly smaller — returns
/// `None` and the font ships untouched.
fn plan_one_type1_font(
    doc: &Document,
    font_id: ObjectId,
    codes: &BTreeSet<u16>,
    refcounts: &HashMap<ObjectId, usize>,
) -> Option<Type1FontPlan> {
    let font = doc.get_object(font_id).ok()?.as_dict().ok()?;
    let (descriptor_id, descriptor) = resolve_ref(doc, font.get(b"FontDescriptor").ok()?);
    let descriptor_id = descriptor_id?;
    let descriptor = descriptor.as_dict().ok()?;
    // Exactly one font program, of the Type1 kind: a descriptor already
    // carrying a `/FontFile3` (or a TrueType program) is not ours to touch.
    if descriptor.get(b"FontFile2").is_ok() || descriptor.get(b"FontFile3").is_ok() {
        return None;
    }
    let (font_file_id, font_file) = resolve_ref(doc, descriptor.get(b"FontFile").ok()?);
    let font_file_id = font_file_id?;
    let font_file = font_file.as_stream().ok()?;
    // Shared descriptor/font-program structure could serve fonts whose usage
    // was not attributed here; mutating it would be unsound.
    if refcounts.get(&descriptor_id) != Some(&1) || refcounts.get(&font_file_id) != Some(&1) {
        return None;
    }

    let font_bytes = strict_stream_bytes(doc, font_file)?;
    let t1 = type1::parse(&font_bytes)?;
    let (base, diffs) = parse_type1_encoding(doc, font)?;

    // Resolve every used code to a glyph name through the same encoding the
    // viewer applies (`/Differences`, then the base). A code that resolves
    // to no name, or to a glyph the font does not carry, renders `.notdef`
    // before AND after conversion (the encoding objects never change), so it
    // constrains nothing.
    let mut keep: BTreeSet<Vec<u8>> = BTreeSet::new();
    for &code in codes {
        let code = u8::try_from(code).ok()?;
        let name: Option<Vec<u8>> = match diffs.get(&code) {
            Some(n) => Some(n.clone()),
            None => match &base {
                Type1Base::Table(table) => {
                    let n = table[usize::from(code)];
                    (!n.is_empty()).then(|| n.as_bytes().to_vec())
                }
                Type1Base::Builtin => t1.builtin_name(code).map(<[u8]>::to_vec),
            },
        };
        if let Some(name) = name {
            if t1.has_glyph(&name) {
                keep.insert(name);
            }
        }
    }

    let cff = type1::convert_to_cff(&t1, &keep)?;
    let deflated_cff = deflate_level9(&cff)?;
    // Strict-smaller guard on stored bytes, per font: never regress one.
    if deflated_cff.len() >= font_file.content.len() {
        return None;
    }

    let base_name = match font.get(b"BaseFont").map(|o| resolve(doc, o)) {
        Ok(Object::Name(n)) => n.clone(),
        _ => match descriptor.get(b"FontName").map(|o| resolve(doc, o)) {
            Ok(Object::Name(n)) => n.clone(),
            _ => return None,
        },
    };
    let tag = subset_tag(&cff);
    let mut tagged_name = Vec::with_capacity(base_name.len() + 7);
    tagged_name.extend_from_slice(&tag);
    tagged_name.push(b'+');
    tagged_name.extend_from_slice(strip_subset_tag(&base_name));

    Some(Type1FontPlan {
        font_id,
        descriptor_id,
        font_file_id,
        deflated_cff,
        tagged_name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::{optimize, optimize_with_options, OptimizeOptions};
    use lopdf::content::Operation;
    use lopdf::StringFormat;

    fn subset_opts() -> OptimizeOptions {
        OptimizeOptions::default().with_subset_fonts(true)
    }

    fn noto_bytes() -> Vec<u8> {
        std::fs::read(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/fixtures/fonts/NotoSans-Regular.ttf"
        ))
        .expect("fixtures/fonts/NotoSans-Regular.ttf missing")
    }

    /// GID of each char in the fixture font. Under `/CIDToGIDMap /Identity`,
    /// these double as the CIDs used in show strings.
    fn gids_for(text: &str) -> Vec<u16> {
        let data = noto_bytes();
        let face = ttf_parser::Face::parse(&data, 0).unwrap();
        text.chars()
            .map(|c| face.glyph_index(c).expect("fixture glyph missing").0)
            .collect()
    }

    /// A minimal ToUnicode CMap so text extraction has a CID -> Unicode
    /// oracle that must survive subsetting untouched.
    fn to_unicode_bytes(pairs: &[(u16, char)]) -> Vec<u8> {
        let mut body = String::new();
        for (cid, ch) in pairs {
            let mut units = [0u16; 2];
            let encoded = ch.encode_utf16(&mut units);
            let target: String = encoded.iter().map(|u| format!("{u:04X}")).collect();
            body.push_str(&format!("<{cid:04X}> <{target}>\u{a}"));
        }
        let mut cmap = String::new();
        for line in [
            "/CIDInit /ProcSet findresource begin",
            "12 dict begin",
            "begincmap",
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
            "/CMapName /Adobe-Identity-UCS def",
            "/CMapType 2 def",
            "1 begincodespacerange",
            "<0000> <FFFF>",
            "endcodespacerange",
        ] {
            cmap.push_str(line);
            cmap.push('\u{a}');
        }
        cmap.push_str(&format!(
            "{} beginbfchar\u{a}{body}endbfchar\u{a}",
            pairs.len()
        ));
        for line in [
            "endcmap",
            "CMapName currentdict /CMap defineresource pop",
            "end",
            "end",
        ] {
            cmap.push_str(line);
            cmap.push('\u{a}');
        }
        cmap.into_bytes()
    }

    struct FontSpec {
        /// `None` => `/CIDToGIDMap /Identity`; `Some(table)` => a stream
        /// mapping CID i -> table[i].
        cid_table: Option<Vec<u16>>,
        base_font: &'static str,
        corrupt_font_file: bool,
        to_unicode: Vec<(u16, char)>,
    }

    impl FontSpec {
        fn identity(to_unicode: Vec<(u16, char)>) -> Self {
            FontSpec {
                cid_table: None,
                base_font: "NotoSans-Regular",
                corrupt_font_file: false,
                to_unicode,
            }
        }
    }

    /// Add a complete Type0/CIDFontType2/Identity-H font to `doc`, returning
    /// the Type0 font object id.
    fn add_type0_font(doc: &mut Document, spec: &FontSpec) -> ObjectId {
        let font_data = if spec.corrupt_font_file {
            b"this is not a truetype font at all".to_vec()
        } else {
            noto_bytes()
        };
        let font_len = font_data.len() as i64;
        let ff_id = doc.add_object(
            Stream::new(
                dictionary! { "Filter" => "FlateDecode", "Length1" => font_len },
                deflate_level9(&font_data).unwrap(),
            )
            .with_compression(false),
        );
        let descr_id = doc.add_object(dictionary! {
            "Type" => "FontDescriptor",
            "FontName" => Object::Name(spec.base_font.as_bytes().to_vec()),
            "Flags" => 32,
            "FontBBox" => vec![(-619).into(), (-293).into(), 1536.into(), 1069.into()],
            "ItalicAngle" => 0,
            "Ascent" => 1069,
            "Descent" => (-293),
            "CapHeight" => 714,
            "StemV" => 80,
            "FontFile2" => ff_id,
        });
        let cid_map_obj: Object = match &spec.cid_table {
            None => Object::Name(b"Identity".to_vec()),
            Some(table) => {
                let mut bytes = Vec::with_capacity(table.len() * 2);
                for gid in table {
                    bytes.extend_from_slice(&gid.to_be_bytes());
                }
                doc.add_object(Stream::new(dictionary! {}, bytes)).into()
            }
        };
        let desc_id = doc.add_object(dictionary! {
            "Type" => "Font",
            "Subtype" => "CIDFontType2",
            "BaseFont" => Object::Name(spec.base_font.as_bytes().to_vec()),
            "CIDSystemInfo" => dictionary! {
                "Registry" => Object::String(b"Adobe".to_vec(), StringFormat::Literal),
                "Ordering" => Object::String(b"Identity".to_vec(), StringFormat::Literal),
                "Supplement" => 0,
            },
            "FontDescriptor" => descr_id,
            "DW" => 600,
            "CIDToGIDMap" => cid_map_obj,
        });
        let tou_id = doc.add_object(Stream::new(
            dictionary! {},
            to_unicode_bytes(&spec.to_unicode),
        ));
        doc.add_object(dictionary! {
            "Type" => "Font",
            "Subtype" => "Type0",
            "BaseFont" => Object::Name(spec.base_font.as_bytes().to_vec()),
            "Encoding" => "Identity-H",
            "DescendantFonts" => vec![desc_id.into()],
            "ToUnicode" => tou_id,
        })
    }

    fn show_text_ops(font: &str, cids: &[u16]) -> Vec<Operation> {
        let mut bytes = Vec::with_capacity(cids.len() * 2);
        for cid in cids {
            bytes.extend_from_slice(&cid.to_be_bytes());
        }
        vec![
            Operation::new("BT", vec![]),
            // 10pt: even the longest test string stays inside the MediaBox
            // (off-page text would be dropped by the pdftotext oracle).
            Operation::new(
                "Tf",
                vec![Object::Name(font.as_bytes().to_vec()), 10.into()],
            ),
            Operation::new("Td", vec![72.into(), 700.into()]),
            Operation::new("Tj", vec![Object::String(bytes, StringFormat::Hexadecimal)]),
            Operation::new("ET", vec![]),
        ]
    }

    fn finish_pdf(doc: &mut Document, pages_id: ObjectId, page_ids: Vec<ObjectId>) -> Vec<u8> {
        let kids: Vec<Object> = page_ids.iter().map(|&id| id.into()).collect();
        let count = page_ids.len() as i64;
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Kids" => kids,
                "Count" => count,
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);
        let mut out = Vec::new();
        doc.save_to(&mut out).unwrap();
        out
    }

    fn add_text_page(
        doc: &mut Document,
        pages_id: ObjectId,
        font_id: ObjectId,
        content: Vec<Operation>,
    ) -> ObjectId {
        let content_id = doc.add_object(Stream::new(
            dictionary! {},
            Content {
                operations: content,
            }
            .encode()
            .unwrap(),
        ));
        doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => content_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! {
                "Font" => dictionary! { "F1" => font_id },
            },
        })
    }

    /// One-page-per-entry text PDF over a single shared font.
    fn build_text_pdf(spec: &FontSpec, pages: &[Vec<u16>]) -> Vec<u8> {
        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let font_id = add_type0_font(&mut doc, spec);
        let page_ids: Vec<ObjectId> = pages
            .iter()
            .map(|cids| add_text_page(&mut doc, pages_id, font_id, show_text_ops("F1", cids)))
            .collect();
        finish_pdf(&mut doc, pages_id, page_ids)
    }

    // -- output inspection ---------------------------------------------------

    struct SubsetView {
        type0: Dictionary,
        descendant: Dictionary,
        descriptor: Dictionary,
        /// Decompressed subset font program.
        font: Vec<u8>,
        /// Decompressed CID -> GID map stream, when the map is a stream.
        cid_map: Option<Vec<u8>>,
        /// The re-loaded output document (for follow-up stream lookups).
        doc: Document,
    }

    fn subset_view(pdf: &[u8]) -> SubsetView {
        let doc = Document::load_mem(pdf).unwrap();
        let mut found = None;
        for obj in doc.objects.values() {
            let Object::Dictionary(type0) = obj else {
                continue;
            };
            if !matches!(type0.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Type0") {
                continue;
            }
            let descendants = resolve(&doc, type0.get(b"DescendantFonts").unwrap())
                .as_array()
                .unwrap()
                .clone();
            let descendant = resolve(&doc, &descendants[0]).as_dict().unwrap().clone();
            let descriptor = resolve(&doc, descendant.get(b"FontDescriptor").unwrap())
                .as_dict()
                .unwrap()
                .clone();
            let ff = resolve(&doc, descriptor.get(b"FontFile2").unwrap())
                .as_stream()
                .unwrap();
            let font = strict_stream_bytes(&doc, ff).expect("font stream must inflate");
            let cid_map = match descendant.get(b"CIDToGIDMap") {
                Ok(obj) => match resolve(&doc, obj) {
                    Object::Stream(s) => {
                        Some(strict_stream_bytes(&doc, s).expect("map must inflate"))
                    }
                    _ => None,
                },
                Err(_) => None,
            };
            found = Some((type0.clone(), descendant, descriptor, font, cid_map));
            break;
        }
        let (type0, descendant, descriptor, font, cid_map) =
            found.expect("no Type0 font in output");
        SubsetView {
            type0,
            descendant,
            descriptor,
            font,
            cid_map,
            doc,
        }
    }

    impl SubsetView {
        /// New GID for an old CID, through the rewritten map stream.
        fn new_gid(&self, cid: u16) -> u16 {
            let map = self.cid_map.as_ref().expect("CIDToGIDMap must be a stream");
            be16(map, usize::from(cid) * 2).unwrap_or(0)
        }
    }

    /// Record a glyph outline as a comparable op list.
    #[derive(Default)]
    struct Outline(Vec<String>);

    impl ttf_parser::OutlineBuilder for Outline {
        fn move_to(&mut self, x: f32, y: f32) {
            self.0.push(format!("M {x} {y}"));
        }
        fn line_to(&mut self, x: f32, y: f32) {
            self.0.push(format!("L {x} {y}"));
        }
        fn quad_to(&mut self, x1: f32, y1: f32, x: f32, y: f32) {
            self.0.push(format!("Q {x1} {y1} {x} {y}"));
        }
        fn curve_to(&mut self, x1: f32, y1: f32, x2: f32, y2: f32, x: f32, y: f32) {
            self.0.push(format!("C {x1} {y1} {x2} {y2} {x} {y}"));
        }
        fn close(&mut self) {
            self.0.push("Z".to_string());
        }
    }

    fn outline_and_advance(font: &[u8], gid: u16) -> (Vec<String>, Option<u16>) {
        let face = ttf_parser::Face::parse(font, 0).expect("font must parse");
        let mut rec = Outline::default();
        let id = ttf_parser::GlyphId(gid);
        face.outline_glyph(id, &mut rec);
        (rec.0, face.glyph_hor_advance(id))
    }

    /// Assert that the old GID (in the original font) and the subset's mapped
    /// GID draw the identical outline with the identical advance.
    fn assert_glyph_preserved(view: &SubsetView, old_font: &[u8], cid: u16, old_gid: u16) {
        let (old_outline, old_adv) = outline_and_advance(old_font, old_gid);
        let (new_outline, new_adv) = outline_and_advance(&view.font, view.new_gid(cid));
        // Both may legitimately be empty (e.g. the space glyph); what matters
        // is equality of outline and advance.
        assert_eq!(old_outline, new_outline, "outline mismatch for CID {cid}");
        assert_eq!(old_adv, new_adv, "advance mismatch for CID {cid}");
    }

    fn base_name_of(dict: &Dictionary, key: &[u8]) -> Vec<u8> {
        match dict.get(key) {
            Ok(Object::Name(n)) => n.clone(),
            other => panic!(
                "expected name at {}: {other:?}",
                String::from_utf8_lossy(key)
            ),
        }
    }

    // -- the battery ---------------------------------------------------------

    #[test]
    fn subset_shrinks_and_never_touches_text_or_cid_keyed_tables() {
        let cids = gids_for("Hello, World!");
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip("Hello, World!".chars()).collect();
        let pdf = build_text_pdf(
            &FontSpec::identity(pairs.clone()),
            std::slice::from_ref(&cids),
        );
        let out = optimize_with_options(&pdf, subset_opts());

        assert!(out.len() < pdf.len(), "subsetting must shrink the file");

        // Content-stream bytes are the M1 superpower: byte-identical.
        let pre = Document::load_mem(&pdf).unwrap();
        let post = Document::load_mem(&out).unwrap();
        let pre_page = *pre.get_pages().get(&1).unwrap();
        let post_page = *post.get_pages().get(&1).unwrap();
        assert_eq!(
            pre.get_page_content(pre_page),
            post.get_page_content(post_page),
            "content stream must be byte-identical"
        );

        let view = subset_view(&out);
        // CID-keyed tables untouched.
        assert_eq!(
            view.descendant.get(b"DW").unwrap().as_i64().unwrap(),
            600,
            "/DW must be untouched"
        );
        // ToUnicode untouched (compare decompressed bytes: the save path may
        // Flate-wrap the previously raw stream).
        let tou = resolve(&view.doc, view.type0.get(b"ToUnicode").unwrap())
            .as_stream()
            .unwrap();
        let tou_bytes = tou
            .decompressed_content()
            .unwrap_or_else(|_| tou.content.clone());
        assert_eq!(
            tou_bytes,
            to_unicode_bytes(&pairs),
            "/ToUnicode must be untouched"
        );

        // Names re-tagged consistently, map now a stream, font smaller.
        let tagged = base_name_of(&view.type0, b"BaseFont");
        assert_eq!(tagged.len(), "NotoSans-Regular".len() + 7);
        assert_eq!(tagged[6], b'+');
        assert!(tagged[..6].iter().all(u8::is_ascii_uppercase));
        assert_eq!(&tagged[7..], b"NotoSans-Regular");
        assert_eq!(base_name_of(&view.descendant, b"BaseFont"), tagged);
        assert_eq!(base_name_of(&view.descriptor, b"FontName"), tagged);
        assert!(view.cid_map.is_some(), "CIDToGIDMap must now be a stream");
        let original = noto_bytes();
        assert!(
            view.font.len() < original.len() / 4,
            "subset must be much smaller than the full font"
        );

        // Every used glyph: outline + advance equality.
        for &cid in &cids {
            assert_glyph_preserved(&view, &original, cid, cid);
        }
    }

    #[test]
    fn text_extraction_is_identical_pre_and_post() {
        let text = "The quick brown fox";
        let cids = gids_for(text);
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip(text.chars()).collect();
        let pdf = build_text_pdf(&FontSpec::identity(pairs), &[cids]);
        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len());

        let pre = Document::load_mem(&pdf).unwrap().extract_text(&[1]);
        let post = Document::load_mem(&out).unwrap().extract_text(&[1]);
        let pre = pre.expect("fixture text must extract");
        let post = post.expect("subset text must extract");
        assert_eq!(pre, post, "extracted text must be identical");
        assert!(
            pre.contains("The quick brown fox"),
            "oracle must see the text"
        );
    }

    #[test]
    fn composite_glyph_closure_is_preserved() {
        // "é" and "ü" are composite glyphs (base + accent) in Noto Sans; the
        // subsetter must pull their component glyphs into the subset or the
        // outline comparison fails.
        let text = "éü";
        let cids = gids_for(text);
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip(text.chars()).collect();
        let pdf = build_text_pdf(&FontSpec::identity(pairs), std::slice::from_ref(&cids));
        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len());

        let view = subset_view(&out);
        let original = noto_bytes();
        for &cid in &cids {
            assert_glyph_preserved(&view, &original, cid, cid);
        }
        // Closure must have added component glyphs beyond .notdef + the two
        // composites we asked for.
        let face = ttf_parser::Face::parse(&view.font, 0).unwrap();
        assert!(
            face.number_of_glyphs() > 3,
            "composite components missing: only {} glyphs",
            face.number_of_glyphs()
        );
    }

    #[test]
    fn cid_to_gid_map_stream_input_is_composed() {
        // Non-identity input mapping: CID 1 -> 'a', CID 2 -> 'b', CID 3 -> 'c'.
        let abc = gids_for("abc");
        let spec = FontSpec {
            cid_table: Some(vec![0, abc[0], abc[1], abc[2]]),
            base_font: "NotoSans-Regular",
            corrupt_font_file: false,
            to_unicode: vec![(1, 'a'), (2, 'b'), (3, 'c')],
        };
        let pdf = build_text_pdf(&spec, &[vec![1, 2, 3]]);
        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len());

        let view = subset_view(&out);
        let original = noto_bytes();
        for (cid, &old_gid) in (1u16..=3).zip(abc.iter()) {
            assert_glyph_preserved(&view, &original, cid, old_gid);
        }
    }

    #[test]
    fn shared_font_accumulates_across_pages() {
        let page1 = gids_for("abc");
        let page2 = gids_for("xyz");
        let pairs: Vec<(u16, char)> = page1
            .iter()
            .chain(page2.iter())
            .copied()
            .zip("abcxyz".chars())
            .collect();
        let pdf = build_text_pdf(&FontSpec::identity(pairs), &[page1.clone(), page2.clone()]);
        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len());

        let view = subset_view(&out);
        let original = noto_bytes();
        for &cid in page1.iter().chain(page2.iter()) {
            assert_glyph_preserved(&view, &original, cid, cid);
        }
    }

    #[test]
    fn glyphs_in_forms_and_annotation_appearances_are_found() {
        let page_cids = gids_for("ab");
        let form_cids = gids_for("cd");
        let ap_cids = gids_for("ef");
        let pairs: Vec<(u16, char)> = page_cids
            .iter()
            .chain(form_cids.iter())
            .chain(ap_cids.iter())
            .copied()
            .zip("abcdef".chars())
            .collect();

        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let font_id = add_type0_font(&mut doc, &FontSpec::identity(pairs));

        let form_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Form",
                "BBox" => vec![0.into(), 0.into(), 200.into(), 200.into()],
                "Resources" => dictionary! { "Font" => dictionary! { "F1" => font_id } },
            },
            Content {
                operations: show_text_ops("F1", &form_cids),
            }
            .encode()
            .unwrap(),
        ));
        let ap_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Form",
                "BBox" => vec![0.into(), 0.into(), 200.into(), 50.into()],
                "Resources" => dictionary! { "Font" => dictionary! { "F1" => font_id } },
            },
            Content {
                operations: show_text_ops("F1", &ap_cids),
            }
            .encode()
            .unwrap(),
        ));
        let annot_id = doc.add_object(dictionary! {
            "Type" => "Annot",
            "Subtype" => "Square",
            "Rect" => vec![0.into(), 0.into(), 200.into(), 50.into()],
            "AP" => dictionary! { "N" => ap_id },
        });

        let mut ops = show_text_ops("F1", &page_cids);
        ops.push(Operation::new("Do", vec![Object::Name(b"Fm1".to_vec())]));
        let content_id = doc.add_object(Stream::new(
            dictionary! {},
            Content { operations: ops }.encode().unwrap(),
        ));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => content_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! {
                "Font" => dictionary! { "F1" => font_id },
                "XObject" => dictionary! { "Fm1" => form_id },
            },
            "Annots" => vec![annot_id.into()],
        });
        let pdf = finish_pdf(&mut doc, pages_id, vec![page_id]);

        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len(), "subsetting must still shrink");

        let view = subset_view(&out);
        let original = noto_bytes();
        for &cid in page_cids
            .iter()
            .chain(form_cids.iter())
            .chain(ap_cids.iter())
        {
            assert_glyph_preserved(&view, &original, cid, cid);
        }
    }

    #[test]
    fn unparseable_content_stream_disables_all_subsetting() {
        let cids = gids_for("Hello");
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip("Hello".chars()).collect();
        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let font_id = add_type0_font(&mut doc, &FontSpec::identity(pairs));
        let text_page = add_text_page(&mut doc, pages_id, font_id, show_text_ops("F1", &cids));
        // Page 2: an unterminated string literal that content parsing rejects.
        let bad_content = doc.add_object(Stream::new(
            dictionary! {},
            b"(this string never terminates".to_vec(),
        ));
        let bad_page = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => bad_content,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! {},
        });
        let pdf = finish_pdf(&mut doc, pages_id, vec![text_page, bad_page]);

        let out = optimize_with_options(&pdf, subset_opts());
        assert_eq!(
            out, pdf,
            "one unparseable stream must disable subsetting entirely"
        );
    }

    #[test]
    fn extgstate_font_entry_disables_all_subsetting() {
        // An ExtGState /Font selects a font without Tf; the walker cannot
        // attribute subsequent shows, so the document must be left alone.
        let cids = gids_for("Hello");
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip("Hello".chars()).collect();
        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let font_id = add_type0_font(&mut doc, &FontSpec::identity(pairs));
        let content_id = doc.add_object(Stream::new(
            dictionary! {},
            Content {
                operations: show_text_ops("F1", &cids),
            }
            .encode()
            .unwrap(),
        ));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => content_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! {
                "Font" => dictionary! { "F1" => font_id },
                "ExtGState" => dictionary! {
                    "GS0" => dictionary! { "Font" => vec![font_id.into(), 12.into()] },
                },
            },
        });
        let pdf = finish_pdf(&mut doc, pages_id, vec![page_id]);

        let out = optimize_with_options(&pdf, subset_opts());
        assert_eq!(out, pdf, "ExtGState /Font must disable subsetting");
    }

    #[test]
    fn corrupt_font_file_leaves_font_untouched() {
        let cids = gids_for("Hi");
        let spec = FontSpec {
            corrupt_font_file: true,
            ..FontSpec::identity(cids.iter().copied().zip("Hi".chars()).collect())
        };
        let pdf = build_text_pdf(&spec, &[cids]);
        let out = optimize_with_options(&pdf, subset_opts());
        assert_eq!(out, pdf, "corrupt FontFile2 must return original bytes");
    }

    #[test]
    fn referenced_but_unused_font_is_untouched() {
        // A font in the resources that never shows text: no usage evidence,
        // so it ships untouched ("any uncertainty => leave it alone").
        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let font_id = add_type0_font(&mut doc, &FontSpec::identity(vec![]));
        let page = add_text_page(&mut doc, pages_id, font_id, vec![]);
        let pdf = finish_pdf(&mut doc, pages_id, vec![page]);

        let out = optimize_with_options(&pdf, subset_opts());
        assert_eq!(out, pdf, "unused font must be untouched");
    }

    #[test]
    fn pdfa_declared_documents_are_skipped() {
        let cids = gids_for("Hello");
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip("Hello".chars()).collect();
        let pdf = build_text_pdf(&FontSpec::identity(pairs), &[cids]);

        // Re-open and attach a PDF/A XMP metadata stream to the catalog.
        let mut doc = Document::load_mem(&pdf).unwrap();
        let xmp = concat!(
            r#"<x:xmpmeta xmlns:x="adobe:ns:meta/">"#,
            r#"<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">"#,
            r#"<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">"#,
            r#"<pdfaid:part>2</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance>"#,
            r#"</rdf:Description></rdf:RDF></x:xmpmeta>"#,
        );
        let meta_id = doc.add_object(Stream::new(
            dictionary! { "Type" => "Metadata", "Subtype" => "XML" },
            xmp.as_bytes().to_vec(),
        ));
        if let Ok(catalog) = doc.catalog_mut() {
            catalog.set("Metadata", Object::Reference(meta_id));
        }
        let mut pdfa: Vec<u8> = Vec::new();
        doc.save_to(&mut pdfa).unwrap();

        let out = optimize_with_options(&pdfa, subset_opts());
        assert_eq!(out, pdfa, "PDF/A-declared document must be skipped");
    }

    #[test]
    fn subset_fonts_is_on_by_default_and_opt_out_restores_original() {
        let cids = gids_for("Hello");
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip("Hello".chars()).collect();
        let pdf = build_text_pdf(&FontSpec::identity(pairs), &[cids]);
        let on = optimize(&pdf);
        assert_eq!(
            on,
            optimize_with_options(&pdf, subset_opts()),
            "default options must subset fonts"
        );
        assert!(on.len() < pdf.len());
        let off = optimize_with_options(&pdf, OptimizeOptions::default().with_subset_fonts(false));
        assert_eq!(off, pdf, "opt-out must not touch fonts");
    }

    #[test]
    fn existing_subset_tag_is_replaced_not_stacked() {
        let cids = gids_for("Hello");
        let spec = FontSpec {
            base_font: "ABCDEF+NotoSans-Regular",
            ..FontSpec::identity(cids.iter().copied().zip("Hello".chars()).collect())
        };
        let pdf = build_text_pdf(&spec, &[cids]);
        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len());

        let view = subset_view(&out);
        let tagged = base_name_of(&view.type0, b"BaseFont");
        assert_eq!(
            &tagged[7..],
            b"NotoSans-Regular",
            "old tag must be stripped"
        );
        assert_eq!(tagged.iter().filter(|&&b| b == b'+').count(), 1);
    }

    #[test]
    fn subsetting_is_idempotent() {
        let cids = gids_for("Hello, World!");
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip("Hello, World!".chars()).collect();
        let pdf = build_text_pdf(&FontSpec::identity(pairs), &[cids]);
        let once = optimize_with_options(&pdf, subset_opts());
        assert!(once.len() < pdf.len(), "first pass must shrink");
        let twice = optimize_with_options(&once, subset_opts());
        assert_eq!(twice, once, "second pass must be byte-stable");
    }

    // -- simple TrueType -----------------------------------------------------

    struct SimpleSpec {
        base_font: &'static str,
        /// The `/Encoding` entry; `None` omits it (built-in encoding).
        encoding: Option<Object>,
        /// FontDescriptor `/Flags` (32 = Nonsymbolic).
        flags: i64,
        corrupt_font_file: bool,
    }

    impl SimpleSpec {
        fn winansi() -> Self {
            SimpleSpec {
                base_font: "NotoSans-Regular",
                encoding: Some(Object::Name(b"WinAnsiEncoding".to_vec())),
                flags: 32,
                corrupt_font_file: false,
            }
        }
    }

    /// Add a complete simple TrueType font to `doc`, returning the font
    /// object id.
    fn add_simple_tt_font(doc: &mut Document, spec: &SimpleSpec) -> ObjectId {
        let font_data = if spec.corrupt_font_file {
            b"this is not a truetype font at all".to_vec()
        } else {
            noto_bytes()
        };
        let font_len = font_data.len() as i64;
        let ff_id = doc.add_object(
            Stream::new(
                dictionary! { "Filter" => "FlateDecode", "Length1" => font_len },
                deflate_level9(&font_data).unwrap(),
            )
            .with_compression(false),
        );
        let descr_id = doc.add_object(dictionary! {
            "Type" => "FontDescriptor",
            "FontName" => Object::Name(spec.base_font.as_bytes().to_vec()),
            "Flags" => spec.flags,
            "FontBBox" => vec![(-619).into(), (-293).into(), 1536.into(), 1069.into()],
            "ItalicAngle" => 0,
            "Ascent" => 1069,
            "Descent" => (-293),
            "CapHeight" => 714,
            "StemV" => 80,
            "FontFile2" => ff_id,
        });
        let widths: Vec<Object> = (32..=255).map(|_| 500.into()).collect();
        let mut font = dictionary! {
            "Type" => "Font",
            "Subtype" => "TrueType",
            "BaseFont" => Object::Name(spec.base_font.as_bytes().to_vec()),
            "FirstChar" => 32,
            "LastChar" => 255,
            "Widths" => widths,
            "FontDescriptor" => descr_id,
        };
        if let Some(enc) = &spec.encoding {
            font.set("Encoding", enc.clone());
        }
        doc.add_object(font)
    }

    /// Show single-byte codes (simple-font semantics).
    fn show_byte_ops(font: &str, codes: &[u8]) -> Vec<Operation> {
        vec![
            Operation::new("BT", vec![]),
            Operation::new(
                "Tf",
                vec![Object::Name(font.as_bytes().to_vec()), 10.into()],
            ),
            Operation::new("Td", vec![72.into(), 700.into()]),
            Operation::new(
                "Tj",
                vec![Object::String(codes.to_vec(), StringFormat::Hexadecimal)],
            ),
            Operation::new("ET", vec![]),
        ]
    }

    fn build_simple_pdf(spec: &SimpleSpec, codes: &[u8]) -> Vec<u8> {
        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let font_id = add_simple_tt_font(&mut doc, spec);
        let page = add_text_page(&mut doc, pages_id, font_id, show_byte_ops("F1", codes));
        finish_pdf(&mut doc, pages_id, vec![page])
    }

    /// The (first) simple TrueType font program in the output, decompressed,
    /// plus the font dictionary.
    fn simple_font_view(pdf: &[u8]) -> (Dictionary, Vec<u8>) {
        let doc = Document::load_mem(pdf).unwrap();
        for obj in doc.objects.values() {
            let Object::Dictionary(font) = obj else {
                continue;
            };
            if !matches!(font.get(b"Subtype"), Ok(Object::Name(n)) if n == b"TrueType") {
                continue;
            }
            let descriptor = resolve(&doc, font.get(b"FontDescriptor").unwrap())
                .as_dict()
                .unwrap();
            let ff = resolve(&doc, descriptor.get(b"FontFile2").unwrap())
                .as_stream()
                .unwrap();
            let bytes = strict_stream_bytes(&doc, ff).expect("font stream must inflate");
            return (font.clone(), bytes);
        }
        panic!("no simple TrueType font in output");
    }

    /// Assert the subset font resolves `ch` (through its own cmap, the
    /// viewer's lookup path) to the same outline and advance as the original.
    fn assert_char_preserved(subset: &[u8], original: &[u8], ch: char) {
        let orig_face = ttf_parser::Face::parse(original, 0).unwrap();
        let new_face = ttf_parser::Face::parse(subset, 0).unwrap();
        let old_gid = orig_face.glyph_index(ch).expect("original glyph missing");
        let new_gid = new_face
            .glyph_index(ch)
            .unwrap_or_else(|| panic!("subset cmap must map {ch:?}"));
        let (old_outline, old_adv) = outline_and_advance(original, old_gid.0);
        let (new_outline, new_adv) = outline_and_advance(subset, new_gid.0);
        assert_eq!(old_outline, new_outline, "outline mismatch for {ch:?}");
        assert_eq!(old_adv, new_adv, "advance mismatch for {ch:?}");
    }

    #[test]
    fn simple_winansi_font_is_subsetted_with_glyphs_preserved() {
        // 0xE9 = eacute, 0xFC = udieresis in WinAnsi; both are composite
        // glyphs in Noto Sans, so this also exercises glyph closure.
        let codes = b"Hello, World! \xE9\xFC";
        let text = "Hello, World! \u{e9}\u{fc}";
        let pdf = build_simple_pdf(&SimpleSpec::winansi(), codes);
        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len(), "subsetting must shrink the file");

        // Content stream untouched.
        let pre = Document::load_mem(&pdf).unwrap();
        let post = Document::load_mem(&out).unwrap();
        let pre_page = *pre.get_pages().get(&1).unwrap();
        let post_page = *post.get_pages().get(&1).unwrap();
        assert_eq!(
            pre.get_page_content(pre_page),
            post.get_page_content(post_page),
            "content stream must be byte-identical"
        );

        let (font, subset) = simple_font_view(&out);
        let original = noto_bytes();
        assert!(
            subset.len() < original.len() / 4,
            "subset must be much smaller than the full font"
        );
        for ch in text.chars() {
            assert_char_preserved(&subset, &original, ch);
        }
        // Codes, /Encoding, and /Widths untouched; name re-tagged.
        assert!(
            matches!(font.get(b"Encoding"), Ok(Object::Name(n)) if n == b"WinAnsiEncoding"),
            "/Encoding must be untouched"
        );
        let tagged = base_name_of(&font, b"BaseFont");
        assert_eq!(tagged[6], b'+');
        assert_eq!(&tagged[7..], b"NotoSans-Regular");
        // An unused glyph must actually be gone (it is a subset, not a copy).
        let new_face = ttf_parser::Face::parse(&subset, 0).unwrap();
        assert_eq!(
            new_face.glyph_index('A'),
            None,
            "unused 'A' must not survive"
        );
    }

    #[test]
    fn simple_font_differences_encoding_is_resolved() {
        // Code 65 (normally 'A') remapped to /eacute via /Differences.
        let spec = SimpleSpec {
            encoding: Some(Object::Dictionary(dictionary! {
                "Type" => "Encoding",
                "BaseEncoding" => "WinAnsiEncoding",
                "Differences" => vec![65.into(), Object::Name(b"eacute".to_vec())],
            })),
            ..SimpleSpec::winansi()
        };
        let pdf = build_simple_pdf(&spec, b"A");
        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len());
        let (_, subset) = simple_font_view(&out);
        assert_char_preserved(&subset, &noto_bytes(), '\u{e9}');
    }

    #[test]
    fn symbolic_simple_font_is_untouched() {
        let spec = SimpleSpec {
            flags: 32 | 4, // Symbolic set: outside the nonsymbolic lookup model
            ..SimpleSpec::winansi()
        };
        let pdf = build_simple_pdf(&spec, b"Hello");
        let out = optimize_with_options(&pdf, subset_opts());
        assert_eq!(out, pdf, "symbolic simple font must be untouched");
    }

    #[test]
    fn simple_font_without_encoding_is_untouched() {
        let spec = SimpleSpec {
            encoding: None, // built-in encoding: semantics we decline to guess
            ..SimpleSpec::winansi()
        };
        let pdf = build_simple_pdf(&spec, b"Hello");
        let out = optimize_with_options(&pdf, subset_opts());
        assert_eq!(out, pdf, "font without /Encoding must be untouched");
    }

    #[test]
    fn corrupt_simple_font_file_is_untouched() {
        let spec = SimpleSpec {
            corrupt_font_file: true,
            ..SimpleSpec::winansi()
        };
        let pdf = build_simple_pdf(&spec, b"Hello");
        let out = optimize_with_options(&pdf, subset_opts());
        assert_eq!(out, pdf, "corrupt FontFile2 must return original bytes");
    }

    #[test]
    fn simple_font_subsetting_is_idempotent() {
        let pdf = build_simple_pdf(&SimpleSpec::winansi(), b"Hello, World!");
        let once = optimize_with_options(&pdf, subset_opts());
        assert!(once.len() < pdf.len(), "first pass must shrink");
        let twice = optimize_with_options(&once, subset_opts());
        assert_eq!(twice, once, "second pass must be byte-stable");
    }

    /// Emit pre/post PDFs for the dev-only external verification harness
    /// (`scripts/verify-fonts.sh`: Ghostscript nullpage render + pdftotext
    /// diff). Not a CI gate; same posture as `bench-vs-gs.sh`.
    #[test]
    #[ignore = "writes target/font-verify/{pre,post}.pdf for scripts/verify-fonts.sh"]
    fn emit_font_verification_pdfs() {
        let text = "The quick brown fox jumps over the lazy dog: été, naïve, Zürich!";
        let cids = gids_for(text);
        let pairs: Vec<(u16, char)> = cids.iter().copied().zip(text.chars()).collect();
        let pdf = build_text_pdf(&FontSpec::identity(pairs), &[cids]);
        let out = optimize_with_options(&pdf, subset_opts());
        assert!(out.len() < pdf.len());

        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/target/font-verify");
        std::fs::create_dir_all(dir).unwrap();
        std::fs::write(format!("{dir}/pre.pdf"), &pdf).unwrap();
        std::fs::write(format!("{dir}/post.pdf"), &out).unwrap();
        println!(
            "wrote {dir}/pre.pdf ({} bytes) and post.pdf ({} bytes)",
            pdf.len(),
            out.len()
        );
    }
}

}

mod jpeghuff {
//! Lossless Huffman-table re-optimization for JPEG streams.
//!
//! Producers routinely emit the ITU-T T.81 Annex K example Huffman tables
//! instead of tables fitted to the image's own symbol statistics. Rebuilding
//! those tables is what `jpegtran -optimize` does, and it is *strictly*
//! lossless: the DCT coefficients are never decoded, dequantized, or
//! re-quantized — only the entropy coding of an unchanged symbol sequence
//! changes. Two JPEGs that differ only in their Huffman tables decode to
//! bit-identical pixels by construction.
//!
//! The pass is syntactic, not photometric. A scan is decoded into its token
//! sequence — Huffman symbols with their additional bits, plus the raw
//! successive-approximation bits progressive refinement passes emit outside
//! any table — the per-table symbol frequencies are counted, optimal
//! (length-limited, canonical) tables are generated with libjpeg's
//! `jpeg_gen_optimal_table` algorithm, and the same token sequence is
//! re-emitted against them. Nothing else in the file moves: `APPn`, `COM`,
//! `DQT`, `SOF`, `DRI` and the `SOS` headers are copied verbatim, restart
//! markers land at the same MCU boundaries, and only the `DHT` segments are
//! replaced.
//!
//! Scope: baseline and extended sequential (`SOF0`/`SOF1`) and progressive
//! (`SOF2`) Huffman frames at 8-bit precision. Arithmetic-coded (`SOF9`-`SOF11`),
//! lossless (`SOF3`/`SOF7`) and hierarchical (`SOF5`/`SOF6`, `DHP`) frames are a
//! different codec and decline, leaving the stream byte-identical.
//!
//! Progressive costs one piece of state the sequential path does not need. An
//! AC refinement scan's bit layout depends on which coefficients earlier scans
//! already made nonzero — that decides whether the next bit is a correction
//! bit — so the frame threads a nonzero mask, one `u64` per block, between its
//! scans (see [`Nonzero`]). Nothing else about the coefficients is tracked or
//! reconstructed: correction bits and refinement sign bits ride through as
//! [`Token::Raw`], unexamined and re-emitted at the same bit positions.
//!
//! Fail-safe contract: [`optimize`] returns `None` — meaning "ship the
//! original bytes" — on *any* parse surprise, on any structure outside the
//! scope above, when the rebuilt stream is not strictly smaller, and when the
//! rebuilt stream does not decode back to exactly the token sequence that was
//! read out of the input. That last check is a full round trip: it proves the
//! output's entropy-coded data carries the same symbols and the same
//! additional bits, i.e. the same coefficients, as the input. The test module
//! adds an independent reference decoder that reconstructs full coefficient
//! arrays and asserts they are unchanged across the rebuild.

/// One entropy-coded token.
///
/// [`Token::Sym`] is a Huffman symbol plus the additional bits that follow it;
/// `table` is `class << 4 | id` (class 0 = DC, 1 = AC). [`Token::Raw`] is a
/// group of bits carrying no Huffman symbol at all: progressive
/// successive-approximation scans emit DC refinement bits and AC correction
/// bits directly into the entropy stream, outside any table. Raw bits are
/// copied through untouched, so they contribute nothing to the symbol
/// statistics and re-emit at exactly the same bit positions.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Token {
    Sym {
        table: u8,
        sym: u8,
        bits: u16,
        nbits: u8,
    },
    Raw {
        bits: u32,
        nbits: u8,
    },
}

/// Append one raw bit, coalescing into the trailing [`Token::Raw`] group while
/// it still has room. Refinement scans emit long runs of these; packing them
/// keeps the token vector proportional to bytes rather than bits.
fn push_raw_bit(run: &mut Vec<Token>, bit: u32) {
    if let Some(Token::Raw { bits, nbits }) = run.last_mut() {
        if *nbits < 32 {
            *bits = (*bits << 1) | bit;
            *nbits += 1;
            return;
        }
    }
    run.push(Token::Raw { bits: bit, nbits: 1 });
}

/// A frame component as declared in `SOF`.
struct Component {
    h: u8,
    v: u8,
}

struct Frame {
    x: u16,
    y: u16,
    comps: Vec<Component>,
    /// Component index by component id, for `SOS` lookup.
    ids: Vec<u8>,
    /// Total blocks in each component's own grid — the grid every
    /// non-interleaved scan walks, so it indexes the progressive coefficient
    /// state consistently across a frame's scans.
    blocks: Vec<usize>,
    progressive: bool,
}

/// A decoded scan: its `SOS` payload verbatim and the tokens of each
/// restart interval (one entry when the scan has no restart markers).
struct Scan {
    header: Vec<u8>,
    runs: Vec<Vec<Token>>,
}

/// A canonical Huffman table in decode form: `(length, code) -> value`,
/// stored as per-length first-code / first-index bases.
#[derive(Clone, Default)]
struct DecodeTable {
    /// `mincode[l]`, `maxcode[l]`, `valptr[l]` for code length `l` (1..=16);
    /// `maxcode[l] < 0` marks an unused length.
    mincode: [i32; 17],
    maxcode: [i32; 17],
    valptr: [usize; 17],
    values: Vec<u8>,
}

impl DecodeTable {
    /// Build from the `BITS`/`HUFFVAL` form carried in a `DHT` segment.
    fn build(counts: &[u8; 16], values: Vec<u8>) -> Option<Self> {
        let mut t = DecodeTable {
            values,
            ..Default::default()
        };
        let mut code: i32 = 0;
        let mut k = 0usize;
        for l in 1..=16usize {
            let n = usize::from(counts[l - 1]);
            if n == 0 {
                t.maxcode[l] = -1;
                code <<= 1;
                continue;
            }
            t.valptr[l] = k;
            t.mincode[l] = code;
            k += n;
            code += i32::try_from(n).ok()?;
            t.maxcode[l] = code - 1;
            if code > (1 << l) {
                return None; // over-subscribed table
            }
            code <<= 1;
        }
        if k != t.values.len() {
            return None;
        }
        Some(t)
    }
}

/// MSB-first reader over an entropy-coded segment with `FF 00` unstuffing.
struct BitReader<'a> {
    data: &'a [u8],
    pos: usize,
    buf: u32,
    cnt: u8,
}

impl<'a> BitReader<'a> {
    fn new(data: &'a [u8], pos: usize) -> Self {
        BitReader {
            data,
            pos,
            buf: 0,
            cnt: 0,
        }
    }

    /// Next entropy byte, unstuffing `FF 00`. `None` at a real marker or EOF.
    fn next_byte(&mut self) -> Option<u8> {
        let b = *self.data.get(self.pos)?;
        if b != 0xFF {
            self.pos += 1;
            return Some(b);
        }
        if *self.data.get(self.pos + 1)? != 0x00 {
            return None;
        }
        self.pos += 2;
        Some(0xFF)
    }

    fn bit(&mut self) -> Option<u32> {
        if self.cnt == 0 {
            self.buf = u32::from(self.next_byte()?);
            self.cnt = 8;
        }
        self.cnt -= 1;
        Some((self.buf >> self.cnt) & 1)
    }

    fn bits(&mut self, n: u8) -> Option<u16> {
        let mut v = 0u32;
        for _ in 0..n {
            v = (v << 1) | self.bit()?;
        }
        u16::try_from(v).ok()
    }

    fn decode(&mut self, t: &DecodeTable) -> Option<u8> {
        let mut code = i32::try_from(self.bit()?).ok()?;
        for l in 1..=16usize {
            if t.maxcode[l] >= 0 && code <= t.maxcode[l] {
                let idx = t.valptr[l] + usize::try_from(code - t.mincode[l]).ok()?;
                return t.values.get(idx).copied();
            }
            code = (code << 1) | i32::try_from(self.bit()?).ok()?;
        }
        None
    }

    /// Drop any partial byte and consume the expected `RSTn` marker.
    fn restart(&mut self, n: u8) -> Option<()> {
        self.cnt = 0;
        if *self.data.get(self.pos)? != 0xFF || *self.data.get(self.pos + 1)? != 0xD0 + (n & 7) {
            return None;
        }
        self.pos += 2;
        Some(())
    }
}

/// MSB-first writer with `FF 00` stuffing.
#[derive(Default)]
struct BitWriter {
    out: Vec<u8>,
    buf: u32,
    cnt: u8,
}

impl BitWriter {
    fn put(&mut self, code: u32, len: u8) {
        for i in (0..len).rev() {
            self.buf = (self.buf << 1) | ((code >> i) & 1);
            self.cnt += 1;
            if self.cnt == 8 {
                let b = u8::try_from(self.buf & 0xFF).unwrap_or(0);
                self.out.push(b);
                if b == 0xFF {
                    self.out.push(0x00);
                }
                self.cnt = 0;
                self.buf = 0;
            }
        }
    }

    /// Pad the final partial byte with 1 bits, per T.81 F.1.2.3.
    fn flush(&mut self) {
        if self.cnt > 0 {
            let pad = 8 - self.cnt;
            self.put((1u32 << pad) - 1, pad);
        }
    }
}

/// A generated table in `DHT` form plus its encode lookup.
struct EncodeTable {
    counts: [u8; 16],
    values: Vec<u8>,
    /// `code[sym]`, `len[sym]`; `len == 0` means the symbol is not coded.
    code: [u32; 256],
    len: [u8; 256],
}

/// libjpeg's `jpeg_gen_optimal_table`: build a length-limited (<= 16 bit)
/// canonical Huffman table from symbol frequencies. Symbol 256 is reserved
/// with frequency 1 so the all-ones code is never assigned to a real symbol,
/// which some decoders cannot represent.
fn gen_optimal_table(freq_in: &[u64; 256]) -> Option<EncodeTable> {
    let mut freq = [0u64; 257];
    freq[..256].copy_from_slice(freq_in);
    freq[256] = 1;
    let mut codesize = [0u8; 257];
    let mut others = [-1i32; 257];

    loop {
        // Two least-frequent live entries; `<=` picks the highest index on a
        // tie, matching libjpeg so the generated tables are identical.
        let mut v1: i32 = -1;
        let mut c1 = u64::MAX;
        for (i, &f) in freq.iter().enumerate() {
            if f != 0 && f <= c1 {
                c1 = f;
                v1 = i32::try_from(i).ok()?;
            }
        }
        let mut v2: i32 = -1;
        let mut c2 = u64::MAX;
        for (i, &f) in freq.iter().enumerate() {
            if f != 0 && f <= c2 && i32::try_from(i).ok()? != v1 {
                c2 = f;
                v2 = i32::try_from(i).ok()?;
            }
        }
        if v2 < 0 {
            break;
        }
        let (mut a, mut b) = (usize::try_from(v1).ok()?, usize::try_from(v2).ok()?);
        freq[a] += freq[b];
        freq[b] = 0;
        codesize[a] = codesize[a].checked_add(1)?;
        while others[a] >= 0 {
            a = usize::try_from(others[a]).ok()?;
            codesize[a] = codesize[a].checked_add(1)?;
        }
        // Chain onto the END of v1's list, matching libjpeg's in-place walk.
        others[a] = v2;
        codesize[b] = codesize[b].checked_add(1)?;
        while others[b] >= 0 {
            b = usize::try_from(others[b]).ok()?;
            codesize[b] = codesize[b].checked_add(1)?;
        }
    }

    // Histogram of code lengths, then the classic length-limiting shuffle.
    let mut bits = [0u32; 33];
    for &cs in codesize.iter() {
        if cs != 0 {
            if usize::from(cs) > 32 {
                return None;
            }
            bits[usize::from(cs)] += 1;
        }
    }
    for i in (17..=32usize).rev() {
        while bits[i] > 0 {
            let mut j = i - 2;
            while bits[j] == 0 {
                j = j.checked_sub(1)?;
                if j == 0 {
                    return None;
                }
            }
            bits[i] -= 2;
            bits[i - 1] += 1;
            bits[j + 1] += 2;
            bits[j] -= 1;
        }
    }
    // Remove the reserved symbol: it holds the longest code by construction.
    let mut top = 16usize;
    while top > 0 && bits[top] == 0 {
        top -= 1;
    }
    if top == 0 {
        return None;
    }
    bits[top] -= 1;

    let mut counts = [0u8; 16];
    for l in 1..=16usize {
        counts[l - 1] = u8::try_from(bits[l]).ok()?;
    }
    // Symbol order is by the *unadjusted* code size, then by value: the
    // length-limiting shuffle above rewrites the length histogram but keeps
    // that ordering a valid canonical assignment (libjpeg does the same).
    let mut values: Vec<u8> = Vec::new();
    for l in 1..=32u8 {
        for (sym, &cs) in codesize.iter().enumerate().take(256) {
            if cs == l {
                values.push(u8::try_from(sym).ok()?);
            }
        }
    }
    if values.len() != bits[1..=16].iter().sum::<u32>() as usize {
        return None;
    }

    // Canonical code assignment over the (length, value) order just built.
    let mut code = [0u32; 256];
    let mut len = [0u8; 256];
    let mut next = 0u32;
    let mut k = 0usize;
    for l in 1..=16usize {
        for _ in 0..counts[l - 1] {
            let sym = usize::from(values[k]);
            code[sym] = next;
            len[sym] = u8::try_from(l).ok()?;
            next += 1;
            k += 1;
        }
        next <<= 1;
    }

    Some(EncodeTable {
        counts,
        values,
        code,
        len,
    })
}

/// Table slot for a `class << 4 | id` table selector: DC ids occupy 0..=3,
/// AC ids 4..=7. Both nibbles are range-checked before any selector is
/// built, so this is total.
fn slot_of(table: u8) -> usize {
    usize::from((table >> 4) * 4 + (table & 0xF))
}

/// Blocks-per-MCU layout, MCU count and spectral parameters for one scan.
struct ScanPlan {
    /// For each scan component: (frame component index, blocks per MCU,
    /// dc table, ac table).
    comps: Vec<(usize, usize, u8, u8)>,
    mcus: usize,
    /// Spectral selection and successive approximation from the `SOS` header.
    /// Sequential scans are always `0..=63` at `Ah = Al = 0`.
    ss: u8,
    se: u8,
    ah: u8,
}

fn ceil_div(a: usize, b: usize) -> Option<usize> {
    if b == 0 {
        return None;
    }
    Some(a.div_ceil(b))
}

/// Work out the MCU geometry a scan walks, from the frame and `SOS` header.
fn plan_scan(frame: &Frame, sos: &[u8]) -> Option<ScanPlan> {
    // SOS payload (after the 2 length bytes): Ns, (Cs Td|Ta)*Ns, Ss, Se, Ah|Al.
    let ns = usize::from(*sos.get(2)?);
    if ns == 0 || ns > 4 || sos.len() != 2 + 1 + ns * 2 + 3 {
        return None;
    }
    let (ss, se) = (*sos.get(2 + 1 + ns * 2)?, *sos.get(2 + 2 + ns * 2)?);
    let ahal = *sos.get(2 + 3 + ns * 2)?;
    let (ah, al) = (ahal >> 4, ahal & 0xF);

    if frame.progressive {
        // T.81 G.1.1.1.1: a DC scan is Ss = Se = 0 and may interleave; an AC
        // scan is a single component over a band of 1..=63. Al bounds the
        // point transform to a shift the 16-bit coefficient range can hold,
        // and Ah is either 0 (first pass) or exactly Al + 1 (refinement).
        if al > 13 || (ah != 0 && ah != al + 1) {
            return None;
        }
        if ss == 0 {
            if se != 0 {
                return None;
            }
        } else if ns != 1 || se < ss || se > 63 {
            return None;
        }
    } else if ss != 0 || se != 63 || ahal != 0 {
        // Sequential scans are always the full 0..=63 spectrum at zero shift.
        return None;
    }

    let hmax = usize::from(frame.comps.iter().map(|c| c.h).max()?);
    let vmax = usize::from(frame.comps.iter().map(|c| c.v).max()?);
    let x = usize::from(frame.x);
    let y = usize::from(frame.y);
    if x == 0 || y == 0 {
        return None;
    }

    let mut comps = Vec::with_capacity(ns);
    for i in 0..ns {
        let cs = *sos.get(3 + i * 2)?;
        let t = *sos.get(4 + i * 2)?;
        let idx = frame.ids.iter().position(|&id| id == cs)?;
        if comps.iter().any(|c: &(usize, usize, u8, u8)| c.0 == idx) {
            return None; // the same component twice in one scan
        }
        let (td, ta) = (t >> 4, t & 0xF);
        if td > 3 || ta > 3 {
            return None;
        }
        let c = frame.comps.get(idx)?;
        comps.push((idx, usize::from(c.h) * usize::from(c.v), td, ta));
    }

    let mcus = if ns == 1 {
        // Non-interleaved: one block per MCU, over the component's own grid.
        comps[0].1 = 1;
        *frame.blocks.get(comps[0].0)?
    } else {
        let mx = ceil_div(x, 8 * hmax)?;
        let my = ceil_div(y, 8 * vmax)?;
        mx.checked_mul(my)?
    };
    Some(ScanPlan {
        comps,
        mcus,
        ss,
        se,
        ah,
    })
}

/// Per-coefficient state a progressive frame carries between its scans: one
/// bit per coefficient of every block, set once that coefficient has become
/// nonzero. AC refinement scans need exactly this and nothing more — whether
/// a coefficient is already nonzero decides whether the next bit in the
/// stream is a correction bit for it — so a `u64` mask per block is the whole
/// state, at one eighth of a byte per pixel.
type Nonzero = Vec<Vec<u64>>;

/// One block's worth of an AC first pass (`Ah == 0`), following T.81 G.1.2.2.
fn decode_ac_first(
    reader: &mut BitReader,
    run: &mut Vec<Token>,
    ac: &DecodeTable,
    ta: u8,
    nz: &mut u64,
    plan: &ScanPlan,
    eobrun: &mut u32,
) -> Option<()> {
    if *eobrun > 0 {
        *eobrun -= 1;
        return Some(());
    }
    let mut k = usize::from(plan.ss);
    let se = usize::from(plan.se);
    while k <= se {
        let rs = reader.decode(ac)?;
        let (r, sz) = (rs >> 4, rs & 0xF);
        if sz != 0 {
            let extra = reader.bits(sz)?;
            run.push(Token::Sym {
                table: 0x10 | ta,
                sym: rs,
                bits: extra,
                nbits: sz,
            });
            k += usize::from(r);
            if k > se {
                return None;
            }
            *nz |= 1u64 << k;
            k += 1;
        } else if r != 15 {
            // EOB run: 2^r blocks, plus r additional bits, this one included.
            let extra = reader.bits(r)?;
            run.push(Token::Sym {
                table: 0x10 | ta,
                sym: rs,
                bits: extra,
                nbits: r,
            });
            *eobrun = (1u32 << r) + u32::from(extra) - 1;
            return Some(());
        } else {
            // ZRL: sixteen zero coefficients, no additional bits.
            run.push(Token::Sym {
                table: 0x10 | ta,
                sym: rs,
                bits: 0,
                nbits: 0,
            });
            k += 16;
        }
    }
    Some(())
}

/// One block's worth of an AC refinement pass (`Ah > 0`), following T.81
/// G.1.2.3. Coefficients already nonzero take a correction bit; newly coded
/// ones take a sign bit. Only the nonzero mask is tracked — the correction
/// bits themselves are copied through as raw bits.
fn decode_ac_refine(
    reader: &mut BitReader,
    run: &mut Vec<Token>,
    ac: &DecodeTable,
    ta: u8,
    nz: &mut u64,
    plan: &ScanPlan,
    eobrun: &mut u32,
) -> Option<()> {
    let se = usize::from(plan.se);
    let mut k = usize::from(plan.ss);
    if *eobrun == 0 {
        while k <= se {
            let rs = reader.decode(ac)?;
            let (mut r, sz) = (i32::from(rs >> 4), rs & 0xF);
            let mut newly_nonzero = false;
            if sz != 0 {
                // Only magnitude 1 can appear: refinement adds one bit plane,
                // so a coefficient can only ever cross into +-1 << Al.
                if sz != 1 {
                    return None;
                }
                run.push(Token::Sym {
                    table: 0x10 | ta,
                    sym: rs,
                    bits: 0,
                    nbits: 0,
                });
                push_raw_bit(run, reader.bit()?); // sign of the new coefficient
                newly_nonzero = true;
            } else if r != 15 {
                let extra = reader.bits(u8::try_from(r).ok()?)?;
                run.push(Token::Sym {
                    table: 0x10 | ta,
                    sym: rs,
                    bits: extra,
                    nbits: u8::try_from(r).ok()?,
                });
                *eobrun = (1u32 << r) + u32::from(extra);
                break;
            } else {
                run.push(Token::Sym {
                    table: 0x10 | ta,
                    sym: rs,
                    bits: 0,
                    nbits: 0,
                });
            }
            // Walk forward over `r` history-zero coefficients, taking a
            // correction bit for each already-nonzero one on the way.
            while k <= se {
                if *nz & (1u64 << k) != 0 {
                    push_raw_bit(run, reader.bit()?);
                } else {
                    r -= 1;
                    if r < 0 {
                        break;
                    }
                }
                k += 1;
            }
            if newly_nonzero {
                if k > se {
                    return None; // no room left for the coefficient just coded
                }
                *nz |= 1u64 << k;
            }
            k += 1;
        }
    }
    if *eobrun > 0 {
        // Inside an EOB run every remaining nonzero coefficient still takes a
        // correction bit; only the run/size symbols are suppressed.
        while k <= se {
            if *nz & (1u64 << k) != 0 {
                push_raw_bit(run, reader.bit()?);
            }
            k += 1;
        }
        *eobrun -= 1;
    }
    Some(())
}

/// Decode one scan's entropy-coded data into tokens, grouped by restart
/// interval. Returns the tokens and the offset of the byte just past the
/// scan's entropy data. `nonzero` carries progressive coefficient state
/// across the frame's scans and is unused for sequential frames.
fn decode_scan(
    data: &[u8],
    start: usize,
    plan: &ScanPlan,
    dri: usize,
    tables: &[Option<DecodeTable>; 8],
    progressive: bool,
    nonzero: &mut Nonzero,
) -> Option<(Vec<Vec<Token>>, usize)> {
    let mut reader = BitReader::new(data, start);
    let mut runs: Vec<Vec<Token>> = Vec::new();
    let mut run: Vec<Token> = Vec::new();
    let mut restarts = 0usize;
    let mut eobrun = 0u32;
    let ac_band = progressive && plan.ss != 0;

    for mcu in 0..plan.mcus {
        if dri > 0 && mcu > 0 && mcu % dri == 0 {
            runs.push(std::mem::take(&mut run));
            reader.restart(u8::try_from(restarts & 7).ok()?)?;
            restarts += 1;
            // T.81 G.1.2.2: EOB runs never cross a restart boundary.
            eobrun = 0;
        }
        if ac_band {
            // AC scans are single-component and non-interleaved, so the MCU
            // index is the block index in that component's own grid.
            let &(idx, _, _, ta) = plan.comps.first()?;
            let ac = tables[slot_of(0x10 | ta)].as_ref()?;
            let mut nz = *nonzero.get(idx)?.get(mcu)?;
            if plan.ah == 0 {
                decode_ac_first(&mut reader, &mut run, ac, ta, &mut nz, plan, &mut eobrun)?;
            } else {
                decode_ac_refine(&mut reader, &mut run, ac, ta, &mut nz, plan, &mut eobrun)?;
            }
            *nonzero.get_mut(idx)?.get_mut(mcu)? = nz;
            continue;
        }
        for &(_, blocks, td, ta) in &plan.comps {
            for _ in 0..blocks {
                if progressive && plan.ah != 0 {
                    // DC refinement: one raw bit per block, no Huffman at all.
                    push_raw_bit(&mut run, reader.bit()?);
                    continue;
                }
                let dc = tables[slot_of(td)].as_ref()?;
                let sym = reader.decode(dc)?;
                if sym > 15 {
                    return None;
                }
                let extra = reader.bits(sym)?;
                run.push(Token::Sym {
                    table: td,
                    sym,
                    bits: extra,
                    nbits: sym,
                });
                if progressive {
                    continue; // a progressive DC scan stops at the DC term
                }

                let ac = tables[slot_of(0x10 | ta)].as_ref()?;
                let mut k = 1usize;
                while k < 64 {
                    let rs = reader.decode(ac)?;
                    let (r, s) = (rs >> 4, rs & 0xF);
                    let extra = reader.bits(s)?;
                    run.push(Token::Sym {
                        table: 0x10 | ta,
                        sym: rs,
                        bits: extra,
                        nbits: s,
                    });
                    if s == 0 {
                        if r != 15 {
                            break; // EOB
                        }
                        k += 16;
                    } else {
                        k += usize::from(r) + 1;
                    }
                }
                if k > 64 {
                    return None;
                }
            }
        }
    }
    runs.push(run);
    // Everything after the final MCU must be pad bits up to the next marker.
    reader.cnt = 0;
    Some((runs, reader.pos))
}

/// Re-encode a decoded scan against freshly generated tables. Returns the
/// tables the scan needs (by `class * 4 + id` slot) and the entropy-coded
/// data; the caller assembles the `DHT` segment.
fn encode_scan(
    runs: &[Vec<Token>],
    gen: fn(&[u64; 256]) -> Option<EncodeTable>,
) -> Option<(Vec<Option<EncodeTable>>, Vec<u8>)> {
    let mut freqs: [[u64; 256]; 8] = [[0; 256]; 8];
    let mut used = [false; 8];
    for run in runs {
        for t in run {
            let Token::Sym { table, sym, .. } = t else {
                continue; // raw refinement bits carry no symbol
            };
            let slot = slot_of(*table);
            freqs[slot][usize::from(*sym)] += 1;
            used[slot] = true;
        }
    }
    let mut tables: Vec<Option<EncodeTable>> = Vec::with_capacity(8);
    for (slot, &is_used) in used.iter().enumerate() {
        tables.push(if is_used {
            Some(gen(&freqs[slot])?)
        } else {
            None
        });
    }

    let mut w = BitWriter::default();
    let mut entropy: Vec<u8> = Vec::new();
    for (i, run) in runs.iter().enumerate() {
        if i > 0 {
            entropy.push(0xFF);
            entropy.push(0xD0 + u8::try_from((i - 1) & 7).ok()?);
        }
        w.out.clear();
        w.buf = 0;
        w.cnt = 0;
        for t in run {
            match *t {
                Token::Sym {
                    table,
                    sym,
                    bits,
                    nbits,
                } => {
                    let table = tables.get(slot_of(table))?.as_ref()?;
                    let len = table.len[usize::from(sym)];
                    if len == 0 {
                        return None;
                    }
                    w.put(table.code[usize::from(sym)], len);
                    if nbits > 0 {
                        w.put(u32::from(bits), nbits);
                    }
                }
                Token::Raw { bits, nbits } => w.put(bits, nbits),
            }
        }
        w.flush();
        entropy.extend_from_slice(&w.out);
    }
    Some((tables, entropy))
}

/// The `BITS`/`HUFFVAL` pair a `DHT` entry carries, as currently in effect
/// for one table slot.
type TableState = Option<(Box<[u8; 16]>, Vec<u8>)>;

/// Assemble the `DHT` segment a scan needs, given the tables already in
/// effect. `in_effect` is updated to what the decoder will hold after this
/// segment. Returns an empty vector when nothing has to be (re)defined — a
/// progressive DC refinement scan codes no symbols at all.
fn dht_segment(
    tables: &[Option<EncodeTable>],
    in_effect: &mut [TableState; 8],
    dedupe: bool,
) -> Option<Vec<u8>> {
    let mut payload: Vec<u8> = Vec::new();
    for (slot, table) in tables.iter().enumerate() {
        let Some(t) = table else { continue };
        let fresh = (Box::new(t.counts), t.values.clone());
        if dedupe && in_effect.get(slot)?.as_ref() == Some(&fresh) {
            continue;
        }
        let class = u8::try_from(slot / 4).ok()?;
        let id = u8::try_from(slot % 4).ok()?;
        payload.push((class << 4) | id);
        payload.extend_from_slice(&t.counts);
        payload.extend_from_slice(&t.values);
        *in_effect.get_mut(slot)? = Some(fresh);
    }
    if payload.is_empty() {
        return Some(Vec::new());
    }
    let mut dht = vec![0xFF, 0xC4];
    dht.extend_from_slice(&u16::try_from(payload.len() + 2).ok()?.to_be_bytes());
    dht.extend_from_slice(&payload);
    Some(dht)
}

/// Parse a `DHT` segment payload into decode tables, slotted by
/// `class * 4 + id`.
fn read_dht(payload: &[u8], tables: &mut [Option<DecodeTable>; 8]) -> Option<()> {
    let mut i = 0usize;
    while i < payload.len() {
        let tc_th = *payload.get(i)?;
        let (class, id) = (tc_th >> 4, tc_th & 0xF);
        if class > 1 || id > 3 {
            return None;
        }
        let mut counts = [0u8; 16];
        counts.copy_from_slice(payload.get(i + 1..i + 17)?);
        let total: usize = counts.iter().map(|&c| usize::from(c)).sum();
        if total > 256 {
            return None;
        }
        let values = payload.get(i + 17..i + 17 + total)?.to_vec();
        tables[usize::from(class * 4 + id)] = Some(DecodeTable::build(&counts, values)?);
        i += 17 + total;
    }
    Some(())
}

/// The whole file decomposed into what the rebuild needs: the byte ranges to
/// copy verbatim and the decoded scans.
struct Parsed {
    /// Output segments in file order, already assembled except for scans.
    prefix: Vec<Vec<u8>>,
    scans: Vec<Scan>,
    /// Index into `prefix` after which each scan is written.
    scan_at: Vec<usize>,
    trailer: Vec<u8>,
    progressive: bool,
}

fn parse(data: &[u8]) -> Option<Parsed> {
    if data.len() < 4 || data[0] != 0xFF || data[1] != 0xD8 {
        return None;
    }
    let mut prefix: Vec<Vec<u8>> = vec![vec![0xFF, 0xD8]];
    let mut scans: Vec<Scan> = Vec::new();
    let mut scan_at: Vec<usize> = Vec::new();
    let mut tables: [Option<DecodeTable>; 8] = Default::default();
    let mut frame: Option<Frame> = None;
    let mut nonzero: Nonzero = Vec::new();
    let mut dri = 0usize;
    let mut i = 2usize;

    loop {
        if *data.get(i)? != 0xFF {
            return None;
        }
        // Fill bytes: any number of 0xFF may precede a marker code.
        let mut m = *data.get(i + 1)?;
        let mut j = i + 1;
        while m == 0xFF {
            j += 1;
            m = *data.get(j)?;
        }
        let seg = j + 1;
        match m {
            0xD9 => {
                // EOI: everything after it ships unchanged.
                return Some(Parsed {
                    prefix,
                    scans,
                    scan_at,
                    trailer: data.get(seg..)?.to_vec(),
                    progressive: frame.is_some_and(|f| f.progressive),
                });
            }
            0x01 | 0xD0..=0xD7 => return None, // stray marker outside a scan
            0xC0..=0xC2 => {
                let len = usize::from(u16::from_be_bytes([*data.get(seg)?, *data.get(seg + 1)?]));
                let payload = data.get(seg + 2..seg + len)?;
                if frame.is_some() || *payload.first()? != 8 {
                    return None; // multiple frames, or not 8-bit
                }
                let y = u16::from_be_bytes([*payload.get(1)?, *payload.get(2)?]);
                let x = u16::from_be_bytes([*payload.get(3)?, *payload.get(4)?]);
                let nf = usize::from(*payload.get(5)?);
                if nf == 0 || nf > 4 || payload.len() != 6 + nf * 3 {
                    return None;
                }
                let mut comps = Vec::with_capacity(nf);
                let mut ids = Vec::with_capacity(nf);
                for c in 0..nf {
                    let id = *payload.get(6 + c * 3)?;
                    let hv = *payload.get(7 + c * 3)?;
                    let (h, v) = (hv >> 4, hv & 0xF);
                    if h == 0 || v == 0 || h > 4 || v > 4 || ids.contains(&id) {
                        return None;
                    }
                    ids.push(id);
                    comps.push(Component { h, v });
                }
                // Per-component block grids, and the coefficient state a
                // progressive frame's AC scans thread through.
                let hmax = usize::from(comps.iter().map(|c| c.h).max()?);
                let vmax = usize::from(comps.iter().map(|c| c.v).max()?);
                if x == 0 || y == 0 {
                    return None;
                }
                let mut blocks = Vec::with_capacity(nf);
                for c in &comps {
                    let bw = ceil_div(
                        ceil_div(usize::from(x) * usize::from(c.h), hmax)?,
                        8,
                    )?;
                    let bh = ceil_div(
                        ceil_div(usize::from(y) * usize::from(c.v), vmax)?,
                        8,
                    )?;
                    blocks.push(bw.checked_mul(bh)?);
                }
                let progressive = m == 0xC2;
                if progressive {
                    nonzero = blocks.iter().map(|&n| vec![0u64; n]).collect();
                }
                frame = Some(Frame {
                    x,
                    y,
                    comps,
                    ids,
                    blocks,
                    progressive,
                });
                prefix.push(data.get(i..seg + len)?.to_vec());
                i = seg + len;
            }
            // Anything else in the SOF family — lossless, arithmetic,
            // hierarchical — is out of scope.
            0xC3 | 0xC5..=0xC7 | 0xC9..=0xCB | 0xCD..=0xCF | 0xCC | 0xDE | 0xDF => return None,
            0xC4 => {
                let len = usize::from(u16::from_be_bytes([*data.get(seg)?, *data.get(seg + 1)?]));
                read_dht(data.get(seg + 2..seg + len)?, &mut tables)?;
                // Dropped from the output: the rebuild emits its own.
                i = seg + len;
            }
            0xDD => {
                let len = usize::from(u16::from_be_bytes([*data.get(seg)?, *data.get(seg + 1)?]));
                if len != 4 {
                    return None;
                }
                dri = usize::from(u16::from_be_bytes([
                    *data.get(seg + 2)?,
                    *data.get(seg + 3)?,
                ]));
                prefix.push(data.get(i..seg + len)?.to_vec());
                i = seg + len;
            }
            0xDA => {
                let len = usize::from(u16::from_be_bytes([*data.get(seg)?, *data.get(seg + 1)?]));
                let header = data.get(seg..seg + len)?.to_vec();
                let frame = frame.as_ref()?;
                let plan = plan_scan(frame, &header)?;
                let (runs, end) = decode_scan(
                    data,
                    seg + len,
                    &plan,
                    dri,
                    &tables,
                    frame.progressive,
                    &mut nonzero,
                )?;
                scans.push(Scan { header, runs });
                scan_at.push(prefix.len());
                i = end;
                // The scan must be followed by a marker (RST markers are
                // consumed inside the scan, so this is a real one).
                if *data.get(i)? != 0xFF {
                    return None;
                }
            }
            _ => {
                let len = usize::from(u16::from_be_bytes([*data.get(seg)?, *data.get(seg + 1)?]));
                if len < 2 {
                    return None;
                }
                prefix.push(data.get(i..seg + len)?.to_vec());
                i = seg + len;
            }
        }
    }
}

fn rebuild(p: &Parsed) -> Option<Vec<u8>> {
    rebuild_with(p, gen_optimal_table)
}

/// The rebuild, parameterized by table generator so tests can substitute a
/// deliberately bad one.
fn rebuild_with(
    p: &Parsed,
    gen: fn(&[u64; 256]) -> Option<EncodeTable>,
) -> Option<Vec<u8>> {
    let mut out: Vec<u8> = Vec::new();
    let mut in_effect: [TableState; 8] = Default::default();
    let mut next_scan = 0usize;
    for (idx, seg) in p.prefix.iter().enumerate() {
        out.extend_from_slice(seg);
        while next_scan < p.scans.len() && p.scan_at[next_scan] == idx + 1 {
            let scan = &p.scans[next_scan];
            let (tables, entropy) = encode_scan(&scan.runs, gen)?;
            let dht = dht_segment(&tables, &mut in_effect, p.progressive)?;
            out.extend_from_slice(&dht);
            out.extend_from_slice(&[0xFF, 0xDA]);
            out.extend_from_slice(&scan.header);
            out.extend_from_slice(&entropy);
            next_scan += 1;
        }
    }
    if next_scan != p.scans.len() {
        return None;
    }
    out.extend_from_slice(&[0xFF, 0xD9]);
    out.extend_from_slice(&p.trailer);
    Some(out)
}

/// Rebuild `data`'s Huffman tables from its own symbol statistics.
///
/// Returns the smaller, coefficient-identical stream, or `None` to mean
/// "keep the original bytes" — for anything out of scope (see the module
/// docs), any parse surprise, a non-shrinking result, or a round trip that
/// does not reproduce the exact input token sequence.
pub(crate) fn optimize(data: &[u8]) -> Option<Vec<u8>> {
    let parsed = parse(data)?;
    if parsed.scans.is_empty() {
        return None;
    }
    let out = rebuild(&parsed)?;
    if out.len() >= data.len() {
        return None;
    }
    // Verification gate: re-read the rebuilt stream and require the same
    // scan structure and the same tokens — the same Huffman symbols and the
    // same additional bits, hence the same DCT coefficients.
    let back = parse(&out)?;
    if back.scans.len() != parsed.scans.len() {
        return None;
    }
    for (a, b) in back.scans.iter().zip(&parsed.scans) {
        if a.header != b.header || a.runs.len() != b.runs.len() {
            return None;
        }
        if a.runs.iter().zip(&b.runs).any(|(x, y)| x != y) {
            return None;
        }
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Fixtures live at `fixtures/jpeg`; regenerate with
    /// `python3 fixtures/jpeg/generate.py`.
    fn fixture(name: &str) -> Vec<u8> {
        let path = std::path::Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/fixtures/jpeg"))
            .join(name);
        std::fs::read(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
    }

    const FIXTURES: [&str; 6] = [
        "prog_color.jpg",
        "prog_color444.jpg",
        "prog_gray.jpg",
        "prog_restart.jpg",
        "prog_deep.jpg",
        "seq_color.jpg",
    ];

    // ---------------------------------------------------------------------
    // An independent reference decoder, used only to prove losslessness.
    //
    // It walks the file from scratch — its own marker loop, its own scan
    // decoders — and produces the full dequantized-free DCT coefficient array
    // of every component. Nothing in it shares code with the token model the
    // optimizer uses beyond the bit reader and the canonical-table lookup, so
    // agreeing on coefficients before and after the rebuild is a real check,
    // not a restatement of the optimizer's own bookkeeping.
    // ---------------------------------------------------------------------

    /// Coefficients in zigzag order, per component, per block of that
    /// component's own (MCU-padded) grid.
    type Coefs = Vec<Vec<[i32; 64]>>;

    fn extend(v: u16, s: u8) -> i32 {
        let v = i32::from(v);
        if s == 0 {
            0
        } else if v < (1 << (s - 1)) {
            v - (1 << s) + 1
        } else {
            v
        }
    }

    struct RefComp {
        h: usize,
        v: usize,
        id: u8,
        /// Grid width in blocks, padded out to whole MCUs.
        bw: usize,
        /// Width of the non-interleaved grid, which may be narrower.
        bw_scan: usize,
        bh_scan: usize,
    }

    /// Decode every DCT coefficient in `data`. Panics on anything it cannot
    /// parse — it is only ever pointed at streams the optimizer accepted.
    fn decode_coefficients(data: &[u8]) -> Coefs {
        assert_eq!(&data[..2], &[0xFF, 0xD8], "SOI");
        let mut tables: [Option<DecodeTable>; 8] = Default::default();
        let mut comps: Vec<RefComp> = Vec::new();
        let mut coefs: Coefs = Vec::new();
        let mut progressive = false;
        let (mut mcux, mut mcuy) = (0usize, 0usize);
        let mut dri = 0usize;
        let mut i = 2usize;

        loop {
            assert_eq!(data[i], 0xFF);
            let mut j = i + 1;
            while data[j] == 0xFF {
                j += 1;
            }
            let m = data[j];
            let seg = j + 1;
            if m == 0xD9 {
                return coefs;
            }
            let len = usize::from(u16::from_be_bytes([data[seg], data[seg + 1]]));
            match m {
                0xC0..=0xC2 => {
                    progressive = m == 0xC2;
                    let p = &data[seg + 2..seg + len];
                    let y = usize::from(u16::from_be_bytes([p[1], p[2]]));
                    let x = usize::from(u16::from_be_bytes([p[3], p[4]]));
                    let nf = usize::from(p[5]);
                    let raw: Vec<(u8, usize, usize)> = (0..nf)
                        .map(|c| {
                            (
                                p[6 + c * 3],
                                usize::from(p[7 + c * 3] >> 4),
                                usize::from(p[7 + c * 3] & 0xF),
                            )
                        })
                        .collect();
                    let hmax = raw.iter().map(|r| r.1).max().unwrap();
                    let vmax = raw.iter().map(|r| r.2).max().unwrap();
                    mcux = x.div_ceil(8 * hmax);
                    mcuy = y.div_ceil(8 * vmax);
                    for &(id, h, v) in &raw {
                        let bw_scan = (x * h).div_ceil(hmax).div_ceil(8);
                        let bh_scan = (y * v).div_ceil(vmax).div_ceil(8);
                        let bw = (mcux * h).max(bw_scan);
                        let bh = (mcuy * v).max(bh_scan);
                        comps.push(RefComp {
                            h,
                            v,
                            id,
                            bw,
                            bw_scan,
                            bh_scan,
                        });
                        coefs.push(vec![[0i32; 64]; bw * bh]);
                    }
                    i = seg + len;
                }
                0xC4 => {
                    read_dht(&data[seg + 2..seg + len], &mut tables).expect("DHT");
                    i = seg + len;
                }
                0xDD => {
                    dri = usize::from(u16::from_be_bytes([data[seg + 2], data[seg + 3]]));
                    i = seg + len;
                }
                0xDA => {
                    let p = &data[seg + 2..seg + len];
                    let ns = usize::from(p[0]);
                    let sel: Vec<(usize, u8, u8)> = (0..ns)
                        .map(|k| {
                            let idx = comps.iter().position(|c| c.id == p[1 + k * 2]).unwrap();
                            (idx, p[2 + k * 2] >> 4, p[2 + k * 2] & 0xF)
                        })
                        .collect();
                    let (ss, se) = (p[1 + ns * 2], p[2 + ns * 2]);
                    let (ah, al) = (p[3 + ns * 2] >> 4, p[3 + ns * 2] & 0xF);
                    let mut r = BitReader::new(data, seg + len);
                    let mut pred = vec![0i32; comps.len()];
                    let mut restarts = 0usize;
                    let mut eobrun = 0u32;

                    let mcus = if ns == 1 {
                        let c = &comps[sel[0].0];
                        c.bw_scan * c.bh_scan
                    } else {
                        mcux * mcuy
                    };
                    for mcu in 0..mcus {
                        if dri > 0 && mcu > 0 && mcu % dri == 0 {
                            r.restart(u8::try_from(restarts & 7).unwrap()).expect("RST");
                            restarts += 1;
                            pred.iter_mut().for_each(|v| *v = 0);
                            eobrun = 0;
                        }
                        // (component index, block index) for every block of
                        // this MCU, in scan order.
                        let mut blocks: Vec<(usize, usize)> = Vec::new();
                        if ns == 1 {
                            let (idx, ..) = sel[0];
                            let c = &comps[idx];
                            let (bx, by) = (mcu % c.bw_scan, mcu / c.bw_scan);
                            blocks.push((idx, by * c.bw + bx));
                        } else {
                            let (mx, my) = (mcu % mcux, mcu / mcux);
                            for &(idx, ..) in &sel {
                                let c = &comps[idx];
                                for by in 0..c.v {
                                    for bx in 0..c.h {
                                        let row = my * c.v + by;
                                        let col = mx * c.h + bx;
                                        blocks.push((idx, row * c.bw + col));
                                    }
                                }
                            }
                        }
                        let mut b = 0usize;
                        for (k, &(idx, td, ta)) in sel.iter().enumerate() {
                            let n = if ns == 1 { 1 } else { comps[idx].h * comps[idx].v };
                            let _ = k;
                            for _ in 0..n {
                                let (ci, bi) = blocks[b];
                                b += 1;
                                let blk = &mut coefs[ci][bi];
                                if !progressive {
                                    let dc = tables[slot_of(td)].as_ref().unwrap();
                                    let sz = r.decode(dc).unwrap();
                                    let diff = extend(r.bits(sz).unwrap(), sz);
                                    pred[ci] += diff;
                                    blk[0] = pred[ci];
                                    let ac = tables[slot_of(0x10 | ta)].as_ref().unwrap();
                                    let mut kk = 1usize;
                                    while kk < 64 {
                                        let rs = r.decode(ac).unwrap();
                                        let (run, sz) = (usize::from(rs >> 4), rs & 0xF);
                                        if sz == 0 {
                                            if run != 15 {
                                                break;
                                            }
                                            kk += 16;
                                        } else {
                                            kk += run;
                                            blk[kk] = extend(r.bits(sz).unwrap(), sz);
                                            kk += 1;
                                        }
                                    }
                                } else if ss == 0 {
                                    if ah == 0 {
                                        let dc = tables[slot_of(td)].as_ref().unwrap();
                                        let sz = r.decode(dc).unwrap();
                                        let diff = extend(r.bits(sz).unwrap(), sz);
                                        pred[ci] += diff;
                                        blk[0] = pred[ci] << al;
                                    } else if r.bit().unwrap() != 0 {
                                        blk[0] |= 1 << al;
                                    }
                                } else {
                                    let ac = tables[slot_of(0x10 | ta)].as_ref().unwrap();
                                    if ah == 0 {
                                        ref_ac_first(&mut r, ac, blk, ss, se, al, &mut eobrun);
                                    } else {
                                        ref_ac_refine(&mut r, ac, blk, ss, se, al, &mut eobrun);
                                    }
                                }
                            }
                        }
                    }
                    r.cnt = 0;
                    i = r.pos;
                    assert_eq!(data[i], 0xFF, "scan must end at a marker");
                }
                _ => i = seg + len,
            }
        }
    }

    fn ref_ac_first(
        r: &mut BitReader,
        ac: &DecodeTable,
        blk: &mut [i32; 64],
        ss: u8,
        se: u8,
        al: u8,
        eobrun: &mut u32,
    ) {
        if *eobrun > 0 {
            *eobrun -= 1;
            return;
        }
        let mut k = usize::from(ss);
        while k <= usize::from(se) {
            let rs = r.decode(ac).unwrap();
            let (run, sz) = (usize::from(rs >> 4), rs & 0xF);
            if sz != 0 {
                k += run;
                blk[k] = extend(r.bits(sz).unwrap(), sz) << al;
                k += 1;
            } else if run != 15 {
                *eobrun = (1u32 << run) + u32::from(r.bits(u8::try_from(run).unwrap()).unwrap()) - 1;
                return;
            } else {
                k += 16;
            }
        }
    }

    fn ref_ac_refine(
        r: &mut BitReader,
        ac: &DecodeTable,
        blk: &mut [i32; 64],
        ss: u8,
        se: u8,
        al: u8,
        eobrun: &mut u32,
    ) {
        let p1 = 1i32 << al;
        let m1 = -1i32 << al;
        let se = usize::from(se);
        let mut k = usize::from(ss);
        if *eobrun == 0 {
            while k <= se {
                let rs = r.decode(ac).unwrap();
                let (mut run, sz) = (i32::from(rs >> 4), rs & 0xF);
                let mut newval = 0i32;
                if sz != 0 {
                    assert_eq!(sz, 1, "refinement magnitude must be 1");
                    newval = if r.bit().unwrap() != 0 { p1 } else { m1 };
                } else if run != 15 {
                    *eobrun = (1u32 << run)
                        + u32::from(r.bits(u8::try_from(run).unwrap()).unwrap());
                    break;
                }
                while k <= se {
                    if blk[k] != 0 {
                        if r.bit().unwrap() != 0 && blk[k] & p1 == 0 {
                            blk[k] += if blk[k] >= 0 { p1 } else { m1 };
                        }
                    } else {
                        run -= 1;
                        if run < 0 {
                            break;
                        }
                    }
                    k += 1;
                }
                if newval != 0 {
                    blk[k] = newval;
                }
                k += 1;
            }
        }
        if *eobrun > 0 {
            while k <= se {
                if blk[k] != 0 && r.bit().unwrap() != 0 && blk[k] & p1 == 0 {
                    blk[k] += if blk[k] >= 0 { p1 } else { m1 };
                }
                k += 1;
            }
            *eobrun -= 1;
        }
    }

    /// Re-encode a parsed stream with deliberately bad tables: every symbol a
    /// scan uses gets an 8-bit code, whatever its frequency. That is what a
    /// producer shipping fixed tables looks like, and it gives the optimizer
    /// something to win back on fixtures that libjpeg already optimized.
    fn flat_table(freq: &[u64; 256]) -> Option<EncodeTable> {
        let values: Vec<u8> = (0..=255u8)
            .filter(|&s| freq[usize::from(s)] > 0)
            .take(255)
            .collect();
        if values.is_empty() || values.len() != freq.iter().filter(|&&f| f > 0).count() {
            return None;
        }
        let mut counts = [0u8; 16];
        counts[7] = u8::try_from(values.len()).ok()?;
        let (mut code, mut len) = ([0u32; 256], [0u8; 256]);
        for (n, &sym) in values.iter().enumerate() {
            code[usize::from(sym)] = u32::try_from(n).ok()?;
            len[usize::from(sym)] = 8;
        }
        Some(EncodeTable {
            counts,
            values,
            code,
            len,
        })
    }

    fn deoptimize(data: &[u8]) -> Vec<u8> {
        let parsed = parse(data).expect("fixture must parse");
        rebuild_with(&parsed, flat_table).expect("fixture must re-encode")
    }

    /// Symbol frequencies must produce a table no code longer than 16 bits,
    /// with every used symbol assigned and the all-ones code left free.
    /// Assemble a baseline JPEG whose Huffman tables are deliberately flat:
    /// every DC symbol gets a 4-bit code and every AC symbol a 3-bit one,
    /// regardless of how often it occurs. Legal, decodable, and exactly the
    /// shape a producer that ships fixed tables emits.
    ///
    /// `dri` sets the restart interval in MCUs (0 = none). The image is
    /// `blocks * 8` pixels wide and 8 tall, single component, so one MCU is
    /// one block.
    fn flat_table_jpeg(blocks: usize, dri: usize) -> Vec<u8> {
        const DC_SYMS: usize = 12;
        const AC_VALUES: [u8; 4] = [0x00, 0x01, 0x11, 0x21];
        let dc_code = |sym: u8| (u32::from(sym), 4u8);
        let ac_code = |sym: u8| {
            (
                u32::try_from(AC_VALUES.iter().position(|&v| v == sym).unwrap()).unwrap(),
                3u8,
            )
        };

        let mut out: Vec<u8> = vec![0xFF, 0xD8];
        // DQT: one all-ones table (the pass never reads it; the decoder does).
        out.extend_from_slice(&[0xFF, 0xDB, 0x00, 0x43, 0x00]);
        out.extend_from_slice(&[1u8; 64]);
        if dri > 0 {
            out.extend_from_slice(&[0xFF, 0xDD, 0x00, 0x04]);
            out.extend_from_slice(&u16::try_from(dri).unwrap().to_be_bytes());
        }
        // SOF0: 8-bit, 8 rows, blocks*8 columns, one 1x1 component.
        out.extend_from_slice(&[0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x08]);
        out.extend_from_slice(&u16::try_from(blocks * 8).unwrap().to_be_bytes());
        // Nf = 1; component id 1, sampling 1x1, quant table 0.
        out.extend_from_slice(&[0x01, 0x01, 0x11, 0x00]);
        // DHT: DC table 0 (12 four-bit codes), AC table 0 (4 three-bit codes).
        let mut dht: Vec<u8> = vec![0x00];
        dht.extend_from_slice(&[0, 0, 0, u8::try_from(DC_SYMS).unwrap(), 0, 0, 0, 0]);
        dht.extend_from_slice(&[0, 0, 0, 0, 0, 0, 0, 0]);
        dht.extend((0..u8::try_from(DC_SYMS).unwrap()).collect::<Vec<u8>>());
        dht.push(0x10);
        dht.extend_from_slice(&[0, 0, 4, 0, 0, 0, 0, 0]);
        dht.extend_from_slice(&[0, 0, 0, 0, 0, 0, 0, 0]);
        dht.extend_from_slice(&AC_VALUES);
        out.extend_from_slice(&[0xFF, 0xC4]);
        out.extend_from_slice(&u16::try_from(dht.len() + 2).unwrap().to_be_bytes());
        out.extend_from_slice(&dht);
        // SOS: one component, DC/AC table 0, full spectrum.
        out.extend_from_slice(&[0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00]);

        // Entropy data: a strongly skewed symbol mix, so optimal tables are
        // much shorter than the flat ones above.
        let mut w = BitWriter::default();
        let mut restarts = 0usize;
        for b in 0..blocks {
            if dri > 0 && b > 0 && b % dri == 0 {
                w.flush();
                out.extend_from_slice(&w.out);
                w.out.clear();
                out.push(0xFF);
                out.push(0xD0 + u8::try_from(restarts & 7).unwrap());
                restarts += 1;
            }
            // DC: magnitude 1 (one additional bit) on all but every 7th block.
            let (c, l) = if b % 7 == 0 { dc_code(0) } else { dc_code(1) };
            w.put(c, l);
            if b % 7 != 0 {
                w.put(u32::try_from(b & 1).unwrap(), 1);
            }
            // AC: one (run 1, size 1) coefficient on every third block, then
            // end-of-block.
            if b % 3 == 0 {
                let (c, l) = ac_code(0x11);
                w.put(c, l);
                w.put(1, 1);
            }
            let (c, l) = ac_code(0x00);
            w.put(c, l);
        }
        w.flush();
        out.extend_from_slice(&w.out);
        out.extend_from_slice(&[0xFF, 0xD9]);
        out
    }

    /// End to end on a synthetic baseline JPEG: the rebuild is smaller, and
    /// an independent decoder (the `image` crate) sees the same pixels.
    #[test]
    fn flat_tables_shrink_and_pixels_are_identical() {
        for dri in [0usize, 5] {
            let jpeg = flat_table_jpeg(40, dri);
            let out = optimize(&jpeg).expect("flat tables must be improvable");
            assert!(
                out.len() < jpeg.len(),
                "dri {dri}: {} vs {}",
                out.len(),
                jpeg.len()
            );
            let a = image::load_from_memory_with_format(&jpeg, image::ImageFormat::Jpeg)
                .expect("original decodes");
            let b = image::load_from_memory_with_format(&out, image::ImageFormat::Jpeg)
                .expect("rebuild decodes");
            assert_eq!(a.to_rgb8().into_raw(), b.to_rgb8().into_raw(), "dri {dri}");
        }
    }

    /// Running the pass on its own output must be a fixpoint: the tables are
    /// already optimal, so there is nothing left to win and the stream is
    /// left byte-identical.
    #[test]
    fn optimized_output_is_a_fixpoint() {
        let jpeg = flat_table_jpeg(40, 0);
        let once = optimize(&jpeg).unwrap();
        assert!(optimize(&once).is_none(), "second pass must decline");
    }

    /// Frame types outside the Huffman-sequential/progressive scope — lossless,
    /// arithmetic, hierarchical — must leave the bytes alone on the frame tag
    /// alone, whatever the entropy data says.
    #[test]
    fn out_of_scope_frames_decline() {
        for sof in [0xC3u8, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF] {
            let mut jpeg = flat_table_jpeg(8, 0);
            let at = jpeg
                .windows(2)
                .position(|w| w == [0xFF, 0xC0])
                .expect("SOF0");
            jpeg[at + 1] = sof;
            assert!(optimize(&jpeg).is_none(), "SOF {sof:#04X} must decline");
        }
    }

    /// A `DHP` marker introduces a hierarchical sequence: out of scope.
    #[test]
    fn hierarchical_declines() {
        let jpeg = flat_table_jpeg(8, 0);
        let mut hier = jpeg[..2].to_vec();
        hier.extend_from_slice(&[0xFF, 0xDE, 0x00, 0x08, 0x08, 0, 8, 0, 8, 0]);
        hier.extend_from_slice(&jpeg[2..]);
        assert!(optimize(&hier).is_none());
    }

    /// Every fixture the pass accepts must decode to exactly the same DCT
    /// coefficients before and after. This is the losslessness proof: the
    /// reference decoder below reconstructs full coefficient arrays from the
    /// raw bitstream, independently of the optimizer's token bookkeeping.
    #[test]
    fn coefficients_survive_the_rebuild() {
        for name in FIXTURES {
            let orig = fixture(name);
            // Both the fixture as shipped and a deliberately de-optimized
            // copy of it, so the optimizer is exercised on a stream it will
                // actually accept.
            let flat = deoptimize(&orig);
            let before = decode_coefficients(&orig);
            assert_eq!(before, decode_coefficients(&flat), "{name}: de-optimize");
            let out = optimize(&flat).unwrap_or_else(|| panic!("{name}: must optimize"));
            assert_eq!(before, decode_coefficients(&out), "{name}: optimize");
            if let Some(out) = optimize(&orig) {
                assert_eq!(before, decode_coefficients(&out), "{name}: optimize orig");
            }
        }
    }

    /// The same thing seen from outside: an independent decoder must render
    /// identical pixels from the original and the rebuild.
    #[test]
    fn fixture_pixels_are_identical() {
        for name in FIXTURES {
            let flat = deoptimize(&fixture(name));
            let out = optimize(&flat).unwrap();
            let a = image::load_from_memory_with_format(&flat, image::ImageFormat::Jpeg)
                .unwrap_or_else(|e| panic!("{name}: original decodes: {e}"));
            let b = image::load_from_memory_with_format(&out, image::ImageFormat::Jpeg)
                .unwrap_or_else(|e| panic!("{name}: rebuild decodes: {e}"));
            assert_eq!(a.to_rgb8().into_raw(), b.to_rgb8().into_raw(), "{name}");
        }
    }

    /// Flat tables over skewed statistics must shrink, on every fixture.
    #[test]
    fn progressive_flat_tables_shrink() {
        for name in FIXTURES {
            let flat = deoptimize(&fixture(name));
            let out = optimize(&flat).unwrap();
            assert!(out.len() < flat.len(), "{name}: {} vs {}", out.len(), flat.len());
        }
    }

    /// libjpeg already fits per-scan tables to the data, so its own output is
    /// at or near the fixpoint: the pass must either decline or shrink, never
    /// grow, and a second pass over its own output must decline.
    #[test]
    fn progressive_output_is_a_fixpoint() {
        for name in FIXTURES {
            let flat = deoptimize(&fixture(name));
            let once = optimize(&flat).unwrap();
            assert!(optimize(&once).is_none(), "{name}: second pass must decline");
        }
    }

    /// The pass must not silently drop a scan or reorder the frame: the
    /// rebuild carries the same SOS headers, in the same places.
    #[test]
    fn scan_structure_is_preserved() {
        for name in FIXTURES {
            let flat = deoptimize(&fixture(name));
            let out = optimize(&flat).unwrap();
            let (a, b) = (parse(&flat).unwrap(), parse(&out).unwrap());
            assert_eq!(a.scans.len(), b.scans.len(), "{name}");
            assert_eq!(a.scan_at, b.scan_at, "{name}");
            for (x, y) in a.scans.iter().zip(&b.scans) {
                assert_eq!(x.header, y.header, "{name}");
                assert_eq!(x.runs.len(), y.runs.len(), "{name}");
            }
        }
    }

    /// Truncating a progressive stream anywhere must decline rather than
    /// produce a stream, and must never panic.
    #[test]
    fn truncated_progressive_declines() {
        let jpeg = fixture("prog_color.jpg");
        for cut in (1..jpeg.len()).step_by(7) {
            assert!(optimize(&jpeg[..cut]).is_none(), "cut {cut}");
        }
    }

    /// Single-bit corruption anywhere in a progressive stream must either
    /// decline or produce something that still round-trips its own tokens —
    /// the verification gate in `optimize` guarantees the latter. Never a
    /// panic, never a silent coefficient change.
    #[test]
    fn corrupted_progressive_never_panics() {
        let jpeg = fixture("prog_gray.jpg");
        for byte in 0..jpeg.len() {
            for bit in [0u32, 3, 7] {
                let mut bad = jpeg.clone();
                bad[byte] ^= 1 << bit;
                let _ = optimize(&bad);
            }
        }
    }

    #[test]
    fn optimal_table_is_length_limited_and_complete() {
        let mut freq = [0u64; 256];
        for (i, f) in freq.iter_mut().enumerate() {
            // Geometric spread steep enough that the unlimited Huffman code
            // runs past 16 bits, so the length-limiting shuffle has to act.
            *f = 1u64 << (i % 20);
        }
        let t = gen_optimal_table(&freq).unwrap();
        assert!(t.len.iter().all(|&l| l <= 16));
        assert!(t.len.iter().all(|&l| l != 0));
        assert_eq!(
            t.values.len(),
            t.counts.iter().map(|&c| usize::from(c)).sum::<usize>()
        );
        // Kraft sum over the real symbols must stay under 1: the reserved
        // 257th symbol keeps the all-ones code out of the alphabet.
        let kraft: f64 = t.len.iter().map(|&l| 0.5f64.powi(i32::from(l))).sum();
        assert!(kraft < 1.0, "kraft {kraft}");
    }

    #[test]
    fn single_symbol_table_is_valid() {
        let mut freq = [0u64; 256];
        freq[0] = 100;
        let t = gen_optimal_table(&freq).unwrap();
        assert_eq!(t.len[0], 1);
        assert_eq!(t.values, vec![0]);
    }

    /// Generated tables must round-trip: symbols encoded with the `code`/`len`
    /// lookup decode back through a `DecodeTable` built from the same
    /// `BITS`/`HUFFVAL` the `DHT` segment would carry.
    #[test]
    fn generated_table_round_trips() {
        let mut state = 0x1234_5678u32;
        let mut rnd = move || {
            state ^= state << 13;
            state ^= state >> 17;
            state ^= state << 5;
            state
        };
        for trial in 0..40 {
            let mut freq = [0u64; 256];
            let live = 1 + (trial * 7) % 200;
            let mut syms: Vec<u8> = Vec::new();
            for _ in 0..4000 {
                let s = u8::try_from(rnd() as usize % live).unwrap();
                freq[usize::from(s)] += 1;
                syms.push(s);
            }
            let t = gen_optimal_table(&freq).unwrap();
            let mut w = BitWriter::default();
            for &s in &syms {
                assert_ne!(t.len[usize::from(s)], 0, "unassigned symbol");
                w.put(t.code[usize::from(s)], t.len[usize::from(s)]);
            }
            w.flush();
            let d = match DecodeTable::build(&t.counts, t.values.clone()) {
                Some(d) => d,
                None => panic!(
                    "trial {trial} live {live} counts {:?} values {}",
                    t.counts,
                    t.values.len()
                ),
            };
            let mut r = BitReader::new(&w.out, 0);
            for &s in &syms {
                assert_eq!(r.decode(&d).unwrap(), s, "trial {trial}");
            }
        }
    }

    #[test]
    fn bit_writer_stuffs_ff() {
        let mut w = BitWriter::default();
        w.put(0xFF, 8);
        w.flush();
        assert_eq!(w.out, vec![0xFF, 0x00]);
    }

    /// Corpus harness: point `AMATL_JPEG_DIR` at a directory of raw JPEG
    /// streams (e.g. every `/DCTDecode` payload extracted from amatl's own
    /// output) and this reports the aggregate saving and, when `jpegtran` is
    /// on PATH, how the rebuilt stream compares to it. Ignored by default —
    /// it needs an external corpus.
    #[test]
    #[ignore = "needs AMATL_JPEG_DIR corpus"]
    fn corpus_report() {
        let dir =
            std::env::var("AMATL_JPEG_DIR").unwrap_or_else(|_| "target/scratch/h5/jpg".into());
        let mut entries: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(Result::ok)
            .map(|e| e.path())
            .collect();
        entries.sort();
        let (mut cur, mut new, mut done, mut skipped) = (0usize, 0usize, 0usize, 0usize);
        for path in entries {
            let data = std::fs::read(&path).unwrap();
            cur += data.len();
            match optimize(&data) {
                Some(out) => {
                    println!(
                        "{:>9} -> {:>9} ({:+}) {}",
                        data.len(),
                        out.len(),
                        out.len() as i64 - data.len() as i64,
                        path.display()
                    );
                    new += out.len();
                    done += 1;
                }
                None => {
                    new += data.len();
                    skipped += 1;
                }
            }
        }
        println!(
            "streams {done} optimized, {skipped} declined; {cur} -> {new} (save {})",
            cur - new
        );
    }

    #[test]
    fn garbage_declines() {
        assert!(optimize(b"").is_none());
        assert!(optimize(b"\xFF\xD8\xFF\xD9").is_none());
        assert!(optimize(&[0xFFu8; 512]).is_none());
    }
}

}

mod truetype {
//! Minimal TrueType `cmap` machinery for the simple-font subsetting path.
//!
//! `subsetter` (the CID path's table writer) deliberately drops the `cmap`
//! table — CID-keyed PDF fonts never consult it. Simple TrueType fonts do:
//! the viewer resolves each character code through the font's `cmap`
//! (ISO 32000-1 9.6.6.4), so the subset must carry one. This module parses
//! the original font's `cmap` (formats 0, 4, 6, 12 — anything else fails the
//! whole font, fail-safe), and splices a freshly built `cmap` (replicating
//! the original subtables, restricted to retained glyphs, with remapped
//! glyph ids) into the subsetter's output, rebuilding the table directory
//! and checksums.

use std::collections::BTreeMap;

/// Upper bound on total parsed cmap mappings across all subtables; a table
/// expanding beyond this is pathological and disqualifies the font.
const MAX_CMAP_ENTRIES: usize = 1 << 20;

/// One `cmap` encoding record, fully enumerated. Mappings to glyph 0 are
/// omitted (equivalent to absence: both mean `.notdef`).
pub(crate) struct CmapSubtable {
    pub(crate) platform: u16,
    pub(crate) encoding: u16,
    pub(crate) map: BTreeMap<u32, u16>,
}

fn be16(data: &[u8], off: usize) -> Option<u16> {
    Some(u16::from_be_bytes([
        *data.get(off)?,
        *data.get(off.checked_add(1)?)?,
    ]))
}

fn be32(data: &[u8], off: usize) -> Option<u32> {
    Some(u32::from_be_bytes([
        *data.get(off)?,
        *data.get(off.checked_add(1)?)?,
        *data.get(off.checked_add(2)?)?,
        *data.get(off.checked_add(3)?)?,
    ]))
}

/// Locate a top-level table in a single (non-collection) sfnt.
pub(crate) fn find_table(font: &[u8], tag: &[u8; 4]) -> Option<(usize, usize)> {
    let count = usize::from(be16(font, 4)?);
    for i in 0..count {
        let rec = 12 + i * 16;
        if font.get(rec..rec + 4)? == tag {
            let off = be32(font, rec + 8)? as usize;
            let len = be32(font, rec + 12)? as usize;
            font.get(off..off.checked_add(len)?)?;
            return Some((off, len));
        }
    }
    None
}

/// Parse and fully enumerate every `cmap` encoding record. `None` on any
/// structural doubt, including a subtable format outside {0, 4, 6, 12}: the
/// caller cannot replicate semantics it cannot read.
pub(crate) fn parse_cmap(font: &[u8]) -> Option<Vec<CmapSubtable>> {
    let (cmap_off, _) = find_table(font, b"cmap")?;
    let table = font.get(cmap_off..)?;
    let record_count = usize::from(be16(table, 2)?);
    let mut out = Vec::with_capacity(record_count);
    let mut total = 0usize;
    for i in 0..record_count {
        let rec = 4 + i * 8;
        let platform = be16(table, rec)?;
        let encoding = be16(table, rec + 2)?;
        let offset = be32(table, rec + 4)? as usize;
        let map = parse_subtable(table.get(offset..)?)?;
        total = total.checked_add(map.len())?;
        if total > MAX_CMAP_ENTRIES {
            return None;
        }
        out.push(CmapSubtable {
            platform,
            encoding,
            map,
        });
    }
    Some(out)
}

fn parse_subtable(data: &[u8]) -> Option<BTreeMap<u32, u16>> {
    let mut map = BTreeMap::new();
    match be16(data, 0)? {
        0 => {
            for code in 0u32..256 {
                let gid = u16::from(*data.get(6 + code as usize)?);
                if gid != 0 {
                    map.insert(code, gid);
                }
            }
        }
        4 => {
            let seg_count = usize::from(be16(data, 6)?) / 2;
            let end_base = 14;
            let start_base = end_base + seg_count * 2 + 2;
            let delta_base = start_base + seg_count * 2;
            let range_base = delta_base + seg_count * 2;
            for seg in 0..seg_count {
                let end = be16(data, end_base + seg * 2)?;
                let start = be16(data, start_base + seg * 2)?;
                if start > end {
                    return None;
                }
                let delta = be16(data, delta_base + seg * 2)?;
                let range_off = be16(data, range_base + seg * 2)?;
                for code in start..=end {
                    if code == 0xFFFF {
                        continue;
                    }
                    let gid = if range_off == 0 {
                        code.wrapping_add(delta)
                    } else {
                        let glyph_at = range_base
                            + seg * 2
                            + usize::from(range_off)
                            + usize::from(code - start) * 2;
                        let raw = be16(data, glyph_at)?;
                        if raw == 0 {
                            0
                        } else {
                            raw.wrapping_add(delta)
                        }
                    };
                    if gid != 0 {
                        map.insert(u32::from(code), gid);
                    }
                    if map.len() > MAX_CMAP_ENTRIES {
                        return None;
                    }
                }
            }
        }
        6 => {
            let first = u32::from(be16(data, 6)?);
            let count = usize::from(be16(data, 8)?);
            for i in 0..count {
                let gid = be16(data, 10 + i * 2)?;
                if gid != 0 {
                    map.insert(first + i as u32, gid);
                }
            }
        }
        12 => {
            let group_count = be32(data, 12)? as usize;
            for g in 0..group_count {
                let rec = 16 + g * 12;
                let start = be32(data, rec)?;
                let end = be32(data, rec + 4)?;
                let start_gid = be32(data, rec + 8)?;
                if start > end || end > 0x10_FFFF {
                    return None;
                }
                if map.len() + (end - start) as usize + 1 > MAX_CMAP_ENTRIES {
                    return None;
                }
                for code in start..=end {
                    let gid = start_gid.wrapping_add(code - start);
                    if gid != 0 {
                        // A gid beyond u16 cannot exist in a real font.
                        map.insert(code, u16::try_from(gid).ok()?);
                    }
                }
            }
        }
        _ => return None,
    }
    Some(map)
}

// ---------------------------------------------------------------------------
// cmap synthesis
// ---------------------------------------------------------------------------

/// Build one format 4 subtable (BMP chars only; caller guarantees). `None`
/// when the segment list would overflow the format's 16-bit length field.
fn build_format4(map: &BTreeMap<u32, u16>) -> Option<Vec<u8>> {
    // Merge consecutive (char, gid) runs where both advance by 1 into
    // delta-only segments, then append the mandatory 0xFFFF sentinel.
    let mut segments: Vec<(u16, u16, u16)> = Vec::new(); // (start, end, start_gid)
    for (&code, &gid) in map {
        let code = code as u16;
        match segments.last_mut() {
            Some((start, end, sgid))
                if code == end.wrapping_add(1) && gid == sgid.wrapping_add(code - *start) =>
            {
                *end = code;
            }
            _ => segments.push((code, code, gid)),
        }
    }
    segments.push((0xFFFF, 0xFFFF, 0)); // sentinel; delta computed below maps it to 0
    let seg_count = segments.len();

    let length = 16 + seg_count * 8;
    if length > usize::from(u16::MAX) {
        return None;
    }
    let mut out = Vec::with_capacity(length);
    out.extend_from_slice(&4u16.to_be_bytes());
    out.extend_from_slice(&(length as u16).to_be_bytes());
    out.extend_from_slice(&0u16.to_be_bytes()); // language
    out.extend_from_slice(&((seg_count * 2) as u16).to_be_bytes());
    let floor_log2 = (usize::BITS - 1 - seg_count.leading_zeros()) as u16;
    let search_range = 2u16 << floor_log2;
    out.extend_from_slice(&search_range.to_be_bytes());
    out.extend_from_slice(&floor_log2.to_be_bytes());
    out.extend_from_slice(&((seg_count * 2) as u16 - search_range).to_be_bytes());
    for &(_, end, _) in &segments {
        out.extend_from_slice(&end.to_be_bytes());
    }
    out.extend_from_slice(&0u16.to_be_bytes()); // reservedPad
    for &(start, _, _) in &segments {
        out.extend_from_slice(&start.to_be_bytes());
    }
    for &(start, _, sgid) in &segments {
        out.extend_from_slice(&sgid.wrapping_sub(start).to_be_bytes());
    }
    for _ in &segments {
        out.extend_from_slice(&0u16.to_be_bytes()); // idRangeOffset: delta-only
    }
    Some(out)
}

/// Build one format 6 subtable (byte codes; caller guarantees chars <= 0xFF).
fn build_format6(map: &BTreeMap<u32, u16>) -> Vec<u8> {
    let first = map.keys().next().copied().unwrap_or(0) as u16;
    let last = map.keys().next_back().copied().unwrap_or(0) as u16;
    let count = last - first + 1;
    let mut out = Vec::with_capacity(10 + usize::from(count) * 2);
    out.extend_from_slice(&6u16.to_be_bytes());
    out.extend_from_slice(&(10 + count * 2).to_be_bytes());
    out.extend_from_slice(&0u16.to_be_bytes()); // language
    out.extend_from_slice(&first.to_be_bytes());
    out.extend_from_slice(&count.to_be_bytes());
    for code in first..=last {
        let gid = map.get(&u32::from(code)).copied().unwrap_or(0);
        out.extend_from_slice(&gid.to_be_bytes());
    }
    out
}

fn build_cmap_table(subtables: &[CmapSubtable]) -> Option<Vec<u8>> {
    let mut records: Vec<&CmapSubtable> = subtables.iter().collect();
    records.sort_by_key(|s| (s.platform, s.encoding));
    let mut header = Vec::new();
    header.extend_from_slice(&0u16.to_be_bytes());
    header.extend_from_slice(&(records.len() as u16).to_be_bytes());
    let mut bodies: Vec<Vec<u8>> = Vec::with_capacity(records.len());
    for sub in &records {
        // Platform 1 (Macintosh) readers expect byte-oriented formats; format
        // 6 covers its 0..=255 code space exactly. Everything else gets a
        // format 4 (the universally supported Windows shape).
        if sub.platform == 1 {
            bodies.push(build_format6(&sub.map));
        } else {
            bodies.push(build_format4(&sub.map)?);
        }
    }
    let mut offset = 4 + records.len() * 8;
    let mut out = header;
    for (sub, body) in records.iter().zip(&bodies) {
        out.extend_from_slice(&sub.platform.to_be_bytes());
        out.extend_from_slice(&sub.encoding.to_be_bytes());
        out.extend_from_slice(&(offset as u32).to_be_bytes());
        offset += body.len();
    }
    for body in &bodies {
        out.extend_from_slice(body);
    }
    Some(out)
}

fn table_checksum(data: &[u8]) -> u32 {
    let mut sum = 0u32;
    for chunk in data.chunks(4) {
        let mut word = [0u8; 4];
        word[..chunk.len()].copy_from_slice(chunk);
        sum = sum.wrapping_add(u32::from_be_bytes(word));
    }
    sum
}

/// Neutralise the six-letter `ABCDEF+` subset tags the producer left inside
/// the `name` table's string storage, replacing each with `AAAAAA`.
///
/// Two embeds of the same subset of the same font differ only in those tag
/// letters and in `head.checkSumAdjustment` (which the tags perturb), so
/// masking them makes byte-equal subsets *actually* byte-equal and the
/// document-wide stream dedup collapses them. Names in the `name` table play
/// no part in rendering an embedded PDF font — the viewer takes the subset
/// tag from `/BaseFont`, which amatl rewrites from a content hash anyway, so
/// the mask is no more of a mismatch than what already ships.
///
/// Both 1-byte and UTF-16BE name strings are handled. `None` on any
/// structural doubt (caller then keeps the font as-is, fail-safe).
pub(crate) fn mask_subset_tags(font: &[u8]) -> Option<Vec<u8>> {
    let (name_off, name_len) = find_table(font, b"name")?;
    let (head_off, head_len) = find_table(font, b"head")?;
    if head_len < 12 {
        return None;
    }
    let mut out = font.to_vec();
    let name = &mut out[name_off..name_off + name_len];
    let mut i = 0usize;
    while i < name.len() {
        if name[i] == b'+' && i >= 6 && name[i - 6..i].iter().all(u8::is_ascii_uppercase) {
            name[i - 6..i].fill(b'A');
        } else if name[i] == b'+' && i >= 13 && name[i - 1] == 0 {
            // UTF-16BE: 00 X 00 X ... 00 '+'
            let tag = &name[i - 13..i - 1];
            if tag
                .as_chunks::<2>()
                .0
                .iter()
                .all(|p| p[0] == 0 && p[1].is_ascii_uppercase())
            {
                for pair in name[i - 13..i - 1].as_chunks_mut::<2>().0 {
                    pair[1] = b'A';
                }
            }
        }
        i += 1;
    }
    if out[name_off..name_off + name_len] == font[name_off..name_off + name_len] {
        return Some(out); // nothing masked; checksums still valid
    }

    // Repair the `name` directory checksum, then `head.checkSumAdjustment`.
    let count = usize::from(be16(&out, 4)?);
    for i in 0..count {
        let rec = 12 + i * 16;
        if out.get(rec..rec + 4)? == b"name" {
            // table_checksum zero-pads the short final chunk, matching the
            // font's own 4-byte table padding.
            let sum = table_checksum(&out[name_off..name_off + name_len]);
            out[rec + 4..rec + 8].copy_from_slice(&sum.to_be_bytes());
        }
    }
    out[head_off + 8..head_off + 12].fill(0);
    let adjustment = 0xB1B0_AFBAu32.wrapping_sub(table_checksum(&out));
    out[head_off + 8..head_off + 12].copy_from_slice(&adjustment.to_be_bytes());
    Some(out)
}

/// An sfnt table: (tag, body).
type SfntTable = ([u8; 4], Vec<u8>);

/// Read every top-level table out of a single (non-collection) sfnt.
fn parse_tables(font: &[u8]) -> Option<(u32, Vec<SfntTable>)> {
    let sfnt_version = be32(font, 0)?;
    let count = usize::from(be16(font, 4)?);
    let mut tables: Vec<SfntTable> = Vec::with_capacity(count + 1);
    for i in 0..count {
        let rec = 12 + i * 16;
        let tag: [u8; 4] = font.get(rec..rec + 4)?.try_into().ok()?;
        let off = be32(font, rec + 8)? as usize;
        let len = be32(font, rec + 12)? as usize;
        tables.push((tag, font.get(off..off.checked_add(len)?)?.to_vec()));
    }
    Some((sfnt_version, tables))
}

/// Splice `subtables` into `font` as its `cmap`, rebuilding the table
/// directory, per-table checksums, and `head.checkSumAdjustment`. Replaces
/// any existing `cmap`. `None` on any structural doubt about the input.
pub(crate) fn insert_cmap(font: &[u8], subtables: &[CmapSubtable]) -> Option<Vec<u8>> {
    let (sfnt_version, mut tables) = parse_tables(font)?;
    tables.retain(|(tag, _)| tag != b"cmap");
    tables.push((*b"cmap", build_cmap_table(subtables)?));
    tables.sort_by_key(|(tag, _)| *tag);
    assemble_sfnt(sfnt_version, tables)
}

fn assemble_sfnt(sfnt_version: u32, mut tables: Vec<SfntTable>) -> Option<Vec<u8>> {
    let num = tables.len();
    let floor_log2 = usize::BITS - 1 - num.leading_zeros();
    let search_range = 16u16 << floor_log2;
    let mut out = Vec::new();
    out.extend_from_slice(&sfnt_version.to_be_bytes());
    out.extend_from_slice(&(num as u16).to_be_bytes());
    out.extend_from_slice(&search_range.to_be_bytes());
    out.extend_from_slice(&(floor_log2 as u16).to_be_bytes());
    out.extend_from_slice(&(num as u16 * 16 - search_range).to_be_bytes());

    let mut offset = 12 + num * 16;
    let mut head_offset = None;
    for (tag, data) in &mut tables {
        if tag == b"head" {
            // checkSumAdjustment participates in neither the table checksum
            // nor (by construction, once zeroed) the whole-font sum.
            if data.len() < 12 {
                return None;
            }
            data[8..12].fill(0);
            head_offset = Some(offset);
        }
        out.extend_from_slice(tag);
        out.extend_from_slice(&table_checksum(data).to_be_bytes());
        out.extend_from_slice(&(offset as u32).to_be_bytes());
        out.extend_from_slice(&(data.len() as u32).to_be_bytes());
        offset += data.len().next_multiple_of(4);
    }
    for (_, data) in &tables {
        out.extend_from_slice(data);
        out.resize(out.len().next_multiple_of(4), 0);
    }

    let head_offset = head_offset?;
    let adjustment = 0xB1B0_AFBAu32.wrapping_sub(table_checksum(&out));
    out[head_offset + 8..head_offset + 12].copy_from_slice(&adjustment.to_be_bytes());
    Some(out)
}

// ---------------------------------------------------------------------------
// Hinting removal (opt-in; changes rasterization at small sizes)
// ---------------------------------------------------------------------------

/// Strip TrueType hinting: drop the `fpgm`/`prep`/`cvt ` tables and every
/// per-glyph instruction block, rebuilding `glyf`, `loca`, the directory
/// checksums, and `head.checkSumAdjustment`.
///
/// Outlines, metrics, and mappings are untouched, but rasterization at small
/// sizes can change — callers must gate this behind explicit consent.
/// Returns `None` on structural doubt *and* when there is nothing to strip
/// (so the caller keeps the original bytes in both cases, fail-safe).
pub(crate) fn strip_hinting(font: &[u8]) -> Option<Vec<u8>> {
    let (sfnt_version, mut tables) = parse_tables(font)?;
    if sfnt_version != 0x0001_0000 && sfnt_version != u32::from_be_bytes(*b"true") {
        return None; // only glyf-flavoured sfnts carry TrueType hinting
    }
    let get = |t: &[u8; 4]| tables.iter().position(|(tag, _)| tag == t);
    let had_programs = get(b"fpgm").is_some() || get(b"prep").is_some() || get(b"cvt ").is_some();

    let head_idx = get(b"head")?;
    let loca_idx = get(b"loca")?;
    let glyf_idx = get(b"glyf")?;
    let maxp_idx = get(b"maxp")?;
    let long_loca = match be16(&tables[head_idx].1, 50)? {
        0 => false,
        1 => true,
        _ => return None,
    };
    let num_glyphs = usize::from(be16(&tables[maxp_idx].1, 4)?);

    // Decode loca into byte offsets.
    let loca = &tables[loca_idx].1;
    let mut offsets = Vec::with_capacity(num_glyphs + 1);
    for i in 0..=num_glyphs {
        offsets.push(if long_loca {
            be32(loca, i * 4)? as usize
        } else {
            usize::from(be16(loca, i * 2)?) * 2
        });
    }

    // Rewrite each glyph without its instruction block.
    let glyf = &tables[glyf_idx].1;
    let mut new_glyf: Vec<u8> = Vec::with_capacity(glyf.len());
    let mut new_offsets = Vec::with_capacity(num_glyphs + 1);
    let mut stripped_any = false;
    for w in offsets.windows(2) {
        new_offsets.push(new_glyf.len());
        let (start, end) = (w[0], w[1]);
        if start > end {
            return None;
        }
        let glyph = glyf.get(start..end)?;
        if glyph.is_empty() {
            continue; // empty glyph stays empty
        }
        let before = new_glyf.len();
        strip_glyph_instructions(glyph, &mut new_glyf)?;
        stripped_any |= new_glyf.len() - before != glyph.len();
        // Both loca formats conventionally align glyphs; short loca requires
        // even offsets.
        new_glyf.resize(new_glyf.len().next_multiple_of(2), 0);
    }
    new_offsets.push(new_glyf.len());
    if !had_programs && !stripped_any {
        return None; // nothing to strip; keep the original bytes
    }

    // Re-encode loca in the original format (offsets only shrank, so a short
    // loca stays representable; verify anyway).
    let mut new_loca = Vec::with_capacity(new_offsets.len() * if long_loca { 4 } else { 2 });
    for &off in &new_offsets {
        if long_loca {
            new_loca.extend_from_slice(&u32::try_from(off).ok()?.to_be_bytes());
        } else {
            new_loca.extend_from_slice(&u16::try_from(off / 2).ok()?.to_be_bytes());
        }
    }
    tables[glyf_idx].1 = new_glyf;
    tables[loca_idx].1 = new_loca;
    // maxp instruction maxima are upper bounds; zero them now that no
    // instructions remain (version 1.0 layout only).
    let maxp = &mut tables[maxp_idx].1;
    if be32(maxp, 0)? == 0x0001_0000 && maxp.len() >= 32 {
        maxp[24..26].fill(0); // maxSizeOfInstructions
    }
    tables.retain(|(tag, _)| tag != b"fpgm" && tag != b"prep" && tag != b"cvt ");
    assemble_sfnt(sfnt_version, tables)
}

/// Append `glyph` to `out` with its instruction block removed. Simple glyphs
/// get `instructionLength = 0`; composite glyphs get WE_HAVE_INSTRUCTIONS
/// cleared and the trailing block dropped. `None` on any structural doubt.
fn strip_glyph_instructions(glyph: &[u8], out: &mut Vec<u8>) -> Option<()> {
    let contours = i16::from_be_bytes([*glyph.first()?, *glyph.get(1)?]);
    if contours >= 0 {
        // Simple glyph: header (10) + endPtsOfContours + instructions + rest.
        let end_pts = 10 + usize::from(contours as u16) * 2;
        let instr_len = usize::from(be16(glyph, end_pts)?);
        let rest = glyph.get(end_pts + 2 + instr_len..)?;
        out.extend_from_slice(glyph.get(..end_pts)?);
        out.extend_from_slice(&0u16.to_be_bytes());
        out.extend_from_slice(rest);
        return Some(());
    }
    if contours != -1 {
        return None;
    }
    // Composite glyph: walk the component records.
    const ARG_1_AND_2_ARE_WORDS: u16 = 0x0001;
    const WE_HAVE_A_SCALE: u16 = 0x0008;
    const MORE_COMPONENTS: u16 = 0x0020;
    const WE_HAVE_AN_X_AND_Y_SCALE: u16 = 0x0040;
    const WE_HAVE_A_TWO_BY_TWO: u16 = 0x0080;
    const WE_HAVE_INSTRUCTIONS: u16 = 0x0100;

    let base = out.len();
    out.extend_from_slice(glyph.get(..10)?);
    let mut pos = 10usize;
    let mut have_instructions = false;
    loop {
        let flags = be16(glyph, pos)?;
        have_instructions |= flags & WE_HAVE_INSTRUCTIONS != 0;
        let mut len = 4 + if flags & ARG_1_AND_2_ARE_WORDS != 0 {
            4
        } else {
            2
        };
        if flags & WE_HAVE_A_SCALE != 0 {
            len += 2;
        } else if flags & WE_HAVE_AN_X_AND_Y_SCALE != 0 {
            len += 4;
        } else if flags & WE_HAVE_A_TWO_BY_TWO != 0 {
            len += 8;
        }
        let record_start = out.len();
        out.extend_from_slice(glyph.get(pos..pos + len)?);
        // Clear the instructions flag in the copied record.
        let cleared = (flags & !WE_HAVE_INSTRUCTIONS).to_be_bytes();
        out[record_start..record_start + 2].copy_from_slice(&cleared);
        pos += len;
        if flags & MORE_COMPONENTS == 0 {
            break;
        }
    }
    if have_instructions {
        // Trailing instruction block: length + bytes; validate it fits.
        let instr_len = usize::from(be16(glyph, pos)?);
        glyph.get(pos + 2..pos + 2 + instr_len)?;
    } else if pos != glyph.len() {
        // Unexpected trailing bytes on a glyph that declared no instructions;
        // keep them verbatim rather than guess.
        out.truncate(base);
        out.extend_from_slice(glyph);
    }
    Some(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_map(pairs: &[(u32, u16)]) -> BTreeMap<u32, u16> {
        pairs.iter().copied().collect()
    }

    #[test]
    fn format4_roundtrips_through_parser() {
        let map = sample_map(&[(0x20, 1), (0x21, 2), (0x22, 3), (0x41, 9), (0x2022, 4)]);
        let body = build_format4(&map).unwrap();
        assert_eq!(parse_subtable(&body).unwrap(), map);
    }

    #[test]
    fn format6_roundtrips_through_parser() {
        let map = sample_map(&[(0x20, 5), (0x7E, 2), (0xCA, 7)]);
        let body = build_format6(&map);
        assert_eq!(parse_subtable(&body).unwrap(), map);
    }

    /// Minimal two-table sfnt (`head`, `name`) whose `name` body is `body`.
    fn tiny_font(body: &[u8]) -> Vec<u8> {
        let head = vec![0u8; 54];
        let tables: [(&[u8; 4], &[u8]); 2] = [(b"head", &head), (b"name", body)];
        let mut out = vec![0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0, 32, 0, 1, 0, 0];
        let mut offset = 12 + 32;
        for (tag, data) in tables {
            out.extend_from_slice(tag);
            out.extend_from_slice(&table_checksum(data).to_be_bytes());
            out.extend_from_slice(&(offset as u32).to_be_bytes());
            out.extend_from_slice(&(data.len() as u32).to_be_bytes());
            offset += data.len().next_multiple_of(4);
        }
        for (_, data) in tables {
            out.extend_from_slice(data);
            out.resize(out.len().next_multiple_of(4), 0);
        }
        out
    }

    #[test]
    fn masking_makes_same_subset_under_different_tags_byte_equal() {
        let a = tiny_font(b"SKOJEB+ArialMT\x00\x00");
        let b = tiny_font(b"RZEDQD+ArialMT\x00\x00");
        assert_ne!(a, b);
        let (ma, mb) = (mask_subset_tags(&a).unwrap(), mask_subset_tags(&b).unwrap());
        assert_eq!(ma, mb);
        assert!(contains_window(&ma, b"AAAAAA+ArialMT"));
        // Whole-font checksum invariant holds after the repair.
        let head = find_table(&ma, b"head").unwrap().0;
        let mut zeroed = ma.clone();
        let adj = u32::from_be_bytes(ma[head + 8..head + 12].try_into().unwrap());
        zeroed[head + 8..head + 12].fill(0);
        assert_eq!(adj, 0xB1B0_AFBAu32.wrapping_sub(table_checksum(&zeroed)));
    }

    #[test]
    fn masking_handles_utf16be_names_and_leaves_untagged_fonts_alone() {
        let mut utf16 = Vec::new();
        for ch in "SKOJEB+Arial".chars() {
            utf16.extend_from_slice(&[0, ch as u8]);
        }
        let masked = mask_subset_tags(&tiny_font(&utf16)).unwrap();
        assert!(contains_window(
            &masked,
            b"\x00A\x00A\x00A\x00A\x00A\x00A\x00+"
        ));

        let plain = tiny_font(b"ArialMT\x00");
        assert_eq!(mask_subset_tags(&plain).unwrap(), plain);
    }

    fn contains_window(haystack: &[u8], needle: &[u8]) -> bool {
        haystack.windows(needle.len()).any(|w| w == needle)
    }

    #[test]
    fn simple_glyph_instructions_are_removed() {
        // 1 contour, 2 points, 3 instruction bytes, then flags/coords.
        let mut g = Vec::new();
        g.extend_from_slice(&1i16.to_be_bytes());
        g.extend_from_slice(&[0u8; 8]); // bbox
        g.extend_from_slice(&1u16.to_be_bytes()); // endPts
        g.extend_from_slice(&3u16.to_be_bytes()); // instructionLength
        g.extend_from_slice(&[0xB0, 0x01, 0x21]); // instructions
        g.extend_from_slice(&[0x01, 0x01, 5, 5, 5, 5]); // flags + coords
        let mut out = Vec::new();
        strip_glyph_instructions(&g, &mut out).unwrap();
        assert_eq!(out.len(), g.len() - 3);
        assert_eq!(&out[10 + 2..10 + 4], &0u16.to_be_bytes());
        assert_eq!(&out[out.len() - 6..], &[0x01, 0x01, 5, 5, 5, 5]);
    }

    #[test]
    fn composite_glyph_instruction_flag_is_cleared() {
        let mut g = Vec::new();
        g.extend_from_slice(&(-1i16).to_be_bytes());
        g.extend_from_slice(&[0u8; 8]); // bbox
        g.extend_from_slice(&0x0101u16.to_be_bytes()); // WORDS | INSTRUCTIONS
        g.extend_from_slice(&7u16.to_be_bytes()); // glyphIndex
        g.extend_from_slice(&[0u8; 4]); // word args
        g.extend_from_slice(&2u16.to_be_bytes()); // instr length
        g.extend_from_slice(&[0xB0, 0x00]);
        let mut out = Vec::new();
        strip_glyph_instructions(&g, &mut out).unwrap();
        assert_eq!(out.len(), g.len() - 4);
        assert_eq!(&out[10..12], &0x0001u16.to_be_bytes());
    }

    #[test]
    fn empty_map_still_builds_valid_tables() {
        let map = BTreeMap::new();
        assert_eq!(parse_subtable(&build_format4(&map).unwrap()).unwrap(), map);
        assert_eq!(parse_subtable(&build_format6(&map)).unwrap(), map);
    }
}

}

mod type1 {
//! Type1 → Type1C (CFF) font conversion for the opt-in `--convert-type1`
//! pass.
//!
//! Three self-contained stages, every one of which returns `None` on any
//! structural doubt (the caller then leaves the font untouched, fail-safe):
//!
//! 1. **Parse** ([`parse`]): PFB-segmented or raw `/FontFile` payloads,
//!    eexec decryption (binary or hex), cleartext header fields (FontName,
//!    FontMatrix, FontBBox, PaintType, the built-in `/Encoding`), and the
//!    private-dict tokenizer that extracts hint parameters, `/Subrs`, and
//!    `/CharStrings` (charstring-decrypted, `lenIV` honored).
//! 2. **Interpret** (`interpret_glyph`): a strict Type1 charstring
//!    interpreter that inlines subroutine calls and reduces each glyph to
//!    width + sidebearing + stem hints + relative path segments. The four
//!    standard OtherSubrs are evaluated structurally: flex (0–2) becomes the
//!    two curves it always rasterizes as, hint replacement (3) becomes a
//!    segment boundary carrying the replacement stem set, and `seac`
//!    composites are inlined from their component outlines (accent
//!    translated per the Type1 rendering rule `sbx + adx - asb`). Anything
//!    else — unknown operators, MM OtherSubrs, stack anomalies — fails the
//!    glyph and with it the font.
//! 3. **Emit** ([`convert_to_cff`]): Type2 charstrings (width encoded
//!    against `defaultWidthX`/`nominalWidthX`, `hstem(hm)`/`vstem(hm)` +
//!    `hintmask` reproducing the Type1 stem sets exactly) inside a minimal
//!    CFF: Name/Top DICT/String/CharStrings INDEXes, a format-0 charset, a
//!    custom encoding replicating the font's built-in encoding (restricted
//!    to retained glyphs, with supplements for multiply-encoded glyphs),
//!    and a Private DICT carrying every hint parameter the Type1 declared
//!    (BlueValues family, StdHW/VW, StemSnap, ForceBold, LanguageGroup).
//!
//! Coordinate fidelity: Type1 charstrings produce integers or `div`
//! rationals; both are carried as `f64` and re-emitted as Type2 integers or
//! 16.16 fixed-point, the same precision FreeType evaluates Type1 `div` at.
//! The left sidebearing (`hsbw`/`sbw`) is folded into each glyph's first
//! moveto, which is exactly how a Type2 consumer reconstructs the identical
//! outline; stem coordinates get the same sidebearing translation the Type1
//! rasterizer applies.

use std::collections::BTreeMap;

use super::encodings;

/// Recursion bound for `callsubr` nesting (the Type1 spec guarantees 10).
const MAX_SUBR_DEPTH: usize = 32;
/// Executed-token bound per glyph; a charstring beyond this is pathological.
const MAX_GLYPH_TOKENS: usize = 1 << 20;
/// Operand-stack bound (the spec says 24; be tolerant, not unbounded).
const MAX_STACK: usize = 96;
/// Total stem-hint bound imposed by Type2 `hintmask`.
const MAX_STEMS: usize = 96;
/// Upper bound on parsed charstrings/subrs, against pathological inputs.
const MAX_GLYPHS: usize = 20_000;

// ---------------------------------------------------------------------------
// Parsed font model
// ---------------------------------------------------------------------------

/// Hint parameters lifted from the Type1 Private dict, re-emitted into the
/// CFF Private DICT. All optional; absent entries keep their CFF defaults.
#[derive(Default)]
pub(crate) struct PrivateHints {
    blue_values: Vec<f64>,
    other_blues: Vec<f64>,
    family_blues: Vec<f64>,
    family_other_blues: Vec<f64>,
    blue_scale: Option<f64>,
    blue_shift: Option<f64>,
    blue_fuzz: Option<f64>,
    std_hw: Option<f64>,
    std_vw: Option<f64>,
    stem_snap_h: Vec<f64>,
    stem_snap_v: Vec<f64>,
    force_bold: Option<bool>,
    language_group: Option<f64>,
}

/// A fully parsed Type1 font program: decrypted charstrings and subrs plus
/// the header fields the CFF re-emission needs.
pub(crate) struct Type1Font {
    pub(crate) font_name: Vec<u8>,
    font_matrix: [f64; 6],
    font_bbox: [f64; 4],
    paint_type: f64,
    /// Built-in encoding: code -> glyph name. `None` = `.notdef`.
    encoding: Vec<Option<Vec<u8>>>,
    /// Glyph name -> decrypted charstring (lenIV bytes already stripped).
    charstrings: BTreeMap<Vec<u8>, Vec<u8>>,
    /// Decrypted subroutines (lenIV bytes already stripped).
    subrs: Vec<Vec<u8>>,
    private: PrivateHints,
}

impl Type1Font {
    /// The built-in encoding's glyph name at `code` (`None` = `.notdef`).
    pub(crate) fn builtin_name(&self, code: u8) -> Option<&[u8]> {
        match &self.encoding[usize::from(code)] {
            Some(name) if name != b".notdef" => Some(name),
            _ => None,
        }
    }

    /// Whether the font carries a charstring for `name`.
    pub(crate) fn has_glyph(&self, name: &[u8]) -> bool {
        self.charstrings.contains_key(name)
    }
}

// ---------------------------------------------------------------------------
// Decryption
// ---------------------------------------------------------------------------

const EEXEC_R: u16 = 55665;
const CHARSTRING_R: u16 = 4330;
const C1: u16 = 52845;
const C2: u16 = 22719;

/// Type1 decryption; `skip` leading plaintext bytes are discarded (4 for
/// eexec, `lenIV` for charstrings).
fn decrypt(data: &[u8], key: u16, skip: usize) -> Option<Vec<u8>> {
    if data.len() < skip {
        return None;
    }
    let mut r = key;
    let mut out = Vec::with_capacity(data.len() - skip);
    for (i, &c) in data.iter().enumerate() {
        let p = c ^ (r >> 8) as u8;
        r = (u16::from(c).wrapping_add(r))
            .wrapping_mul(C1)
            .wrapping_add(C2);
        if i >= skip {
            out.push(p);
        }
    }
    Some(out)
}

// ---------------------------------------------------------------------------
// Container handling (PFB / raw / hex eexec)
// ---------------------------------------------------------------------------

/// Split the font payload into (cleartext, eexec-decrypted plaintext).
fn split_and_decrypt(data: &[u8]) -> Option<(Vec<u8>, Vec<u8>)> {
    // PFB: 0x80-marked segments; concatenate their payloads in order (the
    // ascii/binary distinction is re-derived from the eexec split below).
    let linear = if data.first() == Some(&0x80) {
        let mut out = Vec::with_capacity(data.len());
        let mut pos = 0usize;
        while pos + 2 <= data.len() && data[pos] == 0x80 {
            match data[pos + 1] {
                3 => break,
                1 | 2 => {
                    let len = u32::from_le_bytes(data.get(pos + 2..pos + 6)?.try_into().ok()?);
                    let end = (pos + 6).checked_add(len as usize)?;
                    out.extend_from_slice(data.get(pos + 6..end)?);
                    pos = end;
                }
                _ => return None,
            }
        }
        out
    } else {
        data.to_vec()
    };

    // The cleartext ends at the `eexec` keyword; encrypted data begins after
    // the single following whitespace run.
    let eexec_at = find(&linear, b"eexec")?;
    let cleartext = linear[..eexec_at].to_vec();
    let mut enc_start = eexec_at + b"eexec".len();
    while linear
        .get(enc_start)
        .is_some_and(|b| b.is_ascii_whitespace())
    {
        enc_start += 1;
    }
    let encrypted = linear.get(enc_start..)?;
    if encrypted.len() < 8 {
        return None;
    }

    // Hex form: the spec guarantees a *binary* section never starts with
    // four ASCII-hex bytes.
    let is_hex = encrypted[..4].iter().all(u8::is_ascii_hexdigit);
    let binary: Vec<u8> = if is_hex {
        let mut bytes = Vec::with_capacity(encrypted.len() / 2);
        let mut nibble: Option<u8> = None;
        for &b in encrypted {
            let v = match b {
                b'0'..=b'9' => b - b'0',
                b'a'..=b'f' => b - b'a' + 10,
                b'A'..=b'F' => b - b'A' + 10,
                _ if b.is_ascii_whitespace() => continue,
                // First non-hex byte ends the section (the plaintext 512-zero
                // trailer region is tolerated: it decodes to junk the
                // private-dict parser never reaches).
                _ => break,
            };
            match nibble.take() {
                None => nibble = Some(v),
                Some(hi) => bytes.push((hi << 4) | v),
            }
        }
        bytes
    } else {
        encrypted.to_vec()
    };

    let plain = decrypt(&binary, EEXEC_R, 4)?;
    Some((cleartext, plain))
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

// ---------------------------------------------------------------------------
// PostScript-subset tokenizer
// ---------------------------------------------------------------------------

#[derive(Debug, PartialEq)]
enum Token<'a> {
    /// `/name` literal.
    Name(&'a [u8]),
    Number(f64),
    /// Any executable token (`def`, `dup`, `RD`, `StandardEncoding`, ...).
    Word(&'a [u8]),
    /// One of `[ ] { }`.
    Delim(u8),
}

struct Lexer<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> Lexer<'a> {
    fn new(data: &'a [u8]) -> Self {
        Lexer { data, pos: 0 }
    }

    fn skip_ws(&mut self) {
        while let Some(&b) = self.data.get(self.pos) {
            if b.is_ascii_whitespace() || b == 0 {
                self.pos += 1;
            } else if b == b'%' {
                while self.data.get(self.pos).is_some_and(|&c| c != b'\n') {
                    self.pos += 1;
                }
            } else {
                break;
            }
        }
    }

    fn next(&mut self) -> Option<Token<'a>> {
        self.skip_ws();
        let &b = self.data.get(self.pos)?;
        if matches!(b, b'[' | b']' | b'{' | b'}') {
            self.pos += 1;
            return Some(Token::Delim(b));
        }
        let start = self.pos;
        if b == b'/' {
            self.pos += 1;
            let name_start = self.pos;
            self.consume_regular();
            return Some(Token::Name(&self.data[name_start..self.pos]));
        }
        self.consume_regular();
        let word = &self.data[start..self.pos];
        if word.is_empty() {
            // A lone delimiter we do not model (e.g. `(`); skip the byte so
            // scanning always advances.
            self.pos += 1;
            return Some(Token::Word(&self.data[start..self.pos]));
        }
        match parse_number(word) {
            Some(v) => Some(Token::Number(v)),
            None => Some(Token::Word(word)),
        }
    }

    fn consume_regular(&mut self) {
        while let Some(&b) = self.data.get(self.pos) {
            if b.is_ascii_whitespace()
                || matches!(
                    b,
                    0 | b'/' | b'[' | b']' | b'{' | b'}' | b'(' | b')' | b'%' | b'<'
                )
            {
                break;
            }
            self.pos += 1;
        }
    }

    /// Consume the single whitespace byte separating an `RD`-style operator
    /// from its binary payload, then the payload itself.
    fn read_binary(&mut self, len: usize) -> Option<&'a [u8]> {
        let payload = self.pos.checked_add(1)?;
        let end = payload.checked_add(len)?;
        if !self.data.get(self.pos)?.is_ascii_whitespace() {
            return None;
        }
        let bytes = self.data.get(payload..end)?;
        self.pos = end;
        Some(bytes)
    }
}

fn parse_number(word: &[u8]) -> Option<f64> {
    let s = std::str::from_utf8(word).ok()?;
    // PostScript radix numbers (16#FF) and other exotica are not numbers we
    // model; plain decimal/real syntax only.
    if !s
        .bytes()
        .all(|b| b.is_ascii_digit() || matches!(b, b'+' | b'-' | b'.' | b'e' | b'E'))
    {
        return None;
    }
    s.parse::<f64>().ok().filter(|v| v.is_finite())
}

// ---------------------------------------------------------------------------
// Font-program parsing
// ---------------------------------------------------------------------------

/// Parse an embedded Type1 font program (raw `/FontFile` payload or PFB).
pub(crate) fn parse(data: &[u8]) -> Option<Type1Font> {
    let (cleartext, private) = split_and_decrypt(data)?;

    let mut font_name: Option<Vec<u8>> = None;
    let mut font_matrix: Option<[f64; 6]> = None;
    let mut font_bbox: Option<[f64; 4]> = None;
    let mut paint_type = 0.0f64;
    let mut encoding: Option<Vec<Option<Vec<u8>>>> = None;

    let mut lex = Lexer::new(&cleartext);
    while let Some(tok) = lex.next() {
        let Token::Name(key) = tok else { continue };
        match key {
            b"FontName" => {
                if let Some(Token::Name(n)) = lex.next() {
                    font_name = Some(n.to_vec());
                }
            }
            b"PaintType" => {
                if let Some(Token::Number(v)) = lex.next() {
                    paint_type = v;
                }
            }
            b"FontMatrix" => {
                let v = parse_array(&mut lex, 6)?;
                font_matrix = Some(v.try_into().ok()?);
            }
            b"FontBBox" => {
                let v = parse_array(&mut lex, 4)?;
                font_bbox = Some(v.try_into().ok()?);
            }
            b"Encoding" => {
                encoding = Some(parse_encoding(&mut lex)?);
            }
            _ => {}
        }
    }

    let mut font = Type1Font {
        font_name: font_name?,
        font_matrix: font_matrix?,
        font_bbox: font_bbox?,
        paint_type,
        encoding: encoding?,
        charstrings: BTreeMap::new(),
        subrs: Vec::new(),
        private: PrivateHints::default(),
    };
    parse_private(&private, &mut font)?;
    if font.charstrings.is_empty() {
        return None;
    }
    Some(font)
}

/// `[ n n n ... ]` or `{ n n n ... }` with exactly `count` numbers.
fn parse_array(lex: &mut Lexer, count: usize) -> Option<Vec<f64>> {
    let open = lex.next()?;
    let close = match open {
        Token::Delim(b'[') => b']',
        Token::Delim(b'{') => b'}',
        _ => return None,
    };
    let mut out = Vec::with_capacity(count);
    loop {
        match lex.next()? {
            Token::Number(v) => out.push(v),
            Token::Delim(d) if d == close => break,
            _ => return None,
        }
        if out.len() > count {
            return None;
        }
    }
    (out.len() == count).then_some(out)
}

/// The built-in `/Encoding`: either the `StandardEncoding` name or an array
/// populated by `dup <code> /<name> put` statements. Any construction we
/// cannot fully replicate (copying slices of another encoding vector) fails
/// the parse.
fn parse_encoding(lex: &mut Lexer) -> Option<Vec<Option<Vec<u8>>>> {
    let mut entries: Vec<Option<Vec<u8>>> = vec![None; 256];
    let mut first = true;
    loop {
        match lex.next()? {
            Token::Word(b"StandardEncoding") if first => {
                for (slot, name) in entries.iter_mut().zip(encodings::STANDARD_NAMES.iter()) {
                    if !name.is_empty() {
                        *slot = Some(name.as_bytes().to_vec());
                    }
                }
                return Some(entries);
            }
            Token::Word(b"def") | Token::Word(b"readonly") => {
                // `readonly def` terminates the array form; accepting bare
                // `readonly` here is safe because nothing else follows it in
                // the constructions we accept.
                return Some(entries);
            }
            Token::Word(b"dup") => {
                // `dup <code> /<name> put`; anything else after `dup` is a
                // construction we do not model.
                let Some(Token::Number(code)) = lex.next() else {
                    return None;
                };
                let Some(Token::Name(name)) = lex.next() else {
                    return None;
                };
                let Some(Token::Word(b"put")) = lex.next() else {
                    return None;
                };
                if !(0.0..=255.0).contains(&code) || code.fract() != 0.0 {
                    return None;
                }
                entries[code as usize] = Some(name.to_vec());
            }
            Token::Word(w)
                if w == b"getinterval" || w == b"putinterval" || w == b"StandardEncoding" =>
            {
                // Copying from another encoding: semantics we decline to
                // replicate.
                return None;
            }
            _ => {}
        }
        first = false;
    }
}

/// Sequentially parse the decrypted private section: `lenIV`, hint
/// parameters, `/Subrs`, `/CharStrings`. Sequential tokenization (with the
/// binary payloads consumed in place) guarantees we never scan for keywords
/// *inside* charstring bytes.
fn parse_private(data: &[u8], font: &mut Type1Font) -> Option<()> {
    let mut lex = Lexer::new(data);
    let mut len_iv = 4usize;

    while let Some(tok) = lex.next() {
        let Token::Name(key) = tok else { continue };
        match key {
            b"lenIV" => match lex.next()? {
                Token::Number(v) if v.fract() == 0.0 && (0.0..=16.0).contains(&v) => {
                    len_iv = v as usize;
                }
                // Negative lenIV (unencrypted charstrings) is a rarity we
                // decline rather than half-support.
                _ => return None,
            },
            b"BlueValues" => font.private.blue_values = parse_number_array(&mut lex, 14)?,
            b"OtherBlues" => font.private.other_blues = parse_number_array(&mut lex, 10)?,
            b"FamilyBlues" => font.private.family_blues = parse_number_array(&mut lex, 14)?,
            b"FamilyOtherBlues" => {
                font.private.family_other_blues = parse_number_array(&mut lex, 10)?;
            }
            b"BlueScale" => font.private.blue_scale = next_number(&mut lex),
            b"BlueShift" => font.private.blue_shift = next_number(&mut lex),
            b"BlueFuzz" => font.private.blue_fuzz = next_number(&mut lex),
            b"StdHW" => font.private.std_hw = parse_number_array(&mut lex, 1)?.first().copied(),
            b"StdVW" => font.private.std_vw = parse_number_array(&mut lex, 1)?.first().copied(),
            b"StemSnapH" => font.private.stem_snap_h = parse_number_array(&mut lex, 12)?,
            b"StemSnapV" => font.private.stem_snap_v = parse_number_array(&mut lex, 12)?,
            b"ForceBold" => match lex.next()? {
                Token::Word(b"true") => font.private.force_bold = Some(true),
                Token::Word(b"false") => font.private.force_bold = Some(false),
                _ => return None,
            },
            b"LanguageGroup" => font.private.language_group = next_number(&mut lex),
            b"Subrs" => parse_subrs(&mut lex, len_iv, font)?,
            b"CharStrings" => {
                parse_charstrings(&mut lex, len_iv, font)?;
                // Everything after `end` is trailer (`cleartomark`, the
                // zero region under hex containers) — do not scan it.
                return Some(());
            }
            _ => {}
        }
    }
    None
}

fn next_number(lex: &mut Lexer) -> Option<f64> {
    match lex.next()? {
        Token::Number(v) => Some(v),
        _ => None,
    }
}

/// `[ ... ]` / `{ ... }` of at most `max` numbers (spec-bounded arrays).
fn parse_number_array(lex: &mut Lexer, max: usize) -> Option<Vec<f64>> {
    let open = lex.next()?;
    let close = match open {
        Token::Delim(b'[') => b']',
        Token::Delim(b'{') => b'}',
        _ => return None,
    };
    let mut out = Vec::new();
    loop {
        match lex.next()? {
            Token::Number(v) => out.push(v),
            Token::Delim(d) if d == close => return Some(out),
            _ => return None,
        }
        if out.len() > max {
            return None;
        }
    }
}

/// `/Subrs <n> array` followed by `dup <index> <len> RD <bytes> NP` entries.
fn parse_subrs(lex: &mut Lexer, len_iv: usize, font: &mut Type1Font) -> Option<()> {
    let count = match lex.next()? {
        Token::Number(v) if v.fract() == 0.0 && (0.0..=MAX_GLYPHS as f64).contains(&v) => {
            v as usize
        }
        _ => return None,
    };
    font.subrs = vec![Vec::new(); count];
    let mut seen = 0usize;
    while seen < count {
        match lex.next()? {
            // `array`, `ND`-style epilogues, `noaccess put` interleavings.
            Token::Word(w) if w != b"dup" => {}
            Token::Word(_) => {
                let idx = match lex.next()? {
                    Token::Number(v) if v.fract() == 0.0 && v >= 0.0 => v as usize,
                    _ => return None,
                };
                let len = match lex.next()? {
                    Token::Number(v) if v.fract() == 0.0 && (0.0..=1e7).contains(&v) => v as usize,
                    _ => return None,
                };
                let Token::Word(_) = lex.next()? else {
                    return None;
                };
                let raw = lex.read_binary(len)?;
                let plain = decrypt(raw, CHARSTRING_R, len_iv)?;
                *font.subrs.get_mut(idx)? = plain;
                seen += 1;
            }
            _ => return None,
        }
    }
    Some(())
}

/// `/CharStrings <n> dict dup begin` followed by `/<name> <len> RD <bytes>
/// ND` entries, terminated by `end`.
fn parse_charstrings(lex: &mut Lexer, len_iv: usize, font: &mut Type1Font) -> Option<()> {
    // Skip forward to `begin`.
    loop {
        match lex.next()? {
            Token::Word(b"begin") => break,
            Token::Number(_) | Token::Word(_) => {}
            _ => return None,
        }
    }
    loop {
        match lex.next()? {
            Token::Word(b"end") => break,
            Token::Name(name) => {
                let len = match lex.next()? {
                    Token::Number(v) if v.fract() == 0.0 && (0.0..=1e7).contains(&v) => v as usize,
                    _ => return None,
                };
                let Token::Word(_) = lex.next()? else {
                    return None;
                };
                let raw = lex.read_binary(len)?;
                let plain = decrypt(raw, CHARSTRING_R, len_iv)?;
                if font.charstrings.len() >= MAX_GLYPHS {
                    return None;
                }
                font.charstrings.insert(name.to_vec(), plain);
            }
            // `ND`-style epilogue words between entries.
            Token::Word(_) => {}
            _ => return None,
        }
    }
    Some(())
}

// ---------------------------------------------------------------------------
// Type1 charstring interpretation
// ---------------------------------------------------------------------------

/// One relative path operation (Type2-shaped: closepath is implicit).
#[derive(Clone, Copy)]
enum PathOp {
    Move(f64, f64),
    Line(f64, f64),
    Curve(f64, f64, f64, f64, f64, f64),
}

impl PathOp {
    fn delta(&self) -> (f64, f64) {
        match *self {
            PathOp::Move(dx, dy) | PathOp::Line(dx, dy) => (dx, dy),
            PathOp::Curve(a, b, c, d, e, f) => (a + c + e, b + d + f),
        }
    }
}

/// A stem hint in absolute glyph space (sidebearing already applied).
#[derive(Clone, Copy, PartialEq)]
struct Stem {
    horiz: bool,
    lo: f64,
    ext: f64,
}

/// A run of path operations under one active stem set (hint-replacement
/// boundaries split runs).
struct Segment {
    /// Indices into `Glyph::stems`.
    active: Vec<usize>,
    ops: Vec<PathOp>,
}

/// `seac` composite parameters (Type1 operand order).
struct Seac {
    asb: f64,
    adx: f64,
    ady: f64,
    bchar: u8,
    achar: u8,
}

/// A fully interpreted glyph.
struct Glyph {
    width: f64,
    sb: (f64, f64),
    stems: Vec<Stem>,
    segments: Vec<Segment>,
    seac: Option<Seac>,
}

struct Interp<'a> {
    font: &'a Type1Font,
    stack: Vec<f64>,
    /// The `callothersubr`/`pop` result channel.
    ps_stack: Vec<f64>,
    width: Option<f64>,
    sb: (f64, f64),
    stems: Vec<Stem>,
    segments: Vec<Segment>,
    active: Vec<usize>,
    /// Active set changed since the last path op (next path op starts a new
    /// segment).
    dirty: bool,
    /// OtherSubr 3 seen: the next stem declaration replaces the active set.
    replace_pending: bool,
    in_flex: bool,
    flex_pts: Vec<(f64, f64)>,
    path_started: bool,
    /// Absolute current point (flex bookkeeping / final `setcurrentpoint`).
    cur: (f64, f64),
    tokens: usize,
    seac: Option<Seac>,
}

enum Flow {
    Continue,
    End,
}

impl<'a> Interp<'a> {
    fn new(font: &'a Type1Font) -> Self {
        Interp {
            font,
            stack: Vec::new(),
            ps_stack: Vec::new(),
            width: None,
            sb: (0.0, 0.0),
            stems: Vec::new(),
            segments: Vec::new(),
            active: Vec::new(),
            dirty: false,
            replace_pending: false,
            in_flex: false,
            flex_pts: Vec::new(),
            path_started: false,
            cur: (0.0, 0.0),
            tokens: 0,
            seac: None,
        }
    }

    fn push(&mut self, v: f64) -> Option<()> {
        if self.stack.len() >= MAX_STACK {
            return None;
        }
        self.stack.push(v);
        Some(())
    }

    fn pop(&mut self) -> Option<f64> {
        self.stack.pop()
    }

    /// Pop `n` values, returned in operand (push) order.
    fn take(&mut self, n: usize) -> Option<Vec<f64>> {
        if self.stack.len() < n {
            return None;
        }
        Some(self.stack.split_off(self.stack.len() - n))
    }

    fn add_stem(&mut self, horiz: bool, lo: f64, ext: f64) -> Option<()> {
        if self.replace_pending {
            self.active.clear();
            self.replace_pending = false;
            self.dirty = true;
        }
        let stem = Stem { horiz, lo, ext };
        let idx = match self.stems.iter().position(|s| *s == stem) {
            Some(idx) => idx,
            None => {
                if self.stems.len() >= MAX_STEMS {
                    return None;
                }
                self.stems.push(stem);
                self.stems.len() - 1
            }
        };
        if !self.active.contains(&idx) {
            self.active.push(idx);
            self.dirty = true;
        }
        Some(())
    }

    fn path_op(&mut self, op: PathOp) {
        let (dx, dy) = op.delta();
        self.cur.0 += dx;
        self.cur.1 += dy;
        if self.segments.is_empty() || self.dirty {
            let mut active = self.active.clone();
            active.sort_unstable();
            self.segments.push(Segment {
                active,
                ops: Vec::new(),
            });
            self.dirty = false;
        }
        self.segments.last_mut().expect("just ensured").ops.push(op);
    }

    fn moveto(&mut self, mut dx: f64, mut dy: f64) {
        if self.in_flex {
            self.flex_pts.push((dx, dy));
            self.cur.0 += dx;
            self.cur.1 += dy;
            return;
        }
        if !self.path_started {
            // Type1 starts the path at the sidebearing point; Type2 at the
            // origin. Fold the difference into the first moveto.
            dx += self.sb.0;
            dy += self.sb.1;
            self.path_started = true;
        }
        self.path_op(PathOp::Move(dx, dy));
    }

    fn exec(&mut self, code: &[u8], depth: usize) -> Option<Flow> {
        if depth > MAX_SUBR_DEPTH {
            return None;
        }
        let mut pos = 0usize;
        while pos < code.len() {
            self.tokens += 1;
            if self.tokens > MAX_GLYPH_TOKENS {
                return None;
            }
            let b0 = code[pos];
            pos += 1;
            match b0 {
                32..=246 => self.push(f64::from(i32::from(b0) - 139))?,
                247..=250 => {
                    let b1 = *code.get(pos)?;
                    pos += 1;
                    self.push(f64::from((i32::from(b0) - 247) * 256 + i32::from(b1) + 108))?;
                }
                251..=254 => {
                    let b1 = *code.get(pos)?;
                    pos += 1;
                    self.push(f64::from(
                        -(i32::from(b0) - 251) * 256 - i32::from(b1) - 108,
                    ))?;
                }
                255 => {
                    let raw = code.get(pos..pos + 4)?;
                    pos += 4;
                    self.push(f64::from(i32::from_be_bytes(raw.try_into().ok()?)))?;
                }
                1 => {
                    // hstem: y dy (y relative to the sidebearing point).
                    let a = self.take(2)?;
                    self.add_stem(true, a[0] + self.sb.1, a[1])?;
                }
                3 => {
                    // vstem: x dx.
                    let a = self.take(2)?;
                    self.add_stem(false, a[0] + self.sb.0, a[1])?;
                }
                4 => {
                    let a = self.take(1)?;
                    self.moveto(0.0, a[0]);
                }
                5 => {
                    let a = self.take(2)?;
                    self.path_op(PathOp::Line(a[0], a[1]));
                }
                6 => {
                    let a = self.take(1)?;
                    self.path_op(PathOp::Line(a[0], 0.0));
                }
                7 => {
                    let a = self.take(1)?;
                    self.path_op(PathOp::Line(0.0, a[0]));
                }
                8 => {
                    let a = self.take(6)?;
                    self.path_op(PathOp::Curve(a[0], a[1], a[2], a[3], a[4], a[5]));
                }
                9 => {
                    // closepath: implicit in Type2.
                    self.stack.clear();
                }
                10 => {
                    let idx = self.pop()?;
                    if idx.fract() != 0.0 || idx < 0.0 {
                        return None;
                    }
                    let subr = self.font.subrs.get(idx as usize)?.clone();
                    if let Flow::End = self.exec(&subr, depth + 1)? {
                        return Some(Flow::End);
                    }
                }
                11 => return Some(Flow::Continue),
                13 => {
                    // hsbw: sbx wx.
                    let a = self.take(2)?;
                    if self.path_started {
                        return None;
                    }
                    self.sb = (a[0], 0.0);
                    self.width = Some(a[1]);
                    self.stack.clear();
                }
                14 => return Some(Flow::End),
                21 => {
                    let a = self.take(2)?;
                    self.moveto(a[0], a[1]);
                }
                22 => {
                    let a = self.take(1)?;
                    self.moveto(a[0], 0.0);
                }
                30 => {
                    let a = self.take(4)?;
                    self.path_op(PathOp::Curve(0.0, a[0], a[1], a[2], a[3], 0.0));
                }
                31 => {
                    let a = self.take(4)?;
                    self.path_op(PathOp::Curve(a[0], 0.0, a[1], a[2], 0.0, a[3]));
                }
                12 => {
                    let b1 = *code.get(pos)?;
                    pos += 1;
                    match b1 {
                        0 => self.stack.clear(), // dotsection
                        1 => {
                            // vstem3: x0 dx0 x1 dx1 x2 dx2.
                            let a = self.take(6)?;
                            for pair in a.as_chunks::<2>().0 {
                                self.add_stem(false, pair[0] + self.sb.0, pair[1])?;
                            }
                        }
                        2 => {
                            let a = self.take(6)?;
                            for pair in a.as_chunks::<2>().0 {
                                self.add_stem(true, pair[0] + self.sb.1, pair[1])?;
                            }
                        }
                        6 => {
                            // seac: asb adx ady bchar achar.
                            let a = self.take(5)?;
                            let (bchar, achar) = (
                                u8::try_from(a[3] as i64).ok()?,
                                u8::try_from(a[4] as i64).ok()?,
                            );
                            if a[3].fract() != 0.0 || a[4].fract() != 0.0 {
                                return None;
                            }
                            return self.finish_seac(Seac {
                                asb: a[0],
                                adx: a[1],
                                ady: a[2],
                                bchar,
                                achar,
                            });
                        }
                        7 => {
                            // sbw: sbx sby wx wy.
                            let a = self.take(4)?;
                            if self.path_started || a[3] != 0.0 {
                                return None;
                            }
                            self.sb = (a[0], a[1]);
                            self.width = Some(a[2]);
                            self.stack.clear();
                        }
                        12 => {
                            let b = self.pop()?;
                            let a = self.pop()?;
                            if b == 0.0 {
                                return None;
                            }
                            self.push(a / b)?;
                        }
                        16 => self.callothersubr()?,
                        17 => {
                            let v = self.ps_stack.pop()?;
                            self.push(v)?;
                        }
                        33 => self.stack.clear(), // setcurrentpoint
                        _ => return None,
                    }
                }
                _ => return None,
            }
        }
        Some(Flow::Continue)
    }

    /// `seac` ends the charstring; record the composite parameters (path and
    /// stems, if any were emitted before it, are discarded — a conforming
    /// seac charstring is `sb w hsbw asb adx ady bchar achar seac`).
    fn finish_seac(&mut self, seac: Seac) -> Option<Flow> {
        if self.path_started {
            return None;
        }
        self.segments.clear();
        self.stems.clear();
        self.seac = Some(seac);
        Some(Flow::End)
    }

    fn callothersubr(&mut self) -> Option<()> {
        let othersubr = self.pop()?;
        let n = self.pop()?;
        if othersubr.fract() != 0.0 || n.fract() != 0.0 || n < 0.0 {
            return None;
        }
        let args = self.take(n as usize)?;
        match othersubr as i64 {
            0 => {
                // Flex end. The Adobe OtherSubrs[0] takes 17 args; the
                // reduced private protocol dvips-embedded fonts use takes 3
                // (flex height, end x, end y). Either way the outline comes
                // from the collected rmoveto points, which is what
                // rasterizers use too.
                if !matches!(args.len(), 3 | 17) || !self.in_flex || self.flex_pts.len() != 7 {
                    return None;
                }
                let p = std::mem::take(&mut self.flex_pts);
                self.in_flex = false;
                // p[0] is the flex reference point; fold its delta into the
                // first control point of the first curve.
                self.path_op(PathOp::Curve(
                    p[0].0 + p[1].0,
                    p[0].1 + p[1].1,
                    p[2].0,
                    p[2].1,
                    p[3].0,
                    p[3].1,
                ));
                self.path_op(PathOp::Curve(
                    p[4].0, p[4].1, p[5].0, p[5].1, p[6].0, p[6].1,
                ));
                // The charstring follows with `pop pop setcurrentpoint`.
                self.ps_stack.push(self.cur.1);
                self.ps_stack.push(self.cur.0);
            }
            1 => {
                if !args.is_empty() || self.in_flex || !self.path_started {
                    return None;
                }
                self.in_flex = true;
                self.flex_pts.clear();
            }
            2 => {
                if !args.is_empty() || !self.in_flex {
                    return None;
                }
            }
            3 => {
                // Hint replacement: the following `pop callsubr` executes a
                // subr whose stem declarations replace the active set.
                if args.len() != 1 {
                    return None;
                }
                self.replace_pending = true;
                self.ps_stack.push(args[0]);
            }
            _ => return None,
        }
        Some(())
    }
}

/// Interpret one named glyph. `allow_seac` guards against recursive
/// composites (a seac component containing another seac).
fn interpret_glyph(font: &Type1Font, name: &[u8], allow_seac: bool) -> Option<Glyph> {
    let charstring = font.charstrings.get(name)?;
    let mut interp = Interp::new(font);
    interp.exec(charstring, 0)?;
    if interp.in_flex {
        return None;
    }
    let mut glyph = Glyph {
        width: interp.width?,
        sb: interp.sb,
        stems: interp.stems,
        segments: interp.segments,
        seac: interp.seac,
    };
    if let Some(seac) = glyph.seac.take() {
        if !allow_seac {
            return None;
        }
        glyph = compose_seac(font, &glyph, &seac)?;
    }
    Some(glyph)
}

/// Inline a `seac` composite: base outline followed by the accent outline
/// translated by the Type1 rule `(sbx + adx - asb, ady)`. Stem hints are
/// dropped (the components' hints are valid only in their own coordinate
/// frames); unhinted rendering is unaffected and the outline is exact.
fn compose_seac(font: &Type1Font, composite: &Glyph, seac: &Seac) -> Option<Glyph> {
    let bname = std_name(seac.bchar)?;
    let aname = std_name(seac.achar)?;
    let base = interpret_glyph(font, bname, false)?;
    let accent = interpret_glyph(font, aname, false)?;

    let mut ops: Vec<PathOp> = Vec::new();
    let mut end = (0.0f64, 0.0f64);
    for seg in &base.segments {
        for op in &seg.ops {
            let (dx, dy) = op.delta();
            end.0 += dx;
            end.1 += dy;
            ops.push(*op);
        }
    }
    let translate = (
        composite.sb.0 + seac.adx - seac.asb,
        composite.sb.1 + seac.ady,
    );
    let mut first = true;
    for seg in &accent.segments {
        for op in &seg.ops {
            let mut op = *op;
            if first {
                // The accent's first moveto is relative to the composite
                // origin plus the accent displacement; re-base it against
                // where the base outline ended.
                let PathOp::Move(dx, dy) = op else {
                    return None;
                };
                op = PathOp::Move(dx + translate.0 - end.0, dy + translate.1 - end.1);
                first = false;
            }
            ops.push(op);
        }
    }
    if first {
        // An accent with no outline is not a composite we understand.
        return None;
    }
    Some(Glyph {
        width: composite.width,
        sb: composite.sb,
        stems: Vec::new(),
        segments: vec![Segment {
            active: Vec::new(),
            ops,
        }],
        seac: None,
    })
}

fn std_name(code: u8) -> Option<&'static [u8]> {
    let name = encodings::STANDARD_NAMES[usize::from(code)];
    (!name.is_empty()).then_some(name.as_bytes())
}

// ---------------------------------------------------------------------------
// Type2 charstring emission
// ---------------------------------------------------------------------------

pub(crate) fn t2_number(out: &mut Vec<u8>, v: f64) -> Option<()> {
    if v.fract() == 0.0 && (-32768.0..=32767.0).contains(&v) {
        let i = v as i32;
        match i {
            -107..=107 => out.push((i + 139) as u8),
            108..=1131 => {
                let d = i - 108;
                out.push((d / 256 + 247) as u8);
                out.push((d % 256) as u8);
            }
            -1131..=-108 => {
                let d = -i - 108;
                out.push((d / 256 + 251) as u8);
                out.push((d % 256) as u8);
            }
            _ => {
                out.push(28);
                out.extend_from_slice(&(i as i16).to_be_bytes());
            }
        }
    } else {
        let fixed = (v * 65536.0).round();
        if !(-32768.0 * 65536.0..=32767.0 * 65536.0 + 65535.0).contains(&fixed) {
            return None;
        }
        out.push(255);
        out.extend_from_slice(&(fixed as i32).to_be_bytes());
    }
    Some(())
}

fn t2_op(out: &mut Vec<u8>, op: u8) {
    out.push(op);
}

/// Sort stems into canonical order and return (hstems, vstems, index map
/// from original stem index to hintmask bit).
fn order_stems(stems: &[Stem]) -> (Vec<Stem>, Vec<Stem>, Vec<usize>) {
    let mut h: Vec<(usize, Stem)> = Vec::new();
    let mut v: Vec<(usize, Stem)> = Vec::new();
    for (i, s) in stems.iter().enumerate() {
        if s.horiz {
            h.push((i, *s));
        } else {
            v.push((i, *s));
        }
    }
    let key = |s: &Stem| (s.lo, s.lo + s.ext);
    h.sort_by(|a, b| {
        key(&a.1)
            .partial_cmp(&key(&b.1))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    v.sort_by(|a, b| {
        key(&a.1)
            .partial_cmp(&key(&b.1))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let mut bit_of = vec![0usize; stems.len()];
    for (bit, (orig, _)) in h.iter().chain(v.iter()).enumerate() {
        bit_of[*orig] = bit;
    }
    (
        h.into_iter().map(|(_, s)| s).collect(),
        v.into_iter().map(|(_, s)| s).collect(),
        bit_of,
    )
}

/// Emit one stem list as delta-encoded operands.
fn push_stem_args(out: &mut Vec<u8>, stems: &[Stem]) -> Option<()> {
    let mut prev = 0.0f64;
    for s in stems {
        t2_number(out, s.lo - prev)?;
        t2_number(out, s.ext)?;
        prev = s.lo + s.ext;
    }
    Some(())
}

fn emit_charstring(glyph: &Glyph, default_width: f64, nominal_width: f64) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    let mut width_pending = if glyph.width == default_width {
        None
    } else {
        Some(glyph.width - nominal_width)
    };

    let (hstems, vstems, bit_of) = order_stems(&glyph.stems);
    let nstems = hstems.len() + vstems.len();
    if nstems > MAX_STEMS {
        return None;
    }
    // One stem op carries at most 24 pairs (48-operand stack, minus the
    // width slot); hstemhm/vstemhm cannot be split.
    if hstems.len() > 23 || vstems.len() > 23 {
        return None;
    }
    // Zero declared stems means a hintmask would carry zero mask bytes;
    // segments are then simply concatenated.
    let need_masks = glyph.segments.len() > 1 && nstems > 0;

    if !hstems.is_empty() {
        if let Some(w) = width_pending.take() {
            t2_number(&mut out, w)?;
        }
        push_stem_args(&mut out, &hstems)?;
        t2_op(&mut out, if need_masks { 18 } else { 1 }); // hstemhm / hstem
    }
    if !vstems.is_empty() {
        if let Some(w) = width_pending.take() {
            t2_number(&mut out, w)?;
        }
        push_stem_args(&mut out, &vstems)?;
        t2_op(&mut out, if need_masks { 23 } else { 3 }); // vstemhm / vstem
    }

    let mask_len = nstems.div_ceil(8);
    for seg in &glyph.segments {
        if need_masks {
            let mut mask = vec![0u8; mask_len];
            for &stem_idx in &seg.active {
                let bit = bit_of[stem_idx];
                mask[bit / 8] |= 0x80 >> (bit % 8);
            }
            if let Some(w) = width_pending.take() {
                t2_number(&mut out, w)?;
            }
            t2_op(&mut out, 19); // hintmask
            out.extend_from_slice(&mask);
        }
        for op in &seg.ops {
            if let Some(w) = width_pending.take() {
                t2_number(&mut out, w)?;
            }
            match *op {
                PathOp::Move(dx, dy) => {
                    if dx == 0.0 {
                        t2_number(&mut out, dy)?;
                        t2_op(&mut out, 4); // vmoveto
                    } else if dy == 0.0 {
                        t2_number(&mut out, dx)?;
                        t2_op(&mut out, 22); // hmoveto
                    } else {
                        t2_number(&mut out, dx)?;
                        t2_number(&mut out, dy)?;
                        t2_op(&mut out, 21); // rmoveto
                    }
                }
                PathOp::Line(dx, dy) => {
                    if dy == 0.0 {
                        t2_number(&mut out, dx)?;
                        t2_op(&mut out, 6); // hlineto
                    } else if dx == 0.0 {
                        t2_number(&mut out, dy)?;
                        t2_op(&mut out, 7); // vlineto
                    } else {
                        t2_number(&mut out, dx)?;
                        t2_number(&mut out, dy)?;
                        t2_op(&mut out, 5); // rlineto
                    }
                }
                PathOp::Curve(a, b, c, d, e, f) => {
                    for v in [a, b, c, d, e, f] {
                        t2_number(&mut out, v)?;
                    }
                    t2_op(&mut out, 8); // rrcurveto
                }
            }
        }
    }
    if let Some(w) = width_pending.take() {
        t2_number(&mut out, w)?;
    }
    t2_op(&mut out, 14); // endchar
    Some(out)
}

// ---------------------------------------------------------------------------
// CFF assembly
// ---------------------------------------------------------------------------

/// CFF INDEX with minimal offset size. An empty INDEX is the 2-byte zero
/// count.
pub(crate) fn cff_index(items: &[Vec<u8>]) -> Option<Vec<u8>> {
    if items.is_empty() {
        return Some(vec![0, 0]);
    }
    let count = u16::try_from(items.len()).ok()?;
    let total: usize = items.iter().map(Vec::len).sum();
    let last_offset = total.checked_add(1)?;
    let off_size: u8 = match last_offset {
        0..=0xFF => 1,
        0x100..=0xFFFF => 2,
        0x1_0000..=0xFF_FFFF => 3,
        _ => 4,
    };
    let mut out = Vec::with_capacity(3 + (items.len() + 1) * usize::from(off_size) + total);
    out.extend_from_slice(&count.to_be_bytes());
    out.push(off_size);
    let mut offset = 1usize;
    for i in 0..=items.len() {
        let bytes = (offset as u32).to_be_bytes();
        out.extend_from_slice(&bytes[4 - usize::from(off_size)..]);
        if let Some(item) = items.get(i) {
            offset += item.len();
        }
    }
    for item in items {
        out.extend_from_slice(item);
    }
    Some(out)
}

/// DICT integer operand.
fn dict_int(out: &mut Vec<u8>, v: i32) {
    match v {
        -107..=107 => out.push((v + 139) as u8),
        108..=1131 => {
            let d = v - 108;
            out.push((d / 256 + 247) as u8);
            out.push((d % 256) as u8);
        }
        -1131..=-108 => {
            let d = -v - 108;
            out.push((d / 256 + 251) as u8);
            out.push((d % 256) as u8);
        }
        -32768..=32767 => {
            out.push(28);
            out.extend_from_slice(&(v as i16).to_be_bytes());
        }
        _ => {
            out.push(29);
            out.extend_from_slice(&v.to_be_bytes());
        }
    }
}

/// DICT real operand (nibble-BCD, format 30).
fn dict_real(out: &mut Vec<u8>, v: f64) -> Option<()> {
    if !v.is_finite() {
        return None;
    }
    let text = format!("{v}");
    let mut nibbles: Vec<u8> = Vec::with_capacity(text.len() + 2);
    let mut chars = text.bytes().peekable();
    while let Some(c) = chars.next() {
        match c {
            b'0'..=b'9' => nibbles.push(c - b'0'),
            b'.' => nibbles.push(0xa),
            b'-' => nibbles.push(0xe),
            b'e' | b'E' => {
                if chars.peek() == Some(&b'-') {
                    chars.next();
                    nibbles.push(0xc);
                } else {
                    if chars.peek() == Some(&b'+') {
                        chars.next();
                    }
                    nibbles.push(0xb);
                }
            }
            _ => return None,
        }
    }
    nibbles.push(0xf);
    if nibbles.len() % 2 == 1 {
        nibbles.push(0xf);
    }
    out.push(30);
    for pair in nibbles.as_chunks::<2>().0 {
        out.push((pair[0] << 4) | pair[1]);
    }
    Some(())
}

/// DICT numeric operand: integer form when exact, BCD real otherwise.
pub(crate) fn dict_number(out: &mut Vec<u8>, v: f64) -> Option<()> {
    if v.fract() == 0.0 && (f64::from(i32::MIN)..=f64::from(i32::MAX)).contains(&v) {
        dict_int(out, v as i32);
        Some(())
    } else {
        dict_real(out, v)
    }
}

pub(crate) fn dict_op(out: &mut Vec<u8>, op: u16) {
    if op > 0xFF {
        out.push(12);
        out.push((op & 0xFF) as u8);
    } else {
        out.push(op as u8);
    }
}

/// Fixed-width (5-byte) DICT integer, for offsets resolved after layout.
pub(crate) fn dict_int32(out: &mut Vec<u8>, v: u32) {
    out.push(29);
    out.extend_from_slice(&(v as i32).to_be_bytes());
}

fn dict_delta(out: &mut Vec<u8>, values: &[f64]) -> Option<()> {
    let mut prev = 0.0f64;
    for &v in values {
        dict_number(out, v - prev)?;
        prev = v;
    }
    Some(())
}

/// Emit the CFF Private DICT from the Type1 hints plus width parameters.
fn private_dict(hints: &PrivateHints, default_width: f64, nominal_width: f64) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    if !hints.blue_values.is_empty() {
        dict_delta(&mut out, &hints.blue_values)?;
        dict_op(&mut out, 6);
    }
    if !hints.other_blues.is_empty() {
        dict_delta(&mut out, &hints.other_blues)?;
        dict_op(&mut out, 7);
    }
    if !hints.family_blues.is_empty() {
        dict_delta(&mut out, &hints.family_blues)?;
        dict_op(&mut out, 8);
    }
    if !hints.family_other_blues.is_empty() {
        dict_delta(&mut out, &hints.family_other_blues)?;
        dict_op(&mut out, 9);
    }
    if let Some(v) = hints.blue_scale {
        dict_number(&mut out, v)?;
        dict_op(&mut out, 0x0C09);
    }
    if let Some(v) = hints.blue_shift {
        dict_number(&mut out, v)?;
        dict_op(&mut out, 0x0C0A);
    }
    if let Some(v) = hints.blue_fuzz {
        dict_number(&mut out, v)?;
        dict_op(&mut out, 0x0C0B);
    }
    if let Some(v) = hints.std_hw {
        dict_number(&mut out, v)?;
        dict_op(&mut out, 10);
    }
    if let Some(v) = hints.std_vw {
        dict_number(&mut out, v)?;
        dict_op(&mut out, 11);
    }
    if !hints.stem_snap_h.is_empty() {
        dict_delta(&mut out, &hints.stem_snap_h)?;
        dict_op(&mut out, 0x0C0C);
    }
    if !hints.stem_snap_v.is_empty() {
        dict_delta(&mut out, &hints.stem_snap_v)?;
        dict_op(&mut out, 0x0C0D);
    }
    if let Some(v) = hints.force_bold {
        dict_int(&mut out, i32::from(v));
        dict_op(&mut out, 0x0C0E);
    }
    if let Some(v) = hints.language_group {
        dict_number(&mut out, v)?;
        dict_op(&mut out, 0x0C11);
    }
    dict_number(&mut out, default_width)?;
    dict_op(&mut out, 20);
    dict_number(&mut out, nominal_width)?;
    dict_op(&mut out, 21);
    Some(out)
}

/// Convert `font` to a CFF (Type1C) subset containing `.notdef` plus the
/// glyphs named in `keep` (names without a charstring must not be passed).
pub(crate) fn convert_to_cff(
    font: &Type1Font,
    keep: &std::collections::BTreeSet<Vec<u8>>,
) -> Option<Vec<u8>> {
    if font.paint_type != 0.0 {
        return None;
    }
    if !font.has_glyph(b".notdef") {
        return None;
    }

    // Glyph order: .notdef, then encoded glyphs (by lowest built-in code —
    // the CFF format-0 encoding requires encoded glyphs to be a prefix of
    // the glyph order), then unencoded glyphs by name.
    let mut codes_of: BTreeMap<&[u8], Vec<u8>> = BTreeMap::new();
    for (code, entry) in font.encoding.iter().enumerate() {
        if let Some(name) = entry {
            if name != b".notdef" && keep.contains(name.as_slice()) {
                codes_of
                    .entry(name.as_slice())
                    .or_default()
                    .push(code as u8);
            }
        }
    }
    let mut encoded: Vec<&[u8]> = codes_of.keys().copied().collect();
    encoded.sort_by_key(|name| codes_of[name][0]);
    let mut order: Vec<&[u8]> = vec![b".notdef"];
    order.extend(encoded.iter().copied());
    for name in keep {
        if name.as_slice() != b".notdef" && !codes_of.contains_key(name.as_slice()) {
            order.push(name.as_slice());
        }
    }
    if order.len() > usize::from(u16::MAX) {
        return None;
    }

    // Interpret every kept glyph.
    let mut glyphs: Vec<Glyph> = Vec::with_capacity(order.len());
    for name in &order {
        glyphs.push(interpret_glyph(font, name, true)?);
    }

    // Width parameters: defaultWidthX = most common width; nominalWidthX
    // equal to it keeps the deltas small.
    let mut freq: BTreeMap<u64, usize> = BTreeMap::new();
    for g in &glyphs {
        *freq.entry(g.width.to_bits()).or_insert(0) += 1;
    }
    let default_width = f64::from_bits(
        freq.iter()
            .max_by_key(|(_, &count)| count)
            .map(|(&bits, _)| bits)?,
    );
    let nominal_width = default_width;

    let charstrings: Vec<Vec<u8>> = glyphs
        .iter()
        .map(|g| emit_charstring(g, default_width, nominal_width))
        .collect::<Option<_>>()?;

    // Strings: every non-standard-need is custom (deliberately no standard-
    // strings table: custom SIDs are valid CFF and remove a large constant
    // table as a typo surface; Flate absorbs the byte cost).
    let mut strings: Vec<Vec<u8>> = Vec::new();
    let sid_of = |name: &[u8], strings: &mut Vec<Vec<u8>>| -> Option<u16> {
        if name == b".notdef" {
            return Some(0);
        }
        if let Some(pos) = strings.iter().position(|s| s == name) {
            return u16::try_from(391 + pos).ok();
        }
        strings.push(name.to_vec());
        u16::try_from(391 + strings.len() - 1).ok()
    };

    // Charset (format 0): SIDs for glyphs 1..n.
    let mut charset = vec![0u8];
    for name in &order[1..] {
        let sid = sid_of(name, &mut strings)?;
        charset.extend_from_slice(&sid.to_be_bytes());
    }

    // Encoding (format 0 + supplements): the built-in Type1 encoding
    // restricted to retained glyphs.
    let n_encoded = encoded.len();
    let mut enc_codes: Vec<u8> = Vec::with_capacity(n_encoded);
    let mut supplements: Vec<(u8, u16)> = Vec::new();
    for name in &encoded {
        let codes = &codes_of[name];
        enc_codes.push(codes[0]);
        for &extra in &codes[1..] {
            let sid = sid_of(name, &mut strings)?;
            supplements.push((extra, sid));
        }
    }
    let mut encoding = Vec::with_capacity(2 + n_encoded + 1 + supplements.len() * 3);
    encoding.push(if supplements.is_empty() { 0u8 } else { 0x80 });
    encoding.push(u8::try_from(n_encoded).ok()?);
    encoding.extend_from_slice(&enc_codes);
    if !supplements.is_empty() {
        encoding.push(u8::try_from(supplements.len()).ok()?);
        for (code, sid) in &supplements {
            encoding.push(*code);
            encoding.extend_from_slice(&sid.to_be_bytes());
        }
    }

    let charstrings_index = cff_index(&charstrings)?;
    let private = private_dict(&font.private, default_width, nominal_width)?;

    // Top DICT: fixed-width offset operands make the layout a single pass.
    let default_matrix = [0.001, 0.0, 0.0, 0.001, 0.0, 0.0];
    let mut top_prefix = Vec::new();
    if font.font_matrix != default_matrix {
        for v in font.font_matrix {
            dict_number(&mut top_prefix, v)?;
        }
        dict_op(&mut top_prefix, 0x0C07);
    }
    for v in font.font_bbox {
        dict_number(&mut top_prefix, v)?;
    }
    dict_op(&mut top_prefix, 5);

    // charset(15) + Encoding(16) + CharStrings(17): 5-byte operand + 1-byte
    // op each; Private(18): two 5-byte operands + 1-byte op.
    let top_dict_len = top_prefix.len() + (5 + 1) * 3 + (5 + 5 + 1);
    let header = [1u8, 0, 4, 4];
    let name_index = cff_index(std::slice::from_ref(&font.font_name))?;
    let top_index = cff_index(&[vec![0u8; top_dict_len]])?;
    let string_index = cff_index(&strings)?;
    let gsubr_index = cff_index(&[])?;

    let fixed =
        header.len() + name_index.len() + top_index.len() + string_index.len() + gsubr_index.len();
    let charset_at = fixed;
    let encoding_at = charset_at + charset.len();
    let charstrings_at = encoding_at + encoding.len();
    let private_at = charstrings_at + charstrings_index.len();

    let mut top_dict = top_prefix;
    dict_int32(&mut top_dict, u32::try_from(charset_at).ok()?);
    dict_op(&mut top_dict, 15);
    dict_int32(&mut top_dict, u32::try_from(encoding_at).ok()?);
    dict_op(&mut top_dict, 16);
    dict_int32(&mut top_dict, u32::try_from(charstrings_at).ok()?);
    dict_op(&mut top_dict, 17);
    dict_int32(&mut top_dict, u32::try_from(private.len()).ok()?);
    dict_int32(&mut top_dict, u32::try_from(private_at).ok()?);
    dict_op(&mut top_dict, 18);
    debug_assert_eq!(top_dict.len(), top_dict_len);
    let top_index = cff_index(&[top_dict])?;

    let mut out = Vec::with_capacity(private_at + private.len());
    out.extend_from_slice(&header);
    out.extend_from_slice(&name_index);
    out.extend_from_slice(&top_index);
    out.extend_from_slice(&string_index);
    out.extend_from_slice(&gsubr_index);
    out.extend_from_slice(&charset);
    out.extend_from_slice(&encoding);
    out.extend_from_slice(&charstrings_index);
    out.extend_from_slice(&private);
    Some(out)
}



}

use std::collections::HashMap;

use image::{DynamicImage, ImageFormat};
use lopdf::content::Content;
use lopdf::{dictionary, Document, Object, ObjectId};
use rayon::prelude::*;

/// Target resolution for downsampled images, in dots per inch.
const TARGET_DPI: f32 = 130.0;
/// JPEG quality (0-100) for re-encoded images.
const JPEG_QUALITY: u8 = 78;
/// Only downsample when the effective DPI exceeds the target by this factor,
/// so we don't churn images that are already close to ideal.
const DPI_MARGIN: f32 = 1.15;

/// Options for [`optimize_with_options`]. Defaults preserve the input's
/// accessibility data and use the simpler (non-packed) save path.
///
/// As a library, amatl is accessibility-preserving by default. Callers who
/// know their audience (e.g. sighted-only retail promotions) can opt in to
/// `strip_accessibility` for ~18 percentage points of additional reduction.
/// Stripping removes the PDF structure tree (`/StructTreeRoot`, `/MarkInfo`,
/// `/Lang`), which screen readers use to navigate the document semantically.
/// Visually, the output is identical.
///
/// `pack_object_streams` controls whether eligible non-stream objects are
/// packed into PDF 1.5 `ObjStm` streams with a binary xref stream. Default
/// `true` (it was `false` through 0.3.0). The saving scales with
/// the *object* count, not the file size: on the 58-page NASA reference at
/// otherwise-default settings — object-heavy, structure tree intact, 2,497
/// objects — packing measured **−162,069 B (3.27%)**, replacing ~168 KB of
/// plaintext object bodies and their `N G obj … endobj` framing with a single
/// 41 KB `ObjStm`. Documents with few non-stream objects left to pack (e.g.
/// after `strip_accessibility`) gain proportionally less.
///
/// The cost is a **PDF 1.5 floor**: a reader older than Acrobat 6 (2003)
/// cannot open an `ObjStm` file *at all* — a hard failure, not a degradation.
/// Set this to `false` (CLI: `--no-pack-object-streams`) when the audience may
/// include such readers. Implemented in pure Rust (no native deps) to avoid
/// bundling an external tool such as qpdf.
///
/// # Example
///
/// ```ignore
/// use talaria_lib::amatl::OptimizeOptions;
/// let opts = OptimizeOptions::default()
///     .with_strip_accessibility(true)
///     .with_target_dpi(110.0);
/// ```
///
/// `#[non_exhaustive]`: construct via [`OptimizeOptions::default()`] plus the
/// `with_*` setters, never a struct literal. This lets future options ship in a
/// *minor* release instead of a breaking one once amatl is published.
#[derive(Debug, Clone, Copy)]
#[non_exhaustive]
pub struct OptimizeOptions {
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

    /// If true, remove the PDF's structure tree (accessibility metadata) for
    /// additional size reduction. Visually lossless; accessibility-lossy.
    /// Default: `false`.
    pub strip_accessibility: bool,

    /// If true, remove every `/Metadata` entry (XMP packets on the catalog,
    /// pages, and XObjects). Visually lossless — no viewer consults XMP to
    /// render — but it discards document provenance and breaks PDF/A and
    /// PDF/UA identification, so it is strictly opt-in. Producers that write a
    /// full XMP packet per page/XObject can spend a double-digit percentage of
    /// the file on it (adobe-spec: 860 KB, 12%). Default: `false`.
    pub strip_metadata: bool,

    /// If true, pack eligible non-stream objects into PDF 1.5 `ObjStm` streams
    /// with a binary cross-reference stream (additional structural
    /// compression). Default: `true` (was `false` through 0.3.0). Lossless —
    /// same objects, same semantics, different serialization — but it imposes
    /// a PDF 1.5 floor on the output. See struct doc for the measured benefit
    /// and the escape hatch.
    pub pack_object_streams: bool,

    /// Downsample over-resolution FlateDecode raster images in place (format
    /// preserved: the result is still FlateDecode with the same `/ColorSpace`,
    /// so no JPEG artifacts are introduced). Applies the same effective-DPI
    /// threshold as the JPEG path. Default: `true`.
    pub downsample_flate_images: bool,

    /// Subset embedded fonts to the glyphs the document actually shows:
    /// Type0/CIDFontType2 (Identity-H/V) fonts, and nonsymbolic simple
    /// TrueType fonts with WinAnsi/MacRoman encodings (incl. `/Differences`).
    /// Only the font program is replaced (plus `/CIDToGIDMap` on the Type0
    /// path and the subset name tag): content-stream text bytes are never
    /// rewritten, and `/W`, `/DW`, `/Widths`, `/Encoding`, and `/ToUnicode`
    /// stay untouched, so text extraction is bit-identical. Any parse
    /// uncertainty disables subsetting for the affected font or the whole
    /// document — output is always valid. PDF/A-declared and encrypted
    /// documents are skipped. Default: `true` (was `false` through 0.3.1;
    /// rendering-preserving and verified, so it joined the lossless
    /// defaults).
    pub subset_fonts: bool,

    /// Convert embedded Type1 (`/FontFile`) fonts to subsetted Type1C/CFF
    /// (`/FontFile3`), the same re-encoding Ghostscript applies. Charstrings
    /// are re-expressed as Type2 with outlines preserved exactly (flex
    /// becomes the curves it rasterizes as, `seac` composites are inlined,
    /// stem hints and widths carry over); only the glyphs the document shows
    /// are retained. The font dictionary's `/Encoding`, `/Widths`, and
    /// `/ToUnicode` never change (the CFF replicates the font's built-in
    /// encoding, so every name-lookup path resolves as before) and each font
    /// is swapped only when the new stream is strictly smaller. Any parse or
    /// conversion doubt — MM OtherSubrs, non-zero `/PaintType`, encoding
    /// constructions we cannot replicate — leaves that font untouched.
    /// Default: `false` (opt-in for at least one release cycle).
    pub convert_type1: bool,

    /// Strip font hinting.
    ///
    /// For TrueType (`/FontFile2`) subsets: the `fpgm`, `prep`, and `cvt `
    /// tables plus every per-glyph instruction block. Only takes effect where
    /// `subset_fonts` already rewrites the program.
    ///
    /// For Type1C / CFF (`/FontFile3`) programs: the Type2 hint operators
    /// (`hstem`, `vstem`, `hstemhm`, `vstemhm`, `hintmask`, `cntrmask`) and
    /// their operands, plus the Private DICT hinting parameters
    /// (`BlueValues`, `StemSnap*`, …) that describe nothing once they are
    /// gone. This one applies to *every* Type1C program in the document,
    /// including the ones this run produced by union-merging fragments or
    /// converting Type1 — a hint strip changes no glyph name, glyph order, or
    /// advance width, so it is inert to every font dictionary pointing at the
    /// program. Coordinates are never re-encoded: charstrings are rewritten
    /// token by token and each glyph's outline and advance are re-verified
    /// from the emitted bytes.
    ///
    /// In both cases outlines, metrics, and character mappings are untouched,
    /// but hinted rasterization at small sizes can change (modern viewers
    /// largely ignore hinting; classic Windows GDI paths do not), so this is
    /// NOT covered by the pixel-identity contract and is strictly opt-in.
    /// Default: `false`.
    pub strip_hinting: bool,

    /// Losslessly recompress bitonal (1-bit) images to CCITT G4: CCITT-stored
    /// sources (G4 `/K -1`, or EOL-framed G3 `/K 0` with `/EndOfLine true`)
    /// and Flate-stored 1-bit images. Pixels are never resampled and
    /// `/Width`/`/Height` never change; `/BlackIs1` polarity is normalized at
    /// the sample level so rendered output is bit-identical. A stream is
    /// replaced only when the G4 payload is strictly smaller AND a decode-back
    /// pass reproduces the source samples exactly; every parse or parameter
    /// doubt (`/EncodedByteAlign true`, `/K > 0`, non-identity `/Decode`, …)
    /// leaves the image untouched. Default: `false` (opt-in for at least one
    /// release cycle).
    pub recompress_bitonal_images: bool,

    /// Allow LOSSY re-encoding of lossless (FlateDecode) raster images to
    /// JPEG (`/DCTDecode`) — an encoding-class change, which the library
    /// contract otherwise forbids, so this is strictly opt-in consent
    /// (Phase 7 spike). Scope: unmasked 8-bit DeviceGray / DeviceRGB /
    /// ICCBased(N=1/3) FlateDecode images only. Over-resolution images get a
    /// JPEG candidate at the same target geometry as the format-preserving
    /// downsample and the smaller candidate wins; images at/below the DPI
    /// threshold are re-encoded at their own geometry, replaced only when the
    /// JPEG saves at least 5% AND passes decode-back verification. Indexed,
    /// CMYK, and non-8-bit images are never converted. Images with an eligible
    /// `/SMask` convert too: on the dimension-preserving path the mask
    /// stream's bytes and geometry are never modified, so base/mask alignment
    /// is preserved by construction, and on the over-resolution coupled
    /// downsample the JPEG candidate is computed at the SAME target geometry
    /// the mask is losslessly resampled to, so the two land on identical pixel
    /// grids (both validated by the mask-alignment compositing experiment — a
    /// hard-edged or antialiased mask over a q78 4:2:0 base shows no
    /// misregistration, only the JPEG quantization this flag consents to).
    /// Default: `false`.
    pub allow_lossy_reencode: bool,

    /// Collapse channel-identical `/DeviceRGB` FlateDecode images to
    /// `/DeviceGray`: when EVERY pixel has R == G == B exactly, store the
    /// single channel instead of three. Sample-preserving — the decoded
    /// value of each pixel is unchanged, and the PDF color model defines
    /// DeviceGray g as DeviceRGB (g, g, g) — but it does rewrite
    /// `/ColorSpace`, so like the bitonal G4 recompression it stays opt-in
    /// for at least one release cycle. Scope: unmasked-or-SMasked 8-bit
    /// plain-`/DeviceRGB` images only (ICCBased color is never collapsed —
    /// dropping a profile is not sample-preserving in color meaning; a
    /// color-key `/Mask` is RGB-range-based and disqualifies). Replaced only
    /// when the gray stream is strictly smaller. Default: `false`.
    pub collapse_gray_images: bool,

    /// Deflate implementation for the final serialization passes: the
    /// whole-document re-deflate (`redeflate_flate_streams`) and the
    /// cross-reference stream. [`DeflateBackend::Zopfli`] spends ~30× the CPU
    /// of zlib level 9 searching for a smaller deflate encoding of the SAME
    /// bytes (measured −142 KB / 3.2% of output on the NASA reference); the
    /// strictly-smaller + inflate-back guard applies to both backends, so the
    /// choice affects size and speed only, never correctness. Earlier
    /// planning passes (image re-deflate, font streams) stay on zlib either
    /// way — the final pass revisits their output. Default:
    /// [`DeflateBackend::Zlib`].
    pub deflate_backend: DeflateBackend,
}

/// Which deflate implementation the final re-deflate and xref-stream passes
/// use. See [`OptimizeOptions::deflate_backend`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum DeflateBackend {
    /// zlib level 9 via `flate2`'s zlib-rs backend — fast, the default.
    #[default]
    Zlib,
    /// Exhaustive-search deflate (pure-Rust `zopfli` crate) — smallest
    /// output, ~30× the CPU. Opt-in for callers who value bytes over speed.
    Zopfli,
}

/// Written by hand, NOT derived: a derived `Default` would zero the numeric
/// fields, making `target_dpi` 0.0 and collapsing every image toward 1px. The
/// module consts are the single source of truth for the measured sweet spot.
/// `default_options_match_documented_sweet_spot` pins these values.
impl Default for OptimizeOptions {
    fn default() -> Self {
        Self {
            target_dpi: TARGET_DPI,
            jpeg_quality: JPEG_QUALITY,
            dpi_margin: DPI_MARGIN,
            strip_accessibility: false,
            strip_metadata: false,
            pack_object_streams: true,
            downsample_flate_images: true,
            // `subset_fonts` is default-ON, matching upstream 0.3.x: it is
            // rendering-preserving (text extraction bit-identical) and
            // verified in the standalone crate's suite. Opt out via
            // `.with_subset_fonts(false)`.
            subset_fonts: true,
            convert_type1: false,
            strip_hinting: false,
            recompress_bitonal_images: false,
            allow_lossy_reencode: false,
            collapse_gray_images: false,
            deflate_backend: DeflateBackend::Zlib,
        }
    }
}

/// Chainable setters. Because the struct is `#[non_exhaustive]`, these are the
/// only way an external crate can configure it — which is what keeps adding a
/// future option a non-breaking (minor) release. `Copy`, so taking `self` by
/// value is cheap.
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

    /// Enable/disable stripping every `/Metadata` (XMP) entry.
    #[must_use]
    pub fn with_strip_metadata(mut self, strip: bool) -> Self {
        self.strip_metadata = strip;
        self
    }

    /// Enable/disable PDF 1.5 object-stream packing.
    #[must_use]
    pub fn with_pack_object_streams(mut self, pack: bool) -> Self {
        self.pack_object_streams = pack;
        self
    }

    /// Enable/disable in-place downsampling of over-resolution FlateDecode
    /// raster images (on by default).
    #[must_use]
    pub fn with_downsample_flate_images(mut self, downsample: bool) -> Self {
        self.downsample_flate_images = downsample;
        self
    }

    /// Enable/disable subsetting of embedded Type0/CIDFontType2 fonts
    /// (off by default). See [`OptimizeOptions::subset_fonts`].
    #[must_use]
    pub fn with_subset_fonts(mut self, subset: bool) -> Self {
        self.subset_fonts = subset;
        self
    }

    /// Enable/disable Type1 → Type1C (CFF) font conversion
    /// (off by default). See [`OptimizeOptions::convert_type1`].
    #[must_use]
    pub fn with_convert_type1(mut self, convert: bool) -> Self {
        self.convert_type1 = convert;
        self
    }

    /// Set whether subsetted TrueType programs also lose their hinting
    /// (off by default; not pixel-identical). See
    /// [`OptimizeOptions::strip_hinting`].
    #[must_use]
    pub fn with_strip_hinting(mut self, strip: bool) -> Self {
        self.strip_hinting = strip;
        self
    }

    /// Enable/disable lossless G4 recompression of bitonal images
    /// (off by default). See [`OptimizeOptions::recompress_bitonal_images`].
    #[must_use]
    pub fn with_recompress_bitonal_images(mut self, recompress: bool) -> Self {
        self.recompress_bitonal_images = recompress;
        self
    }

    /// Enable/disable lossy Flate→JPEG re-encoding of lossless images
    /// (off by default). See [`OptimizeOptions::allow_lossy_reencode`].
    #[must_use]
    pub fn with_allow_lossy_reencode(mut self, allow: bool) -> Self {
        self.allow_lossy_reencode = allow;
        self
    }

    /// Enable/disable collapsing channel-identical DeviceRGB Flate images to
    /// DeviceGray (off by default). See
    /// [`OptimizeOptions::collapse_gray_images`].
    #[must_use]
    pub fn with_collapse_gray_images(mut self, collapse: bool) -> Self {
        self.collapse_gray_images = collapse;
        self
    }

    /// Choose the deflate backend for the final re-deflate and xref-stream
    /// passes (zlib by default). See [`OptimizeOptions::deflate_backend`].
    #[must_use]
    pub fn with_deflate_backend(mut self, backend: DeflateBackend) -> Self {
        self.deflate_backend = backend;
        self
    }
}

/// Optimize a PDF with default options (accessibility data preserved), returning
/// smaller bytes when possible. On any failure or if the result is not smaller,
/// the original bytes are returned unchanged. Equivalent to
/// [`optimize_with_options`] with [`OptimizeOptions::default()`].
pub fn optimize(input: &[u8]) -> Vec<u8> {
    optimize_with_options(input, OptimizeOptions::default())
}

/// Optimize a PDF with the given options, returning smaller bytes when possible.
/// On any failure or if the result is not smaller, the original bytes are
/// returned unchanged.
///
/// # Fail-safe contract (invariant)
///
/// For any `input: &[u8]` — including malformed PDFs, truncated streams,
/// crafted attacker input, and empty slices — this function returns without
/// panicking. On any error, panic, or non-shrinking result, the returned
/// bytes equal `input`. Callers can treat the output as always valid and
/// always at most as large as the input.
///
/// This is enforced by a [`std::panic::catch_unwind`] boundary that turns any
/// panic in the JPEG decoder, mozjpeg encoder, or lopdf into the same graceful
/// fallback as a `Result::Err`. The regression tests
/// `crafted_pdf_panic_is_caught_not_unwound`, `degenerate_inputs_do_not_panic`,
/// and `invalid_pdf_falls_back_to_original` pin the three failure shapes
/// (panic, degenerate input, parse error); do not remove them.
pub fn optimize_with_options(input: &[u8], options: OptimizeOptions) -> Vec<u8> {
    // amatl optimizes arbitrary user-supplied PDFs, and its contract is to
    // return the original bytes on ANY failure. try_optimize handles the
    // expected error paths (Result::Err), but a crafted PDF could still trigger
    // a panic deep in the JPEG decoder, the mozjpeg encoder, or lopdf. Catch it
    // here so a panic becomes the same graceful fallback as any other failure.
    let result = std::panic::catch_unwind(|| try_optimize(input, options));
    match result {
        // A rewritten document that actually got smaller. Everything else —
        // Ok(None) (nothing to do), a lopdf error, or a caught panic — falls
        // through to returning the input unchanged.
        Ok(Ok(Some(out))) if out.len() < input.len() => out,
        _ => input.to_vec(),
    }
}

/// A 2x3 affine transform `[a b c d e f]`, the PDF current transformation
/// matrix. Maps (x, y) -> (a*x + c*y + e, b*x + d*y + f).
#[derive(Clone, Copy)]
struct Mat {
    a: f32,
    b: f32,
    c: f32,
    d: f32,
    e: f32,
    f: f32,
}

impl Mat {
    const IDENTITY: Mat = Mat {
        a: 1.0,
        b: 0.0,
        c: 0.0,
        d: 1.0,
        e: 0.0,
        f: 0.0,
    };

    /// Concatenate: `self` applied first, then `then` (PDF `cm` semantics with
    /// `then` being the pre-existing CTM).
    fn concat(self, then: Mat) -> Mat {
        Mat {
            a: self.a * then.a + self.b * then.c,
            b: self.a * then.b + self.b * then.d,
            c: self.c * then.a + self.d * then.c,
            d: self.c * then.b + self.d * then.d,
            e: self.e * then.a + self.f * then.c + then.e,
            f: self.e * then.b + self.f * then.d + then.f,
        }
    }

    /// Length in points of the transformed unit-square width edge (1,0).
    fn rendered_width(&self) -> f32 {
        (self.a * self.a + self.b * self.b).sqrt()
    }

    /// Length in points of the transformed unit-square height edge (0,1).
    fn rendered_height(&self) -> f32 {
        (self.c * self.c + self.d * self.d).sqrt()
    }
}

fn num(obj: &Object) -> f32 {
    match obj {
        Object::Integer(i) => *i as f32,
        Object::Real(r) => *r,
        _ => 0.0,
    }
}

/// Follow reference chains to the concrete object (bounded to avoid cycles).
fn resolve<'a>(doc: &'a Document, mut obj: &'a Object) -> &'a Object {
    for _ in 0..8 {
        match obj {
            Object::Reference(id) => match doc.get_object(*id) {
                Ok(next) => obj = next,
                Err(_) => break,
            },
            _ => break,
        }
    }
    obj
}

/// Resolve a page's `Resources` dict, climbing the `Parent` chain since
/// resources can be inherited from the page tree.
fn page_resources(doc: &Document, page_id: ObjectId) -> Option<&lopdf::Dictionary> {
    let mut current = page_id;
    for _ in 0..32 {
        let dict = doc.get_object(current).ok()?.as_dict().ok()?;
        if let Ok(res) = dict.get(b"Resources") {
            return resolve(doc, res).as_dict().ok();
        }
        match dict.get(b"Parent") {
            Ok(Object::Reference(parent)) => current = *parent,
            _ => break,
        }
    }
    None
}

/// Map of image-XObject resource names to their object id for one page.
fn page_image_names(doc: &Document, page_id: ObjectId) -> HashMap<Vec<u8>, ObjectId> {
    let mut map = HashMap::new();
    let Some(resources) = page_resources(doc, page_id) else {
        return map;
    };
    let Ok(xobjects) = resources.get(b"XObject").map(|x| resolve(doc, x)) else {
        return map;
    };
    let Ok(xobjects) = xobjects.as_dict() else {
        return map;
    };
    for (name, value) in xobjects.iter() {
        if let Object::Reference(id) = value {
            map.insert(name.clone(), *id);
        }
    }
    map
}

/// Largest on-page rendered size (in points) for each image object id, across
/// every placement on every page. We size to the largest use so a shared image
/// is never under-resolved.
fn collect_placements(doc: &Document) -> HashMap<ObjectId, (f32, f32)> {
    let mut sizes: HashMap<ObjectId, (f32, f32)> = HashMap::new();

    for (_, page_id) in doc.get_pages() {
        let names = page_image_names(doc, page_id);
        if names.is_empty() {
            continue;
        }
        let content_bytes = doc.get_page_content(page_id);
        let Ok(content) = Content::decode(&content_bytes) else {
            continue;
        };

        let mut ctm = Mat::IDENTITY;
        let mut stack: Vec<Mat> = Vec::new();

        for op in content.operations {
            match op.operator.as_str() {
                "q" => stack.push(ctm),
                "Q" => {
                    if let Some(prev) = stack.pop() {
                        ctm = prev;
                    }
                }
                "cm" if op.operands.len() == 6 => {
                    let m = Mat {
                        a: num(&op.operands[0]),
                        b: num(&op.operands[1]),
                        c: num(&op.operands[2]),
                        d: num(&op.operands[3]),
                        e: num(&op.operands[4]),
                        f: num(&op.operands[5]),
                    };
                    ctm = m.concat(ctm);
                }
                "Do" => {
                    if let Some(Object::Name(name)) = op.operands.first() {
                        if let Some(id) = names.get(name) {
                            let (w, h) = (ctm.rendered_width(), ctm.rendered_height());
                            let entry = sizes.entry(*id).or_insert((0.0, 0.0));
                            entry.0 = entry.0.max(w);
                            entry.1 = entry.1.max(h);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    sizes
}

/// Dictionary edits that accompany a replacement's new stream bytes, beyond
/// the always-updated `/Width`/`/Height`.
enum DictUpdate {
    /// JPEG path: the payload is still raw DCTDecode, nothing else changes.
    Dct,
    /// Flate path: normalize `/Filter` to the scalar name and set the new
    /// `/DecodeParms` (Up-predictor variant) or remove it (plain deflate).
    Flate {
        decode_parms: Option<lopdf::Dictionary>,
    },
    /// Phase 7 spike (consent-gated): a FlateDecode payload became a JPEG.
    /// `/Filter` becomes the scalar `/DCTDecode` and any `/DecodeParms` (a
    /// Flate-predictor artifact, meaningless for DCT) is dropped.
    /// `/ColorSpace` and `/BitsPerComponent` are deliberately NOT rewritten:
    /// the conversion is only planned for 8-bit DeviceGray / DeviceRGB /
    /// ICCBased(N=1/3) sources and the JPEG preserves the channel count
    /// (gray → 1-channel, RGB → 3-channel), so the existing entries still
    /// describe the payload exactly.
    FlateToJpeg,
}

/// A planned image replacement, computed read-only before mutating the doc.
struct Replacement {
    id: ObjectId,
    content: Vec<u8>,
    width: i64,
    height: i64,
    dict_update: DictUpdate,
    /// Phase 5 D-M2: a paired `/SMask` stream replacement, applied atomically
    /// with the base (the mask/image unit rule — never one side alone). `None`
    /// for single-stream replacements (unmasked downsample, D-M1 requant).
    smask: Option<MaskReplacement>,
}

/// Phase 5 D-M2: the `/SMask` stream's half of a coupled downsampling. The
/// mask is re-encoded as plain FlateDecode 8-bit DeviceGray rows at the WIDTH
/// AND HEIGHT of the base's target geometry.
struct MaskReplacement {
    mask_id: ObjectId,
    content: Vec<u8>,
    width: i64,
    height: i64,
}

/// The single-filter classes the re-encode paths know how to handle.
/// `plan_replacement` (downsampling) consumes Dct/Flate; the lossless bitonal
/// pass (`bitonal::plan_bitonal_recompressions`) consumes Ccitt/Flate.
#[derive(Debug, PartialEq, Eq)]
enum FilterClass {
    DctOnly,
    FlateOnly,
    CcittOnly,
    /// `/JPXDecode`: JPEG2000, a JP2 container or bare codestream. Decodable
    /// via the pure-Rust `dicom-toolkit-jpeg2000` crate, but ONLY the
    /// consent-gated `JPX→JPEG` conversion under `--allow-lossy` uses it (see
    /// `plan_jpx_conversions`); every default-options path still declines the
    /// class wholesale. A lossless `JPX→Flate` was considered and rejected:
    /// irreversible (9/7) codestreams decode with implementation-specific
    /// rounding, so "the pixels we decoded" are not provably the pixels the
    /// viewer's decoder produces — not render-identical — and deflate never
    /// beats JPEG2000 on the photographic payloads the format carries anyway.
    JpxOnly,
    /// `/JBIG2Decode`: lossless JBIG2 bilevel compression, seen in scanned
    /// office / fax archives. No JBIG2 decoder is linked. Recognized so it is
    /// never treated as DCT/Flate/CCITT; always left untouched.
    Jbig2Only,
    Other,
}

/// Classify a stream's `/Filter`: exactly DCTDecode (raw JPEG payload),
/// exactly FlateDecode (deflated raster data), exactly CCITTFaxDecode (raw
/// CCITT bitstream), `/JPXDecode` (JPEG2000) and `/JBIG2Decode` (JBIG2) or
/// anything else. The exotic classes are recognized-and-declined: they are
/// never handed to a re-encode path (which has no decoder for them). Both the
/// scalar-name and one-element-array forms are recognized.
fn classify_filter(doc: &Document, filter: &Object) -> FilterClass {
    let name = match resolve(doc, filter) {
        Object::Name(n) => n.as_slice(),
        Object::Array(items) if items.len() == 1 => match resolve(doc, &items[0]) {
            Object::Name(n) => n.as_slice(),
            _ => return FilterClass::Other,
        },
        _ => return FilterClass::Other,
    };
    match name {
        b"DCTDecode" => FilterClass::DctOnly,
        b"FlateDecode" => FilterClass::FlateOnly,
        b"CCITTFaxDecode" => FilterClass::CcittOnly,
        b"JPXDecode" => FilterClass::JpxOnly,
        b"JBIG2Decode" => FilterClass::Jbig2Only,
        _ => FilterClass::Other,
    }
}

/// How the caller intends to transform a masked pair (Phase 6 P-M1). A
/// dimension-preserving requantization never touches the mask, so a mask
/// shared by several bases stays valid for every consumer; any RESIZE of a
/// shared mask would break the other consumers' pixel alignment, so only the
/// resize intent carries the shared-mask refcount guard.
#[derive(Clone, Copy)]
enum SmaskUse {
    /// D-M1/P-M1 requantization: base re-encoded at its own geometry, mask
    /// stream never modified.
    Requant,
    /// D-M2/D-M3 coupled downsample: base and mask change geometry together.
    Resize,
}

/// Phase 5 D-M1: return the mask's object id when the `/SMask` value resolves
/// to a plain 8-bit DeviceGray image stream — `/ImageMask` stencil unset, no
/// `/Matte` (premultiplied color semantics are not understood), exactly 8 bits
/// per component. Any doubt returns `None` (unresolvable reference, not an
/// image object, other color space, other bpc, stencil flag set), leaving the
/// masked pair untouched. `SmaskUse::Resize` additionally applies the
/// shared-mask refcount guard; `SmaskUse::Requant` deliberately does not
/// (Phase 6 P-M1 — see `SmaskUse`).
fn eligible_smask(doc: &Document, smask: &Object, usage: SmaskUse) -> Option<ObjectId> {
    // The `/SMask` value is normally a direct reference. Take the id from the
    // RAW value (not `resolve`, which would already have dereferenced it to
    // the mask stream itself) and only then look the stream up.
    let mask_id = match smask {
        Object::Reference(id) => *id,
        _ => return None,
    };
    let stream = doc.get_object(mask_id).ok()?.as_stream().ok()?;
    let dict = &stream.dict;

    if !matches!(
        dict.get(b"Subtype").map(|s| resolve(doc, s)),
        Ok(Object::Name(n)) if n == b"Image"
    ) {
        return None;
    }
    // Stencil masks (/ImageMask true) are bilevel sampling masks — skip.
    if matches!(dict.get(b"ImageMask"), Ok(Object::Boolean(true))) {
        return None;
    }
    // /Matte premultiplies the mask samples against a background color;
    // requantizing the base under that interpretation is not supported.
    if dict.get(b"Matte").is_ok() {
        return None;
    }
    // Plain DeviceGray only (an array-wrapped or ICCBased gray is out of scope).
    if !matches!(
        dict.get(b"ColorSpace").map(|c| resolve(doc, c)),
        Ok(Object::Name(n)) if n == b"DeviceGray"
    ) {
        return None;
    }
    if dict
        .get(b"BitsPerComponent")
        .ok()
        .and_then(|b| b.as_i64().ok())
        != Some(8)
    {
        return None;
    }
    // Shared-mask fail-safe (Phase 5 review finding), RESIZE intent only: a
    // `/SMask` object referenced by MORE than one image cannot be safely
    // resized for one consumer's geometry without breaking the other's pixel
    // alignment. This is reachable in practice: dedup merges byte-identical
    // masks (e.g. three copies of the same 620-byte thumbnail mask on one
    // NASA page) BEFORE planning runs, so several images legitimately share
    // one mask id here. Count DIRECT references to this mask id; any second
    // consumer disqualifies the pair entirely. (Indirect-reference chains are
    // not counted, but `eligible_smask` only accepts direct references
    // anyway.) A REQUANT never modifies the mask stream, so sharing is
    // harmless there — Phase 6 P-M1 measured 16 masked-JPEG payloads
    // (1,163,221 B) on the reference corpus that the guard needlessly blocked
    // from requantization.
    if matches!(usage, SmaskUse::Resize) {
        let refcount = doc
            .objects
            .values()
            .filter(|obj| {
                let raw = match obj {
                    Object::Stream(s) => s.dict.get(b"SMask"),
                    Object::Dictionary(d) => d.get(b"SMask"),
                    _ => return false,
                };
                matches!(raw, Ok(Object::Reference(id2)) if *id2 == mask_id)
            })
            .count();
        if refcount > 1 {
            return None;
        }
    }
    Some(mask_id)
}

/// Decode, resize, and re-encode one image if it's an over-resolution JPEG or
/// Flate raster. Returns `None` to leave the image untouched.
fn plan_replacement(
    doc: &Document,
    id: ObjectId,
    rendered: (f32, f32),
    options: OptimizeOptions,
) -> Option<Replacement> {
    let (rendered_w_pts, rendered_h_pts) = rendered;
    if rendered_w_pts <= 0.0 || rendered_h_pts <= 0.0 {
        return None;
    }

    // Defensive: a non-positive target DPI means "do not downsample".
    // Without this guard, target_w/target_h below would collapse toward 1px.
    let target_dpi = options.target_dpi;
    if target_dpi <= 0.0 {
        return None;
    }
    let dpi_margin = options.dpi_margin.max(1.0);

    let stream = doc.get_object(id).ok()?.as_stream().ok()?;
    let dict = &stream.dict;

    // Must be an image.
    if !matches!(dict.get(b"Subtype").map(|s| resolve(doc, s)), Ok(Object::Name(n)) if n == b"Image")
    {
        return None;
    }

    // Transparency handling (Phase 5 D-M1 / D-M2). A `/Mask` (stencil /
    // color-key) is always a hard skip; `/SMask` soft masks open eligibility
    // only for the pair shapes D-M1 already vetted — a plain 8-bit DeviceGray
    // image stream, `/ImageMask` stencil unset, no `/Matte` anywhere in the
    // pair. An ineligible `/SMask` (unresolvable reference, non-image object,
    // `/ImageMask` stencil, non-DeviceGray color space, `BitsPerComponent`
    // other than 8) leaves the whole pair untouched. Eligibility is checked
    // here with the REQUANT intent (Phase 6 P-M1): a shared mask does not
    // disqualify the pair outright anymore — the refcount guard is re-applied
    // below only on the branches that would resize the mask.
    let smask_raw = dict.get(b"SMask").ok();
    let smask_present = smask_raw.is_some();
    if dict.get(b"Mask").is_ok() || (smask_present && dict.get(b"Matte").is_ok()) {
        return None;
    }
    let smask_id = smask_raw.and_then(|value| eligible_smask(doc, value, SmaskUse::Requant));
    if smask_present && smask_id.is_none() {
        return None;
    }
    let filter = dict.get(b"Filter").ok()?;
    let class = classify_filter(doc, filter);
    // CCITT streams are bitonal: never resampled here (quality trap — plan §B).
    // Their lossless G4 recompression lives in the dedicated bitonal pass.
    // JPX (JPEG2000) and JBIG2 streams are recognized-and-declined here: no
    // decoder is linked, so any re-encode path would corrupt them. The masks
    // of such a base are likewise out of scope (an eligible_smask check never
    // runs — the whole object stays untouched).
    if matches!(
        class,
        FilterClass::Other | FilterClass::CcittOnly | FilterClass::JpxOnly | FilterClass::Jbig2Only
    ) {
        return None;
    }

    let px_w = dict.get(b"Width").ok().and_then(|o| o.as_i64().ok())? as u32;
    let px_h = dict.get(b"Height").ok().and_then(|o| o.as_i64().ok())? as u32;
    if px_w == 0 || px_h == 0 {
        return None;
    }

    // Effective DPI = pixels / inches displayed, evaluated on BOTH axes. A
    // non-uniformly scaled image (say 1000x1000 px drawn into 500x100 pt) can
    // sit under the threshold horizontally while being ~6x over-resolved
    // vertically; testing width alone skipped the whole image. Consider it if
    // *either* axis is over-resolved — the `target_* < px_*` component here
    // still prevents any upscaling. This is EXACTLY the gate the unmasked
    // path applies below; D-M2's coupled downsampling shares it unchanged.
    // `non_uniform_placement_is_downsampled` pins the both-axes rule.
    let eff_dpi_w = px_w as f32 / (rendered_w_pts / 72.0);
    let eff_dpi_h = px_h as f32 / (rendered_h_pts / 72.0);
    let target_w = ((rendered_w_pts / 72.0) * target_dpi).round().max(1.0) as u32;
    let target_h = ((rendered_h_pts / 72.0) * target_dpi).round().max(1.0) as u32;
    let over_resolution =
        eff_dpi_w.max(eff_dpi_h) > target_dpi * dpi_margin && target_w < px_w && target_h < px_h;

    // D-M1 / D-M2 / D-M3 masked-image handling.
    //   - DCTDecode bases: OVER-RESOLUTION pairs are downsampled as a unit
    //     (D-M2): base and `/SMask` are resampled to the SAME target geometry
    //     and replaced together (atomic — never one side alone); pairs
    //     at/below the target take the dimension-preserving D-M1
    //     requantization: the base is decoded at its own size, re-encoded at
    //     the configured quality, and the `/SMask` stream is never modified.
    //   - FlateDecode bases (D-M3): OVER-RESOLUTION pairs take the same
    //     atomic coupled downsample, with the base going through the
    //     format-preserving Flate→Flate path — or, under
    //     `allow_lossy_reencode`, through whichever of that path and a JPEG
    //     candidate at the same target geometry is smaller. Pairs that do not take that
    //     downsample are left untouched by default — the lossless requant
    //     analogue does not exist for a lossless payload — but with the
    //     `allow_lossy_reencode` consent flag they take the
    //     dimension-preserving Flate→JPEG conversion, which rewrites the base
    //     only and never the `/SMask` stream.
    //
    // Idempotence guard (D-M1, % ported to the D-M2 pair below): requantization
    // is lossy, so re-running it on an already-requantized payload keeps
    // shrinking by a fraction of a percent each pass (generation loss). A
    // stream is only requantized when the candidate saves at least 5% — a real
    // first-time requant of an over-quality scan saves far more (the NASA
    // corpus measured 40-55% per stream), while same-quality generation-loss
    // churn is 1-4% and decays each pass. This makes optimize(optimize(x)) a
    // no-op in practice without blocking genuine wins.
    if smask_present {
        let mask_id = smask_id.expect("smask_id is set whenever smask_present");
        // Resize eligibility (Phase 6 P-M1 split): the shared-mask refcount
        // guard applies only to the branches that would change the mask's
        // geometry. Evaluated lazily — the requant branch never needs it.
        let resize_eligible = || {
            smask_raw.is_some_and(|value| eligible_smask(doc, value, SmaskUse::Resize).is_some())
        };
        if matches!(class, FilterClass::FlateOnly) {
            // D-M3: the masked-Flate pair. Two transforms live here — the
            // over-resolution coupled downsample (gated by the same consent
            // flag as the unmasked Flate path; a shared mask is never
            // resized), which under `allow_lossy_reencode` also runs a JPEG
            // competitor at its target geometry, and, when that downsample is
            // NOT taken, the dimension-preserving Flate→JPEG conversion under
            // the same flag. The dimension-preserving conversion never touches
            // the mask stream (`Replacement::smask` is `None`), so it is safe
            // for shared masks by exactly the P-M1 argument; the competitor
            // inside the downsample resizes the mask either way, so it stays
            // behind the `resize_eligible()` gate and changes nothing about
            // shared-mask exposure.
            if !over_resolution || !options.downsample_flate_images || !resize_eligible() {
                if options.allow_lossy_reencode {
                    return plan_flate_lossy_requant_replacement(
                        doc, stream, options, id, px_w, px_h,
                    );
                }
                return None;
            }
            // The coupled downsample was ATTEMPTED. With consent it carries its
            // own JPEG competitor at the target geometry (Option B), so the
            // full harvest lands in ONE pass; if the pair declines (decode-back
            // mismatch, or it does not save the 5% minimum) it stays untouched.
            // There is still no lossy fallback AFTER a decline — that would
            // re-litigate a resampling decision the lossless path already made,
            // the same no-compounding-losses rule the unmasked path applies.
            return plan_flate_smask_pair_downsample(
                doc, id, mask_id, stream, px_w, px_h, target_w, target_h, options,
            );
        }
        if over_resolution {
            // A shared mask is never RESIZED (P-M1 fail-safe, unchanged from
            // Phase 5): an over-resolution pair whose mask has a second
            // consumer cannot take the coupled downsample. It CAN still take
            // the dimension-preserving requant below: the mask stream is not
            // touched, so every other consumer keeps its alignment, and a
            // future coupled downsample of this pair is blocked by the same
            // shared mask either way — requantizing removes no option that
            // existed before (an earlier draft skipped over-res shared-mask
            // pairs entirely; that stranded ~1 MB of real savings on the NASA
            // corpus while protecting against nothing).
            if !resize_eligible() {
                return plan_requant_replacement(stream, options, id, px_w, px_h);
            }
            // The base is over-resolution, so the whole pair earns a
            // downsample. ATOMICITY (hard rule): plan both streams together
            // and apply both together — a failure on EITHER side (corrupt
            // base, corrupt mask, decode-back mismatch, or a COMBINED size
            // that does not save the 5% minimum) skips the entire pair. There
            // is deliberately no D-M1 fallback here: replacing only the base
            // would violate the mask/image unit rule.
            if let Some(replacement) = plan_smask_pair_downsample(
                doc, id, mask_id, stream, px_w, px_h, target_w, target_h, options,
            ) {
                return Some(replacement);
            }
            return None;
        }

        // D-M1: dimension-preserving requantization (see the guard note
        // above). Reachable for SHARED masks too (P-M1): the mask stream is
        // never modified, so every other consumer keeps its alignment.
        return plan_requant_replacement(stream, options, id, px_w, px_h);
    }

    // The unmasked path. Anything not over-resolved (effective DPI inside the
    // margin, or already at/below the target pixel geometry) is never
    // RESIZED; under-threshold DCTDecode payloads instead take the same
    // dimension-preserving requantization D-M1 applies to masked bases
    // (Phase 6 P-M2) — quality normalization for scanner-quality JPEGs the
    // resize pipeline never reaches. FlateDecode stays untouched under the
    // default lossless contract; with the `allow_lossy_reencode` consent flag
    // (Phase 7 spike) it takes the dimension-preserving Flate→JPEG conversion
    // instead, under the same 5% + decode-back guards as the requant.
    // CCITT/bitonal never reaches this point.
    if !over_resolution {
        if matches!(class, FilterClass::DctOnly) {
            return plan_requant_replacement(stream, options, id, px_w, px_h);
        }
        if matches!(class, FilterClass::FlateOnly) && options.allow_lossy_reencode {
            return plan_flate_lossy_requant_replacement(doc, stream, options, id, px_w, px_h);
        }
        return None;
    }

    let (out, dict_update) = match class {
        FilterClass::DctOnly => {
            let out = plan_dct(stream, options, target_w, target_h)?;
            (out, DictUpdate::Dct)
        }
        FilterClass::FlateOnly => {
            if !options.downsample_flate_images {
                // Geometry changes are declined (`downsample_flate_images`
                // off), but with consent the ENCODING CLASS can still change
                // in place: the same dimension-preserving Flate→JPEG
                // conversion the under-threshold branch applies.
                if options.allow_lossy_reencode {
                    return plan_flate_lossy_requant_replacement(
                        doc, stream, options, id, px_w, px_h,
                    );
                }
                return None;
            }
            // Phase 7 spike: with consent, a JPEG candidate at the SAME
            // target geometry competes with the format-preserving Flate
            // downsample and the smaller payload wins (the shared
            // never-larger guard below still decides against the original).
            // The line-art content guard applies here too, evaluated on the
            // SOURCE pixels (see `plan_flate_to_jpeg`): the p12 profiles that
            // failed human review are over-resolution in the source PDF, so
            // they reach this competition rather than the under-threshold
            // branch. Declining the JPEG candidate leaves the lossless
            // downsample to ship — line art then gets exactly the flag-off
            // result instead of a DCT-mottled one.
            //
            // NO COMPOUNDING LOSSES (Phase 7 post-review fix): the geometry
            // change is the LOSSLESS path's decision to make. If the Flate
            // candidate at this target would itself be declined by the shared
            // never-larger guard below — i.e. downsampling did not even pay
            // for itself in the format that preserves every sample — then the
            // resample is not worth doing, and a JPEG candidate must not
            // resurrect it by hiding the resolution loss behind a DCT win.
            // That is how the p7 TKE banners (objs 22-29) ended up carrying
            // BOTH losses in the spike: the flate downsample grew the stream
            // and was rejected, then the JPEG-of-downsampled-pixels shrank it
            // and shipped. `--allow-lossy` is consent to re-encode, not
            // consent to re-litigate a resampling decision the lossless path
            // already declined.
            let lossless = plan_flate(doc, stream, px_w, px_h, target_w, target_h);
            let lossless_declined = lossless
                .as_ref()
                .is_some_and(|(out, _)| out.len() >= stream.content.len());
            let lossy = if options.allow_lossy_reencode && !lossless_declined {
                plan_flate_to_jpeg(doc, stream, options, px_w, px_h, target_w, target_h)
            } else {
                None
            };
            match (lossless, lossy) {
                (Some((flate_out, parms)), Some(jpeg_out)) => {
                    if jpeg_out.len() < flate_out.len() {
                        (jpeg_out, DictUpdate::FlateToJpeg)
                    } else {
                        (
                            flate_out,
                            DictUpdate::Flate {
                                decode_parms: parms,
                            },
                        )
                    }
                }
                (Some((flate_out, parms)), None) => (
                    flate_out,
                    DictUpdate::Flate {
                        decode_parms: parms,
                    },
                ),
                (None, Some(jpeg_out)) => (jpeg_out, DictUpdate::FlateToJpeg),
                (None, None) => return None,
            }
        }
        FilterClass::CcittOnly
        | FilterClass::Other
        | FilterClass::JpxOnly
        | FilterClass::Jbig2Only => return None,
    };

    if out.len() >= stream.content.len() {
        return None;
    }

    Some(Replacement {
        id,
        content: out,
        width: target_w as i64,
        height: target_h as i64,
        dict_update,
        smask: None,
    })
}

/// The JPEG re-encode path: decode (scaled when possible), resize, re-encode
/// via mozjpeg. Channel count is preserved to match the unchanged /ColorSpace.
fn plan_dct(
    stream: &lopdf::Stream,
    options: OptimizeOptions,
    target_w: u32,
    target_h: u32,
) -> Option<Vec<u8>> {
    let quality = options.jpeg_quality.clamp(1, 100);

    // Prefer scaled decoding; fall back to a full decode for color spaces the
    // scaled path declines (CMYK/YCCK) or if libjpeg refuses the stream.
    let (decoded, is_gray) =
        decode_jpeg_scaled(&stream.content, target_w, target_h).or_else(|| {
            let decoded =
                image::load_from_memory_with_format(&stream.content, ImageFormat::Jpeg).ok()?;
            let is_gray = matches!(
                decoded,
                DynamicImage::ImageLuma8(_) | DynamicImage::ImageLuma16(_)
            );
            Some((decoded, is_gray))
        })?;
    let resized = decoded.resize_exact(target_w, target_h, image::imageops::FilterType::Lanczos3);

    // Preserve the original component count so the PDF /ColorSpace (which we
    // leave unchanged) still matches: gray -> 1 channel, else RGB -> 3.
    encode_jpeg(resized, is_gray, quality)
}

/// Mean-absolute-difference ceiling for the D-M1 decode-back verification.
/// Deliberately loose: a JPEG requantization is lossy by design, so this gate
/// catches catastrophes (wrong component mix, stale/scrambled payloads,
/// shifted geometry), never ordinary quality loss — q78 round trips land at
/// single-digit MAD on document-like content.
const DECODE_BACK_MAX_MAD: f64 = 96.0;

/// Decode a JPEG at (at least) the requested target geometry: mozjpeg's
/// DCT-scaled path first (never materializing the full image when a smaller
/// scale covers the target), falling back to a full decode for color spaces
/// the scaled path declines (CMYK/YCCK) or streams libjpeg refuses. Returns
/// `(image, is_grayscale)`, or `None` on any decode doubt.
fn decode_jpeg(data: &[u8], target_w: u32, target_h: u32) -> Option<(DynamicImage, bool)> {
    decode_jpeg_scaled(data, target_w, target_h).or_else(|| {
        let decoded = image::load_from_memory_with_format(data, ImageFormat::Jpeg).ok()?;
        let is_gray = matches!(
            decoded,
            DynamicImage::ImageLuma8(_) | DynamicImage::ImageLuma16(_)
        );
        Some((decoded, is_gray))
    })
}

/// Phase 5 D-M1: dimension-preserving JPEG requantization for a base image
/// carrying an eligible `/SMask`. The base is decoded at its OWN dimensions
/// (never resized → soft-mask alignment untouched by construction), re-encoded
/// at `OptimizeOptions::jpeg_quality`, and the candidate payload must pass a
/// decode-back verification before it is returned. Any doubt — decode failure,
/// lying stream geometry, or a divergent decode-back — returns `None`.
fn plan_dct_requant(
    stream: &lopdf::Stream,
    options: OptimizeOptions,
    px_w: u32,
    px_h: u32,
) -> Option<Vec<u8>> {
    let quality = options.jpeg_quality.clamp(1, 100);

    // Full decode: same path as the resize pipeline, with the target set to
    // the stream's own geometry (libjpeg then picks the unscaled 8/8 DCT
    // size), so the ordinary decoding machinery is reused as-is.
    let (img, is_gray) = decode_jpeg(&stream.content, px_w, px_h)?;

    // Dimension-preserving contract: the decoded pixel buffer must be EXACTLY
    // the declared geometry. If /Width//Height lie, any re-declaration or
    // implied scale would break mask alignment — fail-safe skip.
    if img.width() != px_w || img.height() != px_h {
        return None;
    }

    // Reference pixels are captured BEFORE the buffer is moved into the
    // encoder; the decode-back verification below compares against these.
    let reference_pixels = if is_gray {
        img.to_luma8().into_raw()
    } else {
        img.to_rgb8().into_raw()
    };

    let out = encode_jpeg(img, is_gray, quality)?;

    // Exact idempotence guard (Phase 7 measurement): if the source's
    // quantization tables are byte-identical to the candidate's, the payload
    // is ALREADY at the configured quality and this "requantization" is pure
    // generation-loss churn. The 5% rule alone does not converge here —
    // mozjpeg's trellis quantization keeps shaving 5-10% per pass on
    // graphics-heavy content it encoded itself (measured on the NASA corpus
    // once Flate→JPEG conversions started producing our own q78 payloads).
    // Table equality is the exact version of what the 5% rule approximates.
    if let (Some(src_tables), Some(out_tables)) =
        (jpeg_quant_tables(&stream.content), jpeg_quant_tables(&out))
    {
        if src_tables == out_tables {
            return None;
        }
    }

    // Decode-back verification of the re-encoded base (hard rule): re-decoding
    // the candidate must reproduce the same geometry, channel count, and
    // nearby pixels before it is allowed to replace the original bytes.
    if !decode_back_matches(
        &out,
        &reference_pixels,
        is_gray,
        px_w,
        px_h,
        DECODE_BACK_MAX_MAD,
    ) {
        return None;
    }
    Some(out)
}

/// The concatenated payloads of a JPEG stream's DQT (quantization table)
/// segments, in file order, up to the start-of-scan marker. Two JPEGs with
/// identical output from this function were quantized with the same tables —
/// i.e. they are at the same quality setting. Returns `None` on any parse
/// doubt (callers must then not draw conclusions either way).
fn jpeg_quant_tables(data: &[u8]) -> Option<Vec<u8>> {
    if data.len() < 2 || data[0] != 0xFF || data[1] != 0xD8 {
        return None;
    }
    let mut out = Vec::new();
    let mut i = 2usize;
    while i + 2 <= data.len() {
        if data[i] != 0xFF {
            return None;
        }
        let marker = data[i + 1];
        match marker {
            // Fill bytes before a marker.
            0xFF => {
                i += 1;
                continue;
            }
            // Standalone markers (no length field).
            0x01 | 0xD0..=0xD7 => {
                i += 2;
                continue;
            }
            // Start of scan: every table segment has been seen.
            0xDA => return Some(out),
            _ => {}
        }
        if i + 4 > data.len() {
            return None;
        }
        let len = ((data[i + 2] as usize) << 8) | data[i + 3] as usize;
        if len < 2 || i + 2 + len > data.len() {
            return None;
        }
        if marker == 0xDB {
            out.extend_from_slice(&data[i + 4..i + 2 + len]);
        }
        i += 2 + len;
    }
    None
}

/// The dimension-preserving requantization as a full `Replacement`, shared by
/// D-M1 (masked bases, shared or not) and P-M2 (unmasked under-threshold
/// JPEGs): re-encode at the configured quality via `plan_dct_requant`, then
/// apply the 5% minimum-savings guard (the idempotence note in
/// `plan_replacement` — generation-loss churn lands under 5% and is declined,
/// genuine first-time requants of scanner-quality payloads save far more).
fn plan_requant_replacement(
    stream: &lopdf::Stream,
    options: OptimizeOptions,
    id: ObjectId,
    px_w: u32,
    px_h: u32,
) -> Option<Replacement> {
    let out = plan_dct_requant(stream, options, px_w, px_h)?;
    if out.len() * 100 >= stream.content.len() * 95 {
        return None;
    }
    Some(Replacement {
        id,
        content: out,
        width: px_w as i64,
        height: px_h as i64,
        dict_update: DictUpdate::Dct,
        smask: None,
    })
}

/// True if re-decoding `out` reproduces the reference's geometry, channel
/// count, and pixels (mean absolute difference ≤ `max_mad`).
fn decode_back_matches(
    out: &[u8],
    reference_pixels: &[u8],
    reference_is_gray: bool,
    w: u32,
    h: u32,
    max_mad: f64,
) -> bool {
    let Some((decoded, is_gray)) = decode_jpeg(out, w, h) else {
        return false;
    };
    if is_gray != reference_is_gray {
        return false;
    }
    let actual = if is_gray {
        decoded.to_luma8().into_raw()
    } else {
        decoded.to_rgb8().into_raw()
    };
    if actual.len() != reference_pixels.len() {
        return false;
    }
    let sad: u64 = reference_pixels
        .iter()
        .zip(&actual)
        .map(|(a, b)| u64::from(a.abs_diff(*b)))
        .sum();
    sad as f64 / reference_pixels.len() as f64 <= max_mad
}

/// Phase 5 D-M2. Overhead allowance for the combined-size guard, covering the
/// dict tokens the mask replacement writes beyond the stream bytes themselves
/// (`/Width`, `/Height`, the scalar `/Filter /FlateDecode` line). The real
/// delta is usually negative — a stale `/DecodeParms` (a multi-hundred-byte
/// dict) is dropped — so this fixed positive allowance is deliberately
/// conservative.
const MASK_DICT_OVERHEAD: usize = 64;

/// The D-M2 base half: decode (DCT-scaled when possible), resize to the EXACT
/// target geometry with the same Lanczos3 kernel the unmasked path uses,
/// re-encode as JPEG, and decode-back-verify the candidate against the exact
/// resized pixels (geometry + channel count + MAD ceiling) — the same MAD-based
/// check D-M1 applies to its requantized payloads.
fn plan_dct_resize_verified(
    stream: &lopdf::Stream,
    options: OptimizeOptions,
    target_w: u32,
    target_h: u32,
) -> Option<Vec<u8>> {
    let quality = options.jpeg_quality.clamp(1, 100);
    let (decoded, is_gray) = decode_jpeg(&stream.content, target_w, target_h)?;
    let resized = decoded.resize_exact(target_w, target_h, image::imageops::FilterType::Lanczos3);
    // Reference pixels are the exact buffer handed to the encoder; the
    // decode-back below must reproduce its geometry, channel count and nearby
    // pixels from the re-encoded JPEG.
    let reference = if is_gray {
        resized.to_luma8().into_raw()
    } else {
        resized.to_rgb8().into_raw()
    };
    let out = encode_jpeg(resized, is_gray, quality)?;
    if !decode_back_matches(
        &out,
        &reference,
        is_gray,
        target_w,
        target_h,
        DECODE_BACK_MAX_MAD,
    ) {
        return None;
    }
    Some(out)
}

/// The D-M2 mask half: decode the `/SMask` stream — the payload may be JPEG OR
/// FlateDecode — resample gray samples to the BASE's exact target geometry
/// (the core invariant: base and mask must end at identical width/height), and
/// re-encode as plain FlateDecode 8-bit DeviceGray rows (zlib of packed rows,
/// no predictor). Returns `None` on any doubt: a mask that refuses to decode
/// as single-channel gray, a non-identity `/Decode`, lying geometry, or a
/// candidate that fails its own decode-back.
fn plan_mask_resample(
    doc: &Document,
    mask_stream: &lopdf::Stream,
    px_w: u32,
    px_h: u32,
    target_w: u32,
    target_h: u32,
) -> Option<Vec<u8>> {
    let dict = &mask_stream.dict;
    // A non-identity `/Decode` would remap samples after decoding; the
    // exact-byte verification below assumes identity.
    if dict.get(b"Decode").is_ok() {
        return None;
    }
    let filter = dict.get(b"Filter").ok()?;
    let class = classify_filter(doc, filter);
    let mask_img = match class {
        FilterClass::DctOnly => {
            let (decoded, is_gray) = decode_jpeg(&mask_stream.content, target_w, target_h)?;
            // A soft mask is a one-component image; a non-gray payload behind
            // the DeviceGray declaration is a mismatch — skip the whole pair.
            if !is_gray {
                return None;
            }
            decoded
        }
        FilterClass::FlateOnly => {
            if flate_channels(doc, dict)? != 1 {
                return None;
            }
            let encoding = flate_encoding(dict, 1, px_w)?;
            let expected = u64::from(px_w) * u64::from(px_h);
            if expected > MAX_FLATE_PIXEL_BYTES {
                return None;
            }
            let decoded = match encoding {
                FlateEncoding::Plain => inflate_capped(&mask_stream.content, expected as usize)?,
                FlateEncoding::PngPredictor => {
                    let filtered_len = (px_w as usize + 1) * px_h as usize;
                    let inflated = inflate_capped(&mask_stream.content, filtered_len)?;
                    if inflated.len() != filtered_len {
                        return None;
                    }
                    png_defilter(&inflated, 1, px_w as usize)?
                }
            };
            if decoded.len() as u64 != expected {
                return None;
            }
            DynamicImage::ImageLuma8(image::GrayImage::from_raw(px_w, px_h, decoded)?)
        }
        FilterClass::CcittOnly
        | FilterClass::Other
        | FilterClass::JpxOnly
        | FilterClass::Jbig2Only => return None,
    };

    // Bilinear on gray (plan §D-M2), to the base's exact target geometry.
    let resized = mask_img.resize_exact(target_w, target_h, image::imageops::FilterType::Triangle);
    let raw = resized.into_luma8().into_raw();
    let out = deflate_level9(&raw)?;

    // Mask decode-back verification (hard rule): the candidate must inflate
    // back to EXACTLY target_w*target_h gray samples, byte-identical to the
    // planned raster. Flate is lossless, so equality must be exact.
    let back = inflate_capped(&out, raw.len())?;
    if back != raw {
        return None;
    }
    Some(out)
}

/// Phase 5 D-M2: coupled downsampling of an over-resolution JPEG base and its
/// eligible `/SMask`. Both streams are planned together — and carried by the
/// single returned `Replacement` so the apply pass replaces them together.
/// Any doubt on either side, or a COMBINED size that fails the never-larger /
/// 5% idempotence guard, returns `None` and the whole pair stays untouched.
#[allow(clippy::too_many_arguments)] // mirrors plan_replacement's flat signature
fn plan_smask_pair_downsample(
    doc: &Document,
    id: ObjectId,
    mask_id: ObjectId,
    base_stream: &lopdf::Stream,
    px_w: u32,
    px_h: u32,
    target_w: u32,
    target_h: u32,
    options: OptimizeOptions,
) -> Option<Replacement> {
    // Base: JPEG at the target geometry with the existing MAD decode-back.
    let base_out = plan_dct_resize_verified(base_stream, options, target_w, target_h)?;

    // Mask: decode (JPEG or Flate) + resample to the SAME geometry + Flate
    // re-encode, verified by its own decode-back.
    let mask_stream = doc.get_object(mask_id).ok()?.as_stream().ok()?;
    let mask_out = plan_mask_resample(doc, mask_stream, px_w, px_h, target_w, target_h)?;

    // ATOMICITY + idempotence, evaluated over the COMBINED pair. The 5%
    // minimum-savings guard is the D-M1 philosophy ported to the pair: both
    // lossy re-encodes save far more on a genuine first pass, while a second
    // pass over an already-optimized pair lands under 5% and is declined
    // (downsampling to a fixed DPI is naturally idempotent anyway — the
    // `target_* >= px_*` half of `over_resolution` declines before we get
    // here). It also enforces strict-shrink atomicity: the candidate must
    // beat the pair's original size by the full 5% to replace both streams.
    let combined_original = base_stream.content.len() + mask_stream.content.len();
    let combined_candidate = base_out.len() + mask_out.len() + MASK_DICT_OVERHEAD;
    if combined_candidate * 100 >= combined_original * 95 {
        return None;
    }

    Some(Replacement {
        id,
        content: base_out,
        width: target_w as i64,
        height: target_h as i64,
        dict_update: DictUpdate::Dct, // base keeps its existing form (/Filter, /ColorSpace, ...)
        smask: Some(MaskReplacement {
            mask_id,
            content: mask_out,
            width: target_w as i64,
            height: target_h as i64,
        }),
    })
}

/// Phase 5 D-M3: coupled downsampling of an over-resolution FlateDecode base
/// and its eligible `/SMask` — the same atomicity structure as the D-M2 JPEG
/// pair, with the base going through the format-preserving Flate→Flate path
/// (`plan_flate`: same `/ColorSpace`, predictor handling unchanged) instead of
/// a JPEG re-encode. Both streams are planned together and carried by the
/// single returned `Replacement` so the apply pass replaces them together.
/// Any doubt on either side, or a COMBINED size that fails the never-larger /
/// 5% minimum-savings guard, returns `None` and the whole pair stays untouched.
///
/// Phase 7 (Option B): under `allow_lossy_reencode` the base additionally gets
/// a JPEG competitor at the SAME target geometry, mirroring the unmasked
/// over-resolution competition in `plan_replacement`. The mask half is
/// unchanged either way — it is still the losslessly resampled
/// `plan_mask_resample` raster at the base's target geometry — so base and
/// mask land on identical pixel grids whichever base candidate wins.
///
/// SHARED-MASK REASONING (P-M1 line): a target-geometry JPEG competitor sits
/// squarely on the RESIZE side of the requant-safe / resize-blocked split. It
/// does not widen the pair's mask exposure by one byte — the mask is resampled
/// here regardless of which base candidate wins, so this whole function is
/// already gated on `SmaskUse::Resize` eligibility in `plan_replacement` and a
/// shared mask never reaches it at all. The competitor changes only the base
/// stream's ENCODING, and every base that reaches it was already going to be
/// resampled losslessly. Nothing about the shared-mask refcount guard moves.
///
/// This is also what restores one-pass idempotence for masked Flate pairs:
/// before the competitor existed, pass 1 downsampled the pair to Flate-at-
/// target and pass 2 then saw an at-target masked *Flate* base and converted it
/// through `plan_flate_lossy_requant_replacement`, splitting one harvest across
/// two passes. With the competitor, the conversion happens in pass 1 and the
/// pass-2 base is DCTDecode at target geometry — not over-resolution, so it
/// takes only the D-M1 requant, which its own 5% guard declines. Pinned by
/// `smask_flate_lossy_pair_is_idempotent_in_one_pass`.
#[allow(clippy::too_many_arguments)] // mirrors plan_smask_pair_downsample's flat signature
fn plan_flate_smask_pair_downsample(
    doc: &Document,
    id: ObjectId,
    mask_id: ObjectId,
    base_stream: &lopdf::Stream,
    px_w: u32,
    px_h: u32,
    target_w: u32,
    target_h: u32,
    options: OptimizeOptions,
) -> Option<Replacement> {
    // Base: the exact eligibility gates and re-encode variants of the unmasked
    // Flate route (8bpc only, no /Decode, capped inflate + exact length check,
    // plain-vs-Up-predictor output selection). Flate is lossless, so the
    // deflate round trip needs no MAD-style decode-back of its own.
    let (base_out, decode_parms) = plan_flate(doc, base_stream, px_w, px_h, target_w, target_h)?;

    // Mask: decode (JPEG or Flate) + resample to the SAME geometry + Flate
    // re-encode, verified by its own exact decode-back.
    let mask_stream = doc.get_object(mask_id).ok()?.as_stream().ok()?;
    let mask_out = plan_mask_resample(doc, mask_stream, px_w, px_h, target_w, target_h)?;

    // ATOMICITY + idempotence, evaluated over the COMBINED pair — the same
    // arithmetic as the D-M2 guard (see plan_smask_pair_downsample): the
    // candidate, including the mask's dict-token overhead, must beat the
    // pair's original size by the full 5% to replace both streams.
    let combined_original = base_stream.content.len() + mask_stream.content.len();
    let combined_lossless = base_out.len() + mask_out.len() + MASK_DICT_OVERHEAD;

    // NO COMPOUNDING LOSSES, the pair's form of the unmasked rule: the geometry
    // change is the LOSSLESS path's decision. If the fully lossless pair
    // candidate would itself be declined by the combined guard below — the
    // resample did not pay for itself in the format that preserves every sample
    // — then a JPEG base must not resurrect it by hiding the resolution loss
    // behind a DCT win. The predicate is the exact guard the pair is judged by,
    // so "declined" means the same thing on both sides.
    let lossless_declined = combined_lossless * 100 >= combined_original * 95;
    let lossy = if options.allow_lossy_reencode && !lossless_declined {
        // The line-art content guard lives inside `plan_flate_to_jpeg` and is
        // evaluated on the decoded SOURCE pixels; declining there just leaves
        // the lossless downsample to ship, i.e. exactly the flag-off pair.
        plan_flate_to_jpeg(doc, base_stream, options, px_w, px_h, target_w, target_h)
    } else {
        None
    };

    // Smaller base wins. The mask half is byte-for-byte the same either way, so
    // comparing the base candidates alone is the same comparison as comparing
    // the two combined pairs.
    let (content, dict_update) = match lossy {
        Some(jpeg_out) if jpeg_out.len() < base_out.len() => (jpeg_out, DictUpdate::FlateToJpeg),
        _ => (base_out, DictUpdate::Flate { decode_parms }),
    };

    let combined_candidate = content.len() + mask_out.len() + MASK_DICT_OVERHEAD;
    if combined_candidate * 100 >= combined_original * 95 {
        return None;
    }

    Some(Replacement {
        id,
        content,
        width: target_w as i64,
        height: target_h as i64,
        dict_update,
        smask: Some(MaskReplacement {
            mask_id,
            content: mask_out,
            width: target_w as i64,
            height: target_h as i64,
        }),
    })
}

/// Raw pixel budget above which a Flate image is never decoded: 256 MiB
/// (~9.5k x 9.5k RGB), far above anything legitimately placed on a page.
/// Guards against decompression bombs before any allocation happens.
const MAX_FLATE_PIXEL_BYTES: u64 = 256 * 1024 * 1024;

/// The Flate same-format path: inflate (hard-capped), un-apply any PNG
/// predictor, resize, and re-deflate at level 9 — trying both a PNG
/// Up-predictor variant and a plain no-predictor variant, keeping the smaller.
/// `/ColorSpace` is never touched, so no artifact-class change is possible.
///
/// Every eligibility gate returns `None` (image untouched) on doubt. Decoding
/// is done with our own capped inflate + spec-correct predictor inversion
/// instead of lopdf's `Stream::decompressed_content`, for three verified
/// lopdf 0.42 reasons: its `decode_row` mis-computes the PNG Avg filter
/// (`left + up/2` instead of `(left + up)/2` — silently wrong pixels with the
/// right length), it swallows corrupt-zlib errors and returns partial data as
/// `Ok`, and it has no decompressed-size cap. The predictor-VALUE gates still
/// exist because lopdf also ignores TIFF Predictor 2 and the array form of
/// `/DecodeParms`; we keep both out of M1 scope entirely.
fn plan_flate(
    doc: &Document,
    stream: &lopdf::Stream,
    px_w: u32,
    px_h: u32,
    target_w: u32,
    target_h: u32,
) -> Option<(Vec<u8>, Option<lopdf::Dictionary>)> {
    let (img, channels) = decode_flate_image(doc, stream, px_w, px_h)?;
    let resized = img.resize_exact(target_w, target_h, image::imageops::FilterType::Lanczos3);
    let raw = if channels == 3 {
        resized.into_rgb8().into_raw()
    } else {
        resized.into_luma8().into_raw()
    };

    // Re-encode both variants and keep the smaller. The Up-predictor variant
    // must also pay for the /DecodeParms dict it forces into the image
    // dictionary (~70 serialized bytes), so the comparison includes that.
    let plain = deflate_level9(&raw)?;
    let up = deflate_level9(&png_up_filter(&raw, target_w, channels))?;
    const PARMS_OVERHEAD: usize = 70;
    if up.len() + PARMS_OVERHEAD < plain.len() {
        let parms = dictionary! {
            "Predictor" => 15_i64,
            "Colors" => channels as i64,
            "BitsPerComponent" => 8_i64,
            "Columns" => target_w as i64,
        };
        Some((up, Some(parms)))
    } else {
        Some((plain, None))
    }
}

/// One planned RGB→Gray collapse: the gray payload plus the predictor parms
/// it was encoded under (`None` = plain rows). Applied by `try_optimize`
/// together with the `/ColorSpace /DeviceGray` rewrite.
struct GrayCollapse {
    id: ObjectId,
    content: Vec<u8>,
    decode_parms: Option<lopdf::Dictionary>,
}

/// Plan every eligible RGB→Gray collapse in parallel (read-only against the
/// document). See [`OptimizeOptions::collapse_gray_images`] for scope; every
/// gate declines on doubt, and a candidate is kept only when the gray stream
/// is strictly smaller than the RGB one it replaces.
fn plan_gray_collapses(doc: &Document) -> Vec<GrayCollapse> {
    let candidates: Vec<(ObjectId, &lopdf::Stream)> = doc
        .objects
        .iter()
        .filter_map(|(&id, obj)| {
            let Object::Stream(stream) = obj else {
                return None;
            };
            let dict = &stream.dict;
            if !matches!(dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                return None;
            }
            // A color-key /Mask is a range over the CURRENT color space's
            // components — collapsing under one would change what it masks.
            if dict.get(b"Mask").is_ok() {
                return None;
            }
            // Plain /DeviceRGB only: ICCBased color carries a profile that a
            // /DeviceGray rewrite would silently drop.
            if !matches!(
                dict.get(b"ColorSpace").map(|o| resolve(doc, o)),
                Ok(Object::Name(n)) if n == b"DeviceRGB"
            ) {
                return None;
            }
            let filter = dict.get(b"Filter").ok()?;
            matches!(classify_filter(doc, filter), FilterClass::FlateOnly).then_some((id, stream))
        })
        .collect();

    candidates
        .into_par_iter()
        .filter_map(|(id, stream)| {
            let px_w = u32::try_from(
                resolve(doc, stream.dict.get(b"Width").ok()?)
                    .as_i64()
                    .ok()?,
            )
            .ok()?;
            let px_h = u32::try_from(
                resolve(doc, stream.dict.get(b"Height").ok()?)
                    .as_i64()
                    .ok()?,
            )
            .ok()?;
            let (img, channels) = decode_flate_image(doc, stream, px_w, px_h)?;
            if channels != 3 {
                return None;
            }
            let rgb = img.into_rgb8().into_raw();
            if rgb
                .as_chunks::<3>()
                .0
                .iter()
                .any(|px| px[0] != px[1] || px[1] != px[2])
            {
                return None;
            }
            let gray: Vec<u8> = rgb.iter().step_by(3).copied().collect();

            // Same encoder choice as `plan_flate`: plain vs Up-filtered rows,
            // the predictor variant paying for the /DecodeParms it forces in.
            let plain = deflate_level9(&gray)?;
            let up = deflate_level9(&png_up_filter(&gray, px_w, 1))?;
            const PARMS_OVERHEAD: usize = 70;
            let (content, decode_parms) = if up.len() + PARMS_OVERHEAD < plain.len() {
                let parms = dictionary! {
                    "Predictor" => 15_i64,
                    "Colors" => 1_i64,
                    "BitsPerComponent" => 8_i64,
                    "Columns" => px_w as i64,
                };
                (up, Some(parms))
            } else {
                (plain, None)
            };
            (content.len() < stream.content.len()).then_some(GrayCollapse {
                id,
                content,
                decode_parms,
            })
        })
        .collect()
}

/// The shared decode stage of every unmasked-Flate transform: all of
/// `plan_flate`'s eligibility gates (8-bit only, no `/Decode`, handled color
/// space, decodable predictor layout), the decompression-bomb cap, capped
/// inflate + spec-correct PNG defiltering, and the exact decoded-length check.
/// Returns the decoded pixels and the channel count (1 or 3), or `None` on
/// any doubt (image untouched).
fn decode_flate_image(
    doc: &Document,
    stream: &lopdf::Stream,
    px_w: u32,
    px_h: u32,
) -> Option<(DynamicImage, usize)> {
    let dict = &stream.dict;

    // M1 scope: 8-bit only (Indexed/1/2/4/16-bit are skipped, never touched).
    let bpc = dict
        .get(b"BitsPerComponent")
        .ok()
        .map(|o| resolve(doc, o))
        .and_then(|o| o.as_i64().ok())?;
    if bpc != 8 {
        return None;
    }

    // A /Decode array remaps sample values; resizing under a remap is not
    // sample-preserving, so skip.
    if dict.get(b"Decode").is_ok() {
        return None;
    }

    let channels = flate_channels(doc, dict)?;
    let encoding = flate_encoding(dict, channels, px_w)?;

    // Decompression-bomb guard before decoding, then an EXACT length check
    // after: any mismatch (truncated stream, lying dimensions) means we cannot
    // trust the pixel data — skip.
    let expected = u64::from(px_w) * u64::from(px_h) * channels as u64;
    if expected > MAX_FLATE_PIXEL_BYTES {
        return None;
    }
    let bytes_per_row = px_w as usize * channels;
    let decoded = match encoding {
        FlateEncoding::Plain => inflate_capped(&stream.content, expected as usize)?,
        FlateEncoding::PngPredictor => {
            // Filtered layout: one leading tag byte per row.
            let filtered_len = (bytes_per_row + 1) * px_h as usize;
            let inflated = inflate_capped(&stream.content, filtered_len)?;
            if inflated.len() != filtered_len {
                return None;
            }
            png_defilter(&inflated, channels, bytes_per_row)?
        }
    };
    if decoded.len() as u64 != expected {
        return None;
    }

    let img = if channels == 3 {
        DynamicImage::ImageRgb8(image::RgbImage::from_raw(px_w, px_h, decoded)?)
    } else {
        DynamicImage::ImageLuma8(image::GrayImage::from_raw(px_w, px_h, decoded)?)
    };
    Some((img, channels))
}

/// Metrics behind the line-art guard, computed in a single pass over decoded
/// 8-bit samples. See [`looks_like_line_art`] for the thresholds and the
/// measured per-class values.
struct LineArtMetrics {
    /// Fraction of pixels sharing the single most common quantized color.
    background: f64,
    /// Fraction of pixels covered by the 8 most common quantized colors.
    palette: f64,
    /// Fraction of pixels whose right or lower neighbor differs by more than
    /// `EDGE_STEP` in any channel.
    edges: f64,
}

/// Channel step that counts as a sharp edge between neighboring samples.
const EDGE_STEP: u8 = 48;

/// Compute the [`LineArtMetrics`] of an interleaved 8-bit buffer (`channels`
/// samples per pixel, `w * h * channels` bytes). Colors are quantized to 5 bits
/// per channel before histogramming, so anti-aliasing fringes and mild noise do
/// not shatter a flat region into thousands of distinct "colors".
fn line_art_metrics(pixels: &[u8], channels: usize, w: u32, h: u32) -> LineArtMetrics {
    let total = (w as usize) * (h as usize);
    let mut histogram: std::collections::HashMap<u32, u32> = std::collections::HashMap::new();
    let quantized = |i: usize| -> u32 {
        let px = &pixels[i * channels..i * channels + channels];
        px.iter()
            .fold(0u32, |acc, s| (acc << 5) | u32::from(s >> 3))
    };
    let mut edges = 0usize;
    for y in 0..h as usize {
        for x in 0..w as usize {
            let i = y * w as usize + x;
            *histogram.entry(quantized(i)).or_insert(0) += 1;
            let here = &pixels[i * channels..i * channels + channels];
            let step = |other: &[u8]| {
                here.iter()
                    .zip(other)
                    .any(|(a, b)| a.abs_diff(*b) > EDGE_STEP)
            };
            let right = (x + 1 < w as usize)
                .then(|| (i + 1) * channels)
                .is_some_and(|j| step(&pixels[j..j + channels]));
            let down = (y + 1 < h as usize)
                .then(|| (i + w as usize) * channels)
                .is_some_and(|j| step(&pixels[j..j + channels]));
            if right || down {
                edges += 1;
            }
        }
    }
    let mut counts: Vec<u32> = histogram.into_values().collect();
    counts.sort_unstable_by(|a, b| b.cmp(a));
    let sum_top = |n: usize| -> u64 { counts.iter().take(n).map(|c| u64::from(*c)).sum() };
    let total_f = total.max(1) as f64;
    LineArtMetrics {
        background: sum_top(1) as f64 / total_f,
        palette: sum_top(8) as f64 / total_f,
        edges: edges as f64 / total_f,
    }
}

/// Phase 7 (post-spike human review): decline the lossy Flate→JPEG conversion
/// for line-art-like content — thin curves/dashes on a flat background, few
/// distinct colors, sharp edges. On this class DCT produces exactly the defects
/// the side-by-side review flagged (background mottling, muddied dash-dot
/// lines, hairline color shift), and the 5%-savings guard is no protection: a
/// JPEG of line art beats a mediocre deflate almost every time, so savings
/// alone always says "convert".
///
/// The signature is "mostly one flat background color, a handful of ink colors
/// on top, and only a thin scattering of sharp transitions": a dominant
/// background covering ≥ 75% of the image, the top 8 quantized colors covering
/// ≥ 90%, and fewer than 10% of pixels sitting on a sharp edge. Rasterized
/// plots/photographs fail the first two by a wide margin — their color mass is
/// spread across gradients — and dense high-contrast raster content fails the
/// third.
///
/// Measured values on the Phase 7 review corpus (`target/spike/nasa.off.pdf`
/// and `sample.off.pdf`, the flag-OFF outputs the census diffed):
///
/// | class | objs | background | palette(8) | edges | verdict |
/// | --- | --- | ---: | ---: | ---: | --- |
/// | line-art plug profiles (p12) | 59–61 | 0.909–0.930 | 0.946–0.956 | 0.061–0.065 | DECLINE |
/// | CFD velocity fields (p8/p10) | 36, 46 | 0.201, 0.413 | 0.425, 0.568 | 0.092, 0.138 | convert |
/// | 3D PSD surface plots (p39/40) | 248–255 | 0.522–0.538 | 0.747–0.778 | 0.152–0.183 | convert |
/// | synthetic noise stripes | sample 4–5 | 0.001–0.008 | 0.007–0.057 | 0.104–0.363 | convert |
///
/// The background metric alone separates the classes by a factor of two; the
/// palette and edge conditions are belt-and-braces so a near-flat *photograph*
/// (say a product shot on white) with real tonal content is still converted.
fn looks_like_line_art(pixels: &[u8], channels: usize, w: u32, h: u32) -> bool {
    let m = line_art_metrics(pixels, channels, w, h);
    m.background >= LINE_ART_MIN_BACKGROUND
        && m.palette >= LINE_ART_MIN_PALETTE
        && m.edges <= LINE_ART_MAX_EDGES
}

const LINE_ART_MIN_BACKGROUND: f64 = 0.75;
const LINE_ART_MIN_PALETTE: f64 = 0.90;
const LINE_ART_MAX_EDGES: f64 = 0.08;

/// Phase 7 spike: the consent-gated lossy Flate→JPEG candidate. Decodes the
/// Flate pixels through the exact same gates as the format-preserving path
/// (`decode_flate_image`), optionally resizes to the target geometry
/// (Lanczos3 — the same kernel every resize path uses; a same-size target is
/// a pure re-encode), JPEG-encodes at `OptimizeOptions::jpeg_quality`
/// preserving the channel count, and decode-back-verifies the candidate
/// against the exact pixels handed to the encoder (geometry + channel count +
/// the D-M1 MAD ceiling). Returns the JPEG bytes, or `None` on any doubt.
/// Only reached when `allow_lossy_reencode` is true; size guards are the
/// caller's.
///
/// The [`looks_like_line_art`] content check runs on every candidate, always
/// against the DECODED SOURCE pixels — never resized ones, where the resampler
/// has already blurred the sharp edges and flat backgrounds the metrics key on.
/// Declining here removes only the JPEG candidate; on the over-resolution path
/// the format-preserving Flate downsample still competes and ships, so line art
/// keeps exactly the flag-off result.
fn plan_flate_to_jpeg(
    doc: &Document,
    stream: &lopdf::Stream,
    options: OptimizeOptions,
    px_w: u32,
    px_h: u32,
    target_w: u32,
    target_h: u32,
) -> Option<Vec<u8>> {
    let quality = options.jpeg_quality.clamp(1, 100);
    let (img, channels) = decode_flate_image(doc, stream, px_w, px_h)?;
    let is_gray = channels == 1;
    let source = if is_gray {
        img.to_luma8().into_raw()
    } else {
        img.to_rgb8().into_raw()
    };
    if looks_like_line_art(&source, channels, px_w, px_h) {
        return None;
    }
    let img = if (target_w, target_h) == (px_w, px_h) {
        img
    } else {
        img.resize_exact(target_w, target_h, image::imageops::FilterType::Lanczos3)
    };
    let reference = if is_gray {
        img.to_luma8().into_raw()
    } else {
        img.to_rgb8().into_raw()
    };
    let out = encode_jpeg(img, is_gray, quality)?;
    if !decode_back_matches(
        &out,
        &reference,
        is_gray,
        target_w,
        target_h,
        DECODE_BACK_MAX_MAD,
    ) {
        return None;
    }
    Some(out)
}

/// The dimension-preserving lossy Flate→JPEG conversion as a full
/// `Replacement` (Phase 7 spike): re-encode at the stream's own geometry,
/// then apply the strict-smaller AND 5% minimum-savings guard — the same
/// arithmetic as `plan_requant_replacement`, and for the same reason: once
/// converted, the payload is a DCTDecode stream whose second-pass requant
/// churn lands under 5% and is declined, keeping repeat passes byte-stable.
///
/// The [`looks_like_line_art`] content guard matters most here: a
/// dimension-preserving conversion competes against nothing, so without a
/// content check the 5% rule converts line art unconditionally (a q78 JPEG of
/// thin curves on white beats a mediocre deflate by ~50%) — and line art is
/// precisely the class DCT is worst at.
fn plan_flate_lossy_requant_replacement(
    doc: &Document,
    stream: &lopdf::Stream,
    options: OptimizeOptions,
    id: ObjectId,
    px_w: u32,
    px_h: u32,
) -> Option<Replacement> {
    let out = plan_flate_to_jpeg(doc, stream, options, px_w, px_h, px_w, px_h)?;
    if out.len() * 100 >= stream.content.len() * 95 {
        return None;
    }
    Some(Replacement {
        id,
        content: out,
        width: px_w as i64,
        height: px_h as i64,
        dict_update: DictUpdate::FlateToJpeg,
        smask: None,
    })
}

/// Resolve `/ColorSpace` to a component count the M1 Flate path handles:
/// DeviceRGB / ICCBased N=3 -> 3, DeviceGray / ICCBased N=1 -> 1. Anything
/// else (Indexed, Separation, Lab, CalRGB, ...) -> `None` (image untouched).
fn flate_channels(doc: &Document, dict: &lopdf::Dictionary) -> Option<usize> {
    match resolve(doc, dict.get(b"ColorSpace").ok()?) {
        Object::Name(n) if n == b"DeviceRGB" => Some(3),
        Object::Name(n) if n == b"DeviceGray" => Some(1),
        Object::Array(items) if items.len() == 2 => {
            if !matches!(resolve(doc, &items[0]), Object::Name(n) if n == b"ICCBased") {
                return None;
            }
            let icc = resolve(doc, &items[1]).as_stream().ok()?;
            match resolve(doc, icc.dict.get(b"N").ok()?).as_i64().ok()? {
                1 => Some(1),
                3 => Some(3),
                _ => None,
            }
        }
        _ => None,
    }
}

/// How a Flate image's pixel data is laid out inside the deflate stream.
enum FlateEncoding {
    /// Raw pixel rows, no predictor.
    Plain,
    /// PNG-filtered rows (Predictor 10-15): a leading filter-type byte per row.
    PngPredictor,
}

/// Classify the stream's `/DecodeParms` (if any) into a layout the M1 path
/// decodes, or `None` (skip). Only the direct-dictionary form is accepted
/// (arrays and indirect references are out of scope — lopdf ignores them too,
/// so such streams have never been reliably decodable here), the predictor
/// must be 1 (none) or PNG 10-15 (TIFF Predictor 2 is out of scope), and for
/// PNG predictors the declared Colors/Columns/BitsPerComponent must match the
/// image dictionary or the row stride would be wrong. Defaults mirror the PDF
/// spec (Predictor 1, Colors 1, Columns 1, BitsPerComponent 8).
fn flate_encoding(dict: &lopdf::Dictionary, channels: usize, px_w: u32) -> Option<FlateEncoding> {
    let parms = match dict.get(b"DecodeParms") {
        Err(_) => return Some(FlateEncoding::Plain), // no parms: plain deflate
        Ok(Object::Dictionary(d)) => d,
        Ok(_) => return None, // array / reference form: out of M1 scope
    };
    let predictor = parms
        .get(b"Predictor")
        .and_then(Object::as_i64)
        .unwrap_or(1);
    match predictor {
        1 => Some(FlateEncoding::Plain),
        10..=15 => {
            let colors = parms.get(b"Colors").and_then(Object::as_i64).unwrap_or(1);
            let columns = parms.get(b"Columns").and_then(Object::as_i64).unwrap_or(1);
            let parms_bpc = parms
                .get(b"BitsPerComponent")
                .and_then(Object::as_i64)
                .unwrap_or(8);
            let matches_image =
                colors == channels as i64 && columns == i64::from(px_w) && parms_bpc == 8;
            matches_image.then_some(FlateEncoding::PngPredictor)
        }
        _ => None,
    }
}

/// Inflate a zlib stream with a hard output cap. Returns `None` for corrupt
/// or truncated input (unlike lopdf, which logs and returns partial data as
/// `Ok`) and for streams that would produce more than `limit` bytes — the
/// actual decompression-bomb guard, enforced *during* inflation.
fn inflate_capped(data: &[u8], limit: usize) -> Option<Vec<u8>> {
    use std::io::Read;
    let mut out = Vec::new();
    // Read one byte past the cap so an over-limit stream is distinguishable
    // from one that is exactly at it.
    let mut dec = flate2::read::ZlibDecoder::new(data).take(limit as u64 + 1);
    dec.read_to_end(&mut out).ok()?;
    if out.len() > limit {
        return None;
    }
    Some(out)
}

/// PNG Paeth predictor (PNG spec §9.4).
fn paeth_predict(left: u8, up: u8, upper_left: u8) -> u8 {
    let (a, b, c) = (i16::from(left), i16::from(up), i16::from(upper_left));
    let p = a + b - c;
    let (pa, pb, pc) = ((p - a).abs(), (p - b).abs(), (p - c).abs());
    if pa <= pb && pa <= pc {
        left
    } else if pb <= pc {
        up
    } else {
        upper_left
    }
}

/// Spec-correct inversion of PNG row filters over a whole frame of
/// `[tag][filtered row]` records. Hand-rolled rather than lopdf's
/// `filters::png::decode_frame` because lopdf 0.42 mis-computes the Avg
/// filter (`left + up/2` instead of `(left + up)/2`, verified by round-trip
/// test) — silently wrong pixels with the correct length, which the outer
/// length check cannot catch. Returns `None` on any malformed shape.
fn png_defilter(data: &[u8], bytes_per_pixel: usize, bytes_per_row: usize) -> Option<Vec<u8>> {
    let stride = bytes_per_row.checked_add(1)?;
    if bytes_per_row == 0 || !data.len().is_multiple_of(stride) {
        return None;
    }
    let rows = data.len() / stride;
    let mut out = vec![0u8; rows * bytes_per_row];
    for r in 0..rows {
        let src = &data[r * stride..(r + 1) * stride];
        let tag = src[0];
        let (done, rest) = out.split_at_mut(r * bytes_per_row);
        let prev = &done[done.len().saturating_sub(bytes_per_row)..];
        let cur = &mut rest[..bytes_per_row];
        cur.copy_from_slice(&src[1..]);
        let bpp = bytes_per_pixel;
        let up_at = |i: usize| if r == 0 { 0 } else { prev[i] };
        match tag {
            0 => {}
            1 => {
                for i in bpp..bytes_per_row {
                    cur[i] = cur[i].wrapping_add(cur[i - bpp]);
                }
            }
            2 => {
                for (i, c) in cur.iter_mut().enumerate() {
                    *c = c.wrapping_add(up_at(i));
                }
            }
            3 => {
                for i in 0..bytes_per_row {
                    let left = if i >= bpp { u16::from(cur[i - bpp]) } else { 0 };
                    let up = u16::from(up_at(i));
                    cur[i] = cur[i].wrapping_add(((left + up) / 2) as u8);
                }
            }
            4 => {
                for i in 0..bytes_per_row {
                    let left = if i >= bpp { cur[i - bpp] } else { 0 };
                    let up = up_at(i);
                    let upper_left = if i >= bpp { up_at(i - bpp) } else { 0 };
                    cur[i] = cur[i].wrapping_add(paeth_predict(left, up, upper_left));
                }
            }
            _ => return None,
        }
    }
    Some(out)
}

/// Apply the PNG Up filter to every row, producing the predictor-encoded byte
/// stream FlateDecode + `/Predictor >= 10` expects: each row is a leading
/// filter-type byte (2 = Up) followed by the filtered row bytes.
fn png_up_filter(raw: &[u8], width: u32, channels: usize) -> Vec<u8> {
    use lopdf::filters::png;

    let bytes_per_row = width as usize * channels;
    let rows = raw.len() / bytes_per_row.max(1);
    let mut out = Vec::with_capacity(raw.len() + rows);
    let mut previous = vec![0u8; bytes_per_row];
    for row in raw.chunks_exact(bytes_per_row) {
        let mut current = row.to_vec();
        // `previous` must be the UNFILTERED prior row (encode_row subtracts it).
        png::encode_row(png::FilterType::Up, channels, &previous, &mut current);
        out.push(2); // PNG filter-type tag: Up
        out.extend_from_slice(&current);
        previous.copy_from_slice(row);
    }
    out
}

/// Deflate (zlib container, as FlateDecode requires) at maximum compression.
fn deflate_level9(data: &[u8]) -> Option<Vec<u8>> {
    use std::io::Write;
    let mut enc = flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::new(9));
    enc.write_all(data).ok()?;
    enc.finish().ok()
}

/// Deflate with the exhaustive zopfli search (default 15 iterations). Same
/// zlib container as [`deflate_level9`] — any inflate reads it — just a more
/// expensive hunt for a smaller encoding.
fn deflate_zopfli(data: &[u8]) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    zopfli::compress(
        zopfli::Options::default(),
        zopfli::Format::Zlib,
        data,
        &mut out,
    )
    .ok()?;
    Some(out)
}

/// Dispatch to the configured deflate backend (final-pass call sites only —
/// planning-time deflates always use [`deflate_level9`] for speed, and the
/// final pass revisits their output anyway).
fn deflate_backend(data: &[u8], backend: DeflateBackend) -> Option<Vec<u8>> {
    match backend {
        DeflateBackend::Zlib => deflate_level9(data),
        DeflateBackend::Zopfli => deflate_zopfli(data),
    }
}

/// Encode an image as JPEG using mozjpeg (optimized Huffman + trellis), which
/// produces substantially smaller files than the basic encoder at equal
/// quality. Channel count is preserved to match the unchanged PDF /ColorSpace.
/// Decode a JPEG that we are about to shrink, using libjpeg's DCT-domain
/// scaled decoding so the full-resolution image is never materialized.
///
/// Decoding is done at the smallest `n/8` scale whose output still covers the
/// target in both axes, so the caller's Lanczos3 step always downsamples and
/// quality is preserved. A 4000x4000 source targeting 180px decodes at 1/8
/// (500x500, ~750 KB) instead of full size (~48 MB) — most of the IDCT work and
/// nearly all of the intermediate allocation disappear.
///
/// Returns `(image, is_grayscale)`, or `None` for anything that is not plain
/// RGB or grayscale (e.g. CMYK/YCCK) so the caller can fall back to the
/// general-purpose decoder rather than risk mis-handling color.
fn decode_jpeg_scaled(data: &[u8], target_w: u32, target_h: u32) -> Option<(DynamicImage, bool)> {
    let mut dec = mozjpeg::Decompress::new_mem(data).ok()?;
    let (full_w, full_h) = (dec.width(), dec.height());
    if full_w == 0 || full_h == 0 {
        return None;
    }

    // Smallest n/8 that still covers the target in BOTH axes (never upscale).
    let mut numerator = 8u8;
    for n in 1..=8u8 {
        let scaled_w = (full_w * n as usize).div_ceil(8);
        let scaled_h = (full_h * n as usize).div_ceil(8);
        if scaled_w >= target_w as usize && scaled_h >= target_h as usize {
            numerator = n;
            break;
        }
    }
    // Decide the channel count from the JPEG's OWN colorspace and then request
    // that output explicitly. Do NOT rely on `image()`/`out_color_space`: for a
    // grayscale JPEG libjpeg's default can still hand back RGB, which would
    // write 3-channel data into a stream whose PDF /ColorSpace is DeviceGray —
    // a corrupt image. `grayscale_stays_grayscale` pins this.
    use mozjpeg::ColorSpace;
    let is_gray = dec.color_space() == ColorSpace::JCS_GRAYSCALE;
    // CMYK/YCCK need a color conversion we don't want to hand-roll.
    if matches!(
        dec.color_space(),
        ColorSpace::JCS_CMYK | ColorSpace::JCS_YCCK
    ) {
        return None;
    }

    dec.scale(numerator);

    let mut started = if is_gray {
        dec.grayscale().ok()?
    } else {
        dec.rgb().ok()?
    };
    let (w, h) = (started.width(), started.height());
    let buf: Vec<u8> = started.read_scanlines::<u8>().ok()?;
    started.finish().ok()?;

    let img = if is_gray {
        DynamicImage::ImageLuma8(image::GrayImage::from_raw(w as u32, h as u32, buf)?)
    } else {
        DynamicImage::ImageRgb8(image::RgbImage::from_raw(w as u32, h as u32, buf)?)
    };
    Some((img, is_gray))
}

/// Takes `img` **by value** so the pixel buffer can be moved out with `into_*`
/// instead of copied: `to_rgb8(&self)` always allocates a fresh buffer, while
/// `into_rgb8(self)` returns the existing one when the variant already matches
/// (which it does — `resize_exact` preserves the type).
fn encode_jpeg(img: DynamicImage, is_gray: bool, quality: u8) -> Option<Vec<u8>> {
    use mozjpeg::{ColorSpace, Compress};

    // Capture dimensions before the buffer is moved out.
    let (width, height) = (img.width() as usize, img.height() as usize);
    let (color_space, data) = if is_gray {
        (ColorSpace::JCS_GRAYSCALE, img.into_luma8().into_raw())
    } else {
        (ColorSpace::JCS_RGB, img.into_rgb8().into_raw())
    };

    let mut comp = Compress::new(color_space);
    comp.set_size(width, height);
    comp.set_quality(quality as f32);

    let mut started = comp.start_compress(Vec::new()).ok()?;
    started.write_scanlines(&data).ok()?;
    started.finish().ok()
}

/// A planned `/JPXDecode` → `/DCTDecode` conversion (strictly opt-in via
/// `--allow-lossy`, like every other encoding-class change).
struct JpxConversion {
    id: ObjectId,
    content: Vec<u8>,
    /// `DeviceRGB` or `DeviceGray` — the JPX stream may carry its color space
    /// inside the codestream with no `/ColorSpace` in the dict at all, so the
    /// replacement must write one explicitly for the JPEG payload.
    colorspace: &'static [u8],
    /// Codestream geometry. Written into the dict: PDF 32000 §7.4.9 requires
    /// dict `/Width`/`/Height` to match the codestream, but real files get
    /// this wrong, and viewers follow the self-framing codestream (the image
    /// maps to the unit square either way). The replacement normalizes the
    /// dict to the truth.
    width: u32,
    height: u32,
}

/// Plan lossy JPEG2000 → JPEG conversions for every eligible `/JPXDecode`
/// image. JPX is the one payload class where a *dimension-preserving* lossy
/// re-encode adds compatibility value beyond size: JPEG2000 support in
/// viewers is spotty, DCT support is universal.
///
/// Eligibility is deliberately narrow (any doubt → untouched):
/// - `/Subtype /Image`, scalar `/JPXDecode` filter, no `/DecodeParms`;
/// - no `/SMask`, `/Mask`, or `/Decode` (semantics we would have to carry);
/// - `/ColorSpace` absent (the JP2 box supplies it) or exactly the matching
///   `DeviceRGB`/`DeviceGray` name; anything else (ICC, Indexed, Lab) would
///   change appearance when re-tagged;
/// - 8-bit, no alpha, opaque Gray/RGB decode (the codestream's geometry is
///   authoritative and gets written back into the dict — see
///   [`JpxConversion::width`]);
/// - not line art (`looks_like_line_art`, same posture as Flate→JPEG);
/// - the JPEG re-decodes to the same pixels within `DECODE_BACK_MAX_MAD`;
/// - ≥5% smaller, the same arithmetic as `plan_requant_replacement` and for
///   the same reason: the output is a DCTDecode stream a second pass would
///   otherwise churn on, and the 5% floor keeps repeat passes byte-stable.
fn plan_jpx_conversions(doc: &Document, options: OptimizeOptions) -> Vec<JpxConversion> {
    use dicom_toolkit_jpeg2000::{ColorSpace, DecodeSettings, Image as JpxImage};

    let quality = options.jpeg_quality.clamp(1, 100);
    let mut plans = Vec::new();
    for (&id, obj) in doc.objects.iter() {
        let Object::Stream(stream) = obj else {
            continue;
        };
        if !matches!(stream.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
            continue;
        }
        let Ok(filter) = stream.dict.get(b"Filter") else {
            continue;
        };
        if classify_filter(doc, filter) != FilterClass::JpxOnly {
            continue;
        }
        if [&b"DecodeParms"[..], b"SMask", b"Mask", b"Decode"]
            .iter()
            .any(|k| !matches!(stream.dict.get(k), Err(_) | Ok(Object::Null)))
        {
            continue;
        }
        let Ok(jpx) = JpxImage::new(&stream.content, &DecodeSettings::default()) else {
            continue;
        };
        if jpx.has_alpha() || jpx.original_bit_depth() != 8 {
            continue;
        }
        let (is_gray, cs_name): (bool, &'static [u8]) = match jpx.color_space() {
            ColorSpace::Gray => (true, b"DeviceGray"),
            ColorSpace::RGB => (false, b"DeviceRGB"),
            _ => continue,
        };
        match stream.dict.get(b"ColorSpace") {
            Err(_) | Ok(Object::Null) => {}
            Ok(cs) => match resolve(doc, cs) {
                Object::Name(n) if n.as_slice() == cs_name => {}
                _ => continue,
            },
        }
        let (w, h) = (jpx.width(), jpx.height());
        match stream.dict.get(b"BitsPerComponent") {
            Err(_) | Ok(Object::Null) => {}
            Ok(bpc) => {
                if bpc.as_i64().ok() != Some(8) {
                    continue;
                }
            }
        }
        let Ok(pixels) = jpx.decode() else {
            continue;
        };
        let channels = if is_gray { 1usize } else { 3 };
        if pixels.len() != (w as usize) * (h as usize) * channels {
            continue;
        }
        if looks_like_line_art(&pixels, channels, w, h) {
            continue;
        }
        let img = if is_gray {
            image::GrayImage::from_raw(w, h, pixels.clone()).map(DynamicImage::ImageLuma8)
        } else {
            image::RgbImage::from_raw(w, h, pixels.clone()).map(DynamicImage::ImageRgb8)
        };
        let Some(img) = img else { continue };
        let Some(out) = encode_jpeg(img, is_gray, quality) else {
            continue;
        };
        if !decode_back_matches(&out, &pixels, is_gray, w, h, DECODE_BACK_MAX_MAD) {
            continue;
        }
        if out.len() * 100 >= stream.content.len() * 95 {
            continue;
        }
        plans.push(JpxConversion {
            id,
            content: out,
            colorspace: cs_name,
            width: w,
            height: h,
        });
    }
    plans
}

/// Serialize a non-stream object to bytes for hashing. Returns `None` if
/// serialization fails (the object will not be deduplicated in that case).
fn serialize_object(obj: &Object) -> Option<Vec<u8>> {
    if matches!(obj, Object::Stream(_)) {
        return None;
    }
    // lopdf's Writer is private, but Object has a deterministic Debug impl:
    // structurally identical objects produce identical output, which is exactly
    // the equivalence we need for dedup. (Conservative: differing key order or
    // formatting simply means two objects aren't merged — never a false merge.)
    Some(format!("{obj:?}").into_bytes())
}

/// Recursively replace all `ObjectId` references in `obj` according to the
/// `remap` table. Streams are traversed (dict only; content bytes unchanged).
fn remap_references(obj: &mut Object, remap: &HashMap<ObjectId, ObjectId>) {
    match obj {
        Object::Reference(id) => {
            if let Some(&canonical) = remap.get(id) {
                *id = canonical;
            }
        }
        Object::Array(arr) => {
            for item in arr.iter_mut() {
                remap_references(item, remap);
            }
        }
        Object::Dictionary(dict) => {
            for (_, val) in dict.iter_mut() {
                remap_references(val, remap);
            }
        }
        Object::Stream(stream) => {
            for (_, val) in stream.dict.iter_mut() {
                remap_references(val, remap);
            }
        }
        _ => {}
    }
}

/// True for page-tree node dicts (`/Type /Page` or `/Type /Pages`), which
/// must never be deduplicated even when byte-identical. A page object has
/// IDENTITY semantics beyond its bytes: merging two identical blank pages
/// puts the same object id in `/Kids` twice, which (a) changes what GoTo
/// destinations and `/StructParents` resolve to, and (b) breaks lopdf 0.42's
/// `renumber_objects_with` — its page-reordering pass assumes `page_iter()`
/// yields distinct ids, and duplicated kids make it collide page objects onto
/// one id, silently overwriting OTHER pages (verified on the NASA repro:
/// merging two identical blank pages dropped a scanned page's dict and
/// orphaned its 1.37 MB image subtree).
fn is_page_node(obj: &Object) -> bool {
    let Object::Dictionary(dict) = obj else {
        return false;
    };
    matches!(dict.get(b"Type"), Ok(Object::Name(n)) if n == b"Page" || n == b"Pages")
}

/// Merge true duplicate non-stream objects. Two objects are duplicates when
/// their serialized bytes are identical. For each duplicate group the lowest
/// `ObjectId` is kept as canonical; all references to the others are
/// redirected, and the duplicates are removed from the document. Returns true
/// if anything merged, so the caller can iterate to a fixpoint.
///
/// Safe because identical objects produce identical results in all contexts —
/// EXCEPT page-tree nodes, whose object identity is load-bearing (see
/// [`is_page_node`]); those are never merged. Reduces the object count before
/// packing. On sparse documents (a few dozen duplicates among a few hundred
/// objects) the gain is small; on denser documents it can be more significant.
fn dedup_objects(doc: &mut Document) -> bool {
    // Group non-stream objects by their exact serialized bytes. Keying the map
    // on the bytes themselves (not a 64-bit hash of them) means only genuinely
    // identical objects ever share a bucket, so a hash collision can never
    // cause two different objects to be merged.
    let mut by_bytes: HashMap<Vec<u8>, Vec<ObjectId>> = HashMap::new();
    for (&id, obj) in doc.objects.iter() {
        if is_page_node(obj) {
            continue;
        }
        if let Some(bytes) = serialize_object(obj) {
            by_bytes.entry(bytes).or_default().push(id);
        }
    }

    // Build a remap table: non-canonical id -> canonical id.
    // Use the smallest id in each group as canonical (stable, deterministic).
    let mut remap: HashMap<ObjectId, ObjectId> = HashMap::new();
    for (_, mut ids) in by_bytes {
        if ids.len() < 2 {
            continue;
        }
        ids.sort_unstable();
        let canonical = ids[0];
        for duplicate in &ids[1..] {
            remap.insert(*duplicate, canonical);
        }
    }

    if remap.is_empty() {
        return false;
    }

    // Rewrite all references throughout the document.
    for obj in doc.objects.values_mut() {
        remap_references(obj, &remap);
    }

    // Also fix any references in the trailer dict.
    for (_, val) in doc.trailer.iter_mut() {
        remap_references(val, &remap);
    }

    // Remove the now-redundant duplicate objects. prune_objects() would also
    // clean them up, but removing them explicitly here keeps the object table
    // consistent before renumber_objects().
    for id in remap.keys() {
        doc.objects.remove(id);
    }
    true
}

/// Merge `FlateDecode` streams that decode to **byte-identical** payloads,
/// even when their on-disk (compressed) bytes differ. `dedup_streams` keys on
/// the raw stream bytes + dict, so it catches only exact restatements; this
/// second pass catches the more common case where a producer (pdfTeX, zlib)
/// wrote the *same* embedded font program or bitmap through independent
/// inflate calls — the stored zlib streams and their `/Length` differ, but the
/// decoded bytes a viewer actually consumes are identical. Down the pipeline
/// those N copies collapse to one object, removing every duplicate's bytes.
///
/// Why this is lossless: for two streams with the same decoded payload AND the
/// same dictionary, the only observable effect is that decoded payload — they
/// render identically and extract identically, so merging merely changes which
/// object a reference points at.
///
/// The dictionary is part of the key, minus `/Length` (which is a property of
/// the *stored* bytes, and differing `/Length` is the whole point of this
/// pass). Decoded bytes alone are NOT a render equivalence: the same payload
/// under a different dictionary is a different image. On the 756-page Adobe
/// spec, keying on the payload alone merged five image pairs that must stay
/// distinct — two with transposed dimensions (65x66 vs 66x65, identical index
/// bytes), and three sharing index bytes under *different* `/Indexed` palette
/// objects, which silently recolored the overprint figure on page 752.
///
/// Fail-safe: only scalar `FlateDecode` with no `/DecodeParms` is considered
/// (the shape whose decode is a pure byte-for-byte inflate, so decoded
/// equality is exactly the equivalence a viewer renders); any inflate error,
/// oversize output, or unsupported shape is skipped. The merge is keyed on the
/// full decoded bytes (not a hash), so a collision cannot cause a false merge.
/// Dictionaries are compared by their `Debug` rendering, matching
/// [`dedup_objects`]' conservative stance: differing key order or differing
/// spelling of an equivalent value simply declines the merge.
fn dedup_decoded_streams(doc: &mut Document) -> bool {
    // (decoded payload, dict minus /Length) -> object ids carrying it.
    let mut buckets: HashMap<(Vec<u8>, String), Vec<ObjectId>> = HashMap::new();
    for (&id, obj) in doc.objects.iter() {
        if let Object::Stream(s) = obj {
            // DecodeParms imply a non-trivial decode (PNG/tiff predictors)
            // whose bytes are format-specific; decoded equality would not be a
            // clean render equivalence for those shapes, so skip them.
            if !matches!(s.dict.get(b"DecodeParms"), Err(_) | Ok(Object::Null)) {
                continue;
            }
            let filter = match s.dict.get(b"Filter") {
                Ok(f) => f,
                Err(_) => continue,
            };
            if classify_filter(doc, filter) != FilterClass::FlateOnly {
                continue;
            }
            if let Some(decoded) = inflate_capped(&s.content, MAX_REDEFLATE_BYTES) {
                let mut dict = s.dict.clone();
                dict.remove(b"Length");
                buckets
                    .entry((decoded, format!("{dict:?}")))
                    .or_default()
                    .push(id);
            }
        }
    }

    // Lowest object id wins as canonical; everything else redirects to it.
    let mut remap: HashMap<ObjectId, ObjectId> = HashMap::new();
    for ids in buckets.values() {
        if ids.len() < 2 {
            continue;
        }
        let mut ids = ids.clone();
        ids.sort_unstable();
        let canonical = ids[0];
        for dup in &ids[1..] {
            remap.insert(*dup, canonical);
        }
    }
    if remap.is_empty() {
        return false;
    }
    for obj in doc.objects.values_mut() {
        remap_references(obj, &remap);
    }
    for (_, val) in doc.trailer.iter_mut() {
        remap_references(val, &remap);
    }
    for id in remap.keys() {
        doc.objects.remove(id);
    }
    true
}

/// Decoded bytes of a content stream, accepting only shapes whose decode is
/// beyond doubt: no filter at all, or scalar/array `FlateDecode` with no
/// `/DecodeParms`. Anything else (LZW, predictors, exotic filters, inflate
/// failure) returns `None` and the stream is left untouched.
fn content_stream_plain(doc: &Document, stream: &lopdf::Stream) -> Option<Vec<u8>> {
    match stream.dict.get(b"Filter") {
        Err(_) | Ok(Object::Null) => Some(stream.content.clone()),
        Ok(filter) => {
            if classify_filter(doc, filter) != FilterClass::FlateOnly {
                return None;
            }
            if !matches!(stream.dict.get(b"DecodeParms"), Err(_) | Ok(Object::Null)) {
                return None;
            }
            inflate_capped(&stream.content, MAX_REDEFLATE_BYTES)
        }
    }
}

/// Count how many `Object::Reference`s point at each object id, across every
/// object body and the trailer. Used by the content minifier to prove a
/// multi-stream page's content objects are referenced ONLY by that page before
/// replacing the array with a single merged stream.
fn count_object_references(doc: &Document) -> HashMap<ObjectId, usize> {
    fn walk(obj: &Object, counts: &mut HashMap<ObjectId, usize>) {
        match obj {
            Object::Reference(id) => *counts.entry(*id).or_insert(0) += 1,
            Object::Array(items) => items.iter().for_each(|o| walk(o, counts)),
            Object::Dictionary(d) => d.iter().for_each(|(_, v)| walk(v, counts)),
            Object::Stream(s) => s.dict.iter().for_each(|(_, v)| walk(v, counts)),
            _ => {}
        }
    }
    let mut counts = HashMap::new();
    for obj in doc.objects.values() {
        walk(obj, &mut counts);
    }
    for (_, v) in doc.trailer.iter() {
        walk(v, &mut counts);
    }
    counts
}

/// Semantic equality for re-parsed content operands. Plain `PartialEq` is too
/// strict for one deliberate case: `Real(1.0)` re-emits as `1` (Rust's
/// shortest round-trip formatting), which re-parses as `Integer(1)`. The
/// number a viewer computes is identical, so Integer/Real pairs compare by
/// value. The integer side always came from re-parsing the Real's exact
/// printed digits, so the `as f32` conversion reproduces the original bit
/// pattern — there is no precision loophole. Everything else (names, strings
/// with their format, booleans, references) must match exactly.
fn objects_equivalent(a: &Object, b: &Object) -> bool {
    match (a, b) {
        (Object::Integer(i), Object::Real(r)) | (Object::Real(r), Object::Integer(i)) => {
            *i as f32 == *r
        }
        (Object::Array(x), Object::Array(y)) => {
            x.len() == y.len() && x.iter().zip(y).all(|(p, q)| objects_equivalent(p, q))
        }
        (Object::Dictionary(x), Object::Dictionary(y)) => {
            x.len() == y.len()
                && x.iter()
                    .all(|(k, v)| y.get(k).map(|w| objects_equivalent(v, w)).unwrap_or(false))
        }
        _ => a == b,
    }
}

/// The numeric literals of a content stream, in order, as f64 — the precision
/// a real viewer parses at. lopdf holds operands as f32, so its re-emit can
/// print a *shorter* decimal that maps to the same f32 but a different f64
/// (e.g. `0.30000001` -> `0.3`), and that sub-1e-7 drift is enough to flip an
/// antialiased pixel in a strict render-hash comparison. The minifier
/// therefore requires the original and re-emitted number sequences to be
/// f64-identical; trailing-zero/whitespace rewrites pass (same decimal value),
/// true precision changes don't. `None` = lexing confusion; caller must skip.
///
/// The lexer only needs to be exact about what can HIDE digits: literal
/// strings (with escapes and balanced parens), hex strings, names (regular
/// chars include digits), and comments. Numbers are `[+-]?[0-9.]+`; a token
/// like `1.2.3` (two PDF numbers) fails the f64 parse and returns `None`,
/// erring toward keeping the original bytes.
fn content_number_values(bytes: &[u8]) -> Option<Vec<f64>> {
    let tokens = content_number_tokens(bytes)?;
    let mut out = Vec::with_capacity(tokens.len());
    for span in tokens {
        let text = std::str::from_utf8(&bytes[span])
            .ok()
            .filter(|t| t.bytes().filter(|&b| b == b'.').count() <= 1)?;
        out.push(text.parse::<f64>().ok()?);
    }
    Some(out)
}

/// Byte spans of every numeric literal in a content stream, in order. See
/// `content_number_values` for the lexer's scope and failure posture.
fn content_number_tokens(bytes: &[u8]) -> Option<Vec<std::ops::Range<usize>>> {
    let mut out = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        let b = bytes[i];
        match b {
            b'\0' | b'\t' | b'\n' | b'\x0C' | b'\r' | b' ' => i += 1,
            b'%' => {
                while i < bytes.len() && bytes[i] != b'\n' && bytes[i] != b'\r' {
                    i += 1;
                }
            }
            b'(' => {
                let mut depth = 1usize;
                i += 1;
                while i < bytes.len() && depth > 0 {
                    match bytes[i] {
                        b'\\' => i += 1, // skip the escaped byte too
                        b'(' => depth += 1,
                        b')' => depth -= 1,
                        _ => {}
                    }
                    i += 1;
                }
                if depth > 0 {
                    return None;
                }
            }
            b'<' => {
                if bytes.get(i + 1) == Some(&b'<') {
                    i += 2;
                } else {
                    i += 1;
                    while i < bytes.len() && bytes[i] != b'>' {
                        i += 1;
                    }
                    i += 1;
                }
            }
            b'/' => {
                i += 1;
                while i < bytes.len() && is_regular_content_char(bytes[i]) {
                    i += 1;
                }
            }
            b'+' | b'-' | b'.' | b'0'..=b'9' => {
                let start = i;
                i += 1;
                while i < bytes.len() && matches!(bytes[i], b'0'..=b'9' | b'.') {
                    i += 1;
                }
                out.push(start..i);
            }
            b'>' | b']' | b'[' | b'{' | b'}' | b')' => i += 1,
            _ => {
                i += 1;
                while i < bytes.len() && is_regular_content_char(bytes[i]) {
                    i += 1;
                }
            }
        }
    }
    Some(out)
}

/// Shortest decimal-EXACT form of a PDF number literal: drop a `+` sign,
/// leading integer zeros, trailing fraction zeros, and a bare trailing `.`.
/// Never changes the decimal value, so the f64 a viewer parses is identical —
/// unlike shortest-f32 re-printing. `-0`/`-0.000` normalize to `0`.
fn minify_number_literal(text: &str) -> String {
    let (neg, rest) = match text.as_bytes().first() {
        Some(b'-') => (true, &text[1..]),
        Some(b'+') => (false, &text[1..]),
        _ => (false, text),
    };
    let (int, frac) = match rest.split_once('.') {
        Some((i, f)) => (i, f),
        None => (rest, ""),
    };
    let int = int.trim_start_matches('0');
    let frac = frac.trim_end_matches('0');
    let sign = if neg && !(int.is_empty() && frac.is_empty()) {
        "-"
    } else {
        ""
    };
    if frac.is_empty() {
        if int.is_empty() {
            "0".to_string()
        } else {
            format!("{sign}{int}")
        }
    } else {
        format!("{sign}{int}.{frac}")
    }
}

fn is_regular_content_char(b: u8) -> bool {
    !matches!(
        b,
        b'\0'
            | b'\t'
            | b'\n'
            | b'\x0C'
            | b'\r'
            | b' '
            | b'('
            | b')'
            | b'<'
            | b'>'
            | b'['
            | b']'
            | b'{'
            | b'}'
            | b'/'
            | b'%'
    )
}

fn operations_equivalent(a: &[lopdf::content::Operation], b: &[lopdf::content::Operation]) -> bool {
    a.len() == b.len()
        && a.iter().zip(b).all(|(x, y)| {
            x.operator == y.operator
                && x.operands.len() == y.operands.len()
                && x.operands
                    .iter()
                    .zip(&y.operands)
                    .all(|(p, q)| objects_equivalent(p, q))
        })
}

/// Re-emit one decoded content payload compactly; `None` unless every guard
/// passes. Returns the winning stored bytes and whether they are deflated.
///
/// Guards, in order:
/// - `Content::decode_strict` — the lenient decoder silently TRUNCATES
///   malformed input, which re-encoding would turn into dropped operators.
///   Strict parsing errors instead, and we skip the stream.
/// - No `BI` operator: lopdf represents an unparseable inline image as a bare
///   `BI` with the binary data dropped, so any stream carrying inline images
///   is left untouched wholesale.
/// - Re-parse equality: the re-emitted bytes must strict-parse back to
///   operations semantically identical to the original (see
///   `objects_equivalent`) — the emit is verified, not trusted.
/// - `encoded < plain_stored`: the pass claims work only for TRUE text
///   minification. A stream whose text merely re-deflates smaller is the
///   final serialization pass's business and must not, on its own, cause an
///   otherwise-untouched file to be rewritten.
/// - `best < disk_stored`: whatever we store must be strictly smaller than
///   the caller's bar — the smaller of the stored bytes and the redeflated
///   original text, i.e. what the pipeline would produce with no minify.
///   When the original had no `/Filter` and the winner is deflated, the
///   19 bytes of `/Filter/FlateDecode` dict text the rewrite adds are charged
///   to the candidate (measured: without this, ~350 tiny uncompressed Form
///   XObjects each "won" by 2 stream bytes while growing 17 on disk).
const FILTER_DICT_COST: usize = b"/Filter/FlateDecode".len();

fn replan_content(
    decoded: &[u8],
    plain_stored: usize,
    disk_stored: usize,
    gains_filter_cost: bool,
    backend: DeflateBackend,
) -> Option<(Vec<u8>, bool)> {
    let ops = Content::decode_strict(decoded).ok()?;
    if ops.operations.iter().any(|op| op.operator == "BI") {
        return None;
    }
    let emitted = ops.encode().ok()?;
    // lopdf re-emits numbers from its f32 operands, which can silently move
    // the f64 value a viewer parses (see `content_number_values`). Splice the
    // ORIGINAL literals back in, in their shortest decimal-exact form: the
    // token sequences correspond 1:1 because the operations are the same.
    let original_tokens = content_number_tokens(decoded)?;
    let emitted_tokens = content_number_tokens(&emitted)?;
    if original_tokens.len() != emitted_tokens.len() {
        return None;
    }
    let mut encoded = Vec::with_capacity(emitted.len());
    let mut cursor = 0usize;
    for (orig, emit) in original_tokens.iter().zip(&emitted_tokens) {
        let literal = std::str::from_utf8(&decoded[orig.clone()]).ok()?;
        encoded.extend_from_slice(&emitted[cursor..emit.start]);
        encoded.extend_from_slice(minify_number_literal(literal).as_bytes());
        cursor = emit.end;
    }
    encoded.extend_from_slice(&emitted[cursor..]);
    if encoded.len() >= plain_stored {
        return None;
    }
    let reparsed = Content::decode_strict(&encoded).ok()?;
    if !operations_equivalent(&ops.operations, &reparsed.operations) {
        return None;
    }
    // Belt and braces: the spliced stream's numbers must be f64-identical to
    // the original's. Holds by construction; verified anyway because this is
    // the guard the render-hash contract rests on.
    if content_number_values(decoded)? != content_number_values(&encoded)? {
        return None;
    }
    let (best, is_deflated) = match deflate_backend(&encoded, backend) {
        Some(d) if d.len() < encoded.len() => (d, true),
        _ => (encoded, false),
    };
    let cost = best.len()
        + if is_deflated && gains_filter_cost {
            FILTER_DICT_COST
        } else {
            0
        };
    (cost < disk_stored).then_some((best, is_deflated))
}

/// Minify page content streams and Form XObject content: decode the operator
/// stream, re-emit it with single-space operand separation and Rust's
/// shortest-round-trip float formatting, and keep the result only when it is
/// strictly smaller (see `replan_content` for the full guard list). A page
/// whose `/Contents` is an array is re-emitted as ONE merged stream — the
/// array elements are concatenated before parsing (operators may span element
/// boundaries, so per-element parsing would be wrong), and the merge is
/// applied only when every element is referenced solely by this page.
///
/// Why this is render-equivalent: the operations a viewer executes are the
/// parsed ones, and the re-parse-equality guard proves the new bytes parse to
/// the same operations. Comments and redundant whitespace are the only
/// casualties. Prior spike measurements showed the effect is CONDITIONAL
/// per file (some producers already emit compactly; floats like `.1531`
/// re-print longer as `0.1531`), which is exactly why every stream keeps its
/// original bytes unless the rewrite wins.
///
/// Declined wholesale for encrypted, PDF/A-declared, and signed documents,
/// same posture as `redeflate_flate_streams`.
fn minify_content_streams(doc: &mut Document, backend: DeflateBackend) -> bool {
    if doc.is_encrypted() || fonts::pdfa_blocked(doc) || signature_present(doc) {
        return false;
    }
    let refcounts = count_object_references(doc);
    let mut changed = false;

    struct PageRewrite {
        page_id: ObjectId,
        ids: Vec<ObjectId>,
        content: Vec<u8>,
        deflated: bool,
    }
    let mut rewrites: Vec<PageRewrite> = Vec::new();
    for (_, page_id) in doc.get_pages() {
        let ids = doc.get_page_contents(page_id);
        if ids.is_empty() {
            continue;
        }
        let mut plain_stored = 0usize;
        let mut disk_stored = 0usize;
        let mut decoded = Vec::new();
        let mut eligible = true;
        let mut any_unfiltered = false;
        for &sid in &ids {
            let Ok(stream) = doc.get_object(sid).and_then(Object::as_stream) else {
                eligible = false;
                break;
            };
            let Some(bytes) = content_stream_plain(doc, stream) else {
                eligible = false;
                break;
            };
            let has_filter = !matches!(stream.dict.get(b"Filter"), Err(_) | Ok(Object::Null));
            any_unfiltered |= !has_filter;
            plain_stored += bytes.len();
            // The bar to beat is not what the file stores today but what the
            // final redeflate pass would store WITHOUT minification — else a
            // weakly-deflated original lets a longer-but-freshly-deflated
            // re-emit "win" while losing to the counterfactual (measured:
            // +8 KB on a pdfTeX file whose floats mostly re-print longer). An
            // unfiltered original that the pipeline would compress also pays
            // the filter-name dict cost in that counterfactual.
            let redeflated = deflate_backend(&bytes, backend)
                .map(|d| d.len() + if has_filter { 0 } else { FILTER_DICT_COST });
            disk_stored += match redeflated {
                Some(n) => n.min(stream.content.len()),
                None => stream.content.len(),
            };
            decoded.extend_from_slice(&bytes);
            // Separator between elements, per spec concatenation semantics.
            decoded.push(b'\n');
        }
        if !eligible {
            continue;
        }
        let Some((content, deflated)) =
            replan_content(&decoded, plain_stored, disk_stored, any_unfiltered, backend)
        else {
            continue;
        };
        // Merging an array into one stream deletes the elements (via the later
        // orphan prune); that is only sound — and only the size win we
        // measured — when nothing else references them.
        if ids.len() > 1 && ids.iter().any(|id| refcounts.get(id) != Some(&1)) {
            continue;
        }
        rewrites.push(PageRewrite {
            page_id,
            ids,
            content,
            deflated,
        });
    }
    for r in rewrites {
        if let [only] = r.ids[..] {
            if let Ok(Object::Stream(s)) = doc.get_object_mut(only) {
                s.set_content(r.content);
                if r.deflated {
                    s.dict.set("Filter", Object::Name(b"FlateDecode".to_vec()));
                } else {
                    s.dict.remove(b"Filter");
                }
                s.dict.remove(b"DecodeParms");
                changed = true;
            }
        } else {
            let mut dict = lopdf::Dictionary::new();
            if r.deflated {
                dict.set("Filter", Object::Name(b"FlateDecode".to_vec()));
            }
            let new_id = doc.add_object(Object::Stream(lopdf::Stream::new(dict, r.content)));
            if let Ok(Object::Dictionary(page)) = doc.get_object_mut(r.page_id) {
                page.set("Contents", Object::Reference(new_id));
                changed = true;
                // The replaced elements go orphan; prune_objects drops them.
            }
        }
    }

    // Form XObjects are self-contained content streams (their own /Resources,
    // never split), so each is minified independently, in place — safe even if
    // shared across pages, since the semantics are proven unchanged.
    let form_ids: Vec<ObjectId> = doc
        .objects
        .iter()
        .filter_map(|(&id, obj)| {
            let Object::Stream(s) = obj else { return None };
            matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Form").then_some(id)
        })
        .collect();
    for id in form_ids {
        let Ok(stream) = doc.get_object(id).and_then(Object::as_stream) else {
            continue;
        };
        let Some(plain) = content_stream_plain(doc, stream) else {
            continue;
        };
        // Same counterfactual bar as the page pass: beat the redeflated
        // original, not merely the (possibly weakly-deflated) stored bytes.
        let has_filter = !matches!(stream.dict.get(b"Filter"), Err(_) | Ok(Object::Null));
        let bar = match deflate_backend(&plain, backend) {
            Some(d) => {
                (d.len() + if has_filter { 0 } else { FILTER_DICT_COST }).min(stream.content.len())
            }
            None => stream.content.len(),
        };
        let Some((content, deflated)) =
            replan_content(&plain, plain.len(), bar, !has_filter, backend)
        else {
            continue;
        };
        if let Ok(Object::Stream(s)) = doc.get_object_mut(id) {
            s.set_content(content);
            if deflated {
                s.dict.set("Filter", Object::Name(b"FlateDecode".to_vec()));
            } else {
                s.dict.remove(b"Filter");
            }
            s.dict.remove(b"DecodeParms");
            changed = true;
        }
    }
    changed
}

/// Merge byte-identical **stream** objects — in practice repeated images: a logo
/// or product shot re-embedded once per page. Returns true if anything merged.
///
/// Run *before* image planning, so a repeated image is decoded, resized and
/// re-encoded exactly **once** instead of once per copy, and stored once in the
/// output. [`dedup_objects`] deliberately skips streams (Debug-formatting
/// multi-megabyte content into a map key would be enormous), so this is the
/// stream-shaped counterpart.
///
/// Safety: buckets are keyed on a cheap `(dict, len, content-hash)` triple, then
/// full byte equality is verified before merging — so a hash collision can never
/// cause a false merge, matching `dedup_objects`' conservative stance.
fn dedup_streams(doc: &mut Document) -> bool {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut buckets: HashMap<(Vec<u8>, usize, u64), Vec<ObjectId>> = HashMap::new();
    for (&id, obj) in doc.objects.iter() {
        if let Object::Stream(s) = obj {
            let mut hasher = DefaultHasher::new();
            s.content.hash(&mut hasher);
            let key = (
                format!("{:?}", s.dict).into_bytes(),
                s.content.len(),
                hasher.finish(),
            );
            buckets.entry(key).or_default().push(id);
        }
    }

    // Build the remap under immutable borrows only, verifying real equality.
    let mut remap: HashMap<ObjectId, ObjectId> = HashMap::new();
    for ids in buckets.values() {
        if ids.len() < 2 {
            continue;
        }
        let mut ids = ids.clone();
        ids.sort_unstable();
        let canonical = ids[0];
        let Some(Object::Stream(canon)) = doc.objects.get(&canonical) else {
            continue;
        };
        for dup in &ids[1..] {
            if let Some(Object::Stream(other)) = doc.objects.get(dup) {
                // Same bucket already implies an equal dict; confirm the bytes.
                if other.content == canon.content {
                    remap.insert(*dup, canonical);
                }
            }
        }
    }

    if remap.is_empty() {
        return false;
    }

    for obj in doc.objects.values_mut() {
        remap_references(obj, &remap);
    }
    for (_, val) in doc.trailer.iter_mut() {
        remap_references(val, &remap);
    }
    for id in remap.keys() {
        doc.objects.remove(id);
    }
    true
}

/// Returns `Ok(None)` when there was genuinely nothing to do, so the caller can
/// hand back the original bytes without anyone allocating a throwaway copy of
/// them. `Ok(Some(bytes))` is a real, rewritten document.
fn try_optimize(input: &[u8], options: OptimizeOptions) -> Result<Option<Vec<u8>>, lopdf::Error> {
    let mut doc = Document::load_mem(input)?;

    // Fail-safe: if any page's /Contents cannot be resolved to stream objects
    // lopdf actually LOADED, the parse lost content — seen in the wild with a
    // malformed /Length whose recovery scan swallowed the whole object.
    // Viewers with more forgiving recovery still render such files; a rewrite
    // from our (lossy) parse would serialize the loss as a blank page. The
    // whole document is declined, byte-identical passthrough.
    for (_, page_id) in doc.get_pages() {
        let has_contents = doc
            .get_object(page_id)
            .and_then(Object::as_dict)
            .map(|d| d.has(b"Contents"))
            .unwrap_or(false);
        if !has_contents {
            continue;
        }
        let ids = doc.get_page_contents(page_id);
        if ids.is_empty()
            || ids
                .iter()
                .any(|&id| !matches!(doc.get_object(id), Ok(Object::Stream(_))))
        {
            return Ok(None);
        }
    }

    // Collapse repeated images first: every downstream step (placement
    // collection, decode/resize/re-encode, and the final write) then sees one
    // object instead of N identical ones.
    let merged_streams = dedup_streams(&mut doc);
    // A second, decoded-payload dedup collapses embedded font programs /
    // bitmaps that were written with differing (but decoded-identical) zlib
    // streams — the dominant duplication on text-heavy LaTeX exports. Neither
    // pass can undo the other's merges, so both run and both count as work.
    let merged_decoded = dedup_decoded_streams(&mut doc);

    // Minify page/Form content streams before anything parses them: the
    // planners below then read the same (verified-equivalent) operations from
    // smaller bytes. Counts as work — a file whose only win is a genuinely
    // smaller content re-emit deserves the rewrite (guarded so that pure
    // re-serialization does NOT count; see `replan_content`).
    let minified = minify_content_streams(&mut doc, options.deflate_backend);

    // Plan every image in parallel: each is an independent decode -> resize ->
    // re-encode against an immutable &Document, so there is no shared mutable
    // state. Rayon propagates a worker panic to this thread, so the
    // `catch_unwind` boundary in `optimize_with_options` still holds
    // (`crafted_pdf_panic_is_caught_not_unwound` pins that).
    let placements = collect_placements(&doc);
    let replacements: Vec<Replacement> = placements
        .par_iter()
        .filter_map(|(&id, &rendered)| plan_replacement(&doc, id, rendered, options))
        .collect();

    // Plan font subsets on the still-immutable document (read-only; empty
    // when the option is off or anything at all disqualified the document —
    // see src/fonts.rs for the eligibility posture). Applied further down,
    // after the image replacements.
    let font_plans = if options.subset_fonts || options.convert_type1 {
        fonts::plan_font_subsets(
            &doc,
            options.subset_fonts,
            options.convert_type1,
            options.strip_hinting,
        )
    } else {
        Vec::new()
    };

    // Plan lossless same-family Type1C union merges (read-only; empty unless
    // at least one family clears every byte-conservative precondition).
    let t1c_merge_plans = if options.subset_fonts {
        fonts::plan_type1c_merges(&doc)
    } else {
        Vec::new()
    };

    // Plan lossless bitonal→G4 recompression (read-only; empty when the
    // option is off or nothing qualified). No overlap with `replacements`:
    // the downsample paths require 8-bit samples or DCT payloads, the bitonal
    // pass requires 1-bit ones.
    let bitonal_plans = if options.recompress_bitonal_images {
        bitonal::plan_bitonal_recompressions(&doc)
    } else {
        Vec::new()
    };

    // Plan JPX (JPEG2000) → JPEG conversions; empty unless --allow-lossy
    // consented to encoding-class changes. Read-only planning, applied below.
    let jpx_plans = if options.allow_lossy_reencode {
        plan_jpx_conversions(&doc, options)
    } else {
        Vec::new()
    };

    // Gray-collapse work detection runs on the ORIGINAL document (the real
    // plan runs later, against post-replacement pixels, because a downsampled
    // candidate must be collapsed at its new geometry — and a downsample of a
    // channel-identical image is itself channel-identical). Only the yes/no
    // matters here: it decides whether a file with no other work still gets
    // rewritten.
    let gray_work = options.collapse_gray_images && !plan_gray_collapses(&doc).is_empty();

    // If we have no work to do at all, hand back the original bytes.
    // Note: the serialization-time passes — pack_object_streams, the final
    // re-deflate, and the xref-stream compression — are deliberately NOT
    // counted as work here. Rewriting a file we otherwise decided not to touch
    // would break the "declined everything ⇒ your exact bytes back" property
    // that `flate_ineligible_images_are_untouched` and friends pin; they only
    // apply to files we were already going to rewrite. Pinned by
    // `serialization_wins_do_not_rewrite_an_otherwise_unchanged_file`.
    // `merged_streams` and `merged_decoded` count as work: the dedup passes
    // may have collapsed repeated images or identical embedded font programs
    // even when nothing needed downsampling, and discarding that would throw
    // away a real size win.
    if replacements.is_empty()
        && font_plans.is_empty()
        && bitonal_plans.is_empty()
        && jpx_plans.is_empty()
        && !options.strip_accessibility
        && !merged_streams
        && !merged_decoded
        && !minified
        && !gray_work
        // Evaluated last, and only for a document with no other work: the
        // probe redoes the entropy analysis `reoptimize_jpeg_streams` will
        // do at the end, so short-circuiting keeps it off the common path.
        // It has to be asked, though — a PDF whose only win is pass-through
        // JPEGs with unoptimized Huffman tables is a real win, not a
        // serialization detail, and must not be declined.
        && !any_jpeg_huffman_work(&doc)
        // Same story for the opt-in Type1C hint strip: it is real work, and
        // it is the only thing that happens in a `--strip-hinting` run over a
        // document whose fonts nothing else qualifies to touch.
        && !(options.strip_hinting && fonts::any_type1c_hint_work(&doc))
    {
        return Ok(None);
    }

    for r in replacements {
        if let Ok(Object::Stream(stream)) = doc.get_object_mut(r.id) {
            stream.set_content(r.content);
            stream.dict.set("Width", Object::Integer(r.width));
            stream.dict.set("Height", Object::Integer(r.height));
            match r.dict_update {
                DictUpdate::Dct => {}
                DictUpdate::Flate { decode_parms } => {
                    // Normalize /Filter to the scalar name (the array form was
                    // accepted on input) and write parms matching the new payload.
                    stream
                        .dict
                        .set("Filter", Object::Name(b"FlateDecode".to_vec()));
                    match decode_parms {
                        Some(parms) => stream.dict.set("DecodeParms", Object::Dictionary(parms)),
                        None => {
                            stream.dict.remove(b"DecodeParms");
                        }
                    }
                }
                DictUpdate::FlateToJpeg => {
                    // Phase 7 spike: the payload is now a raw JPEG. Any
                    // /DecodeParms belonged to the old Flate encoding and
                    // must go; /ColorSpace and /BitsPerComponent still match
                    // (see the variant's doc — channel count is preserved).
                    stream
                        .dict
                        .set("Filter", Object::Name(b"DCTDecode".to_vec()));
                    stream.dict.remove(b"DecodeParms");
                }
            }
            // D-M2: the paired /SMask is applied atomically with the base —
            // never one side alone. The mask stream keeps /ColorSpace
            // /DeviceGray and /BitsPerComponent 8; it gains the new
            // /Width//Height, the scalar /Filter /FlateDecode, and drops any
            // stale /DecodeParms its old encoding carried.
            if let Some(smask) = r.smask {
                if let Ok(Object::Stream(mask_stream)) = doc.get_object_mut(smask.mask_id) {
                    mask_stream.set_content(smask.content);
                    mask_stream.dict.set("Width", Object::Integer(smask.width));
                    mask_stream
                        .dict
                        .set("Height", Object::Integer(smask.height));
                    mask_stream
                        .dict
                        .set("Filter", Object::Name(b"FlateDecode".to_vec()));
                    mask_stream.dict.remove(b"DecodeParms");
                }
            }
        }
    }

    // Apply bitonal replacements: new G4 payload plus normalized filter and
    // parms. `/Width`/`/Height` are untouched — the transform never resamples.
    for r in bitonal_plans {
        if let Ok(Object::Stream(stream)) = doc.get_object_mut(r.id) {
            stream.set_content(r.content);
            stream
                .dict
                .set("Filter", Object::Name(b"CCITTFaxDecode".to_vec()));
            stream.dict.set(
                "DecodeParms",
                Object::Dictionary(dictionary! {
                    "K" => -1_i64,
                    "Columns" => r.columns,
                    "Rows" => r.rows,
                    "BlackIs1" => false,
                }),
            );
        }
    }

    // Apply JPX→JPEG conversions: raw JPEG payload, explicit /ColorSpace
    // (the JP2 box that used to supply it is gone with the old payload),
    // /BitsPerComponent, and the codestream's authoritative geometry.
    for p in jpx_plans {
        if let Ok(Object::Stream(stream)) = doc.get_object_mut(p.id) {
            stream.set_content(p.content);
            stream
                .dict
                .set("Filter", Object::Name(b"DCTDecode".to_vec()));
            stream
                .dict
                .set("ColorSpace", Object::Name(p.colorspace.to_vec()));
            stream.dict.set("BitsPerComponent", Object::Integer(8));
            stream.dict.set("Width", Object::Integer(p.width as i64));
            stream.dict.set("Height", Object::Integer(p.height as i64));
            stream.dict.remove(b"DecodeParms");
        }
    }

    // Collapse channel-identical DeviceRGB Flate images to DeviceGray.
    // Planned HERE — after the image replacements above are applied — so a
    // just-downsampled candidate is collapsed at its final geometry rather
    // than racing the downsample for the same stream.
    if options.collapse_gray_images {
        for g in plan_gray_collapses(&doc) {
            if let Ok(Object::Stream(stream)) = doc.get_object_mut(g.id) {
                stream.set_content(g.content);
                stream
                    .dict
                    .set("ColorSpace", Object::Name(b"DeviceGray".to_vec()));
                stream
                    .dict
                    .set("Filter", Object::Name(b"FlateDecode".to_vec()));
                match g.decode_parms {
                    Some(parms) => stream.dict.set("DecodeParms", Object::Dictionary(parms)),
                    None => {
                        stream.dict.remove(b"DecodeParms");
                    }
                }
            }
        }
    }

    fonts::apply_font_subsets(&mut doc, font_plans);
    fonts::apply_type1c_merges(&mut doc, t1c_merge_plans);

    // Type1C (CFF) hint stripping, under the same `--strip-hinting` consent as
    // the TrueType path. Runs after the font plans are applied so it also
    // covers the programs this run just produced — union merges and
    // Type1 → Type1C conversions — not only the ones nothing else touched.
    if options.strip_hinting {
        fonts::strip_type1c_hints(&mut doc);
    }

    // Optionally strip the PDF's structure tree (accessibility metadata). This
    // is what Ghostscript's /ebook and /screen presets do silently: removes
    // /StructTreeRoot (the tree of StructElem objects screen readers navigate),
    // /MarkInfo, and /Lang from the catalog. Visually lossless; the resulting
    // PDF degrades from "tagged" to "untagged" and is no longer PDF/UA.
    // `prune_objects()` below drops the now-orphaned StructElem subtree.
    if options.strip_accessibility {
        if let Ok(catalog) = doc.catalog_mut() {
            catalog.remove(b"StructTreeRoot");
            catalog.remove(b"MarkInfo");
            catalog.remove(b"Lang");
        }
    }

    // Optionally drop every XMP packet. Producers that stamp a full packet on
    // each page and XObject can spend a double-digit percentage of the file on
    // metadata no viewer reads to render (adobe-spec: 134 packets, 860 KB,
    // 12% of the optimized output). The reference is what costs bytes; the
    // orphaned streams themselves go in `prune_objects()` below.
    if options.strip_metadata {
        for object in doc.objects.values_mut() {
            match object {
                Object::Dictionary(dict) => dict.remove(b"Metadata"),
                Object::Stream(stream) => stream.dict.remove(b"Metadata"),
                _ => None,
            };
        }
    }

    // Merge true duplicate objects (identical serialized bytes -> same
    // canonical id, references redirected, duplicates removed) — iterated to a
    // FIXPOINT, alternating the non-stream and stream passes. One generation
    // is not enough: merging duplicate leaves remaps references, which can
    // make their *parents* newly byte-identical. Real-world shape (the NASA
    // repro): N byte-identical image streams that each referenced their own
    // copy of a duplicated ColorSpace object — the streams' dicts only become
    // identical after dedup_objects collapses the ColorSpaces, and merging the
    // streams can in turn make dicts referencing them identical. A single
    // generation per call left that cascade to the NEXT optimize call,
    // breaking idempotence. Terminates: every iteration that continues has
    // strictly removed at least one object. Runs before prune so the orphan
    // cleanup sees an already-compacted object set.
    loop {
        let merged_dicts = dedup_objects(&mut doc);
        let merged_more_streams = dedup_streams(&mut doc);
        if !merged_dicts && !merged_more_streams {
            break;
        }
    }

    // Drop orphaned objects, then Flate-compress any uncompressed content
    // streams (DCTDecode images are skipped — Stream::compress only touches
    // streams without a /Filter).
    doc.prune_objects();
    doc.compress();

    // Rebuild the Huffman tables of every JPEG payload from its own symbol
    // statistics. Strictly lossless (the DCT coefficients never move; see
    // src/jpeghuff.rs), so it needs no consent flag and runs unconditionally.
    // Placed here, after every image decision, for the same reason as the
    // re-deflate below: it is a pure re-serialization of bytes already chosen.
    reoptimize_jpeg_streams(&mut doc);

    // Last planning-free pass: re-deflate every already-Flate stream with the
    // configured backend (zlib level 9, or zopfli when opted in).
    // Runs after EVERY other decision (images, fonts, bitonal, lossy, dedup,
    // prune, compress) so it is purely a serialization improvement and can
    // never influence, or be influenced by, what the planners chose.
    redeflate_flate_streams(&mut doc, options.deflate_backend);

    // Renumber to a contiguous id space so the saved trailer /Size matches the
    // highest object number. Without this, lopdf 0.41's classic save emits a
    // /Size that's slightly too high, which `qpdf --check` flags (benign, but
    // we want strictly clean output for email recipients / strict readers).
    doc.renumber_objects();

    strip_stale_xref_trailer_keys(&mut doc);

    save_document(&mut doc, options).map(Some)
}

/// Drop trailer entries that describe the *input's* cross-reference section.
///
/// lopdf seeds `Document::trailer` from the file's last trailer dictionary and
/// copies whatever survives into the cross-reference stream it synthesizes at
/// save time. Most xref keys are overwritten there (`/Type`, `/Size`, `/W`,
/// `/Index`, `/Length`), but `/DecodeParms`, `/Filter`, `/Prev` and `/XRefStm`
/// are not — they leak through and describe bytes that no longer exist.
///
/// This is not hypothetical. `corpus/adobe-spec.pdf` (Distiller 8.1.0) ends in
/// a *classic* `trailer` dictionary that nonetheless carries a full xref-stream
/// key set, including `/DecodeParms<</Columns 5/Predictor 12>>`. Carried into
/// amatl's output that predictor declaration sat on top of the unpredicted
/// 7-bytes-per-row payload `compress_xref_stream` had just deflated, so every
/// strict reader failed to decode the table and fell back to reconstruction
/// (Ghostscript: "The /Prev entry in an XrefStm dictionary did not point to an
/// XrefStm" / "xref table was repaired").
///
/// The writer owns the cross-reference section; nothing the reader saw about
/// the old one may survive into the new one.
fn strip_stale_xref_trailer_keys(doc: &mut Document) {
    for key in [
        b"DecodeParms".as_slice(),
        b"Filter",
        b"Prev",
        b"XRefStm",
        b"Length",
    ] {
        doc.trailer.remove(key);
    }
}

/// Inflation ceiling for the final re-deflate pass. A stream that expands past
/// this is left exactly as it arrived — the same decompression-bomb posture
/// `inflate_capped` enforces everywhere else in the crate.
const MAX_REDEFLATE_BYTES: usize = 128 * 1024 * 1024;

/// Final lossless re-deflate pass: every stream whose `/Filter` is exactly
/// `FlateDecode` is inflated and re-deflated at zlib level 9, keeping the
/// result only when it is STRICTLY smaller and verified to inflate back to the
/// original bytes.
///
/// This is a serialization change and nothing else. `/Filter` and
/// `/DecodeParms` are untouched, so any PNG/TIFF predictor still applies to
/// exactly the same post-inflate bytes: every reader decodes what it decoded
/// before, byte for byte. No pixel is resampled and no encoding class moves,
/// which is why it needs no consent flag — it is the same class of work
/// `doc.compress()` already does by default, extended to streams that arrived
/// with a producer's (often weaker) deflate output.
///
/// Idempotent: a second pass re-deflates already-level-9 output to the same
/// size, which fails the strictly-smaller test and changes nothing.
///
/// Declined wholesale for encrypted documents (stream bytes are ciphertext),
/// PDF/A-declared documents, and signed documents — a signature's byte range
/// covers offsets this pass would move.
/// True when at least one raw `/DCTDecode` payload has Huffman tables worth
/// rebuilding. Read-only; used only to answer "is there any work at all" for
/// a document nothing else touches (see `try_optimize`). Stops at the first
/// stream that improves.
fn any_jpeg_huffman_work(doc: &Document) -> bool {
    doc.objects.values().any(|obj| {
        let Object::Stream(stream) = obj else {
            return false;
        };
        let Ok(filter) = stream.dict.get(b"Filter") else {
            return false;
        };
        matches!(classify_filter(doc, filter), FilterClass::DctOnly)
            && jpeghuff::optimize(&stream.content).is_some()
    })
}

/// Re-optimize the Huffman tables of every raw `/DCTDecode` payload in the
/// document.
///
/// This is the JPEG analogue of [`redeflate_flate_streams`]: an entropy-coding
/// improvement over bytes whose *content* is already decided. It is strictly
/// lossless — [`jpeghuff::optimize`] never touches a DCT coefficient and
/// verifies its own output decodes back to the identical token sequence — so
/// unlike the image paths it needs no pixel contract and no opt-in.
///
/// Streams amatl re-encoded itself carry mozjpeg's already-optimal tables and
/// simply decline (nothing is smaller). The headroom is in the JPEGs the image
/// path passes through untouched: CMYK/Separation payloads, and any image
/// whose effective DPI is already at target.
fn reoptimize_jpeg_streams(doc: &mut Document) {
    if doc.is_encrypted() || fonts::pdfa_blocked(doc) || signature_present(doc) {
        return;
    }

    // Collect first (classification resolves references against the immutable
    // document), then do the entropy work off-document, in parallel.
    let candidates: Vec<(ObjectId, Vec<u8>)> = doc
        .objects
        .iter()
        .filter_map(|(&id, obj)| {
            let Object::Stream(stream) = obj else {
                return None;
            };
            let filter = stream.dict.get(b"Filter").ok()?;
            matches!(classify_filter(doc, filter), FilterClass::DctOnly)
                .then(|| (id, stream.content.clone()))
        })
        .collect();

    let shrunk: Vec<(ObjectId, Vec<u8>)> = candidates
        .into_par_iter()
        .filter_map(|(id, content)| jpeghuff::optimize(&content).map(|out| (id, out)))
        .collect();

    for (id, content) in shrunk {
        if let Ok(Object::Stream(stream)) = doc.get_object_mut(id) {
            stream.set_content(content); // keeps /Length in sync
        }
    }
}

fn redeflate_flate_streams(doc: &mut Document, backend: DeflateBackend) {
    if doc.is_encrypted() || fonts::pdfa_blocked(doc) || signature_present(doc) {
        return;
    }

    // Collect first: classification resolves references against the immutable
    // document, while the deflate work itself happens off the document
    // entirely, in parallel.
    let candidates: Vec<(ObjectId, Vec<u8>)> = doc
        .objects
        .iter()
        .filter_map(|(&id, obj)| {
            let Object::Stream(stream) = obj else {
                return None;
            };
            // Object and cross-reference streams are the writer's business:
            // lopdf rebuilds both from scratch at save time (and the xref
            // stream is deflated by `compress_xref_stream` afterwards).
            if matches!(stream.dict.get(b"Type"),
                Ok(Object::Name(n)) if n == b"ObjStm" || n == b"XRef")
            {
                return None;
            }
            let filter = stream.dict.get(b"Filter").ok()?;
            matches!(classify_filter(doc, filter), FilterClass::FlateOnly)
                .then(|| (id, stream.content.clone()))
        })
        .collect();

    let shrunk: Vec<(ObjectId, Vec<u8>)> = candidates
        .into_par_iter()
        .filter_map(|(id, content)| replan_deflate(&content, backend).map(|out| (id, out)))
        .collect();

    for (id, content) in shrunk {
        if let Ok(Object::Stream(stream)) = doc.get_object_mut(id) {
            stream.set_content(content); // keeps /Length in sync
        }
    }
}

/// Inflate and re-deflate one Flate payload. `None` (leave the stream exactly
/// as it is) unless the new payload is strictly smaller AND inflates back
/// byte-identically — deflate is lossless, so that equality must be exact.
fn replan_deflate(content: &[u8], backend: DeflateBackend) -> Option<Vec<u8>> {
    let plain = inflate_capped(content, MAX_REDEFLATE_BYTES)?;
    let out = deflate_backend(&plain, backend)?;
    if out.len() >= content.len() {
        return None;
    }
    (inflate_capped(&out, plain.len())? == plain).then_some(out)
}

/// True when the document carries a digital signature. A signature dictionary
/// pins a `/ByteRange` over the file's bytes; AcroForm `/SigFlags` declares one
/// exists. Rather than reason about which bytes a range covers, the re-deflate
/// pass declines such documents entirely.
fn signature_present(doc: &Document) -> bool {
    if let Ok(catalog) = doc.catalog() {
        if let Ok(acroform) = catalog.get(b"AcroForm") {
            if let Object::Dictionary(d) = resolve(doc, acroform) {
                if d.get(b"SigFlags").is_ok() {
                    return true;
                }
            }
        }
    }
    doc.objects.values().any(|obj| match obj {
        Object::Dictionary(d) => is_signature_dict(d),
        Object::Stream(s) => is_signature_dict(&s.dict),
        _ => false,
    })
}

fn is_signature_dict(dict: &lopdf::Dictionary) -> bool {
    dict.get(b"ByteRange").is_ok()
        || matches!(dict.get(b"Type"),
            Ok(Object::Name(n)) if n == b"Sig" || n == b"DocTimeStamp")
}

/// Serialize the document, optionally using PDF 1.5 object-stream packing when
/// `options.pack_object_streams` is true. The packed path produces smaller
/// output for object-heavy documents but is more complex; the classic path is
/// the always-available fallback and matches what lopdf ships.
fn save_document(doc: &mut Document, options: OptimizeOptions) -> Result<Vec<u8>, lopdf::Error> {
    let out = if options.pack_object_streams {
        pack_and_save(doc)?
    } else {
        let mut out: Vec<u8> = Vec::new();
        doc.save_to(&mut out)?;
        out
    };
    // The zopfli backend can re-deflate the ObjStm the writer just emitted
    // (lopdf deflates it internally at zlib level 9, out of reach of the
    // final re-deflate pass). Must run BEFORE the xref compression below:
    // the patch reads and rewrites the still-uncompressed xref rows.
    let out = if options.deflate_backend == DeflateBackend::Zopfli {
        rezopfli_objstm(out)
    } else {
        out
    };
    // Both save paths emit an uncompressed cross-reference stream; deflate it.
    Ok(compress_xref_stream(out, options.deflate_backend))
}

/// Deflate the cross-reference stream of a just-serialized document.
///
/// lopdf hardcodes `XRefStreamFilter::None` in
/// `writer.rs::write_cross_reference_stream` — there is no `SaveOptions` knob
/// for it, and `doc.compress()` cannot reach the object because it does not
/// exist in `Document::objects`: the writer synthesizes it during save, after
/// every document-level pass has run. So amatl's output shipped a raw
/// 7-bytes-per-entry xref stream (17,479 B on the 2,497-object NASA reference,
/// where Ghostscript spends 5,375 B).
///
/// Patching the saved bytes is sound *because it is the last object in the
/// file*: `startxref` points at its start offset, and its own xref entry
/// records that same start offset, so rewriting only its dictionary and
/// payload moves no offset that anything records. Nothing before `xref_start`
/// is touched.
///
/// Fail-safe: every structural assumption is checked against the bytes actually
/// present (object header, `>>stream`, the declared `/Length`, the closing
/// `endstream`, and a full inflate-back of the new payload). Any mismatch —
/// including a classic cross-reference *table*, which has nothing to compress —
/// returns the input unchanged.
fn compress_xref_stream(out: Vec<u8>, backend: DeflateBackend) -> Vec<u8> {
    match try_compress_xref_stream(&out, backend) {
        Some(patched) => patched,
        None => out,
    }
}

fn try_compress_xref_stream(out: &[u8], backend: DeflateBackend) -> Option<Vec<u8>> {
    // `\nstartxref\n<offset>\n%%EOF` is the last thing the writer emits.
    let sx = out.windows(9).rposition(|w| w == b"startxref")?;
    let mut p = sx + 9;
    while out.get(p).is_some_and(|b| b.is_ascii_whitespace()) {
        p += 1;
    }
    let digits = p;
    while out.get(p).is_some_and(|b| b.is_ascii_digit()) {
        p += 1;
    }
    let xref_start: usize = std::str::from_utf8(out.get(digits..p)?)
        .ok()?
        .parse()
        .ok()?;
    if xref_start >= sx {
        return None;
    }

    // "<id> <gen> obj\n<<" — exactly what Writer::write_indirect_object emits
    // ahead of a stream object. Anything else (notably a `xref` table keyword)
    // means there is no xref stream here.
    let mut q = skip_ascii_digits(out, xref_start)?;
    if out.get(q) != Some(&b' ') {
        return None;
    }
    q = skip_ascii_digits(out, q + 1)?;
    if out.get(q..q + 5)? != b" obj\n" {
        return None;
    }
    let dict_start = q + 5;
    if out.get(dict_start..dict_start + 2)? != b"<<" {
        return None;
    }

    // Writer::write_stream emits the dictionary and then `stream\n` with no
    // separator, so the dictionary ends at the first `>>stream\n`.
    let dict_end = find_sub(out, b">>stream\n", dict_start)? + 2;
    let content_start = dict_end + b"stream\n".len();
    let dict = out.get(dict_start..dict_end)?;
    // A `/DecodeParms` already in the dictionary would be read as describing
    // the payload this patch is about to install — it does not (the deflate
    // below applies no predictor), so decline rather than emit a dictionary
    // that lies about its own stream.
    if find_sub(dict, b"/Type/XRef", 0).is_none()
        || find_sub(dict, b"/Filter", 0).is_some()
        || find_sub(dict, b"/DecodeParms", 0).is_some()
    {
        return None;
    }

    // `/Length <n>`: names are written unescaped and integer values get exactly
    // one leading space, so the trailing space also rules out `/Length1`.
    let len_key = find_sub(dict, b"/Length ", 0)?;
    let val_start = len_key + b"/Length ".len();
    let val_end = skip_ascii_digits(dict, val_start)?;
    let content_len: usize = std::str::from_utf8(dict.get(val_start..val_end)?)
        .ok()?
        .parse()
        .ok()?;

    // Cross-check the declared length against the real framing before touching
    // anything: if `endstream` is not exactly there, this is not the object we
    // think it is.
    let content = out.get(content_start..content_start.checked_add(content_len)?)?;
    if !out
        .get(content_start + content_len..)?
        .starts_with(b"\nendstream")
    {
        return None;
    }

    let deflated = deflate_backend(content, backend)?;
    if deflated.len() >= content.len() {
        return None; // never-larger, per the crate contract
    }
    if inflate_capped(&deflated, content.len())?.as_slice() != content {
        return None;
    }

    let mut patched = Vec::with_capacity(out.len());
    patched.extend_from_slice(&out[..dict_start + len_key]);
    patched.extend_from_slice(b"/Filter/FlateDecode/Length ");
    patched.extend_from_slice(deflated.len().to_string().as_bytes());
    patched.extend_from_slice(&out[dict_start + val_end..content_start]);
    patched.extend_from_slice(&deflated);
    patched.extend_from_slice(&out[content_start + content_len..]);
    Some(patched)
}

/// Re-deflate every just-written `ObjStm` payload with zopfli.
///
/// lopdf's writer deflates the object stream itself (zlib level 9) during
/// `save_with_options`, after every document-level pass has run, so the final
/// re-deflate pass never sees it. On the NASA reference the payload is
/// dictionary-heavy text that zopfli encodes 22% smaller (41,322 → 32,148 B).
///
/// Patching the saved bytes is sound because everything the shrink
/// invalidates is rewritten in the same patch: the ObjStm's `/Length`, the
/// type-1 offsets in the (still uncompressed) cross-reference stream for
/// every object that starts after the ObjStm, and the `startxref` offset.
/// Type-2 entries are (stream id, index) pairs — no byte offsets — and the
/// payload inflates back byte-identically, so `/N`/`/First` still hold.
///
/// Fail-safe: every structural assumption is checked against the bytes
/// actually present, the new payload must be strictly smaller AND inflate
/// back byte-identically, no xref offset may point inside the patched
/// region, and the patched file must re-parse with lopdf (which walks every
/// rewritten offset). Any doubt returns the input unchanged.
fn rezopfli_objstm(out: Vec<u8>) -> Vec<u8> {
    // Files above `max_objects_per_stream` objects get several ObjStms, so patch
    // every one of them. Strictly last-to-first: a patch only ever shifts bytes
    // *after* the stream it rewrites, so the tag positions of the streams still
    // to come — all of which sit earlier — stay valid in the patched buffer.
    // Each patch is independently validated and re-parsed, so a stream that
    // declines simply stays zlib without affecting the others.
    let tag = b"/Type/ObjStm";
    let mut tags = Vec::new();
    let mut from = 0;
    while let Some(at) = find_sub(&out, tag, from) {
        tags.push(at);
        from = at + tag.len();
    }
    let mut cur = out;
    for &tag_at in tags.iter().rev() {
        if let Some(patched) = try_rezopfli_objstm(&cur, tag_at) {
            cur = patched;
        }
    }
    cur
}

/// Re-deflate the single `ObjStm` whose `/Type/ObjStm` token sits at `tag_at`.
fn try_rezopfli_objstm(out: &[u8], tag_at: usize) -> Option<Vec<u8>> {
    // "<id> <gen> obj\n<<" — the dict opens right after the object header,
    // and the /Type/ObjStm entry must sit inside THIS dict.
    let hdr = rfind_sub(out, b" obj\n<<", tag_at)?;
    let dict_start = hdr + b" obj\n".len();
    let obj_start = {
        // Walk back over "<id> <gen>": generation digits, one space, id digits.
        let mut i = hdr;
        while i > 0 && out[i - 1].is_ascii_digit() {
            i -= 1;
        }
        let gen_start = i;
        if gen_start == hdr || i == 0 || out[i - 1] != b' ' {
            return None;
        }
        i -= 1;
        let id_end = i;
        while i > 0 && out[i - 1].is_ascii_digit() {
            i -= 1;
        }
        if i == id_end {
            return None;
        }
        i
    };
    let dict_end = find_sub(out, b">>stream\n", dict_start)? + 2;
    if tag_at >= dict_end {
        return None;
    }
    let dict = out.get(dict_start..dict_end)?;
    // Plain Flate with no predictor: exactly what lopdf's writer emits.
    if find_sub(dict, b"/Filter/FlateDecode", 0).is_none()
        || find_sub(dict, b"/DecodeParms", 0).is_some()
    {
        return None;
    }
    let content_start = dict_end + b"stream\n".len();
    let len_key = find_sub(dict, b"/Length ", 0)?;
    let val_start = len_key + b"/Length ".len();
    let val_end = skip_ascii_digits(dict, val_start)?;
    let content_len: usize = std::str::from_utf8(dict.get(val_start..val_end)?)
        .ok()?
        .parse()
        .ok()?;
    let content = out.get(content_start..content_start.checked_add(content_len)?)?;
    let content_end = content_start + content_len;
    if !out.get(content_end..)?.starts_with(b"\nendstream") {
        return None;
    }

    // The rewrite itself, guarded like every other deflate in the crate.
    let plain = inflate_capped(content, MAX_REDEFLATE_BYTES)?;
    let new_content = deflate_zopfli(&plain)?;
    if new_content.len() >= content.len() {
        return None;
    }
    if inflate_capped(&new_content, plain.len())?.as_slice() != plain.as_slice() {
        return None;
    }
    let new_digits = new_content.len().to_string();
    // Both terms shrink or hold: the payload is strictly smaller and its
    // /Length value therefore never gains digits.
    let delta = (content.len() - new_content.len()) + (val_end - val_start - new_digits.len());

    // Locate the (still uncompressed) cross-reference stream via startxref.
    // It must live after the ObjStm — the patch shifts everything past the
    // patched region. lopdf's writer always emits it last.
    let sx = out.windows(9).rposition(|w| w == b"startxref")?;
    let mut p = sx + 9;
    while out.get(p).is_some_and(|b| b.is_ascii_whitespace()) {
        p += 1;
    }
    let sx_digits = p;
    let sx_end = skip_ascii_digits(out, sx_digits)?;
    let xref_start: usize = std::str::from_utf8(out.get(sx_digits..sx_end)?)
        .ok()?
        .parse()
        .ok()?;
    if xref_start <= content_end || xref_start >= sx {
        return None;
    }
    let mut q = skip_ascii_digits(out, xref_start)?;
    if out.get(q) != Some(&b' ') {
        return None;
    }
    q = skip_ascii_digits(out, q + 1)?;
    if out.get(q..q + 5)? != b" obj\n" {
        return None;
    }
    let xdict_start = q + 5;
    if out.get(xdict_start..xdict_start + 2)? != b"<<" {
        return None;
    }
    let xdict_end = find_sub(out, b">>stream\n", xdict_start)? + 2;
    let xdict = out.get(xdict_start..xdict_end)?;
    if find_sub(xdict, b"/Type/XRef", 0).is_none() || find_sub(xdict, b"/Filter", 0).is_some() {
        return None;
    }
    let xcontent_start = xdict_end + b"stream\n".len();
    let xlen_key = find_sub(xdict, b"/Length ", 0)?;
    let xval_start = xlen_key + b"/Length ".len();
    let xval_end = skip_ascii_digits(xdict, xval_start)?;
    let xcontent_len: usize = std::str::from_utf8(xdict.get(xval_start..xval_end)?)
        .ok()?
        .parse()
        .ok()?;
    let xcontent = out.get(xcontent_start..xcontent_start.checked_add(xcontent_len)?)?;
    let xcontent_end = xcontent_start + xcontent_len;
    if !out.get(xcontent_end..)?.starts_with(b"\nendstream") {
        return None;
    }

    // /W[1 n 2]-style row layout: a 1-byte type field is what lopdf writes,
    // and required here to tell offset rows (type 1) from the rest.
    let w = parse_int_array(xdict, b"/W[")?;
    let [w0, w1, w2] = w.as_slice() else {
        return None;
    };
    if *w0 != 1 || *w1 == 0 || *w1 > 8 {
        return None;
    }
    let row = w0 + w1 + w2;
    if row == 0 || xcontent.len() % row != 0 {
        return None;
    }

    // Rewrite the type-1 offsets. An offset at or before the ObjStm header is
    // untouched; one past the patched region shifts back by `delta`; one
    // INSIDE the ObjStm object means the file is not shaped the way this
    // patch assumes, so hand it back untouched.
    let mut new_xcontent = xcontent.to_vec();
    for chunk in new_xcontent.chunks_mut(row) {
        if chunk[0] != 1 {
            continue;
        }
        let mut off: u64 = 0;
        for &b in &chunk[*w0..w0 + w1] {
            off = (off << 8) | u64::from(b);
        }
        let off = usize::try_from(off).ok()?;
        if off <= obj_start {
            continue;
        }
        if off < content_end {
            return None;
        }
        let mut v = (off - delta) as u64;
        for b in chunk[*w0..w0 + w1].iter_mut().rev() {
            *b = (v & 0xff) as u8;
            v >>= 8;
        }
        if v != 0 {
            return None;
        }
    }

    let mut patched = Vec::with_capacity(out.len() - delta);
    patched.extend_from_slice(&out[..dict_start + val_start]);
    patched.extend_from_slice(new_digits.as_bytes());
    patched.extend_from_slice(&out[dict_start + val_end..content_start]);
    patched.extend_from_slice(&new_content);
    patched.extend_from_slice(&out[content_end..xcontent_start]);
    patched.extend_from_slice(&new_xcontent);
    patched.extend_from_slice(&out[xcontent_end..sx_digits]);
    patched.extend_from_slice((xref_start - delta).to_string().as_bytes());
    patched.extend_from_slice(&out[sx_end..]);

    // Final proof: lopdf must re-parse the patched file, which walks every
    // rewritten offset and re-reads every packed object out of the new
    // payload. Anything short of a full parse means no patch.
    Document::load_mem(&patched).ok()?;
    Some(patched)
}

/// Last index of `needle` in `haystack` strictly before `before`.
fn rfind_sub(haystack: &[u8], needle: &[u8], before: usize) -> Option<usize> {
    haystack
        .get(..before)?
        .windows(needle.len())
        .rposition(|w| w == needle)
}

/// Parse `key[int int ...]` out of a dictionary's bytes (lopdf's writer emits
/// integer arrays with single spaces and no line breaks).
fn parse_int_array(dict: &[u8], key: &[u8]) -> Option<Vec<usize>> {
    let at = find_sub(dict, key, 0)?;
    let close = find_sub(dict, b"]", at)?;
    std::str::from_utf8(dict.get(at + key.len()..close)?)
        .ok()?
        .split_ascii_whitespace()
        .map(|t| t.parse().ok())
        .collect()
}

/// Index just past the digit run starting at `from`, or `None` if there is no
/// digit there.
fn skip_ascii_digits(data: &[u8], from: usize) -> Option<usize> {
    let mut i = from;
    while data.get(i).is_some_and(|b| b.is_ascii_digit()) {
        i += 1;
    }
    (i > from).then_some(i)
}

/// First index of `needle` in `haystack` at or after `from`.
fn find_sub(haystack: &[u8], needle: &[u8], from: usize) -> Option<usize> {
    haystack
        .get(from..)?
        .windows(needle.len())
        .position(|w| w == needle)
        .map(|i| i + from)
}

/// Serialize the document with PDF 1.5 object-stream packing: eligible
/// non-stream objects are packed into a single `ObjStm` stream and the
/// cross-reference table is emitted as a binary xref stream. Uses lopdf's own
/// `save_with_options` (not a hand-rolled writer and not qpdf); the output is
/// strictly `qpdf --check`-clean with no post-pass.
///
/// Reached only when `OptimizeOptions.pack_object_streams` is true. See the
/// `pack_object_streams` field docs on [`OptimizeOptions`] for the
/// cost/benefit trade-off.
fn pack_and_save(doc: &mut Document) -> Result<Vec<u8>, lopdf::Error> {
    // Pack non-stream objects into an ObjStm + cross-reference stream via
    // lopdf's own writer. `renumber_objects()` (done by the caller) clears the
    // hard "invalid object stream" errors a contiguous id space avoids.
    //
    // lopdf <= 0.41 omitted the xref stream's own self-entry (`Xref::size` was
    // stale when `create_xref_steam` ran), which needed a byte-patching
    // post-pass to satisfy `qpdf --check`. Fixed upstream in J-F-Liu/lopdf#501
    // and released in 0.42, so we now pack and save directly.
    let options = lopdf::SaveOptions::builder()
        .use_object_streams(true)
        .use_xref_streams(true)
        // Cap objects per stream at 65_535: lopdf writes each xref type-2 entry's
        // object-stream index as a u16 (`writer.rs`: `index_in_stream as u16`) under
        // /W[1 4 2]. A stream packing more than 65_535 objects wraps its higher
        // indices mod 2^16, silently pointing xref entries at the wrong objects
        // (51_264 wrong entries on the 756-page Adobe spec corpus). lopdf starts a
        // new ObjStm whenever this cap is reached, so every index stays
        // representable in the 2-byte /W field.
        .max_objects_per_stream(65_535)
        .compression_level(9)
        .build();
    let mut out: Vec<u8> = Vec::new();
    doc.save_with_options(&mut out, options)?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::content::Operation;
    use lopdf::{dictionary, Stream};

    /// Build a one-page PDF embedding a `px`×`px` RGB JPEG drawn into a
    /// `draw_pts`×`draw_pts` box, i.e. at an effective DPI of px/(draw_pts/72).
    fn build_pdf(px: u32, draw_pts: i64) -> Vec<u8> {
        build_pdf_placed(px, draw_pts, draw_pts)
    }

    /// Same, but with an independent width/height placement box so a
    /// NON-UNIFORMLY scaled image can be exercised.
    fn build_pdf_placed(px: u32, draw_w_pts: i64, draw_h_pts: i64) -> Vec<u8> {
        // A non-flat gradient so JPEG has real content to compress.
        let mut img = image::RgbImage::new(px, px);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            *pixel = image::Rgb([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8]);
        }
        let mut jpeg: Vec<u8> = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, 92)
            .encode_image(&img)
            .unwrap();

        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8,
                "Filter" => "DCTDecode",
            },
            jpeg,
        ));

        let content = Content {
            operations: vec![
                Operation::new("q", vec![]),
                Operation::new(
                    "cm",
                    vec![
                        draw_w_pts.into(),
                        0.into(),
                        0.into(),
                        draw_h_pts.into(),
                        0.into(),
                        0.into(),
                    ],
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
            "Resources" => dictionary! {
                "XObject" => dictionary! { "Im0" => img_id },
            },
        });
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Kids" => vec![page_id.into()],
                "Count" => 1,
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);

        let mut out: Vec<u8> = Vec::new();
        doc.save_to(&mut out).unwrap();
        out
    }

    /// One page holding `copies` SEPARATE image objects that all contain the
    /// same JPEG bytes — what you get when a logo or product shot is
    /// re-embedded per page. Pins the `dedup_streams` behavior.
    fn build_pdf_duplicate_images(copies: usize, px: u32) -> Vec<u8> {
        let mut img = image::RgbImage::new(px, px);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            *pixel = image::Rgb([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8]);
        }
        let mut jpeg: Vec<u8> = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, 92)
            .encode_image(&img)
            .unwrap();

        let mut doc = Document::with_version("1.5");
        let mut ops = vec![];
        let mut xobjs = lopdf::Dictionary::new();
        for i in 0..copies {
            let id = doc.add_object(Stream::new(
                dictionary! {
                    "Type" => "XObject", "Subtype" => "Image",
                    "Width" => px as i64, "Height" => px as i64,
                    "ColorSpace" => "DeviceRGB", "BitsPerComponent" => 8,
                    "Filter" => "DCTDecode",
                },
                jpeg.clone(),
            ));
            let name = format!("Im{i}");
            xobjs.set(name.as_bytes().to_vec(), id);
            ops.push(Operation::new("q", vec![]));
            ops.push(Operation::new(
                "cm",
                vec![
                    100.into(),
                    0.into(),
                    0.into(),
                    100.into(),
                    0.into(),
                    0.into(),
                ],
            ));
            ops.push(Operation::new("Do", vec![Object::Name(name.into_bytes())]));
            ops.push(Operation::new("Q", vec![]));
        }
        let content_id = doc.add_object(Stream::new(
            dictionary! {},
            Content { operations: ops }.encode().unwrap(),
        ));
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page", "Parent" => pages_id, "Contents" => content_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! { "XObject" => xobjs },
        });
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages", "Kids" => vec![page_id.into()], "Count" => 1,
            }),
        );
        let catalog_id = doc.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
        doc.trailer.set("Root", catalog_id);
        let mut out: Vec<u8> = Vec::new();
        doc.save_to(&mut out).unwrap();
        out
    }

    fn count_image_streams(pdf: &[u8]) -> usize {
        let doc = Document::load_mem(pdf).unwrap();
        doc.objects
            .values()
            .filter(|o| {
                matches!(o, Object::Stream(s)
                    if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image"))
            })
            .count()
    }

    fn image_dims(pdf: &[u8]) -> (i64, i64) {
        let doc = Document::load_mem(pdf).unwrap();
        for obj in doc.objects.values() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    let w = s.dict.get(b"Width").unwrap().as_i64().unwrap();
                    let h = s.dict.get(b"Height").unwrap().as_i64().unwrap();
                    return (w, h);
                }
            }
        }
        panic!("no image found");
    }

    // ---- Flate-path fixtures ----------------------------------------------

    /// Deterministic xorshift noise. Noise is essentially incompressible, so a
    /// downsampled re-encode is reliably smaller than the original — unlike a
    /// regular gradient, whose predictor-filtered rows deflate to almost
    /// nothing and (correctly) trip the never-larger guard.
    fn flate_pixels(px_w: u32, px_h: u32, channels: usize) -> Vec<u8> {
        let mut state = 0x2545_F491_u32;
        (0..px_w as usize * px_h as usize * channels)
            .map(|_| {
                state ^= state << 13;
                state ^= state >> 17;
                state ^= state << 5;
                (state >> 24) as u8
            })
            .collect()
    }

    /// Apply one PNG row filter to every row, producing the tagged row stream
    /// (`[tag][filtered row]...`) that FlateDecode + PNG predictors expect.
    /// Spec-correct forward filtering (PNG spec §9), hand-rolled: lopdf 0.42's
    /// `encode_row` mis-computes Avg (`(left wrapping+ up)/2` overflows), so
    /// fixtures built with it would not exercise the real-world byte shape.
    fn png_filter_rows(raw: &[u8], px_w: u32, channels: usize, tag: u8) -> Vec<u8> {
        let bpr = px_w as usize * channels;
        let bpp = channels;
        let mut out = Vec::with_capacity(raw.len() + raw.len() / bpr);
        let mut previous = vec![0u8; bpr];
        for row in raw.chunks_exact(bpr) {
            out.push(tag);
            for i in 0..bpr {
                let x = row[i];
                let left = if i >= bpp { row[i - bpp] } else { 0 };
                let up = previous[i];
                let upper_left = if i >= bpp { previous[i - bpp] } else { 0 };
                let filtered = match tag {
                    0 => x,
                    1 => x.wrapping_sub(left),
                    2 => x.wrapping_sub(up),
                    3 => x.wrapping_sub(((u16::from(left) + u16::from(up)) / 2) as u8),
                    4 => x.wrapping_sub(paeth_predict(left, up, upper_left)),
                    _ => unreachable!("bad filter tag"),
                };
                out.push(filtered);
            }
            previous.copy_from_slice(row);
        }
        out
    }

    /// Wrap a prepared image XObject stream in a one-page document drawing it
    /// into a `draw_pts` square box.
    fn wrap_image_pdf(doc: &mut Document, img_id: ObjectId, draw_pts: i64) -> Vec<u8> {
        let content = Content {
            operations: vec![
                Operation::new("q", vec![]),
                Operation::new(
                    "cm",
                    vec![
                        draw_pts.into(),
                        0.into(),
                        0.into(),
                        draw_pts.into(),
                        0.into(),
                        0.into(),
                    ],
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
        let mut out: Vec<u8> = Vec::new();
        doc.save_to(&mut out).unwrap();
        out
    }

    /// Build a one-page PDF embedding a `px`x`px` FlateDecode image drawn into
    /// a `draw_pts` square. `predictor: Some(f)` stores PNG-filtered rows with
    /// a `/DecodeParms << /Predictor 15 ... >>`; `None` stores plain deflate
    /// with no DecodeParms. `filter_as_array`/`parms_as_array` exercise the
    /// array dictionary forms.
    fn build_pdf_flate_ext(
        px: u32,
        draw_pts: i64,
        channels: usize,
        predictor: Option<u8>,
        filter_as_array: bool,
        parms_as_array: bool,
    ) -> Vec<u8> {
        let raw = flate_pixels(px, px, channels);
        let (payload, parms) = match predictor {
            Some(tag) => {
                let filtered = png_filter_rows(&raw, px, channels, tag);
                let parms = dictionary! {
                    "Predictor" => 15_i64,
                    "Colors" => channels as i64,
                    "BitsPerComponent" => 8_i64,
                    "Columns" => px as i64,
                };
                (deflate_level9(&filtered).unwrap(), Some(parms))
            }
            None => (deflate_level9(&raw).unwrap(), None),
        };

        let mut dict = dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => px as i64,
            "Height" => px as i64,
            "ColorSpace" => if channels == 1 { "DeviceGray" } else { "DeviceRGB" },
            "BitsPerComponent" => 8_i64,
        };
        if filter_as_array {
            dict.set("Filter", vec![Object::Name(b"FlateDecode".to_vec())]);
        } else {
            dict.set("Filter", Object::Name(b"FlateDecode".to_vec()));
        }
        if let Some(parms) = parms {
            if parms_as_array {
                dict.set("DecodeParms", vec![Object::Dictionary(parms)]);
            } else {
                dict.set("DecodeParms", Object::Dictionary(parms));
            }
        }

        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(dict, payload));
        wrap_image_pdf(&mut doc, img_id, draw_pts)
    }

    fn build_pdf_flate(px: u32, draw_pts: i64, predictor: Option<u8>) -> Vec<u8> {
        build_pdf_flate_ext(px, draw_pts, 3, predictor, false, false)
    }

    /// The single image stream's decompressed pixel bytes.
    fn flate_image_pixels(pdf: &[u8]) -> Vec<u8> {
        let doc = Document::load_mem(pdf).unwrap();
        for obj in doc.objects.values() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    return s.decompressed_content().unwrap();
                }
            }
        }
        panic!("no image stream");
    }

    // ---- Flate-path tests --------------------------------------------------

    #[test]
    fn flate_predictor_variants_are_downsampled() {
        // 400px drawn into 100pt => ~288 DPI, over target. Every PNG row
        // filter plus the no-DecodeParms form must decode, downsample to
        // ~181px, and still yield consistent pixel data.
        let variants: [(Option<u8>, &str); 6] = [
            (None, "no DecodeParms"),
            (Some(0), "Predictor 15 / rows None"),
            (Some(1), "Predictor 15 / rows Sub"),
            (Some(2), "Predictor 15 / rows Up"),
            (Some(3), "Predictor 15 / rows Avg"),
            (Some(4), "Predictor 15 / rows Paeth"),
        ];
        for (predictor, label) in variants {
            let pdf = build_pdf_flate(400, 100, predictor);
            let out = optimize(&pdf);
            let (w, h) = image_dims(&out);
            assert!(
                (150..=210).contains(&w) && w == h,
                "{label}: unexpected dims {w}x{h}"
            );
            assert!(out.len() < pdf.len(), "{label}: output must be smaller");
            // The rewritten stream, decoded through lopdf's own filter path,
            // must equal a direct Lanczos3 resize of the source pixels EXACTLY
            // (both sides run the same deterministic resize) — this pins the
            // whole predictor decode chain, not just the byte count.
            let pixels = flate_image_pixels(&out);
            let reference = DynamicImage::ImageRgb8(
                image::RgbImage::from_raw(400, 400, flate_pixels(400, 400, 3)).unwrap(),
            )
            .resize_exact(w as u32, h as u32, image::imageops::FilterType::Lanczos3)
            .into_rgb8()
            .into_raw();
            assert_eq!(
                pixels, reference,
                "{label}: decoded pixels must match a direct resize of the source"
            );
        }
    }

    #[test]
    fn flate_filter_array_form_is_downsampled() {
        // Day-1 probe, kept as a regression test: /Filter [/FlateDecode] with
        // a SCALAR /DecodeParms dict decodes fine and must be handled like
        // the scalar-name form.
        let pdf = build_pdf_flate_ext(400, 100, 3, Some(2), true, false);
        let out = optimize(&pdf);
        let (w, h) = image_dims(&out);
        assert!(
            (150..=210).contains(&w) && w == h,
            "unexpected dims {w}x{h}"
        );
        assert!(out.len() < pdf.len());
        assert!(Document::load_mem(&out).is_ok());
    }

    #[test]
    fn flate_decode_parms_array_form_is_skipped() {
        // Day-1 probe result: lopdf 0.42 only reads the direct-dict form of
        // /DecodeParms — the array form is silently NOT applied, which would
        // hand us predictor-filtered rows as if they were pixels. The gate
        // must skip such images entirely (original bytes returned).
        let pdf = build_pdf_flate_ext(400, 100, 3, Some(2), false, true);
        let out = optimize(&pdf);
        assert_eq!(
            out, pdf,
            "array-form DecodeParms must leave the file untouched"
        );
    }

    #[test]
    fn flate_tiff_predictor_2_is_skipped() {
        // Day-1 probe result: lopdf silently IGNORES TIFF Predictor 2 — the
        // decoded bytes are wrong but the length is right, so the length check
        // alone cannot catch it. The explicit predictor-value gate must skip.
        let px = 400u32;
        let mut raw = flate_pixels(px, px, 3);
        let bpr = px as usize * 3;
        for row in raw.chunks_exact_mut(bpr) {
            for i in (3..bpr).rev() {
                row[i] = row[i].wrapping_sub(row[i - 3]);
            }
        }
        let payload = deflate_level9(&raw).unwrap();
        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
                "DecodeParms" => dictionary! {
                    "Predictor" => 2_i64,
                    "Colors" => 3_i64,
                    "BitsPerComponent" => 8_i64,
                    "Columns" => px as i64,
                },
            },
            payload,
        ));
        let pdf = wrap_image_pdf(&mut doc, img_id, 100);

        let out = optimize(&pdf);
        assert_eq!(out, pdf, "TIFF Predictor 2 must leave the file untouched");
    }

    #[test]
    fn flate_grayscale_stays_single_channel() {
        let pdf = build_pdf_flate_ext(400, 100, 1, Some(2), false, false);
        let out = optimize(&pdf);
        let (w, h) = image_dims(&out);
        assert!(
            (150..=210).contains(&w) && w == h,
            "unexpected dims {w}x{h}"
        );
        assert!(out.len() < pdf.len());
        // 1 channel in, 1 channel out — the DeviceGray /ColorSpace is unchanged
        // so 3-channel data here would be a corrupt image.
        let pixels = flate_image_pixels(&out);
        assert_eq!(
            pixels.len(),
            (w * h) as usize,
            "grayscale must stay 1-channel"
        );
    }

    #[test]
    fn flate_iccbased_n3_is_accepted() {
        // ICCBased with /N 3 is component-count-equivalent to DeviceRGB, which
        // is all the same-format path needs (the color space is never touched).
        let px = 400u32;
        let raw = flate_pixels(px, px, 3);
        let payload = deflate_level9(&raw).unwrap();
        let mut doc = Document::with_version("1.5");
        // A stand-in ICC profile stream: /N is what matters to the gate.
        let icc_id = doc.add_object(Stream::new(dictionary! { "N" => 3_i64 }, vec![0u8; 128]));
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => vec![Object::Name(b"ICCBased".to_vec()), icc_id.into()],
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            payload,
        ));
        let pdf = wrap_image_pdf(&mut doc, img_id, 100);

        let out = optimize(&pdf);
        let (w, h) = image_dims(&out);
        assert!(
            (150..=210).contains(&w) && w == h,
            "unexpected dims {w}x{h}"
        );
        assert!(out.len() < pdf.len());
        assert!(Document::load_mem(&out).is_ok());
    }

    /// Build an over-resolution Flate image PDF whose dict is customized by
    /// `mutate` before saving — for the "provably untouched" gate tests.
    fn build_flate_pdf_with_dict(
        px: u32,
        channels: usize,
        mutate: impl FnOnce(&mut Document, &mut lopdf::Dictionary),
    ) -> Vec<u8> {
        let raw = flate_pixels(px, px, channels);
        let payload = deflate_level9(&raw).unwrap();
        let mut doc = Document::with_version("1.5");
        let mut dict = dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => px as i64,
            "Height" => px as i64,
            "ColorSpace" => if channels == 1 { "DeviceGray" } else { "DeviceRGB" },
            "BitsPerComponent" => 8_i64,
            "Filter" => "FlateDecode",
        };
        mutate(&mut doc, &mut dict);
        let img_id = doc.add_object(Stream::new(dict, payload));
        wrap_image_pdf(&mut doc, img_id, 100)
    }

    /// Build a one-page PDF embedding an image whose `/Filter` is one of the
    /// exotic, undeclared-decoder classes (`/JPXDecode`, `/JBIG2Decode`), with
    /// `payload` left as opaque bytes (no decoder is linked, so the exact
    /// bytes must never be parsed or touched). `as_array` exercises the
    /// one-element `/Filter [<name>]` form, which `classify_filter` must also
    /// recognize.
    fn build_exotic_pdf(filter: &[u8], payload: &[u8], as_array: bool) -> Vec<u8> {
        let mut dict = dictionary! {
            "Type" => "XObject",
            "Subtype" => "Image",
            "Width" => 400_i64,
            "Height" => 400_i64,
            "ColorSpace" => "DeviceRGB",
            "BitsPerComponent" => 8_i64,
        };
        if as_array {
            dict.set("Filter", vec![Object::Name(filter.to_vec())]);
        } else {
            dict.set("Filter", Object::Name(filter.to_vec()));
        }
        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(dict, payload.to_vec()));
        wrap_image_pdf(&mut doc, img_id, 100)
    }

    #[test]
    fn classify_recognizes_exotic_filter_names() {
        // The leading-line seam for the exotic conversions: /JPXDecode and
        // /JBIG2Decode must classify distinctly (never fall into DctOnly /
        // FlateOnly, which is what would let a re-encode path corrupt them).
        let doc = Document::with_version("1.5");
        let cases: [(String, Vec<u8>, FilterClass); 2] = [
            (
                "JPXDecode".to_owned(),
                b"JPXDecode".to_vec(),
                FilterClass::JpxOnly,
            ),
            (
                "JBIG2Decode".to_owned(),
                b"JBIG2Decode".to_vec(),
                FilterClass::Jbig2Only,
            ),
        ];
        for (label, name, want) in cases {
            let scalar = Object::Name(name.to_vec());
            assert_eq!(
                classify_filter(&doc, &scalar),
                want,
                "{label}: scalar-name form must classify as {want:?}"
            );
            // The one-element-array form is the other spelling the PDF spec
            // permits for a single filter.
            let array = Object::Array(vec![Object::Name(name.to_vec())]);
            assert_eq!(
                classify_filter(&doc, &array),
                want,
                "{label}: one-element-array form must classify as {want:?}"
            );
        }
    }

    #[test]
    fn exotic_filter_images_are_left_byte_identical() {
        // No JP2 or JBIG2 decoder is linked (the image crate build is
        // JPEG-only), so any re-encode of these would corrupt them. The
        // fail-safe contract therefore demands the ORIGINAL bytes come back —
        // whole-file equality — for both filter names and both spellings.
        let payload = vec![0x1Au8; 96];
        let cases: Vec<(String, &[u8], bool)> = vec![
            ("JPXDecode scalar".to_owned(), b"JPXDecode", false),
            ("JPXDecode array".to_owned(), b"JPXDecode", true),
            ("JBIG2Decode scalar".to_owned(), b"JBIG2Decode", false),
            ("JBIG2Decode array".to_owned(), b"JBIG2Decode", true),
        ];
        for (label, name, as_array) in cases {
            let pdf = build_exotic_pdf(name, &payload, as_array);
            let out = optimize(&pdf);
            assert_eq!(
                out, pdf,
                "{label}: exotic-filter image must be left byte-identical"
            );
            // The filter name must survive verbatim (never relabeled DCT/Flate).
            let reloaded = Document::load_mem(&out).unwrap();
            let mut has_exotic = false;
            for obj in reloaded.objects.values() {
                let exotic = match obj {
                    Object::Stream(s) => {
                        let is_image = matches!(
                            s.dict.get(b"Subtype"),
                            Ok(Object::Name(n)) if n == b"Image"
                        );
                        is_image
                            && match s.dict.get(b"Filter") {
                                // Both the scalar /Name and the PDF-spec
                                // one-element-array spelling count.
                                Ok(Object::Name(n)) => n == name,
                                Ok(Object::Array(items)) if items.len() == 1 => {
                                    matches!(&items[0], Object::Name(n) if n == name)
                                }
                                _ => false,
                            }
                    }
                    _ => false,
                };
                has_exotic |= exotic;
            }
            assert!(has_exotic, "{label}: filter name must be preserved");
        }
    }

    #[test]
    fn flate_ineligible_images_are_untouched() {
        // Each ineligible shape must return the ORIGINAL bytes — dims and
        // stream bytes provably unchanged (whole-file equality implies both).
        let cases: Vec<(&str, Vec<u8>)> = vec![
            (
                "Indexed color space",
                build_flate_pdf_with_dict(400, 3, |_, d| {
                    d.set(
                        "ColorSpace",
                        vec![
                            Object::Name(b"Indexed".to_vec()),
                            Object::Name(b"DeviceRGB".to_vec()),
                            Object::Integer(255),
                            Object::String(vec![0u8; 768], lopdf::StringFormat::Hexadecimal),
                        ],
                    );
                }),
            ),
            (
                "1-bit",
                build_flate_pdf_with_dict(400, 1, |_, d| {
                    d.set("BitsPerComponent", 1_i64);
                }),
            ),
            (
                "16-bit",
                build_flate_pdf_with_dict(400, 3, |_, d| {
                    d.set("BitsPerComponent", 16_i64);
                }),
            ),
            // (An eligible "/SMask present" shape used to sit in this list;
            // since D-M3 it is a POSITIVE case — see the masked-Flate battery.)
            (
                "/Decode array present",
                build_flate_pdf_with_dict(400, 3, |_, d| {
                    d.set(
                        "Decode",
                        vec![1.into(), 0.into(), 1.into(), 0.into(), 1.into(), 0.into()],
                    );
                }),
            ),
        ];
        for (label, pdf) in cases {
            let out = optimize(&pdf);
            assert_eq!(out, pdf, "{label}: must be byte-identical to the input");
        }
    }

    #[test]
    fn flate_corrupt_streams_return_original_bytes() {
        // Degradation contract: corruption must yield the EXACT original
        // bytes, never a partially rewritten document.
        // (a) Truncated zlib body — lopdf returns partial data as Ok, so the
        //     exact-length check is what catches this.
        let pdf = build_pdf_flate(400, 100, None);
        let mut doc = Document::load_mem(&pdf).unwrap();
        for obj in doc.objects.values_mut() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    let half = s.content.len() / 2;
                    let truncated = s.content[..half].to_vec();
                    s.set_content(truncated);
                }
            }
        }
        let mut truncated_pdf: Vec<u8> = Vec::new();
        doc.save_to(&mut truncated_pdf).unwrap();
        let out = optimize(&truncated_pdf);
        assert_eq!(
            out, truncated_pdf,
            "truncated zlib must return original bytes"
        );

        // (b) Decoded-length mismatch: dict claims 400x400 but the stream
        //     holds 200x200 worth of pixels.
        let small = deflate_level9(&flate_pixels(200, 200, 3)).unwrap();
        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => 400_i64,
                "Height" => 400_i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            small,
        ));
        let mismatched = wrap_image_pdf(&mut doc, img_id, 100);
        let out = optimize(&mismatched);
        assert_eq!(
            out, mismatched,
            "length mismatch must return original bytes"
        );

        // (c) A predictor value lopdf rejects/ignores (99).
        let bad_pred = build_flate_pdf_with_dict(400, 3, |_, d| {
            d.set(
                "DecodeParms",
                dictionary! { "Predictor" => 99_i64, "Colors" => 3_i64, "Columns" => 400_i64 },
            );
        });
        let out = optimize(&bad_pred);
        assert_eq!(
            out, bad_pred,
            "unknown predictor must return original bytes"
        );
    }

    #[test]
    fn flate_optimize_is_idempotent() {
        // Characterization: a second pass over already-optimized output must
        // be byte-stable — the downsampled image sits at the target DPI
        // (inside the margin), so no further work is planned and the fail-safe
        // path hands back the input unchanged.
        let pdf = build_pdf_flate(400, 100, Some(2));
        let once = optimize(&pdf);
        assert!(once.len() < pdf.len(), "first pass must shrink");
        let twice = optimize(&once);
        assert_eq!(twice, once, "second pass must be byte-stable");
    }

    #[test]
    fn flate_under_resolution_is_untouched() {
        // 120px drawn into 100pt => ~86 DPI, below target: exact original bytes.
        let pdf = build_pdf_flate(120, 100, None);
        let out = optimize(&pdf);
        assert_eq!(out, pdf, "under-resolution Flate image must be untouched");
    }

    #[test]
    fn downsample_flate_images_off_leaves_flate_untouched() {
        let pdf = build_pdf_flate(400, 100, Some(2));
        let opts = OptimizeOptions::default().with_downsample_flate_images(false);
        let out = optimize_with_options(&pdf, opts);
        assert_eq!(out, pdf, "flag off must leave Flate images untouched");
    }

    // ---- Phase 7 spike: consent-gated lossy Flate→JPEG re-encode -----------

    /// Smooth sinusoidal shading plus low-amplitude deterministic noise — a
    /// stand-in for photographic content: the noise floor keeps deflate
    /// mediocre (like a real photo's sensor grain) while JPEG's DCT
    /// quantization absorbs it, so the lossy candidate genuinely wins. Line
    /// art is the opposite shape (see the checkerboard fixture below).
    fn photo_pixels(px_w: u32, px_h: u32, channels: usize) -> Vec<u8> {
        let mut state = 0x2545_F491_u32;
        let mut out = Vec::with_capacity(px_w as usize * px_h as usize * channels);
        for y in 0..px_h {
            for x in 0..px_w {
                for c in 0..channels {
                    state ^= state << 13;
                    state ^= state >> 17;
                    state ^= state << 5;
                    let noise = (state >> 28) as i32 - 8; // [-8, 7]
                    let phase = (x as f32 / 23.0) + (y as f32 / 17.0) + c as f32;
                    let base = 128.0 + 96.0 * phase.sin();
                    out.push((base as i32 + noise).clamp(0, 255) as u8);
                }
            }
        }
        out
    }

    /// Build a one-page PDF embedding the given raw pixels as a plain-deflate
    /// FlateDecode image drawn into a `draw_pts` square.
    fn build_pdf_flate_raw(raw: &[u8], px: u32, draw_pts: i64, channels: usize) -> Vec<u8> {
        let payload = deflate_level9(raw).unwrap();
        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => if channels == 1 { "DeviceGray" } else { "DeviceRGB" },
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            payload,
        ));
        wrap_image_pdf(&mut doc, img_id, draw_pts)
    }

    /// The (single) image stream's `/Filter` name (scalar or first array
    /// element), plus whether the dict still carries `/DecodeParms`.
    fn image_filter_info(pdf: &[u8]) -> (Vec<u8>, bool) {
        let doc = Document::load_mem(pdf).unwrap();
        for obj in doc.objects.values() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    let name = match s.dict.get(b"Filter").unwrap() {
                        Object::Name(n) => n.clone(),
                        Object::Array(items) => match &items[0] {
                            Object::Name(n) => n.clone(),
                            other => panic!("unexpected filter element {other:?}"),
                        },
                        other => panic!("unexpected filter {other:?}"),
                    };
                    return (name, s.dict.get(b"DecodeParms").is_ok());
                }
            }
        }
        panic!("no image stream");
    }

    /// A 200 px photographic Flate image drawn into 200 pt: 72 effective DPI,
    /// safely under the 130×1.15 threshold — the under-resolution shape.
    fn build_photo_flate_under_res() -> Vec<u8> {
        build_pdf_flate_raw(&photo_pixels(200, 200, 3), 200, 200, 3)
    }

    #[test]
    fn lossy_reencode_cannot_fire_without_consent() {
        // The consent pin (Phase 7). Default options: an under-resolution
        // photographic Flate image — exactly the shape the lossy path targets
        // — must come back byte-identical...
        let pdf = build_photo_flate_under_res();
        let out = optimize(&pdf);
        assert_eq!(
            out, pdf,
            "without allow_lossy_reencode the Flate payload must be untouched"
        );

        // ...and an over-resolution one must stay a FlateDecode stream (the
        // lossless downsample may fire; the encoding class must not change).
        let over = build_pdf_flate_raw(&photo_pixels(400, 400, 3), 400, 100, 3);
        let out = optimize(&over);
        let (filter, _) = image_filter_info(&out);
        assert_eq!(
            filter, b"FlateDecode",
            "without consent the encoding class must never change"
        );
    }

    #[test]
    fn lossy_reencode_converts_photographic_flate() {
        // Flag on, under-resolution photographic image: the payload converts
        // to a strictly smaller DCTDecode stream at UNCHANGED geometry, the
        // stale /DecodeParms is gone, the JPEG decodes back to nearby pixels,
        // and a second optimize call is byte-stable (requant guards see a
        // fresh q78 payload and decline the <5% churn).
        let pdf = build_photo_flate_under_res();
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let out = optimize_with_options(&pdf, opts);
        assert!(out.len() < pdf.len(), "conversion must shrink the file");

        let (filter, has_parms) = image_filter_info(&out);
        assert_eq!(filter, b"DCTDecode", "payload must now be a JPEG");
        assert!(!has_parms, "Flate /DecodeParms must be dropped");
        assert_eq!(image_dims(&out), (200, 200), "geometry must be unchanged");

        let jpeg = image_stream_bytes(&out);
        let decoded = image::load_from_memory_with_format(&jpeg, ImageFormat::Jpeg)
            .expect("converted payload must decode as a JPEG");
        assert_eq!((decoded.width(), decoded.height()), (200, 200));
        let actual = decoded.to_rgb8().into_raw();
        let reference = photo_pixels(200, 200, 3);
        let sad: u64 = reference
            .iter()
            .zip(&actual)
            .map(|(a, b)| u64::from(a.abs_diff(*b)))
            .sum();
        let mad = sad as f64 / reference.len() as f64;
        assert!(
            mad <= 24.0,
            "decode-back must reproduce nearby pixels (MAD {mad:.1})"
        );

        let twice = optimize_with_options(&out, opts);
        assert_eq!(twice, out, "second pass must be byte-stable");
    }

    /// Mean absolute difference between a reference RGB buffer and a JPEG's
    /// decode-back, in 0..=255 units — the quantity `decode_back_matches`
    /// thresholds against `DECODE_BACK_MAX_MAD`.
    fn jpeg_mad(jpeg: &[u8], reference: &[u8], w: u32, h: u32) -> f64 {
        let (decoded, _) = decode_jpeg(jpeg, w, h).expect("candidate must decode");
        let actual = decoded.to_rgb8().into_raw();
        assert_eq!(actual.len(), reference.len());
        let sad: u64 = reference
            .iter()
            .zip(&actual)
            .map(|(a, b)| u64::from(a.abs_diff(*b)))
            .sum();
        sad as f64 / reference.len() as f64
    }

    /// HUNT4 item 11 — is the "retry at a higher quality after a MAD decline"
    /// ladder reachable at all?
    ///
    /// Feeds the encoder the worst case a JPEG can be handed: per-channel
    /// independent uniform noise, which has no spatial correlation for the DCT
    /// to exploit. Two facts get pinned down:
    ///
    /// 1. even here the q78 MAD lands *far* below `DECODE_BACK_MAX_MAD`, so no
    ///    real image can trip the guard — the ladder has no reachable trigger;
    /// 2. the ladder's *premise* is still sound: at a threshold between the two
    ///    measured MADs, q78 declines where q90 passes. The mechanism works;
    ///    it simply never fires at the shipped ceiling.
    #[test]
    fn lossy_quality_ladder_has_no_reachable_trigger() {
        let (w, h) = (128u32, 128u32);
        let mut state = 0x2545_f491_4f6c_dd1du64;
        let mut pixels = Vec::with_capacity((w * h * 3) as usize);
        for _ in 0..w * h * 3 {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            pixels.push((state >> 33) as u8);
        }
        let img = |p: &Vec<u8>| {
            DynamicImage::ImageRgb8(image::RgbImage::from_raw(w, h, p.clone()).unwrap())
        };
        let q78 = encode_jpeg(img(&pixels), false, 78).expect("q78 must encode");
        let q90 = encode_jpeg(img(&pixels), false, 90).expect("q90 must encode");

        let mad78 = jpeg_mad(&q78, &pixels, w, h);
        let mad90 = jpeg_mad(&q90, &pixels, w, h);

        eprintln!("HUNT4 item 11: noise q78 MAD {mad78:.2}, q90 MAD {mad90:.2}, ceiling {DECODE_BACK_MAX_MAD}");
        // (1) The shipped ceiling is unreachable: pure noise still passes.
        assert!(
            mad78 < DECODE_BACK_MAX_MAD,
            "adversarial noise must still pass the shipped MAD ceiling \
             (q78 MAD {mad78:.1} vs ceiling {DECODE_BACK_MAX_MAD}) — if this \
             ever fails, the ladder has become reachable and is worth building"
        );
        assert!(
            decode_back_matches(&q78, &pixels, false, w, h, DECODE_BACK_MAX_MAD),
            "the guard itself must agree"
        );

        // (2) The ladder would work if a decline existed: pick a threshold
        // between the two MADs and watch q78 fail where q90 passes.
        assert!(
            mad90 < mad78,
            "higher quality must reduce MAD (q90 {mad90:.1} vs q78 {mad78:.1})"
        );
        let between = f64::midpoint(mad90, mad78);
        assert!(
            !decode_back_matches(&q78, &pixels, false, w, h, between),
            "forced-decline scenario: q78 must fail at MAD {between:.1}"
        );
        assert!(
            decode_back_matches(&q90, &pixels, false, w, h, between),
            "forced-decline scenario: q90 must pass at MAD {between:.1}"
        );
    }

    #[test]
    fn lossy_reencode_over_resolution_jpeg_candidate_competes() {
        // Flag on, over-resolution photographic image (400 px into 100 pt ≈
        // 288 DPI): the JPEG candidate at the SAME target geometry as the
        // lossless downsample wins on noisy content, and beats the flag-off
        // output.
        let pdf = build_pdf_flate_raw(&photo_pixels(400, 400, 3), 400, 100, 3);
        let flag_off = optimize(&pdf);
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let flag_on = optimize_with_options(&pdf, opts);

        let (filter, has_parms) = image_filter_info(&flag_on);
        assert_eq!(filter, b"DCTDecode", "JPEG candidate must win on a photo");
        assert!(!has_parms);
        let (w, h) = image_dims(&flag_on);
        assert!(
            (150..=210).contains(&w) && w == h,
            "must land at the downsample's target geometry, got {w}x{h}"
        );
        assert!(
            flag_on.len() < flag_off.len(),
            "lossy candidate must beat the lossless downsample ({} !< {})",
            flag_on.len(),
            flag_off.len()
        );
    }

    #[test]
    fn lossy_reencode_line_art_never_larger() {
        // Sharp-edged flat-color content: deflate is near-optimal, the JPEG
        // candidate cannot save 5% — the guard declines and the file comes
        // back byte-identical (never-larger holds trivially).
        let pdf = build_pdf_flate_raw(&checkerboard_pixels(200, 8, 3), 200, 200, 3);
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let out = optimize_with_options(&pdf, opts);
        assert!(out.len() <= pdf.len(), "never-larger must hold");
        assert_eq!(
            out, pdf,
            "line art must decline conversion (5% guard / strict-smaller)"
        );

        // Over-resolution line art: whatever happens (lossless downsample or
        // nothing), the encoding class must not flip to JPEG — the Flate
        // candidate is smaller on this content.
        let over = build_pdf_flate_raw(&checkerboard_pixels(400, 8, 3), 400, 100, 3);
        let out = optimize_with_options(&over, opts);
        let (filter, _) = image_filter_info(&out);
        assert_eq!(
            filter, b"FlateDecode",
            "line art must keep its lossless encoding even with consent"
        );
    }

    #[test]
    fn lossy_reencode_skips_ineligible_color_shapes() {
        // Indexed, 16-bit, and CMYK Flate images are outside the conversion's
        // vetted scope: byte-identical output even with the flag on. All are
        // under-resolution (120 px into 100 pt ≈ 86 DPI) so the lossy requant
        // branch — not the downsample — is what gets exercised.
        let indexed = build_pdf_flate_raw(&photo_pixels(120, 120, 3), 120, 100, 3);
        let mut doc = Document::load_mem(&indexed).unwrap();
        for obj in doc.objects.values_mut() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    s.dict.set(
                        "ColorSpace",
                        vec![
                            Object::Name(b"Indexed".to_vec()),
                            Object::Name(b"DeviceRGB".to_vec()),
                            Object::Integer(255),
                            Object::String(vec![0u8; 768], lopdf::StringFormat::Hexadecimal),
                        ],
                    );
                }
            }
        }
        let mut indexed_pdf: Vec<u8> = Vec::new();
        doc.save_to(&mut indexed_pdf).unwrap();

        let mut sixteen_doc = Document::load_mem(&indexed).unwrap();
        for obj in sixteen_doc.objects.values_mut() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    s.dict.set("BitsPerComponent", 16_i64);
                }
            }
        }
        let mut sixteen_pdf: Vec<u8> = Vec::new();
        sixteen_doc.save_to(&mut sixteen_pdf).unwrap();

        let mut cmyk_doc = Document::load_mem(&indexed).unwrap();
        for obj in cmyk_doc.objects.values_mut() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    s.dict
                        .set("ColorSpace", Object::Name(b"DeviceCMYK".to_vec()));
                }
            }
        }
        let mut cmyk_pdf: Vec<u8> = Vec::new();
        cmyk_doc.save_to(&mut cmyk_pdf).unwrap();

        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        for (label, pdf) in [
            ("Indexed", indexed_pdf),
            ("16-bit", sixteen_pdf),
            ("DeviceCMYK", cmyk_pdf),
        ] {
            let out = optimize_with_options(&pdf, opts);
            assert_eq!(out, pdf, "{label}: must never convert, even with consent");
        }
    }

    #[test]
    fn lossy_reencode_corrupt_flate_returns_exact_original_bytes() {
        // Degradation contract with the flag ON: a truncated zlib payload
        // must yield the EXACT original bytes, never a partial rewrite.
        let pdf = build_photo_flate_under_res();
        let mut doc = Document::load_mem(&pdf).unwrap();
        for obj in doc.objects.values_mut() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    let half = s.content.len() / 2;
                    let truncated = s.content[..half].to_vec();
                    s.set_content(truncated);
                }
            }
        }
        let mut corrupt: Vec<u8> = Vec::new();
        doc.save_to(&mut corrupt).unwrap();

        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let out = optimize_with_options(&corrupt, opts);
        assert_eq!(
            out, corrupt,
            "corrupt input must return exact original bytes"
        );
    }

    #[test]
    fn requant_declines_payload_already_at_target_quality() {
        // Exact idempotence guard (Phase 7): a JPEG that mozjpeg itself
        // encoded at the configured quality carries byte-identical
        // quantization tables to the requant candidate — re-encoding it is
        // pure generation-loss churn even when trellis could still shave ≥5%
        // (graphics-heavy content, the NASA banner repro). Must be declined
        // outright, leaving the file byte-identical.
        let raw = checkerboard_pixels(300, 8, 3);
        let img = DynamicImage::ImageRgb8(image::RgbImage::from_raw(300, 300, raw).unwrap());
        let jpeg = encode_jpeg(img, false, 78).unwrap();
        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => 300_i64,
                "Height" => 300_i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "DCTDecode",
            },
            jpeg,
        ));
        // 300 px into 300 pt ⇒ 72 DPI, under-threshold: the P-M2 requant is
        // the branch that would otherwise fire.
        let pdf = wrap_image_pdf(&mut doc, img_id, 300);
        let out = optimize(&pdf);
        assert_eq!(
            out, pdf,
            "a payload already at the target quality must never be requantized"
        );
    }

    /// A one-page PDF holding a `px`-square FlateDecode RGB base with an
    /// eligible plain 8-bit DeviceGray `/SMask`, drawn into `draw_pts`.
    /// `base` supplies the base pixels so callers can vary the content class.
    fn build_pdf_masked_flate(base: &[u8], px: u32, draw_pts: i64) -> Vec<u8> {
        let mut doc = Document::with_version("1.5");
        let mask_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceGray",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            deflate_level9(&photo_pixels(px, px, 1)).unwrap(),
        ));
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
                "SMask" => mask_id,
            },
            deflate_level9(base).unwrap(),
        ));
        wrap_image_pdf(&mut doc, img_id, draw_pts)
    }

    /// Every masked image stream as `(filter name, /SMask target, w, h)`.
    fn masked_bases(pdf: &[u8]) -> Vec<(Vec<u8>, ObjectId, i64, i64)> {
        let doc = Document::load_mem(pdf).unwrap();
        let mut out: Vec<_> = doc
            .objects
            .iter()
            .filter_map(|(id, obj)| match obj {
                Object::Stream(s)
                    if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image")
                        && s.dict.get(b"SMask").is_ok() =>
                {
                    let filter = match s.dict.get(b"Filter").unwrap() {
                        Object::Name(n) => n.clone(),
                        Object::Array(items) => match &items[0] {
                            Object::Name(n) => n.clone(),
                            other => panic!("unexpected filter element {other:?}"),
                        },
                        other => panic!("unexpected filter {other:?}"),
                    };
                    let mask = match s.dict.get(b"SMask").unwrap() {
                        Object::Reference(r) => *r,
                        other => panic!("fixture uses indirect masks, got {other:?}"),
                    };
                    let w = s.dict.get(b"Width").unwrap().as_i64().unwrap();
                    let h = s.dict.get(b"Height").unwrap().as_i64().unwrap();
                    Some((*id, (filter, mask, w, h)))
                }
                _ => None,
            })
            .collect();
        out.sort_by_key(|(id, _)| *id);
        out.into_iter().map(|(_, v)| v).collect()
    }

    /// A mask stream's `(bytes, width, height)`.
    fn mask_shape(pdf: &[u8], mask_id: ObjectId) -> (Vec<u8>, i64, i64) {
        let doc = Document::load_mem(pdf).unwrap();
        let s = doc.get_object(mask_id).unwrap().as_stream().unwrap();
        (
            s.content.clone(),
            s.dict.get(b"Width").unwrap().as_i64().unwrap(),
            s.dict.get(b"Height").unwrap().as_i64().unwrap(),
        )
    }

    #[test]
    fn lossy_reencode_converts_masked_flate_base_keeps_mask() {
        // A Flate base carrying an eligible /SMask, under-resolution (200 px
        // into 200 pt ⇒ 72 DPI, so the D-M3 coupled downsample does not
        // apply). With consent it takes the DIMENSION-PRESERVING Flate→JPEG
        // conversion: the base becomes DCTDecode at the same geometry and the
        // mask stream is not touched at all — same bytes, same /Width//Height
        // — which is what keeps base and mask aligned (mask-alignment
        // experiment: hard-edged and antialiased masks alike show no
        // misregistration over a q78 4:2:0 base).
        let px = 200u32;
        let pdf = build_pdf_masked_flate(&photo_pixels(px, px, 3), px, 200);
        let before = masked_bases(&pdf);
        assert_eq!(before.len(), 1, "fixture holds one masked base");
        let mask_id = before[0].1;
        let mask_before = mask_shape(&pdf, mask_id);

        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let out = optimize_with_options(&pdf, opts);
        assert!(out.len() < pdf.len(), "the conversion must shrink the file");

        let after = masked_bases(&out);
        assert_eq!(after.len(), 1, "the masked base must survive");
        let (filter, mask_after_id, w, h) = &after[0];
        assert_eq!(filter.as_slice(), b"DCTDecode", "base converted to JPEG");
        assert_eq!(
            (*w, *h),
            (px as i64, px as i64),
            "the conversion is dimension-preserving"
        );
        assert_eq!(*mask_after_id, mask_id, "the /SMask reference is intact");
        assert_eq!(
            mask_shape(&out, mask_id),
            mask_before,
            "the mask stream must be byte-identical, same dimensions"
        );
        assert!(Document::load_mem(&out).is_ok(), "output must load back");

        // Flag off, same fixture: nothing at all happens (the pre-consent
        // behavior of this branch is unchanged).
        assert_eq!(
            optimize(&pdf),
            pdf,
            "without consent the masked Flate pair stays untouched"
        );
    }

    #[test]
    fn lossy_reencode_shared_mask_bases_convert_mask_untouched() {
        // Two under-resolution Flate bases sharing ONE /SMask object. The
        // conversion never modifies a mask stream, so a shared mask does not
        // block it (exactly the P-M1 argument that lets shared-mask DCT pairs
        // requantize): both bases convert, the single mask stays byte-identical
        // at the same dimensions, and both /SMask refs still point at it.
        let px = 200u32;
        let mut doc = Document::with_version("1.5");
        let mask_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceGray",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            deflate_level9(&photo_pixels(px, px, 1)).unwrap(),
        ));
        let pixels_a = photo_pixels(px, px, 3);
        // Inverted pixels: still photographic, but different bytes, so
        // `dedup_streams` cannot merge the two BASES into one object.
        let pixels_b: Vec<u8> = pixels_a.iter().map(|b| 255 - b).collect();
        let base_dict = |mask: ObjectId| {
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
                "SMask" => mask,
            }
        };
        let img_a = doc.add_object(Stream::new(
            base_dict(mask_id),
            deflate_level9(&pixels_a).unwrap(),
        ));
        let img_b = doc.add_object(Stream::new(
            base_dict(mask_id),
            deflate_level9(&pixels_b).unwrap(),
        ));
        let content_id = doc.add_object(Stream::new(
            dictionary! {},
            b"q 200 0 0 200 0 0 cm /Im0 Do Q q 200 0 0 200 250 0 cm /Im1 Do Q".to_vec(),
        ));
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => content_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! {
                "XObject" => dictionary! {
                    "Im0" => Object::Reference(img_a),
                    "Im1" => Object::Reference(img_b),
                },
            },
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
        let mut pdf: Vec<u8> = Vec::new();
        doc.save_to(&mut pdf).unwrap();

        let before = masked_bases(&pdf);
        assert_eq!(before.len(), 2, "fixture holds two masked bases");
        assert_eq!(before[0].1, before[1].1, "both share one mask object");
        let mask_before = mask_shape(&pdf, before[0].1);

        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let out = optimize_with_options(&pdf, opts);

        let after = masked_bases(&out);
        assert_eq!(after.len(), 2, "both masked bases must survive");
        for (filter, mask, w, h) in &after {
            assert_eq!(filter.as_slice(), b"DCTDecode", "both bases convert");
            assert_eq!((*w, *h), (px as i64, px as i64), "geometry preserved");
            assert_eq!(*mask, before[0].1, "/SMask still points at the shared mask");
        }
        assert_eq!(
            mask_shape(&out, before[0].1),
            mask_before,
            "the shared mask must be byte-identical, same dimensions"
        );
        assert!(Document::load_mem(&out).is_ok(), "output must load back");
    }

    #[test]
    fn lossy_reencode_masked_line_art_is_declined() {
        // The line-art content guard runs on the SOURCE pixels inside
        // `plan_flate_to_jpeg`, so it protects the masked branch too: a masked
        // line-art base is left completely untouched even with consent.
        let px = 200u32;
        let pdf = build_pdf_masked_flate(&line_art_pixels(px, px), px, 200);
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        assert_eq!(
            optimize_with_options(&pdf, opts),
            pdf,
            "masked line art must not be converted even with --allow-lossy"
        );
    }

    /// Line-art pixels: sharp 1 px black lines on a white background — the p12
    /// class the Phase 7 human review rejected (dashes muddy, background
    /// mottles, hairlines shift color under DCT).
    fn line_art_pixels(w: u32, h: u32) -> Vec<u8> {
        let mut buf = vec![255u8; (w * h * 3) as usize];
        // Faint deterministic paper grain (≤ 6 counts below white): invisible
        // to all three guard metrics (same >>3 quantization bucket, far below
        // EDGE_STEP) but deflate-hostile and DCT-cheap — this is what keeps
        // the JPEG candidate clearing the 5% size bar "by a wide margin"
        // below, even against the zlib-rs deflate backend.
        for (i, byte) in buf.iter_mut().enumerate() {
            let mut x = i as u32 ^ 0x9E37_79B9;
            x ^= x << 13;
            x ^= x >> 17;
            x ^= x << 5;
            *byte -= (x % 7) as u8;
        }
        let palette = [
            [20u8, 40, 190],
            [10, 10, 10],
            [180, 30, 40],
            [20, 120, 60],
            [90, 30, 150],
        ];
        // Anti-aliased dash-dot curves at irregular (non-periodic) positions:
        // sparse ink, sharp black/white transitions, a handful of colors — and
        // deliberately NOT deflate-friendly, so the size guard alone would
        // convert it. (The curve frequency is tuned so that holds with margin
        // under the zlib-rs deflate backend, which out-compresses the old
        // miniz_oxide baseline.)
        for (k, color) in palette.iter().enumerate() {
            for x in 0..w {
                if (x as usize / (5 + k)) % 3 == 2 {
                    continue; // dash gaps
                }
                let f = x as f32 * (0.013 + k as f32 * 0.0037) + k as f32 * 0.7;
                let y = h as f32 / 2.0 + (h as f32 / 2.6) * f.sin();
                let yi = y.floor();
                if yi < 0.0 || yi as u32 + 1 >= h {
                    continue;
                }
                let frac = y - yi;
                for (row, cover) in [(yi as u32, 1.0 - frac), (yi as u32 + 1, frac)] {
                    let i = ((row * w + x) * 3) as usize;
                    for c in 0..3 {
                        let bg = buf[i + c] as f32;
                        buf[i + c] = (bg + (color[c] as f32 - bg) * cover).round() as u8;
                    }
                }
            }
        }
        // Plot frame: one-pixel black rules.
        for x in 0..w {
            for row in [0u32, h - 1] {
                let i = ((row * w + x) * 3) as usize;
                buf[i..i + 3].copy_from_slice(&[0, 0, 0]);
            }
        }
        for y in 0..h {
            for col in [0u32, w - 1] {
                let i = ((y * w + col) * 3) as usize;
                buf[i..i + 3].copy_from_slice(&[0, 0, 0]);
            }
        }
        buf
    }

    #[test]
    fn lossy_reencode_declines_line_art() {
        // FIX 1 (Phase 7 post-review): the under-threshold lossy path must
        // decline line-art content even though the size guard would happily
        // convert it. 200 px into 200 pt ⇒ 72 DPI, the dimension-preserving
        // shape.
        let raw = line_art_pixels(200, 200);
        let m = line_art_metrics(&raw, 3, 200, 200);
        assert!(
            looks_like_line_art(&raw, 3, 200, 200),
            "fixture must trip the content guard (bg {:.3} pal {:.3} edge {:.4})",
            m.background,
            m.palette,
            m.edges
        );
        assert!(
            !looks_like_line_art(&photo_pixels(200, 200, 3), 3, 200, 200),
            "photographic content must NOT trip the guard"
        );

        let pdf = build_pdf_flate_raw(&raw, 200, 200, 3);
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let out = optimize_with_options(&pdf, opts);
        assert_eq!(
            out, pdf,
            "line art must not be converted even with --allow-lossy"
        );

        // And prove the guard is what declined it: without the content check
        // the JPEG candidate clears the 5% savings bar by a wide margin.
        let doc = Document::load_mem(&pdf).unwrap();
        let stream = doc
            .objects
            .values()
            .find_map(|o| match o {
                Object::Stream(s)
                    if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") =>
                {
                    Some(s)
                }
                _ => None,
            })
            .unwrap();
        let (img, _) = decode_flate_image(&doc, stream, 200, 200).unwrap();
        let unguarded = encode_jpeg(img, false, opts.jpeg_quality).unwrap();
        assert!(
            unguarded.len() * 100 < stream.content.len() * 95,
            "without the guard this fixture would convert ({} -> {})",
            stream.content.len(),
            unguarded.len()
        );
    }

    #[test]
    fn lossy_reencode_declines_over_resolution_line_art() {
        // The p12 shape as it actually occurs: the line-art profiles are
        // OVER-RESOLUTION in the source PDF, so they reach the JPEG-vs-Flate
        // competition, not the dimension-preserving branch. The content guard
        // (evaluated on the source pixels) removes the JPEG candidate, leaving
        // the lossless downsample to ship — so the flag-on output is exactly
        // the flag-off output.
        let pdf = build_pdf_flate_raw(&line_art_pixels(400, 400), 400, 100, 3);
        let flag_off = optimize(&pdf);
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let flag_on = optimize_with_options(&pdf, opts);
        assert_eq!(
            flag_on, flag_off,
            "line art must never convert, whatever its resolution"
        );
        let (filter, _) = image_filter_info(&flag_on);
        assert_eq!(filter, b"FlateDecode", "encoding class must not change");
    }

    /// Periodic banner content: a stepped color ramp under a fine 1 px grid.
    /// Deflate exploits the exact periodicity at full resolution; resampling
    /// destroys it, so the LOSSLESS downsample of this image is *larger* than
    /// the original stream while a JPEG of the same target geometry is much
    /// smaller — the compounding-loss trap FIX 2 closes.
    fn periodic_banner_pixels(px: u32) -> Vec<u8> {
        let mut out = Vec::with_capacity((px * px * 3) as usize);
        for y in 0..px {
            for x in 0..px {
                let base = [
                    (60 + (x / 3) % 190) as u8,
                    (200 - (y / 4) % 150) as u8,
                    (120 + ((x + y) / 5) % 120) as u8,
                ];
                if x % 7 == 0 || y % 11 == 0 {
                    out.extend_from_slice(&[25, 25, 25]);
                } else {
                    out.extend_from_slice(&base);
                }
            }
        }
        out
    }

    #[test]
    fn lossy_reencode_never_compounds_a_declined_downsample() {
        // FIX 2 (Phase 7 post-review): 400 px drawn into 140 pt ⇒ ~206 DPI,
        // over-resolution, target ≈ 253 px. On this content the lossless Flate
        // downsample GROWS the stream (periodicity destroyed by resampling) and
        // is declined by the never-larger guard; a JPEG at the same target
        // geometry would be far smaller. Consent to re-encode must not
        // resurrect the resample the lossless path rejected: the image keeps
        // its ORIGINAL bytes.
        let raw = periodic_banner_pixels(400);
        let pdf = build_pdf_flate_raw(&raw, 400, 140, 3);

        // Pin the premise: at the target geometry the Flate candidate is not
        // smaller than the original, while the JPEG candidate is.
        let doc = Document::load_mem(&pdf).unwrap();
        let stream = doc
            .objects
            .values()
            .find_map(|o| match o {
                Object::Stream(s)
                    if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") =>
                {
                    Some(s)
                }
                _ => None,
            })
            .unwrap();
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let (target_w, target_h) = (253u32, 253u32);
        let (flate_out, _) = plan_flate(&doc, stream, 400, 400, target_w, target_h).unwrap();
        assert!(
            flate_out.len() >= stream.content.len(),
            "premise: the lossless downsample must grow ({} -> {})",
            stream.content.len(),
            flate_out.len()
        );
        let jpeg_out =
            plan_flate_to_jpeg(&doc, stream, opts, 400, 400, target_w, target_h).unwrap();
        assert!(
            jpeg_out.len() < stream.content.len(),
            "premise: the JPEG-at-target candidate must shrink ({} -> {})",
            stream.content.len(),
            jpeg_out.len()
        );

        let out = optimize_with_options(&pdf, opts);
        assert_eq!(
            out, pdf,
            "a resample the lossless path declined must not return via the lossy path"
        );
        let (filter, _) = image_filter_info(&out);
        assert_eq!(filter, b"FlateDecode", "encoding class must be unchanged");
        assert_eq!(image_dims(&out), (400, 400), "geometry must be unchanged");
    }

    #[test]
    fn pack_object_streams_produces_loadable_output() {
        // With packing on, the output must still be a valid, loadable PDF whose
        // image survives. (Strict qpdf-cleanliness is validated separately via
        // the real-file/archive runs. As of lopdf 0.42 the packed xref is
        // complete, so qpdf --check reports no warnings.)
        let pdf = build_pdf(400, 100);
        let opts = OptimizeOptions::default().with_pack_object_streams(true);
        let out = optimize_with_options(&pdf, opts);

        let doc = Document::load_mem(&out).expect("packed output must load");
        let has_image = doc.objects.values().any(|o| {
            matches!(o, Object::Stream(s)
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image"))
        });
        assert!(has_image, "image must survive packing");
    }

    /// The bytes of the cross-reference object a saved file's `startxref`
    /// points at, up to (and excluding) the payload. Panics if the file does
    /// not end in the shape lopdf's writer produces.
    fn xref_object_header(pdf: &[u8]) -> Vec<u8> {
        let sx = pdf.windows(9).rposition(|w| w == b"startxref").unwrap();
        let digits: Vec<u8> = pdf[sx + 9..]
            .iter()
            .copied()
            .skip_while(u8::is_ascii_whitespace)
            .take_while(u8::is_ascii_digit)
            .collect();
        let start: usize = String::from_utf8(digits).unwrap().parse().unwrap();
        let end = find_sub(pdf, b">>stream\n", start).unwrap();
        pdf[start..end].to_vec()
    }

    /// Task 1: lopdf writes the cross-reference stream with no `/Filter` (see
    /// `compress_xref_stream`). Both save paths must ship it deflated, and the
    /// patched file must still load.
    #[test]
    fn xref_stream_is_flate_compressed_in_both_save_paths() {
        // Enough objects that the xref payload is worth deflating at all.
        let pdf = build_pdf_duplicate_images(6, 400);
        for pack in [true, false] {
            let opts = OptimizeOptions::default().with_pack_object_streams(pack);
            let out = optimize_with_options(&pdf, opts);
            let header = xref_object_header(&out);
            let shown = String::from_utf8_lossy(&header).to_string();
            assert!(
                find_sub(&header, b"/Type/XRef", 0).is_some(),
                "pack={pack}: expected an xref stream, got {shown}"
            );
            assert!(
                find_sub(&header, b"/Filter/FlateDecode", 0).is_some(),
                "pack={pack}: xref stream must be deflated, got {shown}"
            );
            let doc = Document::load_mem(&out)
                .unwrap_or_else(|e| panic!("pack={pack}: patched output must load: {e}"));
            assert!(
                !doc.get_pages().is_empty(),
                "pack={pack}: pages must survive"
            );
        }
    }

    /// A producer's trailer can carry cross-reference-stream keys that describe
    /// the *input's* table (`corpus/adobe-spec.pdf` ends in a classic `trailer`
    /// holding `/DecodeParms<</Columns 5/Predictor 12>>`). lopdf copies the
    /// trailer into the xref stream it synthesizes, so those keys would sit on
    /// top of amatl's freshly deflated, unpredicted payload and make every
    /// strict reader repair the file. None may survive.
    #[test]
    fn stale_xref_keys_in_the_input_trailer_do_not_reach_the_output() {
        // Every key the strip covers must go, whatever the input put there.
        let mut doc = Document::load_mem(&build_pdf_duplicate_images(6, 400)).unwrap();
        for key in ["DecodeParms", "Filter", "Prev", "XRefStm", "Length"] {
            doc.trailer.set(key, 16i64);
        }
        strip_stale_xref_trailer_keys(&mut doc);
        for key in [b"DecodeParms".as_slice(), b"Filter", b"Prev", b"XRefStm"] {
            assert!(
                doc.trailer.get(key).is_err(),
                "{} must not survive in the trailer",
                String::from_utf8_lossy(key)
            );
        }

        // End to end, with the shape adobe-spec.pdf actually ships: a stale
        // predictor declaration. It is inert in the staged input (no /Filter
        // there), and must stay out of the output, where a /Filter IS added.
        let mut doc = Document::load_mem(&build_pdf_duplicate_images(6, 400)).unwrap();
        doc.trailer.set(
            "DecodeParms",
            dictionary! { "Columns" => 5, "Predictor" => 12 },
        );
        let mut staged: Vec<u8> = Vec::new();
        doc.save_to(&mut staged).unwrap();
        assert!(
            find_sub(&staged, b"/Predictor", 0).is_some(),
            "premise: the staged input must actually carry the stale key"
        );

        for pack in [true, false] {
            let opts = OptimizeOptions::default().with_pack_object_streams(pack);
            let out = optimize_with_options(&staged, opts);
            let header = xref_object_header(&out);
            let shown = String::from_utf8_lossy(&header).to_string();
            for key in [b"/DecodeParms".as_slice(), b"/Prev", b"/XRefStm"] {
                assert!(
                    find_sub(&header, key, 0).is_none(),
                    "pack={pack}: stale {} leaked into the xref stream: {shown}",
                    String::from_utf8_lossy(key)
                );
            }
            // The dictionary must describe the payload it actually ships: one
            // /Filter (ours) and a table that reads back.
            assert!(
                find_sub(&header, b"/Filter/FlateDecode", 0).is_some(),
                "pack={pack}: xref stream must be deflated, got {shown}"
            );
            let reloaded = Document::load_mem(&out)
                .unwrap_or_else(|e| panic!("pack={pack}: output must load: {e}"));
            assert!(
                !reloaded.get_pages().is_empty(),
                "pack={pack}: pages must survive"
            );
        }
    }

    /// The patch must decline anything that is not exactly the object shape it
    /// expects — including a file it has already compressed (no `/Filter`
    /// twice) and truncated garbage.
    #[test]
    fn xref_compression_declines_unrecognized_tails() {
        let pdf = build_pdf_duplicate_images(6, 400);
        let out = optimize_with_options(&pdf, OptimizeOptions::default());
        assert_eq!(
            compress_xref_stream(out.clone(), DeflateBackend::Zlib),
            out,
            "an already-deflated xref stream must be left alone"
        );
        for junk in [
            b"".to_vec(),
            b"%PDF-1.5\nstartxref\n999999\n%%EOF".to_vec(),
            b"%PDF-1.5\nstartxref\nnotanumber\n%%EOF".to_vec(),
            out[..out.len() / 2].to_vec(),
        ] {
            assert_eq!(
                compress_xref_stream(junk.clone(), DeflateBackend::Zlib),
                junk,
                "malformed input must pass through untouched"
            );
        }
    }

    /// Build a one-page PDF whose image stream is FlateDecode at level 1 —
    /// i.e. what a careless producer ships, which is exactly what the final
    /// re-deflate pass exists to improve on.
    fn build_pdf_weakly_deflated(px: u32, draw_pts: i64) -> Vec<u8> {
        use std::io::Write;
        let raw = flate_pixels(px, px, 3);
        let mut enc = flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::new(1));
        enc.write_all(&raw).unwrap();
        let payload = enc.finish().unwrap();

        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            payload,
        ));
        wrap_image_pdf(&mut doc, img_id, draw_pts)
    }

    /// Task 2: the pass must shrink a weakly-deflated stream while decoding to
    /// byte-identical pixels. Exercised directly on the document, because the
    /// pass deliberately runs at serialization time — see
    /// `serialization_wins_do_not_rewrite_an_otherwise_unchanged_file` for the
    /// end-to-end consequence of that placement.
    #[test]
    fn redeflate_shrinks_weakly_compressed_streams_losslessly() {
        // Drawn at its own size, so nothing else in the pipeline would touch
        // this stream even if it ran.
        let pdf = build_pdf_weakly_deflated(120, 120);
        let before_pixels = flate_image_pixels(&pdf);
        let before_len = image_stream_len(&pdf);

        let mut doc = Document::load_mem(&pdf).unwrap();
        redeflate_flate_streams(&mut doc, DeflateBackend::Zlib);
        let mut out: Vec<u8> = Vec::new();
        doc.save_to(&mut out).unwrap();

        assert!(
            image_stream_len(&out) < before_len,
            "level-9 must beat level-1: {before_len} -> {}",
            image_stream_len(&out)
        );
        assert_eq!(
            flate_image_pixels(&out),
            before_pixels,
            "decoded samples must be byte-identical"
        );
    }

    /// Pins the placement decision: the re-deflate pass and ObjStm packing are
    /// serialization-time work, so a document where NOTHING semantic was
    /// planned still comes back byte-identical. That is the crate's existing
    /// "declined everything ⇒ your exact bytes" contract (see the early return
    /// in `try_optimize`), and it bounds when the re-deflate win is realized.
    #[test]
    fn serialization_wins_do_not_rewrite_an_otherwise_unchanged_file() {
        let pdf = build_pdf_weakly_deflated(120, 120);
        assert_eq!(
            optimize_with_options(&pdf, OptimizeOptions::default()),
            pdf,
            "no planned work ⇒ input returned unchanged"
        );
    }

    /// The payload byte length of the (single) image stream.
    fn image_stream_len(pdf: &[u8]) -> usize {
        let doc = Document::load_mem(pdf).unwrap();
        doc.objects
            .values()
            .find_map(|o| match o {
                Object::Stream(s)
                    if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") =>
                {
                    Some(s.content.len())
                }
                _ => None,
            })
            .expect("no image stream")
    }

    /// Task 2 gates: never-larger per stream, and idempotent across passes —
    /// checked on every stream of a document that exercises several classes.
    #[test]
    fn redeflate_is_never_larger_and_idempotent() {
        for pdf in [
            build_pdf_flate(400, 100, Some(2)),
            build_pdf_flate(400, 100, None),
            build_pdf_duplicate_images(4, 400),
        ] {
            let once = optimize_with_options(&pdf, OptimizeOptions::default());
            let twice = optimize_with_options(&once, OptimizeOptions::default());
            assert_eq!(once, twice, "a second pass must be byte-identical");

            // Never-larger, per stream: every Flate stream in the output is at
            // most the size of its decoded content's level-9 re-deflate.
            let doc = Document::load_mem(&once).unwrap();
            for obj in doc.objects.values() {
                let Object::Stream(s) = obj else { continue };
                if !matches!(s.dict.get(b"Filter"), Ok(Object::Name(n)) if n == b"FlateDecode") {
                    continue;
                }
                assert!(
                    replan_deflate(&s.content, DeflateBackend::Zlib).is_none(),
                    "a shipped stream still had slack: {} bytes",
                    s.content.len()
                );
            }
        }
    }

    /// Build a one-page PDF with a channel-identical RGB Flate image (every
    /// pixel R==G==B), drawn at its own size so downsampling never fires.
    fn build_pdf_gray_in_rgb(px: u32) -> Vec<u8> {
        let gray = flate_pixels(px, px, 1);
        let rgb: Vec<u8> = gray.iter().flat_map(|&g| [g, g, g]).collect();
        let payload = deflate_level9(&rgb).unwrap();
        let mut doc = Document::with_version("1.5");
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            payload,
        ));
        wrap_image_pdf(&mut doc, img_id, px as i64)
    }

    /// The collapse must rewrite /ColorSpace to DeviceGray, keep the decoded
    /// samples byte-identical to the shared channel, and be idempotent.
    #[test]
    fn gray_collapse_rewrites_channel_identical_rgb() {
        let px = 64;
        let pdf = build_pdf_gray_in_rgb(px);
        let opts = OptimizeOptions::default().with_collapse_gray_images(true);
        let out = optimize_with_options(&pdf, opts);
        assert!(out.len() < pdf.len(), "the gray stream must be smaller");

        let doc = Document::load_mem(&out).unwrap();
        let stream = doc
            .objects
            .values()
            .find_map(|o| match o {
                Object::Stream(s)
                    if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") =>
                {
                    Some(s)
                }
                _ => None,
            })
            .expect("no image stream");
        assert!(
            matches!(stream.dict.get(b"ColorSpace"), Ok(Object::Name(n)) if n == b"DeviceGray"),
            "/ColorSpace must be DeviceGray after the collapse"
        );
        let (img, channels) = decode_flate_image(&doc, stream, px, px).unwrap();
        assert_eq!(channels, 1);
        assert_eq!(
            img.into_luma8().into_raw(),
            flate_pixels(px, px, 1),
            "decoded samples must equal the shared channel exactly"
        );

        assert_eq!(
            optimize_with_options(&out, opts),
            out,
            "a second pass must be byte-identical"
        );
    }

    /// Off by default (the /ColorSpace rewrite is consent-gated), and a true
    /// color image must never be touched even with the flag on.
    #[test]
    fn gray_collapse_is_opt_in_and_declines_true_color() {
        let pdf = build_pdf_gray_in_rgb(64);
        assert_eq!(
            optimize_with_options(&pdf, OptimizeOptions::default()),
            pdf,
            "collapse must be opt-in"
        );

        let color = build_pdf_flate(64, 64, None);
        assert_eq!(
            optimize_with_options(
                &color,
                OptimizeOptions::default().with_collapse_gray_images(true)
            ),
            color,
            "distinct channels must pass through untouched"
        );
    }

    /// The ObjStm zopfli patch: on a packed save it must produce output that
    /// is never larger, re-parses, and decodes to the same objects; on
    /// anything that is not exactly a packed lopdf tail it must decline.
    #[test]
    fn objstm_zopfli_patch_is_never_larger_and_reparses() {
        let pdf = build_pdf_duplicate_images(6, 400);
        let zlib_out = optimize_with_options(
            &pdf,
            OptimizeOptions::default().with_pack_object_streams(true),
        );
        let zop_out = optimize_with_options(
            &pdf,
            OptimizeOptions::default()
                .with_pack_object_streams(true)
                .with_deflate_backend(DeflateBackend::Zopfli),
        );
        assert!(
            zop_out.len() <= zlib_out.len(),
            "zopfli save must never lose to zlib: {} vs {}",
            zlib_out.len(),
            zop_out.len()
        );
        let doc = Document::load_mem(&zop_out).unwrap();
        assert_eq!(doc.get_pages().len(), 1, "the page must survive the patch");

        // Fail-safe: junk and non-packed tails pass through untouched.
        for junk in [
            b"".to_vec(),
            b"%PDF-1.5\nno objstm here\nstartxref\n9\n%%EOF".to_vec(),
            zlib_out[..zlib_out.len() / 2].to_vec(),
        ] {
            assert_eq!(
                rezopfli_objstm(junk.clone()),
                junk,
                "malformed input must pass through untouched"
            );
        }
    }

    /// The zopfli backend must honor the same contract as zlib: never larger
    /// than what zlib ships, decoded samples byte-identical, and a second
    /// zopfli pass byte-stable (zopfli is deterministic, so re-deflating its
    /// own output fails the strictly-smaller test and changes nothing).
    #[test]
    fn zopfli_backend_is_smaller_lossless_and_idempotent() {
        let pdf = build_pdf_weakly_deflated(120, 120);
        let before_pixels = flate_image_pixels(&pdf);

        let mut doc = Document::load_mem(&pdf).unwrap();
        redeflate_flate_streams(&mut doc, DeflateBackend::Zlib);
        let mut zlib_out: Vec<u8> = Vec::new();
        doc.save_to(&mut zlib_out).unwrap();

        let mut doc = Document::load_mem(&pdf).unwrap();
        redeflate_flate_streams(&mut doc, DeflateBackend::Zopfli);
        let mut zopfli_out: Vec<u8> = Vec::new();
        doc.save_to(&mut zopfli_out).unwrap();

        assert!(
            image_stream_len(&zopfli_out) <= image_stream_len(&zlib_out),
            "zopfli must never lose to zlib under the strictly-smaller guard: \
             zlib {} vs zopfli {}",
            image_stream_len(&zlib_out),
            image_stream_len(&zopfli_out)
        );
        assert_eq!(
            flate_image_pixels(&zopfli_out),
            before_pixels,
            "decoded samples must be byte-identical"
        );

        // Idempotence of the PASS itself: on reload, a second zopfli run must
        // leave every stream untouched (deterministic zopfli re-produces the
        // same bytes, which fails the strictly-smaller test). Baseline and
        // second pass both go through the same load+save round trip so lopdf's
        // re-serialization cannot masquerade as a pass effect.
        let mut doc = Document::load_mem(&zopfli_out).unwrap();
        let mut reloaded: Vec<u8> = Vec::new();
        doc.save_to(&mut reloaded).unwrap();
        let mut doc = Document::load_mem(&zopfli_out).unwrap();
        redeflate_flate_streams(&mut doc, DeflateBackend::Zopfli);
        let mut twice: Vec<u8> = Vec::new();
        doc.save_to(&mut twice).unwrap();
        assert_eq!(reloaded, twice, "a second zopfli pass must change nothing");
    }

    /// A PDF/A conformance claim disables the pass wholesale (same posture as
    /// font subsetting), so a weakly-deflated stream ships untouched.
    #[test]
    fn redeflate_declines_pdfa_and_signed_documents() {
        for marker in ["pdfa", "signed"] {
            let pdf = build_pdf_weakly_deflated(120, 120);
            let mut doc = Document::load_mem(&pdf).unwrap();
            let before = image_stream_len(&pdf);
            match marker {
                "pdfa" => {
                    let meta = doc.add_object(Stream::new(
                        dictionary! { "Type" => "Metadata", "Subtype" => "XML" },
                        b"<x:xmpmeta><pdfaid:part>2</pdfaid:part></x:xmpmeta>".to_vec(),
                    ));
                    doc.catalog_mut().unwrap().set("Metadata", meta);
                }
                _ => {
                    let sig = doc.add_object(dictionary! {
                        "Type" => "Sig",
                        "ByteRange" => vec![0.into(), 0.into(), 0.into(), 0.into()],
                    });
                    doc.catalog_mut().unwrap().set("Perms", sig);
                }
            }
            let mut marked: Vec<u8> = Vec::new();
            doc.save_to(&mut marked).unwrap();

            redeflate_flate_streams(
                &mut Document::load_mem(&marked).unwrap(),
                DeflateBackend::Zlib,
            );
            let mut reloaded = Document::load_mem(&marked).unwrap();
            redeflate_flate_streams(&mut reloaded, DeflateBackend::Zlib);
            let after = reloaded
                .objects
                .values()
                .find_map(|o| match o {
                    Object::Stream(s)
                        if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") =>
                    {
                        Some(s.content.len())
                    }
                    _ => None,
                })
                .unwrap();
            assert_eq!(after, before, "{marker}: stream must be untouched");
        }
    }

    /// Task 3: the flipped default really produces ObjStm-packed output, and
    /// the escape hatch really produces the old flat layout.
    #[test]
    fn default_packs_object_streams_and_opt_out_does_not() {
        let pdf = build_pdf_duplicate_images(6, 400);
        let packed = optimize_with_options(&pdf, OptimizeOptions::default());
        let flat = optimize_with_options(
            &pdf,
            OptimizeOptions::default().with_pack_object_streams(false),
        );

        assert!(
            find_sub(&packed, b"/Type/ObjStm", 0).is_some(),
            "default output must be ObjStm-packed"
        );
        assert!(
            find_sub(&flat, b"/Type/ObjStm", 0).is_none(),
            "--no-pack-object-streams must produce the flat layout"
        );
        assert!(
            packed.len() < flat.len(),
            "packing must win on an object-heavy document: {} vs {}",
            packed.len(),
            flat.len()
        );
        assert!(Document::load_mem(&packed).is_ok());
        assert!(Document::load_mem(&flat).is_ok());
    }

    #[test]
    fn downsamples_over_resolution_image() {
        // 400px drawn into 100pt box => ~288 DPI, well above the 130 target.
        let pdf = build_pdf(400, 100);
        let out = optimize(&pdf);

        assert!(out.len() < pdf.len(), "expected smaller output");
        let (w, h) = image_dims(&out);
        // Target ≈ 100/72 * 130 ≈ 180px.
        assert!(w < 400 && w > 120, "unexpected downsampled width: {w}");
        assert_eq!(w, h, "aspect ratio should be preserved");
        // Output must still be a loadable PDF.
        assert!(Document::load_mem(&out).is_ok());
    }

    /// Pull the (single) image stream's JPEG bytes out of a PDF.
    fn image_stream_bytes(pdf: &[u8]) -> Vec<u8> {
        let doc = Document::load_mem(pdf).unwrap();
        for obj in doc.objects.values() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    return s.content.clone();
                }
            }
        }
        panic!("no image stream");
    }

    #[test]
    fn non_uniform_placement_is_downsampled() {
        // 1000x1000 px drawn into a 500x100 pt box:
        //   horizontal effective DPI = 1000 / (500/72) = 144  (under 130*1.15)
        //   vertical   effective DPI = 1000 / (100/72) = 720  (~6x over target)
        // Testing width alone skipped this image entirely. Both axes must be
        // considered, so the vertically over-resolved image gets downsampled.
        let pdf = build_pdf_placed(1000, 500, 100);
        let out = optimize(&pdf);

        let (w, h) = image_dims(&out);
        assert!(
            (w, h) != (1000, 1000),
            "vertically over-resolved image must not be skipped"
        );
        // Target is sized per axis: 500pt -> ~903px wide, 100pt -> ~181px tall.
        assert!((850..=950).contains(&w), "unexpected width: {w}");
        assert!((150..=210).contains(&h), "unexpected height: {h}");
        assert!(out.len() < pdf.len(), "output must be smaller");
        assert!(Document::load_mem(&out).is_ok(), "output must still load");
    }

    #[test]
    fn uniformly_low_resolution_image_still_skipped() {
        // Guard the other direction: considering both axes must not cause
        // already-adequate images to be RESIZED. (The q92 payload itself may
        // shrink via the P-M2 dimension-preserving requantization — geometry
        // is what this test pins.)
        let pdf = build_pdf_placed(120, 100, 100);
        let out = optimize(&pdf);
        assert_eq!(image_dims(&out), (120, 120), "must never be resized");
    }

    #[test]
    fn under_threshold_unmasked_jpeg_is_requantized() {
        // Phase 6 P-M2: 400px drawn into a 240pt box ≈ 120 DPI — under the
        // 130 x 1.15 over-resolution threshold, so the resize pipeline never
        // fires. The scanner-quality q92 payload must instead be requantized
        // at jpeg_quality (78) in place: strictly smaller, exact same
        // geometry.
        let pdf = build_pdf(400, 240);
        let before = image_stream_bytes(&pdf);
        let out = optimize(&pdf);

        assert!(out.len() < pdf.len(), "requantized output must be smaller");
        assert_eq!(image_dims(&out), (400, 400), "dimensions must be identical");
        let after = image_stream_bytes(&out);
        assert!(
            after.len() < before.len(),
            "the payload must be strictly smaller"
        );
        assert!(Document::load_mem(&out).is_ok());
    }

    #[test]
    fn under_threshold_requant_is_idempotent() {
        // P-M2 idempotence: the second pass re-attempts the requant and the
        // 5% minimum-savings guard declines the generation-loss churn.
        let pdf = build_pdf(400, 240);
        let once = optimize(&pdf);
        assert!(once.len() < pdf.len(), "first pass must shrink");
        let twice = optimize(&once);
        assert_eq!(twice, once, "second pass must be byte-stable");
    }

    #[test]
    fn under_threshold_requant_growth_is_discarded() {
        // The unmasked analogue of the D-M1 never-larger guard: the first
        // pass downsamples to ~130 DPI q78; a second pass at quality 100 hits
        // the P-M2 requant path, must grow the stream, and the guard discards
        // it — the exact baseline bytes come back.
        let pdf = build_pdf(400, 100);
        let baseline = optimize(&pdf);
        assert!(baseline.len() < pdf.len(), "baseline must be smaller");
        let opts = OptimizeOptions::default().with_jpeg_quality(100);
        let out = optimize_with_options(&baseline, opts);
        assert_eq!(out, baseline, "growing requantization must be discarded");
    }

    #[test]
    fn corrupt_under_threshold_jpeg_returns_exact_original_bytes() {
        // Structurally valid PDF, garbage JPEG bytes, UNDER the threshold: the
        // P-M2 requant attempts a decode, fails, and the fail-safe returns
        // the exact input bytes.
        let mut doc = Document::load_mem(&build_pdf(400, 240)).unwrap();
        for obj in doc.objects.values_mut() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    s.set_content(b"\xff\xd8\xff not a real jpeg payload".to_vec());
                }
            }
        }
        let mut input: Vec<u8> = Vec::new();
        doc.save_to(&mut input).unwrap();

        let out = optimize(&input);
        assert_eq!(out, input, "corrupt under-threshold JPEG must be untouched");
    }

    #[test]
    fn scaled_decode_matches_full_decode_pixels() {
        // The scaled-decode fast path must be visually equivalent to the old
        // full-decode-then-resize path, not merely the right dimensions.
        let pdf = build_pdf(800, 100);
        let out = optimize(&pdf);
        let produced = image::load_from_memory(&image_stream_bytes(&out))
            .unwrap()
            .to_rgb8();

        let src = image::load_from_memory(&image_stream_bytes(&pdf)).unwrap();
        let reference = src
            .resize_exact(
                produced.width(),
                produced.height(),
                image::imageops::FilterType::Lanczos3,
            )
            .to_rgb8();

        assert_eq!(produced.dimensions(), reference.dimensions());
        let sad: f64 = produced
            .as_raw()
            .iter()
            .zip(reference.as_raw().iter())
            .map(|(a, b)| (*a as f64 - *b as f64).abs())
            .sum();
        let mad = sad / produced.as_raw().len() as f64;
        assert!(
            mad < 12.0,
            "scaled decode diverges from full decode: MAD={mad}"
        );
    }

    #[test]
    fn scaled_decode_never_undershoots_target() {
        // Decoding must always cover the target so the final Lanczos3 step
        // downsamples; undershooting would silently upscale and blur.
        let mut img = image::RgbImage::new(4000, 4000);
        for (x, y, p) in img.enumerate_pixels_mut() {
            *p = image::Rgb([(x % 256) as u8, (y % 256) as u8, 0]);
        }
        let mut jpeg: Vec<u8> = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, 85)
            .encode_image(&DynamicImage::ImageRgb8(img))
            .unwrap();
        for target in [180u32, 500, 1000, 2500, 3999] {
            let (d, _) = decode_jpeg_scaled(&jpeg, target, target).unwrap();
            assert!(
                d.width() >= target && d.height() >= target,
                "target {target}: decoded {}x{} undershoots",
                d.width(),
                d.height()
            );
        }
    }

    #[test]
    fn grayscale_jpeg_round_trips_as_grayscale() {
        // A true JCS_GRAYSCALE JPEG must decode back as 1-channel, so the
        // re-encode matches a DeviceGray /ColorSpace. Encoding 3-channel data
        // into a DeviceGray stream would corrupt the image.
        //
        // NOTE: build the fixture with amatl's own encoder. image's JpegEncoder
        // writes a Luma8 buffer as a 3-component YCbCr JPEG, which is NOT a
        // grayscale JPEG and would not exercise this path.
        let mut gray = image::GrayImage::new(600, 600);
        for (x, y, p) in gray.enumerate_pixels_mut() {
            *p = image::Luma([((x + y) % 256) as u8]);
        }
        let jpeg = encode_jpeg(DynamicImage::ImageLuma8(gray), true, 90).unwrap();

        let (decoded, is_gray) = decode_jpeg_scaled(&jpeg, 100, 100).expect("should decode");
        assert!(is_gray, "true grayscale JPEG must report is_gray");
        assert!(
            matches!(decoded, DynamicImage::ImageLuma8(_)),
            "must decode as single-channel Luma8"
        );
        assert!(decoded.width() >= 100 && decoded.height() >= 100);
    }

    #[test]
    fn duplicate_image_streams_are_merged() {
        // Eight byte-identical images must collapse to ONE stream: decoded and
        // re-encoded once instead of eight times, and stored once. Before
        // dedup_streams this produced 8 separate (identical) image streams.
        let pdf = build_pdf_duplicate_images(8, 400);
        assert_eq!(count_image_streams(&pdf), 8, "fixture should start with 8");

        let out = optimize(&pdf);
        assert_eq!(
            count_image_streams(&out),
            1,
            "identical images must be merged into a single stream"
        );
        assert!(out.len() < pdf.len(), "output must be smaller");
        assert!(Document::load_mem(&out).is_ok(), "output must still load");
    }

    #[test]
    fn distinct_image_streams_are_not_merged() {
        // Guard against over-merging: differing bytes must never collapse.
        let mut doc = Document::load_mem(&build_pdf_duplicate_images(2, 400)).unwrap();
        let ids: Vec<ObjectId> = doc
            .objects
            .iter()
            .filter(|(_, o)| {
                matches!(o, Object::Stream(s)
                    if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image"))
            })
            .map(|(id, _)| *id)
            .collect();
        assert_eq!(ids.len(), 2);
        if let Ok(Object::Stream(s)) = doc.get_object_mut(ids[1]) {
            s.content.push(0x00);
        }
        assert!(!dedup_streams(&mut doc), "differing bytes must not merge");
    }

    /// The decoded-payload dedup must key on the dictionary too. Identical
    /// index/sample bytes under a different `/Width`-`/Height` (or a different
    /// `/Indexed` palette) are a DIFFERENT image; merging them silently
    /// transposed and recolored figures in the Adobe PDF spec (page 752's
    /// overprint illustration among them).
    #[test]
    fn decoded_dedup_respects_the_dictionary() {
        // A 6x4 gray raster: the same 24 sample bytes also describe a 4x6 one.
        let plain: Vec<u8> = (0..24u8).collect();
        // Independently deflated bytes for the two copies — the case this pass
        // exists for: same payload, same dict, different /Length and content.
        let deflate_at = |level: u32| {
            use std::io::Write;
            let mut enc =
                flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::new(level));
            enc.write_all(&plain).unwrap();
            enc.finish().unwrap()
        };
        let mut doc = Document::with_version("1.5");
        let ids: Vec<ObjectId> = [9, 1]
            .into_iter()
            .map(|level| {
                let content = deflate_at(level);
                doc.add_object(Stream::new(
                    dictionary! {
                        "Type" => "XObject", "Subtype" => "Image",
                        "Width" => 6i64, "Height" => 4i64,
                        "ColorSpace" => "DeviceGray", "BitsPerComponent" => 8,
                        "Filter" => "FlateDecode",
                    },
                    content,
                ))
            })
            .collect();
        assert_ne!(
            match doc.get_object(ids[0]) {
                Ok(Object::Stream(s)) => s.content.clone(),
                _ => unreachable!(),
            },
            match doc.get_object(ids[1]) {
                Ok(Object::Stream(s)) => s.content.clone(),
                _ => unreachable!(),
            },
            "the fixture must differ in its STORED bytes, else dedup_streams would do"
        );
        let mut same = doc.clone();
        assert!(
            dedup_decoded_streams(&mut same),
            "same payload + same dict must merge even when the stored bytes differ"
        );

        // Now transpose the second image's dimensions. The decoded bytes are
        // untouched, so a payload-only key would still merge — it must not.
        if let Ok(Object::Stream(s)) = doc.get_object_mut(ids[1]) {
            let w = s.dict.get(b"Width").unwrap().as_i64().unwrap();
            let h = s.dict.get(b"Height").unwrap().as_i64().unwrap();
            s.dict.set("Width", h + 1);
            s.dict.set("Height", w);
        }
        assert!(
            !dedup_decoded_streams(&mut doc),
            "identical payload under a different dictionary must NOT merge"
        );
    }

    #[test]
    fn default_options_match_documented_sweet_spot() {
        // Pins the manual Default impl: adding numeric fields must NOT regress
        // the measured 130 DPI / Q78 / 1.15 sweet spot downstream consumers
        // depend on. A derived Default would zero these and collapse to ~1px.
        let d = OptimizeOptions::default();
        assert_eq!(d.target_dpi, 130.0);
        assert_eq!(d.jpeg_quality, 78);
        assert_eq!(d.dpi_margin, 1.15);
        assert!(!d.strip_accessibility);
        assert!(
            d.pack_object_streams,
            "ObjStm packing is default-ON (measured −162,069 B / 3.27% on NASA)"
        );
        assert!(
            d.downsample_flate_images,
            "Flate downsampling is default-ON (0.2.0)"
        );
        assert!(
            d.subset_fonts,
            "font subsetting is default-ON (rendering-preserving, verified; \
             measured −124,486 B on NASA vs --no-subset-fonts)"
        );
        assert!(
            !d.recompress_bitonal_images,
            "bitonal G4 recompression is opt-in (B-M1)"
        );
        assert!(
            !d.allow_lossy_reencode,
            "lossy Flate→JPEG re-encode is consent-gated (Phase 7 spike)"
        );
        assert_eq!(
            d.deflate_backend,
            DeflateBackend::Zlib,
            "zopfli is opt-in: ~30× the CPU belongs behind a flag"
        );
        assert!(
            !d.collapse_gray_images,
            "RGB→Gray collapse rewrites /ColorSpace, so it is opt-in \
             (same posture as bitonal G4)"
        );
    }

    #[test]
    fn builder_methods_set_each_field() {
        let o = OptimizeOptions::default()
            .with_target_dpi(96.0)
            .with_jpeg_quality(60)
            .with_dpi_margin(1.5)
            .with_strip_accessibility(true)
            .with_pack_object_streams(false)
            .with_downsample_flate_images(false)
            .with_subset_fonts(true)
            .with_recompress_bitonal_images(true)
            .with_allow_lossy_reencode(true);
        assert_eq!(o.target_dpi, 96.0);
        assert_eq!(o.jpeg_quality, 60);
        assert_eq!(o.dpi_margin, 1.5);
        assert!(o.strip_accessibility);
        assert!(!o.pack_object_streams);
        assert!(!o.downsample_flate_images);
        assert!(o.subset_fonts);
        assert!(o.recompress_bitonal_images);
        assert!(o.allow_lossy_reencode);
    }

    #[test]
    fn custom_target_dpi_downsamples_more_aggressively() {
        // Same input, lower target DPI => smaller downsampled pixel dimensions.
        // 400px drawn into a 100pt box is ~288 DPI, above both targets.
        let pdf = build_pdf(400, 100);

        let at_130 = optimize_with_options(&pdf, OptimizeOptions::default());
        let opts_72 = OptimizeOptions::default().with_target_dpi(72.0);
        let at_72 = optimize_with_options(&pdf, opts_72);

        let (w130, _) = image_dims(&at_130);
        let (w72, _) = image_dims(&at_72);
        assert!(
            w72 < w130,
            "lower target DPI must yield fewer pixels: {w72} !< {w130}"
        );
        // 100pt / 72 * 72 DPI = 100px target.
        assert!((90..=110).contains(&w72), "unexpected 72-DPI width: {w72}");
    }

    #[test]
    fn zero_target_dpi_leaves_images_untouched() {
        // Defensive-clamp regression: target_dpi <= 0 must mean "no
        // downsampling", NOT "downsample to ~1px".
        let pdf = build_pdf(400, 100);
        let opts = OptimizeOptions::default().with_target_dpi(0.0);
        let out = optimize_with_options(&pdf, opts);

        // No image work and no strip => fail-safe path returns the original bytes.
        let (w, h) = image_dims(&out);
        assert_eq!(
            (w, h),
            (400, 400),
            "zero target DPI must not resize the image"
        );
    }

    #[test]
    fn leaves_low_resolution_image_untouched() {
        // 120px drawn into 100pt box => ~86 DPI, below target: never resized.
        // (P-M2 may still requantize the q92 payload in place — the geometry
        // is the contract here.)
        let pdf = build_pdf(120, 100);
        let out = optimize(&pdf);

        let (w, h) = image_dims(&out);
        assert_eq!((w, h), (120, 120), "low-res image must not be resized");
    }

    #[test]
    fn invalid_pdf_falls_back_to_original() {
        let garbage = b"this is not a pdf at all";
        let out = optimize(garbage);
        assert_eq!(out, garbage, "must return original bytes on failure");
    }

    /// Fail-safe contract regression: a crafted PDF that parses but contains
    /// a malformed JPEG stream must not abort the process. Before the
    /// `catch_unwind` wrapper in `optimize_with_options`, this could panic in
    /// the image decoder; the wrapper turns any panic into the same graceful
    /// fallback as a parse error. This pins that regression so the panic
    /// boundary can't silently disappear.
    #[test]
    fn crafted_pdf_panic_is_caught_not_unwound() {
        let pdf = build_pdf(400, 100);
        // Reload, swap the image stream for bytes that will decode-fail in a
        // way that historically panicked past the `?` operators in
        // plan_replacement. The fail-safe contract is byte-equality with input.
        let mut doc = Document::load_mem(&pdf).unwrap();
        for obj in doc.objects.values_mut() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image") {
                    // Valid DCTDecode header bytes but truncated body: the JPEG
                    // decoder will error, not panic. The point is that even if
                    // it DID panic (as mozjpeg has done on some crafted input),
                    // the wrapper would catch it and return the original bytes.
                    s.set_content(b"\xff\xd8\xff\xe0".to_vec());
                }
            }
        }
        let mut input: Vec<u8> = Vec::new();
        doc.save_to(&mut input).unwrap();

        let out = optimize(&input);
        assert_eq!(
            out, input,
            "panic-causing input must return original bytes, not abort"
        );
    }

    /// Fail-safe contract regression: empty and near-empty inputs must not
    /// panic on index/slice operations. The library must be safe to call with
    /// any `&[u8]`, including the degenerate cases a fuzzer would find first.
    #[test]
    fn degenerate_inputs_do_not_panic() {
        for input in [&b""[..], &[0u8], b"%", b"%P", b"%PDF"] {
            let out = optimize(input);
            assert_eq!(
                out, input,
                "degenerate input ({:?}) must pass through unchanged",
                input
            );
        }
    }

    #[test]
    fn minify_number_literal_is_decimal_exact() {
        for (input, want) in [
            ("+3", "3"),
            ("007", "7"),
            ("0.5000", ".5"),
            ("-0.000", "0"),
            ("-0", "0"),
            ("10.", "10"),
            ("0.0", "0"),
            ("-.12", "-.12"),
            ("1.25", "1.25"),
            ("0.30000001", ".30000001"),
        ] {
            assert_eq!(minify_number_literal(input), want, "literal {input:?}");
            // The transform's whole contract: identical f64.
            assert_eq!(
                input.parse::<f64>().unwrap(),
                minify_number_literal(input).parse::<f64>().unwrap(),
                "f64 drift on {input:?}"
            );
        }
    }

    #[test]
    fn replan_content_minifies_sloppy_streams() {
        let sloppy = b"1.000  0.000 0.000   1.000 100.00 700.00 cm\n% a comment\nq   Q";
        let (out, deflated) = replan_content(
            sloppy,
            sloppy.len(),
            sloppy.len(),
            false,
            DeflateBackend::Zlib,
        )
        .expect("sloppy content must minify");
        let stored = if deflated {
            inflate_capped(&out, 1 << 16).unwrap()
        } else {
            out.clone()
        };
        assert!(out.len() < sloppy.len());
        // Values a viewer parses are identical at f64.
        assert_eq!(
            content_number_values(sloppy).unwrap(),
            content_number_values(&stored).unwrap()
        );
        // And the operations are semantically unchanged.
        let a = Content::decode_strict(sloppy).unwrap();
        let b = Content::decode_strict(&stored).unwrap();
        assert!(operations_equivalent(&a.operations, &b.operations));
    }

    #[test]
    fn replan_content_preserves_f64_of_long_literals() {
        // 0.30000001 is NOT the shortest print of its f32 (that would be 0.3),
        // so a naive f32 re-emit would move the f64 a viewer parses. The
        // splice must keep the original decimal digits.
        let sloppy = b"0.30000001  0.000 0.000 0.30000001   0.000 0.000 cm  q   Q";
        let (out, deflated) = replan_content(
            sloppy,
            sloppy.len(),
            sloppy.len(),
            false,
            DeflateBackend::Zlib,
        )
        .expect("must minify");
        let stored = if deflated {
            inflate_capped(&out, 1 << 16).unwrap()
        } else {
            out
        };
        let text = String::from_utf8(stored).unwrap();
        assert!(
            text.contains(".30000001"),
            "original digits must survive: {text}"
        );
    }

    #[test]
    fn replan_content_declines_inline_images_and_garbage() {
        // Inline image: lopdf drops the binary data of an unparseable BI and
        // represents a parseable one as an operand it re-serializes in a
        // DIFFERENT (dict + stream) form — either way, hands off.
        let bi = b"BI /W 1 /H 1 /BPC 8 /CS /G ID x EI\nq Q";
        assert!(replan_content(bi, bi.len(), bi.len(), false, DeflateBackend::Zlib).is_none());
        // Truncated garbage must fail strict parsing, not silently truncate.
        let garbage = b"1.000 0.000 zzz <malformed  ";
        assert!(replan_content(
            garbage,
            garbage.len(),
            garbage.len(),
            false,
            DeflateBackend::Zlib
        )
        .is_none());
    }

    #[test]
    fn replan_content_declines_already_minimal_streams() {
        let minimal = b"1 0 0 1 5 5 cm";
        assert!(replan_content(
            minimal,
            minimal.len(),
            minimal.len(),
            false,
            DeflateBackend::Zlib
        )
        .is_none());
    }

    #[test]
    fn minify_merges_multi_stream_page_contents() {
        // A /Contents ARRAY whose operator spans the element boundary: the
        // page must be minified as one unit and re-emitted as a single stream.
        let body: String = "0.100 0.200 0.300 0.400 0.500 0.600 cm\n".repeat(60);
        let c1 = Stream::new(
            dictionary! {},
            format!("{body}1.000 0.000 0.000").into_bytes(),
        );
        let c2 = Stream::new(dictionary! {}, b" 1.000 5.000 7.000 cm\nq Q".to_vec());
        let mut doc = Document::with_version("1.5");
        let c1_id = doc.add_object(c1);
        let c2_id = doc.add_object(c2);
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page", "Parent" => pages_id,
            "Contents" => vec![c1_id.into(), c2_id.into()],
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
        });
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages", "Kids" => vec![page_id.into()], "Count" => 1,
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog", "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);
        let before = doc.get_and_decode_page_content(page_id).unwrap();

        let changed = minify_content_streams(&mut doc, DeflateBackend::Zlib);
        assert!(changed, "sloppy multi-stream page must minify");
        let ids = doc.get_page_contents(page_id);
        assert_eq!(ids.len(), 1, "array must merge to a single stream");
        let after = doc.get_and_decode_page_content(page_id).unwrap();
        assert!(operations_equivalent(&before.operations, &after.operations));
    }

    #[test]
    fn default_options_preserve_accessibility() {
        // Default options must NOT strip the structure tree even when present.
        let pdf = build_pdf(400, 100); // has no StructTreeRoot, but verify options work
        let out = optimize_with_options(&pdf, OptimizeOptions::default());
        assert!(out.len() < pdf.len(), "expected shrink from downsampling");
        assert!(Document::load_mem(&out).is_ok());
    }

    #[test]
    fn strip_accessibility_runs_even_without_image_work() {
        // A doc with no over-resolution images would normally be a no-op, but
        // strip_accessibility should still produce (smaller) output. Build a
        // tiny PDF with a low-res image and an explicit StructTreeRoot entry.
        let pdf = build_pdf(80, 100); // 80px @ 100pt ≈ 58 DPI, won't downsample
                                      // Inject a fake structure tree so stripping has something to remove.
                                      // We reload, add the entries, re-save, then run the optimizer.
        let mut doc = Document::load_mem(&pdf).unwrap();
        let struct_id = doc.add_object(dictionary! {
            "Type" => "StructTreeRoot",
            "RoleMap" => dictionary!{},
        });
        if let Ok(catalog) = doc.catalog_mut() {
            catalog.set("StructTreeRoot", Object::Reference(struct_id));
            catalog.set("MarkInfo", dictionary! { "Marked" => true });
        }
        let mut reencoded: Vec<u8> = Vec::new();
        doc.save_to(&mut reencoded).unwrap();

        let opts = OptimizeOptions::default().with_strip_accessibility(true);
        let out = optimize_with_options(&reencoded, opts);
        assert!(
            out.len() < reencoded.len(),
            "strip path must produce smaller output even with no image work"
        );
        let out_doc = Document::load_mem(&out).expect("stripped output must load");
        let catalog = out_doc.catalog().expect("catalog present");
        assert!(
            catalog.get(b"StructTreeRoot").is_err(),
            "StructTreeRoot must be removed"
        );
        assert!(
            catalog.get(b"MarkInfo").is_err(),
            "MarkInfo must be removed"
        );
    }

    #[test]
    fn strip_metadata_drops_xmp_packets_and_is_opt_in() {
        // A catalog-level and a page-level XMP packet, both large enough that
        // removing them must shrink the file.
        let pdf = build_pdf(80, 100);
        let mut doc = Document::load_mem(&pdf).unwrap();
        let packet = vec![b'x'; 4096];
        let page_id = doc.get_pages().values().copied().next().unwrap();
        let meta_a = doc.add_object(Stream::new(
            dictionary! { "Type" => "Metadata", "Subtype" => "XML" },
            packet.clone(),
        ));
        let meta_b = doc.add_object(Stream::new(
            dictionary! { "Type" => "Metadata", "Subtype" => "XML" },
            packet,
        ));
        doc.catalog_mut()
            .unwrap()
            .set("Metadata", Object::Reference(meta_a));
        if let Ok(Object::Dictionary(page)) = doc.get_object_mut(page_id) {
            page.set("Metadata", Object::Reference(meta_b));
        }
        let mut reencoded: Vec<u8> = Vec::new();
        doc.save_to(&mut reencoded).unwrap();

        let kept = optimize_with_options(&reencoded, OptimizeOptions::default());
        let kept_doc = Document::load_mem(&kept).expect("default output must load");
        assert!(
            kept_doc.catalog().unwrap().get(b"Metadata").is_ok(),
            "default must keep XMP"
        );

        let opts = OptimizeOptions::default().with_strip_metadata(true);
        let out = optimize_with_options(&reencoded, opts);
        let out_doc = Document::load_mem(&out).expect("stripped output must load");
        assert!(
            out_doc.catalog().unwrap().get(b"Metadata").is_err(),
            "catalog /Metadata must be removed"
        );
        for object in out_doc.objects.values() {
            if let Object::Dictionary(d) = object {
                assert!(d.get(b"Metadata").is_err(), "no /Metadata may survive");
            }
        }
        assert!(out.len() < kept.len(), "stripping must shrink the output");
    }

    #[test]
    fn dedup_merges_identical_objects() {
        // Two structurally identical dictionaries plus an object referencing both.
        // dedup must collapse them to one and redirect both references to it.
        let mut doc = Document::with_version("1.5");
        let a = doc.add_object(dictionary! { "Type" => "ExtGState", "ca" => 1 });
        let b = doc.add_object(dictionary! { "Type" => "ExtGState", "ca" => 1 });
        let holder = doc.add_object(dictionary! { "First" => a, "Second" => b });

        let before = doc.objects.len();
        dedup_objects(&mut doc);

        assert_eq!(
            doc.objects.len(),
            before - 1,
            "exactly one duplicate object should be removed"
        );
        let dict = doc.get_object(holder).unwrap().as_dict().unwrap();
        let first = dict.get(b"First").unwrap();
        let second = dict.get(b"Second").unwrap();
        assert_eq!(
            first, second,
            "both references must point at the single surviving object"
        );
    }

    /// A pass-through JPEG — one the image path never re-encodes — must still
    /// come out with rebuilt Huffman tables: strictly smaller bytes that decode
    /// to exactly the same pixels. The `image` crate's encoder emits the fixed
    /// T.81 Annex K tables, which is the real-world shape this pass targets.
    #[test]
    fn pass_through_jpeg_gets_optimized_huffman_tables() {
        // Big enough that the entropy saving clears the cost of carrying the
        // rebuilt tables; a smooth ramp keeps the coefficient alphabet small,
        // so the flat Annex K tables are a long way from this image's own
        // statistics.
        let mut img = image::RgbImage::new(256, 256);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            *pixel = image::Rgb([x as u8, y as u8, 128]);
        }
        let mut jpeg: Vec<u8> = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, 90)
            .encode_image(&img)
            .unwrap();

        let mut doc = Document::with_version("1.5");
        // Never painted by the content stream, so no planner touches it; the
        // only pass that can change these bytes is the Huffman re-optimization.
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => 256_i64,
                "Height" => 256_i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "DCTDecode",
            },
            jpeg.clone(),
        ));
        let content = Content {
            operations: vec![Operation::new("q", vec![]), Operation::new("Q", vec![])],
        };
        let c1 = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));
        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => c1,
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
        let mut pdf: Vec<u8> = Vec::new();
        doc.save_to(&mut pdf).unwrap();

        let out = optimize(&pdf);
        let doc = Document::load_mem(&out).unwrap();
        let payload = doc
            .objects
            .values()
            .find_map(|o| match o {
                Object::Stream(s)
                    if matches!(s.dict.get(b"Filter"), Ok(Object::Name(n)) if n == b"DCTDecode") =>
                {
                    Some(s.content.clone())
                }
                _ => None,
            })
            .expect("the JPEG must still be there");
        assert!(
            payload.len() < jpeg.len(),
            "Huffman re-optimization must shrink the pass-through JPEG: {} vs {}",
            payload.len(),
            jpeg.len()
        );
        let before = image::load_from_memory_with_format(&jpeg, image::ImageFormat::Jpeg).unwrap();
        let after =
            image::load_from_memory_with_format(&payload, image::ImageFormat::Jpeg).unwrap();
        assert_eq!(
            before.to_rgb8().into_raw(),
            after.to_rgb8().into_raw(),
            "the rebuild must be pixel-identical"
        );
    }

    #[test]
    fn dedup_keeps_distinct_objects() {
        // Same shape, but the two dictionaries differ by one value. They must NOT
        // be merged: distinct content stays distinct.
        let mut doc = Document::with_version("1.5");
        let a = doc.add_object(dictionary! { "Type" => "ExtGState", "ca" => 1 });
        let b = doc.add_object(dictionary! { "Type" => "ExtGState", "ca" => 2 });
        let holder = doc.add_object(dictionary! { "First" => a, "Second" => b });

        let before = doc.objects.len();
        dedup_objects(&mut doc);

        assert_eq!(doc.objects.len(), before, "no object should be removed");
        let dict = doc.get_object(holder).unwrap().as_dict().unwrap();
        let first = dict.get(b"First").unwrap();
        let second = dict.get(b"Second").unwrap();
        assert_ne!(
            first, second,
            "distinct objects must keep distinct references"
        );
    }

    #[test]
    fn cascaded_duplicate_merges_reach_fixpoint_in_one_call() {
        // Trimmed-down NASA repro (16 MB scanned doc, 2202 objects after one
        // pass): byte-identical image streams that each reference their OWN
        // copy of a duplicated ColorSpace object. The stream dedup pass alone
        // cannot merge the images — their dicts differ until dedup_objects
        // collapses the ColorSpace copies and remaps the references — so a
        // single dedup generation per call left the stream merge to the NEXT
        // optimize call, and optimize(optimize(x)) kept shrinking. The merge
        // cascade must reach its fixpoint inside ONE call.
        let mut img = image::RgbImage::new(16, 16);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            *pixel = image::Rgb([(x * 16) as u8, (y * 16) as u8, 0]);
        }
        let mut jpeg: Vec<u8> = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, 92)
            .encode_image(&img)
            .unwrap();

        let mut doc = Document::with_version("1.5");
        // Two identical indirect ColorSpace objects — first-generation dupes.
        let cs1 = doc.add_object(Object::Name(b"DeviceRGB".to_vec()));
        let cs2 = doc.add_object(Object::Name(b"DeviceRGB".to_vec()));
        // Two image streams with identical bytes whose dicts differ ONLY in
        // which ColorSpace copy they reference — mergeable one generation
        // AFTER the ColorSpaces collapse. Never painted, so the downsample
        // planner ignores them; reachable via /Resources, so prune keeps them.
        let image_dict = |cs: ObjectId| {
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => 16_i64,
                "Height" => 16_i64,
                "ColorSpace" => cs,
                "BitsPerComponent" => 8_i64,
                "Filter" => "DCTDecode",
            }
        };
        let img1 = doc.add_object(Stream::new(image_dict(cs1), jpeg.clone()));
        let img2 = doc.add_object(Stream::new(image_dict(cs2), jpeg));
        // Two byte-identical content streams (a /Contents array is legal PDF):
        // merged by the FIRST dedup_streams pass, which is what marks the
        // document as having work to do at all (merged_streams == true).
        let content = Content {
            operations: vec![Operation::new("q", vec![]), Operation::new("Q", vec![])],
        };
        let c1 = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));
        let c2 = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));

        let pages_id = doc.new_object_id();
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Contents" => vec![c1.into(), c2.into()],
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! {
                "XObject" => dictionary! { "Im0" => img1, "Im1" => img2 },
            },
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
        let mut pdf: Vec<u8> = Vec::new();
        doc.save_to(&mut pdf).unwrap();

        let once = optimize(&pdf);
        assert!(once.len() < pdf.len(), "first pass must shrink");
        assert_eq!(
            count_image_streams(&once),
            1,
            "the second-generation image-stream merge must happen in pass one"
        );
        let twice = optimize(&once);
        assert_eq!(twice, once, "second pass must be byte-stable");
        assert_eq!(
            twice.len(),
            once.len(),
            "single-pass output must already be the two-pass size"
        );
    }

    #[test]
    fn identical_blank_pages_are_never_merged() {
        // NASA repro, part two: two blank pages with byte-identical content
        // streams and shared resources. Once the content streams merge, the
        // page dicts become byte-identical — and merging THEM corrupts the
        // document: the same object id lands in /Kids twice, and lopdf's
        // renumber page-reordering pass then collides page objects onto one
        // id, silently overwriting other pages (a scanned page went blank and
        // its 1.37 MB image subtree was orphaned). Page-tree nodes must
        // survive dedup even when byte-identical.
        let mut doc = Document::with_version("1.5");
        let content = Content {
            operations: vec![Operation::new("q", vec![]), Operation::new("Q", vec![])],
        };
        // Separate but byte-identical content streams: their merge is both the
        // work trigger (merged_streams == true) and what makes the page dicts
        // identical.
        let c1 = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));
        let c2 = doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));

        let pages_id = doc.new_object_id();
        let blank_page = |contents: ObjectId| {
            dictionary! {
                "Type" => "Page",
                "Parent" => pages_id,
                "Contents" => contents,
                "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            }
        };
        let p1 = doc.add_object(blank_page(c1));
        let p2 = doc.add_object(blank_page(c2));
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Kids" => vec![p1.into(), p2.into()],
                "Count" => 2,
            }),
        );
        let catalog_id = doc.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
        doc.trailer.set("Root", catalog_id);
        let mut pdf: Vec<u8> = Vec::new();
        doc.save_to(&mut pdf).unwrap();

        let once = optimize(&pdf);
        let out_doc = Document::load_mem(&once).expect("output must load");
        let pages: Vec<ObjectId> = out_doc.get_pages().into_values().collect();
        assert_eq!(pages.len(), 2, "both pages must survive");
        assert_ne!(
            pages[0], pages[1],
            "identical pages must stay distinct objects, never merged"
        );
        let twice = optimize(&once);
        assert_eq!(twice, once, "second pass must be byte-stable");
    }

    /// Real-file check. Defaults to the committed fixture
    /// (`fixtures/sample.pdf`, regenerable via `tests/generate_fixture.rs`);
    /// set AMATL_TEST_PDF to run against another PDF instead. Uses a typical
    /// size-focused configuration (strip the accessibility tree). Asserts the
    /// output is smaller and remains a valid, loadable PDF.
    #[test]
    fn real_file_shrinks_when_present() {
        let path = std::env::var("AMATL_TEST_PDF").unwrap_or_else(|_| {
            concat!(env!("CARGO_MANIFEST_DIR"), "/fixtures/sample.pdf").to_string()
        });
        let input = std::fs::read(&path).expect("failed to read real-file test input");
        // Opt in to object-stream packing for this run via AMATL_TEST_PACK=1.
        let opts = OptimizeOptions::default()
            .with_strip_accessibility(true)
            .with_pack_object_streams(std::env::var("AMATL_TEST_PACK").is_ok());
        let out = optimize_with_options(&input, opts);
        println!(
            "{path}: {} -> {} bytes ({}%)",
            input.len(),
            out.len(),
            out.len() * 100 / input.len()
        );
        assert!(out.len() < input.len(), "expected real file to shrink");
        assert!(
            Document::load_mem(&out).is_ok(),
            "output must be a valid PDF"
        );
        if let Ok(dest) = std::env::var("AMATL_TEST_OUT") {
            std::fs::write(&dest, &out).unwrap();
        }
    }

    // ---- D-M1: SMask-aware JPEG requantization (Phase 5) -------------------

    /// Build a one-page PDF embedding a `px`×`px` RGB JPEG WITH a plain 8-bit
    /// DeviceGray `/SMask` soft mask, drawn into a `draw_pts` square — the
    /// D-M1 positive fixture shape.
    fn build_pdf_smask(px: u32, draw_pts: i64, jpeg_quality: u8) -> Vec<u8> {
        build_pdf_smask_ext(px, draw_pts, jpeg_quality, |_| {}, |_| {})
    }

    /// The same, with `base_mutate`/`mask_mutate` applied to the base and mask
    /// stream dicts before draw — for the ineligible-mask skip cases.
    fn build_pdf_smask_ext(
        px: u32,
        draw_pts: i64,
        jpeg_quality: u8,
        base_mutate: impl FnOnce(&mut lopdf::Dictionary),
        mask_mutate: impl FnOnce(&mut lopdf::Dictionary),
    ) -> Vec<u8> {
        let mut img = image::RgbImage::new(px, px);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            *pixel = image::Rgb([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8]);
        }
        let mut jpeg: Vec<u8> = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg, jpeg_quality)
            .encode_image(&img)
            .unwrap();
        // The `image` crate ships the fixed T.81 Annex K Huffman tables, which
        // the (lossless, unconditional) re-optimization pass would rebuild.
        // Fixture JPEGs come in with optimal tables already so the skip tests
        // below can still assert exact byte-for-byte passthrough.
        let jpeg = jpeghuff::optimize(&jpeg).unwrap_or(jpeg);
        let mask_payload = deflate_level9(&flate_pixels(px, px, 1)).unwrap();

        let mut doc = Document::with_version("1.5");
        let mask_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceGray",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            mask_payload,
        ));
        if let Ok(Object::Stream(s)) = doc.get_object_mut(mask_id) {
            mask_mutate(&mut s.dict);
        }
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "DCTDecode",
                "SMask" => mask_id,
            },
            jpeg,
        ));
        if let Ok(Object::Stream(s)) = doc.get_object_mut(img_id) {
            base_mutate(&mut s.dict);
        }
        wrap_image_pdf(&mut doc, img_id, draw_pts)
    }

    /// (base stream content, width, height, /SMask target object id) for the
    /// single image stream carrying an /SMask in `pdf`.
    fn smask_base_info(pdf: &[u8]) -> (Vec<u8>, i64, i64, ObjectId) {
        let doc = Document::load_mem(pdf).unwrap();
        for obj in doc.objects.values() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image")
                    && s.dict.get(b"SMask").is_ok()
                {
                    let w = s.dict.get(b"Width").unwrap().as_i64().unwrap();
                    let h = s.dict.get(b"Height").unwrap().as_i64().unwrap();
                    let smask = match s.dict.get(b"SMask").unwrap() {
                        Object::Reference(r) => *r,
                        _ => panic!("SMask must be a reference in the fixture"),
                    };
                    return (s.content.clone(), w, h, smask);
                }
            }
        }
        panic!("no smask-carrying image stream found");
    }

    /// The `/Filter` name of the single `/SMask`-carrying image stream in `pdf`
    /// — which encoding the masked base ended up in.
    fn smask_base_filter(pdf: &[u8]) -> Vec<u8> {
        let doc = Document::load_mem(pdf).unwrap();
        for obj in doc.objects.values() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image")
                    && s.dict.get(b"SMask").is_ok()
                {
                    return match s.dict.get(b"Filter").unwrap() {
                        Object::Name(n) => n.clone(),
                        other => panic!("fixture uses scalar filters, got {other:?}"),
                    };
                }
            }
        }
        panic!("no smask-carrying image stream found");
    }

    fn smask_stream_bytes(pdf: &[u8], smask_id: ObjectId) -> Vec<u8> {
        let doc = Document::load_mem(pdf).unwrap();
        match doc.get_object(smask_id) {
            Ok(Object::Stream(s)) => s.content.clone(),
            _ => panic!("smask id is not a stream"),
        }
    }

    #[test]
    fn smask_masked_jpeg_requantizes_smaller_dimensions_identical() {
        // Positive D-M1 case: a q92 RGB JPEG with a plain 8-bit DeviceGray
        // /SMask placed at 240 pt (~120 DPI — UNDER the D-M2 over-resolution
        // threshold, so the pair is not eligible for the coupled downsample
        // and D-M1 remains the transform that applies). The base must be
        // re-encoded at jpeg_quality (78) WITHOUT resizing, replaced only
        // because it is strictly smaller, and the /SMask must survive
        // byte-for-byte pointing at the same mask stream.
        let pdf = build_pdf_smask(400, 240, 92);
        let (base_before, iw, ih, smask_before) = smask_base_info(&pdf);
        let mask_before = smask_stream_bytes(&pdf, smask_before);
        assert_eq!((iw, ih), (400, 400), "fixture base must be 400x400");

        let out = optimize(&pdf);

        assert!(out.len() < pdf.len(), "requantized output must be smaller");
        let (base_after, aw, ah, smask_after) = smask_base_info(&out);
        assert_eq!(
            (aw, ah),
            (iw, ih),
            "base dimensions must be identical after D-M1"
        );
        assert_ne!(
            base_after, base_before,
            "the base must actually be re-encoded, not passed through"
        );
        assert_eq!(
            smask_after, smask_before,
            "/SMask reference must stay intact"
        );
        assert_eq!(
            smask_stream_bytes(&out, smask_after),
            mask_before,
            "the /SMask stream itself must be untouched"
        );
        assert!(Document::load_mem(&out).is_ok());
    }

    #[test]
    fn smask_masked_optimize_is_idempotent() {
        // Over-resolution masked pair: the first pass is a D-M2 coupled
        // downsample (base + mask to 181 px). The second pass sees the pair at
        // ~130 DPI, under the margin, so the coupled downsample is declined by
        // the `target_* >= px_*` gate; the D-M1 requant that then applies is
        // a byte-identical no-op (5% guard). Byte-stable.
        let pdf = build_pdf_smask(400, 100, 92);
        let once = optimize(&pdf);
        assert!(once.len() < pdf.len(), "first pass must shrink");
        let twice = optimize(&once);
        assert_eq!(twice, once, "second pass must be byte-stable");
    }

    /// Two 400x400 q92 JPEG bases sharing ONE eligible `/SMask` object (the
    /// NASA dedup shape: byte-identical masks merged into a single id before
    /// planning), each drawn `draw_pts` square on one page. The bases carry
    /// DIFFERENT pixels so dedup never merges them — only the mask is shared.
    fn build_pdf_shared_smask(draw_pts: i64) -> Vec<u8> {
        let mut doc = Document::load_mem(&build_pdf_smask(400, draw_pts, 92)).unwrap();
        // Locate the original image id + its mask id.
        let (img_a_id, mask_a) = doc
            .objects
            .iter()
            .find_map(|(id, obj)| match obj {
                Object::Stream(s)
                    if matches!(
                        s.dict.get(b"Subtype"),
                        Ok(Object::Name(n)) if n == b"Image"
                    ) && s.dict.get(b"SMask").is_ok() =>
                {
                    let mask = match s.dict.get(b"SMask").unwrap() {
                        Object::Reference(r) => *r,
                        _ => panic!("fixture uses direct refs"),
                    };
                    Some((*id, mask))
                }
                _ => None,
            })
            .expect("fixture has one masked image");
        // Second image: same geometry class (over-res when drawn), DIFFERENT
        // pixels so dedup does not merge the BASES — only the masks merge.
        let mut img_b = image::RgbImage::new(400, 400);
        for (x, y, pixel) in img_b.enumerate_pixels_mut() {
            *pixel = image::Rgb([255 - (x % 256) as u8, (y % 256) as u8, 128]);
        }
        let mut jpeg_b: Vec<u8> = Vec::new();
        image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_b, 92)
            .encode_image(&img_b)
            .unwrap();
        let img_b_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => 400_i64,
                "Height" => 400_i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "DCTDecode",
                "SMask" => mask_a,
            },
            jpeg_b,
        ));
        // Draw both on one page at draw_pts each.
        let content_id = doc.add_object(Stream::new(
            dictionary! {},
            format!(
                "q {d} 0 0 {d} 0 0 cm /Im0 Do Q q {d} 0 0 {d} {off} 0 cm /Im1 Do Q",
                d = draw_pts,
                off = draw_pts + 50
            )
            .into_bytes(),
        ));
        let page_resources = dictionary! {
            "XObject" => dictionary! {
                "Im0" => Object::Reference(img_a_id),
                "Im1" => Object::Reference(img_b_id),
            },
        };
        // Point the fixture's single-image page at our two-image content.
        for obj in doc.objects.values_mut() {
            if let Object::Dictionary(d) = obj {
                if matches!(
                    d.get(b"Type").map(|t| t.as_name()),
                    Ok(Ok(name)) if name == b"Page"
                ) {
                    d.set("Resources", page_resources.clone());
                    d.set("Contents", Object::Reference(content_id));
                }
            }
        }
        let mut input: Vec<u8> = Vec::new();
        doc.save_to(&mut input).unwrap();
        input
    }

    /// Every image stream carrying an `/SMask` in `pdf`, as
    /// `(content, width, height, mask_id)` sorted by object id.
    fn shared_smask_bases(pdf: &[u8]) -> Vec<(Vec<u8>, i64, i64, ObjectId)> {
        let doc = Document::load_mem(pdf).unwrap();
        let mut ids: Vec<ObjectId> = doc.objects.keys().copied().collect();
        ids.sort();
        ids.iter()
            .filter_map(|id| match doc.get_object(*id) {
                Ok(Object::Stream(s))
                    if matches!(
                        s.dict.get(b"Subtype"),
                        Ok(Object::Name(n)) if n == b"Image"
                    ) && s.dict.get(b"SMask").is_ok() =>
                {
                    let mask = match s.dict.get(b"SMask").unwrap() {
                        Object::Reference(r) => *r,
                        _ => panic!("fixture uses direct refs"),
                    };
                    let w = s.dict.get(b"Width").unwrap().as_i64().unwrap();
                    let h = s.dict.get(b"Height").unwrap().as_i64().unwrap();
                    Some((s.content.clone(), w, h, mask))
                }
                _ => None,
            })
            .collect()
    }

    #[test]
    fn shared_smask_is_never_resized() {
        // NASA-derived corruption repro: two over-resolution masked images
        // whose masks are byte-identical. dedup merges the masks into ONE
        // object BEFORE planning, so both bases reference a single /SMask id.
        // Resizing that shared mask for one base's geometry would break the
        // other's alpha alignment (real page-33 corruption caught live). At
        // 100pt the pairs are OVER-resolution (400px ≈ 288 DPI), so the
        // coupled downsample must be declined — but the P-M1 split allows the
        // DIMENSION-PRESERVING requant (mask untouched): both q92 bases get
        // re-encoded at jpeg_quality in place. Geometry stays 400x400, both
        // /SMask refs still point at the same unmodified mask object, and the
        // mask's bytes are byte-identical before/after.
        let input = build_pdf_shared_smask(100);
        let out = optimize(&input);
        assert!(out.len() < input.len(), "requant must shrink the bases");
        let pairs = shared_smask_bases(&out);
        assert_eq!(pairs.len(), 2);
        for (content, w, h, _mask) in &pairs {
            assert_eq!((*w, *h), (400, 400), "dims must be unchanged");
            let img = image::load_from_memory_with_format(content, image::ImageFormat::Jpeg)
                .expect("base is still a decodable JPEG");
            assert_eq!((img.width(), img.height()), (400, 400));
        }
        assert_eq!(pairs[0].3, pairs[1].3, "both refs point at one mask");
        // The shared mask itself is byte-identical to its pre-optimization form.
        let in_pairs = shared_smask_bases(&input);
        let input_doc = Document::load_mem(&input).unwrap();
        let mask_before = input_doc
            .get_object(in_pairs[0].3)
            .unwrap()
            .as_stream()
            .unwrap()
            .content
            .clone();
        let mask_after = Document::load_mem(&out)
            .unwrap()
            .get_object(pairs[0].3)
            .unwrap()
            .as_stream()
            .unwrap()
            .content
            .clone();
        assert_eq!(mask_before, mask_after, "shared mask must be untouched");
    }

    #[test]
    fn shared_smask_under_threshold_bases_are_requantized() {
        // Phase 6 P-M1: the same shared-mask shape drawn at 240pt (~120 DPI,
        // UNDER the over-resolution threshold). Requantization never touches
        // the mask, so the shared mask no longer blocks it: BOTH q92 bases
        // must be re-encoded at jpeg_quality (78) in place — smaller, exact
        // same 400x400 geometry, both /SMask refs still pointing at the SAME
        // untouched mask object.
        let input = build_pdf_shared_smask(240);
        let before = shared_smask_bases(&input);
        assert_eq!(before.len(), 2, "fixture must hold two masked bases");
        assert_eq!(
            before[0].3, before[1].3,
            "fixture masks must be merged into one object"
        );
        let mask_bytes_before = smask_stream_bytes(&input, before[0].3);

        let out = optimize(&input);
        assert!(
            out.len() < input.len(),
            "requantized output must be smaller"
        );

        let after = shared_smask_bases(&out);
        assert_eq!(after.len(), 2, "both masked bases must survive");
        assert_eq!(
            after[0].3, after[1].3,
            "both /SMask refs must still point at the same mask object"
        );
        for ((base_before, ..), (base_after, w, h, _)) in before.iter().zip(&after) {
            assert_eq!((*w, *h), (400, 400), "base dimensions must be identical");
            assert!(
                base_after.len() < base_before.len(),
                "each base must be strictly smaller"
            );
        }
        assert_eq!(
            smask_stream_bytes(&out, after[0].3),
            mask_bytes_before,
            "the shared mask stream must be byte-identical"
        );
        assert!(Document::load_mem(&out).is_ok());
    }

    #[test]
    fn shared_smask_requant_is_idempotent() {
        // P-M1 idempotence: the first pass requantizes both shared-mask bases;
        // the second pass re-attempts the requant and the 5% minimum-savings
        // guard declines the generation-loss churn. Byte-stable.
        let input = build_pdf_shared_smask(240);
        let once = optimize(&input);
        assert!(once.len() < input.len(), "first pass must shrink");
        let twice = optimize(&once);
        assert_eq!(twice, once, "second pass must be byte-stable");
    }

    #[test]
    fn corrupt_masked_jpeg_returns_exact_original_bytes() {
        // Structurally valid PDF, corrupt base JPEG bytes, eligible /SMask:
        // the decode fails → fail-safe returns the exact input bytes.
        let mut doc = Document::load_mem(&build_pdf_smask(400, 100, 92)).unwrap();
        for obj in doc.objects.values_mut() {
            if let Object::Stream(s) = obj {
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image")
                    && s.dict.get(b"SMask").is_ok()
                {
                    s.set_content(b"\xff\xd8\xff not a real jpeg payload".to_vec());
                }
            }
        }
        let mut input: Vec<u8> = Vec::new();
        doc.save_to(&mut input).unwrap();

        let out = optimize(&input);
        assert_eq!(out, input, "corrupt masked JPEG must return original bytes");
        assert!(Document::load_mem(&out).is_ok());
    }

    #[test]
    fn smask_requantization_never_larger_guard_holds() {
        // First pass D-M2-downsamples the over-resolution pair to 181 px. The
        // second pass (quality 100) then sees an under-resolution pair, so the
        // D-M1 dimension-preserving path applies: re-encoding the base UP to
        // quality 100 from its q78 payload must grow the stream, and the
        // per-stream never-larger guard must discard it — the exact baseline
        // bytes (and untouched mask) come back.
        let pdf = build_pdf_smask(400, 100, 92);
        let baseline = optimize(&pdf); // D-M2'd: pair sits at ~130 DPI after this
        assert!(baseline.len() < pdf.len(), "baseline must be smaller");
        let opts = OptimizeOptions::default().with_jpeg_quality(100);
        let out = optimize_with_options(&baseline, opts);
        assert_eq!(out, baseline, "growing requantization must be discarded");
    }

    #[test]
    fn smask_matte_anywhere_skips_the_pair() {
        // /Matte (premultiplied background color) on either side of the pair
        // is a hard skip in D-M1.
        let cases: Vec<(&str, Vec<u8>)> = vec![
            (
                "/Matte on the mask",
                build_pdf_smask_ext(
                    400,
                    100,
                    92,
                    |_| {},
                    |m| {
                        m.set("Matte", vec![23.into(), 128.into(), 240.into()]);
                    },
                ),
            ),
            (
                "/Matte on the base",
                build_pdf_smask_ext(
                    400,
                    100,
                    92,
                    |b| {
                        b.set("Matte", vec![23.into(), 128.into(), 240.into()]);
                    },
                    |_| {},
                ),
            ),
        ];
        for (label, pdf) in cases {
            let out = optimize(&pdf);
            assert_eq!(out, pdf, "{label}: must leave the masked pair untouched");
        }
    }

    #[test]
    fn stencil_and_colorkey_masks_are_skipped() {
        // An /ImageMask stencil used as the /SMask, and a /Mask color-key on
        // the base: both remain hard skips in D-M1.
        let cases: Vec<(&str, Vec<u8>)> = vec![
            (
                "/ImageMask stencil as the /SMask",
                build_pdf_smask_ext(
                    400,
                    100,
                    92,
                    |_| {},
                    |m| {
                        m.set("ImageMask", Object::Boolean(true));
                    },
                ),
            ),
            (
                "/Mask color-key on the base",
                build_pdf_smask_ext(
                    400,
                    100,
                    92,
                    |b| {
                        b.set("Mask", vec![Object::Integer(1), Object::Integer(255)]);
                    },
                    |_| {},
                ),
            ),
        ];
        for (label, pdf) in cases {
            let out = optimize(&pdf);
            assert_eq!(out, pdf, "{label}: must leave the masked pair untouched");
        }
    }

    #[test]
    fn ineligible_smask_variants_are_skipped() {
        // Every mask-shape doubt rolls back to the untouched original:
        // unresolvable reference, non-image SMask object, non-DeviceGray
        // color space, and non-8-bit samples.
        let cases: Vec<(&str, Vec<u8>)> = vec![
            (
                "unresolvable /SMask reference",
                build_pdf_smask_ext(
                    400,
                    100,
                    92,
                    |b| {
                        b.set("SMask", 9_999_999_i64);
                    },
                    |_| {},
                ),
            ),
            (
                "/SMask that is not an image object",
                build_pdf_smask_ext(
                    400,
                    100,
                    92,
                    |b| {
                        b.set("SMask", dictionary! { "Type" => "AnyObject" });
                    },
                    |_| {},
                ),
            ),
            (
                "mask color space /DeviceRGB",
                build_pdf_smask_ext(
                    400,
                    100,
                    92,
                    |_| {},
                    |m| {
                        m.set("ColorSpace", "DeviceRGB");
                    },
                ),
            ),
            (
                "mask /BitsPerComponent 1 (not 8)",
                build_pdf_smask_ext(
                    400,
                    100,
                    92,
                    |_| {},
                    |m| {
                        m.set("BitsPerComponent", 1_i64);
                    },
                ),
            ),
        ];
        for (label, pdf) in cases {
            let out = optimize(&pdf);
            assert_eq!(out, pdf, "{label}: must leave the image untouched");
        }
    }

    // ---- D-M3: SMask-coupled Flate-base downsampling (Phase 5) -------------

    /// Build a one-page PDF embedding a `px`×`px` FlateDecode RGB noise image
    /// WITH a plain 8-bit DeviceGray FlateDecode `/SMask`, drawn into a
    /// `draw_pts` square — the D-M3 positive fixture shape (noise, so the
    /// downsampled re-encode is reliably smaller; see `flate_pixels`).
    fn build_pdf_smask_flate(px: u32, draw_pts: i64) -> Vec<u8> {
        let base = flate_pixels(px, px, 3);
        let mask = flate_pixels(px, px, 1);
        build_pdf_smask_flate_ext(px, draw_pts, &base, &mask, |_| {}, |_| {})
    }

    /// The same, with explicit raw pixel buffers and `base_mutate`/`mask_mutate`
    /// dict hooks — for the combined-guard and skip cases.
    fn build_pdf_smask_flate_ext(
        px: u32,
        draw_pts: i64,
        base_raw: &[u8],
        mask_raw: &[u8],
        base_mutate: impl FnOnce(&mut lopdf::Dictionary),
        mask_mutate: impl FnOnce(&mut lopdf::Dictionary),
    ) -> Vec<u8> {
        let mut doc = Document::with_version("1.5");
        let mask_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceGray",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
            },
            deflate_level9(mask_raw).unwrap(),
        ));
        if let Ok(Object::Stream(s)) = doc.get_object_mut(mask_id) {
            mask_mutate(&mut s.dict);
        }
        let img_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => px as i64,
                "Height" => px as i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
                "SMask" => mask_id,
            },
            deflate_level9(base_raw).unwrap(),
        ));
        if let Ok(Object::Stream(s)) = doc.get_object_mut(img_id) {
            base_mutate(&mut s.dict);
        }
        wrap_image_pdf(&mut doc, img_id, draw_pts)
    }

    /// A `px`-square checkerboard with `cell`-pixel cells: perfectly periodic
    /// input that deflates to almost nothing, while its Lanczos-downsampled
    /// counterpart (non-integer scale → aperiodic anti-aliased edges) deflates
    /// far worse — reliably tripping the combined never-larger/5% guard.
    fn checkerboard_pixels(px: u32, cell: u32, channels: usize) -> Vec<u8> {
        let mut out = Vec::with_capacity(px as usize * px as usize * channels);
        for y in 0..px {
            for x in 0..px {
                let v = if ((x / cell) + (y / cell)).is_multiple_of(2) {
                    0u8
                } else {
                    255u8
                };
                out.extend(std::iter::repeat_n(v, channels));
            }
        }
        out
    }

    #[test]
    fn smask_flate_pair_downsamples_atomically_dimensions_identical() {
        // Positive D-M3 case: a 400px FlateDecode RGB base with a plain 8-bit
        // DeviceGray Flate /SMask drawn at 100 pt (≈288 DPI, over-resolution).
        // Both streams must land at the SAME target geometry (181 px at the
        // default 130 DPI), the base must still be FlateDecode (format
        // preserved), and the /SMask reference must stay intact.
        let pdf = build_pdf_smask_flate(400, 100);
        let (base_before, iw, ih, smask_before) = smask_base_info(&pdf);
        let mask_before = smask_stream_bytes(&pdf, smask_before);
        assert_eq!((iw, ih), (400, 400), "fixture base must be 400x400");

        let out = optimize(&pdf);

        assert!(out.len() < pdf.len(), "downsampled output must be smaller");
        let (base_after, aw, ah, smask_after) = smask_base_info(&out);
        assert_eq!((aw, ah), (181, 181), "base must land at the 130-DPI target");
        assert_ne!(base_after, base_before, "the base must be re-encoded");
        assert_eq!(
            smask_after, smask_before,
            "/SMask reference must stay intact"
        );
        assert_ne!(
            smask_stream_bytes(&out, smask_after),
            mask_before,
            "the mask must be re-encoded alongside the base"
        );
        let doc = Document::load_mem(&out).unwrap();
        let mask_dict = &doc
            .get_object(smask_after)
            .unwrap()
            .as_stream()
            .unwrap()
            .dict;
        assert_eq!(
            (
                mask_dict.get(b"Width").unwrap().as_i64().unwrap(),
                mask_dict.get(b"Height").unwrap().as_i64().unwrap(),
            ),
            (aw, ah),
            "mask geometry must be identical to the base's (the unit rule)"
        );
        for obj in doc.objects.values() {
            if let Object::Stream(s) = obj {
                if s.dict.get(b"SMask").is_ok() {
                    assert!(
                        matches!(s.dict.get(b"Filter"), Ok(Object::Name(n)) if n == b"FlateDecode"),
                        "base must remain FlateDecode (format-preserving path)"
                    );
                }
            }
        }
    }

    #[test]
    fn smask_flate_under_resolution_pair_is_untouched() {
        // 400px drawn at 240 pt ≈ 120 DPI — inside the threshold. There is no
        // requantization analogue for lossless Flate bases in D-M3, so the
        // pair must come back byte-for-byte.
        let pdf = build_pdf_smask_flate(400, 240);
        let out = optimize(&pdf);
        assert_eq!(
            out, pdf,
            "under-resolution masked Flate pair must be untouched"
        );
    }

    #[test]
    fn corrupt_masked_flate_streams_return_exact_original_bytes() {
        // Atomicity under corruption: truncating EITHER half of the pair must
        // return the exact input bytes — never a one-sided replacement.
        for corrupt_mask in [false, true] {
            let mut doc = Document::load_mem(&build_pdf_smask_flate(400, 100)).unwrap();
            for obj in doc.objects.values_mut() {
                if let Object::Stream(s) = obj {
                    // The base carries /SMask; the mask is the image without it.
                    if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image")
                        && s.dict.get(b"SMask").is_ok() != corrupt_mask
                    {
                        let half = s.content.len() / 2;
                        let truncated = s.content[..half].to_vec();
                        s.set_content(truncated);
                    }
                }
            }
            let mut input: Vec<u8> = Vec::new();
            doc.save_to(&mut input).unwrap();
            let out = optimize(&input);
            assert_eq!(
                out,
                input,
                "corrupt {} must return original bytes for the whole pair",
                if corrupt_mask { "mask" } else { "base" }
            );
        }
    }

    #[test]
    fn smask_flate_combined_guard_skips_never_larger_pair() {
        // A periodic checkerboard deflates to almost nothing, but its
        // downsampled (aperiodic, anti-aliased) counterpart deflates far
        // worse: the combined candidate cannot beat the pair's original size
        // by 5%, so the guard must skip the whole pair byte-for-byte.
        let base = checkerboard_pixels(400, 8, 3);
        let mask = checkerboard_pixels(400, 8, 1);
        let pdf = build_pdf_smask_flate_ext(400, 100, &base, &mask, |_| {}, |_| {});
        let out = optimize(&pdf);
        assert_eq!(out, pdf, "never-larger pair must be skipped atomically");
    }

    #[test]
    fn smask_flate_optimize_is_idempotent() {
        // First pass: coupled downsample to 181 px. Second pass: the pair sits
        // at ~130 DPI (inside the margin) and Flate has no dimension-preserving
        // transform, so nothing is planned — byte-stable.
        let pdf = build_pdf_smask_flate(400, 100);
        let once = optimize(&pdf);
        assert!(once.len() < pdf.len(), "first pass must shrink");
        let twice = optimize(&once);
        assert_eq!(twice, once, "second pass must be byte-stable");
    }

    // ---- D-M3 + Phase 7 Option B: the coupled downsample's JPEG competitor ---

    /// The over-resolution masked-Flate shape the competitor targets: a 400px
    /// photographic RGB base with a plain 8-bit DeviceGray Flate `/SMask`,
    /// drawn at 100 pt (≈288 DPI ⇒ over-resolution, 181 px at the default 130
    /// DPI target). Photographic content, so the JPEG candidate is genuinely
    /// smaller than the format-preserving deflate at that geometry.
    fn build_pdf_smask_flate_photo() -> Vec<u8> {
        let base = photo_pixels(400, 400, 3);
        let mask = photo_pixels(400, 400, 1);
        build_pdf_smask_flate_ext(400, 100, &base, &mask, |_| {}, |_| {})
    }

    #[test]
    fn smask_flate_lossy_pair_is_idempotent_in_one_pass() {
        // The whole point of Option B. Without the competitor, pass 1 produced
        // an at-target masked FLATE pair and pass 2 then converted it through
        // the dimension-preserving fall-through — one harvest split across two
        // passes, breaking optimize(optimize(x)) == optimize(x). With the
        // competitor the base lands as DCTDecode at the target geometry in
        // pass 1, so pass 2 sees an at-target masked JPEG whose only remaining
        // transform is the D-M1 requant — declined by its own 5% guard.
        let pdf = build_pdf_smask_flate_photo();
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);

        let once = optimize_with_options(&pdf, opts);
        assert!(once.len() < pdf.len(), "first pass must shrink");
        let (_, w, h, mask_id) = smask_base_info(&once);
        assert_eq!(
            smask_base_filter(&once).as_slice(),
            b"DCTDecode",
            "the JPEG competitor must win on photographic content"
        );
        assert_eq!((w, h), (181, 181), "base at the 130-DPI target geometry");
        let doc = Document::load_mem(&once).unwrap();
        let mask_dict = &doc.get_object(mask_id).unwrap().as_stream().unwrap().dict;
        assert_eq!(
            (
                mask_dict.get(b"Width").unwrap().as_i64().unwrap(),
                mask_dict.get(b"Height").unwrap().as_i64().unwrap(),
            ),
            (w, h),
            "the mask must be resampled to the base's geometry (the unit rule)"
        );

        let twice = optimize_with_options(&once, opts);
        assert_eq!(twice, once, "second pass must be BYTE-IDENTICAL");
    }

    /// A smooth diagonal ramp: no sharp edges and no flat background, so the
    /// line-art guard passes it (it is "photographic" by the metrics), but it
    /// is far more deflate-friendly than any JPEG at any quality — the
    /// competitor must lose on it.
    fn smooth_ramp_pixels(px: u32, channels: usize) -> Vec<u8> {
        let mut out = Vec::with_capacity(px as usize * px as usize * channels);
        for y in 0..px {
            for x in 0..px {
                let v = ((x + y) as f32 / (2.0 * px as f32) * 255.0) as u8;
                out.extend(std::iter::repeat_n(v, channels));
            }
        }
        out
    }

    #[test]
    fn smask_flate_lossy_competitor_wins_only_when_smaller() {
        // Competitor selection is a pure size comparison of the two base
        // candidates at ONE fixed target geometry — the mask half is identical
        // either way, so comparing the bases IS comparing the pairs. A smooth
        // ramp puts the two candidates within a factor of two of each other at
        // the 181-px target (measured: deflate 1,780 B; JPEG 1,027 B at q78,
        // 4,028 B at q100), so `jpeg_quality` flips the winner with the content
        // held fixed. Losing must leave exactly the flag-off pair, byte for
        // byte — not a "close enough" re-encode.
        let ramp = build_pdf_smask_flate_ext(
            400,
            100,
            &smooth_ramp_pixels(400, 3),
            &photo_pixels(400, 400, 1),
            |_| {},
            |_| {},
        );
        let flag_off = optimize(&ramp);

        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let jpeg_wins = optimize_with_options(&ramp, opts);
        assert_eq!(
            smask_base_filter(&jpeg_wins).as_slice(),
            b"DCTDecode",
            "q78: the smaller JPEG candidate must win"
        );
        assert!(
            jpeg_wins.len() < flag_off.len(),
            "and it must actually beat the flag-off pair on size"
        );

        let lossless_wins = optimize_with_options(&ramp, opts.with_jpeg_quality(100));
        assert_eq!(
            smask_base_filter(&lossless_wins).as_slice(),
            b"FlateDecode",
            "q100: the larger JPEG candidate must lose to the deflate"
        );
        assert_eq!(
            lossless_wins, flag_off,
            "losing the competition must leave exactly the flag-off pair"
        );
    }

    #[test]
    fn smask_flate_lossy_competitor_declines_line_art() {
        // The line-art content guard runs inside `plan_flate_to_jpeg` on the
        // decoded SOURCE pixels, so it protects the coupled path too: an
        // over-resolution masked line-art pair still downsamples losslessly and
        // must come out byte-identical to the flag-off result — never
        // DCT-mottled.
        let base = line_art_pixels(400, 400);
        let mask = photo_pixels(400, 400, 1);
        let pdf = build_pdf_smask_flate_ext(400, 100, &base, &mask, |_| {}, |_| {});
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        let out = optimize_with_options(&pdf, opts);
        assert_eq!(
            smask_base_filter(&out).as_slice(),
            b"FlateDecode",
            "masked line art must keep the format-preserving downsample"
        );
        assert_eq!(
            out,
            optimize(&pdf),
            "masked line art must get exactly the flag-off result"
        );
    }

    #[test]
    fn smask_flate_lossy_competitor_never_compounds_a_declined_downsample() {
        // No compounding losses, the pair's form: a checkerboard base whose
        // Lanczos-downsampled deflate GROWS past the combined 5% guard. The
        // lossless path therefore declines the resample, and a JPEG candidate
        // must not resurrect it by hiding the resolution loss behind a DCT win
        // — the pair comes back byte-for-byte even with consent.
        let base = checkerboard_pixels(400, 4, 3);
        let mask = checkerboard_pixels(400, 4, 1);
        let pdf = build_pdf_smask_flate_ext(400, 100, &base, &mask, |_| {}, |_| {});
        assert_eq!(optimize(&pdf), pdf, "the lossless pair must decline first");
        let opts = OptimizeOptions::default().with_allow_lossy_reencode(true);
        assert_eq!(
            optimize_with_options(&pdf, opts),
            pdf,
            "a declined resample must not be resurrected by a JPEG candidate"
        );
    }

    #[test]
    fn shared_smask_flate_pair_is_never_resized() {
        // Two DIFFERENT Flate bases referencing one /SMask id: the refcount
        // guard in eligible_smask must disqualify both pairs (resizing the
        // shared mask for one base's geometry would break the other's).
        let mut doc = Document::load_mem(&build_pdf_smask_flate(400, 100)).unwrap();
        let (img_a_id, mask_a) = doc
            .objects
            .iter()
            .find_map(|(id, obj)| match obj {
                Object::Stream(s)
                    if matches!(
                        s.dict.get(b"Subtype"),
                        Ok(Object::Name(n)) if n == b"Image"
                    ) && s.dict.get(b"SMask").is_ok() =>
                {
                    let mask = match s.dict.get(b"SMask").unwrap() {
                        Object::Reference(r) => *r,
                        _ => panic!("fixture uses direct refs"),
                    };
                    Some((*id, mask))
                }
                _ => None,
            })
            .expect("fixture has one masked image");
        // Different pixels, so dedup does not merge the BASES.
        let mut raw_b = flate_pixels(400, 400, 3);
        for b in &mut raw_b {
            *b = !*b;
        }
        let img_b_id = doc.add_object(Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => 400_i64,
                "Height" => 400_i64,
                "ColorSpace" => "DeviceRGB",
                "BitsPerComponent" => 8_i64,
                "Filter" => "FlateDecode",
                "SMask" => mask_a,
            },
            deflate_level9(&raw_b).unwrap(),
        ));
        let content_id = doc.add_object(Stream::new(
            dictionary! {},
            b"q 100 0 0 100 0 0 cm /Im0 Do Q q 100 0 0 100 150 0 cm /Im1 Do Q".to_vec(),
        ));
        let page_resources = dictionary! {
            "XObject" => dictionary! {
                "Im0" => Object::Reference(img_a_id),
                "Im1" => Object::Reference(img_b_id),
            },
        };
        for obj in doc.objects.values_mut() {
            if let Object::Dictionary(d) = obj {
                if matches!(
                    d.get(b"Type").map(|t| t.as_name()),
                    Ok(Ok(name)) if name == b"Page"
                ) {
                    d.set("Resources", page_resources.clone());
                    d.set("Contents", Object::Reference(content_id));
                }
            }
        }
        let mut input: Vec<u8> = Vec::new();
        doc.save_to(&mut input).unwrap();

        let out = optimize(&input);
        assert_eq!(out.len(), input.len(), "shared-mask pairs must not change");
    }

    #[test]
    fn smask_flate_matte_and_stencil_are_skipped() {
        // The D-M1 skip rules carry over unchanged to Flate bases: /Matte on
        // either side of the pair, and an /ImageMask stencil as the /SMask,
        // all leave the pair byte-for-byte untouched.
        let base = flate_pixels(400, 400, 3);
        let mask = flate_pixels(400, 400, 1);
        let cases: Vec<(&str, Vec<u8>)> = vec![
            (
                "/Matte on the mask",
                build_pdf_smask_flate_ext(
                    400,
                    100,
                    &base,
                    &mask,
                    |_| {},
                    |m| {
                        m.set("Matte", vec![23.into(), 128.into(), 240.into()]);
                    },
                ),
            ),
            (
                "/Matte on the base",
                build_pdf_smask_flate_ext(
                    400,
                    100,
                    &base,
                    &mask,
                    |b| {
                        b.set("Matte", vec![23.into(), 128.into(), 240.into()]);
                    },
                    |_| {},
                ),
            ),
            (
                "/ImageMask stencil as the /SMask",
                build_pdf_smask_flate_ext(
                    400,
                    100,
                    &base,
                    &mask,
                    |_| {},
                    |m| {
                        m.set("ImageMask", Object::Boolean(true));
                    },
                ),
            ),
        ];
        for (label, pdf) in cases {
            let out = optimize(&pdf);
            assert_eq!(out, pdf, "{label}: must leave the masked pair untouched");
        }
    }

    #[test]
    fn downsample_flate_images_off_leaves_masked_pair_untouched() {
        // The masked-Flate coupled downsample honors the same consent flag as
        // the unmasked Flate path.
        let pdf = build_pdf_smask_flate(400, 100);
        let opts = OptimizeOptions::default().with_downsample_flate_images(false);
        let out = optimize_with_options(&pdf, opts);
        assert_eq!(out, pdf, "flag off must leave the masked pair untouched");
    }

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
                    vec![
                        100.into(),
                        0.into(),
                        0.into(),
                        100.into(),
                        0.into(),
                        0.into(),
                    ],
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
        assert_eq!(
            out, input,
            "corrupt image must leave the document unchanged"
        );
        assert!(
            Document::load_mem(&out).is_ok(),
            "output must remain a valid PDF"
        );
    }
}


#[cfg(test)]
mod vendor_smoke {
    /// End-to-end smoke: real promo PDF through the app's exact call shape.
    #[test]
    fn app_call_shape_shrinks_real_pdf() {
        let path = std::path::Path::new(concat!(env!("CARGO_MANIFEST_DIR"), "/../.extraction-tmp/post.pdf"));
        if !path.exists() {
            eprintln!("smoke fixture absent; skipping");
            return;
        }
        let input = std::fs::read(path).unwrap();
        let opts = crate::amatl::OptimizeOptions::default()
            .with_strip_accessibility(true)
            .with_pack_object_streams(true);
        let out = crate::amatl::optimize_with_options(&input, opts);
        assert!(out.len() < input.len(), "output {} >= input {}", out.len(), input.len());
    }
}
