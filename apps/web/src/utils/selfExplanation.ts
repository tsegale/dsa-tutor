import { ScaffoldingLevel, type AlgorithmSnapshot, type SelfExplanationResponse } from '@dsa-tutor/types'
import { SELF_EXPLANATION_MAX_PER_SESSION } from '@/config/pacing'
import { selfExplanationPromptFor, type SelfExplanationPrompt } from '@/config/selfExplanationPrompts'

/**
 * Whether to offer a self-explanation after this answer (Week 2 2B), and
 * which prompt. Only after a conceptual junction answered correctly on the
 * first attempt: a correct answer after wrong ones belongs to remediation,
 * which owns the moments after an error. Capped per session, skips included.
 */
export function offerableSelfExplanation(args: {
  topicSlug: string | undefined
  snapshot: AlgorithmSnapshot
  correct: boolean
  firstAttempt: boolean
  offeredThisSession: number
}): SelfExplanationPrompt | null {
  if (!args.correct || !args.firstAttempt) return null
  if (args.offeredThisSession >= SELF_EXPLANATION_MAX_PER_SESSION) return null
  return selfExplanationPromptFor(args.topicSlug, args.snapshot)
}

/** Shown in place of the AI's acknowledgement at NONE (no elaborated feedback). */
export const NONE_ACKNOWLEDGEMENT = 'Thanks - noted.'

/** Shown when the evaluation could not be reached at all. */
export const UNREACHABLE_ACKNOWLEDGEMENT = 'Thanks - keep that reasoning in mind as the run continues.'

export interface SelfExplanationDisplay {
  acknowledgement: string
  followUpQuestion: string | null
}

/**
 * What the learner sees after answering. At NONE the model's words are
 * never shown (no elaborated feedback); everywhere else the acknowledgement
 * and at most one follow-up question are. Never a score.
 */
export function selfExplanationDisplay(
  level: ScaffoldingLevel,
  evaluation: SelfExplanationResponse | null,
): SelfExplanationDisplay {
  if (!evaluation) return { acknowledgement: UNREACHABLE_ACKNOWLEDGEMENT, followUpQuestion: null }
  if (level === ScaffoldingLevel.NONE) return { acknowledgement: NONE_ACKNOWLEDGEMENT, followUpQuestion: null }
  return { acknowledgement: evaluation.acknowledgement, followUpQuestion: evaluation.followUpQuestion }
}

/**
 * The SELF_EXPLANATION interaction row. It is displayed feedback, so the
 * Week 1 provenance rules apply: feedbackText/hintText are what was shown,
 * aiGenerated says whether the model wrote it, and aiFailureReason says why
 * not when it fell back. A skip is logged too, with a null response.
 */
export function selfExplanationInteraction(args: {
  sessionId: string
  stepIndex: number
  snapshot: AlgorithmSnapshot
  prompt: SelfExplanationPrompt
  level: ScaffoldingLevel
  response: string | null
  evaluation: SelfExplanationResponse | null
  display: SelfExplanationDisplay | null
  timeSpentSeconds: number
}) {
  const { evaluation, display } = args
  const modelWordsShown = !!evaluation?.aiGenerated && args.level !== ScaffoldingLevel.NONE && !!display
  return {
    sessionId: args.sessionId,
    stepIndex: args.stepIndex,
    predictionSubmitted: args.response,
    predictionCorrect: null,
    misconceptionCategory: null,
    hintsRequested: 0,
    timeSpentSeconds: args.timeSpentSeconds,
    criticalJunctionType: args.snapshot.criticalJunctionType,
    junctionDifficulty: args.snapshot.junctionDifficulty,
    scaffoldingLevelAtTime: args.level,
    interactionType: 'SELF_EXPLANATION',
    aiGenerated: modelWordsShown,
    feedbackText: display?.acknowledgement ?? null,
    hintText: display?.followUpQuestion ?? null,
    aiFailureReason: args.response === null ? null : evaluation ? evaluation.failureReason : 'error',
    promptVersion: evaluation?.promptVersion ?? null,
    aiModel: evaluation?.aiModel ?? null,
    promptKey: args.prompt.key,
    rubricResults: evaluation?.results ?? null,
    rubricScore: evaluation?.score ?? null,
  }
}
