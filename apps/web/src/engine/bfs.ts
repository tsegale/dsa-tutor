import type { AlgorithmSnapshot, GraphAlgorithmState, GraphNode, AdjacencyList as SharedAdjacencyList, WeightedAdjacencyList } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export type AdjacencyList = Record<string, string[]>

export const DEFAULT_BFS_GRAPH: AdjacencyList = {
  A: ['B', 'C'],
  B: ['A', 'D', 'E'],
  C: ['A', 'F'],
  D: ['B'],
  E: ['B', 'F'],
  F: ['C', 'E', 'G'],
  G: ['F'],
}

export interface BFSState {
  graph: AdjacencyList
  startNode: string
  targetNode: string
  /** Nodes fully processed (dequeued). */
  visited: string[]
  /** Current queue contents, front first. */
  queue: string[]
  currentNode: string | null
  found: boolean
  /** The path from start to target, once found. */
  foundPath: string[]
  /** Current BFS depth level. */
  level: number
}

// Indices match the pseudocode panel's bfs array exactly:
//   0: 'enqueue startNode'
//   1: 'mark startNode visited'
//   2: 'while queue not empty:'
//   3: '  node = dequeue()'
//   4: '  if node == target: found'
//   5: '  for each neighbour of node:'
//   6: '    if not visited: enqueue'
const PSEUDOCODE_LINE = {
  ENQUEUE_START: 0,
  MARK_VISITED: 1,
  LOOP_CONDITION: 2,
  DEQUEUE: 3,
  CHECK_TARGET: 4,
  FOR_NEIGHBOURS: 5,
  ENQUEUE_NEIGHBOUR: 6,
} as const

// Prompting on every dequeue would fatigue the learner; every other
// dequeue is paused on instead.
const PROMPT_EVERY_NTH_DEQUEUE = 2

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: BFSState
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
      queue: [...params.state.queue],
      foundPath: [...params.state.foundPath],
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

function reconstructPath(parent: Map<string, string | null>, target: string): string[] {
  const path: string[] = []
  let node: string | null = target
  while (node !== null) {
    path.unshift(node)
    node = parent.get(node) ?? null
  }
  return path
}

/**
 * Pure snapshot engine for Breadth-First Search over a fixed adjacency
 * list graph. Explores level by level using a queue, producing a
 * NEXT_NODE_SELECTION snapshot every other dequeue (asking the learner
 * which node comes out of the queue next). Never mutates `graph`.
 */
export function bfsEngine(graph: AdjacencyList, startNode: string, targetNode: string): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  push({
    description: `Starting Breadth-First Search from ${startNode}, looking for ${targetNode}. BFS explores level by level using a queue.`,
    pseudocodeLine: PSEUDOCODE_LINE.ENQUEUE_START,
    isPredictionRequired: false,
    state: { graph, startNode, targetNode, visited: [], queue: [startNode], currentNode: null, found: false, foundPath: [], level: 0 },
  })

  if (startNode === targetNode) {
    push({
      description: `${startNode} is both the start and the target - found immediately, with no traversal needed.`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK_TARGET,
      isPredictionRequired: false,
      state: { graph, startNode, targetNode, visited: [], queue: [], currentNode: startNode, found: true, foundPath: [startNode], level: 0 },
      isFinalStep: true,
    })
    return snapshots
  }

  const visited: string[] = []
  const queue: string[] = [startNode]
  const parent = new Map<string, string | null>([[startNode, null]])
  const level = new Map<string, number>([[startNode, 0]])
  let dequeueCount = 0
  let found = false

  while (queue.length > 0) {
    const nextNode = queue[0]
    dequeueCount++
    const shouldPrompt = dequeueCount % PROMPT_EVERY_NTH_DEQUEUE === 0

    if (shouldPrompt) {
      push({
        description: 'Which node gets dequeued next?',
        pseudocodeLine: PSEUDOCODE_LINE.DEQUEUE,
        isPredictionRequired: true,
        state: { graph, startNode, targetNode, visited, queue, currentNode: null, found: false, foundPath: [], level: level.get(nextNode) ?? 0 },
        criticalJunctionType: CriticalJunctionType.NEXT_NODE_SELECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })
    }

    const node = queue.shift()!
    visited.push(node)
    const currentLevel = level.get(node) ?? 0

    push({
      description: `Dequeued ${node} and marked it visited.`,
      pseudocodeLine: PSEUDOCODE_LINE.MARK_VISITED,
      isPredictionRequired: false,
      state: { graph, startNode, targetNode, visited, queue, currentNode: node, found: false, foundPath: [], level: currentLevel },
    })

    if (node === targetNode) {
      found = true
      const foundPath = reconstructPath(parent, targetNode)
      push({
        description: `${targetNode} found. Path from ${startNode}: [${foundPath.join(' -> ')}].`,
        pseudocodeLine: PSEUDOCODE_LINE.CHECK_TARGET,
        isPredictionRequired: false,
        state: { graph, startNode, targetNode, visited, queue, currentNode: node, found: true, foundPath, level: currentLevel },
        isFinalStep: true,
      })
      return snapshots
    }

    for (const neighbor of graph[node] ?? []) {
      if (visited.includes(neighbor) || queue.includes(neighbor)) continue
      queue.push(neighbor)
      parent.set(neighbor, node)
      level.set(neighbor, currentLevel + 1)
      push({
        description: `Added ${neighbor} to the queue (discovered via ${node}).`,
        pseudocodeLine: PSEUDOCODE_LINE.ENQUEUE_NEIGHBOUR,
        isPredictionRequired: false,
        state: { graph, startNode, targetNode, visited, queue, currentNode: node, found: false, foundPath: [], level: currentLevel + 1 },
      })
    }
  }

  push({
    description: found
      ? `Search complete. ${targetNode} was found.`
      : `Search complete. The entire reachable graph from ${startNode} was explored and ${targetNode} was not found.`,
    pseudocodeLine: PSEUDOCODE_LINE.LOOP_CONDITION,
    isPredictionRequired: false,
    state: { graph, startNode, targetNode, visited, queue, currentNode: null, found, foundPath: [], level: 0 },
    isFinalStep: true,
  })

  return snapshots
}

