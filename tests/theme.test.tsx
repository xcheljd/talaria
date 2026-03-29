import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeProvider';
import { ThemeToggle } from '../src/components/ThemeToggle';
import {
  VALID_LIGHT_PALETTES,
  VALID_DARK_PALETTES,
  validatePalette,
  getEmailDarkModeCSS,
  getScrollbarCSS,
  type PaletteName,
  type ThemeMode,
} from '../src/lib/theme-utils';

// ─── Palette Validation (pure utility) ────────────────────────────────────────

describe('validatePalette', () => {
  it('returns valid light palette names', () => {
    expect(validatePalette('github', 'light')).toBe('github');
    expect(validatePalette('spacegray', 'light')).toBe('spacegray');
    expect(validatePalette('catppuccin-latte', 'light')).toBe('catppuccin-latte');
    expect(validatePalette('nord', 'light')).toBe('nord');
    expect(validatePalette('rose-pine-dawn', 'light')).toBe('rose-pine-dawn');
    expect(validatePalette('tokyo-day', 'light')).toBe('tokyo-day');
    expect(validatePalette('solarized', 'light')).toBe('solarized');
    expect(validatePalette('one-light', 'light')).toBe('one-light');
  });

  it('returns valid dark palette names', () => {
    expect(validatePalette('github', 'dark')).toBe('github');
    expect(validatePalette('spacegray', 'dark')).toBe('spacegray');
    expect(validatePalette('catppuccin-mocha', 'dark')).toBe('catppuccin-mocha');
    expect(validatePalette('nord', 'dark')).toBe('nord');
    expect(validatePalette('rose-pine', 'dark')).toBe('rose-pine');
    expect(validatePalette('tokyo-night', 'dark')).toBe('tokyo-night');
    expect(validatePalette('monokai', 'dark')).toBe('monokai');
    expect(validatePalette('kanagawa', 'dark')).toBe('kanagawa');
  });

  it('defaults to github for invalid light palette', () => {
    expect(validatePalette('invalid-palette', 'light')).toBe('github');
    expect(validatePalette('', 'light')).toBe('github');
    expect(validatePalette(null as unknown as PaletteName, 'light')).toBe('github');
    expect(validatePalette(undefined as unknown as PaletteName, 'light')).toBe('github');
  });

  it('defaults to github for invalid dark palette', () => {
    expect(validatePalette('invalid-palette', 'dark')).toBe('github');
    expect(validatePalette('', 'dark')).toBe('github');
    expect(validatePalette(null as unknown as PaletteName, 'dark')).toBe('github');
    expect(validatePalette(undefined as unknown as PaletteName, 'dark')).toBe('github');
  });

  it('handles dark palette used in light mode (and vice versa)', () => {
    expect(validatePalette('monokai', 'light')).toBe('github');
    expect(validatePalette('one-light', 'dark')).toBe('github');
  });
});

// ─── Palette Constants ────────────────────────────────────────────────────────

describe('Palette constants', () => {
  it('VALID_LIGHT_PALETTES has 8 entries', () => {
    expect(VALID_LIGHT_PALETTES).toHaveLength(8);
  });

  it('VALID_DARK_PALETTES has 8 entries', () => {
    expect(VALID_DARK_PALETTES).toHaveLength(8);
  });

  it('github is in both light and dark palettes', () => {
    expect(VALID_LIGHT_PALETTES).toContain('github');
    expect(VALID_DARK_PALETTES).toContain('github');
  });

  it('spacegray is in both light and dark palettes', () => {
    expect(VALID_LIGHT_PALETTES).toContain('spacegray');
    expect(VALID_DARK_PALETTES).toContain('spacegray');
  });

  it('nord is in both light and dark palettes', () => {
    expect(VALID_LIGHT_PALETTES).toContain('nord');
    expect(VALID_DARK_PALETTES).toContain('nord');
  });

  it('light palettes do not contain dark-only palettes', () => {
    expect(VALID_LIGHT_PALETTES).not.toContain('monokai');
    expect(VALID_LIGHT_PALETTES).not.toContain('kanagawa');
    expect(VALID_LIGHT_PALETTES).not.toContain('catppuccin-mocha');
    expect(VALID_LIGHT_PALETTES).not.toContain('tokyo-night');
  });

  it('dark palettes do not contain light-only palettes', () => {
    expect(VALID_DARK_PALETTES).not.toContain('one-light');
    expect(VALID_DARK_PALETTES).not.toContain('catppuccin-latte');
    expect(VALID_DARK_PALETTES).not.toContain('solarized');
    expect(VALID_DARK_PALETTES).not.toContain('rose-pine-dawn');
  });
});

