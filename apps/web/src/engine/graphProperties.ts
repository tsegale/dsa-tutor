import type { AlgorithmSnapshot, GraphAlgorithmState, GraphNode, AdjacencyList } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

function neighborsOf(adjacency: AdjacencyList, id: string): string[] {
  return [...(adjacency[id] ?? [])].sort((a, b) => a.localeCompare(b))
}

function baseGraphState(nodes: GraphNode[], adjacency: AdjacencyList, directed: boolean, overrides: Partial<GraphAlgorithmState>): GraphAlgorithmState {
  return {
    nodes,
    adjacency,
    directed,
    visited: [],
    frontier: [],
    currentNode: null,
    pathNodes: [],
    pathEdges: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------
// Cycle detection - DFS with WHITE/GRAY/BLACK colouring.
// ---------------------------------------------------------------------

export type NodeColor = 'WHITE' | 'GRAY' | 'BLACK'

export interface CycleDetectionState extends GraphAlgorithmState {
  colors?: Record<string, NodeColor>
  cycleFound?: boolean
  cycleEdge?: [string, string]
  isBackEdge?: boolean
}

// Indices match PseudocodePanel's 'cycle-detection' array exactly:
//   0: 'has_cycle(graph):'
//   1: '  colour every node WHITE'
//   2: '  dfs(node): colour node GRAY'
//   3: '    for each neighbour: if GRAY -> back-edge, cycle found'
//   4: '    if WHITE: recurse'
//   5: '  colour node BLACK when finished'
const CYCLE_PSEUDOCODE_LINE = { START: 0, INIT: 1, VISIT: 2, CHECK: 3, RECURSE: 4, FINISH: 5 } as const

interface CycleSnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: CycleDetectionState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeCycleSnapshot(params: CycleSnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: { ...params.state, colors: { ...params.state.colors }, visited: [...params.state.visited], frontier: [...params.state.frontier] },
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
 * Pure snapshot engine for cycle detection via DFS colouring. WHITE =
 * never visited, GRAY = on the current DFS path (an ancestor of the
 * node being processed), BLACK = fully finished. An edge to a GRAY node
 * is a "back-edge" - it points at one of the current node's own
 * ancestors, which is exactly what makes a cycle. An edge to a BLACK
 * node (directed graphs only) is a forward/cross edge, not a cycle. For
 * undirected graphs, the edge straight back to the node's own parent is
 * excluded from the check - it's the same edge walked in both
 * directions, not a real second path.
 */
export function cycleDetectionEngine(nodes: GraphNode[], adjacency: AdjacencyList, directed: boolean): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const colors: Record<string, NodeColor> = Object.fromEntries(nodes.map((n) => [n.id, 'WHITE']))
  const parent: Record<string, string | null> = {}
  let cycleFound = false
  let cycleEdge: [string, string] | undefined

  function push(params: Omit<CycleSnapshotParams, 'stepIndex'>) {
    snapshots.push(makeCycleSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function state(overrides: Partial<CycleDetectionState>): CycleDetectionState {
    return { ...baseGraphState(nodes, adjacency, directed, {}), colors, cycleFound, cycleEdge, ...overrides }
  }

  function dfsFrom(root: string) {
    const stack: { id: string; idx: number }[] = [{ id: root, idx: 0 }]
    colors[root] = 'GRAY'
    push({ description: `Visiting ${root} (GRAY - on the current path).`, pseudocodeLine: CYCLE_PSEUDOCODE_LINE.VISIT, isPredictionRequired: false, state: state({ currentNode: root, visited: Object.keys(colors).filter((k) => colors[k] !== 'WHITE') }) })

    while (stack.length > 0 && !cycleFound) {
      const frame = stack[stack.length - 1]
      const neighbours = neighborsOf(adjacency, frame.id)

      if (frame.idx < neighbours.length) {
        const candidate = neighbours[frame.idx]
        frame.idx++
        if (!directed && parent[frame.id] === candidate) continue // the edge back to our own parent, not a real cycle

        if (colors[candidate] === 'GRAY') {
          cycleFound = true
          cycleEdge = [frame.id, candidate]
          push({
            description: `Edge ${frame.id} -> ${candidate}: ${candidate} is GRAY (an ancestor). Is this a back-edge that creates a cycle?`,
            pseudocodeLine: CYCLE_PSEUDOCODE_LINE.CHECK,
            isPredictionRequired: true,
            state: state({ currentNode: frame.id, cycleFound: true, cycleEdge, isBackEdge: true }),
            criticalJunctionType: CriticalJunctionType.CYCLE_FOUND,
            junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          })
          return
        }

        if (colors[candidate] === 'BLACK') {
          push({
            description: `Edge ${frame.id} -> ${candidate}: ${candidate} is BLACK (already finished). Is this a back-edge that creates a cycle?`,
            pseudocodeLine: CYCLE_PSEUDOCODE_LINE.CHECK,
            isPredictionRequired: true,
            state: state({ currentNode: frame.id, isBackEdge: false, cycleEdge: [frame.id, candidate] }),
            criticalJunctionType: CriticalJunctionType.CYCLE_FOUND,
            junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          })
          continue
        }

        // WHITE: a normal tree edge - descend.
        parent[candidate] = frame.id
        colors[candidate] = 'GRAY'
        stack.push({ id: candidate, idx: 0 })
        push({ description: `Visiting ${candidate} via ${frame.id} (GRAY - on the current path).`, pseudocodeLine: CYCLE_PSEUDOCODE_LINE.RECURSE, isPredictionRequired: false, state: state({ currentNode: candidate, visited: Object.keys(colors).filter((k) => colors[k] !== 'WHITE') }) })
      } else {
        colors[frame.id] = 'BLACK'
        stack.pop()
        push({ description: `${frame.id} finished (BLACK).`, pseudocodeLine: CYCLE_PSEUDOCODE_LINE.FINISH, isPredictionRequired: false, state: state({ currentNode: frame.id, visited: Object.keys(colors).filter((k) => colors[k] !== 'WHITE') }) })
      }
    }
  }

  push({ description: 'Starting cycle detection. Every node begins WHITE (unvisited).', pseudocodeLine: CYCLE_PSEUDOCODE_LINE.START, isPredictionRequired: false, state: state({}) })

  for (const node of nodes) {
    if (cycleFound) break
    if (colors[node.id] === 'WHITE') dfsFrom(node.id)
  }

  push({
    description: cycleFound ? `Cycle detected via back-edge ${cycleEdge![0]} -> ${cycleEdge![1]}.` : 'No cycle exists - every edge leads to a WHITE or BLACK node, never back to a GRAY ancestor.',
    pseudocodeLine: CYCLE_PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: state({}),
    isFinalStep: true,
  })

  return snapshots
}

// ---------------------------------------------------------------------
// Connected components - BFS from every unvisited node.
// ---------------------------------------------------------------------

export interface ConnectedComponentsState extends GraphAlgorithmState {
  /** Components fully discovered so far (progress, not the final answer). */
  componentCount?: number
  /** The graph's true total component count, known from a silent dry run
   * before the visible traversal starts - read directly by
   * PredictionZone's NEW_COMPONENT tile case and by the AI service's
   * evaluation as the correct answer, so it stays a flat top-level field
   * rather than something derived from partial progress. */
  totalComponents?: number
}

// Indices match PseudocodePanel's 'connected-components' array exactly:
//   0: 'connected_components(graph):'
//   1: '  count = 0'
//   2: '  for each unvisited node:'
//   3: '    count += 1; BFS/DFS from it, marking everything reached with this component'
const CC_PSEUDOCODE_LINE = { START: 0, INIT: 1, FOR_NODES: 2, EXPLORE: 3 } as const

function countComponents(nodes: GraphNode[], adjacency: AdjacencyList): number {
  const seen = new Set<string>()
  let count = 0
  for (const node of nodes) {
    if (seen.has(node.id)) continue
    count++
    const queue = [node.id]
    seen.add(node.id)
    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const n of adjacency[cur] ?? []) {
        if (!seen.has(n)) {
          seen.add(n)
          queue.push(n)
        }
      }
      // Undirected adjacency lists are assumed symmetric (as authored by
      // every preset in this app); a purely one-directional edge would
      // need the reverse direction added here too.
    }
  }
  return count
}

interface CCSnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: ConnectedComponentsState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeCCSnapshot(params: CCSnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: { ...params.state, components: { ...params.state.components }, visited: [...params.state.visited], frontier: [...params.state.frontier] },
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
 * Pure snapshot engine for finding connected components via BFS from
 * every unvisited node. Each component gets an incrementing index (read
 * by NodeGraphCanvas as a colour). The total component count is known
 * in advance (a silent dry run) so NEW_COMPONENT can ask a genuine
 * forward-looking question - "how many will there be in total?" - at
 * the start of every new component, not just retroactively confirm one
 * that already finished.
 */
export function connectedComponentsEngine(nodes: GraphNode[], adjacency: AdjacencyList): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const totalComponents = countComponents(nodes, adjacency)
  const components: Record<string, number> = {}
  const visited: string[] = []

  function push(params: Omit<CCSnapshotParams, 'stepIndex'>) {
    snapshots.push(makeCCSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function state(overrides: Partial<ConnectedComponentsState>): ConnectedComponentsState {
    return { ...baseGraphState(nodes, adjacency, false, { visited }), components: { ...components }, totalComponents, ...overrides }
  }

  push({ description: `Finding connected components across ${nodes.length} nodes.`, pseudocodeLine: CC_PSEUDOCODE_LINE.START, isPredictionRequired: false, state: state({}) })

  let componentIndex = 0
  for (const node of nodes) {
    if (components[node.id] !== undefined) continue

    push({
      description: `Starting a new component from ${node.id}. How many components will this graph have in total?`,
      pseudocodeLine: CC_PSEUDOCODE_LINE.FOR_NODES,
      isPredictionRequired: true,
      state: state({ currentNode: node.id, componentCount: componentIndex + 1 }),
      criticalJunctionType: CriticalJunctionType.NEW_COMPONENT,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    const queue = [node.id]
    components[node.id] = componentIndex
    visited.push(node.id)
    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const n of adjacency[cur] ?? []) {
        if (components[n] === undefined) {
          components[n] = componentIndex
          visited.push(n)
          queue.push(n)
        }
      }
    }

    push({
      description: `Component ${componentIndex + 1} complete: {${nodes.filter((n) => components[n.id] === componentIndex).map((n) => n.id).join(', ')}}.`,
      pseudocodeLine: CC_PSEUDOCODE_LINE.EXPLORE,
      isPredictionRequired: false,
      state: state({ currentNode: null, componentCount: componentIndex + 1 }),
    })

    componentIndex++
  }

  push({
    description: `Found ${totalComponents} connected component(s).`,
    pseudocodeLine: CC_PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: state({ componentCount: totalComponents }),
    isFinalStep: true,
  })

  return snapshots
}

// ---------------------------------------------------------------------
// Topological sort - DFS, prepending to the output at finish time.
// ---------------------------------------------------------------------

// Indices match PseudocodePanel's 'topological-sort' array exactly:
//   0: 'topological_sort(dag):'
//   1: '  colour every node WHITE'
//   2: '  dfs(node): colour node GRAY'
//   3: '    for each unvisited neighbour: recurse'
//   4: '  colour node BLACK; prepend node to the output order'
const TOPO_PSEUDOCODE_LINE = { START: 0, INIT: 1, VISIT: 2, RECURSE: 3, FINISH: 4 } as const

interface TopoSnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: GraphAlgorithmState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeTopoSnapshot(params: TopoSnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: { ...params.state, topoOrder: [...(params.state.topoOrder ?? [])], visited: [...params.state.visited], frontier: [...params.state.frontier] },
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
 * Pure snapshot engine for DFS-based topological sort of a DAG. A node
 * is prepended to the output the moment its DFS finishes (every one of
 * its neighbours is already fully processed) - prepending rather than
 * appending-then-reversing means `topoOrder` is a valid topological
 * order of everything finished so far at every intermediate step, not
 * just at the very end. Assumes the input has no cycle (cycleDetectionEngine
 * is the place to check that first).
 */
export function topologicalSortEngine(nodes: GraphNode[], adjacency: AdjacencyList): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const colors: Record<string, NodeColor> = Object.fromEntries(nodes.map((n) => [n.id, 'WHITE']))
  const topoOrder: string[] = []
  const visited: string[] = []

  function push(params: Omit<TopoSnapshotParams, 'stepIndex'>) {
    snapshots.push(makeTopoSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function state(overrides: Partial<GraphAlgorithmState>): GraphAlgorithmState {
    return { ...baseGraphState(nodes, adjacency, true, { visited }), topoOrder: [...topoOrder], ...overrides }
  }

  function dfsFrom(root: string) {
    const stack: { id: string; idx: number }[] = [{ id: root, idx: 0 }]
    colors[root] = 'GRAY'
    visited.push(root)
    push({ description: `Visiting ${root}.`, pseudocodeLine: TOPO_PSEUDOCODE_LINE.VISIT, isPredictionRequired: false, state: state({ currentNode: root }) })

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      const neighbours = neighborsOf(adjacency, frame.id)

      if (frame.idx < neighbours.length) {
        const candidate = neighbours[frame.idx]
        frame.idx++
        if (colors[candidate] !== 'WHITE') continue
        colors[candidate] = 'GRAY'
        visited.push(candidate)
        stack.push({ id: candidate, idx: 0 })
        push({ description: `Visiting ${candidate} via ${frame.id}.`, pseudocodeLine: TOPO_PSEUDOCODE_LINE.RECURSE, isPredictionRequired: false, state: state({ currentNode: candidate }) })
      } else {
        colors[frame.id] = 'BLACK'
        stack.pop()

        const stillOpen = stack.map((f) => f.id)
        const distractorPool = nodes.map((n) => n.id).filter((id) => id !== frame.id && !topoOrder.includes(id) && !stillOpen.includes(id))
        if (distractorPool.length > 0) {
          push({
            description: `${frame.id} has no more unvisited neighbours. Which node is added to the topological order next?`,
            pseudocodeLine: TOPO_PSEUDOCODE_LINE.FINISH,
            isPredictionRequired: true,
            state: state({ currentNode: frame.id }),
            criticalJunctionType: CriticalJunctionType.TOPOLOGICAL_ORDER,
            junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
          })
        }

        topoOrder.unshift(frame.id)
        push({ description: `${frame.id} finished - prepended to the topological order: [${topoOrder.join(' → ')}].`, pseudocodeLine: TOPO_PSEUDOCODE_LINE.FINISH, isPredictionRequired: false, state: state({ currentNode: frame.id }) })
      }
    }
  }

  push({ description: 'Starting topological sort via DFS finish order.', pseudocodeLine: TOPO_PSEUDOCODE_LINE.START, isPredictionRequired: false, state: state({}) })

  for (const node of nodes) {
    if (colors[node.id] === 'WHITE') dfsFrom(node.id)
  }

  push({
    description: `Topological sort complete: [${topoOrder.join(' → ')}].`,
    pseudocodeLine: TOPO_PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: state({}),
    isFinalStep: true,
  })

  return snapshots
}
