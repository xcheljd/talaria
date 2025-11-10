# Quick Start: Refactoring Guide

**TL;DR:** Use the automated migration script to extract code from `app.js` into focused modules.

## One-Command Quick Start

```bash
# Test first (no changes)
node refactor-migration.js --dry-run --all

# Then migrate (creates backups automatically)
node refactor-migration.js --all
```

## What You Get

After running the script:

- **templates.js** - 13 functions, 33KB (template definitions, helpers, generation)
- **eml.js** - 14 functions, ~25KB (email file creation, client integration)
- **ui.js** - 40+ functions, ~50KB (DOM manipulation, rendering, events)
- **Backups** - Original app.js saved in `./backup/`
- **Report** - Detailed results in `migration-report.md`

## File Structure After Migration

```
├── app.js (reduced from 5,443 to ~200 lines)
├── state.js (already done - state management)
├── templates.js (NEW - template definitions)
├── eml.js (NEW - email handling)
├── ui.js (UPDATED - UI functions)
├── index.html (NEEDS UPDATE - add script tags)
└── migration-report.md (NEW - extraction results)
```

## Critical: Update index.html

After migration, add these script tags in order:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

<!-- Load in dependency order -->
<script src="state.js"></script>
<script src="templates.js"></script>
<script src="eml.js"></script>
<script src="ui.js"></script>
<script src="app.js"></script>  <!-- Must be last -->
```

## Step-by-Step (Conservative Approach)

If you want to go module-by-module:

```bash
# 1. Templates first (fewest dependencies)
node refactor-migration.js --module=templates.js
# Add <script src="templates.js"></script> to index.html
# Test in browser

# 2. EML next
node refactor-migration.js --module=eml.js
# Add <script src="eml.js"></script> to index.html
# Test email features

# 3. UI last (most dependencies)
node refactor-migration.js --module=ui.js
# Add <script src="ui.js"></script> to index.html
# Test all interactions
```

## Post-Migration Cleanup

1. **Remove extracted code from app.js**
   - The script extracts but doesn't delete
   - Use `migration-report.md` to find what was extracted
   - Comment out or delete extracted functions

2. **Move global variables to appState**
   ```javascript
   // Find these in app.js:
   let currentTemplate = null;          // Move to appState.currentTemplate
   let promotionEntries = [];            // Move to appState.promotionEntries
   let specialHours = [];                // Move to appState.specialHours
   // ... etc
   ```

3. **Test everything**
   - Check browser console for errors
   - Test all templates
   - Test email generation
   - Test promotion builder
   - Test all buttons and interactions

## If Something Breaks

```bash
# Restore from backup
cp ./backup/app.js.[timestamp].backup ./app.js

# Or just reload page (script creates backups automatically)
```

## Documentation

- **MIGRATION_GUIDE.md** - Full step-by-step guide (9 hours estimated)
- **REFACTORING_MAP.md** - Every function mapped to destination
- **MODULE_DEPENDENCY_DIAGRAM.md** - Architecture and dependencies
- **REFACTORING_SUMMARY.md** - Overview and strategy
- **migration-report.md** - Generated after running script

## Common Issues

**"Function not defined"**
→ Check script load order in index.html

**"appState is not defined"**
→ Load state.js first

**"Cannot read property"**
→ Check if global variables moved to appState

## Success Checklist

- [ ] Script runs without errors
- [ ] Backup created in ./backup/
- [ ] migration-report.md generated
- [ ] All modules created/updated
- [ ] index.html updated with script tags
- [ ] Browser console shows no errors
- [ ] All features work as before

## Time Estimate

- **Automated extraction**: 2 minutes
- **Update index.html**: 2 minutes
- **Manual cleanup**: 2 hours
- **Global variable refactoring**: 1 hour
- **Testing**: 1 hour

**Total: ~4 hours** (vs 30 hours manually)

---

**Ready?** Run `node refactor-migration.js --dry-run --all` to preview!
