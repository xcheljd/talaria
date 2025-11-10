# UI Flow Diagram - Data and Rendering

## Overall Application Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     index.html Structure                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ HEADER (Static)                                               │  │
│  │ ├─ Logo + Title                                              │  │
│  │ ├─ Navigation (Template Select, Search)                      │  │
│  │ ├─ Category Tabs (All | Email | Phone | Text)               │  │
│  │ └─ Theme Toggle + Profile Link                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ .container (Grid: 2 columns on desktop, 1 on mobile)         │  │
│  │                                                                 │  │
│  │  ┌─────────────────────┐    ┌─────────────────────────────┐ │  │
│  │  │ .card               │    │ .card.output-card (sticky)  │ │  │
│  │  │ INPUT FORM          │    │ OUTPUT DISPLAY              │ │  │
│  │  │                     │    │                             │ │  │
│  │  │ • formSectionTitle  │    │ DYNAMICALLY RENDERED        │ │  │
│  │  │ • formFields        │    │ Based on Template Type      │ │  │
│  │  │   (form-grid)       │    │                             │ │  │
│  │  │ • generateBtn       │    │ Regular Template:           │ │  │
│  │  │ • clearBtn          │    │ ├─ outputArea (textarea)    │ │  │
│  │  │                     │    │ └─ copyBtn                  │ │  │
│  │  │                     │    │                             │ │  │
│  │  │                     │    │ Promotion Email:            │ │  │
│  │  │                     │    │ ├─ bulkEmailSection         │ │  │
│  │  │                     │    │ ├─ subjectLinesSection      │ │  │
│  │  │                     │    │ ├─ output-tabs              │ │  │
│  │  │                     │    │ │  ├─ output-tab (Preview)  │ │  │
│  │  │                     │    │ │  └─ output-tab (Code)     │ │  │
│  │  │                     │    │ ├─ output-content (iframe)  │ │  │
│  │  │                     │    │ ├─ output-content (textarea)│ │  │
│  │  │                     │    │ └─ Multiple action buttons  │ │  │
│  │  └─────────────────────┘    └─────────────────────────────┘ │  │
│  │                                                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

         User Interaction → Form Data → Processing → Output Display
```

---

## Detailed Tab System (Promotion Email)

```
┌──────────────────────────────────────────────────────────────────┐
│ showTabbedOutput() - Called when template === 'promotion-email'  │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  HTML Structure Created:                                         │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ <div class="output-tabs">                                   │ │
│  │   <button class="output-tab active" data-tab="preview">   │ │
│  │     Preview                                                │ │
│  │   </button>                                                │ │
│  │   <button class="output-tab" data-tab="code">             │ │
│  │     HTML Code                                             │ │
│  │   </button>                                               │ │
│  │ </div>                                                     │ │
│  │                                                             │ │
│  │ <div class="output-content active" id="previewContent">  │ │
│  │   <iframe id="previewIframe"><!-- rendered email --></   │ │
│  │ </div>                                                     │ │
│  │                                                             │ │
│  │ <div class="output-content" id="codeContent">            │ │
│  │   <textarea id="codeArea"><!-- HTML source --></textarea> │ │
│  │ </div>                                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Event Listener Registration:                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ tabs.forEach(tab => {                                      │ │
│  │   tab.addEventListener('click', () => {                   │ │
│  │     // Toggle .active class on clicked tab                │ │
│  │     // Toggle .active class on corresponding content       │ │
│  │     // display: block (active) / display: none (!active)   │ │
│  │   })                                                       │ │
│  │ })                                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘

         CSS Controls Tab Visibility:
         
         .output-content { display: none; }
         .output-content.active { display: block; }
```

---

## Regular Template Output (Non-Promotion)

```
┌──────────────────────────────────────────────────────────────────┐
│ showRegularOutput() - Called for standard templates              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Simple Structure:                                               │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ <h2 class="section-title">Generated Message</h2>           │ │
│  │                                                             │ │
│  │ [Optional subject line editor if hasEditableSubject]      │ │
│  │                                                             │ │
│  │ <textarea class="output-textarea" id="outputArea">         │ │
│  │   [Generated message text displayed here]                  │ │
│  │ </textarea>                                                │ │
│  │                                                             │ │
│  │ <div class="button-group">                                 │ │
│  │   <button id="copyBtn">Copy Message</button>               │ │
│  │   [Optional buttons if hasEditableSubject]                │ │
│  │ </div>                                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: From Form Input to Output

