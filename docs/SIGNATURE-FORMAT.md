# Email Signature Format

**Date**: August 14, 2026 (Updated)
**Status**: ✓ Current Implementation
**Location**: `src/lib/signature.ts` - `getEmployeeSignature()` function

## Overview

The email signature is a standardized footer included in employee communications. It displays professional contact information with proper formatting for both plain text and HTML email clients. All brand values (company name, store name, brand links) are read per-install from the saved profile, so the signature works for any brand — there are no hardcoded company values.

## Signature Structure

The signature displays in the following order:

### 1. Name & Title Line
```
Name │ Title
```
- Employee name from profile (**bold**)
- Pipe character (│) separator
- Job title from profile
- Font: Century Gothic, 9pt, black
- **Name is bold**, title is regular weight

### 2. Visual Separator
```
______________________________________________________________________
```
- Line of underscores for visual separation (**bold**)
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)

### 3. Company Information
```
Acme Inc.
Acme Store - Store Location
```
- `companyName` on first line (**bold**)
- `storeName - storeLocation` on second line (**bold**; location line omitted when empty)
- Store location from profile (e.g., "the South Premium Outlets")
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)

### 4. Store Address
```
[Full Store Address from Profile]
```
- Street address from `storeAddress` profile field
- Multi-line addresses display with proper line breaks (`<br>` in HTML)
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)
- **Note**: Only shows if address is filled in profile

### 5. Phone Number
```
Tel/SMS: (702) 555-0190
```
- Phone number from `storePhone` profile field
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)
- **Spacing**: Blank line follows this section before email

### 6. Email Address
```
Email: vegassouth@example.com
```
- **Smart Selection Based on Job Title**:
  - If title contains "manager", "director", "supervisor", or "assistant manager"
    (case-insensitive, checked against `MANAGER_TITLES` in `signature.ts`)
    - Uses `companyEmail` from profile (if available)
  - Otherwise
    - Uses `storeEmail` from profile (if available)
- Email formatted as hyperlink (`mailto:` link, styled blue + underline)
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)
- **Note**: Only shows if email is available
- **Spacing**: No blank line between email and brand links (flows directly)

