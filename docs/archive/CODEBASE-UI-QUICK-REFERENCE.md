# Quick Reference Guide - UI Structure & Data Flow

## Files Involved

| File | Purpose | Key Content |
|------|---------|-------------|
| `index.html` | Main application page | Header, container, form card, output card |
| `start.html` | User profile setup | Profile form with save/export/import |
| `styles.css` | All styling | Theme variables, responsive design, tab styles |
| `app.js` | Application logic | Templates, rendering, data processing |

---

## Quick Facts

### Template Types
- **Promotion Email** (`'promotion-email'`): HTML-based, tabbed output, live preview
- **Regular Templates** (all others): Text-based, simple textarea, click-to-generate

### Display Decision
```javascript
if (currentTemplate === 'promotion-email') {
    showTabbedOutput();          // Two-tab interface
} else {
    showRegularOutput();         // Simple textarea
}
```

### Tab System
- Uses CSS class `.active` for visibility control
- Two content panels with `display: none/block` toggling
- Tab data stored in `data-tab="preview"` or `data-tab="code"`

### Output Elements
- **Promotion Email Preview**: `<iframe id="previewIframe">`
- **Promotion Email Code**: `<textarea id="codeArea">`
- **Regular Template Output**: `<textarea id="outputArea">`

---

## Key CSS Classes

### Tab-Related
```css
.output-tabs             /* Flex container for tab buttons */
.output-tab              /* Individual tab button */
.output-tab.active       /* Currently selected tab (color: accent-primary) */
.output-content          /* Tab content panel (display: none) */
.output-content.active   /* Visible content panel (display: block) */
```

### Layout-Related
```css
.container              /* Main 2-column grid (1fr 1fr) */
.card                   /* Content container */
.card.output-card       /* Sticky output panel (position: sticky; top: 2rem;) */
.form-grid              /* Form inputs grid layout */
```

### Form Elements
```css
.form-input             /* Text/number/email inputs */
.form-textarea          /* Multi-line text areas */
.form-label             /* Field labels */
.button-group           /* Button container (flexbox) */
```

---

## Important Functions

### Display Functions
```javascript
showTabbedOutput()      // Lines 1442-1670  - Creates promotion email UI
showRegularOutput()     // Lines 1673-1761  - Creates regular template UI
generateMessage()       // Lines 3918-3990  - Triggers generation on button click
updateLivePreview()     // Lines 1779-1812  - Live preview for promotion emails
```

### Form Rendering
```javascript
renderFormFields()      // Creates form inputs for selected template
renderPromotionEmailForm()        // Renders complex promotion form
renderPromotionEntries()          // Renders discount entries with drag/drop
renderSpecialHours()              // Renders special hours section
renderHowToShopSection()          // Renders "How to Shop" section
```

### Element Management
```javascript
cacheElements()         // Lines 1362-1431  - Cache DOM references
getDynamicElement(id)   // Lines 1434-1439  - Lazy-load dynamic elements
```

---

## Data Flow at a Glance

### Regular Template
```
Form Input → generateMessage() → elements.outputArea.value = message
```

### Promotion Email
```
Form Input → debouncedLivePreview() → updateLivePreview() → 
  → codeArea.value = htmlCode
  → iframeDoc.write(htmlCode)
```

---

## Common Tasks

### Finding Output Display
**For promotion emails**: `/index.html` → `.card.output-card` gets replaced with `showTabbedOutput()` content

**For regular templates**: `/index.html` → `.card.output-card` gets replaced with `showRegularOutput()` content

### Tab Switching Logic
Location: `app.js` lines 1591-1612 within `showTabbedOutput()`

```javascript
tab.addEventListener('click', () => {
    // 1. Remove .active from all tabs
    // 2. Add .active to clicked tab  
    // 3. Toggle .active on corresponding content divs
    // CSS handles visibility: .active = display: block
});
```

### Template Selection Flow
1. User selects from `#templateSelect` dropdown
2. `templateSelect.addEventListener('change')` triggers
3. `currentTemplate = selectedValue`
4. Form fields rendered based on template type
5. Output area built (tabbed or simple) based on type

### Live Preview Update (Promotion Email)
1. User types in form field
2. `addEventListener('input')` fires
3. Calls `debouncedLivePreview()` (500ms delay)
4. `updateLivePreview()` collects data
5. Calls `generatePromotionEmailHTML(data)`
6. Updates both `#codeArea` and `#previewIframe`

---

## CSS Custom Properties (Theme)

### Active Variables by Theme
```css
/* Light Mode - Pastel Professional (default) */
--bg-secondary: #ffffff;
--accent-primary: #a98467;
--text-primary: #2a2420;

/* Dark Mode - Midnight Blue (default) */
--bg-secondary: #1e293b;
--accent-primary: #3b82f6;
--text-primary: #f8fafc;
```

### Available Palettes
- **Light**: pastel, golden-hour, terracotta, mint, lavender
- **Dark**: midnight-blue, cyberpunk, forest, purple, ember

