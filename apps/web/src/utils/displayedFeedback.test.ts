import { describe, expect, it } from 'vitest'
import { ScaffoldingLevel, type PredictionResponse } from '@dsa-tutor/types'
import { DISCONNECTED_FALLBACK_TEXT, disconnectedFeedback, resolveDisplayedFeedback } from './displayedFeedback'

const wrong: PredictionResponse = {
  correct: false,
  misconceptionCategory: null,
  aiMisconceptionCategory: null,
  consequenceExplanation: 'Skipping the swap leaves 7 before 3. The larger value stays left.',
  socraticHint: 'Which highlighted value is larger?',
  xpAwarded: 0,
  counterfactualTrace: 'The array stays [7, 3].',
  aiGenerated: true,
}

describe('resolveDisplayedFeedback', () => {
  it('logs exactly what each level displays', () => {
    const high = resolveDisplayedFeedback(ScaffoldingLevel.HIGH, wrong, [], null)
    expect(high.log).toMatchObject({
      feedbackText: wrong.consequenceExplanation,
      hintText: wrong.socraticHint,
      counterfactualText: wrong.counterfactualTrace,
      aiGenerated: true,
      aiFailureReason: null,
    })

    const medium = resolveDisplayedFeedback(ScaffoldingLevel.MEDIUM, wrong, [], null)
    expect(medium.log.hintText).toBeNull()
    expect(medium.log.counterfactualText).toBe(wrong.counterfactualTrace)

    // LOW shows one sentence, so one sentence is what gets logged.
    const low = resolveDisplayedFeedback(ScaffoldingLevel.LOW, wrong, [], null)
    expect(low.card?.analysis).toBe('Skipping the swap leaves 7 before 3.')
    expect(low.log.feedbackText).toBe('Skipping the swap leaves 7 before 3.')
    expect(low.log.counterfactualText).toBeNull()
  })

  it('leaves a fallen-back hint out beside an AI explanation, so the card is one voice', () => {
    const hintFellBack = { ...wrong, socraticHint: 'Canned hint.', aiGenerated: false }
    const high = resolveDisplayedFeedback(ScaffoldingLevel.HIGH, hintFellBack, ['socratic_hint'], 'socratic_hint.words')
    expect(high.card).toEqual({ analysis: wrong.consequenceExplanation, hint: null, counterfactual: wrong.counterfactualTrace })
    // Nothing canned was shown, so nothing is logged as a fallback.
    expect(high.log).toMatchObject({ hintText: null, aiGenerated: true, aiFailureReason: null })

    const cfFellBack = resolveDisplayedFeedback(ScaffoldingLevel.MEDIUM, wrong, ['counterfactual_trace'], 'counterfactual_trace.sentences')
    expect(cfFellBack.card?.counterfactual).toBeNull()
    expect(cfFellBack.log.counterfactualText).toBeNull()
  })

  it('shows the fallback set together when the explanation itself fell back', () => {
    const allFallback = { ...wrong, consequenceExplanation: 'Canned explanation.', socraticHint: 'Canned hint.', aiGenerated: false }
    const fields = ['consequence_explanation', 'socratic_hint', 'counterfactual_trace'] as const
    const high = resolveDisplayedFeedback(ScaffoldingLevel.HIGH, allFallback, fields, 'consequence_explanation.notation')
    expect(high.card?.hint).toBe('Canned hint.')
    expect(high.log).toMatchObject({ aiGenerated: false, aiFailureReason: 'consequence_explanation.notation' })
  })

  it('shows nothing and logs no text for a correct answer or NONE', () => {
    const correct = resolveDisplayedFeedback(ScaffoldingLevel.HIGH, { ...wrong, correct: true }, [], null)
    expect(correct.card).toBeUndefined()
    expect(correct.log).toMatchObject({ feedbackText: null, hintText: null, counterfactualText: null })

    const none = resolveDisplayedFeedback(ScaffoldingLevel.NONE, wrong, [], null)
    expect(none.card).toBeUndefined()
    expect(none.log.feedbackText).toBeNull()
  })
})

describe('disconnectedFeedback', () => {
  it('discards the partial and logs a distinct fallback reason', () => {
    const dropped = disconnectedFeedback(ScaffoldingLevel.HIGH, false)
    expect(dropped.card).toEqual({ analysis: DISCONNECTED_FALLBACK_TEXT, hint: null, counterfactual: null })
    expect(dropped.log).toEqual({
      feedbackText: DISCONNECTED_FALLBACK_TEXT,
      hintText: null,
      counterfactualText: null,
      aiGenerated: false,
      aiFailureReason: 'stream_disconnected',
    })
  })

  it('shows nothing for a correct answer but still logs the disconnect', () => {
    const dropped = disconnectedFeedback(ScaffoldingLevel.MEDIUM, true)
    expect(dropped.card).toBeUndefined()
    expect(dropped.log.aiFailureReason).toBe('stream_disconnected')
  })
})

describe('disconnectedFeedback reasons', () => {
  it('records a stream that hit the client ceiling separately from a dropped one', () => {
    expect(disconnectedFeedback(ScaffoldingLevel.HIGH, false, 'stream_timeout').log.aiFailureReason).toBe('stream_timeout')
  })
})
