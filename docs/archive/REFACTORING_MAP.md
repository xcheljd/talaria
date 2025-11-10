# App.js Refactoring Analysis - Comprehensive Function Map

Generated: 2025-11-03
Total Functions in app.js: ~100+ functions
File Size: 5,443 lines

---

## 1. FUNCTIONS FOR templates.js (Template Management)

### Template Object & Metadata
- **Line 488-828: `const templates = {...}`**
  - Contains all template definitions (19 templates)
  - Fields: name, category, hasEditableSubject, supportsEML, supportsMailto, fields[], generate()
  - MOVE TO: templates.js

### Template Helper Objects
- **Line 387-405: `const templateHelp = {...}`**
  - Help text for each template
  - MOVE TO: templates.js

- **Line 407-440: `const fieldConfig = {...}`**
  - Field definitions and metadata
  - MOVE TO: templates.js

### Template Generation Functions
- **Line 3379-3543: `function generatePromotionEmailHTML(data)`**
  - Generates HTML for promotion emails
  - Dependencies: Uses appState.currentTemplate, convertTextToHTML()
  - MOVE TO: templates.js

- **Line 3813-3856: `function generatePromoTitle(dateRange)`**
  - Generates promo title from date range
  - MOVE TO: templates.js

### Helper Functions for Templates
- **Line 441-463: `function sanitizeHTML(str)`**
  - Sanitizes HTML content
  - MOVE TO: templates.js

- **Line 448-451: `function escapeAttr(str)`**
  - Escapes HTML attributes
  - MOVE TO: templates.js

- **Line 453-463: `function sanitizeTemplateData(data)`**
  - Sanitizes template field data
  - MOVE TO: templates.js

- **Line 465-468: `function getFieldSuggestions(field)`**
  - Returns suggestions for form fields
  - MOVE TO: templates.js

- **Line 470-476: `function formatPhoneNumber(value)`**
  - Formats phone number values
  - MOVE TO: templates.js

- **Line 477-487: `function validateTracking(value)`**
  - Validates tracking numbers
  - MOVE TO: templates.js

- **Line 317-385: `function convertTextToHTML(textBody)`**
  - Converts plain text to HTML with formatting
  - Dependencies: Uses sanitizeHTML()
  - MOVE TO: templates.js

- **Line 1714-1723: `function escapeHtml(text)`**
  - Escapes HTML special characters
  - MOVE TO: templates.js

---

## 2. FUNCTIONS FOR eml.js (Email File Creation & Client Integration)

### EML File Creation Functions
- **Line 4243-4380: `function createEMLFile(subject, body, to, from)`**
  - Creates RFC 822 compliant EML file
  - Dependencies: encodeSubject(), utf8ToBase64(), encodeQuotedPrintable()
  - MOVE TO: eml.js

- **Line 4592-4738: `function createGenericEMLFile(subject, body)`**
  - Creates simplified EML file without recipient/sender headers
  - Dependencies: encodeSubject(), encodeQuotedPrintable()
  - MOVE TO: eml.js

- **Line 5019-5177: `function createBCCBatchEML(subject, htmlBody, recipients, pdfAttachments = [], format = 'eml', batchNumber = 1)`**
  - Creates batch EML files with BCC recipients for bulk emails
  - Dependencies: JSZip, encodeFilename(), extractDateRangeFromHTML()
  - MOVE TO: eml.js

### Email Client Integration Functions
- **Line 4157-4195: `function openInEmailClient()`**
  - Opens regular template email in default email client via mailto:
  - Dependencies: sanitizeHTML(), openEmailClientUniversal()
  - MOVE TO: eml.js

- **Line 4198-4241: `function openPromotionEmailInClient()`**
  - Opens promotion email in email client
  - Dependencies: openEmailClientUniversal(), updateLivePreview()
  - MOVE TO: eml.js

- **Line 4740-4755: `function openEmailClientUniversal(templateType, content, subject = null)`**
  - Universal function to open email in client for any template type
  - Dependencies: isComplexEmail(), createEMLFile(), createGenericEMLFile()
  - MOVE TO: eml.js

- **Line 4757-4803: `function downloadEmailFile(templateType, content, subject = null)`**
  - Downloads email as EML file
  - Dependencies: isComplexEmail(), createEMLFile(), createGenericEMLFile()
  - MOVE TO: eml.js

### Email Encoding/Parsing Functions
- **Line 4448-4463: `function encodeSubject(subject)`**
  - Encodes subject line for email headers
  - Dependencies: utf8ToBase64()
  - MOVE TO: eml.js

