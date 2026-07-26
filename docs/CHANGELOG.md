# Changelog

All notable changes to the Talaria will be documented in this file.

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
