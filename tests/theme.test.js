import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initTheme,
  toggleTheme,
  updateThemeIndicator,
  validatePalette,
  getEmailDarkModeCSS,
  getScrollbarCSS,
} from '../src/js/shared/theme.js';

describe('validatePalette', () => {
  it('returns valid light palette names', () => {
    expect(validatePalette('github', 'light')).toBe('github');
    expect(validatePalette('spacegray', 'light')).toBe('spacegray');
    expect(validatePalette('catppuccin-latte', 'light')).toBe(
      'catppuccin-latte'
    );
    expect(validatePalette('nord', 'light')).toBe('nord');
    expect(validatePalette('rose-pine-dawn', 'light')).toBe('rose-pine-dawn');
    expect(validatePalette('tokyo-day', 'light')).toBe('tokyo-day');
    expect(validatePalette('solarized', 'light')).toBe('solarized');
    expect(validatePalette('one-light', 'light')).toBe('one-light');
  });

  it('returns valid dark palette names', () => {
    expect(validatePalette('github', 'dark')).toBe('github');
    expect(validatePalette('spacegray', 'dark')).toBe('spacegray');
    expect(validatePalette('catppuccin-mocha', 'dark')).toBe(
      'catppuccin-mocha'
    );
    expect(validatePalette('nord', 'dark')).toBe('nord');
    expect(validatePalette('rose-pine', 'dark')).toBe('rose-pine');
    expect(validatePalette('tokyo-night', 'dark')).toBe('tokyo-night');
    expect(validatePalette('monokai', 'dark')).toBe('monokai');
    expect(validatePalette('kanagawa', 'dark')).toBe('kanagawa');
  });

  it('defaults to github for invalid light palette', () => {
    expect(validatePalette('invalid-palette', 'light')).toBe('github');
    expect(validatePalette('', 'light')).toBe('github');
    expect(validatePalette(null, 'light')).toBe('github');
    expect(validatePalette(undefined, 'light')).toBe('github');
  });

  it('defaults to github for invalid dark palette', () => {
    expect(validatePalette('invalid-palette', 'dark')).toBe('github');
    expect(validatePalette('', 'dark')).toBe('github');
    expect(validatePalette(null, 'dark')).toBe('github');
    expect(validatePalette(undefined, 'dark')).toBe('github');
  });

  it('handles dark palette used in light mode (and vice versa)', () => {
    expect(validatePalette('monokai', 'light')).toBe('github');
    expect(validatePalette('one-light', 'dark')).toBe('github');
  });
});

describe('initTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-light-palette');
    document.documentElement.removeAttribute('data-dark-palette');
    localStorage.clear();
  });

  it('sets light theme and default palettes when no saved theme', () => {
    initTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-light-palette')).toBe(
      'github'
    );
    expect(document.documentElement.getAttribute('data-dark-palette')).toBe(
      'github'
    );
  });

  it('restores saved theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lightPalette', 'nord');
    localStorage.setItem('darkPalette', 'monokai');

    initTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-light-palette')).toBe(
      'nord'
    );
    expect(document.documentElement.getAttribute('data-dark-palette')).toBe(
      'monokai'
    );
  });

  it('migrates invalid palettes to github', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lightPalette', 'old-palette-name');
    localStorage.setItem('darkPalette', 'another-invalid-palette');

    initTheme();

    expect(document.documentElement.getAttribute('data-light-palette')).toBe(
      'github'
    );
    expect(document.documentElement.getAttribute('data-dark-palette')).toBe(
      'github'
    );
    expect(localStorage.getItem('lightPalette')).toBe('github');
    expect(localStorage.getItem('darkPalette')).toBe('github');
  });

  it('does not overwrite valid palettes', () => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('lightPalette', 'tokyo-day');
    localStorage.setItem('darkPalette', 'kanagawa');

    initTheme();

    expect(document.documentElement.getAttribute('data-light-palette')).toBe(
      'tokyo-day'
    );
    expect(document.documentElement.getAttribute('data-dark-palette')).toBe(
      'kanagawa'
    );
  });

  it('updates theme indicator slider', () => {
    const mockSlider = document.createElement('div');
    mockSlider.className = 'theme-toggle-slider';
    document.body.appendChild(mockSlider);

    localStorage.setItem('theme', 'dark');
    initTheme();

    expect(mockSlider.style.transform).toBe('translateX(20px)');

    document.body.removeChild(mockSlider);
  });

  it('handles missing slider element gracefully', () => {
    expect(() => {
      localStorage.setItem('theme', 'dark');
      initTheme();
    }).not.toThrow();
  });
});

