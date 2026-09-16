import { describe, it, expect } from 'vitest'
import type { AdjacencyList } from '@dsa-tutor/types'
import { cycleDetectionEngine, connectedComponentsEngine, topologicalSortEngine, type CycleDetectionState, type ConnectedComponentsState } from './graphProperties'
import { SMALL_7, DIRECTED_CYCLE, DIRECTED_ACYCLIC } from './graphPresets'
import type { GraphAlgorithmState } from '@dsa-tutor/types'

function lastState<T>(snapshots: { dataStructureState: unknown }[]): T {
  return snapshots[snapshots.length - 1].dataStructureState as T
}

describe('cycleDetectionEngine', () => {
  it('detects the cycle in a directed graph that has one', () => {
    const snapshots = cycleDetectionEngine(DIRECTED_CYCLE.nodes, DIRECTED_CYCLE.adjacency, true)
    expect(lastState<CycleDetectionState>(snapshots).cycleFound).toBe(true)
  })

  it('reports no cycle for a directed acyclic graph', () => {
    const snapshots = cycleDetectionEngine(DIRECTED_ACYCLIC.nodes, DIRECTED_ACYCLIC.adjacency, true)
    expect(lastState<CycleDetectionState>(snapshots).cycleFound).toBe(false)
  })

  it('detects a cycle in an undirected graph that has one', () => {
    // SMALL_7 has a cycle: A-B-E-F-C-A.
    const snapshots = cycleDetectionEngine(SMALL_7.nodes, SMALL_7.adjacency, false)
    expect(lastState<CycleDetectionState>(snapshots).cycleFound).toBe(true)
  })

  it('does not treat an undirected edge back to the immediate parent as a cycle', () => {
    // A simple path A-B-C has no cycle - only false positive risk is
    // walking the parent edge backwards.
    const nodes = [
      { id: 'A', label: 'A', x: 0, y: 0 },
      { id: 'B', label: 'B', x: 0, y: 0 },
      { id: 'C', label: 'C', x: 0, y: 0 },
    ]
    const adjacency: AdjacencyList = { A: ['B'], B: ['A', 'C'], C: ['B'] }
    const snapshots = cycleDetectionEngine(nodes, adjacency, false)
    expect(lastState<CycleDetectionState>(snapshots).cycleFound).toBe(false)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = cycleDetectionEngine(SMALL_7.nodes, SMALL_7.adjacency, false)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('connectedComponentsEngine', () => {
  it('finds a single component for a fully connected graph', () => {
    const snapshots = connectedComponentsEngine(SMALL_7.nodes, SMALL_7.adjacency)
    expect(lastState<ConnectedComponentsState>(snapshots).componentCount).toBe(1)
  })

  it('finds multiple components for a disconnected graph', () => {
    const nodes = [
      { id: 'A', label: 'A', x: 0, y: 0 },
      { id: 'B', label: 'B', x: 0, y: 0 },
      { id: 'C', label: 'C', x: 0, y: 0 },
      { id: 'D', label: 'D', x: 0, y: 0 },
    ]
    const adjacency: AdjacencyList = { A: ['B'], B: ['A'], C: ['D'], D: ['C'] }
    const snapshots = connectedComponentsEngine(nodes, adjacency)
    const state = lastState<ConnectedComponentsState>(snapshots)
    expect(state.componentCount).toBe(2)
    expect(state.components!.A).toBe(state.components!.B)
    expect(state.components!.C).toBe(state.components!.D)
    expect(state.components!.A).not.toBe(state.components!.C)
  })

  it('assigns every node to exactly one component', () => {
    const snapshots = connectedComponentsEngine(SMALL_7.nodes, SMALL_7.adjacency)
    const state = lastState<ConnectedComponentsState>(snapshots)
    for (const node of SMALL_7.nodes) {
      expect(state.components![node.id]).toBeDefined()
    }
  })
})

describe('topologicalSortEngine', () => {
  it('produces a valid topological order: every edge points from an earlier to a later position', () => {
    const snapshots = topologicalSortEngine(DIRECTED_ACYCLIC.nodes, DIRECTED_ACYCLIC.adjacency)
    const state = lastState<GraphAlgorithmState>(snapshots)
    const order = state.topoOrder!
    expect(order.length).toBe(DIRECTED_ACYCLIC.nodes.length)
    for (const node of DIRECTED_ACYCLIC.nodes) {
      for (const target of DIRECTED_ACYCLIC.adjacency[node.id] ?? []) {
        expect(order.indexOf(node.id)).toBeLessThan(order.indexOf(target))
      }
    }
  })

  it('includes every node exactly once', () => {
    const snapshots = topologicalSortEngine(DIRECTED_ACYCLIC.nodes, DIRECTED_ACYCLIC.adjacency)
    const order = lastState<GraphAlgorithmState>(snapshots).topoOrder!
    expect(new Set(order).size).toBe(DIRECTED_ACYCLIC.nodes.length)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = topologicalSortEngine(DIRECTED_ACYCLIC.nodes, DIRECTED_ACYCLIC.adjacency)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
