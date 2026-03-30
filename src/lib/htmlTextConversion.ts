/**
 * HTML ↔ Text Conversion Utilities
 * Handles bidirectional conversion between HTML content and plain text format.
 * Migrated from src/js/shared/htmlTextConversion.js
 */

/**
 * Extract editable content from preview div, excluding signature.
 * @param previewElement - The contenteditable preview element
 * @returns HTML content of body only (no signature)
 */
export function extractEditableContent(
  previewElement: HTMLElement | null
): string {
  if (!previewElement) return '';

  const clone = previewElement.cloneNode(true) as HTMLElement;

  const signatureBlock = clone.querySelector('.email-signature-protected');
  if (signatureBlock) {
    signatureBlock.remove();
  }

  const bodyWrapper = clone.querySelector('.email-body-editable');
  return bodyWrapper ? bodyWrapper.innerHTML : clone.innerHTML;
}

/**
 * Convert HTML content to plain text.
 * Handles: paragraphs, line breaks, lists, and preserves structure.
 */
export function htmlToPlainText(
  htmlContent: string | null | undefined
): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return '';
  }

  const temp = document.createElement('div');
  temp.innerHTML = htmlContent;

  let text = '';

  const processNode = (node: Node): void => {
    const nodeName = node.nodeName.toLowerCase();

    if (node.nodeType === Node.TEXT_NODE) {
      const content = node.textContent;
      if (content && content.trim()) {
        text += content;
      }
    } else if (nodeName === 'p') {
      const isEmptyParagraph =
        node.childNodes.length === 0 ||
        (node.childNodes.length === 1 &&
          (node.childNodes[0].nodeName === 'BR' ||
            (node.childNodes[0].nodeType === Node.TEXT_NODE &&
              !(node.childNodes[0].textContent || '').trim())));

      if (isEmptyParagraph) {
        text += '\n\n';
      } else {
        if (!text.endsWith('\n')) {
          text += '\n';
        }
        Array.from(node.childNodes).forEach(processNode);
        text += '\n\n';
      }
    } else if (nodeName === 'br') {
      text += '\n';
    } else if (nodeName === 'li') {
      text += '• ';
      Array.from(node.childNodes).forEach(processNode);
      text += '\n';
    } else if (nodeName === 'ul' || nodeName === 'ol') {
      Array.from(node.childNodes).forEach(processNode);
    } else if (
      nodeName === 'div' ||
      nodeName === 'span' ||
      nodeName === 'strong' ||
      nodeName === 'em' ||
      nodeName === 'b' ||
      nodeName === 'i'
    ) {
      Array.from(node.childNodes).forEach(processNode);
    } else if (nodeName === 'a') {
      text += node.textContent;
    } else {
      Array.from(node.childNodes).forEach(processNode);
    }
  };

  Array.from(temp.childNodes).forEach(processNode);

  text = text.trim();

  return text;
}

/**
 * Insert plain text into contenteditable while stripping formatting.
 * Used for paste handling to prevent users from pasting formatted content.
 */
export function insertPlainText(
  element: HTMLElement | null,
  plainText: string | null
): void {
  if (!element || !plainText) return;

  const selection = window.getSelection();

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(plainText);
    range.insertNode(textNode);

    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    element.textContent += plainText;
  }
}

/**
 * Get plain text from contenteditable, excluding signature.
 */
export function getPlainTextFromPreview(
  previewElement: HTMLElement | null
): string {
  const htmlContent = extractEditableContent(previewElement);
  return htmlToPlainText(htmlContent);
}
