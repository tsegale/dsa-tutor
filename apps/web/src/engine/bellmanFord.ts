import type { AlgorithmSnapshot, GraphAlgorithmState, GraphNode, WeightedAdjacencyList } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

/** A small demo graph with one negative edge (B->D) but no negative
 * cycle - the case Dijkstra cannot handle correctly but Bellman-Ford
 * can, which is the entire reason to teach it as a separate algorithm. */
export const BELLMAN_FORD_DEFAULT: { nodes: GraphNode[]; adjacency: WeightedAdjacencyList } = {
  nodes: [
    { id: 'A', label: 'A', x: 0.1, y: 0.5 },
    { id: 'B', label: 'B', x: 0.35, y: 0.2 },
    { id: 'C', label: 'C', x: 0.35, y: 0.8 },
    { id: 'D', label: 'D', x: 0.6, y: 0.5 },
    { id: 'E', label: 'E', x: 0.85, y: 0.5 },
  ],
  adjacency: {
    A: [{ to: 'B', weight: 6 }, { to: 'C', weight: 4 }],
    B: [{ to: 'D', weight: -3 }],
    C: [{ to: 'D', weight: 5 }],
    D: [{ to: 'E', weight: 2 }],
    E: [],
  },
}

/** Same shape but B->A closes a negative-weight cycle (A->B->A costs
 * 6 + -8 = -2), for demonstrating negative-cycle detection specifically. */
export const BELLMAN_FORD_NEGATIVE_CYCLE: { nodes: GraphNode[]; adjacency: WeightedAdjacencyList } = {
  nodes: BELLMAN_FORD_DEFAULT.nodes,
  adjacency: {
    ...BELLMAN_FORD_DEFAULT.adjacency,
    B: [{ to: 'D', weight: -3 }, { to: 'A', weight: -8 }],
  },
}

export interface BellmanFordState extends GraphAlgorithmState {
  passNumber?: number
  totalPasses?: number
  anyChanged?: boolean
  hasNegativeCycle?: boolean
}

// Indices match PseudocodePanel's 'bellman-ford' array exactly:
//   0: 'bellman_ford(graph, start):'
//   1: '  dist[start] = 0; dist[all others] = infinity'
//   2: '  repeat V-1 times:'
//   3: '    for every edge (u, v, weight):'
//   4: '      if dist[u] + weight < dist[v]: dist[v] = dist[u] + weight (relax)'
//   5: '  one more pass: if anything still relaxes, a negative cycle exists'
const PSEUDOCODE_LINE = {
  START: 0,
  INIT: 1,
  FOR_PASSES: 2,
  FOR_EDGES: 3,
  RELAX: 4,
  CYCLE_CHECK: 5,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: BellmanFordState
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
      visited: [...params.state.visited],
      frontier: [...params.state.frontier],
      pathNodes: [...params.state.pathNodes],
      pathEdges: [...params.state.pathEdges],
      distances: { ...params.state.distances },
      parents: { ...params.state.parents },
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.NODE_GRAPH,
  }
}

/**
 * Pure snapshot engine for Bellman-Ford. Relaxes every edge in the graph
 * on each of V-1 passes (unlike Dijkstra, no priority queue - order
 * doesn't matter for correctness, only for how many passes convergence
 * takes), tracking whether any distance changed that pass so a
 * BELLMAN_PASS_COMPLETE prediction can ask whether the algorithm is done
 * early or must continue. After V-1 passes, one extra pass checks for a
 * negative-weight cycle (a relaxation that would still succeed means
 * some cycle keeps reducing cost forever - no finite shortest path
 * exists).
 */
export function bellmanFordEngine(
  nodes: GraphNode[],
  adjacency: WeightedAdjacencyList,
  directed: boolean,
  startId: string,
): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const distances: Record<string, number> = {}
  const parents: Record<string, string | null> = { [startId]: null }
  for (const node of nodes) distances[node.id] = node.id === startId ? 0 : Infinity
  const totalPasses = Math.max(1, nodes.length - 1)

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<BellmanFordState>): BellmanFordState {
    return {
      nodes,
      adjacency,
      directed,
      visited: [],
      frontier: [],
      currentNode: null,
      pathNodes: [],
      pathEdges: [],
      distances,
      parents,
      ...overrides,
    }
  }

  push({
    description: `Starting Bellman-Ford from ${startId}. Every edge will be relaxed on each of ${totalPasses} pass(es).`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({}),
  })

  let converged = false

  for (let pass = 1; pass <= totalPasses; pass++) {
    let anyChanged = false

    for (const u of nodes.map((n) => n.id)) {
      if (distances[u] === Infinity) continue
      for (const edge of adjacency[u] ?? []) {
        const newDist = distances[u] + edge.weight
        if (newDist < distances[edge.to]) {
          distances[edge.to] = newDist
          parents[edge.to] = u
          anyChanged = true
          push({
            description: `Relaxed ${u} -> ${edge.to}: distance updated to ${newDist}.`,
            pseudocodeLine: PSEUDOCODE_LINE.RELAX,
            isPredictionRequired: false,
            state: baseState({ currentNode: u, passNumber: pass, totalPasses }),
          })
        }
      }
    }

    push({
      description: `Pass ${pass} of ${totalPasses} complete. ${anyChanged ? 'At least one distance changed.' : 'No distance changed.'}`,
      pseudocodeLine: PSEUDOCODE_LINE.FOR_PASSES,
      isPredictionRequired: true,
      state: baseState({ passNumber: pass, totalPasses, anyChanged }),
      criticalJunctionType: CriticalJunctionType.BELLMAN_PASS_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    if (!anyChanged) {
      converged = true
      break
    }
  }

  let hasNegativeCycle = false
  if (!converged) {
    for (const u of nodes.map((n) => n.id)) {
      if (distances[u] === Infinity) continue
      for (const edge of adjacency[u] ?? []) {
        if (distances[u] + edge.weight < distances[edge.to]) {
          hasNegativeCycle = true
          break
        }
      }
      if (hasNegativeCycle) break
    }
  }

  push({
    description: hasNegativeCycle
      ? 'A negative-weight cycle was detected - no shortest path is well-defined for nodes it can reach.'
      : `Bellman-Ford complete after ${converged ? 'converging early' : `all ${totalPasses} passes`}. No negative cycle exists.`,
    pseudocodeLine: PSEUDOCODE_LINE.CYCLE_CHECK,
    isPredictionRequired: false,
    state: baseState({ hasNegativeCycle }),
    isFinalStep: true,
  })

  return snapshots
}
