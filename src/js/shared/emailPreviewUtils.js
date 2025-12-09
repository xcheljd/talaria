// Shared helpers for email preview formatting.

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} text - Text to escape.
 * @returns {string} Escaped text safe for HTML.
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Simple HTML conversion for email preview (handles basic formatting
 * without signature processing). This mirrors the logic that previously
 * lived in ui.js.
 *
 * - Double newlines become paragraph breaks.
 * - Single newlines are preserved as <br> inside paragraphs.
 * - Bullet / dash lists are converted to <ul><li>.
 */
export function plainTextToPreviewHTML(plainText) {
  // Helper to escape HTML
  const esc = (str) => escapeHtml(str);

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
    }

    // Regular paragraph - convert single line breaks to <br>
    const htmlContent = lines.map((line) => esc(line)).join('<br>');
    return `    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);">${htmlContent}</p>`;
  });

  return htmlParagraphs.filter((p) => p).join('\n');
}

/**
 * Wrap HTML content in proper email preview template.
 * Extracts subject from either window.originalMessageContent or the
 * provided htmlContent, then wraps body in a consistent email shell.
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
