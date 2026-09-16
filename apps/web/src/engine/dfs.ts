import type { AlgorithmSnapshot, GraphAlgorithmState, GraphNode, AdjacencyList, WeightedAdjacencyList } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

// Indices match PseudocodePanel's 'dfs' array exactly:
//   0: 'dfs(node):'
//   1: '  mark node visited; record discovery time'
//   2: '  for each neighbour (in lexicographic order):'
//   3: '    if not visited: dfs(neighbour)'
//   4: '  record finish time'
const PSEUDOCODE_LINE = {
  START: 0,
  DISCOVER: 1,
  FOR_NEIGHBOURS: 2,
  RECURSE: 3,
  FINISH: 4,
} as const

// Prompting on every neighbour choice would fatigue the learner; every
// other new discovery is paused on instead - same convention as bfs.ts's
// PROMPT_EVERY_NTH_DEQUEUE.
const PROMPT_EVERY_NTH_DISCOVERY = 2

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: GraphAlgorithmState
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
      discoveryTime: { ...params.state.discoveryTime },
      finishTime: { ...params.state.finishTime },
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

function neighborsOf(adjacency: AdjacencyList | WeightedAdjacencyList, id: string): string[] {
  const entry = adjacency[id] ?? []
  if (entry.length === 0) return []
  const list = typeof entry[0] === 'string' ? (entry as string[]) : (entry as { to: string }[]).map((e) => e.to)
  return [...list].sort((a, b) => a.localeCompare(b))
}

/**
 * Pure snapshot engine for Depth-First Search over a node-and-edge graph
 * (rendered on NodeGraphCanvas). Iterative (explicit stack of
 * {node, neighbourIndex} frames simulating the recursive call stack) so
 * the snapshot sequence is deterministic and step-countable, tracking
 * discovery time (when a node is first reached) and finish time (when
 * every one of its neighbours has been fully explored) exactly like the
 * recursive textbook algorithm. Visits neighbours in lexicographic
 * order. Covers disconnected graphs by starting a new DFS tree from any
 * node not yet reached once the current one is exhausted.
 */
export function dfsNodeGraphEngine(
  nodes: GraphNode[],
  adjacency: AdjacencyList | WeightedAdjacencyList,
  directed: boolean,
  startId: string,
): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const visited: string[] = []
  const discoveryTime: Record<string, number> = {}
  const finishTime: Record<string, number> = {}
  let time = 0
  let discoveryCount = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<GraphAlgorithmState>): GraphAlgorithmState {
    return {
      nodes,
      adjacency,
      directed,
      visited,
      frontier: [],
      currentNode: null,
      pathNodes: [],
      pathEdges: [],
      discoveryTime,
      finishTime,
      ...overrides,
    }
  }

  function stackIds(stack: { id: string }[]): string[] {
    return stack.map((f) => f.id)
  }

  function runFrom(root: string) {
    const stack: { id: string; neighbourIdx: number }[] = []
    visited.push(root)
    discoveryTime[root] = ++time
    stack.push({ id: root, neighbourIdx: 0 })

    push({
      description: `Discovered ${root} (discovery time ${time}).`,
      pseudocodeLine: PSEUDOCODE_LINE.DISCOVER,
      isPredictionRequired: false,
      state: baseState({ currentNode: root, frontier: stackIds(stack) }),
    })

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      const neighbours = neighborsOf(adjacency, frame.id)

      if (frame.neighbourIdx < neighbours.length) {
        const candidate = neighbours[frame.neighbourIdx]
        frame.neighbourIdx++

        if (visited.includes(candidate)) continue

        discoveryCount++
        const shouldPrompt = discoveryCount % PROMPT_EVERY_NTH_DISCOVERY === 0
        const unvisitedNeighbours = neighbours.filter((n) => !visited.includes(n))

        visited.push(candidate)
        discoveryTime[candidate] = ++time
        stack.push({ id: candidate, neighbourIdx: 0 })

        // Pushed with `candidate` already on top of the stack (frontier),
        // exactly like bfs.ts's own NEXT_NODE_SELECTION convention (the
        // answer is legitimately readable off frontier[frontier.length-1]
        // - a DFS stack - the same way BFS's is readable off queue[0]).
        // The question tests whether the student can read LIFO order
        // correctly, not whether the answer is hidden.
        if (shouldPrompt && unvisitedNeighbours.length > 1) {
          push({
            description: `Which unvisited neighbour of ${frame.id} does DFS explore next?`,
            pseudocodeLine: PSEUDOCODE_LINE.FOR_NEIGHBOURS,
            isPredictionRequired: true,
            state: baseState({ currentNode: frame.id, frontier: stackIds(stack) }),
            criticalJunctionType: CriticalJunctionType.NEXT_NODE_SELECTION,
            junctionDifficulty: JunctionDifficulty.PROCEDURAL,
          })
        }

        push({
          description: `Discovered ${candidate} via ${frame.id} (discovery time ${time}).`,
          pseudocodeLine: PSEUDOCODE_LINE.RECURSE,
          isPredictionRequired: false,
          state: baseState({ currentNode: candidate, frontier: stackIds(stack), pathEdges: [[frame.id, candidate]] }),
        })
      } else {
        finishTime[frame.id] = ++time
        stack.pop()
        push({
          description: `${frame.id} has no more unvisited neighbours - finished (finish time ${time}).`,
          pseudocodeLine: PSEUDOCODE_LINE.FINISH,
          isPredictionRequired: false,
          state: baseState({ currentNode: frame.id, frontier: stackIds(stack) }),
        })
      }
    }
  }

  push({
    description: `Starting Depth-First Search from ${startId}. DFS explores as deep as possible before backtracking.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({}),
  })

  runFrom(startId)
  for (const node of nodes) {
    if (!visited.includes(node.id)) runFrom(node.id)
  }

  push({
    description: `Depth-First Search complete. Visited ${visited.length} of ${nodes.length} nodes.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({ currentNode: null, frontier: [] }),
    isFinalStep: true,
  })

  return snapshots
}
