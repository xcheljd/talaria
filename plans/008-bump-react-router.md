# Plan 008: Bump react-router-dom out of the known-vulnerable range; run `npm audit fix`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- package.json package-lock.json`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security / deps
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

`package-lock.json` resolves `react-router-dom` and `react-router` to
**7.18.1** — inside GHSA-qwww-vcr4-c8h2 (affects 7.12.0–7.18.1). The advisory
targets React Router's server/RSC mode; this app is a client-only SPA with
no server actions, so reachability is low. But the runtime router dependency
should not sit in a known-vulnerable range when a fixed release exists.

`npm audit --audit-level=high` also reports `nanoid@3.3.16` (via `postcss`,
build-time CSS) and `brace-expansion@5.0.8` (via `minimatch`, build tooling)
as high — both build-time only, but `npm audit fix` can usually clear them
without touching runtime behavior.

## Current state

`package.json` declares the router dep (verify the exact range — likely
`^7.13.2` per the lockfile history or a newer `^7.x`). The lockfile resolves
to 7.18.1:

```
"node_modules/react-router-dom": { "version": "7.18.1", ... }
"node_modules/react-router": { "version": "7.18.1", ... }
```

Run `npm audit --audit-level=high` first to see the current advisory set;
the exact set may have changed since this plan was written.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Audit     | `npm audit --audit-level=high` | no high/critical advisories (after fix) |
| Install   | `npm install react-router-dom@^7.19.0` (or latest fixed 7.x per audit) | exit 0 |
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `package.json` / `package-lock.json` — dependency bumps
- No source code changes expected; if the router bump requires code changes,
  that is a STOP condition (report instead).

**Out of scope** (do NOT touch, even though they look related):
- The Rust side (`cargo audit` is not installed; do not install it).
- Any source change to route definitions.
- Dependency upgrades beyond the audit findings.

## Git workflow

- Branch: `advisor/008-bump-react-router`
- Commit style: conventional commits, e.g.
  `chore(deps): bump react-router-dom to patched 7.x`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Record the current advisory state

Run `npm audit --audit-level=high` and capture the output. Note the exact
advisories and their fix versions.

**Verify**: command runs and prints the advisory list (or "found 0" if
already clean — in which case STOP and report, the plan may be unnecessary).

### Step 2: Bump react-router-dom

`npm install react-router-dom@<fixed-version>` where `<fixed-version>` is the
latest 7.x that resolves the advisory (check `npm audit` output or
`npm view react-router-dom versions`). This updates both `react-router-dom`
and its `react-router` dependency.

**Verify**: `npm audit --audit-level=high` no longer lists the react-router
advisory.

### Step 3: Fix the build-time transitive advisories

Run `npm audit fix` (non-breaking only) to clear `nanoid`/`brace-expansion`
if it can. If `npm audit fix` would make breaking changes, run
`npm audit fix --dry-run` first and inspect; do NOT apply breaking upgrades
without operator approval — report instead.

**Verify**: `npm audit --audit-level=high` → "found 0" (or only
non-fixable-without-breaking items, reported).

### Step 4: Verify the app still works

`npm run typecheck && npm run lint && npm test` → all pass. If the router
bump changed behavior (e.g. redirect semantics), the route tests in
`tests/` will catch it.

**Verify**: all three commands exit 0.

## Test plan

- No new tests — this is a dependency bump. The existing suite
  (`tests/*.test.tsx`, including any router-dependent tests like
  `tests/cross-page-integration.test.tsx`) is the regression gate.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm audit --audit-level=high` exits 0 with "found 0" (or only
      reported non-fixable items)
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0
- [ ] `grep -A2 '"node_modules/react-router-dom"' package-lock.json` shows a
      version outside the vulnerable range (> 7.18.1)
- [ ] Only `package.json` / `package-lock.json` modified (`git status`)
- [ ] `plans/README.md` status row for 008 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The router bump requires source code changes (route definitions, redirect
  behavior) — report the required change instead of making it.
- `npm audit fix` wants to apply breaking upgrades to other packages —
  report the dry-run output.
- A verification fails twice after a reasonable fix attempt.
- `npm audit` reports advisories this plan doesn't cover (different
  packages) — add them to the report, don't silently fix.

## Maintenance notes

- This app is client-only; the react-router advisory's RSC/server-mode
  trigger doesn't apply. The bump is hygiene, not an active exploit.
- After this lands, `npm audit` should be clean at `--audit-level=high`;
  keep it that way by running `npm audit` in CI or locally before merges
  (plan 009 adds coverage to CI; audit could ride along).
- Pin philosophy: the repo uses `^` ranges; keep the router on `^` so future
  patches are picked up by `npm ci` lockfile refreshes.
