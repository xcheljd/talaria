# Module Dependency Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      index.html                              │
│                                                              │
│  <script src="state.js"></script>                           │
│  <script src="templates.js"></script>                       │
│  <script src="eml.js"></script>                             │
│  <script src="ui.js"></script>                              │
│  <script src="app.js"></script>                             │
└─────────────────────────────────────────────────────────────┘
```

## Module Relationship Diagram

```
                         ┌──────────────┐
                         │  app.js      │
                         │ (Orchestrator)
                         └──────┬───────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 v              v              v
            ┌─────────┐  ┌─────────┐  ┌──────────┐
            │state.js │  │  ui.js  │  │ eml.js   │
            │         │  │         │  │          │
            └────┬────┘  └─────┬───┘  └────┬─────┘
                 │            │            │
                 └────┬───────┼────────────┘
                      │       │
                      v       v
                 ┌─────────────────┐
                 │ templates.js    │
                 │ (Shared Content)│
                 └─────────────────┘
```

## Detailed Dependency Map

### state.js (Foundation Layer)
```
state.js
├─ No external dependencies
├─ Browser APIs: IndexedDB, localStorage
└─ Exports:
   ├─ appState (central state object)
   ├─ captureState() - for undo/redo
   ├─ restoreState() - for undo/redo
   ├─ List operations (add/remove/move)
   ├─ PDF management
   ├─ Template persistence
   └─ Database operations
```

### templates.js (Content Layer)
```
templates.js
├─ Depends on: nothing
├─ Exports:
│  ├─ templates{} - all template definitions
│  ├─ templateHelp{} - help text
│  ├─ fieldConfig{} - field metadata
│  └─ Helper functions:
│     ├─ sanitizeHTML()
│     ├─ escapeHtml()
│     ├─ convertTextToHTML()
│     ├─ formatPhoneNumber()
│     ├─ validateTracking()
│     └─ etc.
└─ Used by:
   ├─ eml.js (for email content)
   └─ ui.js (for form rendering)
```

### eml.js (Email Operations Layer)
```
eml.js
├─ Depends on:
│  ├─ templates.js (for content conversion)
│  └─ state.js (for appState.currentTemplate)
├─ External: JSZip library
├─ Exports:
│  ├─ Email file creation:
│  │  ├─ createEMLFile()
│  │  ├─ createGenericEMLFile()
│  │  └─ createBCCBatchEML()
│  ├─ Email client integration:
│  │  ├─ openInEmailClient()
│  │  ├─ openPromotionEmailInClient()
│  │  ├─ openEmailClientUniversal()
│  │  └─ downloadEmailFile()
│  ├─ Encoding functions:
│  │  ├─ encodeSubject()
│  │  ├─ encodeQuotedPrintable()
│  │  ├─ encodeFilename()
│  │  └─ utf8ToBase64()
│  ├─ Validation functions:
│  │  ├─ isValidEmail()
│  │  ├─ validateSubject()
│  │  ├─ isComplexEmail()
│  │  ├─ validateBatchSize()
│  │  └─ detectDuplicates()
│  ├─ Parsing functions:
│  │  ├─ parseEmailList()
│  │  └─ extractSubjectLine()
│  └─ Bulk operations:
│     └─ generateBulkEmailFiles()
└─ Used by:
   └─ ui.js (for email sending/downloading)
```

### ui.js (Presentation Layer)
```
ui.js
├─ Depends on:
│  ├─ state.js (for appState, captureState())
│  ├─ templates.js (for templates[], field definitions)
│  └─ eml.js (for openEmailClientUniversal(), downloadEmailFile())
├─ Browser APIs: DOM manipulation
├─ Exports:
│  ├─ Form rendering:
│  │  ├─ renderPromotionEmailForm()
│  │  ├─ selectTemplate()
│  │  └─ populateDropdown()
│  ├─ Item rendering:
│  │  ├─ renderPromotionEntries()
│  │  ├─ renderSpecialHours()
│  │  ├─ renderHowToShopItems()
│  │  ├─ renderImportantNotesItems()
│  │  ├─ renderAttachedPDFs()
│  │  ├─ renderSubjectLines()
│  │  └─ renderSearchResults()
│  ├─ Output display:
│  │  ├─ showTabbedOutput()
│  │  └─ showRegularOutput()
│  ├─ Preview functions:
│  │  ├─ updateEmailPreview()
│  │  ├─ updateLivePreview()
│  │  └─ updateSubjectInPreview()
│  ├─ Form operations:
│  │  ├─ generateMessage()
│  │  ├─ clearAll()
│  │  ├─ copyToClipboard()
│  │  └─ updateCalculatedFields()
│  ├─ PDF modal:
│  │  ├─ initPDFPreviewModal()
│  │  ├─ previewPDF()
│  │  ├─ closePDFPreview()
│  │  └─ downloadPDFFromPreview()
│  ├─ Event handlers:
│  │  ├─ setupDragAndDrop()
│  │  ├─ attachEventListeners()
│  │  └─ handleUndoRedoShortcuts()
│  ├─ Debounced functions:
│  │  ├─ debouncedLivePreview
│  │  ├─ debouncedSubjectPreviewUpdate
│  │  └─ debouncedCaptureState
│  └─ Theme/UI:
│     ├─ initTheme()
│     ├─ toggleTheme()
│     └─ initNavigation()
└─ Called by:
   ├─ state.js (restoreState calls render functions)
   └─ app.js (init calls ui setup functions)
