import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AlgorithmMode } from '@dsa-tutor/types'
import {
  useAlgorithmStore,
  selectCurrentSnapshot,
  selectProgressPercent,
  selectIsPredictionStep,
  __clearAutoAdvanceTimerForTests,
} from './useAlgorithmStore'

beforeEach(() => {
  useAlgorithmStore.setState(useAlgorithmStore.getInitialState(), true)
})

// The narration auto-advance timer (see scheduleNarrationAutoAdvance) is
// module-global, not store state, so setMode/stepForward/etc. in Practice
// mode can leave a real pending timeout that outlives its test and fires
// during a later one unless every test cleans it up.
afterEach(() => {
  __clearAutoAdvanceTimerForTests()
})

describe('useAlgorithmStore', () => {
  it('has the correct initial state', () => {
    const state = useAlgorithmStore.getState()

    expect(state.algorithmName).toBe('Bubble Sort')
    expect(state.snapshotArray.length).toBeGreaterThan(0)
    expect(state.stepIndex).toBe(0)
    expect(state.mode).toBe(AlgorithmMode.DEMO)
    expect(state.sessionXP).toBe(0)
    expect(state.focusModeActive).toBe(false)
    expect(state.isPlaying).toBe(false)
    expect(state.playbackSpeed).toBe(1.0)
    expect(state.sessionId).toBeNull()
    expect(state.userId).toBeNull()
  })

  it('stepForward increments and stops at the last index', () => {
    useAlgorithmStore.getState().stepForward()
    expect(useAlgorithmStore.getState().stepIndex).toBe(1)

    const lastIndex = useAlgorithmStore.getState().snapshotArray.length - 1
    useAlgorithmStore.setState({ stepIndex: lastIndex })
    useAlgorithmStore.getState().stepForward()
    expect(useAlgorithmStore.getState().stepIndex).toBe(lastIndex)
  })

  it('stepBackward decrements and stops at 0', () => {
    useAlgorithmStore.setState({ stepIndex: 2 })
    useAlgorithmStore.getState().stepBackward()
    expect(useAlgorithmStore.getState().stepIndex).toBe(1)

    useAlgorithmStore.setState({ stepIndex: 0 })
    useAlgorithmStore.getState().stepBackward()
    expect(useAlgorithmStore.getState().stepIndex).toBe(0)
  })

  it('resetAlgorithm returns stepIndex to 0 and stops playback', () => {
    useAlgorithmStore.setState({ stepIndex: 3, isPlaying: true })
    useAlgorithmStore.getState().resetAlgorithm()

    expect(useAlgorithmStore.getState().stepIndex).toBe(0)
    expect(useAlgorithmStore.getState().isPlaying).toBe(false)
  })

  it('setMode changes mode and preserves stepIndex', () => {
    useAlgorithmStore.setState({ stepIndex: 2 })
    useAlgorithmStore.getState().setMode(AlgorithmMode.PRACTICE)

    expect(useAlgorithmStore.getState().mode).toBe(AlgorithmMode.PRACTICE)
    expect(useAlgorithmStore.getState().stepIndex).toBe(2)
  })

  it('setMode stops playback in progress', () => {
    useAlgorithmStore.setState({ isPlaying: true })
    useAlgorithmStore.getState().setMode(AlgorithmMode.PRACTICE)

    expect(useAlgorithmStore.getState().isPlaying).toBe(false)
  })

  it('addXP accumulates across calls and ignores negative values', () => {
    useAlgorithmStore.getState().addXP(10)
    useAlgorithmStore.getState().addXP(5)
    expect(useAlgorithmStore.getState().sessionXP).toBe(15)

    useAlgorithmStore.getState().addXP(-100)
    expect(useAlgorithmStore.getState().sessionXP).toBe(15)
  })

  it('setPlaybackSpeed clamps to the 0.5-3.0 range', () => {
    useAlgorithmStore.getState().setPlaybackSpeed(0.1)
    expect(useAlgorithmStore.getState().playbackSpeed).toBe(0.5)

    useAlgorithmStore.getState().setPlaybackSpeed(10)
    expect(useAlgorithmStore.getState().playbackSpeed).toBe(3.0)

    useAlgorithmStore.getState().setPlaybackSpeed(1.5)
    expect(useAlgorithmStore.getState().playbackSpeed).toBe(1.5)
  })

  it('selectCurrentSnapshot returns the snapshot at the current stepIndex', () => {
    useAlgorithmStore.setState({ stepIndex: 2 })
    const state = useAlgorithmStore.getState()

    expect(selectCurrentSnapshot(state)).toBe(state.snapshotArray[2])
  })

  it('selectProgressPercent is 0 at start, 100 at end, and between at midpoint', () => {
    const lastIndex = useAlgorithmStore.getState().snapshotArray.length - 1

    expect(selectProgressPercent(useAlgorithmStore.getState())).toBe(0)

    useAlgorithmStore.setState({ stepIndex: lastIndex })
    expect(selectProgressPercent(useAlgorithmStore.getState())).toBe(100)

    const midpoint = Math.floor(lastIndex / 2)
    useAlgorithmStore.setState({ stepIndex: midpoint })
    const midPercent = selectProgressPercent(useAlgorithmStore.getState())
    expect(midPercent).toBeGreaterThanOrEqual(0)
    expect(midPercent).toBeLessThanOrEqual(100)
  })

  it('selectIsPredictionStep is false in DEMO mode even when the snapshot requires a prediction', () => {
    const { snapshotArray } = useAlgorithmStore.getState()
    const predictionStepIndex = snapshotArray.findIndex((s) => s.isPredictionRequired)
    expect(predictionStepIndex).toBeGreaterThanOrEqual(0)

    useAlgorithmStore.setState({ stepIndex: predictionStepIndex })
    const state = useAlgorithmStore.getState()

    expect(state.mode).toBe(AlgorithmMode.DEMO)
    expect(selectCurrentSnapshot(state)?.isPredictionRequired).toBe(true)
    expect(selectIsPredictionStep(state)).toBe(false)
  })

  it('stepForward advances past prediction steps in DEMO mode', () => {
    const store = useAlgorithmStore.getState()
    store.setMode(AlgorithmMode.DEMO)
    // Find a snapshot with isPredictionRequired true
    const predictionIndex = store.snapshotArray.findIndex((s) => s.isPredictionRequired)
    if (predictionIndex === -1) return // no prediction steps in this array
    useAlgorithmStore.setState({ stepIndex: predictionIndex - 1 })
    store.stepForward()
    expect(useAlgorithmStore.getState().stepIndex).toBe(predictionIndex)
    store.stepForward()
    expect(useAlgorithmStore.getState().stepIndex).toBe(predictionIndex + 1)
  })

  it('playback does not stop at prediction steps in DEMO mode', async () => {
    const store = useAlgorithmStore.getState()
    store.setMode(AlgorithmMode.DEMO)
    useAlgorithmStore.setState({ playbackSpeed: 3.0 }) // fast for testing
    store.startPlayback()
    // Wait long enough for several steps. At 3x speed the interval is
    // ~333ms, so this gives real-timer scheduling jitter enough margin
    // to reliably land more than 2 ticks (a tighter window is flaky).
    await new Promise((resolve) => setTimeout(resolve, 1400))
    store.stopPlayback()
    // Should have advanced well past step 0
    expect(useAlgorithmStore.getState().stepIndex).toBeGreaterThan(2)
  })
})

