---
name: Simplify & Harden CI

description: "Automated code quality and security review on pull requests"

on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - "src/**"
      - "src-tauri/src/**"
  workflow_dispatch:

engine: claude

permissions:
  contents: read

timeout-minutes: 15

tools:
  github:
    toolsets: [repos]

safe-outputs:
  add-comment:
    max: 1
---

# Simplify & Harden CI

Run Simplify & Harden in CI (headless mode) for this pull request.

## Context

You are reviewing a pull request in the **Communication Template Generator** project — a multi-page web application for generating customer communication templates (emails, text messages, phone orders). Built as a Vite-based SPA with a Tauri desktop shell.

## Instructions

1. Determine the changed files by running:
   ```bash
   git diff --name-only ${{ github.event.pull_request.base.sha }}...${{ github.event.pull_request.head.sha }} -- src/ src-tauri/src/
   ```

2. If no relevant files changed, post a comment: "No reviewable changes in scope (src/, src-tauri/src/)." and exit successfully.

3. Read every changed file. Re-read all changed code with "fresh eyes" and actively look for obvious bugs, errors, confusing logic, brittle assumptions, naming issues, and missed hardening opportunities.

4. Run the **Simplify** pass on each changed file:
   - Detect dead code, naming clarity issues, control-flow complexity, unnecessary API surface, and over-abstraction.

5. Run the **Harden** pass on each changed file:
   - Detect input-validation gaps, injection vectors (XSS, HTML injection), auth/authz issues, secret exposure, data leaks, and concurrency risks.
   - Classify each harden finding as **critical** or **advisory**.

6. Run the **Document** pass on each changed file:
   - Suggest non-obvious rationale comments as findings (do not edit files).

7. Post a PR comment with a formatted summary of all findings, ordered by severity (critical → advisory → simplify → document).

## Rules

1. Review only files changed in this PR.
2. Do not modify repository files.
3. Emit structured findings as part of the PR comment under a summary section.

## Project-Specific Checks

- **XSS Prevention**: Verify all user input is sanitized via `sanitizeHTML()` and `escapeAttr()` from `templates.js`.
- **Profile Data Access**: Check that code uses helper functions (`getStorePhone()`, `getStoreName()`, etc.) instead of direct localStorage access.
- **EML Files**: Verify CRLF line endings (`\r\n`) and proper RFC 5322/2045 compliance.
- **IndexedDB**: Check proper usage of `db.js` functions for PDF storage.
- **Secrets/Credentials**: Ensure no API keys, tokens, or sensitive data are committed.

## Output Format

Post a PR comment with the following structure:

```
## Simplify & Harden CI Review

### Summary
- Files reviewed: <count>
- Critical findings: <count>
- Advisory findings: <count>
- Simplify suggestions: <count>
- Document suggestions: <count>

### Critical
| File | Line | Finding | Remediation |
|------|------|---------|-------------|
| ... | ... | ... | ... |

### Advisory
| File | Line | Finding | Remediation |
|------|------|---------|-------------|
| ... | ... | ... | ... |

### Simplify
| File | Line | Finding | Suggestion |
|------|------|---------|------------|
| ... | ... | ... | ... |

### Document
| File | Line | Suggested Comment |
|------|------|-------------------|
| ... | ... | ... |

### Review Follow-up Required: <Yes/No>
```
