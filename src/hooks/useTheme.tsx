import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Single source of truth: read from localStorage first
    const stored = typeof window !== "undefined" ? localStorage.getItem("bahorai_theme") : null;
    if (stored === "light" || stored === "dark") return stored;

    // Default to dark for Bahor AI's dark-first design
    // Ignore system preference - always default to dark unless user explicitly chose light
    return "dark";
  });

  // Apply/remove the `dark` class and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    localStorage.setItem("bahorai_theme", theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // If not wrapped, fall back to light with no-op setter to avoid crashes.
    // But the app should wrap with ThemeProvider in App.tsx.
    return { theme: "light" as Theme, setTheme: () => {} };
  }
  return ctx;
}
