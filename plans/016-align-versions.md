# Plan 016: Align CHANGELOG/manifest versions (1.5.0 or Unreleased)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- package.json src-tauri/Cargo.toml docs/CHANGELOG.md`
> If any file changed since this plan was written, compare the "Current
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

Version drift: `docs/CHANGELOG.md:5` has `## [1.5.0] - 2026-08-14` (added by
the 51fcd21 docs pass), but `package.json` and `src-tauri/Cargo.toml` are
both still at **1.4.0**. The last manifest bump commit is fc25bcc ("bump
desktop app version to 1.4.0"). Either the manifests are overdue for a 1.5.0
bump (the changelog describes real shipped changes — amatl tunables,
rebrand, perf pass), or the changelog entry is a pre-release note in the
wrong place. Version drift between docs and manifests is exactly the class
of staleness the docs pass was fixing.

## Current state

`docs/CHANGELOG.md:5`:

```markdown
## [1.5.0] - 2026-08-14
```

`package.json`:

```json
"version": "1.4.0",
```

`src-tauri/Cargo.toml`:

```toml
version = "1.4.0"
```

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test`                    | all pass            |
| Rust check| `cargo check --manifest-path src-tauri/Cargo.toml` | exit 0 (if touched) |
| No-op check | `git diff --stat`           | only the intended files |

## Scope

**In scope** (the only files you should modify):
- `package.json` — version bump (if the decision is 1.5.0)
- `src-tauri/Cargo.toml` — version bump (if the decision is 1.5.0; also
  check `Cargo.lock` for the crate version if present)
- `docs/CHANGELOG.md` — re-label the entry if the decision is Unreleased

**Out of scope** (do NOT touch, even though they look related):
- `src-tauri/tauri.conf.json` — the app's `version` field may mirror the
  Cargo version; check and bump it ONLY if it is separate and the product
  version is being bumped (verify first — Tauri config may read from
  Cargo.toml).
- The changelog's content — already written; only the version label moves.

## Git workflow

- Branch: `advisor/016-align-versions`
- Commit style: conventional commits, e.g.
  `chore(release): bump version to 1.5.0` (or `docs(changelog): mark 1.5.0 as Unreleased`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Decide the direction — check with the operator first

This plan has two valid endings:
- **A: The 1.5.0 entry is real** → bump `package.json` and
  `src-tauri/Cargo.toml` to `1.5.0` (and `tauri.conf.json` if it holds a
  separate version).
- **B: 1.5.0 hasn't shipped yet** → rename the changelog section to
  `## [Unreleased]` until the bump lands.

The audit's default recommendation is A (the changelog describes shipped
work: rebrand + amatl + perf all landed on main). But version semantics are
the operator's call. **Ask the operator which direction, or if unreachable,
choose A** (bump to match the documented release) and note the decision in
your summary.

### Step 2: Apply the version change

If A: edit `package.json` (`"version": "1.5.0"`), `src-tauri/Cargo.toml`
(`version = "1.5.0"`), and `src-tauri/tauri.conf.json` if it has a separate
`version` field. Also update the `Cargo.lock` package version if the lockfile
records it (check `grep -A1 'name = "talaria"' src-tauri/Cargo.lock`).

If B: edit `docs/CHANGELOG.md:5` to `## [Unreleased]`.

**Verify**: `grep '"version"' package.json` shows the new version; the
Cargo.toml line matches.

### Step 3: Verify nothing breaks

`npm run typecheck && npm test` → all pass. If the Cargo version changed,
`cargo check --manifest-path src-tauri/Cargo.toml` → exit 0.

**Verify**: all commands exit 0.

## Test plan

- No new tests — version metadata change.
- The suite passing confirms no code depends on the version string.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep '"version"' package.json` and `grep '^version' src-tauri/Cargo.toml`
      agree with each other AND with `docs/CHANGELOG.md` (either both 1.5.0
      with a dated section, or both 1.4.0 with an `[Unreleased]` section)
- [ ] `npm run typecheck` exits 0
- [ ] `npm test` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 016 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- You find a third version field that should change (e.g. a separate
  `version` in `tauri.conf.json`, an installer metadata field) and are
  unsure whether it mirrors Cargo.toml — report it instead of guessing.
- A build/test fails because a version string is asserted somewhere (e.g. a
  test checks the manifest version) — report the assertion.
- The operator cannot be reached and direction B seems more correct than A
  (e.g. the 1.5.0 changes are not actually all merged) — STOP and report.

## Maintenance notes

- Going forward: bump the manifests in the same commit that adds the
  changelog entry, so they can't drift again.
- The changelog's 1.5.0 entry content (from 51fcd21) is accurate to the git
  history — the only question is whether it's shipped (A) or pending (B).
- When the version is bumped, update the Tauri bundle version too if the
  desktop installer displays it (check `tauri.conf.json` `bundle.version`
  or whether it reads `package.json`/`Cargo.toml`).
