const VALID_LIGHT_PALETTES = [
  'github',
  'spacegray',
  'catppuccin-latte',
  'nord',
  'rose-pine-dawn',
  'tokyo-day',
  'solarized',
  'one-light',
];
const VALID_DARK_PALETTES = [
  'github',
  'spacegray',
  'catppuccin-mocha',
  'nord',
  'rose-pine',
  'tokyo-night',
  'monokai',
  'kanagawa',
];

export function validatePalette(palette, type) {
  const validList =
    type === 'light' ? VALID_LIGHT_PALETTES : VALID_DARK_PALETTES;
  return validList.includes(palette) ? palette : 'github';
}

// Theme initialization and management functions
export function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  let lightPalette = localStorage.getItem('lightPalette') || 'github';
  let darkPalette = localStorage.getItem('darkPalette') || 'github';

  // Validate and migrate old palettes
  lightPalette = validatePalette(lightPalette, 'light');
  darkPalette = validatePalette(darkPalette, 'dark');

  // Save back if changed (migration)
  if (lightPalette !== localStorage.getItem('lightPalette')) {
    localStorage.setItem('lightPalette', lightPalette);
  }
  if (darkPalette !== localStorage.getItem('darkPalette')) {
    localStorage.setItem('darkPalette', darkPalette);
  }

  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-light-palette', lightPalette);
  document.documentElement.setAttribute('data-dark-palette', darkPalette);
  updateThemeIndicator(savedTheme);
}

export function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIndicator(newTheme);

  document.dispatchEvent(
    new CustomEvent('theme:changed', {
      detail: { theme: newTheme },
    })
  );
}

export function updateThemeIndicator(theme) {
  const slider = document.querySelector('.theme-toggle-slider');
  if (slider) {
    slider.style.transform =
      theme === 'dark' ? 'translateX(20px)' : 'translateX(0)';
  }
}

/**
 * Set the light mode palette, updating the DOM attribute and persisting to localStorage.
 * Invalid palette names fall back to 'github'.
 * @param {string} name - Palette name to set
 */
export function setLightPalette(name) {
  const validated = validatePalette(name, 'light');
  document.documentElement.setAttribute('data-light-palette', validated);
  localStorage.setItem('lightPalette', validated);
}

/**
 * Set the dark mode palette, updating the DOM attribute and persisting to localStorage.
 * Invalid palette names fall back to 'github'.
 * @param {string} name - Palette name to set
 */
export function setDarkPalette(name) {
  const validated = validatePalette(name, 'dark');
  document.documentElement.setAttribute('data-dark-palette', validated);
  localStorage.setItem('darkPalette', validated);
}

// Get CSS that simulates email client dark mode color inversion
export function getEmailDarkModeCSS() {
  return `
    /* Simulate email client dark mode */
    html,
    body {
      background-color: #1a1a1a !important;
      color: #e0e0e0 !important;
    }

    /* Many generated previews include aggressive inline colors (rgb(0,0,0), #000, etc.).
       Force readable defaults unless explicitly overridden below. */
    body * {
      color: inherit;
    }

    /* Override common inline black/dark text values */
    [style*="color: rgb(0, 0, 0)"],
    [style*="color:rgb(0,0,0)"],
    [style*="color: #000"],
    [style*="color:#000"],
    [style*="color: #000000"],
    [style*="color:#000000"],
    [style*="color: black"],
    [style*="color:black"],
    [style*="color: #24292f"],
    [style*="color:#24292f"],
    [style*="color: #333333"],
    [style*="color:#333333"],
    [style*="color: #333"] {
      color: #e0e0e0 !important;
    }

    /* Override common light backgrounds */
    [style*="background-color: rgb(255, 255, 255)"],
    [style*="background-color:rgb(255,255,255)"],
    [style*="background-color: white"],
    [style*="background-color:#ffffff"],
    [style*="background-color: #ffffff"],
    [style*="background: #ffffff"],
    [style*="background:#ffffff"],
    [style*="background: white"],
    [style*="background:white"] {
      background-color: #1a1a1a !important;
      background: #1a1a1a !important;
    }

    /* Invert common light gray backgrounds */
    [style*="background-color: #f5f5f5"],
    [style*="background-color:#f5f5f5"],
    [style*="background-color: #f4f4f4"],
    [style*="background-color:#f4f4f4"],
    [style*="background-color: #eee"],
    [style*="background-color:#eee"],
    [style*="background-color: #eeeeee"],
    [style*="background-color:#eeeeee"] {
      background-color: #2d2d2d !important;
      background: #2d2d2d !important;
    }

    /* Links */
    a,
    a:visited {
      color: #8ab4f8 !important;
    }

    /* UI.js specific classes */
    .email-container {
      background-color: #1a1a1a !important;
      color: #e0e0e0 !important;
    }
    .email-header {
      background-color: #2d2d2d !important;
      border-bottom-color: #444444 !important;
    }
    .email-subject {
      color: #e0e0e0 !important;
    }
    .email-body {
      color: #e0e0e0 !important;
    }

    /* Tables often get their own background in email HTML */
    table,
    tbody,
    tr,
    td {
      background-color: transparent !important;
    }

    /* Invert light borders */
    [style*="border: 1px solid #ddd"],
    [style*="border:1px solid #ddd"],
    [style*="border-color: #ddd"],
    [style*="border-color:#ddd"],
    [style*="border-color: #d0d7de"],
    [style*="border-color:#d0d7de"] {
      border-color: #444444 !important;
    }
    [style*="border-bottom: 2px solid gray"],
    [style*="border-bottom:2px solid gray"] {
      border-bottom-color: #555555 !important;
    }

    /* Keep dark footer as-is (already dark) */
    [style*="background-color: #2c3e50"],
    [style*="background-color:#2c3e50"] {
      background-color: #2c3e50 !important;
    }

    /* Ensure white / gold accents remain */
    [style*="color: white"],
    [style*="color:white"] {
      color: white !important;
    }
    [style*="color: #ffd700"],
    [style*="color:#ffd700"] {
      color: #ffd700 !important;
    }
  `;
}

/**
 * Returns scrollbar CSS that uses theme variables for injection into iframes
 * This ensures iframe scrollbars match the parent document's theme
 * @returns {string} CSS string with scrollbar styling using CSS variables
 */
export function getScrollbarCSS() {
  return `
    /* WebKit scrollbar theming */
    ::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    ::-webkit-scrollbar-track {
      background: var(--muted);
      border-radius: 6px;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--muted-foreground);
      border-radius: 6px;
      border: 2px solid var(--muted);
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--foreground);
    }
    ::-webkit-scrollbar-corner {
      background: var(--muted);
    }
  `;
}
