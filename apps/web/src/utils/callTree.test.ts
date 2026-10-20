import { describe, expect, it } from 'vitest'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { buildCallTree, liveStack, redundancy } from './callTree'

const fib = getAlgorithmRegistryEntry('recursion-fibonacci')!
const factorial = getAlgorithmRegistryEntry('recursion-factorial')!
const fibRun = fib.engineFunction(fib.defaultInput)
const factorialRun = factorial.engineFunction(factorial.defaultInput)

const last = fibRun.length - 1

describe('buildCallTree', () => {
  it('is null for a run with no call frames', () => {
    expect(buildCallTree([], 0)).toBeNull()
    const sorting = getAlgorithmRegistryEntry('bubble-sort')!.engineFunction([3, 1, 2])
    expect(buildCallTree(sorting, 1)).toBeNull()
  })

  it('finds every call the run makes, not just the live stack', () => {
    // A snapshot carries only the frames still on the stack, so a tree
    // built from one would be missing every call that already returned.
    const tree = buildCallTree(fibRun, last)!
    const liveAtEnd = liveStack(fibRun, last).length
    expect(tree.totalCalls).toBeGreaterThan(liveAtEnd)
    const finalState = fibRun[last].dataStructureState as { totalCalls?: number }
    expect(tree.totalCalls).toBe(finalState.totalCalls)
  })

  it('gives every call a parent except the first', () => {
    const tree = buildCallTree(fibRun, last)!
    const roots = tree.nodes.filter((node) => node.parentId === null)
    expect(roots).toHaveLength(1)
    expect(roots[0].depth).toBe(0)
    for (const node of tree.nodes) {
      if (node.parentId === null) continue
      const parent = tree.nodes.find((other) => other.id === node.parentId)!
      expect(parent.depth).toBe(node.depth - 1)
    }
  })

  it('never branches more than twice, as fib(k) calls fib(k-1) and fib(k-2)', () => {
    const tree = buildCallTree(fibRun, last)!
    const childCount = new Map<string, number>()
    for (const node of tree.nodes) {
      if (node.parentId) childCount.set(node.parentId, (childCount.get(node.parentId) ?? 0) + 1)
    }
    for (const count of childCount.values()) expect(count).toBeLessThanOrEqual(2)
  })

  it("gives each child the arguments fib's recurrence requires", () => {
    const tree = buildCallTree(fibRun, last)!
    for (const node of tree.nodes) {
      if (!node.parentId) continue
      const parent = tree.nodes.find((other) => other.id === node.parentId)!
      expect([parent.argument - 1, parent.argument - 2]).toContain(node.argument)
    }
  })
})

describe('the layout', () => {
  it('is the same whatever step the student is on', () => {
    // A tree that grew with the run would shift every node sideways on
    // each call. The shape is fixed; only the states change.
    const early = buildCallTree(fibRun, 3)!
    const late = buildCallTree(fibRun, last)!
    const positionAt = (tree: typeof early) => new Map(tree.nodes.map((n) => [n.id, `${n.x},${n.y}`]))
    const earlyPositions = positionAt(early)
    for (const [id, position] of positionAt(late)) {
      if (earlyPositions.has(id)) expect(earlyPositions.get(id)).toBe(position)
    }
    expect(early.columns).toBe(late.columns)
  })

  it('puts a parent between its children and never overlaps two leaves', () => {
    const tree = buildCallTree(fibRun, last)!
    const leaves = tree.nodes.filter((node) => !tree.nodes.some((other) => other.parentId === node.id))
    expect(new Set(leaves.map((leaf) => `${leaf.x},${leaf.y}`)).size).toBe(leaves.length)
    for (const node of tree.nodes) {
      const kids = tree.nodes.filter((other) => other.parentId === node.id)
      if (kids.length < 2) continue
      const xs = kids.map((kid) => kid.x)
      expect(node.x).toBeGreaterThanOrEqual(Math.min(...xs))
      expect(node.x).toBeLessThanOrEqual(Math.max(...xs))
    }
  })

  it('reports an extent the canvas can scale into', () => {
    const tree = buildCallTree(fibRun, last)!
    expect(tree.columns).toBeGreaterThan(0)
    expect(tree.rows).toBeGreaterThan(1)
    for (const node of tree.nodes) {
      expect(node.x).toBeLessThanOrEqual(tree.columns)
      expect(node.y).toBeLessThan(tree.rows)
    }
  })
})

