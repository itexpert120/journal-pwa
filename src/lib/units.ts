const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp

export const kgTo = (kg: number, u: "kg" | "lb") => (u === "kg" ? round(kg) : round(kg * 2.20462))
export const toKg = (v: number, u: "kg" | "lb") => (u === "kg" ? v : v / 2.20462)

export const kmTo = (km: number, u: "km" | "mi") => (u === "km" ? round(km, 2) : round(km * 0.621371, 2))
export const toKm = (v: number, u: "km" | "mi") => (u === "km" ? v : v / 0.621371)

export function cmLabel(cm: number, u: "cm" | "ft") {
  if (u === "cm") return `${round(cm, 0)} cm`
  const inches = cm / 2.54
  return `${Math.floor(inches / 12)}′ ${Math.round(inches % 12)}″`
}

/** One glass ≈ 250 ml. */
export const waterLabel = (glasses: number, u: "glass" | "l") =>
  u === "glass" ? `${glasses} ${glasses === 1 ? "glass" : "glasses"}` : `${round(glasses * 0.25, 2)} L`
