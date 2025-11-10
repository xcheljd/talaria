# UI Structure Analysis - Communication Template Generator

## Overview
The application has a dual-display system with conditional tab rendering based on template type:
- **Promotion Email Templates** use a **tabbed interface** with Preview/HTML Code tabs
- **Regular Templates** use a **simple textarea output** system

---

## 1. Main HTML File Structure

### Primary File: `/index.html`

#### Header Section (lines 10-48)
```html
<div class="header">
    <div class="header-top">
        <h1>Communication Template Generator</h1>
        <div class="header-controls">
            <button class="nav-toggle" id="navToggle">Hide Navigation</button>
            <button class="theme-toggle" id="themeToggle">Theme Toggle</button>
            <a href="start.html" class="profile-link">Profile</a>
        </div>
    </div>
    <div class="navigation" id="navigation">
        <select class="template-select" id="templateSelect">
        <div class="search-container">
            <input class="search-box" id="searchBox">
            <div class="search-results" id="searchResults">
        <div class="category-tabs">
            <button class="tab active" data-category="all">All</button>
            <button class="tab" data-category="Customer Email">Email</button>
            <button class="tab" data-category="Phone Orders">Phone</button>
            <button class="tab" data-category="Text">Text</button>
        </div>
    </div>
</div>
```

#### Main Container (lines 51-72)
```html
<div class="container">
    <!-- Input Form Card -->
    <div class="card">
        <h2 class="section-title" id="formSectionTitle">Template Fields</h2>
        <div id="formFields" class="form-grid">
            <div class="placeholder-message" id="formPlaceholder">
                <p>Select a template to begin</p>
            </div>
        </div>
        <div class="button-group">
            <button class="btn" id="generateBtn">Generate</button>
            <button class="btn" id="clearBtn" disabled>Clear</button>
        </div>
    </div>

    <!-- Output Card (DYNAMIC CONTENT) -->
    <div class="card output-card">
        <h2 class="section-title">Generated Message</h2>
        <textarea class="output-textarea" id="outputArea"></textarea>
        <div class="button-group">
            <button class="btn" id="copyBtn">Copy Message</button>
        </div>
    </div>
</div>
```

The `.output-card` is a **sticky element** (CSS: `position: sticky; top: 2rem;`) that stays visible while scrolling.

---

## 2. Current Tab/Display System

### Two Display Modes

#### Mode 1: Tabbed Output (Promotion Email) - `showTabbedOutput()`
**Location**: `app.js` lines 1442-1670

When template is `'promotion-email'`, renders:

```html
<div class="output-tabs">
    <button class="output-tab active" data-tab="preview">Preview</button>
    <button class="output-tab" data-tab="code">HTML Code</button>
</div>

<div class="output-content active" id="previewContent">
    <iframe class="preview-iframe" id="previewIframe"></iframe>
</div>

<div class="output-content" id="codeContent">
    <textarea class="output-textarea" id="codeArea"></textarea>
</div>

<div class="button-group">
    <button class="btn" id="copyPreviewBtn">Copy HTML Code</button>
    <button class="btn" id="openEmailBtn">Download Email File & Open w/ Outlook</button>
    <button class="btn" id="generateBulkBtn">Generate BCC Batch Email Files</button>
</div>
```

**Tab Switching Logic** (lines 1591-1612):
```javascript
const tabs = elements.outputCard.querySelectorAll('.output-tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        // Update active content
        elements.outputCard.querySelectorAll('.output-content').forEach(content => {
            content.classList.remove('active');
        });
        if (targetTab === 'preview') {
            document.getElementById('previewContent').classList.add('active');
        } else {
            document.getElementById('codeContent').classList.add('active');
        }
    });
});
```

**Additional Sections** (before tabs):
- **Bulk Email Distribution** - Email list, batch size settings
- **Subject Lines Section** - Editable subject lines with character count

#### Mode 2: Regular Output - `showRegularOutput()`
**Location**: `app.js` lines 1673-1761

For regular templates, renders:

```html
<h2 class="section-title">Generated Message</h2>
<div id="subjectLineContainer" class="subject-line-section"></div>
<textarea class="output-textarea" id="outputArea"></textarea>
<div class="button-group">
    <button class="btn" id="copyBtn">Copy Message</button>
    <!-- Optional buttons for enhanced templates -->
    <button class="btn" id="sendEmailBtn">Send Email</button>
    <button class="btn" id="downloadEmailBtn">Download Email File</button>
</div>
```

---

## 3. CSS Classes Used for Styling

### Layout Classes

| Class | Purpose | CSS Properties |
|-------|---------|-----------------|
| `.container` | Main grid layout | `display: grid; grid-template-columns: 1fr 1fr; gap: 12px;` |
| `.card` | Content container | `background: var(--bg-secondary); border: 2px solid var(--border-subtle); padding: 10px; border-radius: var(--radius-lg);` |
| `.card.output-card` | Sticky output panel | `position: sticky; top: 2rem;` |
| `.form-grid` | Form fields layout | `display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 7px;` |

