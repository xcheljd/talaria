// Constants
export { TOAST_DURATION_MS } from './shared/ui-utils.js';

// Global variable for current template (used by modules)
export let currentTemplate = null;

// Module-scoped state (replaces window.* globals)
let originalMessageContent = null;
let currentSubjectLine = null;

// Global variables for app state (used by modules)

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

import { appState } from './state.js';
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
import { toggleTheme, getEmailDarkModeCSS } from './shared/theme.js';
import {
  showToast,
  detectOS,
  getRecommendedFormat,
  writeEmptyStateToIframe,
  TOAST_DURATION_MS,
} from './shared/ui-utils.js';
import { eyePreviewIcon, codeBracketsIcon, emailIcon } from './shared/icons.js';
import {
  parseEmailList,
  isValidEmail,
  encodeQuotedPrintable,
  encodeFilename,
  createEMLFile,
} from './shared/emailUtils.js';
import {
  plainTextToPreviewHTML,
  wrapHtmlForEmailPreview,
  escapeHtml,
} from './shared/emailPreviewUtils.js';

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
  elements.themeToggle = document.getElementById('themeToggle');

  // Search elements
  elements.searchBox = document.getElementById('searchBox');
  elements.clearSearch = document.getElementById('clearSearch');
  elements.searchResults = document.getElementById('searchResults');
  elements.resultCounter = document.getElementById('resultCounter');
}

export function getDynamicElement(id) {
  return document.getElementById(id);
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
  elements.sendEmailBtn = null;
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
                ${eyePreviewIcon({ size: 16 })}
                Preview
            </button>
            <button class="output-tab" data-tab="html" title="View the raw HTML code">
                ${codeBracketsIcon({ size: 16 })}
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
      if (elements.outputArea && originalMessageContent) {
        elements.outputArea.value = originalMessageContent;
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
          originalMessageContent || (outputArea ? outputArea.value : '');
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

export { writeEmptyStateToIframe, detectOS, getRecommendedFormat };

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

// Render How to Shop section (wrapper with expand/collapse)

// Render Important Notes section (wrapper with expand/collapse)

// Ensure profile store directions / location notes are represented in Important Notes

// Initialize default How to Shop and Important Notes items

// ===== PDF Preview Modal Functions =====

// Handle undo/redo shortcuts

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
  if (!template) return true;

  // Get validation config from fieldConfig
  const config = fieldConfig[fieldId] || {};
  if (!config.validation) return true;

  // Define validation patterns and messages
  const validationRules = {
    currency: {
      pattern: /^\d+(\.\d{1,2})?$/,
      message: 'Please enter a valid price (e.g., 299 or 299.99)',
    },
    number: {
      pattern: /^\d+$/,
      message: 'Please enter a valid number',
    },
    tracking: {
      pattern: /^[A-Z0-9]{10,}$/i,
      message: 'Please enter a valid tracking number',
    },
  };

  const validation = validationRules[config.validation];
  if (!validation) return true;

  const isValid = validation.pattern.test(input.value.trim());

  input.classList.toggle('invalid', !isValid);

  // Show/hide validation message
  let validationMsg = input.nextElementSibling;
  if (!validationMsg || !validationMsg.classList.contains('validation-msg')) {
    validationMsg = document.createElement('div');
    validationMsg.className = 'validation-msg';
    input.parentNode.insertBefore(validationMsg, input.nextSibling);
  }

  validationMsg.textContent = isValid ? '' : validation.message;
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
      const input = getDynamicElement(field);
      if (input) {
        data[field] = input.value;
      } else {
        // Field not found, set empty value
        data[field] = '';
      }
    }
  });

  // Generate the message with error handling
  let message;
  try {
    message = template.generate(data);
  } catch (error) {
    console.error('Error generating message:', error);
    showToast('Error generating message: ' + error.message);
    return;
  }

  // Show the regular output area
  showRegularOutput();

  // Update output area and email preview
  const outputArea = getDynamicElement('outputArea');
  if (outputArea) {
    outputArea.value = message;
  }

  // Store original message for EML generation
  originalMessageContent = message;

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

  // Clear output
  if (elements.outputArea) {
    elements.outputArea.value = '';
  }
  if (elements.outputCard) {
    elements.outputCard.innerHTML = '';
  }

  // Reset email preview for other templates
  updateEmailPreview();

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

  container.innerHTML = `
        <div class="editable-subject-line">
            <label for="subjectInput" class="form-label">Subject:</label>
            <input type="text" id="subjectInput" class="form-input" value="${escapeAttr(initialSubject)}">
        </div>
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

  let subject = '';
  let plainTextBody = content;

  if (template.hasEditableSubject) {
    subject = currentSubjectLine || extractSubjectLine(content);
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

// Clear email preview iframe
export function clearEmailPreview() {
  const emailPreview = document.getElementById('emailPreview');
  if (emailPreview) {
    writeEmptyStateToIframe(emailPreview);
  }
}

// Get CSS that simulates email client dark mode color inversion
// Moved to shared/theme.js

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
    writeEmptyStateToIframe(emailPreview);
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
      htmlTemplate = wrapHtmlForEmailPreview(content, originalMessageContent);
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

    // Check if app is in dark mode - if so, simulate email client dark mode
    const currentTheme =
      document.documentElement.getAttribute('data-theme') || 'light';
    let previewHtml = htmlTemplate;

    if (currentTheme === 'dark') {
      // Inject dark mode simulation CSS into the email HTML
      previewHtml = htmlTemplate.replace(
        '</head>',
        `<style id="dark-mode-sim">${getEmailDarkModeCSS()}</style></head>`
      );
    }

    emailPreview.srcdoc = previewHtml;
  }
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

    // Clear the preview iframe, output, and cached content immediately
    clearEmailPreview();
    originalMessageContent = '';
    const outputElem = getDynamicElement('outputArea');
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

// Check if template is complex (needs EML download vs simple mailto)
// Extract date range from HTML content, generate filenames, and build BCC batch EML files
// are now provided by emailUtils.js
