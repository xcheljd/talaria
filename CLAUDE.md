# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Citizen Communication Template Generator** is a web-based application for generating professional communication templates for Citizen Company Store operations. It's a single-page application (SPA) built with vanilla JavaScript, HTML, and CSS.

The application generates customer emails, phone order forms, text messages, and inter-store notifications with dynamic field substitution and user profile integration.

## Core Architecture

### File Structure

- `index.html` - Main application interface with template selection, form fields, and output display
- `start.html` - User profile configuration page (store name, phone, location, employee details)
- `app.js` - All application logic (~4000+ lines, monolithic design)
- `styles.css` - Complete styling with theme system (light/dark modes, 5 palettes each)

### Key Architectural Patterns

**Template System** (app.js:238-590):
- All templates stored in single `templates` object
- Each template has: `name`, `category`, `fields[]`, `generate()` function
- Categories: "Customer Email", "Phone Orders", "Text"
- Special template: `'promotion-email'` (complex HTML email builder with attachments)

**User Profile Integration** (app.js:120-134):
- Profile stored in `localStorage` with keys: `storeName`, `storePhone`, `storeLocation`, `storeEmail`, `employeeName`, `employeeId`
- Helper functions: `getStorePhone()`, `getStoreName()`, `getStoreLocation()`, `getFullStoreLocation()`
- Templates dynamically inject user profile data into generated messages

**Element Caching** (app.js:943-1096):
- DOM elements cached in `elements` object for performance
- `cacheElements()` called on initialization
- `getDynamicElement(id)` for elements created dynamically

**State Management**:
- Undo/Redo system (app.js:592-676) with `MAX_HISTORY = 50`
- State captured via `captureState()`, restored via `restoreState(state)`
- Supports keyboard shortcuts (Cmd/Ctrl+Z for undo, Cmd/Ctrl+Shift+Z for redo)

## Special Features

### Promotion Email Builder

The `'promotion-email'` template (app.js:556-589, 2049-2760) is a complex feature with:

- **Dynamic Entries**: Multiple brand/product promotions with add/remove/reorder
- **Drag & Drop**: Reorder promotion entries and special hours
- **PDF Attachments**: Upload multiple PDFs (max 10MB each) using JSZip library
- **Subject Line Generator**: AI-style subject line variations
- **Live Preview**: Debounced HTML preview with undo/redo support
- **EML/EMLTPL Export**: Outlook-compatible email files with RFC 822 compliance
- **Bulk Email Generation**: Create batched BCC emails in ZIP archives

Key functions:
- `renderPromotionEmailForm()` - Renders the complex UI
- `generatePromotionEmailHTML()` - Creates final HTML output
- `createEMLFile()` - Generates .eml or .emltpl files with proper headers
- `createBCCBatchEML()` - Creates bulk email batches with BCC recipients

### Email File Generation

**Format Support**:
- `.eml` - Standard RFC 822 email files (Windows/general use)
- `.emltpl` - Outlook for Mac templates (CRLF line endings required)

**Important Implementation Details** (app.js:3498-3860):
- Line endings: CRLF (`\r\n`) for Windows/Outlook compatibility
- BCC handling: Single header with comma-separated recipients (RFC 822 compliant)
- Base64 encoding for PDF attachments
- Proper MIME multipart boundaries
- Headers: `Message-Class`, `X-Outlook-Message-Flag`, `X-Mailer`, `X-Msg-Status`

**Known Limitation**: Mac Outlook may only display 1 BCC recipient in UI due to security, but all recipients receive email when sent (see app.js:3827-3829).

### Theme System

**Dual Theme Architecture** (app.js:4-76):
- Two modes: `light` and `dark`
- 5 palettes per mode (10 total palettes)
- Default: `pastel` (light), `midnight-blue` (dark)
- Palettes stored via `data-light-palette` and `data-dark-palette` attributes
- `localStorage` keys: `currentMode`, `lightPalette`, `darkPalette`

### Security

**XSS Prevention** (app.js:191-213):
- `sanitizeHTML(str)` - Escapes HTML special characters
- `escapeAttr(str)` - Escapes attribute values
- `sanitizeTemplateData(data)` - Sanitizes all template input data
- All user inputs are sanitized before template generation

## Development

### Running the Application

```bash
# No build process required - open directly in browser
open index.html

# Or use a local server to avoid CORS issues
python3 -m http.server 8000
# Then visit http://localhost:8000
```

### Testing

No formal test suite exists. Manual testing workflow:

1. Test each template category (Email, Phone, Text)
2. Test promotion email builder with multiple entries
3. Test PDF upload functionality
4. Test EML/EMLTPL export formats
5. Test bulk email generation
6. Verify email clients (Outlook Mac/Windows, Thunderbird)

Performance testing available in `performance_test.js`.

### Making Changes

**Adding a New Template**:

1. Add entry to `templates` object (app.js:238)
2. Define: `name`, `category`, `fields`, `generate` function
3. Add help text to `templateHelp` object (app.js:137)
4. Add field configurations to `fieldConfig` if using custom fields (app.js:157)
5. Template will auto-populate in dropdown via `populateDropdown()`

**Modifying User Profile**:

1. Edit `start.html` form fields
2. Update `loadUserProfile()` function (app.js:931) to load new fields
3. Update helper functions to expose new profile data
4. Update templates to use new profile data

**Email Format Changes**:

- **Critical**: Maintain CRLF line endings for .eml/.emltpl files
- Test with actual email clients after changes
- BCC recipients: Use single header with comma separation (RFC 822)
- See `createEMLFile()` (app.js:3498) and `createBCCBatchEML()` (app.js:3825)

## Common Patterns

### Field Validation

```javascript
// Phone number formatting (app.js:220)
function formatPhoneNumber(value)

// Tracking number validation (app.js:227)
function validateTracking(value)

// Required field validation (app.js:3215)
function validateField(input)
```

### Toast Notifications

```javascript
showToast('Message copied to clipboard!');
// Duration: TOAST_DURATION_MS = 2500ms
```

### Local Storage Usage

- User profile: `localStorage.getItem('userProfile')`
- Theme settings: `currentMode`, `lightPalette`, `darkPalette`
- Navigation state: `navCollapsed`
- Promotion templates: `promotionTemplates` (saved configurations)

## Dependencies

- **JSZip** (CDN): Required for PDF attachments and bulk email ZIP creation
- No other external dependencies
- Vanilla JavaScript (ES6+)

## Git Workflow

Recent commits focus on:
- Outlook .emltpl compatibility (CRLF line endings)
- RFC 822 BCC header compliance
- Mac Outlook BCC display limitations

When committing changes to email generation, always test with multiple email clients.

## Critical Notes

1. **Email Line Endings**: Always use CRLF (`\r\n`) for .eml/.emltpl files. Using LF breaks Outlook compatibility.

2. **Promotion Email Complexity**: The promotion email template is significantly more complex than others. It has its own rendering system, state management, and export logic.

3. **Profile Dependency**: Most templates rely on user profile data. Test profile integration when modifying templates.

4. **Performance**: DOM caching is critical. Always use cached elements from `elements` object rather than `document.getElementById()`.

5. **Security**: Never bypass `sanitizeTemplateData()` - all user inputs must be sanitized before template generation.

6. **Backwards Compatibility**: The application stores configurations in localStorage. Consider migration logic when changing data structures.