### Output/Tab Classes

| Class | Purpose | CSS Properties |
|-------|---------|-----------------|
| `.output-tabs` | Tab bar container | `display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--border-subtle);` |
| `.output-tab` | Individual tab button | `padding: 0.75rem 1.5rem; font-size: 0.8125rem; border-bottom: 3px solid transparent; transition: all var(--transition-base);` |
| `.output-tab.active` | Active tab state | `color: var(--accent-primary); border-bottom-color: var(--accent-primary);` |
| `.output-content` | Tab content panel | `display: none;` (hidden by default) |
| `.output-content.active` | Visible tab content | `display: block;` |
| `.output-textarea` | Text output area | `width: 100%; padding: 7px 31px 7px 10px; border: 2px solid var(--border-subtle); min-height: 96px; resize: vertical;` |
| `.preview-iframe` | Promotion email preview | `width: 100%; min-height: 600px; border: 2px solid var(--border-subtle);` |

### Button Classes

| Class | Purpose |
|-------|---------|
| `.btn` | Primary button | 
| `.button-group` | Button container with flexbox |
| `.output-tab:hover` | `color: var(--text-secondary);` |

---

## 4. Where Email Templates Are Rendered

### For Promotion Email (HTML):

**Live Preview** (lines 1779-1812):
```javascript
function updateLivePreview() {
    if (currentTemplate !== 'promotion-email') return;
    
    // Get form data
    const data = { promoDateRange, promoYear, promoTitle };
    
    // Generate HTML
    const htmlCode = generatePromotionEmailHTML(data);
    
    // Update code textarea
    const codeArea = getDynamicElement('codeArea');
    if (codeArea) {
        codeArea.value = htmlCode;
    }
    
    // Update preview iframe
    const previewIframe = getDynamicElement('previewIframe');
    if (previewIframe) {
        const iframeDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(htmlCode);
        iframeDoc.close();
    }
}
```

**Key Data Flow**:
1. User enters form data (date range, entries, hours, etc.)
2. `generatePromotionEmailHTML(data)` creates HTML (line 3389)
3. HTML is displayed in:
   - **Preview Tab**: `<iframe id="previewIframe">` shows rendered email
   - **Code Tab**: `<textarea id="codeArea">` shows HTML source

### For Regular Templates:

**Generate Function** (lines 3918-3990):
```javascript
function generateMessage() {
    // ... validation ...
    
    // Get template
    const template = templates[currentTemplate];
    const data = {}; // Collect form data
    
    // Generate message
    const message = template.generate(data);
    
    // Display in textarea
    elements.outputArea.value = message;
}
```

**Key Data Flow**:
1. User fills form fields with `data-field` attributes
2. Click "Generate" button calls `generateMessage()`
3. Data is extracted from form inputs
4. `template.generate(data)` creates message text
5. Result is placed in `#outputArea` textarea

---

## 5. Form Data Flow: Input to Output Display

### Data Collection Path

```
User Form Input → Template Fields (.form-input) 
    ↓
generateMessage() / updateLivePreview()
    ↓
Extract data from form with data-field attribute
    ↓
template.generate(data) or generatePromotionEmailHTML(data)
    ↓
Display in output area
```

### Regular Template Flow (Example):

```javascript
// Step 1: Form inputs with data-field attribute (in HTML)
<input class="form-input" data-field="recipientName" value="John">
<input class="form-input" data-field="storePhone" value="555-1234">

// Step 2: Generate function collects data
template.fields.forEach(field => {
    const input = elements.formFields.querySelector(`[data-field="${field}"]`);
    data[field] = input ? input.value : '';
});

// Step 3: Template.generate() processes data
const message = template.generate(data);
// Returns: "Dear John, our store number is 555-1234..."

// Step 4: Display output
elements.outputArea.value = message; // Updates #outputArea textarea
```

### Promotion Email Flow:

```javascript
// Step 1: User enters form data (live)
<input id="promoDateRange" value="Nov 28 - Dec 1">
<input id="promoYear" value="2024">
// Plus entries, hours, items via dynamic DOM

// Step 2: onChange triggers live preview (debounced 500ms)
debouncedLivePreview()

// Step 3: updateLivePreview() processes
function updateLivePreview() {
    const data = {
        promoDateRange: dateRangeInput.value,
        promoYear: yearInput.value,
        promoTitle: titleInput.value
    };
    
    const htmlCode = generatePromotionEmailHTML(data);
    // + includes: promotionEntries[], specialHours[], howToShopItems[], etc.
}

// Step 4: Render in dual tabs
codeArea.value = htmlCode;  // HTML Code tab
iframeDoc.write(htmlCode);  // Preview tab
```

---

## 6. JavaScript Functions That Handle Display/Rendering

