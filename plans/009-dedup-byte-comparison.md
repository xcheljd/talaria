# Plan 009: `dedup_objects` merges only objects with identical serialized bytes

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
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `63e4c47`, 2026-06-20

## Why this matters

`amatl.rs` merges duplicate PDF objects (`dedup_objects`) before packing, to
shrink the file. Its documentation promises objects are merged **only when their
serialized bytes are identical** — "never a false merge." The implementation
does not deliver that: it groups objects by a **64-bit hash** of their bytes and
then merges *every* object that shares a hash bucket, **without ever comparing
the actual bytes**. A 64-bit hash collision between two genuinely different
objects would therefore redirect all references from one object to the other and
delete it — silent document corruption.

The probability per document is astronomically small (hundreds of objects vs. a
2⁶⁴ space), so this is a latent defect, not an active bug. But this code runs on
the shipping optimize path (the app always strips, so `dedup_objects` always
runs), the optimizer's stated job is to be safe on arbitrary user PDFs, and the
fix is tiny: key the grouping map on the bytes themselves, so only genuinely
identical objects can ever share a bucket. After this change the documented
guarantee is true by construction, and the dedup path gains its first unit
tests.

## Current state

- `src-tauri/src/amatl.rs` — the pure-Rust PDF optimizer. Relevant pieces:
  - The `std::hash` import (line 28) — used **only** by `hash_bytes`:
    ```rust
    use std::hash::{DefaultHasher, Hash, Hasher};
    ```
  - `hash_bytes` (lines 371–376) — its only caller is `dedup_objects`:
    ```rust
    /// Hash a byte slice to a u64 using the standard library hasher.
    fn hash_bytes(bytes: &[u8]) -> u64 {
        let mut h = DefaultHasher::new();
        bytes.hash(&mut h);
        h.finish()
    }
    ```
  - `dedup_objects` (lines 415–437, the part that changes) — note it groups by
    `hash_bytes(&bytes)` (a `u64`) and merges every member of a bucket with no
    byte comparison:
    ```rust
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
        // ... (the remap-application code below this point is correct; leave it)
    }
    ```
  - `serialize_object` (lines 360–368) — produces the bytes used as the dedup
    key (a `Debug`-formatted, structurally-deterministic representation; returns
    `None` for streams). **Leave it unchanged.** Its existing comment already
    describes a conservative, structural equality — that is exactly what we want
    the key to be.
  - The doc comment on `dedup_objects` (lines 406–414) already says "Two objects
    are duplicates when their serialized bytes are identical." After this change
    that statement becomes accurate — **leave the doc comment as is** (the code
    was the liar, not the comment).

- `HashMap` (imported at line 27, `use std::collections::HashMap;`) stays — it is
  used throughout the file. Only the `std::hash` import (line 28) is removed.

### Conventions to match

- This is a single-file change in a small, heavily-commented Rust module. Match
  the surrounding comment density and style (see the existing comments inside
  `dedup_objects` and `serialize_object`).
