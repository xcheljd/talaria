/**
 * HTML ↔ Text Conversion Utilities
 * Handles bidirectional conversion between HTML content (from contenteditable)
 * and plain text format (for textarea and EML files)
 */

/**
 * Extract editable content from preview div, excluding signature
 * @param {HTMLElement} previewElement - The contenteditable preview element
 * @returns {string} HTML content of body only (no signature)
 */
export function extractEditableContent(previewElement) {
  if (!previewElement) return '';

  // Clone the element to avoid modifying the DOM
  const clone = previewElement.cloneNode(true);

  // Remove the signature protection wrapper
  const signatureBlock = clone.querySelector('.email-signature-protected');
  if (signatureBlock) {
    signatureBlock.remove();
  }

  // Get the body wrapper
  const bodyWrapper = clone.querySelector('.email-body-editable');
  return bodyWrapper ? bodyWrapper.innerHTML : clone.innerHTML;
}

/**
 * Convert HTML content to plain text
 * Handles: paragraphs, line breaks, lists, and preserves structure
 * @param {string} htmlContent - HTML to convert
 * @returns {string} Plain text with preserved structure
 */
export function htmlToPlainText(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  // Create temporary container
  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;

  // Process the content
  let text = '';

  // Walk through all nodes
  const processNode = (node) => {
    const nodeName = node.nodeName.toLowerCase();

    if (node.nodeType === Node.TEXT_NODE) {
      // Skip whitespace-only text nodes (from HTML formatting)
      const content = node.textContent;
      if (content.trim()) {
        text += content;
      }
    } else if (nodeName === 'p') {
      // Check if paragraph is empty (only contains <br> or whitespace)
      const isEmptyParagraph =
        node.childNodes.length === 0 ||
        (node.childNodes.length === 1 &&
          (node.childNodes[0].nodeName === 'BR' ||
            (node.childNodes[0].nodeType === Node.TEXT_NODE &&
              !node.childNodes[0].textContent.trim())));

      if (isEmptyParagraph) {
        // Empty paragraph = extra blank line (preserve user's spacing)
        text += '\n\n';
      } else {
        // Regular paragraph: add content then double newline
        text += text.endsWith('\n') ? '' : '\n';
        Array.from(node.childNodes).forEach(processNode);
        text += '\n\n';
      }
    } else if (nodeName === 'br') {
      // Line breaks: single newline
      text += '\n';
    } else if (nodeName === 'li') {
      // List items: prefix with bullet, single newline
      text += '• ';
      Array.from(node.childNodes).forEach(processNode);
      text += '\n';
    } else if (nodeName === 'ul' || nodeName === 'ol') {
      // Lists: process items
      Array.from(node.childNodes).forEach(processNode);
    } else if (
      nodeName === 'div' ||
      nodeName === 'span' ||
      nodeName === 'strong' ||
      nodeName === 'em' ||
      nodeName === 'b' ||
      nodeName === 'i'
    ) {
      // Inline containers: process children without adding structure
      Array.from(node.childNodes).forEach(processNode);
    } else if (nodeName === 'a') {
      // Links: extract text content
      text += node.textContent;
    } else {
      // All other elements: process children
      Array.from(node.childNodes).forEach(processNode);
    }
  };

  // Process all child nodes
  Array.from(temp.childNodes).forEach(processNode);

  // Clean up: only remove leading/trailing whitespace
  // Preserve internal multiple newlines (user's intentional spacing)
  text = text.trim();

  return text;
}

/**
 * Insert plain text into contenteditable while stripping formatting
 * Used for paste handling to prevent users from pasting formatted content
 * @param {HTMLElement} element - The contenteditable element
 * @param {string} plainText - Plain text to insert
 */
export function insertPlainText(element, plainText) {
  if (!element || !plainText) return;

  // Get current selection
  const selection = window.getSelection();

  if (selection.rangeCount > 0) {
    // Delete selected content
    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Create text node and insert
    const textNode = document.createTextNode(plainText);
    range.insertNode(textNode);

    // Move cursor after inserted text
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // Fallback: just append
    element.textContent += plainText;
  }
}

/**
 * Get plain text from contenteditable, excluding signature
 * @param {HTMLElement} previewElement - The contenteditable preview element
 * @returns {string} Plain text content
 */
export function getPlainTextFromPreview(previewElement) {
  const htmlContent = extractEditableContent(previewElement);
  return htmlToPlainText(htmlContent);
}