### Core Display Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `showTabbedOutput()` | 1442-1670 | Creates tabbed interface for promotion emails |
| `showRegularOutput()` | 1673-1761 | Creates simple textarea for regular templates |
| `generateMessage()` | 3918-3990 | Generates and displays message on button click |
| `updateLivePreview()` | 1779-1812 | Updates preview in real-time for promotion email |
| `debouncedLivePreview` | 1816 | Debounced version (500ms delay) |

### Form Rendering Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `renderFormFields(template)` | Lines before 1362 | Creates form inputs for selected template |
| `renderPromotionEmailForm()` | 2470-2750 | Special form for promotion email with sections |
| `renderPromotionEntries()` | 2090-2187 | Renders discount entry rows (drag/drop enabled) |
| `renderSpecialHours()` | 2205-2253 | Renders special hours section |
| `renderHowToShopSection()` | 2266-2351 | Renders "How to Shop" collapsible section |
| `renderImportantNotesSection()` | 2352-2431 | Renders "Important Notes" collapsible section |
| `renderSubjectLines()` | Lines after 2435 | Renders auto-generated subject line options |

### Element Cache Management

| Function | Location | Purpose |
|----------|----------|---------|
| `cacheElements()` | 1362-1431 | Caches all static DOM element references |
| `getDynamicElement(id)` | 1434-1439 | Lazy-loads dynamic elements created after page load |

### Tab Interaction

```javascript
// Tab switching (lines 1591-1612 within showTabbedOutput)
const tabs = elements.outputCard.querySelectorAll('.output-tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Toggle active class on tab buttons
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Toggle active class on content panels
        elements.outputCard.querySelectorAll('.output-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show selected tab content
        if (targetTab === 'preview') {
            document.getElementById('previewContent').classList.add('active');
        } else {
            document.getElementById('codeContent').classList.add('active');
        }
    });
});
```

---

## 7. Key CSS Variables (Theme System)

The application uses CSS custom properties for theming:

```css
/* Light Mode (Default - Pastel Professional) */
[data-theme="light"][data-light-palette="pastel"] {
    --bg-primary: #fdfaf7;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f8f3ef;
    --accent-primary: #a98467;
    --accent-secondary: #d4a574;
    --text-primary: #2a2420;
    --text-secondary: #6b5d52;
    --border-subtle: #e8e0d8;
    --shadow-md: 0 4px 16px rgba(169, 132, 103, 0.12);
}

/* Dark Mode (Default - Midnight Blue) */
[data-theme="dark"][data-dark-palette="midnight-blue"] {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --accent-primary: #3b82f6;
    --text-primary: #f8fafc;
    --border-subtle: #334155;
}
```

Multiple palettes available:
- Light: pastel, golden-hour, terracotta, mint, lavender
- Dark: midnight-blue, cyberpunk, forest, purple, ember

---

## 8. Responsive Design

### Breakpoints

| Breakpoint | Changes |
|------------|---------|
| 1024px (tablet) | `.container` switches from 2-column to 1-column; `.output-card` from sticky to static |
| 768px (mobile) | `.form-grid` from multi-column to single column; header adjusted |
| 425px (small phone) | Padding reduced; tabs with scroll; compact layouts |

### Tab Styling at Mobile (line 1992-1999)
```css
@media (max-width: 768px) {
    .output-tabs {
        overflow-x: auto;
        gap: 0.5rem;
        -webkit-overflow-scrolling: touch;
    }
    
    .output-tab {
        padding: 0.75rem 1rem;
        white-space: nowrap;
        flex-shrink: 0;
    }
}
```

---

## 9. Dynamic Content Insertion

The `.output-card` element's innerHTML is completely replaced based on template type:

```javascript
// For promotion email
elements.outputCard.innerHTML = `
    <h2>Generated Email</h2>
    <div id="bulkEmailSection">...</div>
    <div id="subjectLinesSection">...</div>
    <div class="output-tabs">...</div>
    <div class="output-content active" id="previewContent">...</div>
    <div class="output-content" id="codeContent">...</div>
`;

// For regular templates
elements.outputCard.innerHTML = `
    <h2>Generated Message</h2>
    ${subjectLineSection}
    <textarea id="outputArea">...</textarea>
    ${buttonGroup}
`;
```

This approach means the DOM is completely rebuilt, requiring the element cache to be cleared and dynamic elements to be re-fetched using `getDynamicElement()`.

---

## Summary

The application uses:
- **Conditional rendering** based on `currentTemplate` value
- **CSS class toggling** for tab activation (`.active` class)
- **Dynamic HTML injection** into `.output-card` 
- **Event delegation** for tab clicks
- **Live preview debouncing** for promotion emails (500ms delay)
- **Element caching** for performance (with lazy loading for dynamic elements)
- **Multiple color palettes** via CSS custom properties
- **Responsive grid layout** that adapts from 2-column desktop to 1-column mobile

