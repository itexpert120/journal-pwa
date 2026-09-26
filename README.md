# Journal

A private, offline-first **life & health binder** PWA for phones and tablets (desktop is intentionally unsupported). The feature blueprint is in [`SPEC.md`](SPEC.md).

## Features

- **Perpetual timeline:** every day is keyed by its ISO date (`YYYY-MM-DD`) in IndexedDB, so there are no year limits. Navigate with the date picker, binder month tabs, or by swiping (page-turn animation built on Motion).
- **Daily page:** mood, energy and weather. Four tabs:
  - **Health:** BP with ESC categories, ECG with attachments, weight, a medication checklist, checkups.
  - **Fitness:** steps, water, workouts, meals with macros and photos.
  - **Day:** routine, tasks, micro-goals, win of the day, a 6 AM–10 PM schedule.
  - **Journal:** typed, handwritten (pressure and palm rejection) and voice entries, plus photos with captions, locations and tags.
- **Profile & emergency passport:** contact details, encrypted ID numbers, medical profile, doctors, insurance and emergency contacts. The **Medical ID** card opens from the lock screen without unlocking.
- **Search** across text, `#tags`, entry kinds and date ranges.
- **Security:** passcode lock with Face ID / fingerprint (WebAuthn). ID numbers are sealed with a non-extractable device key. Backups are end-to-end encrypted with a passphrase (AES-256-GCM, PBKDF2) and saved through the share sheet to Drive, iCloud or Files.
- **Reminders:** daily prompt, medication doses, birthdays and anniversaries.
- **PDF export:** a date range, a medical summary, or the profile, via the print view.

## Stack

Vite + React 19 (React Compiler), TypeScript, Tailwind v4, shadcn with **Base UI**, React Router (lazy routes), Dexie, Motion, and vite-plugin-pwa with a custom Workbox service worker.

The UI follows iOS 26 conventions:
- **Glass on the navigation layer only:** floating tab bar with a Search island, transparent nav bars with a scroll-edge blur, and glass bar buttons.
- **Content:** inset-grouped lists and sheets.
- **Colors:** light and dark follow the system.

## Develop

```sh
bun install
bun run dev          # desktop browser (the desktop gate is disabled in dev)
bun run dev:phone    # HTTPS on your LAN, so camera, mic, crypto and SW work on a real device
bun run build        # typecheck + production build + service worker
bun run preview
```

## Updates

The service worker precaches the app, so it works fully offline. It checks for a new version on launch, every 30 minutes, and whenever the app is foregrounded. A downloaded update is applied the next time the app goes to the background, or right away from the **Update** toast, so an update never reloads the app mid-entry.

## Platform limits (web)

- Apple Health and Health Connect can't be read by web apps, so steps, weight and similar values are entered manually.
- The web has no "fire at time X" alarm API. Reminders fire while the app is open or on next launch, plus background daily prompts on installed Android apps (Periodic Background Sync).
- On iPhone, notifications and durable storage require **Add to Home Screen**.
