import { useState } from "react";

export const themeChoices = ["mode", "light", "dark"] as const;
export type ThemeChoice = typeof themeChoices[number];
const storageKey = "nightcore-js.theme";

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // The preference still works for the current visit.
    }
    return "mode";
  });

  function choose(next: ThemeChoice) {
    setChoice(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Private or restricted browsing can disable storage.
    }
  }

  return { choice, choose };
}
