/** WMO weather code → emoji + label (Open-Meteo convention). */
export function weatherInfo(code: number) {
  if (code === 0) return { icon: "☀️", label: "Clear" }
  if (code <= 2) return { icon: "🌤️", label: "Partly cloudy" }
  if (code === 3) return { icon: "☁️", label: "Overcast" }
  if (code <= 48) return { icon: "🌫️", label: "Fog" }
  if (code <= 57) return { icon: "🌦️", label: "Drizzle" }
  if (code <= 67) return { icon: "🌧️", label: "Rain" }
  if (code <= 77) return { icon: "🌨️", label: "Snow" }
  if (code <= 82) return { icon: "🌧️", label: "Showers" }
  if (code <= 86) return { icon: "🌨️", label: "Snow showers" }
  return { icon: "⛈️", label: "Thunderstorm" }
}

export const WEATHER_PRESETS = [0, 2, 3, 45, 61, 80, 71, 95] as const

function position(): Promise<GeolocationPosition> {
  return new Promise((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej, { maximumAge: 30 * 60_000, timeout: 10_000 }),
  )
}

/** Current conditions from Open-Meteo (no API key). Only called for today's page. */
export async function fetchWeather(): Promise<{ temp: number; code: number }> {
  const { coords } = await position()
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude.toFixed(2)}&longitude=${coords.longitude.toFixed(2)}&current=temperature_2m,weather_code`
  const r = await fetch(url)
  if (!r.ok) throw new Error("Weather unavailable")
  const j = await r.json()
  return { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code }
}