describe('toggleTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('toggles from light to dark', () => {
    document.documentElement.setAttribute('data-theme', 'light');

    toggleTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggles from dark to light', () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    toggleTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('dispatches theme:changed event', () => {
    document.documentElement.setAttribute('data-theme', 'light');

    const eventSpy = vi.fn();
    document.addEventListener('theme:changed', eventSpy);

    toggleTheme();

    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { theme: 'dark' },
      })
    );

    document.removeEventListener('theme:changed', eventSpy);
  });

  it('updates theme indicator slider', () => {
    const mockSlider = document.createElement('div');
    mockSlider.className = 'theme-toggle-slider';
    document.body.appendChild(mockSlider);

    document.documentElement.setAttribute('data-theme', 'light');
    toggleTheme();

    expect(mockSlider.style.transform).toBe('translateX(20px)');

    document.body.removeChild(mockSlider);
  });
});

describe('updateThemeIndicator', () => {
  it('moves slider right for dark theme', () => {
    const mockSlider = document.createElement('div');
    mockSlider.className = 'theme-toggle-slider';
    document.body.appendChild(mockSlider);

    updateThemeIndicator('dark');

    expect(mockSlider.style.transform).toBe('translateX(20px)');

    document.body.removeChild(mockSlider);
  });

  it('moves slider left for light theme', () => {
    const mockSlider = document.createElement('div');
    mockSlider.className = 'theme-toggle-slider';
    document.body.appendChild(mockSlider);

    updateThemeIndicator('light');

    expect(mockSlider.style.transform).toBe('translateX(0)');

    document.body.removeChild(mockSlider);
  });

  it('handles missing slider element', () => {
    expect(() => updateThemeIndicator('dark')).not.toThrow();
  });
});

describe('getEmailDarkModeCSS', () => {
  it('returns non-empty CSS string', () => {
    const css = getEmailDarkModeCSS();
    expect(css).toBeTruthy();
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(0);
  });

  it('includes background color inversion', () => {
    const css = getEmailDarkModeCSS();
    expect(css).toContain('#1a1a1a');
  });

  it('includes text color overrides', () => {
    const css = getEmailDarkModeCSS();
    expect(css).toContain('#e0e0e0');
  });

  it('includes link styling', () => {
    const css = getEmailDarkModeCSS();
    expect(css).toContain('#8ab4f8');
  });
});

describe('getScrollbarCSS', () => {
  it('returns non-empty CSS string', () => {
    const css = getScrollbarCSS();
    expect(css).toBeTruthy();
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(0);
  });

  it('uses CSS variables for colors', () => {
    const css = getScrollbarCSS();
    expect(css).toContain('var(--muted)');
    expect(css).toContain('var(--muted-foreground)');
    expect(css).toContain('var(--foreground)');
  });

  it('includes scrollbar styling properties', () => {
    const css = getScrollbarCSS();
    expect(css).toContain('::-webkit-scrollbar');
    expect(css).toContain('::-webkit-scrollbar-track');
    expect(css).toContain('::-webkit-scrollbar-thumb');
    expect(css).toContain('::-webkit-scrollbar-corner');
  });

  it('includes hover state for thumb', () => {
    const css = getScrollbarCSS();
    expect(css).toContain('::-webkit-scrollbar-thumb:hover');
  });
});
