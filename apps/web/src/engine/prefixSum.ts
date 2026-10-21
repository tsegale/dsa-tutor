import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty } from '@dsa-tutor/types'
import { emptyDPState, filledCells, makeDPSnapshot, type DPTableState } from './dpTable'

/**
 * Prefix sums: pay O(n) once, answer any range sum in O(1) forever.
 *
 * The run has two halves, and the second is the point. Building the table
 * is a single pass anyone can follow; the thing worth watching is a range
 * query being answered by subtracting two numbers, after the student has
 * spent the searching module watching loops walk over ranges.
 *
 * prefix[0] = 0 rather than arr[0], which is the detail every first
 * implementation gets wrong: with the leading zero, the sum of
 * arr[i..j] is prefix[j + 1] - prefix[i] with no special case for i = 0.
 */

// prefix[0] = 0; for i in 0..n-1: prefix[i+1] = prefix[i] + arr[i]
// rangeSum(i, j) = prefix[j+1] - prefix[i]
const LINE = { INIT: 0, BUILD: 1, ACCUMULATE: 2, QUERY: 3, DONE: 4 } as const

export interface PrefixSumQuery {
  from: number
  to: number
}

export function prefixSumEngine(input: number[], queries?: PrefixSumQuery[]): AlgorithmSnapshot[] {
  const array = input.length > 0 ? [...input] : [3, 1, 4, 1, 5]
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  // Two queries, chosen so one starts at index 0 and one does not: the
  // leading zero is what makes both read the same way.
  const asked: PrefixSumQuery[] =
    queries && queries.length > 0
      ? queries
      : [
          { from: 0, to: Math.min(2, n - 1) },
          { from: Math.min(1, n - 1), to: n - 1 },
        ]

  const prefix: (number | null)[] = Array.from({ length: n + 1 }, () => null)
  const colLabels = Array.from({ length: n + 1 }, (_unused, i) => `p${i}`)

  const state = (overrides: Partial<DPTableState> = {}): DPTableState =>
    emptyDPState({
      input: array,
      rowLabels: ['prefix'],
      colLabels,
      table: [[...prefix]],
      filled: filledCells([prefix]),
      ...overrides,
    })

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `Building a prefix table for ${n} elements. It has ${n + 1} cells, not ${n}: the extra cell at the front holds 0, which is what makes every range read the same way.`,
      pseudocodeLine: LINE.INIT,
      isPredictionRequired: false,
      state: state(),
    }),
  )

  prefix[0] = 0
  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: 'p0 = 0. The sum of no elements is zero, and having it written down removes the special case for a range that starts at index 0.',
      pseudocodeLine: LINE.BUILD,
      isPredictionRequired: false,
      state: state({ current: [0, 0], working: 'p0 = 0' }),
    }),
  )

  for (let i = 0; i < n; i += 1) {
    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: `p${i + 1} = p${i} + arr[${i}] = ${prefix[i]} + ${array[i]}. What goes in the cell?`,
        pseudocodeLine: LINE.ACCUMULATE,
        isPredictionRequired: true,
        state: state({
          current: [0, i + 1],
          dependsOn: [[0, i]],
          marked: [i],
          markerLabel: 'the element being added',
          working: `p${i + 1} = p${i} + arr[${i}] = ${prefix[i]} + ${array[i]}`,
          watch: { i, element: array[i], runningTotal: prefix[i] },
        }),
        criticalJunctionType: CriticalJunctionType.PREFIX_CELL,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    prefix[i + 1] = (prefix[i] as number) + array[i]

    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: `p${i + 1} = ${prefix[i + 1]}: the sum of the first ${i + 1} element${i === 0 ? '' : 's'}.`,
        pseudocodeLine: LINE.ACCUMULATE,
        isPredictionRequired: false,
        state: state({ current: [0, i + 1], marked: [i], markerLabel: 'the element just added' }),
      }),
    )
  }

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `The table is built, in one pass. Every range sum from here on costs one subtraction, however long the range is.`,
      pseudocodeLine: LINE.QUERY,
      isPredictionRequired: false,
      state: state(),
    }),
  )

  asked.forEach(({ from, to }, index) => {
    const lo = Math.max(0, Math.min(from, to))
    const hi = Math.min(n - 1, Math.max(from, to))
    const answer = (prefix[hi + 1] as number) - (prefix[lo] as number)
    const span = hi - lo + 1

    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: `Query ${index + 1}: the sum of arr[${lo}..${hi}], ${span} element${span === 1 ? '' : 's'}. Which two cells answer it?`,
        pseudocodeLine: LINE.QUERY,
        isPredictionRequired: true,
        state: state({
          dependsOn: [
            [0, hi + 1],
            [0, lo],
          ],
          marked: Array.from({ length: span }, (_unused, k) => lo + k),
          markerLabel: 'the range being asked about',
          working: `sum(arr[${lo}..${hi}]) = p${hi + 1} - p${lo}`,
          watch: { from: lo, to: hi, elementsInRange: span },
        }),
        criticalJunctionType: CriticalJunctionType.RANGE_QUERY,
        junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
      }),
    )

    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: `p${hi + 1} - p${lo} = ${prefix[hi + 1]} - ${prefix[lo]} = ${answer}. One subtraction, no loop over the ${span} elements.`,
        pseudocodeLine: LINE.QUERY,
        isPredictionRequired: false,
        state: state({
          dependsOn: [
            [0, hi + 1],
            [0, lo],
          ],
          marked: Array.from({ length: span }, (_unused, k) => lo + k),
          markerLabel: 'the range just answered',
          working: `p${hi + 1} - p${lo} = ${prefix[hi + 1]} - ${prefix[lo]} = ${answer}`,
          answer,
        }),
      }),
    )
  })

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `Done. Building cost ${n} additions once; each query cost one subtraction. A loop per query would have cost O(n) every time.`,
      pseudocodeLine: LINE.DONE,
      isPredictionRequired: false,
      state: state(),
      isFinalStep: true,
    }),
  )

  return snapshots
}
