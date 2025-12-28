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
 * Simple HTML conversion for email content (handles basic formatting).
 *
 * - Double newlines become paragraph breaks.
 * - Single newlines are preserved as <br> inside paragraphs.
 * - Bullet / dash lists are converted to <ul><li>.
 *
 * @param {string} plainText - Plain text to convert
 * @param {Object} options - Options
 * @param {boolean} options.forPreview - If true, uses theme-aware colors for preview iframe. Default false (standard email colors).
 */
export function plainTextToPreviewHTML(plainText, { forPreview = false } = {}) {
  // Helper to escape HTML
  const esc = (str) => escapeHtml(str);

  // Use standard email colors by default, theme-aware only for preview
  let textColor = 'rgb(0, 0, 0)'; // Standard black for emails

  if (forPreview) {
    const isDarkMode =
      typeof window !== 'undefined' &&
      window.parent?.document?.documentElement?.getAttribute('data-theme') ===
        'dark';
    textColor = isDarkMode ? '#e0e0e0' : 'rgb(0, 0, 0)';
  }

  // Split into paragraphs (exactly double line break = new paragraph)
  // Using exact split preserves extra blank lines as empty segments
  const paragraphs = plainText.split(/\n\n/);

  const htmlParagraphs = paragraphs.map((para) => {
    // Empty paragraphs become spacing (preserves extra blank lines)
    if (!para.trim()) {
      return `<p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;"><br></p>`;
    }

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
          return `        <li style="margin: 5px 0; color: ${textColor};">${esc(text)}</li>`;
        })
        .join('\n');
      return `    <ul style="margin: 10px 0; padding-left: 20px; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: ${textColor};">
${listItems}
    </ul>`;
    }

    // Regular paragraph - convert single line breaks to <br>
    const htmlContent = lines.map((line) => esc(line)).join('<br>');
    return `    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: ${textColor};">${htmlContent}</p>`;
  });

  return htmlParagraphs.filter((p) => p).join('\n');
}

/**
 * Wrap HTML content in proper email preview template.
 * Extracts subject from either originalMessage or the
 * provided htmlContent, then wraps body in a consistent email shell.
 * @param {string} htmlContent - The HTML content to wrap
 * @param {string} [originalMessage] - Optional original full message to extract subject from
 */
export function wrapHtmlForEmailPreview(htmlContent, originalMessage) {
  // Try to extract subject from original message or content
  let subject = 'Email Preview';
  let bodyContent = htmlContent;

  // Extract subject if present
  if (originalMessage) {
    const subjectMatch = originalMessage.match(/^Subject:\s*(.+)/m);
    if (subjectMatch) {
      subject = subjectMatch[1];
      bodyContent = originalMessage.replace(/^Subject:.+\n/m, '').trim();
    }
  } else {
    const subjectMatch = htmlContent.match(/^Subject:\s*(.+)/m);
    if (subjectMatch) {
      subject = subjectMatch[1];
      bodyContent = htmlContent.replace(/^Subject:.+\n/m, '').trim();
    }
  }

  // Detect if parent window is in dark mode
  const isDarkMode =
    window.parent?.document?.documentElement?.getAttribute('data-theme') ===
    'dark';

  // Define theme-aware colors
  const colors = isDarkMode
    ? {
        background: '#1e1e1e',
        text: '#e0e0e0',
        headerBg: '#2d2d2d',
        headerBorder: '#404040',
        headerText: '#f0f0f0',
        link: '#4da6ff', // Brighter blue for dark mode
      }
    : {
        background: '#ffffff',
        text: '#000000',
        headerBg: '#f5f5f5',
        headerBorder: '#dddddd',
        headerText: '#333333',
        link: '#0066cc', // Standard blue for light mode
      };

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
            color: ${colors.text};
            margin: 0;
            padding: 20px;
            background-color: ${colors.background};
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        .email-header {
            padding: 10px;
            background-color: ${colors.headerBg};
            border-bottom: 2px solid ${colors.headerBorder};
            margin-bottom: 20px;
        }
        .email-subject {
            font-size: 14pt;
            font-weight: 600;
            color: ${colors.headerText};
        }
        /* Override inline link colors for better visibility */
        a, a:link, a:visited {
            color: ${colors.link} !important;
            text-decoration: underline;
        }
        a:hover {
            opacity: 0.8;
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
