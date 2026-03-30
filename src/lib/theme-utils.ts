/**
 * Theme utility functions for palette validation, dark mode CSS, and scrollbar styling.
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
 * Returns CSS that simulates email client dark mode color inversion.
 * Used for injecting into email preview iframes.
 */
export function getEmailDarkModeCSS(): string {
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
