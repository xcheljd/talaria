/**
 * Promotion Email App - Main Entry Point
 * Initializes the standalone promotion email generator
 */

// Disable browser's automatic scroll restoration to prevent content
// from appearing under the fixed header on page refresh
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

import {
  initIndexedDB,
  saveBulkEmailRecipientsToIndexedDB,
  getBulkEmailRecipientsFromIndexedDB,
  clearBulkEmailRecipientsFromIndexedDB,
} from './shared/db.js';
import { resetToDefaults } from './promotion-ui.js';
import { initTheme, toggleTheme } from './shared/theme.js';
import { initPageTransitions } from './shared/pageTransitions.js';
import { getUserProfile, getStoreEmail } from './shared/profile.js';
import { promotionState } from './promotion-state.js';
import {
  init as initPromotionUI,
  generatePromotionEmailHTML,
  showToast,
  showConfirmDialog,
  getRecommendedFormat,
  updateHowToShopEmail,
  generateSubjectLines,
  updateLivePreview,
  writeEmptyStateToIframe,
  updateAllStatusDots,
} from './promotion-ui.js';
import {
  parseEmailList,
  isValidEmail,
  createBCCBatchEML,
  createEMLFile,
  generateZipFilenameFromHTML,
} from './shared/emailUtils.js';
import { warningIcon } from './shared/icons.js';
import { initColumnCollapse } from './promotion-column-collapse.js';
import {
  announceToScreenReader,
  getScrollBehavior,
} from './shared/ui-utils.js';

/**
 * Validate that the user profile has all required fields
 * @param {Object|null} profile - The user profile object
 * @returns {{ valid: boolean, missing: string[] }}
 */
function validateProfile(profile) {
  if (!profile) {
    return { valid: false, missing: ['profile'] };
  }

  const requiredFields = [
    'employeeName',
    'jobTitle',
    'storeName',
    'storeLocation',
    'storeAddress',
    'storePhone',
    'storeEmail',
    'storeHours',
  ];

  // Management roles also require companyEmail
  const managementTitles = [
    'Assistant Store Manager',
    'Associate Store Manager',
    'General Manager',
    'Area Manager',
    'Regional Manager',
    'District Manager',
  ];

  if (managementTitles.includes(profile.jobTitle)) {
    requiredFields.push('companyEmail');
  }

  const missing = requiredFields.filter(
    (field) => !profile[field] || profile[field].trim() === ''
  );

  return { valid: missing.length === 0, missing };
}

/**
 * Redirect to profile setup page with return URL
 */
function redirectToProfileSetup() {
  const returnUrl = encodeURIComponent('promotion.html');
  window.location.href = `start.html?return=${returnUrl}`;
}

// Initialize the promotion app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const profile = getUserProfile();

  // Validate profile - redirect if incomplete
  const validation = validateProfile(profile);
  if (!validation.valid) {
    redirectToProfileSetup();
    return; // Stop initialization
  }

  // Initialize theme first (must happen before UI renders)
  initTheme();

  // Initialize page transitions
  initPageTransitions();

  // Set up theme toggle button
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Refresh preview when theme changes
  document.addEventListener('theme:changed', () => {
    updateLivePreview();
  });

  // Write empty state to preview iframe immediately to prevent white flash
  const previewIframe = document.getElementById('previewIframe');
  if (previewIframe) {
    writeEmptyStateToIframe(previewIframe);
  }

  // Initialize IndexedDB for PDF storage and recipients
  await initIndexedDB();

  // Initialize the promotion UI
  initPromotionUI();

  // Set up output tab switching
  setupOutputTabs();

  // Set up output action buttons
  setupOutputButtons();

  // Set up collapsible cards
  setupCollapsibleCards();

  // Set up column collapse animation system
  initColumnCollapse();

  // Ensure columns and page are scrolled to top on page load
  // MUST run after all UI initialization to prevent layout shifts from scrolling
  function scrollToTop() {
    // Reset window scroll (in case browser tries to restore position)
    window.scrollTo(0, 0);

    // Reset column scrolls
    const leftColumn = document.querySelector('.left-column');
    const centerColumn = document.querySelector('.center-column');

    if (leftColumn) leftColumn.scrollTop = 0;
    if (centerColumn) centerColumn.scrollTop = 0;
  }

  // Wait for all initialization and layout to complete before scrolling
  // Use setTimeout after double rAF to ensure all DOM updates are processed
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(scrollToTop, 0);
    });
  });

  // Update how to shop email when profile might have changed (e.g., user edited profile and returned)
  let lastKnownStoreEmail = getStoreEmail();
  window.addEventListener('focus', () => {
    const currentEmail = getStoreEmail();
    if (currentEmail !== lastKnownStoreEmail) {
      lastKnownStoreEmail = currentEmail;
      updateHowToShopEmail();
    }
  });
});

