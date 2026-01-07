// Constants
export { TOAST_DURATION_MS } from './shared/ui-utils.js';
import {
  getUserProfile,
  getStorePhone,
  getStoreName,
  getStoreLocation,
} from './shared/profile.js';

// Global variable for current template (used by modules)
export let currentTemplate = null;

// Module-scoped state (replaces window.* globals)
let originalMessageContent = null; // Template result {body, includeSignature}
let currentSubjectLine = null; // Editable subject line
let editedBodyContent = null; // User-edited body (without signature)
let isSyncing = false; // Prevent sync loops
let syncDebounceTimer = null; // Debounce timer for sync
let pendingSync = null; // Track which view needs sync: 'preview' | 'text' | null

// Helper: Check if signature should be included (from template config)
function shouldIncludeSignature() {
  if (originalMessageContent && typeof originalMessageContent === 'object') {
    return originalMessageContent.includeSignature !== false;
  }
  return true; // Default to including signature
}

// Helper: Reset all edit state (used by clear, template switch, generate)
function resetEditState() {
  originalMessageContent = null;
  currentSubjectLine = null;
  editedBodyContent = null;
  pendingSync = null;
}

// Global variables for app state (used by modules)

// Helper function to detect if content is HTML or plain text
export function isHTMLContent(text) {
  if (!text) return false;

  // Check for common HTML tags
  const htmlPattern =
    /<(p|div|span|br|html|body|head|table|tr|td|ul|ol|li|h[1-6]|strong|em|a)\b[^>]*>/i;
  return htmlPattern.test(text);
}

import { appState } from './state.js';
import {
  templates,
  templateHelp,
  fieldConfig,
  getFieldSuggestions,
  getEmployeeSignature,
  convertTextToHTML,
  sanitizeHTML,
  escapeAttr,
  assembleTemplateOutput,
} from './templates.js';
import { toggleTheme, getEmailDarkModeCSS } from './shared/theme.js';
import {
  showToast,
  detectOS,
  getRecommendedFormat,
  writeEmptyStateToIframe,
  TOAST_DURATION_MS,
} from './shared/ui-utils.js';
import { eyePreviewIcon, textLinesIcon, emailIcon } from './shared/icons.js';
import { createEMLFile } from './shared/emailUtils.js';
import {
  plainTextToPreviewHTML,
  wrapHtmlForEmailPreview,
  escapeHtml,
} from './shared/emailPreviewUtils.js';
import {
  extractEditableContent,
  htmlToPlainText,
  insertPlainText,
  getPlainTextFromPreview,
} from './shared/htmlTextConversion.js';

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
  elements.downloadEmailBtn = document.getElementById('downloadEmailBtn');
  elements.themeToggle = document.getElementById('themeToggle');

  // Search elements
  elements.searchBox = document.getElementById('searchBox');
  elements.clearSearch = document.getElementById('clearSearch');
  elements.searchResults = document.getElementById('searchResults');
  elements.resultCounter = document.getElementById('resultCounter');
}

export { showToast };

