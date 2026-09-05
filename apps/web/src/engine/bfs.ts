import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

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

const PSEUDOCODE_LINE = {
  START: 0,
  DEQUEUE: 1,
  VISIT: 2,
  ENQUEUE: 3,
  DONE: 4,
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
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: { graph, startNode, targetNode, visited: [], queue: [startNode], currentNode: null, found: false, foundPath: [], level: 0 },
  })

  if (startNode === targetNode) {
    push({
      description: `${startNode} is both the start and the target - found immediately, with no traversal needed.`,
      pseudocodeLine: PSEUDOCODE_LINE.DONE,
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
      pseudocodeLine: PSEUDOCODE_LINE.VISIT,
      isPredictionRequired: false,
      state: { graph, startNode, targetNode, visited, queue, currentNode: node, found: false, foundPath: [], level: currentLevel },
    })

    if (node === targetNode) {
      found = true
      const foundPath = reconstructPath(parent, targetNode)
      push({
        description: `${targetNode} found. Path from ${startNode}: [${foundPath.join(' -> ')}].`,
        pseudocodeLine: PSEUDOCODE_LINE.DONE,
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
        pseudocodeLine: PSEUDOCODE_LINE.ENQUEUE,
        isPredictionRequired: false,
        state: { graph, startNode, targetNode, visited, queue, currentNode: node, found: false, foundPath: [], level: currentLevel + 1 },
      })
    }
  }

  push({
    description: found
      ? `Search complete. ${targetNode} was found.`
      : `Search complete. The entire reachable graph from ${startNode} was explored and ${targetNode} was not found.`,
    pseudocodeLine: PSEUDOCODE_LINE.DONE,
    isPredictionRequired: false,
    state: { graph, startNode, targetNode, visited, queue, currentNode: null, found, foundPath: [], level: 0 },
    isFinalStep: true,
  })

  return snapshots
}
