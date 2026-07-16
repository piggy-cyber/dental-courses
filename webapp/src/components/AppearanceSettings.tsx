"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SiteMotionMode } from "@/components/SiteRouteEffects";

const MOTION_KEY = "fourth-canal-motion";

function readMotion(): SiteMotionMode {
  const saved = window.localStorage.getItem(MOTION_KEY);
  if (saved === "full" || saved === "less" || saved === "off") return saved;
  if (saved === "cinematic") return "full";
  if (saved === "reduced") return "less";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "less" : "full";
}

const MODES: Array<{ value: SiteMotionMode; label: string; detail: string }> = [
  { value: "full", label: "Full", detail: "Blinds, parallax, staggered reveals, and living page details." },
  { value: "less", label: "Less", detail: "Short transitions and reveals without parallax or pointer effects." },
  { value: "off", label: "Off", detail: "Instant navigation and static content." },
];

export function AppearanceSettings() {
  const [motion, setMotion] = useState<SiteMotionMode>("full");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const next = readMotion();
      setMotion(next);
      window.localStorage.setItem(MOTION_KEY, next);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function chooseMotion(next: SiteMotionMode) {
    setMotion(next);
    window.localStorage.setItem(MOTION_KEY, next);
    window.dispatchEvent(new CustomEvent("fourth-canal:motion-change", { detail: next }));
  }

  return (
    <section className="app-card overflow-hidden" aria-labelledby="appearance-title">
      <div className="fc-card-heading">
        <div>
          <p className="eyebrow">Display preferences</p>
          <h2 id="appearance-title" className="portal-title mt-1 text-2xl font-semibold">Appearance and motion</h2>
        </div>
        <span className="fc-fourth-rule" aria-hidden="true" />
      </div>
      <div className="grid gap-7 p-6 md:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)]">
        <div>
          <h3 className="text-sm font-bold text-brand-navy">Theme</h3>
          <p className="mt-1 text-sm leading-relaxed text-brand-muted">
            Warm Bone is the default. Dark and System remain available when you want them.
          </p>
          <div className="mt-4"><ThemeToggle /></div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-brand-navy">Motion</h3>
          <div className="mt-3 grid gap-2">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => chooseMotion(item.value)}
                aria-pressed={motion === item.value}
                className={`fc-motion-option ${motion === item.value ? "fc-motion-option-active" : ""}`}
              >
                <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
