"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "d1-theme-mode";
const MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function storedMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function resolvedTheme(mode: ThemeMode) {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function applyTheme(mode: ThemeMode) {
  const theme = resolvedTheme(mode);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themeMode = mode;
  localStorage.setItem(STORAGE_KEY, mode);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>(storedMode);

  useEffect(() => {
    applyTheme(mode);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (storedMode() === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [mode]);

  function choose(nextMode: ThemeMode) {
    setMode(nextMode);
    applyTheme(nextMode);
  }

  return (
    <div
      aria-label="Theme mode"
      className={`inline-flex rounded-full border border-brand-line bg-brand-panel/80 p-1 shadow-sm ${
        compact ? "scale-[0.92]" : ""
      }`}
      role="group"
    >
      {MODES.map((item) => {
        const active = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => choose(item.value)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              active
                ? "bg-brand-blue text-white"
                : "text-brand-muted hover:bg-brand-soft hover:text-brand-navy"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
