import type { AlgorithmSnapshot, AskTurn } from '@dsa-tutor/types'

/**
 * The two decisions behind a Demo-mode question, kept out of the component
 * so they can be tested: which earlier turns to send, and what to tell the
 * service about what is on screen.
 *
 * The web test suite runs in node with no DOM, so DemoAssistant itself is
 * not unit tested; these are the parts where a quiet mistake would matter
 * (a turn still in flight sent as context, or a payload that makes the
 * model answer about a step the student is not looking at).
 */

/** Oldest first. The AI service keeps its own window; this just stops the
 * client sending a whole session's transcript. */
export const MAX_SENT_TURNS = 4

export interface Exchange {
  question: string
  /** Null while the answer is in flight. */
  answer: string | null
  fallback?: boolean
  error?: string
}

/**
 * The turns worth sending as context: answered, not failed, most recent
 * last. An unanswered turn would send `null` as an answer, and a failed one
 * would teach the model that an error message is a reply it gave.
 */
export function sendableHistory(exchanges: readonly Exchange[]): AskTurn[] {
  return exchanges
    .filter((exchange): exchange is Exchange & { answer: string } => exchange.answer !== null && !exchange.error)
    .slice(-MAX_SENT_TURNS)
    .map((exchange) => ({ question: exchange.question, answer: exchange.answer }))
}

export interface AskState {
  dataStructureState: unknown
  activeIndices: number[]
  description: string
  criticalJunctionType: string | null
}

/**
 * What the service is told about the current step, or undefined when there
 * is no snapshot. Undefined matters: the ask prompt reads a missing state
 * as "you cannot see the canvas" and makes the model say so, rather than
 * inventing a step. Sending a half-filled object instead would let it
 * answer confidently about nothing.
 */
export function askStateFrom(snapshot: AlgorithmSnapshot | null | undefined): AskState | undefined {
  if (!snapshot) return undefined
  return {
    dataStructureState: snapshot.dataStructureState,
    activeIndices: snapshot.activeIndices,
    description: snapshot.description,
    criticalJunctionType: snapshot.criticalJunctionType,
  }
}
