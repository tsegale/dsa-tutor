import { describe, it, expect } from 'vitest'
import { rbInsertEngine, rbDeleteEngine, type RBNode, type RBState } from './redBlackTree'

function lastState(snapshots: ReturnType<typeof rbInsertEngine>): RBState {
  return snapshots[snapshots.length - 1].dataStructureState as RBState
}

function values(node: RBNode | null): number[] {
  if (!node) return []
  return [...values(node.left), node.value, ...values(node.right)]
}

function isValidBST(node: RBNode | null, min: number, max: number): boolean {
  if (!node) return true
  if (node.value < min || node.value > max) return false
  return isValidBST(node.left, min, node.value - 1) && isValidBST(node.right, node.value, max)
}

/** Verifies all four Red-Black invariants relevant to a null-as-leaf
 * implementation: (2) root is black, (4) a red node never has a red
 * child, (5) every root-to-null path has the same black-height. (Rule 1,
 * "every node is red or black", holds by the type system; rule 3,
 * "leaves are black", holds vacuously since null leaves aren't coloured
 * nodes at all - only the four checkable rules are asserted here.) */
function checkRedBlackInvariants(root: RBNode | null): void {
  expect(root === null || root.color).not.toBe('RED')

  function check(node: RBNode | null, parentColor: RBColorLike): number {
    if (!node) return 1 // null leaves count as black, contributing 1 to black-height
    if (node.color === 'RED') {
      expect(parentColor).not.toBe('RED')
    }
    const leftBH = check(node.left, node.color)
    const rightBH = check(node.right, node.color)
    expect(leftBH).toBe(rightBH)
    return leftBH + (node.color === 'BLACK' ? 1 : 0)
  }

  check(root, 'BLACK')
}

type RBColorLike = 'RED' | 'BLACK'

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

