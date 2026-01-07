# SHARED UTILITIES

**Generated:** 2025-01-06T20:36:02Z
**Commit:** 8cbaba1
**Branch:** main

## OVERVIEW

Cross-page utilities for email, theme, database, and signature generation. Used by app.js and promotion-app.js.

## STRUCTURE

```
src/js/shared/
├── db.js                    # IndexedDB wrapper for PDFs
├── desktop-api.js           # Desktop API checks
├── emailPreviewUtils.js     # Email preview functionality
├── emailUtils.js            # EML/EMLTPL generation (RFC 5322/2045)
├── htmlTextConversion.js   # HTML ↔ plain text conversion
├── icons.js                 # SVG icon utilities
├── pageTransitions.js       # Page transition effects
├── profile.js               # User profile utilities
├── signature.js             # Email signature generation
├── theme.js                 # Theme system (light/dark + palettes)
└── ui-utils.js              # Common UI helper functions
```

## WHERE TO LOOK

| Utility               | Key Functions                            | Notes                                  |
| --------------------- | ---------------------------------------- | -------------------------------------- |
| emailUtils.js         | createEMLFile(), generateEmailHeaders()  | RFC 5322/2045 compliance, CRLF endings |
| signature.js          | getEmployeeSignature()                   | Job title-based email selection        |
| theme.js              | initTheme(), applyTheme()                | Light/dark + 16 palettes               |
| db.js                 | savePDF(), getPDF(), deletePDF()         | IndexedDB: "PDFStorage"/"pdfs"         |
| profile.js            | saveProfile(), loadProfile()             | localStorage: "userProfile"            |
| htmlTextConversion.js | convertTextToHTML(), convertHTMLToText() | Paragraphs, lists, signature handling  |

## CONVENTIONS

- **EML files**: Always use CRLF (`\r\n`) for email client compatibility
- **Subject encoding**: UTF-8 base64 encoding for non-ASCII characters
- **Signature**: Management (Assistant Store Manager+) → company email; others → store email
- **Theme**: CSS custom properties split across theme-base.css and theme-palettes.css
- **XSS**: All user input must be sanitized before use

## ANTI-PATTERNS

- Never use `\n` in EML files - use `\r\n`
- Never hardcode theme values - use CSS custom properties
- Never skip signature sanitization
