import { describe, it, expect } from 'vitest'
import type { WeightedAdjacencyList } from '@dsa-tutor/types'
import { floydWarshallEngine, type MatrixState } from './floydWarshall'
import { GRID_LIKE } from './graphPresets'

function lastState(snapshots: ReturnType<typeof floydWarshallEngine>): MatrixState {
  return snapshots[snapshots.length - 1].dataStructureState as MatrixState
}

function referenceDistances(nodeIds: string[], adjacency: WeightedAdjacencyList): Record<string, Record<string, number>> {
  const dist: Record<string, Record<string, number>> = {}
  for (const i of nodeIds) {
    dist[i] = {}
    for (const j of nodeIds) dist[i][j] = i === j ? 0 : Infinity
  }
  for (const from of nodeIds) {
    for (const edge of adjacency[from] ?? []) dist[from][edge.to] = Math.min(dist[from][edge.to], edge.weight)
  }
  for (const k of nodeIds) for (const i of nodeIds) for (const j of nodeIds) {
    if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j]
  }
  return dist
}

describe('floydWarshallEngine', () => {
  it('matches an independently-computed all-pairs reference on the grid-like preset', () => {
    const nodeIds = GRID_LIKE.nodes.map((n) => n.id)
    const reference = referenceDistances(nodeIds, GRID_LIKE.adjacency)
    const snapshots = floydWarshallEngine(nodeIds, GRID_LIKE.adjacency)
    const state = lastState(snapshots)
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = 0; j < nodeIds.length; j++) {
        expect(state.dist[i][j]).toBe(reference[nodeIds[i]][nodeIds[j]])
      }
    }
  })

  it('leaves the diagonal at 0 and unreachable pairs at Infinity', () => {
    const nodeIds = ['A', 'B', 'C']
    const adjacency: WeightedAdjacencyList = { A: [{ to: 'B', weight: 3 }], B: [], C: [] }
    const snapshots = floydWarshallEngine(nodeIds, adjacency)
    const state = lastState(snapshots)
    expect(state.dist[0][0]).toBe(0)
    expect(state.dist[1][1]).toBe(0)
    expect(state.dist[0][2]).toBe(Infinity)
    expect(state.dist[2][0]).toBe(Infinity)
    expect(state.dist[0][1]).toBe(3)
  })

  it('finds a shorter path through an intermediate vertex', () => {
    const nodeIds = ['A', 'B', 'C']
    // A->C direct is 10, but A->B->C is 2+2=4.
    const adjacency: WeightedAdjacencyList = {
      A: [{ to: 'B', weight: 2 }, { to: 'C', weight: 10 }],
      B: [{ to: 'C', weight: 2 }],
      C: [],
    }
    const snapshots = floydWarshallEngine(nodeIds, adjacency)
    expect(lastState(snapshots).dist[0][2]).toBe(4)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const nodeIds = GRID_LIKE.nodes.map((n) => n.id)
    const snapshots = floydWarshallEngine(nodeIds, GRID_LIKE.adjacency)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
