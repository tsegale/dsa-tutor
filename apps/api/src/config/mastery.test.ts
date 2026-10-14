import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHALLENGE_TOPICS, FEYNMAN_TOPICS, MASTERY_RUBRIC, attemptIndexOf, computeMastery, type MasteryRow } from './mastery'

let clock = Date.parse('2026-10-14T09:00:00Z')

function row(overrides: Partial<MasteryRow>): MasteryRow {
  clock += 1000
  return {
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
    createdAt: new Date(clock),
    ...overrides,
  }
}

/** n first attempts, `wrong` of them wrong (each followed by its right retry), spread over `inputs` inputs. */
function answers(n: number, wrong = 0, inputs = 1): MasteryRow[] {
  const rows: MasteryRow[] = []
  for (let i = 0; i < n; i++) {
    const inputHash = `aaaa000${i % inputs}`
    if (i < wrong) {
      rows.push(row({ predictionCorrect: false, attemptIndex: 1, inputHash }))
      rows.push(row({ predictionCorrect: true, attemptIndex: 2, inputHash }))
    } else {
      rows.push(row({ inputHash }))
    }
  }
  return rows
}

const criterion = (mastery: ReturnType<typeof computeMastery>, id: string) => mastery.criteria.find((c) => c.id === id)!
const feynman = (score: number) => row({ interactionType: 'FEYNMAN', predictionCorrect: true, attemptIndex: null, promptKey: 'feynman.bubble_sort', rubricScore: score })
const challenge = (passed: boolean) => row({ interactionType: 'CHALLENGE_RESULT', predictionCorrect: passed, attemptIndex: null, rubricScore: passed ? 100 : 50 })

describe('computeMastery', () => {
  it('is not started with no rows, and in progress after one answer', () => {
    expect(computeMastery('bubble-sort', [], null).status).toBe('NOT_STARTED')
    expect(computeMastery('bubble-sort', answers(1), null).status).toBe('IN_PROGRESS')
  })

  it('reads accuracy from first attempts only, over the most recent window', () => {
    // 3 wrong first attempts in 12: retries do not count as attempts.
    const mastery = computeMastery('bubble-sort', answers(12, 3), null)
    expect(criterion(mastery, 'ACCURACY')).toMatchObject({ value: 75, attempts: 12, met: false })
    // Early misses fall out of the window once 20 later first attempts are right.
    const recovered = computeMastery('bubble-sort', [...answers(5, 5), ...answers(20)], null)
    expect(criterion(recovered, 'ACCURACY')).toMatchObject({ value: 100, attempts: MASTERY_RUBRIC.accuracyWindow, met: true })
  })

  it('needs enough first attempts before 85% counts', () => {
    expect(criterion(computeMastery('bubble-sort', answers(9), null), 'ACCURACY').met).toBe(false)
    expect(criterion(computeMastery('bubble-sort', answers(10), null), 'ACCURACY').met).toBe(true)
  })

  it('counts distinct inputs for breadth, ignoring rows with no input recorded', () => {
    const rows = [...answers(6, 0, 2), row({ inputHash: null })]
    expect(criterion(computeMastery('bubble-sort', rows, null), 'BREADTH')).toMatchObject({ value: 2, met: false })
    expect(criterion(computeMastery('bubble-sort', answers(6, 0, 3), null), 'BREADTH').met).toBe(true)
  })

  it('is proficient on accuracy and breadth, mastered only with Feynman and a passed challenge', () => {
    const base = answers(12, 1, 3)
    expect(computeMastery('bubble-sort', base, null).status).toBe('PROFICIENT')
    expect(computeMastery('bubble-sort', [...base, feynman(79), challenge(true)], null).status).toBe('PROFICIENT')
    expect(computeMastery('bubble-sort', [...base, feynman(80), challenge(false)], null).status).toBe('PROFICIENT')
    expect(computeMastery('bubble-sort', [...base, feynman(70), feynman(85), challenge(false), challenge(true)], null).status).toBe('MASTERED')
  })

  it('leaves out criteria the topic does not offer instead of failing them', () => {
    const mastery = computeMastery('shell-sort', answers(12, 0, 3), null)
    expect(criterion(mastery, 'FEYNMAN').applicable).toBe(false)
    expect(criterion(mastery, 'CHALLENGE').applicable).toBe(false)
    expect(mastery.status).toBe('MASTERED')
    // Quick Sort has a Feynman rubric but no challenge generator.
    const quick = computeMastery('quick-sort', answers(12, 0, 3), null)
    expect(criterion(quick, 'FEYNMAN').applicable).toBe(true)
    expect(criterion(quick, 'CHALLENGE').applicable).toBe(false)
    expect(quick.status).toBe('PROFICIENT')
  })

  it('keeps Mastered once earned, while each criterion shows its current value', () => {
    const masteredAt = new Date('2026-10-01T10:00:00Z')
    const mastery = computeMastery('bubble-sort', answers(12, 6, 1), masteredAt)
    expect(mastery.status).toBe('MASTERED')
    expect(mastery.masteredAt).toBe('2026-10-01T10:00:00.000Z')
    expect(criterion(mastery, 'ACCURACY').met).toBe(false)
  })

  it('reports hints per step and never lets them decide a status', () => {
    const base = answers(12, 0, 3)
    const hinted = base.map((r) => ({ ...r, hintsRequested: 4 }))
    expect(computeMastery('shell-sort', hinted, null).hintsPerStep).toBe(4)
    expect(computeMastery('shell-sort', hinted, null).status).toBe(computeMastery('shell-sort', base, null).status)
    expect(computeMastery('shell-sort', hinted, null).criteria.map((c) => c.id)).toEqual(['ACCURACY', 'BREADTH', 'FEYNMAN', 'CHALLENGE'])
  })

  it('ignores rows that are not answers (worked steps, challenge loads)', () => {
    const rows = [row({ interactionType: 'WORKED_STEP', predictionCorrect: null }), row({ interactionType: 'CHALLENGE_ATTEMPT', predictionCorrect: null })]
    expect(computeMastery('bubble-sort', rows, null).status).toBe('NOT_STARTED')
  })
})