function neighborsOf(adjacency: SharedAdjacencyList | WeightedAdjacencyList, id: string): string[] {
  const entry = adjacency[id] ?? []
  if (entry.length === 0) return []
  return typeof entry[0] === 'string' ? (entry as string[]) : (entry as { to: string }[]).map((e) => e.to)
}

interface NodeGraphSnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: GraphAlgorithmState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeNodeGraphSnapshot(params: NodeGraphSnapshotParams): AlgorithmSnapshot {
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
 * Pure snapshot engine for BFS over the richer GraphAlgorithmState shape,
 * rendered on NodeGraphCanvas - bfsEngine/BFSState above stay untouched
 * for the legacy GraphCanvas until every session referencing them has
 * naturally expired. Same level-by-level queue algorithm as bfsEngine,
 * but also records hop-count distances (every edge costs 1), which is
 * what makes an unweighted BFS a useful bridge into weighted Dijkstra.
 */
export function bfsNodeGraphEngine(
  nodes: GraphNode[],
  adjacency: SharedAdjacencyList | WeightedAdjacencyList,
  directed: boolean,
  startId: string,
  targetId: string,
): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  function push(params: Omit<NodeGraphSnapshotParams, 'stepIndex'>) {
    snapshots.push(makeNodeGraphSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<GraphAlgorithmState>): GraphAlgorithmState {
    return {
      nodes,
      adjacency,
      directed,
      visited: [],
      frontier: [],
      currentNode: null,
      pathNodes: [],
      pathEdges: [],
      distances: {},
      parents: {},
      ...overrides,
    }
  }

  const visited: string[] = []
  const queue: string[] = [startId]
  const distances: Record<string, number> = { [startId]: 0 }
  const parents: Record<string, string | null> = { [startId]: null }
  let dequeueCount = 0

  push({
    description: `Starting BFS from ${startId}, looking for ${targetId}. BFS explores level by level using a queue.`,
    pseudocodeLine: PSEUDOCODE_LINE.ENQUEUE_START,
    isPredictionRequired: false,
    state: baseState({ frontier: [...queue], distances: { ...distances }, parents: { ...parents } }),
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

  while (queue.length > 0) {
    dequeueCount++
    if (dequeueCount % PROMPT_EVERY_NTH_DEQUEUE === 0) {
      push({
        description: 'Which node gets dequeued next?',
        pseudocodeLine: PSEUDOCODE_LINE.DEQUEUE,
        isPredictionRequired: true,
        state: baseState({ visited, frontier: [...queue], distances: { ...distances }, parents: { ...parents } }),
        criticalJunctionType: CriticalJunctionType.NEXT_NODE_SELECTION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })
    }

    const node = queue.shift()!
    visited.push(node)

    push({
      description: `Dequeued ${node} and marked it visited.`,
      pseudocodeLine: PSEUDOCODE_LINE.MARK_VISITED,
      isPredictionRequired: false,
      state: baseState({ visited, currentNode: node, frontier: [...queue], distances: { ...distances }, parents: { ...parents } }),
    })

    if (node === targetId) {
      const { pathNodes, pathEdges } = reconstructPath(targetId)
      push({
        description: `${targetId} found. Path from ${startId}: [${pathNodes.join(' -> ')}].`,
        pseudocodeLine: PSEUDOCODE_LINE.CHECK_TARGET,
        isPredictionRequired: false,
        state: baseState({ visited, currentNode: node, frontier: [...queue], pathNodes, pathEdges, distances: { ...distances }, parents: { ...parents } }),
        isFinalStep: true,
      })
      return snapshots
    }

    for (const neighbor of neighborsOf(adjacency, node)) {
      if (visited.includes(neighbor) || queue.includes(neighbor)) continue
      queue.push(neighbor)
      parents[neighbor] = node
      distances[neighbor] = (distances[node] ?? 0) + 1
      push({
        description: `Added ${neighbor} to the queue (discovered via ${node}).`,
        pseudocodeLine: PSEUDOCODE_LINE.ENQUEUE_NEIGHBOUR,
        isPredictionRequired: false,
        state: baseState({ visited, currentNode: node, frontier: [...queue], distances: { ...distances }, parents: { ...parents } }),
      })
    }
  }

  push({
    description: `Search complete. The entire reachable graph from ${startId} was explored and ${targetId} was not found.`,
    pseudocodeLine: PSEUDOCODE_LINE.LOOP_CONDITION,
    isPredictionRequired: false,
    state: baseState({ visited, distances: { ...distances }, parents: { ...parents } }),
    isFinalStep: true,
  })

  return snapshots
}
