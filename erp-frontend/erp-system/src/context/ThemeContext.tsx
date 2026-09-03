import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeId } from '../types';

interface ThemeOption {
  id: ThemeId;
  labelKey: string;
  icon: string;
  color: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'light', labelKey: 'themeLight', icon: 'Sun', color: '#ffffff' },
  { id: 'dark', labelKey: 'themeDark', icon: 'Moon', color: '#0f172a' },
  { id: 'sunrise', labelKey: 'themeSunrise', icon: 'Sunrise', color: '#ea580c' },
  { id: 'forest', labelKey: 'themeForest', icon: 'Trees', color: '#16a34a' },
  { id: 'ocean', labelKey: 'themeOcean', icon: 'Waves', color: '#0284c7' },
  { id: 'rose', labelKey: 'themeRose', icon: 'Flower2', color: '#e11d48' },
  { id: 'amber', labelKey: 'themeAmber', icon: 'Sparkles', color: '#d97706' },
  { id: 'lavender', labelKey: 'themeLavender', icon: 'Sparkles', color: '#9333ea' },
  { id: 'slate', labelKey: 'themeSlate', icon: 'Layers', color: '#475569' },
  { id: 'mint', labelKey: 'themeMint', icon: 'Leaf', color: '#0d9488' },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('erpTheme') as ThemeId;
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved;
    }
    return 'light';
  });

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('erpTheme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
