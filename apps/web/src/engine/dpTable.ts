import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

/**
 * The state behind every table-filling technique: prefix sums, the
 * monotonic stack's answer array, and both dynamic programming topics.
 *
 * One shape for four topics because they are one picture. A table fills in
 * a definite order; each cell is computed from named earlier cells; and
 * that dependency IS the recurrence, which is the only thing there is to
 * learn. Four engines each inventing their own state would have meant four
 * canvases drawing the same thing slightly differently, and the drift
 * would have been in the part the student reads.
 *
 * Deliberately not MatrixState: that is written against Floyd-Warshall's
 * distance matrix, where every cell is live at once and k sweeps through
 * them. A DP table has a filled region and an unfilled one, and the edge
 * between them is where the student is standing.
 */
export interface DPTableState {
  /** The problem input, drawn above the table. Empty when there is none. */
  input: number[]
  /** A label per input element, when the elements are not the point: the
   * characters of a string, an activity's name. */
  inputLabels: string[] | null
  /** Row labels; one entry for a 1D table. */
  rowLabels: string[]
  /** Column labels. */
  colLabels: string[]
  /** The table itself, row-major. null is an unfilled cell. */
  table: (number | null)[][]
  /** The cell being computed, as [row, col]. Null between cells. */
  current: [number, number] | null
  /** The cells `current` is computed from: the recurrence, drawn. */
  dependsOn: [number, number][]
  /** Cells already settled, so the canvas can dim the rest. */
  filled: [number, number][]
  /** Indices of `input` under a marker: the monotonic stack's contents, a
   * window, a chosen subset. */
  marked: number[]
  /** What the marker means, for the legend. Null when nothing is marked. */
  markerLabel: string | null
  /** One line of arithmetic for the step, shown under the table. */
  working: string | null
  /** The answer, once the run has one. */
  answer: number | null
  /**
   * Amortised accounting, for a topic whose complexity claim IS a count.
   *
   * The monotonic stack's inner `while` makes every step look quadratic,
   * and the only honest answer is that each index is pushed once and
   * popped once. Carrying the two running totals on the state puts them in
   * the variable watcher beside the canvas, where a student can watch the
   * claim hold rather than take it on trust. Left undefined by topics that
   * make no such claim.
   */
  pushes?: number
  pops?: number
  /**
   * The working variables for the step, named as the pseudocode names
   * them, for the watch panel beside the canvas.
   *
   * These topics' state is a picture - a grid and a cursor - so the things
   * a student would watch in a debugger are not fields of it. Declaring
   * them here keeps the panel honest without turning DPTableState into a
   * union of seven engines' locals.
   */
  watch?: Record<string, number | string | boolean | null>
}

export interface DPSnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: DPTableState
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
  isFinalStep?: boolean
}

export function makeDPSnapshot(params: DPSnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    canvasType: CanvasType.DP_TABLE,
    dataStructureState: {
      ...params.state,
      input: [...params.state.input],
      table: params.state.table.map((row) => [...row]),
      dependsOn: params.state.dependsOn.map((cell) => [...cell] as [number, number]),
      filled: params.state.filled.map((cell) => [...cell] as [number, number]),
      marked: [...params.state.marked],
    },
    // The table is the canvas here, so the index arrays describe the input
    // strip above it rather than a bar chart.
    activeIndices: [...params.state.marked],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
  }
}

/** A blank state, for an engine to spread over. */
export function emptyDPState(overrides: Partial<DPTableState> = {}): DPTableState {
  return {
    input: [],
    inputLabels: null,
    rowLabels: [],
    colLabels: [],
    table: [],
    current: null,
    dependsOn: [],
    filled: [],
    marked: [],
    markerLabel: null,
    working: null,
    answer: null,
    ...overrides,
  }
}

/** Every cell of a table that holds a value, for the `filled` set. */
export function filledCells(table: (number | null)[][]): [number, number][] {
  const cells: [number, number][] = []
  table.forEach((row, r) => row.forEach((value, c) => value !== null && cells.push([r, c])))
  return cells
}
