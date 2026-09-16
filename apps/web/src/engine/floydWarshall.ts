import type { AlgorithmSnapshot, WeightedAdjacencyList } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

/** Distance-matrix snapshot state for MatrixCanvas - Floyd-Warshall is
 * the only algorithm in this app that isn't node-and-edge or grid
 * shaped, so it gets its own small state type rather than forcing it
 * into GraphAlgorithmState. */
export interface MatrixState {
  nodeIds: string[]
  dist: number[][]
  /** The intermediate vertex currently being routed through; null before
   * the first pass and after the algorithm completes. */
  k: number | null
  i: number | null
  j: number | null
  /** Cells updated on this exact step - MatrixCanvas flashes them green. */
  updated: [number, number][]
}

// Indices match PseudocodePanel's 'floyd-warshall' array exactly:
//   0: 'floyd_warshall(dist):'
//   1: '  for k from 0 to n-1:'
//   2: '    for i from 0 to n-1:'
//   3: '      for j from 0 to n-1:'
//   4: '        if dist[i][k] + dist[k][j] < dist[i][j]: dist[i][j] = dist[i][k] + dist[k][j]'
const PSEUDOCODE_LINE = {
  START: 0,
  FOR_K: 1,
  FOR_I: 2,
  FOR_J: 3,
  CHECK_UPDATE: 4,
} as const

// Checking every single (i, j) pair as its own prediction would be far
// too many for an n=5 graph (5^3 = 125 checks) - only every Nth
// non-trivial check (i != j, i != k, j != k) becomes a prediction.
const PROMPT_EVERY_NTH_CHECK = 6

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: MatrixState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: {
      ...params.state,
      dist: params.state.dist.map((row) => [...row]),
      updated: [...params.state.updated],
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.MATRIX,
  }
}

/**
 * Pure snapshot engine for Floyd-Warshall all-pairs shortest paths.
 * Builds the initial distance matrix from `adjacency` (0 on the
 * diagonal, edge weight where one exists, Infinity otherwise), then for
 * every intermediate vertex k, checks every (i, j) pair: does routing
 * through k improve the known distance? Emits MATRIX_UPDATE for a
 * sample of the non-trivial checks.
 */
export function floydWarshallEngine(nodeIds: string[], adjacency: WeightedAdjacencyList): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const n = nodeIds.length
  const indexOf = new Map(nodeIds.map((id, i) => [id, i]))

  const dist: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)),
  )
  for (const from of nodeIds) {
    const i = indexOf.get(from)!
    for (const edge of adjacency[from] ?? []) {
      const j = indexOf.get(edge.to)
      if (j === undefined) continue
      dist[i][j] = Math.min(dist[i][j], edge.weight)
    }
  }

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<MatrixState>): MatrixState {
    return { nodeIds, dist, k: null, i: null, j: null, updated: [], ...overrides }
  }

  push({
    description: `Starting Floyd-Warshall on ${n} nodes. Initial distances come directly from the graph's edges.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({}),
  })

  let checkCount = 0

  for (let k = 0; k < n; k++) {
    push({
      description: `Considering ${nodeIds[k]} as an intermediate vertex. Can routing through it shorten any pair's distance?`,
      pseudocodeLine: PSEUDOCODE_LINE.FOR_K,
      isPredictionRequired: false,
      state: baseState({ k }),
    })

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const throughK = dist[i][k] + dist[k][j]
        const improves = throughK < dist[i][j]
        const nonTrivial = i !== j && i !== k && j !== k
        checkCount++
        const shouldPrompt = nonTrivial && checkCount % PROMPT_EVERY_NTH_CHECK === 0

        if (shouldPrompt) {
          push({
            description: `Does dist[${nodeIds[i]}][${nodeIds[k]}] + dist[${nodeIds[k]}][${nodeIds[j]}] improve dist[${nodeIds[i]}][${nodeIds[j]}]?`,
            pseudocodeLine: PSEUDOCODE_LINE.CHECK_UPDATE,
            isPredictionRequired: true,
            state: baseState({ k, i, j }),
            criticalJunctionType: CriticalJunctionType.MATRIX_UPDATE,
            junctionDifficulty: JunctionDifficulty.PROCEDURAL,
          })
        }

        if (improves) {
          dist[i][j] = throughK
          push({
            description: `Updated dist[${nodeIds[i]}][${nodeIds[j]}] to ${throughK} via ${nodeIds[k]}.`,
            pseudocodeLine: PSEUDOCODE_LINE.CHECK_UPDATE,
            isPredictionRequired: false,
            state: baseState({ k, i, j, updated: [[i, j]] }),
          })
        }
      }
    }
  }

  push({
    description: 'Floyd-Warshall complete. Every cell now holds the shortest distance between that row and column pair.',
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({}),
    isFinalStep: true,
  })

  return snapshots
}
