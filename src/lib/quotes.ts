import type { ISODate } from "./date"

const QUOTES = [
  "Small steps every day add up to big changes.",
  "Take care of your body. It's the only place you have to live.",
  "Today is a good day to have a good day.",
  "Progress, not perfection.",
  "You are allowed to rest. You are not allowed to give up on yourself.",
  "What you do today can improve all your tomorrows.",
  "Breathe in calm, breathe out tension.",
  "Health is a relationship between you and your body.",
  "One day at a time — this one is yours.",
  "The secret of getting ahead is getting started.",
  "Be gentle with yourself; you're doing the best you can.",
  "Gratitude turns what we have into enough.",
  "A calm mind brings inner strength and self-confidence.",
  "Write it down. Memories fade, pages remain.",
  "Consistency beats intensity.",
  "Your future self is watching — make them proud.",
  "Every sunrise is an invitation to begin again.",
  "Drink water, move your body, rest your mind.",
  "Joy is found in the small, ordinary moments.",
  "You don't have to see the whole staircase, just take the first step.",
  "Kindness to yourself is where healing starts.",
  "Discipline is choosing what you want most over what you want now.",
  "The best time to start was yesterday. The next best time is now.",
  "Notice one beautiful thing today.",
  "Your story is worth recording.",
  "Strength grows in the moments you think you can't go on but keep going anyway.",
  "Rest is productive too.",
  "Celebrate every small win.",
  "Let today be the day you are proud of.",
  "Peace begins with a single deep breath.",
  "Keep your face to the sunshine.",
]

/** Stable per date so revisiting a page shows the same prompt. */
export function quoteFor(date: ISODate) {
  let h = 0
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return QUOTES[h % QUOTES.length]
}