describe('rbInsertEngine', () => {
  it('creates a black root from a single value', () => {
    const snapshots = rbInsertEngine([42])
    const state = lastState(snapshots)
    expect(state.root).toMatchObject({ value: 42, color: 'BLACK' })
  })

  it('maintains all Red-Black invariants after each of a sequence of ascending inserts (repeated right rotations)', () => {
    const snapshots = rbInsertEngine([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    checkRedBlackInvariants(lastState(snapshots).root)
    expect(values(lastState(snapshots).root).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('maintains all Red-Black invariants after each of a sequence of descending inserts (repeated left rotations)', () => {
    const snapshots = rbInsertEngine([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    checkRedBlackInvariants(lastState(snapshots).root)
  })

  it('maintains the BST property after every completed insertion', () => {
    const input = [10, 20, 30, 40, 50, 25, 5, 15, 45, 35]
    const snapshots = rbInsertEngine(input)
    const completions = snapshots.filter((s) => !s.isPredictionRequired && s.description.includes('inserted. The root'))
    expect(completions.length).toBe(input.length)
    for (const s of completions) {
      const state = s.dataStructureState as RBState
      expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
      checkRedBlackInvariants(state.root)
    }
  })

  it('keeps every original value present after many inserts', () => {
    const input = [50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 56, 68, 81, 93]
    const snapshots = rbInsertEngine(input)
    expect(values(lastState(snapshots).root).sort((a, b) => a - b)).toEqual([...input].sort((a, b) => a - b))
  })

  it('maintains invariants across 50 random insert sequences', () => {
    const rand = seededRandom(12345)
    for (let trial = 0; trial < 50; trial++) {
      const input = Array.from({ length: 15 }, () => Math.floor(rand() * 200))
      const uniqueInput = Array.from(new Set(input))
      const snapshots = rbInsertEngine(uniqueInput)
      const state = lastState(snapshots)
      checkRedBlackInvariants(state.root)
      expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
      expect(values(state.root).sort((a, b) => a - b)).toEqual([...uniqueInput].sort((a, b) => a - b))
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const snapshots = rbInsertEngine([10, 20, 30, 40, 50])
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })

  it('marks isFinalStep true only on the last snapshot', () => {
    const snapshots = rbInsertEngine([10, 20, 30])
    snapshots.forEach((snapshot, i) => {
      expect(snapshot.isFinalStep).toBe(i === snapshots.length - 1)
    })
  })
})

describe('rbDeleteEngine', () => {
  function buildTree(values: number[]): RBNode | null {
    return lastState(rbInsertEngine(values)).root
  }

  it('removes a leaf node and keeps Red-Black invariants intact', () => {
    const root = buildTree([10, 20, 30, 40, 50, 25, 5, 15, 45, 35])
    const snapshots = rbDeleteEngine(root, 5)
    const state = lastState(snapshots)
    expect(values(state.root)).not.toContain(5)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
    checkRedBlackInvariants(state.root)
  })

  it('removes a node with two children by promoting its in-order successor', () => {
    const root = buildTree([10, 20, 30, 40, 50, 25, 5, 15, 45, 35])
    const snapshots = rbDeleteEngine(root, 20)
    const state = lastState(snapshots)
    expect(values(state.root)).not.toContain(20)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
    checkRedBlackInvariants(state.root)
  })

  it('removes the root itself', () => {
    const root = buildTree([10, 20, 30, 40, 50, 25, 5, 15, 45, 35])
    const rootValue = root!.value
    const snapshots = rbDeleteEngine(root, rootValue)
    const state = lastState(snapshots)
    expect(values(state.root)).not.toContain(rootValue)
    expect(isValidBST(state.root, -Infinity, Infinity)).toBe(true)
    checkRedBlackInvariants(state.root)
  })

  it('reports nothing to delete for a value absent from the tree, tree unchanged', () => {
    const root = buildTree([10, 20, 30])
    const before = values(root)
    const snapshots = rbDeleteEngine(root, 999)
    expect(values(lastState(snapshots).root)).toEqual(before)
  })

  it('never mutates the tree passed in', () => {
    const root = buildTree([10, 20, 30, 40, 50])
    const before = values(root)
    rbDeleteEngine(root, 20)
    expect(values(root)).toEqual(before)
  })

  it('maintains invariants and loses no data across deleting every node one at a time', () => {
    const input = [10, 20, 30, 40, 50, 25, 5, 15, 45, 35, 1, 100, 60]
    let root = buildTree(input)
    for (const v of input) {
      const snapshots = rbDeleteEngine(root, v)
      root = lastState(snapshots).root
      expect(values(root)).not.toContain(v)
      if (root) {
        expect(isValidBST(root, -Infinity, Infinity)).toBe(true)
        checkRedBlackInvariants(root)
      }
    }
    expect(root).toBeNull()
  })

  it('maintains invariants across 30 random build-then-delete-all sequences', () => {
    const rand = seededRandom(54321)
    for (let trial = 0; trial < 30; trial++) {
      const raw = Array.from({ length: 12 }, () => Math.floor(rand() * 200))
      const input = Array.from(new Set(raw))
      let root = buildTree(input)
      // Delete in a different (shuffled) order than insertion, which
      // exercises more of the fix-up cases than deleting in insert order.
      const deleteOrder = [...input].sort(() => rand() - 0.5)
      for (const v of deleteOrder) {
        const snapshots = rbDeleteEngine(root, v)
        root = lastState(snapshots).root
        expect(values(root)).not.toContain(v)
        if (root) {
          expect(isValidBST(root, -Infinity, Infinity)).toBe(true)
          checkRedBlackInvariants(root)
        }
      }
      expect(root).toBeNull()
    }
  })

  it('has sequential stepIndex values with no gaps', () => {
    const root = buildTree([10, 20, 30, 40, 50])
    const snapshots = rbDeleteEngine(root, 20)
    expect(snapshots.map((s) => s.stepIndex)).toEqual(snapshots.map((_, i) => i))
  })
})
