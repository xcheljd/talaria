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
  showToast,
  detectOS,
  getRecommendedFormat,
  writeEmptyStateToIframe,
  announceToScreenReader,
  getScrollBehavior,
} from './shared/ui-utils.js';
import { getEmailDarkModeCSS } from './shared/theme.js';
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

export { detectOS, getRecommendedFormat };

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

export { showToast, writeEmptyStateToIframe };

// ===== CONFIRMATION DIALOG =====

/**
 * Show a custom confirmation dialog (replaces native confirm() for Electron compatibility)
 * Native confirm() causes WebView2 pointer event issues on Windows
 * @param {string} message - The message to display
 * @param {Object} options - Optional configuration
 * @param {string} options.title - Dialog title (default: "Confirm")
 * @param {string} options.okText - OK button text (default: "OK")
 * @param {string} options.cancelText - Cancel button text (default: "Cancel")
 * @returns {Promise<boolean>} - Resolves to true if OK clicked, false if Cancel clicked
 */
export function showConfirmDialog(message, options = {}) {
  const { title = 'Confirm', okText = 'OK', cancelText = 'Cancel' } = options;

  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmModalMessage');
    const okBtn = document.getElementById('confirmModalOk');
    const cancelBtn = document.getElementById('confirmModalCancel');
    const backdrop = modal?.querySelector('.confirm-modal-backdrop');

    if (!modal || !titleEl || !messageEl || !okBtn || !cancelBtn) {
      // Fallback to native confirm if modal elements not found
      console.warn(
        'Confirm modal elements not found, falling back to native confirm'
      );
      resolve(confirm(message));
      return;
    }

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;

    // Show modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);

    // Focus the cancel button for safety (pressing Enter won't accidentally confirm)
    cancelBtn.focus();

    // Cleanup function
    const cleanup = () => {
      modal.classList.remove('active');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 200);
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      backdrop?.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleKeydown);
    };

    // Event handlers
    const handleOk = () => {
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && document.activeElement === okBtn) {
        e.preventDefault();
        handleOk();
      }
    };

    // Attach event listeners
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    backdrop?.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleKeydown);
  });
}

// Current PDF preview state
let currentPreviewPDF = null;
let currentBlobUrl = null;
let modalTriggerElement = null; // Track element that opened modal for focus restoration

// ===== SILENT AUTOSAVE =====

/**
 * Silently save promotion template to localStorage without UI feedback.
 * Called automatically on state changes to prevent data loss.
 */
function silentAutosave() {
  try {
    // Get current form values
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

    localStorage.setItem('savedPromotionTemplate', JSON.stringify(config));
  } catch (error) {
    // Silent fail - don't disrupt user workflow
    console.warn('Autosave failed:', error);
  }
}

// Create debounced version for autosave (500ms delay)
const debouncedAutosave = debounce(silentAutosave, 500);

// ===== COMPLETENESS INDICATORS =====

/**
 * Check if a section has content (used for status dots)
 * @param {string} cardId - The card element ID
 * @returns {boolean} - Whether the section has content
 */
function checkSectionCompleteness(cardId) {
  switch (cardId) {
    case 'basicDetailsCard': {
      const dateRange = document
        .getElementById('promoDateRange')
        ?.value?.trim();
      const year = document.getElementById('promoYear')?.value?.trim();
      const title = document.getElementById('promoTitle')?.value?.trim();
      return !!(dateRange || year || title);
    }
    case 'discountEntriesCard':
      return promotionState.promotionEntries.some(
        (entry) =>
          entry.line?.trim() ||
          entry.collections?.trim() ||
          entry.callout?.trim()
      );
    case 'howToShopCard':
      return promotionState.howToShopItems.some((item) => item.text?.trim());
    case 'importantNotesCard':
      return promotionState.importantNotesItems.some((item) =>
        item.text?.trim()
      );
    case 'specialHoursCard':
      return promotionState.specialHours.some(
        (hour) => hour.day?.trim() || hour.hours?.trim()
      );
    case 'pdfCard':
      return promotionState.attachedPDFs.length > 0;
    case 'subjectCard':
      return !!(
        promotionState.selectedSubjectLine ||
        (promotionState.generatedSubjectLines &&
          promotionState.generatedSubjectLines.length > 0)
      );
    case 'bulkEmailCard': {
      const bulkEmailList = document.getElementById('bulkEmailList');
      return !!(bulkEmailList && bulkEmailList.value?.trim());
    }
    default:
      return false;
  }
}

/**
 * Update the status dot for a specific card
 * @param {string} cardId - The card element ID
 */
function updateStatusDot(cardId) {
  const hasContent = checkSectionCompleteness(cardId);
  const status = hasContent ? 'filled' : 'empty';

  // Helper to update a dot with pulse animation
  const updateDot = (dot) => {
    if (!dot) return;
    const wasEmpty = dot.dataset.status === 'empty';
    const becomingFilled = status === 'filled';

    dot.dataset.status = status;

    // Add pulse animation when changing to filled
    if (wasEmpty && becomingFilled) {
      dot.classList.add('pulse');
      // Remove class after animation completes
      setTimeout(() => dot.classList.remove('pulse'), 300);
    }
  };

  // Update card header dot
  const card = document.getElementById(cardId);
  if (card) {
    const dot = card.querySelector('.card-header .status-dot');
    updateDot(dot);
  }

  // Update skinny bar dot
  const skinnyDot = document.querySelector(
    `.skinny-card-title[data-card="${cardId}"] .status-dot`
  );
  updateDot(skinnyDot);
}

