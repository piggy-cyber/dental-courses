"use client";

import { useState } from "react";
import type { CampusWeather } from "@/lib/weather";

function conditionColor(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("clear") || lower.includes("sunny")) return "text-sky-500";
  if (lower.includes("cloud") || lower.includes("overcast")) return "text-slate-400";
  if (lower.includes("rain") || lower.includes("drizzle") || lower.includes("shower"))
    return "text-blue-400";
  if (lower.includes("snow") || lower.includes("ice") || lower.includes("freezing"))
    return "text-indigo-300";
  if (lower.includes("thunder")) return "text-amber-400";
  if (lower.includes("fog")) return "text-slate-300";
  return "text-brand-navy";
}

function TempBar({ high, low, rangeMin, rangeMax }: { high: number; low: number; rangeMin: number; rangeMax: number }) {
  const span = rangeMax - rangeMin || 1;
  const left = ((low - rangeMin) / span) * 100;
  const width = ((high - low) / span) * 100;
  return (
    <div className="relative h-1.5 w-full bg-brand-soft">
      <div
        className="absolute top-0 h-full bg-brand-blue/50"
        style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
      />
    </div>
  );
}

export function WeatherInstrumentPanel({ weather }: { weather: CampusWeather | null }) {
  const [view, setView] = useState<"compact" | "detailed">("compact");

  if (!weather) {
    return (
      <div className="cockpit-panel flex items-center justify-center p-8">
        <p className="text-sm text-brand-muted">Weather data unavailable</p>
      </div>
    );
  }

  const rangeMin = Math.min(...weather.weekly.map((d) => d.low));
  const rangeMax = Math.max(...weather.weekly.map((d) => d.high));

  return (
    <div className="cockpit-panel flex flex-col">
      <div className="cockpit-section-bar flex items-center justify-between">
        <span>Campus Weather &middot; Cleveland 44106</span>
        <div className="cockpit-toggle">
          <button
            data-active={view === "compact"}
            onClick={() => setView("compact")}
          >
            Compact
          </button>
          <button
            data-active={view === "detailed"}
            onClick={() => setView("detailed")}
          >
            Detailed
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4 p-4">
        <div className="flex flex-col items-center">
          <span className="cockpit-gauge-value text-5xl leading-none">
            {weather.temperature}°
          </span>
          <span className={`mt-1 text-xs font-semibold ${conditionColor(weather.label)}`}>
            {weather.label}
          </span>
        </div>

        <div className="flex flex-1 flex-wrap gap-2">
          <div className="cockpit-readout min-w-[80px]">
            <p className="cockpit-readout-label">Feels like</p>
            <p className="cockpit-gauge-value text-lg">{weather.feelsLike}°</p>
          </div>
          <div className="cockpit-readout min-w-[80px]">
            <p className="cockpit-readout-label">Wind</p>
            <p className="cockpit-gauge-value text-lg">{weather.windMph}<span className="text-xs font-normal text-brand-muted"> mph</span></p>
          </div>
          <div className="cockpit-readout min-w-[80px]">
            <p className="cockpit-readout-label">High / Low</p>
            <p className="cockpit-gauge-value text-lg">{weather.high}° / {weather.low}°</p>
          </div>
          <div className="cockpit-readout min-w-[80px]">
            <p className="cockpit-readout-label">Precip</p>
            <p className="cockpit-gauge-value text-lg">{weather.precipChancePct}%</p>
          </div>
        </div>
      </div>

      {view === "detailed" && (
        <div className="border-t border-brand-line">
          <div className="cockpit-section-bar">7-Day Forecast</div>
          <div className="grid grid-cols-7 divide-x divide-brand-line">
            {weather.weekly.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1 px-1 py-2.5">
                <span className="text-[10px] font-bold uppercase text-brand-muted">
                  {day.weekday}
                </span>
                <span className="cockpit-gauge-value text-sm">{day.high}°</span>
                <TempBar
                  high={day.high}
                  low={day.low}
                  rangeMin={rangeMin}
                  rangeMax={rangeMax}
                />
                <span className="cockpit-gauge text-[11px] text-brand-muted">{day.low}°</span>
                <span className="text-[9px] text-brand-muted">{day.precipChancePct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "compact" && (
        <div className="flex items-center gap-px border-t border-brand-line bg-brand-line">
          {weather.weekly.slice(0, 7).map((day) => (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center bg-brand-panel py-2"
            >
              <span className="text-[10px] font-bold uppercase text-brand-muted">
                {day.weekday}
              </span>
              <span className="cockpit-gauge-value mt-0.5 text-xs">{day.high}°</span>
              <span className="text-[10px] text-brand-muted">{day.low}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
