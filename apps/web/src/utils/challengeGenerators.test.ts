import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, type AlgorithmSnapshot, type MisconceptionCategory } from '@dsa-tutor/types'
import {
  CHALLENGE_TOPICS,
  MISCONCEPTION_CASES,
  buildChallengeRun,
  challengeCaseIds,
  challengeSeed,
  generateChallenge,
  hasChallengeGenerator,
  type ChallengeTopic,
} from './challengeGenerators'
import { getTilesForSnapshot } from './tileBuilder'
import { correctTileIdFor } from './correctTile'
import type { BSTNode, BSTState } from '@/engine/bst'

const DISPLAY_NAME: Record<ChallengeTopic, string> = {
  'bubble-sort': 'Bubble Sort',
  'binary-search': 'Binary Search',
  bst: 'Binary Search Tree',
}
const SEEDS = [1, 7, 42, 1234, 99991]
const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']

// The right tile, from the shared rule (correctTile.ts) - itself tested
// against hand-worked states in correctTile.test.ts.
function correctTileId(snapshot: AlgorithmSnapshot): string {
  const id = correctTileIdFor(snapshot)
  if (id === null) throw new Error(`no correct tile rule for ${snapshot.criticalJunctionType}`)
  return id
}

/** Misconceptions a learner could be tagged with somewhere in this run: a wrong tile at an asked junction. */
function exercisedMisconceptions(run: AlgorithmSnapshot[], topic: ChallengeTopic): Set<string> {
  const found = new Set<string>()
  for (const snapshot of run) {
    if (!snapshot.isPredictionRequired || !snapshot.criticalJunctionType) continue
    const correct = correctTileId(snapshot)
    const tiles = getTilesForSnapshot(snapshot, DISPLAY_NAME[topic])
    expect(tiles.some((t) => t.id === correct), `no correct tile at step ${snapshot.stepIndex}`).toBe(true)
    for (const tile of tiles) if (tile.id !== correct && tile.misconception) found.add(tile.misconception)
  }
  return found
}

function runFor(topic: ChallengeTopic, misconception: string | null, seed = 42, difficulty = 'INTERMEDIATE') {
  const challenge = generateChallenge({ topic, misconception, difficulty, seed })
  return { challenge, run: buildChallengeRun(challenge, { withComplexityPrediction: true }) }
}

const swapDecisions = (run: AlgorithmSnapshot[]) =>
  run.filter((s) => s.criticalJunctionType === CriticalJunctionType.SWAP_DECISION && s.isPredictionRequired)

describe('generateChallenge', () => {
  it('is deterministic: the same seed gives the same case', () => {
    for (const topic of CHALLENGE_TOPICS) {
      for (const misconception of [null, ...Object.keys(MISCONCEPTION_CASES[topic])]) {
        const a = generateChallenge({ topic, misconception, difficulty: 'INTERMEDIATE', seed: 99 })
        const b = generateChallenge({ topic, misconception, difficulty: 'INTERMEDIATE', seed: 99 })
        expect(a).toEqual(b)
      }
    }
  })

  it('derives the seed reproducibly from the session and attempt number', () => {
    expect(challengeSeed('s1', 0)).toBe(challengeSeed('s1', 0))
    expect(challengeSeed('s1', 0)).not.toBe(challengeSeed('s1', 1))
    expect(challengeSeed('s1', 0)).not.toBe(challengeSeed('s2', 0))
  })

  it('never lets data depend on anything but the options - no model involved', () => {
    const a = generateChallenge({ topic: 'bst', misconception: null, difficulty: 'ADVANCED', seed: 5 })
    expect(a.input).toEqual(generateChallenge({ topic: 'bst', misconception: null, difficulty: 'ADVANCED', seed: 5 }).input)
  })

  it('has a generator only for the three study topics', () => {
    expect(hasChallengeGenerator('bubble-sort')).toBe(true)
    expect(hasChallengeGenerator('binary-search')).toBe(true)
    expect(hasChallengeGenerator('bst')).toBe(true)
    expect(hasChallengeGenerator('merge-sort')).toBe(false)
    expect(hasChallengeGenerator('Bubble Sort')).toBe(false)
    expect(hasChallengeGenerator(undefined)).toBe(false)
  })

  it('offers every case the plan lists', () => {
    expect(challengeCaseIds('bubble-sort').sort()).toEqual(
      ['adjacent-duplicates', 'all-equal', 'already-sorted', 'reverse-sorted', 'single-element', 'two-elements'].sort(),
    )
    expect(challengeCaseIds('binary-search').sort()).toEqual(
      ['even-length', 'single-element', 'target-absent', 'target-first', 'target-last'].sort(),
    )
    expect(challengeCaseIds('bst').sort()).toEqual(['ascending-chain', 'balanced', 'delete-two-children', 'duplicate-value'].sort())
  })

  it('builds a complete run for every case at every difficulty and seed', () => {
    for (const topic of CHALLENGE_TOPICS) {
      for (const caseId of challengeCaseIds(topic)) {
        for (const difficulty of DIFFICULTIES) {
          for (const seed of SEEDS) {
            const challenge = generateChallenge({ topic, misconception: null, difficulty, seed, caseId })
            const run = buildChallengeRun(challenge, { withComplexityPrediction: true })
            expect(run.at(-1)?.isFinalStep, `${topic}/${caseId}/${seed}`).toBe(true)
            expect(challenge.fallbackHint).not.toMatch(/\d/)
            expect(challenge.fallbackHint + challenge.explanation).not.toMatch(/[–—]/)
          }
        }
      }
    }
  })
})