- **Line 4465-4476: `function utf8ToBase64(str)`**
  - Converts UTF-8 string to Base64
  - MOVE TO: eml.js

- **Line 4478-4492: `function encodeFilename(filename)`**
  - Encodes filename for MIME headers
  - MOVE TO: eml.js

- **Line 4562-4590: `function encodeQuotedPrintable(text)`**
  - Encodes text in Quoted-Printable format
  - MOVE TO: eml.js

- **Line 4382-4398: `function parseEmailList(text)`**
  - Parses comma/newline separated email list
  - Dependencies: isValidEmail()
  - MOVE TO: eml.js

- **Line 4400-4431: `function isValidEmail(email)`**
  - Validates email address format
  - MOVE TO: eml.js

- **Line 4494-4498: `function extractSubjectLine(templateOutput)`**
  - Extracts subject line from template output
  - MOVE TO: eml.js

### Email Validation Functions
- **Line 4433-4446: `function validateSubject(subject)`**
  - Validates email subject line
  - MOVE TO: eml.js

- **Line 4805-4809: `function isComplexEmail(templateType)`**
  - Determines if email needs complex formatting (HTML body, PDFs)
  - MOVE TO: eml.js

### Email Downloading Functions
- **Line 4851-4865: `function detectDuplicates(emails)`**
  - Finds duplicate email addresses in list
  - MOVE TO: eml.js

- **Line 5178-5434: `async function generateBulkEmailFiles()`**
  - Main function for bulk email generation with ZIP creation
  - Dependencies: createBCCBatchEML(), validateBatchSize(), detectDuplicates(), renderSubjectLines()
  - MOVE TO: eml.js

### Bulk Email Validation
- **Line 4816-4848: `function validateBatchSize()`**
  - Validates batch size input for bulk emails
  - MOVE TO: eml.js

---

## 3. FUNCTIONS FOR ui.js (DOM Manipulation & Rendering)

### HTML Content Processing
- **Line 1641-1712: `function wrapHtmlForEmailPreview(htmlContent)`**
  - Wraps HTML content in preview wrapper with styling
  - MOVE TO: ui.js

### Email Preview Functions
- **Line 1584-1639: `function updateEmailPreview()`**
  - Updates email preview iframe content
  - Dependencies: isHTMLContent(), convertTextToHTML()
  - MOVE TO: ui.js

- **Line 1724-1752: `function updateSubjectInPreview(newSubject)`**
  - Updates subject line in preview
  - Dependencies: updateEmailPreview()
  - MOVE TO: ui.js

- **Line 1767-1808: `function updateLivePreview()`**
  - Live updates preview while user types (for promotion emails)
  - Dependencies: generatePromotionEmailHTML(), wrapHtmlForEmailPreview(), renderEditableSubjectLine()
  - MOVE TO: ui.js

- **Line 1804-1810: Debounced versions:**
  - `const debouncedLivePreview = debounce(updateLivePreview, 500)`
  - `const debouncedSubjectPreviewUpdate = debounce(updateSubjectInPreview, 300)`
  - `const debouncedCaptureState = debounce(captureState, 1000)`
  - MOVE TO: ui.js

### Output Display Functions
- **Line 1180-1409: `function showTabbedOutput()`**
  - Renders tabbed output interface for promotion emails
  - Dependencies: renderSubjectLines(), downloadEmailFile()
  - MOVE TO: ui.js

- **Line 1411-1582: `function showRegularOutput()`**
  - Renders output interface for regular templates
  - Dependencies: sanitizeHTML()
  - MOVE TO: ui.js

### Promotion Email Form Rendering
- **Line 2460-2808: `function renderPromotionEmailForm()`**
  - Renders entire promotion email form with all sections
  - Dependencies: renderPromotionEntries(), renderSpecialHours(), renderHowToShopSection(), renderImportantNotesSection(), renderAttachedPDFs()
  - MOVE TO: ui.js

### Item Rendering Functions (Promotion Email)
- **Line 2081-2177: `function renderPromotionEntries()`**
  - Renders list of promotion entries
  - Dependencies: setupDragAndDrop(), updateEntryData()
  - MOVE TO: ui.js

- **Line 2196-2242: `function renderSpecialHours()`**
  - Renders special hours section
  - Dependencies: setupDragAndDrop(), updateSpecialHourData()
  - MOVE TO: ui.js

- **Line 2257-2288: `function renderHowToShopSection()`**
  - Renders "How to Shop" section header
  - MOVE TO: ui.js

- **Line 2290-2341: `function renderHowToShopItems()`**
  - Renders "How to Shop" items list
  - Dependencies: setupDragAndDrop(), updateHowToShopItemData()
  - MOVE TO: ui.js