### 7. Brand Links
```
Lumen | Zenith | Acme | Meridian
```
- Brand links configured in the profile (`brandLinks` array), separated by pipes (|)
- Each brand is a hyperlink in blue (#0066cc) with underline
- Font: Century Gothic, 8pt
- **Note**: Links are only rendered for brands with both a name and URL; the
  entire row is omitted when no valid brand links are configured (no empty
  placeholder row)

### 8. Environment Message
```
Please consider the environment before printing this e-mail
```
- Green text (#0c8822), bold
- Font: Century Gothic, 8pt
- Encourages digital-first communication

## HTML Formatting

### Font Specifications
- **Font Family**: Century Gothic, Aptos, Arial, sans-serif (fallback order)
- **Name/Title**: 9pt, bold, black
- **Details**: 8pt, dark gray (#2f2f2f)
- **Links**: 8pt, blue (#0066cc), underlined
- **Environment**: 8pt, green (#0c8822), bold

### Styling Details
- All paragraphs: `margin: 0; padding: 0;`
- Email paragraph: `margin: 10px 0 0 0;` (adds top margin for blank line spacing)
- Brand links paragraph: `margin: 4px 0;`
- Environment paragraph: `margin: 4px 0;`
- Links in email body: automatically styled blue with underline
- Color consistency across all email clients
- Preview mode (`forPreview: true`) swaps colors when the host page is dark
  (via `isIframePreviewDarkMode()`): primary `#e0e0e0`, secondary `#b0b0b0`,
  link `#4da6ff`, environmental `#4CAF50`

## Plain Text Formatting

In plain text emails:
- Name and title on first line with pipe separator
- Each section on separate line(s)
- Email address displayed as text, not hyperlinked
- Brand links shown as text only

## Profile Configuration

The signature pulls data from the user profile saved in the application (see
`src/lib/profile.ts`, `extractSignatureData()`), edited on the Settings page
(`src/pages/ProfileSettingsPage.tsx`):

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| `employeeName` | Text | Yes | Name in signature |
| `jobTitle` | Text | Yes | Title in signature; determines email selection |
| `storeLocation` | Text | Yes | Location after `storeName` |
| `storeAddress` | Text | No | Address line in signature |
| `storePhone` | Text | Yes | Tel/SMS number |
| `storeEmail` | Text | No | Email for non-manager staff |
| `companyEmail` | Text | No | Email for managers and above |
| `companyName` | Text | Yes | Company name line in signature |
| `storeName` | Text | Yes | Store name line in signature |
| `brandLinks` | Array | No | Brand name/URL pairs rendered as links |

## Email Selection Logic

The signature automatically selects the appropriate email based on job title:

```
If jobTitle contains "manager", "director", "supervisor", or "assistant manager":
  Use companyEmail (if available)
Else:
  Use storeEmail (if available)
```

This ensures:
- ✅ Managers use company email for official communications
- ✅ Staff use store email for customer service
- ✅ Fallback to available email if preferred one is missing
- ✅ No email shown if neither is configured

## Implementation Details

### Function Location
- **File**: `src/lib/signature.ts` (migrated from the legacy
  `src/js/shared/signature.js` — removed in the TypeScript migration)
- **Function**: `getEmployeeSignature(format = 'text', options?)`
- **Parameters**:
  - `format`: 'text' (default) or 'html'
  - `options.forPreview`: when true, uses theme-aware preview colors

### Usage in Templates
Template bodies end with a closing generated by `generateClosing()` in
`src/lib/templates.ts`:

```typescript
function generateClosing(): string {
  return `\n\nBest regards,`;
}
```

Each template's `generate()` result carries `includeSignature: true` (or
`false` for templates that shouldn't append one), and the generator appends
`getEmployeeSignature()` / `getEmployeeSignature('html')` accordingly
(`src/lib/templates.ts` lines ~287-289).

### Signature Removal
When converting the editable preview back to text/HTML for export, the
signature is detected and removed via a dedicated CSS class, **not** regex
(`src/lib/htmlTextConversion.ts`):

- The rendered signature block is marked with the
  `.email-signature-protected` class.
- `getEditableBodyHTML()` clones the preview container and removes any
  `.email-signature-protected` element before extracting content, so the
  signature is never duplicated in the exported body.

## Sign-Off Format

All email templates use the "Best regards," sign-off, centralized in
`generateClosing()` in `src/lib/templates.ts`:

```
Best regards,
```

**Implementation**:
- Appears on its own line
- Immediately followed by the signature (no blank line between)
- Provided by every template through the shared `generateClosing()` helper

## Email Client Compatibility

Tested and verified in:
- ✅ Microsoft Outlook (Desktop & Web)
- ✅ Gmail
- ✅ Apple Mail
- ✅ Thunderbird
- ✅ Most standards-compliant email clients

## Visual Examples

### Plain Text
```
Xchel Dominguez │ General Manager
______________________________________________________________________
Acme Inc.
Acme Store - the South Premium Outlets
7400 S Austin Blvd, St. 231
Austin, NV 89123
Tel/SMS: (702) 555-0190

Email: xdominguez@example.com
Lumen | Zenith | Acme | Meridian

Please consider the environment before printing this e-mail
```

**Spacing Details**:
- Blank line after phone number
- No blank line between email and brand links
- Blank line before environment message

### HTML (Preview/Email)
Shows the same content with:
- Professional typography (Century Gothic fonts)
- Bold formatting on name, company, and separator line
- Proper spacing and margins
- Colored elements (blue links, green text for environment message)
- Email address as hyperlink

## Maintenance Notes

- **Font files**: Uses system fonts (Century Gothic or Aptos fallback)
- **Color consistency**: Uses exact hex values (#2f2f2f, #0066cc, #0c8822)
- **Security**: All user input escaped via `sanitizeHTML()` to prevent XSS attacks
- **Localization**: Store location and address support multi-line input
- **Branding**: All brand values are profile-driven — no hardcoded company names

## Future Enhancements

Potential improvements for future versions:
- Logo/image insertion
- Custom signature variants per location
- Seasonal signature variations
- Dynamic content (e.g., current promotions)
- Multi-language support

## Recent Updates (August 14, 2026)

- ✅ Documented the current React/TypeScript implementation (`src/lib/signature.ts`)
- ✅ Updated link color to the current value (#0066cc)
- ✅ Documented `.email-signature-protected` removal mechanism
- ✅ Documented centralized `generateClosing()` sign-off helper
- ✅ Documented profile-driven brand links (`brandLinks`) and brand-agnostic behavior
- ✅ Removed references to the deleted legacy `src/js/` files

---

**Last Updated**: August 14, 2026
**Maintained By**: Development Team
**Status**: Production Ready ✓
