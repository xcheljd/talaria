---
name: layout-worker
description: Frontend worker for layout refactoring tasks on the Promotion page
---

# Layout Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving changes to the Promotion page layout, resizable panels, sidebar components, or responsive design. This worker handles React component refactoring, CSS/Tailwind layout changes, and Zustand store updates related to layout.

## Required Skills

None.

## Work Procedure

1. **Read the feature description carefully** and understand what's being asked. Read `mission.md`, `AGENTS.md`, and `.factory/library/architecture.md` for context.

2. **Write tests FIRST (red)**:
   - For new components (e.g., ResizablePanels): write unit tests covering rendering, props, basic interactions
   - For layout changes: write component tests that verify DOM structure (e.g., panels render in correct order, correct CSS classes applied, correct ARIA attributes)
   - For store changes: write tests verifying the new state shape and actions
   - Run tests to confirm they FAIL before implementing

3. **Implement (green)**:
   - Follow existing coding patterns in the codebase
   - Use Tailwind utility classes (never add custom CSS files)
   - Use `@/` path alias for imports
   - For the ResizablePanels component: use Pointer Events API (pointerdown/pointermove/pointerup) for unified mouse+touch handling. Store split position as percentage. Use useRef for drag state, useState for split position. Add requestAnimationFrame batching during drag.
   - For the SidebarBar horizontal variant: keep the same visual style (status dots, card titles) but render horizontally with overflow-x-auto scrolling
   - Apply `user-select: none` to document body during drag. Apply `pointer-events: none` to iframes during drag.
   - Keyboard accessibility: `role="separator"`, `aria-orientation`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `tabIndex={0}`, arrow key support

4. **Run tests again** — all must pass (green):
   ```bash
   npm run typecheck && npx vitest run
   ```

5. **Manual verification** — start the dev server and check:
   ```bash
   npm run dev
   ```
   - Verify layout at desktop viewport (≥1024px): sidebar + active column + preview, drag handle works
   - Verify layout at mobile viewport (<1024px): horizontal strips + all cards + preview, drag handle works
   - Verify card collapse/expand still works
   - Verify sidebar click → expand + scroll still works
   - Verify the forceExpand one-shot pattern is NOT broken

6. **Run lint and typecheck**:
   ```bash
   npm run typecheck && npm run lint
   ```

7. **Commit** with descriptive message following existing commit style.

## Example Handoff

```json
{
  "salientSummary": "Refactored PromotionPage layout from 3-column fixed split to 50/50 resizable split on desktop. Created ResizablePanels component with pointer events, min/max constraints, and keyboard accessibility. Updated ColumnState type from dual-state to single active column model.",
  "whatWasImplemented": "ResizablePanels component in src/components/ui/resizable-panels.tsx supporting vertical and horizontal orientations with drag handle. Updated PromotionPage.tsx to use 50/50 default split with ResizablePanels. Simplified ColumnState to 'left' | 'center'. Updated SidebarBar to always show both columns' cards with active column indicator. All existing card functionality preserved.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run typecheck", "exitCode": 0, "observation": "No type errors" },
      { "command": "npx vitest run", "exitCode": 0, "observation": "628 tests passing (10 new tests added)" },
      { "command": "npm run lint", "exitCode": 0, "observation": "No lint errors" }
    ],
    "interactiveChecks": [
      { "action": "Desktop layout at 1280px: sidebar strip on far left, left column cards visible, preview panel on right, 50/50 split", "observed": "Layout renders correctly with sidebar showing all 8 card titles, left column cards (5) in content area, preview panel on right at equal width" },
      { "action": "Click 'PDF Attachments' in sidebar — center column should activate", "observed": "Center column activates, showing PDF/Subject/Bulk cards. Left column cards hidden." },
      { "action": "Drag vertical handle to resize panels", "observed": "Panels resize smoothly. Minimum sizes enforced. No text selection during drag." },
      { "action": "Manual collapse of force-expanded card works", "observed": "Card collapses and stays collapsed. No re-trigger." }
    ]
  },
  "tests": {
    "added": [
      { "file": "tests/resizable-panels.test.tsx", "cases": [
        { "name": "renders vertical split with default 50/50", "verifies": "VAL-CROSS-005" },
        { "name": "renders horizontal split correctly", "verifies": "VAL-CROSS-005" },
        { "name": "enforces min/max panel sizes", "verifies": "VAL-DESKTOP-006" },
        { "name": "keyboard arrow keys resize panels", "verifies": "VAL-CROSS-007" },
        { "name": "aria separator attributes present", "verifies": "VAL-CROSS-007" }
      ]},
      { "file": "tests/promotion-layout.test.tsx", "cases": [
        { "name": "desktop layout shows sidebar and single active column", "verifies": "VAL-DESKTOP-003" },
        { "name": "toggling active column via sidebar click", "verifies": "VAL-DESKTOP-002" },
        { "name": "preview panel always visible on desktop", "verifies": "VAL-DESKTOP-010" },
        { "name": "mobile layout shows all cards from both columns", "verifies": "VAL-MOBILE-002" },
        { "name": "horizontal sidebar strip renders on mobile", "verifies": "VAL-MOBILE-001" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature requires changes to utility modules in `src/lib/` (out of scope for layout work)
- Feature requires changes to Tauri backend in `src-tauri/`
- Existing tests are broken by changes and the fix is unclear
- Layout behavior conflicts with existing functionality in unexpected ways
