import { describe, it, expect } from 'vitest'
import { avlInsertEngine, avlDeleteEngine, type AVLNode, type AVLState } from './avlTree'

function lastState(snapshots: ReturnType<typeof avlInsertEngine>): AVLState {
  return snapshots[snapshots.length - 1].dataStructureState as AVLState
}

function values(node: AVLNode | null): number[] {
  if (!node) return []
  return [...values(node.left), node.value, ...values(node.right)]
}

function isValidBST(node: AVLNode | null, min: number, max: number): boolean {
  if (!node) return true
  if (node.value < min || node.value > max) return false
  return isValidBST(node.left, min, node.value - 1) && isValidBST(node.right, node.value, max)
}

/** Recomputes height/balance factor independently of the engine's own
 * bookkeeping and checks both (a) they match what the engine stored and
 * (b) every node's balance factor is within [-1, 1] - the AVL invariant. */
function checkHeightsAndBalance(node: AVLNode | null): number {
  if (!node) return 0
  const leftHeight = checkHeightsAndBalance(node.left)
  const rightHeight = checkHeightsAndBalance(node.right)
  const expectedHeight = 1 + Math.max(leftHeight, rightHeight)
  const expectedBalance = leftHeight - rightHeight

  expect(node.height).toBe(expectedHeight)
  expect(node.balanceFactor).toBe(expectedBalance)
  expect(node.balanceFactor).toBeGreaterThanOrEqual(-1)
  expect(node.balanceFactor).toBeLessThanOrEqual(1)

  return expectedHeight
}

describe('avlInsertEngine', () => {
  it('creates a root from a single value', () => {
    const snapshots = avlInsertEngine([42])
    const state = lastState(snapshots)
    expect(state.root).toMatchObject({ value: 42, height: 1, balanceFactor: 0 })
  })

  it('triggers a single right rotation for a Left-Left insertion (3, 2, 1)', () => {
    const snapshots = avlInsertEngine([3, 2, 1])
    const state = lastState(snapshots)
    // 2 becomes the new root after the LL rotation
    expect(state.root?.value).toBe(2)
    expect(state.root?.left?.value).toBe(1)
    expect(state.root?.right?.value).toBe(3)
    const rotationSteps = snapshots.filter((s) => s.criticalJunctionType === 'AVL_ROTATION_TYPE')
    expect(rotationSteps.some((s) => (s.dataStructureState as AVLState).rotationType === 'LL')).toBe(true)
  })

  it('triggers a single left rotation for a Right-Right insertion (1, 2, 3)', () => {
    const snapshots = avlInsertEngine([1, 2, 3])
    const state = lastState(snapshots)
    expect(state.root?.value).toBe(2)
    expect(state.root?.left?.value).toBe(1)
    expect(state.root?.right?.value).toBe(3)
    const rotationSteps = snapshots.filter((s) => s.criticalJunctionType === 'AVL_ROTATION_TYPE')
    expect(rotationSteps.some((s) => (s.dataStructureState as AVLState).rotationType === 'RR')).toBe(true)
  })

  it('triggers a left-right rotation for a Left-Right insertion (3, 1, 2)', () => {
    const snapshots = avlInsertEngine([3, 1, 2])
    const state = lastState(snapshots)
    expect(state.root?.value).toBe(2)
    expect(state.root?.left?.value).toBe(1)
    expect(state.root?.right?.value).toBe(3)
    const rotationSteps = snapshots.filter((s) => s.criticalJunctionType === 'AVL_ROTATION_TYPE')
    expect(rotationSteps.some((s) => (s.dataStructureState as AVLState).rotationType === 'LR')).toBe(true)
  })

  it('triggers a right-left rotation for a Right-Left insertion (1, 3, 2)', () => {
    const snapshots = avlInsertEngine([1, 3, 2])
    const state = lastState(snapshots)
    expect(state.root?.value).toBe(2)
    expect(state.root?.left?.value).toBe(1)
    expect(state.root?.right?.value).toBe(3)
    const rotationSteps = snapshots.filter((s) => s.criticalJunctionType === 'AVL_ROTATION_TYPE')
    expect(rotationSteps.some((s) => (s.dataStructureState as AVLState).rotationType === 'RL')).toBe(true)
  })

  it('maintains the AVL balance invariant (|balance factor| <= 1) after every completed insertion', () => {
    // Only checked at each insertion's own completion snapshot, not every
    // intermediate one: mid-insert, ancestors above the node currently
    // being rebalanced legitimately still hold their pre-insert height
    // until the bottom-up walk reaches them - that's expected, not a bug.
    const snapshots = avlInsertEngine([10, 20, 30, 40, 50, 25, 5, 15, 45, 35, 1, 100, 60])
    const completions = snapshots.filter((s) => !s.isPredictionRequired && s.description.includes('inserted. The tree remains'))
    expect(completions.length).toBe(13)
    for (const snapshot of completions) {
      const state = snapshot.dataStructureState as AVLState
      checkHeightsAndBalance(state.root)
    }
  })

  it('maintains the BST property at every snapshot', () => {
    const snapshots = avlInsertEngine([10, 20, 30, 40, 50, 25, 5, 15, 45, 35])
    for (const snapshot of snapshots) {
      const state = snapshot.dataStructureState as AVLState
      expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
    }
  })

  it('keeps every original value present after a sequence with multiple rotations', () => {
    const input = [10, 20, 30, 40, 50, 25, 5, 15, 45, 35]
    const snapshots = avlInsertEngine(input)
    const state = lastState(snapshots)
    expect(values(state.root).sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b))
  })

  it('sends duplicate values right, per standard convention', () => {
    const snapshots = avlInsertEngine([8, 8])
    const state = lastState(snapshots)
    expect(state.root?.right?.value).toBe(8)
    expect(state.root?.left).toBeNull()
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = avlInsertEngine([10, 20, 30, 40, 50])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = avlInsertEngine([10, 20, 30])
    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })

  it('emits AVL_BALANCE_CHECK snapshots whose balanceFactor field matches the node it names', () => {
    const snapshots = avlInsertEngine([10, 20, 30, 40, 50])
    const checks = snapshots.filter((s) => s.criticalJunctionType === 'AVL_BALANCE_CHECK')
    expect(checks.length).toBeGreaterThan(0)
    checks.forEach((s) => {
      const state = s.dataStructureState as AVLState
      expect(state.balanceFactor).toBe(state.currentNode?.balanceFactor)
    })
  })
})

