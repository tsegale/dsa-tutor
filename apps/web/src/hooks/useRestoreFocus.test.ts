import { describe, expect, it } from 'vitest'
import { canTakeFocus, resolveRestoreTarget, type FocusCandidate } from './useRestoreFocus'

// Stand-in elements: the restore logic only reads these few members, and the
// test environment is node (no DOM), so each case states its element's
// condition directly.
function el(overrides: Partial<{ connected: boolean; visible: boolean; disabled: boolean; inert: boolean; tabindex: string | null }> = {}) {
  const { connected = true, visible = true, disabled = false, inert = false } = overrides
  const attrs = new Map<string, string>()
  if (overrides.tabindex != null) attrs.set('tabindex', overrides.tabindex)
  const candidate: FocusCandidate & { attrs: Map<string, string> } = {
    attrs,
    isConnected: connected,
    disabled,
    getClientRects: () => ({ length: visible ? 1 : 0 }),
    closest: (selector: string) => (selector === '[inert]' && inert ? {} : null),
    hasAttribute: (name: string) => attrs.has(name),
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    focus: () => {},
  }
  return candidate
}

describe('canTakeFocus', () => {
  it('accepts a connected, visible, enabled element', () => {
    expect(canTakeFocus(el())).toBe(true)
  })

  it.each([
    ['missing', null],
    ['unmounted', el({ connected: false })],
    ['hidden (display:none)', el({ visible: false })],
    ['disabled', el({ disabled: true })],
    ['inside an inert subtree', el({ inert: true })],
  ])('rejects an element that is %s', (_, candidate) => {
    expect(canTakeFocus(candidate)).toBe(false)
  })
})

describe('resolveRestoreTarget', () => {
  it('returns focus to the opener when it can still take it', () => {
    const opener = el()
    expect(resolveRestoreTarget({ element: opener, container: el() }, el())).toBe(opener)
  })

  it('falls back to the opener container when the opener unmounted', () => {
    const container = el()
    expect(resolveRestoreTarget({ element: el({ connected: false }), container }, el())).toBe(container)
  })

  it('falls back to the container when the opener is now disabled', () => {
    const container = el()
    expect(resolveRestoreTarget({ element: el({ disabled: true }), container }, el())).toBe(container)
  })

  it('falls back to main when the opener and its container both unmounted', () => {
    const main = el()
    expect(resolveRestoreTarget({ element: el({ connected: false }), container: el({ connected: false }) }, main)).toBe(main)
  })

  it('falls back to main when nothing was captured', () => {
    const main = el()
    expect(resolveRestoreTarget({ element: null, container: null }, main)).toBe(main)
  })

  it('returns null rather than an unfocusable element when every option is gone', () => {
    expect(resolveRestoreTarget({ element: el({ connected: false }), container: null }, null)).toBeNull()
    expect(resolveRestoreTarget({ element: null, container: null }, el({ visible: false }))).toBeNull()
  })

  it('makes a fallback container focusable from code, outside the Tab order', () => {
    const container = el()
    resolveRestoreTarget({ element: el({ connected: false }), container }, null)
    expect(container.attrs.get('tabindex')).toBe('-1')
  })

  it('leaves an existing tabindex on a fallback container alone', () => {
    const container = el({ tabindex: '0' })
    resolveRestoreTarget({ element: el({ connected: false }), container }, null)
    expect(container.attrs.get('tabindex')).toBe('0')
  })

  it('does not touch the opener tabindex when restoring to it', () => {
    const opener = el()
    resolveRestoreTarget({ element: opener, container: null }, null)
    expect(opener.attrs.has('tabindex')).toBe(false)
  })
})
