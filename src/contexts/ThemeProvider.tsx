import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  validatePalette,
  type PaletteName,
  type ThemeMode,
} from '@/lib/theme-utils';
import { StorageKeys } from '@/lib/storage-keys';

interface ThemeContextValue {
  theme: ThemeMode;
  lightPalette: PaletteName;
  darkPalette: PaletteName;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setLightPalette: (palette: PaletteName) => void;
  setDarkPalette: (palette: PaletteName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Class toggled on <html> only while a theme/palette switch is cross-fading. */
const THEME_TRANSITION_CLASS = 'theme-transition';
/** Slightly longer than --theme-transition-duration (300ms) in index.css, so the
 *  token interpolation finishes before the class — and thus the transition that
 *  drives it — is removed. */
const THEME_TRANSITION_MS = 360;

interface ThemeProviderProps {
  children: ReactNode;
}

function applyThemeToDOM(
  theme: ThemeMode,
  lightPalette: PaletteName,
  darkPalette: PaletteName
): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-light-palette', lightPalette);
  document.documentElement.setAttribute('data-dark-palette', darkPalette);
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(StorageKeys.theme);
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  const [lightPalette, setLightPaletteState] = useState<PaletteName>(() => {
    const saved = localStorage.getItem(StorageKeys.lightPalette);
    return validatePalette(saved, 'light');
  });

  const [darkPalette, setDarkPaletteState] = useState<PaletteName>(() => {
    const saved = localStorage.getItem(StorageKeys.darkPalette);
    return validatePalette(saved, 'dark');
  });

  // Skip the cross-fade on the very first paint; only animate later switches.
  const isFirstApply = useRef(true);
  const transitionTimer = useRef<number | null>(null);

  // Apply theme to DOM whenever state changes. Wrap the change in a brief
  // `theme-transition` window so every element cross-fades together evenly,
  // then remove the class so component micro-interactions stay snappy.
  useEffect(() => {
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    )?.matches;

    if (!isFirstApply.current && !prefersReducedMotion) {
      root.classList.add(THEME_TRANSITION_CLASS);
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current);
      }
      transitionTimer.current = window.setTimeout(() => {
        root.classList.remove(THEME_TRANSITION_CLASS);
        transitionTimer.current = null;
      }, THEME_TRANSITION_MS);
    }

    applyThemeToDOM(theme, lightPalette, darkPalette);
    isFirstApply.current = false;

    return () => {
      if (transitionTimer.current !== null) {
        window.clearTimeout(transitionTimer.current);
        transitionTimer.current = null;
      }
    };
  }, [theme, lightPalette, darkPalette]);

  // Migrate invalid palettes in localStorage on mount
  useEffect(() => {
    const current = localStorage.getItem(StorageKeys.lightPalette);
    const validated = validatePalette(current, 'light');
    if (current !== validated) {
      localStorage.setItem(StorageKeys.lightPalette, validated);
    }

    const currentDark = localStorage.getItem(StorageKeys.darkPalette);
    const validatedDark = validatePalette(currentDark, 'dark');
    if (currentDark !== validatedDark) {
      localStorage.setItem(StorageKeys.darkPalette, validatedDark);
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    localStorage.setItem(StorageKeys.theme, newTheme);
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(StorageKeys.theme, next);
      return next;
    });
  }, []);

  const setLightPalette = useCallback((palette: PaletteName) => {
    const validated = validatePalette(palette, 'light');
    localStorage.setItem(StorageKeys.lightPalette, validated);
    setLightPaletteState(validated);
  }, []);

  const setDarkPalette = useCallback((palette: PaletteName) => {
    const validated = validatePalette(palette, 'dark');
    localStorage.setItem(StorageKeys.darkPalette, validated);
    setDarkPaletteState(validated);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        lightPalette,
        darkPalette,
        toggleTheme,
        setTheme,
        setLightPalette,
        setDarkPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