```

### app.js (Orchestration Layer)
```
app.js
├─ Depends on: All modules
│  ├─ state.js
│  ├─ templates.js
│  ├─ eml.js
│  └─ ui.js
├─ External: html2pdf.js library
├─ Contains:
│  ├─ Constants:
│  │  ├─ TOAST_DURATION_MS
│  │  └─ Database constants
│  ├─ CSS injection
│  ├─ init() function
│  ├─ DOMContentLoaded event listener
│  └─ Optional: Profile accessors
└─ Usage:
   └─ Entry point for entire application
```

---

## Data Flow Diagram

### User Action → State Update → UI Render

```
User Interaction (e.g., click button)
          ↓
    ui.js event handler
          ↓
    Call state.js mutation (e.g., addPromotionEntry)
          ↓
    state.js updates appState
    state.js calls captureState() for undo/redo
          ↓
    state.js calls ui.js render function (e.g., renderPromotionEntries)
          ↓
    ui.js reads appState and DOM elements
    ui.js manipulates DOM
          ↓
    Visual update on screen
```

### Template Generation → Email → User

```
User selects template + fills form
          ↓
    ui.js generateMessage()
          ↓
    Read form data
          ↓
    Call templates.js template.generate(data)
          ↓
    Convert to HTML using templates.js convertTextToHTML()
          ↓
    Return content to ui.js
          ↓
    ui.js displays preview
          ↓
    User clicks "Send" or "Download"
          ↓
    ui.js calls eml.js openEmailClientUniversal() or downloadEmailFile()
          ↓
    eml.js creates EML file or sends to email client
          ↓
    Email sent or file downloaded
```

---

## Function Call Chains

### Email Generation Chain
```
generateMessage()
├─ For regular templates:
│  ├─ templates[currentTemplate].generate(data)
│  ├─ convertTextToHTML() [from templates.js]
│  └─ updateEmailPreview()
│
└─ For promotion email:
   ├─ generatePromotionEmailHTML() [from templates.js]
   ├─ generateSubjectLines()
   └─ updateLivePreview()
      ├─ generatePromotionEmailHTML()
      ├─ wrapHtmlForEmailPreview()
      └─ renderEditableSubjectLine()
```

### Promotion Email Form Rendering Chain
```
selectTemplate("promotion-email")
├─ renderPromotionEmailForm()
│  ├─ renderPromotionEntries()
│  │  ├─ setupDragAndDrop()
│  │  └─ updateEntryData event handler
│  ├─ renderSpecialHours()
│  ├─ renderHowToShopSection()
│  │  └─ renderHowToShopItems()
│  ├─ renderImportantNotesSection()
│  │  └─ renderImportantNotesItems()
│  ├─ renderAttachedPDFs()
│  └─ attachEventListeners()
│     ├─ Date range input listener
│     ├─ Year input listener
│     ├─ Title input listener
│     ├─ Add entry button listener
│     ├─ Add hour button listener
│     ├─ PDF upload listeners
│     ├─ Undo button listener
│     ├─ Redo button listener
│     └─ Save/Import/Export button listeners
│
└─ Live preview setup (debounced updates)
```

### Bulk Email Generation Chain
```
generateBulkEmailFiles()
├─ validateBatchSize()
├─ parseEmailList()
│  └─ isValidEmail() for each email
├─ detectDuplicates()
├─ For each batch:
│  ├─ createBCCBatchEML()
│  │  ├─ encodeSubject()
│  │  ├─ utf8ToBase64()
│  │  ├─ encodeQuotedPrintable()
│  │  ├─ encodeFilename()
│  │  └─ PDF attachment handling
│  └─ Add to ZIP archive
│
└─ Download ZIP (if >3 recipients) or individual files
```

---

## Circular Dependency Solutions

### Problem 1: state.js calls ui.js render functions

**Current (in app.js):**
```javascript
function restoreState(state) {
  appState.promotionEntries = JSON.parse(...);
  renderPromotionEntries();  // This is in ui.js!
}
```

**Solution A: Callback Pattern**
```javascript
// In state.js
let onStateRestored = null;

