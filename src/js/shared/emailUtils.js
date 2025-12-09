// Shared email / MIME utilities extracted from ui.js

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

// Basic email format validation
export function isValidEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Parse and normalize an email list string
export function parseEmailList(list) {
  const emails = list
    .split(/[\s,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(emails)]; // Remove duplicates
}

// Core EML file generator for single-message with HTML + text parts and optional attachments
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
  const altBoundary = `_000_ALT_${timestamp}_ALT_`;

  const hasAttachments = attachments && attachments.length > 0;

  let eml = `Subject: ${encodeSubject(subject)}\r\n`;
  eml += `Content-Language: en-US\r\n`;
  eml += `MIME-Version: 1.0\r\n`;
  eml += `X-Unsent: 1\r\n`; // Mark as draft

  if (hasAttachments) {
    // With attachments: use multipart/mixed containing multipart/alternative + attachments
    eml += `X-MS-Has-Attach: yes\r\n`;
    eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
    eml += `\r\n`;
    eml += `This is a multi-part message in MIME format.\r\n\r\n`;

    // Start alternative section for text/html
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
          // Split base64 data into 76-character lines
          const lines = base64Data.match(/.{1,76}/g) || [];
          eml += lines.join('\r\n');
          eml += `\r\n\r\n`;
        }
      }
    }

    // End mixed boundary
    eml += `--${boundary}--\r\n`;
  } else {
    // No attachments: simple multipart/alternative
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

    // End boundary
    eml += `--${boundary}--\r\n`;
  }

  return eml;
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

// Format date range for filenames
export function formatDateRangeForFilename(dateRangeText) {
  if (!dateRangeText) return '';

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

// Create BCC batch EML file for bulk email operations
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
  // Omit From: header to allow user to specify sender
  let emlContent = '';
  emlContent += `Subject: ${encodeSubject(subject)}\r\n`;

  // Add Date header with slight offset per batch to ensure uniqueness
  const now = new Date(Date.now() + batchNumber * 1000); // Add 1 second per batch
  emlContent += `Date: ${now.toUTCString()}\r\n`;

  // Add unique Message-ID to prevent Outlook from treating files as duplicates
  const messageId = `<batch${batchNumber}.${Date.now()}.${Math.random()
    .toString(36)
    .substr(2, 9)}@citizenstore.local>`;
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
    });
  }

  emlContent += `--${boundary}--\r\n`;

  // Format batch number with leading zeros (001, 002, etc.)
  const paddedBatchNumber = batchNumber.toString().padStart(3, '0');

  return {
    format,
    data: new TextEncoder().encode(emlContent),
    filename: `batch-email${paddedBatchNumber}.${format}`,
  };
}
