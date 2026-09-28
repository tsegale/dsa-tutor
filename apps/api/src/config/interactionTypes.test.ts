import { describe, expect, it } from 'vitest'
import * as S from '../schemas/routes'
import { INTERACTION_TYPES, feynmanScoreOf, isScoredInteraction } from './interactionTypes'

const workedStep = {
  sessionId: 's1',
  stepIndex: 7,
  predictionSubmitted: null,
  predictionCorrect: null,
  misconceptionCategory: null,
  hintsRequested: 0,
  timeSpentSeconds: 0,
  criticalJunctionType: 'SWAP_DECISION',
  junctionDifficulty: 'PROCEDURAL',
  scaffoldingLevelAtTime: 'HIGH',
  interactionType: 'WORKED_STEP',
  aiGenerated: false,
}

describe('interaction types', () => {
  it('accepts a worked step, which has no answer', () => {
    expect(S.interactions.create.body.safeParse(workedStep).success).toBe(true)
  })

  it('still rejects an unknown interaction type', () => {
    expect(S.interactions.create.body.safeParse({ ...workedStep, interactionType: 'GUESS' }).success).toBe(false)
  })

  it('counts only answered junctions as scored', () => {
    expect(isScoredInteraction({ interactionType: 'PREDICTION' })).toBe(true)
    expect(isScoredInteraction({ interactionType: 'WORKED_STEP' })).toBe(false)
    expect(isScoredInteraction({ interactionType: 'FEYNMAN' })).toBe(false)
    expect(INTERACTION_TYPES).toContain('WORKED_STEP')
  })

  it('accepts an unscored challenge attempt naming its case and targeted misconception', () => {
    const attempt = {
      ...workedStep,
      stepIndex: 0,
      criticalJunctionType: undefined,
      junctionDifficulty: undefined,
      interactionType: 'CHALLENGE_ATTEMPT',
      misconceptionCategory: 'ORDER_OF_OPERATIONS',
      promptKey: 'bubble-sort.already-sorted@123456',
      hintText: 'Before you act on a pair, check whether it is really out of order.',
    }
    expect(S.interactions.create.body.safeParse(attempt).success).toBe(true)
    expect(isScoredInteraction({ interactionType: 'CHALLENGE_ATTEMPT' })).toBe(false)
  })

  it('takes only a case id and explanation for challenge framing - never data', () => {
    const body = { algorithmName: 'Bubble Sort', caseId: 'already-sorted', caseExplanation: 'Every pair stays.' }
    expect(S.ai.challenges.body.safeParse(body).success).toBe(true)
    expect(S.ai.challenges.body.safeParse({ ...body, array: [1, 2, 3] }).success).toBe(false)
  })

  it('accepts and scores a complexity prediction, which is a graded answer', () => {
    const answered = { ...workedStep, interactionType: 'COMPLEXITY_PREDICTION', predictionSubmitted: 'wrong-2', predictionCorrect: false }
    expect(S.interactions.create.body.safeParse(answered).success).toBe(true)
    expect(isScoredInteraction({ interactionType: 'COMPLEXITY_PREDICTION' })).toBe(true)
  })
})

describe('feynmanScoreOf', () => {
  it('leaves an ungraded explanation out instead of counting it as 0', () => {
    expect(feynmanScoreOf({ promptKey: 'feynman.binary_search_tree', rubricScore: null, masteryScoreAtTime: 0 })).toBeNull()
    expect(feynmanScoreOf({ promptKey: 'feynman.binary_search_tree', rubricScore: 60, masteryScoreAtTime: 60 })).toBe(60)
  })

  it('keeps a graded 0 and legacy rows as they were stored', () => {
    expect(feynmanScoreOf({ promptKey: 'feynman.bubble_sort', rubricScore: 0, masteryScoreAtTime: 0 })).toBe(0)
    expect(feynmanScoreOf({ promptKey: null, rubricScore: null, masteryScoreAtTime: 40 })).toBe(40)
  })
})

describe('Feynman interaction rows', () => {
  it('accept per-item results keyed by concept label and a null score', () => {
    const row = {
      ...workedStep,
      interactionType: 'FEYNMAN',
      predictionSubmitted: 'my explanation',
      predictionCorrect: false,
      promptKey: 'feynman.binary_search_tree',
      rubricResults: [
        { id: 'Left subtree smaller, right subtree larger (equal values go right)', met: true },
        { id: 'Inserting by comparing from the root down to an empty spot', met: true },
        { id: "Insert order decides the tree's shape", met: false },
        { id: 'Cost depends on height: about log n balanced, n as a chain', met: false },
        { id: 'In-order traversal gives sorted order', met: true },
      ],
      rubricScore: 60,
    }
    expect(S.interactions.create.body.safeParse(row).success).toBe(true)
    expect(S.interactions.create.body.safeParse({ ...row, rubricResults: null, rubricScore: null, aiFailureReason: 'reused_wording' }).success).toBe(true)
  })
})