describe('Practice mode narration auto-advance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-advances through narration steps until the next Critical Junction', () => {
    const store = useAlgorithmStore.getState()
    const firstJunctionIndex = store.snapshotArray.findIndex((s) => s.isPredictionRequired)
    expect(firstJunctionIndex).toBeGreaterThan(0)

    useAlgorithmStore.setState({ stepIndex: 0 })
    store.setMode(AlgorithmMode.PRACTICE)

    vi.advanceTimersByTime(350 * (firstJunctionIndex + 1))

    expect(useAlgorithmStore.getState().stepIndex).toBe(firstJunctionIndex)
  })

  it('does not advance past a Critical Junction on its own', () => {
    const store = useAlgorithmStore.getState()
    const firstJunctionIndex = store.snapshotArray.findIndex((s) => s.isPredictionRequired)

    useAlgorithmStore.setState({ stepIndex: firstJunctionIndex })
    store.setMode(AlgorithmMode.PRACTICE)

    vi.advanceTimersByTime(5000)

    expect(useAlgorithmStore.getState().stepIndex).toBe(firstJunctionIndex)
  })

  it('does not auto-advance in DEMO mode', () => {
    useAlgorithmStore.setState({ stepIndex: 0 })
    useAlgorithmStore.getState().setMode(AlgorithmMode.DEMO)

    vi.advanceTimersByTime(5000)

    expect(useAlgorithmStore.getState().stepIndex).toBe(0)
  })

  it('stepping backward cancels a pending auto-advance instead of it firing later', () => {
    const store = useAlgorithmStore.getState()
    useAlgorithmStore.setState({ stepIndex: 1 })
    store.setMode(AlgorithmMode.PRACTICE)
    // An auto-advance from step 1 is now pending.
    store.stepBackward()
    expect(useAlgorithmStore.getState().stepIndex).toBe(0)

    // Reviewing a step is deliberate - it must not auto-advance again on
    // its own until the learner interacts (e.g. steps forward manually).
    vi.advanceTimersByTime(5000)
    expect(useAlgorithmStore.getState().stepIndex).toBe(0)
  })

  it('does not double-advance while playback is driving steps', () => {
    const store = useAlgorithmStore.getState()
    useAlgorithmStore.setState({ stepIndex: 0, mode: AlgorithmMode.PRACTICE, playbackSpeed: 1.0 })
    store.startPlayback()

    // Well past the 350ms auto-advance delay but short of playback's own
    // 1000ms tick - if the narration timer had also fired here independently
    // of playback, stepIndex would already be ahead of where a single
    // 1000ms-interval tick could have taken it.
    vi.advanceTimersByTime(500)
    expect(useAlgorithmStore.getState().stepIndex).toBe(0)
  })
})
