import { useSyncExternalStore } from "react"
import { kvGet, kvSet } from "./db"
import { fromB64, hashPin, toB64 } from "./crypto"

export interface LockConfig {
  enabled: boolean
  pin?: { salt: string; hash: string }
  /** WebAuthn platform credential (Face ID / fingerprint) used as a quick unlock. */
  credentialId?: string
  autoLockMinutes: number
}

const DEFAULT: LockConfig = { enabled: false, autoLockMinutes: 1 }

export const getLockConfig = async () => ({ ...DEFAULT, ...(await kvGet<LockConfig>("lock")) })
export const setLockConfig = (c: LockConfig) => kvSet("lock", c)

// ---- in-memory locked state (never persisted: a fresh launch always re-checks config) ----
let locked = true
let known = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const lockStore = {
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  get: () => (known ? locked : null),
  set(v: boolean) {
    locked = v
    known = true
    emit()
  },
}
export const useLocked = () => useSyncExternalStore(lockStore.subscribe, lockStore.get)

export async function initLock() {
  const c = await getLockConfig()
  lockStore.set(c.enabled)
  let hiddenAt = 0
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") hiddenAt = Date.now()
    else if (hiddenAt) {
      const cfg = await getLockConfig()
      if (cfg.enabled && Date.now() - hiddenAt > cfg.autoLockMinutes * 60_000) lockStore.set(true)
    }
  })
}

export async function verifyPin(pin: string) {
  const c = await getLockConfig()
  if (!c.pin) return false
  const { hash } = await hashPin(pin, c.pin.salt)
  return hash === c.pin.hash
}

export const biometricsAvailable = async () =>
  !!window.PublicKeyCredential &&
  (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false))

/** Create a device-bound passkey; the OS prompts for Face ID / fingerprint. */
export async function enrollBiometric(): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Journal", id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "journal-owner", displayName: "Journal" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error("Cancelled")
  return toB64(cred.rawId)
}

export async function unlockWithBiometric(credentialId: string) {
  const res = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: "public-key", id: fromB64(credentialId) as BufferSource, transports: ["internal"] }],
      userVerification: "required",
      timeout: 60_000,
    },
  })
  return !!res
}
