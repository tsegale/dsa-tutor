import { ScaffoldingLevel } from '@dsa-tutor/types'
import { CONSECUTIVE_REQUIRED_TO_REDUCE, SUPPORT_DESCRIPTION } from '@/utils/masteryScore'

// The scaffolding levels in the learner's language (Phase 4C). The header
// chip, its popover and Home's progress strip all read these, so a level is
// named the same way everywhere.

export interface SupportLevel {
  /** Shown in the chip: "Full support", "Guided", "Minimal", "Independent". */
  label: string
  /** Filled segments of the four-segment meter: more support, more filled. */
  segments: 1 | 2 | 3 | 4
}

export const SUPPORT_LEVEL: Record<ScaffoldingLevel, SupportLevel> = {
  [ScaffoldingLevel.HIGH]: { label: 'Full support', segments: 4 },
  [ScaffoldingLevel.MEDIUM]: { label: 'Guided', segments: 3 },
  [ScaffoldingLevel.LOW]: { label: 'Minimal', segments: 2 },
  [ScaffoldingLevel.NONE]: { label: 'Independent', segments: 1 },
}

// The level's own name, in sentence case, for the scaffolding transition
// toast and badges: the enum values are uppercase identifiers and must never
// reach the screen as-is.
export const SCAFFOLDING_LEVEL_NAME: Record<ScaffoldingLevel, string> = {
  [ScaffoldingLevel.HIGH]: 'High',
  [ScaffoldingLevel.MEDIUM]: 'Medium',
  [ScaffoldingLevel.LOW]: 'Low',
  [ScaffoldingLevel.NONE]: 'None',
}

const NEXT_LEVEL_DOWN: Record<ScaffoldingLevel, ScaffoldingLevel | null> = {
  [ScaffoldingLevel.HIGH]: ScaffoldingLevel.MEDIUM,
  [ScaffoldingLevel.MEDIUM]: ScaffoldingLevel.LOW,
  [ScaffoldingLevel.LOW]: ScaffoldingLevel.NONE,
  [ScaffoldingLevel.NONE]: null,
}

/**
 * One line on what changes at the next level down, and what it takes to get
 * there: the same rules gateScaffoldingReduction applies (one level at a
 * time, after a run of correct answers; restoring support is immediate).
 */
export function nextLevelDownLine(level: ScaffoldingLevel): string {
  const next = NEXT_LEVEL_DOWN[level]
  if (!next) return 'This is the least support there is. A wrong answer brings support back straight away.'
  const description = SUPPORT_DESCRIPTION[next]
  const needed = CONSECUTIVE_REQUIRED_TO_REDUCE[level as keyof typeof CONSECUTIVE_REQUIRED_TO_REDUCE]
  return `At ${SUPPORT_LEVEL[next].label}: ${description.charAt(0).toLowerCase()}${description.slice(1)} Support steps down after ${needed} correct answers in a row.`
}
