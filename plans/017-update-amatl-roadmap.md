# Plan 017: Update amatl-roadmap §9/§10 (const→options delta already shipped)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- docs/amatl-roadmap.md src-tauri/src/amatl.rs`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

`docs/amatl-roadmap.md` §9/§10 describe a blocker that is already merged.
§9.1 lists "Promote `TARGET_DPI` / `JPEG_QUALITY` / `DPI_MARGIN` … from
`const`s to `OptimizeOptions` fields — unblocks the CLI" and §10 Phase 2
says "the `const`→`options` change plus a thin CLI". That change is in main:
`OptimizeOptions` now has `target_dpi`, `jpeg_quality`, `dpi_margin` with
`#[non_exhaustive]` + builder setters (commits 9a68bd3, b7f0cf9). The
roadmap was added in 99ad13b (rebrand) and never updated; the 51fcd21 docs
pass marked plans/001+002 DONE but didn't touch the roadmap. The
maintainer's own operating doc overstates the remaining work before the
north star (crate + CLI).

## Current state

`docs/amatl-roadmap.md` §9 "Concrete code deltas extraction requires":

```
1. Promote `TARGET_DPI` / `JPEG_QUALITY` / `DPI_MARGIN` (`amatl.rs:34–39`) from
   `const`s to `OptimizeOptions` fields — unblocks the CLI and general use.
2. Drop the `#[allow(dead_code)]` on `optimize()` — it becomes a real public
   entry point once Amatl is a library.
...
```

§10 "Recommended sequence" Phase 2:

```
2. **Phase 2 CLI** — the `const`→`options` change plus a thin CLI; the artifact
   most people can actually run.
```

Live code (`src-tauri/src/amatl.rs`): the consts are still defined at
`:35` but now feed the manual `Default` impl (`:110-120`); the struct is
`#[non_exhaustive]` with `with_target_dpi`/`with_jpeg_quality`/
`with_dpi_margin` builders (`:76`, `:136`); `#[allow(dead_code)]` is still
present on `optimize()` (`:132`, `:177-178`) with a comment saying "Remove
this attribute once amatl is extracted".

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| No-op check | `git diff --stat`           | only docs/amatl-roadmap.md modified |
| (Optional) Rust verify | `grep -n "with_target_dpi\|non_exhaustive" src-tauri/src/amatl.rs` | shows the shipped API |

## Scope

**In scope** (the only files you should modify):
- `docs/amatl-roadmap.md` — §9 and §10 (and any other section that
  references the const→options delta as future work)

**Out of scope** (do NOT touch, even though they look related):
- `src-tauri/src/amatl.rs` — the code is already shipped; no code changes.
- `plans/001` / `plans/002` — already DONE.
- The roadmap's broader strategy (§1-8, §11) — only the stale deltas.

## Git workflow

- Branch: `advisor/017-update-amatl-roadmap`
- Commit style: conventional commits, e.g.
  `docs(amatl): mark the tunables delta as shipped in the roadmap`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Verify the shipped state

Run `grep -n "with_target_dpi\|non_exhaustive" src-tauri/src/amatl.rs` and
confirm the builder methods + attribute exist. Also confirm
`#[allow(dead_code)]` is still present on `optimize()`.

**Verify**: both greps show the expected matches.

### Step 2: Update §9

Edit the deltas list:
- Strike item 1 (done) — replace with a note that it shipped in
  9a68bd3/b7f0cf9 (plans/001+002).
- Keep item 2 (`#[allow(dead_code)]` on `optimize()` — still true; its
  comment already says "Remove once extracted").
- Renumber items 3-5 → 2-4.
- If §9 has a framing line like "For reference when Phase 1/2 begins",
  update it to "Items 2-4 remain; item 1 shipped".

**Verify**: `grep -n "const" docs/amatl-roadmap.md` no longer shows item 1
as a pending delta (only historical references or the Default-impl note).

### Step 3: Update §10

In the "Recommended sequence", Phase 2's `const`→`options` mention should
become "the tunables are already in `OptimizeOptions` (9a68bd3) — the CLI
is now just a thin binary over `optimize_with_options`".

**Verify**: `grep -n "const.*options\|const→options" docs/amatl-roadmap.md`
returns no pending-work phrasing.

## Test plan

- No tests — documentation change.
- The verification is the grep checks above.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "from .const.s to" docs/amatl-roadmap.md` returns no matches
      (or only historical/"-ed" phrasing)
- [ ] The roadmap notes that the tunables shipped (9a68bd3 / plans/001+002)
- [ ] `#[allow(dead_code)]` item remains listed as pending (it is still true)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 017 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The roadmap file has drifted significantly (a rewrite, not just §9/§10
  edits) — report the new structure.
- The shipped-state grep doesn't match (e.g. the builders were reverted) —
  STOP and report; the roadmap may actually be right.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- This doc is the operator's north-star planning artifact; after this fix
  it accurately reflects that the code-side extraction work is done and
  only packaging (repo creation, README, licenses, CI port) remains.
- When extraction actually happens, update §5/§6 to record the new repo
  location and the app's dependency switch.
- Direction finding DIR-01 (audit) says extraction is one decision away —
  this doc fix is the precondition for that decision to be made on accurate
  information.
