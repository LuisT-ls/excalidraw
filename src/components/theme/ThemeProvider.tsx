"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "whiteboard-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : "system";
  } catch {
    return "system";
  }
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(theme: Theme): ResolvedTheme {
  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const themeRef = useRef<Theme>("system");

  useEffect(() => {
    const storedTheme = getStoredTheme();
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    themeRef.current = storedTheme;
    setThemeState(storedTheme);
    setResolvedTheme(applyTheme(storedTheme));

    const handleSystemThemeChange = () => {
      if (themeRef.current === "system") {
        setResolvedTheme(applyTheme("system"));
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    themeRef.current = nextTheme;
    setThemeState(nextTheme);
    setResolvedTheme(applyTheme(nextTheme));

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // A preferência de tema não deve impedir o uso do quadro se o storage falhar.
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme precisa estar dentro de ThemeProvider.");
  }

  return context;
}