/**
 * Set up collapsible card functionality
 */
function setupCollapsibleCards() {
  const collapsibleCards = document.querySelectorAll('.card.collapsible');

  collapsibleCards.forEach((card) => {
    const header = card.querySelector('.card-header');

    if (header) {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        const wasCollapsed = card.classList.contains('collapsed');
        card.classList.toggle('collapsed');

        // Announce state change to screen readers
        const sectionTitle =
          header.querySelector('.section-title')?.textContent || 'Section';
        const newState = wasCollapsed ? 'expanded' : 'collapsed';
        announceToScreenReader(`${sectionTitle} ${newState}`);

        // If card was just expanded, scroll it into view after transition
        if (wasCollapsed) {
          // Wait for CSS transition to complete (--transition-base: 300ms)
          setTimeout(() => {
            card.scrollIntoView({
              behavior: getScrollBehavior(),
              block: 'nearest',
            });
          }, 300);
        }
      });
    }
  });
}

/**
 * Set up output tab switching functionality
 */
function setupOutputTabs() {
  const tabs = document.querySelectorAll('.output-tab');
  const tabContents = document.querySelectorAll('.output-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update active tab
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Show corresponding content
      tabContents.forEach((content) => {
        content.classList.remove('active');
        if (content.id === `${targetTab}Tab`) {
          content.classList.add('active');
        }
      });

      // Show/hide buttons based on active tab
      const allRows = document.querySelectorAll(
        '.output-actions > .button-row, .output-actions > .preview-actions'
      );
      if (targetTab === 'preview') {
        allRows.forEach((row) => {
          if (row.classList.contains('tab-preview')) {
            row.style.display = '';
          } else if (row.classList.contains('tab-html')) {
            row.style.display = 'none';
          }
        });
      } else if (targetTab === 'code') {
        allRows.forEach((row) => {
          if (row.classList.contains('tab-html')) {
            row.style.display = 'flex';
          } else if (row.classList.contains('tab-preview')) {
            row.style.display = 'none';
          }
        });
      }
    });
  });
}

/**
 * Set up output action buttons (Copy HTML, Download HTML, Generate Batches)
 */
