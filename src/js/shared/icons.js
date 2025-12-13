/**
 * Centralized Icon System
 * Contains SVG paths for all icons used in the application.
 * Icons use currentColor for theme-aware coloring.
 */

// Icon paths for inline SVG use (synchronous)
// All paths are designed for consistent viewBox dimensions
export const ICON_PATHS = {
  // Chevron arrows (12x12 viewBox)
  chevronDown:
    'M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z',
  chevronUp:
    'M1.707 8.707L6 4.414l4.293 4.293a1 1 0 001.414-1.414l-5-5a1 1 0 00-1.414 0l-5 5a1 1 0 101.414 1.414z',

  // Close/Delete (24x24 viewBox, stroke-based)
  close: 'M18 6L6 18M6 6l12 12',

  // Navigation icons (24x24 viewBox, stroke-based)
  profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
  profileCircle: 'M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', // Use with profile path

  // File operations (24x24 viewBox, stroke-based)
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z',
  import: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  export: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',

  // Action icons (24x24 viewBox, stroke-based)
  reset:
    'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5',

  // Preview/View icons (24x24 viewBox, stroke-based)
  eyePreview: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
  eyeCircle: 'M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', // Use with eyePreview path

  // Code brackets (24x24 viewBox, stroke-based)
  codeBrackets: 'M16 18l6-6-6-6M8 6l-6 6 6 6',

  // Email envelope (24x24 viewBox, stroke-based)
  email:
    'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z',
  emailFlap: 'M22 6l-10 7L2 6', // Use with email path

  // Error/Alert (24x24 viewBox, stroke-based)
  errorCircle: 'M12 12a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  errorLine: 'M12 8v4M12 16h.01',

  // Warning/Alert circle (24x24 viewBox, stroke-based)
  warning: 'M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',

  // Upload arrow (24x24 viewBox, stroke-based)
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',

  // PDF document (24x24 viewBox, stroke-based)
  pdfDoc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  pdfDocCorner: 'M14 2v6h6',
};

// SVG viewBox configurations for different icon types
export const ICON_VIEWBOXES = {
  chevron: '0 0 12 12',
  standard: '0 0 24 24',
  dragHandle: '0 0 16 16',
};

/**
 * Creates an inline SVG string for use in template literals
 * @param {string} name - Icon name from ICON_PATHS
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.viewBox - SVG viewBox (default: '0 0 24 24')
 * @param {string} options.fill - Fill color (default: 'none')
 * @param {string} options.stroke - Stroke color (default: 'currentColor')
 * @param {number} options.strokeWidth - Stroke width (default: 2)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function icon(
  name,
  {
    size = 16,
    viewBox = '0 0 24 24',
    fill = 'none',
    stroke = 'currentColor',
    strokeWidth = 2,
    className = '',
  } = {}
) {
  const path = ICON_PATHS[name];
  if (!path) {
    console.warn(`Icon "${name}" not found in ICON_PATHS`);
    return '';
  }

  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${classAttr}><path d="${path}"/></svg>`;
}

/**
 * Creates a chevron arrow SVG (uses 12x12 viewBox with fill)
 * @param {string} direction - 'up' or 'down'
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 12)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function chevronIcon(direction, { size = 12, className = '' } = {}) {
  const pathName = direction === 'up' ? 'chevronUp' : 'chevronDown';
  const path = ICON_PATHS[pathName];
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="currentColor"${classAttr}><path d="${path}"/></svg>`;
}

/**
 * Creates a drag handle SVG (6-dot pattern)
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function dragHandleIcon({ size = 16, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor"${classAttr}>
    <circle cx="4" cy="3" r="1.5"/>
    <circle cx="4" cy="8" r="1.5"/>
    <circle cx="4" cy="13" r="1.5"/>
    <circle cx="12" cy="3" r="1.5"/>
    <circle cx="12" cy="8" r="1.5"/>
    <circle cx="12" cy="13" r="1.5"/>
  </svg>`;
}

/**
 * Creates a composite icon with multiple paths (e.g., profile with circle)
 * @param {string[]} pathNames - Array of path names from ICON_PATHS
 * @param {Object} options - Configuration options
 * @returns {string} SVG element as string
 */
export function compositeIcon(
  pathNames,
  {
    size = 16,
    viewBox = '0 0 24 24',
    fill = 'none',
    stroke = 'currentColor',
    strokeWidth = 2,
    className = '',
  } = {}
) {
  const paths = pathNames
    .map((name) => {
      const d = ICON_PATHS[name];
      if (!d) return '';
      // Check if this is a circle path (contains 'Circle' in name)
      if (name.includes('Circle')) {
        const match = d.match(/M(\d+) (\d+)a(\d+)/);
        if (match) {
          return `<circle cx="${match[1]}" cy="${match[2]}" r="${match[3]}"/>`;
        }
      }
      return `<path d="${d}"/>`;
    })
    .filter(Boolean)
    .join('');

  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${classAttr}>${paths}</svg>`;
}

/**
 * Creates a close/X icon SVG
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function closeIcon({ size = 16, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${classAttr}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;
}

/**
 * Creates an email envelope icon SVG
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function emailIcon({ size = 16, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${classAttr}>
    <path d="${ICON_PATHS.email}"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>`;
}

/**
 * Creates an eye/preview icon SVG
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function eyePreviewIcon({ size = 16, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${classAttr}>
    <path d="${ICON_PATHS.eyePreview}"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`;
}

/**
 * Creates a code brackets icon SVG
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function codeBracketsIcon({ size = 16, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${classAttr}>
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>`;
}

/**
 * Creates an upload arrow icon SVG
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 48)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function uploadIcon({ size = 48, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${classAttr}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>`;
}

/**
 * Creates a PDF document icon SVG
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 24)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function pdfIcon({ size = 24, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${classAttr}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <text x="12" y="17" font-size="6" text-anchor="middle" fill="currentColor">PDF</text>
  </svg>`;
}

/**
 * Creates a warning/alert icon SVG
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 14)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function warningIcon({ size = 14, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${classAttr}>
    <path d="${ICON_PATHS.warning}"/>
  </svg>`;
}

/**
 * Creates a bold text formatting icon SVG (letter "B")
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function boldIcon({ size = 16, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${classAttr}>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
  </svg>`;
}

/**
 * Creates an italic text formatting icon SVG (letter "I")
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function italicIcon({ size = 16, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${classAttr}>
    <line x1="19" y1="4" x2="10" y2="4"></line>
    <line x1="14" y1="20" x2="5" y2="20"></line>
    <line x1="15" y1="4" x2="9" y2="20"></line>
  </svg>`;
}

/**
 * Creates an underline text formatting icon SVG (letter "U")
 * @param {Object} options - Configuration options
 * @param {number} options.size - Width and height (default: 16)
 * @param {string} options.className - Additional CSS classes
 * @returns {string} SVG element as string
 */
export function underlineIcon({ size = 16, className = '' } = {}) {
  const classAttr = className ? ` class="${className}"` : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${classAttr}>
    <path d="M6 4v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4"></path>
    <line x1="4" y1="21" x2="20" y2="21"></line>
  </svg>`;
}
