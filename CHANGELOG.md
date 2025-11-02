# Changelog

All notable changes to the Communication Template Generator will be documented in this file.

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
- Initial release of Communication Template Generator
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
