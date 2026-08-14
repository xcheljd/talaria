# Plan 015: Rewrite `features.md` to match current stack and product

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- features.md .github/workflows/build.yml`
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

`features.md` — the "what this app does" doc, linked from CI comments
(`build.yml:54` references "see features.md") — is actively wrong about the
stack and the product:

- `features.md:172` says "**Electron Integration**: Native desktop app
  packaging" — the app is **Tauri 2** (`src-tauri/Cargo.toml`, README,
  ARCHITECTURE-MAP).
- `features.md:208` says "Built specifically for watch store operations" —
  the brand-agnostic rebrand (CHANGELOG 1.5.0: "no hardcoded brand
  assumptions") directly contradicts this.
- `features.md:50/189` describe watch collections and "Multi-page Support" —
  the app is a single-page React app.

Worse than missing: it contradicts the freshly-shipped rebrand. Anyone
reading it — including the maintainer months out, or a potential
template-pack buyer — gets the stack and positioning wrong.

## Current state

The file is at the repo root: `features.md`. The 51fcd21 docs pass (2026-08-14)
fixed 5 files (README, docs/ARCHITECTURE-MAP.md, docs/CHANGELOG.md,
docs/SIGNATURE-FORMAT.md, plans/README.md) but missed this one. The
authoritative current facts are in `README.md`, `docs/ARCHITECTURE-MAP.md`,
`package.json`, and `src-tauri/Cargo.toml`.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors (doc-only, should be unaffected) |
| No-op check | `git diff --stat`           | only features.md (+ build.yml if you update the link) |

## Scope

**In scope** (the only files you should modify):
- `features.md` — rewrite against the current stack/product
- `.github/workflows/build.yml:54` — update the comment link if it points at
  a stale commit hash or framing

**Out of scope** (do NOT touch, even though they look related):
- `README.md`, `docs/README.md` — already current; don't restructure.
- The product itself — this is a doc fix only.

## Git workflow

- Branch: `advisor/015-rewrite-features-md`
- Commit style: conventional commits, e.g.
  `docs(features): align with current stack and brand-agnostic product`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read the current `features.md` and the authoritative sources

Read `features.md` in full, then `README.md` (root) and
`docs/ARCHITECTURE-MAP.md` §1-4 for the current stack/routes/features.

**Verify**: you can list the current stack (React 19, TS strict, Vite 8,
Tailwind v4, shadcn/ui, TipTap, Zustand, React Router 7, Zod+RHF, Tauri 2)
and the current feature set.

### Step 2: Rewrite the file

Rewrite `features.md` to match reality:

- **Stack**: React 19 SPA + Tauri 2 desktop shell (NOT Electron; no
  multi-page; no vanilla JS).
- **Product positioning**: brand-agnostic campaign email and
  customer-communication template generator — "any brand can make it its
  own" (match README's framing). Keep the actual feature bullets that are
  still true (template system, promotion builder, PDF attachments, bulk
  BCC, version history, accessibility/Outlook checkers, theme system,
  export/import).
- **Structure**: keep the same general shape (features by area) so the file
  stays scannable, but fix every claim that's wrong.
- If you keep the "watch store" line, reframe it as "works for any
  retail/store business" — or drop it.

**Verify**: `grep -in "electron\|watch store\|multi-page\|vanilla" features.md`
→ no matches (or only clearly-false references removed).

### Step 3: Update the CI comment link (if needed)

Check `build.yml:54` — if the comment references `features.md` and a commit
hash, keep the file reference (it's now accurate) and leave the hash or
update it to `HEAD` if it points at the old content's commit.

**Verify**: `grep -n "features.md" .github/workflows/build.yml` shows the
reference.

## Test plan

- No tests — documentation change. The quality gate is the grep checks in
  Done criteria.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -in "electron" features.md` returns no matches (or only a
      negated "not Electron" note)
- [ ] `grep -in "watch store" features.md` returns no matches (or only
      brand-agnostic phrasing)
- [ ] `grep -in "Tauri" features.md` shows the desktop-shell technology
- [ ] `grep -in "brand" features.md` shows the brand-agnostic positioning
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 015 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `features.md` has content you can't verify against README/ARCHITECTURE-MAP
  (e.g. a feature that exists in the doc but no code) — report the
  discrepancy rather than asserting it's real.
- The file is referenced elsewhere (e.g. docs index, CI) in a way that a
  rewrite would break — report the references.

## Maintenance notes

- `features.md` is the marketing-adjacent overview; keep it in sync with
  README when the product changes. If it keeps drifting, consider deleting
  it and pointing everything at README.md (one source of truth).
- The 51fcd21 docs pass should have caught this file; it's now the standing
  reminder that "docs touched last" includes root-level feature docs.
