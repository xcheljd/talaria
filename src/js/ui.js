// Constants
export const TOAST_DURATION_MS = 2500;

// Global variable for current template (used by modules)
export let currentTemplate = null;

// Global variables for app state (used by modules)
export let promotionEntries = [];
export let specialHours = [];
export let howToShopItems = [];
export let importantNotesItems = [];
export let attachedPDFs = [];
export let generatedSubjectLines = [];
export let selectedSubjectLine = null;
export let howToShopExpanded = false;
export let importantNotesExpanded = false;
export let entryCollapsedStates = {};
export let currentPreviewPDF = null;
export let currentBlobUrl = null;

export function setCurrentTemplate(template) {
  currentTemplate = template;
}

// Helper function to detect if content is HTML or plain text
export function isHTMLContent(text) {
  if (!text) return false;

  // Check for common HTML tags
  const htmlPattern =
    /<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i;
  return htmlPattern.test(text);
}

import {
  appState,
  captureState,
  restoreState,
  setUIUpdateCallbacks,
} from './state.js';
import {
  templates,
  templateHelp,
  fieldConfig,
  getFieldSuggestions,
  getStorePhone,
  getStoreName,
  getStoreLocation,
  getEmployeeSignature,
  convertTextToHTML,
  sanitizeHTML,
  escapeAttr,
} from './templates.js';
import {
  db,
  savePDFToIndexedDB,
  getPDFFromIndexedDB,
  deletePDFFromIndexedDB,
  clearAllPDFsFromIndexedDB,
  saveBulkEmailRecipientsToIndexedDB,
  getBulkEmailRecipientsFromIndexedDB,
} from './db.js';
import { toggleTheme, updateSelectArrows } from './theme.js';

// ===== PROMOTION EMAIL HELPER FUNCTIONS =====

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

// Update live preview
export function updateLivePreview() {
  if (currentTemplate !== 'promotion-email') return;

  const dateRangeInput = getDynamicElement('promoDateRange');
  const yearInput = getDynamicElement('promoYear');
  const titleInput = getDynamicElement('promoTitle');

  // Only update if we have at least a date range
  if (!dateRangeInput || !dateRangeInput.value.trim()) {
    return;
  }

  const data = {
    promoDateRange: dateRangeInput.value,
    promoYear: yearInput ? yearInput.value : '',
    promoTitle: titleInput ? titleInput.value : '',
  };

  const htmlCode = generatePromotionEmailHTML(data);

  // Update code textarea
  const codeArea = getDynamicElement('codeArea');
  if (codeArea) {
    codeArea.value = htmlCode;
  }

  // Update preview iframe
  const previewIframe = getDynamicElement('previewIframe');
  if (previewIframe) {
    const iframeDoc =
      previewIframe.contentDocument || previewIframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlCode);
    iframeDoc.close();
  }
}

// Create debounced version for typing
const debouncedLivePreview = debounce(updateLivePreview, 500);

// Debounced subject preview update (300ms delay to avoid excessive updates)
const debouncedSubjectPreviewUpdate = debounce(updateSubjectInPreview, 300);

// Create debounced version for state capture (after user stops typing)
const debouncedCaptureState = debounce(captureState, 1000);

export const elements = {};

export function cacheElements() {
  // Main form elements
  elements.templateSelect = document.getElementById('templateSelect');
  elements.formFields = document.getElementById('formFields');
  elements.formSectionTitle = document.getElementById('formSectionTitle');
  elements.outputCard = document.getElementById('outputCard');
  elements.outputArea = document.getElementById('outputArea');

  // Buttons
  elements.generateBtn = document.getElementById('generateBtn');
  elements.clearBtn = document.getElementById('clearBtn');
  elements.copyBtn = document.getElementById('copyBtn');
  elements.sendEmailBtn = document.getElementById('sendEmailBtn');
  elements.downloadEmailBtn = document.getElementById('downloadEmailBtn');
  elements.undoBtn = document.getElementById('undoBtn');
  elements.redoBtn = document.getElementById('redoBtn');
  elements.themeToggle = document.getElementById('themeToggle');

  // Search elements
  elements.searchBox = document.getElementById('searchBox');
  elements.clearSearch = document.getElementById('clearSearch');
  elements.searchResults = document.getElementById('searchResults');
  elements.resultCounter = document.getElementById('resultCounter');

  // Template management
  elements.saveTemplateBtn = document.getElementById('saveTemplateBtn');
  elements.exportTemplateBtn = document.getElementById('exportTemplateBtn');
  elements.importTemplateBtn = document.getElementById('importTemplateBtn');
}

export function getDynamicElement(id) {
  return document.getElementById(id);
}

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

export function updateUndoRedoButtons() {
  if (elements.undoBtn) {
    elements.undoBtn.disabled = appState.historyIndex <= 0;
  }
  if (elements.redoBtn) {
    elements.redoBtn.disabled =
      appState.historyIndex >= appState.historyStack.length - 1;
  }
}

export function undo() {
  if (appState.historyIndex > 0) {
    appState.historyIndex--;
    restoreState(appState.historyStack[appState.historyIndex]);
    updateUndoRedoButtons();
  }
}

export function redo() {
  if (appState.historyIndex < appState.historyStack.length - 1) {
    appState.historyIndex++;
    restoreState(appState.historyStack[appState.historyIndex]);
    updateUndoRedoButtons();
  }
}

export function showTabbedOutput() {
  if (!elements.outputCard) return;

  // Clear dynamic element cache before rebuilding DOM
  // This prevents stale references after innerHTML replacement
  elements.bulkEmailList = null;
  elements.bulkAnalysis = null;
  elements.bulkStats = null;
  elements.batchSize = null;
  elements.batchSizeHelp = null;
  elements.codeArea = null;
  elements.previewIframe = null;
  elements.previewContent = null;
  elements.codeContent = null;
  elements.copyPreviewBtn = null;
  elements.openEmailBtn = null;

  elements.outputCard.innerHTML = `
        <h2 class="section-title">Generated Email</h2>

        <!-- Bulk Email Distribution Section -->
        <div id="bulkEmailSection" style="margin-bottom: 2rem; padding: 1.5rem; background: var(--bg-tertiary); border-radius: var(--radius-md); border: 2px solid var(--border-subtle);">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                    <path d="M2 6l10 8 10-8"></path>
                    <line x1="2" y1="18" x2="22" y2="18"></line>
                </svg>
                Bulk Email Distribution
            </h3>
            <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">Send this promotion to multiple recipients in BCC batches</div>

            <div style="margin-bottom: 1rem;">
                <label for="bulkEmailList" style="display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 6h13"></path>
                        <path d="M8 12h13"></path>
                        <path d="M8 18h13"></path>
                        <path d="M3 6h.01"></path>
                        <path d="M3 12h.01"></path>
                        <path d="M3 18h.01"></path>
                    </svg>
                    Recipient Email List
                </label>
                <textarea id="bulkEmailList" placeholder="Paste emails here (comma or line separated)&#10;&#10;Example:&#10;customer1@example.com, customer2@example.com&#10;customer3@example.com" rows="4" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border-subtle); background: var(--bg-secondary); color: var(--text-primary); border-radius: var(--radius-sm); font-family: inherit; resize: vertical;"></textarea>
                <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">One email per line or separated by commas. Duplicates will be automatically removed.</div>
            </div>

            <div style="margin-bottom: 1rem;">
                <label for="batchSize" style="display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <rect x="7" y="7" width="10" height="4"></rect>
                        <rect x="7" y="13" width="6" height="4"></rect>
                    </svg>
                    Batch Size
                </label>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <input type="number" id="batchSize" value="500" min="50" max="1000" step="50" style="width: 100px; padding: 0.5rem; border: 2px solid var(--border-subtle); background: var(--bg-secondary); color: var(--text-primary); border-radius: var(--radius-sm); font-family: inherit;">
                    <span style="color: var(--text-secondary);">emails per file</span>
                </div>
                <div id="batchSizeHelp" style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">Range: 50-1000 emails. 500 is recommended for spam safety.</div>
            </div>



            <div style="margin-bottom: 1rem;">
                <label style="display: block; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Format
                </label>
                <div class="radio-group" style="display: flex; gap: 1rem; align-items: center;">
                    <div class="radio-option">
                        <input type="radio" id="formatIndividual" name="downloadFormat" value="individual" checked>
                        <label for="formatIndividual" style="font-size: 0.9rem;">Individual Email Files (recommended)</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="formatZip" name="downloadFormat" value="zip">
                        <label for="formatZip" style="font-size: 0.9rem;">ZIP Archive (may trigger antivirus on Windows)</label>
                    </div>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                    <strong>Recommended:</strong> Individual email files work with all Outlook versions. Format is automatically optimized for your platform.
                </div>
            </div>

            <div id="formatStatus" style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem;">
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    Email Format Status
                </div>
                <div id="formatStatusText" style="font-size: 0.9rem; color: var(--text-secondary);">Checking MSG library availability...</div>
            </div>

            <div id="bulkAnalysis" style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; display: none;">
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                    </svg>
                    Batch Analysis
                </div>
                <div id="bulkStats" style="font-size: 0.9rem; color: var(--text-secondary);"></div>
            </div>
        </div>

        <!-- Subject Lines Section -->
        <div id="subjectLinesSection" style="margin-bottom: 1.5rem;">
            <div style="margin-bottom: 1rem;">
                <h3 style="margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    Subject Line
                </h3>
            </div>
            <div id="subjectLinesContainer" class="subject-lines-container"></div>
        </div>

        <div class="output-tabs">
            <button class="output-tab active" data-tab="preview">Preview</button>
            <button class="output-tab" data-tab="code">HTML Code</button>
        </div>

        <div class="output-content active" id="previewContent">
            <iframe class="preview-iframe" id="previewIframe"></iframe>
        </div>

        <div class="output-content" id="codeContent">
            <textarea class="output-textarea" id="codeArea" placeholder="HTML code will appear here..."></textarea>
        </div>

        <div class="button-group">
            <button class="btn" id="copyPreviewBtn">Copy HTML Code</button>
            <button class="btn" id="openEmailBtn">Download Email File & Open w/ Outlook</button>
            <button class="btn" id="generateBulkBtn">Generate BCC Batch Email Files</button>
        </div>
    `;

  // Add tab switching
  const tabs = elements.outputCard.querySelectorAll('.output-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update active tab
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active content
      elements.outputCard
        .querySelectorAll('.output-content')
        .forEach((content) => {
          content.classList.remove('active');
        });

      if (targetTab === 'preview') {
        document.getElementById('previewContent').classList.add('active');
      } else {
        document.getElementById('codeContent').classList.add('active');
      }
    });
  });

  // Add copy button handler
  const copyBtn = document.getElementById('copyPreviewBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const codeArea = getDynamicElement('codeArea');
      if (codeArea && codeArea.value) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(codeArea.value)
            .then(() => {
              showToast('✓ HTML Code Copied!');
            })
            .catch(() => {
              showToast('⚠ Copy failed');
            });
        } else {
          codeArea.select();
          document.execCommand('copy');
          showToast('✓ HTML Code Copied!');
        }
      } else {
        showToast('⚠ Nothing to copy');
      }
    });
  }

  // Add openEmailBtn handler
  const openEmailBtn = getDynamicElement('openEmailBtn');
  if (openEmailBtn) {
    openEmailBtn.addEventListener('click', openInEmailClient);
  }

  // Bulk email event listeners
  const bulkEmailList = document.getElementById('bulkEmailList');
  const batchSizeInput = document.getElementById('batchSize');
  const generateBulkBtn = document.getElementById('generateBulkBtn');

  if (bulkEmailList) {
    bulkEmailList.addEventListener('input', updateBulkAnalysis);
  }

  if (batchSizeInput) {
    batchSizeInput.addEventListener('input', () => {
      validateBatchSize();
      updateBulkAnalysis();
    });
  }

  if (generateBulkBtn) {
    generateBulkBtn.addEventListener('click', generateBulkEmailFiles);
  }

  // Render subject lines if they exist
  renderSubjectLines();

  // Update format status after library has time to load
  setTimeout(updateFormatStatus, 2000);
}

