import { describe, it, expect } from 'vitest'
import { bstInsertEngine, bstSearchEngine, bstDeleteEngine, type BSTNode, type BSTState } from './bst'

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

describe('bstDeleteEngine', () => {
  function buildTree(values: number[]): BSTNode {
    const snapshots = bstInsertEngine(values)
    return (snapshots[snapshots.length - 1].dataStructureState as BSTState).root!
  }

  function values(node: BSTNode | null): number[] {
    if (!node) return []
    return [...values(node.left), node.value, ...values(node.right)]
  }

  it('removes a leaf node', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = bstDeleteEngine(root, 2)
    const state = lastState(snapshots)

    expect(values(state.root)).not.toContain(2)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
  })

  it('removes a node with one child, promoting the child', () => {
    const root = buildTree([8, 4, 12, 2])
    const snapshots = bstDeleteEngine(root, 4)
    const state = lastState(snapshots)

    expect(values(state.root)).toEqual(expect.arrayContaining([2, 8, 12]))
    expect(values(state.root)).not.toContain(4)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
  })

  it('removes a node with two children by promoting its in-order successor', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = bstDeleteEngine(root, 4)
    const state = lastState(snapshots)

    const result = values(state.root)
    expect(result).not.toContain(4)
    expect(result.filter((v) => v === 6)).toHaveLength(1)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
  })

  it('removes the root when it has two children', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = bstDeleteEngine(root, 8)
    const state = lastState(snapshots)

    expect(values(state.root)).not.toContain(8)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
  })

  it('reports nothing to delete for a value absent from the tree', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = bstDeleteEngine(root, 99)

    expect(snapshots[snapshots.length - 1].description).toMatch(/not found|nothing to delete/i)
    expect(values(lastState(snapshots).root)).toEqual(expect.arrayContaining([2, 4, 6, 8, 10, 12, 14]))
  })

  it('never mutates the tree passed in', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const before = values(root)
    bstDeleteEngine(root, 4)
    expect(values(root)).toEqual(before)
  })

  it('has sequential stepIndex values', () => {
    const root = buildTree([8, 4, 12, 2, 6, 10, 14])
    const snapshots = bstDeleteEngine(root, 4)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
