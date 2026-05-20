/**
 * Signature Module
 * Handles generation of employee email signatures in multiple formats.
 * Migrated from src/js/shared/signature.js
 */

import { extractSignatureData } from './profile';
import type { SignatureData } from './profile';
import { sanitizeHTML } from './html-utils';
import { isIframePreviewDarkMode } from './theme-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface BrandLink {
  name: string;
  url: string;
}

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

export interface CompanyInfo {
  companyName: string;
  storeName: string;
}

export interface SignatureOptions {
  forPreview?: boolean;
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const COMPANY_INFO: CompanyInfo = {
  companyName: 'Citizen Watch America',
  storeName: 'Citizen Company Store',
};

export const BRAND_LINKS: readonly BrandLink[] = [
  { name: 'Alpina', url: 'https://us.alpinawatches.com/' },
  { name: 'Bulova', url: 'https://www.bulova.com/' },
  { name: 'Citizen', url: 'https://www.citizenwatch.com/' },
  { name: 'Frederique Constant', url: 'https://us.frederiqueconstant.com/' },
];

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
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        <strong>${COMPANY_INFO.companyName}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        <strong>${COMPANY_INFO.storeName} - ${sanitizeHTML(data.location)}</strong>
    </p>`;
  }
  return `${COMPANY_INFO.companyName}\n${COMPANY_INFO.storeName} - ${data.location}`;
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
 * Render brand links.
 */
function renderBrandLinks(
  format: 'text' | 'html',
  colors: SignatureColors
): string {
  if (format === 'html') {
    const links = BRAND_LINKS.map(
      (brand) =>
        `<a href="${brand.url}" style="color: ${colors.link}; text-decoration: underline; font-size: ${SIGNATURE_STYLES.fontSize.details};">${brand.name}</a>`
    ).join(` <span style="color: ${colors.secondary};">|</span> `);

    return `<p style="margin: 4px 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details};">
        ${links}
    </p>`;
  }

  return BRAND_LINKS.map((b) => b.name).join(' | ');
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
    ${renderBrandLinks(format, colors)}

    ${renderEnvironmentMessage(format, colors)}
</div>`;
  }

  // Plain text format
  const addressLine = data.address ? `${data.address}\n` : '';
  const emailLine = email ? `\nEmail: ${email}\n` : '\n';

  return `${renderNameTitle(data, format)}
${renderSeparator(format, colors)}
${renderCompanyInfo(data, format, colors)}
${addressLine}${renderPhone(data, format, colors)}
${emailLine}${renderBrandLinks(format, colors)}

${renderEnvironmentMessage(format, colors)}`;
}
