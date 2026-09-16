import type { AlgorithmSnapshot, GraphAlgorithmState, GraphNode, WeightedAdjacencyList } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface PrimState extends GraphAlgorithmState {
  /** Up to 4 candidate edges connecting the MST to a new node, sorted
   * ascending by weight - read directly by PredictionZone's
   * MST_EDGE_SELECT tile case (candidateEdges[0] is always correct). */
  candidateEdges?: [string, string, number][]
}

// Indices match PseudocodePanel's 'prim' array exactly:
//   0: 'prim(graph, start):'
//   1: '  mst = {start}'
//   2: '  while mst does not contain every node:'
//   3: '    find the minimum-weight edge connecting mst to a new node'
//   4: '    add that edge and node to the mst'
const PSEUDOCODE_LINE = {
  START: 0,
  INIT: 1,
  LOOP: 2,
  SELECT_MIN: 3,
  ADD: 4,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: PrimState
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
      mstEdges: params.state.mstEdges ? [...params.state.mstEdges] : [],
      candidateEdges: params.state.candidateEdges ? [...params.state.candidateEdges] : [],
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
 * Pure snapshot engine for Prim's minimum spanning tree algorithm.
 * Grows one connected tree from `startId`: at each step, considers
 * every edge that crosses the boundary between the tree so far and the
 * rest of the graph, and greedily adds the cheapest one (and the new
 * node it reaches). Unlike Kruskal, this never needs a cycle check -
 * every candidate edge reaches a node not yet in the tree by
 * construction, so it can never close a cycle.
 */
export function primEngine(nodes: GraphNode[], adjacency: WeightedAdjacencyList, startId: string): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const inMst = new Set<string>([startId])
  const mstEdges: [string, string, number][] = []
  let mstCost = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<PrimState>): PrimState {
    return {
      nodes,
      adjacency,
      directed: false,
      visited: [...inMst],
      frontier: [],
      currentNode: null,
      pathNodes: [],
      pathEdges: [],
      mstEdges,
      mstCost,
      candidateEdges: [],
      ...overrides,
    }
  }

  push({
    description: `Starting Prim's algorithm from ${startId}. The MST grows one node at a time.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({}),
  })

  while (inMst.size < nodes.length) {
    const candidates: [string, string, number][] = []
    for (const u of inMst) {
      for (const edge of adjacency[u] ?? []) {
        if (!inMst.has(edge.to)) candidates.push([u, edge.to, edge.weight])
      }
    }

    if (candidates.length === 0) break // graph is disconnected from here

    candidates.sort((a, b) => a[2] - b[2])
    const shown = candidates.slice(0, 4)
    const [bestFrom, bestTo, bestWeight] = shown[0]

    push({
      description: `Which edge is the minimum-weight edge connecting the MST to a new node?`,
      pseudocodeLine: PSEUDOCODE_LINE.SELECT_MIN,
      isPredictionRequired: shown.length > 1,
      state: baseState({ candidateEdges: shown, visited: [...inMst] }),
      criticalJunctionType: shown.length > 1 ? CriticalJunctionType.MST_EDGE_SELECT : null,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    inMst.add(bestTo)
    mstEdges.push([bestFrom, bestTo, bestWeight])
    mstCost += bestWeight

    push({
      description: `Added ${bestFrom}-${bestTo} (weight ${bestWeight}) to the MST. Running cost: ${mstCost}.`,
      pseudocodeLine: PSEUDOCODE_LINE.ADD,
      isPredictionRequired: false,
      state: baseState({ visited: [...inMst], currentNode: bestTo, pathEdges: [[bestFrom, bestTo]], mstEdges: [...mstEdges], mstCost }),
    })
  }

  push({
    description: `Prim's algorithm complete. MST has ${mstEdges.length} edges, total cost ${mstCost}.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({ visited: [...inMst] }),
    isFinalStep: true,
  })

  return snapshots
}
