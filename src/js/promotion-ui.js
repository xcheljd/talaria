/**
 * Promotion Email UI Module
 * Handles all UI rendering and interaction logic for the promotion email template
 */

// Import state management
import { promotionState } from './promotion-state.js';

// Import shared utilities
import {
  db,
  savePDFToIndexedDB,
  getPDFFromIndexedDB,
  deletePDFFromIndexedDB,
  saveBulkEmailRecipientsToIndexedDB,
  clearBulkEmailRecipientsFromIndexedDB,
} from './shared/db.js';
import {
  escapeHtml,
  plainTextToPreviewHTML,
  wrapHtmlForEmailPreview,
} from './shared/emailPreviewUtils.js';
import {
  buildSavedPromotionConfig,
  buildExportedPromotionConfig,
  validateAndNormalizeImportedConfig,
} from './promotionConfig.js';
import {
  chevronIcon,
  dragHandleIcon,
  closeIcon,
  emailIcon,
  uploadIcon,
  pdfIcon,
  boldIcon,
  italicIcon,
  underlineIcon,
} from './shared/icons.js';
import {
  moveItemInArray,
  setupDragAndDrop,
  setupClearButtons,
} from './promotionUiUtils.js';

// Import from templates.js for helper functions
import { getStorePhone, getStoreName, escapeAttr } from './templates.js';
// Import from profile.js for email function
import { getStoreEmail } from './shared/profile.js';

// Import appState for user profile access
import { appState } from './state.js';

// ===== HELPER FUNCTIONS =====

// Detect user's operating system
export function detectOS() {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac')) return 'mac';
  return 'other';
}

// Get recommended email file format based on OS
export function getRecommendedFormat() {
  const os = detectOS();
  return os === 'mac' ? 'emltpl' : 'eml';
}

// Update format status display in bulk email tools
export function updateFormatStatus() {
  const statusDiv = document.getElementById('formatStatusText');
  if (!statusDiv) return;

  const os = detectOS();
  const format = getRecommendedFormat();
  const formatName = format === 'emltpl' ? 'Template' : 'EML';
  const fileExtension = format === 'emltpl' ? '.emltpl' : '.eml';

  let osName = 'Unknown';
  if (os === 'windows') osName = 'Windows';
  else if (os === 'mac') osName = 'macOS';
  else osName = 'Other Platform';

  statusDiv.innerHTML = `<strong>${formatName} Format:</strong> Optimized for ${osName} (${fileExtension} files)`;
}

// Debounce utility for live preview
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Show toast notification
export function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('Toast element not found');
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Write empty state placeholder to preview iframe
export function writeEmptyStateToIframe(iframe) {
  if (!iframe) return;

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  if (!iframeDoc) return;

  const computedStyle = getComputedStyle(document.documentElement);
  const bgColor =
    computedStyle.getPropertyValue('--bg-tertiary').trim() || '#f8f3ef';
  const textColor =
    computedStyle.getPropertyValue('--text-primary').trim() || '#2a2420';
  const textSecondary =
    computedStyle.getPropertyValue('--text-secondary').trim() || '#666';

  iframeDoc.open();
  iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: 'Aptos', Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    margin: 0;
                    background: ${bgColor};
                    color: ${textSecondary};
                    text-align: center;
                    padding: 2rem;
                }
                .empty-state {
                    max-width: 400px;
                }
                .empty-state svg {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 1rem;
                    opacity: 0.3;
                }
                .empty-state h3 {
                    font-size: 1.2rem;
                    margin: 0 0 0.5rem 0;
                    color: ${textColor};
                }
                .empty-state p {
                    font-size: 0.9rem;
                    margin: 0;
                    color: ${textSecondary};
                }
            </style>
        </head>
        <body>
            <div class="empty-state">
                ${emailIcon({ size: 80 })}
                <h3>No Preview Yet</h3>
                <p>Begin filling in the promotion details to start seeing a preview</p>
            </div>
        </body>
        </html>
    `);
  iframeDoc.close();
}

// Current PDF preview state
let currentPreviewPDF = null;
let currentBlobUrl = null;

// ===== LIVE PREVIEW FUNCTIONS =====
// Get CSS that simulates email client dark mode color inversion
function getEmailDarkModeCSS() {
  return `
    /* Simulate email client dark mode - invert light backgrounds and text */
    body {
      background-color: #1a1a1a !important;
      color: #e0e0e0 !important;
    }
    table {
      background-color: #1a1a1a !important;
    }
    /* Invert light gray backgrounds */
    [style*="background-color: #f5f5f5"],
    [style*="background-color:#f5f5f5"] {
      background-color: #2d2d2d !important;
    }
    [style*="background-color: #f4f4f4"],
    [style*="background-color:#f4f4f4"] {
      background-color: #2a2a2a !important;
    }
    [style*="background-color: white"],
    [style*="background-color:#ffffff"],
    [style*="background-color: #ffffff"] {
      background-color: #1a1a1a !important;
    }
    /* Invert dark text to light */
    [style*="color: #333333"],
    [style*="color:#333333"],
    [style*="color: #333"] {
      color: #e0e0e0 !important;
    }
    /* Invert light borders */
    [style*="border: 1px solid #ddd"] {
      border-color: #444444 !important;
    }
    [style*="border-bottom: 2px solid gray"] {
      border-bottom-color: #555555 !important;
    }
    /* Keep dark footer as-is (already dark) */
    [style*="background-color: #2c3e50"] {
      background-color: #2c3e50 !important;
    }
    /* Ensure white text in footer stays white */
    [style*="color: white"] {
      color: white !important;
    }
    /* Keep gold accent color */
    [style*="color: #ffd700"] {
      color: #ffd700 !important;
    }
  `;
}

// Update live preview
export function updateLivePreview() {
  const previewIframe = document.getElementById('previewIframe');
  if (!previewIframe) return;

  const dateRangeInput = document.getElementById('promoDateRange');

  // If no date range, regenerate the empty state with current theme colors
  if (!dateRangeInput || !dateRangeInput.value.trim()) {
    writeEmptyStateToIframe(previewIframe);
    return;
  }

  const yearInput = document.getElementById('promoYear');
  const titleInput = document.getElementById('promoTitle');

  const data = {
    promoDateRange: dateRangeInput.value,
    promoYear: yearInput ? yearInput.value : '',
    promoTitle: titleInput ? titleInput.value : '',
  };

  const htmlCode = generatePromotionEmailHTML(data);

  // Update code textarea
  const codeArea = document.getElementById('codeArea');
  if (codeArea) {
    codeArea.value = htmlCode;
  }

  // Check if app is in dark mode - if so, simulate email client dark mode
  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  let previewHtml = htmlCode;

  if (currentTheme === 'dark') {
    // Inject dark mode simulation CSS into the email HTML
    previewHtml = htmlCode.replace(
      '</head>',
      `<style id="dark-mode-sim">${getEmailDarkModeCSS()}</style></head>`
    );
  }

  // Write email content to iframe
  const iframeDoc =
    previewIframe.contentDocument || previewIframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(previewHtml);
  iframeDoc.close();

  // Generate subject lines when content is available
  // Only generate if we don't already have subject lines or if entries have changed
  if (promotionState.generatedSubjectLines.length === 0) {
    generateSubjectLines();
  }
}

// Create debounced version for typing
const debouncedLivePreview = debounce(updateLivePreview, 500);

// ===== SAVE/EXPORT/IMPORT FUNCTIONS =====

// Save promotion template configuration to localStorage
export async function savePromotionTemplate() {
  // Collapse all entries before saving
  promotionState.promotionEntries.forEach((entry) => {
    promotionState.entryCollapsedStates[entry.id] = true;
  });
  renderPromotionEntries(); // Update the UI to show collapsed state

  // Ensure all PDFs with data are saved to IndexedDB
  if (promotionState.attachedPDFs.length > 0 && db) {
    for (const pdf of promotionState.attachedPDFs) {
      if (pdf.data) {
        try {
          await savePDFToIndexedDB(pdf);
          console.log(
            `Re-saved PDF ${pdf.name} to IndexedDB during template save`
          );
        } catch (error) {
          console.warn(`Failed to save PDF ${pdf.name} to IndexedDB:`, error);
        }
      }
    }
  }

  // Capture the raw bulk recipient list text from the UI (if present)
  const bulkEmailListElement = document.getElementById('bulkEmailList');
  const bulkEmailRecipients = bulkEmailListElement
    ? bulkEmailListElement.value
    : '';

  const config = buildSavedPromotionConfig({
    promoDateRange: document.getElementById('promoDateRange')?.value || '',
    promoYear: document.getElementById('promoYear')?.value || '',
    promoTitle: document.getElementById('promoTitle')?.value || '',
    bulkEmailRecipients,
    promotionEntries: promotionState.promotionEntries,
    specialHours: promotionState.specialHours,
    howToShopItems: promotionState.howToShopItems,
    importantNotesItems: promotionState.importantNotesItems,
    attachedPDFs: promotionState.attachedPDFs,
    generatedSubjectLines: promotionState.generatedSubjectLines,
    selectedSubjectLine: promotionState.selectedSubjectLine,
  });

  // Persist recipients to IndexedDB for reuse in bulk tools
  try {
    if (bulkEmailRecipients && db) {
      await saveBulkEmailRecipientsToIndexedDB(bulkEmailRecipients);
    }
  } catch (error) {
    console.warn(
      'Failed to save bulk email recipients to IndexedDB during template save:',
      error
    );
  }

  localStorage.setItem('savedPromotionTemplate', JSON.stringify(config));
  showToast('✓ Template saved successfully');
}

// Import promotion template - supports both localStorage and file selection
export function importPromotionTemplate() {
  // Create file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';

  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);

        // Additional validation for file imports
        if (!config || typeof config !== 'object') {
          showToast(
            '✗ Invalid template file - not a valid configuration object'
          );
          return;
        }

        // Check if this looks like a promotion template (backwards compatible)
        if (config.templateType && config.templateType !== 'promotion-email') {
          showToast('✗ Invalid template file - not a promotion email template');
          return;
        }
        if (!('promotionEntries' in config) || !('specialHours' in config)) {
          showToast(
            '✗ Invalid template file - missing required promotion template fields'
          );
          return;
        }

        applyImportedConfig(config, true); // true = collapse entries on import
        showToast('✓ Template imported from file successfully');
      } catch (error) {
        console.error('Import error:', error);
        showToast(
          '✗ Error reading template file - Invalid JSON or corrupted file'
        );
      }
    };

    reader.onerror = () => {
      showToast('✗ Error reading file');
    };

    reader.readAsText(file);
  });

  // Trigger file selection
  document.body.appendChild(fileInput);
  fileInput.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(fileInput);
  }, 1000);
}

// Helper function to apply imported configuration
export async function applyImportedConfig(rawConfig, collapseEntries = true) {
  const validation = validateAndNormalizeImportedConfig(rawConfig);
  if (!validation.ok) {
    switch (validation.reason) {
      case 'notObject':
        showToast('✗ Invalid template data - not an object');
        break;
      case 'wrongType':
        showToast('✗ Invalid template data - wrong template type');
        break;
      case 'promotionEntriesNotArray':
        showToast(
          '✗ Invalid template data - promotionEntries must be an array'
        );
        break;
      case 'specialHoursNotArray':
        showToast('✗ Invalid template data - specialHours must be an array');
        break;
      case 'howToShopItemsNotArray':
        showToast('✗ Invalid template data - howToShopItems must be an array');
        break;
      case 'importantNotesItemsNotArray':
        showToast(
          '✗ Invalid template data - importantNotesItems must be an array'
        );
        break;
      default:
        showToast('✗ Invalid template data');
    }
    return;
  }

  const config = validation.config;

  // Restore form fields (with delay to ensure DOM is ready)
  setTimeout(() => {
    const dateRangeInput = document.getElementById('promoDateRange');
    const yearInput = document.getElementById('promoYear');
    const titleInput = document.getElementById('promoTitle');
    const bulkEmailList = document.getElementById('bulkEmailList');

    if (dateRangeInput) {
      dateRangeInput.value = config.dateRange || '';
      // Show clear button if field has content
      const clearBtn = document.querySelector('[data-clear="promoDateRange"]');
      if (clearBtn && dateRangeInput.value.trim()) {
        clearBtn.classList.add('visible');
      }
    }
    if (yearInput) {
      yearInput.value = config.year || '';
      // Show clear button if field has content
      const clearBtn = document.querySelector('[data-clear="promoYear"]');
      if (clearBtn && yearInput.value.trim()) {
        clearBtn.classList.add('visible');
      }
    }
    if (titleInput) {
      titleInput.value = config.title || '';
      // Show clear button if field has content
      const clearBtn = document.querySelector('[data-clear="promoTitle"]');
      if (clearBtn && titleInput.value.trim()) {
        clearBtn.classList.add('visible');
      }
    }

    // Restore bulk email recipient list if present in the configuration
    if (bulkEmailList && config.bulkEmailRecipients != null) {
      if (Array.isArray(config.bulkEmailRecipients)) {
        bulkEmailList.value = config.bulkEmailRecipients.join(', ');
      } else if (typeof config.bulkEmailRecipients === 'string') {
        bulkEmailList.value = config.bulkEmailRecipients;
      }

      if (bulkEmailList.value) {
        // Trigger existing input handler to refresh analysis stats
        bulkEmailList.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // Update preview after form fields are restored
    updateLivePreview();
  }, 100);

  // Restore arrays
  promotionState.promotionEntries = JSON.parse(
    JSON.stringify(config.promotionEntries || [])
  );
  promotionState.specialHours = JSON.parse(
    JSON.stringify(config.specialHours || [])
  );
  // Restore howToShopItems and importantNotesItems from config if present
  // (These may be excluded from exported configs for privacy/store-specific reasons)
  if (config.howToShopItems && config.howToShopItems.length > 0) {
    promotionState.howToShopItems = JSON.parse(
      JSON.stringify(config.howToShopItems)
    );
  }
  if (config.importantNotesItems && config.importantNotesItems.length > 0) {
    promotionState.importantNotesItems = JSON.parse(
      JSON.stringify(config.importantNotesItems)
    );
  }

  // Initialize any missing fields with current store's profile data
  initializeDefaultItems();

  // Ensure profile directions / location notes are reflected in Important Notes
  ensureStoreDirectionsImportantNote();
  promotionState.generatedSubjectLines = JSON.parse(
    JSON.stringify(config.generatedSubjectLines || [])
  );
  promotionState.selectedSubjectLine = config.selectedSubjectLine || null;

  // Restore PDFs: merge metadata from config with data from IndexedDB
  // Clear existing PDFs to prevent duplicates
  const existingPdfIds = new Set(promotionState.attachedPDFs.map((p) => p.id));
  promotionState.attachedPDFs = [];
  const pdfMetadata = config.attachedPDFs || [];

  // Wait for IndexedDB to be initialized before trying to restore PDFs
  if (pdfMetadata.length > 0) {
    let retries = 0;
    while (!db && retries < 20) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      retries++;
    }

    if (!db) {
      console.warn(
        'IndexedDB not initialized after waiting, PDFs may not have data'
      );
    }
  }

  for (const metadata of pdfMetadata) {
    // Skip if we already processed this PDF (prevent duplicates)
    if (existingPdfIds.has(metadata.id)) {
      continue;
    }

    // Check if config already has PDF data
    if (metadata.data) {
      promotionState.attachedPDFs.push(metadata);
      // Also save to IndexedDB for future use
      try {
        await savePDFToIndexedDB(metadata);
      } catch (error) {
        console.warn(
          `Failed to save PDF ${metadata.name} to IndexedDB:`,
          error
        );
      }
    } else {
      // No data in config, try IndexedDB
      try {
        const fullPdfData = await getPDFFromIndexedDB(metadata.id);
        if (fullPdfData && fullPdfData.data) {
          // Use full data from IndexedDB
          promotionState.attachedPDFs.push(fullPdfData);
        } else {
          // No data available, skip this PDF
          console.warn(
            `PDF ${metadata.name} (ID: ${metadata.id}) data not found in IndexedDB or config, skipping.`
          );
        }
      } catch (error) {
        console.warn(
          `Failed to restore PDF ${metadata.name} from IndexedDB:`,
          error
        );
      }
    }
  }

  // Clean up any existing metadata-only PDFs in attachedPDFs
  promotionState.attachedPDFs = promotionState.attachedPDFs.filter(
    (pdf) => pdf.data
  );

  // Set collapse state for all entries
  if (collapseEntries) {
    // When importing, collapse all entries by default
    promotionState.entryCollapsedStates = {};
    promotionState.promotionEntries.forEach((entry) => {
      promotionState.entryCollapsedStates[entry.id] = true;
    });
  }

  // Re-render all sections
  renderPromotionEntries();
  renderSpecialHours();
  renderHowToShopSection();
  renderImportantNotesSection();
  renderAttachedPDFs();
  renderSubjectLines();

  // Update live preview and capture state
  updateLivePreview();
}

// Export promotion template configuration as JSON file
export function exportPromotionTemplate() {
  // Capture the raw bulk recipient list text from the UI (if present)
  const bulkEmailListElement = document.getElementById('bulkEmailList');
  const bulkEmailRecipients = bulkEmailListElement
    ? bulkEmailListElement.value
    : '';

  const config = buildExportedPromotionConfig({
    promoDateRange: document.getElementById('promoDateRange')?.value || '',
    promoYear: document.getElementById('promoYear')?.value || '',
    promoTitle: document.getElementById('promoTitle')?.value || '',
    bulkEmailRecipients,
    promotionEntries: promotionState.promotionEntries,
    specialHours: promotionState.specialHours,
    howToShopItems: promotionState.howToShopItems,
    importantNotesItems: promotionState.importantNotesItems,
    attachedPDFs: promotionState.attachedPDFs,
    generatedSubjectLines: promotionState.generatedSubjectLines,
    selectedSubjectLine: promotionState.selectedSubjectLine,
  });

  const dataStr = JSON.stringify(config, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `promotion-template-${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showToast('✓ Template exported successfully');
}

