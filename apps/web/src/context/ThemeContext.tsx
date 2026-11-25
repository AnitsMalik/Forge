import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeCustomConfig {
  sidebarBg: string;
  headerBg: string;
  accentColor: string;
}

const DEFAULT_CUSTOM_CONFIG: ThemeCustomConfig = {
  sidebarBg: '#090d16',
  headerBg: 'default',
  accentColor: '#8b5cf6',
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  sidebarBg: string;
  setSidebarBg: (color: string) => void;
  headerBg: string;
  setHeaderBg: (color: string) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  resetCustomTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  sidebarBg: DEFAULT_CUSTOM_CONFIG.sidebarBg,
  setSidebarBg: () => {},
  headerBg: DEFAULT_CUSTOM_CONFIG.headerBg,
  setHeaderBg: () => {},
  accentColor: DEFAULT_CUSTOM_CONFIG.accentColor,
  setAccentColor: () => {},
  resetCustomTheme: () => {},
});

/**
 * Determine whether a hex color is light (luminance > 0.55)
 * so text and icon contrast automatically adapts.
 */
export function isLightHexColor(hex: string): boolean {
  if (!hex || hex === 'default' || !hex.startsWith('#')) return false;
  const clean = hex.replace('#', '');
  const fullHex =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (fullHex.length !== 6) return false;
  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.58;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = (localStorage.getItem('hoaspforge_theme') || localStorage.getItem('socialforge_theme')) as Theme;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {}
    return 'dark';
  });

  const [customConfig, setCustomConfig] = useState<ThemeCustomConfig>(() => {
    try {
      const raw = localStorage.getItem('hoaspforge_theme_custom') || localStorage.getItem('socialforge_theme_custom');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          sidebarBg: parsed.sidebarBg || DEFAULT_CUSTOM_CONFIG.sidebarBg,
          headerBg: parsed.headerBg || DEFAULT_CUSTOM_CONFIG.headerBg,
          accentColor: parsed.accentColor || DEFAULT_CUSTOM_CONFIG.accentColor,
        };
      }
    } catch {}
    return DEFAULT_CUSTOM_CONFIG;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem('hoaspforge_theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const { sidebarBg, headerBg, accentColor } = customConfig;

    // 1. Apply Sidebar Custom Colors & Auto-Contrast
    const sidebarIsLight = isLightHexColor(sidebarBg);
    root.style.setProperty('--custom-sidebar-bg', sidebarBg);
    root.style.setProperty('--custom-sidebar-surface', sidebarIsLight ? '#f1f5f9' : '#111827');
    root.style.setProperty('--custom-sidebar-text-primary', sidebarIsLight ? '#0f172a' : '#f8fafc');
    root.style.setProperty('--custom-sidebar-text-secondary', sidebarIsLight ? '#334155' : '#cbd5e1');
    root.style.setProperty('--custom-sidebar-text-muted', sidebarIsLight ? '#64748b' : '#94a3b8');
    root.style.setProperty(
      '--custom-sidebar-border',
      sidebarIsLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)'
    );
    root.style.setProperty(
      '--custom-sidebar-hover-bg',
      sidebarIsLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.08)'
    );

    // 2. Apply Top Header Custom Colors & Auto-Contrast
    if (headerBg && headerBg !== 'default') {
      const headerIsLight = isLightHexColor(headerBg);
      root.style.setProperty('--custom-header-bg', headerBg);
      root.style.setProperty('--custom-header-text-primary', headerIsLight ? '#0f172a' : '#f8fafc');
      root.style.setProperty('--custom-header-text-secondary', headerIsLight ? '#475569' : '#cbd5e1');
      root.style.setProperty(
        '--custom-header-border',
        headerIsLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.1)'
      );
      root.setAttribute('data-custom-header', 'true');
    } else {
      root.removeAttribute('data-custom-header');
      root.style.removeProperty('--custom-header-bg');
      root.style.removeProperty('--custom-header-text-primary');
      root.style.removeProperty('--custom-header-text-secondary');
      root.style.removeProperty('--custom-header-border');
    }

    // 3. Apply Accent Color
    if (accentColor) {
      root.style.setProperty('--accent-primary', accentColor);
    }

    try {
      localStorage.setItem('hoaspforge_theme_custom', JSON.stringify(customConfig));
    } catch {}
  }, [customConfig, theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setSidebarBg = (color: string) => {
    setCustomConfig((prev) => ({ ...prev, sidebarBg: color }));
  };

  const setHeaderBg = (color: string) => {
    setCustomConfig((prev) => ({ ...prev, headerBg: color }));
  };

  const setAccentColor = (color: string) => {
    setCustomConfig((prev) => ({ ...prev, accentColor: color }));
  };

  const resetCustomTheme = () => {
    setCustomConfig(DEFAULT_CUSTOM_CONFIG);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        sidebarBg: customConfig.sidebarBg,
        setSidebarBg,
        headerBg: customConfig.headerBg,
        setHeaderBg,
        accentColor: customConfig.accentColor,
        setAccentColor,
        resetCustomTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
