import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SCORED_INTERACTION_TYPES } from './interactionTypes'
import { computeMastery, type MasteryRow } from './mastery'

/**
 * Phase 8E: what Feynman mode does not do. It satisfies criterion 3 of 4 and
 * nothing else: it unlocks no topic or module, never marks a topic Mastered
 * on its own, and masteredAt is set by the mastery engine, not the Feynman
 * handler.
 */

let clock = Date.parse('2026-10-14T09:00:00Z')
const row = (overrides: Partial<MasteryRow>): MasteryRow => ({
  interactionType: 'PREDICTION',
  predictionCorrect: true,
  attemptIndex: 1,
  hintIndexAtResolve: 0,
  hintsRequested: 0,
  bottomedOut: false,
  inputHash: 'aaaa0001',
  promptKey: null,
  rubricScore: null,
  masteryScoreAtTime: 0,
  criticalJunctionType: 'SWAP_DECISION',
  createdAt: new Date((clock += 1000)),
  ...overrides,
})
const answers = (n: number) => Array.from({ length: n }, (_, i) => row({ inputHash: `aaaa000${i % 3}` }))
const feynman = (score: number) => row({ interactionType: 'FEYNMAN', attemptIndex: null, promptKey: 'feynman.bubble_sort', rubricScore: score, inputHash: null })
const challenge = row({ interactionType: 'CHALLENGE_RESULT', attemptIndex: null, rubricScore: 100, inputHash: null })

describe('Feynman mode boundaries', () => {
  it('never marks a topic Mastered on its own', () => {
    const mastery = computeMastery('bubble-sort', [feynman(100)], null)
    expect(mastery.status).toBe('IN_PROGRESS')
    expect(mastery.criteria.find((c) => c.id === 'FEYNMAN')?.met).toBe(true)
    expect(mastery.criteria.filter((c) => c.applicable && !c.met).map((c) => c.id)).toEqual(['ACCURACY', 'BREADTH', 'CHALLENGE'])
  })

  it('is the last step to Mastered only when the other three are already met', () => {
    const others = [...answers(12), challenge]
    expect(computeMastery('bubble-sort', [...others, feynman(79)], null).status).toBe('PROFICIENT')
    expect(computeMastery('bubble-sort', [...others, feynman(80)], null).status).toBe('MASTERED')
  })

  it('unlocks nothing: a Feynman row is not a scored answer, so masteryPercent and module locks ignore it', () => {
    expect(SCORED_INTERACTION_TYPES).not.toContain('FEYNMAN')
  })

  it('leaves masteredAt to the mastery engine: only the interaction write refreshes it', () => {
    const src = (file: string) => readFileSync(join(__dirname, '..', file), 'utf8')
    expect(src('services/interaction.service.ts')).toContain('refreshTopicMasteryAfterWrite')
    expect(src('routers/ai.router.ts')).not.toMatch(/masteredAt|refreshTopicMastery/)
  })
})
