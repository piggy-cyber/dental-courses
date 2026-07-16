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
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "light";
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
      className={`inline-flex border border-brand-line bg-brand-panel ${
        compact ? "text-[11px]" : ""
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
            className={`border-r border-brand-line px-2.5 py-1 text-xs font-semibold last:border-r-0 ${
              active
                ? "fc-theme-toggle-active"
                : "bg-brand-panel text-brand-blue hover:bg-brand-soft hover:text-brand-navy"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
