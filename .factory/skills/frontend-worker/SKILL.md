---
name: frontend-worker
description: React + shadcn/ui + TipTap frontend worker for newsletter card feature
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

All features in the Newsletter Card mission: TipTap editor integration, Zustand store updates, email HTML generation, import/export, and UI polish.

## Required Skills

None. All work is done with file editing tools, shell commands (npm, npx, vitest), and optionally agent-browser for visual verification.

## Work Procedure

### 1. Read Mission Context
Read these files before starting any work:
- `/home/x/.factory/missions/d82c42ae-e9e1-4f92-82da-21d692cf42e2/mission.md` -- mission proposal and goals
- `/home/x/.factory/missions/d82c42ae-e9e1-4f92-82da-21d692cf42e2/AGENTS.md` -- boundaries, conventions, TipTap setup, store fields
- `/home/x/.factory/missions/d82c42ae-e9e1-4f92-82da-21d692cf42e2/features.json` -- your assigned feature (first pending)
- `.factory/library/architecture.md` -- system architecture
- `.factory/library/user-testing.md` -- testing surface info
- `.factory/services.yaml` -- available commands and services
- `.factory/research/tiptap-research.md` -- TipTap integration research

### 2. Run Init
Run `.factory/init.sh` to install dependencies (includes TipTap packages). Kill any existing dev server before starting work.

### 3. Run Baseline Tests
```bash
npx vitest run 2>&1
npx tsc --noEmit 2>&1
```
If tests fail, note the failures but continue.

### 4. Study Existing Patterns Before Implementing

Before writing new code, read these files to understand existing patterns:
- `src/stores/promotion-store.ts` -- Zustand store patterns (state, actions, persistence)
- `src/lib/promotion-email-html.ts` -- email HTML generation (section ordering, inline styles)
- `src/components/promotion/FormattableItemEditor.tsx` -- reusable editor pattern
- `src/components/promotion/CollapsibleCard.tsx` -- card component API (hasContent, forceExpand, onToggle)
- `src/pages/PromotionPage.tsx` -- card rendering, CARD_CONFIGS array, PreviewColumn, data flow
- `.factory/research/tiptap-research.md` -- TipTap setup and code snippets

**CRITICAL**: Follow existing patterns. Don't invent new approaches when the codebase already has established ones.

### 5. Implement Feature (TDD)
For each feature:

a) **Write tests first** (red phase):
   - Store tests: test new actions and state
   - Component tests: test NewsletterCard rendering, TipTap editor, toolbar, heading, position toggle
   - Integration tests: test email generation with newsletter data at both positions
   - Tests must fail before you write implementation

b) **Implement** (green phase):
   - TypeScript strict mode
   - shadcn/ui components from `src/components/ui/`
   - Tailwind CSS v4 utility classes (no custom CSS files)
   - TipTap editor with headless styling (no default CSS)
   - Pure business logic in `src/lib/` (no React imports)
   - React components in `src/components/promotion/`
   - Store updates in `src/stores/promotion-store.ts`
   - Email generation updates in `src/lib/promotion-email-html.ts`

c) **Verify**:
   ```bash
   npx tsc --noEmit
   npx vitest run
   npx eslint src/
   ```

### 6. Manual Verification
Start the dev server and verify key functionality:
```bash
npm run dev &
sleep 3
```
Use agent-browser to verify:
- Newsletter card renders in correct position (after Basic Details, before Discount Entries)
- TipTap editor works with formatting
- Email preview updates with newsletter content
- Position toggle changes newsletter placement

### 7. Clean Up
- Kill any running dev server processes
- Ensure no watch processes are running

## Example Handoff

```json
{
  "salientSummary": "Added Newsletter card with TipTap rich text editor. Card renders after Basic Details with heading field, formatting toolbar (bold/italic/underline/color/highlight/heading/list/link), position toggle, and store persistence. 18 new tests passing.",
  "whatWasImplemented": "Created src/components/promotion/NewsletterEditor.tsx with TipTap editor and toolbar. Added newsletterHeading, newsletterBody, newsletterPosition to Zustand store. Updated PromotionEmailData interface and generatePromotionEmailHTML(). Card added to CARD_CONFIGS at index 1.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx tsc --noEmit", "exitCode": 0, "observation": "No TypeScript errors" },
      { "command": "npx vitest run", "exitCode": 0, "observation": "690 tests passing (18 new)" },
      { "command": "npx eslint src/", "exitCode": 0, "observation": "No lint errors" }
    ],
    "interactiveChecks": [
      { "action": "Type in TipTap editor", "observed": "Text appears, store updates" },
      { "action": "Click Bold button", "observed": "Selected text becomes bold, button shows active state" },
      { "action": "Toggle position to Bottom", "observed": "Email preview shows newsletter below discount entries" }
    ]
  },
  "tests": {
    "added": [
      { "file": "tests/newsletter-editor.test.tsx", "cases": [
        { "name": "renders TipTap editor with toolbar", "verifies": "VAL-NEWS-007" },
        { "name": "heading field defaults to Newsletter", "verifies": "VAL-NEWS-004" },
        { "name": "position toggle switches top/bottom", "verifies": "VAL-NEWS-019" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- TipTap packages fail to install or have incompatible peer dependencies
- Feature depends on a precondition that hasn't been completed yet
- TypeScript compilation produces errors that seem unrelated to your changes
- You discover existing code patterns that conflict with the feature requirements
