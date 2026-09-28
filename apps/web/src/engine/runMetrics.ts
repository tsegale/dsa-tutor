import { CriticalJunctionType, JunctionDifficulty, PredictionType, type AlgorithmSnapshot, type RunMetrics } from '@dsa-tutor/types'

/**
 * Run-level work counters and the complexity-prediction junction (Week 2
 * 2C), shared by the three study-topic engines. Both are pure post-passes
 * over a finished snapshot array: existing snapshot fields are never
 * changed, only the additive `metrics` field (and, when asked, one extra
 * junction before the final step) is added.
 */

export interface MetricRules {
  isComparison: (snapshot: AlgorithmSnapshot) => boolean
  isSwap?: (snapshot: AlgorithmSnapshot) => boolean
  isVisit?: (snapshot: AlgorithmSnapshot) => boolean
}

/** Adds cumulative counters (up to and including each step) to every snapshot. */
export function withRunMetrics(snapshots: AlgorithmSnapshot[], n: number, rules: MetricRules): AlgorithmSnapshot[] {
  let comparisons = 0
  let swaps = 0
  let visits = 0
  return snapshots.map((snapshot) => {
    if (rules.isComparison(snapshot)) comparisons++
    if (rules.isSwap?.(snapshot)) swaps++
    if (rules.isVisit?.(snapshot)) visits++
    const metrics: RunMetrics = { n, comparisons }
    if (rules.isSwap) metrics.swaps = swaps
    if (rules.isVisit) metrics.visits = visits
    return { ...snapshot, metrics }
  })
}

/**
 * Inserts one conceptual COMPLEXITY_PREDICTION junction just before the
 * final step: "roughly how many comparisons did this run make?". It carries
 * the run's final counters, which the tiles are built from, so grading is
 * deterministic - no model involvement. `question` must not contain the
 * answer. Runs without a final step, or with nothing compared, are left alone.
 */
export function appendComplexityPrediction(snapshots: AlgorithmSnapshot[], question: string): AlgorithmSnapshot[] {
  const final = snapshots[snapshots.length - 1]
  if (!final?.isFinalStep || !final.metrics || final.metrics.comparisons === 0) return snapshots
  const junction: AlgorithmSnapshot = {
    ...final,
    description: question,
    isPredictionRequired: true,
    isFinalStep: false,
    predictionType: PredictionType.TILE_GRID,
    criticalJunctionType: CriticalJunctionType.COMPLEXITY_PREDICTION,
    junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
  }
  return [...snapshots.slice(0, -1), junction, { ...final, stepIndex: final.stepIndex + 1 }]
}

/**
 * The four counts offered for a complexity prediction: the measured count,
 * plus three wrong answers a learner might reach for - a linear-ish value
 * (one comparison per element after the first), an n log n value, and n^2
 * (every pair counted both ways). Collisions with the correct count or each
 * other are nudged so all four are distinct.
 */
export function complexityPredictionOptions(n: number, correct: number): { correct: number; wrong: number[] } {
  const candidates = [Math.max(1, n - 1), Math.max(1, Math.round(n * Math.log2(Math.max(n, 2)))), n * n, 2 * n, n + 1]
  const wrong: number[] = []
  for (const value of candidates) {
    let v = value
    while (v === correct || wrong.includes(v)) v++
    wrong.push(v)
    if (wrong.length === 3) break
  }
  return { correct, wrong }
}