export function showRegularOutput() {
  if (!elements.outputCard) return;

  // Clear dynamic element cache before rebuilding DOM
  elements.outputArea = null;
  elements.copyBtn = null;
  elements.subjectLineContainer = null;
  elements.sendEmailBtn = null;
  elements.downloadEmailBtn = null;

  // Clear tab-related elements
  elements.previewTab = null;
  elements.htmlTab = null;
  elements.previewContentRegular = null;
  elements.htmlContentRegular = null;
  elements.emailPreview = null;

  // Check if current template has enhanced features
  const template = templates[currentTemplate];
  const hasEnhancedFeatures = template && template.hasEditableSubject;

  let subjectLineSection = '';
  let buttonGroup = '';

  if (hasEnhancedFeatures) {
    // Enhanced templates get subject line editing and dual email options
    subjectLineSection = `
            <div id="subjectLineContainer" class="subject-line-section" style="margin-bottom: 1.5rem;">
                <div id="subjectLineContent"></div>
            </div>
        `;

    buttonGroup = `
            <div class="button-group">
                <button class="btn" id="copyBtn" title="Copy the message to clipboard">Copy Message</button>
                <button class="btn" id="sendEmailBtn" title="Open your default email client with this message">Send Email</button>
                <button class="btn" id="downloadEmailBtn" title="Download an Outlook-compatible EML file">Download Email File</button>
            </div>
        `;
  } else {
    // Simple templates keep the original single button
    buttonGroup = `
            <div class="button-group">
                <button class="btn" id="copyBtn">Copy Message</button>
            </div>
        `;
  }

  elements.outputCard.innerHTML = `
        <h2 class="section-title">Generated Message</h2>
        ${subjectLineSection}

        <!-- Output Tabs -->
        <div class="output-tabs">
            <button class="output-tab active" data-tab="preview" title="Preview how the email looks in an email client">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Preview
            </button>
            <button class="output-tab" data-tab="html" title="View the raw HTML code">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                HTML
            </button>
        </div>

        <!-- Preview Tab Content -->
        <div class="output-content active" id="previewContent">
            <iframe class="email-preview" id="emailPreview" title="Email preview"></iframe>
        </div>

        <!-- HTML Tab Content -->
        <div class="output-content" id="htmlContent">
            <textarea class="output-textarea" id="outputArea" placeholder="Your generated message will appear here..." aria-label="Generated message output"></textarea>
        </div>

        ${buttonGroup}
    `;

  // Re-cache the output area and tab elements
  elements.outputArea = document.getElementById('outputArea');
  elements.copyBtn = document.getElementById('copyBtn');
  elements.previewTab = document.querySelector(
    '.output-tab[data-tab="preview"]'
  );
  elements.htmlTab = document.querySelector('.output-tab[data-tab="html"]');
  elements.previewContentRegular = document.getElementById('previewContent');
  elements.htmlContentRegular = document.getElementById('htmlContent');
  elements.emailPreview = document.getElementById('emailPreview');

  // Set initial empty state to prevent white flash (using document.write for synchronous rendering)
  if (elements.emailPreview) {
    writeEmptyStateToIframe(elements.emailPreview);
  }

  // Re-attach copy button handler
  if (elements.copyBtn) {
    elements.copyBtn.addEventListener('click', copyToClipboard);
  }

  // Add tab switching functionality
  if (elements.previewTab && elements.htmlTab) {
    // Preview tab click handler
    elements.previewTab.addEventListener('click', () => {
      // Activate preview tab
      elements.previewTab.classList.add('active');
      elements.htmlTab.classList.remove('active');

      // Show preview content
      if (elements.previewContentRegular) {
        elements.previewContentRegular.classList.add('active');
      }
      if (elements.htmlContentRegular) {
        elements.htmlContentRegular.classList.remove('active');
      }

      // Restore original plain text output (if it was converted to HTML)
      if (elements.outputArea && window.originalMessageContent) {
        elements.outputArea.value = window.originalMessageContent;
      }

      // Update preview iframe
      updateEmailPreview();
    });

    // HTML tab click handler
    elements.htmlTab.addEventListener('click', () => {
      // Activate HTML tab
      elements.htmlTab.classList.add('active');
      elements.previewTab.classList.remove('active');

      // Show HTML content
      if (elements.htmlContentRegular) {
        elements.htmlContentRegular.classList.add('active');
      }
      if (elements.previewContentRegular) {
        elements.previewContentRegular.classList.remove('active');
      }

      // Convert plain text output to HTML and display it
      if (elements.outputArea) {
        const plainTextContent = elements.outputArea.value;
        if (plainTextContent) {
          // Extract subject and body
          let subject = 'Email';
          let plainTextBody = plainTextContent;
          const subjectMatch = plainTextContent.match(/^Subject:\s*(.+)/m);
          if (subjectMatch) {
            subject = subjectMatch[1];
            plainTextBody = plainTextContent
              .replace(/^Subject:.+\n/m, '')
              .trim();
          }

          // Remove signature from plain text
          let bodyWithoutSig = plainTextBody;
          const bestRegardsMatch = plainTextBody.match(/\n\nBest regards,/);
          if (bestRegardsMatch) {
            bodyWithoutSig = plainTextBody
              .substring(0, bestRegardsMatch.index + bestRegardsMatch[0].length)
              .trim();
          }

          // Convert body to HTML
          const htmlBody = plainTextToPreviewHTML(bodyWithoutSig);

          // Get HTML signature
          const htmlSignature = getEmployeeSignature('html');

          // Create complete HTML document
          const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0); margin: 0; padding: 20px; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto;">
        <div style="padding: 10px; background-color: #f5f5f5; border-bottom: 2px solid #ddd; margin-bottom: 20px;">
            <div style="font-size: 14pt; font-weight: 600; color: #333;">${escapeHtml(subject)}</div>
        </div>
        <div>
            ${htmlBody}
            <div style="margin-top: 5px; padding-top: 10px;">
                ${htmlSignature}
            </div>
        </div>
    </div>
</body>
</html>`;

          // Display in textarea with syntax highlighting (show raw HTML)
          elements.outputArea.value = htmlDocument;
        }
      }
    });
  }

  // Add enhanced feature handlers if applicable
  if (hasEnhancedFeatures) {
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const downloadEmailBtn = document.getElementById('downloadEmailBtn');

    if (sendEmailBtn) {
      sendEmailBtn.addEventListener('click', () => {
        // Get fresh reference to outputArea
        const outputArea = document.getElementById('outputArea');
        const content = outputArea ? outputArea.value : '';
        if (content) {
          openEmailClientUniversal(currentTemplate, content);
        }
      });
    }

    if (downloadEmailBtn) {
      downloadEmailBtn.addEventListener('click', () => {
        // Use original message content for EML (preserves formatting)
        // or fallback to textarea content if original not available
        const outputArea = document.getElementById('outputArea');
        const content =
          window.originalMessageContent || (outputArea ? outputArea.value : '');
        if (content) {
          downloadEmailFile(currentTemplate, content);
        }
      });
    }

    // Render editable subject line
    const subjectLineContent = document.getElementById('subjectLineContent');
    if (subjectLineContent) {
      renderEditableSubjectLine(subjectLineContent, '');
    }
  }
}

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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <h3>No Preview Yet</h3>
                <p>Fill in the form and click Generate to see your email preview</p>
            </div>
        </body>
        </html>
    `);
  iframeDoc.close();
}

/**
 * Wrap HTML content in proper email preview template
 * @param {string} htmlContent - HTML email body content
 * @returns {string} Complete HTML document for preview
 */
export function wrapHtmlForEmailPreview(htmlContent) {
  // Try to extract subject from original message or content
  let subject = 'Email Preview';
  let bodyContent = htmlContent;

  // Extract subject if present
  if (window.originalMessageContent) {
    const subjectMatch =
      window.originalMessageContent.match(/^Subject:\s*(.+)/m);
    if (subjectMatch) {
      subject = subjectMatch[1];
      bodyContent = window.originalMessageContent
        .replace(/^Subject:.+\n/m, '')
        .trim();
    }
  } else {
    const subjectMatch = htmlContent.match(/^Subject:\s*(.+)/m);
    if (subjectMatch) {
      subject = subjectMatch[1];
      bodyContent = htmlContent.replace(/^Subject:.+\n/m, '').trim();
    }
  }

  // Create proper HTML email template
  const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
    <style>
        body {
            font-family: Aptos, Arial, Helvetica, sans-serif;
            font-size: 12pt;
            color: rgb(0, 0, 0);
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        .email-header {
            padding: 10px;
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
            margin-bottom: 20px;
        }
        .email-subject {
            font-size: 14pt;
            font-weight: 600;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="email-subject">${escapeHtml(subject)}</div>
        </div>
        <div class="email-body">
            ${bodyContent}
        </div>
    </div>
</body>
</html>`;

  return template;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Update subject line in preview iframe when subject is edited
 * @param {string} newSubject - The new subject line text
 */
export function updateSubjectInPreview(newSubject) {
  try {
    // Update the preview iframe if it exists and has content
    const emailPreview = document.getElementById('emailPreview');
    if (!emailPreview || !emailPreview.srcdoc) return;

    // Get the current srcdoc content
    const currentDoc = emailPreview.srcdoc;

    // Update the subject in the email header (in the preview template)
    const subjectRegex = /<div class="email-subject">.*?<\/div>/;
    const newSubjectHTML = `<div class="email-subject">${escapeHtml(newSubject)}</div>`;
    const updatedDoc = currentDoc.replace(subjectRegex, newSubjectHTML);

    // Also update the title tag
    const titleRegex = /<title>.*?<\/title>/;
    const newTitleHTML = `<title>${escapeHtml(newSubject)}</title>`;
    const finalDoc = updatedDoc.replace(titleRegex, newTitleHTML);

    // Update the iframe
    emailPreview.srcdoc = finalDoc;
  } catch (error) {
    console.error('Error updating subject in preview:', error);
    // Silent failure - subject still updates in window.currentSubjectLine
  }
}

// Save promotion template configuration to localStorage
export async function savePromotionTemplate() {
  if (currentTemplate !== 'promotion-email') return;

  // Collapse all entries before saving
  promotionEntries.forEach((entry) => {
    entryCollapsedStates[entry.id] = true;
  });
  renderPromotionEntries(); // Update the UI to show collapsed state

  // Ensure all PDFs with data are saved to IndexedDB
  if (attachedPDFs.length > 0 && db) {
    for (const pdf of attachedPDFs) {
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

  const config = {
    // Metadata
    templateType: 'promotion-email',
    version: '1.0',
    savedAt: new Date().toISOString(),

    // Form fields
    dateRange: getDynamicElement('promoDateRange')?.value || '',
    year: getDynamicElement('promoYear')?.value || '',
    title: getDynamicElement('promoTitle')?.value || '',

    // Data arrays
    promotionEntries: JSON.parse(JSON.stringify(promotionEntries)),
    specialHours: JSON.parse(JSON.stringify(specialHours)),
    howToShopItems: JSON.parse(JSON.stringify(howToShopItems)),
    importantNotesItems: JSON.parse(JSON.stringify(importantNotesItems)),
    // Save only PDF metadata to localStorage (actual data is in IndexedDB)
    attachedPDFs: JSON.parse(
      JSON.stringify(
        attachedPDFs.map((pdf) => ({
          id: pdf.id,
          name: pdf.name,
          size: pdf.size,
          type: pdf.type,
          // Note: 'data' field is intentionally excluded - stored in IndexedDB instead
        }))
      )
    ),
    generatedSubjectLines: JSON.parse(JSON.stringify(generatedSubjectLines)),
    selectedSubjectLine: selectedSubjectLine,
  };

  localStorage.setItem('savedPromotionTemplate', JSON.stringify(config));
  showToast('✓ Template saved successfully');
}

// Import promotion template - supports both localStorage and file selection
export function importPromotionTemplate() {
  if (currentTemplate !== 'promotion-email') return;

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
export async function applyImportedConfig(config, collapseEntries = true) {
  if (!config || typeof config !== 'object') {
    showToast('✗ Invalid template data - not an object');
    return;
  }

  // Check template type if present (backwards compatible)
  if (config.templateType && config.templateType !== 'promotion-email') {
    showToast('✗ Invalid template data - wrong template type');
    return;
  }

  // Validate and normalize required array fields (with backwards compatibility)
  if (!Array.isArray(config.promotionEntries)) {
    if (config.promotionEntries !== undefined) {
      showToast('✗ Invalid template data - promotionEntries must be an array');
      return;
    }
    config.promotionEntries = [];
  }
  if (!Array.isArray(config.specialHours)) {
    if (config.specialHours !== undefined) {
      showToast('✗ Invalid template data - specialHours must be an array');
      return;
    }
    config.specialHours = [];
  }
  if (!Array.isArray(config.howToShopItems)) {
    if (config.howToShopItems !== undefined) {
      showToast('✗ Invalid template data - howToShopItems must be an array');
      return;
    }
    config.howToShopItems = [];
  }
  if (!Array.isArray(config.importantNotesItems)) {
    if (config.importantNotesItems !== undefined) {
      showToast(
        '✗ Invalid template data - importantNotesItems must be an array'
      );
      return;
    }
    config.importantNotesItems = [];
  }
  // Attach PDFs and subject lines default to empty arrays if missing (backwards compatible)
  if (!Array.isArray(config.attachedPDFs)) {
    config.attachedPDFs = [];
  }
  if (!Array.isArray(config.generatedSubjectLines)) {
    config.generatedSubjectLines = [];
  }

  // Restore form fields (with delay to ensure DOM is ready)
  setTimeout(() => {
    const dateRangeInput = getDynamicElement('promoDateRange');
    const yearInput = getDynamicElement('promoYear');
    const titleInput = getDynamicElement('promoTitle');

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
  }, 100);

  // Restore arrays
  promotionEntries = JSON.parse(JSON.stringify(config.promotionEntries || []));
  specialHours = JSON.parse(JSON.stringify(config.specialHours || []));
  howToShopItems = JSON.parse(JSON.stringify(config.howToShopItems || []));
  importantNotesItems = JSON.parse(
    JSON.stringify(config.importantNotesItems || [])
  );
  generatedSubjectLines = JSON.parse(
    JSON.stringify(config.generatedSubjectLines || [])
  );
  selectedSubjectLine = config.selectedSubjectLine || null;

  // Restore PDFs: merge metadata from config with data from IndexedDB
  // Clear existing PDFs to prevent duplicates
  const existingPdfIds = new Set(attachedPDFs.map((p) => p.id));
  attachedPDFs = [];
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
      attachedPDFs.push(metadata);
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
          attachedPDFs.push(fullPdfData);
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
  attachedPDFs = attachedPDFs.filter((pdf) => pdf.data);

  // Set collapse state for all entries
  if (collapseEntries) {
    // When importing, collapse all entries by default
    entryCollapsedStates = {};
    promotionEntries.forEach((entry) => {
      entryCollapsedStates[entry.id] = true;
    });
  }

  // Re-render all sections
  renderPromotionEntries();
  renderSpecialHours();
  renderHowToShopSection();
  renderImportantNotesSection();
  renderAttachedPDFs();
  renderSubjectLines();

  // If loading saved state with content, allow preview to show
  // No longer need promotionGenerateClicked flag

  // Update live preview and capture state
  updateLivePreview();
  captureState();
}

// Import from localStorage (for backwards compatibility)
export function importFromLocalStorage() {
  if (currentTemplate !== 'promotion-email') return;

  try {
    const saved = localStorage.getItem('savedPromotionTemplate');
    if (!saved) {
      showToast('⚠ No saved template found in browser storage');
      return;
    }

    const config = JSON.parse(saved);
    applyImportedConfig(config, true); // true = collapse entries on import
    showToast('✓ Template imported from browser storage');
  } catch (e) {
    console.error('Import error:', e);
    showToast('✗ Error importing from browser storage');
  }
}

// Export promotion template configuration as JSON file
export function exportPromotionTemplate() {
  if (currentTemplate !== 'promotion-email') return;

  const config = {
    // Metadata
    templateType: 'promotion-email',
    version: '1.0',
    exportedAt: new Date().toISOString(),

    // Form fields
    dateRange: getDynamicElement('promoDateRange')?.value || '',
    year: getDynamicElement('promoYear')?.value || '',
    title: getDynamicElement('promoTitle')?.value || '',

    // Data arrays
    promotionEntries: JSON.parse(JSON.stringify(promotionEntries)),
    specialHours: JSON.parse(JSON.stringify(specialHours)),
    howToShopItems: JSON.parse(JSON.stringify(howToShopItems)),
    importantNotesItems: JSON.parse(JSON.stringify(importantNotesItems)),
    attachedPDFs: JSON.parse(JSON.stringify(attachedPDFs)),
    generatedSubjectLines: JSON.parse(JSON.stringify(generatedSubjectLines)),
    selectedSubjectLine: selectedSubjectLine,
  };

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

// OS detection for format selection
export function detectOS() {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('win')) return 'windows';
  if (platform.includes('mac')) return 'mac';
  return 'other';
}

export function getRecommendedFormat() {
  const os = detectOS();
  return os === 'mac' ? 'emltpl' : 'eml';
}

// Load user profile from localStorage
export function loadUserProfile() {
  try {
    const data = localStorage.getItem('userProfile');
    if (data) {
      appState.userProfile = JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading user profile:', e);
  }
}

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

// Add a new promotion entry
export function addPromotionEntry() {
  const entryId = Date.now();
  promotionEntries.push({
    id: entryId,
    brand: '',
    discount: '',
    collections: '',
    callout: '',
  });
  renderPromotionEntries();

  captureState();
}

// Remove a promotion entry
export function removePromotionEntry(entryId) {
  promotionEntries = promotionEntries.filter((entry) => entry.id !== entryId);
  renderPromotionEntries();
  captureState();
}

// Generic helper function to move items in an array
function moveItemInArray(array, itemId, direction, idKey = 'id') {
  const index = array.findIndex((item) => item[idKey] === itemId);
  if (direction === 'up' && index > 0) {
    [array[index - 1], array[index]] = [array[index], array[index - 1]];
    return true;
  }
  if (direction === 'down' && index < array.length - 1) {
    [array[index], array[index + 1]] = [array[index + 1], array[index]];
    return true;
  }
  return false;
}

// Move promotion entry up
export function movePromotionEntryUp(entryId) {
  if (moveItemInArray(promotionEntries, entryId, 'up')) {
    renderPromotionEntries();
    captureState();
  }
}

// Move promotion entry down
export function movePromotionEntryDown(entryId) {
  if (moveItemInArray(promotionEntries, entryId, 'down')) {
    renderPromotionEntries();
    captureState();
  }
}

// Add a new special hour row
export function addSpecialHour() {
  const hourId = Date.now();
  specialHours.push({
    id: hourId,
    day: '',
    hours: '',
  });
  renderSpecialHours();
  captureState();
}

// Remove a special hour row
export function removeSpecialHour(hourId) {
  specialHours = specialHours.filter((hour) => hour.id !== hourId);
  renderSpecialHours();
  captureState();
}

// Move special hour up
export function moveSpecialHourUp(hourId) {
  if (moveItemInArray(specialHours, hourId, 'up')) {
    renderSpecialHours();
    captureState();
  }
}

// Move special hour down
export function moveSpecialHourDown(hourId) {
  if (moveItemInArray(specialHours, hourId, 'down')) {
    renderSpecialHours();
    captureState();
  }
}

// How to Shop functions
export function addHowToShopItem() {
  const itemId = Date.now();
  howToShopItems.push({ id: itemId, text: '' });
  renderHowToShopSection();
  captureState();
}

export function removeHowToShopItem(itemId) {
  howToShopItems = howToShopItems.filter((item) => item.id !== itemId);
  renderHowToShopSection();
  captureState();
}

export function moveHowToShopItemUp(itemId) {
  if (moveItemInArray(howToShopItems, itemId, 'up')) {
    renderHowToShopSection();
    captureState();
  }
}

export function moveHowToShopItemDown(itemId) {
  if (moveItemInArray(howToShopItems, itemId, 'down')) {
    renderHowToShopSection();
    captureState();
  }
}

// Important Notes functions
export function addImportantNotesItem() {
  const itemId = Date.now();
  importantNotesItems.push({ id: itemId, text: '' });
  renderImportantNotesSection();
  captureState();
}

export function removeImportantNotesItem(itemId) {
  importantNotesItems = importantNotesItems.filter(
    (item) => item.id !== itemId
  );
  renderImportantNotesSection();
  captureState();
}

export function moveImportantNotesItemUp(itemId) {
  if (moveItemInArray(importantNotesItems, itemId, 'up')) {
    renderImportantNotesSection();
    captureState();
  }
}

export function moveImportantNotesItemDown(itemId) {
  if (moveItemInArray(importantNotesItems, itemId, 'down')) {
    renderImportantNotesSection();
    captureState();
  }
}

// Toggle functions for collapsible sections
export function toggleHowToShop() {
  howToShopExpanded = !howToShopExpanded;
  renderHowToShopSection();
}

export function toggleImportantNotes() {
  importantNotesExpanded = !importantNotesExpanded;
  renderImportantNotesSection();
}

export function toggleEntryCollapse(entryId) {
  entryCollapsedStates[entryId] = !entryCollapsedStates[entryId];
  renderPromotionEntries();
}

// Drag-and-drop setup for reordering items
export function setupDragAndDrop(
  container,
  itemsArray,
  renderFunction,
  selector = '.editable-item-row'
) {
  const rows = container.querySelectorAll(selector);
  let draggedElement = null;
  let draggedItemId = null;

  rows.forEach((row) => {
    // Drag start
    row.addEventListener('dragstart', (e) => {
      draggedElement = row;
      // Try both data-item-id and data-entry-id
      draggedItemId = parseInt(row.dataset.itemId || row.dataset.entryId);
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    // Drag end
    row.addEventListener('dragend', (e) => {
      row.classList.remove('dragging');
      rows.forEach((r) => r.classList.remove('drag-over'));
    });

    // Drag over
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (draggedElement !== row) {
        row.classList.add('drag-over');
      }
    });

    // Drag leave
    row.addEventListener('dragleave', (e) => {
      row.classList.remove('drag-over');
    });

    // Drop
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');

      if (draggedElement !== row) {
        // Try both data-item-id and data-entry-id
        const targetItemId = parseInt(
          row.dataset.itemId || row.dataset.entryId
        );

        // Find indices
        const draggedIndex = itemsArray.findIndex(
          (item) => item.id === draggedItemId
        );
        const targetIndex = itemsArray.findIndex(
          (item) => item.id === targetItemId
        );

        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Reorder array
          const [removed] = itemsArray.splice(draggedIndex, 1);
          itemsArray.splice(targetIndex, 0, removed);

          // Re-render
          renderFunction();
          captureState();
        }
      }
    });
  });
}

// Render all promotion entries
export function renderPromotionEntries() {
  const container = document.getElementById('promotionEntriesContainer');
  if (!container) return;

  container.innerHTML = promotionEntries
    .map((entry, index) => {
      const safeId = escapeAttr(String(entry.id));
      const isFirst = index === 0;
      const isLast = index === promotionEntries.length - 1;
      const isCollapsed = entryCollapsedStates[entry.id] || false;

      // Build summary text for collapsed state
      let summaryText = '';
      if (entry.brand && entry.discount) {
        summaryText = `${entry.brand} - ${entry.discount}% OFF`;
      } else {
        summaryText = 'Entry not filled out';
      }

      return `
            <div class="promotion-entry ${isCollapsed ? 'collapsed' : ''}" data-entry-id="${safeId}" draggable="true">
                <div class="entry-header">
                    <div class="entry-header-left">
                        <div class="drag-handle" title="Drag to reorder">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="4" cy="3" r="1.5"/>
                                <circle cx="4" cy="8" r="1.5"/>
                                <circle cx="4" cy="13" r="1.5"/>
                                <circle cx="12" cy="3" r="1.5"/>
                                <circle cx="12" cy="8" r="1.5"/>
                                <circle cx="12" cy="13" r="1.5"/>
                            </svg>
                        </div>
                        <button type="button" class="order-btn" data-action="move-up" data-entry-id="${entry.id}" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button type="button" class="order-btn" data-action="move-down" data-entry-id="${entry.id}" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>
                        <span class="entry-number">Entry ${index + 1}</span>
                        ${isCollapsed ? `<span class="entry-summary">${summaryText}</span>` : ''}
                    </div>
                    <div class="entry-controls">
                        <button type="button" class="collapse-btn" data-action="toggle-collapse" data-entry-id="${entry.id}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                            ${isCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                        <button type="button" class="entry-remove-btn" data-action="remove" data-entry-id="${entry.id}" title="Remove">×</button>
                    </div>
                </div>

                <div class="entry-fields" style="display: ${isCollapsed ? 'none' : 'grid'};">
                    <div class="form-group">
                        <label class="form-label" for="entry-${safeId}-brand">Brand *</label>
                        <select class="form-input entry-brand" id="entry-${safeId}-brand" name="entry-${safeId}-brand" data-entry-id="${safeId}">
                            <option value="">Select brand...</option>
                            <option value="Citizen" ${entry.brand === 'Citizen' ? 'selected' : ''}>Citizen</option>
                            <option value="Bulova" ${entry.brand === 'Bulova' ? 'selected' : ''}>Bulova</option>
                            <option value="Alpina" ${entry.brand === 'Alpina' ? 'selected' : ''}>Alpina</option>
                            <option value="Frederique Constant" ${entry.brand === 'Frederique Constant' ? 'selected' : ''}>Frederique Constant</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="entry-${safeId}-discount">Discount % *</label>
                        <div class="input-wrapper">
                            <input type="text" class="form-input entry-discount" id="entry-${safeId}-discount" name="entry-${safeId}-discount" data-entry-id="${safeId}" value="${escapeAttr(entry.discount)}" placeholder="60">
                            <button class="clear-input" data-clear="entry-${safeId}-discount" title="Clear">×</button>
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
    .querySelectorAll(
      '.entry-brand, .entry-discount, .entry-collections, .entry-callout'
    )
    .forEach((input) => {
      input.addEventListener('input', (e) => {
        updateEntryData(e);
        debouncedLivePreview();
        debouncedCaptureState(); // Capture after user stops typing
      });
      input.addEventListener('change', (e) => {
        updateEntryData(e);
        updateLivePreview(); // Immediate update for dropdowns
        captureState(); // Capture immediately on dropdown change
      });
    });

  // Add drag-and-drop functionality for reordering entries
  setupDragAndDrop(
    container,
    promotionEntries,
    renderPromotionEntries,
    '.promotion-entry'
  );

  // Attach event listeners for promotion entry buttons
  container.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const entryId = parseInt(e.target.dataset.entryId);

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
  container.querySelectorAll('.clear-input').forEach((clearBtn) => {
    const fieldId = clearBtn.dataset.clear;
    const input = document.getElementById(fieldId);

    if (input) {
      // Show/hide clear button based on input value
      const updateClearVisibility = () => {
        clearBtn.classList.toggle('visible', input.value.trim().length > 0);
      };

      // Initialize visibility
      updateClearVisibility();

      // Update on input
      input.addEventListener('input', updateClearVisibility);

      // Clear button click handler
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.remove('visible');
        input.focus();
        // Trigger the existing input event to update entry data and preview
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  });

  // Update preview after rendering entries
  updateLivePreview();
}

// Update entry data from inputs
export function updateEntryData(e) {
  const entryId = parseInt(e.target.dataset.entryId);
  const entry = promotionEntries.find((t) => t.id === entryId);
  if (!entry) return;

  if (e.target.classList.contains('entry-brand')) {
    entry.brand = e.target.value;
  } else if (e.target.classList.contains('entry-discount')) {
    entry.discount = e.target.value;
  } else if (e.target.classList.contains('entry-collections')) {
    entry.collections = e.target.value;
  } else if (e.target.classList.contains('entry-callout')) {
    entry.callout = e.target.value;
  }
}

// Render all special hours
export function renderSpecialHours() {
  const container = document.getElementById('specialHoursContainer');
  if (!container) return;

  container.innerHTML = specialHours
    .map((hour, index) => {
      const safeId = escapeAttr(String(hour.id));
      const isFirst = index === 0;
      const isLast = index === specialHours.length - 1;

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
                        <button type="button" class="order-btn" data-action="move-hour-up" data-hour-id="${hour.id}" title="Move up" ${isFirst ? 'disabled' : ''}>▲</button>
                        <button type="button" class="order-btn" data-action="move-hour-down" data-hour-id="${hour.id}" title="Move down" ${isLast ? 'disabled' : ''}>▼</button>
                        <button type="button" class="hour-remove-btn" data-action="remove-hour" data-hour-id="${hour.id}" title="Remove">×</button>
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
        const action = e.target.dataset.action;
        const hourId = parseInt(e.target.dataset.hourId);

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
  container.querySelectorAll('.clear-input').forEach((clearBtn) => {
    const fieldId = clearBtn.dataset.clear;
    const input = document.getElementById(fieldId);

    if (input) {
      // Show/hide clear button based on input value
      const updateClearVisibility = () => {
        clearBtn.classList.toggle('visible', input.value.trim().length > 0);
      };

      // Initialize visibility
      updateClearVisibility();

      // Update on input
      input.addEventListener('input', updateClearVisibility);

      // Clear button click handler
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.remove('visible');
        input.focus();
        // Trigger the existing input event to update hour data and preview
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  });

  // Update preview after rendering hours
  updateLivePreview();

  // Show/hide reminder based on special hours
  const reminder = document.getElementById('specialHoursReminder');
  if (reminder) {
    reminder.style.display = specialHours.length > 0 ? 'block' : 'none';
  }
}

// Update special hour data from inputs
export function updateSpecialHourData(e) {
  const hourId = parseInt(e.target.dataset.hourId);
  const hour = specialHours.find((h) => h.id === hourId);
  if (!hour) return;

  if (e.target.classList.contains('hour-day')) {
    hour.day = e.target.value;
  } else if (e.target.classList.contains('hour-hours')) {
    hour.hours = e.target.value;
  }
}

// Render How to Shop items (called when expanded)
function renderHowToShopItems() {
  const container = document.getElementById('howToShopItemsContainer');
  if (!container) return;

  container.innerHTML = howToShopItems
    .map((item, index) => {
      const safeId = escapeAttr(String(item.id));

      return `
            <div class="editable-item-row" data-item-id="${safeId}" draggable="true">
                <div class="editable-item-fields">
                    <div class="drag-handle" title="Drag to reorder">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="4" cy="3" r="1.5"/>
                            <circle cx="4" cy="8" r="1.5"/>
                            <circle cx="4" cy="13" r="1.5"/>
                            <circle cx="12" cy="3" r="1.5"/>
                            <circle cx="12" cy="8" r="1.5"/>
                            <circle cx="12" cy="13" r="1.5"/>
                        </svg>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input shop-item-text" id="shop-item-${safeId}-text" name="shop-item-${safeId}-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., Visit us in-store for outlet-exclusive deals">
                            <button class="clear-input" data-clear="shop-item-${safeId}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button type="button" class="item-remove-btn" data-action="remove-how-to-shop-item" data-item-id="${item.id}" title="Remove">×</button>
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
      const item = howToShopItems.find((i) => i.id === itemId);
      if (item) {
        item.text = e.target.value;
        debouncedLivePreview();
        debouncedCaptureState(); // Capture after user stops typing
      }
    });
  });

  // Add drag-and-drop functionality
  setupDragAndDrop(container, howToShopItems, renderHowToShopSection);

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
        const itemId = parseInt(e.target.dataset.itemId);
        removeHowToShopItem(itemId);
      });
    });

  // Attach event listeners for clear buttons in How to Shop items
  container.querySelectorAll('.clear-input').forEach((clearBtn) => {
    const fieldId = clearBtn.dataset.clear;
    const input = document.getElementById(fieldId);

    if (input) {
      // Show/hide clear button based on input value
      const updateClearVisibility = () => {
        clearBtn.classList.toggle('visible', input.value.trim().length > 0);
      };

      // Initialize visibility
      updateClearVisibility();

      // Update on input
      input.addEventListener('input', updateClearVisibility);

      // Clear button click handler
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.remove('visible');
        input.focus();
        // Trigger the existing input event to update item data and preview
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  });
}

// Render How to Shop section (wrapper with expand/collapse)
export function renderHowToShopSection() {
  const wrapper = document.getElementById('howToShopWrapper');
  if (!wrapper) return;

  if (!howToShopExpanded) {
    // Collapsed state - show summary
    const itemCount = howToShopItems.filter(
      (item) => item.text && item.text.trim()
    ).length;
    wrapper.innerHTML = `
            <div class="collapsible-section-header" data-action="toggle-how-to-shop">
                <span class="section-label">How to Shop (${itemCount} items)</span>
                <button type="button" class="edit-section-btn">Expand</button>
            </div>
        `;
  } else {
    // Expanded state - show all items
    wrapper.innerHTML = `
            <div class="collapsible-section-header expanded" data-action="toggle-how-to-shop">
                <span class="section-label">How to Shop</span>
                <button type="button" class="edit-section-btn">Collapse</button>
            </div>
            <div class="collapsible-section-content">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button type="button" class="btn" data-action="add-how-to-shop-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
                </div>
                <div id="howToShopItemsContainer"></div>
            </div>
        `;
    // Render the items
    renderHowToShopItems();
  }

  // Attach event listener for toggle button
  const header = wrapper.querySelector('[data-action="toggle-how-to-shop"]');
  if (header) {
    header.addEventListener('click', toggleHowToShop);
  }
}

// Render Important Notes items (called when expanded)
function renderImportantNotesItems() {
  const container = document.getElementById('importantNotesItemsContainer');
  if (!container) return;

  container.innerHTML = importantNotesItems
    .map((item, index) => {
      const safeId = escapeAttr(String(item.id));

      return `
            <div class="editable-item-row" data-item-id="${safeId}" draggable="true">
                <div class="editable-item-fields">
                    <div class="drag-handle" title="Drag to reorder">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="4" cy="3" r="1.5"/>
                            <circle cx="4" cy="8" r="1.5"/>
                            <circle cx="4" cy="13" r="1.5"/>
                            <circle cx="12" cy="3" r="1.5"/>
                            <circle cx="12" cy="8" r="1.5"/>
                            <circle cx="12" cy="13" r="1.5"/>
                        </svg>
                    </div>
                    <div class="form-group">
                        <div class="input-wrapper">
                            <input type="text" class="form-input important-notes-item-text" id="important-notes-item-${safeId}-text" name="important-notes-item-${safeId}-text" data-item-id="${safeId}" value="${escapeAttr(item.text)}" placeholder="e.g., Important safety information or key details">
                            <button class="clear-input" data-clear="important-notes-item-${safeId}-text" title="Clear">×</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button type="button" class="item-remove-btn" data-action="remove-important-notes-item" data-item-id="${item.id}" title="Remove">×</button>
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
      const item = importantNotesItems.find((i) => i.id === itemId);
      if (item) {
        item.text = e.target.value;
        debouncedLivePreview();
        debouncedCaptureState(); // Capture after user stops typing
      }
    });
  });

  // Add drag-and-drop functionality
  setupDragAndDrop(container, importantNotesItems, renderImportantNotesSection);

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
        const itemId = parseInt(e.target.dataset.itemId);
        removeImportantNotesItem(itemId);
      });
    });

  // Attach event listeners for clear buttons in Important Notes items
  container.querySelectorAll('.clear-input').forEach((clearBtn) => {
    const fieldId = clearBtn.dataset.clear;
    const input = document.getElementById(fieldId);

    if (input) {
      // Show/hide clear button based on input value
      const updateClearVisibility = () => {
        clearBtn.classList.toggle('visible', input.value.trim().length > 0);
      };

      // Initialize visibility
      updateClearVisibility();

      // Update on input
      input.addEventListener('input', updateClearVisibility);

      // Clear button click handler
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.classList.remove('visible');
        input.focus();
        // Trigger the existing input event to update item data and preview
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  });
}

// Render Important Notes section (wrapper with expand/collapse)
export function renderImportantNotesSection() {
  const wrapper = document.getElementById('importantNotesWrapper');
  if (!wrapper) return;

  if (!importantNotesExpanded) {
    // Collapsed state - show summary
    const itemCount = importantNotesItems.filter(
      (item) => item.text && item.text.trim()
    ).length;
    wrapper.innerHTML = `
            <div class="collapsible-section-header" data-action="toggle-important-notes">
                <span class="section-label">Important Notes (${itemCount} items)</span>
                <button type="button" class="edit-section-btn">Expand</button>
            </div>
        `;
  } else {
    // Expanded state - show all items
    wrapper.innerHTML = `
            <div class="collapsible-section-header expanded" data-action="toggle-important-notes">
                <span class="section-label">Important Notes</span>
                <button type="button" class="edit-section-btn">Collapse</button>
            </div>
            <div class="collapsible-section-content">
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button type="button" class="btn" data-action="add-important-notes-item" style="padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Item</button>
                </div>
                <div id="importantNotesItemsContainer"></div>
            </div>
        `;
    // Render the items
    renderImportantNotesItems();
  }

  // Attach event listener for toggle button
  const header = wrapper.querySelector(
    '[data-action="toggle-important-notes"]'
  );
  if (header) {
    header.addEventListener('click', toggleImportantNotes);
  }
}

// Initialize default How to Shop and Important Notes items
export function initializeDefaultItems() {
  if (howToShopItems.length === 0) {
    const storePhone = getStorePhone();
    const storeEmail =
      appState.userProfile && appState.userProfile.storeEmail
        ? appState.userProfile.storeEmail
        : 'store@citizenwatchgroup.com';

    howToShopItems = [
      {
        id: Date.now() + 1,
        text: 'Visit us in-store for outlet-exclusive deals',
      },
      { id: Date.now() + 2, text: `Call ${storePhone} for availability` },
      { id: Date.now() + 3, text: '$20 flat-rate ground shipping in US' },
      { id: Date.now() + 4, text: `Email ${storeEmail}` },
    ];
  }

  if (importantNotesItems.length === 0) {
    importantNotesItems = [
      { id: Date.now() + 10, text: '*Select models only' },
      {
        id: Date.now() + 11,
        text: 'See attached PDF for complete model details',
      },
      {
        id: Date.now() + 12,
        text: 'Limited availability - while supplies last',
      },
      { id: Date.now() + 13, text: 'Email response time up to 48 hours' },
    ];

    // Add store directions if available
    if (appState.userProfile && appState.userProfile.storeDirections) {
      importantNotesItems.push({
        id: Date.now() + 14,
        text: `Find us at ${appState.userProfile.storeDirections}`,
      });
    }
  }
}

// Flag to prevent duplicate renders
let isRenderingPromotionForm = false;

// Render the promotion email form
export function renderPromotionEmailForm() {
  // Prevent duplicate renders
  if (isRenderingPromotionForm) {
    return;
  }

  isRenderingPromotionForm = true;

  // Check if there's a saved template in localStorage
  const savedTemplate = localStorage.getItem('savedPromotionTemplate');

  if (savedTemplate) {
    // Load saved template automatically
    try {
      const config = JSON.parse(savedTemplate);
      // Don't reset arrays - we'll populate from saved data
      promotionEntries = [];
      specialHours = [];
      howToShopItems = [];
      importantNotesItems = [];
      attachedPDFs = [];
      generatedSubjectLines = [];
      selectedSubjectLine = null;
    } catch (e) {
      // If parsing fails, fall back to defaults
      console.error('Error loading saved template:', e);
      promotionEntries = [];
      specialHours = [];
      howToShopItems = [];
      importantNotesItems = [];
      attachedPDFs = [];
      generatedSubjectLines = [];
      selectedSubjectLine = null;
      initializeDefaultItems();
    }
  } else {
    // No saved template - initialize defaults
    promotionEntries = [];
    specialHours = [];
    howToShopItems = [];
    importantNotesItems = [];
    attachedPDFs = [];
    generatedSubjectLines = [];
    selectedSubjectLine = null;
    initializeDefaultItems();
  }

  // Update section header to include undo/redo buttons
  const existingTitle = elements.formSectionTitle;

  // Create new header structure
  const headerContainer = document.createElement('div');
  headerContainer.className = 'section-header-with-controls';
  headerContainer.innerHTML = `
        <h2 class="section-title" style="margin-bottom: 0;">Promotion Email (HTML) Fields</h2>
        <div class="section-header-controls">
            <button type="button" class="undo-redo-btn" id="undoBtn" title="Undo (Ctrl+Z)" disabled>
                <span>↶ Undo</span>
            </button>
            <button type="button" class="undo-redo-btn" id="redoBtn" title="Redo (Ctrl+Y)" disabled>
                <span>↷ Redo</span>
            </button>
        </div>
    `;

  // Replace existing title
  existingTitle.replaceWith(headerContainer);

  // Update reference to new h2 element for future template switches
  elements.formSectionTitle = headerContainer.querySelector('h2');

  elements.formFields.innerHTML = `
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



        <div class="form-group full-width" style="margin-top: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <label class="form-label" style="margin-bottom: 0;">Discount Entries</label>
                <button type="button" class="btn" id="addEntryBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Entry</button>
            </div>
            <div id="promotionEntriesContainer"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 1.25rem;">
            <div id="howToShopWrapper"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 0.75rem;">
            <div id="importantNotesWrapper"></div>
        </div>

        <div class="form-group full-width" style="margin-top: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <label class="form-label" style="margin-bottom: 0;">Special Hours (optional)</label>
                <button type="button" class="btn" id="addHourBtn" style="flex: 0 0 auto; padding: 0.5rem 1rem; font-size: 0.75rem;">+ Add Special Hours</button>
            </div>
            <div class="field-help" style="margin-bottom: 0.75rem;">For holidays or special sale hours (e.g., Black Friday extended hours)</div>
            <div id="specialHoursContainer"></div>
            <div id="specialHoursReminder" style="display: none; background: #fff3cd; border-left: 3px solid #ffc107; padding: 1rem; margin-top: 1rem;">
                <strong>⚠️ Reminder:</strong> Don't forget to update your special hours on Yelp and Google Maps!
            </div>
        </div>

        <div class="form-group full-width" style="margin-top: 1.25rem;">
            <label class="form-label">ATTACHMENTS (OPTIONAL)</label>
            <div class="field-help" style="margin-bottom: 0.75rem;">Upload PDF files to attach to your promotional email (max 10MB per file)</div>
            <div class="pdf-upload-section">
                <div class="pdf-upload-dropzone" id="pdfDropzone">
                    <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" multiple style="display: none;">
                    <div class="dropzone-content">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p class="dropzone-text">Click to upload or drag and drop PDF files</p>
                        <p class="dropzone-hint">Maximum 10MB per file</p>
                    </div>
                </div>
                <div id="attachedPDFsList" class="attached-pdfs-list"></div>
            </div>
        </div>

        </div>

        <div class="template-actions-container">
            <div class="template-actions">
            <button type="button" class="template-action-btn" id="saveTemplateBtn" title="Save current configuration">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Template
            </button>
            <button type="button" class="template-action-btn" id="importTemplateBtn" title="Import saved configuration">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Import Template
            </button>
            <button type="button" class="template-action-btn" id="exportTemplateBtn" title="Export configuration as JSON">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Export Template
            </button>
        </div>
    `;

  // Add event listeners
  const dateRangeInput = getDynamicElement('promoDateRange');
  const yearInput = getDynamicElement('promoYear');
  const titleInput = getDynamicElement('promoTitle');

  // Bulk email event listeners are now set up in showTabbedOutput()

  // Date range input listener
  if (dateRangeInput) {
    dateRangeInput.addEventListener('input', () => {
      const clearBtn = document.querySelector('[data-clear="promoDateRange"]');
      if (clearBtn) {
        clearBtn.classList.toggle(
          'visible',
          dateRangeInput.value.trim().length > 0
        );
      }
      debouncedLivePreview(); // Update preview as user types
    });

    // Clear button
    const clearDateBtn = document.querySelector(
      '[data-clear="promoDateRange"]'
    );
    if (clearDateBtn) {
      clearDateBtn.addEventListener('click', () => {
        dateRangeInput.value = '';
        clearDateBtn.classList.remove('visible');
        dateRangeInput.focus();
        updateLivePreview();
      });
    }
  }

  // Year input listener
  if (yearInput) {
    yearInput.addEventListener('input', () => {
      const clearBtn = document.querySelector('[data-clear="promoYear"]');
      if (clearBtn) {
        clearBtn.classList.toggle('visible', yearInput.value.trim().length > 0);
      }
      debouncedLivePreview(); // Update preview as user types
    });

    // Clear button
    const clearYearBtn = document.querySelector('[data-clear="promoYear"]');
    if (clearYearBtn) {
      clearYearBtn.addEventListener('click', () => {
        yearInput.value = '';
        clearYearBtn.classList.remove('visible');
        yearInput.focus();
        updateLivePreview();
      });
    }
  }

  // Title input listener
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      const clearBtn = document.querySelector('[data-clear="promoTitle"]');
      if (clearBtn) {
        clearBtn.classList.toggle(
          'visible',
          titleInput.value.trim().length > 0
        );
      }
      debouncedLivePreview(); // Update preview as user types
    });

    // Clear button
    const clearTitleBtn = document.querySelector('[data-clear="promoTitle"]');
    if (clearTitleBtn) {
      clearTitleBtn.addEventListener('click', () => {
        titleInput.value = '';
        clearTitleBtn.classList.remove('visible');
        titleInput.focus();
        updateLivePreview();
      });
    }
  }

  // Add entry button
  const addEntryBtn = document.getElementById('addEntryBtn');
  if (addEntryBtn) {
    addEntryBtn.addEventListener('click', addPromotionEntry);
  }

  // Add special hour button
  const addHourBtn = document.getElementById('addHourBtn');
  if (addHourBtn) {
    addHourBtn.addEventListener('click', addSpecialHour);
  }

  // Load saved template if available, otherwise add initial entry
  if (savedTemplate) {
    try {
      const config = JSON.parse(savedTemplate);
      applyImportedConfig(config, false); // false = don't collapse on auto-load
    } catch (e) {
      console.error('Error applying saved template:', e);
      addPromotionEntry();
      renderHowToShopSection();
      renderImportantNotesSection();
    }
  } else {
    // No saved template - add initial entry
    addPromotionEntry();
    renderHowToShopSection();
    renderImportantNotesSection();
  }

  // Wire up undo/redo buttons
  const undoBtn = elements.undoBtn;
  const redoBtn = elements.redoBtn;

  if (undoBtn) {
    undoBtn.addEventListener('click', undo);
  }
  if (redoBtn) {
    redoBtn.addEventListener('click', redo);
  }

  // Wire up save/import/export buttons
  const saveTemplateBtn = document.getElementById('saveTemplateBtn');
  const importTemplateBtn = document.getElementById('importTemplateBtn');
  const exportTemplateBtn = document.getElementById('exportTemplateBtn');

  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener('click', savePromotionTemplate);
  }
  if (importTemplateBtn) {
    importTemplateBtn.addEventListener('click', importPromotionTemplate);
  }
  if (exportTemplateBtn) {
    exportTemplateBtn.addEventListener('click', exportPromotionTemplate);
  }

  // Wire up PDF upload
  const pdfDropzone = document.getElementById('pdfDropzone');
  const pdfFileInput = document.getElementById('pdfFileInput');

  if (pdfDropzone && pdfFileInput) {
    // Click to upload
    pdfDropzone.addEventListener('click', () => {
      pdfFileInput.click();
    });

    // File input change
    pdfFileInput.addEventListener('change', handlePDFUpload);

    // Drag and drop events
    pdfDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pdfDropzone.classList.add('dragover');
    });

    pdfDropzone.addEventListener('dragleave', () => {
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
        showToast('⚠ Please drop only PDF files');
      }
    });
  }

  // Render PDF list
  renderAttachedPDFs();

  // Add keyboard shortcuts
  document.addEventListener('keydown', handleUndoRedoShortcuts);

  // Note: Bulk email event listeners are set up in showTabbedOutput() after elements are created

  // Capture initial state
  captureState();

  // Reset the rendering flag
  isRenderingPromotionForm = false;
}