// ===== AUTO-GENERATION FUNCTIONS =====

// Auto-generate title based on date range
export function generatePromoTitle(dateRange) {
  if (!dateRange) return 'WEEKLY SALE';

  // Parse date range
  const dateStr = dateRange.toLowerCase();

  // Black Friday detection (typically last Friday of November)
  if (
    dateStr.includes('nov') &&
    (dateStr.includes('24') ||
      dateStr.includes('25') ||
      dateStr.includes('26') ||
      dateStr.includes('27') ||
      dateStr.includes('28') ||
      dateStr.includes('29'))
  ) {
    return 'BLACK FRIDAY OUTLET EVENT';
  }

  // Cyber Monday (Monday after Black Friday)
  if (dateStr.includes('nov') && dateStr.includes('30')) {
    return 'CYBER MONDAY SALE';
  }
  if (
    dateStr.includes('dec') &&
    dateStr.includes('1') &&
    !dateStr.includes('10')
  ) {
    return 'CYBER MONDAY SALE';
  }

  // Holiday season (December)
  if (dateStr.includes('dec')) {
    return 'HOLIDAY SALE EVENT';
  }

  // Summer clearance (June-August)
  if (
    dateStr.includes('jun') ||
    dateStr.includes('jul') ||
    dateStr.includes('aug')
  ) {
    return 'SUMMER CLEARANCE';
  }

  // Back to school (late August - early September)
  if (
    (dateStr.includes('aug') &&
      (dateStr.includes('20') ||
        dateStr.includes('2') ||
        dateStr.includes('3'))) ||
    (dateStr.includes('sep') &&
      (dateStr.includes('1') ||
        dateStr.includes('2') ||
        dateStr.includes('3') ||
        dateStr.includes('4') ||
        dateStr.includes('5') ||
        dateStr.includes('6') ||
        dateStr.includes('7') ||
        dateStr.includes('8') ||
        dateStr.includes('9')))
  ) {
    return 'BACK TO SCHOOL SALE';
  }

  // Default
  return 'WEEKLY SALE';
}

// ===== PROMOTION ENTRY MANAGEMENT =====

// Add a new promotion entry
export function addPromotionEntry() {
  const entryId = Date.now();
  promotionState.promotionEntries.push({
    id: entryId,
    line: '',
    collections: '',
    callout: '',
  });
  renderPromotionEntries();
}

// Remove a promotion entry
export function removePromotionEntry(entryId) {
  promotionState.promotionEntries = promotionState.promotionEntries.filter(
    (entry) => entry.id !== entryId
  );
  renderPromotionEntries();
}

// Move promotion entry up
export function movePromotionEntryUp(entryId) {
  if (moveItemInArray(promotionState.promotionEntries, entryId, 'up')) {
    renderPromotionEntries();
  }
}

// Move promotion entry down
export function movePromotionEntryDown(entryId) {
  if (moveItemInArray(promotionState.promotionEntries, entryId, 'down')) {
    renderPromotionEntries();
  }
}

