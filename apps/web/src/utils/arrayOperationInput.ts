/**
 * Turns the left panel's text fields for Array Access, Insertion and
 * Deletion into engine arguments, or says why it can't.
 *
 * Kept out of the component so the rules can be tested without rendering
 * anything, and so the bounds the panel prints under the index field and
 * the bounds it enforces come from the same function.
 */

export type ArrayOperation = 'access' | 'insert' | 'delete'

export const ARRAY_OPERATION_FOR_SLUG: Record<string, ArrayOperation> = {
  'array-access': 'access',
  'array-insert': 'insert',
  'array-delete': 'delete',
}

export type ArrayOperationInput =
  | { ok: true; values: number[]; index: number; value: number | null }
  | { ok: false; error: string }

export function parseArrayText(text: string): number[] | null {
  const parts = text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (parts.length === 0) return null
  const values = parts.map(Number)
  if (values.some((n) => !Number.isFinite(n))) return null
  return values
}

/**
 * The indices an operation accepts on an array of length n, or null when
 * there are none (deleting from an empty array).
 *
 * Insert's range runs one past the end because inserting at n appends.
 * Access deliberately has no enforced range: an out-of-bounds index is a
 * case the engine teaches (the bounds check failing), so the panel lets
 * the learner try it rather than refusing it. The range returned for
 * access is only what the hint under the field describes.
 */
export function indexRange(operation: ArrayOperation, n: number): [number, number] | null {
  if (operation === 'insert') return [0, n]
  if (n === 0) return null
  return [0, n - 1]
}

export function indexHint(operation: ArrayOperation, n: number): string {
  const range = indexRange(operation, n)
  if (operation === 'insert') {
    return `Index 0 to ${n}. ${n} adds it to the end, where nothing has to shift.`
  }
  if (!range) return 'The array is empty, so there is no index to use.'
  const [lo, hi] = range
  if (operation === 'access') {
    return `Valid indices are ${lo} to ${hi}. Try one outside that range to see the bounds check fail.`
  }
  return `Index ${lo} to ${hi}. ${hi} removes the last element, where nothing has to shift.`
}

export function validateArrayOperation(
  operation: ArrayOperation,
  arrayText: string,
  indexText: string,
  valueText: string,
): ArrayOperationInput {
  const values = parseArrayText(arrayText)
  if (!values) return { ok: false, error: 'Enter the array as comma-separated numbers, e.g. 10,20,30,40,50' }

  if (indexText.trim() === '') return { ok: false, error: 'Enter an index.' }
  const index = Number(indexText)
  if (!Number.isInteger(index)) return { ok: false, error: 'An index is a whole number, e.g. 2.' }

  if (operation !== 'access') {
    const range = indexRange(operation, values.length)
    if (!range || index < range[0] || index > range[1]) {
      const verb = operation === 'insert' ? 'insert at' : 'delete'
      return {
        ok: false,
        error: range
          ? `Can only ${verb} index ${range[0]} to ${range[1]} in an array of ${values.length}.`
          : 'There is nothing to delete from an empty array.',
      }
    }
  }

  if (operation !== 'insert') return { ok: true, values, index, value: null }

  if (valueText.trim() === '') return { ok: false, error: 'Enter the value to insert.' }
  const value = Number(valueText)
  if (!Number.isFinite(value)) return { ok: false, error: 'The value to insert must be a number.' }
  return { ok: true, values, index, value }
}

/** A short, varied array plus an index (and value, for insert) that the
 * operation accepts - what Random fills the fields with. */
export function randomArrayOperation(
  operation: ArrayOperation,
  rand: () => number = Math.random,
): { values: number[]; index: number; value: number | null } {
  const length = Math.floor(rand() * 5) + 5 // 5-9
  const values = Array.from({ length }, () => Math.floor(rand() * 50) + 1)
  const [lo, hi] = indexRange(operation, length) ?? [0, 0]
  const index = lo + Math.floor(rand() * (hi - lo + 1))
  if (operation !== 'insert') return { values, index, value: null }
  // A value not already in the array, so the inserted bar is unmistakable.
  let value = Math.floor(rand() * 99) + 1
  for (let tries = 0; values.includes(value) && tries < 20; tries++) value = Math.floor(rand() * 99) + 1
  return { values, index, value }
}
