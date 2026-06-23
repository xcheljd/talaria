/**
 * Theme utility functions for palette validation, dark mode detection, and scrollbar styling.
 * Pure functions with no React dependencies.
 */

export type ThemeMode = 'light' | 'dark';
export type PaletteName = string;

export const VALID_LIGHT_PALETTES: readonly PaletteName[] = [
  'github',
  'spacegray',
  'catppuccin-latte',
  'nord',
  'rose-pine-dawn',
  'tokyo-day',
  'solarized',
  'one-light',
] as const;

export const VALID_DARK_PALETTES: readonly PaletteName[] = [
  'github',
  'spacegray',
  'catppuccin-mocha',
  'nord',
  'rose-pine',
  'tokyo-night',
  'monokai',
  'kanagawa',
] as const;

/** Human-readable labels for light palettes */
export const LIGHT_PALETTE_LABELS: Record<string, string> = {
  github: 'GitHub',
  spacegray: 'SpaceGray',
  'catppuccin-latte': 'Catppuccin Latte',
  nord: 'Nord',
  'rose-pine-dawn': 'Rose Pine Dawn',
  'tokyo-day': 'Tokyo Day',
  solarized: 'Solarized',
  'one-light': 'One Light',
};

/** Human-readable labels for dark palettes */
export const DARK_PALETTE_LABELS: Record<string, string> = {
  github: 'GitHub',
  spacegray: 'SpaceGray',
  'catppuccin-mocha': 'Catppuccin Mocha',
  nord: 'Nord',
  'rose-pine': 'Rose Pine',
  'tokyo-night': 'Tokyo Night',
  monokai: 'Monokai',
  kanagawa: 'Kanagawa',
};

/**
 * Detect whether the parent document (i.e. the page hosting the email preview
 * iframe) is currently in dark mode, based on its `data-theme` attribute.
 *
 * Returns false in non-browser environments or when no parent document is
 * accessible (e.g. tests, SSR). Email preview / signature renderers use this
 * to swap their preview colors when the host UI is dark.
 */
export function isIframePreviewDarkMode(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.parent?.document?.documentElement?.getAttribute('data-theme') ===
      'dark'
  );
}

/**
 * Validates a palette name against the valid list for the given mode.
 * Returns the palette name if valid, otherwise falls back to 'github'.
 */
export function validatePalette(
  palette: PaletteName | null | undefined,
  type: 'light' | 'dark'
): PaletteName {
  if (!palette) return 'github';
  const validList =
    type === 'light' ? VALID_LIGHT_PALETTES : VALID_DARK_PALETTES;
  return validList.includes(palette) ? palette : 'github';
}

/**
 * Returns scrollbar CSS that uses theme variables for injection into iframes.
 * This ensures iframe scrollbars match the parent document's theme.
 */
export function getScrollbarCSS(): string {
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