// Toggle entry collapse (DOM-only, no preview update)
export function toggleEntryCollapse(entryId) {
  const isCollapsed = !promotionState.entryCollapsedStates[entryId];
  promotionState.entryCollapsedStates[entryId] = isCollapsed;

  // Update DOM directly without full re-render
  const entryRow = document.querySelector(
    `.promotion-entry[data-entry-id="${entryId}"]`
  );
  if (entryRow) {
    const fields = entryRow.querySelector('.entry-fields');
    const collapseBtn = entryRow.querySelector('.collapse-btn');
    const headerLeft = entryRow.querySelector('.entry-header-left');

    if (fields) fields.style.display = isCollapsed ? 'none' : 'grid';
    if (collapseBtn) {
      collapseBtn.textContent = isCollapsed ? 'Expand' : 'Collapse';
      collapseBtn.title = isCollapsed ? 'Expand' : 'Collapse';
    }

    // Toggle collapsed class on entry
    entryRow.classList.toggle('collapsed', isCollapsed);

    // Handle summary - need to add/remove it
    let summary = headerLeft?.querySelector('.entry-summary');
    if (isCollapsed) {
      if (!summary && headerLeft) {
        // Get summary text from entry data
        const entry = promotionState.promotionEntries.find(
          (e) => e.id === entryId
        );
        const summaryText = entry?.line?.trim() || 'Entry not filled out';
        summary = document.createElement('span');
        summary.className = 'entry-summary';
        summary.textContent = summaryText;
        headerLeft.appendChild(summary);
      }
    } else {
      if (summary) summary.remove();
    }
  }
}

// Update entry data from inputs
export function updateEntryData(e) {
  const entryId = parseInt(e.target.dataset.entryId);
  const entry = promotionState.promotionEntries.find((t) => t.id === entryId);
  if (!entry) return;

  if (e.target.classList.contains('entry-line')) {
    entry.line = e.target.value;
  } else if (e.target.classList.contains('entry-collections')) {
    entry.collections = e.target.value;
  } else if (e.target.classList.contains('entry-callout')) {
    entry.callout = e.target.value;
  }
}

