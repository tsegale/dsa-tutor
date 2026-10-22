/**
 * What the array canvas can draw over the bars, read from the snapshot
 * state the engines already carry.
 *
 * Colour alone was carrying too much: a binary search step recoloured some
 * bars and a student had to infer that the range had halved. A shaded band
 * over the live range shows the halving as the shape it is. The same
 * applies to the array operations, where a shift was only visible as the
 * numbers ending up somewhere else between two frames.
 *
 * Extraction lives here rather than in the component so it can be tested
 * against every engine, and so a state shape that does not match produces
 * null instead of a half-drawn overlay.
 */

/** The live range of a search: everything outside it has been ruled out. */
export interface SearchRange {
  low: number
  high: number
  /** The index being tested right now, when the step has one. */
  probe: number | null
  /** The value being searched for. */
  target: number | null
}

function num(state: Record<string, unknown>, key: string): number | null {
  const value = state[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asState(state: unknown): Record<string, unknown> | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  return state as Record<string, unknown>
}

/**
 * Binary, interpolation and exponential search carry low and high; jump
 * search carries the block it is about to walk. Both are "the part still
 * in play", which is what the band means.
 */
export function extractSearchRange(state: unknown, length: number): SearchRange | null {
  const raw = asState(state)
  if (!raw || length === 0) return null

  const low = num(raw, 'low') ?? num(raw, 'blockStart')
  const high = num(raw, 'high') ?? num(raw, 'blockEnd')
  if (low === null || high === null) return null

  // A search that has run out of range (low > high, the not-found case)
  // has nothing left to shade, and clamping it would draw a band over a
  // range that was just eliminated.
  if (low > high) return null

  const clampedLow = Math.max(0, Math.min(low, length - 1))
  const clampedHigh = Math.max(0, Math.min(high, length - 1))
  if (clampedLow > clampedHigh) return null

  const probe = num(raw, 'mid') ?? num(raw, 'probedIndex') ?? num(raw, 'currentIndex')
  return {
    low: clampedLow,
    high: clampedHigh,
    probe: probe !== null && probe >= 0 && probe < length ? probe : null,
    target: num(raw, 'target'),
  }
}

/**
 * The address arithmetic behind a constant-time index.
 *
 * Array access is the one topic whose whole point is invisible on a bar
 * chart: the bars look exactly like a linear search's. Showing the sum
 * that makes it one step is the content.
 *
 * The base address and cell size are presentation constants and match the
 * Theory tab's schematic for this topic, so the two tell one story.
 */
export const MEMORY_BASE = 0x40
export const CELL_BYTES = 4

export interface MemoryView {
  index: number
  base: number
  cellBytes: number
  address: number
}

export function extractMemoryView(state: unknown, length: number): MemoryView | null {
  const raw = asState(state)
  if (!raw || raw.operation !== 'access') return null
  const index = num(raw, 'targetIndex')
  if (index === null || index < 0 || index >= length) return null
  return { index, base: MEMORY_BASE, cellBytes: CELL_BYTES, address: MEMORY_BASE + index * CELL_BYTES }
}

export function hex(value: number): string {
  return `0x${value.toString(16).toUpperCase()}`
}

/**
 * Which cells move, and which way, during an insert or a delete.
 *
 * The engines give an affected range and a direction. Rendering it as an
 * arrow per cell makes the cost visible: the student sees the work the
 * operation does, which is the thing the complexity is counting.
 */
export interface ShiftView {
  operation: 'insert' | 'delete'
  direction: 'left' | 'right'
  /** Inclusive indices of the cells that move. */
  from: number
  to: number
  /** Where the gap opens or closes. */
  targetIndex: number
}

export function extractShiftView(state: unknown, length: number): ShiftView | null {
  const raw = asState(state)
  if (!raw) return null
  const operation = raw.operation
  if (operation !== 'insert' && operation !== 'delete') return null

  const direction = raw.shiftDirection
  if (direction !== 'left' && direction !== 'right') return null

  const range = raw.affectedRange
  if (!Array.isArray(range) || range.length !== 2) return null
  const [first, second] = range
  if (typeof first !== 'number' || typeof second !== 'number') return null

  const from = Math.max(0, Math.min(first, second))
  const to = Math.min(length - 1, Math.max(first, second))
  if (from > to) return null

  const targetIndex = num(raw, 'targetIndex')
  return { operation, direction, from, to, targetIndex: targetIndex ?? from }
}

/**
 * What this run is doing to the array, in words.
 *
 * The array operation canvases drew bars and a shift arrow and never said
 * what the operation was. A student watching Array Insertion saw the bars
 * slide and a 99 appear at index 2, with nothing anywhere stating that 99
 * was being inserted there - so the value arrived from nowhere, and Array
 * Access highlighted a bar without saying what was being accessed or why
 * that index. The engines have carried the operation, the index and the
 * value the whole time; nothing was reading them.
 *
 * Null for every other topic: a sort is not an operation on one index.
 */
export interface ArrayOperationLabel {
  /** "Inserting 99 at index 2" */
  headline: string
  /** Why this operation costs what it costs. */
  detail: string
}

export function extractOperationLabel(state: unknown): ArrayOperationLabel | null {
  const raw = asState(state)
  if (!raw) return null
  const index = num(raw, 'targetIndex')
  if (index === null) return null
  const value = num(raw, 'operationValue')

  switch (raw.operation) {
    case 'access':
      return {
        headline: `Reading the element at index ${index}`,
        detail: 'One address calculation, no searching: that is what makes access O(1).',
      }
    case 'insert':
      return {
        headline: value === null ? `Inserting a value at index ${index}` : `Inserting ${value} at index ${index}`,
        detail: `Every element from index ${index} onwards shifts one place right to make room.`,
      }
    case 'delete':
      return {
        headline: value === null ? `Deleting the element at index ${index}` : `Deleting ${value} from index ${index}`,
        detail: `Every element after index ${index} shifts one place left to close the gap.`,
      }
    default:
      return null
  }
}
