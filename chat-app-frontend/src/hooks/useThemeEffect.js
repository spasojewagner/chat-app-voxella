import { useEffect, useState } from "react";
import { resolveTheme, usePreferences } from "../stores/preferences.js";

/** Keeps <html data-theme data-accent> in sync with the preferences and the OS setting. */
export function useThemeEffect() {
  const mode = usePreferences((s) => s.mode);
  const accent = usePreferences((s) => s.accent);
  const [theme, setTheme] = useState(() => resolveTheme(mode));

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(mode);
      document.documentElement.dataset.theme = resolved;
      setTheme(resolved);
    };
    apply();
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color || "#7c3aed");
  }, [accent, theme]);

  return theme;
}
