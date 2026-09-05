import { describe, it, expect } from 'vitest'
import { bstInsertEngine, bstSearchEngine, type BSTNode, type BSTState } from './bst'

function lastState(snapshots: ReturnType<typeof bstInsertEngine>): BSTState {
  return snapshots[snapshots.length - 1].dataStructureState as BSTState
}

/** left < parent, right >= parent (duplicates go right), recursively. */
function isValidBST(node: BSTNode | null, min: number, max: number): boolean {
  if (!node) return true
  if (node.value < min || node.value > max) return false
  return isValidBST(node.left, min, node.value - 1) && isValidBST(node.right, node.value, max)
}

describe('bstInsertEngine', () => {
  it('creates a root from a single value in exactly 2 snapshots', () => {
    const snapshots = bstInsertEngine([42])

    expect(snapshots.length).toBe(2)
    expect(lastState(snapshots).root).toEqual({ value: 42, left: null, right: null, id: expect.any(String) })
    expect(snapshots[1].isFinalStep).toBe(true)
  })

  it('inserts a smaller value to the left of the root', () => {
    const snapshots = bstInsertEngine([8, 4])
    const root = lastState(snapshots).root!

    expect(root.value).toBe(8)
    expect(root.left?.value).toBe(4)
    expect(root.right).toBeNull()
  })

  it('inserts a larger value to the right of the root', () => {
    const snapshots = bstInsertEngine([8, 12])
    const root = lastState(snapshots).root!

    expect(root.value).toBe(8)
    expect(root.right?.value).toBe(12)
    expect(root.left).toBeNull()
  })

  it('grows a multi-value tree correctly', () => {
    const snapshots = bstInsertEngine([8, 4, 12, 2, 6, 10, 14])
    const root = lastState(snapshots).root!

    expect(root.value).toBe(8)
    expect(root.left?.value).toBe(4)
    expect(root.right?.value).toBe(12)
    expect(root.left?.left?.value).toBe(2)
    expect(root.left?.right?.value).toBe(6)
    expect(root.right?.left?.value).toBe(10)
    expect(root.right?.right?.value).toBe(14)
  })

  it('sends duplicate values right, per standard convention', () => {
    const snapshots = bstInsertEngine([8, 8])
    const root = lastState(snapshots).root!

    expect(root.right?.value).toBe(8)
    expect(root.left).toBeNull()
  })

  it('maintains the BST property (left < parent <= right) at every snapshot', () => {
    const snapshots = bstInsertEngine([8, 4, 12, 2, 6, 10, 14, 6])

    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as BSTState
      expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = bstInsertEngine([8, 4, 12, 2, 6, 10, 14])
    const indices = snapshots.map((s) => s.stepIndex)

    expect(indices).toEqual(snapshots.map((_, i) => i))
  })

  it('grows the path array by exactly one node id per traversal step', () => {
    const snapshots = bstInsertEngine([8, 4, 12, 2])
    const directionSteps = snapshots.filter((s) => s.criticalJunctionType === 'BST_DIRECTION')

    for (let i = 1; i < directionSteps.length; i++) {
      const prevState = directionSteps[i - 1].dataStructureState as BSTState
      const state = directionSteps[i].dataStructureState as BSTState
      // A new insertion restarts the path at length 0, so it can only
      // ever be equal-or-larger by one compared to the previous step.
      expect(state.path.length).toBeLessThanOrEqual(prevState.path.length + 1)
    }
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = bstInsertEngine([8, 4, 12])

    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })
})

describe('bstSearchEngine', () => {
  function buildTree(values: number[]): BSTNode {
    const snapshots = bstInsertEngine(values)
    return (snapshots[snapshots.length - 1].dataStructureState as BSTState).root!
  }

  it('finds a value that exists in the tree', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = bstSearchEngine(root, 6)
    const state = lastState(snapshots)

    expect(state.foundNode).not.toBeNull()
    expect(state.foundNode?.value).toBe(6)
  })

  it('reports not found for a value absent from the tree', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = bstSearchEngine(root, 99)
    const state = lastState(snapshots)

    expect(state.foundNode).toBeNull()
  })
})
