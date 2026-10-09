import { useCallback, useSyncExternalStore } from 'react'

// Canvas colours are CSS tokens from index.css (var(--state-compare), or a
// tint written as color-mix(in srgb, var(--state-current) 60%, transparent)),
// so static strokes and text follow the theme on their own. Framer's
// `animate={{ fill }}` cannot interpolate toward a var() or color-mix(), and
// would not re-run when the theme flips, so animated fills go through this
// resolver: it returns the literal colour for the current theme and changes
// identity when the .dark class does, which re-runs the animation.

const VAR = /^var\(--([\w-]+)\)$/
const MIX = /^color-mix\(in srgb, var\(--([\w-]+)\) (\d+(?:\.\d+)?)%, (?:transparent|var\(--([\w-]+)\))\)$/

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

const isDark = () => document.documentElement.classList.contains('dark')

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** Resolves a canvas colour token to a literal; unknown input passes through. */
export function resolveColour(value: string, styles: Pick<CSSStyleDeclaration, 'getPropertyValue'>): string {
  const read = (name: string) => styles.getPropertyValue(`--${name}`).trim()

  const plain = VAR.exec(value)
  if (plain) return read(plain[1]) || value

  const mix = MIX.exec(value)
  if (!mix) return value
  const colour = parseHex(read(mix[1]))
  if (!colour) return value
  const weight = Number(mix[2]) / 100
  if (!mix[3]) return `rgba(${colour.join(', ')}, ${weight})`
  const base = parseHex(read(mix[3]))
  if (!base) return value
  return toHex([0, 1, 2].map((i) => colour[i] * weight + base[i] * (1 - weight)) as [number, number, number])
}

export function useResolveColour(): (value: string) => string {
  const dark = useSyncExternalStore(subscribe, isDark, () => false)
  // `dark` is the dependency that matters: the computed token values change
  // with it, so the callback must too.
  return useCallback(
    (value: string) => resolveColour(value, getComputedStyle(document.documentElement)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dark],
  )
}
