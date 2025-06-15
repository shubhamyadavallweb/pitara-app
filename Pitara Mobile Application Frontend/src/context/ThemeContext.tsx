import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('pitara_theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.classList.toggle('light', !isDarkMode);
    localStorage.setItem('pitara_theme', isDarkMode ? 'dark' : 'light');

    // Dynamically update the browser/Android status-bar colour (PWA & TWA)
    const metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (metaThemeColor) {
      // Use Tailwind CSS variables for background so bar always matches UI.
      // Fallback colours for very old browsers.
      const hslValue = getComputedStyle(document.documentElement).getPropertyValue('--background');
      const colour = hslValue ? `hsl(${hslValue.trim()})` : (isDarkMode ? '#000000' : '#ffffff');
      metaThemeColor.setAttribute('content', colour);
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