---

## Responsive Breakpoints

| Size | Container | Form Grid | Tab Tabs |
|------|-----------|-----------|----------|
| Desktop (1440px+) | 2-column | auto-fit | flex |
| Tablet (1024px) | 1-column | 1-column | flex |
| Mobile (768px) | 1-column | 1-column | flex |
| Small (425px) | 1-column | 1-column | overflow-x: auto |

---

## Element IDs Reference

### Static Elements (cached on load)
- `#searchBox` - Template search input
- `#templateSelect` - Template dropdown
- `#formFields` - Form inputs container
- `#outputArea` - Output textarea (regular templates)
- `#generateBtn` - Generate button
- `#copyBtn` - Copy button
- `#toast` - Toast notification

### Dynamic Elements (created per template)
- `#promoDateRange` - Promotion date input
- `#promoYear` - Promotion year input
- `#promoTitle` - Promotion title input
- `#previewIframe` - Preview iframe (promotion only)
- `#codeArea` - HTML code textarea (promotion only)
- `#bulkEmailList` - Bulk email recipients (promotion only)

---

## State Management

### Global Variables
```javascript
let currentTemplate = null;              // Currently selected template
const elements = {};                     // DOM element cache
const templates = { /* ... */ };         // Template definitions
const promotionEntries = [];             // Promotion email discount rows
const specialHours = [];                 // Promotion special hours
const howToShopItems = [];               // Promotion "How to Shop"
const importantNotesItems = [];          // Promotion "Important Notes"
const attachedPDFs = [];                 // Promotion attached PDFs
const generatedSubjectLines = [];        // Promotion generated subjects
let selectedSubjectLine = null;          // Currently selected subject
let userProfile = {};                    // User profile from localStorage
```

### Storage
- **localStorage**: userProfile, currentMode, lightPalette, darkPalette
- **IndexedDB**: Promotion PDFs, bulk email recipients

---

## Common Code Patterns

### Tab Creation Pattern
```javascript
elements.outputCard.innerHTML = `
    <div class="output-tabs">
        <button class="output-tab active" data-tab="preview">Preview</button>
        <button class="output-tab" data-tab="code">Code</button>
    </div>
    <div class="output-content active" id="previewContent">...</div>
    <div class="output-content" id="codeContent">...</div>
`;

const tabs = elements.outputCard.querySelectorAll('.output-tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Toggle .active class
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Toggle content visibility
        elements.outputCard.querySelectorAll('.output-content').forEach(c => {
            c.classList.remove('active');
        });
        document.getElementById(`${tab.dataset.tab}Content`).classList.add('active');
    });
});
```

### Live Preview Pattern (Debounced)
```javascript
function updateLivePreview() {
    if (currentTemplate !== 'promotion-email') return;
    
    const data = { /* collect form data */ };
    const htmlCode = generatePromotionEmailHTML(data);
    
    // Update textarea
    getDynamicElement('codeArea').value = htmlCode;
    
    // Update iframe
    const iframe = getDynamicElement('previewIframe');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlCode);
    iframeDoc.close();
}

const debouncedLivePreview = debounce(updateLivePreview, 500);
```

### Element Caching Pattern
```javascript
// Initial cache (page load)
function cacheElements() {
    elements.outputArea = document.getElementById('outputArea');
    elements.generateBtn = document.getElementById('generateBtn');
    // ... etc
}

// Lazy loading (dynamic elements)
function getDynamicElement(id) {
    if (!elements[id]) {
        elements[id] = document.getElementById(id);
    }
    return elements[id];
}

// Cache clearing (DOM rebuild)
showTabbedOutput() {
    elements.codeArea = null;        // Clear old reference
    elements.outputCard.innerHTML = `...`; // Rebuild DOM
    // getDynamicElement() will re-fetch on next use
}
```

---

## Troubleshooting Guide

### Tab Not Switching
Check:
1. Event listeners attached in `showTabbedOutput()` lines 1591-1612
2. `.active` class being toggled correctly
3. CSS `.output-content { display: none; }` and `.output-content.active { display: block; }`
4. Tab buttons have correct `data-tab` attribute

### Output Not Displaying
Check:
1. `currentTemplate` is set
2. Correct render function called (`showTabbedOutput()` vs `showRegularOutput()`)
3. Element cache cleared if DOM rebuilt
4. Generate button click triggers `generateMessage()`

### Live Preview Not Updating (Promotion)
Check:
1. Event listeners on form inputs call `debouncedLivePreview()`
2. `updateLivePreview()` is debounced (500ms delay)
3. `generatePromotionEmailHTML()` returns valid HTML
4. Iframe document properly written

---

## File Sizes & Locations

| File | Lines | Size | Purpose |
|------|-------|------|---------|
| index.html | 123 | ~5KB | Main page |
| app.js | ~5500 | ~250KB | All logic |
| styles.css | ~2200 | ~80KB | All styles |
| start.html | ~1300 | ~50KB | Profile page |

