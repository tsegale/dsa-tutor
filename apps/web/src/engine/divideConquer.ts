import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
import type { CallFrame, CallStackState } from './recursionFactorial'

/**
 * Maximum subarray, by divide and conquer.
 *
 * The same problem as the 1D dynamic programming topic and the greedy one,
 * on purpose. A student who has watched this run at O(n log n) and then
 * watched Kadane's single pass answer the same question has learned
 * something about paradigms that no amount of prose about "paradigms"
 * conveys.
 *
 * The lesson here is the combine step, and it is the step everyone
 * forgets: the best run in the whole array is the best run on the left,
 * the best on the right, OR a run that straddles the split and therefore
 * belongs to neither half. Miss that third case and the algorithm is
 * quietly wrong on exactly the inputs where it matters.
 *
 * Rendered as a call tree (CanvasType.RECURSION_TREE) rather than an
 * array, because the recursion IS the algorithm: the shape of the tree is
 * where the log n comes from, and a bar chart cannot show it.
 */

// maxSub(lo, hi):
//   if lo == hi: return arr[lo]
//   mid = (lo + hi) / 2
//   left  = maxSub(lo, mid)
//   right = maxSub(mid + 1, hi)
//   cross = best run ending at mid + best run starting at mid + 1
//   return max(left, right, cross)
const LINE = { SIGNATURE: 0, BASE: 1, SPLIT: 2, LEFT: 3, RIGHT: 4, CROSS: 5, COMBINE: 6 } as const

/** A frame whose argument names the range it is responsible for. */
function rangeLabel(lo: number, hi: number): string {
  return lo === hi ? `[${lo}]` : `[${lo}..${hi}]`
}

