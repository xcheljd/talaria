# Refactoring and Improvement Plan

This document tracks the progress of the refactoring and improvement plan for the Citizen Communication Template Generator.

## Phase 1: Code Refactoring and Organization

This phase focuses on improving the structure and maintainability of the codebase.

- [x] **Task 1: Modularize `app.js`**
    - [x] Create `state.js` for state management.
    - [x] Create `templates.js` skeleton file (placeholder).
    - [x] Create `eml.js` skeleton file (placeholder).
    - [x] Create `ui.js` skeleton file (with some functions).
    - [x] **Create automated migration script** (`refactor-migration.js`)
    - [x] **Create comprehensive documentation:**
        - [x] REFACTORING_MAP.md (function-by-function mapping)
        - [x] REFACTORING_SUMMARY.md (overview and strategy)
        - [x] MODULE_DEPENDENCY_DIAGRAM.md (architecture diagrams)
        - [x] REFACTORING_ANALYSIS_INDEX.md (navigation hub)
        - [x] MIGRATION_GUIDE.md (step-by-step instructions)
    - [ ] **Run migration script to extract code:**
        - [ ] Extract to `templates.js`
        - [ ] Extract to `eml.js`
        - [ ] Extract to `ui.js`
    - [ ] Remove extracted code from `app.js`
    - [ ] Update `index.html` to load the new modules in correct order.
- [ ] **Task 2: Centralize State Management**
    - [x] Create a single state object in `state.js`.
    - [ ] Refactor the code to use the state object instead of global variables.
        - [ ] Move `currentTemplate` to `appState`
        - [ ] Move `promotionEntries` to `appState`
        - [ ] Move `specialHours` to `appState`
        - [ ] Move other globals to `appState`
- [ ] **Task 3: Reorganize CSS**
    - [ ] Split `styles.css` into smaller files (`base.css`, `themes.css`, `components.css`).
    - [ ] Update `index.html` and `start.html` to link to the new CSS files.

### Phase 1 Progress Summary

**Analysis Phase - COMPLETED ✓**
- Created detailed refactoring map with 90+ functions identified
- Documented all dependencies and circular dependency solutions
- Created comprehensive architecture diagrams
- Estimated effort: 30 hours total

**Automation Phase - COMPLETED ✓**
- Built automated migration script (`refactor-migration.js`)
- Tested dry-run: Successfully extracts all template functions (13 functions, 33KB)
- Created detailed migration guide with step-by-step instructions
- Script handles: backups, extraction, report generation

**Execution Phase - COMPLETED ✓** (November 3, 2025)
- ✅ Ran migration script: `node refactor-migration.js --all`
- ✅ Successfully extracted all 67 functions:
  - templates.js: 13 functions (32 KB)
  - eml.js: 15 functions (44 KB)
  - ui.js: 39 functions (61 KB)
- ✅ Updated index.html with module loading order
- ✅ Created backup: `backup/app.js.2025-11-04T06-24-33-106Z.backup`
- ✅ Generated migration report: `migration-report.md`
- ✅ 100% success rate - no failed extractions

**Next Steps:**
1. ⏳ **TEST IN BROWSER** - Open index.html and verify all features work
2. ⏳ Remove extracted code from app.js (after testing confirms it works)
3. ⏳ Refactor remaining global variables to appState
4. ⏳ Final testing and git commit

**See REFACTORING_COMPLETE.md for detailed completion status and testing checklist.**

## Phase 2: Accessibility and HTML Improvements

This phase focuses on making the application more accessible and improving the HTML structure.

- [ ] **Task 1: Improve Form Accessibility**
    - [ ] Add `for` attributes to all `<label>` elements in `index.html` and `start.html`.
- [ ] **Task 2: Create a Shared Header**
    - [ ] Create a single, reusable header component for `index.html` and `start.html`.

## Phase 3: Testing

This phase focuses on building a safety net of automated tests.

- [ ] **Task 1: Set Up a Testing Framework**
    - [ ] Set up a testing framework like Jest.
- [ ] **Task 2: Write Unit Tests**
    - [ ] Write unit tests for the core logic (template generation, EML creation, state management).
