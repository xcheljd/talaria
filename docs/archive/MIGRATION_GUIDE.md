# Refactoring Migration Guide

This guide explains how to use the automated migration script to refactor `app.js` into modular files.

## Overview

The migration script (`refactor-migration.js`) automates the extraction of code from the monolithic `app.js` file into focused modules:

- **templates.js** - Template definitions and generation logic
- **eml.js** - Email file creation and client integration
- **ui.js** - DOM manipulation and rendering functions
- **state.js** - State management (already partially done)

## Prerequisites

- Node.js installed (the script uses built-in modules only, no npm packages needed)
- Backup of your current working code (script creates automatic backups)
- Review the analysis documents:
  - `REFACTORING_MAP.md` - Detailed function mapping
  - `REFACTORING_SUMMARY.md` - Overview and strategy
  - `MODULE_DEPENDENCY_DIAGRAM.md` - Architecture guide

## Usage

### 1. Dry Run (Preview Changes)

Test the migration without modifying any files:

```bash
node refactor-migration.js --dry-run --module=templates.js
```

This will show you what would be extracted without making changes.

### 2. Migrate a Single Module

Start with templates.js as it has the fewest dependencies:

```bash
node refactor-migration.js --module=templates.js
```

This will:
- Create a backup of app.js in `./backup/`
- Extract template-related code to templates.js
- Generate a migration report in `migration-report.md`

### 3. Migrate All Modules

After testing with individual modules:

```bash
node refactor-migration.js --all
```

This migrates all modules in the correct dependency order.

## Step-by-Step Migration Process

### Phase 1: Prepare (5 minutes)

1. Commit your current code to git
2. Review the analysis documents
3. Run a dry-run to preview changes

```bash
# Commit current state
git add .
git commit -m "Before refactoring - baseline"

# Preview changes
node refactor-migration.js --dry-run --all
```

### Phase 2: Extract Templates Module (30 minutes)

1. Migrate templates.js

```bash
node refactor-migration.js --module=templates.js
```

2. Review the generated file
3. Update index.html to load templates.js before app.js:

```html
<script src="state.js"></script>
<script src="templates.js"></script>
<script src="app.js"></script>
```

4. Test the application - templates should still work

### Phase 3: Extract EML Module (45 minutes)

1. Migrate eml.js

```bash
node refactor-migration.js --module=eml.js
```

2. Review and update index.html:

```html
<script src="state.js"></script>
<script src="templates.js"></script>
<script src="eml.js"></script>
<script src="app.js"></script>
```

3. Test email generation and download features

### Phase 4: Extract UI Module (1 hour)

1. Migrate ui.js (note: ui.js already has some content)

```bash
node refactor-migration.js --module=ui.js
```

2. Manually merge with existing ui.js content
3. Update index.html
4. Test all UI interactions

### Phase 5: Clean Up app.js (1 hour)

1. Remove extracted code from app.js
2. Keep only:
   - Initialization code
   - Event listeners
   - Core utilities (getStorePhone, getEmployeeSignature, etc.)
   - Main app logic
3. Test thoroughly

### Phase 6: Refactor Global Variables (1 hour)

1. Move remaining globals to appState in state.js:

```javascript
// In state.js, add to appState:
currentTemplate: null,
promotionEntries: [],
specialHours: [],
// ... etc
```

2. Find and replace all references:
   - `currentTemplate` → `appState.currentTemplate`
   - `promotionEntries` → `appState.promotionEntries`
   - etc.

3. Test thoroughly

## Migration Script Options

```bash
# Preview without changes
node refactor-migration.js --dry-run

# Migrate specific module
node refactor-migration.js --module=templates.js
node refactor-migration.js --module=eml.js
node refactor-migration.js --module=ui.js

# Migrate all modules
node refactor-migration.js --all

# Dry run for all modules
node refactor-migration.js --dry-run --all
```

## What the Script Does

1. **Creates Backup** - Copies app.js to `./backup/app.js.[timestamp].backup`
2. **Extracts Code** - Pulls functions from app.js based on line numbers in REFACTORING_MAP.md
3. **Generates Headers** - Adds module headers with descriptions and dependencies
4. **Writes Files** - Creates/updates the target module files
5. **Creates Report** - Generates `migration-report.md` with detailed results

## After Migration

### Update index.html

Add all module scripts in the correct load order:

```html
<!-- JSZip for bulk email features -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

<!-- Load modules in dependency order -->
<script src="state.js"></script>
<script src="templates.js"></script>
<script src="eml.js"></script>
<script src="ui.js"></script>
<script src="app.js"></script>
```

### Manual Cleanup Required

The script extracts code but doesn't remove it from app.js. You'll need to:

1. Review `migration-report.md` for extraction results
2. Manually remove extracted code from app.js
3. Fix any dependency issues (check console for errors)
4. Update function calls if needed
5. Test all features thoroughly

## Testing Checklist

After migration, test:

- [ ] Template selection and form display
- [ ] Template generation (all template types)
- [ ] Regular email templates with subject editing
- [ ] Promotion email builder
- [ ] Email download (.eml files)
- [ ] Email preview
- [ ] Bulk email generation
- [ ] Subject line generation
- [ ] PDF attachment handling
- [ ] Undo/redo functionality
- [ ] Theme switching
- [ ] Template save/load
- [ ] All button clicks and interactions

## Troubleshooting

### "Cannot find function X"

The function may be called before its module is loaded. Check script order in index.html.

### "appState is not defined"

Make sure state.js loads before other modules.

### "Circular dependency detected"

Review MODULE_DEPENDENCY_DIAGRAM.md for solutions to circular dependencies.

### Features not working after migration

1. Check browser console for errors
2. Verify all modules are loaded in index.html
3. Check that function names match between modules
4. Ensure global variables are in appState

## Rollback

If something goes wrong:

1. Find your backup in `./backup/`
2. Restore it:

```bash
cp ./backup/app.js.[timestamp].backup ./app.js
```

3. Reload the page

## Getting Help

- Review `REFACTORING_MAP.md` for function mappings
- Check `MODULE_DEPENDENCY_DIAGRAM.md` for architecture
- Read `REFACTORING_SUMMARY.md` for strategy overview
- Check `migration-report.md` for extraction results

## Estimated Timeline

- **Dry runs and prep**: 30 minutes
- **Templates module**: 1 hour
- **EML module**: 1.5 hours
- **UI module**: 2 hours
- **Clean up app.js**: 1 hour
- **Global variable refactoring**: 1 hour
- **Testing and fixes**: 2 hours

**Total: ~9 hours of focused work**

Can be split across multiple sessions. Commit after each phase.

## Success Criteria

- [ ] All modules load without errors
- [ ] All features work as before
- [ ] app.js reduced from 5,443 lines to <200 lines
- [ ] Code is organized by module
- [ ] No global variables (except in appState)
- [ ] Tests pass (if you add them)
- [ ] Documentation updated

Good luck with your refactoring!