// Render all promotion entries
export function renderPromotionEntries() {
  const container = document.getElementById('promotionEntriesContainer');
  if (!container) return;

  container.innerHTML = promotionState.promotionEntries
    .map((entry, index) => {
      const safeId = escapeAttr(String(entry.id));
      const isFirst = index === 0;
      const isLast = index === promotionState.promotionEntries.length - 1;
      const isCollapsed =
        promotionState.entryCollapsedStates[entry.id] || false;

      // Build summary text for collapsed state
      let summaryText = '';
      if (entry.line && entry.line.trim()) {
        summaryText = entry.line.trim();
      } else {
        summaryText = 'Entry not filled out';
      }

      return `
            <div class="promotion-entry ${isCollapsed ? 'collapsed' : ''}" data-entry-id="${safeId}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${dragHandleIcon({ size: 16 })}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up" data-entry-id="${entry.id}" title="Move up" ${isFirst ? 'disabled' : ''}>${chevronIcon('up', { size: 10 })}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down" data-entry-id="${entry.id}" title="Move down" ${isLast ? 'disabled' : ''}>${chevronIcon('down', { size: 10 })}</button>
                        <span class="entry-number">Entry ${index + 1}</span>
                        ${isCollapsed ? `<span class="entry-summary">${escapeHtml(summaryText)}</span>` : ''}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn btn-base btn-secondary-base btn-xs" data-action="toggle-collapse" data-entry-id="${entry.id}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                            ${isCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                        <button type="button" class="entry-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove" data-entry-id="${entry.id}" title="Remove" aria-label="Remove entry">
                            ${closeIcon({ size: 16 })}
                        </button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${isCollapsed ? 'none' : 'grid'};">
                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${safeId}-line">Promotion Line *</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-line" id="entry-${safeId}-line" name="entry-${safeId}-line" data-entry-id="${safeId}" value="${escapeAttr(entry.line || '')}" placeholder="CITIZEN – ADDITIONAL 20% OFF">
                            <button class="clear-input" data-clear="entry-${safeId}-line" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${safeId}-collections">Collections (comma-separated)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-collections" id="entry-${safeId}-collections" name="entry-${safeId}-collections" data-entry-id="${safeId}" value="${escapeAttr(entry.collections)}" placeholder="Corso, Avion, Marine Star">
                            <button class="clear-input" data-clear="entry-${safeId}-collections" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group full-width">
                        <label class="form-label" for="entry-${safeId}-callout">Special Callout (optional)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-callout" id="entry-${safeId}-callout" name="entry-${safeId}-callout" data-entry-id="${safeId}" value="${escapeAttr(entry.callout)}" placeholder="Final sale items excluded">
                            <button class="clear-input" data-clear="entry-${safeId}-callout" title="Clear">×</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    })
    .join('');

  // Attach event listeners to update entry data and live preview
  container
    .querySelectorAll('.entry-line, .entry-collections, .entry-callout')
    .forEach((input) => {
      input.addEventListener('input', (e) => {
        updateEntryData(e);
        debouncedLivePreview();
      });
      input.addEventListener('change', (e) => {
        updateEntryData(e);
        updateLivePreview();
      });
    });

  // Add drag-and-drop functionality for reordering entries
  setupDragAndDrop(
    container,
    promotionState.promotionEntries,
    renderPromotionEntries,
    '.promotion-entry'
  );

  // Attach event listeners for promotion entry buttons
  container.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      const entryId = parseInt(e.currentTarget.dataset.entryId);

      switch (action) {
        case 'move-up':
          movePromotionEntryUp(entryId);
          break;
        case 'move-down':
          movePromotionEntryDown(entryId);
          break;
        case 'toggle-collapse':
          toggleEntryCollapse(entryId);
          break;
        case 'remove':
          removePromotionEntry(entryId);
          break;
      }
    });
  });

  // Attach event listeners for clear buttons in promotion entries
  setupClearButtons(container);

  // Update preview after rendering entries
  updateLivePreview();
}

// ===== SPECIAL HOURS MANAGEMENT =====

// Add a new special hour row
export function addSpecialHour() {
  const hourId = Date.now();
  promotionState.specialHours.push({
    id: hourId,
    day: '',
    hours: '',
  });
  renderSpecialHours();
}

// Remove a special hour row
export function removeSpecialHour(hourId) {
  promotionState.specialHours = promotionState.specialHours.filter(
    (hour) => hour.id !== hourId
  );
  renderSpecialHours();
}

// Move special hour up
export function moveSpecialHourUp(hourId) {
  if (moveItemInArray(promotionState.specialHours, hourId, 'up')) {
    renderSpecialHours();
  }
}

// Move special hour down
export function moveSpecialHourDown(hourId) {
  if (moveItemInArray(promotionState.specialHours, hourId, 'down')) {
    renderSpecialHours();
  }
}

// Update special hour data from inputs
export function updateSpecialHourData(e) {
  const hourId = parseInt(e.target.dataset.hourId);
  const hour = promotionState.specialHours.find((h) => h.id === hourId);
  if (!hour) return;

  if (e.target.classList.contains('hour-day')) {
    hour.day = e.target.value;
  } else if (e.target.classList.contains('hour-hours')) {
    hour.hours = e.target.value;
  }
}

// Render all special hours
export function renderSpecialHours() {
  const container = document.getElementById('specialHoursListContainer');
  if (!container) return;

  container.innerHTML = promotionState.specialHours
    .map((hour, index) => {
      const safeId = escapeAttr(String(hour.id));
      const isFirst = index === 0;
      const isLast = index === promotionState.specialHours.length - 1;

      return `
            <div class="special-hour-row" data-hour-id="${safeId}">
                <div class="special-hour-fields">
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-day" id="hour-${safeId}-day" name="hour-${safeId}-day" data-hour-id="${safeId}" value="${escapeAttr(hour.day)}" placeholder="e.g., Friday Nov 29">
                            <button class="clear-input" data-clear="hour-${safeId}-day" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input hour-hours" id="hour-${safeId}-hours" name="hour-${safeId}-hours" data-hour-id="${safeId}" value="${escapeAttr(hour.hours)}" placeholder="e.g., 6AM–10PM or CLOSED">
                            <button class="clear-input" data-clear="hour-${safeId}-hours" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="hour-controls">
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-hour-up" data-hour-id="${hour.id}" title="Move up" ${isFirst ? 'disabled' : ''}>${chevronIcon('up', { size: 10 })}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-hour-down" data-hour-id="${hour.id}" title="Move down" ${isLast ? 'disabled' : ''}>${chevronIcon('down', { size: 10 })}</button>
                        <button type="button" class="hour-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-hour" data-hour-id="${hour.id}" title="Remove" aria-label="Remove special hour">
                            ${closeIcon({ size: 16 })}
                        </button>
                    </div>
                </div>
            </div>
        `;
    })
    .join('');

  // Attach event listeners to update hour data and live preview
  container.querySelectorAll('.hour-day, .hour-hours').forEach((input) => {
    input.addEventListener('input', (e) => {
      updateSpecialHourData(e);
      debouncedLivePreview();
      debouncedCaptureState(); // Capture after user stops typing
    });
  });

  // Attach event listeners for special hour buttons
  container
    .querySelectorAll('[data-action^="move-hour"], [data-action="remove-hour"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        const hourId = parseInt(e.currentTarget.dataset.hourId);

        switch (action) {
          case 'move-hour-up':
            moveSpecialHourUp(hourId);
            break;
          case 'move-hour-down':
            moveSpecialHourDown(hourId);
            break;
          case 'remove-hour':
            removeSpecialHour(hourId);
            break;
        }
      });
    });

  // Attach event listeners for clear buttons in special hours
  setupClearButtons(container);

  // Update preview after rendering hours
  updateLivePreview();

  // Show/hide reminder based on special hours
  const reminder = document.getElementById('specialHoursReminder');
  if (reminder) {
    reminder.style.display =
      promotionState.specialHours.length > 0 ? 'block' : 'none';
  }
}

// ===== HOW TO SHOP SECTION =====

// Add a new How to Shop item
export function addHowToShopItem() {
  const itemId = Date.now();
  promotionState.howToShopItems.push({
    id: itemId,
    text: '',
    bold: false,
    italic: false,
    underline: false,
  });
  renderHowToShopSection();
}

// Remove a How to Shop item
export function removeHowToShopItem(itemId) {
  promotionState.howToShopItems = promotionState.howToShopItems.filter(
    (item) => item.id !== itemId
  );
  renderHowToShopSection();
}

// Move How to Shop item up
export function moveHowToShopItemUp(itemId) {
  if (moveItemInArray(promotionState.howToShopItems, itemId, 'up')) {
    renderHowToShopSection();
  }
}

// Move How to Shop item down
export function moveHowToShopItemDown(itemId) {
  if (moveItemInArray(promotionState.howToShopItems, itemId, 'down')) {
    renderHowToShopSection();
  }
}

// Toggle bold formatting on How to Shop item
export function toggleHowToShopItemBold(itemId) {
  const item = promotionState.howToShopItems.find((i) => i.id === itemId);
  if (item) {
    item.bold = !item.bold;
    renderHowToShopSection();
    updateLivePreview();
  }
}

// Toggle italic formatting on How to Shop item
export function toggleHowToShopItemItalic(itemId) {
  const item = promotionState.howToShopItems.find((i) => i.id === itemId);
  if (item) {
    item.italic = !item.italic;
    renderHowToShopSection();
    updateLivePreview();
  }
}

// Toggle underline formatting on How to Shop item
export function toggleHowToShopItemUnderline(itemId) {
  const item = promotionState.howToShopItems.find((i) => i.id === itemId);
  if (item) {
    item.underline = !item.underline;
    renderHowToShopSection();
    updateLivePreview();
  }
}

// Render How to Shop items (called when expanded)
function renderHowToShopItems() {
  const container = document.getElementById('howToShopItemsContainer');
  if (!container) return;

  container.innerHTML = promotionState.howToShopItems
    .map((item, index) => {
      const safeId = escapeAttr(String(item.id));
      const isFirst = index === 0;
      const isLast = index === promotionState.howToShopItems.length - 1;

      return `
            <div class="editable-item-row" data-item-id="${safeId}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${dragHandleIcon({ size: 16 })}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up-how-to-shop" data-item-id="${item.id}" title="Move up" ${isFirst ? 'disabled' : ''}>${chevronIcon('up', { size: 10 })}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down-how-to-shop" data-item-id="${item.id}" title="Move down" ${isLast ? 'disabled' : ''}>${chevronIcon('down', { size: 10 })}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-bold-how-to-shop" data-item-id="${item.id}" title="Bold" ${item.bold ? 'data-active="true"' : ''}>${boldIcon({ size: 14 })}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-italic-how-to-shop" data-item-id="${item.id}" title="Italic" ${item.italic ? 'data-active="true"' : ''}>${italicIcon({ size: 14 })}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-underline-how-to-shop" data-item-id="${item.id}" title="Underline" ${item.underline ? 'data-active="true"' : ''}>${underlineIcon({ size: 14 })}</button>
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-how-to-shop-item" data-item-id="${item.id}" title="Remove" aria-label="Remove shopping item">
                            ${closeIcon({ size: 16 })}
                        </button>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 0.5rem;">
                    <div class="input-wrapper">
                        <input type="text" class="form-input shop-item-text" id="shop-item-${safeId}-text" name="shop-item-${safeId}-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                        <button class="clear-input" data-clear="shop-item-${safeId}-text" title="Clear">×</button>
                    </div>
                </div>
            </div>
        `;
    })
    .join('');

  // Attach event listeners
  container.querySelectorAll('.shop-item-text').forEach((input) => {
    input.addEventListener('input', (e) => {
      const itemId = parseInt(e.target.dataset.itemId);
      const item = promotionState.howToShopItems.find((i) => i.id === itemId);
      if (item) {
        item.text = e.target.value;
        debouncedLivePreview();
      }
    });
  });

  // Add drag-and-drop functionality
  setupDragAndDrop(
    container,
    promotionState.howToShopItems,
    renderHowToShopSection
  );

  // Attach event listeners for add and remove buttons
  const addButton = document.querySelector(
    '[data-action="add-how-to-shop-item"]'
  );
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.stopPropagation();
      addHowToShopItem();
    });
  }

  container
    .querySelectorAll('[data-action="remove-how-to-shop-item"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        removeHowToShopItem(itemId);
      });
    });

  // Attach event listeners for move buttons
  container
    .querySelectorAll('[data-action="move-up-how-to-shop"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        moveHowToShopItemUp(itemId);
      });
    });

  container
    .querySelectorAll('[data-action="move-down-how-to-shop"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        moveHowToShopItemDown(itemId);
      });
    });

  // Attach event listeners for format buttons
  container
    .querySelectorAll('[data-action="toggle-bold-how-to-shop"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        toggleHowToShopItemBold(itemId);
      });
    });

  container
    .querySelectorAll('[data-action="toggle-italic-how-to-shop"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        toggleHowToShopItemItalic(itemId);
      });
    });

  container
    .querySelectorAll('[data-action="toggle-underline-how-to-shop"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        toggleHowToShopItemUnderline(itemId);
      });
    });

  // Attach event listeners for clear buttons in How to Shop items
  setupClearButtons(container);
}

// Render How to Shop section (wrapper with expand/collapse)
export function renderHowToShopSection() {
  const wrapper = document.getElementById('howToShopWrapper');
  if (!wrapper) return;

  // Always show expanded content (card-level collapse handles hiding)
  wrapper.innerHTML = `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" class="btn btn-base btn-primary-base" data-action="add-how-to-shop-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
    </div>
    <div id="howToShopItemsContainer"></div>
  `;

  // Render the items
  renderHowToShopItems();

  // Update preview after rendering
  updateLivePreview();
}

// ===== IMPORTANT NOTES SECTION =====

// Add a new Important Notes item
export function addImportantNotesItem() {
  const itemId = Date.now();
  promotionState.importantNotesItems.push({
    id: itemId,
    text: '',
    bold: false,
    italic: false,
    underline: false,
  });
  renderImportantNotesSection();
}

// Remove an Important Notes item
export function removeImportantNotesItem(itemId) {
  promotionState.importantNotesItems =
    promotionState.importantNotesItems.filter((item) => item.id !== itemId);
  renderImportantNotesSection();
}

// Move Important Notes item up
export function moveImportantNotesItemUp(itemId) {
  if (moveItemInArray(promotionState.importantNotesItems, itemId, 'up')) {
    renderImportantNotesSection();
  }
}

// Move Important Notes item down
export function moveImportantNotesItemDown(itemId) {
  if (moveItemInArray(promotionState.importantNotesItems, itemId, 'down')) {
    renderImportantNotesSection();
  }
}

// Toggle bold formatting on Important Notes item
export function toggleImportantNotesItemBold(itemId) {
  const item = promotionState.importantNotesItems.find((i) => i.id === itemId);
  if (item) {
    item.bold = !item.bold;
    renderImportantNotesSection();
    updateLivePreview();
  }
}

// Toggle italic formatting on Important Notes item
export function toggleImportantNotesItemItalic(itemId) {
  const item = promotionState.importantNotesItems.find((i) => i.id === itemId);
  if (item) {
    item.italic = !item.italic;
    renderImportantNotesSection();
    updateLivePreview();
  }
}

// Toggle underline formatting on Important Notes item
export function toggleImportantNotesItemUnderline(itemId) {
  const item = promotionState.importantNotesItems.find((i) => i.id === itemId);
  if (item) {
    item.underline = !item.underline;
    renderImportantNotesSection();
    updateLivePreview();
  }
}

// Render Important Notes items (called when expanded)
function renderImportantNotesItems() {
  const container = document.getElementById('importantNotesItemsContainer');
  if (!container) return;

  container.innerHTML = promotionState.importantNotesItems
    .map((item, index) => {
      const safeId = escapeAttr(String(item.id));
      const isFirst = index === 0;
      const isLast = index === promotionState.importantNotesItems.length - 1;

      return `
            <div class="editable-item-row" data-item-id="${safeId}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${dragHandleIcon({ size: 16 })}
                        </div>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-up-important-notes" data-item-id="${item.id}" title="Move up" ${isFirst ? 'disabled' : ''}>${chevronIcon('up', { size: 10 })}</button>
                        <button type="button" class="order-btn btn-base btn-secondary-base btn-xs" data-action="move-down-important-notes" data-item-id="${item.id}" title="Move down" ${isLast ? 'disabled' : ''}>${chevronIcon('down', { size: 10 })}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-bold-important-notes" data-item-id="${item.id}" title="Bold" ${item.bold ? 'data-active="true"' : ''}>${boldIcon({ size: 14 })}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-italic-important-notes" data-item-id="${item.id}" title="Italic" ${item.italic ? 'data-active="true"' : ''}>${italicIcon({ size: 14 })}</button>
                        <button type="button" class="format-btn btn-base btn-secondary-base btn-xs" data-action="toggle-underline-important-notes" data-item-id="${item.id}" title="Underline" ${item.underline ? 'data-active="true"' : ''}>${underlineIcon({ size: 14 })}</button>
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="item-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-important-notes-item" data-item-id="${item.id}" title="Remove" aria-label="Remove important note">
                            ${closeIcon({ size: 16 })}
                        </button>
                    </div>
                </div>
                <div class="form-group" style="margin-top: 0.5rem;">
                    <div class="input-wrapper">
                        <input type="text" class="form-input important-notes-item-text" id="important-notes-item-${safeId}-text" name="important-notes-item-${safeId}-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., Important safety information or key details">
                        <button class="clear-input" data-clear="important-notes-item-${safeId}-text" title="Clear">×</button>
                    </div>
                </div>
            </div>
        `;
    })
    .join('');

  // Attach event listeners
  container.querySelectorAll('.important-notes-item-text').forEach((input) => {
    input.addEventListener('input', (e) => {
      const itemId = parseInt(e.target.dataset.itemId);
      const item = promotionState.importantNotesItems.find(
        (i) => i.id === itemId
      );
      if (item) {
        item.text = e.target.value;
        debouncedLivePreview();
      }
    });
  });

  // Add drag-and-drop functionality
  setupDragAndDrop(
    container,
    promotionState.importantNotesItems,
    renderImportantNotesSection
  );

  // Attach event listeners for add and remove buttons
  const addButton = document.querySelector(
    '[data-action="add-important-notes-item"]'
  );
  if (addButton) {
    addButton.addEventListener('click', (e) => {
      e.stopPropagation();
      addImportantNotesItem();
    });
  }

  container
    .querySelectorAll('[data-action="remove-important-notes-item"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        removeImportantNotesItem(itemId);
      });
    });

  // Attach event listeners for move buttons
  container
    .querySelectorAll('[data-action="move-up-important-notes"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        moveImportantNotesItemUp(itemId);
      });
    });

  container
    .querySelectorAll('[data-action="move-down-important-notes"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        moveImportantNotesItemDown(itemId);
      });
    });

  // Attach event listeners for format buttons
  container
    .querySelectorAll('[data-action="toggle-bold-important-notes"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        toggleImportantNotesItemBold(itemId);
      });
    });

  container
    .querySelectorAll('[data-action="toggle-italic-important-notes"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        toggleImportantNotesItemItalic(itemId);
      });
    });

  container
    .querySelectorAll('[data-action="toggle-underline-important-notes"]')
    .forEach((button) => {
      button.addEventListener('click', (e) => {
        const itemId = parseInt(e.currentTarget.dataset.itemId);
        toggleImportantNotesItemUnderline(itemId);
      });
    });

  // Attach event listeners for clear buttons in Important Notes items
  setupClearButtons(container);
}

// Render Important Notes section (wrapper with expand/collapse)
export function renderImportantNotesSection() {
  const wrapper = document.getElementById('importantNotesWrapper');
  if (!wrapper) return;

  // Always show expanded content (card-level collapse handles hiding)
  wrapper.innerHTML = `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button type="button" class="btn btn-base btn-primary-base" data-action="add-important-notes-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
    </div>
    <div id="importantNotesItemsContainer"></div>
  `;

  // Render the items
  renderImportantNotesItems();

  // Update preview after rendering
  updateLivePreview();
}

// Ensure profile store directions / location notes are represented in Important Notes
function ensureStoreDirectionsImportantNote() {
  if (!appState.userProfile || !appState.userProfile.storeDirections) {
    return;
  }

  const directions = appState.userProfile.storeDirections.trim();
  if (!directions) {
    return;
  }

  const directionsLower = directions.toLowerCase();

  const hasDirectionsNote = promotionState.importantNotesItems.some((item) => {
    if (!item || !item.text) return false;
    const text = item.text.toLowerCase();
    return (
      text.includes(directionsLower) ||
      text.includes('find us at') ||
      text.includes('directions')
    );
  });

  if (!hasDirectionsNote) {
    promotionState.importantNotesItems.push({
      id: Date.now() + 14,
      text: `Find us at ${directions}`,
      bold: false,
      italic: false,
      underline: false,
    });
  }
}

// Update the email in how to shop items to match current profile
export function updateHowToShopEmail() {
  const currentEmail = getStoreEmail();
  promotionState.howToShopItems.forEach((item) => {
    if (item.text && item.text.startsWith('Email ')) {
      item.text = `Email ${currentEmail}`;
    }
  });
  renderHowToShopSection();
}

// Initialize default How to Shop and Important Notes items
export function initializeDefaultItems() {
  if (promotionState.howToShopItems.length === 0) {
    const storePhone = getStorePhone();
    const storeEmail = getStoreEmail();

    promotionState.howToShopItems = [
      {
        id: Date.now() + 1,
        text: 'Visit us in-store for outlet-exclusive deals',
        bold: false,
        italic: false,
        underline: false,
      },
      {
        id: Date.now() + 2,
        text: `Call ${storePhone} for availability`,
        bold: false,
        italic: false,
        underline: false,
      },
      {
        id: Date.now() + 3,
        text: '$20 flat-rate ground shipping in US',
        bold: false,
        italic: false,
        underline: false,
      },
      {
        id: Date.now() + 4,
        text: `Email ${storeEmail}`,
        bold: false,
        italic: false,
        underline: false,
      },
    ];
  }

  if (promotionState.importantNotesItems.length === 0) {
    promotionState.importantNotesItems = [
      {
        id: Date.now() + 10,
        text: '*Select models only',
        bold: false,
        italic: false,
        underline: false,
      },
      {
        id: Date.now() + 11,
        text: 'See attached PDF for complete model details',
        bold: false,
        italic: false,
        underline: false,
      },
      {
        id: Date.now() + 12,
        text: 'Limited availability - while supplies last',
        bold: false,
        italic: false,
        underline: false,
      },
      {
        id: Date.now() + 13,
        text: 'Email response time up to 48 hours',
        bold: false,
        italic: false,
        underline: false,
      },
    ];

    // Add store directions / location notes if available
    ensureStoreDirectionsImportantNote();
  }
}

// ===== PDF ATTACHMENT FUNCTIONS =====

// Process PDF files - validate and add to attachedPDFs array
export function handlePDFFiles(files) {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  let hasErrors = false;

  for (const file of files) {
    // Validate file type
    if (file.type !== 'application/pdf') {
      showToast(`✗ ${file.name} is not a PDF file`);
      hasErrors = true;
      continue;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      showToast(`✗ ${file.name} is too large (${sizeMB}MB). Max size is 10MB.`);
      hasErrors = true;
      continue;
    }

    // Check for duplicate names
    if (promotionState.attachedPDFs.some((pdf) => pdf.name === file.name)) {
      showToast(`⚠ ${file.name} is already attached`);
      continue;
    }

    // Read file as base64 for storage
    const reader = new FileReader();
    reader.onload = async (e) => {
      const pdfData = {
        id: Date.now() + Math.random(), // Unique ID
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result, // base64 data URL
      };

      // Wait for IndexedDB to be initialized before saving
      let retries = 0;
      while (!db && retries < 20) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        retries++;
      }

      // Save PDF data to IndexedDB
      try {
        if (db) {
          await savePDFToIndexedDB(pdfData);
          console.log(
            `PDF ${file.name} saved to IndexedDB with ID:`,
            pdfData.id
          );
        } else {
          console.warn(
            'IndexedDB not initialized, PDF will not persist after refresh'
          );
          showToast(`⚠ PDF saved to memory but may not persist after refresh`);
        }
      } catch (error) {
        console.warn('Failed to save PDF to IndexedDB:', error);
        showToast(`⚠ PDF saved to memory but may not persist after refresh`);
      }

      // Add to in-memory array with full data (needed for email generation)
      // Data is also stored in IndexedDB for persistence across page refresh
      promotionState.attachedPDFs.push(pdfData);

      renderAttachedPDFs();

      if (!hasErrors && files.length === 1) {
        showToast(`✓ ${file.name} attached successfully`);
      }
    };

    reader.onerror = () => {
      showToast(`✗ Error reading ${file.name}`);
    };

    reader.readAsDataURL(file);
  }

  if (!hasErrors && files.length > 1) {
    showToast(`✓ ${files.length} PDFs attached successfully`);
  }
}

// Render attached PDFs list
export function renderAttachedPDFs() {
  const container = document.getElementById('attachedPDFsList');
  if (!container) return;

  if (promotionState.attachedPDFs.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = promotionState.attachedPDFs
    .map((pdf) => {
      const sizeKB = (pdf.size / 1024).toFixed(1);
      const sizeMB = (pdf.size / (1024 * 1024)).toFixed(2);
      const displaySize =
        pdf.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      const hasData = !!pdf.data;

      // If PDF has no data, show warning and disable preview
      const clickableClass = hasData
        ? 'pdf-name-clickable'
        : 'pdf-name-disabled';
      const titleText = hasData
        ? `Click to preview ${pdf.name}`
        : `${pdf.name} - Preview unavailable (data not loaded)`;
      const warningIcon = !hasData
        ? '<span style="color: #ff9800; margin-left: 0.5rem;" title="Preview unavailable">⚠</span>'
        : '';

      return `
            <div class="attached-pdf-item" data-pdf-id="${pdf.id}">
                <div class="pdf-icon">
                    ${pdfIcon()}
                </div>
                <div class="pdf-info">
                    <div class="pdf-name ${clickableClass}"
                         title="${titleText}"
                         ${hasData ? 'data-action="preview-pdf" data-pdf-id="' + pdf.id + '" role="button" tabindex="0"' : ''}>
                        ${pdf.name}${warningIcon}
                    </div>
                    <div class="pdf-size">${displaySize}</div>
                </div>
                <button class="pdf-remove-btn btn-base btn-icon-base btn-icon-danger" data-action="remove-pdf" data-pdf-id="${pdf.id}" title="Remove PDF" aria-label="Remove PDF attachment">
                    ${closeIcon({ size: 16 })}
                </button>
            </div>
        `;
    })
    .join('');

  // Attach event listeners for PDF preview
  container
    .querySelectorAll('[data-action="preview-pdf"]')
    .forEach((element) => {
      element.addEventListener('click', (e) => {
        const pdfId = parseFloat(e.currentTarget.dataset.pdfId);
        previewPDF(pdfId);
      });
      element.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const pdfId = parseFloat(e.currentTarget.dataset.pdfId);
          previewPDF(pdfId);
        }
      });
    });

  // Attach event listeners for PDF removal
  container.querySelectorAll('[data-action="remove-pdf"]').forEach((button) => {
    button.addEventListener('click', (e) => {
      const pdfId = parseFloat(e.currentTarget.dataset.pdfId);
      removePDF(pdfId);
    });
  });
}

// Remove PDF from attachedPDFs array and IndexedDB
export async function removePDF(pdfId) {
  const pdf = promotionState.attachedPDFs.find((p) => p.id === pdfId);
  if (!pdf) return;

  // Delete from IndexedDB
  try {
    await deletePDFFromIndexedDB(pdfId);
  } catch (error) {
    console.warn('Failed to delete PDF from IndexedDB:', error);
  }

  promotionState.attachedPDFs = promotionState.attachedPDFs.filter(
    (p) => p.id !== pdfId
  );
  renderAttachedPDFs();
  showToast(`✓ ${pdf.name} removed`);
}

// Preview PDF in modal
export function previewPDF(pdfId) {
  const pdf = promotionState.attachedPDFs.find((p) => p.id === pdfId);
  if (!pdf || !pdf.data) {
    showToast('✗ PDF data not available for preview');
    return;
  }

  currentPreviewPDF = pdf;

  const modal = document.getElementById('pdfPreviewModal');
  const iframe = document.getElementById('pdfPreviewIframe');
  const title = document.getElementById('pdfPreviewTitle');
  const downloadBtn = document.getElementById('pdfDownloadBtn');

  if (!modal || !iframe || !title || !downloadBtn) {
    console.error('PDF preview modal elements not found');
    return;
  }

  // Convert base64 to blob URL
  try {
    const byteCharacters = atob(pdf.data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    // Revoke previous blob URL if it exists
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }

    currentBlobUrl = URL.createObjectURL(blob);

    iframe.src = currentBlobUrl;

    // Hide loading indicator after a short delay
    const loadingIndicator = document.getElementById('pdfLoadingIndicator');
    if (loadingIndicator) {
      setTimeout(() => {
        loadingIndicator.style.display = 'none';
      }, 500);
    }
  } catch (e) {
    console.error('Error creating blob URL for PDF:', e);
    showToast('✗ Could not display PDF preview');
    return;
  }

  title.textContent = pdf.name;
  modal.style.display = 'flex';

  // Add active class for CSS transitions
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);

  // Focus on the modal for accessibility
  modal.focus();
}

// Close PDF preview modal
export function closePDFPreview() {
  const modal = document.getElementById('pdfPreviewModal');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300); // Wait for CSS transition
  }
  const iframe = document.getElementById('pdfPreviewIframe');
  if (iframe) {
    iframe.src = 'about:blank'; // Clear iframe content
  }

  // Revoke blob URL to free up memory
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  currentPreviewPDF = null;
}

// Download PDF from preview modal
export function downloadPDFFromPreview() {
  if (!currentPreviewPDF) return;

  const link = document.createElement('a');
  link.href = currentPreviewPDF.data;
  link.download = currentPreviewPDF.name;
  link.click();
}

// ===== SUBJECT LINE FUNCTIONS =====

// Render subject lines
export function renderSubjectLines() {
  const container = document.getElementById('subjectLinesContainer');
  if (!container) return;

  if (promotionState.generatedSubjectLines.length === 0) {
    container.innerHTML =
      '<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';
    return;
  }

  // Preserve user's current edit if the input exists
  const existingInput = document.getElementById('selectedSubjectInput');
  const currentUserEdit = existingInput ? existingInput.value : null;

  // Use the user's edit if it exists, otherwise use selectedSubjectLine
  const displayValue =
    currentUserEdit !== null
      ? currentUserEdit
      : promotionState.selectedSubjectLine || '';

  // Create dropdown with generated subject lines
  const dropdownOptions = promotionState.generatedSubjectLines
    .map((subject, index) => {
      const isSelected = subject === promotionState.selectedSubjectLine;
      return `<option value="${index}" ${isSelected ? 'selected' : ''}>${escapeHtml(subject)}</option>`;
    })
    .join('');

  container.innerHTML = `
        <div class="subject-line-dropdown-wrapper">
            <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
            <div class="select-wrapper">
                <select id="subjectLineDropdown" class="subject-line-dropdown">
                    <option value="" disabled ${!promotionState.selectedSubjectLine ? 'selected' : ''}>Select a subject line...</option>
                    ${dropdownOptions}
                </select>
            </div>
        </div>
        <div id="selectedSubjectCard" class="selected-subject-card" style="display: ${displayValue ? 'block' : 'none'};">
            <label class="subject-card-label" for="selectedSubjectInput">Selected Subject Line (customizable):</label>
            <div class="subject-card-input-wrapper">
                <input
                    type="text"
                    id="selectedSubjectInput"
                    class="subject-card-input"
                    value="${escapeAttr(displayValue)}"
                    placeholder="Your subject line..."
                    title="Edit the email subject line. Changes will be reflected in both Send Email and Download Email File options."
                >
                <div class="subject-card-meta">
                    <span class="char-count ${displayValue && displayValue.length <= 50 ? 'optimal' : 'warning'}" id="subjectCharCount">
                        ${displayValue ? displayValue.length : 0} chars ${displayValue && displayValue.length <= 50 ? '✓' : displayValue && displayValue.length > 50 ? '(>50)' : ''}
                    </span>
                </div>
            </div>
        </div>
    `;

  // Add event listener to dropdown
  const dropdown = document.getElementById('subjectLineDropdown');
  if (dropdown) {
    dropdown.addEventListener('change', (e) => {
      const index = parseInt(e.target.value);
      if (index >= 0 && index < promotionState.generatedSubjectLines.length) {
        selectSubjectLine(index);
      }
    });
  }

  // Add event listener to input field
  const input = document.getElementById('selectedSubjectInput');
  if (input) {
    input.addEventListener('input', (e) => {
      promotionState.selectedSubjectLine = e.target.value;

      // Update character count
      const charCount = document.getElementById('subjectCharCount');
      if (charCount) {
        const length = e.target.value.length;
        const isOptimal = length <= 50;
        charCount.className = `char-count ${isOptimal ? 'optimal' : 'warning'}`;
        charCount.textContent = `${length} chars ${isOptimal ? '✓' : '(>50)'}`;
      }

      // Reset dropdown to placeholder when user manually edits
      const dropdown = document.getElementById('subjectLineDropdown');
      if (dropdown) {
        dropdown.value = '';
      }
    });
  }
}

// Generate subject lines based on promotion entries
export function generateSubjectLines() {
  const dateRange = document.getElementById('promoDateRange')?.value || '';

  // Extract brands from promotion lines
  const brandKeywords = ['Citizen', 'Bulova', 'Alpina', 'Frederique Constant'];
  const brands = [
    ...new Set(
      promotionState.promotionEntries
        .map((e) => e.line || '')
        .flatMap((line) =>
          brandKeywords.filter((brand) =>
            line.toLowerCase().includes(brand.toLowerCase())
          )
        )
        .filter(Boolean)
    ),
  ];

  // Extract max discount percentage
  const discountPattern = /(\d+)[\s%]*%/;
  const maxDiscount = Math.max(
    0,
    ...promotionState.promotionEntries.map((e) => {
      const match = (e.line || '').match(discountPattern);
      return match ? parseInt(match[1], 10) || 0 : 0;
    })
  );

  // Extract collections from entries, tracking which brand they belong to
  const collections = [];
  const collectionsByBrand = {}; // Map brand to its collections
  promotionState.promotionEntries.forEach((e) => {
    if (e.collections) {
      // Find which brand this entry belongs to
      const entryBrand = brandKeywords.find((brand) =>
        (e.line || '').toLowerCase().includes(brand.toLowerCase())
      );

      e.collections.split(',').forEach((c) => {
        const trimmed = c.trim();
        if (trimmed && !collections.includes(trimmed)) {
          collections.push(trimmed);
          // Track collection by brand
          if (entryBrand) {
            if (!collectionsByBrand[entryBrand]) {
              collectionsByBrand[entryBrand] = [];
            }
            collectionsByBrand[entryBrand].push(trimmed);
          }
        }
      });
    }
  });
  const topCollections = collections.slice(0, 3);

  // Check callouts for scarcity/urgency signals
  const callouts = promotionState.promotionEntries
    .filter((e) => e.callout && e.callout.trim())
    .map((e) => e.callout.toLowerCase());
  const hasLimitedStock = callouts.some(
    (c) => c.includes('limited') || c.includes('while supplies')
  );
  const hasFinalSale = callouts.some((c) => c.includes('final'));

  // Build discount phrase - always use "Up to" language
  const getDiscountPhrase = (discount) => {
    if (discount >= 50) return `Up to ${discount}% OFF`;
    if (discount >= 30) return `Up to ${discount}% OFF`;
    if (discount > 0) return `Up to ${discount}% OFF`;
    return 'Special Savings';
  };

  let subjects = [];

  // 1. Date/time focused subjects
  if (dateRange) {
    subjects.push(`Sale: ${dateRange}`);
    // Try to create urgency variant
    const lowerDate = dateRange.toLowerCase();
    if (
      lowerDate.includes('fri') ||
      lowerDate.includes('sat') ||
      lowerDate.includes('sun')
    ) {
      subjects.push(`This Weekend: ${getDiscountPhrase(maxDiscount)}`);
    }
  }

  // 2. Brand-focused subjects
  if (brands.length > 0 && maxDiscount > 0) {
    if (brands.length === 1) {
      subjects.push(`${brands[0]}: ${getDiscountPhrase(maxDiscount)}`);
    } else {
      subjects.push(
        `${brands[0]} & ${brands[1]}: ${getDiscountPhrase(maxDiscount)}`
      );
    }
  } else if (brands.length > 0) {
    subjects.push(`${brands[0]} Sale Event`);
  }

  // 3. Discount-focused subjects
  if (maxDiscount > 0) {
    subjects.push(`Up to ${maxDiscount}% OFF This Week`);
  }

  // 4. Brand + Collections subject (never announce collection alone)
  if (brands.length > 0 && topCollections.length > 0) {
    const collectionsStr = topCollections.slice(0, 3).join(', ');
    subjects.push(`${brands[0]} including ${collectionsStr}`);
  }

  // 4b. Two brands with collections - one collection from each brand
  if (
    brands.length >= 2 &&
    collectionsByBrand[brands[0]]?.length > 0 &&
    collectionsByBrand[brands[1]]?.length > 0
  ) {
    const collection1 = collectionsByBrand[brands[0]][0];
    const collection2 = collectionsByBrand[brands[1]][0];
    subjects.push(
      `${brands[0]} & ${brands[1]} including ${collection1}, ${collection2}`
    );
  }

  // 5. Scarcity/urgency subjects based on callouts
  if (hasLimitedStock) {
    subjects.push('Limited Stock – Shop Now');
  }
  if (hasFinalSale) {
    subjects.push('Final Sale: Extra Savings Inside');
  }

  // 6. Value proposition subjects
  if (maxDiscount >= 30) {
    subjects.push(`Perfect Watch Gifts – Up to ${maxDiscount}% OFF`);
  }

  // 7. Scarcity & action subjects
  if (maxDiscount > 0) {
    subjects.push(`Don't Miss These Watch Deals`);
  }
  if (brands.length > 0) {
    subjects.push(`VIP Watch Sale: ${brands[0]} & More`);
  }

  // 8. Question/engagement style subjects
  subjects.push('Your New Watch Awaits');
  if (maxDiscount >= 20) {
    subjects.push('Ready for a New Watch?');
  }

  // 9. Generic fallback (only if we have few subjects)
  if (subjects.length < 3) {
    if (maxDiscount > 0) {
      subjects.push(`Up to ${maxDiscount}% OFF – This Week Only`);
    } else {
      subjects.push('New Deals This Week');
    }
  }

  // Filter out duplicates and overly long subjects (prefer < 50 chars)
  const uniqueSubjects = [...new Set(subjects)];
  const filteredSubjects = uniqueSubjects
    .filter((s) => s.length <= 60) // Remove extremely long ones
    .sort((a, b) => {
      // Prefer shorter subjects, but not too short
      const aScore = a.length >= 20 && a.length <= 45 ? 0 : 1;
      const bScore = b.length >= 20 && b.length <= 45 ? 0 : 1;
      return aScore - bScore;
    });

  promotionState.generatedSubjectLines =
    filteredSubjects.length > 0 ? filteredSubjects : uniqueSubjects;
  promotionState.selectedSubjectLine =
    promotionState.generatedSubjectLines[0] || null;
  renderSubjectLines();
}

// Select a subject line
export function selectSubjectLine(index) {
  if (index >= 0 && index < promotionState.generatedSubjectLines.length) {
    promotionState.selectedSubjectLine =
      promotionState.generatedSubjectLines[index];

    // Show the card
    const card = document.getElementById('selectedSubjectCard');
    if (card) {
      card.style.display = 'block';
    }

    // Update dropdown to show selected value
    const dropdown = document.getElementById('subjectLineDropdown');
    if (dropdown) {
      dropdown.value = index;
    }

    // Update input value
    const input = document.getElementById('selectedSubjectInput');
    if (input) {
      input.value = promotionState.selectedSubjectLine;
    }

    // Update character count
    const charCount = document.getElementById('subjectCharCount');
    if (charCount) {
      const length = promotionState.selectedSubjectLine.length;
      const isOptimal = length <= 50;
      charCount.className = `char-count ${isOptimal ? 'optimal' : 'warning'}`;
      charCount.textContent = `${length} chars ${isOptimal ? '✓' : '(>50)'}`;
    }
  }
}

// ===== EMAIL HTML GENERATION =====

// Helper function to apply formatting to item text
function formatItemText(item) {
  let text = escapeHtml(item.text);
  if (item.bold) text = `<strong>${text}</strong>`;
  if (item.italic) text = `<em>${text}</em>`;
  if (item.underline) text = `<u>${text}</u>`;
  return text;
}

// Generate the final HTML for the promotion email
export function generatePromotionEmailHTML(data) {
  const dateRange = data.promoDateRange || '';
  const title =
    data.promoTitle && data.promoTitle.trim()
      ? escapeHtml(data.promoTitle)
      : generatePromoTitle(dateRange);

  // Use override year if provided, otherwise use current year
  const year =
    data.promoYear && data.promoYear.trim()
      ? data.promoYear.trim()
      : new Date().getFullYear();

  // Get store info from profile
  const storePhone = getStorePhone();

  // Build promotion sections from entries
  let brandSections = '';
  promotionState.promotionEntries.forEach((entry) => {
    // Backwards compatibility: map old brand/discount fields into line if needed
    if (!entry.line && (entry.brand || entry.discount)) {
      const brand = entry.brand || '';
      const discountText = entry.discount
        ? `${entry.discount.toString().trim()}% OFF`
        : '';
      const pieces = [brand, discountText].filter((p) => p && p.trim());
      entry.line = pieces.join(' – ');
    }

    if (!entry.line || !entry.line.trim()) return; // Skip incomplete entries

    let collectionsHTML = '';
    if (entry.collections && entry.collections.trim()) {
      const collections = entry.collections
        .split(',')
        .map((c) => escapeHtml(c.trim()))
        .filter((c) => c);
      collectionsHTML = collections.map((c) => `*${c}`).join(' • ');
    }

    brandSections += `
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${escapeHtml(entry.line)}</b></p>`;

    if (collectionsHTML) {
      brandSections += `
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${entry.callout ? '5px' : '20px'};">
                    ${collectionsHTML}
                </p>`;
    }

    if (entry.callout && entry.callout.trim()) {
      brandSections += `
                <p style="font-size: 13px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: 20px; color: #0066cc; font-style: italic;">
                    ${escapeHtml(entry.callout)}
                </p>`;
    }
  });

  // Get store-specific details from user profile
  let storeAddress =
    '7400 Las Vegas Blvd. South, Suite 231<br>Las Vegas, NV 89123';
  let storeMapLink =
    'https://www.google.com/maps?q=36.05145495363422,-115.16933573536541';
  let storeEmail = getStoreEmail();
  let storeHours = 'Mon–Sat: 10AM–8PM | Sun: 10AM–7PM';

  // Override with user profile data if available
  if (appState.userProfile) {
    if (appState.userProfile.storeAddress) {
      storeAddress = appState.userProfile.storeAddress.replace(/\n/g, '<br>');
    }

    if (appState.userProfile.storeHours) {
      storeHours = appState.userProfile.storeHours;
    }

    // Generate map link
    if (
      appState.userProfile.storePlusCode &&
      appState.userProfile.storePlusCode.trim()
    ) {
      storeMapLink = `https://www.google.com/maps?q=${encodeURIComponent(appState.userProfile.storePlusCode)}`;
    } else if (
      appState.userProfile.storeAddress &&
      appState.userProfile.storeAddress.trim()
    ) {
      const addressForSearch = appState.userProfile.storeAddress
        .replace(/<br>/g, ' ')
        .replace(/\n/g, ' ');
      storeMapLink = `https://www.google.com/maps?q=${encodeURIComponent(addressForSearch)}`;
    }
  }

  // Build How to Shop section from array
  let howToShopHTML = promotionState.howToShopItems
    .filter((item) => item.text && item.text.trim())
    .map((item) => `• ${formatItemText(item)}`)
    .join('<br>\n                    ');

  // Build Important Notes section from array
  let importantNotesHTML = promotionState.importantNotesItems
    .filter((item) => item.text && item.text.trim())
    .map((item) => `• ${formatItemText(item)}`)
    .join('<br>\n                    ');

  return `<!DOCTYPE html>
<html>
<head>
    <title>Weekly Sale</title>
</head>
<body style="font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #333333; background-color: white; margin: 0; padding: 0;">

    <center>
    <table width="600" style="background-color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif;">

        <!-- HEADER -->
        <tr>
            <td style="padding: 20px; text-align: center; border-bottom: 2px solid gray;">
                <h1 style="font-size: 24px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">${title}</h1>
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 10px 0 0 0;">${dateRange}, ${year} • While Supplies Last</p>
            </td>
        </tr>

        <!-- MAIN CONTENT -->
        <tr>
            <td style="padding: 25px;">

                <!-- BRAND SECTIONS -->
${brandSections}

                <!-- HOW TO SHOP BOX -->
                <div style="background-color: #f5f5f5; color: #333333; padding: 15px; margin-bottom: 20px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>HOW TO SHOP</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${howToShopHTML}</p>
                </div>

                <!-- IMPORTANT NOTES BOX -->
                <div style="border: 1px solid #ddd; color: #333333; padding: 15px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>IMPORTANT NOTES</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${importantNotesHTML}</p>
                </div>

            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style="background-color: #2c3e50; padding: 20px; text-align: center;">
                <h3 style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 18px; margin: 0 0 10px 0;">CITIZEN COMPANY STORE</h3>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📍 <a href="${storeMapLink}" target="_blank" style="color: white;">
                    ${storeAddress}</a>
                </p>
                <p style="color: white; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; margin: 5px 0;">
                    📞 <a href="tel:+1${storePhone.replace(/\D/g, '')}" target="_blank" style="color: white;">${storePhone}</a> |
                    📧 <a href="mailto:${storeEmail}" target="_blank" style="color: white;">${storeEmail}</a>
                </p>
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>STORE HOURS</b><br>
                    ${storeHours}
                </p>${
                  promotionState.specialHours.length > 0
                    ? `
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>SPECIAL HOURS</b><br>
                    ${promotionState.specialHours
                      .map((hour) =>
                        hour.day && hour.hours
                          ? `${hour.day}: ${hour.hours}`
                          : ''
                      )
                      .filter((h) => h)
                      .join('<br>')}
                </p>`
                    : ''
                }
            </td>
        </tr>

        <!-- UNSUBSCRIBE -->
        <tr>
            <td style="background-color: #f4f4f4; padding: 15px; text-align: center;">
                <p style="font-size: 12px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; color: #333333; margin: 0;">
                    No longer interested? Simply reply to this email with <b>"UNSUBSCRIBE"</b>
                </p>
            </td>
        </tr>

    </table>
    </center>

</body>
</html>`;
}

// ===== PDF SECTION FOR CENTER COLUMN =====

// Initialize PDF section in the center column
function initPDFSection() {
  const pdfContainer = document.getElementById('pdfSectionContainer');
  if (!pdfContainer) return;

  pdfContainer.innerHTML = `
    <div class="field-help" style="margin-bottom: 0.75rem;">Upload PDF files to attach to your promotional email (max 10MB per file)</div>
    <div class="pdf-upload-section">
      <div class="pdf-upload-dropzone" id="pdfDropzone">
        <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" multiple style="display: none;">
        <div class="dropzone-content">
          ${uploadIcon({ size: 48 })}
          <p class="dropzone-text">Click to upload or drag and drop PDF files</p>
          <p class="dropzone-hint">Maximum 10MB per file</p>
        </div>
      </div>
      <div id="attachedPDFsList" class="attached-pdfs-list"></div>
    </div>
  `;

  // Wire up PDF dropzone
  const pdfDropzone = document.getElementById('pdfDropzone');
  const pdfFileInput = document.getElementById('pdfFileInput');

  if (pdfDropzone && pdfFileInput) {
    pdfDropzone.addEventListener('click', () => pdfFileInput.click());

    pdfFileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        handlePDFFiles(files);
      }
      pdfFileInput.value = '';
    });

    pdfDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pdfDropzone.classList.add('dragover');
    });

    pdfDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      pdfDropzone.classList.remove('dragover');
    });

    pdfDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      pdfDropzone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf'
      );
      if (files.length > 0) {
        handlePDFFiles(files);
      } else {
        showToast('Please drop only PDF files');
      }
    });
  }

  // Render any existing attached PDFs
  renderAttachedPDFs();
}

