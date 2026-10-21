import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty } from '@dsa-tutor/types'
import { emptyDPState, filledCells, makeDPSnapshot, type DPTableState } from './dpTable'

/**
 * The two dynamic programming topics.
 *
 * Both are the same idea and the module says so: write down each
 * subproblem's answer once, in an order where everything you need is
 * already written down. What differs is the shape of "each subproblem" -
 * one index, or two - and that is exactly the difference between a row and
 * a grid, which is why they are two topics and not one.
 *
 * 1D is maximum subarray. That is deliberate: divide-and-conquer solves
 * the same problem in this module at O(n log n), and greedy solves it at
 * O(n). Three paradigms, one problem, three complexities, side by side -
 * which is a far better argument for what a paradigm IS than three
 * unrelated problems would be.
 *
 * 2D is edit distance, for the opposite reason: its cell reads three
 * neighbours (up, left, and diagonal), so the recurrence is visible as a
 * shape on the canvas rather than as a line of algebra.
 */

// best[0] = arr[0]
// for i in 1..n-1: best[i] = max(arr[i], best[i-1] + arr[i])
// answer = max(best)
const LINE_1D = { INIT: 0, BASE: 1, LOOP: 2, RECURRENCE: 3, ANSWER: 4 } as const

/** Maximum subarray sum, as a 1D table (Kadane's recurrence, written down). */
export function dp1DEngine(input: number[]): AlgorithmSnapshot[] {
  // Any input the learner applies is run as given. The default has
  // negatives, because with none the answer is the whole array and the
  // "start fresh" branch never wins - but refusing an all-positive input
  // would mean the Apply button silently ran something else, and the
  // recurrence is still the recurrence.
  const array = input.length > 1 ? [...input] : [-2, 1, -3, 4, -1, 2, 1, -5, 4]
  const n = array.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const best: (number | null)[] = Array.from({ length: n }, () => null)

  const state = (overrides: Partial<DPTableState> = {}): DPTableState =>
    emptyDPState({
      input: array,
      rowLabels: ['best ending here'],
      colLabels: array.map((_unused, i) => String(i)),
      table: [[...best]],
      filled: filledCells([best]),
      ...overrides,
    })

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description:
        'The largest sum of any run of adjacent elements. The table holds one number per position: the best run that ENDS at that position, which is the subproblem that makes the whole thing fall out.',
      pseudocodeLine: LINE_1D.INIT,
      isPredictionRequired: false,
      state: state(),
    }),
  )

  best[0] = array[0]
  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `best[0] = ${array[0]}. A run ending at the first position has nothing to extend, so it is just that element - even when it is negative.`,
      pseudocodeLine: LINE_1D.BASE,
      isPredictionRequired: false,
      state: state({ current: [0, 0], marked: [0], markerLabel: 'the element at this position', working: `best[0] = arr[0] = ${array[0]}` }),
    }),
  )

  for (let i = 1; i < n; i += 1) {
    const extend = (best[i - 1] as number) + array[i]
    const fresh = array[i]

    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: `At index ${i}: extend the best run ending at ${i - 1} (${best[i - 1]} + ${array[i]} = ${extend}), or start a new run here (${fresh})? The bigger one is best[${i}].`,
        pseudocodeLine: LINE_1D.RECURRENCE,
        isPredictionRequired: true,
        state: state({
          current: [0, i],
          dependsOn: [[0, i - 1]],
          marked: [i],
          markerLabel: 'the element at this position',
          working: `best[${i}] = max(arr[${i}], best[${i - 1}] + arr[${i}]) = max(${fresh}, ${extend})`,
          watch: { i, element: array[i], previousBest: best[i - 1] as number, extend, startFresh: fresh },
        }),
        criticalJunctionType: CriticalJunctionType.DP_CELL,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    best[i] = Math.max(fresh, extend)

    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description:
          best[i] === fresh && fresh !== extend
            ? `best[${i}] = ${best[i]}: starting fresh beats extending, because the run up to ${i - 1} was carrying a loss.`
            : `best[${i}] = ${best[i]}: extending the previous run wins.`,
        pseudocodeLine: LINE_1D.RECURRENCE,
        isPredictionRequired: false,
        state: state({ current: [0, i], marked: [i], markerLabel: 'the element at this position' }),
      }),
    )
  }

  const answer = Math.max(...(best as number[]))
  const endsAt = (best as number[]).indexOf(answer)
  let startsAt = endsAt
  let running = answer
  while (startsAt > 0 && running !== array[startsAt]) {
    running -= array[startsAt]
    startsAt -= 1
  }

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `The answer is the largest cell in the table: ${answer}, the run arr[${startsAt}..${endsAt}]. Every cell was computed once from the one before it, so the whole thing is one pass: O(n) time, O(n) space.`,
      pseudocodeLine: LINE_1D.ANSWER,
      isPredictionRequired: false,
      state: state({
        current: [0, endsAt],
        marked: Array.from({ length: endsAt - startsAt + 1 }, (_unused, k) => startsAt + k),
        markerLabel: 'the winning run',
        working: `answer = max(best) = ${answer}`,
        answer,
      }),
      isFinalStep: true,
    }),
  )

  return snapshots
}

