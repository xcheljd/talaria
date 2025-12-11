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

export function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIndicator(newTheme);

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