// ===== RESET TO DEFAULTS =====

// Reset everything to default state
export async function resetToDefaults() {
  if (
    !confirm(
      'This will reset everything to defaults and cannot be undone. Continue?'
    )
  ) {
    return;
  }

  // Clear form fields
  const dateRangeInput = document.getElementById('promoDateRange');
  const yearInput = document.getElementById('promoYear');
  const titleInput = document.getElementById('promoTitle');

  if (dateRangeInput) dateRangeInput.value = '';
  if (yearInput) yearInput.value = '';
  if (titleInput) titleInput.value = '';

  // Clear promotion entries - remove all, add one empty
  promotionState.promotionEntries = [
    {
      id: Date.now(),
      line: '',
      collections: '',
      callout: '',
    },
  ];

  // Clear special hours
  promotionState.specialHours = [];

  // Clear how to shop and important notes, then initialize defaults
  promotionState.howToShopItems = [];
  promotionState.importantNotesItems = [];
  initializeDefaultItems();

  // Clear attached PDFs from state and IndexedDB
  for (const pdf of promotionState.attachedPDFs) {
    try {
      await deletePDFFromIndexedDB(pdf.id);
    } catch (error) {
      console.warn('Failed to delete PDF from IndexedDB:', error);
    }
  }
  promotionState.attachedPDFs = [];

  // Clear subject lines
  promotionState.generatedSubjectLines = [];
  promotionState.selectedSubjectLine = null;

  // Clear bulk email recipients
  const bulkEmailList = document.getElementById('bulkEmailList');
  if (bulkEmailList) {
    bulkEmailList.value = '';
    // Trigger input event to update batch stats/analytics
    bulkEmailList.dispatchEvent(new Event('input', { bubbles: true }));
    try {
      await clearBulkEmailRecipientsFromIndexedDB();
    } catch (error) {
      console.warn('Failed to clear bulk recipients from IndexedDB:', error);
    }
  }

  // Clear localStorage saved template
  localStorage.removeItem('savedPromotionTemplate');

  // Re-render all sections
  renderPromotionEntries();
  renderSpecialHours();
  renderHowToShopSection();
  renderImportantNotesSection();
  renderAttachedPDFs();
  renderSubjectLines();

  // Clear preview
  const codeArea = document.getElementById('codeArea');
  const previewIframe = document.getElementById('previewIframe');
  if (codeArea) codeArea.value = '';
  if (previewIframe) {
    writeEmptyStateToIframe(previewIframe);
  }

  // Disable output buttons
  const outputActions = document.querySelector('.output-actions');
  if (outputActions) {
    outputActions.classList.remove('enabled');
  }

  showToast('Reset to defaults completed');
}

