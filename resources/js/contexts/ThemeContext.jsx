import { createContext, useContext, useEffect, useState } from 'react';

const THEME_KEY = 'socimpro_theme';

function readTheme() {
    return localStorage.getItem(THEME_KEY)
        || localStorage.getItem('batixpert_theme')
        || localStorage.getItem('autopilote_theme');
}

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [dark, setDark] = useState(() => {
        const saved = readTheme();
        return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    }, [dark]);

    return (
        <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
