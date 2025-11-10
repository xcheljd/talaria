# Refactoring Migration Report

Generated: 2025-11-04T06:24:33.131Z
Mode: LIVE (files modified)

## Summary

### templates.js
- Total functions: 13
- Successful: 13
- Failed: 0
- Content size: 33203 bytes

### eml.js
- Total functions: 15
- Successful: 15
- Failed: 0
- Content size: 45012 bytes

### ui.js
- Total functions: 39
- Successful: 39
- Failed: 0
- Content size: 62289 bytes

## Detailed Results

### templates.js

#### ✓ Successfully Extracted

- `const templateHelp` (lines 387-404)
- `const fieldConfig` (lines 407-438)
- `function sanitizeHTML` (lines 441-445)
- `function escapeAttr` (lines 448-450)
- `function sanitizeTemplateData` (lines 453-463)
- `function getFieldSuggestions` (lines 465-468)
- `function formatPhoneNumber` (lines 470-475)
- `function validateTracking` (lines 477-486)
- `function escapeHtml` (lines 1714-1718)
- `function convertTextToHTML` (lines 317-384)
- `const templates` (lines 488-828)
- `function generatePromotionEmailHTML` (lines 3379-3543)
- `function generatePromoTitle` (lines 1812-1853)

### eml.js

#### ✓ Successfully Extracted

- `function encodeSubject` (lines 4382-4394)
- `function utf8ToBase64` (lines 4396-4423)
- `function encodeQuotedPrintable` (lines 4425-4476)
- `function encodeFilename` (lines 4478-4490)
- `function createEMLFile` (lines 4243-4380)
- `function createGenericEMLFile` (lines 4592-4738)
- `function createBCCBatchEML` (lines 5019-5177)
- `function openInEmailClient` (lines 4157-4195)
- `function openPromotionEmailInClient` (lines 4198-4241)
- `function openEmailClientUniversal` (lines 4492-4590)
- `function downloadEmailFile` (lines 4740-4797)
- `function openInEmailClient` (lines 4799-4851)
- `function generateBulkEmailFiles` (lines 4853-5017)
- `function updateBulkAnalysis` (lines 5179-5258)
- `function validateBatchSize` (lines 5260-5290)

### ui.js

#### ✓ Successfully Extracted

- `function renderPromotionEntries` (lines 2081-2176)
- `function renderSpecialHours` (lines 2196-2241)
- `function renderHowToShopSection` (lines 2257-2287)
- `function renderHowToShopItems` (lines 2290-2340)
- `function renderImportantNotesSection` (lines 2343-2373)
- `function renderImportantNotesItems` (lines 2376-2426)
- `function renderSubjectLines` (lines 3545-3686)
- `function renderEditableSubjectLine` (lines 3688-3767)
- `function renderAttachedPDFs` (lines 3769-3811)
- `function showTabbedOutput` (lines 1180-1408)
- `function showRegularOutput` (lines 1411-1578)
- `function updateEmailPreview` (lines 1584-1634)
- `function wrapHtmlForEmailPreview` (lines 1641-1707)
- `function updateSubjectInPreview` (lines 1724-1749)
- `function updateLivePreview` (lines 1767-1801)
- `function addPromotionEntry` (lines 1856-1868)
- `function removePromotionEntry` (lines 1871-1875)
- `function movePromotionEntryUp` (lines 1878-1885)
- `function movePromotionEntryDown` (lines 1888-1895)
- `function updateEntryData` (lines 2179-2193)
- `function addSpecialHour` (lines 1898-1907)
- `function removeSpecialHour` (lines 1910-1914)
- `function moveSpecialHourUp` (lines 1917-1924)
- `function moveSpecialHourDown` (lines 1927-1934)
- `function updateSpecialHourData` (lines 2244-2254)
- `function addHowToShopItem` (lines 1937-1942)
- `function removeHowToShopItem` (lines 1944-1948)
- `function moveHowToShopItemUp` (lines 1950-1957)
- `function moveHowToShopItemDown` (lines 1959-1966)
- `function addImportantNotesItem` (lines 1969-1974)
- `function removeImportantNotesItem` (lines 1976-1980)
- `function moveImportantNotesItemUp` (lines 1982-1989)
- `function moveImportantNotesItemDown` (lines 1991-1998)
- `function toggleHowToShop` (lines 2001-2004)
- `function toggleImportantNotes` (lines 2006-2009)
- `function toggleEntryCollapse` (lines 2011-2014)
- `function setupDragAndDrop` (lines 2017-2078)
- `function debounce` (lines 1754-1764)
- `function isHTMLContent` (lines 1171-1177)

## Next Steps

1. Review the generated module files
2. Update index.html to load the new modules in order
3. Update app.js to remove extracted code
4. Test the application thoroughly
5. Fix any remaining dependencies or errors