### Regular Template Flow

```
User selects template
    ↓
templateSelect.addEventListener('change') 
    ↓
currentTemplate = 'selected-template-id'
    ↓
renderFormFields(template)
    └─ Creates form inputs with data-field attributes
    └─ Caches element references in elements object
    ↓
showRegularOutput()
    └─ Sets up .output-card with simple textarea
    ↓
User fills in form fields (data-field="fieldName")
    ↓
User clicks "Generate" button
    ↓
generateMessage()
    ├─ Validates required fields
    ├─ Collects data:
    │   template.fields.forEach(field => {
    │     const input = elements.formFields.querySelector(`[data-field="${field}"]`);
    │     data[field] = input ? input.value : '';
    │   })
    ├─ Processes: const message = template.generate(data)
    ├─ Displays: elements.outputArea.value = message
    └─ Shows toast: "Generation complete!"
    ↓
Output displayed in #outputArea textarea
    ↓
User can:
    ├─ Copy to clipboard (copyBtn)
    ├─ Send email (sendEmailBtn if hasEditableSubject)
    └─ Download as EML (downloadEmailBtn if hasEditableSubject)
```

### Promotion Email Flow

```
User selects 'promotion-email' template
    ↓
currentTemplate = 'promotion-email'
    ↓
renderPromotionEmailForm()
    └─ Creates complex form with:
       ├─ Promotion entries (drag/drop reorderable)
       ├─ Special hours (collapsible)
       ├─ How to shop items (collapsible)
       ├─ Important notes (collapsible)
       └─ PDF upload dropzone
    ↓
showTabbedOutput()
    └─ Creates tabbed interface with:
       ├─ Bulk email section
       ├─ Subject lines section
       ├─ Two tabs: Preview & HTML Code
       └─ Action buttons
    ↓
User enters form data (live)
    ├─ promoDateRange input value change
    ├─ promoYear input value change
    ├─ promoTitle input value change
    ├─ Add/edit promotion entries
    ├─ Add/edit special hours
    └─ Add/edit items
    ↓
onChange → debouncedLivePreview() (500ms delay)
    ↓
updateLivePreview()
    ├─ Collects current form data
    ├─ Calls generatePromotionEmailHTML(data)
    │   └─ Generates complete HTML email structure
    ├─ Updates #codeArea textarea with HTML source
    └─ Updates #previewIframe with rendered email
    ↓
User clicks Preview/Code tab
    ↓
Tab click event listener toggles .active class
    ├─ On Preview tab: #previewContent.classList.add('active')
    │                   #codeContent.classList.remove('active')
    └─ On Code tab:    #codeContent.classList.add('active')
                       #previewContent.classList.remove('active')
    ↓
CSS controls visibility:
    .output-content { display: none; }
    .output-content.active { display: block; }
    ↓
Both tabs show current data (live updates affect both)
    ↓
User can:
    ├─ Copy HTML code (copyPreviewBtn)
    ├─ Open in Outlook (openEmailBtn)
    └─ Generate bulk BCC files (generateBulkBtn)
```

---

## Element Caching Strategy

```
Page Load
    ↓
init() → cacheElements()
    └─ Static elements cached on page load:
       ├─ elements.searchBox
       ├─ elements.templateSelect
       ├─ elements.formFields
       ├─ elements.outputCard
       ├─ elements.toast
       └─ Many others...
    ↓
Template selected
    ↓
If promotion-email:
    ├─ showTabbedOutput() called
    ├─ elements.outputCard.innerHTML replaced (DOM rebuilt)
    ├─ Element cache for dynamic elements cleared:
    │  ├─ elements.codeArea = null
    │  ├─ elements.previewIframe = null
    │  ├─ elements.bulkEmailList = null
    │  └─ Others cleared...
    ├─ New event listeners attached to new DOM nodes
    └─ getDynamicElement('id') used to lazy-load on first access
    ↓
If regular template:
    ├─ showRegularOutput() called
    ├─ elements.outputCard.innerHTML replaced (DOM rebuilt)
    ├─ elements.outputArea re-cached
    └─ New event listeners attached
```

