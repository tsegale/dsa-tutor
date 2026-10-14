import type { MasteryCriterion, MasteryStatus, TopicMastery } from '@dsa-tutor/types'
import { SCORED_INTERACTION_TYPES } from './interactionTypes'

/**
 * The mastery rubric (Phase 7B). Mastered is the interview bar; Proficient
 * (accuracy and breadth) is the everyday state. None of it gates anything:
 * modules still unlock on masteryPercent (Phase 3.1A), never on this.
 *
 * Hints per step is reported alongside and is deliberately not a criterion:
 * Phase 3 removed the hint penalty from scoring, and a mastery gate on hints
 * would bring the same incentive back, more strongly.
 */
export const MASTERY_RUBRIC = {
  /** 1. First-attempt accuracy, over the most recent first attempts. */
  accuracyThreshold: 85,
  accuracyWindow: 20,
  /** Fewer first attempts than this is too few to call 85% meaningful. */
  accuracyMinAttempts: 10,
  /** 2. Distinct inputs the topic was practised on. */
  breadthThreshold: 3,
  /** 3. Best Feynman rubric score, of 100. */
  feynmanThreshold: 80,
  /** 4. Edge-case challenges passed. */
  challengeThreshold: 1,
  /** A challenge run is passed at this first-attempt accuracy on its junctions. */
  challengePassAccuracy: 85,
} as const

// Topics that offer criteria 3 and 4. Elsewhere the criterion is not
// applicable and Mastered needs the rest. Mirrors the web's
// utils/feynmanRubrics.ts (by display name) and utils/challengeGenerators.ts
// CHALLENGE_TOPICS; mastery.test.ts keeps them in step.
export const FEYNMAN_TOPICS: readonly string[] = [
  'bubble-sort',
  'selection-sort',
  'insertion-sort',
  'merge-sort',
  'quick-sort',
  'linear-search',
  'binary-search',
  'bfs',
  'dfs',
  'bst',
  // Modules 1 to 3 (Phase 8C).
  'array-access',
  'array-insert',
  'array-delete',
  'singly-linked-list',
  'doubly-linked-list',
  'circular-linked-list',
  'stack',
  'queue',
  'circular-queue',
  'deque',
  'hash-table-chaining',
  'hash-table-probing',
  'recursion-factorial',
  'recursion-fibonacci',
  'jump-search',
  'interpolation-search',
  'exponential-search',
  'shell-sort',
  'heap-sort',
  'counting-sort',
  'radix-sort',
  // Modules 4 to 6, as each family's rubric goes live (Phase 8.1).
  'tree-inorder',
  'tree-preorder',
  'tree-postorder',
  'tree-level-order',
  'bst-search',
  'bst-delete',
  'max-heap-insert',
  'max-heap-delete',
  'min-heap-insert',
  'min-heap-delete',
  'trie-insert',
  'trie-search',
  'trie-delete',
  'avl-insert',
  'avl-delete',
  'rb-insert',
  'rb-delete',
  'dijkstra',
  'bellman-ford',
  'floyd-warshall',
  'kruskal',
  'prim',
  'cycle-detection',
  'connected-components',
  'topological-sort',
  'grid-bfs',
  'grid-dfs',
  'grid-dijkstra',
  'grid-astar',
]
export const CHALLENGE_TOPICS: readonly string[] = ['bubble-sort', 'binary-search', 'bst']

/** The interaction types the rubric reads. */
export const MASTERY_INTERACTION_TYPES = [...SCORED_INTERACTION_TYPES, 'FEYNMAN', 'CHALLENGE_RESULT'] as const

export interface MasteryRow {
  interactionType: string
  predictionCorrect: boolean | null
  attemptIndex: number | null
  hintIndexAtResolve: number
  hintsRequested: number
  bottomedOut: boolean
  inputHash: string | null
  promptKey: string | null
  rubricScore: number | null
  masteryScoreAtTime: number
  criticalJunctionType: string | null
  createdAt: Date
}

const isScored = (row: MasteryRow) =>
  (SCORED_INTERACTION_TYPES as readonly string[]).includes(row.interactionType) && row.predictionCorrect !== null

/**
 * Which attempt at its junction a scored row was, from 1. Rows logged
 * before attemptIndex existed derive it from hintIndexAtResolve, the
 * client's wrong-attempt counter, which a wrong answer increments before it
 * is reported (web utils/attempts.ts): a right answer after k misses
 * carries k, a wrong one carries its own number.
 */
export function attemptIndexOf(row: Pick<MasteryRow, 'attemptIndex' | 'predictionCorrect' | 'hintIndexAtResolve'>): number {
  if (row.attemptIndex !== null) return row.attemptIndex
  return row.predictionCorrect ? row.hintIndexAtResolve + 1 : Math.max(row.hintIndexAtResolve, 1)
}