function setRestoreCallback(callback) {
  onStateRestored = callback;
}

function restoreState(state) {
  appState.promotionEntries = JSON.parse(...);
  if (onStateRestored) onStateRestored();
}

// In ui.js
setRestoreCallback(() => {
  renderPromotionEntries();
  renderSpecialHours();
  // ... etc
});
```

**Solution B: Event Dispatcher**
```javascript
// In state.js
const stateChangeEvent = new Event('appStateChanged');
window.dispatchEvent(stateChangeEvent);

// In ui.js
window.addEventListener('appStateChanged', () => {
  renderPromotionEntries();
  renderSpecialHours();
  // ... etc
});
```

### Problem 2: ui.js calls state.js functions

**This is NOT circular** - ui.js can safely import and call state.js functions.
- ui.js → state.js: Direct import (one-way)
- state.js → ui.js: Via callback or event (one-way)

**Implementation:**
```javascript
// In ui.js
function renderPromotionEntries() {
  // ... render code ...
  if (userAction) {
    captureState();  // Direct call to state.js
  }
}

// In state.js
let onStateRestored = null;

function setRestoreCallback(callback) {
  onStateRestored = callback;
}

function restoreState(state) {
  // ... restore code ...
  onStateRestored?.();  // Callback to ui.js
}
```

---

## Module Load Order Dependencies

```
LOAD ORDER 1 (Required):
state.js → templates.js → eml.js → ui.js → app.js
   ↑            ↑         ↑        ↑        ↑
   │            │         │        │        │
   └── No deps  └─────────┴────────┴────────┴─ Has deps

Load each module only after its dependencies are loaded:

1. state.js
   - First: No dependencies
   - Exports: appState and state functions

2. templates.js
   - Second: Can use nothing from other modules
   - Exports: Template definitions and utilities

3. eml.js
   - Third: Can use templates.js and state.js
   - Depends on: convertTextToHTML() from templates.js
   - Exports: Email functions

4. ui.js
   - Fourth: Can use all above modules
   - Depends on: appState, templates, eml functions
   - Exports: Render and event handler functions
   - Uses callback pattern to avoid circular deps with state.js

5. app.js
   - Fifth: Orchestrator, uses everything
   - Calls init() when DOM is ready
```

---

## State Flow Example: Adding Promotion Entry

```
User clicks "Add Entry" button
           ↓
ui.js event listener fires
           ↓
addPromotionEntry() [in state.js]
  ├─ Create new entry object with unique ID
  ├─ Push to appState.promotionEntries
  └─ Call captureState() for undo/redo
           ↓
Call onStateRestored() callback
           ↓
ui.js callback executes:
  renderPromotionEntries()
           ↓
DOM updated with new entry
  ├─ Render input fields
  ├─ Setup drag handlers
  └─ Attach event listeners
           ↓
User sees new empty entry in form
```

---

## Testing Module Isolation

### Test state.js independently
```javascript
// Can run without DOM
const originalState = JSON.parse(JSON.stringify(appState));
addPromotionEntry();
assert(appState.promotionEntries.length === originalState.length + 1);
```

### Test templates.js independently
```javascript
// Can run without DOM or state
const data = { customerName: 'John', employeeName: 'Jane' };
const result = templates['new-customer-welcome'].generate(data);
assert(result.includes('John'));
```

### Test eml.js independently
```javascript
// Can run without DOM
const eml = createEMLFile('Test', 'Body', 'test@example.com', 'from@example.com');
assert(eml.includes('Subject:'));
```

### Test ui.js with mocked state
```javascript
// Need DOM and state
setupDOM();
loadState.js and templates.js
test form rendering, event handlers, etc.
```

### Test app.js integration
```javascript
// Full integration test
// Load all modules, trigger init()
// Verify everything works together
```

