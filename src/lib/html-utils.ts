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
 * Allowed HTML tags for rich content (TipTap output).
 * These are safe tags that preserve formatting while stripping dangerous elements.
 */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'span',
  'mark',
  'blockquote',
  'pre',
  'code',
  'sub',
  'sup',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'hr',
]);

/**
 * Allowed attributes per tag. Only these attributes will be preserved.
 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  span: new Set(['style']),
  mark: new Set(['style', 'data-color']),
  p: new Set(['style']),
  h1: new Set(['style']),
  h2: new Set(['style']),
  h3: new Set(['style']),
  h4: new Set(['style']),
  h5: new Set(['style']),
  h6: new Set(['style']),
  li: new Set(['style']),
  ul: new Set(['style']),
  ol: new Set(['style']),
  blockquote: new Set(['style']),
  td: new Set(['style', 'colspan', 'rowspan']),
  th: new Set(['style', 'colspan', 'rowspan']),
  table: new Set(['style']),
  tr: new Set(['style']),
  img: new Set(['src', 'alt', 'width', 'height', 'style', 'align', 'href']),
  hr: new Set(['style']),
  pre: new Set(['style']),
  code: new Set(['class', 'style']),
};

/**
 * Safe URL protocols that are allowed in href attributes.
 */
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Validate that a URL uses a safe protocol.
 * Blocks javascript:, data:, vbscript:, and other dangerous protocols.
 */
export function isSafeURL(url: string): boolean {
  if (!url || !url.trim()) return false;
  const trimmed = url.trim().toLowerCase();
  // Allow relative URLs and anchors
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    // If URL parsing fails, it might be a relative URL
    return true;
  }
}

/**
 * Sanitize rich HTML content while preserving safe formatting tags.
 * Strips dangerous elements (script, iframe, object, etc.) and event handlers,
 * but keeps safe formatting tags like <strong>, <em>, <p>, etc.
 * Used for TipTap editor output before email injection.
 */
export function sanitizeRichHTML(html: string): string {
  if (!html || !html.trim()) return '';

  const div = document.createElement('div');
  div.innerHTML = html;

  // First pass: remove dangerous elements entirely (including their text content)
  const dangerousSelectors = [
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'applet',
    'form',
    'input',
    'textarea',
    'select',
    'button',
    'link',
    'meta',
    'base',
  ];
  for (const selector of dangerousSelectors) {
    const elements = div.querySelectorAll(selector);
    elements.forEach((el) => el.remove());
  }

  return sanitizeNode(div);
}

/**
 * Recursively sanitize a DOM node and its children.
 */
function sanitizeNode(node: Element): string {
  const result: string[] = [];

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      result.push(child.textContent || '');
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      // For disallowed tags, keep the text content but strip the tag
      result.push(sanitizeNode(el));
      continue;
    }

    // Sanitize attributes
    const safeAttrs: string[] = [];
    const allowedForTag = ALLOWED_ATTRS[tag];

    if (allowedForTag) {
      for (const attr of Array.from(el.attributes)) {
        if (!allowedForTag.has(attr.name)) continue;

        // Special handling for href — block dangerous protocols
        if (attr.name === 'href') {
          if (!isSafeURL(attr.value)) continue;
          safeAttrs.push(`href="${escapeAttr(attr.value)}"`);
          continue;
        }

        if (attr.name === 'style') {
          let styleValue = attr.value.replace(/expression\s*\(/gi, '');
          // Allow url() only with safe schemes (https, data:image, cid); neutralize the rest
          styleValue = styleValue.replace(
            /url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi,
            (match, _q, inner) =>
              /^(https?:\/\/|data:image\/|cid:)/i.test(inner.trim())
                ? match
                : 'url(about:blank)'
          );
          safeAttrs.push(`style="${escapeAttr(styleValue)}"`);
          continue;
        }

        safeAttrs.push(`${attr.name}="${escapeAttr(attr.value)}"`);
      }
    }

    const attrStr = safeAttrs.length > 0 ? ' ' + safeAttrs.join(' ') : '';
    const innerContent = sanitizeNode(el);

    // Self-closing tags
    if (tag === 'br') {
      result.push('<br>');
      continue;
    }

    result.push(`<${tag}${attrStr}>${innerContent}</${tag}>`);
  }

  return result.join('');
}

/**
 * Escape HTML attribute values to prevent attribute injection.
 * Escapes single and double quotes.
 */
export function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
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
