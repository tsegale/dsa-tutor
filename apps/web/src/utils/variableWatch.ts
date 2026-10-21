import type { AlgorithmSnapshot } from '@dsa-tutor/types'

/**
 * The named state of the current step, as a debugger's watch window.
 *
 * Nearly every engine already puts its working variables on the snapshot's
 * dataStructureState (binary search carries low, high and mid; quick sort
 * carries pivotIndex and both pointers), so this reads whatever is there
 * rather than needing a table of 66 topics. Bubble Sort is the only engine
 * whose state is the bare array, and it falls back to the indices the step
 * marks.
 *
 * What changed since the previous step is the point. A watch window that
 * only lists values tells a student what is true; marking the ones that
 * moved tells them what the step did, which is the thing they are being
 * asked to predict.
 */

export interface WatchedVariable {
  /** The raw field name, used as a key. */
  name: string
  /** The field name as words: "sortedUpTo" reads "sorted up to". */
  label: string
  /** Already formatted for display. */
  value: string
  /** Differs from the previous step. */
  changed: boolean
}

/**
 * Opaque internal identifiers. A student gains nothing from
 * currentNodeId = "trie-p-17", and these are the longest values in the
 * state, so they would crowd out the ones that mean something.
 */
const ID_FIELD = /(?:^|[a-z])Id$|^id$/

/**
 * Presentation, not state: fields an engine puts on the snapshot to tell
 * its canvas what to draw. They are the picture the student is already
 * looking at, and as watch rows they read as a list of empty variables -
 * "marker label -", "working -" - which is worse than showing nothing.
 */
const PRESENTATION_FIELD = new Set([
  'inputLabels',
  'rowLabels',
  'colLabels',
  'markerLabel',
  'working',
  'phase',
  'shiftDirection',
])

/**
 * Fixed facts about the run rather than variables: they never change from
 * one step to the next, so they are context the canvas already shows.
 */
const CONSTANT_FIELD = new Set([
  // Fixed for the whole run, and named on the canvas where it matters.
  // As a watch row it read "base case 7" on Backtracking, where the field
  // carries the target rather than a base case at all.
  'baseCase',
  'rows',
  'cols',
  'capacity',
  'directed',
  'heapType',
  'variant',
  'algorithmType',
  'traversalType',
  'operation',
  'originalLength',
  'maxDigits',
  'totalPasses',
  'totalCalls',
])

/** Words that should not be lowercased when a field name is split up. */
const ACRONYM: Record<string, string> = { mst: 'MST', idx: 'index', bst: 'BST' }

export function labelFor(field: string): string {
  const words = field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_]+/)
    .map((word) => ACRONYM[word.toLowerCase()] ?? word.toLowerCase())
  // A single-letter name (i, j, k) is the mathematical name and is clearer
  // left exactly as written.
  if (field.length <= 2) return field
  return words.join(' ')
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  if (typeof value === 'string') return value.length > 18 ? `${value.slice(0, 17)}...` : value
  return String(value)
}

function scalarsOf(state: unknown): Record<string, unknown> | null {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state as Record<string, unknown>)) {
    if (ID_FIELD.test(key) || CONSTANT_FIELD.has(key) || PRESENTATION_FIELD.has(key)) continue
    if (value === null || ['number', 'string', 'boolean'].includes(typeof value)) out[key] = value
  }
  // An engine whose state is a picture rather than a set of variables can
  // name its working variables explicitly instead. The table topics are
  // like this: their state is a grid and a cursor, and the things a
  // student would watch in a debugger - the loop index, the running
  // total, the two candidates being compared - are not fields of it.
  const watch = (state as { watch?: unknown }).watch
  if (watch && typeof watch === 'object' && !Array.isArray(watch)) {
    for (const [key, value] of Object.entries(watch as Record<string, unknown>)) {
      if (value === null || ['number', 'string', 'boolean'].includes(typeof value)) out[key] = value
    }
  }
  return out
}

/**
 * Derived from the marked indices, for an engine whose state is the bare
 * array. Bubble Sort is the only one, but deriving rather than special
 * casing means a future engine of that shape gets a watcher too.
 */
function fromIndices(snapshot: AlgorithmSnapshot): Record<string, unknown> {
  const array = Array.isArray(snapshot.dataStructureState)
    ? (snapshot.dataStructureState as unknown[])
    : null
  const out: Record<string, unknown> = {}
  const [first, second] = snapshot.comparedIndices.length ? snapshot.comparedIndices : snapshot.activeIndices
  if (first !== undefined) {
    out.comparing = first
    if (array) out.value = array[first] as number
  }
  if (second !== undefined) {
    out.against = second
    if (array) out.otherValue = array[second] as number
  }
  if (snapshot.swappedIndices.length) out.swapped = snapshot.swappedIndices.join(' and ')
  return out
}

/** Most panels have room for about this many rows without scrolling. */
export const MAX_WATCHED = 8

/**
 * The variables worth showing for this step, changed ones first.
 *
 * Ordering by change rather than by declaration keeps the row that just
 * moved at the top, where a student watching the canvas will find it,
 * instead of somewhere in a list whose order means nothing to them.
 */
export function watchedVariables(
  snapshot: AlgorithmSnapshot | null,
  previous: AlgorithmSnapshot | null,
): WatchedVariable[] {
  if (!snapshot) return []

  const current = scalarsOf(snapshot.dataStructureState) ?? fromIndices(snapshot)
  const before = previous ? (scalarsOf(previous.dataStructureState) ?? fromIndices(previous)) : {}

  const rows = Object.entries(current).map(([name, value]) => ({
    name,
    label: labelFor(name),
    value: formatValue(value),
    // A field the previous step did not carry counts as unchanged rather
    // than new: on the first step everything would otherwise light up.
    changed: previous !== null && name in before && formatValue(before[name]) !== formatValue(value),
  }))

  const changed = rows.filter((row) => row.changed)
  // A variable with no value yet says the least of anything on the panel,
  // so it goes last and is the first thing dropped when the panel is
  // full: "answer -" sitting above the loop index for the whole run is a
  // row that never tells the student anything.
  const empty = (row: WatchedVariable) => row.value === '-'
  const steady = rows.filter((row) => !row.changed && !empty(row))
  const blank = rows.filter((row) => !row.changed && empty(row))
  return [...changed, ...steady, ...blank].slice(0, MAX_WATCHED)
}
