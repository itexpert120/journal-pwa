import Dexie, { type EntityTable } from "dexie"
import type { ISODate } from "./date"
import { uid } from "./id"

export const MOODS = [
  { value: 1, emoji: "😊", label: "Happy" },
  { value: 2, emoji: "😐", label: "Neutral" },
  { value: 3, emoji: "😔", label: "Low" },
  { value: 4, emoji: "😤", label: "Frustrated" },
  { value: 5, emoji: "😴", label: "Tired" },
] as const
export const ENERGY_LEVELS = [20, 40, 60, 80, 100] as const
export const ECG_STATUSES = ["Normal", "Arrhythmia", "Tachycardia", "Bradycardia", "AFib", "Other"] as const
export const WORKOUT_TYPES = ["Cardio", "Strength", "Yoga", "Swimming", "Custom"] as const
export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "snacks"] as const
export const CHECKUP_KINDS = ["Appointment", "Clinic visit", "Test result"] as const

export type MealSlot = (typeof MEAL_SLOTS)[number]
export type Paper = "lined" | "grid" | "plain"

export interface BPReading { id: string; time: string; sys?: number; dia?: number; pulse?: number }
export interface EcgLog { id: string; time: string; status: string; note?: string; fileIds: string[] }
export interface ExtraMed { id: string; name: string; dose?: string; time: string; taken: boolean }
export interface Checkup {
  id: string
  kind: string
  title: string
  time?: string
  note?: string
  followUp?: ISODate
  fileIds: string[]
}
export interface Workout { id: string; type: string; custom?: string; duration?: number; intensity?: number; calories?: number }
export interface Meal { note?: string; calories?: number; protein?: number; carbs?: number; fat?: number; photoId?: string }
export interface Todo { id: string; text: string; done: boolean }
export interface TimedEvent { id: string; time: string; title: string }
export interface Photo { id: string; fileId: string; caption?: string; location?: string; tags: string[] }

export interface Entry {
  date: ISODate
  mood?: number
  energy?: number
  weather?: { temp: number; code: number; manual?: boolean }
  bp: BPReading[]
  ecg: EcgLog[]
  /** Always stored in kg; converted for display. */
  weight?: number
  bodyFat?: number
  /** Scheduled regular meds: key `${medId}@${HH:mm}` → time actually taken. */
  medsTaken: Record<string, string>
  extraMeds: ExtraMed[]
  checkups: Checkup[]
  steps?: number
  /** Always stored in km. */
  distance?: number
  workouts: Workout[]
  meals: Partial<Record<MealSlot, Meal>>
  water: number
  routineDone: Record<string, boolean>
  tasks: Todo[]
  events: TimedEvent[]
  goals: Todo[]
  win?: string
  journal: { text: string; paper: Paper; drawingId?: string; voiceIds: string[] }
  photos: Photo[]
  updatedAt: number
}

export const emptyEntry = (date: ISODate): Entry => ({
  date,
  bp: [],
  ecg: [],
  medsTaken: {},
  extraMeds: [],
  checkups: [],
  workouts: [],
  meals: {},
  water: 0,
  routineDone: {},
  tasks: [],
  events: [],
  goals: [],
  journal: { text: "", paper: "lined", voiceIds: [] },
  photos: [],
  updatedAt: 0,
})

export interface StoredFile {
  id: string
  date?: ISODate
  blob: Blob
  name?: string
  type: string
  createdAt: number
}

export interface Occasion {
  id: string
  name: string
  kind: "Birthday" | "Anniversary"
  /** "MM-DD" so it repeats every year. */
  md: string
  year?: number
}

export interface KV { key: string; value: unknown }

class JournalDB extends Dexie {
  entries!: EntityTable<Entry, "date">
  files!: EntityTable<StoredFile, "id">
  occasions!: EntityTable<Occasion, "id">
  kv!: EntityTable<KV, "key">

  constructor() {
    super("journal")
    this.version(1).stores({
      entries: "date, updatedAt",
      files: "id, date",
      occasions: "id, md",
      kv: "key",
    })
  }
}

export const db = new JournalDB()

/** Read-modify-write a day atomically, creating it on first touch. */
export async function patchEntry(date: ISODate, mutate: (e: Entry) => void) {
  await db.transaction("rw", db.entries, async () => {
    const e = (await db.entries.get(date)) ?? emptyEntry(date)
    mutate(e)
    e.updatedAt = Date.now()
    await db.entries.put(e)
  })
}

export async function saveFile(blob: Blob, date?: ISODate, name?: string) {
  const id = uid()
  await db.files.add({ id, blob, date, name, type: blob.type, createdAt: Date.now() })
  return id
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined
}
export async function kvSet<T>(key: string, value: T) {
  await db.kv.put({ key, value })
}

/** A day "has content" if anything beyond the empty skeleton was recorded. */
export function entryHasContent(e: Entry) {
  return !!(
    e.mood || e.energy || e.bp.length || e.ecg.length || e.weight || Object.keys(e.medsTaken).length ||
    e.extraMeds.length || e.checkups.length || e.steps || e.workouts.length || Object.keys(e.meals).length ||
    e.water || e.tasks.length || e.events.length || e.goals.length || e.win || e.journal.text ||
    e.journal.drawingId || e.journal.voiceIds.length || e.photos.length
  )
}