export function divideConquerEngine(input: number[]): AlgorithmSnapshot[] {
  // Capped at 8: the call tree doubles with every element, and past that
  // it stops being a picture a student can read. Any input is run as
  // given - the default has negatives, so the crossing case can win, but
  // refusing an all-positive input would mean Apply silently ran
  // something else.
  const array = input.length > 1 ? [...input].slice(0, 8) : [-2, 1, -3, 4, -1, 2]
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let frames: CallFrame[] = []
  let nextId = 0

  const baseState = (overrides: Partial<CallStackState> = {}): CallStackState => ({
    frames: frames.map((frame) => ({ ...frame })),
    // Every range of one element is a base case, so there is no single
    // numeric base-case argument to name; the canvas reads status instead.
    baseCase: 1,
    currentFrameId: frames[frames.length - 1]?.id ?? null,
    ...overrides,
  })

  const push = (params: {
    description: string
    pseudocodeLine: number
    isPredictionRequired?: boolean
    state?: Partial<CallStackState>
    criticalJunctionType?: CriticalJunctionType | null
    junctionDifficulty?: JunctionDifficulty | null
    isFinalStep?: boolean
    highlightIndices?: number[]
  }) => {
    snapshots.push({
      stepIndex: stepIndex++,
      description: params.description,
      pseudocodeLine: params.pseudocodeLine,
      isPredictionRequired: params.isPredictionRequired ?? false,
      predictionType: PredictionType.TILE_GRID,
      canvasType: CanvasType.RECURSION_TREE,
      dataStructureState: baseState(params.state),
      activeIndices: [],
      highlightIndices: [...(params.highlightIndices ?? [])],
      comparedIndices: [],
      swappedIndices: [],
      isFinalStep: params.isFinalStep ?? false,
      criticalJunctionType: params.criticalJunctionType ?? null,
      junctionDifficulty: params.junctionDifficulty ?? null,
    })
  }

  push({
    description: `The largest sum of any run of adjacent elements in [${array.join(', ')}], by splitting the array in half and solving each half.`,
    pseudocodeLine: LINE.SIGNATURE,
  })

  function solve(lo: number, hi: number, depth: number): number {
    const id = `dc-${lo}-${hi}-${nextId++}`
    frames = [
      ...frames,
      {
        id,
        functionName: 'maxSub',
        // A range, not a number: `argument` keeps a value so the tree can
        // still spot a repeated subproblem, and `label` is what the node
        // actually says.
        argument: lo * array.length + hi,
        label: rangeLabel(lo, hi),
        returnValue: null,
        status: 'active',
        depth,
      },
    ]
    const span = Array.from({ length: hi - lo + 1 }, (_unused, k) => lo + k)

    if (lo === hi) {
      push({
        description: `maxSub${rangeLabel(lo, hi)} is a single element, so the answer is just ${array[lo]}. This is the base case: one element cannot be split.`,
        pseudocodeLine: LINE.BASE,
        highlightIndices: span,
      })
      frames = frames.map((frame) => (frame.id === id ? { ...frame, returnValue: array[lo], status: 'returned' } : frame))
      push({
        description: `maxSub${rangeLabel(lo, hi)} returns ${array[lo]}.`,
        pseudocodeLine: LINE.BASE,
        highlightIndices: span,
      })
      return array[lo]
    }

    const mid = Math.floor((lo + hi) / 2)
    push({
      description: `maxSub${rangeLabel(lo, hi)}: split at index ${mid}, into ${rangeLabel(lo, mid)} and ${rangeLabel(mid + 1, hi)}.`,
      pseudocodeLine: LINE.SPLIT,
      highlightIndices: span,
      state: { watch: { range: rangeLabel(lo, hi), depth, split: mid } },
    })

    const left = solve(lo, mid, depth + 1)
    const right = solve(mid + 1, hi, depth + 1)

    // The best run ending at mid, and the best starting just after it. A
    // crossing run has to use both, so it is these two added together.
    let leftPart = Number.NEGATIVE_INFINITY
    let running = 0
    for (let i = mid; i >= lo; i -= 1) {
      running += array[i]
      leftPart = Math.max(leftPart, running)
    }
    let rightPart = Number.NEGATIVE_INFINITY
    running = 0
    for (let i = mid + 1; i <= hi; i += 1) {
      running += array[i]
      rightPart = Math.max(rightPart, running)
    }
    const cross = leftPart + rightPart

    push({
      description: `A run can also straddle the split, belonging to neither half: the best one ending at ${mid} is ${leftPart}, the best starting at ${mid + 1} is ${rightPart}, so the best crossing run is ${cross}.`,
      pseudocodeLine: LINE.CROSS,
      highlightIndices: span,
    })

    push({
      description: `maxSub${rangeLabel(lo, hi)} has three candidates: left ${left}, right ${right}, crossing ${cross}. Which one is the answer for this range?`,
      pseudocodeLine: LINE.COMBINE,
      isPredictionRequired: true,
      highlightIndices: span,
      state: { watch: { range: rangeLabel(lo, hi), depth, left, right, crossing: cross } },
      criticalJunctionType: CriticalJunctionType.COMBINE_RESULT,
      junctionDifficulty: JunctionDifficulty.CONCEPTUAL,
    })

    const answer = Math.max(left, right, cross)
    frames = frames.map((frame) => (frame.id === id ? { ...frame, returnValue: answer, status: 'returned' } : frame))
    push({
      description: `maxSub${rangeLabel(lo, hi)} returns ${answer}${
        answer === cross && cross !== left && cross !== right
          ? ' - the crossing run, which neither half could have found on its own.'
          : '.'
      }`,
      pseudocodeLine: LINE.COMBINE,
      highlightIndices: span,
    })
    return answer
  }

  const result = solve(0, array.length - 1, 0)
  const calls = frames.length

  push({
    description: `The answer is ${result}. The array was split ${Math.ceil(Math.log2(array.length))} levels deep and every level looked at all ${array.length} elements once, which is where O(n log n) comes from. The dynamic programming and greedy topics in this module answer the same question in one pass.`,
    pseudocodeLine: LINE.COMBINE,
    isFinalStep: true,
    state: { currentFrameId: null },
  })

  // Reported in the description above rather than carried on the state:
  // the call count is a property of the whole run, and the canvas derives
  // it from the snapshots anyway (see utils/callTree.ts).
  void calls

  return snapshots
}
