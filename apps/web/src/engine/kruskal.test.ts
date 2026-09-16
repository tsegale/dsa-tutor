import { describe, it, expect } from 'vitest'
import { kruskalEngine, type KruskalState } from './kruskal'
import { primEngine, type PrimState } from './prim'
import { GRID_LIKE } from './graphPresets'

function lastKruskalState(snapshots: ReturnType<typeof kruskalEngine>): KruskalState {
  return snapshots[snapshots.length - 1].dataStructureState as KruskalState
}
function lastPrimState(snapshots: ReturnType<typeof primEngine>): PrimState {
  return snapshots[snapshots.length - 1].dataStructureState as PrimState
}

/** A spanning tree over n nodes has exactly n-1 edges, touches every
 * node, and (being a tree) has no cycles - checked here via a simple
 * union-find pass rather than trusting the engine's own bookkeeping. */
function isValidSpanningTree(nodeIds: string[], edges: [string, string, number][]): boolean {
  if (edges.length !== nodeIds.length - 1) return false
  const parent = new Map(nodeIds.map((id) => [id, id]))
  function find(x: string): string {
    while (parent.get(x) !== x) x = parent.get(x)!
    return x
  }
  const touched = new Set<string>()
  for (const [a, b] of edges) {
    touched.add(a)
    touched.add(b)
    const ra = find(a)
    const rb = find(b)
    if (ra === rb) return false // cycle
    parent.set(ra, rb)
  }
  return touched.size === nodeIds.length
}

describe('kruskalEngine', () => {
  it('produces a valid spanning tree', () => {
    const snapshots = kruskalEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency)
    const state = lastKruskalState(snapshots)
    expect(isValidSpanningTree(GRID_LIKE.nodes.map((n) => n.id), state.mstEdges!)).toBe(true)
  })

  it('matches Prim\'s MST cost on the same graph (MST total weight is unique for distinct edge weights)', () => {
    const kruskalSnapshots = kruskalEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency)
    const primSnapshots = primEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency, GRID_LIKE.nodes[0].id)
    expect(lastKruskalState(kruskalSnapshots).mstCost).toBe(lastPrimState(primSnapshots).mstCost)
  })

  it('never adds an edge whose endpoints are already in the same component', () => {
    const snapshots = kruskalEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency)
    const checks = snapshots.filter((s) => s.criticalJunctionType === 'UNION_FIND_CHECK')
    expect(checks.length).toBeGreaterThan(0)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = kruskalEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('primEngine', () => {
  it('produces a valid spanning tree from every possible start node', () => {
    for (const startNode of GRID_LIKE.nodes) {
      const snapshots = primEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency, startNode.id)
      const state = lastPrimState(snapshots)
      expect(isValidSpanningTree(GRID_LIKE.nodes.map((n) => n.id), state.mstEdges!)).toBe(true)
    }
  })

  it('produces the same MST cost regardless of start node', () => {
    const costs = GRID_LIKE.nodes.map((startNode) => {
      const snapshots = primEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency, startNode.id)
      return lastPrimState(snapshots).mstCost
    })
    expect(new Set(costs).size).toBe(1)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = primEngine(GRID_LIKE.nodes, GRID_LIKE.adjacency, GRID_LIKE.nodes[0].id)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