- **Line 2343-2374: `function renderImportantNotesSection()`**
  - Renders "Important Notes" section header
  - MOVE TO: ui.js

- **Line 2376-2427: `function renderImportantNotesItems()`**
  - Renders "Important Notes" items list
  - Dependencies: setupDragAndDrop(), updateImportantNotesItemData()
  - MOVE TO: ui.js

- **Line 2899-2970: `function renderAttachedPDFs()`**
  - Renders list of attached PDFs
  - Dependencies: previewPDF(), removePDF(), downloadPDFFromPreview()
  - MOVE TO: ui.js

- **Line 3239-3312: `function renderSubjectLines()`**
  - Renders generated subject lines for selection
  - Dependencies: selectSubjectLine()
  - MOVE TO: ui.js

- **Line 3575-3624: `function renderSearchResults(query)`**
  - Renders template search results
  - Dependencies: selectTemplate()
  - MOVE TO: ui.js

### Drag and Drop
- **Line 2017-2078: `function setupDragAndDrop(container, itemsArray, renderFunction, selector = '.editable-item-row')`**
  - Sets up drag-and-drop for reordering items
  - MOVE TO: ui.js

### Data Update Functions (Form Input Handlers)
- **Line 2179-2195: `function updateEntryData(e)`**
  - Updates promotion entry data from form input
  - Dependencies: captureState()
  - MOVE TO: ui.js

- **Line 2244-2255: `function updateSpecialHourData(e)`**
  - Updates special hour data from form input
  - Dependencies: captureState()
  - MOVE TO: ui.js

- **Line 2179+: `function updateHowToShopItemData(e)`** (implied, not explicitly found)
  - Updates How To Shop item data
  - MOVE TO: ui.js

- **Line 2179+: `function updateImportantNotesItemData(e)`** (implied, not explicitly found)
  - Updates Important Notes item data
  - MOVE TO: ui.js

### Editable Subject Line
- **Line 4500-4560: `function renderEditableSubjectLine(container, currentSubject)`**
  - Renders editable subject line input
  - Dependencies: updateSubjectInPreview()
  - MOVE TO: ui.js

### Subject Lines Management
- **Line 3164-3237: `function generateSubjectLines()`**
  - Generates multiple subject line options
  - Dependencies: extractDateRangeFromHTML()
  - MOVE TO: ui.js

- **Line 3314-3340: `function selectSubjectLine(subject)`**
  - Handles subject line selection
  - Dependencies: updateLivePreview()
  - MOVE TO: ui.js

### Template Selection
- **Line 3626-3768: `function selectTemplate(key)`**
  - Selects template and renders appropriate form
  - Dependencies: renderPromotionEmailForm(), showRegularOutput(), attachEventListeners()
  - MOVE TO: ui.js

### Form Population/Rendering
- **Line 3545-3573: `function populateDropdown(category = 'all')`**
  - Populates template dropdown by category
  - MOVE TO: ui.js

### Copy to Clipboard
- **Line 4117-4155: `function copyToClipboard()`**
  - Copies message or preview to clipboard
  - MOVE TO: ui.js

### Generate/Clear/Reset Functions
- **Line 3910-4023: `function generateMessage()`**
  - Main generation function for any template type
  - Dependencies: templates[], appState, highlightEmptyRequiredFields(), updateLivePreview(), generateSubjectLines()
  - MOVE TO: ui.js (Core UI function)

- **Line 4025-4115: `function highlightEmptyRequiredFields()`**
  - Highlights empty required fields
  - MOVE TO: ui.js

- **Line 4040-4114: `async function clearAll()`**
  - Clears all form data
  - Dependencies: initializeDefaultItems(), clearAllPDFsFromIndexedDB(), clearBulkEmailRecipientsFromIndexedDB()
  - MOVE TO: ui.js

### PDF Preview Modal
- **Line 3126-3161: `function initPDFPreviewModal()`**
  - Initializes PDF preview modal
  - Dependencies: closePDFPreview(), downloadPDFFromPreview()
  - MOVE TO: ui.js

### Template Search
- **Line 4349-4352: Event listener for search** (in init())
  - MOVE TO: ui.js as part of event setup

### Status Update Functions
- **Line 3342-3360: `function updateFormatStatus()`**
  - Updates format recommendation status
  - Dependencies: getRecommendedFormat(), isComplexEmail()
  - MOVE TO: ui.js

- **Line 4867-4949: `function updateBulkAnalysis()`**
  - Updates bulk email analysis panel
  - Dependencies: parseEmailList(), isValidEmail(), detectDuplicates()
  - MOVE TO: ui.js

