"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
const Ctx = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>({
  theme: "dark",
  toggle: () => undefined,
  set: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("opveil-theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        document.documentElement.dataset.theme = saved;
        return;
      }
    } catch { /* ignore */ }
    document.documentElement.dataset.theme = "dark";
  }, []);

  const set = useCallback((t: Theme) => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("opveil-theme", t);
    } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => {
    set(theme === "dark" ? "light" : "dark");
  }, [theme, set]);

  return <Ctx.Provider value={{ theme, toggle, set }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
