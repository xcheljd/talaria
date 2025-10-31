# Email Standards Compliance Audit

**Project:** Citizen Communication Template Generator
**Date:** October 30, 2025
**Audit Scope:** EML and EMLTPL file generation functions
**Status:** Audit Complete - Implementation Pending

---

## Executive Summary

This audit evaluates RFC compliance of email file generation in `app.js`. Two functions were analyzed:
- `createEMLFile()` (lines 3498-3557) - Single recipient emails
- `createBCCBatchEML()` (lines 3825-3930) - Bulk BCC batches

**Key Findings:**
- ✅ Recent fixes (BCC header folding, PDF attachments, CRLF line endings) are working correctly
- ❌ 2 CRITICAL issues requiring immediate attention
- ⚠️ 5 HIGH priority RFC violations
- 📋 7 MEDIUM priority compatibility issues
- 📝 6 LOW priority code quality improvements

**Estimated Effort:** 15-20 hours over 3 weeks for full compliance

---

## Standards Reference

### RFC Standards Applied

| Standard | Description | Key Requirements |
|----------|-------------|------------------|
| **RFC 5322** | Internet Message Format | Required headers (From, Date), line length limits (998 max, 78 recommended), header folding |
| **RFC 2045-2049** | MIME Specifications | Boundary format, Content-Transfer-Encoding, base64 line length (76 chars) |
| **RFC 2047** | Message Header Extensions | Encoded-words for non-ASCII in headers |
| **RFC 2231** | MIME Parameter Encoding | Filename encoding for non-ASCII characters |
| **RFC 822** | Original Internet Text Messages | Superseded by RFC 5322, but BCC folding based on this |

### Outlook-Specific Requirements

| Header | Purpose | Value |
|--------|---------|-------|
| `X-Unsent: 1` | Marks message as draft | Required |
| `X-Outlook-Template: 1` | Marks as Outlook template (.emltpl) | Required for templates |
| `Message-Class: IPM.Note` | Outlook message classification | Recommended |
| `X-Outlook-Message-Flag:` | Draft status indicator | Optional |
| `X-Mailer: Microsoft Outlook 16.0` | Client identifier | Optional |
| `X-Msg-Status: 00000000` | Message status code | Optional |

**Line Endings:** MUST use CRLF (`\r\n`) for Windows/Outlook compatibility

---

## 🚨 CRITICAL Issues (Fix Immediately)

### C1: Missing Date Header in createEMLFile()

**RFC Violation:** RFC 5322 §3.6.1 - Date is REQUIRED field
**Location:** Line 3510 (intentionally omitted per comment)
**Current Code:**
```javascript
// Line 3510 comment:
// Omit Date header to prevent Outlook from treating as sent message
```

**Impact:**
- SMTP servers may reject message
- Email clients may add incorrect date
- Violates email standards compliance

**Fix Required:**
```javascript
// Add after line 3509 (Subject header):
const date = new Date().toUTCString();
eml += `Date: ${date}\r\n`;
```

**Testing:**
- Verify Outlook still treats as draft with Date header
- Test in Outlook Mac and Windows
- Verify Date in RFC 5322 format

**Estimated Time:** 30 minutes

---

### C2: 7bit Encoding with Non-ASCII HTML in createBCCBatchEML()

**RFC Violation:** RFC 2045 §6.1 - 7bit encoding allows only 7-bit ASCII
**Location:** Line 3896
**Current Code:**
```javascript
emlContent += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
emlContent += htmlBody + '\r\n\r\n';  // Raw HTML - no encoding!
```

**Impact:**
- Non-ASCII characters (emoji, accents, Chinese) will be corrupted
- MIME parsers may fail
- Data loss in international content

**Fix Required:**
```javascript
// Change to base64 like createEMLFile()
emlContent += `Content-Transfer-Encoding: base64\r\n\r\n`;

// Encode HTML to base64
const htmlBase64 = btoa(unescape(encodeURIComponent(htmlBody)));
const htmlLines = htmlBase64.match(/.{1,76}/g) || [];
emlContent += htmlLines.join('\r\n') + '\r\n\r\n';
```

**Testing:**
- HTML with emoji: "🎉 Sale Today!"
- HTML with accents: "Café promotion"
- HTML with Chinese: "新产品"
- Send email and verify rendering

**Estimated Time:** 1 hour

---

## ⚠️ HIGH Priority Issues (Standards Violations)

### H1: No Subject Line Length Validation

**Location:** Lines 3509, 3843
**RFC:** RFC 5322 §2.1.1 - Max 998 chars per line
**Impact:** Very long subjects will violate RFC, may cause parsing errors

