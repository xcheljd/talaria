/**
 * Promotion Email App - Main Entry Point
 * Initializes the standalone promotion email generator
 */

import {
  initIndexedDB,
  saveBulkEmailRecipientsToIndexedDB,
  getBulkEmailRecipientsFromIndexedDB,
  clearBulkEmailRecipientsFromIndexedDB,
} from './shared/db.js';
import { resetToDefaults } from './promotion-ui.js';
import { initTheme, toggleTheme } from './shared/theme.js';
import { initPageTransitions } from './shared/pageTransitions.js';
import { promotionState } from './promotion-state.js';
import {
  init as initPromotionUI,
  generatePromotionEmailHTML,
  showToast,
  getRecommendedFormat,
  updateHowToShopEmail,
  generateSubjectLines,
  updateLivePreview,
  writeEmptyStateToIframe,
} from './promotion-ui.js';
import {
  parseEmailList,
  isValidEmail,
  createBCCBatchEML,
  createEMLFile,
  generateZipFilenameFromHTML,
} from './shared/emailUtils.js';
import { appState } from './state.js';
import { warningIcon } from './shared/icons.js';
import { initColumnCollapse } from './promotion-column-collapse.js';

// Initialize the promotion app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Load user profile from localStorage
  const storedProfile = localStorage.getItem('userProfile');
  if (storedProfile) {
    try {
      const profile = JSON.parse(storedProfile);
      window.userProfile = profile;
      // Also set appState.userProfile so promotion-ui.js functions can access it
      appState.userProfile = profile;
    } catch (e) {
      console.warn('Failed to parse stored profile:', e);
    }
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

  // Update how to shop email when profile might have changed (e.g., user edited profile and returned)
  window.addEventListener('focus', () => {
    const storedProfile = localStorage.getItem('userProfile');
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        const currentEmail =
          profile?.storeEmail || 'store@citizenwatchgroup.com';
        const previousEmail =
          appState.userProfile?.storeEmail || 'store@citizenwatchgroup.com';
        if (currentEmail !== previousEmail) {
          appState.userProfile = profile;
          window.userProfile = profile;
          updateHowToShopEmail();
        }
      } catch (e) {
        console.warn('Failed to parse stored profile on focus:', e);
      }
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
        card.classList.toggle('collapsed');
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
      const emlContent = await createEMLFile(
        '', // fromName - empty for draft
        '', // fromEmail - empty for draft
        '', // to - empty
        '', // bcc - empty
        subject,
        htmlContent,
        promotionState.attachedPDFs || []
      );

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

    // Warn if no subject line selected
    if (!subject) {
      const proceed = confirm(
        'No subject line selected. The email will use "Weekly Promotion" as the default subject.\n\nContinue anyway?'
      );
      if (!proceed) return;
    }

    const finalSubject = subject || 'Weekly Promotion';

    // Show loading state
    const btnText = button.querySelector('.btn-text');
    const btnSpinner = button.querySelector('.btn-spinner');
    if (btnText) btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'flex';
    button.disabled = true;

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

        showToast(`Generated ZIP with ${batches.length} email batch(es)`);
      } else {
        // Download individual files
        for (let i = 0; i < batches.length; i++) {
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

        showToast(`Downloaded ${batches.length} email batch file(s)`);
      }
    } catch (error) {
      console.error('Error generating batches:', error);
      showToast('Error generating email batches');
    } finally {
      // Hide loading state
      if (btnText) btnText.style.display = 'inline';
      if (btnSpinner) btnSpinner.style.display = 'none';
      button.disabled = false;
    }
  }

  // Generate Batches button (duplicate in output area)
  const generateBatchesBtnDuplicate = document.getElementById(
    'generateBatchesBtnDuplicate'
  );
  if (generateBatchesBtnDuplicate) {
    generateBatchesBtnDuplicate.addEventListener('click', () =>
      handleGenerateBatches(generateBatchesBtnDuplicate)
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

      // Show/hide invalid emails section
      if (invalidEmailsSection && invalidEmailsList) {
        if (invalidEmails.length > 0) {
          invalidEmailsSection.style.display = 'block';
          invalidEmailsList.innerHTML = invalidEmails.join('<br>');
        } else {
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

      if (confirm('Clear all recipient email addresses?')) {
        bulkEmailList.value = '';
        updateBatchStats();
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
      }, 0);
    });
  }

  if (bulkEmailList && recipientStats) {
    bulkEmailList.addEventListener('input', () => updateBatchStats());
  }

  if (batchSizeSelect) {
    // Validate and clamp batch size on change
    batchSizeSelect.addEventListener('change', () => {
      let value = parseInt(batchSizeSelect.value) || 500;
      if (value < 50) value = 50;
      if (value > 1000) value = 1000;
      batchSizeSelect.value = value;
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
        updateBatchStats();
      });
    });
  }

  // Restore recipients from IndexedDB on load
  (async () => {
    try {
      const savedRecipients = await getBulkEmailRecipientsFromIndexedDB();
      if (savedRecipients && bulkEmailList) {
        bulkEmailList.value = savedRecipients;
        updateBatchStats();
      }
    } catch (error) {
      console.warn('Failed to restore recipients:', error);
    }
  })();
}