---

## CSS Styling Layer

```
HTML (Structure)
    ↓
Dynamic Classes Applied by JavaScript:
    ├─ .active (tabs, form sections, items)
    ├─ .error (validation)
    ├─ .loading (buttons)
    └─ .success (feedback)
    ↓
CSS Custom Properties (Theme Variables):
    ├─ --bg-primary, --bg-secondary, --bg-tertiary
    ├─ --text-primary, --text-secondary, --text-tertiary
    ├─ --accent-primary, --accent-secondary
    ├─ --border-subtle, --border-medium
    └─ --shadow-sm, --shadow-md, --shadow-lg
    ↓
Theme Selection (5 light palettes + 5 dark palettes)
    ├─ [data-theme="light"][data-light-palette="pastel"]
    ├─ [data-theme="dark"][data-dark-palette="midnight-blue"]
    └─ etc.
    ↓
Responsive Breakpoints:
    ├─ Desktop (1440px max): 2-column layout, sticky output
    ├─ Tablet (1024px): 1-column layout, static output
    ├─ Mobile (768px): Single column, stacked
    └─ Small Phone (425px): Minimal padding, scrollable tabs
```

---

## Key State Variables

```
Global State (app.js):
├─ currentTemplate: 'template-id' or null
├─ elements: { cache of DOM element references }
├─ templates: { template definitions }
├─ promotionEntries: [] (for promotion email)
├─ specialHours: [] (for promotion email)
├─ howToShopItems: [] (for promotion email)
├─ importantNotesItems: [] (for promotion email)
├─ attachedPDFs: [] (for promotion email)
├─ generatedSubjectLines: [] (for promotion email)
├─ selectedSubjectLine: null or { subject line data }
└─ userProfile: { user settings from localStorage }

localStorage:
├─ userProfile: JSON string of user data
├─ currentMode: 'light' or 'dark'
├─ lightPalette: 'pastel' | 'golden-hour' | etc.
├─ darkPalette: 'midnight-blue' | 'cyberpunk' | etc.
└─ savedPromotionTemplate: JSON of form state (optional)

IndexedDB (CitizenTemplates):
├─ promotionPDFs (object store)
│  └─ id: PDF filename, data: PDF blob, savedAt: timestamp
└─ bulkEmailRecipients (object store)
   └─ id: 'bulk-email-recipients', data: recipients array
```

---

## Rendering Decision Tree

```
Template selected?
│
├─ No → Show placeholder message: "Select a template to begin"
│
└─ Yes → Check if template === 'promotion-email'
         │
         ├─ Yes (Promotion)
         │  ├─ renderPromotionEmailForm()
         │  │  └─ Complex form with sections
         │  └─ showTabbedOutput()
         │     └─ Two-tab interface with iframe + textarea
         │
         └─ No (Regular)
            ├─ renderFormFields(template)
            │  └─ Simple data-field inputs
            └─ showRegularOutput()
               └─ Single textarea + copy button
                  (plus enhanced buttons if hasEditableSubject)
```

---

## Interactive Flow Example: "Preview" Tab Click

```
User clicks "Preview" tab button
    ↓
Event listener triggered:
    tab.addEventListener('click', () => { ... })
    ↓
targetTab = tab.dataset.tab  // 'preview'
    ↓
Remove .active from all tabs:
    tabs.forEach(t => t.classList.remove('active'))
    ↓
Add .active to clicked tab:
    tab.classList.add('active')
    ↓
Remove .active from all content:
    elements.outputCard.querySelectorAll('.output-content').forEach(content => {
        content.classList.remove('active')
    })
    ↓
Add .active to corresponding content:
    document.getElementById('previewContent').classList.add('active')
    ↓
CSS applies display property:
    .output-content { display: none; }           // hidden
    .output-content.active { display: block; }   // visible
    ↓
User sees preview tab content (iframe with rendered email)
```

