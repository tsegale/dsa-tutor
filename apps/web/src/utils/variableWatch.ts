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
 * Fixed facts about the run rather than variables: they never change from
 * one step to the next, so they are context the canvas already shows.
 */
const CONSTANT_FIELD = new Set([
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
    if (ID_FIELD.test(key) || CONSTANT_FIELD.has(key)) continue
    if (value === null || ['number', 'string', 'boolean'].includes(typeof value)) out[key] = value
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
  const steady = rows.filter((row) => !row.changed)
  return [...changed, ...steady].slice(0, MAX_WATCHED)
}