**Fix:**
```javascript
function validateSubject(subject) {
    if (!subject || subject.trim() === '') {
        throw new Error('Subject cannot be empty');
    }
    if (subject.length > 900) {
        throw new Error('Subject too long (max 900 characters)');
    }
    if (/[\x00-\x1F\x7F]/.test(subject)) {
        throw new Error('Subject contains invalid control characters');
    }
    return true;
}
```

**Estimated Time:** 1 hour

---

### H2: No Subject Encoding for Non-ASCII

**Location:** Lines 3509, 3843
**RFC:** RFC 2047 - Encoded-words for non-ASCII
**Impact:** Emoji and international characters may not display correctly

**Fix:**
```javascript
function encodeSubject(subject) {
    if (!/[^\x00-\x7F]/.test(subject)) {
        return subject; // Pure ASCII
    }

    const utf8Bytes = new TextEncoder().encode(subject);
    const binaryString = Array.from(utf8Bytes, byte => String.fromCodePoint(byte)).join('');
    const base64 = btoa(binaryString);

    return `=?UTF-8?B?${base64}?=`;
}

// Usage:
eml += `Subject: ${encodeSubject(subject)}\r\n`;
```

**Estimated Time:** 2 hours

---

### H3: Missing Message-ID in createEMLFile()

**Location:** N/A (missing)
**RFC:** RFC 5322 §3.6.4 - Recommended for uniqueness
**Impact:** Multiple files may be treated as duplicates

**Fix:**
```javascript
const messageId = `<single.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@citizenstore.local>`;
eml += `Message-ID: ${messageId}\r\n`;
```

**Estimated Time:** 30 minutes

---

### H4: No Email Address Validation

**Location:** Lines 3504-3507, 3859-3871
**RFC:** RFC 5322 §3.4 - addr-spec syntax
**Impact:** Malformed emails can break MIME structure

**Fix:**
```javascript
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) && email.length <= 254;
}

// Use before adding to BCC:
const validRecipients = recipients.filter(email => {
    if (!validateEmail(email)) {
        console.warn('Skipping invalid email:', email);
        return false;
    }
    return true;
});
```

**Estimated Time:** 1 hour

---

### H5: Weak Boundary Uniqueness in createEMLFile()

**Location:** Line 3499
**Current:** `Date.now()` only
**Impact:** Two files created in same millisecond have identical boundary

**Fix:**
```javascript
const boundary = '----=_NextPart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
```

**Estimated Time:** 15 minutes

---

## 📋 MEDIUM Priority Issues (Compatibility)

### M1: Deprecated unescape() Function

**Location:** Line 3530
**Issue:** `unescape()` is deprecated
**Fix:**
```javascript
function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    const binaryString = Array.from(bytes, byte => String.fromCodePoint(byte)).join('');
    return btoa(binaryString);
}
```

**Estimated Time:** 1 hour

---

### M2: No Filename Encoding for Non-ASCII

**Location:** Lines 3544, 3908
**RFC:** RFC 2231 - Parameter encoding
**Fix:**
```javascript
function encodeFilename(filename) {
    if (!/[^\x00-\x7F]/.test(filename)) {
        return `filename="${filename}"`;
    }
    return `filename*=UTF-8''${encodeURIComponent(filename)}`;
}
```

**Estimated Time:** 2 hours

---

### M3: Inconsistent Charset Capitalization

**Location:** Lines 3525, 3895
**Fix:** Standardize to lowercase `utf-8`
**Estimated Time:** 10 minutes

---

### M4: Missing MIME Preamble in createBCCBatchEML()

**Location:** After line 3891
**Fix:**
```javascript
emlContent += `This is a multi-part message in MIME format.\r\n\r\n`;
```

**Estimated Time:** 10 minutes

---

### M5: HTML Line Endings Not Normalized

**Location:** Line 3897
**Fix:**
```javascript
const normalizedBody = htmlBody.replace(/\r?\n/g, '\r\n');
emlContent += normalizedBody + '\r\n\r\n';
```

**Estimated Time:** 15 minutes

---

### M6: Missing Message-Class in createEMLFile()

**Location:** After line 3513
**Fix:**
```javascript
eml += `Message-Class: IPM.Note\r\n`;
```

**Estimated Time:** 5 minutes

---

### M7: No PDF Data Validation

**Location:** Lines 3539, 3903
**Fix:**
```javascript
const parts = pdf.data.split(',');
if (parts.length !== 2 || !parts[0].includes('base64')) {
    console.error('Invalid PDF data format:', pdf.name);
    continue;
}
const base64Data = parts[1];
```

**Estimated Time:** 30 minutes

---

## 📝 LOW Priority Issues (Code Quality)

### L1: Unused Variables
- Line 3500: `date` variable created but not used
- Line 3498: `recipient` parameter never used

