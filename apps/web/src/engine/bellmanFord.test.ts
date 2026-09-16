import { describe, it, expect } from 'vitest'
import { bellmanFordEngine, BELLMAN_FORD_DEFAULT, BELLMAN_FORD_NEGATIVE_CYCLE, type BellmanFordState } from './bellmanFord'

function lastState(snapshots: ReturnType<typeof bellmanFordEngine>): BellmanFordState {
  return snapshots[snapshots.length - 1].dataStructureState as BellmanFordState
}

describe('bellmanFordEngine', () => {
  it('correctly handles a negative edge that Dijkstra could not', () => {
    const snapshots = bellmanFordEngine(BELLMAN_FORD_DEFAULT.nodes, BELLMAN_FORD_DEFAULT.adjacency, true, 'A')
    const state = lastState(snapshots)
    // A->B->D = 6 + -3 = 3, cheaper than A->C->D = 4+5=9.
    expect(state.distances!.D).toBe(3)
    expect(state.distances!.E).toBe(5)
    expect(state.hasNegativeCycle).toBe(false)
  })

  it('detects a negative-weight cycle', () => {
    const snapshots = bellmanFordEngine(BELLMAN_FORD_NEGATIVE_CYCLE.nodes, BELLMAN_FORD_NEGATIVE_CYCLE.adjacency, true, 'A')
    expect(lastState(snapshots).hasNegativeCycle).toBe(true)
  })

  it('reports anyChanged=false and converges early once a chain has fully propagated', () => {
    // A 4-node chain (nodes array in dependency order) fully relaxes
    // within a single pass, since each node's own outgoing edge is
    // processed after its incoming edge already updated it that same
    // pass - so pass 2 (of totalPasses=3) finds nothing left to relax
    // and the algorithm stops early instead of running a 3rd pass.
    const nodes = [
      { id: 'A', label: 'A', x: 0, y: 0 },
      { id: 'B', label: 'B', x: 0, y: 0 },
      { id: 'C', label: 'C', x: 0, y: 0 },
      { id: 'D', label: 'D', x: 0, y: 0 },
    ]
    const adjacency = { A: [{ to: 'B', weight: 5 }], B: [{ to: 'C', weight: 3 }], C: [{ to: 'D', weight: 2 }], D: [] }
    const snapshots = bellmanFordEngine(nodes, adjacency, true, 'A')
    const passCompletions = snapshots.filter((s) => s.criticalJunctionType === 'BELLMAN_PASS_COMPLETE')
    expect(passCompletions.length).toBe(2)
    expect((passCompletions[0].dataStructureState as BellmanFordState).anyChanged).toBe(true)
    expect((passCompletions[1].dataStructureState as BellmanFordState).anyChanged).toBe(false)
    expect(lastState(snapshots).distances!.D).toBe(10)
  })

  it('emits BELLMAN_PASS_COMPLETE exactly once per pass actually run', () => {
    const snapshots = bellmanFordEngine(BELLMAN_FORD_DEFAULT.nodes, BELLMAN_FORD_DEFAULT.adjacency, true, 'A')
    const passCompletions = snapshots.filter((s) => s.criticalJunctionType === 'BELLMAN_PASS_COMPLETE')
    const lastPassNumber = (passCompletions[passCompletions.length - 1].dataStructureState as BellmanFordState).passNumber
    expect(passCompletions.length).toBe(lastPassNumber)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = bellmanFordEngine(BELLMAN_FORD_DEFAULT.nodes, BELLMAN_FORD_DEFAULT.adjacency, true, 'A')
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = bellmanFordEngine(BELLMAN_FORD_DEFAULT.nodes, BELLMAN_FORD_DEFAULT.adjacency, true, 'A')
    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })
})
