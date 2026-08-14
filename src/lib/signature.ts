/**
 * Signature Module
 * Handles generation of employee email signatures in multiple formats.
 * Migrated from src/js/shared/signature.js
 */

import { extractSignatureData } from './profile';
import type { SignatureData, BrandLink } from './profile';
import { isSafeURL, sanitizeHTML } from './html-utils';
import { isIframePreviewDarkMode } from './theme-utils';

// ============================================================================
// TYPES
// ============================================================================

export type { BrandLink };

export interface SignatureColors {
  primary: string;
  secondary: string;
  link: string;
  environmental: string;
}

export interface SignatureStyleConfig {
  fontFamily: string;
  fontSize: {
    name: string;
    details: string;
  };
}

export interface SignatureOptions {
  forPreview?: boolean;
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

// Company name, store name, and brand links are read per-install from the
// saved profile (see extractSignatureData) so the signature works for any brand.

export const MANAGER_TITLES: readonly string[] = [
  'manager',
  'director',
  'supervisor',
  'assistant manager',
];

export const SIGNATURE_STYLES: SignatureStyleConfig = {
  fontFamily: "'Century Gothic', Aptos, Arial, sans-serif",
  fontSize: {
    name: '9pt',
    details: '8pt',
  },
};

export const ENVIRONMENT_MESSAGE =
  'Please consider the environment before printing this e-mail';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get signature colors (theme-aware only for preview rendering).
 */
function getSignatureColors(forPreview = false): SignatureColors {
  if (forPreview) {
    if (isIframePreviewDarkMode()) {
      return {
        primary: '#e0e0e0',
        secondary: '#b0b0b0',
        link: '#4da6ff',
        environmental: '#4CAF50',
      };
    }
  }

  return {
    primary: '#000000',
    secondary: '#2f2f2f',
    link: '#0066cc',
    environmental: '#0c8822',
  };
}

/**
 * Determine which email to use based on job title.
 */
function determineSignatureEmail(
  jobTitle: string,
  companyEmail: string,
  storeEmail: string
): string {
  const isManager = MANAGER_TITLES.some((t) => jobTitle.includes(t));

  if (isManager && companyEmail) {
    return companyEmail;
  }
  return storeEmail || '';
}

/**
 * Render name and title section.
 */
function renderNameTitle(data: SignatureData, format: 'text' | 'html'): string {
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0;">
        <strong style="font-size: ${SIGNATURE_STYLES.fontSize.name};">${sanitizeHTML(data.name)}</strong> │ ${sanitizeHTML(data.title)}
    </p>`;
  }
  return `${data.name} │ ${data.title}`;
}

/**
 * Render separator line.
 */
function renderSeparator(
  format: 'text' | 'html',
  colors: SignatureColors
): string {
  const line =
    '______________________________________________________________________';
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        <strong>${line}</strong>
    </p>`;
  }
  return line;
}

/**
 * Render company information.
 */
function renderCompanyInfo(
  data: SignatureData,
  format: 'text' | 'html',
  colors: SignatureColors
): string {
  const storeLine = data.location
    ? `${data.storeName} - ${data.location}`
    : data.storeName;

  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        <strong>${sanitizeHTML(data.companyName)}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        <strong>${sanitizeHTML(storeLine)}</strong>
    </p>`;
  }
  return `${data.companyName}\n${storeLine}`;
}

/**
 * Render address (if provided).
 */
function renderAddress(
  data: SignatureData,
  format: 'text' | 'html',
  _colors: SignatureColors
): string {
  if (!data.address || !data.address.trim()) {
    return '';
  }

  const formattedAddress = sanitizeHTML(data.address);

  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${_colors.secondary};">
        ${formattedAddress.replace(/\n/g, '<br>')}
    </p>`;
  }
  return data.address;
}

/**
 * Render phone number.
 */
