import { useLiveQuery } from "dexie-react-hooks"
import { db, kvGet, kvSet } from "./db"
import type { Sealed } from "./crypto"
import type { ISODate } from "./date"

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const

export interface Doctor { id: string; role: string; name: string; clinic?: string; phone?: string }
export interface Medication { id: string; name: string; dose?: string; times: string[] }
export interface EmergencyContact { name?: string; relationship?: string; mobile?: string; alternate?: string }

export interface Profile {
  photoId?: string
  signatureId?: string
  legalName?: string
  preferredName?: string
  phone?: string
  email?: string
  address?: string
  permanentAddress?: string
  /** Sealed with the device key — see lib/crypto. */
  ids: { national?: Sealed; tax?: Sealed; license?: Sealed }
  bloodGroup?: string
  dob?: ISODate
  /** cm */
  height?: number
  /** kg */
  baselineWeight?: number
  primaryDoctor: Partial<Omit<Doctor, "id" | "role">>
  specialists: Doctor[]
  allergies: string[]
  conditions: string[]
  medications: Medication[]
  insurance: { provider?: string; policy?: string; helpline?: string }
  emergency: { primary: EmergencyContact; secondary: EmergencyContact }
}

export const emptyProfile = (): Profile => ({
  ids: {},
  primaryDoctor: {},
  specialists: [],
  allergies: [],
  conditions: [],
  medications: [],
  insurance: {},
  emergency: { primary: {}, secondary: {} },
})

export interface Settings {
  units: { weight: "kg" | "lb"; distance: "km" | "mi"; height: "cm" | "ft"; water: "glass" | "l" }
  routine: { id: string; text: string }[]
  waterGoal: number
  reminders: { journal?: string; meds: boolean; occasions: boolean }
  onboarded: boolean
}

export const defaultSettings = (): Settings => ({
  units: { weight: "kg", distance: "km", height: "cm", water: "glass" },
  routine: [
    { id: "r-morning", text: "Morning routine" },
    { id: "r-work", text: "Work shift" },
    { id: "r-reading", text: "Reading" },
  ],
  waterGoal: 8,
  reminders: { journal: "21:00", meds: true, occasions: true },
  onboarded: false,
})

export async function getProfile() {
  return { ...emptyProfile(), ...(await kvGet<Profile>("profile")) }
}
export async function updateProfile(mutate: (p: Profile) => void) {
  await db.transaction("rw", db.kv, async () => {
    const p = await getProfile()
    mutate(p)
    await kvSet("profile", p)
  })
}
export function useProfile() {
  return useLiveQuery(getProfile, [], undefined)
}

export async function getSettings() {
  const s = await kvGet<Settings>("settings")
  const d = defaultSettings()
  return s ? { ...d, ...s, units: { ...d.units, ...s.units }, reminders: { ...d.reminders, ...s.reminders } } : d
}
export async function updateSettings(mutate: (s: Settings) => void) {
  await db.transaction("rw", db.kv, async () => {
    const s = await getSettings()
    mutate(s)
    await kvSet("settings", s)
  })
}
export function useSettings() {
  return useLiveQuery(getSettings, [], undefined)
}
