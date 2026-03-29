import { extractSignatureData } from './profile.js';
import { sanitizeHTML } from './html-utils.js';

/**
 * Signature Module
 * Handles generation of employee email signatures in multiple formats
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const COMPANY_INFO = {
  companyName: 'Citizen Watch America',
  storeName: 'Citizen Company Store',
};

const BRAND_LINKS = [
  { name: 'Alpina', url: 'https://us.alpinawatches.com/' },
  { name: 'Bulova', url: 'https://www.bulova.com/' },
  { name: 'Citizen', url: 'https://www.citizenwatch.com/' },
  { name: 'Frederique Constant', url: 'https://us.frederiqueconstant.com/' },
];

const MANAGER_TITLES = [
  'manager',
  'director',
  'supervisor',
  'assistant manager',
];

/**
 * Get signature colors
 * @param {boolean} forPreview - If true, uses theme-aware colors for preview iframe. Default false (standard email colors).
 */
function getSignatureColors(forPreview = false) {
  // Only detect dark mode for preview rendering
  if (forPreview) {
    const isDarkMode =
      typeof window !== 'undefined' &&
      window.parent?.document?.documentElement?.getAttribute('data-theme') ===
        'dark';

    if (isDarkMode) {
      return {
        primary: '#e0e0e0',
        secondary: '#b0b0b0',
        link: '#4da6ff',
        environmental: '#4CAF50',
      };
    }
  }

  // Standard email colors (default for EML files)
  return {
    primary: '#000000',
    secondary: '#2f2f2f',
    link: '#0066cc',
    environmental: '#0c8822',
  };
}

const SIGNATURE_STYLES = {
  fontFamily: "'Century Gothic', Aptos, Arial, sans-serif",
  fontSize: {
    name: '9pt',
    details: '8pt',
  },
};

const ENVIRONMENT_MESSAGE =
  'Please consider the environment before printing this e-mail';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine which email to use based on job title
 */
function determineSignatureEmail(jobTitle, companyEmail, storeEmail) {
  const isManager = MANAGER_TITLES.some((t) => jobTitle.includes(t));

  if (isManager && companyEmail) {
    return companyEmail;
  }
  return storeEmail || '';
}

/**
 * Render name and title section
 */
function renderNameTitle(data, format, colors) {
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0;">
        <strong style="font-size: ${SIGNATURE_STYLES.fontSize.name};">${sanitizeHTML(data.name)}</strong> │ ${sanitizeHTML(data.title)}
    </p>`;
  }
  return `${data.name} │ ${data.title}`;
}

/**
 * Render separator line
 */
function renderSeparator(format, colors) {
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
 * Render company information (Citizen Watch America and Citizen Company Store)
 */
function renderCompanyInfo(data, format, colors) {
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
 * Render address (if provided)
 */
function renderAddress(data, format, colors) {
  if (!data.address || !data.address.trim()) {
    return '';
  }

  const formattedAddress = sanitizeHTML(data.address);

  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        ${formattedAddress.replace(/\n/g, '<br>')}
    </p>`;
  }
  return data.address;
}

/**
 * Render phone number
 */
function renderPhone(data, format, colors) {
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${colors.secondary};">
        Tel/SMS: ${sanitizeHTML(data.phone)}
    </p>`;
  }
  return `Tel/SMS: ${data.phone}`;
}

/**
 * Render email with hyperlink
 */
function renderEmail(email, format, colors) {
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
 * Render brand links
 */
function renderBrandLinks(format, colors) {
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
 * Render environment message
 */
function renderEnvironmentMessage(format, colors) {
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
 * Generate employee signature in text or HTML format
 * @param {string} format - 'text' for plain text, 'html' for HTML
 * @param {Object} options - Options
 * @param {boolean} options.forPreview - If true, uses theme-aware colors for preview iframe. Default false (standard email colors).
 * @returns {string} Formatted signature
 */
export function getEmployeeSignature(
  format = 'text',
  { forPreview = false } = {}
) {
  const data = extractSignatureData();
  const email = determineSignatureEmail(
    data.jobTitle,
    data.companyEmail,
    data.storeEmail
  );

  // Get colors - theme-aware only for preview, standard for EML files
  const colors = getSignatureColors(forPreview);

  if (format === 'html') {
    return `<div style="font-family: ${SIGNATURE_STYLES.fontFamily}; font-size: ${SIGNATURE_STYLES.fontSize.name}; color: ${colors.primary};">
    ${renderNameTitle(data, format, colors)}
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

  return `${renderNameTitle(data, format, colors)}
${renderSeparator(format, colors)}
${renderCompanyInfo(data, format, colors)}
${addressLine}${renderPhone(data, format, colors)}
${emailLine}${renderBrandLinks(format, colors)}

${renderEnvironmentMessage(format, colors)}`;
}

// Export configuration for potential future use
export {
  COMPANY_INFO,
  BRAND_LINKS,
  MANAGER_TITLES,
  SIGNATURE_STYLES,
  ENVIRONMENT_MESSAGE,
};