// ─── Email Dark Mode CSS ──────────────────────────────────────────────────────

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

// ─── Scrollbar CSS ────────────────────────────────────────────────────────────

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

// ─── ThemeProvider Context ────────────────────────────────────────────────────

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-light-palette');
    document.documentElement.removeAttribute('data-dark-palette');
    localStorage.clear();
  });

  it('provides default light theme when no saved theme', () => {
    function Consumer() {
      const { theme } = useTheme();
      return <span data-testid="theme">{theme}</span>;
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('restores saved theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lightPalette', 'nord');
    localStorage.setItem('darkPalette', 'monokai');

    function Consumer() {
      const { theme, lightPalette, darkPalette } = useTheme();
      return (
        <div>
          <span data-testid="theme">{theme}</span>
          <span data-testid="light-palette">{lightPalette}</span>
          <span data-testid="dark-palette">{darkPalette}</span>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('light-palette').textContent).toBe('nord');
    expect(screen.getByTestId('dark-palette').textContent).toBe('monokai');
  });

  it('sets DOM attributes on mount', () => {
    function Consumer() {
      return null;
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-light-palette')).toBe('github');
    expect(document.documentElement.getAttribute('data-dark-palette')).toBe('github');
  });

  it('migrates invalid palettes to github', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('lightPalette', 'old-palette-name');
    localStorage.setItem('darkPalette', 'another-invalid-palette');

    function Consumer() {
      const { lightPalette, darkPalette } = useTheme();
      return (
        <div>
          <span data-testid="light-palette">{lightPalette}</span>
          <span data-testid="dark-palette">{darkPalette}</span>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('light-palette').textContent).toBe('github');
    expect(screen.getByTestId('dark-palette').textContent).toBe('github');
    expect(localStorage.getItem('lightPalette')).toBe('github');
    expect(localStorage.getItem('darkPalette')).toBe('github');
  });

  it('toggles theme from light to dark', async () => {
    function Consumer() {
      const { theme, toggleTheme } = useTheme();
      return (
        <div>
          <span data-testid="theme">{theme}</span>
          <button onClick={toggleTheme}>Toggle</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('light');

    await userEvent.click(screen.getByText('Toggle'));

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles theme from dark to light', async () => {
    localStorage.setItem('theme', 'dark');

    function Consumer() {
      const { theme, toggleTheme } = useTheme();
      return (
        <div>
          <span data-testid="theme">{theme}</span>
          <button onClick={toggleTheme}>Toggle</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');

    await userEvent.click(screen.getByText('Toggle'));

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('sets light palette', async () => {
    function Consumer() {
      const { lightPalette, setLightPalette } = useTheme();
      return (
        <div>
          <span data-testid="light-palette">{lightPalette}</span>
          <button onClick={() => setLightPalette('nord')}>Set Nord</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    await userEvent.click(screen.getByText('Set Nord'));

    expect(screen.getByTestId('light-palette').textContent).toBe('nord');
    expect(localStorage.getItem('lightPalette')).toBe('nord');
    expect(document.documentElement.getAttribute('data-light-palette')).toBe('nord');
  });

  it('sets dark palette', async () => {
    function Consumer() {
      const { darkPalette, setDarkPalette } = useTheme();
      return (
        <div>
          <span data-testid="dark-palette">{darkPalette}</span>
          <button onClick={() => setDarkPalette('monokai')}>Set Monokai</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    await userEvent.click(screen.getByText('Set Monokai'));

    expect(screen.getByTestId('dark-palette').textContent).toBe('monokai');
    expect(localStorage.getItem('darkPalette')).toBe('monokai');
    expect(document.documentElement.getAttribute('data-dark-palette')).toBe('monokai');
  });

  it('validates light palette when setting invalid value', async () => {
    function Consumer() {
      const { lightPalette, setLightPalette } = useTheme();
      return (
        <div>
          <span data-testid="light-palette">{lightPalette}</span>
          <button onClick={() => setLightPalette('invalid' as PaletteName)}>Set Invalid</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    await userEvent.click(screen.getByText('Set Invalid'));

    expect(screen.getByTestId('light-palette').textContent).toBe('github');
    expect(localStorage.getItem('lightPalette')).toBe('github');
  });

  it('validates dark palette when setting invalid value', async () => {
    function Consumer() {
      const { darkPalette, setDarkPalette } = useTheme();
      return (
        <div>
          <span data-testid="dark-palette">{darkPalette}</span>
          <button onClick={() => setDarkPalette('invalid' as PaletteName)}>Set Invalid</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    await userEvent.click(screen.getByText('Set Invalid'));

    expect(screen.getByTestId('dark-palette').textContent).toBe('github');
    expect(localStorage.getItem('darkPalette')).toBe('github');
  });

  it('does not accept dark-only palette for light mode', async () => {
    function Consumer() {
      const { lightPalette, setLightPalette } = useTheme();
      return (
        <div>
          <span data-testid="light-palette">{lightPalette}</span>
          <button onClick={() => setLightPalette('monokai' as PaletteName)}>Set Monokai</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    await userEvent.click(screen.getByText('Set Monokai'));

    expect(screen.getByTestId('light-palette').textContent).toBe('github');
  });

  it('does not accept light-only palette for dark mode', async () => {
    function Consumer() {
      const { darkPalette, setDarkPalette } = useTheme();
      return (
        <div>
          <span data-testid="dark-palette">{darkPalette}</span>
          <button onClick={() => setDarkPalette('one-light' as PaletteName)}>Set One Light</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    await userEvent.click(screen.getByText('Set One Light'));

    expect(screen.getByTestId('dark-palette').textContent).toBe('github');
  });

  it('works for all valid light palettes', async () => {
    const validPalettes = VALID_LIGHT_PALETTES;

    function Consumer({ palette }: { palette: PaletteName }) {
      const { lightPalette, setLightPalette } = useTheme();
      void lightPalette;
      return (
        <button onClick={() => setLightPalette(palette)}>
          Set {palette}
        </button>
      );
    }

    for (const palette of validPalettes) {
      localStorage.clear();
      const { unmount } = render(
        <ThemeProvider>
          <Consumer palette={palette} />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText(`Set ${palette}`));
      expect(localStorage.getItem('lightPalette')).toBe(palette);
      expect(document.documentElement.getAttribute('data-light-palette')).toBe(palette);
      unmount();
    }
  });

  it('works for all valid dark palettes', async () => {
    const validPalettes = VALID_DARK_PALETTES;

    function Consumer({ palette }: { palette: PaletteName }) {
      const { darkPalette, setDarkPalette } = useTheme();
      void darkPalette;
      return (
        <button onClick={() => setDarkPalette(palette)}>
          Set {palette}
        </button>
      );
    }

    for (const palette of validPalettes) {
      localStorage.clear();
      const { unmount } = render(
        <ThemeProvider>
          <Consumer palette={palette} />
        </ThemeProvider>
      );

      await userEvent.click(screen.getByText(`Set ${palette}`));
      expect(localStorage.getItem('darkPalette')).toBe(palette);
      expect(document.documentElement.getAttribute('data-dark-palette')).toBe(palette);
      unmount();
    }
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function Consumer() {
      useTheme();
      return null;
    }

    expect(() => render(<Consumer />)).toThrow(
      /useTheme must be used within a ThemeProvider/
    );

    spy.mockRestore();
  });
});

// ─── ThemeToggle Component ────────────────────────────────────────────────────

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-light-palette');
    document.documentElement.removeAttribute('data-dark-palette');
    localStorage.clear();
  });

  it('renders a toggle button', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeNull();
  });

  it('shows light mode initially by default', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('toggles to dark mode when clicked', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('switch');
    await userEvent.click(toggle);

    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('reflects dark mode from localStorage', () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('toggles back to light mode when clicked twice', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('switch');

    // Toggle to dark
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    // Toggle back to light
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('has accessible label', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-label')).toBeTruthy();
  });
});
