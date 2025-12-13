import { appState } from '../state.js';
import { sanitizeHTML } from '../templates.js';

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
  defaultLocation: 'the South Premium Outlets',
  defaultPhone: '702-357-8990',
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

const SIGNATURE_STYLES = {
  fontFamily: "'Century Gothic', Aptos, Arial, sans-serif",
  colors: {
    primary: '#000000',
    secondary: '#2f2f2f',
    link: '#0000ee',
    environmental: '#0c8822',
  },
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
 * Extract signature data from user profile with fallbacks
 */
function extractSignatureData() {
  const profile = appState.userProfile || {};

  return {
    name: profile.employeeName || 'Employee Name',
    title: profile.jobTitle || 'Sales Associate',
    location: profile.storeLocation || COMPANY_INFO.defaultLocation,
    address: profile.storeAddress || '',
    phone: profile.storePhone || COMPANY_INFO.defaultPhone,
    jobTitle: (profile.jobTitle || '').toLowerCase(),
    companyEmail: profile.companyEmail || '',
    storeEmail: profile.storeEmail || '',
  };
}

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
function renderNameTitle(data, format) {
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
function renderSeparator(format) {
  const line =
    '______________________________________________________________________';
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${SIGNATURE_STYLES.colors.secondary};">
        <strong>${line}</strong>
    </p>`;
  }
  return line;
}

/**
 * Render company information (Citizen Watch America and Citizen Company Store)
 */
function renderCompanyInfo(data, format) {
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${SIGNATURE_STYLES.colors.secondary};">
        <strong>${COMPANY_INFO.companyName}</strong>
    </p>
    <p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${SIGNATURE_STYLES.colors.secondary};">
        <strong>${COMPANY_INFO.storeName} - ${sanitizeHTML(data.location)}</strong>
    </p>`;
  }
  return `${COMPANY_INFO.companyName}\n${COMPANY_INFO.storeName} - ${data.location}`;
}

/**
 * Render address (if provided)
 */
function renderAddress(data, format) {
  if (!data.address || !data.address.trim()) {
    return '';
  }

  const formattedAddress = sanitizeHTML(data.address);

  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${SIGNATURE_STYLES.colors.secondary};">
        ${formattedAddress.replace(/\n/g, '<br>')}
    </p>`;
  }
  return data.address;
}

/**
 * Render phone number
 */
function renderPhone(data, format) {
  if (format === 'html') {
    return `<p style="margin: 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${SIGNATURE_STYLES.colors.secondary};">
        Tel/SMS: ${sanitizeHTML(data.phone)}
    </p>`;
  }
  return `Tel/SMS: ${data.phone}`;
}

/**
 * Render email with hyperlink
 */
function renderEmail(email, format) {
  if (!email) {
    return '';
  }

  if (format === 'html') {
    return `<p style="margin: 10px 0 0 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${SIGNATURE_STYLES.colors.secondary};">
        Email: <a href="mailto:${sanitizeHTML(email)}" style="color: ${SIGNATURE_STYLES.colors.link}; text-decoration: underline; font-size: ${SIGNATURE_STYLES.fontSize.details};">${sanitizeHTML(email)}</a>
    </p>`;
  }
  return `Email: ${email}`;
}

/**
 * Render brand links
 */
function renderBrandLinks(format) {
  if (format === 'html') {
    const links = BRAND_LINKS.map(
      (brand) =>
        `<a href="${brand.url}" style="color: ${SIGNATURE_STYLES.colors.link}; text-decoration: underline; font-size: ${SIGNATURE_STYLES.fontSize.details};">${brand.name}</a>`
    ).join(
      ` <span style="color: ${SIGNATURE_STYLES.colors.secondary};">|</span> `
    );

    return `<p style="margin: 4px 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details};">
        ${links}
    </p>`;
  }

  return BRAND_LINKS.map((b) => b.name).join(' | ');
}

/**
 * Render environment message
 */
function renderEnvironmentMessage(format) {
  if (format === 'html') {
    return `<p style="margin: 4px 0; padding: 0; font-size: ${SIGNATURE_STYLES.fontSize.details}; color: ${SIGNATURE_STYLES.colors.environmental};">
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
 * @returns {string} Formatted signature
 */
export function getEmployeeSignature(format = 'text') {
  const data = extractSignatureData();
  const email = determineSignatureEmail(
    data.jobTitle,
    data.companyEmail,
    data.storeEmail
  );

  if (format === 'html') {
    return `<div style="font-family: ${SIGNATURE_STYLES.fontFamily}; font-size: ${SIGNATURE_STYLES.fontSize.name}; color: ${SIGNATURE_STYLES.colors.primary};">
    ${renderNameTitle(data, format)}
    ${renderSeparator(format)}
    ${renderCompanyInfo(data, format)}
    ${renderAddress(data, format)}
    ${renderPhone(data, format)}
    ${renderEmail(email, format)}
    ${renderBrandLinks(format)}

    ${renderEnvironmentMessage(format)}
</div>`;
  }

  // Plain text format
  const addressLine = data.address ? `${data.address}\n` : '';
  const emailLine = email ? `\nEmail: ${email}\n` : '\n';

  return `${renderNameTitle(data, format)}
${renderSeparator(format)}
${renderCompanyInfo(data, format)}
${addressLine}${renderPhone(data, format)}
${emailLine}${renderBrandLinks(format)}

${renderEnvironmentMessage(format)}`;
}

// Export configuration for potential future use
export {
  COMPANY_INFO,
  BRAND_LINKS,
  MANAGER_TITLES,
  SIGNATURE_STYLES,
  ENVIRONMENT_MESSAGE,
};