// Handle PDF file upload from input
export function handlePDFUpload(e) {
  const files = Array.from(e.target.files);
  handlePDFFiles(files);
  e.target.value = ''; // Reset input to allow re-uploading same file
}

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
    if (attachedPDFs.some((pdf) => pdf.name === file.name)) {
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
      attachedPDFs.push(pdfData);

      renderAttachedPDFs();
      debouncedCaptureState();

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

  if (attachedPDFs.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = attachedPDFs
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <text x="12" y="17" font-size="6" text-anchor="middle" fill="currentColor">PDF</text>
                    </svg>
                </div>
                <div class="pdf-info">
                    <div class="pdf-name ${clickableClass}"
                         title="${titleText}"
                         ${hasData ? 'data-action="preview-pdf" data-pdf-id="' + pdf.id + '" role="button" tabindex="0"' : ''}>
                        ${pdf.name}${warningIcon}
                    </div>
                    <div class="pdf-size">${displaySize}</div>
                </div>
                <button class="pdf-remove-btn" data-action="remove-pdf" data-pdf-id="${pdf.id}" title="Remove PDF">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
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
  const pdf = attachedPDFs.find((p) => p.id === pdfId);
  if (!pdf) return;

  // Delete from IndexedDB
  try {
    await deletePDFFromIndexedDB(pdfId);
  } catch (error) {
    console.warn('Failed to delete PDF from IndexedDB:', error);
  }

  attachedPDFs = attachedPDFs.filter((p) => p.id !== pdfId);
  renderAttachedPDFs();
  debouncedCaptureState();
  showToast(`✓ ${pdf.name} removed`);
}

// ===== PDF Preview Modal Functions =====

// Preview PDF in modal
export function previewPDF(pdfId) {
  const pdf = attachedPDFs.find((p) => p.id === pdfId);
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

// Render subject lines
export function renderSubjectLines() {
  const container = document.getElementById('subjectLinesContainer');
  if (!container) return;

  if (generatedSubjectLines.length === 0) {
    container.innerHTML =
      '<div class="subject-lines-empty">Generate your email template first to create subject line suggestions</div>';
    return;
  }

  // Preserve user's current edit if the input exists
  const existingInput = document.getElementById('selectedSubjectInput');
  const currentUserEdit = existingInput ? existingInput.value : null;

  // Use the user's edit if it exists, otherwise use selectedSubjectLine
  const displayValue =
    currentUserEdit !== null ? currentUserEdit : selectedSubjectLine || '';

  // Create dropdown with generated subject lines
  const dropdownOptions = generatedSubjectLines
    .map((subject, index) => {
      const isSelected = subject === selectedSubjectLine;
      return `<option value="${index}" ${isSelected ? 'selected' : ''}>${escapeHtml(subject)}</option>`;
    })
    .join('');

  container.innerHTML = `
        <div class="subject-line-dropdown-wrapper">
            <label class="subject-dropdown-label" for="subjectLineDropdown">Choose a subject line suggestion:</label>
            <select id="subjectLineDropdown" class="subject-line-dropdown">
                <option value="" disabled ${!selectedSubjectLine ? 'selected' : ''}>Select a subject line...</option>
                ${dropdownOptions}
            </select>
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
      if (index >= 0 && index < generatedSubjectLines.length) {
        selectSubjectLine(index);
      }
    });
  }

  // Add event listener to input field
  const input = document.getElementById('selectedSubjectInput');
  if (input) {
    input.addEventListener('input', (e) => {
      selectedSubjectLine = e.target.value;

      // Update character count
      const charCount = document.getElementById('subjectCharCount');
      if (charCount) {
        const length = e.target.value.length;
        const isOptimal = length <= 50;
        charCount.className = `char-count ${isOptimal ? 'optimal' : 'warning'}`;
        charCount.textContent = `${length} chars ${isOptimal ? '✓' : '(>50)'}`;
      }

      captureState();
    });
  }
}

// Generate subject lines based on promotion entries
export function generateSubjectLines() {
  const dateRange = getDynamicElement('promoDateRange')?.value || '';
  const brands = [
    ...new Set(promotionEntries.map((e) => e.brand).filter(Boolean)),
  ];
  const maxDiscount = Math.max(
    ...promotionEntries.map((e) => parseInt(e.discount) || 0)
  );

  let subjects = [];

  // Basic subject
  if (dateRange) {
    subjects.push(`Sale This Week: ${dateRange}`);
  }

  // Brand-focused subjects
  if (brands.length > 0) {
    if (brands.length === 1) {
      subjects.push(`${brands[0]} Sale: Up to ${maxDiscount}% OFF`);
    } else {
      subjects.push(
        `${brands.slice(0, 2).join(' & ')} Sale: Up to ${maxDiscount}% OFF`
      );
    }
  }

  // Discount-focused subject
  if (maxDiscount > 0) {
    subjects.push(`Save Up to ${maxDiscount}% on Your Favorite Brands`);
  }

  // Generic but enticing
  subjects.push('Exclusive Deals Inside - Do not Miss Out!');

  // Add store name for personalization
  const storeName = getStoreName();
  if (storeName) {
    subjects = subjects.map((s) => `${s} at ${storeName}`);
  }

  generatedSubjectLines = [...new Set(subjects)]; // Remove duplicates
  selectedSubjectLine = generatedSubjectLines[0] || null; // Select first one by default
  renderSubjectLines();
  captureState();
}

// Select a subject line
export function selectSubjectLine(index) {
  if (index >= 0 && index < generatedSubjectLines.length) {
    selectedSubjectLine = generatedSubjectLines[index];

    // Show the card
    const card = document.getElementById('selectedSubjectCard');
    if (card) {
      card.style.display = 'block';
    }

    // Update input value
    const input = document.getElementById('selectedSubjectInput');
    if (input) {
      input.value = selectedSubjectLine;
    }

    // Update character count
    const charCount = document.getElementById('subjectCharCount');
    if (charCount) {
      const length = selectedSubjectLine.length;
      const isOptimal = length <= 50;
      charCount.className = `char-count ${isOptimal ? 'optimal' : 'warning'}`;
      charCount.textContent = `${length} chars ${isOptimal ? '✓' : '(>50)'}`;
    }

    captureState();
  }
}

// Handle undo/redo shortcuts
export function handleUndoRedoShortcuts(e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }
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

  // Build brand sections from entries
  let brandSections = '';
  promotionEntries.forEach((entry) => {
    if (!entry.brand || !entry.discount) return; // Skip incomplete entries

    let collectionsHTML = '';
    if (entry.collections && entry.collections.trim()) {
      const collections = entry.collections
        .split(',')
        .map((c) => escapeHtml(c.trim()))
        .filter((c) => c);
      collectionsHTML = collections.map((c) => `*${c}`).join(' • ');
    }

    brandSections += `
                <p style="font-size: 18px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-bottom: 8px;"><b>${escapeHtml(entry.brand)} - ${escapeHtml(entry.discount)}% OFF</b></p>`;

    if (collectionsHTML) {
      brandSections += `
                <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin-left: 20px; margin-top: 0; margin-bottom: ${entry.callout ? '5px' : '20px'};">
                    ${escapeHtml(collectionsHTML)}
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
  let storeEmail = storePhone.replace(/\D/g, '');
  let storeHours = 'Mon–Sat: 10AM–8PM | Sun: 10AM–7PM';

  // Override with user profile data if available
  if (appState.userProfile) {
    if (appState.userProfile.storeEmail) {
      storeEmail = appState.userProfile.storeEmail;
    } else if (appState.userProfile.storeName) {
      const emailPrefix = appState.userProfile.storeName
        .toLowerCase()
        .replace(/\s+/g, '');
      storeEmail = `${emailPrefix}@citizenwatchgroup.com`;
    }
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
  let howToShopHTML = howToShopItems
    .filter((item) => item.text && item.text.trim())
    .map((item) => `• ${escapeHtml(item.text)}`)
    .join('<br>\n                    ');

  // Build Important Notes section from array
  let importantNotesHTML = importantNotesItems
    .filter((item) => item.text && item.text.trim())
    .map((item) => `• ${escapeHtml(item.text)}`)
    .join('<br>\n                    ');

  return `<!DOCTYPE html>
<html>
<head>
    <title>Weekly Sale</title>
</head>
<body style="font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 14px; background-color: white; margin: 0; padding: 0;">

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
                <div style="background-color: #f5f5f5; padding: 15px; margin-bottom: 20px;">
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0 0 10px 0;"><b>HOW TO SHOP</b></p>
                    <p style="font-size: 14px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    ${howToShopHTML}</p>
                </div>

                <!-- IMPORTANT NOTES BOX -->
                <div style="border: 1px solid #ddd; padding: 15px;">
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
                  specialHours.length > 0
                    ? `
                <p style="color: #ffd700; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; font-size: 13px; margin: 10px 0 0 0;">
                    <b>SPECIAL HOURS</b><br>
                    ${specialHours
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
                <p style="font-size: 12px; font-family: 'Aptos Display', 'Segoe UI', Arial, sans-serif; margin: 0;">
                    No longer interested? Simply reply to this email with <b>"UNSUBSCRIBE"</b>
                </p>
            </td>
        </tr>

    </table>
    </center>

</body>
</html>`;
}

// Attach event listeners to form fields
export function attachEventListeners() {
  // Template selector
  elements.templateSelect.addEventListener('change', () => {
    selectTemplate(elements.templateSelect.value);
  });

  // Generate button
  elements.generateBtn.addEventListener('click', generateMessage);

  // Clear button
  elements.clearBtn.addEventListener('click', clearAll);

  // Theme toggle
  elements.themeToggle.addEventListener('click', toggleTheme);

  // Search box
  elements.searchBox.addEventListener('input', () => {
    const query = elements.searchBox.value.trim();
    elements.clearSearch.classList.toggle('visible', query.length > 0);
    renderSearchResults(query);
  });

  // Clear search button
  elements.clearSearch.addEventListener('click', () => {
    elements.searchBox.value = '';
    elements.clearSearch.classList.remove('visible');
    renderSearchResults('');
  });

  // Close search dropdown when clicking outside
  const searchContainer = document.querySelector('.search-container');
  document.addEventListener('click', (e) => {
    if (
      searchContainer &&
      !searchContainer.contains(e.target) &&
      elements.searchResults
    ) {
      elements.searchResults.classList.remove('visible');
    }
  });

  // Handle search result clicks via event delegation
  if (elements.searchResults) {
    elements.searchResults.addEventListener('click', (e) => {
      const resultItem = e.target.closest('.search-result-item');
      if (resultItem && resultItem.dataset.templateKey) {
        const templateKey = resultItem.dataset.templateKey;
        selectTemplate(templateKey);
        elements.searchResults.classList.remove('visible');
        elements.searchBox.value = '';
        elements.clearSearch.classList.remove('visible');
        // Blur search box after template selection (with slight delay to ensure it takes effect)
        setTimeout(() => {
          elements.searchBox.blur();
        }, 100);
      }
    });
  }

  // Initial call to update select arrows
  updateSelectArrows();
}

// Update calculated fields based on user input
export function updateCalculatedFields(fieldId, value) {
  const template = templates[currentTemplate];
  if (!template || !template.calculatedFields) return;

  template.calculatedFields.forEach((calc) => {
    if (calc.basedOn === fieldId) {
      const targetInput = getDynamicElement(calc.id);
      if (targetInput) {
        const newValue = calc.calculate(value);
        targetInput.value = newValue;
        validateField(targetInput); // Validate the new value
      }
    }
  });
}

// Validate a single field
export function validateField(input) {
  const fieldId = input.id;
  const template = templates[currentTemplate];
  if (!template) return;

  const field = template.fields.find((f) => f.id === fieldId);
  if (!field || !field.validation) return;

  const { pattern, message } = field.validation;
  const isValid = pattern.test(input.value);

  input.classList.toggle('invalid', !isValid);

  // Show/hide validation message
  let validationMsg = input.nextElementSibling;
  if (!validationMsg || !validationMsg.classList.contains('validation-msg')) {
    validationMsg = document.createElement('div');
    validationMsg.className = 'validation-msg';
    input.parentNode.insertBefore(validationMsg, input.nextSibling);
  }

  validationMsg.textContent = isValid ? '' : message;
  validationMsg.style.display = isValid ? 'none' : 'block';

  return isValid;
}

// Generate message based on the selected template and inputs
export function generateMessage() {
  const template = templates[currentTemplate];
  if (!template) {
    showToast('Please select a template first');
    return;
  }

  // Special handling for promotion email
  if (currentTemplate === 'promotion-email') {
    // Validate required fields
    const dateRangeInput = getDynamicElement('promoDateRange');
    if (!dateRangeInput || !dateRangeInput.value.trim()) {
      showToast('✗ Please enter a date range');
      highlightEmptyRequiredFields();
      return;
    }

    // Validate all promotion entries
    let allEntriesValid = true;
    promotionEntries.forEach((entry) => {
      if (!entry.brand || !entry.discount) {
        allEntriesValid = false;
      }
    });

    if (!allEntriesValid) {
      showToast('✗ Please fill out all brand and discount fields in entries');
      highlightEmptyRequiredFields();
      return;
    }

    // Update the live preview
    updateLivePreview();

    // Generate subject lines only if they don't exist yet
    // This preserves user edits to the subject line
    if (generatedSubjectLines.length === 0) {
      generateSubjectLines();
    }

    showToast('✓ Preview and subject lines generated!');
    return;
  }

  // --- Standard Template Generation ---

  const data = {};
  let allFieldsValid = true;
  let firstInvalidField = null;

  // Collect data and validate
  template.fields.forEach((field) => {
    const input = getDynamicElement(field);
    if (input) {
      data[field] = input.value;
      const config = fieldConfig[field] || {};
      if (config.validation) {
        if (!validateField(input)) {
          allFieldsValid = false;
          if (!firstInvalidField) {
            firstInvalidField = input;
          }
        }
      }
    }
  });

  // If any field is invalid, show toast and focus on the first invalid one
  if (!allFieldsValid) {
    showToast('✗ Please fix the errors in the form');
    if (firstInvalidField) {
      firstInvalidField.focus();
    }
    return;
  }

  // Generate the message
  const message = template.generate(data);

  // Show the regular output area
  showRegularOutput();

  // Update output area and email preview
  const outputArea = getDynamicElement('outputArea');
  if (outputArea) {
    outputArea.value = message;
  }

  // Store original message for EML generation
  window.originalMessageContent = message;

  // Update the email preview
  updateEmailPreview();

  // Update editable subject line if applicable
  if (template.hasEditableSubject) {
    const subject = extractSubjectLine(message);
    const subjectContainer = document.getElementById('subjectLineContent');
    if (subjectContainer) {
      renderEditableSubjectLine(subjectContainer, subject);
    }
  }

  // Scroll to output
  elements.outputCard.scrollIntoView({ behavior: 'smooth' });

  // Capture state after successful generation
  captureState();
}

// Clear all fields and output
export function clearAll() {
  const template = templates[currentTemplate];
  if (template) {
    template.fields.forEach((field) => {
      const input = getDynamicElement(field.id);
      if (input) {
        input.value = '';
        input.classList.remove('invalid');
        const validationMsg = input.nextElementSibling;
        if (
          validationMsg &&
          validationMsg.classList.contains('validation-msg')
        ) {
          validationMsg.style.display = 'none';
        }
      }
    });
  }

  // Special clearing for promotion email
  if (currentTemplate === 'promotion-email') {
    promotionEntries = [];
    specialHours = [];
    howToShopItems = [];
    importantNotesItems = [];
    attachedPDFs = [];
    generatedSubjectLines = [];
    selectedSubjectLine = null;

    // Clear PDF data from IndexedDB
    clearAllPDFsFromIndexedDB();

    // Re-initialize form
    renderPromotionEmailForm();
  }

  // Clear output
  if (elements.outputArea) {
    elements.outputArea.value = '';
  }
  if (elements.outputCard) {
    elements.outputCard.innerHTML = '';
  }

  // Reset live preview for promotion email
  if (currentTemplate === 'promotion-email') {
    updateLivePreview();
  }

  // Reset email preview for other templates
  updateEmailPreview();

  showToast('✓ Form cleared');
  captureState();
}

// Open email in default client
export function openInEmailClient() {
  const htmlCode = getDynamicElement('codeArea')?.value;
  if (!htmlCode) {
    showToast('⚠ No HTML code to send');
    return;
  }

  if (!selectedSubjectLine) {
    showToast('⚠ Please select a subject line first');
    return;
  }

  openPromotionEmailInClient(selectedSubjectLine, htmlCode);
}

// Open promotion email in client
export async function openPromotionEmailInClient(subject, htmlBody) {
  const fromName =
    appState.userProfile.name || `${getStoreName()} ${getStoreLocation()}`;
  const fromEmail = appState.userProfile.email || 'store@citizenwatchgroup.com';

  // Create EML file content
  const emlContent = await createEMLFile(
    fromName,
    fromEmail,
    '',
    '',
    subject,
    htmlBody,
    attachedPDFs
  );

  // Create a blob and URL
  const blob = new Blob([emlContent], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);

  // Create a link and click it to trigger download/open
  const link = document.createElement('a');
  link.href = url;
  const safeSubject = subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const format = getRecommendedFormat();
  const extension = format === 'emltpl' ? '.emltpl' : '.eml';
  link.download = `${safeSubject}${extension}`;
  link.click();

  // Clean up
  URL.revokeObjectURL(url);
  showToast('✓ Email file generated. Check your downloads.');
}

// Create EML file content with attachments
export async function createEMLFile(
  fromName,
  fromEmail,
  to,
  bcc,
  subject,
  htmlBody,
  attachments = []
) {
  // Generate boundary using Outlook-style format
  const timestamp = Date.now().toString(16);
  const boundary = `_000_DM6PR11MB2683${timestamp}DM6PR11MB2683namp_`;

  let eml = `Subject: ${subject}\r\n`;
  eml += `Content-Language: en-US\r\n`;
  eml += `X-MS-Has-Attach:\r\n`;
  eml += `X-MS-TNEF-Correlator:\r\n`;
  eml += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
  eml += `MIME-Version: 1.0\r\n\r\n`;

  // Plain text part
  eml += `--${boundary}\r\n`;
  eml += `Content-Type: text/plain; charset="utf-8"\r\n`;
  eml += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;

  // Extract plain text from HTML body for plain text part
  const plainTextContent = extractPlainText(htmlBody);
  eml += `${encodeQuotedPrintable(plainTextContent)}\r\n\r\n`;

  // HTML part
  eml += `--${boundary}\r\n`;
  eml += `Content-Type: text/html; charset="utf-8"\r\n`;
  eml += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
  eml += `${encodeQuotedPrintable(htmlBody)}\r\n\r\n`;

  // End boundary
  eml += `--${boundary}--\r\n`;

  // Add attachments if present (would require separate handling)
  for (const pdf of attachments) {
    if (pdf.data) {
      const base64Data = pdf.data.split(',')[1];
      eml += `--${boundary}\r\n`;
      eml += `Content-Type: ${pdf.type}; name="${pdf.name}"\r\n`;
      eml += `Content-Disposition: attachment; filename="${pdf.name}"\r\n`;
      eml += `Content-Transfer-Encoding: base64\r\n\r\n`;
      eml += `${base64Data}\r\n`;
    }
  }

  return eml;
}

// ===== BULK EMAIL FUNCTIONS =====

// Parse and validate email list
export function parseEmailList(list) {
  const emails = list
    .split(/[\s,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)]; // Remove duplicates
}

// Validate email format
export function isValidEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Validate batch size
export function validateBatchSize() {
  const batchSizeInput = getDynamicElement('batchSize');
  if (!batchSizeInput) return;

  let value = parseInt(batchSizeInput.value);
  if (isNaN(value) || value < 50) {
    value = 50;
  } else if (value > 1000) {
    value = 1000;
  }
  batchSizeInput.value = value;
}

// Detect duplicate emails
export function detectDuplicates(emails) {
  const emailCounts = emails.reduce((acc, email) => {
    acc[email] = (acc[email] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(emailCounts)
    .filter(([email, count]) => count > 1)
    .map(([email, count]) => ({ email, count }));
}

// Update bulk analysis stats
export function updateBulkAnalysis() {
  const bulkEmailList = getDynamicElement('bulkEmailList');
  const bulkAnalysis = getDynamicElement('bulkAnalysis');
  const bulkStats = getDynamicElement('bulkStats');

  if (!bulkEmailList || !bulkAnalysis || !bulkStats) return;

  const emails = parseEmailList(bulkEmailList.value);
  const validEmails = emails.filter(isValidEmail);
  const invalidEmails = emails.filter((e) => !isValidEmail(e));
  const batchSize = parseInt(getDynamicElement('batchSize')?.value) || 500;
  const numBatches = Math.ceil(validEmails.length / batchSize);

  bulkAnalysis.style.display = emails.length > 0 ? 'block' : 'none';

  let statsHTML = `
        <p><strong>Total Emails:</strong> ${emails.length}</p>
        <p><strong>Valid Emails:</strong> <span style="color: #28a745;">${validEmails.length}</span></p>
        <p><strong>Invalid Emails:</strong> <span style="color: #dc3545;">${invalidEmails.length}</span></p>
        <p><strong>Batches to Generate:</strong> ${numBatches} (at ${batchSize} emails/batch)</p>
    `;

  if (invalidEmails.length > 0) {
    statsHTML += `<p style="margin-top: 0.5rem;"><strong>Invalid entries:</strong> ${invalidEmails.join(', ')}</p>`;
  }

  bulkStats.innerHTML = statsHTML;
}

// Generate bulk email files
export async function generateBulkEmailFiles() {
  const bulkEmailList = getDynamicElement('bulkEmailList');
  const batchSize = parseInt(getDynamicElement('batchSize')?.value) || 500;
  const downloadFormat = document.querySelector(
    'input[name="downloadFormat"]:checked'
  )?.value;

  if (!bulkEmailList || !selectedSubjectLine) {
    showToast('✗ Please enter emails and select a subject line');
    return;
  }

  const emails = parseEmailList(bulkEmailList.value).filter(isValidEmail);
  if (emails.length === 0) {
    showToast('✗ No valid emails to send');
    return;
  }

  const htmlCode = getDynamicElement('codeArea')?.value;
  if (!htmlCode) {
    showToast('✗ No HTML code generated');
    return;
  }

  // Save recipients to IndexedDB for persistence
  try {
    await saveBulkEmailRecipientsToIndexedDB(emails);
  } catch (error) {
    console.warn('Failed to save recipients to IndexedDB:', error);
  }

  const fromName =
    appState.userProfile.name || `${getStoreName()} ${getStoreLocation()}`;
  const fromEmail = appState.userProfile.email || 'store@citizenwatchgroup.com';

  const batches = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    batches.push(emails.slice(i, i + batchSize));
  }

  showToast(`Generating ${batches.length} email files...`);

  if (downloadFormat === 'zip') {
    const zip = new JSZip();
    for (let i = 0; i < batches.length; i++) {
      const bcc = batches[i].join(',');
      const emlContent = await createEMLFile(
        fromName,
        fromEmail,
        '',
        bcc,
        selectedSubjectLine,
        htmlCode,
        attachedPDFs
      );
      zip.file(`batch_${i + 1}_of_${batches.length}.eml`, emlContent);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email_batches_${new Date().toISOString().split('T')[0]}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    // Individual file download
    for (let i = 0; i < batches.length; i++) {
      const bcc = batches[i].join(',');
      const emlContent = await createEMLFile(
        fromName,
        fromEmail,
        '',
        bcc,
        selectedSubjectLine,
        htmlCode,
        attachedPDFs
      );
      const blob = new Blob([emlContent], { type: 'message/rfc822' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `batch_${i + 1}_of_${batches.length}.eml`;
      link.click();
      URL.revokeObjectURL(url);
      // Add a small delay between downloads to prevent browser blocking
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  showToast(`✓ ${batches.length} email files generated successfully`);
}

// Extract plain text from HTML for the text/plain part of EML
export function extractPlainText(htmlBody) {
  // Create a temporary div and set its innerHTML to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = htmlBody;

  // Get all text content and reconstruct with line breaks
  let plainText = '';

  const processNode = (node) => {
    if (node.nodeType === 3) {
      // Text node
      plainText += node.textContent;
    } else if (node.nodeType === 1) {
      // Element node
      const tagName = node.tagName.toLowerCase();

      // Add line breaks for block elements
      if (
        tagName === 'p' ||
        tagName === 'div' ||
        tagName === 'h1' ||
        tagName === 'h2' ||
        tagName === 'h3' ||
        tagName === 'br'
      ) {
        if (plainText && !plainText.endsWith('\r\n')) {
          plainText += '\r\n\r\n';
        }
      }

      // Process child nodes
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i]);
      }

      // Add line breaks after block elements
      if ((tagName === 'p' || tagName === 'div') && node.nextSibling) {
        if (!plainText.endsWith('\r\n')) {
          plainText += '\r\n';
        }
      }
    }
  };

  processNode(temp);

  // Clean up excessive line breaks
  plainText = plainText.replace(/\r\n\r\n\r\n+/g, '\r\n\r\n').trim() + '\r\n';

  return plainText;
}

// Quoted-printable encoder with UTF-8 support
export function encodeQuotedPrintable(str) {
  // Use TextEncoder to properly handle UTF-8 encoding including surrogate pairs (emojis)
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(str);

  // Now encode the UTF-8 bytes using quoted-printable
  let result = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    const byte = utf8Bytes[i];
    const c = String.fromCharCode(byte);

    if (c === '=') {
      result += '=3D';
    } else if (byte < 32 || byte > 126) {
      if (byte === 9 || byte === 10 || byte === 13) {
        result += c;
      } else {
        const hex = byte.toString(16).toUpperCase().padStart(2, '0');
        result += '=' + hex;
      }
    } else {
      result += c;
    }
  }
  return result;
}

// ===== GENERAL EMAIL FUNCTIONS =====

// Extract subject line from a full message string
export function extractSubjectLine(message) {
  const match = message.match(/^Subject:\s*(.*)/im);
  return match ? match[1] : '';
}

// Render editable subject line for simple templates
export function renderEditableSubjectLine(container, initialSubject) {
  window.currentSubjectLine = initialSubject;

  container.innerHTML = `
        <div class="editable-subject-line">
            <label for="subjectInput" class="form-label">Subject:</label>
            <input type="text" id="subjectInput" class="form-input" value="${escapeAttr(initialSubject)}">
        </div>
    `;

  const subjectInput = document.getElementById('subjectInput');
  if (subjectInput) {
    subjectInput.addEventListener('input', (e) => {
      window.currentSubjectLine = e.target.value;
      // Debounce the preview update to avoid excessive iframe reloads
      debouncedSubjectPreviewUpdate(e.target.value);
    });
  }
}

// Universal function to open email client
export function openEmailClientUniversal(templateId, content) {
  const template = templates[templateId];
  if (!template) return;

  let subject = '';
  let body = content;

  if (template.hasEditableSubject) {
    subject = window.currentSubjectLine || extractSubjectLine(content);
    // Remove subject from body if it exists
    body = body.replace(/^Subject:.*\r?\n/im, '');
  } else {
    subject = extractSubjectLine(content);
    body = body.replace(/^Subject:.*\r?\n/im, '');
  }

  // Convert plain text to HTML for the email body
  const htmlBody = convertTextToHTML(body);

  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(htmlBody)}`;

  // Use a temporary link to open the mailto link
  const link = document.createElement('a');
  link.href = mailtoLink;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Universal function to download email file
export function downloadEmailFile(templateId, content) {
  const template = templates[templateId];
  if (!template) return;

  let subject = '';
  let plainTextBody = content;

  if (template.hasEditableSubject) {
    subject = window.currentSubjectLine || extractSubjectLine(content);
    plainTextBody = content.replace(/^Subject:.*\r?\n/im, '');
  } else {
    subject = extractSubjectLine(content);
    plainTextBody = content.replace(/^Subject:.*\r?\n/im, '');
  }

  // Check if content is HTML or plain text
  const isHTML = isHTMLContent(plainTextBody);
  let htmlBody;

  if (isHTML) {
    // Already HTML, use as-is
    htmlBody = plainTextBody;
  } else {
    // Plain text - convert to HTML
    let bodyWithoutSig = plainTextBody;
    const bestRegardsMatch = plainTextBody.match(/\n\nBest regards,/);
    if (bestRegardsMatch) {
      bodyWithoutSig = plainTextBody
        .substring(0, bestRegardsMatch.index + bestRegardsMatch[0].length)
        .trim();
    }

    // Convert body to HTML
    const htmlBodyContent = plainTextToPreviewHTML(bodyWithoutSig);

    // Get HTML signature
    const htmlSignature = getEmployeeSignature('html');

    // Build complete HTML document in Outlook format
    htmlBody = `<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body>
<div dir="ltr" style="font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">
${htmlBodyContent}
</div>
<div id="ms-outlook-mobile-signature">
${htmlSignature}
</div>
</body>
</html>`;
  }

  const fromName =
    appState.userProfile.name || `${getStoreName()} ${getStoreLocation()}`;
  const fromEmail = appState.userProfile.email || 'store@citizenwatchgroup.com';

  // Create EML file content
  createEMLFile(fromName, fromEmail, '', '', subject, htmlBody, []).then(
    (emlContent) => {
      const blob = new Blob([emlContent], { type: 'message/rfc822' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeSubject = subject.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const format = getRecommendedFormat();
      const extension = format === 'emltpl' ? '.emltpl' : '.eml';
      link.download = `${safeSubject}${extension}`;
      link.click();
      URL.revokeObjectURL(url);
    }
  );
}

// ===== INITIALIZATION =====

// Initialize the application
export function init() {
  // Cache DOM elements
  cacheElements();

  // Load user profile
  loadUserProfile();

  // Populate template dropdown
  populateDropdown();

  // Attach event listeners
  attachEventListeners();

  // Restore previously selected template from localStorage
  const savedTemplate = localStorage.getItem('selectedTemplate');
  if (savedTemplate && templates[savedTemplate]) {
    selectTemplate(savedTemplate);
  }
  // If no saved template, leave the placeholder selected (blank state)

  // Initialize PDF preview modal
  initPDFPreviewModal();

  // Set UI update callbacks for undo/redo
  setUIUpdateCallbacks({
    updateUndoRedoButtons,
    renderPromotionEntries,
    renderSpecialHours,
    renderHowToShopSection,
    renderImportantNotesSection,
    renderAttachedPDFs,
    renderSubjectLines,
  });

  // Initial state capture
  captureState();
}

// ===== MISSING FUNCTIONS FROM BACKUP =====

// Search tracking variable

// Simple HTML conversion for email preview (handles basic formatting without signature processing)
function plainTextToPreviewHTML(plainText) {
  // Helper to escape HTML
  const esc = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // Split into paragraphs (double line break = new paragraph)
  const paragraphs = plainText.split(/\n\n+/);

  const htmlParagraphs = paragraphs.map((para) => {
    // Skip empty paragraphs
    if (!para.trim()) return '';

    const lines = para.split('\n');

    // Check if this is a list (all non-empty lines start with bullet/dash)
    const isList =
      lines.some((line) => line.trim()) &&
      lines.every((line) => {
        const trimmed = line.trim();
        return !trimmed || trimmed.startsWith('•') || trimmed.startsWith('-');
      });

    if (isList) {
      const listItems = lines
        .filter((line) => line.trim())
        .map((line) => {
          const text = line.replace(/^[•-]\s*/, '').trim();
          return `        <li style="margin: 5px 0;">${esc(text)}</li>`;
        })
        .join('\n');
      return `    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;">
${listItems}
    </ul>`;
    } else {
      // Regular paragraph - convert single line breaks to <br>
      const htmlContent = lines.map((line) => esc(line)).join('<br>');
      return `    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${htmlContent}</p>`;
    }
  });

  return htmlParagraphs.filter((p) => p).join('\n');
}

// Clear email preview iframe
export function clearEmailPreview() {
  const emailPreview = document.getElementById('emailPreview');
  if (emailPreview) {
    emailPreview.srcdoc =
      '<p style="padding: 20px; color: #999;">No content to preview</p>';
  }
}

// Update email preview for regular templates
export function updateEmailPreview() {
  const outputArea = document.getElementById('outputArea');
  const emailPreview = document.getElementById('emailPreview');
  const previewTab = document.querySelector('.output-tab[data-tab="preview"]');
  const previewContent = document.getElementById('previewContent');
  const htmlContent = document.getElementById('htmlContent');

  if (!outputArea || !emailPreview) return;

  const content = outputArea.value;
  if (!content) {
    emailPreview.srcdoc =
      '<p style="padding: 20px; color: #999;">No content to preview</p>';
    return;
  }

  // Check if content is HTML
  const isHTML = isHTMLContent(content);
  const htmlTab = document.querySelector('.output-tab[data-tab="html"]');

  if (previewTab) {
    // Enable preview tab for both HTML and plain text content
    previewTab.disabled = false;
    previewTab.style.opacity = '1';
    previewTab.style.cursor = 'pointer';

    // Ensure preview is active
    previewTab.classList.add('active');
    if (htmlTab) htmlTab.classList.remove('active');
    if (previewContent) previewContent.classList.add('active');
    if (htmlContent) htmlContent.classList.remove('active');

    let htmlTemplate;
    if (isHTML) {
      // Wrap HTML content in email template
      htmlTemplate = wrapHtmlForEmailPreview(content);
    } else {
      // For plain text: extract subject, body, and render with proper HTML signature
      let subject = 'Email Preview';
      let plainTextBody = content;

      // Extract subject line if present
      const subjectMatch = content.match(/^Subject:\s*(.+)/m);
      if (subjectMatch) {
        subject = subjectMatch[1];
        plainTextBody = content.replace(/^Subject:.+\n/m, '').trim();
      }

      // Remove plain text signature and get HTML signature instead
      let bodyWithoutSig = plainTextBody;
      // Look for "Best regards," followed by signature
      const bestRegardsMatch = bodyWithoutSig.match(/\n\nBest regards,/);
      if (bestRegardsMatch) {
        // Keep everything up to and including the "Best regards," line (without the trailing newline)
        bodyWithoutSig = bodyWithoutSig
          .substring(0, bestRegardsMatch.index + bestRegardsMatch[0].length)
          .trim();
      } else {
        // Fallback: look for the underscores marker
        const underscoreMatch = bodyWithoutSig.match(/______+/);
        if (underscoreMatch) {
          // Find the start of the signature (the line before the underscores)
          // Look for the preceding double newline
          const beforeUnderscores = bodyWithoutSig.substring(
            0,
            underscoreMatch.index
          );
          const lastDoubleNewline = beforeUnderscores.lastIndexOf('\n\n');
          if (lastDoubleNewline !== -1) {
            bodyWithoutSig = beforeUnderscores
              .substring(0, lastDoubleNewline)
              .trim();
          }
        }
      }

      // Convert body to HTML
      const htmlBody = plainTextToPreviewHTML(bodyWithoutSig);

      // Get HTML signature
      const htmlSignature = getEmployeeSignature('html');

      // Create full HTML document for preview
      htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
    <style>
        body {
            font-family: Aptos, Arial, Helvetica, sans-serif;
            font-size: 12pt;
            color: rgb(0, 0, 0);
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        .email-header {
            padding: 10px;
            background-color: #f5f5f5;
            border-bottom: 2px solid #ddd;
            margin-bottom: 20px;
        }
        .email-subject {
            font-size: 14pt;
            font-weight: 600;
            color: #333;
        }
        .email-body a {
            color: #0000ee;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="email-subject">${escapeHtml(subject)}</div>
        </div>
        <div class="email-body">
            ${htmlBody}
            <div style="margin-top: 5px; padding-top: 10px;">
                ${htmlSignature}
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    emailPreview.srcdoc = htmlTemplate;
  }
}

// Populate template dropdown with categories
export function populateDropdown(category = 'all') {
  const optgroups = {
    'Customer Email': [],
    'Phone Orders': [],
    Text: [],
  };

  Object.keys(templates).forEach((key) => {
    const template = templates[key];
    optgroups[template.category].push({ key, name: template.name });
  });

  elements.templateSelect.innerHTML =
    '<option value="">Select a template...</option>';

  Object.keys(optgroups).forEach((cat) => {
    if (optgroups[cat].length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = cat;
      optgroups[cat].forEach((item) => {
        const option = document.createElement('option');
        option.value = item.key;
        option.textContent = item.name;
        option.title = templateHelp[item.key] || '';
        optgroup.appendChild(option);
      });
      elements.templateSelect.appendChild(optgroup);
    }
  });
}

// Render search results for template selection
export function renderSearchResults(query) {
  if (!query.trim()) {
    elements.searchResults.classList.remove('visible');
    elements.resultCounter.textContent = '';
    elements.clearSearch.classList.remove('visible');
    elements.searchBox.classList.remove('active');
    return;
  }

  elements.clearSearch.classList.add('visible');
  elements.searchBox.classList.add('active');

  const lowerQuery = query.toLowerCase();
  const results = Object.keys(templates).filter((key) => {
    const template = templates[key];
    return (
      template.name.toLowerCase().includes(lowerQuery) ||
      template.category.toLowerCase().includes(lowerQuery)
    );
  });

  // Build results HTML
  let resultsHTML = '';
  if (results.length === 0) {
    resultsHTML =
      '<div class="search-result-item" style="cursor: default; color: var(--text-tertiary);">No templates found</div>';
    elements.resultCounter.textContent = '0 templates found';
  } else {
    // Use sanitization to prevent XSS
    const resultsArray = results.map((key) => {
      const template = templates[key];
      const safeName = sanitizeHTML(template.name);
      const safeCategory = sanitizeHTML(template.category);
      const safeKey = escapeAttr(key);
      return `
                <div class="search-result-item" data-template-key="${safeKey}">
                    <div class="search-result-name">${safeName}</div>
                    <div class="search-result-category">${safeCategory}</div>
                </div>
            `;
    });
    resultsHTML = resultsArray.join('');
    const templateCount = results.length;
    const pluralSuffix = templateCount === 1 ? '' : 's';
    elements.resultCounter.textContent = `${templateCount} template${pluralSuffix} found`;
  }

  // Update only the results, preserving the counter
  const counterElement = elements.resultCounter;
  elements.searchResults.innerHTML = resultsHTML;
  elements.searchResults.appendChild(counterElement);

  elements.searchResults.classList.add('visible');
}

// Track last selected template to prevent duplicate selections
let lastSelectedTemplate = null;
let isSelectingTemplate = false;

// Select and render a template
export function selectTemplate(key) {
  try {
    // Don't select if key is empty or invalid
    if (!key || !templates[key]) {
      console.warn('Invalid template key:', key);
      return;
    }

    // Prevent duplicate selection of the same template
    if (key === lastSelectedTemplate && isSelectingTemplate) {
      return;
    }

    isSelectingTemplate = true;
    lastSelectedTemplate = key;

    currentTemplate = key;
    const template = templates[key];

    // Clear the preview iframe, output, and cached content immediately
    clearEmailPreview();
    window.originalMessageContent = '';
    const outputElem = getDynamicElement('outputArea');
    if (outputElem) {
      outputElem.value = '';
    }

    // Save selected template to localStorage for persistence across refreshes
    localStorage.setItem('selectedTemplate', key);

    elements.templateSelect.value = key;

    // If coming from promotion email template, restore the original h2 element structure
    const headerWrapper = document.querySelector(
      '.section-header-with-controls'
    );
    if (headerWrapper) {
      const originalH2 = document.createElement('h2');
      originalH2.id = 'formSectionTitle';
      originalH2.className = 'section-title';
      originalH2.textContent = `${template.name} Fields`;
      headerWrapper.replaceWith(originalH2);
      elements.formSectionTitle = originalH2;
    } else {
      elements.formSectionTitle.textContent = `${template.name} Fields`;
    }

    const placeholder = document.getElementById('formPlaceholder');
    if (placeholder) {
      placeholder.remove();
    }

    // Handle custom promotion email template
    if (template.customTemplate && key === 'promotion-email') {
      renderPromotionEmailForm();
      showTabbedOutput();
      elements.clearBtn.disabled = false;
      const openEmailBtn = getDynamicElement('openEmailBtn');
      if (openEmailBtn) {
        openEmailBtn.disabled = false;
      }

      // Restore bulk email recipients from IndexedDB
      (async () => {
        // Wait for IndexedDB to be initialized
        let retries = 0;
        while (!db && retries < 20) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          retries++;
        }

        if (!db) {
          console.warn('IndexedDB not initialized, cannot restore bulk emails');
          return;
        }

        // Wait for DOM to be ready and any pending operations to complete
        await new Promise((resolve) => setTimeout(resolve, 200));

        try {
          const bulkEmailList = document.getElementById('bulkEmailList');
          if (bulkEmailList) {
            const savedRecipients = await getBulkEmailRecipientsFromIndexedDB();
            if (savedRecipients) {
              bulkEmailList.value = savedRecipients;
              // Trigger analysis panel update after restoration
              bulkEmailList.dispatchEvent(
                new Event('input', { bubbles: true })
              );
            }
          }
        } catch (error) {
          console.warn('Failed to restore bulk email recipients:', error);
        }
      })();

      return;
    }

    // Show regular output for non-promotion templates
    showRegularOutput();

    const formFieldsHTML = template.fields.map((field) => {
      const label = field.replace(/([A-Z])/g, ' $1').trim();
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      const isTextarea =
        field.includes('address') ||
        field.includes('Address') ||
        field.includes('Details');
      const isYesNoField =
        field.includes('Verified') || field.includes('Verification');
      const config = fieldConfig[field] || {};

      const fullWidthClass = isTextarea ? ' full-width' : '';
      const requiredMark = config.required ? ' *' : '';
      const safeField = escapeAttr(field);
      const safeExample = escapeAttr(config.example || '');

      if (isYesNoField) {
        return `
                    <div class="form-group radio-field">
                        <label class="form-label">${sanitizeHTML(capitalizedLabel)}${requiredMark}</label>
                        <div class="radio-group" data-field="${safeField}">
                            <div class="radio-option">
                                <input type="radio" id="${safeField}-yes" name="${safeField}" value="yes" data-field="${safeField}">
                                <label for="${safeField}-yes">Yes</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" id="${safeField}-no" name="${safeField}" value="no" data-field="${safeField}">
                                <label for="${safeField}-no">No</label>
                            </div>
                        </div>
                    </div>
                `;
      }

      const suggestions = getFieldSuggestions(field);
      const datalistId = `datalist-${safeField}`;
      let datalistHTML = '';
      if (suggestions.length > 0) {
        const optionsHTML = suggestions
          .map((s) => `<option value="${escapeAttr(s)}">`)
          .join('');
        datalistHTML = `
                <datalist id="${datalistId}">
                    ${optionsHTML}
                </datalist>
            `;
      }

      // Auto-fill from user profile
      let autoFillValue = '';
      if (appState.userProfile) {
        if (
          (field === 'employeeName' || field === 'yourName') &&
          appState.userProfile.employeeName
        ) {
          autoFillValue = escapeAttr(appState.userProfile.employeeName);
        } else if (field === 'storePhone' && appState.userProfile.storePhone) {
          autoFillValue = escapeAttr(appState.userProfile.storePhone);
        } else if (field === 'storeName' && appState.userProfile.storeName) {
          autoFillValue = escapeAttr(appState.userProfile.storeName);
        }
      }

      const inputHTML = isTextarea
        ? `<textarea id="${safeField}" class="form-textarea" data-field="${safeField}" ${config.required ? 'required' : ''} placeholder="${safeExample}">${autoFillValue}</textarea>`
        : `<input type="text" id="${safeField}" class="form-input" data-field="${safeField}" ${config.required ? 'required' : ''} placeholder="${safeExample}" value="${autoFillValue}" list="${datalistId}">${datalistHTML}`;

      return `
                <div class="form-group${fullWidthClass}">
                    <label class="form-label" for="${safeField}">${sanitizeHTML(capitalizedLabel)}${requiredMark}</label>
                    <div class="input-wrapper">
                        ${inputHTML}
                        <button class="clear-input" data-clear="${safeField}" title="Clear">×</button>
                    </div>
                    <div class="calculated-value" data-calc="${safeField}" style="display: none;"></div>
                    <div class="error-message" data-error="${safeField}" style="display: none;"></div>
                </div>
            `;
    });

    elements.formFields.innerHTML = formFieldsHTML.join('');

    // Add event listeners
    setTimeout(() => {
      attachEventListeners();
    }, 0);

    // Add event delegation for clear buttons in regular templates
    elements.formFields.addEventListener('click', (e) => {
      if (e.target.classList.contains('clear-input')) {
        const fieldId = e.target.dataset.clear;
        const input = document.getElementById(fieldId);
        if (input) {
          input.value = '';
          e.target.classList.remove('visible');
          input.focus();
          updateEmailPreview();
        }
      }
    });

    // Add input listeners to show/hide clear buttons based on content
    elements.formFields.addEventListener('input', (e) => {
      if (
        e.target.classList.contains('form-input') ||
        e.target.classList.contains('form-textarea')
      ) {
        const fieldId = e.target.id;
        const clearBtn = elements.formFields.querySelector(
          `[data-clear="${fieldId}"]`
        );
        if (clearBtn) {
          clearBtn.classList.toggle(
            'visible',
            e.target.value.trim().length > 0
          );
        }
      }
    });

    // Initialize clear button visibility for pre-filled fields
    const allInputs = elements.formFields.querySelectorAll(
      '.form-input, .form-textarea'
    );
    allInputs.forEach((input) => {
      const clearBtn = elements.formFields.querySelector(
        `[data-clear="${input.id}"]`
      );
      if (clearBtn && input.value.trim().length > 0) {
        clearBtn.classList.add('visible');
      }
    });

    // Clear output area with fresh reference
    const outputArea = document.getElementById('outputArea');
    if (outputArea) {
      outputArea.value = '';
    }
    elements.clearBtn.disabled = false;
  } catch (error) {
    console.error('Error selecting template:', error);
    showToast('Error loading template');
  }
}

// Highlight empty required fields
export function highlightEmptyRequiredFields() {
  const inputs = elements.formFields.querySelectorAll(
    '.form-input, .form-textarea'
  );

  inputs.forEach((input) => {
    const field = input.dataset.field;
    const config = fieldConfig[field] || {};

    if (config.required && !input.value.trim()) {
      input.classList.add('error');
    } else {
      input.classList.remove('error');
    }
  });
}

// Copy output to clipboard
export function copyToClipboard() {
  // Get fresh reference to outputArea (it's recreated in showRegularOutput())
  const outputArea = document.getElementById('outputArea');
  if (!outputArea) {
    console.error('outputArea element not found');
    showToast('⚠ Output area not found');
    return;
  }

  const text = outputArea.value;
  if (!text) {
    showToast('⚠ Nothing to copy');
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast('✓ Copied!');
      })
      .catch((error) => {
        console.error('Clipboard error:', error);
        showToast('⚠ Copy failed');
      });
  } else {
    // Fallback for browsers without clipboard API
    try {
      outputArea.select();
      const success = document.execCommand('copy');
      if (success) {
        showToast('✓ Copied!');
      } else {
        showToast('⚠ Copy failed');
      }
    } catch (error) {
      console.error('Copy error:', error);
      showToast('⚠ Copy not supported');
    }
  }
}

export function validateSubject(subject) {
  if (!subject || subject.trim() === '') {
    throw new Error('Subject cannot be empty');
  }
  if (subject.length > 900) {
    throw new Error(`Subject too long: ${subject.length} characters (max 900)`);
  }
  // Check for control characters (except tabs)
  for (let i = 0; i < subject.length; i++) {
    const code = subject.charCodeAt(i);
    if (
      (code >= 0 && code <= 8) ||
      (code >= 10 && code <= 31) ||
      code === 127
    ) {
      throw new Error('Subject contains invalid control characters');
    }
  }
  return true;
}

// Encode subject for non-ASCII characters (RFC 2047 - Encoded-words)
export function encodeSubject(subject) {
  // Check if encoding needed (contains non-ASCII characters)
  let isAscii = true;
  for (let i = 0; i < subject.length; i++) {
    if (subject.charCodeAt(i) > 127) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) {
    // Pure ASCII, no encoding needed
    return subject;
  }

  // Encode as UTF-8 Base64 (RFC 2047 format: =?charset?encoding?encoded-text?=)
  const utf8Bytes = new TextEncoder().encode(subject);
  const binaryString = Array.from(utf8Bytes, (byte) =>
    String.fromCodePoint(byte)
  ).join('');
  const base64 = btoa(binaryString);

  return `=?UTF-8?B?${base64}?=`;
}

// Convert string to UTF-8 Base64 encoding (RFC 2045 standard for MIME bodies)
// Replaces deprecated unescape() function with modern TextEncoder API
export function utf8ToBase64(str) {
  // Use TextEncoder to convert string to UTF-8 bytes
  const utf8Bytes = new TextEncoder().encode(str);

  // Convert bytes to binary string (works with btoa)
  const binaryString = Array.from(utf8Bytes, (byte) =>
    String.fromCodePoint(byte)
  ).join('');

  // Encode to Base64
  return btoa(binaryString);
}

// Encode filename for non-ASCII characters (RFC 2231 - Parameter Value Encoding)
// If filename contains non-ASCII, use RFC 2231 encoding, otherwise use simple quoted-string
export function encodeFilename(filename) {
  // Check if filename contains only ASCII characters
  let isAscii = true;
  for (let i = 0; i < filename.length; i++) {
    if (filename.charCodeAt(i) > 127) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) {
    // Pure ASCII - use simple quoted-string format
    return `filename="${filename}"`;
  }

  // Non-ASCII filename - use RFC 2231 parameter encoding
  // Format: filename*=charset'language'percent-encoded-value
  const encodedFilename = encodeURIComponent(filename);
  return `filename*=UTF-8''${encodedFilename}`;
}

// Universal EML file creation for any email template
export function createGenericEMLFile(subject, body) {
  const senderName =
    appState.userProfile && appState.userProfile.storeName
      ? appState.userProfile.storeName
      : 'Citizen Company Store';
  const senderEmail =
    appState.userProfile && appState.userProfile.storeEmail
      ? appState.userProfile.storeEmail
      : 'store@citizenwatchgroup.com';

  // Generate boundary and other required values
  const boundary =
    '----=_NextPart_' +
    Date.now() +
    '_' +
    Math.random().toString(36).substr(2, 9);
  const altBoundary =
    '----=_Alt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const date = new Date().toUTCString();
  const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@citizenstore.local>`;
  const attachments = attachedPDFs;

  // Detect if body contains HTML
  const isHTML = isHTMLContent(body);

  // For HTML content, extract plain text version
  let plainTextBody = body;
  if (isHTML) {
    // Remove HTML tags to create plain text version
    plainTextBody = body
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  // Create EML as a draft message to allow editing in Outlook
  let eml = '';
  eml += `Subject: ${subject}\r\n`;
  eml += `Date: ${date}\r\n`;
  eml += `Message-ID: ${messageId}\r\n`;
  eml += `MIME-Version: 1.0\r\n`;

  // Use multipart/mixed if we have attachments, otherwise multipart/alternative
  if (attachments && attachments.length > 0) {
    eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  } else if (isHTML) {
    eml += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n`;
  } else {
    eml += `Content-Type: text/plain; charset=utf-8\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
  }

  eml += `X-Unsent: 1\r\n`; // Mark as unsent/draft
  eml += `X-Outlook-Message-Flag: \r\n`; // Outlook draft flag
  eml += `X-Microsoft-Headers: ; name="draft"\r\n`; // Microsoft draft marker
  eml += `X-Mailer: Microsoft Outlook 16.0\r\n`; // Identify as Outlook-generated
  eml += `X-Msg-Status: 00000000\r\n`; // Draft message status
  eml += `X-Outlook-Template: 1\r\n`; // Mark as Outlook template
  eml += `Message-Class: IPM.Note\r\n`; // Outlook message classification
  eml += `\r\n`;

  // If simple text/plain with no attachments, just add body
  if (!isHTML && (!attachments || attachments.length === 0)) {
    const encodedBody = encodeQuotedPrintable(plainTextBody);
    eml += encodedBody;
    eml += `\r\n`;
    return eml;
  }

  eml += `This is a multi-part message in MIME format.\r\n`;
  eml += `\r\n`;

  // Start multipart structure
  if (attachments && attachments.length > 0) {
    // Has attachments - use mixed with nested alternative
    eml += `--${boundary}\r\n`;
    if (isHTML) {
      eml += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n`;
      eml += `\r\n`;
    }
  }

  // Add text/plain part
  if (isHTML && attachments && attachments.length > 0) {
    eml += `--${altBoundary}\r\n`;
  } else if (isHTML) {
    eml += `--${altBoundary}\r\n`;
  } else if (attachments && attachments.length > 0) {
    eml += `--${boundary}\r\n`;
  }

  eml += `Content-Type: text/plain; charset=utf-8\r\n`;
  eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
  eml += `\r\n`;

  const encodedPlainText = encodeQuotedPrintable(plainTextBody);
  eml += encodedPlainText;
  eml += `\r\n\r\n`;

  // Add text/html part if HTML content exists
  if (isHTML) {
    eml += `--${altBoundary}\r\n`;
    eml += `Content-Type: text/html; charset=utf-8\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n`;
    eml += `\r\n`;

    const encodedHTML = encodeQuotedPrintable(body);
    eml += encodedHTML;
    eml += `\r\n\r\n`;

    // Close alternative boundary
    eml += `--${altBoundary}--\r\n`;

    if (attachments && attachments.length > 0) {
      eml += `\r\n`;
    }
  }

  // Add PDF attachments if provided
  if (attachments && attachments.length > 0) {
    attachments.forEach((pdf, index) => {
      // Skip PDFs without data
      if (!pdf.data) {
        console.warn(`Skipping PDF ${pdf.name} - no data available`);
        return;
      }

      // Validate PDF data format
      const parts = pdf.data.split(',');
      if (parts.length !== 2 || !parts[0].includes('base64')) {
        console.error(
          `Invalid PDF data format for attachment ${index + 1} (${pdf.name})`
        );
        return;
      }

      const base64Data = parts[1];
      if (!base64Data || base64Data.length === 0) {
        console.error(
          `Empty PDF data for attachment ${index + 1} (${pdf.name})`
        );
        return;
      }

      eml += `--${boundary}\r\n`;
      eml += `Content-Type: application/pdf; name="${pdf.name}"\r\n`;
      eml += `Content-Transfer-Encoding: base64\r\n`;
      eml += `Content-Disposition: attachment; ${encodeFilename(pdf.name)}\r\n`;
      eml += `\r\n`;

      // Split base64 data into 76-character lines
      const lines = base64Data.match(/.{1,76}/g) || [];
      eml += lines.join('\r\n');
      eml += `\r\n\r\n`;
    });
  }

  // End boundary
  eml += `--${boundary}--\r\n`;

  return eml;
}

// Check if template is complex (needs EML download vs simple mailto)
export function isComplexEmail(templateType) {
  // Currently only promotion-email is complex, but this can be extended
  return templateType === 'promotion-email';
}

// Extract date range from HTML content
export function extractDateRangeFromHTML(htmlContent) {
  if (!htmlContent) return null;

  // Find text before "While Supplies Last"
  const whileSuppliesLastIndex = htmlContent.indexOf('While Supplies Last');
  if (whileSuppliesLastIndex === -1) return null;

  // Look backwards for the date range pattern
  const searchStart = Math.max(0, whileSuppliesLastIndex - 200); // Look back up to 200 chars
  const searchText = htmlContent.substring(searchStart, whileSuppliesLastIndex);

  // Find the pattern: "dateRange, year • While Supplies Last"
  const match = searchText.match(
    /([A-Za-z]+\s+\d+(?:\s*-\s*[A-Za-z]+\s+\d+)?),\s*(\d{4})\s*•\s*While Supplies Last/
  );

  if (match) {
    return `${match[1]}, ${match[2]}`;
  }

  return null;
}

// Format date range for filename
export function formatDateRangeForFilename(dateRangeText) {
  if (!dateRangeText) return '';

  // Examples:
  // "October 28 - November 3, 2025" → "Oct28-Nov3.2025"
  // "December 15 - 31, 2025" → "Dec15-Dec31.2025"

  const monthMap = {
    January: 'Jan',
    February: 'Feb',
    March: 'Mar',
    April: 'Apr',
    May: 'May',
    June: 'Jun',
    July: 'Jul',
    August: 'Aug',
    September: 'Sep',
    October: 'Oct',
    November: 'Nov',
    December: 'Dec',
  };

  // Match date ranges like "October 28 - November 3, 2025"
  const rangeMatch = dateRangeText.match(
    /^([A-Za-z]+)\s+(\d+)(?:\s*-\s*([A-Za-z]+)\s+(\d+))?,?\s*(\d{4})$/
  );

  if (rangeMatch) {
    const [, startMonth, startDay, endMonth, endDay, year] = rangeMatch;

    const startMonthAbbrev = monthMap[startMonth] || startMonth.substring(0, 3);
    const endMonthAbbrev = endMonth
      ? monthMap[endMonth] || endMonth.substring(0, 3)
      : startMonthAbbrev;

    if (endMonth && endDay) {
      return `${startMonthAbbrev}${startDay}-${endMonthAbbrev}${endDay}.${year}`;
    } else {
      return `${startMonthAbbrev}${startDay}.${year}`;
    }
  }

  // Fallback: clean up the text
  return dateRangeText.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
}

// Generate ZIP filename from HTML content
export function generateZipFilenameFromHTML(htmlContent) {
  const dateRange = extractDateRangeFromHTML(htmlContent);

  if (dateRange) {
    const formattedRange = formatDateRangeForFilename(dateRange);
    return `Promo-email.${formattedRange}.zip`;
  } else {
    // Fallback to current date
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `Promo-email.${today.getFullYear()}-${month}-${day}.zip`;
  }
}

// Create BCC batch EML file
export function createBCCBatchEML(
  subject,
  htmlBody,
  recipients,
  pdfAttachments = [],
  format = 'eml',
  batchNumber = 1
) {
  // RFC 5322 §3.4 - Validate email addresses in BCC recipients
  // Filter out invalid email addresses and log warnings
  const validRecipients = recipients.filter((email) => {
    if (!isValidEmail(email)) {
      console.warn(
        `Invalid email address skipped in batch ${batchNumber}: ${email}`
      );
      return false;
    }
    return true;
  });

  // DIAGNOSTIC: Log function call with all parameters
  console.log(`\n>>> createBCCBatchEML called for Batch ${batchNumber}`);
  console.log(
    `    recipients parameter type: ${typeof recipients}, isArray: ${Array.isArray(recipients)}`
  );
  console.log(
    `    recipients.length: ${recipients ? recipients.length : 'undefined'}`
  );
  const filteredCount = recipients.length - validRecipients.length;
  const filterMsg =
    filteredCount > 0 ? ` (${filteredCount} invalid filtered)` : '';
  console.log(
    `    validRecipients.length: ${validRecipients.length}${filterMsg}`
  );
  if (validRecipients && validRecipients.length > 0) {
    const first3 = validRecipients.slice(0, 3).join(', ');
    const lastRecipient = validRecipients[validRecipients.length - 1];
    console.log(`    First 3 recipients: ${first3}`);
    console.log(`    Last recipient: ${lastRecipient}`);
  }

  // Create EML email with CRLF line endings for Outlook compatibility
  // Note: Mac Outlook (.emltpl) may only display 1 BCC recipient in the UI for security,
  // but all recipients are included when the email is sent.
  const boundary =
    '----=_NextPart_' +
    Date.now() +
    '_' +
    batchNumber +
    '_' +
    Math.random().toString(36).substr(2, 9);
  const senderEmail =
    appState.userProfile && appState.userProfile.storeEmail
      ? appState.userProfile.storeEmail
      : 'noreply@example.com';
  const senderName =
    appState.userProfile && appState.userProfile.storeName
      ? appState.userProfile.storeName
      : 'Store';

  // Omit From: header to allow user to specify sender
  let emlContent = '';
  emlContent += `Subject: ${subject}\r\n`;

  // Add Date header with slight offset per batch to ensure uniqueness
  const now = new Date(Date.now() + batchNumber * 1000); // Add 1 second per batch
  emlContent += `Date: ${now.toUTCString()}\r\n`;

  // Add unique Message-ID to prevent Outlook from treating files as duplicates
  const messageId = `<batch${batchNumber}.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@citizenstore.local>`;
  emlContent += `Message-ID: ${messageId}\r\n`;

  // Add BCC recipients with RFC 822 compliant header folding
  // Long headers must be split across multiple lines (max 998 chars per line, recommended 78)
  if (validRecipients && validRecipients.length > 0) {
    emlContent += `Bcc: `;

    let currentLine = '';
    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];
      const separator = i < validRecipients.length - 1 ? ', ' : '';
      const addition = recipient + separator;

      // Check if adding this recipient would exceed 900 characters (safe limit)
      if (currentLine.length + addition.length > 900) {
        // Write current line with folding (CRLF + space for continuation)
        emlContent += currentLine + '\r\n ';
        currentLine = addition;
      } else {
        currentLine += addition;
      }
    }

    // Write final line
    emlContent += currentLine + '\r\n';

    console.log(
      `    ✓ BCC header created with ${validRecipients.length} recipients (folded for RFC 822 compliance)`
    );
  } else {
    console.error(
      `    ✗ ERROR - No valid recipients provided for BCC headers!`
    );
    console.error('    Valid recipients array:', validRecipients);
  }

  emlContent += `MIME-Version: 1.0\r\n`;
  emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  emlContent += `X-Unsent: 1\r\n`; // Mark as unsent/draft
  emlContent += `X-Outlook-Template: 1\r\n`; // Mark as Outlook template
  emlContent += `Message-Class: IPM.Note\r\n`; // Outlook message classification
  emlContent += `X-Outlook-Message-Flag: \r\n`; // Draft status indicator
  emlContent += `X-Mailer: Microsoft Outlook 16.0\r\n`; // Application identifier
  emlContent += `X-Msg-Status: 00000000\r\n`; // Message status code
  emlContent += `\r\n`;

  // RFC 2045 - MIME preamble for non-MIME readers (before first boundary)
  emlContent += `This is a multi-part message in MIME format.\r\n\r\n`;

  // HTML body part - use base64 encoding for non-ASCII character safety (RFC 2045 §6)
  emlContent += `--${boundary}\r\n`;
  emlContent += `Content-Type: text/html; charset=utf-8\r\n`;
  emlContent += `Content-Transfer-Encoding: base64\r\n\r\n`;

  // Normalize HTML line endings to CRLF (RFC 822 standard for email bodies)
  const normalizedHtml = htmlBody.replace(/\r?\n/g, '\r\n');

  // Convert HTML to base64 and split into 76-character lines (RFC 2045 standard)
  const htmlBase64 = utf8ToBase64(normalizedHtml);
  const htmlLines = htmlBase64.match(/.{1,76}/g) || [];
  emlContent += htmlLines.join('\r\n');
  emlContent += `\r\n\r\n`;

  // Add PDF attachments
  if (pdfAttachments && pdfAttachments.length > 0) {
    let attachmentCount = 0;
    pdfAttachments.forEach((pdf, index) => {
      // Skip PDFs without data (may happen if IndexedDB restore failed)
      if (!pdf.data) {
        console.warn(
          `Skipping PDF ${pdf.name} - no data available (may need to re-upload)`
        );
        return;
      }

      // Validate PDF data format (must be data URL with base64 encoding)
      const parts = pdf.data.split(',');
      if (parts.length !== 2 || !parts[0].includes('base64')) {
        console.error(
          `Invalid PDF data format for attachment ${index + 1} (${pdf.name}) in batch ${batchNumber}`
        );
        return; // Skip this PDF
      }

      // Extract base64 data from data URL (format: data:application/pdf;base64,...)
      const base64Data = parts[1];

      // Validate that base64 data is not empty
      if (!base64Data || base64Data.length === 0) {
        console.error(
          `Empty PDF data for attachment ${index + 1} (${pdf.name}) in batch ${batchNumber}`
        );
        return; // Skip this PDF
      }

      emlContent += `--${boundary}\r\n`;
      emlContent += `Content-Type: application/pdf; name="${pdf.name}"\r\n`;
      emlContent += `Content-Transfer-Encoding: base64\r\n`;
      // RFC 2231 - Use encodeFilename for non-ASCII filenames
      emlContent += `Content-Disposition: attachment; ${encodeFilename(pdf.name)}\r\n`;
      emlContent += `\r\n`;

      // Split base64 data into 76-character lines (RFC 2045 standard)
      const lines = base64Data.match(/.{1,76}/g) || [];
      emlContent += lines.join('\r\n');
      emlContent += `\r\n\r\n`;

      attachmentCount++;
    });

    if (attachmentCount > 0) {
      console.log(
        `    ✓ Added ${attachmentCount} valid PDF attachment(s) to batch ${batchNumber}`
      );
    }
  }

  emlContent += `--${boundary}--\r\n`;

  // Format batch number with leading zeros (001, 002, etc.)
  const paddedBatchNumber = batchNumber.toString().padStart(3, '0');

  return {
    format: format,
    data: new TextEncoder().encode(emlContent),
    filename: `batch-email${paddedBatchNumber}.${format}`,
  };
}

// Initialize PDF preview modal
export function initPDFPreviewModal() {
  const modal = document.getElementById('pdfPreviewModal');
  if (!modal) return;

  const closeBtn = document.getElementById('pdfModalClose');
  const backdrop = modal.querySelector('.pdf-modal-backdrop');
  const downloadBtn = document.getElementById('pdfDownloadBtn');
  const downloadFallback = document.getElementById('pdfDownloadFallback');

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', closePDFPreview);
  }

  // Backdrop click
  if (backdrop) {
    backdrop.addEventListener('click', closePDFPreview);
  }

  // Download button
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadPDFFromPreview);
  }

  // Download fallback (error state)
  if (downloadFallback) {
    downloadFallback.addEventListener('click', downloadPDFFromPreview);
  }

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closePDFPreview();
    }
  });
}

// Update format status display
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

  statusDiv.innerHTML = `<strong>${formatName} Format:</strong> Optimized for ${osName} (${fileExtension} files)<br><small>Best compatibility with Outlook on your platform</small>`;
  statusDiv.style.color = 'var(--text-secondary)';
}