### Utility Functions for UI
- **Line 1754-1765: `function debounce(func, wait)`**
  - Debounce utility function
  - MOVE TO: ui.js

- **Line 1171-1177: `function isHTMLContent(text)`**
  - Detects if content is HTML
  - MOVE TO: ui.js

---

## 4. FUNCTIONS FOR state.js (Already Partially There + More)

### Already in state.js:
- `const appState = {...}`
- `function captureState()`
- `function restoreState(state)`
- `const MAX_HISTORY = 50`

### Need to Move to state.js:

#### State Initialization
- **Line 2429-2458: `function initializeDefaultItems()`**
  - Initializes default "How to Shop" and "Important Notes" items
  - MOVE TO: state.js (state initialization)

#### Promotion Email List Operations
- **Line 1856-1870: `function addPromotionEntry()`**
  - Adds new promotion entry
  - Dependencies: appState.promotionEntries, captureState()
  - MOVE TO: state.js

- **Line 1871-1877: `function removePromotionEntry(entryId)`**
  - Removes promotion entry
  - Dependencies: appState.promotionEntries, captureState()
  - MOVE TO: state.js

- **Line 1878-1887: `function movePromotionEntryUp(entryId)`**
  - Moves entry up in list
  - Dependencies: appState.promotionEntries, captureState()
  - MOVE TO: state.js

- **Line 1888-1897: `function movePromotionEntryDown(entryId)`**
  - Moves entry down in list
  - Dependencies: appState.promotionEntries, captureState()
  - MOVE TO: state.js

#### Special Hours List Operations
- **Line 1898-1909: `function addSpecialHour()`**
  - Adds special hour entry
  - Dependencies: appState.specialHours, captureState()
  - MOVE TO: state.js

- **Line 1910-1916: `function removeSpecialHour(hourId)`**
  - Removes special hour
  - Dependencies: appState.specialHours, captureState()
  - MOVE TO: state.js

- **Line 1917-1926: `function moveSpecialHourUp(hourId)`**
  - Moves hour up in list
  - Dependencies: appState.specialHours, captureState()
  - MOVE TO: state.js

- **Line 1927-1936: `function moveSpecialHourDown(hourId)`**
  - Moves hour down in list
  - Dependencies: appState.specialHours, captureState()
  - MOVE TO: state.js

#### How to Shop Items Operations
- **Line 1937-1943: `function addHowToShopItem()`**
  - Adds How to Shop item
  - Dependencies: appState.howToShopItems, captureState()
  - MOVE TO: state.js

- **Line 1944-1949: `function removeHowToShopItem(itemId)`**
  - Removes How to Shop item
  - Dependencies: appState.howToShopItems, captureState()
  - MOVE TO: state.js

- **Line 1950-1958: `function moveHowToShopItemUp(itemId)`**
  - Moves item up in list
  - Dependencies: appState.howToShopItems, captureState()
  - MOVE TO: state.js

- **Line 1959-1968: `function moveHowToShopItemDown(itemId)`**
  - Moves item down in list
  - Dependencies: appState.howToShopItems, captureState()
  - MOVE TO: state.js

#### Important Notes Items Operations
- **Line 1969-1975: `function addImportantNotesItem()`**
  - Adds Important Notes item
  - Dependencies: appState.importantNotesItems, captureState()
  - MOVE TO: state.js

- **Line 1976-1981: `function removeImportantNotesItem(itemId)`**
  - Removes Important Notes item
  - Dependencies: appState.importantNotesItems, captureState()
  - MOVE TO: state.js

- **Line 1982-1990: `function moveImportantNotesItemUp(itemId)`**
  - Moves item up in list
  - Dependencies: appState.importantNotesItems, captureState()
  - MOVE TO: state.js

- **Line 1991-2000: `function moveImportantNotesItemDown(itemId)`**
  - Moves item down in list
  - Dependencies: appState.importantNotesItems, captureState()
  - MOVE TO: state.js

#### Section Collapse/Expand Toggles
- **Line 2001-2005: `function toggleHowToShop()`**
  - Toggles "How to Shop" section expansion
  - Dependencies: appState.howToShopExpanded, renderHowToShopSection()
  - MOVE TO: state.js

- **Line 2006-2010: `function toggleImportantNotes()`**
  - Toggles "Important Notes" section expansion
  - Dependencies: appState.importantNotesExpanded, renderImportantNotesSection()
  - MOVE TO: state.js

- **Line 2011-2016: `function toggleEntryCollapse(entryId)`**
  - Toggles individual entry collapse state
  - Dependencies: appState.entryCollapsedStates, renderPromotionEntries()
  - MOVE TO: state.js

