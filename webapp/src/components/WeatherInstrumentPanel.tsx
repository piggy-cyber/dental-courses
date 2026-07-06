import type { CampusWeather } from "@/lib/weather";
import { WeatherIcon, weatherMoodTint } from "@/components/WeatherIcon";

function TempBar({
  high,
  low,
  rangeMin,
  rangeMax,
}: {
  high: number;
  low: number;
  rangeMin: number;
  rangeMax: number;
}) {
  const span = rangeMax - rangeMin || 1;
  const left = ((low - rangeMin) / span) * 100;
  const width = ((high - low) / span) * 100;
  return (
    <div className="relative h-1 w-full bg-brand-soft">
      <div
        className="absolute top-0 h-full bg-brand-blue/50"
        style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
      />
    </div>
  );
}

export function WeatherInstrumentPanel({ weather }: { weather: CampusWeather | null }) {
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
    <div className={`cockpit-panel flex flex-col overflow-hidden ${weatherMoodTint(weather.mood)}`}>
      <div className="cockpit-section-bar">
        <span>Campus Weather &middot; Cleveland 44106</span>
      </div>

      <div className="flex flex-wrap items-center gap-5 p-4">
        <div className="flex items-center gap-4">
          <WeatherIcon mood={weather.mood} size="lg" />
          <div>
            <span className="cockpit-gauge-value text-5xl leading-none">
              {weather.temperature}&deg;
            </span>
            <p className="mt-1 text-sm font-semibold text-brand-navy">{weather.label}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap gap-2">
          <div className="cockpit-readout min-w-[80px]">
            <p className="cockpit-readout-label">Feels like</p>
            <p className="cockpit-gauge-value text-lg">{weather.feelsLike}&deg;</p>
          </div>
          <div className="cockpit-readout min-w-[80px]">
            <p className="cockpit-readout-label">Wind</p>
            <p className="cockpit-gauge-value text-lg">
              {weather.windMph}
              <span className="text-xs font-normal text-brand-muted"> mph</span>
            </p>
          </div>
          <div className="cockpit-readout min-w-[80px]">
            <p className="cockpit-readout-label">High / Low</p>
            <p className="cockpit-gauge-value text-lg">
              {weather.high}&deg; / {weather.low}&deg;
            </p>
          </div>
          <div className="cockpit-readout min-w-[80px]">
            <p className="cockpit-readout-label">Precip</p>
            <p className="cockpit-gauge-value text-lg">{weather.precipChancePct}%</p>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-line">
        <div className="cockpit-section-bar">7-Day Forecast</div>
        <div className="grid grid-cols-7 divide-x divide-brand-line">
          {weather.weekly.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1 px-1 py-3">
              <span className="text-[10px] font-bold uppercase text-brand-muted">
                {day.weekday}
              </span>
              <WeatherIcon mood={day.mood} size="sm" />
              <span className="cockpit-gauge-value text-sm">{day.high}&deg;</span>
              <TempBar
                high={day.high}
                low={day.low}
                rangeMin={rangeMin}
                rangeMax={rangeMax}
              />
              <span className="cockpit-gauge text-[11px] text-brand-muted">{day.low}&deg;</span>
              {day.precipChancePct > 0 && (
                <span className="text-[9px] font-medium text-blue-500">
                  {day.precipChancePct}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
