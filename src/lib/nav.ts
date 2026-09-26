/**
 * Direction hint for the next route view transition (see index.css).
 * push = drill in, pop = back, tab = switch tabs, modal = present full-screen.
 */
export type NavKind = "push" | "pop" | "tab" | "modal"

let timer: ReturnType<typeof setTimeout> | undefined

export function setNav(kind: NavKind) {
  document.documentElement.dataset.nav = kind
  clearTimeout(timer)
  // Clear after the transition so unrelated updates don't animate.
  timer = setTimeout(() => delete document.documentElement.dataset.nav, 700)
}

// Hardware / browser back behaves like a pop.
window.addEventListener("popstate", () => setNav("pop"))
