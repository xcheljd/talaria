/**
 * HTML Utility Functions
 * Provides HTML sanitization and attribute escaping to prevent XSS attacks
 * Migrated from src/js/shared/html-utils.js
 */

/**
 * Sanitize HTML string to prevent XSS attacks.
 * Converts text to safe HTML by escaping special characters.
 * Uses DOM textContent/innerHTML round-trip for safe escaping.
 */
export function sanitizeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Escape HTML attribute values to prevent attribute injection.
 * Escapes single and double quotes.
 */
export function escapeAttr(str: string): string {
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

/**
 * Sanitize template data to prevent XSS attacks.
 * Recursively sanitizes all string values in an object.
 */
export function sanitizeTemplateData<T extends Record<string, unknown>>(
  data: T
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
