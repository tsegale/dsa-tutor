import { describe, expect, it } from 'vitest'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { binarySearchEngine } from '@/engine/binarySearch'
import type { MasteryCriterion, TopicMastery } from '@dsa-tutor/types'
import { EMPTY_MASTERY, criterionView, inputHashOf, masteryBreakdown, masteryPracticeInput, nextMasteryOffer } from './mastery'

describe('inputHashOf', () => {
  it('is the same for the same input and differs for a different one', () => {
    const a = inputHashOf(bubbleSortEngine([5, 3, 1, 4, 2]))
    expect(a).toMatch(/^[0-9a-f]{8}$/)
    expect(inputHashOf(bubbleSortEngine([5, 3, 1, 4, 2]))).toBe(a)
    expect(inputHashOf(bubbleSortEngine([5, 3, 1, 2, 4]))).not.toBe(a)
  })

  it('tells a search target apart, since the target is part of the input', () => {
    const array = [1, 3, 5, 7, 9]
    expect(inputHashOf(binarySearchEngine(array, 7))).not.toBe(inputHashOf(binarySearchEngine(array, 3)))
  })

  it('is null for an empty run', () => {
    expect(inputHashOf([])).toBeNull()
  })
})

describe('criterionView', () => {
  const crit = (id: MasteryCriterion['id'], over: Partial<MasteryCriterion>): MasteryCriterion => ({
    id,
    applicable: true,
    met: false,
    value: null,
    threshold: { ACCURACY: 85, BREADTH: 3, FEYNMAN: 80, CHALLENGE: 1 }[id],
    attempts: 0,
    ...over,
  })

  it('gives every unmet criterion, in every state, the action that clears it', () => {
    const unmet: MasteryCriterion[] = [
      crit('ACCURACY', {}),
      crit('ACCURACY', { value: 100, attempts: 4 }),
      crit('ACCURACY', { value: 70, attempts: 20 }),
      crit('BREADTH', { value: 0 }),
      crit('BREADTH', { value: 2 }),
      crit('FEYNMAN', {}),
      crit('FEYNMAN', { value: 72, attempts: 1 }),
      crit('FEYNMAN', { value: null, attempts: 1 }),
      crit('CHALLENGE', {}),
      crit('CHALLENGE', { value: 0, attempts: 2 }),
    ]
    for (const criterion of unmet) expect(criterionView(criterion).action, criterion.id).toBeTruthy()
  })

  it('names the gap in data the learner can act on', () => {
    expect(criterionView(crit('BREADTH', { value: 2 })).action).toBe('Practise on a different input (2 of 3)')
    expect(criterionView(crit('FEYNMAN', {})).action).toBe('Explain this algorithm in Feynman Mode (not yet attempted)')
    expect(criterionView(crit('ACCURACY', { value: 100, attempts: 4 })).action).toBe('Answer 6 more junctions in Practice mode (4 of 10)')
    expect(criterionView(crit('ACCURACY', { value: 70, attempts: 20 }))).toMatchObject({ value: '70%', threshold: '85%' })
  })

  it('has no action once met', () => {
    expect(criterionView(crit('CHALLENGE', { met: true, value: 1, attempts: 1 })).action).toBeNull()
  })
})

describe('masteryBreakdown', () => {
  const topic = (status: TopicMastery['status'], met: Partial<Record<MasteryCriterion['id'], boolean>>, offered = ['ACCURACY', 'BREADTH']) => ({
    mastery: {
      ...EMPTY_MASTERY,
      status,
      criteria: EMPTY_MASTERY.criteria.map((c) => ({ ...c, applicable: offered.includes(c.id), met: met[c.id] ?? false })),
    },
  })

  it('counts mastered topics and finds the criterion most often missed, over started topics that offer it', () => {
    const breakdown = masteryBreakdown([
      topic('MASTERED', { ACCURACY: true, BREADTH: true, FEYNMAN: true }, ['ACCURACY', 'BREADTH', 'FEYNMAN']),
      topic('IN_PROGRESS', { ACCURACY: true }, ['ACCURACY', 'BREADTH', 'FEYNMAN']),
      topic('PROFICIENT', { ACCURACY: true, BREADTH: true }),
      topic('NOT_STARTED', {}),
    ])
    expect(breakdown).toMatchObject({ mastered: 1, proficient: 1, started: 3 })
    expect(breakdown.criteria.find((c) => c.id === 'BREADTH')).toMatchObject({ met: 2, total: 3 })
    expect(breakdown.criteria.find((c) => c.id === 'FEYNMAN')).toMatchObject({ met: 1, total: 2 })
    expect(breakdown.criteria.find((c) => c.id === 'CHALLENGE')).toMatchObject({ met: 0, total: 0 })
    expect(breakdown.mostMissed).toBe('FEYNMAN')
  })
})

describe('nextMasteryOffer', () => {
  const withCriteria = (status: TopicMastery['status'], met: Partial<Record<MasteryCriterion['id'], boolean>>, missed: string[] = []): TopicMastery => ({
    ...EMPTY_MASTERY,
    status,
    missedJunctionTypes: missed,
    criteria: EMPTY_MASTERY.criteria.map((c) => ({ ...c, applicable: true, met: met[c.id] ?? false, attempts: c.id === 'ACCURACY' ? 12 : 0 })),
  })

  it('makes one offer, for the first unmet criterion in rubric order', () => {
    expect(nextMasteryOffer(withCriteria('IN_PROGRESS', {}, ['PASS_COMPLETE']))).toMatchObject({ kind: 'FOCUSED_RUN', criterion: 'ACCURACY' })
    expect(nextMasteryOffer(withCriteria('IN_PROGRESS', { ACCURACY: true }))?.kind).toBe('NEW_INPUT')
    expect(nextMasteryOffer(withCriteria('PROFICIENT', { ACCURACY: true, BREADTH: true }))?.kind).toBe('FEYNMAN')
    expect(nextMasteryOffer(withCriteria('PROFICIENT', { ACCURACY: true, BREADTH: true, FEYNMAN: true }))?.kind).toBe('CHALLENGE')
  })

  it('names the missed junction types in the focused run', () => {
    expect(nextMasteryOffer(withCriteria('IN_PROGRESS', {}, ['SWAP_DECISION', 'PASS_COMPLETE']))?.detail).toBe(
      'Asks every swap decision and pass complete step, none shown as a worked example',
    )
  })

  it('offers practice again when accuracy is short of attempts, not of right answers', () => {
    expect(nextMasteryOffer(withCriteria('IN_PROGRESS', {}, []))?.kind).toBe('PRACTISE_AGAIN')
  })

  it('offers nothing before a start or once mastered', () => {
    expect(nextMasteryOffer(EMPTY_MASTERY)).toBeNull()
    expect(nextMasteryOffer(withCriteria('MASTERED', {}))).toBeNull()
  })
})

describe('masteryPracticeInput', () => {
  it('is deterministic, distinct-valued, and moves on as inputs are used', () => {
    const first = masteryPracticeInput('bubble-sort', 5, 2)
    expect(masteryPracticeInput('bubble-sort', 5, 2)).toEqual(first)
    expect(new Set(first).size).toBe(5)
    expect(masteryPracticeInput('bubble-sort', 5, 3)).not.toEqual(first)
  })

  it('sorts the input for searches that need it', () => {
    const input = masteryPracticeInput('binary-search', 8, 0)
    expect(input).toEqual([...input].sort((a, b) => a - b))
  })
})
