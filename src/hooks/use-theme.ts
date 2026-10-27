import { useEffect, useState } from "react";

type Theme = "dark" | "light";
const STORAGE_KEY = "portal-theme";
const EVENT = "portal-theme-change";

function currentTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<Theme>).detail;
      if (next) setThemeState(next);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: next }));
  };

  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
