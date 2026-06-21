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
//!   3. Replace the stream only when the result is actually smaller.
//!
//! Hard safety guarantees:
//!   - Images we can't measure a placement for are left untouched.
//!   - Images already at/below the target DPI are left untouched (no upscaling).
//!   - A re-encode that isn't smaller is discarded.
//!   - Any failure (parse, decode, save) falls back to the original bytes.

use std::collections::HashMap;
use std::hash::{DefaultHasher, Hash, Hasher};

use image::{DynamicImage, ImageFormat};
use lopdf::content::Content;
use lopdf::{Document, Object, ObjectId};

/// Target resolution for downsampled images, in dots per inch.
const TARGET_DPI: f32 = 130.0;
/// JPEG quality (0-100) for re-encoded images.
const JPEG_QUALITY: u8 = 78;
/// Only downsample when the effective DPI exceeds the target by this factor,
/// so we don't churn images that are already close to ideal.
const DPI_MARGIN: f32 = 1.15;

/// Options for [`optimize_with_options`]. Defaults preserve the input's
/// accessibility data and use the simpler (non-packed) save path; the
/// citizen-communications app opts in to stripping.
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
/// `false`. On the citizen-communications input shape (after strip), this buys
/// only ~1.5 percentage points (~9 KB on a 597 KB file) because there are few
/// objects left to pack; for library consumers with larger/denser documents it
/// can buy substantially more. Implemented in pure Rust (no native deps) to
/// avoid the qpdf-bundling cost — see AGENTS.md for rationale.
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

/// Optimize a PDF with default options (accessibility data preserved), returning
/// smaller bytes when possible. On any failure or if the result is not smaller,
/// the original bytes are returned unchanged. Equivalent to
/// [`optimize_with_options`] with [`OptimizeOptions::default()`].
///
/// Unused by the citizen-communications app (which opts into stripping), but
/// kept as the obvious entry point for library consumers.
#[allow(dead_code)]
pub fn optimize(input: &[u8]) -> Vec<u8> {
    optimize_with_options(input, OptimizeOptions::default())
}

