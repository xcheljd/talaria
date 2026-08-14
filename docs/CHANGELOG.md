# Changelog

All notable changes to the Talaria will be documented in this file.

## [1.5.0] - 2026-08-14

Rebrand + amatl API hardening + promotion builder ergonomics + PDF optimizer
performance pass. Includes the CometCast → Talaria rename and brand-agnostic
profile fields.

### Added
- **Brand-agnostic profile**: `companyName`, `brandLinks`, `productNoun` /
  `productNounPlural`, and brand/collection keywords replace all hardcoded
  Citizen Watch values; signature, subject lines, and templates read from the
  profile (`99ad13b`, `498bb34`)
- **How-to-Shop auto-lines**: contact lines auto-refresh from the profile, hide
  when the profile field is empty, and persist through export/import
  (`71579d9`, `7c8c34e`, `59eac71`, `a3fc163`)
- **Important Notes directions line** now follows the profile (`d08414b`)
- **Dev mode toggle**: advanced surfaces gated behind a Settings dev toggle
  (`0d2b842`, `c32cf89`)
- **A11y scan snapshot**: manual scan result + stale-results indicator
  (`bdb8e12`)
- **Single-day date formatting**: "Only \<date\>" for same-day ranges, and
  full "Saturday, June 20th, 2026" for one-day promos (`bce6dff`, `818d684`)
- **Word-style bubble menu** on text selection in the newsletter editor
  (`99cb7b3`)
- **Client-faithful dark-mode preview**, plain-text paste, and editor WYSIWYG
  (`8dfb73c`); preview light/dark + full/partial remembered across sessions
  (`ca0a7a6`); preview light/dark syncs with app theme (`4f9bab1`)

### Fixed
- **EML subject injection**: CR/LF stripped from the Subject header
  (`c2f4339`)
- **Imported PDFs validated** instead of blind cast (`1b71924`)
- **Preview scroll preserved** across dark-mode switches and panel resizes
  (`536f9cd`, `8803aa9`, `be9717b`)
- **Download folder**: Settings now shows the folder downloads actually use,
  removing the drift-prone localStorage copy (`6640959`, `0d43139`)
- **E2E suite repaired**: CSS-variable color assertion and dev-only-card
  timeouts (`57b94bb`)

### Changed
- **Rebrand**: app renamed CometCast → Talaria (`4c28cea`)
- **amatl tunables**: DPI / JPEG quality / margin promoted from consts to
  `OptimizeOptions` fields with a manual `Default` (`9a68bd3`, plans/001)
- **amatl API**: `OptimizeOptions` is now `#[non_exhaustive]` with chainable
  `with_*` builder methods (`b7f0cf9`, plans/002)
- **amatl performance**: rayon-parallel replacement planning, reduced-scale
  JPEG decode, duplicate image-stream merging, zero pixel-buffer copies
  (`f8b8d3a`, `1f2dded`, `bbbf561`, `cc2976c`, `d4d1cfa`, `9f55704`; perf
  characteristics recorded in `src-tauri/src/AGENTS.md`)
- **lopdf 0.42**: xref self-entry workaround deleted (`00b8844`)
- **Dependencies**: TipTap 3.27.1 → 3.29.0; tauri crate 2.11.3 to match
  `@tauri-apps/api` (`492b86d`, `a223be4`)
- **Icon toolbar**: single-card tool selector (`f3ff0d2`)
- **UI**: hand-rolled buttons/collapsibles replaced with shadcn primitives;
  dead `SidebarBar`/`HorizontalStrip` and `useScrollSpy` removed; newsletter
  editor lazy-loaded (`7bb7fff`, `b781cff`, `232e1b6`, `e108728`)
- **Perf**: memoized `IconToolbar`/`PreviewToolbar`, per-card status
  re-renders, scoped Switch transition, smoother theme transition
  (`90f1058`, `424ec26`, `5618183`, `e93ddf9`)

