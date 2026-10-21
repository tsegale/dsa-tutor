import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType, JunctionDifficulty } from '@dsa-tutor/types'
import { emptyDPState, makeDPSnapshot, type DPTableState } from './dpTable'

/**
 * Activity selection: fit the most meetings into one room.
 *
 * Chosen over the more obvious greedy demonstrations because the WRONG
 * greedy rules are so convincing. Take the shortest meeting first, or the
 * one that starts earliest, and you get an answer that looks reasonable
 * and is not optimal. Sort by FINISH time and take anything that fits, and
 * it is provably optimal. The run makes that the junction: at each step
 * the student is asked whether this activity fits, and the final step says
 * what the earliest-start rule would have produced on the same input.
 *
 * Greedy is the one paradigm in this module whose danger is that it looks
 * easy. The theory briefing carries the exchange argument; the canvas
 * carries the counterexample.
 */

// sort activities by finish time
// last = -infinity
// for each activity: if start >= last: take it; last = finish
const LINE = { SORT: 0, INIT: 1, LOOP: 2, FITS: 3, TAKE: 4, DONE: 5 } as const

interface Activity {
  name: string
  start: number
  finish: number
}

/** The default set is built so that earliest-start and shortest-first both
 * lose to earliest-finish, which is the entire point of the topic. */
const DEFAULT_ACTIVITIES: Activity[] = [
  { name: 'A', start: 1, finish: 4 },
  { name: 'B', start: 3, finish: 5 },
  { name: 'C', start: 0, finish: 6 },
  { name: 'D', start: 5, finish: 7 },
  { name: 'E', start: 3, finish: 9 },
  { name: 'F', start: 6, finish: 10 },
  { name: 'G', start: 8, finish: 11 },
]

function activitiesFrom(input: number[]): Activity[] {
  if (input.length < 4) return DEFAULT_ACTIVITIES
  // Each pair of numbers becomes one activity, so Apply and Random give a
  // different problem rather than a broken canvas.
  const made: Activity[] = []
  for (let i = 0; i + 1 < input.length && made.length < 8; i += 2) {
    const start = Math.abs(Math.round(input[i])) % 12
    const length = 1 + (Math.abs(Math.round(input[i + 1])) % 5)
    made.push({ name: String.fromCharCode(65 + made.length), start, finish: start + length })
  }
  return made.length >= 2 ? made : DEFAULT_ACTIVITIES
}

export function greedyEngine(input: number[]): AlgorithmSnapshot[] {
  const unsorted = activitiesFrom(input)
  const sorted = [...unsorted].sort((a, b) => a.finish - b.finish || a.start - b.start)
  const n = sorted.length
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0

  const chosen: number[] = []
  const decision: (number | null)[] = Array.from({ length: n }, () => null)

  const state = (overrides: Partial<DPTableState> = {}): DPTableState =>
    emptyDPState({
      input: sorted.map((activity) => activity.finish),
      inputLabels: sorted.map((activity) => `${activity.name} ${activity.start}-${activity.finish}`),
      rowLabels: ['taken'],
      colLabels: sorted.map((activity) => activity.name),
      table: [[...decision]],
      filled: decision.map((value, index) => (value === null ? null : ([0, index] as [number, number]))).filter(Boolean) as [number, number][],
      marked: [...chosen],
      markerLabel: 'in the schedule',
      ...overrides,
    })

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `${n} activities want one room. Fit as many as possible - not the longest, the most. The activities are sorted by FINISH time, which is the choice the whole method rests on.`,
      pseudocodeLine: LINE.SORT,
      isPredictionRequired: false,
      state: state(),
    }),
  )

  let lastFinish = Number.NEGATIVE_INFINITY

  const watchFor = (activity: Activity) => ({
    activity: activity.name,
    start: activity.start,
    finish: activity.finish,
    roomFreeFrom: lastFinish === Number.NEGATIVE_INFINITY ? 'the start' : lastFinish,
    takenSoFar: chosen.length,
  })

  for (let i = 0; i < n; i += 1) {
    const activity = sorted[i]
    const fits = activity.start >= lastFinish

    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: `${activity.name} runs ${activity.start} to ${activity.finish}. The room is free from ${
          lastFinish === Number.NEGATIVE_INFINITY ? 'the start' : lastFinish
        }. Take it, or skip it?`,
        pseudocodeLine: LINE.FITS,
        isPredictionRequired: true,
        state: state({
          current: [0, i],
          working: `${activity.name}.start ${activity.start} >= last finish ${
            lastFinish === Number.NEGATIVE_INFINITY ? '-inf' : lastFinish
          }?`,
          watch: watchFor(activity),
        }),
        criticalJunctionType: CriticalJunctionType.GREEDY_CHOICE,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      }),
    )

    decision[i] = fits ? 1 : 0
    if (fits) {
      chosen.push(i)
      lastFinish = activity.finish
    }

    snapshots.push(
      makeDPSnapshot({
        stepIndex: stepIndex++,
        description: fits
          ? `${activity.name} is taken. The room is now busy until ${activity.finish}. Nothing already chosen is ever reconsidered: that is what makes this greedy, and it is why it runs in one pass.`
          : `${activity.name} overlaps what is already booked, so it is skipped - and it will never be looked at again.`,
        pseudocodeLine: LINE.TAKE,
        isPredictionRequired: false,
        state: state({ current: [0, i], watch: watchFor(activity) }),
      }),
    )
  }

  // What a plausible but wrong rule would have produced on the same input.
  const byStart = [...unsorted].sort((a, b) => a.start - b.start || a.finish - b.finish)
  let naiveLast = Number.NEGATIVE_INFINITY
  const naive: string[] = []
  for (const activity of byStart) {
    if (activity.start >= naiveLast) {
      naive.push(activity.name)
      naiveLast = activity.finish
    }
  }

  snapshots.push(
    makeDPSnapshot({
      stepIndex: stepIndex++,
      description: `${chosen.length} activities fit: ${chosen.map((index) => sorted[index].name).join(', ')}. Sorting by START time instead - just as plausible a rule - would have taken ${naive.length}: ${naive.join(', ')}. Greedy only works when the rule is the right one, and "obvious" is not the same as right.`,
      pseudocodeLine: LINE.DONE,
      isPredictionRequired: false,
      state: state({ answer: chosen.length }),
      isFinalStep: true,
    }),
  )

  return snapshots
}
