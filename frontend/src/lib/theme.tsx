import { createContext, useContext, useEffect, type ReactNode } from "react";

// One theme. The app is white. Period. (CLAUDE.md §9.1)
// The provider survives only to scrub any stale dark preference from
// pre-redesign visitors and to keep the ThemeProvider mount point stable.

export type Theme = "light";
type Ctx = { theme: Theme; resolved: "light"; setTheme: (t: Theme) => void };
const ThemeContext = createContext<Ctx>({
  theme: "light",
  resolved: "light",
  setTheme: () => {},
});

const STORAGE_KEY = "vr.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private mode */
    }
  }, []);
  return (
    <ThemeContext.Provider
      value={{ theme: "light", resolved: "light", setTheme: () => {} }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Ctx {
  return useContext(ThemeContext);
}
