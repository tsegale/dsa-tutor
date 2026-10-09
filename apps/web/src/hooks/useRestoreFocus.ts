import { useCallback, useRef } from 'react'

// Returns focus to whatever opened a Radix dialog or sheet when it closes.
//
// Radix only restores focus to a DialogTrigger. Every dialog in this app is
// opened from state, with no Trigger, so on close focus fell to <body> and a
// keyboard user was dropped at the top of the page. DialogContent and
// SheetContent use this hook, so every dialog gets it without its own code.
//
// The opener can be gone by the time the dialog closes (a card that
// unmounted, a list that re-rendered), so the restore is guarded: the opener
// if it can still take focus, else the landmark it sat in, else <main>, and
// otherwise focus is left alone rather than thrown at something arbitrary.

/** The minimal element surface the restore logic needs; real elements fit. */
export interface FocusCandidate {
  readonly isConnected: boolean
  getClientRects(): { length: number }
  closest(selector: string): unknown
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
  focus(options?: FocusOptions): void
  disabled?: boolean
}

export interface FocusOrigin {
  element: FocusCandidate | null
  container: FocusCandidate | null
}

/** Landmarks that outlive the controls inside them. */
export const FALLBACK_CONTAINER_SELECTOR = 'main, [role="main"], section, [role="region"], aside, nav, header, footer, form'

export function canTakeFocus(el: FocusCandidate | null): el is FocusCandidate {
  if (!el || !el.isConnected) return false
  if (el.disabled) return false
  if (el.closest('[inert]')) return false
  // No boxes means display:none somewhere up the tree.
  return el.getClientRects().length > 0
}

/**
 * Picks where focus goes: the opener, else its container, else main.
 * Containers are focused programmatically, so one without a tabindex gets
 * tabindex="-1" (focusable from code, still out of the Tab order).
 */
export function resolveRestoreTarget(origin: FocusOrigin, main: FocusCandidate | null): FocusCandidate | null {
  if (canTakeFocus(origin.element)) return origin.element
  for (const container of [origin.container, main]) {
    if (canTakeFocus(container)) {
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1')
      return container
    }
  }
  return null
}

// One document-level record of the last element focused outside a dialog,
// with its container captured at that moment (later the element may be gone).
let lastOrigin: FocusOrigin = { element: null, container: null }
let tracking = false

/** The element plus its landmark, or null if it is not a usable origin. */
function originOf(target: EventTarget | null): FocusOrigin | null {
  if (!(target instanceof HTMLElement) || target === document.body) return null
  if (target.closest('[role="dialog"], [role="alertdialog"]')) return null
  const container = target.parentElement?.closest(FALLBACK_CONTAINER_SELECTOR)
  return { element: target, container: container instanceof HTMLElement ? container : null }
}

function startTracking() {
  if (tracking || typeof document === 'undefined') return
  tracking = true
  document.addEventListener('focusin', (event) => {
    lastOrigin = originOf(event.target) ?? lastOrigin
  })
}

export function useRestoreFocus() {
  startTracking()
  const origin = useRef<FocusOrigin>({ element: null, container: null })

  // Radix fires this before it moves focus into the dialog, so the active
  // element is still the opener. If the opener unmounted in the same render
  // that opened the dialog, focus has already fallen to <body>; the focusin
  // record still holds it and the container it sat in.
  const onOpenAutoFocus = useCallback(() => {
    origin.current = originOf(document.activeElement) ?? lastOrigin
  }, [])

  const onCloseAutoFocus = useCallback((event: Event) => {
    event.preventDefault()
    const main = document.querySelector('main')
    const target = resolveRestoreTarget(origin.current, main instanceof HTMLElement ? main : null)
    target?.focus()
    origin.current = { element: null, container: null }
  }, [])

  return { onOpenAutoFocus, onCloseAutoFocus }
}
