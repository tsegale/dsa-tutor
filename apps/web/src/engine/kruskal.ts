import type { AlgorithmSnapshot, GraphAlgorithmState, GraphNode, WeightedAdjacencyList } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface KruskalState extends GraphAlgorithmState {
  fromNode?: string
  toNode?: string
  weight?: number
  sameComponent?: boolean
  /** Every edge, sorted ascending by weight - the "edges being sorted"
   * panel reads this directly. */
  sortedEdges?: [string, string, number][]
  /** Index into sortedEdges of the edge currently being considered. */
  edgeIndex?: number
}

// Indices match PseudocodePanel's 'kruskal' array exactly:
//   0: 'kruskal(graph):'
//   1: '  sort all edges ascending by weight'
//   2: '  for each edge (u, v, weight), in sorted order:'
//   3: '    if find(u) != find(v):'
//   4: '      union(u, v); add edge to MST'
//   5: '    else: skip - adding it would create a cycle'
const PSEUDOCODE_LINE = {
  START: 0,
  SORT: 1,
  FOR_EDGES: 2,
  CHECK: 3,
  ADD: 4,
  SKIP: 5,
} as const

class UnionFind {
  private parent = new Map<string, string>()

  constructor(ids: string[]) {
    for (const id of ids) this.parent.set(id, id)
  }

  find(x: string): string {
    let root = x
    while (this.parent.get(root) !== root) root = this.parent.get(root)!
    // Path compression.
    let node = x
    while (this.parent.get(node) !== root) {
      const next = this.parent.get(node)!
      this.parent.set(node, root)
      node = next
    }
    return root
  }

  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

function collectUniqueEdges(nodes: GraphNode[], adjacency: WeightedAdjacencyList): [string, string, number][] {
  const seen = new Set<string>()
  const edges: [string, string, number][] = []
  for (const node of nodes) {
    for (const edge of adjacency[node.id] ?? []) {
      const key = [node.id, edge.to].sort().join('-')
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([node.id, edge.to, edge.weight])
    }
  }
  return edges
}

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: KruskalState
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
      sortedEdges: params.state.sortedEdges ? [...params.state.sortedEdges] : [],
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
 * Pure snapshot engine for Kruskal's minimum spanning tree algorithm.
 * Sorts every (deduplicated, undirected) edge ascending by weight, then
 * greedily considers each in order: Union-Find answers "would this edge
 * connect two already-connected components?" in near-O(1) - if not, the
 * edge is safe to add (it cannot create a cycle); if so, it's skipped.
 * Stops as soon as the MST has n-1 edges (one edge short of a cycle by
 * definition means every remaining node is already connected).
 */
export function kruskalEngine(nodes: GraphNode[], adjacency: WeightedAdjacencyList): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const sortedEdges = collectUniqueEdges(nodes, adjacency).sort((a, b) => a[2] - b[2])
  const uf = new UnionFind(nodes.map((n) => n.id))
  const mstEdges: [string, string, number][] = []
  let mstCost = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<KruskalState>): KruskalState {
    return {
      nodes,
      adjacency,
      directed: false,
      visited: [],
      frontier: [],
      currentNode: null,
      pathNodes: [],
      pathEdges: [],
      mstEdges,
      mstCost,
      sortedEdges,
      ...overrides,
    }
  }

  push({
    description: `Sorted all ${sortedEdges.length} edges ascending by weight: [${sortedEdges.map(([a, b, w]) => `${a}-${b}(${w})`).join(', ')}].`,
    pseudocodeLine: PSEUDOCODE_LINE.SORT,
    isPredictionRequired: false,
    state: baseState({}),
  })

  const targetEdgeCount = nodes.length - 1

  for (let i = 0; i < sortedEdges.length; i++) {
    const [from, to, weight] = sortedEdges[i]
    const sameComponent = uf.find(from) === uf.find(to)

    push({
      description: `Considering edge ${from}-${to} (weight ${weight}). Are ${from} and ${to} already in the same component?`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK,
      isPredictionRequired: true,
      state: baseState({ fromNode: from, toNode: to, weight, sameComponent, edgeIndex: i, pathEdges: [[from, to]] }),
      criticalJunctionType: CriticalJunctionType.UNION_FIND_CHECK,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    if (!sameComponent) {
      uf.union(from, to)
      mstEdges.push([from, to, weight])
      mstCost += weight
      push({
        description: `Added ${from}-${to} to the MST. Running cost: ${mstCost}.`,
        pseudocodeLine: PSEUDOCODE_LINE.ADD,
        isPredictionRequired: false,
        state: baseState({ fromNode: from, toNode: to, weight, edgeIndex: i, mstEdges: [...mstEdges], mstCost }),
      })
    } else {
      push({
        description: `Skipped ${from}-${to} - adding it would create a cycle.`,
        pseudocodeLine: PSEUDOCODE_LINE.SKIP,
        isPredictionRequired: false,
        state: baseState({ fromNode: from, toNode: to, weight, edgeIndex: i }),
      })
    }

    if (mstEdges.length === targetEdgeCount) break
  }

  push({
    description: `Kruskal's algorithm complete. MST has ${mstEdges.length} edges, total cost ${mstCost}.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({}),
    isFinalStep: true,
  })

  return snapshots
}
