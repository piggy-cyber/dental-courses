import type { WeatherMood } from "@/lib/weather";

type Props = {
  mood: WeatherMood;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: 20, md: 32, lg: 56 };

export function WeatherIcon({ mood, size = "md", className = "" }: Props) {
  const dim = sizes[size];
  const common = { width: dim, height: dim, className, "aria-hidden": true as const };

  switch (mood) {
    case "clear":
      return (
        <svg viewBox="0 0 24 24" fill="none" {...common}>
          <circle cx="12" cy="12" r="5" fill="currentColor" className="text-amber-400" />
          <g stroke="currentColor" strokeWidth="1.5" className="text-amber-300">
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="4.9" y1="4.9" x2="7" y2="7" />
            <line x1="17" y1="17" x2="19.1" y2="19.1" />
            <line x1="4.9" y1="19.1" x2="7" y2="17" />
            <line x1="17" y1="7" x2="19.1" y2="4.9" />
          </g>
        </svg>
      );
    case "cloudy":
      return (
        <svg viewBox="0 0 24 24" fill="none" {...common}>
          <path
            d="M7 18h11a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.2A3.5 3.5 0 0 0 7 18Z"
            fill="currentColor"
            className="text-slate-400"
          />
        </svg>
      );
    case "rain":
      return (
        <svg viewBox="0 0 24 24" fill="none" {...common}>
          <path
            d="M7 14h11a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.2A3.5 3.5 0 0 0 7 14Z"
            fill="currentColor"
            className="text-slate-400"
          />
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-blue-400">
            <line x1="9" y1="17" x2="8" y2="21" />
            <line x1="13" y1="17" x2="12" y2="21" />
            <line x1="17" y1="17" x2="16" y2="21" />
          </g>
        </svg>
      );
    case "snow":
      return (
        <svg viewBox="0 0 24 24" fill="none" {...common}>
          <path
            d="M7 13h11a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.2A3.5 3.5 0 0 0 7 13Z"
            fill="currentColor"
            className="text-slate-300"
          />
          <g stroke="currentColor" strokeWidth="1.2" className="text-indigo-300">
            <circle cx="9" cy="18" r="1" fill="currentColor" />
            <circle cx="13" cy="20" r="1" fill="currentColor" />
            <circle cx="17" cy="18" r="1" fill="currentColor" />
          </g>
        </svg>
      );
    case "storm":
      return (
        <svg viewBox="0 0 24 24" fill="none" {...common}>
          <path
            d="M7 12h11a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.2A3.5 3.5 0 0 0 7 12Z"
            fill="currentColor"
            className="text-slate-500"
          />
          <path d="M13 13l-2 4h2l-1 3 4-5h-2l1-2Z" fill="currentColor" className="text-amber-400" />
        </svg>
      );
    case "fog":
      return (
        <svg viewBox="0 0 24 24" fill="none" {...common}>
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400">
            <line x1="4" y1="10" x2="20" y2="10" />
            <line x1="6" y1="14" x2="18" y2="14" />
            <line x1="5" y1="18" x2="19" y2="18" />
          </g>
        </svg>
      );
  }
}

export function weatherMoodTint(mood: WeatherMood): string {
  switch (mood) {
    case "clear":
      return "weather-mood-clear";
    case "cloudy":
      return "weather-mood-cloudy";
    case "rain":
      return "weather-mood-rain";
    case "snow":
      return "weather-mood-snow";
    case "storm":
      return "weather-mood-storm";
    case "fog":
      return "weather-mood-fog";
  }
}