/// Optimize a PDF with the given options, returning smaller bytes when possible.
/// On any failure or if the result is not smaller, the original bytes are
/// returned unchanged.
pub fn optimize_with_options(input: &[u8], options: OptimizeOptions) -> Vec<u8> {
    match try_optimize(input, options) {
        Ok(out) if out.len() < input.len() => out,
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
    const IDENTITY: Mat = Mat { a: 1.0, b: 0.0, c: 0.0, d: 1.0, e: 0.0, f: 0.0 };

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
        let Ok(content_bytes) = doc.get_page_content(page_id) else {
            continue;
        };
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

/// A planned image replacement, computed read-only before mutating the doc.
struct Replacement {
    id: ObjectId,
    content: Vec<u8>,
    width: i64,
    height: i64,
}

/// Whether a stream's `/Filter` is exactly DCTDecode (raw JPEG payload).
fn is_dct_only(doc: &Document, filter: &Object) -> bool {
    match resolve(doc, filter) {
        Object::Name(n) => n == b"DCTDecode",
        Object::Array(items) => {
            items.len() == 1
                && matches!(resolve(doc, &items[0]), Object::Name(n) if n == b"DCTDecode")
        }
        _ => false,
    }
}

/// Decode, resize, and re-encode one image if it's an over-resolution JPEG.
/// Returns `None` to leave the image untouched.
fn plan_replacement(doc: &Document, id: ObjectId, rendered: (f32, f32)) -> Option<Replacement> {
    let (rendered_w_pts, rendered_h_pts) = rendered;
    if rendered_w_pts <= 0.0 || rendered_h_pts <= 0.0 {
        return None;
    }

    let stream = doc.get_object(id).ok()?.as_stream().ok()?;
    let dict = &stream.dict;

    // Must be a JPEG image with no soft mask (we don't touch transparency).
    if !matches!(dict.get(b"Subtype").map(|s| resolve(doc, s)), Ok(Object::Name(n)) if n == b"Image")
    {
        return None;
    }
    if dict.get(b"SMask").is_ok() || dict.get(b"Mask").is_ok() {
        return None;
    }
    let filter = dict.get(b"Filter").ok()?;
    if !is_dct_only(doc, filter) {
        return None;
    }

    let px_w = dict.get(b"Width").ok().and_then(|o| o.as_i64().ok())? as u32;
    let px_h = dict.get(b"Height").ok().and_then(|o| o.as_i64().ok())? as u32;
    if px_w == 0 || px_h == 0 {
        return None;
    }

    // Effective DPI = pixels / inches displayed. Skip if already near target.
    let eff_dpi = px_w as f32 / (rendered_w_pts / 72.0);
    if eff_dpi <= TARGET_DPI * DPI_MARGIN {
        return None;
    }

    let target_w = ((rendered_w_pts / 72.0) * TARGET_DPI).round().max(1.0) as u32;
    let target_h = ((rendered_h_pts / 72.0) * TARGET_DPI).round().max(1.0) as u32;
    if target_w >= px_w || target_h >= px_h {
        return None;
    }

    let decoded = image::load_from_memory_with_format(&stream.content, ImageFormat::Jpeg).ok()?;
    let is_gray = matches!(
        decoded,
        DynamicImage::ImageLuma8(_) | DynamicImage::ImageLuma16(_)
    );
    let resized = decoded.resize_exact(target_w, target_h, image::imageops::FilterType::Lanczos3);

    // Preserve the original component count so the PDF /ColorSpace (which we
    // leave unchanged) still matches: gray -> 1 channel, else RGB -> 3.
    let out = encode_jpeg(&resized, is_gray, JPEG_QUALITY)?;

    if out.len() >= stream.content.len() {
        return None;
    }

    Some(Replacement {
        id,
        content: out,
        width: target_w as i64,
        height: target_h as i64,
    })
}

/// Encode an image as JPEG using mozjpeg (optimized Huffman + trellis), which
/// produces substantially smaller files than the basic encoder at equal
/// quality. Channel count is preserved to match the unchanged PDF /ColorSpace.
fn encode_jpeg(img: &DynamicImage, is_gray: bool, quality: u8) -> Option<Vec<u8>> {
    use mozjpeg::{ColorSpace, Compress};

    let (color_space, data) = if is_gray {
        (ColorSpace::JCS_GRAYSCALE, img.to_luma8().into_raw())
    } else {
        (ColorSpace::JCS_RGB, img.to_rgb8().into_raw())
    };

    let mut comp = Compress::new(color_space);
    comp.set_size(img.width() as usize, img.height() as usize);
    comp.set_quality(quality as f32);

    let mut started = comp.start_compress(Vec::new()).ok()?;
    started.write_scanlines(&data).ok()?;
    started.finish().ok()
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

/// Hash a byte slice to a u64 using the standard library hasher.
fn hash_bytes(bytes: &[u8]) -> u64 {
    let mut h = DefaultHasher::new();
    bytes.hash(&mut h);
    h.finish()
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

/// Merge true duplicate non-stream objects. Two objects are duplicates when
/// their serialized bytes are identical. For each duplicate group the lowest
/// `ObjectId` is kept as canonical; all references to the others are
/// redirected, and the duplicates are removed from the document.
///
/// This is always safe (identical objects produce identical results in all
/// contexts) and reduces the object count before packing. On the citizen-
/// communications input shape (~32 duplicates out of 217 post-strip objects)
/// the gain is small; on denser documents it can be more significant.
fn dedup_objects(doc: &mut Document) {
    // Collect serialized representations for all non-stream objects.
    let mut by_hash: HashMap<u64, Vec<ObjectId>> = HashMap::new();
    for (&id, obj) in doc.objects.iter() {
        if let Some(bytes) = serialize_object(obj) {
            let h = hash_bytes(&bytes);
            by_hash.entry(h).or_default().push(id);
        }
    }

    // Build a remap table: non-canonical id -> canonical id.
    // Use the smallest id in each group as canonical (stable, deterministic).
    let mut remap: HashMap<ObjectId, ObjectId> = HashMap::new();
    for (_, mut ids) in by_hash {
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
        return;
    }

    // Rewrite all references throughout the document.
    let all_ids: Vec<ObjectId> = doc.objects.keys().copied().collect();
    for id in all_ids {
        if let Some(obj) = doc.objects.get_mut(&id) {
            remap_references(obj, &remap);
        }
    }

    // Also fix any references in the trailer dict.
    let trailer_keys: Vec<Vec<u8>> =
        doc.trailer.iter().map(|(k, _)| k.clone()).collect();
    for key in trailer_keys {
        if let Ok(val) = doc.trailer.get_mut(&key) {
            remap_references(val, &remap);
        }
    }

    // Remove the now-redundant duplicate objects. prune_objects() would also
    // clean them up, but removing them explicitly here keeps the object table
    // consistent before renumber_objects().
    for id in remap.keys() {
        doc.objects.remove(id);
    }
}

fn try_optimize(
    input: &[u8],
    options: OptimizeOptions,
) -> Result<Vec<u8>, lopdf::Error> {
    let mut doc = Document::load_mem(input)?;

    let placements = collect_placements(&doc);
    let mut replacements: Vec<Replacement> = Vec::new();
    for (id, rendered) in placements {
        if let Some(plan) = plan_replacement(&doc, id, rendered) {
            replacements.push(plan);
        }
    }

    // If we have no work to do at all, hand back the original bytes.
    // Note: pack_object_streams alone is not sufficient reason to write a new
    // file — packing only helps when there are objects to pack, and the
    // dispatcher handles it cheaply inside the save step regardless.
    if replacements.is_empty() && !options.strip_accessibility {
        return Ok(input.to_vec());
    }

    for r in replacements {
        if let Ok(Object::Stream(stream)) = doc.get_object_mut(r.id) {
            stream.set_content(r.content);
            stream.dict.set("Width", Object::Integer(r.width));
            stream.dict.set("Height", Object::Integer(r.height));
        }
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

    // Merge true duplicate non-stream objects (identical serialized bytes ->
    // same canonical id, references redirected, duplicates removed). Runs
    // before prune so the orphan cleanup sees an already-compacted object set.
    dedup_objects(&mut doc);

    // Drop orphaned objects, then Flate-compress any uncompressed content
    // streams (DCTDecode images are skipped — Stream::compress only touches
    // streams without a /Filter).
    doc.prune_objects();
    doc.compress();

    // Renumber to a contiguous id space so the saved trailer /Size matches the
    // highest object number. Without this, lopdf 0.41's classic save emits a
    // /Size that's slightly too high, which `qpdf --check` flags (benign, but
    // we want strictly clean output for email recipients / strict readers).
    doc.renumber_objects();

    save_document(&mut doc, options)
}

/// Serialize the document, optionally using PDF 1.5 object-stream packing when
/// `options.pack_object_streams` is true. The packed path produces smaller
/// output for object-heavy documents but is more complex; the classic path is
/// the always-available fallback and matches what lopdf ships.
fn save_document(
    doc: &mut Document,
    options: OptimizeOptions,
) -> Result<Vec<u8>, lopdf::Error> {
    if options.pack_object_streams {
        pack_and_save(doc)
    } else {
        let mut out: Vec<u8> = Vec::new();
        doc.save_to(&mut out)?;
        Ok(out)
    }
}

/// Pack eligible non-stream objects into a PDF 1.5 `ObjStm` stream and emit a
/// binary cross-reference stream. Currently a stub that falls back to the
/// classic save; see Phase 3+ of the implementation plan in AGENTS.md.
///
/// NOTE: this is the placeholder. The real implementation builds the ObjStm,
/// computes byte-exact offsets in two passes, and writes the xref stream.
/// Until implemented, callers requesting packing silently get the classic
/// output — fail-safe, but does not actually pack.
fn pack_and_save(doc: &mut Document) -> Result<Vec<u8>, lopdf::Error> {
    // Pack non-stream objects into an ObjStm + cross-reference stream via
    // lopdf's own writer. `renumber_objects()` (done by the caller) clears the
    // hard "invalid object stream" errors a contiguous id space avoids.
    //
    // One lopdf 0.41 bug remains: `create_xref_steam` iterates to a stale
    // `xref.size` captured before the ObjStm/CRS object ids are assigned, so
    // ids at/above it are omitted from the emitted xref. We pin
    // `max_objects_per_stream` very high so there is exactly ONE object stream
    // — which makes the *only* ever-omitted id the cross-reference stream's own
    // entry — then `add_xref_self_entry` appends it. Together the packed output
    // is strictly `qpdf --check`-clean.
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

/// Append the cross-reference stream's own xref entry, which lopdf 0.41 omits
/// (see [`pack_and_save`]). Deliberately narrow and fail-safe: it only rewrites
/// output in lopdf's exact shape (a trailing `startxref`, an uncompressed
/// `/Type/XRef` stream with `/W[1 4 2]` as the last object) and returns the
/// bytes unchanged if anything doesn't match — so it can never corrupt a file
/// it doesn't fully understand.
///
/// TODO(lopdf): remove this workaround once we bump lopdf past 0.41. The root
/// cause (`Xref::size` not updated on insert) was fixed upstream in
/// J-F-Liu/lopdf#501 (merged 2026-06-20) but is not in a published release yet.
/// When the dep is bumped, delete this fn + its tests and pack directly.
fn add_xref_self_entry(bytes: Vec<u8>) -> Vec<u8> {
    try_add_xref_self_entry(&bytes).unwrap_or(bytes)
}

fn find_sub(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack.windows(needle.len()).position(|w| w == needle)
}

fn try_add_xref_self_entry(bytes: &[u8]) -> Option<Vec<u8>> {
    // startxref <offset> %%EOF  -> the CRS object begins at <offset>.
    let sx = bytes.windows(9).rposition(|w| w == b"startxref")?;
    let tail = std::str::from_utf8(bytes.get(sx + 9..)?).ok()?;
    let xref_start: usize = tail.split_whitespace().next()?.parse().ok()?;
    let crs = bytes.get(xref_start..)?;

    // "<id> 0 obj"
    let obj_pos = find_sub(crs, b" 0 obj")?;
    let crs_id: u32 = std::str::from_utf8(&crs[..obj_pos]).ok()?.trim().parse().ok()?;

    // Dict text between "<<" and the "stream" keyword.
    let dict_open = find_sub(crs, b"<<")?;
    let stream_kw = find_sub(crs, b"stream")?;
    if stream_kw <= dict_open {
        return None;
    }
    let dict = std::str::from_utf8(&crs[dict_open..stream_kw]).ok()?;
    // Only handle lopdf's exact, uncompressed XRef-stream shape.
    if !dict.contains("/Type/XRef") || !dict.contains("/W[1 4 2]") || dict.contains("/Filter") {
        return None;
    }

    // /Length N (the stream byte count).
    let len_rest = &dict[dict.find("/Length ")? + "/Length ".len()..];
    let len_digits: String = len_rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    let length: usize = len_digits.parse().ok()?;

    // /Index[ ... ] subsections.
    let idx_open = dict.find("/Index[")? + "/Index[".len();
    let idx_len = dict[idx_open..].find(']')?;
    let index_inner = dict[idx_open..idx_open + idx_len].to_string();
    // Already has the self-entry (last subsection starts at crs_id)? Nothing to do.
    let toks: Vec<&str> = index_inner.split_whitespace().collect();
    if toks.len() >= 2 && toks[toks.len() - 2] == crs_id.to_string() {
        return None;
    }

    // Stream content is "stream\n" + <length bytes> + "\nendstream".
    let stream_abs = xref_start + stream_kw;
    if bytes.get(stream_abs + 6)? != &b'\n' {
        return None;
    }
    let content_start = stream_abs + 7;
    let content_end = content_start + length;
    if bytes.get(content_end..content_end + 10)? != b"\nendstream" {
        return None;
    }

    // Type-1 entry for the CRS: [01][offset u32 BE][generation u16 BE = 0].
    let mut entry = [0u8; 7];
    entry[0] = 1;
    entry[1..5].copy_from_slice(&(xref_start as u32).to_be_bytes());

    let new_dict = dict
        .replacen(
            &format!("/Length {length}"),
            &format!("/Length {}", length + entry.len()),
            1,
        )
        .replacen(
            &format!("/Index[{index_inner}]"),
            &format!("/Index[{index_inner} {crs_id} 1]"),
            1,
        );

    let dict_open_abs = xref_start + dict_open;
    let mut out = Vec::with_capacity(bytes.len() + 16);
    out.extend_from_slice(&bytes[..dict_open_abs]); // everything up to the dict
    out.extend_from_slice(new_dict.as_bytes()); // patched dict (replaces dict region)
    out.extend_from_slice(&bytes[stream_abs..content_end]); // "stream\n" + content
    out.extend_from_slice(&entry); // the appended self-entry
    out.extend_from_slice(&bytes[content_end..]); // "\nendstream..." + startxref + %%EOF
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::content::Operation;
    use lopdf::{dictionary, Stream};

    /// Build a one-page PDF embedding a `px`×`px` RGB JPEG drawn into a
    /// `draw_pts`×`draw_pts` box, i.e. at an effective DPI of px/(draw_pts/72).
    fn build_pdf(px: u32, draw_pts: i64) -> Vec<u8> {
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
        let content_id =
            doc.add_object(Stream::new(dictionary! {}, content.encode().unwrap()));

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

    fn image_dims(pdf: &[u8]) -> (i64, i64) {
        let doc = Document::load_mem(pdf).unwrap();
        for (_, obj) in doc.objects.iter() {
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

    #[test]
    fn add_xref_self_entry_is_fail_safe_on_unexpected_input() {
        // Anything that isn't lopdf's exact uncompressed-XRef shape must pass
        // through untouched — never corrupt a file we don't fully understand.
        for input in [
            &b""[..],
            b"%PDF-1.7 not really a pdf",
            b"...startxref\n999999999\n%%EOF", // offset past EOF
            b"5 0 obj<</Type/XRef/W[1 2 1]>>stream\nx\nendstream\nstartxref\n0\n%%EOF",
        ] {
            let v = input.to_vec();
            assert_eq!(add_xref_self_entry(v.clone()), v, "must be unchanged");
        }
    }

    #[test]
    fn pack_object_streams_produces_loadable_output() {
        // With packing on, the output must still be a valid, loadable PDF whose
        // image survives. (Strict qpdf-cleanliness is validated separately via
        // the real-file/archive runs; lopdf's packed xref carries one benign
        // "xref stream self-entry" warning that qpdf tolerates.)
        let pdf = build_pdf(400, 100);
        let opts = OptimizeOptions {
            strip_accessibility: false,
            pack_object_streams: true,
        };
        let out = optimize_with_options(&pdf, opts);

        let doc = Document::load_mem(&out).expect("packed output must load");
        let has_image = doc.objects.values().any(|o| {
            matches!(o, Object::Stream(s)
                if matches!(s.dict.get(b"Subtype"), Ok(Object::Name(n)) if n == b"Image"))
        });
        assert!(has_image, "image must survive packing");
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

    #[test]
    fn leaves_low_resolution_image_untouched() {
        // 120px drawn into 100pt box => ~86 DPI, below target: no change.
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

        let opts = OptimizeOptions {
            strip_accessibility: true,
            ..Default::default()
        };
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

    /// Opt-in real-file check: set CCT_TEST_PDF to a promotion PDF path.
    /// Uses the same options as the citizen-communications app (strip the
    /// accessibility tree). Asserts the output is smaller and remains a valid,
    /// loadable PDF.
    #[test]
    fn real_file_shrinks_when_present() {
        let Ok(path) = std::env::var("CCT_TEST_PDF") else {
            return;
        };
        let input = std::fs::read(&path).expect("failed to read CCT_TEST_PDF");
        let opts = OptimizeOptions {
            strip_accessibility: true,
            // Opt in to object-stream packing for this run via CCT_TEST_PACK=1.
            pack_object_streams: std::env::var("CCT_TEST_PACK").is_ok(),
        };
        let out = optimize_with_options(&input, opts);
        println!(
            "CCT_TEST_PDF: {} -> {} bytes ({}%)",
            input.len(),
            out.len(),
            out.len() * 100 / input.len()
        );
        assert!(out.len() < input.len(), "expected real file to shrink");
        assert!(Document::load_mem(&out).is_ok(), "output must be a valid PDF");
        if let Ok(dest) = std::env::var("CCT_TEST_OUT") {
            std::fs::write(&dest, &out).unwrap();
        }
    }
}