export function showRegularOutput() {
  if (!elements.outputCard) return;

  // Check if current template has enhanced features
  const template = templates[currentTemplate];
  const hasEnhancedFeatures = template && template.hasEditableSubject;

  // Check if structure already matches
  const existingSubjectLine = document.getElementById('subjectLineContainer');
  const isEnhancedStructure = !!existingSubjectLine;
  const hasContent = elements.outputCard.childElementCount > 0;

  if (hasContent && hasEnhancedFeatures === isEnhancedStructure) {
    // Structure is already correct, just ensure elements are cached
    if (!elements.outputArea)
      elements.outputArea = document.getElementById('outputArea');
    if (!elements.copyBtn)
      elements.copyBtn = document.getElementById('copyBtn');
    if (!elements.emailPreview)
      elements.emailPreview = document.getElementById('emailPreview');
    return;
  }

  // Clear dynamic element cache before rebuilding DOM
  elements.outputArea = null;
  elements.copyBtn = null;
  elements.subjectLineContainer = null;
  elements.downloadEmailBtn = null;

  // Clear tab-related elements
  elements.previewTab = null;
  elements.htmlTab = null;
  elements.previewContentRegular = null;
  elements.htmlContentRegular = null;
  elements.emailPreview = null;

  let subjectLineSection = '';
  let buttonGroup = '';

  if (hasEnhancedFeatures) {
    // Enhanced templates get subject line editing and dual email options
    subjectLineSection = `
            <div id="subjectLineContainer" class="subject-line-container">
                <div id="subjectLineContent"></div>
            </div>
        `;

    buttonGroup = `
            <div class="button-group">
                <button class="btn" id="copyBtn" title="Copy the message to clipboard">Copy Message</button>
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
                ${eyePreviewIcon({ size: 14 })}
                Preview
            </button>
            <button class="output-tab" data-tab="text" title="View the plain text output">
                ${textLinesIcon({ size: 14 })}
                Text
            </button>
        </div>

        <!-- Preview Tab Content -->
        <div class="output-content active" id="previewContent">
            <div class="email-preview-editable" id="emailPreview" contenteditable="true" title="Email preview - click to edit"></div>
        </div>

        <!-- Text Tab Content -->
        <div class="output-content" id="textContent">
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
  elements.textTab = document.querySelector('.output-tab[data-tab="text"]');
  elements.previewContentRegular = document.getElementById('previewContent');
  elements.textContentRegular = document.getElementById('textContent');
  elements.emailPreview = document.getElementById('emailPreview');

  // Set initial empty state placeholder
  if (elements.emailPreview) {
    clearEmailPreview();
  }

  // Re-attach copy button handler
  if (elements.copyBtn) {
    elements.copyBtn.addEventListener('click', copyToClipboard);
  }

  // Add tab switching functionality with conditional sync
  if (elements.previewTab && elements.textTab) {
    // Preview tab click handler
    elements.previewTab.addEventListener('click', () => {
      // Activate preview tab
      elements.previewTab.classList.add('active');
      elements.textTab.classList.remove('active');

      // Show preview content
      if (elements.previewContentRegular) {
        elements.previewContentRegular.classList.add('active');
      }
      if (elements.textContentRegular) {
        elements.textContentRegular.classList.remove('active');
      }

      // Only sync if text was edited (pending sync from text)
      if (pendingSync === 'text') {
        clearTimeout(syncDebounceTimer);
        syncTextToPreview();
        pendingSync = null;
      }
    });

    // Text tab click handler
    elements.textTab.addEventListener('click', () => {
      // Activate text tab
      elements.textTab.classList.add('active');
      elements.previewTab.classList.remove('active');

      // Show text content
      if (elements.textContentRegular) {
        elements.textContentRegular.classList.add('active');
      }
      if (elements.previewContentRegular) {
        elements.previewContentRegular.classList.remove('active');
      }

      // Only sync if preview was edited (pending sync from preview)
      if (pendingSync === 'preview') {
        clearTimeout(syncDebounceTimer);
        syncPreviewToText();
        pendingSync = null;
      }
    });
  }

  // Add input listener to textarea for sync
  if (elements.outputArea) {
    elements.outputArea.addEventListener('input', () => debouncedSync('text'));
  }

  // Add enhanced feature handlers if applicable
  if (hasEnhancedFeatures) {
    const downloadEmailBtn = document.getElementById('downloadEmailBtn');

    if (downloadEmailBtn) {
      downloadEmailBtn.addEventListener('click', () => {
        // Use the assembled text output from the textarea
        const outputArea = document.getElementById('outputArea');
        const content = outputArea ? outputArea.value : '';
        if (content && currentTemplate) {
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

export { writeEmptyStateToIframe, detectOS, getRecommendedFormat };

// Load user profile from localStorage
export function loadUserProfile() {
  const profile = getUserProfile();
  if (profile) {
    appState.userProfile = profile;
  }
}

// Attach event listeners to form fields
export function attachGlobalEventListeners() {
  // Template selector
  if (elements.templateSelect) {
    elements.templateSelect.addEventListener('change', () => {
      selectTemplate(elements.templateSelect.value);
    });
  }

  // Generate button
  if (elements.generateBtn) {
    elements.generateBtn.addEventListener('click', generateMessage);
  }

  // Clear button
  if (elements.clearBtn) {
    elements.clearBtn.addEventListener('click', clearAll);
  }

  // Theme toggle
  if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme);
  }

  // Theme change events (dispatched from shared/theme.js)
  document.addEventListener('theme:changed', () => {
    if (currentTemplate) {
      updateEmailPreview();
    }
  });

  // Search box
  if (elements.searchBox) {
    elements.searchBox.addEventListener('input', () => {
      const query = elements.searchBox.value.trim();
      elements.clearSearch.classList.toggle('visible', query.length > 0);
      renderSearchResults(query);
    });
  }

  // Clear search button
  if (elements.clearSearch) {
    elements.clearSearch.addEventListener('click', () => {
      elements.searchBox.value = '';
      elements.clearSearch.classList.remove('visible');
      renderSearchResults('');
    });
  }

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
        elements.searchBox.value = '';
        elements.searchBox.classList.remove('active');
        elements.clearSearch.classList.remove('visible');
        elements.searchResults.classList.remove('visible');
      }
    });
  }

  // Form Fields Delegation (moved from selectTemplate)
  if (elements.formFields) {
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
  }
}

// Generate message based on the selected template and inputs
export function generateMessage() {
  const template = templates[currentTemplate];
  if (!template) {
    showToast('Please select a template first');
    return;
  }

  // --- Standard Template Generation ---

  const data = {};

  // Collect data from form fields
  template.fields.forEach((field) => {
    // Check if this is a radio button field
    const radioGroup = document.querySelector(`[data-field="${field}"]`);
    if (radioGroup && radioGroup.classList.contains('radio-group')) {
      const selectedRadio = radioGroup.querySelector(
        'input[type="radio"]:checked'
      );
      data[field] = selectedRadio ? selectedRadio.value : '';
    } else {
      // Regular input or textarea
      const input = document.getElementById(field);
      if (input) {
        data[field] = input.value;
      } else {
        // Field not found, set empty value
        data[field] = '';
      }
    }
  });

  // Generate the message with error handling
  let templateResult;
  try {
    templateResult = template.generate(data);
  } catch (error) {
    console.error('Error generating message:', error);
    showToast('Error generating message: ' + error.message);
    return;
  }

  // Get body content
  const bodyWithSubject =
    typeof templateResult === 'object' ? templateResult.body : templateResult;

  // Extract and strip subject line from body (subject shown separately in editable field)
  let subject = '';
  let bodyWithoutSubject = bodyWithSubject;
  const subjectMatch = bodyWithSubject.match(/^Subject:\s*(.+)/m);
  if (subjectMatch) {
    subject = subjectMatch[1];
    bodyWithoutSubject = bodyWithSubject.replace(/^Subject:.+\n/, '').trim();
  }

  // Store subject for later use
  currentSubjectLine = subject;

  // Show the regular output area
  showRegularOutput();

  // Update output area with body (without subject) + signature
  const outputArea = document.getElementById('outputArea');
  if (outputArea) {
    const includeSignature =
      typeof templateResult === 'object'
        ? templateResult.includeSignature !== false
        : true;
    if (includeSignature) {
      outputArea.value = `${bodyWithoutSubject}\n${getEmployeeSignature('text')}`;
    } else {
      outputArea.value = bodyWithoutSubject;
    }
  }

  // Reset edited content and store template result (with body stripped of subject)
  editedBodyContent = null;
  originalMessageContent = {
    body: bodyWithoutSubject,
    includeSignature:
      typeof templateResult === 'object'
        ? templateResult.includeSignature
        : true,
  };

  // Update the email preview (will use originalMessageContent.body which is now without subject)
  updateEmailPreview();

  // Update editable subject line if applicable
  if (template.hasEditableSubject) {
    const subjectContainer = document.getElementById('subjectLineContent');
    if (subjectContainer) {
      renderEditableSubjectLine(subjectContainer, subject);
    }
  }

  // Scroll to output
  elements.outputCard.scrollIntoView({ behavior: 'smooth' });

  // Capture state after successful generation
}

// Clear all fields and output
export function clearAll() {
  const template = templates[currentTemplate];

  // Clear all inputs for the current template
  if (template && Array.isArray(template.fields)) {
    template.fields.forEach((field) => {
      const fieldId = typeof field === 'string' ? field : field?.id;
      if (!fieldId) return;

      const input = document.getElementById(fieldId);
      if (!input) return;

      // Restore initial (profile-derived) value
      let defaultValue = '';
      if (appState.userProfile) {
        if (
          (fieldId === 'employeeName' || fieldId === 'yourName') &&
          appState.userProfile.employeeName
        ) {
          defaultValue = appState.userProfile.employeeName;
        } else if (fieldId === 'jobTitle' && appState.userProfile.jobTitle) {
          defaultValue = appState.userProfile.jobTitle;
        } else if (
          fieldId === 'companyEmail' &&
          appState.userProfile.companyEmail
        ) {
          defaultValue = appState.userProfile.companyEmail;
        } else if (fieldId === 'storeName' && appState.userProfile.storeName) {
          defaultValue = appState.userProfile.storeName;
        } else if (
          fieldId === 'storeLocation' &&
          appState.userProfile.storeLocation
        ) {
          defaultValue = appState.userProfile.storeLocation;
        } else if (
          fieldId === 'storePhone' &&
          appState.userProfile.storePhone
        ) {
          defaultValue = appState.userProfile.storePhone;
        } else if (
          fieldId === 'storeEmail' &&
          appState.userProfile.storeEmail
        ) {
          defaultValue = appState.userProfile.storeEmail;
        }
      }

      input.value = defaultValue;
      input.classList.remove('invalid');

      // Show/hide per-field clear button based on whether the restored value is non-empty
      const clearBtn = elements.formFields?.querySelector(
        `[data-clear="${fieldId}"]`
      );
      if (clearBtn) {
        clearBtn.classList.toggle('visible', defaultValue.trim().length > 0);
      }

      // Hide validation message if present
      const validationMsg = input.nextElementSibling;
      if (validationMsg && validationMsg.classList.contains('validation-msg')) {
        validationMsg.style.display = 'none';
      }
    });
  }

  // Reset all edit state
  resetEditState();

  // Rebuild output card structure (keeps layout consistent for enhanced templates)
  showRegularOutput();

  const outputArea = document.getElementById('outputArea');
  if (outputArea) outputArea.value = '';

  const subjectLineContent = document.getElementById('subjectLineContent');
  if (subjectLineContent && template?.hasEditableSubject) {
    renderEditableSubjectLine(subjectLineContent, '');
  }

  // Clear the preview (now a contenteditable div, not iframe)
  clearEmailPreview();

  showToast('✓ Form cleared');
}

// ===== GENERAL EMAIL FUNCTIONS =====

// Extract subject line from a full message string
export function extractSubjectLine(message) {
  const match = message.match(/^Subject:\s*(.*)/im);
  return match ? match[1] : '';
}

// Render editable subject line for simple templates
export function renderEditableSubjectLine(container, initialSubject) {
  currentSubjectLine = initialSubject;

  // Match CSS styling for the subject capsule
  container.innerHTML = `
        <label for="subjectInput" class="subject-label">Subject</label>
        <input
            type="text"
            id="subjectInput"
            class="subject-input"
            placeholder="Enter a subject line..."
            value="${escapeAttr(initialSubject)}"
        >
    `;

  const subjectInput = document.getElementById('subjectInput');
  if (subjectInput) {
    subjectInput.addEventListener('input', (e) => {
      currentSubjectLine = e.target.value;
      // Debounce the preview update to avoid excessive iframe reloads
      // debouncedSubjectPreviewUpdate(e.target.value); // Not defined?
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
    subject = currentSubjectLine || extractSubjectLine(content);
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

  // Check if signature should be included using helper
  const includeSignature = shouldIncludeSignature();

  // Use edited content if available, otherwise get from originalMessageContent or fallback to content
  // Body content is already without subject line (stripped at generation time)
  const bodyContent =
    editedBodyContent ||
    (originalMessageContent && typeof originalMessageContent === 'object'
      ? originalMessageContent.body
      : null) ||
    content;

  // Get subject from currentSubjectLine (set at generation time)
  const subject = currentSubjectLine || '';

  // Check if content is HTML or plain text
  const isHTML = isHTMLContent(bodyContent);
  let htmlBody;

  if (isHTML) {
    // Already HTML, use as-is
    htmlBody = bodyContent;
  } else {
    // Convert body to HTML
    const htmlBodyContent = plainTextToPreviewHTML(bodyContent);

    // Get HTML signature if needed
    const htmlSignature = includeSignature ? getEmployeeSignature('html') : '';

    // Build complete HTML document in Outlook format
    htmlBody = `<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
</head>
<body>
<div dir="ltr" style="font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">
${htmlBodyContent}
</div>${
      htmlSignature
        ? `
<div id="ms-outlook-mobile-signature">
${htmlSignature}
</div>`
        : ''
    }
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
  attachGlobalEventListeners();

  // Restore previously selected template from localStorage
  const savedTemplate = localStorage.getItem('selectedTemplate');
  if (savedTemplate && templates[savedTemplate]) {
    selectTemplate(savedTemplate);
  }
  // If no saved template, leave the placeholder selected (blank state)
}

// ===== MISSING FUNCTIONS FROM BACKUP =====

// Search tracking variable

// Simple HTML conversion for email preview (handles basic formatting without signature processing)
// Moved to emailPreviewUtils.plainTextToPreviewHTML

// Generate empty state placeholder HTML for preview
function getEmptyStateHTML() {
  return `
    <div class="preview-empty-state">
      ${emailIcon({ size: 80 })}
      <h3>No Preview Yet</h3>
      <p>Content will appear here when you generate a message</p>
    </div>
  `;
}

// Clear email preview (contenteditable div)
export function clearEmailPreview() {
  const emailPreview = document.getElementById('emailPreview');
  if (emailPreview) {
    emailPreview.innerHTML = getEmptyStateHTML();
  }
}

// Get CSS that simulates email client dark mode color inversion
// Moved to shared/theme.js

// Update email preview for regular templates
// Renders editable preview with two-way sync capability
export function updateEmailPreview() {
  const emailPreview = document.getElementById('emailPreview');
  const previewTab = document.querySelector('.output-tab[data-tab="preview"]');

  if (!emailPreview) return;

  // Get body content (WITHOUT signature) from editedBodyContent or original template
  let bodyContent = '';
  if (editedBodyContent !== null) {
    bodyContent = editedBodyContent;
  } else if (
    originalMessageContent &&
    typeof originalMessageContent === 'object' &&
    originalMessageContent.body
  ) {
    bodyContent = originalMessageContent.body;
  }

  if (!bodyContent) {
    emailPreview.innerHTML = getEmptyStateHTML();
    return;
  }

  // Enable the preview tab (make it clickable) but don't change which tab is active
  if (previewTab) {
    previewTab.disabled = false;
    previewTab.style.opacity = '1';
    previewTab.style.cursor = 'pointer';
  }

  // Body content is already without subject (stripped at generation time)
  // Convert body to HTML (handles paragraphs, lists, line breaks)
  // Use forPreview: true for theme-aware colors in the preview
  const htmlBody = plainTextToPreviewHTML(bodyContent, {
    forPreview: true,
  });

  // Get HTML signature if needed (use forPreview for theme-aware colors)
  const htmlSignature = shouldIncludeSignature()
    ? getEmployeeSignature('html', { forPreview: true })
    : '';

  // Build editable preview HTML (no extra whitespace to avoid text node issues)
  const signatureHTML = htmlSignature
    ? `<div class="email-signature-protected" contenteditable="false"><div class="signature-lock-indicator">🔒 Protected Signature</div>${htmlSignature}</div>`
    : '';
  const previewHTML = `<div class="email-body-editable">${htmlBody}</div>${signatureHTML}`;

  // Render into contenteditable div
  emailPreview.innerHTML = previewHTML;

  // Attach input event listener for sync (if not already attached)
  if (!emailPreview.dataset.syncAttached) {
    emailPreview.addEventListener('input', () => debouncedSync('preview'));
    // Add paste listener to strip formatting
    emailPreview.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      insertPlainText(emailPreview, text);
      debouncedSync('preview');
    });
    emailPreview.dataset.syncAttached = 'true';
  }
}