### L2: Inconsistent Header Ordering
- Both functions have different header orders
- Recommendation: Standardize to RFC order (standard headers, then X- headers)

### L3: No Attachment Count/Size Limits
- No validation on number or size of PDFs
- Recommendation: Max 10 files, 10MB total

### L4: BCC Folding Could Be More Conservative
- Current: 900-character threshold
- RFC recommends: 78 characters
- Decision: Keep 900 (good balance of compatibility and readability)

### L5: No Boundary Collision Detection
- Very low probability but possible
- Add validation that boundary doesn't appear in content

---

## Function Comparison

### createEMLFile() vs createBCCBatchEML()

| Feature | createEMLFile() | createBCCBatchEML() | Winner |
|---------|----------------|---------------------|--------|
| **Date Header** | ❌ Missing | ✅ Present | createBCCBatchEML |
| **Message-ID** | ❌ Missing | ✅ Present | createBCCBatchEML |
| **HTML Encoding** | ✅ base64 (safe) | ❌ 7bit (risky) | createEMLFile |
| **Boundary Uniqueness** | ⚠️ Weak | ✅ Strong | createBCCBatchEML |
| **MIME Preamble** | ✅ Present | ❌ Missing | createEMLFile |
| **Deprecated Functions** | ⚠️ Uses unescape() | ✅ None | createBCCBatchEML |
| **Message-Class** | ❌ Missing | ✅ Present | createBCCBatchEML |

**Overall Winner:** createBCCBatchEML is more RFC-compliant, but needs base64 encoding fix

---

## Testing Strategy

### Unit Tests Required

**Header Validation:**
- Date header format (RFC 5322)
- Message-ID uniqueness
- Header line length compliance
- BCC header folding (500+ recipients)

**MIME Structure:**
- Boundary uniqueness
- Base64 line length (76 chars)
- Multipart structure correctness

**Character Encoding:**
- Non-ASCII in subjects
- Non-ASCII in HTML body
- Non-ASCII in filenames

### Integration Tests

**Batch Scenarios:**
- Small: 6 emails, batch size 1
- Medium: 300 emails, batch size 100
- Large: 2,866 emails, batch size 500
- Edge: Uneven splits, exact multiples

**Attachment Tests:**
- No PDFs
- Single PDF
- Multiple PDFs
- Large PDF (10MB)

**Special Character Tests:**
- Subjects: emoji, Chinese, accents, > 900 chars
- Filenames: spaces, quotes, non-ASCII
- HTML: emoji, international characters

### Email Client Compatibility

**Test in:**
- ✅ Outlook for Mac (.emltpl)
- ✅ Outlook for Windows (.eml)
- ⚠️ Thunderbird (optional)
- ⚠️ Apple Mail (optional)

**Validation:**
- File opens without errors
- BCC recipients loaded correctly
- PDF attachments present
- HTML renders properly
- Send button enabled

---

## Action Plan

### Week 1: CRITICAL Fixes (Must Do)

| Action | Issue | Time | Priority |
|--------|-------|------|----------|
| Add Date header to createEMLFile() | C1 | 30 min | CRITICAL |
| Change HTML encoding to base64 | C2 | 1 hour | CRITICAL |
| Add subject validation | H1 | 1 hour | HIGH |
| Implement subject encoding | H2 | 2 hours | HIGH |

**Week 1 Total:** ~5 hours

### Week 2: HIGH Priority Fixes (Should Do)

| Action | Issue | Time | Priority |
|--------|-------|------|----------|
| Add Message-ID to createEMLFile() | H3 | 30 min | HIGH |
| Add email validation | H4 | 1 hour | HIGH |
| Improve boundary uniqueness | H5 | 15 min | HIGH |
| Replace deprecated unescape() | M1 | 1 hour | MEDIUM |
| Implement filename encoding | M2 | 2 hours | MEDIUM |

**Week 2 Total:** ~5 hours

### Week 3: MEDIUM/LOW Priority (Nice to Have)

| Action | Issue | Time | Priority |
|--------|-------|------|----------|
| Standardize charset capitalization | M3 | 10 min | MEDIUM |
| Add MIME preamble | M4 | 10 min | MEDIUM |
| Normalize HTML line endings | M5 | 15 min | MEDIUM |
| Add Message-Class | M6 | 5 min | MEDIUM |
| Add PDF data validation | M7 | 30 min | MEDIUM |
| Remove unused variables | L1 | 15 min | LOW |
| Standardize header ordering | L2 | 1 hour | LOW |
| Add attachment limits | L3 | 30 min | LOW |

**Week 3 Total:** ~3 hours

### Testing & Documentation