function setupOutputButtons() {
  // Copy HTML button
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      const codeArea = document.getElementById('codeArea');
      if (codeArea && codeArea.value) {
        navigator.clipboard
          .writeText(codeArea.value)
          .then(() => {
            showToast('HTML code copied to clipboard!');
          })
          .catch(() => {
            showToast('Failed to copy to clipboard');
          });
      } else {
        showToast('No HTML code to copy');
      }
    });
  }

  // Download HTML button
  const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
  if (downloadHtmlBtn) {
    downloadHtmlBtn.addEventListener('click', () => {
      const codeArea = document.getElementById('codeArea');
      if (codeArea && codeArea.value) {
        const blob = new Blob([codeArea.value], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateRange =
          document.getElementById('promoDateRange')?.value || 'promotion';
        a.download = `promotion-email-${dateRange.replace(/\s+/g, '-')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('HTML file downloaded!');
      } else {
        showToast('No HTML code to download');
      }
    });
  }

  // Download Email Draft button (EML file without recipients)
  const downloadEmlBtn = document.getElementById('downloadEmlBtn');
  if (downloadEmlBtn) {
    downloadEmlBtn.addEventListener('click', async () => {
      const codeArea = document.getElementById('codeArea');
      if (!codeArea || !codeArea.value) {
        showToast('No HTML code to download');
        return;
      }

      // Get subject line from the editable input field first, then fall back to state
      const subjectInput = document.getElementById('selectedSubjectInput');
      const subject =
        (subjectInput && subjectInput.value) ||
        promotionState.selectedSubjectLine ||
        'Promotion Email';
      const htmlContent = codeArea.value;

      // Create EML file without recipients
      let emlContent;
      try {
        emlContent = await createEMLFile(
          '', // fromName - empty for draft
          '', // fromEmail - empty for draft
          '', // to - empty
          '', // bcc - empty
          subject,
          htmlContent,
          promotionState.attachedPDFs || []
        );
      } catch (error) {
        console.error('Failed to create EML file:', error);
        showToast('Failed to create EML file');
        return;
      }

      // Download the file
      const blob = new Blob([emlContent], { type: 'message/rfc822' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateRange =
        document.getElementById('promoDateRange')?.value || 'promotion';
      const format = getRecommendedFormat();
      const extension = format === 'emltpl' ? '.emltpl' : '.eml';
      a.download = `promotion-email-${dateRange.replace(/\s+/g, '-')}${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Email draft downloaded!');
    });
  }

  // Generate Batches button handler
  async function handleGenerateBatches(button) {
    const bulkEmailList = document.getElementById('bulkEmailList');
    const batchSizeSelect = document.getElementById('batchSize');
    const codeArea = document.getElementById('codeArea');

    if (!bulkEmailList || !bulkEmailList.value.trim()) {
      showToast('Please enter recipient email addresses');
      return;
    }

    if (!codeArea || !codeArea.value.trim()) {
      showToast('Please generate email HTML first');
      return;
    }

    const emails = parseEmailList(bulkEmailList.value);
    const validEmails = emails.filter(isValidEmail);

    if (validEmails.length === 0) {
      showToast('No valid email addresses found');
      return;
    }

    const batchSize = parseInt(batchSizeSelect?.value || '500');
    const htmlContent = codeArea.value;
    const subject = promotionState.selectedSubjectLine;
    const batchCount = Math.ceil(validEmails.length / batchSize);

    // Warn for large recipient lists (1000+)
    if (validEmails.length >= 1000) {
      const proceed = await showConfirmDialog(
        `You are about to generate ${batchCount} batch file(s) for ${validEmails.length.toLocaleString()} recipients.\n\nThis may take a moment. Continue?`,
        {
          title: 'Large Recipient List',
          okText: 'Continue',
          cancelText: 'Cancel',
        }
      );
      if (!proceed) return;
    }

    // Warn if no subject line selected
    if (!subject) {
      const proceed = await showConfirmDialog(
        'No subject line selected. The email will use "Weekly Promotion" as the default subject.\n\nContinue anyway?',
        { title: 'No Subject Line', okText: 'Continue', cancelText: 'Cancel' }
      );
      if (!proceed) return;
    }

    const finalSubject = subject || 'Weekly Promotion';

    // Show loading state with accessibility
    const btnText = button.querySelector('.btn-text');
    const btnSpinner = button.querySelector('.btn-spinner');
    const originalText = btnText?.textContent || 'Generate';
    if (btnText) btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'flex';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-disabled', 'true');
    announceToScreenReader('Generating email batches, please wait');

    // Helper to update progress
    const updateProgress = (current, total) => {
      if (btnSpinner) {
        const progressText = btnSpinner.querySelector('.progress-text');
        if (progressText) {
          progressText.textContent = `${current}/${total}`;
        }
      }
    };

    try {
      // Generate batches
      const batches = [];
      for (let i = 0; i < validEmails.length; i += batchSize) {
        batches.push(validEmails.slice(i, i + batchSize));
      }

      // Get download format preference
      const downloadFormat =
        document.querySelector('input[name="downloadFormat"]:checked')?.value ||
        'individual';

      // Get recommended file format based on OS
      const format = getRecommendedFormat();

      if (downloadFormat === 'zip') {
        // Create ZIP file with all EML files
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        updateProgress('Creating', batches.length);
        batches.forEach((batch, index) => {
          const emlContent = createBCCBatchEML(
            finalSubject,
            htmlContent,
            batch,
            promotionState.attachedPDFs || [],
            format,
            index + 1
          );
          zip.file(
            `batch-${index + 1}-of-${batches.length}.${format}`,
            emlContent.data
          );
        });
        updateProgress('Zipping', batches.length);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
          generateZipFilenameFromHTML(htmlContent) ||
          'promotion-email-batches.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(
          `Generated ZIP with ${batches.length} email batch(es)`,
          'success'
        );
        announceToScreenReader(`Generated ${batches.length} email batches`);
      } else {
        // Download individual files
        for (let i = 0; i < batches.length; i++) {
          updateProgress(i + 1, batches.length);
          const batch = batches[i];
          const emlContent = createBCCBatchEML(
            finalSubject,
            htmlContent,
            batch,
            promotionState.attachedPDFs || [],
            format,
            i + 1
          );

          const blob = new Blob([emlContent.data], {
            type: 'message/rfc822',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `batch-${i + 1}-of-${batches.length}.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Small delay between downloads to prevent browser issues
          if (i < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        showToast(
          `Downloaded ${batches.length} email batch file(s)`,
          'success'
        );
        announceToScreenReader(`Downloaded ${batches.length} email batches`);
      }
    } catch (error) {
      console.error('Error generating batches:', error);
      const errorMsg = error.message || 'Unknown error';
      showToast(`Failed to generate batches: ${errorMsg}`, 'error');
      announceToScreenReader('Batch generation failed');
    } finally {
      // Hide loading state and restore accessibility
      if (btnText) btnText.style.display = 'inline';
      if (btnSpinner) btnSpinner.style.display = 'none';
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-disabled');
    }
  }

  // Generate Batches button in output area
  const generateBatchesBtn = document.getElementById('generateBatchesBtn');
  if (generateBatchesBtn) {
    generateBatchesBtn.addEventListener('click', () =>
      handleGenerateBatches(generateBatchesBtn)
    );
  }

  // Bulk email list input - update stats and batch preview
  const bulkEmailList = document.getElementById('bulkEmailList');
  const recipientStats = document.getElementById('recipientStats');
  const batchSizeSelect = document.getElementById('batchSize');
  const batchPreview = document.getElementById('batchPreview');
  const invalidEmailsSection = document.getElementById('invalidEmailsSection');
  const invalidEmailsList = document.getElementById('invalidEmailsList');
  const toggleInvalidEmails = document.getElementById('toggleInvalidEmails');
  const clearRecipientsBtn = document.getElementById('clearRecipientsBtn');

  // Track duplicate count for display
  let lastDuplicateCount = 0;

  // Auto-save debounce timer
  let saveTimeout = null;

  function updateBatchStats(options = {}) {
    const rawEmails = bulkEmailList.value
      .split(/[\s,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Count duplicates before removing them
    const uniqueEmails = [...new Set(rawEmails)];
    const duplicateCount = rawEmails.length - uniqueEmails.length;
    lastDuplicateCount = duplicateCount;

    const emails = uniqueEmails;
    const validEmails = emails.filter(isValidEmail);
    const invalidEmails = emails.filter((e) => !isValidEmail(e));

    if (emails.length === 0) {
      recipientStats.innerHTML = '';
      bulkEmailList.classList.remove('has-invalid');
      if (batchPreview) {
        batchPreview.innerHTML =
          '<span class="batch-info-placeholder">Enter recipient emails above to see batch preview</span>';
      }
      if (invalidEmailsSection) invalidEmailsSection.style.display = 'none';
    } else {
      // Build stats HTML
      let statsHTML = `
        <span class="stat-valid">${validEmails.length} valid</span>
        ${invalidEmails.length > 0 ? `<span class="stat-invalid">${invalidEmails.length} invalid</span>` : ''}
        <span class="stat-total">Total: ${emails.length}</span>
      `;

      // Add duplicate warning if any
      if (duplicateCount > 0) {
        statsHTML += `
          <span class="duplicate-warning">
            ${warningIcon({ size: 14 })}
            ${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} removed
          </span>
        `;
      }

      recipientStats.innerHTML = statsHTML;

      // Show/hide invalid emails section and highlight textarea
      if (invalidEmails.length > 0) {
        bulkEmailList.classList.add('has-invalid');
        if (invalidEmailsSection && invalidEmailsList) {
          invalidEmailsSection.style.display = 'block';
          invalidEmailsList.innerHTML = invalidEmails.join('<br>');
        }
      } else {
        bulkEmailList.classList.remove('has-invalid');
        if (invalidEmailsSection) {
          invalidEmailsSection.style.display = 'none';
        }
      }

      // Update batch preview
      if (batchPreview && validEmails.length > 0) {
        const batchSize = parseInt(batchSizeSelect?.value || '500');
        const numBatches = Math.ceil(validEmails.length / batchSize);
        const lastBatchSize = validEmails.length % batchSize || batchSize;

        if (numBatches === 1) {
          batchPreview.innerHTML = `<span class="batch-info">Will generate 1 batch with ${validEmails.length} recipients</span>`;
        } else {
          batchPreview.innerHTML = `<span class="batch-info">Will generate ${numBatches} batches (last batch: ${lastBatchSize} recipients)</span>`;
        }
      } else if (batchPreview) {
        batchPreview.innerHTML =
          '<span class="batch-info-placeholder">Enter valid emails to see batch preview</span>';
      }
    }

    // Auto-save recipients to IndexedDB (debounced)
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        if (bulkEmailList.value.trim()) {
          await saveBulkEmailRecipientsToIndexedDB(bulkEmailList.value);
        }
      } catch (error) {
        console.warn('Failed to save recipients:', error);
      }
    }, 1000);
  }

  // Toggle invalid emails visibility
  if (toggleInvalidEmails && invalidEmailsList) {
    toggleInvalidEmails.addEventListener('click', () => {
      const isHidden = invalidEmailsList.style.display === 'none';
      invalidEmailsList.style.display = isHidden ? 'block' : 'none';
      toggleInvalidEmails.textContent = isHidden ? 'Hide' : 'Show';
    });
  }

  // Clear recipients button
  if (clearRecipientsBtn && bulkEmailList) {
    clearRecipientsBtn.addEventListener('click', async () => {
      if (!bulkEmailList.value.trim()) return;

      const confirmed = await showConfirmDialog(
        'Clear all recipient email addresses?',
        { title: 'Clear Recipients', okText: 'Clear', cancelText: 'Cancel' }
      );
      if (confirmed) {
        bulkEmailList.value = '';
        updateBatchStats();
        updateAllStatusDots();
        try {
          await clearBulkEmailRecipientsFromIndexedDB();
        } catch (error) {
          console.warn('Failed to clear saved recipients:', error);
        }
        showToast('Recipient list cleared');
      }
    });
  }

  // Paste detection with feedback
  if (bulkEmailList) {
    bulkEmailList.addEventListener('paste', (e) => {
      // Wait for paste to complete
      setTimeout(() => {
        const rawEmails = bulkEmailList.value
          .split(/[\s,;\n]+/)
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        const uniqueEmails = [...new Set(rawEmails)];
        const validCount = uniqueEmails.filter(isValidEmail).length;

        if (validCount >= 5) {
          // Show paste feedback for large pastes
          const feedback = document.createElement('div');
          feedback.className = 'paste-feedback';
          feedback.textContent = `Pasted ${validCount} valid email${validCount > 1 ? 's' : ''}`;
          document.body.appendChild(feedback);

          setTimeout(() => {
            feedback.remove();
          }, 2000);
        }

        updateBatchStats();
        updateAllStatusDots();
      }, 0);
    });
  }

  if (bulkEmailList && recipientStats) {
    bulkEmailList.addEventListener('input', () => {
      updateBatchStats();
      updateAllStatusDots();
    });
  }

  if (batchSizeSelect) {
    // Restore saved batch size
    const savedBatchSize = localStorage.getItem('bulkEmail.batchSize');
    if (savedBatchSize) {
      batchSizeSelect.value = savedBatchSize;
    }

    // Validate and clamp batch size on change
    batchSizeSelect.addEventListener('change', () => {
      let value = parseInt(batchSizeSelect.value) || 500;
      if (value < 50) value = 50;
      if (value > 1000) value = 1000;
      batchSizeSelect.value = value;
      localStorage.setItem('bulkEmail.batchSize', value);
      updateBatchStats();
    });
    // Also listen for input to update preview in real-time
    batchSizeSelect.addEventListener('input', () => updateBatchStats());

    // Custom arrow buttons
    const numberArrows = document.querySelectorAll(
      '.number-input-wrapper .number-arrow'
    );
    numberArrows.forEach((arrow) => {
      arrow.addEventListener('click', () => {
        const direction = arrow.dataset.direction;
        let value = parseInt(batchSizeSelect.value) || 500;
        const step = parseInt(batchSizeSelect.step) || 50;

        if (direction === 'up') {
          value = Math.min(value + step, 1000);
        } else {
          value = Math.max(value - step, 50);
        }

        batchSizeSelect.value = value;
        localStorage.setItem('bulkEmail.batchSize', value);
        updateBatchStats();
      });
    });
  }

  // Download format radio buttons - persist preference
  const downloadFormatRadios = document.querySelectorAll(
    'input[name="downloadFormat"]'
  );
  if (downloadFormatRadios.length > 0) {
    // Restore saved format
    const savedFormat = localStorage.getItem('bulkEmail.downloadFormat');
    if (savedFormat) {
      const savedRadio = document.querySelector(
        `input[name="downloadFormat"][value="${savedFormat}"]`
      );
      if (savedRadio) {
        savedRadio.checked = true;
      }
    }

    // Save on change
    downloadFormatRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        localStorage.setItem('bulkEmail.downloadFormat', radio.value);
      });
    });
  }

  // Restore recipients from IndexedDB on load
  // NOTE: IndexedDB is the single source of truth for recipient lists
  // (localStorage config restoration is skipped to avoid race conditions)
  (async () => {
    try {
      const savedRecipients = await getBulkEmailRecipientsFromIndexedDB();
      if (savedRecipients && bulkEmailList) {
        bulkEmailList.value = savedRecipients;
        updateBatchStats();
        updateAllStatusDots();
      }
    } catch (error) {
      console.warn('Failed to restore recipients:', error);
    }
  })();
}