// Sync preview → text (extract body from preview, rebuild full text with signature)
function syncPreviewToText() {
  if (isSyncing) return;
  isSyncing = true;

  const emailPreview = document.getElementById('emailPreview');
  const outputArea = document.getElementById('outputArea');

  if (emailPreview && outputArea) {
    // Get body only (without signature) from preview
    const bodyText = getPlainTextFromPreview(emailPreview);
    editedBodyContent = bodyText;

    // Rebuild full text for textarea: body + signature
    if (shouldIncludeSignature()) {
      outputArea.value = `${bodyText}\n${getEmployeeSignature('text')}`;
    } else {
      outputArea.value = bodyText;
    }
  }

  isSyncing = false;
}

// Strip signature from text content (look for signature separator line)
function stripSignatureFromText(text) {
  // Signature starts with a line of underscores (separator)
  // Pattern: Employee Name │ Title\n_______...\n
  const signatureSeparator = /\n[^\n]*│[^\n]*\n_{10,}/;
  const match = text.match(signatureSeparator);
  if (match) {
    return text.substring(0, match.index).trim();
  }
  return text;
}

// Sync text → preview (extract body without signature, render as HTML)
function syncTextToPreview() {
  if (isSyncing) return;
  isSyncing = true;

  const outputArea = document.getElementById('outputArea');
  if (outputArea) {
    // Strip signature from text to get body only
    const bodyText = stripSignatureFromText(outputArea.value);
    editedBodyContent = bodyText;
    updateEmailPreview();
  }

  isSyncing = false;
}

