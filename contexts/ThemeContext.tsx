import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type FontSize = 'sm' | 'base' | 'lg';
export type AccentColor = 'indigo' | 'purple' | 'emerald' | 'amber';

interface ThemeContextType {
  theme: ThemeMode;
  fontSize: FontSize;
  accentColor: AccentColor;
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setAccentColor: (color: AccentColor) => void;
  getAccentClass: (type: 'bg' | 'text' | 'border' | 'ring' | 'from' | 'to', intensity?: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('if-theme') as ThemeMode) || 'dark');
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('if-font-size') as FontSize) || 'base');
  const [accentColor, setAccentColor] = useState<AccentColor>(() => (localStorage.getItem('if-accent-color') as AccentColor) || 'indigo');

  useEffect(() => {
    localStorage.setItem('if-theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('if-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('if-accent-color', accentColor);
  }, [accentColor]);

  const getAccentClass = (type: 'bg' | 'text' | 'border' | 'ring' | 'from' | 'to', intensity: string = '500') => {
    return `${type}-${accentColor}-${intensity}`;
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      fontSize, 
      accentColor, 
      setTheme, 
      setFontSize, 
      setAccentColor,
      getAccentClass 
    }}>
      <div className={`
        ${fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base'}
        transition-all duration-300 min-h-screen
      `}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};