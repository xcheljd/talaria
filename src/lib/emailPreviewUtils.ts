/**
 * Shared helpers for email preview formatting.
 * Migrated from src/js/shared/emailPreviewUtils.js
 */

import { sanitizeHTML } from './html-utils';
import { isIframePreviewDarkMode } from './theme-utils';

export interface PreviewHTMLOptions {
  forPreview?: boolean;
}

/**
 * Simple HTML conversion for email content (handles basic formatting).
 *
 * - Double newlines become paragraph breaks.
 * - Single newlines are preserved as <br> inside paragraphs.
 * - Bullet / dash lists are converted to <ul><li>.
 */
export function plainTextToPreviewHTML(
  plainText: string,
  { forPreview = false }: PreviewHTMLOptions = {}
): string {
  const esc = (str: string): string => sanitizeHTML(str);

  let textColor = 'rgb(0, 0, 0)';

  if (forPreview) {
    textColor = isIframePreviewDarkMode() ? '#e0e0e0' : 'rgb(0, 0, 0)';
  }

  const paragraphs = plainText.split(/\n\n/);

  const htmlParagraphs = paragraphs.map((para) => {
    if (!para.trim()) {
      return `<p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt;"><br></p>`;
    }

    const lines = para.split('\n');

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

    const htmlContent = lines.map((line) => esc(line)).join('<br>');
    return `    <p style="margin: 10px 0; font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 12pt; color: ${textColor};">${htmlContent}</p>`;
  });

  return htmlParagraphs.filter((p) => p).join('\n');
}

/**
 * Wrap HTML content in proper email preview template.
 * Extracts subject from either originalMessage or the provided htmlContent,
 * then wraps body in a consistent email shell.
 */
export function wrapHtmlForEmailPreview(
  htmlContent: string,
  originalMessage?: string
): string {
  let subject = 'Email Preview';
  let bodyContent = htmlContent;

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

  const colors = isIframePreviewDarkMode()
    ? {
        background: '#1e1e1e',
        text: '#e0e0e0',
        headerBg: '#2d2d2d',
        headerBorder: '#404040',
        headerText: '#f0f0f0',
        link: '#4da6ff',
      }
    : {
        background: '#ffffff',
        text: '#000000',
        headerBg: '#f5f5f5',
        headerBorder: '#dddddd',
        headerText: '#333333',
        link: '#0066cc',
      };

  const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sanitizeHTML(subject)}</title>
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
            <div class="email-subject">${sanitizeHTML(subject)}</div>
        </div>
        <div class="email-body">
            ${bodyContent}
        </div>
    </div>
</body>
</html>`;

  return template;
}
