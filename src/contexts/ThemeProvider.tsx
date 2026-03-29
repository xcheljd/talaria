import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  validatePalette,
  type PaletteName,
  type ThemeMode,
} from '@/lib/theme-utils';

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
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  const [lightPalette, setLightPaletteState] = useState<PaletteName>(() => {
    const saved = localStorage.getItem('lightPalette');
    return validatePalette(saved, 'light');
  });

  const [darkPalette, setDarkPaletteState] = useState<PaletteName>(() => {
    const saved = localStorage.getItem('darkPalette');
    return validatePalette(saved, 'dark');
  });

  // Apply theme to DOM whenever state changes
  useEffect(() => {
    applyThemeToDOM(theme, lightPalette, darkPalette);
  }, [theme, lightPalette, darkPalette]);

  // Migrate invalid palettes in localStorage on mount
  useEffect(() => {
    const current = localStorage.getItem('lightPalette');
    const validated = validatePalette(current, 'light');
    if (current !== validated) {
      localStorage.setItem('lightPalette', validated);
    }

    const currentDark = localStorage.getItem('darkPalette');
    const validatedDark = validatePalette(currentDark, 'dark');
    if (currentDark !== validatedDark) {
      localStorage.setItem('darkPalette', validatedDark);
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const setLightPalette = useCallback((palette: PaletteName) => {
    const validated = validatePalette(palette, 'light');
    localStorage.setItem('lightPalette', validated);
    setLightPaletteState(validated);
  }, []);

  const setDarkPalette = useCallback((palette: PaletteName) => {
    const validated = validatePalette(palette, 'dark');
    localStorage.setItem('darkPalette', validated);
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
