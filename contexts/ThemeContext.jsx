"use client"
import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = 'theme';

function resolveThemeMode(mode) {
  if (mode === 'system') {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  return mode === 'dark';
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState('dark');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialMode = savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
      ? savedTheme
      : 'dark';

    setThemeModeState(initialMode);
    setIsDarkMode(resolveThemeMode(initialMode));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(THEME_STORAGE_KEY, themeMode);

    const nextIsDark = resolveThemeMode(themeMode);
    setIsDarkMode(nextIsDark);

    if (nextIsDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    if (themeMode !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (event) => {
      const shouldUseDark = event.matches;
      setIsDarkMode(shouldUseDark);
      if (shouldUseDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    media.addEventListener('change', handleSystemChange);
    return () => media.removeEventListener('change', handleSystemChange);
  }, [themeMode, isLoaded]);

  const setThemeMode = (mode) => {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'system') return;
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState((prev) => {
      if (prev === 'system') {
        return resolveThemeMode('system') ? 'light' : 'dark';
      }

      return prev === 'dark' ? 'light' : 'dark';
    });
  };

  const value = {
    isDarkMode,
    toggleTheme,
    setThemeMode,
    themeMode,
    theme: isDarkMode ? 'dark' : 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};