### CI / Build
- Windows installers: portable `.exe` restored, real MSI/NSIS artifacts staged
  and uploaded from `tauri-action` (`80d4d35`, `f84fae8`, `e906144`,
  `25efc51`, `e4d0d0f`)

## [1.4.0] - 2026-06-19

Reliability, security, and test-coverage hardening pass driven by a codebase
audit. No breaking changes to existing templates or saved data.

### Added
- **Out-of-zone drop hint**: dropping a file outside a valid drop zone now shows a one-time hint toast instead of doing nothing
- **PDF restore warning**: if an attached PDF can't be restored from storage on load, a warning toast now surfaces it instead of the attachment silently disappearing
- **Export options dialog**: choose whether to include bulk recipients and embedded PDF data when exporting a promotion configuration
- **Global auto-save status**: auto-save failures are now surfaced globally with a persistent warning toast (and a recovery toast when they clear)

### Fixed
- **Drag-and-drop safety**: dropping a file outside a drop zone no longer navigates the browser away from the app (which previously discarded in-progress work)
- **Start Over**: now also clears bulk email recipients, so a reset is a clean slate
- **PDF preview**: fixed the desktop PDF preview failing to render by allowing `blob:` sources in the webview Content-Security-Policy

### Security
- **CSS injection hardening**: rich-text highlight colors (`data-color`) are now validated against a strict color pattern before being inlined into generated email styles, with a safe fallback — closing a CSS-injection vector
- **Desktop file-read scoping**: the Tauri `read_file_as_data_url` command now canonicalizes and scopes the requested path, preventing out-of-scope reads
- **IPC hardening**: Tauri commands drop `unwrap()` panics and scope file access; a Content-Security-Policy is enforced in the webview
- **Sanitizer fails closed**: unknown URL schemes are now rejected and invalid image hrefs dropped, rather than passed through

### Changed
- **Dependencies**: bumped all `@tiptap/*` rich-text packages to 3.27.1 (latest 3.x) in lockstep and refreshed the lockfile — dependency tree deduped (492 → 450 packages) and `npm audit` vulnerabilities reduced to zero
- **Dev/CI**: standardized the dev server on port 5173 so Playwright and the app agree; the end-to-end suite now runs in CI on every push
- **Performance**: PDF blobs are persisted once at attach time rather than re-serialized on every auto-save

### Tested
- Added unit coverage for file saving (Tauri + browser branches), the PDF drag-and-drop handler (direct files, `file://` URIs incl. Windows paths, de-dupe, error paths), and the IndexedDB persistence layer's error/resilience branches and round-trip integrity
- Repaired and re-enabled the end-to-end QA verification suite
- Full unit suite at 1007 passing; newsletter editor (incl. tables and email-HTML generation) smoke-tested in-app against TipTap 3.27.1 with zero console errors

### Technical
- Split the `PromotionPage` monolith and extracted `NewsletterToolbar` / `NewsletterStylePanel`; collapsed duplicated CRUD families into a typed factory
- Scoped `@types/node` to tests so app code stays browser-only; fixed the typecheck gate and hardened lint/deps in CI

## [1.3.0] - 2025-11-02

### Added
- **Enhanced Email Templates**: 10 professional email templates now support editable subject lines and EML download
- **Subject Line Editing**: Real-time subject line editing with character count and validation for enhanced templates
- **EML/EMLTPL Export**: Generate Outlook-compatible email files with quoted-printable encoding and CRLF line endings
- **Dual Email Options**: Choose between simple mailto links or advanced EML file downloads for enhanced templates
- **Cross-Platform Compatibility**: EML files work seamlessly in Outlook, Mac Mail, Gmail, and other email clients

### Enhanced
- **Template System**: 10 email templates upgraded with professional features while maintaining backward compatibility
- **User Experience**: Consistent interface across all enhanced email templates with improved button layout
- **Email Client Integration**: Smart detection and support for both simple and advanced email workflows

