// Weather for the CWRU Health Education Campus (9501 Euclid Ave, Cleveland).
// Open-Meteo is free and needs no API key.
const HEC_LAT = 41.5036;
const HEC_LON = -81.6089;

const WEATHER_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export type WeatherMood = "clear" | "cloudy" | "rain" | "snow" | "storm" | "fog";

export function weatherMood(code: number): WeatherMood {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 85 && code <= 86) return "snow";
  if (code >= 95) return "storm";
  if (code >= 51) return "rain";
  return "cloudy";
}

export function weatherLabel(code: number): string {
  return WEATHER_LABELS[code] ?? "—";
}

export type CampusWeather = {
  temperature: number;
  feelsLike: number;
  label: string;
  weatherCode: number;
  mood: WeatherMood;
  windMph: number;
  high: number;
  low: number;
  precipChancePct: number;
  weekly: DailyCampusWeather[];
};

export type DailyCampusWeather = {
  date: string;
  weekday: string;
  label: string;
  weatherCode: number;
  mood: WeatherMood;
  high: number;
  low: number;
  precipChancePct: number;
};

export async function getCampusWeather(): Promise<CampusWeather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${HEC_LAT}&longitude=${HEC_LON}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=7`;

  try {
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data = await res.json();
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
    });
    const weekly: DailyCampusWeather[] = (data.daily.time ?? []).map(
      (date: string, index: number) => {
        const code = data.daily.weather_code[index] as number;
        return {
          date,
          weekday: weekday.format(new Date(`${date}T12:00:00-04:00`)),
          label: weatherLabel(code),
          weatherCode: code,
          mood: weatherMood(code),
          high: Math.round(data.daily.temperature_2m_max[index]),
          low: Math.round(data.daily.temperature_2m_min[index]),
          precipChancePct: data.daily.precipitation_probability_max[index] ?? 0,
        };
      }
    );

    const currentCode = data.current.weather_code as number;

    return {
      temperature: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      label: weatherLabel(currentCode),
      weatherCode: currentCode,
      mood: weatherMood(currentCode),
      windMph: Math.round(data.current.wind_speed_10m),
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      precipChancePct: data.daily.precipitation_probability_max[0] ?? 0,
      weekly,
    };
  } catch {
    return null;
  }
}