// ===== CARD-SPECIFIC RENDER FUNCTIONS =====

// Render Basic Details card (Date Range, Year, Title)
function renderBasicDetailsForm() {
  const container = document.getElementById('basicDetailsContainer');
  if (!container) {
    console.error('Basic details container not found');
    return;
  }

  container.innerHTML = `
    <div class="form-group">
        <label class="form-label" for="promoDateRange">Date Range *</label>
        <div class="input-wrapper">
            <input type="text" class="form-input" id="promoDateRange" placeholder="Nov 28 - Dec 1" required>
            <button class="clear-input" data-clear="promoDateRange" title="Clear">×</button>
        </div>
        <div class="field-help">Used for auto-title generation and display</div>
    </div>

    <div class="form-group">
        <label class="form-label" for="promoYear">Year (optional)</label>
        <div class="input-wrapper">
            <input type="text" class="form-input" id="promoYear" placeholder="Auto-uses current year">
            <button class="clear-input" data-clear="promoYear" title="Clear">×</button>
        </div>
        <div class="field-help">Override for cross-year sales (e.g., Dec 30 - Jan 3)</div>
    </div>

    <div class="form-group">
        <label class="form-label" for="promoTitle">Title (optional)</label>
        <div class="input-wrapper">
            <input type="text" class="form-input" id="promoTitle" placeholder="Leave blank for auto-generation">
            <button class="clear-input" data-clear="promoTitle" title="Clear">×</button>
        </div>
        <div class="field-help">Auto-generates based on date (Black Friday, Holiday Sale, etc.)</div>
    </div>
  `;

  // Wire up form field event listeners
  const dateRangeInput = document.getElementById('promoDateRange');
  const yearInput = document.getElementById('promoYear');
  const titleInput = document.getElementById('promoTitle');

  if (dateRangeInput) {
    dateRangeInput.addEventListener('input', () => {
      const clearBtn = document.querySelector('[data-clear="promoDateRange"]');
      if (clearBtn)
        clearBtn.classList.toggle(
          'visible',
          dateRangeInput.value.trim().length > 0
        );
      updateLivePreview();
    });
    const clearBtn = document.querySelector('[data-clear="promoDateRange"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        dateRangeInput.value = '';
        clearBtn.classList.remove('visible');
        dateRangeInput.focus();
        updateLivePreview();
      });
    }
  }

  if (yearInput) {
    yearInput.addEventListener('input', () => {
      const clearBtn = document.querySelector('[data-clear="promoYear"]');
      if (clearBtn)
        clearBtn.classList.toggle('visible', yearInput.value.trim().length > 0);
      updateLivePreview();
    });
    const clearBtn = document.querySelector('[data-clear="promoYear"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        yearInput.value = '';
        clearBtn.classList.remove('visible');
        yearInput.focus();
        updateLivePreview();
      });
    }
  }

  if (titleInput) {
    titleInput.addEventListener('input', () => {
      const clearBtn = document.querySelector('[data-clear="promoTitle"]');
      if (clearBtn)
        clearBtn.classList.toggle(
          'visible',
          titleInput.value.trim().length > 0
        );
      updateLivePreview();
    });
    const clearBtn = document.querySelector('[data-clear="promoTitle"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        titleInput.value = '';
        clearBtn.classList.remove('visible');
        titleInput.focus();
        updateLivePreview();
      });
    }
  }
}

