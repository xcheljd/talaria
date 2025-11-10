# COMPREHENSIVE IMPLEMENTATION PLAN
## Email Template Generator Enhancement Features

**Document Version**: 1.0
**Created**: November 3, 2025
**Status**: Ready for Implementation
**Estimated Total Effort**: 54-77 hours (~2 months with testing)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature 1: Preview/HTML Tabs](#feature-1-previewhtml-tabs)
3. [Feature 2: EML HTML Formatting](#feature-2-eml-html-formatting)
4. [Feature 3: Live Subject Updates](#feature-3-live-subject-updates)
5. [Integration Architecture](#integration-architecture)
6. [Implementation Timeline](#implementation-timeline)
7. [Testing Strategy](#testing-strategy)
8. [Risk Assessment](#risk-assessment)
9. [Success Criteria](#success-criteria)

---

## Executive Summary

This document provides a comprehensive implementation plan for three integrated features that enhance the Communication Template Generator application:

### Features Overview

| Feature | Purpose | Impact | Effort |
|---------|---------|--------|--------|
| **Preview/HTML Tabs** | Dual-tab interface showing rendered preview and HTML source | High - Better user experience | 25-35 hours |
| **EML HTML Formatting** | Multipart emails with HTML signatures and clickable links | High - Professional emails | 25-35 hours |
| **Live Subject Updates** | Real-time subject field updates in preview/HTML tabs | Medium - Better UX | 4-7 hours |

### Key Benefits

- **WYSIWYG Experience**: Users see exactly how emails will appear
- **Professional Output**: HTML emails with branded signatures and clickable links
- **Real-time Feedback**: Instant preview updates as users edit
- **Email Client Compatibility**: RFC-compliant multipart/alternative format
- **Accessibility**: ARIA attributes and screen reader support

### Integration Points

All three features work together seamlessly:
- Subject changes immediately update Preview & HTML tabs
- Preview tab shows HTML email with proper signature formatting
- Download EML creates file with same HTML shown in preview
- Single `convertTextToHTML()` function used by all features

---

# Feature 1: Preview/HTML Tabs

## 1.1 Overview

Add a dual-tab interface to regular email templates showing:
- **Preview Tab**: Rendered HTML email (how it looks in email client)
- **HTML Tab**: Raw HTML/text source code

### Current Situation
- Regular templates show only plain textarea output
- Promotion email template already has tabs (working correctly)
- Need to add tabs to 10 other enhanced templates

### Technical Challenge
The app uses a pattern where `showRegularOutput()` recreates the output card's innerHTML, causing cached element references to become stale.

---

## 1.2 Architectural Considerations

### DOM Recreation Pattern

```javascript
// showRegularOutput() recreates entire output section
elements.outputCard.innerHTML = `<new HTML>`;

// Problem: Cached references now point to deleted DOM nodes
elements.outputArea // ❌ Stale reference to old textarea
```

### Solution Strategy

1. **Clear stale references** before setting innerHTML
2. **Re-cache elements** after setting innerHTML
3. **Use fresh references** in functions that run after DOM recreation

```javascript
// BEFORE setting innerHTML
elements.outputArea = null;

// SET innerHTML
elements.outputCard.innerHTML = `...`;

// AFTER setting innerHTML
elements.outputArea = document.getElementById('outputArea');

// IN OTHER FUNCTIONS - always get fresh reference
const outputArea = document.getElementById('outputArea'); // ✅ Fresh
```

---

## 1.3 Implementation Steps

### Step 1: Add HTML Content Detection Helper

**Location**: After `getDynamicElement()` function (~line 1386)

```javascript
/**
 * Helper function to detect if content is HTML or plain text
 * @param {string} text - Content to check
 * @returns {boolean} True if content contains HTML tags
 */
function isHTMLContent(text) {
    if (!text) return false;

    // Check for common HTML tags
    const htmlPattern = /<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i;
    return htmlPattern.test(text);
}
```

---

### Step 2: Update Elements Object

**Location**: Line 1229 (inside `elements` object declaration)

```javascript
const elements = {
    // ... existing properties ...

    // Add these new properties for tab elements:
    previewTab: null,
    htmlTab: null,
    previewContent: null,
    htmlContent: null,
    emailPreview: null,  // iframe element

    // ... rest of existing properties ...
};
```

---

### Step 3: Modify showRegularOutput() - HTML Structure

**Location**: Line 1661-1666

**Current Structure**:
```javascript
elements.outputCard.innerHTML = `
    <h2 class="section-title">Generated Message</h2>
    ${subjectLineSection}
    <textarea class="output-textarea" id="outputArea" ...></textarea>
    ${buttonGroup}
`;
```

**New Structure with Tabs**:
```javascript
elements.outputCard.innerHTML = `
    <h2 class="section-title">Generated Message</h2>
    ${subjectLineSection}

    <!-- Tab Navigation -->
    <div class="output-tabs">
        <button class="output-tab active" data-tab="preview" title="Preview how the email looks in an email client">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Preview
        </button>
        <button class="output-tab" data-tab="html" title="View the raw HTML code">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            HTML
        </button>
    </div>

    <!-- Preview Tab Content -->
    <div class="output-content active" id="previewContent">
        <iframe class="email-preview" id="emailPreview" title="Email preview"></iframe>
    </div>

    <!-- HTML Tab Content -->
    <div class="output-content" id="htmlContent">
        <textarea class="output-textarea" id="outputArea" placeholder="Your generated message will appear here..." aria-label="Generated message output"></textarea>
    </div>

    ${buttonGroup}
`;
```

---

### Step 4: Clear Stale References

**Location**: Line 1624-1628

```javascript
// Clear dynamic element cache before rebuilding DOM
elements.outputArea = null;
elements.copyBtn = null;
elements.subjectLineContainer = null;
elements.sendEmailBtn = null;
elements.downloadEmailBtn = null;

// Clear tab-related elements
elements.previewTab = null;
elements.htmlTab = null;
elements.previewContent = null;
elements.htmlContent = null;
elements.emailPreview = null;
```

---

### Step 5: Re-cache Elements

**Location**: After setting innerHTML in `showRegularOutput()` (line 1669)

```javascript
// Re-cache all dynamically created elements
elements.outputArea = document.getElementById('outputArea');
elements.copyBtn = document.getElementById('copyBtn');
elements.previewTab = document.querySelector('.output-tab[data-tab="preview"]');
elements.htmlTab = document.querySelector('.output-tab[data-tab="html"]');
elements.previewContent = document.getElementById('previewContent');
elements.htmlContent = document.getElementById('htmlContent');
elements.emailPreview = document.getElementById('emailPreview');
```

---

### Step 6: Add Tab Switching Logic

**Location**: After re-caching elements in `showRegularOutput()` (~line 1675)

```javascript
// Add tab switching functionality
if (elements.previewTab && elements.htmlTab) {
    // Preview tab click handler
    elements.previewTab.addEventListener('click', () => {
        // Activate preview tab
        elements.previewTab.classList.add('active');
        elements.htmlTab.classList.remove('active');

        // Show preview content
        if (elements.previewContent) {
            elements.previewContent.classList.add('active');
        }
        if (elements.htmlContent) {
            elements.htmlContent.classList.remove('active');
        }

        // Update preview iframe
        updateEmailPreview();
    });

    // HTML tab click handler
    elements.htmlTab.addEventListener('click', () => {
        // Activate HTML tab
        elements.htmlTab.classList.add('active');
        elements.previewTab.classList.remove('active');

        // Show HTML content
        if (elements.htmlContent) {
            elements.htmlContent.classList.add('active');
        }
        if (elements.previewContent) {
            elements.previewContent.classList.remove('active');
        }
    });
}
```

---

### Step 7: Add Preview Update Function

**Location**: Add after `showRegularOutput()` function (~line 1708)

```javascript
/**
 * Update preview iframe with generated content
 * Enables/disables preview tab based on HTML detection
 * @param {string} content - Message content to preview
 */
function updateEmailPreview() {
    const outputArea = document.getElementById('outputArea');
    const emailPreview = document.getElementById('emailPreview');
    const previewTab = document.querySelector('.output-tab[data-tab="preview"]');
    const previewContent = document.getElementById('previewContent');
    const htmlContent = document.getElementById('htmlContent');

    if (!outputArea || !emailPreview) return;

    const content = outputArea.value;
    if (!content) {
        emailPreview.srcdoc = '<p style="padding: 20px; color: #999;">No content to preview</p>';
        return;
    }

    // Check if content is HTML
    const isHTML = isHTMLContent(content);
    const htmlTab = document.querySelector('.output-tab[data-tab="html"]');

    if (previewTab) {
        if (isHTML) {
            // Enable preview tab for HTML content
            previewTab.disabled = false;
            previewTab.style.opacity = '1';
            previewTab.style.cursor = 'pointer';

            // Wrap HTML content in email template
            const htmlTemplate = wrapHtmlForEmailPreview(content);
            emailPreview.srcdoc = htmlTemplate;
        } else {
            // Disable preview tab for plain text
            previewTab.disabled = true;
            previewTab.style.opacity = '0.5';
            previewTab.style.cursor = 'not-allowed';

            // Switch to HTML tab
            previewTab.classList.remove('active');
            htmlTab.classList.add('active');

            if (previewContent) {
                previewContent.classList.remove('active');
            }
            if (htmlContent) {
                htmlContent.classList.add('active');
            }

            // Show message in iframe
            emailPreview.srcdoc = '<p style="padding: 20px; color: #999;">Preview not available for plain text content</p>';
        }
    }
}

/**
 * Wrap HTML content in proper email preview template
 * @param {string} htmlContent - HTML email body content
 * @returns {string} Complete HTML document for preview
 */
function wrapHtmlForEmailPreview(htmlContent) {
    // Try to extract subject from original message or content
    let subject = 'Email Preview';
    let bodyContent = htmlContent;

    // Extract subject if present
    if (window.originalMessageContent) {
        const subjectMatch = window.originalMessageContent.match(/^Subject:\s*(.+)/m);
        if (subjectMatch) {
            subject = subjectMatch[1];
            bodyContent = window.originalMessageContent.replace(/^Subject:.+\n/m, '').trim();
        }
    } else {
        const subjectMatch = htmlContent.match(/^Subject:\s*(.+)/m);
        if (subjectMatch) {
            subject = subjectMatch[1];
            bodyContent = htmlContent.replace(/^Subject:.+\n/m, '').trim();
        }
    }

    // Create proper HTML email template
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
    <style>
        body {
            font-family: Aptos, Arial, Helvetica, sans-serif;
            font-size: 12pt;
            color: rgb(0, 0, 0);
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        .email-header {
            padding: 10px;
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
            margin-bottom: 20px;
        }
        .email-subject {
            font-size: 14pt;
            font-weight: 600;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="email-subject">${escapeHtml(subject)}</div>
        </div>
        <div class="email-body">
            ${bodyContent}
        </div>
    </div>
</body>
</html>`;

    return template;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

---

### Step 8: Update generateMessage() Function

**Location**: Lines 3926, 3929, 3935

**Problem**: Currently uses stale `elements.outputArea` reference

**Current Code**:
```javascript
if (template.hasEditableSubject) {
    // ...
    elements.outputArea.value = messageWithoutSubject;
} else {
    elements.outputArea.value = message;
}
```

**Updated Code**:
```javascript
if (template.hasEditableSubject) {
    const subjectLine = extractSubjectLine(message);
    const subjectLineContent = document.getElementById('subjectLineContent');
    if (subjectLineContent) {
        renderEditableSubjectLine(subjectLineContent, subjectLine);
    }

    // Store original message
    window.originalMessageContent = message;

    // Get fresh reference to outputArea
    const outputArea = document.getElementById('outputArea');
    if (outputArea) {
        const messageWithoutSubject = message.replace(/^Subject:\s*.+\r?\n/, '').trim();
        outputArea.value = messageWithoutSubject;

        // Update preview iframe
        setTimeout(() => {
            updateEmailPreview();
        }, 0);
    }
} else {
    // For non-enhanced templates
    const outputArea = document.getElementById('outputArea');
    if (outputArea) {
        outputArea.value = message;

        // Update preview iframe
        setTimeout(() => {
            updateEmailPreview();
        }, 0);
    }

    window.originalMessageContent = null;
}

// Enable Copy button
elements.copyBtn.disabled = false;
```

**Error Handling** (line 3934-3937):
```javascript
catch (error) {
    console.error('Error generating message:', error);

    // Use fresh reference for error state
    const outputArea = document.getElementById('outputArea');
    if (outputArea) {
        outputArea.value = '';
    }

    if (elements.copyBtn) {
        elements.copyBtn.disabled = true;
    }

    showToast('⚠ ' + error.message);
}
```

---

### Step 9: Update copyToClipboard() Function

**Location**: Line 4040

**Current Code**:
```javascript
function copyToClipboard() {
    const text = elements.outputArea.value;
    // ...
}
```

**Updated Code**:
```javascript
function copyToClipboard() {
    // Get fresh reference to outputArea
    const outputArea = document.getElementById('outputArea');
    if (!outputArea) {
        showToast('⚠ Output area not found');
        return;
    }

    const text = outputArea.value;
    if (!text) {
        showToast('⚠ Nothing to copy');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('✓ Copied!');
        }).catch((error) => {
            console.error('Clipboard error:', error);
            showToast('⚠ Copy failed');
        });
    } else {
        // Fallback for browsers without clipboard API
        try {
            outputArea.select();
            const success = document.execCommand('copy');
            if (success) {
                showToast('✓ Copied!');
            } else {
                showToast('⚠ Copy failed');
            }
        } catch (error) {
            console.error('Copy error:', error);
            showToast('⚠ Copy failed');
        }
    }
}
```

---

### Step 10: Update Other Functions Using outputArea

**Locations**: Lines 1684, 1695, 4015, and any other uses

**Pattern to Apply**:
```javascript
// BEFORE (using cached reference)
const content = elements.outputArea ? elements.outputArea.value : '';

// AFTER (using fresh reference)
const outputArea = document.getElementById('outputArea');
const content = outputArea ? outputArea.value : '';
```

**Search and replace**:
```bash
# Find all uses of elements.outputArea
grep -n "elements\.outputArea" app.js

# Replace with fresh references in each location
```

---

## 1.4 Testing Checklist

### Unit Tests
- [ ] `isHTMLContent()` detects HTML correctly
- [ ] `isHTMLContent()` returns false for plain text
- [ ] `escapeHtml()` escapes special characters
- [ ] `wrapHtmlForEmailPreview()` creates valid HTML

### Integration Tests
- [ ] Select regular template → tabs appear
- [ ] Generate message → HTML tab shows content
- [ ] Generate HTML message → Preview tab shows rendered email
- [ ] Generate plain text → Preview tab disabled, HTML tab active
- [ ] Switch between tabs → content persists
- [ ] Copy button works from HTML tab
- [ ] Send Email button uses correct content
- [ ] Download EML uses correct content

### Edge Cases
- [ ] Empty template generates empty preview
- [ ] Special characters in content render correctly
- [ ] Very long content doesn't break layout
- [ ] Rapid template switching doesn't cause errors
- [ ] Subject with HTML tags is escaped

### Browser Testing
- [ ] Chrome (Windows/Mac)
- [ ] Firefox (Windows/Mac)
- [ ] Safari (Mac)
- [ ] Edge (Windows)

---

## 1.5 Implementation Timeline

**Phase 1: Foundation** (Week 1)
- Days 1-2: Add helper functions and update elements object
- Days 3-4: Modify showRegularOutput() HTML structure
- Day 5: Add tab switching logic

**Phase 2: Integration** (Week 1-2)
- Days 6-7: Update generateMessage() and other functions
- Days 8-9: Add preview update function
- Day 10: Integration testing

**Phase 3: Polish** (Week 2-3)
- Days 11-12: Fix bugs and edge cases
- Days 13-14: Cross-browser testing
- Day 15: Documentation and code review

**Total**: 25-35 hours

---

# Feature 2: EML HTML Formatting

## 2.1 Overview

Enhance EML/EMLTPL file generation to include:
- Proper HTML email structure (multipart/alternative)
- Professional HTML signature with clickable links
- Both text/plain and text/html versions
- RFC-compliant MIME format

### Current Situation
- EML files contain only text/plain content
- Signatures are plain text (no clickable links)
- No HTML version included
- Google Maps Plus Code not linked

### Target Outcome
- Multipart/alternative EML with both text and HTML
- HTML signature with Century Gothic font
- Clickable brand links (Alpina, Bulova, Citizen, Frederique Constant)
- Clickable Google Maps Plus Code link
- RFC 2045/2046 compliant

---

## 2.2 Current EML Generation Analysis

### Function: createGenericEMLFile()

**Location**: Lines 4465-4565

**Current Implementation**:
```javascript
function createGenericEMLFile(subject, body, attachments = [], format = 'eml') {
    // Current MIME type
    eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;

    // Only text/plain part
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/plain; charset=utf-8\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
    eml += `\r\n`;
    eml += encodedBody;

    // End
    eml += `--${boundary}--\r\n`;
    return eml;
}
```

**Issues**:
- Only `text/plain` part (no HTML)
- Uses `multipart/mixed` (should be `multipart/alternative`)
- No HTML signature

---

## 2.3 Signature Function Redesign

### Current: getEmployeeSignature()

**Location**: Lines 325-342

**Current Implementation**:
```javascript
function getEmployeeSignature() {
    const name = userProfile?.employeeName || 'Employee Name';
    const title = userProfile?.jobTitle || 'Sales Associate';
    const storeName = userProfile?.storeName || 'Citizen Company Store';
    const phone = userProfile?.storePhone || '555-123-4567';
    const address = userProfile?.storeAddress || '';

    return `${name} │ ${title}
______________________________________________________________________
Citizen Watch America - ${storeName}
${address ? address.replace(/\n/g, '\n') : ''}
Tel/SMS: ${phone}

Alpina | Bulova | Citizen | Frederique Constant

Please consider the environment before printing this e-mail`;
}
```

**Problems**:
- No format parameter (always returns plain text)
- No HTML version
- Brand names not hyperlinked
- No Google Maps Plus Code link

---

### New: getEmployeeSignature(format = 'text')

**Implementation**:

```javascript
/**
 * Generate employee signature in text or HTML format
 * @param {string} format - 'text' for plain text, 'html' for HTML
 * @returns {string} Formatted signature
 */
function getEmployeeSignature(format = 'text') {
    // Get profile data with fallbacks
    const name = userProfile?.employeeName || 'Employee Name';
    const title = userProfile?.jobTitle || 'Sales Associate';
    const storeName = userProfile?.storeName || 'Citizen Company Store';
    const phone = userProfile?.storePhone || '555-123-4567';
    const address = userProfile?.storeAddress || '';
    const plusCode = userProfile?.storePlusCode || '';
    const email = userProfile?.storeEmail || 'store@citizenwatchgroup.com';

    if (format === 'html') {
        // Split email for partial hyperlink formatting
        const emailParts = email.split('@');
        const emailPrefix = emailParts[0] || 'store';
        const emailDomain = emailParts[1] || 'citizenwatchgroup.com';

        return `<div style="font-family: 'Century Gothic', Aptos, Arial, sans-serif; font-size: 9pt; color: #000000;">
    <p style="margin: 0; padding: 0;">
        <strong style="font-size: 9pt;">${sanitizeHTML(name)} │ ${sanitizeHTML(title)}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        ______________________________________________________________________
    </p>
    <p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        <strong>Citizen Watch America</strong> - ${sanitizeHTML(storeName)}
    </p>
    ${address ? `<p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        ${sanitizeHTML(address).replace(/\n/g, '<br>')}
    </p>` : ''}
    <p style="margin: 0; padding: 0; font-size: 8pt; color: #2f2f2f;">
        Tel/SMS: ${sanitizeHTML(phone)}
    </p>
    ${plusCode ? `<p style="margin: 0; padding: 0; font-size: 8pt;">
        <a href="https://maps.google.com/?q=${encodeURIComponent(plusCode)}"
           style="color: #0000ee; text-decoration: underline; font-size: 8pt;">
            View on Google Maps
        </a>
    </p>` : ''}
    <p style="margin: 0; padding: 0; font-size: 8pt;">
        Email: ${sanitizeHTML(emailPrefix)}<a href="mailto:${sanitizeHTML(email)}"
              style="color: #0000ee; text-decoration: underline; font-size: 8pt;">@${sanitizeHTML(emailDomain)}</a>
    </p>
    <p style="margin: 4px 0; padding: 0; font-size: 8pt;">
        <a href="https://us.alpinawatches.com/" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">Alpina</a> |
        <a href="https://www.bulova.com/" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">Bulova</a> |
        <a href="https://www.citizenwatch.com/" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">Citizen</a> |
        <a href="https://us.frederiqueconstant.com/" style="color: #0000ee; text-decoration: underline; font-size: 8pt;">Frederique Constant</a>
    </p>
    <p style="margin: 4px 0; padding: 0; font-size: 8pt; color: #0c8822;">
        <strong>Please consider the environment before printing this e-mail</strong>
    </p>
</div>`;
    }

    // Default: plain text format
    return `${name} │ ${title}
______________________________________________________________________
Citizen Watch America - ${storeName}
${address ? address.replace(/\n/g, '\n') : ''}
Tel/SMS: ${phone}

Alpina | Bulova | Citizen | Frederique Constant

Please consider the environment before printing this e-mail`;
}
```

**Key Features**:
- Backward compatible (defaults to 'text')
- HTML version with inline CSS
- Century Gothic 9pt for name/title, 8pt for details
- Clickable links for brands, Google Maps, email
- Proper color scheme (#0000ee blue, #0c8822 green)
- XSS protection via `sanitizeHTML()`

---

## 2.4 HTML Conversion Functions

### Function: convertTextToHTML(textBody)

**Location**: Add after `createGenericEMLFile()` (after line 4565)

```javascript
/**
 * Convert plain text email body to HTML format
 * Handles paragraphs, lists, and signature integration
 * @param {string} textBody - Plain text email content
 * @returns {string} HTML-formatted email
 */
function convertTextToHTML(textBody) {
    // Remove plain text signature if present (will be replaced with HTML version)
    let bodyWithoutSig = textBody;
    const sigMarkers = [
        /\n\n-{5,}\n/,  // Dashes separator
        /______+/,       // Underscore separator
        /\n\n[A-Z][a-z]+ [A-Z][a-z]+ │ /  // Name │ Title pattern
    ];

    for (const marker of sigMarkers) {
        const match = bodyWithoutSig.match(marker);
        if (match) {
            bodyWithoutSig = bodyWithoutSig.substring(0, match.index).trim();
            break;
        }
    }

    // Sanitize before processing
    bodyWithoutSig = sanitizeHTML(bodyWithoutSig);

    // Split into paragraphs (double line break)
    const paragraphs = bodyWithoutSig.split(/\n\n+/);
    const htmlParagraphs = paragraphs.map(para => {
        const lines = para.split('\n');

        // Check if this is a list (all non-empty lines start with bullet/dash)
        const isList = lines.some(line => line.trim()) &&
                       lines.every(line => {
                           const trimmed = line.trim();
                           return !trimmed || trimmed.startsWith('•') || trimmed.startsWith('-');
                       });

        if (isList) {
            const listItems = lines
                .filter(line => line.trim())
                .map(line => {
                    const text = line.replace(/^[•\-]\s*/, '').trim();
                    return `        <li style="margin: 5px 0;">${text}</li>`;
                })
                .join('\n');
            return `    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${listItems}
    </ul>`;
        } else {
            // Regular paragraph - convert single line breaks to <br>
            const htmlContent = para.replace(/\n/g, '<br>');
            return `    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${htmlContent}</p>`;
        }
    });

    // Get HTML signature
    const htmlSignature = getEmployeeSignature('html');

    // Build complete HTML document
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto;">
${htmlParagraphs.join('\n')}

        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
${htmlSignature}
        </div>
    </div>
</body>
</html>`;

    return html;
}
```

---

### Function: encodeQuotedPrintable(html)

```javascript
/**
 * Encode HTML content in quoted-printable format for email
 * Handles special characters and line length requirements
 * @param {string} html - HTML content to encode
 * @returns {string} Quoted-printable encoded content
 */
function encodeQuotedPrintable(html) {
    // Normalize line endings
    let encoded = html.replace(/\r?\n/g, '\r\n');

    // Encode special characters in priority order
    // 1. Equals signs first (the escape character itself)
    encoded = encoded.replace(/=/g, '=3D');

    // 2. Encode CRLF sequences
    encoded = encoded.replace(/\r\n/g, '=0D=0A');

    // 3. Handle soft line breaks (lines longer than 76 characters)
    const lines = encoded.split('=0D=0A');
    const wrappedLines = lines.map(line => {
        if (line.length <= 76) return line;

        // Break long lines with soft breaks (= at end of line)
        const chunks = [];
        for (let i = 0; i < line.length; i += 75) {
            chunks.push(line.substr(i, 75));
        }
        return chunks.join('=\r\n');
    });

    return wrappedLines.join('=0D=0A');
}
```

---

## 2.5 Updated createGenericEMLFile()

**Complete updated function**:

```javascript
function createGenericEMLFile(subject, body, attachments = [], format = 'eml') {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const boundary = '----=_NextPart_' + timestamp + '_' + randomId;
    const messageId = `<single.${timestamp}.${randomId}@citizenstore.local>`;
    const date = new Date().toUTCString();

    // Get user profile for sender information
    const senderName = userProfile?.storeName || 'Citizen Company Store';
    const senderEmail = userProfile?.storeEmail || 'store@citizenwatchgroup.com';

    // Create EML headers
    let eml = '';
    eml += `Subject: ${subject}\r\n`;
    eml += `Date: ${date}\r\n`;
    eml += `Message-ID: ${messageId}\r\n`;
    eml += `MIME-Version: 1.0\r\n`;
    eml += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`; // CHANGED
    eml += `X-Unsent: 1\r\n`;
    eml += `X-Outlook-Message-Flag: \r\n`;
    eml += `X-Microsoft-Headers: ; name="draft"\r\n`;
    eml += `X-Mailer: Microsoft Outlook 16.0\r\n`;
    eml += `X-Msg-Status: 00000000\r\n`;
    eml += `X-Outlook-Template: 1\r\n`;
    eml += `Message-Class: IPM.Note\r\n`;
    eml += `\r\n`;
    eml += `This is a multi-part message in MIME format.\r\n`;
    eml += `\r\n`;

    // PART 1: Plain text version
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/plain; charset=utf-8\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
    eml += `\r\n`;

    let encodedBody = body.replace(/\r?\n/g, '\r\n');
    encodedBody = encodedBody.replace(/=/g, '=3D');
    encodedBody = encodedBody.replace(/\r\n/g, '=0D=0A');

    const lines = encodedBody.split('=0D=0A');
    const wrappedLines = lines.map(line => {
        if (line.length <= 76) return line;
        const chunks = [];
        for (let i = 0; i < line.length; i += 75) {
            chunks.push(line.substr(i, 75));
        }
        return chunks.join('=\r\n');
    });

    encodedBody = wrappedLines.join('=0D=0A');
    eml += encodedBody;
    eml += `\r\n\r\n`;

    // PART 2: HTML version (NEW)
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/html; charset=utf-8\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
    eml += `\r\n`;

    const htmlBody = convertTextToHTML(body);
    const encodedHTML = encodeQuotedPrintable(htmlBody);
    eml += encodedHTML;
    eml += `\r\n\r\n`;

    // End boundary
    eml += `--${boundary}--\r\n`;

    return eml;
}
```

**Key Changes**:
1. Changed MIME type from `multipart/mixed` to `multipart/alternative`
2. Added HTML part with proper encoding
3. Calls `convertTextToHTML()` to generate HTML version
4. Both parts use quoted-printable encoding

---

## 2.6 User Profile Updates

Add new fields to user profile:

```javascript
// In user profile schema/form
userProfile = {
    employeeName: '',
    jobTitle: '',
    storeName: '',
    storePhone: '',
    storeAddress: '',
    storeEmail: '',      // Existing or new
    storePlusCode: '',   // NEW FIELD - Google Maps Plus Code
};
```

**Plus Code Format**: `8FWH+QQ` (8 characters + 2 local)

---

## 2.7 Testing Strategy

### Unit Tests

```javascript
// Test HTML signature generation
test('getEmployeeSignature("html") returns HTML', () => {
    const sig = getEmployeeSignature('html');
    expect(sig).toContain('<div');
    expect(sig).toContain('</div>');
    expect(sig).toContain('href="https://www.bulova.com/"');
});

// Test text-to-HTML conversion
test('convertTextToHTML() converts paragraphs', () => {
    const text = 'Para 1\n\nPara 2\n\nPara 3';
    const html = convertTextToHTML(text);
    expect(html).toContain('<p');
    expect(html.match(/<p/g).length).toBe(3);
});

// Test EML multipart structure
test('EML has multipart/alternative structure', () => {
    const eml = createGenericEMLFile('Test', 'Body', [], 'eml');
    expect(eml).toContain('Content-Type: multipart/alternative');
    expect(eml).toContain('Content-Type: text/plain');
    expect(eml).toContain('Content-Type: text/html');
});
```

### Email Client Tests

| Email Client | Test Case | Expected Result |
|-------------|-----------|-----------------|
| Outlook (Windows) | Open .eml file | Shows HTML with clickable links |
| Outlook (Mac) | Open .emltpl file | Shows HTML with clickable links |
| Gmail (Web) | Upload .eml file | Shows HTML properly formatted |
| Apple Mail | Open .eml file | Shows HTML with working links |
| Thunderbird | Open .eml file | Shows HTML correctly |

### Manual Test Scenarios

1. **Basic Display**
   - [ ] HTML signature renders with proper fonts
   - [ ] Links are blue and underlined
   - [ ] Green environmental message appears
   - [ ] Layout is professional

2. **Link Functionality**
   - [ ] Brand links open correct websites
   - [ ] Google Maps Plus Code opens maps
   - [ ] Email link opens email client

3. **RFC Compliance**
   - [ ] Headers are valid
   - [ ] Quoted-printable encoding correct
   - [ ] Line length ≤ 76 characters
   - [ ] CRLF line endings throughout

---

## 2.8 Implementation Timeline

**Phase 1: Foundation** (Week 1)
- Days 1-2: Update getEmployeeSignature() function
- Days 3-4: Add user profile fields (Plus Code, Email)
- Day 5: Create helper functions (convertTextToHTML, encodeQuotedPrintable)

**Phase 2: EML Enhancement** (Week 1-2)
- Days 6-7: Update createGenericEMLFile() function
- Days 8-9: Integration testing with templates
- Day 10: Email client testing

**Phase 3: Testing & Polish** (Week 2-3)
- Days 11-12: All templates tested
- Days 13-14: Cross-client testing
- Day 15: Documentation

**Total**: 25-35 hours

---

# Feature 3: Live Subject Updates

## 3.1 Overview

Add real-time subject field updates that immediately reflect changes in both the Preview and HTML tabs.

### Current Behavior
- User edits subject → Only updates `window.currentSubjectLine`
- Preview/HTML tabs don't update until Generate is clicked again
- Character counter updates in real-time ✓

### Target Behavior
- User edits subject → Preview updates immediately (300ms debounce)
- HTML tab updates immediately with new subject
- Character counter updates immediately (no debounce)
- No Generate button click required

---

## 3.2 Current Implementation Analysis

### renderEditableSubjectLine()

**Location**: Lines 4413-4462

**Current Event Listener**:
```javascript
input.addEventListener('input', (e) => {
    // Store subject
    window.currentSubjectLine = e.target.value;

    // Update character count
    const charCount = document.getElementById('subjectCharCount');
    if (charCount) {
        const length = e.target.value.length;
        const isOptimal = length <= 50;
        charCount.className = `char-count ${isOptimal ? 'optimal' : 'warning'}`;
        charCount.textContent = `${length} chars ${isOptimal ? '✓' : '(>50)'}`;
    }
});
```

**Missing**: Preview/HTML tab updates

---

## 3.3 Implementation Steps

### Step 1: Create Subject Preview Update Function

**Location**: Add after `updateLivePreview()` function (after line 1762)

```javascript
/**
 * Update subject line in preview/HTML tabs (for templates that support it)
 * @param {string} subjectText - The new subject line text
 */
function updateSubjectInPreview(subjectText) {
    try {
        // Only update if current template has preview capability
        if (currentTemplate === 'promotion-email') {
            // For promotion-email, reuse existing updateLivePreview
            // This ensures subject updates trigger full preview regeneration
            updateLivePreview();
        }
        // Future: Handle other enhanced templates with preview tabs
        else if (currentTemplate && templates[currentTemplate]) {
            const template = templates[currentTemplate];
            if (template.hasEditableSubject && template.hasPreviewTabs) {
                updateEnhancedTemplatePreview(subjectText);
            }
        }
    } catch (error) {
        console.error('Error updating subject in preview:', error);
        // Silent failure - subject still updates in window.currentSubjectLine
    }
}
```

---

### Step 2: Create Debounced Version

**Location**: After `updateSubjectInPreview()` definition

```javascript
/**
 * Debounced version of updateSubjectInPreview (300ms delay)
 * Prevents excessive updates during rapid typing
 */
const debouncedSubjectPreviewUpdate = debounce(updateSubjectInPreview, 300);
```

**Note**: `debounce()` function already exists at lines 1713-1723

---

### Step 3: Modify Subject Input Event Listener

**Location**: Lines 4448-4460 (inside `renderEditableSubjectLine()`)

**Updated Code**:
```javascript
input.addEventListener('input', (e) => {
    // Store the current subject line for use in email functions
    window.currentSubjectLine = e.target.value;

    // Update character count (IMMEDIATE - no debounce)
    const charCount = document.getElementById('subjectCharCount');
    if (charCount) {
        const length = e.target.value.length;
        const isOptimal = length <= 50;
        charCount.className = `char-count ${isOptimal ? 'optimal' : 'warning'}`;
        charCount.textContent = `${length} chars ${isOptimal ? '✓' : '(>50)'}`;
    }

    // Update preview/HTML tabs (DEBOUNCED - 300ms)
    if (typeof debouncedSubjectPreviewUpdate === 'function') {
        debouncedSubjectPreviewUpdate(e.target.value);
    }
});
```

---

### Step 4: Add Helper for Future Enhanced Templates

**Location**: After `updateSubjectInPreview()` function

```javascript
/**
 * Update preview for enhanced templates (future use)
 * @param {string} subjectText - The new subject line text
 */
function updateEnhancedTemplatePreview(subjectText) {
    const template = templates[currentTemplate];
    if (!template) return;

    // Get current form data
    const data = {};
    const inputs = elements.formFields.querySelectorAll('.form-input, .form-textarea');
    inputs.forEach(input => {
        const field = input.dataset.field;
        if (field) {
            data[field] = input.value;
        }
    });

    // Add subject to data
    data.subject = subjectText;

    // Generate message content
    const messageContent = template.generate(data);

    // Convert to HTML
    const htmlCode = convertTextToHTML(messageContent, subjectText);

    // Update HTML code area
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

---

## 3.4 Debouncing Details

### Why 300ms?
- **100ms**: Too fast, excessive updates
- **300ms**: Responsive, good balance ✓ **RECOMMENDED**
- **500ms**: Current promotion email delay, slightly sluggish
- **1000ms**: Too slow, feels laggy

### Debounce Behavior
```
User types: "T" → timer starts (300ms)
User types: "e" → timer resets (300ms)
User types: "s" → timer resets (300ms)
User types: "t" → timer resets (300ms)
User stops typing → 300ms passes → UPDATE FIRES
```

### Performance Impact
- Character counter: 0ms delay (instant)
- Subject storage: 0ms delay (instant)
- Preview update: 300ms delay (debounced)
- Total perceived latency: ~300-350ms

---

## 3.5 Integration with Preview/HTML Tabs

### Flow Diagram

```
User edits subject in input field
          ↓
IMMEDIATE: Update window.currentSubjectLine
IMMEDIATE: Update character counter
          ↓
DEBOUNCED (300ms): debouncedSubjectPreviewUpdate()
          ↓
Check current template type
          ↓
    ┌─────────┴─────────┐
    ↓                   ↓
promotion-email    Other enhanced templates
    ↓                   ↓
updateLivePreview()  updateEnhancedTemplatePreview()
    ↓                   ↓
Full regeneration    Partial update
    ↓                   ↓
Update codeArea + previewIframe
```

---

## 3.6 Testing Checklist

### Functional Tests
- [ ] Promotion-email: Subject updates preview tab
- [ ] Promotion-email: Subject updates HTML code tab
- [ ] Other enhanced templates: Subject updates gracefully
- [ ] Character counter updates immediately (no delay)
- [ ] Subject storage updates immediately
- [ ] Debouncing prevents excessive updates

### Edge Cases
- [ ] Empty subject (no crashes)
- [ ] Very long subject (> 200 chars)
- [ ] Special characters: `<`, `>`, `&`, `"`, `'`
- [ ] Emoji in subject: 🎉✨🔥
- [ ] Rapid typing (debounce works correctly)
- [ ] Paste long text
- [ ] Cut all text (empty field)

### Integration Tests
- [ ] Edit subject → Switch tabs (preview updates)
- [ ] Edit subject → Switch template (no errors)
- [ ] Edit subject → Send Email (mailto has new subject)
- [ ] Edit subject → Download EML (file has new subject)

### Performance Tests
- [ ] Subject update total time < 500ms
- [ ] HTML generation < 100ms
- [ ] Iframe update < 50ms
- [ ] No browser lag during rapid typing

---

## 3.7 Implementation Timeline

**Total Time**: 4-7 hours

**Day 1** (2-3 hours):
- Hour 1: Create `updateSubjectInPreview()` function
- Hour 2: Create debounced version and modify event listener
- Hour 3: Testing and debugging

**Day 2** (2-4 hours):
- Hours 1-2: Add helper function for future templates
- Hour 3: Integration testing
- Hour 4: Documentation and code review

---

# Integration Architecture

## 4.1 How All Features Work Together

### Feature Integration Map

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                         │
├─────────────────────────────────────────────────────────────┤
│  1. Select template                                         │
│  2. Fill form fields                                        │
│  3. Click Generate                                          │
│  4. Edit subject (live)                                     │
│  5. Switch between Preview/HTML tabs                        │
│  6. Download EML                                            │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  FEATURE 1: TABS                            │
├─────────────────────────────────────────────────────────────┤
│  • showRegularOutput() creates tab structure                │
│  • Preview tab shows rendered HTML                          │
│  • HTML tab shows source code                               │
│  • Tab switching updates active view                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              FEATURE 2: HTML FORMATTING                     │
├─────────────────────────────────────────────────────────────┤
│  • getEmployeeSignature('html') generates HTML signature    │
│  • convertTextToHTML() converts content to HTML             │
│  • createGenericEMLFile() creates multipart/alternative     │
│  • Both text/plain and text/html parts included             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│             FEATURE 3: LIVE SUBJECT UPDATES                 │
├─────────────────────────────────────────────────────────────┤
│  • Subject input triggers debounced update (300ms)          │
│  • updateSubjectInPreview() called                          │
│  • Preview iframe regenerated with new subject              │
│  • HTML tab updated with new subject                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    FINAL OUTPUT                             │
├─────────────────────────────────────────────────────────────┤
│  • Preview: Rendered HTML email with signature              │
│  • HTML Tab: HTML source with embedded subject              │
│  • EML File: Multipart with text + HTML versions            │
│  • All three use same HTML generation logic                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 4.2 Shared Functions

### Key Functions Used by Multiple Features

| Function | Used By | Purpose |
|----------|---------|---------|
| `convertTextToHTML()` | Feature 1, 2, 3 | Convert plain text to HTML |
| `getEmployeeSignature()` | Feature 1, 2 | Generate signature (text/HTML) |
| `updateEmailPreview()` | Feature 1, 3 | Update preview iframe |
| `wrapHtmlForEmailPreview()` | Feature 1 | Wrap HTML in email template |
| `createGenericEMLFile()` | Feature 2 | Generate EML files |
| `debounce()` | Feature 3 | Debounce subject updates |

---

## 4.3 Data Flow

### Generate Message Flow

```
1. User clicks Generate
        ↓
2. generateMessage() called
        ↓
3. Template.generate(data) creates message
        ↓
4. Message written to outputArea (HTML tab)
        ↓
5. updateEmailPreview() called
        ↓
6. isHTMLContent() checks if HTML
        ↓
7. If HTML: wrapHtmlForEmailPreview()
        ↓
8. Preview iframe updated with HTML
        ↓
9. Preview tab enabled
```

### Download EML Flow

```
1. User clicks Download Email File
        ↓
2. downloadEmailFile() called
        ↓
3. Get content from outputArea
        ↓
4. createGenericEMLFile() called
        ↓
5. convertTextToHTML() generates HTML version
        ↓
6. getEmployeeSignature('html') for HTML signature
        ↓
7. Multipart/alternative EML created
        ↓
8. Both text/plain and text/html parts
        ↓
9. File downloaded
```

### Live Subject Update Flow

```
1. User types in subject field
        ↓
2. 'input' event fires
        ↓
3. window.currentSubjectLine updated (immediate)
        ↓
4. Character counter updated (immediate)
        ↓
5. debouncedSubjectPreviewUpdate() called
        ↓
6. Wait 300ms (debounce)
        ↓
7. updateSubjectInPreview() fires
        ↓
8. Check template type
        ↓
9. If promotion-email: updateLivePreview()
        ↓
10. Preview + HTML tabs updated
```

---

## 4.4 Consistency Guarantees

### Single Source of Truth

All three features use the **same HTML generation logic**:

```javascript
// Feature 1 (Preview): Uses convertTextToHTML()
const htmlForPreview = convertTextToHTML(content);
emailPreview.srcdoc = wrapHtmlForEmailPreview(htmlForPreview);

// Feature 2 (EML): Uses convertTextToHTML()
const htmlBody = convertTextToHTML(body);
const encodedHTML = encodeQuotedPrintable(htmlBody);

// Feature 3 (Live Update): Triggers Feature 1
debouncedSubjectPreviewUpdate() → updateEmailPreview() → convertTextToHTML()
```

**Result**: What you see in Preview = What's in HTML tab = What's in EML file

---

# Implementation Timeline

## 5.1 Overall Schedule

### Phase 1: Preview/HTML Tabs (Weeks 1-3)
- **Week 1**: Foundation and core tab functionality
- **Week 2**: Integration with existing code
- **Week 3**: Testing and polish
- **Effort**: 25-35 hours

### Phase 2: EML HTML Formatting (Weeks 4-6)
- **Week 4**: Signature redesign and helper functions
- **Week 5**: EML enhancement and template testing
- **Week 6**: Email client testing and polish
- **Effort**: 25-35 hours

### Phase 3: Live Subject Updates (Week 7)
- **Day 1**: Implementation (2-3 hours)
- **Day 2**: Testing and integration (2-4 hours)
- **Effort**: 4-7 hours

### Phase 4: Final Integration (Week 8)
- Integration testing across all features
- Performance optimization
- Documentation
- Final QA
- **Effort**: 10-15 hours

---

## 5.2 Detailed Timeline by Week

### Week 1: Preview Tabs Foundation
- **Day 1**: Add `isHTMLContent()`, update elements object
- **Day 2**: Modify `showRegularOutput()` HTML structure
- **Day 3**: Add element re-caching and clearing
- **Day 4**: Implement tab switching logic
- **Day 5**: Initial testing and bug fixes

### Week 2: Preview Tabs Integration
- **Day 6**: Add `updateEmailPreview()` function
- **Day 7**: Add `wrapHtmlForEmailPreview()` function
- **Day 8**: Update `generateMessage()` to use fresh references
- **Day 9**: Update `copyToClipboard()` and other functions
- **Day 10**: Integration testing

### Week 3: Preview Tabs Polish
- **Day 11**: Fix edge cases and bugs
- **Day 12**: Cross-browser testing
- **Day 13**: Performance optimization
- **Day 14**: Documentation
- **Day 15**: Code review and final testing

### Week 4: EML Signature Foundation
- **Day 16**: Update `getEmployeeSignature()` with format parameter
- **Day 17**: Add user profile fields (Plus Code, Email)
- **Day 18**: Create `convertTextToHTML()` function
- **Day 19**: Create `encodeQuotedPrintable()` function
- **Day 20**: Unit testing

### Week 5: EML Enhancement
- **Day 21**: Update `createGenericEMLFile()` to multipart/alternative
- **Day 22**: Add text/html part generation
- **Day 23**: Template integration testing (5 templates)
- **Day 24**: Template integration testing (5 templates)
- **Day 25**: Integration testing with preview tabs

### Week 6: EML Testing & Polish
- **Day 26**: Outlook testing (Windows/Mac)
- **Day 27**: Gmail and Apple Mail testing
- **Day 28**: Bug fixes from client testing
- **Day 29**: RFC compliance validation
- **Day 30**: Documentation

### Week 7: Live Subject Updates
- **Day 31**: Implement core functionality (morning)
- **Day 31**: Testing and debugging (afternoon)
- **Day 32**: Integration with all templates (morning)
- **Day 32**: Final testing and polish (afternoon)

### Week 8: Final Integration
- **Day 33**: Cross-feature integration testing
- **Day 34**: Performance testing and optimization
- **Day 35**: Full regression testing
- **Day 36**: Documentation updates
- **Day 37**: Final QA and release preparation

---

## 5.3 Milestones

| Milestone | Week | Deliverable | Success Criteria |
|-----------|------|-------------|------------------|
| **M1: Preview Tabs Working** | 3 | Preview/HTML tabs functional | All regular templates have tabs, switching works |
| **M2: HTML Signatures** | 5 | HTML signatures in EML files | Brand links clickable, Plus Code works |
| **M3: Multipart EML** | 6 | RFC-compliant EML files | Opens correctly in all email clients |
| **M4: Live Subject Updates** | 7 | Real-time subject updates | Subject changes reflect immediately in preview |
| **M5: Full Integration** | 8 | All features working together | Complete user workflow functions smoothly |

---

## 5.4 Dependencies

### Sequential Dependencies

```
Feature 1 (Preview Tabs)
        ↓ (provides preview infrastructure)
Feature 3 (Live Subject Updates)
        ↓ (uses preview tabs to show updates)
Integration Testing
```

### Parallel Work Possible

```
Feature 1 (Preview Tabs)  |  Feature 2 (EML HTML)
        ↓                 |          ↓
   Weeks 1-3              |    Weeks 4-6
        ↓                 |          ↓
        └─────────────────┴──────────┘
                    ↓
          Feature 3 (Week 7)
                    ↓
          Integration (Week 8)
```

**Note**: Features 1 and 2 can be developed in parallel by different developers, as they have minimal overlap until integration phase.

---

# Testing Strategy

## 6.1 Testing Pyramid

```
           ┌────────────┐
           │    E2E     │  (Email client testing, full workflow)
           │   Tests    │
           └────────────┘
        ┌────────────────┐
        │  Integration   │  (Template generation, EML creation)
        │     Tests      │
        └────────────────┘
    ┌──────────────────────┐
    │    Unit Tests        │  (Functions, helpers, conversions)
    └──────────────────────┘
```

---

## 6.2 Unit Testing

### Test Files to Create

1. **test-html-content-detection.js**
   - Test `isHTMLContent()` function
   - Verify HTML vs plain text detection
   - Edge cases: empty, special characters, mixed

2. **test-signature-formats.js**
   - Test `getEmployeeSignature('text')`
   - Test `getEmployeeSignature('html')`
   - Verify backward compatibility
   - Test XSS protection

3. **test-text-to-html-conversion.js**
   - Test `convertTextToHTML()` paragraphs
   - Test list conversion
   - Test signature integration
   - Test special characters

4. **test-eml-structure.js**
   - Test `createGenericEMLFile()` multipart/alternative
   - Test text/plain part
   - Test text/html part
   - Test boundary format

5. **test-subject-updates.js**
   - Test `updateSubjectInPreview()`
   - Test debouncing behavior
   - Test integration with preview

---

## 6.3 Integration Testing

### Test Scenarios

#### Scenario 1: Complete Workflow - Regular Template
```
1. Select "New Customer Welcome" template
2. Fill all required fields
3. Click Generate
4. Verify Preview tab shows rendered email
5. Verify HTML tab shows source code
6. Edit subject line
7. Wait 350ms
8. Verify Preview tab updated with new subject
9. Click Download Email File
10. Open EML in Outlook
11. Verify HTML rendering with clickable links
```

#### Scenario 2: Complete Workflow - Promotion Template
```
1. Select "Promotion Email" template
2. Add date range, discount entries
3. Click Generate
4. Verify Preview shows HTML email
5. Verify HTML Code tab shows source
6. Edit subject in subject dropdown
7. Type new custom subject
8. Verify Preview updates in real-time
9. Download EML
10. Open in Gmail
11. Verify multipart/alternative structure
```

#### Scenario 3: Template Switching
```
1. Select template A, generate message
2. Edit subject
3. Switch to template B
4. Verify no errors
5. Generate message
6. Verify tabs work correctly
7. Switch back to template A
8. Verify previous subject not retained
9. Generate new message
10. Verify everything works
```

---

## 6.4 Email Client Testing

### Test Matrix

| Feature | Outlook Win | Outlook Mac | Gmail Web | Apple Mail | Thunderbird |
|---------|-------------|-------------|-----------|------------|-------------|
| HTML renders | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Signature fonts | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Brand links work | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Plus Code link | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Email link | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Text fallback | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## 6.5 Performance Testing

### Benchmarks

| Operation | Target | Measurement |
|-----------|--------|-------------|
| HTML generation | < 50ms | `console.time('html-gen')` |
| Preview iframe update | < 100ms | `console.time('iframe-update')` |
| Subject debounce delay | 300ms | Verify timer |
| Tab switch | < 50ms | Visual inspection |
| EML file generation | < 200ms | `console.time('eml-gen')` |

### Performance Test Script

```javascript
// Test HTML generation performance
console.time('convertTextToHTML');
const html = convertTextToHTML(testContent);
console.timeEnd('convertTextToHTML');
// Expected: < 50ms

// Test EML generation performance
console.time('createGenericEMLFile');
const eml = createGenericEMLFile('Subject', testBody, [], 'eml');
console.timeEnd('createGenericEMLFile');
// Expected: < 200ms

// Test debounce timing
let updateCount = 0;
const testDebounce = debounce(() => updateCount++, 300);

// Rapid calls
for (let i = 0; i < 10; i++) {
    testDebounce();
}

// After 350ms, updateCount should be 1
setTimeout(() => {
    console.assert(updateCount === 1, 'Debounce should execute once');
}, 350);
```

---

## 6.6 Accessibility Testing

### Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Screen reader announcements work
- [ ] Color contrast meets WCAG AA
- [ ] No keyboard traps
- [ ] Form validation accessible

### Screen Reader Test

```
1. Enable NVDA/JAWS/VoiceOver
2. Tab to subject field
3. Type subject
4. Verify "Email subject line" announced
5. Verify character count announced
6. Tab to Preview/HTML tabs
7. Verify tab names announced
8. Verify "Preview" or "HTML" tab state
```

---

## 6.7 Browser Compatibility Testing

### Browsers to Test

- **Chrome**: Windows, Mac (latest 2 versions)
- **Firefox**: Windows, Mac (latest 2 versions)
- **Safari**: Mac (latest version)
- **Edge**: Windows (latest version)
- **Mobile Safari**: iOS (latest)
- **Chrome Android**: Android (latest)

### Features to Verify Per Browser

- [ ] Tabs display correctly
- [ ] Tab switching works
- [ ] Iframe preview renders
- [ ] Subject updates work
- [ ] EML downloads
- [ ] Copy to clipboard
- [ ] Email client launch (mailto:)

---

# Risk Assessment

## 7.1 Technical Risks

### High Priority Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Stale DOM references** | High | Medium | Use fresh references, clear cache before innerHTML |
| **Email client incompatibility** | High | Low | Test with all major clients, follow RFC standards |
| **XSS vulnerabilities** | High | Low | Use `sanitizeHTML()` on all user inputs |
| **Performance degradation** | Medium | Low | Debounce updates, optimize HTML generation |

### Medium Priority Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Quoted-printable encoding errors** | Medium | Low | Follow RFC 2045 exactly, extensive testing |
| **Subject line too long** | Medium | Medium | Warn at 50 chars, show character count |
| **Missing Plus Code breaks layout** | Low | Medium | Make optional, graceful degradation |
| **Browser compatibility issues** | Medium | Low | Cross-browser testing, standard APIs |

---

## 7.2 Mitigation Strategies

### Strategy 1: Backward Compatibility
- Default signature format remains 'text'
- Templates unchanged - conversion at EML level
- Plain text version always included
- Existing functionality preserved

### Strategy 2: Progressive Enhancement
- HTML is enhancement, not requirement
- Fallback to plain text if HTML fails
- Missing profile fields degrade gracefully
- Preview tab disables for plain text

### Strategy 3: Security First
- All user inputs sanitized via `sanitizeHTML()`
- URLs properly encoded (`encodeURIComponent`)
- Plus Code format validated
- XSS test scenarios included

### Strategy 4: Testing Coverage
- Unit tests for each function
- Integration tests for workflows
- Manual email client testing
- RFC compliance validation

---

## 7.3 Rollback Plan

### Level 1: Quick Fix (Same Day)
```javascript
// Revert createGenericEMLFile() to text/plain only
eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
// Remove HTML part
// Signature function remains backward compatible
```

### Level 2: Partial Rollback (1-2 Days)
- Keep HTML signature function
- Disable HTML in EML files
- Preview tab can still show HTML
- Investigate and fix issues

### Level 3: Full Rollback (If Needed)
- Restore previous version from git
- All changes reversed
- Templates continue working
- Plan improvements before retry

---

# Success Criteria

## 8.1 Functional Requirements

### Must Have ✅

- [ ] EML files contain multipart/alternative structure
- [ ] Both text/plain and text/html versions present
- [ ] HTML signature with Century Gothic font
- [ ] Clickable brand hyperlinks
- [ ] Google Maps Plus Code link (when available)
- [ ] Email hyperlink with partial format
- [ ] Preview tab shows rendered HTML
- [ ] HTML tab shows source code
- [ ] Subject updates preview in real-time
- [ ] All 10 templates generate valid EML files
- [ ] Backward compatibility maintained
- [ ] XSS protection for all user inputs

### Should Have ✨

- [ ] Character counter with warnings
- [ ] Preview iframe has proper email styling
- [ ] Subject appears in preview header
- [ ] Tab switching is smooth
- [ ] Loading states (if needed)
- [ ] Error handling with user feedback

### Nice to Have 🎁

- [ ] Syntax highlighting in HTML tab
- [ ] Copy button for HTML source
- [ ] Email preview in multiple layouts
- [ ] Dark mode support in preview

---

## 8.2 Technical Requirements

### RFC Compliance

- [ ] RFC 5322: Email message format
- [ ] RFC 2045: MIME part one
- [ ] RFC 2046: MIME part two (multipart/alternative)
- [ ] RFC 2047: MIME part three
- [ ] RFC 2231: MIME parameter encoding

### Email Client Support

- [ ] Microsoft Outlook (Windows) - .eml files
- [ ] Microsoft Outlook (Mac) - .emltpl files
- [ ] Gmail (Web & Mobile)
- [ ] Apple Mail (macOS & iOS)
- [ ] Thunderbird
- [ ] Other standards-compliant clients

### Performance

- [ ] HTML conversion < 5ms per template
- [ ] EML generation < 10ms total
- [ ] Subject update < 500ms total (including debounce)
- [ ] Preview iframe renders < 100ms
- [ ] No UI blocking during generation
- [ ] No memory leaks

---

## 8.3 User Experience Requirements

### Usability

- [ ] Preview shows email as user will see it
- [ ] HTML tab shows copyable source
- [ ] Subject editing feels responsive
- [ ] Character counter is always visible
- [ ] Warnings don't prevent action
- [ ] Errors are clear and actionable

### Accessibility

- [ ] WCAG AA compliance
- [ ] Screen reader support
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] Color contrast
- [ ] ARIA labels

### Visual Design

- [ ] Tabs match existing UI style
- [ ] Preview iframe styled like email client
- [ ] Signature looks professional
- [ ] Loading states smooth
- [ ] Transitions polished

---

## 8.4 Quality Metrics

### Code Quality

- [ ] All functions have JSDoc comments
- [ ] No console.log in production
- [ ] Proper error handling
- [ ] No magic numbers
- [ ] Passes linter

### Test Coverage

- [ ] Unit tests: 100% pass
- [ ] Integration tests: 100% pass
- [ ] Email client tests: All platforms verified
- [ ] RFC validation: All checks passed
- [ ] XSS tests: No vulnerabilities

### Documentation

- [ ] README updated
- [ ] Code comments complete
- [ ] User guide includes new features
- [ ] Changelog updated
- [ ] This implementation plan archived

---

## 8.5 Acceptance Criteria

### Before Deployment

1. **Functionality**
   - All features work as specified
   - No critical bugs
   - No regressions in existing features

2. **Quality**
   - Code reviewed and approved
   - All tests passing
   - Performance benchmarks met

3. **Documentation**
   - User documentation complete
   - Technical documentation complete
   - Deployment guide ready

4. **Approval**
   - Sample EML files reviewed
   - Signature format approved
   - User acceptance testing passed

---

## Appendix A: Code Location Quick Reference

### Key Functions

| Function | File | Line | Purpose |
|----------|------|------|---------|
| `showRegularOutput()` | app.js | 1673 | Creates output UI for regular templates |
| `generateMessage()` | app.js | 3979 | Generates message from template |
| `renderEditableSubjectLine()` | app.js | 4413 | Creates editable subject field |
| `createGenericEMLFile()` | app.js | 4465 | Generates EML files |
| `getEmployeeSignature()` | app.js | 325 | Generates signature (to be updated) |
| `debounce()` | app.js | 1713 | Debounce utility |

### New Functions to Add

| Function | Location | Purpose |
|----------|----------|---------|
| `isHTMLContent()` | After line 1386 | Detect HTML content |
| `updateEmailPreview()` | After line 1708 | Update preview iframe |
| `wrapHtmlForEmailPreview()` | After updateEmailPreview | Wrap HTML in email template |
| `convertTextToHTML()` | After line 4565 | Convert text to HTML |
| `encodeQuotedPrintable()` | After convertTextToHTML | Encode for email |
| `updateSubjectInPreview()` | After line 1762 | Update subject in preview |

### Key Elements

| Element ID | Purpose |
|------------|---------|
| `outputArea` | Textarea showing message |
| `emailPreview` | Iframe showing preview |
| `previewTab` | Preview tab button |
| `htmlTab` | HTML tab button |
| `subjectLineInput` | Subject input field |
| `subjectCharCount` | Character counter |

---

## Appendix B: Templates Reference

### Templates with Editable Subjects

| ID | Name | Category |
|----|------|----------|
| `new-customer-welcome` | New Customer Welcome | Customer Email |
| `new-model-arrival` | New Model Arrival | Customer Email |
| `weekly-sale` | Weekly Sale | Customer Email |
| `limited-edition` | Limited Edition | Customer Email |
| `vip-reconnection` | VIP Reconnection | Customer Email |
| `phone-confirmation` | Phone Confirmation | Phone Orders |
| `phone-shipped` | Phone Shipped | Phone Orders |
| `phone-under-500` | Phone Under $500 | Phone Orders |
| `phone-corporate` | Phone Corporate | Phone Orders |
| `inter-store-notification` | Inter-Store Notification | Staff Communication |

**Total**: 10 templates (all will get Preview/HTML tabs)

### Special Template

- **promotion-email**: Already has Preview/HTML Code tabs, serves as reference

---

## Appendix C: Brand URLs

### Official Brand Websites

- **Alpina**: https://us.alpinawatches.com/
- **Bulova**: https://www.bulova.com/
- **Citizen**: https://www.citizenwatch.com/
- **Frederique Constant**: https://us.frederiqueconstant.com/

### Google Maps Plus Codes

- **Documentation**: https://maps.google.com/pluscodes/
- **Format**: 8-character code + 2-character local (e.g., `8FWH+QQ`)
- **URL Pattern**: `https://maps.google.com/?q=[PLUS_CODE]`
- **Example**: `https://maps.google.com/?q=8FWH%2BQQ+Orlando`

---

## Appendix D: RFC References

### Email Standards

- **RFC 5322**: Internet Message Format
  - https://tools.ietf.org/html/rfc5322
  - Defines email message structure

- **RFC 2045**: MIME Part One
  - https://tools.ietf.org/html/rfc2045
  - Format of internet message bodies

- **RFC 2046**: MIME Part Two
  - https://tools.ietf.org/html/rfc2046
  - Media types, multipart/alternative

- **RFC 2047**: MIME Part Three
  - https://tools.ietf.org/html/rfc2047
  - Message header extensions

---

## Document History

**Version 1.0** - November 3, 2025
- Initial comprehensive implementation plan
- All three features documented
- Integration architecture defined
- Testing strategy complete
- Ready for implementation

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up development environment**
3. **Create feature branch**: `git checkout -b feature/preview-html-eml`
4. **Begin Phase 1** (Preview/HTML Tabs - Week 1)
5. **Daily standups** to track progress
6. **Weekly demos** to show progress

---

**Questions or concerns?** Contact the development team.

**Ready to begin?** Start with Feature 1, Step 1: Add `isHTMLContent()` function.
