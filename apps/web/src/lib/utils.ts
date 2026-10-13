import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { ScaffoldingLevel } from '@dsa-tutor/types'

// The type scale's size utilities (index.css @theme --text-* and the
// @utility text-mono*, text-10, text-11). Unregistered, tailwind-merge reads
// `text-micro` or `text-h3` as a text colour and drops it whenever a real
// colour such as `text-ink-2` follows, so the element silently falls back to
// the inherited size.
export const TYPE_SCALE = ['display', 'h1', 'h2', 'h3', 'body', 'small', 'micro', 'mono-lg', 'mono', 'mono-sm', '10', '11'] as const

const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: [...TYPE_SCALE] }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SCAFFOLDING_PERCENT: Record<ScaffoldingLevel, number> = {
  [ScaffoldingLevel.NONE]: 0,
  [ScaffoldingLevel.LOW]: 25,
  [ScaffoldingLevel.MEDIUM]: 60,
  [ScaffoldingLevel.HIGH]: 100,
}

/** How much ZPD scaffolding support is currently active, as a percentage. */
export function scaffoldingPercent(level: ScaffoldingLevel): number {
  return SCAFFOLDING_PERCENT[level]
}