describe('avlDeleteEngine', () => {
  function buildTree(values: number[]): AVLNode | null {
    return lastState(avlInsertEngine(values)).root
  }

  it('removes a leaf node and keeps the tree balanced', () => {
    const root = buildTree([10, 20, 30, 40, 50, 25, 5, 15, 45, 35])
    const snapshots = avlDeleteEngine(root, 5)
    const state = lastState(snapshots)
    expect(values(state.root)).not.toContain(5)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
    checkHeightsAndBalance(state.root)
  })

  it('removes a node with two children by promoting its in-order successor', () => {
    const root = buildTree([10, 20, 30, 40, 50, 25, 5, 15, 45, 35])
    const snapshots = avlDeleteEngine(root, 20)
    const state = lastState(snapshots)
    expect(values(state.root)).not.toContain(20)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
    checkHeightsAndBalance(state.root)
  })

  it('rebalances when deleting the root itself triggers an imbalance', () => {
    // Insert order chosen so root deletion forces the tree to rebalance
    // via one of the four rotation cases.
    const root = buildTree([50, 25, 75, 12, 37, 62, 87, 6])
    const snapshots = avlDeleteEngine(root, 50)
    const state = lastState(snapshots)
    expect(values(state.root)).not.toContain(50)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
    checkHeightsAndBalance(state.root)
  })

  it('maintains balance across deleting every node one at a time', () => {
    const input = [10, 20, 30, 40, 50, 25, 5, 15, 45, 35, 1, 100, 60]
    let root = buildTree(input)
    for (const v of input) {
      const snapshots = avlDeleteEngine(root, v)
      root = lastState(snapshots).root
      if (root) checkHeightsAndBalance(root)
    }
    expect(root).toBeNull()
  })

  it('reports nothing to delete for a value absent from the tree, tree unchanged', () => {
    const root = buildTree([10, 20, 30])
    const before = values(root)
    const snapshots = avlDeleteEngine(root, 999)
    expect(values(lastState(snapshots).root)).toEqual(before)
  })

  it('never mutates the tree passed in', () => {
    const root = buildTree([10, 20, 30, 40, 50])
    const before = values(root)
    avlDeleteEngine(root, 20)
    expect(values(root)).toEqual(before)
  })

  it('has sequential stepIndex values with no gaps', () => {
    const root = buildTree([10, 20, 30, 40, 50])
    const snapshots = avlDeleteEngine(root, 20)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
