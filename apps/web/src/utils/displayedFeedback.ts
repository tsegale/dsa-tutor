import { ScaffoldingLevel, type PredictionResponse } from '@dsa-tutor/types'
import { firstSentence } from '@/utils/predictionJunction'

export type FeedbackField = 'consequence_explanation' | 'socratic_hint' | 'counterfactual_trace'

/** Shown when the stream drops mid-response: the partial is discarded, not
 * kept, and this neutral nudge takes its place (logged as a fallback with
 * reason "stream_disconnected"). */
export const DISCONNECTED_FALLBACK_TEXT =
  'The explanation could not be loaded. Look again at the highlighted elements and what this step of the algorithm does with them.'

export interface DisplayedFeedback {
  /** What the feedback card shows; undefined means leave the card as it is
   * (a correct answer, or NONE, which never shows AI text). */
  card?: { analysis: string | null; hint: string | null; counterfactual: string | null }
  /** The interaction log fields: what was displayed, not what the model wrote. */
  log: {
    feedbackText: string | null
    hintText: string | null
    counterfactualText: string | null
    aiGenerated: boolean
    aiFailureReason: string | null
  }
}

/**
 * The single place that decides what a student sees for a prediction and
 * what the research log records about it, so the two can never disagree.
 * Display per level is unchanged from before: LOW shows one sentence of the
 * explanation, MEDIUM adds the counterfactual, HIGH adds the hint too, NONE
 * shows no AI text, and a correct answer shows only the verdict.
 *
 * One voice per card: when the explanation is the model's own, a hint or
 * counterfactual that fell back is left out rather than shown as generic
 * canned text beside specific AI text (it read as two different voices in
 * the browser check). When the explanation itself fell back, the fallback
 * set is shown together.
 *
 * aiGenerated is false when any displayed field came from the rule-based
 * fallback; aiFailureReason records why, and is null when everything shown
 * was AI-generated (a fallback on a field nobody saw is not counted).
 */
export function resolveDisplayedFeedback(
  level: ScaffoldingLevel,
  response: PredictionResponse,
  fallbackFields: readonly FeedbackField[],
  failureReason: string | null,
): DisplayedFeedback {
  const shown: FeedbackField[] = []
  let card: DisplayedFeedback['card']

  if (!response.correct && level !== ScaffoldingLevel.NONE) {
    const explanation = response.consequenceExplanation
    const aiExplanation = !fallbackFields.includes('consequence_explanation')
    const keep = (field: FeedbackField, text: string | null) =>
      aiExplanation && fallbackFields.includes(field) ? null : text
    const counterfactual = keep('counterfactual_trace', response.counterfactualTrace || null)
    if (level === ScaffoldingLevel.LOW) {
      card = { analysis: firstSentence(explanation), hint: null, counterfactual: null }
    } else if (level === ScaffoldingLevel.HIGH) {
      card = { analysis: explanation, hint: keep('socratic_hint', response.socraticHint), counterfactual }
    } else {
      card = { analysis: explanation, hint: null, counterfactual }
    }
    if (card.analysis) shown.push('consequence_explanation')
    if (card.hint) shown.push('socratic_hint')
    if (card.counterfactual) shown.push('counterfactual_trace')
  }

  const shownFallback = shown.some((field) => fallbackFields.includes(field))
  return {
    card,
    log: {
      feedbackText: shown.includes('consequence_explanation') ? (card?.analysis ?? null) : null,
      hintText: shown.includes('socratic_hint') ? (card?.hint ?? null) : null,
      counterfactualText: shown.includes('counterfactual_trace') ? (card?.counterfactual ?? null) : null,
      aiGenerated: shown.length > 0 ? !shownFallback : response.aiGenerated,
      aiFailureReason: shownFallback ? (failureReason ?? 'fallback') : null,
    },
  }
}

/**
 * The stream dropped, or hit the client ceiling, before its final event.
 * Whatever partial text had appeared is discarded; wrong answers at a level
 * that shows feedback get DISCONNECTED_FALLBACK_TEXT instead.
 */
export function disconnectedFeedback(
  level: ScaffoldingLevel,
  correct: boolean,
  reason: 'stream_disconnected' | 'stream_timeout' = 'stream_disconnected',
): DisplayedFeedback {
  const showsText = !correct && level !== ScaffoldingLevel.NONE
  return {
    card: showsText ? { analysis: DISCONNECTED_FALLBACK_TEXT, hint: null, counterfactual: null } : undefined,
    log: {
      feedbackText: showsText ? DISCONNECTED_FALLBACK_TEXT : null,
      hintText: null,
      counterfactualText: null,
      aiGenerated: false,
      aiFailureReason: reason,
    },
  }
}
