"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "kip-theme";
const themeListeners = new Set<() => void>();

function applyTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

/* Reads the theme already applied to <html> by the beforeInteractive script in
   layout.tsx, so hydration never has to guess and never flashes the wrong theme. */
function getThemeSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getThemeServerSnapshot(): Theme {
  return "dark";
}

function subscribeToTheme(onChange: () => void): () => void {
  themeListeners.add(onChange);
  return () => themeListeners.delete(onChange);
}

function setTheme(theme: Theme) {
  applyTheme(theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  themeListeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink hover:border-hairline-strong transition-colors kip-press"
      aria-label={`Switch to ${next} mode`}
    >
      <span
        className="inline-block size-2.5 rounded-full"
        style={{ background: theme === "dark" ? "#f2cf87" : "#262624" }}
        aria-hidden
      />
      {theme === "dark" ? "Kip Cream" : "Kip Charcoal"}
    </button>
  );
}
