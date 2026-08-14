# Plan 019: Add pre-commit enforcement of the documented quality gate

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- package.json AGENTS.md`
> If either file changed since this plan was written, compare the "Current
> state" excerpts below against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW-MED
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

AGENTS.md instructs "Before committing, run `npm run typecheck && npm run
lint && npm test`" but there is no `.husky/`, no `lint-staged` config, no
`.pre-commit*`, and no `prepare`/postinstall hook in package.json. CI
(`ci.yml`) enforces the gate later, but every local commit depends on the
author remembering a 3-command ritual — and the two-pass typecheck
(`tsc --noEmit && tsc -p tsconfig.test.json`) is exactly the failure mode
that slips through: a change passing app-only typecheck breaks the test
project and vice versa. Cost: CI round-trips per trivial commit.

## Current state

- `AGENTS.md` documents the gate (Commands table + "Before committing, run
  `npm run typecheck && npm run lint && npm test`").
- No `.husky/` directory, no `lint-staged` in package.json, no
  `.pre-commit*` files (verified by directory listing).
- `package.json` has no `prepare` script.
- CI (`ci.yml`) runs typecheck + lint + test on every push/PR.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm install -D husky lint-staged` | exit 0 |
| Init hook | `npx husky init` (husky v9)   | creates .husky/pre-commit |
| Typecheck | `npm run typecheck`           | exit 0, no errors   |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `package.json` — devDeps (husky, lint-staged) + `prepare` script +
  `lint-staged` config
- `.husky/pre-commit` — the hook
- `AGENTS.md` — note that the gate is now enforced automatically
- `package-lock.json` — dep install

**Out of scope** (do NOT touch, even though they look related):
- The CI workflows — they already run the full gate; the hook is local DX.
- The quality commands themselves — don't change what the gate runs.
- Any `.pre-commit-config.yaml` (that's pre-commit framework, different
  tool — this plan uses husky + lint-staged, matching the repo's npm
  ecosystem).

## Git workflow

- Branch: `advisor/019-precommit-hooks`
- Commit style: conventional commits, e.g.
  `chore(dx): add husky + lint-staged pre-commit gate`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install husky and lint-staged

`npm install -D husky lint-staged` → exit 0.

**Verify**: `grep -n "husky\|lint-staged" package.json` shows both devDeps.

### Step 2: Initialize the hook

`npx husky init` (husky v9 creates `.husky/pre-commit`). If it doesn't
create the file, create it manually:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

`chmod +x .husky/pre-commit` (husky init usually does this).

**Verify**: `ls .husky/` shows `pre-commit` (+ `_` dir); `git config core.hooksPath` shows `.husky` (or the hook fires).

### Step 3: Configure lint-staged in package.json

Add a `lint-staged` config that runs the fast staged-only checks. The
two-pass typecheck is the tricky part — `tsc --noEmit` is project-wide (not
staged-file-friendly), so run it as a whole-project check but keep it fast
(tsc is incremental-ish; on a repo this size it's seconds). Config:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "tsc --noEmit",
    "tsc -p tsconfig.test.json --noEmit"
  ],
  "*.{js,json,css,md}": ["prettier --write"]
}
```

(Adjust to the repo's actual prettier config — check `.prettierrc.json` and
the `format` script's globs.) Keep `npm test` OUT of the hook (it's slow);
CI runs it. The hook is the fast gate: lint + both typecheck passes.

**Verify**: `npx lint-staged` runs without error on a staged file (test with
a trivial staged change or `--dry-run`).

### Step 4: Add the `prepare` script

In `package.json` scripts: `"prepare": "husky"` (husky v9's shorthand that
installs hooks on `npm install`).

**Verify**: `npm run prepare` (or re-running `npm install`) completes and
`.husky/_/husky.sh` exists.

### Step 5: Update AGENTS.md

Add a line to the Commands/quality section: the gate is now enforced by the
pre-commit hook (lint + typecheck on staged files); full `npm test` still
runs in CI and should be run locally before pushing.

**Verify**: `grep -n "pre-commit\|husky" AGENTS.md` shows the note.

## Test plan

- No new tests — this is tooling. Verification: make a trivial staged
  change (e.g. add a comment to a `.ts` file), `git commit`, and confirm
  the hook runs eslint + both typecheck passes before committing.
- Negative test (optional): stage a file with a lint error and confirm the
  commit is blocked.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ls .husky/` shows `pre-commit`
- [ ] `grep -n '"prepare"' package.json` shows `"prepare": "husky"`
- [ ] `grep -n "lint-staged" package.json` shows the config
- [ ] A `git commit` with a staged change runs the hook (observe the
      lint-staged output)
- [ ] `npm run typecheck` exits 0 (nothing broken by the tooling)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 019 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Running `tsc --noEmit` twice in the hook makes commits unbearably slow
  (>30s) — report the measured time and propose keeping only eslint in the
  hook (CI keeps the typecheck gate).
- husky v9's `husky init` fails on this machine (git hooks path issues) —
  report the error rather than hand-editing `.git/config`.
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The hook is the fast local gate; CI remains the authority (it runs the
  full suite including `npm test`). Keep them in sync — if the quality gate
  grows (e.g. `npm audit`), add it to both.
- The two-pass typecheck is the load-bearing part: app-only `tsc` passing
  while the test project fails is the exact slip the hook catches.
- When the repo moves to a different package manager or CI system, re-check
  the hook wiring (husky is npm-centric).
