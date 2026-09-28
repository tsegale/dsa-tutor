import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AlgorithmMode, JunctionDifficulty, ScaffoldingLevel, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { endsSegment, isWorkedStep, workedStepNarration } from './workedSteps'
import { WORKED_STEP_DWELL_MS } from '@/config/pacing'
import {
  __clearAutoAdvanceTimerForTests,
  selectIsLiveJunction,
  selectIsWorkedStep,
  useAlgorithmStore,
} from '@/store/useAlgorithmStore'

// Enough procedural junctions to see the ratio: a larger reverse-sorted run.
const RUN = bubbleSortEngine([9, 8, 7, 6, 5, 4, 3, 2, 1])

const procedural = (snapshots: readonly AlgorithmSnapshot[]) =>
  snapshots
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => s.isPredictionRequired && s.junctionDifficulty === JunctionDifficulty.PROCEDURAL)
const conceptual = (snapshots: readonly AlgorithmSnapshot[]) =>
  snapshots
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => s.isPredictionRequired && s.junctionDifficulty === JunctionDifficulty.CONCEPTUAL)

function workedShare(level: ScaffoldingLevel): number {
  const steps = procedural(RUN)
  return steps.filter(({ index }) => isWorkedStep(RUN, index, level)).length / steps.length
}

describe('isWorkedStep', () => {
  it('has enough procedural junctions in the fixture to measure a ratio', () => {
    expect(procedural(RUN).length).toBeGreaterThanOrEqual(8)
  })

  it('works roughly three in four procedural junctions at HIGH', () => {
    expect(workedShare(ScaffoldingLevel.HIGH)).toBeGreaterThanOrEqual(0.7)
    expect(workedShare(ScaffoldingLevel.HIGH)).toBeLessThanOrEqual(0.8)
  })

  it('alternates at MEDIUM and asks every procedural junction at LOW and NONE', () => {
    expect(workedShare(ScaffoldingLevel.MEDIUM)).toBeCloseTo(0.5, 1)
    expect(workedShare(ScaffoldingLevel.LOW)).toBe(0)
    expect(workedShare(ScaffoldingLevel.NONE)).toBe(0)
  })

  it('never works a conceptual junction, at any level', () => {
    expect(conceptual(RUN).length).toBeGreaterThan(0)
    for (const level of Object.values(ScaffoldingLevel)) {
      expect(conceptual(RUN).some(({ index }) => isWorkedStep(RUN, index, level))).toBe(false)
    }
  })

  it('opens with demonstrations at HIGH and is deterministic across runs', () => {
    const pattern = (snapshots: readonly AlgorithmSnapshot[]) =>
      procedural(snapshots).map(({ index }) => isWorkedStep(snapshots, index, ScaffoldingLevel.HIGH))
    expect(pattern(RUN).slice(0, 4)).toEqual([true, true, true, false])
    // A fresh engine run on the same input yields the same sequence.
    expect(pattern(bubbleSortEngine([9, 8, 7, 6, 5, 4, 3, 2, 1]))).toEqual(pattern(RUN))
  })

  it('never marks a plain narration step as worked', () => {
    const narration = RUN.findIndex((s) => !s.isPredictionRequired)
    expect(isWorkedStep(RUN, narration, ScaffoldingLevel.HIGH)).toBe(false)
  })

  it('ends a segment only at a conceptual junction', () => {
    expect(conceptual(RUN).every(({ index }) => endsSegment(RUN, index))).toBe(true)
    expect(procedural(RUN).some(({ index }) => endsSegment(RUN, index))).toBe(false)
  })

  it('narrates the step and how the algorithm resolves it', () => {
    const [first] = procedural(RUN)
    const text = workedStepNarration(RUN, first.index)
    expect(text).toContain(RUN[first.index].description)
    expect(text).toContain(RUN[first.index + 1].description)
  })
})

describe('store: worked steps and segment boundaries', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useAlgorithmStore.setState({ scaffoldingLevel: ScaffoldingLevel.HIGH, mode: AlgorithmMode.PRACTICE, isPlaying: false })
    useAlgorithmStore.getState().setFadingEnabled(true)
    useAlgorithmStore.getState().setAlgorithm('Bubble Sort', RUN)
    __clearAutoAdvanceTimerForTests()
  })

  afterEach(() => {
    __clearAutoAdvanceTimerForTests()
    useAlgorithmStore.getState().setFadingEnabled(false)
    vi.useRealTimers()
  })

  const goTo = (index: number) => {
    // Walk forward one step at a time so segment boundaries are crossed as a learner would.
    while (useAlgorithmStore.getState().stepIndex < index) useAlgorithmStore.getState().stepForward()
    __clearAutoAdvanceTimerForTests()
  }

  it('treats a worked step as not live and a performed step as live', () => {
    const steps = procedural(RUN)
    goTo(steps[0].index)
    expect(selectIsWorkedStep(useAlgorithmStore.getState())).toBe(true)
    expect(selectIsLiveJunction(useAlgorithmStore.getState())).toBe(false)
    goTo(steps[3].index)
    expect(selectIsLiveJunction(useAlgorithmStore.getState())).toBe(true)
  })

  it('applies a mid-pass step-down only after the next conceptual junction', () => {
    const [firstConceptual] = conceptual(RUN)
    const proceduralBefore = procedural(RUN).filter(({ index }) => index < firstConceptual.index)
    const proceduralAfter = procedural(RUN).filter(({ index }) => index > firstConceptual.index)

    goTo(proceduralBefore[0].index)
    useAlgorithmStore.getState().setScaffoldingLevel(ScaffoldingLevel.LOW)
    // Still HIGH fading for the rest of this pass.
    expect(useAlgorithmStore.getState().segmentScaffoldingLevel).toBe(ScaffoldingLevel.HIGH)
    goTo(firstConceptual.index)
    expect(useAlgorithmStore.getState().segmentScaffoldingLevel).toBe(ScaffoldingLevel.HIGH)

    // Past the pass boundary: LOW - every procedural junction is live.
    goTo(proceduralAfter[0].index)
    expect(useAlgorithmStore.getState().segmentScaffoldingLevel).toBe(ScaffoldingLevel.LOW)
    expect(selectIsLiveJunction(useAlgorithmStore.getState())).toBe(true)
  })

  it('takes a level change immediately before the run starts', () => {
    useAlgorithmStore.getState().setScaffoldingLevel(ScaffoldingLevel.LOW)
    expect(useAlgorithmStore.getState().segmentScaffoldingLevel).toBe(ScaffoldingLevel.LOW)
  })

  it('never fades on a topic without fading enabled', () => {
    useAlgorithmStore.getState().setFadingEnabled(false)
    goTo(procedural(RUN)[0].index)
    expect(selectIsWorkedStep(useAlgorithmStore.getState())).toBe(false)
    expect(selectIsLiveJunction(useAlgorithmStore.getState())).toBe(true)
  })

  it('auto-advances a worked step after the reading dwell, not the narration delay', () => {
    const worked = procedural(RUN)[0].index
    goTo(worked - 1)
    useAlgorithmStore.getState().stepForward() // lands on the worked step, scheduling its dwell
    vi.advanceTimersByTime(WORKED_STEP_DWELL_MS - 1)
    expect(useAlgorithmStore.getState().stepIndex).toBe(worked)
    vi.advanceTimersByTime(1)
    expect(useAlgorithmStore.getState().stepIndex).toBe(worked + 1)
  })
})