describe('attemptIndexOf', () => {
  it('derives the attempt for rows logged before attemptIndex, from the wrong-attempt counter', () => {
    expect(attemptIndexOf({ attemptIndex: null, predictionCorrect: true, hintIndexAtResolve: 0 })).toBe(1)
    expect(attemptIndexOf({ attemptIndex: null, predictionCorrect: false, hintIndexAtResolve: 1 })).toBe(1)
    expect(attemptIndexOf({ attemptIndex: null, predictionCorrect: false, hintIndexAtResolve: 2 })).toBe(2)
    expect(attemptIndexOf({ attemptIndex: null, predictionCorrect: true, hintIndexAtResolve: 2 })).toBe(3)
    expect(attemptIndexOf({ attemptIndex: 2, predictionCorrect: true, hintIndexAtResolve: 0 })).toBe(2)
  })
})

describe('applicable topics match the web', () => {
  const web = (file: string) => readFileSync(join(__dirname, '../../../web/src/utils', file), 'utf8')
  const seed = readFileSync(join(__dirname, '../../prisma/seed.ts'), 'utf8')
  const slugFor = (displayName: string) => seed.match(new RegExp(`name: '([^']+)', displayName: '${displayName}'`))?.[1]

  it('Feynman topics are the ones with a rubric', () => {
    const block = web('feynmanRubrics.ts').match(/new Set\(\[([\s\S]*?)\]\)/)![1]
    const names = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(names.length).toBeGreaterThan(5)
    expect(names.map(slugFor).sort()).toEqual([...FEYNMAN_TOPICS].sort())
  })

  it('the web passes a challenge run at the same accuracy', () => {
    expect(web('mastery.ts')).toContain(`CHALLENGE_PASS_ACCURACY = ${MASTERY_RUBRIC.challengePassAccuracy}`)
  })

  it('challenge topics are the ones with a generator', () => {
    const block = web('challengeGenerators.ts').match(/CHALLENGE_TOPICS = \[([^\]]*)\]/)![1]
    expect([...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()).toEqual([...CHALLENGE_TOPICS].sort())
  })
})
