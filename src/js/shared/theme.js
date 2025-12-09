import { updateEmailPreview, currentTemplate } from '../ui.js';
import { updateLivePreview } from '../promotion-ui.js';

// Theme initialization and management functions
export function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const lightPalette = localStorage.getItem('lightPalette') || 'pastel';
  const darkPalette = localStorage.getItem('darkPalette') || 'midnight-blue';

  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-light-palette', lightPalette);
  document.documentElement.setAttribute('data-dark-palette', darkPalette);
  updateThemeIndicator(savedTheme);
}

// Update select dropdown arrows to match theme colors
export function updateSelectArrows() {
  // Get the computed text-secondary color from CSS variables
  const textSecondary = getComputedStyle(document.documentElement)
    .getPropertyValue('--text-secondary')
    .trim();

  // Create SVG data URL with the theme color
  const svgArrow = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><path fill="${textSecondary}" d="M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z"/></svg>`;
  const encodedSvg = encodeURIComponent(svgArrow);
  const dataUrl = `url('data:image/svg+xml;charset=UTF-8,${encodedSvg}')`;

  // Apply to all select elements (both .form-input and .template-select)
  const selects = document.querySelectorAll(
    'select.form-input, select.template-select'
  );

  selects.forEach((select) => {
    select.style.backgroundImage = dataUrl;
  });
}

export function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIndicator(newTheme);

  // Update select dropdown arrows to match new theme
  setTimeout(updateSelectArrows, 50);

  // Update preview iframes based on active template
  if (currentTemplate === 'promotion-email') {
    updateLivePreview();
  } else if (currentTemplate) {
    // Update regular email template preview
    updateEmailPreview();
  }
}

export function updateThemeIndicator(theme) {
  const slider = document.querySelector('.theme-toggle-slider');
  if (slider) {
    slider.style.transform =
      theme === 'dark' ? 'translateX(20px)' : 'translateX(0)';
  }
}
