import { describe, it, expect } from 'vitest'
import { bstInsertEngine, type BSTNode, type BSTState } from './bst'
import { inorderEngine, preorderEngine, postorderEngine, type TraversalState } from './treeTraversal'

function buildTree(values: number[]): BSTNode | null {
  const snapshots = bstInsertEngine(values)
  return (snapshots[snapshots.length - 1].dataStructureState as BSTState).root
}

function lastState(snapshots: ReturnType<typeof inorderEngine>): TraversalState {
  return snapshots[snapshots.length - 1].dataStructureState as TraversalState
}

function visitOrder(snapshots: ReturnType<typeof inorderEngine>): number[] {
  return lastState(snapshots).visitedOrder
}

describe('inorderEngine', () => {
  it('visits an empty tree with a single, final, non-prediction snapshot', () => {
    const snapshots = inorderEngine(null)
    expect(snapshots.length).toBe(2)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
    expect(snapshots.every((s) => !s.isPredictionRequired)).toBe(true)
  })

  it('visits a single node', () => {
    const root = buildTree([5])
    const snapshots = inorderEngine(root)
    expect(visitOrder(snapshots)).toEqual([5])
  })

  it('produces ascending sorted order for a BST', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = inorderEngine(root)
    expect(visitOrder(snapshots)).toEqual([2, 4, 6, 8, 10, 12, 14])
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const root = buildTree([8, 4, 12])
    const snapshots = inorderEngine(root)
    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('has sequential stepIndex values with no gaps', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = inorderEngine(root)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('emits a VISIT_NODE prediction on every other visit', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = inorderEngine(root)
    const predictions = snapshots.filter((s) => s.isPredictionRequired)
    expect(predictions.length).toBeGreaterThan(0)
    predictions.forEach((s) => expect(s.criticalJunctionType).toBe('VISIT_NODE'))
  })

  it('sets nextVisitValue to the correct upcoming node at every prediction step', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = inorderEngine(root)
    const sortedOrder = [2, 4, 6, 8, 10, 12, 14]
    const predictions = snapshots.filter((s) => s.isPredictionRequired)
    predictions.forEach((s) => {
      const state = s.dataStructureState as TraversalState
      const alreadyVisited = state.visitedOrder.length
      expect(state.nextVisitValue).toBe(sortedOrder[alreadyVisited])
    })
  })

  it('grows path by exactly one node id per visit', () => {
    const root = buildTree([8, 4, 12, 2])
    const snapshots = inorderEngine(root)
    const visitSteps = snapshots.filter((s) => !s.isPredictionRequired && !s.isFinalStep)
    for (let i = 1; i < visitSteps.length; i++) {
      const prev = (visitSteps[i - 1].dataStructureState as TraversalState).path.length
      const curr = (visitSteps[i].dataStructureState as TraversalState).path.length
      expect(curr).toBe(prev + 1)
    }
  })
})

describe('preorderEngine', () => {
  it('visits root before children', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = preorderEngine(root)
    expect(visitOrder(snapshots)).toEqual([8, 4, 2, 6, 12, 10, 14])
  })

  it('handles an empty tree', () => {
    const snapshots = preorderEngine(null)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
    expect(visitOrder(snapshots)).toEqual([])
  })

  it('handles a single node', () => {
    const root = buildTree([5])
    expect(visitOrder(preorderEngine(root))).toEqual([5])
  })

  it('has sequential stepIndex values with no gaps', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = preorderEngine(root)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})

describe('postorderEngine', () => {
  it('visits children before their parent', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = postorderEngine(root)
    expect(visitOrder(snapshots)).toEqual([2, 6, 4, 10, 14, 12, 8])
  })

  it('handles an empty tree', () => {
    const snapshots = postorderEngine(null)
    expect(snapshots[snapshots.length - 1].isFinalStep).toBe(true)
    expect(visitOrder(snapshots)).toEqual([])
  })

  it('handles a single node', () => {
    const root = buildTree([5])
    expect(visitOrder(postorderEngine(root))).toEqual([5])
  })

  it('never mutates the tree passed in', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    function values(node: BSTNode | null): number[] {
      if (!node) return []
      return [...values(node.left), node.value, ...values(node.right)]
    }
    const before = values(root)
    postorderEngine(root)
    expect(values(root)).toEqual(before)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = postorderEngine(root)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
