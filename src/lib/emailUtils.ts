/**
 * Shared email / MIME utilities.
 * Migrated from src/js/shared/emailUtils.js
 */

/** PDF attachment shape */
export interface PDFAttachment {
  name: string;
  data?: string; // data URL (data:application/pdf;base64,...)
}

/** BCC batch EML result */
export interface BCCBatchEMLResult {
  format: string;
  data: Uint8Array;
  filename: string;
}

// Extract plain text from HTML for the text/plain part of EML
export function extractPlainText(htmlBody: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = htmlBody;

  let plainText = '';

  const processNode = (node: Node): void => {
    if (node.nodeType === 3) {
      // Text node
      plainText += node.textContent || '';
    } else if (node.nodeType === 1) {
      // Element node
      const tagName = (node as Element).tagName.toLowerCase();

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
export function encodeQuotedPrintable(str: string): string {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(str);

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

// Encode subject for non-ASCII characters (RFC 2047 - Encoded-words)
export function encodeSubject(subject: string): string {
  let isAscii = true;
  for (let i = 0; i < subject.length; i++) {
    if (subject.charCodeAt(i) > 127) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) {
    return subject;
  }

  const utf8Bytes = new TextEncoder().encode(subject);
  const binaryString = Array.from(utf8Bytes, (byte) =>
    String.fromCodePoint(byte)
  ).join('');
  const base64 = btoa(binaryString);

  return `=?UTF-8?B?${base64}?=`;
}

// Convert string to UTF-8 Base64 encoding (RFC 2045)
export function utf8ToBase64(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  const binaryString = Array.from(utf8Bytes, (byte) =>
    String.fromCodePoint(byte)
  ).join('');
  return btoa(binaryString);
}

// Encode filename for non-ASCII characters (RFC 2231)
export function encodeFilename(filename: string): string {
  let isAscii = true;
  for (let i = 0; i < filename.length; i++) {
    if (filename.charCodeAt(i) > 127) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) {
    return `filename="${filename}"`;
  }

  const encodedFilename = encodeURIComponent(filename);
  return `filename*=UTF-8''${encodedFilename}`;
}

// Basic email format validation
export function isValidEmail(email: string): boolean {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Parse and normalize an email list string
export function parseEmailList(list: string): string[] {
  const emails = list
    .split(/[\s,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)];
}

// Default fallback used when no subject line is selected and no promo title is set
export const DEFAULT_PROMO_SUBJECT = 'Promotion';

// Resolve the subject for a promotion email: prefer the selected subject line,
// then fall back to the promo title, then the generic default.
export function resolvePromoSubject(
  selectedSubjectLine: string | null | undefined,
  promoTitle: string | null | undefined
): string {
  return (
    selectedSubjectLine?.trim() || promoTitle?.trim() || DEFAULT_PROMO_SUBJECT
  );
}

// Core EML file generator for single-message with HTML + text parts and optional attachments
export async function createEMLFile(
  _fromName: string,
  _fromEmail: string,
  _to: string,
  _bcc: string,
  subject: string,
  htmlBody: string,
  attachments: PDFAttachment[] = []
): Promise<string> {
  // Generate boundary using Outlook-style format
  const timestamp = Date.now().toString(16);
  const boundary = `_000_DM6PR11MB2683${timestamp}DM6PR11MB2683namp_`;
  const altBoundary = `_000_ALT_${timestamp}_ALT_`;

  const hasAttachments = attachments && attachments.length > 0;

  let eml = `Subject: ${encodeSubject(subject)}\r\n`;
  eml += `Content-Language: en-US\r\n`;
  eml += `MIME-Version: 1.0\r\n`;
  eml += `X-Unsent: 1\r\n`; // Mark as draft

  if (hasAttachments) {
    eml += `X-MS-Has-Attach: yes\r\n`;
    eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
    eml += `\r\n`;
    eml += `This is a multi-part message in MIME format.\r\n\r\n`;

    eml += `--${boundary}\r\n`;
    eml += `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`;

    // Plain text part
    eml += `--${altBoundary}\r\n`;
    eml += `Content-Type: text/plain; charset="utf-8"\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
    const plainTextContent = extractPlainText(htmlBody);
    eml += `${encodeQuotedPrintable(plainTextContent)}\r\n\r\n`;

    // HTML part
    eml += `--${altBoundary}\r\n`;
    eml += `Content-Type: text/html; charset="utf-8"\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
    eml += `${encodeQuotedPrintable(htmlBody)}\r\n\r\n`;

    // End alternative section
    eml += `--${altBoundary}--\r\n\r\n`;

    // Add attachments
    for (const pdf of attachments) {
      if (pdf.data) {
        const parts = pdf.data.split(',');
        if (parts.length === 2 && parts[0].includes('base64')) {
          const base64Data = parts[1];
          eml += `--${boundary}\r\n`;
          eml += `Content-Type: application/pdf; name="${pdf.name}"\r\n`;
          eml += `Content-Transfer-Encoding: base64\r\n`;
          eml += `Content-Disposition: attachment; ${encodeFilename(pdf.name)}\r\n\r\n`;
          const lines = base64Data.match(/.{1,76}/g) || [];
          eml += lines.join('\r\n');
          eml += `\r\n\r\n`;
        }
      }
    }

    eml += `--${boundary}--\r\n`;
  } else {
    eml += `X-MS-Has-Attach:\r\n`;
    eml += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    eml += `\r\n`;

    // Plain text part
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/plain; charset="utf-8"\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
    const plainTextContent = extractPlainText(htmlBody);
    eml += `${encodeQuotedPrintable(plainTextContent)}\r\n\r\n`;

    // HTML part
    eml += `--${boundary}\r\n`;
    eml += `Content-Type: text/html; charset="utf-8"\r\n`;
    eml += `Content-Transfer-Encoding: quoted-printable\r\n\r\n`;
    eml += `${encodeQuotedPrintable(htmlBody)}\r\n\r\n`;

    eml += `--${boundary}--\r\n`;
  }

  return eml;
}

// Extract date range from HTML content
export function extractDateRangeFromHTML(htmlContent: string): string | null {
  if (!htmlContent) return null;

  const whileSuppliesLastIndex = htmlContent.indexOf('While Supplies Last');
  if (whileSuppliesLastIndex === -1) return null;

  const searchStart = Math.max(0, whileSuppliesLastIndex - 200);
  const searchText = htmlContent.substring(searchStart, whileSuppliesLastIndex);

  const match = searchText.match(
    /([A-Za-z]+\s+\d+(?:\s*-\s*[A-Za-z]+\s+\d+)?),\s*(\d{4})\s*•\s*While Supplies Last/
  );

  if (match) {
    return `${match[1]}, ${match[2]}`;
  }

  return null;
}

// Format date range for filenames
export function formatDateRangeForFilename(dateRangeText: string): string {
  if (!dateRangeText) return '';

  const monthMap: Record<string, string> = {
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

  return dateRangeText.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
}

// Generate ZIP filename from HTML content
export function generateZipFilenameFromHTML(htmlContent: string): string {
  const dateRange = extractDateRangeFromHTML(htmlContent);

  if (dateRange) {
    const formattedRange = formatDateRangeForFilename(dateRange);
    return `promo-batch.${formattedRange}.zip`;
  } else {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `promo-batch.${today.getFullYear()}-${month}-${day}.zip`;
  }
}

// Create BCC batch EML file for bulk email operations
export function createBCCBatchEML(
  subject: string,
  htmlBody: string,
  recipients: string[],
  pdfAttachments: PDFAttachment[],
  format: 'eml' | 'emltpl',
  batchNumber: number = 1
): BCCBatchEMLResult {
  // RFC 5322 §3.4 - Validate email addresses in BCC recipients
  const validRecipients = recipients.filter((email) => {
    if (!isValidEmail(email)) {
      console.warn(
        `Invalid email address skipped in batch ${batchNumber}: ${email}`
      );
      return false;
    }
    return true;
  });

  const boundary =
    '----=_NextPart_' +
    Date.now() +
    '_' +
    batchNumber +
    '_' +
    Math.random().toString(36).substring(2, 11);
  let emlContent = '';
  emlContent += `Subject: ${encodeSubject(subject)}\r\n`;

  // Add Date header with slight offset per batch to ensure uniqueness
  const now = new Date(Date.now() + batchNumber * 1000);
  emlContent += `Date: ${now.toUTCString()}\r\n`;

  // Add unique Message-ID to prevent Outlook from treating files as duplicates
  const messageId = `<batch${batchNumber}.${Date.now()}.${Math.random()
    .toString(36)
    .substring(2, 11)}@citizenstore.local>`;
  emlContent += `Message-ID: ${messageId}\r\n`;

  // Add BCC recipients with RFC 822 compliant header folding
  if (validRecipients && validRecipients.length > 0) {
    emlContent += `Bcc: `;

    let currentLine = '';
    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];
      const separator = i < validRecipients.length - 1 ? ', ' : '';
      const addition = recipient + separator;

      if (currentLine.length + addition.length > 900) {
        emlContent += currentLine + '\r\n ';
        currentLine = addition;
      } else {
        currentLine += addition;
      }
    }

    emlContent += currentLine + '\r\n';
  }

  emlContent += `MIME-Version: 1.0\r\n`;
  emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
  emlContent += `X-Unsent: 1\r\n`;
  emlContent += `X-Outlook-Template: 1\r\n`;
  emlContent += `Message-Class: IPM.Note\r\n`;
  emlContent += `X-Outlook-Message-Flag: \r\n`;
  emlContent += `X-Mailer: Microsoft Outlook 16.0\r\n`;
  emlContent += `X-Msg-Status: 00000000\r\n`;
  emlContent += `\r\n`;

  // RFC 2045 - MIME preamble
  emlContent += `This is a multi-part message in MIME format.\r\n\r\n`;

  // HTML body part - base64 encoding
  emlContent += `--${boundary}\r\n`;
  emlContent += `Content-Type: text/html; charset=utf-8\r\n`;
  emlContent += `Content-Transfer-Encoding: base64\r\n\r\n`;

  const normalizedHtml = htmlBody.replace(/\r?\n/g, '\r\n');
  const htmlBase64 = utf8ToBase64(normalizedHtml);
  const htmlLines = htmlBase64.match(/.{1,76}/g) || [];
  emlContent += htmlLines.join('\r\n');
  emlContent += `\r\n\r\n`;

  // Add PDF attachments
  if (pdfAttachments && pdfAttachments.length > 0) {
    pdfAttachments.forEach((pdf) => {
      if (!pdf.data) {
        console.warn(
          `Skipping PDF ${pdf.name} - no data available (may need to re-upload)`
        );
        return;
      }

      const parts = pdf.data.split(',');
      if (parts.length !== 2 || !parts[0].includes('base64')) {
        console.error(`Invalid PDF data format for attachment (${pdf.name})`);
        return;
      }

      const base64Data = parts[1];

      if (!base64Data || base64Data.length === 0) {
        console.error(`Empty PDF data for attachment (${pdf.name})`);
        return;
      }

      emlContent += `--${boundary}\r\n`;
      emlContent += `Content-Type: application/pdf; name="${pdf.name}"\r\n`;
      emlContent += `Content-Transfer-Encoding: base64\r\n`;
      emlContent += `Content-Disposition: attachment; ${encodeFilename(pdf.name)}\r\n`;
      emlContent += `\r\n`;

      const lines = base64Data.match(/.{1,76}/g) || [];
      emlContent += lines.join('\r\n');
      emlContent += `\r\n\r\n`;
    });
  }

  emlContent += `--${boundary}--\r\n`;

  const paddedBatchNumber = batchNumber.toString().padStart(3, '0');

  return {
    format,
    data: new TextEncoder().encode(emlContent),
    filename: `promo-batch-${paddedBatchNumber}.${format}`,
  };
}