describe('misconception targeting', () => {
  // The core 2D guarantee: for every category a topic's tiles can tag a
  // learner with, the case it maps to asks a junction where that category
  // is a wrong answer - so the challenge exercises that exact decision.
  it('maps every category the topic can produce', () => {
    for (const topic of CHALLENGE_TOPICS) {
      const producible = new Set<string>()
      for (const caseId of challengeCaseIds(topic)) {
        const challenge = generateChallenge({ topic, misconception: null, difficulty: 'ADVANCED', seed: 3, caseId })
        for (const m of exercisedMisconceptions(buildChallengeRun(challenge, { withComplexityPrediction: true }), topic)) {
          producible.add(m)
        }
      }
      for (const category of producible) {
        expect(MISCONCEPTION_CASES[topic][category as MisconceptionCategory], `${topic} has no case for ${category}`).toBeDefined()
      }
    }
  })

  it('sends each category to a case that asks the decision it gets wrong', () => {
    for (const topic of CHALLENGE_TOPICS) {
      for (const category of Object.keys(MISCONCEPTION_CASES[topic])) {
        for (const seed of SEEDS) {
          for (const difficulty of DIFFICULTIES) {
            const { challenge, run } = runFor(topic, category, seed, difficulty)
            expect(challenge.targets).toBe(category)
            const exercised = exercisedMisconceptions(run, topic)
            // Boundary-shape cases have no tile for these categories: they
            // target the shape itself, checked separately below.
            if (['BASE_CASE_OMISSION', 'OFF_BY_ONE'].includes(category) || (topic === 'bubble-sort' && category === 'BOUNDARY_CONDITION')) continue
            if (topic === 'bubble-sort' && category === 'STABILITY_CONFUSION') continue
            expect(exercised.has(category), `${topic}/${category} -> ${challenge.caseId} (seed ${seed})`).toBe(true)
          }
        }
      }
    }
  })

  it('never inverts the swap mappings: over-swapping gets only "leave", under-swapping only "swap"', () => {
    for (const seed of SEEDS) {
      const over = swapDecisions(runFor('bubble-sort', 'ORDER_OF_OPERATIONS', seed).run)
      const under = swapDecisions(runFor('bubble-sort', 'STRUCTURAL_PROPERTY_VIOLATION', seed).run)
      expect(over.length).toBeGreaterThan(0)
      expect(under.length).toBeGreaterThan(0)
      expect(over.every((s) => correctTileId(s) === 'no-swap')).toBe(true)
      expect(under.every((s) => correctTileId(s) === 'swap')).toBe(true)
    }
  })

  it('asks equal pairs and both swap directions for a comparison-direction error', () => {
    for (const seed of SEEDS) {
      const { challenge, run } = runFor('bubble-sort', 'COMPARISON_DIRECTION', seed)
      const array = (challenge.input as { array: number[] }).array
      expect(array.some((v, i) => i > 0 && array[i - 1] === v)).toBe(true)
      const answers = new Set(swapDecisions(run).map(correctTileId))
      expect(answers).toEqual(new Set(['swap', 'no-swap']))
    }
  })

  it('stops an all-equal run by no swaps, after one pass', () => {
    const { run } = runFor('bubble-sort', 'INVARIANT_MISAPPLICATION')
    expect(run.some((s) => s.criticalJunctionType === CriticalJunctionType.EARLY_TERMINATION)).toBe(true)
    expect(swapDecisions(run).every((s) => correctTileId(s) === 'no-swap')).toBe(true)
  })

  it('targets boundary shapes with the smallest inputs', () => {
    expect(runFor('bubble-sort', 'BASE_CASE_OMISSION').challenge.input).toEqual({ kind: 'array', array: [expect.any(Number)] })
    expect((runFor('bubble-sort', 'OFF_BY_ONE').challenge.input as { array: number[] }).array).toHaveLength(2)
    const single = runFor('binary-search', 'BASE_CASE_OMISSION').challenge.input as { array: number[]; target: number }
    expect(single.array).toEqual([single.target])
    const even = runFor('binary-search', 'OFF_BY_ONE').challenge.input as { array: number[] }
    expect(even.array.length % 2).toBe(0)
  })

  it('sends a binary-search direction error somewhere every decision goes one way', () => {
    for (const seed of SEEDS) {
      const { run } = runFor('binary-search', 'COMPARISON_DIRECTION', seed)
      const moves = run
        .filter((s) => s.criticalJunctionType === CriticalJunctionType.MIDPOINT_DECISION)
        .map(correctTileId)
        .filter((id) => id !== 'found')
      expect(moves.length).toBeGreaterThan(0)
      expect(new Set(moves).size).toBe(1)
    }
  })

  it('makes an absent target really absent, in a gap between two values', () => {
    for (const seed of SEEDS) {
      const { challenge, run } = runFor('binary-search', 'PREMATURE_TERMINATION', seed)
      const { array, target } = challenge.input as { array: number[]; target: number }
      expect(array).not.toContain(target)
      expect(target).toBeGreaterThan(array[0])
      expect(target).toBeLessThan(array[array.length - 1])
      expect((run.at(-1)?.dataStructureState as { found: boolean }).found).toBe(false)
    }
  })

  it('builds a chain for a complexity error and a balanced tree for traversal confusion', () => {
    const height = (n: BSTNode | null): number => (n ? 1 + Math.max(height(n.left), height(n.right)) : 0)
    const rootOf = (run: AlgorithmSnapshot[]) => {
      const final = [...run].reverse().find((s) => (s.dataStructureState as BSTState).root)
      return (final?.dataStructureState as BSTState).root
    }
    const chain = runFor('bst', 'COMPLEXITY_MISATTRIBUTION')
    expect(height(rootOf(chain.run))).toBe((chain.challenge.input as { values: number[] }).values.length)
    const balanced = runFor('bst', 'TRAVERSAL_ORDER_CONFUSION')
    expect(height(rootOf(balanced.run))).toBeLessThanOrEqual(3)
    const values = (balanced.challenge.input as { values: number[] }).values
    expect(values).not.toEqual([...values].sort((a, b) => a - b))
  })

  it('meets a node of equal value for a BST direction error, and sends it right', () => {
    for (const seed of SEEDS) {
      const { run } = runFor('bst', 'COMPARISON_DIRECTION', seed)
      const equal = run.filter((s) => {
        const st = s.dataStructureState as BSTState
        return s.criticalJunctionType === CriticalJunctionType.BST_DIRECTION && st.currentNode?.value === st.targetValue
      })
      expect(equal.length).toBeGreaterThan(0)
      expect(equal.every((s) => correctTileId(s) === 'go-right')).toBe(true)
    }
  })

  it('deletes a node that really has two children for an invariant error', () => {
    for (const seed of SEEDS) {
      const { run } = runFor('bst', 'INVARIANT_MISAPPLICATION', seed)
      const removal = run.find((s) => (s.dataStructureState as BSTState).deleteCase)
      expect((removal?.dataStructureState as BSTState).deleteCase).toBe('two-children')
      expect(removal?.description).not.toMatch(/successor/)
    }
  })

  it('falls back to a general case, targeting nothing, when there is no misconception or no mapping', () => {
    expect(runFor('bst', null).challenge.targets).toBeNull()
    expect(runFor('bst', 'POINTER_CONFUSION').challenge.targets).toBeNull()
  })
})

describe('ported from the AI service challenge tests', () => {
  const arrayOf = (m: string) => (runFor('bubble-sort', m).challenge.input as { array: number[] }).array
  const ascending = (a: number[]) => a.every((v, i) => i === 0 || a[i - 1] <= v)
  const descending = (a: number[]) => a.every((v, i) => i === 0 || a[i - 1] >= v)

  it('over-swapping gets an ascending array, under-swapping a descending one, never the same', () => {
    expect(ascending(arrayOf('ORDER_OF_OPERATIONS'))).toBe(true)
    expect(descending(arrayOf('STRUCTURAL_PROPERTY_VIOLATION'))).toBe(true)
    expect(arrayOf('ORDER_OF_OPERATIONS')).not.toEqual(arrayOf('STRUCTURAL_PROPERTY_VIOLATION'))
  })

  it('honours the difficulty size', () => {
    expect(arrayOf('STRUCTURAL_PROPERTY_VIOLATION')).toHaveLength(6)
    const beginner = generateChallenge({ topic: 'bubble-sort', misconception: 'ORDER_OF_OPERATIONS', difficulty: 'BEGINNER', seed: 1 })
    expect((beginner.input as { array: number[] }).array).toHaveLength(5)
  })
})
