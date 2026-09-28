import { describe, expect, it } from 'vitest'
import {
  CriticalJunctionType,
  JunctionDifficulty,
  ScaffoldingLevel,
  type AlgorithmSnapshot,
  type SelfExplanationResponse,
} from '@dsa-tutor/types'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { binarySearchEngine } from '@/engine/binarySearch'
import { bstDeleteEngine, bstInsertEngine } from '@/engine/bst'
import { ALL_SELF_EXPLANATION_PROMPTS, selfExplanationPromptFor } from '@/config/selfExplanationPrompts'
import { SELF_EXPLANATION_MAX_PER_SESSION } from '@/config/pacing'
import {
  NONE_ACKNOWLEDGEMENT,
  UNREACHABLE_ACKNOWLEDGEMENT,
  offerableSelfExplanation,
  selfExplanationDisplay,
  selfExplanationInteraction,
} from './selfExplanation'

const conceptual = (snapshots: AlgorithmSnapshot[]) =>
  snapshots.filter((s) => s.isPredictionRequired && s.junctionDifficulty === JunctionDifficulty.CONCEPTUAL)

// Runs that between them reach every conceptual junction type each study topic can produce.
const bubbleRuns = [bubbleSortEngine([5, 3, 1, 4, 2]), bubbleSortEngine([1, 2, 3, 4, 5])]
const binaryRuns = [binarySearchEngine([1, 3, 5, 7, 9, 11], 7), binarySearchEngine([1, 3, 5, 7, 9, 11], 4)]
const tree = (values: number[]) => {
  const run = bstInsertEngine(values)
  const last = run[run.length - 1].dataStructureState as { root: never }
  return last.root
}

describe('authored prompts', () => {
  it('covers every conceptual junction bubble sort and binary search produce', () => {
    for (const snapshot of bubbleRuns.flatMap(conceptual)) {
      expect(selfExplanationPromptFor('bubble-sort', snapshot), snapshot.criticalJunctionType ?? '').not.toBeNull()
    }
    for (const snapshot of binaryRuns.flatMap(conceptual)) {
      expect(selfExplanationPromptFor('binary-search', snapshot)).not.toBeNull()
    }
    // Both bubble sort pass-end junctions are reached across the two runs.
    const bubbleTypes = new Set(bubbleRuns.flatMap(conceptual).map((s) => s.criticalJunctionType))
    expect(bubbleTypes).toEqual(
      new Set([CriticalJunctionType.PASS_COMPLETE, CriticalJunctionType.EARLY_TERMINATION, CriticalJunctionType.ALGORITHM_COMPLETE]),
    )
  })

  it('tells the two BST delete cases apart', () => {
    const twoChildren = conceptual(bstDeleteEngine(tree([50, 30, 70, 60, 80]), 70))
    const leaf = conceptual(bstDeleteEngine(tree([50, 30, 70]), 30))
    expect(selfExplanationPromptFor('bst', twoChildren[0])?.key).toBe('bst.delete-two-children')
    expect(selfExplanationPromptFor('bst', leaf[0])?.key).toBe('bst.delete-simple')
  })

  it('has 2-3 criteria, a unique key, and no em or en dashes in every prompt', () => {
    const keys = ALL_SELF_EXPLANATION_PROMPTS.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const prompt of ALL_SELF_EXPLANATION_PROMPTS) {
      expect(prompt.rubric.length).toBeGreaterThanOrEqual(2)
      expect(prompt.rubric.length).toBeLessThanOrEqual(3)
      const text = [prompt.question, ...prompt.rubric.map((r) => r.criterion)].join(' ')
      expect(text).not.toMatch(/[–—]/)
    }
  })

  it('offers nothing on a procedural junction or a non-study topic', () => {
    const procedural = bubbleRuns[0].find((s) => s.junctionDifficulty === JunctionDifficulty.PROCEDURAL)!
    const passComplete = conceptual(bubbleRuns[0])[0]
    expect(selfExplanationPromptFor('bubble-sort', procedural)).toBeNull()
    expect(selfExplanationPromptFor('selection-sort', passComplete)).toBeNull()
  })
})

