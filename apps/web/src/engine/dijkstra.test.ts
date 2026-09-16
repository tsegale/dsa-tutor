import { describe, it, expect } from 'vitest'
import type { GraphNode, WeightedAdjacencyList } from '@dsa-tutor/types'
import { dijkstraEngine, type DijkstraState } from './dijkstra'
import { MEDIUM_WEIGHTED, GRID_LIKE } from './graphPresets'

function lastState(snapshots: ReturnType<typeof dijkstraEngine>): DijkstraState {
  return snapshots[snapshots.length - 1].dataStructureState as DijkstraState
}

/** Bellman-Ford-style relaxation (a different algorithmic approach from
 * Dijkstra's priority-queue selection) used purely as an independent
 * cross-check on Dijkstra's own distances - catches bugs a same-style
 * duplicate implementation would share. */
function referenceDistances(nodeIds: string[], adjacency: WeightedAdjacencyList, start: string): Record<string, number> {
  const dist: Record<string, number> = Object.fromEntries(nodeIds.map((id) => [id, id === start ? 0 : Infinity]))
  for (let iter = 0; iter < nodeIds.length; iter++) {
    for (const u of nodeIds) {
      for (const edge of adjacency[u] ?? []) {
        if (dist[u] + edge.weight < dist[edge.to]) dist[edge.to] = dist[u] + edge.weight
      }
    }
  }
  return dist
}

describe('dijkstraEngine', () => {
  it('matches an independent Bellman-Ford-style reference implementation on the medium-weighted preset', () => {
    const nodeIds = MEDIUM_WEIGHTED.nodes.map((n) => n.id)
    const reference = referenceDistances(nodeIds, MEDIUM_WEIGHTED.adjacency, 'A')
    const snapshots = dijkstraEngine(MEDIUM_WEIGHTED.nodes, MEDIUM_WEIGHTED.adjacency, MEDIUM_WEIGHTED.directed, 'A', 'H')
    const state = lastState(snapshots)
    for (const id of nodeIds) {
      expect(state.distances![id]).toBe(reference[id])
    }
  })

  it('matches the reference implementation on the (undirected) grid-like preset from every node, for every node it actually finalises', () => {
    // Dijkstra correctly returns as soon as the target is finalised, so
    // nodes it never got around to visiting legitimately stay at
    // Infinity - only `state.visited` (finalised) nodes are guaranteed
    // to already hold their true shortest distance.
    const nodeIds = GRID_LIKE.nodes.map((n) => n.id)
    for (const start of nodeIds) {
      const reference = referenceDistances(nodeIds, GRID_LIKE.adjacency, start)
      const snapshots = dijkstraEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency, GRID_LIKE.directed, start, 'I')
      const state = lastState(snapshots)
      expect(state.visited.length).toBeGreaterThan(0)
      for (const id of state.visited) {
        expect(state.distances![id]).toBe(reference[id])
      }
    }
  })

  it('finalises every node with its true shortest distance when run to completion (no target reachable)', () => {
    const nodeIds = GRID_LIKE.nodes.map((n) => n.id)
    const reference = referenceDistances(nodeIds, GRID_LIKE.adjacency, 'A')
    // An unreachable target forces the algorithm to exhaust the whole
    // priority queue instead of returning early.
    const nodes = [...GRID_LIKE.nodes, { id: 'Z', label: 'Z', x: 0, y: 0 }]
    const adjacency = { ...GRID_LIKE.adjacency, Z: [] }
    const snapshots = dijkstraEngine(nodes, adjacency, GRID_LIKE.directed, 'A', 'Z')
    const state = lastState(snapshots)
    for (const id of nodeIds) {
      expect(state.distances![id]).toBe(reference[id])
    }
  })

  it('reconstructs a path whose edge weights sum to the reported distance', () => {
    const snapshots = dijkstraEngine(MEDIUM_WEIGHTED.nodes, MEDIUM_WEIGHTED.adjacency, MEDIUM_WEIGHTED.directed, 'A', 'H')
    const state = lastState(snapshots)
    expect(state.pathNodes[0]).toBe('A')
    expect(state.pathNodes[state.pathNodes.length - 1]).toBe('H')

    let sum = 0
    for (const [from, to] of state.pathEdges) {
      const edge = MEDIUM_WEIGHTED.adjacency[from].find((e) => e.to === to)
      expect(edge).toBeDefined()
      sum += edge!.weight
    }
    expect(sum).toBe(state.distances!.H)
  })

  it('reports an unreachable target as distance Infinity with no path', () => {
    const nodes: GraphNode[] = [
      { id: 'A', label: 'A', x: 0, y: 0 },
      { id: 'B', label: 'B', x: 0, y: 0 },
    ]
    const adjacency: WeightedAdjacencyList = { A: [], B: [] }
    const snapshots = dijkstraEngine(nodes, adjacency, true, 'A', 'B')
    const state = lastState(snapshots)
    expect(state.distances!.B).toBe(Infinity)
    expect(state.pathNodes).toEqual([])
  })

  it('emits EDGE_RELAX only when there is a genuine improvement-or-not decision to make', () => {
    const snapshots = dijkstraEngine(MEDIUM_WEIGHTED.nodes, MEDIUM_WEIGHTED.adjacency, MEDIUM_WEIGHTED.directed, 'A', 'H')
    const relaxSteps = snapshots.filter((s) => s.criticalJunctionType === 'EDGE_RELAX')
    expect(relaxSteps.length).toBeGreaterThan(0)
    relaxSteps.forEach((s) => {
      const state = s.dataStructureState as DijkstraState
      expect(state.currentDist).toBeDefined()
      expect(state.newDist).toBeDefined()
    })
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = dijkstraEngine(MEDIUM_WEIGHTED.nodes, MEDIUM_WEIGHTED.adjacency, MEDIUM_WEIGHTED.directed, 'A', 'H')
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
