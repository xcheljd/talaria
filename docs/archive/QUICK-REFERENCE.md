# Quick Reference Guide - Signature & EML System

## Quick Navigation

### Signature Function
- **File**: `app.js`
- **Lines**: 325-367
- **Function**: `getEmployeeSignature(format)`
- **Formats**: `'text'` (plain text) or `'html'` (Outlook-compatible)

### EML File Creation Functions
1. `createEMLFile()` - Lines 4187-4280 (Promotion emails with HTML + PDFs)
2. `createGenericEMLFile()` - Lines 4505-4605 (Simple templates, plain text)
3. `processHTMLForEML()` - Lines 4174-4183 (Signature conversion)

### Subject Line Functions
- `extractSubjectLine()` - Lines 4447-4450 (Extract from message)
- `renderEditableSubjectLine()` - Lines 4453-4502 (UI component)

### Template Management
- `templates` object - Lines 471+
- `selectTemplate()` - Lines 3610-3748
- `generateMessage()` - Lines 3890-3963
- `showRegularOutput()` - Lines 1645-1733 (Enhanced templates UI)

### Email Client Integration
- `openEmailClientUniversal()` - Lines 4608-4622 (mailto)
- `downloadEmailFile()` - Lines 4625-4660 (EML download)

---

## Data Flow Diagram

```
User Profile (localStorage)
    ↓
loadUserProfile() → userProfile object
    ↓
Template Selection
    ↓
selectTemplate(key) → Render form
    ↓
generateMessage()
    ↓
template.generate(data) → Calls getEmployeeSignature()
    ↓
Message with embedded signature
    ↓
showRegularOutput()
    ├→ For enhanced templates: Show subject editor + dual buttons
    └→ For simple templates: Show copy button only
    ↓
User Action: "Send Email" or "Download Email File"
    ↓
If Send Email:
    → openEmailClientUniversal()
    → mailto: URL with subject line
    → Opens email client
    
If Download EML:
    → downloadEmailFile()
    → createGenericEMLFile()
    → processHTMLForEML() converts signature
    → Downloads .eml or .emltpl file
```

---

## Enhanced Templates (v1.3.0)

**All 10 have these properties**:
- `hasEditableSubject: true`
- `supportsEML: true`
- `supportsMailto: true`
- Include `${getEmployeeSignature()}` in output
- Show dual buttons: "Send Email" + "Download Email File"

### Customer Email Templates
1. `new-customer-welcome` - Line 472
2. `new-model-arrival` - Line 494
3. `limited-edition` - Line 526
4. `vip-reconnection` - Line 555
5. `weekly-sale` - (Check around line 800+)

### Phone Order Templates
1. `phone-confirmation` - Line 587
2. `phone-shipped` - Line 625
3. `phone-under-500` - Line 658
4. `phone-corporate` - (Check around line 750+)
5. `inter-store-notification` - (Check around line 850+)

---

## Signature Data Sources (Priority Order)

```javascript
getEmployeeSignature() pulls from:

1. userProfile.employeeName OR 'Employee Name'
2. userProfile.jobTitle OR 'Sales Associate'
3. userProfile.companyEmail OR ''
4. userProfile.storeName OR 'Acme Store'
5. userProfile.storeLocation OR 'Orlando Premium Outlets'
6. userProfile.storeAddress OR ''
7. userProfile.storePhone OR '555-123-4567'
```

---

## EML File Output Structure

### Key Headers
```
Subject: [User-provided subject]
Date: [Current UTC date]
Message-ID: <unique.timestamp.randomid@cometcast.local>
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="----=_NextPart_[UNIQUE_BOUNDARY]"

Draft Markers (for Outlook):
X-Unsent: 1
X-Outlook-Message-Flag:
X-Outlook-Template: 1
Message-Class: IPM.Note
```

### Content Encoding
- **HTML emails**: Base64 (76-char lines)
- **Text emails**: Quoted-Printable (76-char lines with soft breaks)
- **Attachments**: Base64 (76-char lines)
- **Line Endings**: Always CRLF (\r\n)

---

## Subject Line Flow

```
template.generate() → "Subject: Line\n\nContent"
    ↓
extractSubjectLine() → "Subject: Line"
    ↓
renderEditableSubjectLine() → Creates input field
    ↓
User edits → window.currentSubjectLine = new value
    ↓
Email buttons use → window.currentSubjectLine
```

---

## Testing Checklist

