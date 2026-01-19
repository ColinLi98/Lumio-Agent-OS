import { useState, useEffect, useCallback, createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = 'lumi-theme';

/**
 * Get the initial theme from localStorage or system preference
 */
const getInitialTheme = (): Theme => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
        // Check system preference
        if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    }
    return 'light';
};

/**
 * Custom hook for managing theme state
 */
export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    // Apply theme to document
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        // Persist to localStorage
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            // Only auto-switch if user hasn't manually set a preference
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (!stored) {
                setThemeState(e.matches ? 'dark' : 'light');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    return { theme, toggleTheme, setTheme };
}