/**
 * Update all status dots based on current state
 */
export function updateAllStatusDots() {
  const cardIds = [
    'basicDetailsCard',
    'discountEntriesCard',
    'howToShopCard',
    'importantNotesCard',
    'specialHoursCard',
    'pdfCard',
    'subjectCard',
    'bulkEmailCard',
  ];

  cardIds.forEach(updateStatusDot);
}

// Create debounced version for status updates
const debouncedStatusUpdate = debounce(updateAllStatusDots, 100);

// ===== LIVE PREVIEW FUNCTIONS =====
// Get CSS that simulates email client dark mode color inversion
// Moved to shared/theme.js

// Update live preview
export function updateLivePreview() {
  const previewIframe = document.getElementById('previewIframe');
  if (!previewIframe) return;

  const dateRangeInput = document.getElementById('promoDateRange');

  // If no date range, regenerate the empty state with current theme colors
  if (!dateRangeInput || !dateRangeInput.value.trim()) {
    writeEmptyStateToIframe(previewIframe);
    // Still update status dots even when clearing preview
    debouncedStatusUpdate();
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
  // Auto-regenerate unless user has manually edited the subject line
  if (!promotionState.subjectLineManuallyEdited) {
    generateSubjectLines();
  }

  // Trigger autosave after preview update
  debouncedAutosave();

  // Update status dots
  debouncedStatusUpdate();
}

// Create debounced version for typing
const debouncedLivePreview = debounce(updateLivePreview, 500);

// ===== SAVE/EXPORT/IMPORT FUNCTIONS =====

// Save promotion template configuration to localStorage
export async function savePromotionTemplate() {
  const saveBtn = document.getElementById('saveTemplateBtn');

  // Add loading state
  if (saveBtn) {
    saveBtn.classList.add('loading');
    saveBtn.disabled = true;
  }

  try {
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

    // Success animation
    if (saveBtn) {
      saveBtn.classList.remove('loading');
      saveBtn.classList.add('success');
      setTimeout(() => {
        saveBtn.classList.remove('success');
        saveBtn.disabled = false;
      }, 1000);
    }

    showToast('✓ Template saved successfully');
  } catch (error) {
    console.error('Save error:', error);
    if (saveBtn) {
      saveBtn.classList.remove('loading');
      saveBtn.disabled = false;
    }
    showToast('✗ Error saving template');
  }
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

// Import promotion template from a File object (used by file input in floating toolbar)
export function importPromotionTemplateFromFile(file) {
  if (!file) return;

  const importBtn = document.getElementById('importTemplateBtn');

  // Add loading state
  if (importBtn) {
    importBtn.classList.add('loading');
    importBtn.disabled = true;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    // Small delay for visual feedback
    setTimeout(() => {
      try {
        const config = JSON.parse(event.target.result);

        // Additional validation for file imports
        if (!config || typeof config !== 'object') {
          if (importBtn) {
            importBtn.classList.remove('loading');
            importBtn.disabled = false;
          }
          showToast(
            '✗ Invalid template file - not a valid configuration object'
          );
          return;
        }

        // Check if this looks like a promotion template (backwards compatible)
        if (config.templateType && config.templateType !== 'promotion-email') {
          if (importBtn) {
            importBtn.classList.remove('loading');
            importBtn.disabled = false;
          }
          showToast('✗ Invalid template file - not a promotion email template');
          return;
        }
        if (!('promotionEntries' in config) || !('specialHours' in config)) {
          if (importBtn) {
            importBtn.classList.remove('loading');
            importBtn.disabled = false;
          }
          showToast(
            '✗ Invalid template file - missing required promotion template fields'
          );
          return;
        }

        applyImportedConfig(config, true); // true = collapse entries on import

        // Success animation
        if (importBtn) {
          importBtn.classList.remove('loading');
          importBtn.classList.add('success');
          setTimeout(() => {
            importBtn.classList.remove('success');
            importBtn.disabled = false;
          }, 1000);
        }

        showToast('✓ Template imported from file successfully');
      } catch (error) {
        console.error('Import error:', error);
        if (importBtn) {
          importBtn.classList.remove('loading');
          importBtn.disabled = false;
        }
        showToast(
          '✗ Error reading template file - Invalid JSON or corrupted file'
        );
      }
    }, 300);
  };

  reader.onerror = () => {
    if (importBtn) {
      importBtn.classList.remove('loading');
      importBtn.disabled = false;
    }
    showToast('✗ Error reading file');
  };

  reader.readAsText(file);
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

    // NOTE: Bulk email recipients are restored from IndexedDB (not localStorage)
    // in setupOutputButtons() to avoid race conditions and stale data.
    // The IndexedDB is the single source of truth for recipient lists.

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
  const exportBtn = document.getElementById('exportTemplateBtn');

  // Add loading state
  if (exportBtn) {
    exportBtn.classList.add('loading');
    exportBtn.disabled = true;
  }

  // Small delay for visual feedback
  setTimeout(() => {
    try {
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

      // Success animation
      if (exportBtn) {
        exportBtn.classList.remove('loading');
        exportBtn.classList.add('success');
        setTimeout(() => {
          exportBtn.classList.remove('success');
          exportBtn.disabled = false;
        }, 1000);
      }

      showToast('✓ Template exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      if (exportBtn) {
        exportBtn.classList.remove('loading');
        exportBtn.disabled = false;
      }
      showToast('✗ Error exporting template');
    }
  }, 300);
}

// ===== AUTO-GENERATION FUNCTIONS =====

// Get the nth occurrence of a weekday in a month (e.g., 3rd Monday)
// month: 0-11, dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat, ordinal: 1-5
function getOrdinalWeekday(year, month, dayOfWeek, ordinal) {
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  let dayOffset = dayOfWeek - firstDayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  const date = 1 + dayOffset + (ordinal - 1) * 7;
  return new Date(year, month, date);
}

// Get the last occurrence of a weekday in a month (e.g., last Monday of May)
function getLastWeekday(year, month, dayOfWeek) {
  const lastDay = new Date(year, month + 1, 0); // Last day of month
  const lastDayOfWeek = lastDay.getDay();
  let dayOffset = lastDayOfWeek - dayOfWeek;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month, lastDay.getDate() - dayOffset);
}

// Calculate all holiday dates for a given year
function getHolidayDates(year) {
  const thanksgiving = getOrdinalWeekday(year, 10, 4, 4); // 4th Thursday of Nov

  return {
    // Fixed holidays
    newYear: new Date(year, 0, 1),
    valentines: new Date(year, 1, 14),
    independence: new Date(year, 6, 4),
    halloween: new Date(year, 9, 31),
    christmas: new Date(year, 11, 25),

    // Floating holidays
    presidentsDay: getOrdinalWeekday(year, 1, 1, 3), // 3rd Monday of Feb
    mothersDay: getOrdinalWeekday(year, 4, 0, 2), // 2nd Sunday of May
    memorialDay: getLastWeekday(year, 4, 1), // Last Monday of May
    fathersDay: getOrdinalWeekday(year, 5, 0, 3), // 3rd Sunday of June
    laborDay: getOrdinalWeekday(year, 8, 1, 1), // 1st Monday of Sep
    thanksgiving: thanksgiving,
    blackFriday: new Date(thanksgiving.getTime() + 24 * 60 * 60 * 1000), // Day after
    cyberMonday: new Date(thanksgiving.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days after
  };
}

// Parse a date range string into start and end Date objects
// Handles formats like: "Nov 28 - Dec 1", "December 15-22", "Jan 5"
function parseDateRange(dateRangeStr) {
  if (!dateRangeStr || !dateRangeStr.trim()) return null;

  const months = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  const str = dateRangeStr.toLowerCase().trim();
  const now = new Date();
  const currentYear = now.getFullYear();

  // Split on common separators: -, –, —, to
  const parts = str.split(/\s*[-–—]\s*|\s+to\s+/);

  const parseDate = (part, fallbackMonth = null) => {
    // Match month name and optional day
    const monthMatch = part.match(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i
    );
    const dayMatch = part.match(/\b(\d{1,2})\b/);

    let month = fallbackMonth;
    if (monthMatch) {
      month = months[monthMatch[1].toLowerCase()];
    }

    if (month === null) return null;

    const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;

    // Determine year - if date has passed, might mean next year
    let year = currentYear;
    const tentativeDate = new Date(year, month, day);
    // If the date is more than 2 months in the past, assume next year
    if (tentativeDate < new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)) {
      year = currentYear + 1;
    }

    return new Date(year, month, day);
  };

  if (parts.length === 1) {
    // Single date
    const date = parseDate(parts[0]);
    return date ? { start: date, end: date } : null;
  } else if (parts.length >= 2) {
    // Date range
    const startDate = parseDate(parts[0]);
    if (!startDate) return null;

    // For end date, fall back to start month if not specified
    const endDate = parseDate(parts[1], startDate.getMonth());
    if (!endDate) return null;

    // If end date is before start date and in same year, it might span years
    if (endDate < startDate) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return { start: startDate, end: endDate };
  }

  return null;
}

// Check if a date range overlaps with a holiday window
function dateRangeOverlaps(rangeStart, rangeEnd, windowStart, windowEnd) {
  return rangeStart <= windowEnd && rangeEnd >= windowStart;
}

// Get the matching occasion for a date range, with priority handling
function getOccasionForDateRange(startDate, endDate) {
  const year = startDate.getFullYear();
  const holidays = getHolidayDates(year);

  // Helper to create window dates
  const dayMs = 24 * 60 * 60 * 1000;
  const daysAfter = (date, days) => new Date(date.getTime() + days * dayMs);
  const daysBefore = (date, days) => new Date(date.getTime() - days * dayMs);

  // Define occasions with their windows and titles (in priority order)
  const occasions = [
    // Highest priority: specific shopping holidays
    {
      name: 'blackFriday',
      title: 'BLACK FRIDAY OUTLET EVENT',
      start: daysBefore(holidays.blackFriday, 1), // Wed before
      end: daysAfter(holidays.blackFriday, 2), // Sun after
    },
    {
      name: 'cyberMonday',
      title: 'CYBER MONDAY SALE',
      start: daysBefore(holidays.cyberMonday, 1), // Sun before
      end: daysAfter(holidays.cyberMonday, 1), // Tue after
    },

    // Sale weekends
    {
      name: 'memorialDay',
      title: 'MEMORIAL DAY SALE',
      start: daysBefore(holidays.memorialDay, 4), // Thu before
      end: holidays.memorialDay,
    },
    {
      name: 'laborDay',
      title: 'LABOR DAY SALE',
      start: daysBefore(holidays.laborDay, 4), // Thu before
      end: holidays.laborDay,
    },
    {
      name: 'presidentsDay',
      title: 'PRESIDENTS DAY SALE',
      start: daysBefore(holidays.presidentsDay, 4), // Thu before
      end: holidays.presidentsDay,
    },

    // Gift occasions (longer windows)
    {
      name: 'valentines',
      title: "VALENTINE'S DAY EVENT",
      start: new Date(year, 1, 1), // Feb 1
      end: holidays.valentines, // Feb 14
    },
    {
      name: 'mothersDay',
      title: "MOTHER'S DAY GIFT EVENT",
      start: daysBefore(holidays.mothersDay, 14), // 2 weeks before
      end: holidays.mothersDay,
    },
    {
      name: 'fathersDay',
      title: "FATHER'S DAY GIFT EVENT",
      start: daysBefore(holidays.fathersDay, 14), // 2 weeks before
      end: holidays.fathersDay,
    },

    // Other holidays
    {
      name: 'independence',
      title: 'JULY 4TH SALE',
      start: new Date(year, 5, 25), // Jun 25
      end: holidays.independence, // Jul 4
    },
    {
      name: 'halloween',
      title: 'HALLOWEEN SALE',
      start: new Date(year, 9, 15), // Oct 15
      end: holidays.halloween, // Oct 31
    },
    {
      name: 'backToSchool',
      title: 'BACK TO SCHOOL SALE',
      start: new Date(year, 7, 1), // Aug 1
      end: new Date(year, 8, 10), // Sep 10
    },

    // New Year (spans years)
    {
      name: 'newYear',
      title: 'NEW YEAR SALE',
      start: new Date(year, 11, 26), // Dec 26
      end: new Date(year + 1, 0, 7), // Jan 7
    },
    // Also check if we're in early January (previous year's New Year window)
    {
      name: 'newYearEarly',
      title: 'NEW YEAR SALE',
      start: new Date(year, 0, 1), // Jan 1
      end: new Date(year, 0, 7), // Jan 7
    },

    // Holiday/Christmas (broad December)
    {
      name: 'holiday',
      title: 'HOLIDAY SALE EVENT',
      start: new Date(year, 11, 1), // Dec 1
      end: new Date(year, 11, 25), // Dec 25
    },

    // Seasonal fallbacks (lower priority)
    {
      name: 'summer',
      title: 'SUMMER CLEARANCE',
      start: new Date(year, 5, 1), // Jun 1
      end: new Date(year, 7, 31), // Aug 31
    },
    {
      name: 'spring',
      title: 'SPRING SALE',
      start: new Date(year, 2, 1), // Mar 1
      end: new Date(year, 4, 31), // May 31
    },
    {
      name: 'fall',
      title: 'FALL SALE',
      start: new Date(year, 8, 1), // Sep 1
      end: new Date(year, 10, 30), // Nov 30
    },
    {
      name: 'winter',
      title: 'WINTER SALE',
      start: new Date(year, 0, 1), // Jan 1
      end: new Date(year, 1, 28), // Feb 28
    },
  ];

  // Find first matching occasion (they're in priority order)
  for (const occasion of occasions) {
    if (dateRangeOverlaps(startDate, endDate, occasion.start, occasion.end)) {
      return occasion.title;
    }
  }

  return null;
}

// Auto-generate title based on date range
export function generatePromoTitle(dateRange) {
  if (!dateRange) return 'WEEKLY SALE';

  // Parse the user's date range into actual dates
  const parsed = parseDateRange(dateRange);
  if (!parsed) return 'WEEKLY SALE';

  // Find matching occasion based on date range
  const occasionTitle = getOccasionForDateRange(parsed.start, parsed.end);
  if (occasionTitle) return occasionTitle;

  // Default fallback
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

  // Announce to screen readers (skip during initialization)
  if (!promotionState.isInitializing) {
    const entryNumber = promotionState.promotionEntries.length;
    announceToScreenReader(`Discount entry ${entryNumber} added`);

    // Scroll the card's bottom into view after render
    setTimeout(() => {
      const newEntry = document.querySelector(
        `.promotion-entry[data-entry-id="${entryId}"]`
      );
      const card = newEntry?.closest('.card');
      if (card) {
        card.scrollIntoView({ behavior: getScrollBehavior(), block: 'end' });
      }
    }, 50);
  }
}

// Remove a promotion entry
export function removePromotionEntry(entryId) {
  const index = promotionState.promotionEntries.findIndex(
    (entry) => entry.id === entryId
  );
  if (index !== -1) {
    const entryNumber = index + 1;
    promotionState.promotionEntries.splice(index, 1);
    renderPromotionEntries();
    updateLivePreview();
    updateAllStatusDots();
    announceToScreenReader(`Discount entry ${entryNumber} removed`);
  }
}

// Move promotion entry up
export function movePromotionEntryUp(entryId) {
  if (moveItemInArray(promotionState.promotionEntries, entryId, 'up')) {
    renderPromotionEntries();
    const newIndex = promotionState.promotionEntries.findIndex(
      (e) => e.id === entryId
    );
    announceToScreenReader(`Entry moved to position ${newIndex + 1}`);
  }
}

// Move promotion entry down
export function movePromotionEntryDown(entryId) {
  if (moveItemInArray(promotionState.promotionEntries, entryId, 'down')) {
    renderPromotionEntries();
    const newIndex = promotionState.promotionEntries.findIndex(
      (e) => e.id === entryId
    );
    announceToScreenReader(`Entry moved to position ${newIndex + 1}`);
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

      // Scroll expanded entry into view after a short delay for DOM update
      setTimeout(() => {
        entryRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
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
            <div class="promotion-entry ${isCollapsed ? 'collapsed' : ''}" data-entry-id="${safeId}" draggable="true" tabindex="0" aria-label="Discount entry ${index + 1}. Use Alt+Arrow keys to reorder.">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            ${dragHandleIcon({ size: 16 })}
                        </div>
                        <div class="order-buttons">
                            <button type="button" class="order-btn" data-action="move-up" data-entry-id="${entry.id}" title="Move up" ${isFirst ? 'disabled' : ''}>
                                ${chevronIcon('up', { size: 14 })}
                            </button>
                            <button type="button" class="order-btn" data-action="move-down" data-entry-id="${entry.id}" title="Move down" ${isLast ? 'disabled' : ''}>
                                ${chevronIcon('down', { size: 14 })}
                            </button>
                        </div>
                        <span class="entry-number">Entry ${index + 1}</span>
                        ${isCollapsed ? `<span class="entry-summary">${escapeHtml(summaryText)}</span>` : ''}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn btn-secondary-base" data-action="toggle-collapse" data-entry-id="${entry.id}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                            ${isCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                        <button type="button" class="entry-remove-btn" data-action="remove" data-entry-id="${entry.id}" title="Remove" aria-label="Remove entry">
                            ${closeIcon({ size: 16 })}
                        </button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${isCollapsed ? 'none' : 'flex'};">
                    <div class="form-group">
                        <label class="form-label" for="entry-${safeId}-line">Promotion Line *</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-line" id="entry-${safeId}-line" name="entry-${safeId}-line" data-entry-id="${safeId}" value="${escapeAttr(entry.line || '')}" placeholder="CITIZEN – ADDITIONAL 20% OFF">
                            <button class="clear-input" data-clear="entry-${safeId}-line" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="entry-${safeId}-collections">Collections (comma-separated)</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-collections" id="entry-${safeId}-collections" name="entry-${safeId}-collections" data-entry-id="${safeId}" value="${escapeAttr(entry.collections)}" placeholder="Corso, Avion, Marine Star">
                            <button class="clear-input" data-clear="entry-${safeId}-collections" title="Clear">×</button>
                        </div>
                    </div>

                    <div class="form-group">
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

  // Add keyboard support for reordering entries (Alt+Arrow keys)
  container.querySelectorAll('.promotion-entry').forEach((entry) => {
    entry.addEventListener('keydown', (e) => {
      // Only handle Alt+Arrow keys for reordering
      if (!e.altKey) return;

      const entryId = parseInt(entry.dataset.entryId);
      if (isNaN(entryId)) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        movePromotionEntryUp(entryId);
        // Refocus the entry after rerender
        setTimeout(() => {
          const movedEntry = document.querySelector(
            `.promotion-entry[data-entry-id="${entryId}"]`
          );
          if (movedEntry) movedEntry.focus();
        }, 50);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        movePromotionEntryDown(entryId);
        // Refocus the entry after rerender
        setTimeout(() => {
          const movedEntry = document.querySelector(
            `.promotion-entry[data-entry-id="${entryId}"]`
          );
          if (movedEntry) movedEntry.focus();
        }, 50);
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

  // Scroll the card's bottom into view after render (skip during initialization)
  if (!promotionState.isInitializing) {
    setTimeout(() => {
      const newHour = document.querySelector(
        `.special-hour-row[data-hour-id="${hourId}"]`
      );
      const card = newHour?.closest('.card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 50);
  }
}

// Remove a special hour row
export function removeSpecialHour(hourId) {
  const index = promotionState.specialHours.findIndex(
    (hour) => hour.id === hourId
  );
  if (index !== -1) {
    promotionState.specialHours.splice(index, 1);
    renderSpecialHours();
    updateLivePreview();
    updateAllStatusDots();
  }
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
            <div class="special-hour-row" data-hour-id="${safeId}" draggable="true">
                <div class="entry-inline-row">
                    <div class="drag-handle" title="Drag to reorder">
                        ${dragHandleIcon({ size: 16 })}
                    </div>
                    <div class="order-buttons">
                        <button type="button" class="order-btn" data-action="move-hour-up" data-hour-id="${hour.id}" title="Move up" ${isFirst ? 'disabled' : ''}>${chevronIcon('up', { size: 10 })}</button>
                        <button type="button" class="order-btn" data-action="move-hour-down" data-hour-id="${hour.id}" title="Move down" ${isLast ? 'disabled' : ''}>${chevronIcon('down', { size: 10 })}</button>
                    </div>
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
                    <button type="button" class="entry-remove-btn" data-action="remove-hour" data-hour-id="${hour.id}" title="Remove" aria-label="Remove special hour">
                        ${closeIcon({ size: 16 })}
                    </button>
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

  // Scroll the card's bottom into view after render (skip during initialization)
  if (!promotionState.isInitializing) {
    setTimeout(() => {
      const newItem = document.querySelector(
        `#howToShopItemsContainer .editable-item-row[data-item-id="${itemId}"]`
      );
      const card = newItem?.closest('.card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 50);
  }
}

// Remove a How to Shop item
export function removeHowToShopItem(itemId) {
  const index = promotionState.howToShopItems.findIndex(
    (item) => item.id === itemId
  );
  if (index !== -1) {
    promotionState.howToShopItems.splice(index, 1);
    renderHowToShopSection();
    updateLivePreview();
    updateAllStatusDots();
  }
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
                <div class="entry-inline-row">
                    <div class="drag-handle" title="Drag to reorder">
                        ${dragHandleIcon({ size: 16 })}
                    </div>
                    <div class="order-buttons">
                        <button type="button" class="order-btn" data-action="move-up-how-to-shop" data-item-id="${item.id}" title="Move up" ${isFirst ? 'disabled' : ''}>${chevronIcon('up', { size: 10 })}</button>
                        <button type="button" class="order-btn" data-action="move-down-how-to-shop" data-item-id="${item.id}" title="Move down" ${isLast ? 'disabled' : ''}>${chevronIcon('down', { size: 10 })}</button>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input shop-item-text" id="shop-item-${safeId}-text" name="shop-item-${safeId}-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                            <button class="clear-input" data-clear="shop-item-${safeId}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="format-buttons">
                        <button type="button" class="format-btn" data-action="toggle-bold-how-to-shop" data-item-id="${item.id}" title="Bold" ${item.bold ? 'data-active="true"' : ''}>${boldIcon({ size: 14 })}</button>
                        <button type="button" class="format-btn" data-action="toggle-italic-how-to-shop" data-item-id="${item.id}" title="Italic" ${item.italic ? 'data-active="true"' : ''}>${italicIcon({ size: 14 })}</button>
                        <button type="button" class="format-btn" data-action="toggle-underline-how-to-shop" data-item-id="${item.id}" title="Underline" ${item.underline ? 'data-active="true"' : ''}>${underlineIcon({ size: 14 })}</button>
                    </div>
                    <button type="button" class="entry-remove-btn" data-action="remove-how-to-shop-item" data-item-id="${item.id}" title="Remove" aria-label="Remove shopping item">
                        ${closeIcon({ size: 16 })}
                    </button>
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

  // Only create structure if it doesn't exist
  if (!document.getElementById('howToShopItemsContainer')) {
    // Always show expanded content (card-level collapse handles hiding)
    wrapper.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
          <button type="button" class="btn btn-base btn-primary-base" data-action="add-how-to-shop-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
      </div>
      <div id="howToShopItemsContainer"></div>
    `;

    // Attach "Add Item" listener (once)
    const addButton = wrapper.querySelector(
      '[data-action="add-how-to-shop-item"]'
    );
    if (addButton) {
      addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        addHowToShopItem();
      });
    }
  }

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

  // Scroll the card's bottom into view after render (skip during initialization)
  if (!promotionState.isInitializing) {
    setTimeout(() => {
      const newItem = document.querySelector(
        `#importantNotesItemsContainer .editable-item-row[data-item-id="${itemId}"]`
      );
      const card = newItem?.closest('.card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 50);
  }
}

// Remove an Important Notes item
export function removeImportantNotesItem(itemId) {
  const index = promotionState.importantNotesItems.findIndex(
    (item) => item.id === itemId
  );
  if (index !== -1) {
    promotionState.importantNotesItems.splice(index, 1);
    renderImportantNotesSection();
    updateLivePreview();
    updateAllStatusDots();
  }
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
                <div class="entry-inline-row">
                    <div class="drag-handle" title="Drag to reorder">
                        ${dragHandleIcon({ size: 16 })}
                    </div>
                    <div class="order-buttons">
                        <button type="button" class="order-btn" data-action="move-up-important-notes" data-item-id="${item.id}" title="Move up" ${isFirst ? 'disabled' : ''}>${chevronIcon('up', { size: 10 })}</button>
                        <button type="button" class="order-btn" data-action="move-down-important-notes" data-item-id="${item.id}" title="Move down" ${isLast ? 'disabled' : ''}>${chevronIcon('down', { size: 10 })}</button>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input important-notes-item-text" id="important-notes-item-${safeId}-text" name="important-notes-item-${safeId}-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., Important safety information or key details">
                            <button class="clear-input" data-clear="important-notes-item-${safeId}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="format-buttons">
                        <button type="button" class="format-btn" data-action="toggle-bold-important-notes" data-item-id="${item.id}" title="Bold" ${item.bold ? 'data-active="true"' : ''}>${boldIcon({ size: 14 })}</button>
                        <button type="button" class="format-btn" data-action="toggle-italic-important-notes" data-item-id="${item.id}" title="Italic" ${item.italic ? 'data-active="true"' : ''}>${italicIcon({ size: 14 })}</button>
                        <button type="button" class="format-btn" data-action="toggle-underline-important-notes" data-item-id="${item.id}" title="Underline" ${item.underline ? 'data-active="true"' : ''}>${underlineIcon({ size: 14 })}</button>
                    </div>
                    <button type="button" class="entry-remove-btn" data-action="remove-important-notes-item" data-item-id="${item.id}" title="Remove" aria-label="Remove important note">
                        ${closeIcon({ size: 16 })}
                    </button>
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

  // Only create structure if it doesn't exist
  if (!document.getElementById('importantNotesItemsContainer')) {
    // Always show expanded content (card-level collapse handles hiding)
    wrapper.innerHTML = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
          <button type="button" class="btn btn-base btn-primary-base" data-action="add-important-notes-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
      </div>
      <div id="importantNotesItemsContainer"></div>
    `;

    // Attach "Add Item" listener (once)
    const addButton = wrapper.querySelector(
      '[data-action="add-important-notes-item"]'
    );
    if (addButton) {
      addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        addImportantNotesItem();
      });
    }
  }

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
    // Still update status dots when all PDFs removed
    debouncedStatusUpdate();
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
        previewPDF(pdfId, e.currentTarget);
      });
      element.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const pdfId = parseFloat(e.currentTarget.dataset.pdfId);
          previewPDF(pdfId, e.currentTarget);
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

  // Trigger autosave after PDF changes
  debouncedAutosave();

  // Update status dots
  debouncedStatusUpdate();
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
export function previewPDF(pdfId, triggerElement = null) {
  const pdf = promotionState.attachedPDFs.find((p) => p.id === pdfId);
  if (!pdf || !pdf.data) {
    showToast('✗ PDF data not available for preview');
    return;
  }

  currentPreviewPDF = pdf;
  modalTriggerElement = triggerElement; // Store for focus restoration

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

  // Set up focus trap
  setupModalFocusTrap(modal);

  // Focus on the close button for accessibility (first focusable element)
  const closeBtn = document.getElementById('pdfModalClose');
  if (closeBtn) {
    closeBtn.focus();
  }
}

/**
 * Set up focus trap for modal dialogs
 * @param {HTMLElement} modal - The modal element to trap focus within
 */
function setupModalFocusTrap(modal) {
  const focusableSelectors =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  modal.addEventListener('keydown', handleModalKeydown);
}

/**
 * Handle keydown events for modal focus trap
 * @param {KeyboardEvent} e - The keydown event
 */
function handleModalKeydown(e) {
  if (e.key !== 'Tab') return;

  const modal = e.currentTarget;
  const focusableSelectors =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableElements = modal.querySelectorAll(focusableSelectors);
  const focusableArray = Array.from(focusableElements).filter(
    (el) => !el.disabled && el.offsetParent !== null
  );

  if (focusableArray.length === 0) return;

  const firstElement = focusableArray[0];
  const lastElement = focusableArray[focusableArray.length - 1];

  if (e.shiftKey) {
    // Shift + Tab: if on first element, move to last
    if (document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab: if on last element, move to first
    if (document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

// Close PDF preview modal
export function closePDFPreview() {
  const modal = document.getElementById('pdfPreviewModal');
  if (modal) {
    // Remove focus trap event listener
    modal.removeEventListener('keydown', handleModalKeydown);

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

  // Restore focus to trigger element
  if (modalTriggerElement && typeof modalTriggerElement.focus === 'function') {
    modalTriggerElement.focus();
    modalTriggerElement = null;
  }
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
            <div class="subject-dropdown-header">
                <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
                <button type="button" class="btn btn-secondary-base btn-sm" id="regenerateSubjectBtn" title="Regenerate suggestions based on current entries">
                    ↻ Regenerate
                </button>
            </div>
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

      // Mark as manually edited to prevent auto-regeneration
      promotionState.subjectLineManuallyEdited = true;

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

  // Add event listener to regenerate button
  const regenerateBtn = document.getElementById('regenerateSubjectBtn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', regenerateSubjectLines);
  }
}

// Regenerate subject lines on demand (clears manual edit flag)
export function regenerateSubjectLines() {
  promotionState.subjectLineManuallyEdited = false;
  generateSubjectLines();
}

// Detect current season and upcoming occasions for subject line suggestions
function getSeasonAndOccasions() {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();

  // Determine season
  let season = 'winter';
  if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else if (month >= 8 && month <= 10) season = 'fall';

  // Check for occasions (within ~2 weeks before)
  const occasions = [];

  // Valentine's Day: Feb 14 (check Feb 1-14)
  if (month === 1 && day <= 14) {
    occasions.push({ name: "Valentine's Day", type: 'gift' });
  }
  // Mother's Day: 2nd Sunday of May (approximate: May 1-14)
  if (month === 4 && day <= 14) {
    occasions.push({ name: "Mother's Day", type: 'gift' });
  }
  // Father's Day: 3rd Sunday of June (approximate: June 1-21)
  if (month === 5 && day <= 21) {
    occasions.push({ name: "Father's Day", type: 'gift' });
  }
  // Independence Day: July 4 (check June 20 - July 4)
  if ((month === 5 && day >= 20) || (month === 6 && day <= 4)) {
    occasions.push({ name: 'July 4th', type: 'sale' });
  }
  // Back to School: Late July - Early Sept
  if ((month === 6 && day >= 20) || month === 7 || (month === 8 && day <= 7)) {
    occasions.push({ name: 'Back to School', type: 'sale' });
  }
  // Halloween: Oct (check Oct 15-31)
  if (month === 9 && day >= 15) {
    occasions.push({ name: 'Halloween', type: 'theme' });
  }
  // Black Friday: Day after Thanksgiving (late Nov, approximate Nov 20-30)
  if (month === 10 && day >= 20) {
    occasions.push({ name: 'Black Friday', type: 'sale' });
  }
  // Holiday/Christmas: Dec 1-25
  if (month === 11 && day <= 25) {
    occasions.push({ name: 'Holiday', type: 'gift' });
  }
  // New Year: Dec 26 - Jan 7
  if ((month === 11 && day >= 26) || (month === 0 && day <= 7)) {
    occasions.push({ name: 'New Year', type: 'sale' });
  }

  return { season, occasions };
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

  // Get seasonal and occasion context
  const { season, occasions } = getSeasonAndOccasions();

  // === TIER 1: High-Impact Contextual ===

  // 1. Seasonal/occasion subjects (timely, highest open rates)
  if (occasions.length > 0) {
    const occasion = occasions[0]; // Use first/primary occasion
    if (occasion.type === 'gift') {
      // Gift-giving occasions
      subjects.push(`${occasion.name} Watch Gifts`);
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Gifts – ${getDiscountPhrase(maxDiscount)}`
        );
      }
      if (brands.length > 0) {
        subjects.push(`${occasion.name}: ${brands[0]} Picks`);
      }
    } else if (occasion.type === 'sale') {
      // Sale-focused occasions
      subjects.push(`${occasion.name} Watch Sale`);
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Savings – ${getDiscountPhrase(maxDiscount)}`
        );
      }
    } else if (occasion.type === 'theme') {
      // Themed occasions (more subtle)
      if (maxDiscount > 0) {
        subjects.push(
          `${occasion.name} Sale – ${getDiscountPhrase(maxDiscount)}`
        );
      }
    }
  } else {
    // No occasion - use seasonal subjects
    const seasonCapitalized = season.charAt(0).toUpperCase() + season.slice(1);
    if (maxDiscount > 0) {
      subjects.push(
        `${seasonCapitalized} Watch Sale – ${getDiscountPhrase(maxDiscount)}`
      );
    }
  }

  // 2. Scarcity/urgency subjects (FOMO, drives action)
  if (hasLimitedStock) {
    subjects.push('Limited Stock – Shop Now');
  }
  if (hasFinalSale) {
    subjects.push('Final Sale: Extra Savings Inside');
  }

  // 3. Brand + discount subjects (specific to their promotion)
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

  // === TIER 2: Value & Aspiration ===

  // 4. Value proposition subjects
  if (maxDiscount >= 30) {
    subjects.push(`Perfect Watch Gifts – Up to ${maxDiscount}% OFF`);
  }

  // 5. Emotional/benefit-focused subjects (lifestyle, aspirational)
  subjects.push('Elevate Your Style');
  subjects.push('Time for an Upgrade');
  if (maxDiscount > 0) {
    subjects.push(
      `Timeless Style, Limited Time – ${getDiscountPhrase(maxDiscount)}`
    );
  }
  if (brands.length > 0) {
    subjects.push(`Discover ${brands[0]} Excellence`);
  }
  if (maxDiscount >= 25) {
    subjects.push('Luxury Within Reach');
  }

  // === TIER 3: Engagement ===

  // 6. Question/engagement style subjects
  subjects.push('Your New Watch Awaits');
  if (maxDiscount >= 20) {
    subjects.push('Ready for a New Watch?');
  }

  // 7. Discount-focused subjects
  if (maxDiscount > 0) {
    subjects.push(`Up to ${maxDiscount}% OFF This Week`);
  }

  // === TIER 4: Informational ===

  // 8. Date/time focused subjects
  if (dateRange) {
    subjects.push(`Sale: ${dateRange}`);
    // Weekend urgency variant
    const lowerDate = dateRange.toLowerCase();
    if (
      lowerDate.includes('fri') ||
      lowerDate.includes('sat') ||
      lowerDate.includes('sun')
    ) {
      subjects.push(`This Weekend: ${getDiscountPhrase(maxDiscount)}`);
    }
  }

  // 9. Brand + Collections subjects (niche appeal)
  if (brands.length > 0 && topCollections.length > 0) {
    const collectionsStr = topCollections.slice(0, 3).join(', ');
    subjects.push(`${brands[0]} including ${collectionsStr}`);
  }
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

  // === TIER 5: Generic ===

  // 10. Scarcity & action subjects (generic urgency)
  if (maxDiscount > 0) {
    subjects.push(`Don't Miss These Watch Deals`);
  }
  if (brands.length > 0) {
    subjects.push(`VIP Watch Sale: ${brands[0]} & More`);
  }

  // 11. Generic fallback (only if we have few subjects)
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
  const confirmed = await showConfirmDialog(
    'This will reset everything to defaults and cannot be undone. Continue?',
    { title: 'Reset to Defaults', okText: 'Reset', cancelText: 'Cancel' }
  );
  if (!confirmed) {
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
        <div style="display: flex; justify-content: flex-end; margin-bottom: 0.75rem;">
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
    <div id="specialHoursReminder" class="reminder-box" style="display: none;">
        <strong>Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
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

  // Wire up floating template action buttons (Save button removed - autosave handles persistence)
  const importTemplateBtn = document.getElementById('importTemplateBtn');
  const exportTemplateBtn = document.getElementById('exportTemplateBtn');
  const importTemplateFile = document.getElementById('importTemplateFile');
  const startOverBtn = document.getElementById('startOverBtn');

  if (importTemplateBtn) {
    importTemplateBtn.addEventListener('click', () => {
      importTemplateFile?.click();
    });
  }
  if (importTemplateFile) {
    importTemplateFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        importPromotionTemplateFromFile(file);
      }
      e.target.value = '';
    });
  }
  if (exportTemplateBtn) {
    exportTemplateBtn.addEventListener('click', exportPromotionTemplate);
  }
  if (startOverBtn) {
    startOverBtn.addEventListener('click', resetToDefaults);
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

  // Initialize drag and drop (one-time setup)
  setupDragAndDrop(
    document.getElementById('promotionEntriesContainer'),
    () => promotionState.promotionEntries,
    renderPromotionEntries,
    '.promotion-entry'
  );

  setupDragAndDrop(
    document.getElementById('howToShopItemsContainer'),
    () => promotionState.howToShopItems,
    renderHowToShopSection
  );

  setupDragAndDrop(
    document.getElementById('importantNotesItemsContainer'),
    () => promotionState.importantNotesItems,
    renderImportantNotesSection
  );

  setupDragAndDrop(
    document.getElementById('specialHoursListContainer'),
    () => promotionState.specialHours,
    renderSpecialHours,
    '.special-hour-row'
  );

  // Set initial empty state for preview iframe
  const previewIframe = document.getElementById('previewIframe');
  if (previewIframe) {
    writeEmptyStateToIframe(previewIframe);
  }

  // Initialization complete - allow scrollIntoView for user-added entries
  promotionState.isInitializing = false;

  // Set initial status dot states
  updateAllStatusDots();

  console.log('Promotion UI module initialized');
}
