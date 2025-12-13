# Email Signature Format

**Date**: November 11, 2025 (Updated)
**Status**: ✓ Current Implementation
**Location**: `src/js/shared/signature.js` - `getEmployeeSignature()` function (re-exported by `src/js/templates.js`)

## Overview

The email signature is a standardized footer included in all employee communications. It displays professional contact information with proper formatting for both plain text and HTML email clients.

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
Citizen Watch America
Citizen Company Store - Store Location
```
- "Citizen Watch America" on first line (**bold**)
- "Citizen Company Store - Store Location" on second line (**bold**)
- Store location from profile (e.g., "the South Premium Outlets")
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)

### 4. Store Address
```
[Full Store Address from Profile]
```
- Street address from `storeAddress` profile field
- Multi-line addresses display with proper line breaks
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)
- **Note**: Only shows if address is filled in profile

### 5. Phone Number
```
Tel/SMS: (702) 357-8990
```
- Phone number from `storePhone` profile field
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)
- **Spacing**: Blank line follows this section before email

### 6. Email Address
```
Email: vegassouth@citizenwatchgroup.com
```
- **Smart Selection Based on Job Title**:
  - If title contains: "Manager", "Director", "Supervisor", or "Assistant Manager"
    - Uses `companyEmail` from profile (if available)
  - Otherwise
    - Uses `storeEmail` from profile (if available)
- Email formatted as hyperlink: `Email: prefix@domain.com` (with @ as hyperlink)
- Font: Century Gothic, 8pt, dark gray (#2f2f2f)
- **Note**: Only shows if email is available
- **Spacing**: No blank line between email and brand links (flows directly)

### 7. Brand Links
```
Alpina | Bulova | Citizen | Frederique Constant
```
- Four brand links separated by pipes (|)
- Each brand is a hyperlink in blue (#0000ee) with underline
- Font: Century Gothic, 8pt
- **Links**:
  - Alpina: https://us.alpinawatches.com/
  - Bulova: https://www.bulova.com/
  - Citizen: https://www.citizenwatch.com/
  - Frederique Constant: https://us.frederiqueconstant.com/

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
- **Links**: 8pt, blue (#0000ee), underlined
- **Environment**: 8pt, green (#0c8822), bold

### Styling Details
- All paragraphs: `margin: 0; padding: 0;`
- Email paragraph: `margin: 10px 0 0 0;` (adds top margin for blank line spacing)
- Links in email body: automatically styled blue with underline
- Color consistency across all email clients

## Plain Text Formatting

In plain text emails:
- Name and title on first line with pipe separator
- Each section on separate line(s)
- Email address displayed as text, not hyperlinked
- Brand links shown as text only

## Profile Configuration

The signature pulls data from the user profile saved in the application. Make sure to fill in these fields in `start.html`:

| Field | Type | Required | Used For |
|-------|------|----------|----------|
| `employeeName` | Text | Yes | Name in signature |
| `jobTitle` | Text | Yes | Title in signature; determines email selection |
| `storeLocation` | Text | Yes | Location after "Citizen Watch America" |
| `storeAddress` | Text | No | Address line in signature |
| `storePhone` | Text | Yes | Tel/SMS number |
| `storeEmail` | Text | No | Email for non-manager staff |
| `companyEmail` | Text | No | Email for managers and above |

## Email Selection Logic

The signature automatically selects the appropriate email based on job title:

```
If jobTitle contains "Manager", "Director", "Supervisor", or "Assistant Manager":
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
- **File**: `src/js/shared/signature.js`
- **Function**: `getEmployeeSignature(format = 'text')`
- **Parameters**:
  - `format`: 'text' (default) or 'html'

### Usage in Templates
Plain text templates end with:
```javascript
${getEmployeeSignature()}  // Returns plain text signature
```

HTML conversion uses:
```javascript
getEmployeeSignature('html')  // Returns HTML-formatted signature
```

### Signature Removal
When converting plain text to HTML for preview/EML, the signature is detected and removed:

**Primary Method** (templates with "Best regards," sign-off):
- Regex: `/\n\nBest regards,/`
- Keeps the email body including "Best regards,"
- Removes the plain text signature that follows

**Fallback Method** (for templates without "Best regards,"):
- Regex: `/\n\n-{5,}\n/` or `/______+/`
- Detects signature by separator markers
- Removes from the marker onwards

After removal, the HTML signature is appended fresh to ensure consistent formatting.

## Sign-Off Format

All email templates include a professional sign-off before the signature:

```
Best regards,
```

**Implementation**:
- Appears on its own line
- Immediately followed by the signature (no blank line between)
- All 8 email templates use "Best regards," as the sign-off
- Provides professional closing before contact information

**Templates Using Sign-Off**:
1. new-customer-welcome
2. new-model-arrival
3. limited-edition
4. vip-reconnection
5. phone-confirmation
6. phone-shipped
7. phone-under-500
8. inter-store-notification

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
Citizen Watch America
Citizen Company Store - the South Premium Outlets
7400 S Las Vegas Blvd, St. 231
Las Vegas, NV 89123
Tel/SMS: (702) 357-8990

Email: xdominguez@citizenwatchgroup.com
Alpina | Bulova | Citizen | Frederique Constant

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
- **Color consistency**: Uses exact hex values (#2f2f2f, #0000ee, #0c8822)
- **Security**: All user input escaped to prevent XSS attacks
- **Localization**: Store location and address support multi-line input

## Future Enhancements

Potential improvements for future versions:
- Logo/image insertion
- Custom signature variants per location
- Seasonal signature variations
- Dynamic content (e.g., current promotions)
- Multi-language support

## Recent Updates (November 11, 2025)

- ✅ Added "Best regards," sign-off to all 8 email templates
- ✅ Improved signature spacing (blank line between phone and email)
- ✅ Updated HTML preview to reflect correct spacing
- ✅ Added email tab showing actual HTML code
- ✅ Fixed preview rendering for plain text templates
- ✅ Documented signature removal logic for "Best regards," marker
- ✅ Split company information into two lines (Citizen Watch America, then Citizen Company Store - Location)
- ✅ Added bold formatting to name, separator line, and company information
- ✅ Updated management hierarchy: Assistant → Associate → General → Area → Regional → District

---

**Last Updated**: November 11, 2025
**Maintained By**: Development Team
**Status**: Production Ready ✓
