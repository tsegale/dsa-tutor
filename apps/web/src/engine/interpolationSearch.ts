import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface InterpolationSearchState {
  array: number[]
  target: number
  low: number
  high: number
  probedIndex: number | null
  probeFormula: string
  found: boolean
  foundIndex: number | null
}

const PSEUDOCODE_LINE = { INIT: 0, RANGE_CHECK: 1, PROBE: 2, FOUND: 3, NOT_FOUND: 4 } as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: InterpolationSearchState
  activeIndices?: number[]
  highlightIndices?: number[]
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    canvasType: CanvasType.ARRAY,
    dataStructureState: { ...params.state, array: [...params.state.array] },
    activeIndices: [...(params.activeIndices ?? [])],
    highlightIndices: [...(params.highlightIndices ?? [])],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

/**
 * Pure snapshot engine for Interpolation Search. Requires a sorted
 * array (sorted internally). Instead of always checking the midpoint
 * like Binary Search, it estimates the probe position from the target's
 * value relative to the range's endpoints - a real advantage only when
 * values are roughly uniformly distributed. Never mutates `input`.
 */
export function interpolationSearchEngine(input: number[], target: number): AlgorithmSnapshot[] {
  const array = [...input].sort((a, b) => a - b)
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const baseState = (overrides: Partial<InterpolationSearchState> = {}): InterpolationSearchState => ({
    array,
    target,
    low: 0,
    high: n - 1,
    probedIndex: null,
    probeFormula: '',
    found: false,
    foundIndex: null,
    ...overrides,
  })

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: `Starting Interpolation Search for target ${target}. Unlike Binary Search's fixed midpoint, this estimates where the target likely is using the value distribution.`,
      pseudocodeLine: PSEUDOCODE_LINE.INIT,
      isPredictionRequired: false,
      state: baseState(),
    }),
  )

  if (n === 0) {
    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `The array is empty, so target ${target} was not found.`,
        pseudocodeLine: PSEUDOCODE_LINE.NOT_FOUND,
        isPredictionRequired: false,
        state: baseState({ high: -1 }),
        isFinalStep: true,
      }),
    )
    return snapshots
  }

  let low = 0
  let high = n - 1
  let found = false
  let foundIndex: number | null = null

  while (low <= high && target >= array[low] && target <= array[high]) {
    if (array[low] === array[high]) {
      if (array[low] === target) {
        found = true
        foundIndex = low
      }
      break
    }

    const pos = low + Math.floor(((target - array[low]) * (high - low)) / (array[high] - array[low]))
    const formula = `${low} + ((${target} - ${array[low]}) x (${high} - ${low})) / (${array[high]} - ${array[low]}) = ${pos}`

    snapshots.push(
      makeSnapshot({
        stepIndex: stepIndex++,
        description: `Using the interpolation formula with target=${target}, low=${low}, high=${high}, where is the probe position?`,
        pseudocodeLine: PSEUDOCODE_LINE.PROBE,
        isPredictionRequired: true,
        state: baseState({ low, high, probedIndex: pos, probeFormula: formula }),
        activeIndices: [pos],
        criticalJunctionType: CriticalJunctionType.PROBE_POSITION,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    if (array[pos] === target) {
      found = true
      foundIndex = pos
      break
    }
    if (array[pos] < target) {
      low = pos + 1
    } else {
      high = pos - 1
    }
  }

  snapshots.push(
    makeSnapshot({
      stepIndex: stepIndex++,
      description: found
        ? `Interpolation Search complete. Target ${target} was found at index ${foundIndex}.`
        : `Interpolation Search complete. Target ${target} was not found in the array.`,
      pseudocodeLine: found ? PSEUDOCODE_LINE.FOUND : PSEUDOCODE_LINE.NOT_FOUND,
      isPredictionRequired: true,
      state: baseState({ low, high, found, foundIndex }),
      highlightIndices: found && foundIndex !== null ? [foundIndex] : [],
      criticalJunctionType: CriticalJunctionType.ALGORITHM_COMPLETE,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      isFinalStep: true,
    }),
  )

  return snapshots
}
