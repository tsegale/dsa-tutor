import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ScaffoldingLevel } from '@dsa-tutor/types'

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
