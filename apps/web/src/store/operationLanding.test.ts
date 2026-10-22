import { beforeEach, describe, expect, it } from 'vitest'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { dequeEngine } from '@/engine/queue'
import { circularQueueEngine } from '@/engine/queue'
import { stackPushEngine } from '@/engine/stack'

/**
 * Pressing an operation control must show what the operation did.
 *
 * Every control loaded its run at step 0. For a structure that builds
 * itself up from empty - the deque and the circular queue - step 0 is the
 * structure BEFORE even its seed operations, so all four deque controls
 * showed an empty deque and looked completely dead. The whole suite passed
 * while that was true, because nothing here pressed a button.
 */

const DQ_SEED = [
  { op: 'pushBack' as const, value: 5 },
  { op: 'pushFront' as const, value: 3 },
  { op: 'pushBack' as const, value: 8 },
]

const size = (snapshot: { dataStructureState: unknown }) => {
  const state = snapshot.dataStructureState as { items?: unknown[] }
  return Array.isArray(state?.items) ? state.items.length : 0
}

beforeEach(() => {
  useAlgorithmStore.setState({ snapshotArray: [], stepIndex: 0, tracedToEnd: false })
})

describe('a structure that builds itself up from empty', () => {
  it('starts its run empty, which is why step 0 was the wrong place to land', () => {
    const run = dequeEngine(5, [...DQ_SEED, { op: 'pushFront', value: 77 }])
    expect(size(run[0])).toBe(0)
    expect(size(run[run.length - 1])).toBeGreaterThan(0)
  })

  it('is true of the circular queue too', () => {
    const run = circularQueueEngine(5, [{ op: 'enqueue', value: 5 }, { op: 'enqueue', value: 77 }])
    expect(size(run[0])).toBe(0)
    expect(size(run[run.length - 1])).toBeGreaterThan(0)
  })
})

describe('setAlgorithm landing', () => {
  it("lands on the operation's result when asked to", () => {
    const run = dequeEngine(5, [...DQ_SEED, { op: 'pushFront', value: 77 }])
    useAlgorithmStore.getState().setAlgorithm('Deque', run, 'result')
    const { stepIndex, snapshotArray } = useAlgorithmStore.getState()
    expect(stepIndex).toBe(run.length - 1)
    expect(size(snapshotArray[stepIndex]), 'the learner must see a non-empty deque').toBeGreaterThan(0)
  })

  it('still starts at the beginning by default, for setting a run up', () => {
    const run = dequeEngine(5, DQ_SEED)
    useAlgorithmStore.getState().setAlgorithm('Deque', run)
    expect(useAlgorithmStore.getState().stepIndex).toBe(0)
  })

  it('never lands past the end of a one-step run', () => {
    useAlgorithmStore.getState().setAlgorithm('Stack', stackPushEngine([5], [7], 6), 'result')
    const { stepIndex, snapshotArray } = useAlgorithmStore.getState()
    expect(stepIndex).toBe(snapshotArray.length - 1)
    expect(stepIndex).toBeGreaterThanOrEqual(0)
  })

  it('copes with an empty run rather than landing on -1', () => {
    useAlgorithmStore.getState().setAlgorithm('Nothing', [], 'result')
    expect(useAlgorithmStore.getState().stepIndex).toBe(0)
  })
})

describe('tracedToEnd', () => {
  it('is false when the run was handed to the learner at its end', () => {
    // Pressing Push Front is not tracing an execution, so the end-of-run
    // offers ("You traced the full execution") must not greet it. They
    // fired on every press of every structure control.
    useAlgorithmStore.getState().setAlgorithm('Deque', dequeEngine(5, DQ_SEED), 'result')
    expect(useAlgorithmStore.getState().tracedToEnd).toBe(false)
  })

  it('is false on a fresh run, and true once the learner steps to the end', () => {
    const run = dequeEngine(5, DQ_SEED)
    useAlgorithmStore.getState().setAlgorithm('Deque', run)
    expect(useAlgorithmStore.getState().tracedToEnd).toBe(false)
    for (let i = 0; i < run.length; i += 1) useAlgorithmStore.getState().stepForward()
    expect(useAlgorithmStore.getState().stepIndex).toBe(run.length - 1)
    expect(useAlgorithmStore.getState().tracedToEnd).toBe(true)
  })

  it('resets when a new run is loaded', () => {
    const run = dequeEngine(5, DQ_SEED)
    useAlgorithmStore.getState().setAlgorithm('Deque', run)
    for (let i = 0; i < run.length; i += 1) useAlgorithmStore.getState().stepForward()
    expect(useAlgorithmStore.getState().tracedToEnd).toBe(true)
    useAlgorithmStore.getState().setAlgorithm('Deque', dequeEngine(5, DQ_SEED))
    expect(useAlgorithmStore.getState().tracedToEnd).toBe(false)
  })
})