#### Template Save/Load/Import/Export
- **Line 835-888: `async function savePromotionTemplate()`**
  - Saves promotion template to localStorage
  - Dependencies: All appState promotion properties, savePDFToIndexedDB()
  - MOVE TO: state.js (State persistence)

- **Line 891-1080: `function importPromotionTemplate()`**
  - Imports promotion template from file or localStorage
  - Dependencies: applyImportedConfig()
  - MOVE TO: state.js (State persistence)

- **Line 953-1080: `async function applyImportedConfig(config, collapseEntries = true)`**
  - Applies imported config to state
  - Dependencies: All appState properties, getPDFFromIndexedDB()
  - MOVE TO: state.js (State persistence)

- **Line 1082-1100: `function importFromLocalStorage()`**
  - Imports template from localStorage
  - Dependencies: applyImportedConfig()
  - MOVE TO: state.js (State persistence)

- **Line 1102-1138: `function exportPromotionTemplate()`**
  - Exports template to JSON file
  - Dependencies: formatDateRangeForFilename(), generateZipFilenameFromHTML()
  - MOVE TO: state.js (State persistence)

#### PDF Management
- **Line 2809-2897: `function handlePDFUpload(e)`**
  - Handles PDF file upload
  - Dependencies: handlePDFFiles(), savePDFToIndexedDB()
  - MOVE TO: state.js (with UI event handlers in ui.js)

- **Line 2816-2897: `function handlePDFFiles(files)`**
  - Processes PDF files
  - Dependencies: savePDFToIndexedDB(), renderAttachedPDFs(), showToast()
  - MOVE TO: state.js

- **Line 2952-2969: `async function removePDF(pdfId)`**
  - Removes PDF from state and IndexedDB
  - Dependencies: deletePDFFromIndexedDB(), renderAttachedPDFs()
  - MOVE TO: state.js

