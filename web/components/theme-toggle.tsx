"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "dark" | "regular";

const STORAGE_KEY = "prisma-theme";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const rootTheme = document.documentElement.dataset.theme;
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme = rootTheme === "regular" || storedTheme === "regular" ? "regular" : "dark";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "regular" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex w-full items-center justify-between rounded-lg border border-[var(--color-divider)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
      title={`Switch to ${isDark ? "Regular" : "Dark"} mode`}
      aria-label="Toggle color theme"
    >
      <span className="inline-flex items-center gap-2">
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <span>{isDark ? "Dark mode" : "Regular mode"}</span>
      </span>
      <span className="text-xs text-[var(--color-text-faint)]">{isDark ? "Dark" : "Regular"}</span>
    </button>
  );
}
