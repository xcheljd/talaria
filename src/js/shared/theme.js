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

function validatePalette(palette, type) {
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

// Get CSS that simulates email client dark mode color inversion
export function getEmailDarkModeCSS() {
  return `
    /* Simulate email client dark mode - invert light backgrounds and text */
    body {
      background-color: #1a1a1a !important;
      color: #e0e0e0 !important;
    }
    
    /* UI.js specific classes */
    .email-container {
      background-color: #1a1a1a !important;
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
    .email-body a {
      color: #6699ff !important;
    }

    /* Promotion Email specific styles */
    table {
      background-color: #1a1a1a !important;
    }
    /* Invert light gray backgrounds */
    [style*="background-color: #f5f5f5"],
    [style*="background-color:#f5f5f5"] {
      background-color: #2d2d2d !important;
    }
    [style*="background-color: #f4f4f4"],
    [style*="background-color:#f4f4f4"] {
      background-color: #2a2a2a !important;
    }
    [style*="background-color: white"],
    [style*="background-color:#ffffff"],
    [style*="background-color: #ffffff"] {
      background-color: #1a1a1a !important;
    }
    /* Invert dark text to light */
    [style*="color: #333333"],
    [style*="color:#333333"],
    [style*="color: #333"] {
      color: #e0e0e0 !important;
    }
    /* Invert light borders */
    [style*="border: 1px solid #ddd"] {
      border-color: #444444 !important;
    }
    [style*="border-bottom: 2px solid gray"] {
      border-bottom-color: #555555 !important;
    }
    /* Keep dark footer as-is (already dark) */
    [style*="background-color: #2c3e50"] {
      background-color: #2c3e50 !important;
    }
    /* Ensure white text in footer stays white */
    [style*="color: white"] {
      color: white !important;
    }
    /* Keep gold accent color */
    [style*="color: #ffd700"] {
      color: #ffd700 !important;
    }
  `;
}
