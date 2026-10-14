import data from '../../../ai/data/complexity.json'

/**
 * Per-topic complexity facts (Phase 8B). One source: apps/ai/data/
 * complexity.json backs the Complexity tab, the Feynman challenge prompt
 * built here, and the AI service's time and space rubric criteria
 * (apps/ai/prompts/complexity.py). It lives with the AI service because
 * that image is built from apps/ai alone; the web build sees the whole repo.
 */
export interface ComplexityFacts {
  best: string
  bestNote: string
  average: string
  averageNote: string
  worst: string
  worstNote: string
  space: string
  spaceNote: string
  stable: boolean
  /** What input produces the worst case, and why the average differs. */
  worstCaseTrigger?: string
  /** Auxiliary space, including recursion stack frames where they apply. */
  auxiliarySpace?: string
  /** The natural algorithm to contrast with, and on what. */
  contrast?: { algorithm: string; point: string }
  /** The specific claims a Feynman explanation must defend, as clauses. */
  defend?: { time: string; remedy?: string; alternative?: string; space?: string }
}

export const COMPLEXITY: Readonly<Record<string, ComplexityFacts>> = data

/** "a", "a, and b", "a, b, and c": the clause list the challenge reads as. */
function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`
}

/**
 * The Feynman challenge for a topic: the specific complexity claims to
 * defend, from its facts, or null when the topic has none yet. Quick Sort:
 * "Explain why Quick Sort degrades to O(n²), how a randomised or
 * median-of-three pivot prevents it, and what space the recursion costs."
 */
export function feynmanChallenge(topicSlug: string | undefined): string | null {
  const defend = topicSlug ? COMPLEXITY[topicSlug]?.defend : undefined
  if (!defend) return null
  const clauses = [defend.time, defend.remedy, defend.alternative, defend.space].filter((clause): clause is string => Boolean(clause))
  return `Explain ${joinClauses(clauses)}.`
}

/**
 * The three complexity criteria every Feynman rubric ends with, by label.
 * Mirrors TIME_LABEL, SPACE_LABEL and CLARITY_LABEL in apps/ai/prompts/
 * complexity.py (its tests check they match).
 */
export const COMPLEXITY_CRITERIA_LABELS: readonly string[] = [
  'Time complexity and what drives it',
  'Space used, and a comparison',
  'Explained so a junior developer would follow',
]

/** The stored 0-100 Feynman score as the "n of 10" the learner sees. */
export const scoreOutOfTen = (score: number) => Math.round(score / 10)
