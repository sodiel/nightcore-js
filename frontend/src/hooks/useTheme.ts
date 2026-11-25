import { useState, useSyncExternalStore } from "react";

export const themeChoices = ["system", "light", "dark"] as const;
export type ThemeChoice = typeof themeChoices[number];
const storageKey = "nightcore-js.theme";

const darkQuery = "(prefers-color-scheme: dark)";

function subscribe(listener: () => void) {
  const media = window.matchMedia(darkQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function systemIsDark() {
  return window.matchMedia(darkQuery).matches;
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // The preference still works for the current visit.
    }
    return "system";
  });

  function choose(next: ThemeChoice) {
    setChoice(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Private or restricted browsing can disable storage.
    }
  }

  const dark = useSyncExternalStore(subscribe, systemIsDark);
  const theme = choice === "system" ? (dark ? "dark" : "light") : choice;
  return { choice, choose, theme };
}
