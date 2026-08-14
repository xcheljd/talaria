# Plan 020: Cache Playwright browsers in CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 02050dd..HEAD -- .github/workflows/ci.yml`
> If the in-scope file changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on
> a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `02050dd`, 2026-08-14

## Why this matters

The CI e2e job re-downloads Playwright browsers on every run. `ci.yml` has
`npx playwright install --with-deps` with only the npm cache configured
(`setup-node cache: npm`) — no cache for `~/.cache/ms-playwright`. That's a
~150MB+ browser download per run, on top of `--with-deps` apt installs,
before a single test executes. The repo otherwise optimizes its feedback
loop well (path-filtered rust.yml, cached npm); the e2e job is the
exception.

## Current state

`.github/workflows/ci.yml` e2e job (~lines 36-58):

```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout repository
      uses: actions/checkout@v5
    - name: Setup Node.js
      uses: actions/setup-node@v6
      with:
        node-version: '24'
        cache: 'npm'
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
    - name: Run E2E tests
      run: npm run test:e2e
    - name: Upload Playwright report
      if: ${{ !cancelled() }}
      uses: actions/upload-artifact@v7
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 7
```

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Version   | `grep '"@playwright/test"' package.json` | the Playwright version |
| (Optional) Local verify | `npx playwright install --dry-run` (if supported) or `ls ~/.cache/ms-playwright` | browsers present locally |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/ci.yml` — add a cache step for the Playwright browser
  directory in the e2e job

**Out of scope** (do NOT touch, even though they look related):
- The `--with-deps` apt install — still needed on cache miss; don't remove it.
- Other workflows (build.yml has its own e2e? verify — if yes, apply the
  same cache there only if the operator asks; this plan scopes to ci.yml).
- The e2e tests themselves (plan 021 owns test changes).

## Git workflow

- Branch: `advisor/020-cache-playwright`
- Commit style: conventional commits, e.g.
  `ci: cache Playwright browsers in the e2e job`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the Playwright version and browser path

Playwright stores browsers in `~/.cache/ms-playwright` on Linux runners.
The cache key should change when the Playwright version changes (browsers
are version-matched). Read the current `@playwright/test` version from
package.json/lockfile.

**Verify**: you know the version to key the cache on.

### Step 2: Add the cache step

Insert a cache step in the e2e job between `npm ci` and the
`playwright install` step (or between setup-node and install — order
doesn't matter as long as it's before the install step that uses the
cache):

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-playwright-
```

Keying on `package-lock.json` means any Playwright version bump (which
changes the lockfile) invalidates the cache automatically. The `restore-keys`
fallback lets unrelated lockfile churn still hit a recent cache.

**Verify**: the YAML is valid (parse mentally or with a YAML linter);
`grep -n "Cache Playwright" .github/workflows/ci.yml` shows the step.

### Step 3: (Optional) Verify the workflow parses

If `actionlint` is available (`actionlint` on PATH or via `npx`), run it on
the workflow; otherwise rely on YAML validity and the fact that CI will
parse it on the next push.

**Verify**: no syntax errors.

## Test plan

- No code tests — CI config change. Verification is the next CI e2e run
  showing a cache hit (the `Cache Playwright browsers` step reports
  "Cache restored from key" instead of "Save cache").
- Note in the PR/commit: "next e2e run should show cache hit on
  `~/.cache/ms-playwright`".

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "Cache Playwright" .github/workflows/ci.yml` shows the step
- [ ] `grep -n "ms-playwright" .github/workflows/ci.yml` shows the cache
      path
- [ ] The cache key includes a hash of `package-lock.json` (so version
      bumps invalidate)
- [ ] The `npx playwright install --with-deps` step is still present (cache
      miss path still works)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 020 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The e2e job's browser install uses a different mechanism than
  `npx playwright install --with-deps` (e.g. a Docker container or a
  `playwright/*` service image) — the cache approach may not apply; report
  the actual mechanism.
- `actions/cache@v4` is not available in the repo's pinned-action style
  (the repo pins action SHAs per the audit — match the pinning convention;
  if you cannot resolve the pinned SHA for actions/cache, report it).
- A verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Keep the cache key tied to `package-lock.json`; a Playwright version bump
  changes the lockfile and invalidates — never hand-maintain the key.
- `--with-deps` still runs on every job (apt deps aren't cached by this
  step); that's fine — the browser download was the dominant cost.
- If the repo later pins actions by SHA (audit noted `build.yml` pins SHAs),
  match that convention when adding the cache action.
