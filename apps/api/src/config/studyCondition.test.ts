import { describe, expect, it } from 'vitest'
import { classicTopicFor, conditionFor } from './studyCondition'
import { conditionOfSession, isTopicComplete } from './topicCompletion'
import { recordedSessionMode } from '../services/session.service'
import { STUDY_TOPICS } from './studyTopics'
import * as S from '../schemas/routes'
import { isScoredInteraction } from './interactionTypes'

const CODES = Array.from({ length: 12 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`)

describe('Classic assignment (Week 3 3B.2)', () => {
  it('follows the rotation table: 1,4,7,10 bubble-sort; 2,5,8,11 binary-search; 3,6,9,12 bst', () => {
    expect(CODES.map(classicTopicFor)).toEqual([
      'bubble-sort', 'binary-search', 'bst',
      'bubble-sort', 'binary-search', 'bst',
      'bubble-sort', 'binary-search', 'bst',
      'bubble-sort', 'binary-search', 'bst',
    ])
  })

  it('is balanced across 12 codes: each topic is Classic for exactly 4 participants', () => {
    const counts = Object.fromEntries(STUDY_TOPICS.map((t) => [t, CODES.filter((c) => classicTopicFor(c) === t).length]))
    expect(counts).toEqual({ 'bubble-sort': 4, 'binary-search': 4, bst: 4 })
  })

  it('gives each participant Classic on exactly one topic and the tutor on the other two', () => {
    for (const code of CODES) {
      const conditions = STUDY_TOPICS.map((topic) => conditionFor(topic, classicTopicFor(code)))
      expect(conditions.filter((c) => c === 'CLASSIC')).toHaveLength(1)
      expect(conditions.filter((c) => c === 'TUTOR')).toHaveLength(2)
    }
  })

  it('is stable: the same code always gets the same topic', () => {
    for (const code of CODES) expect(classicTopicFor(code)).toBe(classicTopicFor(code))
  })

  it('treats PILOT- codes by the same rule, so pilots exercise both paths', () => {
    expect(['PILOT-1', 'PILOT-2', 'PILOT-3'].map(classicTopicFor)).toEqual(['bubble-sort', 'binary-search', 'bst'])
  })
})

describe('recorded session mode - the server decides the condition', () => {
  const participant = { classicTopicSlug: 'binary-search', active: true }

  it("records CLASSIC on the participant's Classic topic, whatever the browser asked for", () => {
    expect(recordedSessionMode('PRACTICE', 'binary-search', participant)).toBe('CLASSIC')
    expect(recordedSessionMode('DEMO', 'binary-search', participant)).toBe('CLASSIC')
  })

  it('never records CLASSIC anywhere else', () => {
    expect(recordedSessionMode('CLASSIC', 'bst', participant)).toBe('PRACTICE')
    expect(recordedSessionMode('CLASSIC', 'binary-search', { classicTopicSlug: null, active: false })).toBe('PRACTICE')
  })

  it('leaves non-participants and tutor topics as requested', () => {
    expect(recordedSessionMode('DEMO', 'bst', participant)).toBe('DEMO')
    expect(recordedSessionMode('PRACTICE', 'merge-sort', { classicTopicSlug: null, active: false })).toBe('PRACTICE')
  })

  it('judges completion by the session condition', () => {
    const endOnly = { reachedFinalStep: true, conceptualJunctionsAnswered: 0 }
    expect(isTopicComplete(endOnly, conditionOfSession('CLASSIC'))).toBe(true)
    expect(isTopicComplete(endOnly, conditionOfSession('PRACTICE'))).toBe(false)
  })
})

describe('VIEW_STEP logging parity (3B.6)', () => {
  it('accepts a step-view row with time on task and no prediction, and never scores it', () => {
    const row = {
      sessionId: 's1',
      stepIndex: 4,
      predictionSubmitted: null,
      predictionCorrect: null,
      misconceptionCategory: null,
      hintsRequested: 0,
      timeSpentSeconds: 2.3,
      interactionType: 'VIEW_STEP',
      aiGenerated: false,
    }
    expect(S.interactions.create.body.safeParse(row).success).toBe(true)
    expect(isScoredInteraction({ interactionType: 'VIEW_STEP' })).toBe(false)
  })

  it('accepts CLASSIC as a session mode', () => {
    expect(S.sessions.create.body.safeParse({ algorithmTopicId: 't1', mode: 'CLASSIC', scaffoldingLevel: 'HIGH' }).success).toBe(true)
  })
})