/** A FEYNMAN row's score of 100, or null when it was not graded. */
function feynmanScore(row: MasteryRow): number | null {
  return row.promptKey?.startsWith('feynman.') ? row.rubricScore : row.masteryScoreAtTime
}

/**
 * The rubric for one topic from its rows, oldest first. `masteredAt` is
 * the stored moment Mastered was first earned; Mastered stays once earned,
 * while each criterion shows its current value.
 */
export function computeMastery(topicSlug: string, rows: readonly MasteryRow[], masteredAt: Date | null): TopicMastery {
  const R = MASTERY_RUBRIC
  const scored = rows.filter(isScored)

  const firstAttempts = scored.filter((row) => attemptIndexOf(row) === 1).slice(-R.accuracyWindow)
  const firstCorrect = firstAttempts.filter((row) => row.predictionCorrect).length
  const accuracyValue = firstAttempts.length > 0 ? Math.round((firstCorrect / firstAttempts.length) * 100) : null
  const accuracy: MasteryCriterion = {
    id: 'ACCURACY',
    applicable: true,
    met: firstAttempts.length >= R.accuracyMinAttempts && accuracyValue !== null && accuracyValue >= R.accuracyThreshold,
    value: accuracyValue,
    threshold: R.accuracyThreshold,
    attempts: firstAttempts.length,
  }

  const inputs = new Set(scored.map((row) => row.inputHash).filter((hash): hash is string => hash !== null)).size
  const breadth: MasteryCriterion = {
    id: 'BREADTH',
    applicable: true,
    met: inputs >= R.breadthThreshold,
    value: inputs,
    threshold: R.breadthThreshold,
    attempts: 0,
  }

  const feynmanRows = rows.filter((row) => row.interactionType === 'FEYNMAN')
  const feynmanScores = feynmanRows.map(feynmanScore).filter((score): score is number => score !== null)
  const bestFeynman = feynmanScores.length > 0 ? Math.max(...feynmanScores) : null
  const feynman: MasteryCriterion = {
    id: 'FEYNMAN',
    applicable: FEYNMAN_TOPICS.includes(topicSlug),
    met: bestFeynman !== null && bestFeynman >= R.feynmanThreshold,
    value: bestFeynman,
    threshold: R.feynmanThreshold,
    attempts: feynmanRows.length,
  }

  const challengeRows = rows.filter((row) => row.interactionType === 'CHALLENGE_RESULT')
  const passed = challengeRows.filter((row) => row.predictionCorrect === true).length
  const challenge: MasteryCriterion = {
    id: 'CHALLENGE',
    applicable: CHALLENGE_TOPICS.includes(topicSlug),
    met: passed >= R.challengeThreshold,
    value: challengeRows.length > 0 ? passed : null,
    threshold: R.challengeThreshold,
    attempts: challengeRows.length,
  }

  // What a focused re-run asks (Phase 7E): the junction types missed first
  // time in the same window accuracy reads, most missed first.
  const misses = new Map<string, number>()
  for (const row of firstAttempts) {
    if (row.predictionCorrect || !row.criticalJunctionType) continue
    misses.set(row.criticalJunctionType, (misses.get(row.criticalJunctionType) ?? 0) + 1)
  }
  const missedJunctionTypes = [...misses.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type)

  const criteria = [accuracy, breadth, feynman, challenge]
  const allMet = criteria.every((criterion) => !criterion.applicable || criterion.met)
  const started = scored.length > 0 || feynmanRows.length > 0 || challengeRows.length > 0

  let status: MasteryStatus = 'NOT_STARTED'
  if (masteredAt !== null || (started && allMet)) status = 'MASTERED'
  else if (accuracy.met && breadth.met) status = 'PROFICIENT'
  else if (started) status = 'IN_PROGRESS'

  // Hints per answered junction: the hint count a junction ended with,
  // read from the row that resolved it (right, or bottomed out).
  const resolved = scored.filter((row) => row.predictionCorrect || row.bottomedOut)
  const hints = resolved.reduce((sum, row) => sum + row.hintsRequested, 0)

  return {
    status,
    criteria,
    hintsPerStep: resolved.length > 0 ? Math.round((hints / resolved.length) * 10) / 10 : null,
    missedJunctionTypes,
    masteredAt: masteredAt?.toISOString() ?? null,
  }
}

/** Whether every applicable criterion is met now, the moment masteredAt records. */
export function meetsEveryCriterion(mastery: TopicMastery): boolean {
  return mastery.criteria.every((criterion) => !criterion.applicable || criterion.met)
}
