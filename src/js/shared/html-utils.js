/**
 * HTML Utility Functions
 * Provides HTML sanitization and attribute escaping to prevent XSS attacks
 */

/**
 * Helper function to sanitize HTML and prevent XSS
 * Converts text to safe HTML by escaping special characters
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Helper function to escape HTML attributes
 * Escapes single and double quotes to prevent attribute injection
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML attributes
 */
export function escapeAttr(str) {
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

/**
 * Sanitize template data to prevent XSS attacks
 * Recursively sanitizes all string values in an object
 * @param {Object} data - Object containing template data
 * @returns {Object} Sanitized object with escaped string values
 */
export function sanitizeTemplateData(data) {
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value);
    } else {
      sanitized[key] = value; // Keep non-string values as-is
    }
  }
  return sanitized;
}
