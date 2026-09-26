import { db, type Entry, type KV, type Occasion } from "./db"
import { fromB64, openBackup, openText, sealBackup, sealText, toB64 } from "./crypto"
import type { Profile } from "./profile"

interface Payload {
  version: 1
  exportedAt: string
  entries: Entry[]
  occasions: Occasion[]
  kv: KV[]
  files: { id: string; date?: string; name?: string; type: string; createdAt: number; data: string }[]
  /** Plaintext IDs — safe here only because the whole payload is passphrase-encrypted. */
  ids: Record<string, string>
}

// Never exported: device-bound secrets and per-device state.
const LOCAL_ONLY = new Set(["deviceKey", "lock"])

export async function createBackup(passphrase: string): Promise<Blob> {
  const [entries, occasions, kvAll, files] = await Promise.all([
    db.entries.toArray(),
    db.occasions.toArray(),
    db.kv.toArray(),
    db.files.toArray(),
  ])
  const kv = kvAll.filter((k) => !LOCAL_ONLY.has(k.key) && !k.key.startsWith("notified:"))
  const profile = kv.find((k) => k.key === "profile")?.value as Profile | undefined
  const ids: Record<string, string> = {}
  for (const [k, sealed] of Object.entries(profile?.ids ?? {})) ids[k] = await openText(sealed)

  const payload: Payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    occasions,
    kv,
    ids,
    files: await Promise.all(
      files.map(async ({ blob, ...f }) => ({ ...f, data: toB64(new Uint8Array(await blob.arrayBuffer())) })),
    ),
  }
  return new Blob([await sealBackup(JSON.stringify(payload), passphrase)], { type: "application/json" })
}

export async function restoreBackup(file: Blob, passphrase: string) {
  const payload = JSON.parse(await openBackup(await file.text(), passphrase)) as Payload
  // Re-seal ID numbers with *this* device's key.
  const profileKv = payload.kv.find((k) => k.key === "profile")
  if (profileKv) {
    const p = profileKv.value as Profile
    p.ids = {}
    for (const [k, v] of Object.entries(payload.ids)) (p.ids as Record<string, unknown>)[k] = await sealText(v)
  }
  await db.transaction("rw", [db.entries, db.occasions, db.kv, db.files], async () => {
    await Promise.all([db.entries.clear(), db.occasions.clear(), db.files.clear()])
    await db.kv.where("key").noneOf([...LOCAL_ONLY]).delete()
    await db.entries.bulkPut(payload.entries)
    await db.occasions.bulkPut(payload.occasions)
    await db.kv.bulkPut(payload.kv)
    await db.files.bulkPut(payload.files.map(({ data, ...f }) => ({ ...f, blob: new Blob([fromB64(data) as BlobPart], { type: f.type }) })))
  })
  return payload.entries.length
}