// Render Discount Entries card
function renderDiscountEntriesSection() {
  const container = document.getElementById('discountEntriesContainer');
  if (!container) {
    console.error('Discount entries container not found');
    return;
  }

  container.innerHTML = `
    <div class="form-group full-width">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <label class="form-label" style="margin-bottom: 0;">Promotion Entries</label>
            <button type="button" class="btn btn-base btn-primary-base" id="addEntryBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Entry</button>
        </div>
        <div id="promotionEntriesContainer"></div>
    </div>
  `;

  // Wire up add entry button
  const addEntryBtn = document.getElementById('addEntryBtn');
  if (addEntryBtn) {
    addEntryBtn.addEventListener('click', addPromotionEntry);
  }
}

// Render Special Hours card
function renderSpecialHoursSection() {
  const cardContainer = document.getElementById('specialHoursContainer');
  if (!cardContainer) {
    console.error('Special hours card container not found');
    return;
  }

  cardContainer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <label class="form-label" style="margin-bottom: 0;">Special Hours</label>
        <button type="button" class="btn btn-base btn-primary-base" id="addHourBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Special Hours</button>
    </div>
    <div class="field-help" style="margin-bottom: 0.75rem;">For holidays or special sale hours (e.g., Black Friday extended hours)</div>
    <div id="specialHoursListContainer"></div>
    <div id="specialHoursReminder" style="display: none; background: #fff3cd; border-left: 3px solid #ffc107; padding: 1rem; margin-top: 1rem;">
        <strong>⚠️ Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
    </div>
  `;

  // Wire up add hour button
  const addHourBtn = document.getElementById('addHourBtn');
  if (addHourBtn) {
    addHourBtn.addEventListener('click', addSpecialHour);
  }
}

// Render How to Shop card
function renderHowToShopCardSection() {
  const container = document.getElementById('howToShopContainer');
  if (!container) {
    console.error('How to shop container not found');
    return;
  }

  container.innerHTML = `
    <div class="form-group full-width">
        <div id="howToShopWrapper"></div>
    </div>
  `;
}

// Render Important Notes card
function renderImportantNotesCardSection() {
  const container = document.getElementById('importantNotesContainer');
  if (!container) {
    console.error('Important notes container not found');
    return;
  }

  container.innerHTML = `
    <div class="form-group full-width">
        <div id="importantNotesWrapper"></div>
    </div>
  `;
}

// ===== INITIALIZATION =====

// Initialize the promotion UI module
export function init() {
  // Check if there's a saved template in localStorage
  const savedTemplateStr = localStorage.getItem('savedPromotionTemplate');
  let savedConfig = null;

  if (savedTemplateStr) {
    try {
      savedConfig = JSON.parse(savedTemplateStr);
    } catch (e) {
      console.error('Error parsing saved template:', e);
      savedConfig = null;
    }
  }

  // Clear state arrays - will be populated either from saved template or defaults
  promotionState.promotionEntries = [];
  promotionState.specialHours = [];
  promotionState.howToShopItems = [];
  promotionState.importantNotesItems = [];
  promotionState.attachedPDFs = [];
  promotionState.generatedSubjectLines = [];
  promotionState.selectedSubjectLine = null;

  // Render all card sections
  renderBasicDetailsForm();
  renderDiscountEntriesSection();
  renderSpecialHoursSection();
  renderHowToShopCardSection();
  renderImportantNotesCardSection();

  // Initialize PDF section in center column
  initPDFSection();

  // Update format status display (shows OS-specific file format info)
  updateFormatStatus();

  // Wire up PDF preview modal buttons
  const pdfModalClose = document.getElementById('pdfModalClose');
  const pdfModalBackdrop = document.querySelector('.pdf-modal-backdrop');
  const pdfDownloadBtn = document.getElementById('pdfDownloadBtn');
  const pdfDownloadFallback = document.getElementById('pdfDownloadFallback');

  if (pdfModalClose) {
    pdfModalClose.addEventListener('click', closePDFPreview);
  }
  if (pdfModalBackdrop) {
    pdfModalBackdrop.addEventListener('click', closePDFPreview);
  }
  if (pdfDownloadBtn) {
    pdfDownloadBtn.addEventListener('click', downloadPDFFromPreview);
  }
  if (pdfDownloadFallback) {
    pdfDownloadFallback.addEventListener('click', downloadPDFFromPreview);
  }

  // Add escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('pdfPreviewModal');
      if (modal && modal.style.display !== 'none') {
        closePDFPreview();
      }
    }
  });

  // Wire up duplicated buttons in output card
  const saveTemplateBtnDuplicate = document.getElementById(
    'saveTemplateBtnDuplicate'
  );
  const importTemplateBtnDuplicate = document.getElementById(
    'importTemplateBtnDuplicate'
  );
  const exportTemplateBtnDuplicate = document.getElementById(
    'exportTemplateBtnDuplicate'
  );
  const startOverBtnDuplicate = document.getElementById(
    'startOverBtnDuplicate'
  );

  if (saveTemplateBtnDuplicate) {
    saveTemplateBtnDuplicate.addEventListener('click', savePromotionTemplate);
  }
  if (importTemplateBtnDuplicate) {
    importTemplateBtnDuplicate.addEventListener(
      'click',
      importPromotionTemplate
    );
  }
  if (exportTemplateBtnDuplicate) {
    exportTemplateBtnDuplicate.addEventListener(
      'click',
      exportPromotionTemplate
    );
  }
  if (startOverBtnDuplicate) {
    startOverBtnDuplicate.addEventListener('click', resetToDefaults);
  }

  // Load saved template or initialize defaults
  // This must happen after card HTML is created so containers exist
  if (savedConfig) {
    // Load saved template data
    applyImportedConfig(savedConfig, true);
  } else {
    // No saved template - initialize with defaults
    initializeDefaultItems();
    addPromotionEntry();
  }

  // Render all dynamic sections after cards are created and state is initialized
  renderPromotionEntries();
  renderSpecialHours();
  renderHowToShopSection();
  renderImportantNotesSection();
  renderSubjectLines();

  // Set initial empty state for preview iframe
  const previewIframe = document.getElementById('previewIframe');
  if (previewIframe) {
    writeEmptyStateToIframe(previewIframe);
  }

  console.log('Promotion UI module initialized');
}
