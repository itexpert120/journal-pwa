/**
 * Software keyboard handling for page (non-sheet) fields.
 *
 * - `html[data-keyboard]` is set while a text field has focus, so the floating
 *   tab bar can get out of the way.
 * - `--kb` is how much of the layout viewport the keyboard covers (iOS overlays
 *   it; Android with `interactive-widget=resizes-content` shrinks the layout, so
 *   it stays ~0 there). Screens add it to their bottom padding so the last
 *   fields can still scroll up above the keyboard.
 * - The focused field is scrolled into the visible area once the keyboard has
 *   settled. Fields in bottom sheets are left to Drawer.VirtualKeyboardProvider.
 */

const NON_TEXT = new Set(["button", "checkbox", "radio", "range", "color", "file", "submit", "reset", "image", "hidden"])

function isTextField(el: EventTarget | null): el is HTMLElement {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly
  if (el instanceof HTMLInputElement) return !el.readOnly && !NON_TEXT.has(el.type)
  return el instanceof HTMLElement && el.isContentEditable
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === "auto" || overflowY === "scroll") && p.scrollHeight > p.clientHeight) return p
  }
  return null
}

export function initKeyboard() {
  const vv = window.visualViewport
  const root = document.documentElement
  let field: HTMLElement | null = null
  let timer = 0

  const updateInset = () => {
    const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0
    root.style.setProperty("--kb", `${Math.round(kb)}px`)
  }

  const reveal = () => {
    if (!field || !vv || field.closest("[data-slot=drawer-popup]")) return
    const r = field.getBoundingClientRect()
    // Visible band in layout coordinates: below the ~54px nav bar, above the keyboard.
    const top = vv.offsetTop + 64
    const bottom = vv.offsetTop + vv.height - 16
    // A field taller than the band (a long textarea) can't fit; let the caret rule.
    if (r.height > bottom - top) return
    const delta = r.bottom > bottom ? r.bottom - bottom : r.top < top ? r.top - top : 0
    if (Math.abs(delta) < 1) return
    scrollParent(field)?.scrollBy({ top: delta, behavior: "smooth" })
  }

  const settle = () => {
    updateInset()
    clearTimeout(timer)
    // Keyboard animation is ~250ms; re-check after it finishes.
    timer = window.setTimeout(reveal, 280)
  }

  document.addEventListener("focusin", (e) => {
    if (!isTextField(e.target)) return
    field = e.target
    root.dataset.keyboard = ""
    settle()
  })
  document.addEventListener("focusout", () => {
    field = null
    // Focus may be hopping to the next field; only drop the flag if nothing took it.
    requestAnimationFrame(() => {
      if (!isTextField(document.activeElement)) delete root.dataset.keyboard
    })
  })
  vv?.addEventListener("resize", settle)
  vv?.addEventListener("scroll", updateInset)
  updateInset()
}
