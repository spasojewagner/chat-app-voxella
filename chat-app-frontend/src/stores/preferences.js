import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const ACCENTS = [
  { id: "violet", label: "Violet", swatch: "#7c3aed" },
  { id: "blue", label: "Blue", swatch: "#2563eb" },
  { id: "emerald", label: "Emerald", swatch: "#059669" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
  { id: "amber", label: "Amber", swatch: "#d97706" },
];

const prefersDark = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function resolveTheme(mode) {
  return mode === "system" ? (prefersDark() ? "dark" : "light") : mode;
}

/** Theme preferences live in this browser only; public/theme-init.js reads the same key. */
export const usePreferences = create(
  persist(
    (set) => ({
      mode: "system",
      accent: "violet",
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
    }),
    {
      name: "voxella.preferences",
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          return undefined; // storage blocked: preferences last for this visit only
        }
      }),
    },
  ),
);