describe('node states as the run proceeds', () => {
  it('has everything pending except the first call at step 0', () => {
    const tree = buildCallTree(fibRun, 0)!
    expect(tree.nodes.filter((node) => !node.pending)).toHaveLength(1)
    expect(tree.callsSoFar).toBe(1)
  })

  it('has nothing pending and nothing live at the end', () => {
    const tree = buildCallTree(fibRun, last)!
    expect(tree.nodes.filter((node) => node.pending)).toEqual([])
    expect(tree.nodes.filter((node) => node.live)).toEqual([])
    expect(tree.nodes.every((node) => node.returned)).toBe(true)
  })

  it('only ever reveals more calls as the student steps forward', () => {
    let previous = 0
    for (let step = 0; step < fibRun.length; step += 1) {
      const tree = buildCallTree(fibRun, step)!
      expect(tree.callsSoFar).toBeGreaterThanOrEqual(previous)
      previous = tree.callsSoFar
    }
    expect(previous).toBe(buildCallTree(fibRun, last)!.totalCalls)
  })

  it('marks live nodes as the frames still executing, not merely present', () => {
    // A frame is shown with status 'returned' for the step that reports
    // its answer, before it is popped. Counting that as live would draw a
    // finished call as still running.
    for (let step = 0; step < fibRun.length; step += 1) {
      const tree = buildCallTree(fibRun, step)!
      const live = new Set(tree.nodes.filter((node) => node.live).map((node) => node.id))
      const executing = liveStack(fibRun, step)
        .filter((frame) => frame.status !== 'returned')
        .map((frame) => frame.id)
      expect(live).toEqual(new Set(executing))
    }
  })

  it('never calls a node live and returned at once', () => {
    for (let step = 0; step < fibRun.length; step += 1) {
      for (const node of buildCallTree(fibRun, step)!.nodes) {
        expect([node.live, node.returned, node.pending].filter(Boolean)).toHaveLength(1)
      }
    }
  })
})

describe('repeated subproblems', () => {
  it('marks the second and later calls for an argument, never the first', () => {
    const tree = buildCallTree(fibRun, last)!
    const byArgument = new Map<number, typeof tree.nodes>()
    for (const node of [...tree.nodes].sort((a, b) => a.bornAt - b.bornAt)) {
      byArgument.set(node.argument, [...(byArgument.get(node.argument) ?? []), node])
    }
    for (const calls of byArgument.values()) {
      expect(calls[0].recomputed).toBe(false)
      for (const later of calls.slice(1)) expect(later.recomputed).toBe(true)
    }
  })

  it('shows fib doing far more work than it has answers', () => {
    // The case for memoisation, as one number. If these were ever equal
    // the overlay would be claiming an explosion that had not happened.
    const { distinct, calls } = redundancy(buildCallTree(fibRun, last)!)
    expect(calls).toBeGreaterThan(distinct * 2)
  })

  it('marks nothing as recomputed in factorial, which repeats nothing', () => {
    const tree = buildCallTree(factorialRun, factorialRun.length - 1)
    if (!tree) return
    expect(tree.nodes.filter((node) => node.recomputed)).toEqual([])
  })
})

describe('factorial', () => {
  it('is a straight line, one call per level', () => {
    const tree = buildCallTree(factorialRun, factorialRun.length - 1)!
    const depths = tree.nodes.map((node) => node.depth)
    expect(new Set(depths).size).toBe(depths.length)
  })
})
