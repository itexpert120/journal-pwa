import { kvGet, kvSet } from "./db"

export interface Sealed { iv: string; ct: string }

const enc = new TextEncoder()
const dec = new TextDecoder()

export const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ""
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
export const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))

/**
 * A non-extractable AES-GCM key generated on this device and kept in IndexedDB.
 * Sensitive profile fields (national ID, tax, licence numbers) are sealed with it,
 * so they never sit in storage or backups as plaintext.
 */
async function deviceKey(): Promise<CryptoKey> {
  const existing = await kvGet<CryptoKey>("deviceKey")
  if (existing) return existing
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
  await kvSet("deviceKey", key)
  return key
}

async function sealWith(key: CryptoKey, data: Uint8Array): Promise<Sealed> {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data as BufferSource)
  return { iv: toB64(iv), ct: toB64(ct) }
}
async function openWith(key: CryptoKey, s: Sealed) {
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(s.iv) as BufferSource }, key, fromB64(s.ct) as BufferSource),
  )
}

export async function sealText(plain: string): Promise<Sealed | undefined> {
  if (!plain) return undefined
  return sealWith(await deviceKey(), enc.encode(plain))
}
export async function openText(s: Sealed | undefined): Promise<string> {
  if (!s) return ""
  try {
    return dec.decode(await openWith(await deviceKey(), s))
  } catch {
    return ""
  }
}

async function passphraseKey(pass: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 310_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/** End-to-end encrypt a backup payload with a passphrase only the user knows. */
export async function sealBackup(json: string, pass: string) {
  const salt = randomBytes(16)
  const sealed = await sealWith(await passphraseKey(pass, salt), enc.encode(json))
  return JSON.stringify({ v: 1, app: "journal", salt: toB64(salt), ...sealed })
}
export async function openBackup(text: string, pass: string) {
  const p = JSON.parse(text) as Sealed & { salt: string; app?: string }
  if (p.app !== "journal") throw new Error("Not a journal backup file")
  return dec.decode(await openWith(await passphraseKey(pass, fromB64(p.salt)), p))
}

export async function hashPin(pin: string, saltB64?: string) {
  const salt = saltB64 ? fromB64(saltB64) : randomBytes(16)
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 200_000, hash: "SHA-256" },
    base,
    256,
  )
  return { salt: toB64(salt), hash: toB64(bits) }
}