- Tests live in the `#[cfg(test)] mod tests` block at the bottom of the same
  file (`src-tauri/src/amatl.rs`, starting at line 675). New tests go there.
  They use `use super::*;` and `use lopdf::{dictionary, Stream};` (both already
  imported in that block), so `Document`, `Object`, `ObjectId`, `dictionary!`,
  and `dedup_objects` are all in scope. `dedup_objects` is a private fn in the
  same module — call it directly from a test.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 63e4c47..HEAD -- src-tauri/src/amatl.rs` | empty (or you reconcile first) |
| Build + test | `cargo test --manifest-path src-tauri/Cargo.toml` | exit 0, all tests pass |
| Lint (warnings = errors) | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | exit 0, no warnings |

> **Environment note**: the first `cargo` build compiles `mozjpeg`, which builds
> libjpeg-turbo and needs **NASM**, **cmake**, and a **C compiler** on the
> machine. If the build fails with an error about `nasm`, `cmake`, or a missing
> compiler (not a Rust error in `amatl.rs`), that is an environment problem —
> STOP and report it; do not try to work around it by changing code.

## Scope

**In scope** (the only file you should modify):
- `src-tauri/src/amatl.rs`

**Out of scope** (do NOT touch):
- `serialize_object` and the reference-remapping / object-removal code in the
  lower half of `dedup_objects` (lines 439–466) — they are correct.
- `src-tauri/src/lib.rs`, `src-tauri/src/AGENTS.md`, any TypeScript, any other
  Rust function. The behavior of every other function is unchanged.

## Git workflow

- Branch: `advisor/009-dedup-byte-comparison` (matches the convention of plans
  001–008). The maintainer may instead commit directly to `main` per repo
  preference — do NOT push or open a PR unless explicitly instructed.
- Commit style: conventional commits, matching `git log` (e.g.
  `fix(amatl): dedup only on exact byte match, not hash bucket`).

## Steps

### Step 1: Key the dedup map on the serialized bytes, not their hash

In `dedup_objects`, replace the grouping map and its fill loop, and the loop
that iterates it, so the key is the serialized bytes (`Vec<u8>`) instead of a
`u64` hash. The merge logic below is unchanged. Target shape:

```rust
fn dedup_objects(doc: &mut Document) {
    // Group non-stream objects by their exact serialized bytes. Keying the map
    // on the bytes themselves (not a 64-bit hash of them) means only genuinely
    // identical objects ever share a bucket, so a hash collision can never
    // cause two different objects to be merged.
    let mut by_bytes: HashMap<Vec<u8>, Vec<ObjectId>> = HashMap::new();
    for (&id, obj) in doc.objects.iter() {
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

    // ... leave everything from `if remap.is_empty()` onward exactly as it is.
}
```

**Verify**: `cargo test --manifest-path src-tauri/Cargo.toml` → exit 0 (existing
tests still pass). It will NOT yet be clippy-clean — `hash_bytes` is now unused;
fix that in Step 2 before running clippy.

### Step 2: Remove the now-dead `hash_bytes` and its import

`hash_bytes` (lines 371–376) had exactly one caller, which Step 1 removed.
Delete the whole `hash_bytes` function (including its `///` doc line). Then
delete the now-unused import on line 28:

```rust
use std::hash::{DefaultHasher, Hash, Hasher};   // delete this entire line
```

Leave `use std::collections::HashMap;` (line 27) — still used.

**Verify**: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
→ exit 0, no warnings (no "unused import", no "function is never used").

### Step 3: Add dedup unit tests

Add these two tests to the `#[cfg(test)] mod tests` block at the bottom of
`src-tauri/src/amatl.rs` (paste them alongside the existing tests):

```rust
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
    assert_ne!(first, second, "distinct objects must keep distinct references");
}
```

**Verify**: `cargo test --manifest-path src-tauri/Cargo.toml` → exit 0; the
output lists `dedup_merges_identical_objects` and `dedup_keeps_distinct_objects`
as passing.

## Test plan

- New tests (both in `src-tauri/src/amatl.rs`, `mod tests`):
  - `dedup_merges_identical_objects` — happy path: identical objects collapse to
    one and references are redirected.
  - `dedup_keeps_distinct_objects` — guard: objects differing by one value are
    left alone.
- Structural pattern to follow: the existing tests in the same `mod tests` block
  (e.g. `downsamples_over_resolution_image`) for how to build `Document`s with
  `dictionary!` / `add_object`.
- The pure collision case (two *different* objects with the *same* 64-bit hash)
  cannot be constructed deterministically in a unit test — and it no longer
  needs to be: after Step 1 the bucket key **is** the bytes, so the collision
  path the old code had is gone by construction. The two tests above guard the
  merge / no-merge behavior that the change must preserve.
- Verification: `cargo test --manifest-path src-tauri/Cargo.toml` → all pass,
  including the 2 new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` exits 0; the 2 new
      dedup tests appear in the output and pass.
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
      exits 0 with no warnings.
- [ ] `grep -n "hash_bytes" src-tauri/src/amatl.rs` returns no matches.
- [ ] `grep -n "by_hash" src-tauri/src/amatl.rs` returns no matches.
- [ ] `grep -n "std::hash" src-tauri/src/amatl.rs` returns no matches.
- [ ] `git status` shows only `src-tauri/src/amatl.rs` modified (plus
      `plans/README.md` for the status update).
- [ ] `plans/README.md` status row for 009 updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The `dedup_objects`, `hash_bytes`, or `serialize_object` code does not match
  the "Current state" excerpts (the file drifted since this plan was written).
- `cargo` fails to build because of a missing `nasm`/`cmake`/C compiler (an
  environment problem, not a code problem — see the environment note).
- After Step 1, removing `hash_bytes` reveals it had a *second* caller you did
  not expect (it should have only one). Do not delete a function that is still
  used.
- Clippy reports a warning you cannot resolve without touching an out-of-scope
  file or changing behavior.

## Maintenance notes

- For the reviewer: confirm the merge logic from `if remap.is_empty()` onward
  (lines 439–466 pre-change) is byte-for-byte unchanged — only the bucket key
  type and the dead `hash_bytes`/import should differ in the diff.
- `serialize_object` keys dedup on a `Debug`-formatted representation. That is a
  conservative *structural* equality: two objects are merged only if they print
  identically, which for `lopdf::Object` means same variant and same contents.
  This is intentionally safe (it can under-merge — e.g. differing key order —
  but never over-merge). If `serialize_object` is ever changed to a real
  canonical serializer, re-confirm it still cannot map two semantically
  different objects to the same bytes.
- Memory cost: the grouping map now holds the serialized bytes as keys instead
  of `u64`s. For this app's input shape (a couple hundred small non-stream
  objects per PDF) that is negligible. If amatl is ever pointed at
  pathologically object-dense PDFs and this map's memory matters, revisit (a
  two-level map keyed by hash, then by exact bytes within a bucket, would be the
  collision-safe optimization — but do not pre-optimize for it now).