import type { AlgorithmSnapshot, GraphAlgorithmState, GraphNode, WeightedAdjacencyList } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

/** Extra fields only Dijkstra (and Bellman-Ford, which reuses this same
 * shape) populate - read directly by PredictionZone's EDGE_RELAX tile
 * case and by the AI service's evaluation, so they stay flat top-level
 * fields rather than nested. */
export interface DijkstraState extends GraphAlgorithmState {
  relaxFrom?: string
  relaxTo?: string
  relaxWeight?: number
  currentDist?: number
  newDist?: number
}

// Indices match PseudocodePanel's 'dijkstra' array exactly:
//   0: 'dijkstra(graph, start):'
//   1: '  dist[start] = 0; dist[all others] = infinity'
//   2: '  while priority queue not empty:'
//   3: '    u = node with minimum dist, not yet finalised'
//   4: '    finalise u'
//   5: '    for each edge (u, v, weight):'
//   6: '      if dist[u] + weight < dist[v]: dist[v] = dist[u] + weight (relax)'
const PSEUDOCODE_LINE = {
  START: 0,
  INIT: 1,
  LOOP: 2,
  SELECT_MIN: 3,
  FINALISE: 4,
  FOR_EDGES: 5,
  RELAX: 6,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: DijkstraState
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
 * Pure snapshot engine for Dijkstra's shortest-path algorithm. Uses a
 * simple linear-scan "priority queue" (fine at teaching-demo scale,
 * matching floydWarshall.ts's own O(n) scan-for-min) - not the leading
 * factor in why this is O(V^2 + E) rather than O(E log V) with a real
 * heap, but exactly how a from-scratch Dijkstra is usually first taught.
 * Emits EDGE_RELAX for every edge considered out of the node just
 * finalised.
 */
export function dijkstraEngine(
  nodes: GraphNode[],
  adjacency: WeightedAdjacencyList,
  directed: boolean,
  startId: string,
  targetId: string,
): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const distances: Record<string, number> = {}
  const parents: Record<string, string | null> = { [startId]: null }
  const visited: string[] = []
  for (const node of nodes) distances[node.id] = node.id === startId ? 0 : Infinity
  let pq: string[] = nodes.map((n) => n.id)

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<DijkstraState>): DijkstraState {
    return {
      nodes,
      adjacency,
      directed,
      visited,
      frontier: pq,
      currentNode: null,
      pathNodes: [],
      pathEdges: [],
      distances,
      parents,
      ...overrides,
    }
  }

  push({
    description: `Starting Dijkstra from ${startId}, looking for ${targetId}. Every other node starts at distance infinity.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({}),
  })

  function reconstructPath(target: string): { pathNodes: string[]; pathEdges: [string, string][] } {
    const pathNodes: string[] = []
    let node: string | null = target
    while (node !== null) {
      pathNodes.unshift(node)
      node = parents[node] ?? null
    }
    const pathEdges: [string, string][] = pathNodes.slice(0, -1).map((n, i) => [n, pathNodes[i + 1]])
    return { pathNodes, pathEdges }
  }

  while (pq.length > 0) {
    let u = pq[0]
    for (const id of pq) if (distances[id] < distances[u]) u = id
    pq = pq.filter((id) => id !== u)

    if (distances[u] === Infinity) break // remaining nodes are unreachable

    visited.push(u)
    push({
      description: `Finalised ${u} with distance ${distances[u]}. No shorter path to it can exist.`,
      pseudocodeLine: PSEUDOCODE_LINE.FINALISE,
      isPredictionRequired: false,
      state: baseState({ currentNode: u }),
    })

    if (u === targetId) {
      const { pathNodes, pathEdges } = reconstructPath(targetId)
      push({
        description: `${targetId} finalised. Shortest path from ${startId}: [${pathNodes.join(' -> ')}], total distance ${distances[targetId]}.`,
        pseudocodeLine: PSEUDOCODE_LINE.FINALISE,
        isPredictionRequired: false,
        state: baseState({ currentNode: u, pathNodes, pathEdges }),
        isFinalStep: true,
      })
      return snapshots
    }

    for (const edge of adjacency[u] ?? []) {
      if (visited.includes(edge.to)) continue
      const currentDist = distances[edge.to]
      const newDist = distances[u] + edge.weight

      push({
        description: `Does the path through ${u} improve the distance to ${edge.to}? Current: ${currentDist === Infinity ? '∞' : currentDist}, via ${u}: ${newDist}.`,
        pseudocodeLine: PSEUDOCODE_LINE.RELAX,
        isPredictionRequired: true,
        state: baseState({ currentNode: u, relaxFrom: u, relaxTo: edge.to, relaxWeight: edge.weight, currentDist, newDist }),
        criticalJunctionType: CriticalJunctionType.EDGE_RELAX,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })

      if (newDist < currentDist) {
        distances[edge.to] = newDist
        parents[edge.to] = u
        push({
          description: `Relaxed ${edge.to}: distance updated to ${newDist} via ${u}.`,
          pseudocodeLine: PSEUDOCODE_LINE.RELAX,
          isPredictionRequired: false,
          state: baseState({ currentNode: u }),
        })
      }
    }
  }

  push({
    description: `Dijkstra complete. ${targetId} ${distances[targetId] === Infinity ? 'is unreachable' : `is at distance ${distances[targetId]}`} from ${startId}.`,
    pseudocodeLine: PSEUDOCODE_LINE.LOOP,
    isPredictionRequired: false,
    state: baseState({}),
    isFinalStep: true,
  })

  return snapshots
}