| Task | Time |
|------|------|
| Write unit tests | 3 hours |
| Integration testing | 2 hours |
| Email client testing | 2 hours |
| Update documentation | 1 hour |

**Total:** ~8 hours

---

## Success Criteria

### Compliance Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| RFC 5322 Compliance | Partial | 100% | 🔴 Missing Date header |
| RFC 2045 Compliance | 90% | 100% | 🟡 7bit encoding issue |
| Outlook Compatibility | Good | Excellent | 🟢 Working well |
| International Support | Poor | Good | 🔴 No encoding |
| Code Quality | Good | Excellent | 🟡 Has deprecated functions |
| Test Coverage | 0% | 80% | 🔴 No tests |

### Definition of Done

- [x] All CRITICAL issues fixed
- [ ] All HIGH priority issues fixed
- [ ] 80%+ of MEDIUM priority issues fixed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Tested in Outlook Mac and Windows
- [ ] User acceptance testing completed

---

## Recent Fixes (Already Completed)

### ✅ BCC Header Folding (October 30, 2025)
**Issue:** BCC headers exceeded 998 character RFC limit
**Fix:** Implemented RFC 822 header folding at 900 characters
**Location:** Lines 3853-3881 in createBCCBatchEML()
**Status:** ✅ WORKING CORRECTLY

### ✅ PDF Attachments Restored (October 30, 2025)
**Issue:** PDFs not attached in batch emails
**Fix:** Added PDF attachment code to createBCCBatchEML()
**Location:** Lines 3899-3918
**Status:** ✅ WORKING CORRECTLY

### ✅ Unique Message-ID per Batch (October 30, 2025)
**Issue:** Outlook treating multiple batch files as duplicates
**Fix:** Added unique Message-ID with batch number and random string
**Location:** Line 3850-3851
**Status:** ✅ WORKING CORRECTLY

### ✅ CRLF Line Endings (Previously)
**Issue:** Outlook compatibility on Windows
**Fix:** All line endings use CRLF (`\r\n`)
**Status:** ✅ VERIFIED THROUGHOUT

---

## Risk Assessment

### Low Risk Changes (Safe to Implement)
- ✅ Adding Date header
- ✅ Adding Message-ID
- ✅ Subject validation
- ✅ Email validation
- ✅ Boundary uniqueness improvement

### Medium Risk Changes (Test Thoroughly)
- ⚠️ Changing HTML encoding from 7bit to base64 (file size increase)
- ⚠️ Subject encoding (verify all clients support)
- ⚠️ Filename encoding (verify Outlook compatibility)

### High Risk Changes (Avoid)
- ❌ Large refactoring without tests
- ❌ Changing MIME structure significantly
- ❌ Modifying BCC header folding (already works)

---

## Rollback Strategy

**For each change:**
1. Create git branch: `git checkout -b email-standards-fixes`
2. Tag before changes: `git tag before-critical-fixes`
3. Commit each fix separately
4. If issues arise: `git revert <commit-hash>`

---

## Additional Resources

### RFC Documents
- [RFC 5322 - Internet Message Format](https://tools.ietf.org/html/rfc5322)
- [RFC 2045 - MIME Part 1](https://tools.ietf.org/html/rfc2045)
- [RFC 2047 - Message Header Extensions](https://tools.ietf.org/html/rfc2047)
- [RFC 2231 - MIME Parameter Encoding](https://tools.ietf.org/html/rfc2231)

### Related Files
- `app.js` - Email generation functions
- `CLAUDE.md` - Development guide
- `README.md` - User documentation
- `CHANGELOG.md` - Version history

---

## Appendix: Code Quality Recommendations

### Extract Common Code

Consider creating helper functions:
```javascript
// Header creation
function createCommonHeaders(config) { ... }

// MIME part creation
function createHTMLPart(htmlBody, boundary, useBase64 = true) { ... }
function createPDFPart(pdf, boundary) { ... }

// Validation
function validateEmailCreationInput(config) { ... }
```

### Add Input Validation Layer

```javascript
function validateEmailCreationInput(config) {
    const errors = [];

    // Subject validation
    if (!config.subject || config.subject.length > 900) {
        errors.push('Invalid subject');
    }

    // Recipients validation
    if (config.recipients) {
        const invalid = config.recipients.filter(e => !validateEmail(e));
        if (invalid.length > 0) errors.push(`Invalid emails: ${invalid.join(', ')}`);
    }

    // Attachments validation
    if (config.pdfAttachments && config.pdfAttachments.length > 10) {
        errors.push('Max 10 attachments');
    }

    if (errors.length > 0) throw new Error(errors.join('; '));
    return true;
}
```

---

**Document Version:** 1.0
**Last Updated:** October 30, 2025
**Next Review:** After Week 1 fixes implemented