- **Line 2975-3081: `function previewPDF(pdfId)`**
  - Preview PDF in modal
  - Dependencies: getPDFFromIndexedDB(), currentPreviewPDF, currentBlobUrl
  - MOVE TO: state.js (or ui.js if it's primarily UI)

- **Line 3083-3111: `function closePDFPreview()`**
  - Closes PDF preview modal
  - Dependencies: currentPreviewPDF, currentBlobUrl
  - MOVE TO: state.js (or ui.js)

- **Line 3113-3124: `function downloadPDFFromPreview()`**
  - Downloads PDF from preview
  - Dependencies: currentPreviewPDF
  - MOVE TO: state.js (or ui.js)

### Global Variables to Move to appState:
- **Line 6: `let db = null;`** (Database connection)
  - MOVE TO: state.js as appState.db
  
- **Line 2971-2972: Global PDF preview state**
  - `let currentPreviewPDF = null;`
  - `let currentBlobUrl = null;`
  - MOVE TO: appState as appState.currentPreviewPDF and appState.currentBlobUrl

### Constants to Keep/Organize:
- **Line 2: `const TOAST_DURATION_MS = 2500;`** - Keep in app.js or ui.js
- **Line 7-10: Database constants**
  - `const DB_NAME = 'CitizenTemplates';`
  - `const DB_VERSION = 2;`
  - `const STORE_NAME = 'promotionPDFs';`
  - `const BULK_EMAIL_STORE = 'bulkEmailRecipients';`
  - Keep in state.js as part of database configuration

---

## 5. FUNCTIONS REMAINING IN app.js (Core/Init)

### Store Profile Functions (Currently reference appState)
- **Line 217-227: Profile getter functions**
  - `function getStorePhone()`
  - `function getStoreName()`
  - `function getStoreLocation()`
  - `function getFullStoreLocation()`
  - Can MOVE TO: state.js or keep in app.js as config accessors

- **Line 238-315: `function getEmployeeSignature(format = 'text')`**
  - Gets employee signature
  - Dependencies: appState.userProfile
  - Can MOVE TO: state.js

- **Line 1153-1162: `function loadUserProfile()`**
  - Loads user profile from localStorage
  - MOVE TO: state.js

- **Line 1140-1150: `function detectOS()`**
  - Detects operating system
  - Used in: getRecommendedFormat()
  - MOVE TO: eml.js or utils

- **Line 4811-4814: `function getRecommendedFormat()`** (Duplicate)
  - Note: This function appears twice (line 1147 and 4811)
  - Consolidate and MOVE TO: eml.js

### Utility Functions
- **Line 4951-4970: `function extractDateRangeFromHTML(htmlContent)`**
  - Extracts date range from HTML content
  - MOVE TO: templates.js or ui.js (text processing)

- **Line 4972-5004: `function formatDateRangeForFilename(dateRangeText)`**
  - Formats date range for filename
  - MOVE TO: eml.js or utils

- **Line 5006-5017: `function generateZipFilenameFromHTML(htmlContent)`**
  - Generates ZIP filename from HTML content
  - MOVE TO: eml.js

### Field Input Functions
- **Line 3867-3908: `function validateField(input)`**
  - Validates individual form field
  - MOVE TO: ui.js (form validation)

- **Line 3840-3865: `function updateCalculatedFields(msrpInput, discountInput)`**
  - Calculates derived fields (e.g., sale price from MSRP and discount)
  - MOVE TO: ui.js (form processing)

### Event Listener Setup
- **Line 3770-3830: `function attachEventListeners()`**
  - Sets up all form event listeners
  - MOVE TO: ui.js

### Keyboard Shortcuts
- **Line 3361-3377: `function handleUndoRedoShortcuts(e)`**
  - Handles Ctrl+Z, Ctrl+Y keyboard shortcuts
  - MOVE TO: ui.js

### IndexedDB Functions (Currently top-level)
- **Line 13-48: `function initIndexedDB()`**
  - Initialize database
  - MOVE TO: state.js
  
- **Line 51-65: `function savePDFToIndexedDB(pdfData)`**
  - MOVE TO: state.js

- **Line 68-82: `function getAllPDFsFromIndexedDB()`**
  - MOVE TO: state.js

- **Line 85-99: `function getPDFFromIndexedDB(pdfId)`**
  - MOVE TO: state.js

- **Line 102-117: `function deletePDFFromIndexedDB(pdfId)`**
  - MOVE TO: state.js

- **Line 119-134: `function clearAllPDFsFromIndexedDB()`**
  - MOVE TO: state.js

- **Line 136-155: `function saveBulkEmailRecipientsToIndexedDB(recipients)`**
  - MOVE TO: state.js

- **Line 157-175: `function getBulkEmailRecipientsFromIndexedDB()`**
  - MOVE TO: state.js

- **Line 177-205: `function clearBulkEmailRecipientsFromIndexedDB()`**
  - MOVE TO: state.js

### Initialization Function
- **Line 4330-4379: `async function init()`**
  - Main app initialization
  - KEEP IN: app.js
  - Will call init functions from other modules

---

## DEPENDENCY ANALYSIS

### Circular Dependencies to Watch:
1. **ui.js → state.js** (ui functions call state functions)
2. **state.js → ui.js** (state functions call render functions)
3. **eml.js → templates.js** (email functions use template utilities)

**Solution:** 
- Organize file loading order: state.js → templates.js → eml.js → ui.js → app.js
- Use callback or event patterns to break circular dependencies where needed

### Cross-Module Dependencies:

**templates.js dependencies:**
- Standalone (minimal external dependencies)
- Uses: sanitizeHTML(), escapeHtml() (internal)

**eml.js dependencies:**
- templates.js (for convertTextToHTML)
- state.js (for appState.currentTemplate)
- External: JSZip library for batch operations

**ui.js dependencies:**
- state.js (appState, captureState, etc.)
- templates.js (templates object, field config)
- eml.js (openEmailClientUniversal, downloadEmailFile)
- state.js render functions (renderPromotionEntries, etc.)

**state.js dependencies:**
- Standalone for state management
- IndexedDB operations (built-in browser API)
- localStorage operations (built-in browser API)

**app.js dependencies:**
- All modules (orchestrates initialization)
- External: html2pdf.js library (CSS injection at top)

---

## SUMMARY TABLE

| Function Name | Current Line | Destination | Category |
|---|---|---|---|
| templates (object) | 488-828 | templates.js | Template Definition |
| templateHelp | 387-405 | templates.js | Template Metadata |
| fieldConfig | 407-440 | templates.js | Template Metadata |
| generatePromotionEmailHTML | 3379 | templates.js | Template Generation |
| generatePromoTitle | 1813 | templates.js | Template Generation |
| sanitizeHTML | 441 | templates.js | Template Helper |
| escapeAttr | 448 | templates.js | Template Helper |
| sanitizeTemplateData | 453 | templates.js | Template Helper |
| getFieldSuggestions | 465 | templates.js | Template Helper |
| formatPhoneNumber | 470 | templates.js | Template Helper |
| validateTracking | 477 | templates.js | Template Helper |
| convertTextToHTML | 317 | templates.js | Template Helper |
| escapeHtml | 1714 | templates.js | Template Helper |
| createEMLFile | 4243 | eml.js | Email File Creation |
| createGenericEMLFile | 4592 | eml.js | Email File Creation |
| createBCCBatchEML | 5019 | eml.js | Email File Creation |
| openInEmailClient | 4157 | eml.js | Email Client Integration |
| openPromotionEmailInClient | 4198 | eml.js | Email Client Integration |
| openEmailClientUniversal | 4740 | eml.js | Email Client Integration |
| downloadEmailFile | 4757 | eml.js | Email Download |
| encodeSubject | 4448 | eml.js | Email Encoding |
| utf8ToBase64 | 4465 | eml.js | Email Encoding |
| encodeFilename | 4478 | eml.js | Email Encoding |
| encodeQuotedPrintable | 4562 | eml.js | Email Encoding |
| parseEmailList | 4382 | eml.js | Email Parsing |
| isValidEmail | 4400 | eml.js | Email Validation |
| extractSubjectLine | 4494 | eml.js | Email Processing |
| validateSubject | 4433 | eml.js | Email Validation |
| isComplexEmail | 4805 | eml.js | Email Validation |
| detectDuplicates | 4850 | eml.js | Email Validation |
| generateBulkEmailFiles | 5178 | eml.js | Email Download |
| validateBatchSize | 4816 | eml.js | Email Validation |
| wrapHtmlForEmailPreview | 1641 | ui.js | Email Preview |
| updateEmailPreview | 1584 | ui.js | Email Preview |
| updateSubjectInPreview | 1724 | ui.js | Email Preview |
| updateLivePreview | 1767 | ui.js | Email Preview |
| debouncedLivePreview | 1804 | ui.js | Debounce |
| debouncedSubjectPreviewUpdate | 1807 | ui.js | Debounce |
| debouncedCaptureState | 1810 | ui.js | Debounce |
| showTabbedOutput | 1180 | ui.js | Output Display |
| showRegularOutput | 1411 | ui.js | Output Display |
| renderPromotionEmailForm | 2460 | ui.js | Form Rendering |
| renderPromotionEntries | 2081 | ui.js | Item Rendering |
| renderSpecialHours | 2196 | ui.js | Item Rendering |
| renderHowToShopSection | 2257 | ui.js | Section Rendering |
| renderHowToShopItems | 2290 | ui.js | Item Rendering |
| renderImportantNotesSection | 2343 | ui.js | Section Rendering |
| renderImportantNotesItems | 2376 | ui.js | Item Rendering |
| renderAttachedPDFs | 2899 | ui.js | Item Rendering |
| renderSubjectLines | 3239 | ui.js | Subject Rendering |
| renderSearchResults | 3575 | ui.js | Search Rendering |
| setupDragAndDrop | 2017 | ui.js | Drag & Drop |
| updateEntryData | 2179 | ui.js | Form Input |
| updateSpecialHourData | 2244 | ui.js | Form Input |
| renderEditableSubjectLine | 4500 | ui.js | Subject Rendering |
| generateSubjectLines | 3164 | ui.js | Subject Generation |
| selectSubjectLine | 3314 | ui.js | Subject Selection |
| selectTemplate | 3626 | ui.js | Template Selection |
| populateDropdown | 3545 | ui.js | Form Population |
| copyToClipboard | 4117 | ui.js | Copy Function |
| generateMessage | 3910 | ui.js | Core Generation |
| highlightEmptyRequiredFields | 4025 | ui.js | Form Validation |
| clearAll | 4040 | ui.js | Form Reset |
| initPDFPreviewModal | 3126 | ui.js | Modal Setup |
| updateFormatStatus | 3342 | ui.js | Status Update |
| updateBulkAnalysis | 4867 | ui.js | Analysis Panel |
| debounce | 1754 | ui.js | Utility |
| isHTMLContent | 1171 | ui.js | Content Detection |
| initializeDefaultItems | 2429 | state.js | State Initialization |
| addPromotionEntry | 1856 | state.js | List Operations |
| removePromotionEntry | 1871 | state.js | List Operations |
| movePromotionEntryUp | 1878 | state.js | List Operations |
| movePromotionEntryDown | 1888 | state.js | List Operations |
| addSpecialHour | 1898 | state.js | List Operations |
| removeSpecialHour | 1910 | state.js | List Operations |
| moveSpecialHourUp | 1917 | state.js | List Operations |
| moveSpecialHourDown | 1927 | state.js | List Operations |
| addHowToShopItem | 1937 | state.js | List Operations |
| removeHowToShopItem | 1944 | state.js | List Operations |
| moveHowToShopItemUp | 1950 | state.js | List Operations |
| moveHowToShopItemDown | 1959 | state.js | List Operations |
| addImportantNotesItem | 1969 | state.js | List Operations |
| removeImportantNotesItem | 1976 | state.js | List Operations |
| moveImportantNotesItemUp | 1982 | state.js | List Operations |
| moveImportantNotesItemDown | 1991 | state.js | List Operations |
| toggleHowToShop | 2001 | state.js | UI State |
| toggleImportantNotes | 2006 | state.js | UI State |
| toggleEntryCollapse | 2011 | state.js | UI State |
| savePromotionTemplate | 835 | state.js | State Persistence |
| importPromotionTemplate | 891 | state.js | State Persistence |
| applyImportedConfig | 953 | state.js | State Persistence |
| importFromLocalStorage | 1082 | state.js | State Persistence |
| exportPromotionTemplate | 1102 | state.js | State Persistence |
| handlePDFUpload | 2809 | state.js | PDF Management |
| handlePDFFiles | 2816 | state.js | PDF Management |
| removePDF | 2952 | state.js | PDF Management |
| previewPDF | 2975 | state.js/ui.js | PDF Preview |
| closePDFPreview | 3083 | state.js/ui.js | PDF Preview |
| downloadPDFFromPreview | 3113 | state.js/ui.js | PDF Download |
| initIndexedDB | 13 | state.js | Database |
| savePDFToIndexedDB | 51 | state.js | Database |
| getAllPDFsFromIndexedDB | 68 | state.js | Database |
| getPDFFromIndexedDB | 85 | state.js | Database |
| deletePDFFromIndexedDB | 102 | state.js | Database |
| clearAllPDFsFromIndexedDB | 119 | state.js | Database |
| saveBulkEmailRecipientsToIndexedDB | 136 | state.js | Database |
| getBulkEmailRecipientsFromIndexedDB | 157 | state.js | Database |
| clearBulkEmailRecipientsFromIndexedDB | 177 | state.js | Database |
| getStorePhone | 217 | state.js or app.js | Profile Access |
| getStoreName | 221 | state.js or app.js | Profile Access |
| getStoreLocation | 225 | state.js or app.js | Profile Access |
| getFullStoreLocation | 229 | state.js or app.js | Profile Access |
| getEmployeeSignature | 238 | state.js or app.js | Profile Access |
| loadUserProfile | 1153 | state.js | Profile Loading |
| detectOS | 1140 | eml.js or utils | OS Detection |
| extractDateRangeFromHTML | 4951 | ui.js/utils | Text Processing |
| formatDateRangeForFilename | 4972 | eml.js or utils | Filename Processing |
| generateZipFilenameFromHTML | 5006 | eml.js or utils | Filename Processing |
| validateField | 3867 | ui.js | Form Validation |
| updateCalculatedFields | 3840 | ui.js | Form Processing |
| attachEventListeners | 3770 | ui.js | Event Setup |
| handleUndoRedoShortcuts | 3361 | ui.js | Keyboard Shortcuts |
| init | 4330 | app.js | Initialization |

---

## RECOMMENDED FILE LOAD ORDER

```html
<!-- In index.html -->
<script src="state.js"></script>
<script src="templates.js"></script>
<script src="eml.js"></script>
<script src="ui.js"></script>
<script src="app.js"></script>
```

This order ensures:
1. State is available first (no dependencies)
2. Templates can use state for profile info
3. Email utilities can use templates
4. UI functions have access to all above
5. App orchestrates everything

---

## REMAINING ITEMS IN APP.JS

After refactoring, app.js will contain:
- CSS injection (line 207-216)
- Constants (TOAST_DURATION_MS, DB constants - can consolidate)
- init() function - main app entry point
- DOMContentLoaded event listener (line 5439-5442)
- Profile accessor functions (optional)
- OS detection (optional)
- Any remaining utility functions

---

## NOTES

1. **Circular Dependencies:** The captureState/restoreState functions in state.js call render functions. These should be imported/required dynamically or passed as callbacks to avoid circular dependency issues.

2. **Global Variables:** currentPreviewPDF and currentBlobUrl should be moved to appState to centralize state management.

3. **Elements Object:** Currently referenced but managed in ui.js - ensure proper initialization order.

4. **Bulk Email Features:** The bulk email system (validation, BCC batching, ZIP creation) is fairly self-contained in eml.js once extracted.

5. **HTML2PDF Library:** This is injected via CSS at the top of app.js and used implicitly - verify it's still available in templates.js or where needed.

6. **Debouncing:** Three debounced functions need to be in ui.js and properly managed to avoid memory leaks during long sessions.

