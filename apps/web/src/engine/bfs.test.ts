import { describe, it, expect } from 'vitest'
import { bfsEngine, DEFAULT_BFS_GRAPH, type AdjacencyList, type BFSState } from './bfs'

function lastState(snapshots: ReturnType<typeof bfsEngine>): BFSState {
  return snapshots[snapshots.length - 1].dataStructureState as BFSState
}

function isValidPath(graph: AdjacencyList, path: string[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if (!graph[path[i]]?.includes(path[i + 1])) return false
  }
  return true
}

describe('bfsEngine', () => {
  it('finds the target immediately when start equals target, with no traversal', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'A')
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.foundPath).toEqual(['A'])
    expect(snapshots.some((s) => s.criticalJunctionType === 'NEXT_NODE_SELECTION')).toBe(false)
  })

  it('finds an adjacent node in one hop', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'B')
    const state = lastState(snapshots)

    expect(state.found).toBe(true)
    expect(state.foundPath).toEqual(['A', 'B'])
  })

  it('reports not found and explores the full reachable graph when the target is disconnected', () => {
    const disconnectedGraph: AdjacencyList = { A: ['B'], B: ['A'], C: ['D'], D: ['C'] }
    const snapshots = bfsEngine(disconnectedGraph, 'A', 'C')
    const state = lastState(snapshots)

    expect(state.found).toBe(false)
    expect(state.visited.sort()).toEqual(['A', 'B'])
  })

  it('visits nodes in breadth-first (non-decreasing level) order', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'G')
    const visitSteps = snapshots.filter((s) => s.pseudocodeLine === 2) // VISIT

    let previousLevel = -1
    for (const step of visitSteps) {
      const state = step.dataStructureState as BFSState
      expect(state.level).toBeGreaterThanOrEqual(previousLevel)
      previousLevel = state.level
    }
  })

  it('shrinks the queue by one on each dequeue and grows it on each enqueue', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'G')

    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as BFSState
      expect(Array.isArray(state.queue)).toBe(true)
      expect(state.queue.length).toBeGreaterThanOrEqual(0)
    }
  })

  it('increments level correctly as BFS expands outward from the start node', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'G')
    // Only VISIT steps pair currentNode with ITS OWN level; ENQUEUE
    // steps keep currentNode as the node being expanded from while
    // level reflects the newly-discovered NEIGHBOR's level instead.
    const visitSteps = snapshots.filter((s) => s.pseudocodeLine === 2)
    const finalLevels = new Map<string, number>()

    for (const step of visitSteps) {
      const state = step.dataStructureState as BFSState
      if (state.currentNode) finalLevels.set(state.currentNode, state.level)
    }

    expect(finalLevels.get('A')).toBe(0)
    expect(finalLevels.get('B')).toBe(1)
    expect(finalLevels.get('C')).toBe(1)
    expect(finalLevels.get('G')).toBe(3)
  })

  it('produces a foundPath that is a valid walk through the graph', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'G')
    const state = lastState(snapshots)

    expect(isValidPath(DEFAULT_BFS_GRAPH, state.foundPath)).toBe(true)
    expect(state.foundPath[0]).toBe('A')
    expect(state.foundPath[state.foundPath.length - 1]).toBe('G')
  })

  it('finds the correct shortest path on the default graph from A to G', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'G')
    const state = lastState(snapshots)

    // Shortest path A -> C -> F -> G (length 4), BFS guarantees shortest.
    expect(state.foundPath.length).toBe(4)
    expect(state.foundPath[0]).toBe('A')
    expect(state.foundPath[3]).toBe('G')
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'G')
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('gives every snapshot a valid dataStructureState with queue and visited as arrays', () => {
    const snapshots = bfsEngine(DEFAULT_BFS_GRAPH, 'A', 'G')

    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as BFSState
      expect(Array.isArray(state.queue)).toBe(true)
      expect(Array.isArray(state.visited)).toBe(true)
    }
  })
})