describe('offerableSelfExplanation', () => {
  const passComplete = conceptual(bubbleRuns[0])[0]
  const base = { topicSlug: 'bubble-sort', snapshot: passComplete, correct: true, firstAttempt: true, offeredThisSession: 0 }

  it('offers the prompt after a first-attempt correct conceptual answer', () => {
    expect(offerableSelfExplanation(base)?.key).toBe('bubble-sort.pass-complete')
  })

  it('never follows a wrong answer, or a correct one after wrong attempts', () => {
    expect(offerableSelfExplanation({ ...base, correct: false })).toBeNull()
    expect(offerableSelfExplanation({ ...base, firstAttempt: false })).toBeNull()
  })

  it('holds the per-session cap', () => {
    expect(offerableSelfExplanation({ ...base, offeredThisSession: SELF_EXPLANATION_MAX_PER_SESSION - 1 })).not.toBeNull()
    expect(offerableSelfExplanation({ ...base, offeredThisSession: SELF_EXPLANATION_MAX_PER_SESSION })).toBeNull()
  })
})

const evaluation: SelfExplanationResponse = {
  results: [{ id: 'carried_right', met: true }, { id: 'never_left_behind', met: false }, { id: 'not_revisited', met: true }],
  score: 67,
  acknowledgement: 'You saw that swaps carry the larger value right.',
  followUpQuestion: 'Could anything smaller ever get past it?',
  aiGenerated: true,
  failureReason: null,
  promptVersion: '2026-09-28.1',
  aiModel: 'claude-sonnet-4-6',
}

describe('what the learner sees', () => {
  it('shows the acknowledgement and follow-up, never the score', () => {
    const shown = selfExplanationDisplay(ScaffoldingLevel.HIGH, evaluation)
    expect(shown).toEqual({ acknowledgement: evaluation.acknowledgement, followUpQuestion: evaluation.followUpQuestion })
    expect(JSON.stringify(shown)).not.toContain('67')
  })

  it('shows no model words at NONE, and a neutral line when unreachable', () => {
    expect(selfExplanationDisplay(ScaffoldingLevel.NONE, evaluation)).toEqual({ acknowledgement: NONE_ACKNOWLEDGEMENT, followUpQuestion: null })
    expect(selfExplanationDisplay(ScaffoldingLevel.HIGH, null).acknowledgement).toBe(UNREACHABLE_ACKNOWLEDGEMENT)
  })
})

describe('the logged row', () => {
  const snapshot = conceptual(bubbleRuns[0])[0]
  const prompt = selfExplanationPromptFor('bubble-sort', snapshot)!
  const row = (overrides: Partial<Parameters<typeof selfExplanationInteraction>[0]>) =>
    selfExplanationInteraction({
      sessionId: 's1', stepIndex: snapshot.stepIndex, snapshot, prompt, level: ScaffoldingLevel.HIGH,
      response: 'It gets pushed right.', evaluation, display: selfExplanationDisplay(ScaffoldingLevel.HIGH, evaluation),
      timeSpentSeconds: 20, ...overrides,
    })

  it('stores the response, results, score and what was shown', () => {
    expect(row({})).toMatchObject({
      interactionType: 'SELF_EXPLANATION',
      predictionSubmitted: 'It gets pushed right.',
      predictionCorrect: null,
      promptKey: 'bubble-sort.pass-complete',
      rubricResults: evaluation.results,
      rubricScore: 67,
      aiGenerated: true,
      feedbackText: evaluation.acknowledgement,
      hintText: evaluation.followUpQuestion,
      aiFailureReason: null,
      promptVersion: '2026-09-28.1',
    })
  })

  it('logs a skip with no response and nothing shown', () => {
    expect(row({ response: null, evaluation: null, display: null })).toMatchObject({
      predictionSubmitted: null, feedbackText: null, aiGenerated: false, aiFailureReason: null, rubricScore: null,
    })
  })

  it('records a fallback and an unreachable evaluation as not AI-generated, with a reason', () => {
    const fallback = { ...evaluation, results: null, score: null, aiGenerated: false, failureReason: 'acknowledgement.grade' }
    expect(row({ evaluation: fallback, display: selfExplanationDisplay(ScaffoldingLevel.HIGH, fallback) })).toMatchObject({
      aiGenerated: false, aiFailureReason: 'acknowledgement.grade', rubricResults: null,
    })
    expect(row({ evaluation: null, display: selfExplanationDisplay(ScaffoldingLevel.HIGH, null) })).toMatchObject({
      aiGenerated: false, aiFailureReason: 'error',
    })
  })
})