// d[i][j] = edits to turn the first i characters of a into the first j of b
// d[i][0] = i; d[0][j] = j
// if a[i-1] == b[j-1]: d[i][j] = d[i-1][j-1]
// else: d[i][j] = 1 + min(d[i-1][j], d[i][j-1], d[i-1][j-1])
const LINE_2D = { INIT: 0, BASE_ROW: 1, BASE_COL: 2, LOOP: 3, MATCH: 4, RECURRENCE: 5, ANSWER: 6 } as const

const DEFAULT_SOURCE = 'kitten'
const DEFAULT_TARGET = 'sitting'

/**
 * Edit distance, as a 2D table.
 *
 * Takes numbers like every other engine so Apply and Random keep working
 * (the registry's engineFunction signature is `(input: number[])`), and
 * turns them into letters. Nobody will type a useful pair of words as
 * numbers, but a student pressing Random gets a different problem rather
 * than a broken canvas, which is what that control promises.
 */
export function dp2DEngine(input: number[]): AlgorithmSnapshot[] {
  const letters = (values: number[], fallback: string) =>
    values.length >= 3
      ? values
          .slice(0, 6)
          .map((value) => String.fromCharCode(97 + (((Math.round(value) % 26) + 26) % 26)))
          .join('')
      : fallback

  const source = input.length >= 3 ? letters(input.slice(0, Math.ceil(input.length / 2)), DEFAULT_SOURCE) : DEFAULT_SOURCE
  const target = input.length >= 3 ? letters(input.slice(Math.ceil(input.length / 2)), DEFAULT_TARGET) : DEFAULT_TARGET

  const rows = source.length + 1
  const cols = target.length + 1
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const table: (number | null)[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null))

  const state = (overrides: Partial<DPTableState> = {}): DPTableState =>
    emptyDPState({
      input: [],
      rowLabels: ['', ...source.split('')],
      colLabels: ['', ...target.split('')],
      table,
      filled: filledCells(table),
      ...overrides,
    })

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `The fewest single-character edits that turn "${source}" into "${target}". Cell [i][j] is the answer for the first i letters of "${source}" against the first j letters of "${target}", so the bottom-right cell is the answer to the whole question.`,
      pseudocodeLine: LINE_2D.INIT,
      isPredictionRequired: false,
      state: state(),
    }),
  )

  for (let i = 0; i < rows; i += 1) table[i][0] = i
  for (let j = 0; j < cols; j += 1) table[0][j] = j

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `The edges are free: turning the first i letters into nothing costs i deletions, and building j letters from nothing costs j insertions. Those are the base cases, and without them the recurrence has nothing to stand on.`,
      pseudocodeLine: LINE_2D.BASE_ROW,
      isPredictionRequired: false,
      state: state({
        dependsOn: [],
        working: 'd[i][0] = i,  d[0][j] = j',
      }),
    }),
  )

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const a = source[i - 1]
      const b = target[j - 1]
      const diagonal = table[i - 1][j - 1] as number
      const up = table[i - 1][j] as number
      const left = table[i][j - 1] as number
      const matched = a === b
      const dependsOn: [number, number][] = matched
        ? [[i - 1, j - 1]]
        : [
            [i - 1, j],
            [i, j - 1],
            [i - 1, j - 1],
          ]

      snapshots.push(
        makeDPSnapshot({
          stepIndex: stepIndex++,
          description: matched
            ? `"${a}" matches "${b}", so no edit is needed here: the cost is whatever it cost without this pair of letters, straight from the diagonal.`
            : `"${a}" against "${b}": they differ, so one edit is unavoidable. Delete (from above), insert (from the left) or substitute (from the diagonal) - which neighbour is cheapest?`,
          pseudocodeLine: matched ? LINE_2D.MATCH : LINE_2D.RECURRENCE,
          isPredictionRequired: !matched,
          state: state({
            current: [i, j],
            dependsOn,
            working: matched
              ? `d[${i}][${j}] = d[${i - 1}][${j - 1}] = ${diagonal}`
              : `d[${i}][${j}] = 1 + min(${up}, ${left}, ${diagonal})`,
            watch: { i, j, a, b, delete: up, insert: left, substitute: diagonal },
          }),
          criticalJunctionType: matched ? null : CriticalJunctionType.DP_CELL,
          junctionDifficulty: matched ? null : JunctionDifficulty.PROCEDURAL,
        }),
      )

      table[i][j] = matched ? diagonal : 1 + Math.min(up, left, diagonal)

      if (!matched) {
        const cheapest = Math.min(up, left, diagonal)
        const move = cheapest === diagonal ? 'substitute' : cheapest === up ? 'delete' : 'insert'
        snapshots.push(
          makeDPSnapshot({
            stepIndex: stepIndex++,
            description: `d[${i}][${j}] = ${table[i][j]}, taking the ${move}.`,
            pseudocodeLine: LINE_2D.RECURRENCE,
            isPredictionRequired: false,
            state: state({ current: [i, j], dependsOn }),
          }),
        )
      }
    }
  }

  const answer = table[rows - 1][cols - 1] as number
  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `"${source}" to "${target}" takes ${answer} edits. The table holds ${(rows - 1) * (cols - 1)} subproblems and each was solved once; solving them recursively without the table would solve the same ones over and over.`,
      pseudocodeLine: LINE_2D.ANSWER,
      isPredictionRequired: false,
      state: state({ current: [rows - 1, cols - 1], working: `answer = d[${rows - 1}][${cols - 1}] = ${answer}`, answer }),
      isFinalStep: true,
    }),
  )

  return snapshots
}
