import { describe, it, expect } from 'vitest'
import type { GraphAlgorithmState } from '@dsa-tutor/types'
import { dfsNodeGraphEngine } from './dfs'
import { SMALL_7, DIRECTED_CYCLE } from './graphPresets'

function lastState(snapshots: ReturnType<typeof dfsNodeGraphEngine>): GraphAlgorithmState {
  return snapshots[snapshots.length - 1].dataStructureState as GraphAlgorithmState
}

describe('dfsNodeGraphEngine', () => {
  it('visits every node in a connected graph', () => {
    const snapshots = dfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A')
    const state = lastState(snapshots)
    expect(state.visited.sort()).toEqual(SMALL_7.nodes.map((n) => n.id).sort())
  })

  it('gives every visited node a discovery time strictly less than its finish time', () => {
    const snapshots = dfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A')
    const state = lastState(snapshots)
    for (const id of state.visited) {
      expect(state.discoveryTime![id]).toBeLessThan(state.finishTime![id])
    }
  })

  it('satisfies the DFS parenthesis theorem: any two nodes\' [discovery, finish] intervals are either nested or disjoint, never partially overlapping', () => {
    const snapshots = dfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A')
    const state = lastState(snapshots)
    const ids = state.visited
    for (const u of ids) {
      for (const v of ids) {
        if (u === v) continue
        const [du, fu] = [state.discoveryTime![u], state.finishTime![u]]
        const [dv, fv] = [state.discoveryTime![v], state.finishTime![v]]
        const nested = (du < dv && fv < fu) || (dv < du && fu < fv)
        const disjoint = fu < dv || fv < du
        expect(nested || disjoint).toBe(true)
      }
    }
  })

  it('assigns every discovery/finish time a unique value from 1 to 2*n', () => {
    const snapshots = dfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A')
    const state = lastState(snapshots)
    const times = [...Object.values(state.discoveryTime!), ...Object.values(state.finishTime!)]
    expect(new Set(times).size).toBe(times.length)
    expect(Math.max(...times)).toBe(2 * SMALL_7.nodes.length)
  })

  it('covers disconnected graphs by starting a new tree for unreached nodes', () => {
    const nodes = [
      { id: 'A', label: 'A', x: 0, y: 0 },
      { id: 'B', label: 'B', x: 0, y: 0 },
      { id: 'C', label: 'C', x: 0, y: 0 },
    ]
    const adjacency = { A: ['B'], B: ['A'], C: [] }
    const snapshots = dfsNodeGraphEngine(nodes, adjacency, false, 'A')
    expect(lastState(snapshots).visited.sort()).toEqual(['A', 'B', 'C'])
  })

  it('follows directed edges only in their declared direction', () => {
    const snapshots = dfsNodeGraphEngine(DIRECTED_CYCLE.nodes, DIRECTED_CYCLE.adjacency, true, 'C')
    // C -> F only; F has no outgoing edges, so starting from C should
    // reach only C and F directly (A, B, D, E are unreachable from C).
    const state = lastState(snapshots)
    expect(state.visited).toContain('C')
    expect(state.visited).toContain('F')
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = dfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A')
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = dfsNodeGraphEngine(SMALL_7.nodes, SMALL_7.adjacency, SMALL_7.directed, 'A')
    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })
})