### Technical
- **RFC Compliance**: EML files follow RFC 5322 and RFC 2045 standards for email formatting
- **Line Ending Normalization**: Proper CRLF handling to prevent display issues in email clients
- **Quoted-Printable Encoding**: Automatic encoding of special characters for email compatibility
- **Performance**: All enhancements add minimal overhead (< 1ms average operation time)

### Tested
- **Comprehensive Testing**: 40 test scenarios passed with 100% success rate
- **Backward Compatibility**: Existing text templates continue to work without changes
- **Cross-Platform**: Verified functionality across Windows, Mac, and web-based email clients

## [1.2.0] - 2025-11-01

### Added
- **PDF Preview Modal**: New modal interface for previewing attached PDF files with iframe display
- **Enhanced Bulk Email Features**: Improved bulk email distribution with better restoration and persistence
- **Template Management**: Added automatic blank entry creation after clearing promotion templates
- **Default Content Restoration**: How to Shop and Important Notes sections now restore default items when cleared

### Fixed
- **PDF Preview Persistence**: Fixed PDF preview failing after page refresh by improving IndexedDB integration
- **Template Clearing**: Clear button now properly removes all data and resets UI state
- **Bulk Email Restoration**: Fixed issues with bulk email recipient list restoration from localStorage
- **Form Field Values**: Restored proper form field value loading when templates are selected
- **Data Persistence**: Improved PDF and template data persistence across sessions

### Improved
- **Subject Line Management**: Updated subject line labels and improved user interface
- **Template State Management**: Better handling of template state during clearing and restoration
- **User Experience**: Enhanced template management workflow with better visual feedback
- **Code Cleanup**: Removed unused files and references from project

### Security
- **Input Sanitization**: Maintained comprehensive XSS protection across all new features
- **Data Validation**: Enhanced validation for PDF uploads and bulk email processing

## [1.1.0] - 2025-10-22

### Changed
- **Code Architecture**: Split monolithic HTML file into separate HTML, CSS, and JavaScript files
- **Performance**: Implemented DOM element caching to reduce repeated querySelector calls
- **Error Handling**: Added try-catch blocks throughout application for better error handling
- **Security**: Added HTML sanitization functions to prevent XSS vulnerabilities
- **Validation**: Enhanced tracking number validation to support UPS, FedEx, and USPS formats

### Removed
- Dead code: `saveFieldHistory()`, `fieldHistory` object, `validateAllFields()` function
- Unused `autoFillData` object with hardcoded values

### Improved
- Better error messages with user-friendly toast notifications
- Cleaner separation of concerns (HTML structure, CSS styling, JS logic)
- More maintainable and testable codebase
- Enhanced accessibility with ARIA labels
- Constants extracted for magic numbers (TOAST_DURATION_MS, STORE_PHONE, STORE_NAME)

### Fixed
- Tracking number validation now accepts FedEx and USPS formats (not just UPS)
- Improved error handling prevents application crashes
- XSS vulnerability patched with proper sanitization

## [1.0.0] - 2025-10-21

### Added
- Initial release of Talaria
- 15 communication templates across 4 categories
- Real-time form validation
- Clear buttons (×) for all input fields
- Radio button interface for Yes/No fields
- Calculated fields (sale price calculator)
- Search functionality for templates
- Phone number auto-formatting
- UPS tracking number validation

### Features by Category
- **Customer Email**: 7 templates
- **Phone Orders**: 4 templates  
- **Text Messages**: 3 templates
- **Inter-store**: 1 template

### Removed
- Auto-populate from localStorage
- Autocomplete dropdown suggestions
- Credit card number fields (security improvement)
- Payment type fields from most templates

### Security
- Credit card verification retained only for Phone Under $500 template (verification only, no card details stored)

### Design
- Professional minimalist interface
- Proper capitalization: "South Premium Outlets"
- Radio buttons for Yes/No fields positioned in left column
- Sticky output panel for easy reference