function renderPhone(
  data: SignatureData,
  format: 'text' | 'html',
  colors: SignatureColors
): string {
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        Tel/SMS: ${sanitizeHTML(data.phone)}
    </p>`;
  }
  return `Tel/SMS: ${data.phone}`;
}

/**
 * Render email with hyperlink.
 */
function renderEmail(
  email: string,
  format: 'text' | 'html',
  colors: SignatureColors
): string {
  if (!email) {
    return '';
  }

  if (format === 'html') {
    return `<p style="margin: 10px 0 0 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        Email: <a href="mailto:${sanitizeHTML(email)}" style="color: ${colors.link}; text-decoration: underline; font-size: ${SIGNATURE_STYLES.fontSize.details};">${sanitizeHTML(email)}</a>
    </p>`;
  }
  return `Email: ${email}`;
}

/**
 * Render brand links. Returns an empty string when no links are configured so
 * the signature has no empty placeholder row.
 */
function renderBrandLinks(
  brandLinks: BrandLink[],
  format: 'text' | 'html',
  colors: SignatureColors
): string {
  const links = brandLinks.filter(
    (b) => b.name.trim() && b.url.trim() && isSafeURL(b.url)
  );
  if (links.length === 0) {
    return '';
  }

  if (format === 'html') {
    const rendered = links
      .map(
        (brand) =>
          `<a href="${sanitizeHTML(brand.url)}" style="color: ${colors.link}; text-decoration: underline; font-size: ${SIGNATURE_STYLES.fontSize.details};">${sanitizeHTML(brand.name)}</a>`
      )
      .join(` <span style="color: ${colors.secondary};">|</span> `);

    return `<p style="margin: 4px 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details};">
        ${rendered}
    </p>`;
  }

  return links.map((b) => b.name).join(' | ');
}

/**
 * Render environment message.
 */
function renderEnvironmentMessage(
  format: 'text' | 'html',
  colors: SignatureColors
): string {
  if (format === 'html') {
    return `<p style="margin: 4px 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.environmental};">
        <strong>${ENVIRONMENT_MESSAGE}</strong>
    </p>`;
  }
  return ENVIRONMENT_MESSAGE;
}

// ============================================================================
// MAIN SIGNATURE FUNCTION
// ============================================================================

/**
 * Generate employee signature in text or HTML format.
 * @param format - 'text' for plain text, 'html' for HTML
 * @param options - Options for preview rendering
 * @returns Formatted signature string
 */
export function getEmployeeSignature(
  format: 'text' | 'html' = 'text',
  { forPreview = false }: SignatureOptions = {}
): string {
  const data = extractSignatureData();
  const email = determineSignatureEmail(
    data.jobTitle,
    data.companyEmail,
    data.storeEmail
  );

  const colors = getSignatureColors(forPreview);

  if (format === 'html') {
    return `<div style="font-family: ${SIGNATURE_STYLES.fontFamily}; font-size: ${SIGNATURE_STYLES.fontSize.name}; color: ${colors.primary};">
    ${renderNameTitle(data, format)}
    ${renderSeparator(format, colors)}
    ${renderCompanyInfo(data, format, colors)}
    ${renderAddress(data, format, colors)}
    ${renderPhone(data, format, colors)}
    ${renderEmail(email, format, colors)}
    ${renderBrandLinks(data.brandLinks, format, colors)}

    ${renderEnvironmentMessage(format, colors)}
</div>`;
  }

  // Plain text format
  const addressLine = data.address ? `${data.address}\n` : '';
  const emailLine = email ? `\nEmail: ${email}\n` : '\n';
  const brandLinksText = renderBrandLinks(data.brandLinks, format, colors);
  const brandLinksLine = brandLinksText ? `${brandLinksText}\n` : '';

  return `${renderNameTitle(data, format)}
${renderSeparator(format, colors)}
${renderCompanyInfo(data, format, colors)}
${addressLine}${renderPhone(data, format, colors)}
${emailLine}${brandLinksLine}
${renderEnvironmentMessage(format, colors)}`;
}