### Manual Tests Completed (Per DEPLOYMENT-READY.md)
- ✅ Enhanced templates (10/10)
- ✅ Backward compatibility (3/3)
- ✅ EML generation (2/2)
- ✅ Subject line editing (12/12 scenarios)
- ✅ Email options (9/9 scenarios)
- ✅ Performance (4/4 operations < 1ms)

### Key Validation Functions
- `sanitizeTemplateData()` - XSS prevention
- `sanitizeHTML()` - HTML escaping
- `escapeAttr()` - Attribute escaping
- `validateTracking()` - UPS/FedEx/USPS format
- `isValidEmail()` - RFC 5322 compliant

---

## Common Tasks

### Find All Enhanced Templates
```javascript
// All templates with hasEditableSubject: true
Object.values(templates).filter(t => t.hasEditableSubject)
```

### Get User Profile
```javascript
// Load from localStorage
const profile = JSON.parse(localStorage.getItem('userProfile')) || {}
```

### Generate Signature
```javascript
// HTML version (for EML)
const htmlSig = getEmployeeSignature('html')

// Text version (for plain emails)
const textSig = getEmployeeSignature('text')
```

### Create EML File
```javascript
// For simple templates
const eml = createGenericEMLFile(subject, body, [], 'eml')

// For promotion emails
const eml = createEMLFile(subject, htmlBody, pdfAttachments, '', 'eml')
```

### Extract Subject
```javascript
const subject = extractSubjectLine(fullMessage)
// Returns: "Subject content" (without "Subject: " prefix)
```

---

## Performance Tips

### Current Performance
- EML generation: < 1ms
- Subject line updates: < 1ms
- DOM caching: 85% query reduction
- Memory: 36MB average

### Optimizations
- `debounce()` used for live preview (500ms)
- DOM elements cached in `elements` object
- IndexedDB for file storage (not localStorage)
- Base64/Quoted-Printable encoding optimized

---

## Security Notes

### XSS Prevention
- All user inputs go through `sanitizeHTML()`
- Attributes go through `escapeAttr()`
- Template data through `sanitizeTemplateData()`

### Email Validation
- RFC 5322 compliant regex checks
- 254 character limit enforced
- Control character detection in subjects

### PDF Handling
- Validates data URL format
- Checks base64 encoding
- Warns on missing data

---

## Browser Compatibility

### Required APIs
- **IndexedDB**: PDF storage
- **localStorage**: Profile persistence
- **Blob/URL**: File downloads
- **TextEncoder**: UTF-8 encoding
- **btoa**: Base64 encoding
- **Clipboard**: Copy functionality

### Supported Formats
- `.eml`: Windows Outlook, Gmail, Thunderbird
- `.emltpl`: Mac Mail, Apple Mail
- Works across Chrome, Firefox, Safari, Edge

---

## Debugging Tips

### Check Console for
- `console.log()`: Success messages
- `console.warn()`: Non-critical issues
- `console.error()`: Critical problems

### Monitor Window Object
```javascript
window.currentSubjectLine    // Current subject line
window.originalMessageContent // Full message for EML
```

### Inspect Elements Cache
```javascript
console.log(elements)  // See all cached DOM references
```

### User Profile Debug
```javascript
console.log(userProfile)  // Current profile data
```

---

## File References

| Item | File | Lines | Purpose |
|------|------|-------|---------|
| Signature function | app.js | 325-367 | Generate signatures |
| EML creation (complex) | app.js | 4187-4280 | Promotion emails |
| EML creation (simple) | app.js | 4505-4605 | Basic templates |
| HTML->EML conversion | app.js | 4174-4183 | Signature processing |
| Subject extraction | app.js | 4447-4450 | Parse subject line |
| Subject UI | app.js | 4453-4502 | Editable field |
| Templates object | app.js | 471+ | All template definitions |
| Template selection | app.js | 3610-3748 | Load template UI |
| Message generation | app.js | 3890-3963 | Generate output |
| Regular output UI | app.js | 1645-1733 | Display enhanced templates |
| Email opening | app.js | 4608-4622 | Mailto handler |
| EML download | app.js | 4625-4660 | Download handler |

---

## Key Constants

- `TOAST_DURATION_MS`: 2500 (notification timeout)
- `DB_NAME`: 'CometCast' (IndexedDB)
- `STORE_NAME`: 'promotionPDFs' (IndexedDB)
- `BULK_EMAIL_STORE`: 'bulkEmailRecipients' (IndexedDB)
- `MIME Boundary`: `----=_NextPart_[timestamp]_[randomid]`
- `Base64/QP Line Limit`: 76 characters
- `Subject Character Warning`: 50 characters

---

*Last Updated: v1.3.0 (November 2, 2025)*
