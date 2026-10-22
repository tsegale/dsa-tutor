import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'

/**
 * Which of four things the guidance box is showing. The heading used to be
 * the fixed string "Socratic guidance" over all of them, which was true of
 * one: the box also carries the engine's step narration, a worked example,
 * and the empty state. A student reading "Socratic guidance" above a
 * sentence describing what just happened has been told the wrong thing
 * about what they are reading, and a panel reading it will notice.
 */
export type GuidanceKind = 'empty' | 'worked' | 'question' | 'narration'

export interface Guidance {
  kind: GuidanceKind
  heading: string
  text: string
}

/** One heading per kind, so the label and the body cannot drift apart. */
export const GUIDANCE_HEADINGS: Record<GuidanceKind, string> = {
  empty: 'Getting started',
  worked: 'Worked example',
  question: 'Socratic guidance',
  narration: "What's happening",
}

export interface GuidanceInput {
  snapshot: AlgorithmSnapshot | null
  algorithmName: string
  isLiveJunction: boolean
  /** False while the current step's prediction is still pending. */
  predictionResolved: boolean
  /** The narration for a worked step, when this step is one. */
  workedNarration: string | null
}

/**
 * The single source for both halves of the guidance box.
 *
 * Precedence is unchanged from when the heading was fixed and the body was
 * computed here: a worked step's narration wins over the junction prompt,
 * because a worked step asks nothing. The prompt (getPromptForSnapshot)
 * rather than the snapshot's own description is what shows while a
 * prediction is pending - several engines' descriptions state the outcome
 * of the junction, which would hand the student the answer to the question
 * they are being asked.
 */
export function guidanceFor({
  snapshot,
  algorithmName,
  isLiveJunction,
  predictionResolved,
  workedNarration,
}: GuidanceInput): Guidance {
  const of = (kind: GuidanceKind, text: string): Guidance => ({ kind, heading: GUIDANCE_HEADINGS[kind], text })
  if (!snapshot) return of('empty', 'Load an algorithm to begin.')
  if (workedNarration) return of('worked', workedNarration)
  if (isLiveJunction && !predictionResolved) return of('question', getPromptForSnapshot(snapshot, algorithmName))
  return of('narration', snapshot.description)
}