// Debounced sync to prevent excessive updates
function debouncedSync(source) {
  // Mark that this source has pending changes
  pendingSync = source;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    if (source === 'preview') {
      syncPreviewToText();
    } else {
      syncTextToPreview();
    }
    pendingSync = null;
  }, 300);
}

// Populate template dropdown with categories
export function populateDropdown() {
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

    // Clear the preview and reset all edit state
    clearEmailPreview();
    resetEditState();
    const outputElem = document.getElementById('outputArea');
    if (outputElem) {
      outputElem.value = '';
    }

    // Save selected template to localStorage for persistence across refreshes
    localStorage.setItem('selectedTemplate', key);

    elements.templateSelect.value = key;

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

// Copy output to clipboard
export function copyToClipboard() {
  // Get body content only (without signature)
  // Priority: editedBodyContent > originalMessageContent.body > stripped from outputArea
  let textToCopy = '';

  if (editedBodyContent !== null) {
    textToCopy = editedBodyContent;
  } else if (
    originalMessageContent &&
    typeof originalMessageContent === 'object' &&
    originalMessageContent.body
  ) {
    textToCopy = originalMessageContent.body;
  } else {
    // Fallback: strip signature from outputArea
    const outputArea = document.getElementById('outputArea');
    if (outputArea && outputArea.value) {
      textToCopy = stripSignatureFromText(outputArea.value);
    }
  }

  if (!textToCopy) {
    showToast('⚠ Nothing to copy');
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(textToCopy)
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
      // Create temporary textarea with body-only text
      const tempTextarea = document.createElement('textarea');
      tempTextarea.value = textToCopy;
      tempTextarea.style.position = 'fixed';
      tempTextarea.style.opacity = '0';
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(tempTextarea);
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
