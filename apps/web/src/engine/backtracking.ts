import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'
import type { CallFrame, CallStackState } from './recursionFactorial'

/**
 * Subset sum, by backtracking: which subsets of this set add up to the
 * target?
 *
 * Rendered as the state-space tree (CanvasType.RECURSION_TREE), because
 * backtracking IS a tree walk and there is nothing else to draw. Each node
 * is a partial candidate - a decision made about every element so far -
 * and the two children are "take the next element" and "leave it".
 *
 * The lesson is pruning, so that is the junction. Without it the tree has
 * 2^n leaves and the method is just exhaustive search with extra steps.
 * With one test - "the running total has already passed the target, and
 * every remaining element is positive" - whole subtrees are never built.
 * The run counts the nodes it visits and says what the full tree would
 * have cost, because that ratio is the only thing that makes backtracking
 * worth the name.
 */

// search(i, chosen, total):
//   if total == target: record a solution
//   if i == n or total > target: return            <- the prune
//   search(i + 1, chosen + [arr[i]], total + arr[i])
//   search(i + 1, chosen, total)
const LINE = { SIGNATURE: 0, SOLUTION: 1, PRUNE: 2, TAKE: 3, SKIP: 4, DONE: 5 } as const

export interface BacktrackingState extends CallStackState {
  /** The set being searched. */
  candidates: number[]
  /** The sum every solution has to reach. */
  target: number
  /** The partial candidate at the node being visited. */
  chosen: number[]
  /** Its running total. */
  total: number
  /** Complete solutions found so far. */
  solutions: number[][]
  /** Nodes actually visited. */
  visited: number
  /** Nodes a search with no pruning would have visited. */
  withoutPruning: number
}

export function backtrackingEngine(input: number[]): AlgorithmSnapshot[] {
  // Positive and small: pruning on "total > target" is only valid when
  // adding an element cannot bring the total back down, and a student has
  // to be able to hold the whole tree in view.
  const positives = input.filter((value) => value > 0).map((value) => Math.round(value))
  const candidates = (positives.length >= 3 ? positives : [3, 4, 5, 2]).slice(0, 5)
  const target = Math.max(...candidates) + Math.min(...candidates)

  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let frames: CallFrame[] = []
  let nextId = 0
  let visited = 0
  const solutions: number[][] = []
  const n = candidates.length
  // A tree with a decision per element and no pruning: 2^(n+1) - 1 nodes.
  const withoutPruning = 2 ** (n + 1) - 1

  const push = (params: {
    description: string
    pseudocodeLine: number
    chosen: number[]
    total: number
    isPredictionRequired?: boolean
    criticalJunctionType?: CriticalJunctionType | null
    junctionDifficulty?: JunctionDifficulty | null
    isFinalStep?: boolean
    currentFrameId?: string | null
  }) => {
    const state: BacktrackingState = {
      frames: frames.map((frame) => ({ ...frame })),
      baseCase: target,
      currentFrameId: params.currentFrameId !== undefined ? params.currentFrameId : (frames[frames.length - 1]?.id ?? null),
      candidates: [...candidates],
      target,
      chosen: [...params.chosen],
      total: params.total,
      solutions: solutions.map((solution) => [...solution]),
      visited,
      withoutPruning,
      // Only what the state's own scalars do not already carry: total,
      // target, visited and withoutPruning are fields above, and listing
      // them twice under two names is a watch panel arguing with itself.
      watch: {
        partial: params.chosen.length > 0 ? `{${params.chosen.join(', ')}}` : '{}',
        solutionsFound: solutions.length,
      },
    }
    snapshots.push({
      stepIndex: stepIndex++,
      description: params.description,
      pseudocodeLine: params.pseudocodeLine,
      isPredictionRequired: params.isPredictionRequired ?? false,
      predictionType: PredictionType.TILE_GRID,
      canvasType: CanvasType.RECURSION_TREE,
      dataStructureState: state,
      activeIndices: [],
      highlightIndices: [],
      comparedIndices: [],
      swappedIndices: [],
      isFinalStep: params.isFinalStep ?? false,
      criticalJunctionType: params.criticalJunctionType ?? null,
      junctionDifficulty: params.junctionDifficulty ?? null,
    })
  }

  push({
    description: `Which subsets of [${candidates.join(', ')}] add up to ${target}? Every element is either in or out, so there are ${2 ** n} subsets to consider - and most of them can be ruled out without ever being built.`,
    pseudocodeLine: LINE.SIGNATURE,
    chosen: [],
    total: 0,
  })

  function search(index: number, chosen: number[], total: number, depth: number, how: string) {
    const id = `bt-${nextId++}`
    visited += 1
    frames = [
      ...frames,
      {
        id,
        functionName: 'search',
        argument: total,
        label: chosen.length > 0 ? `${chosen.join('+')}=${total}` : '{}',
        returnValue: null,
        status: 'active',
        depth,
      },
    ]

    push({
      description: `${how} The partial candidate is ${chosen.length > 0 ? `{${chosen.join(', ')}}` : 'empty'}, total ${total}.`,
      pseudocodeLine: LINE.SIGNATURE,
      chosen,
      total,
    })

    if (total === target) {
      solutions.push([...chosen])
      frames = frames.map((frame) => (frame.id === id ? { ...frame, returnValue: total, status: 'returned' } : frame))
      push({
        description: `{${chosen.join(', ')}} sums to ${target}. That is a solution - and since every remaining element is positive, adding anything else can only overshoot, so this branch stops here.`,
        pseudocodeLine: LINE.SOLUTION,
        chosen,
        total,
      })
      frames = frames.filter((frame) => frame.id !== id)
      return
    }

    if (index >= n || total > target) {
      const reason =
        total > target
          ? `the total ${total} has already passed ${target}, and every element left is positive, so nothing below this point can come back down to it`
          : 'there are no elements left to decide about'

      push({
        description: `At ${chosen.length > 0 ? `{${chosen.join(', ')}}` : 'the empty set'} with total ${total}: can this branch still reach ${target}, or can the whole subtree be abandoned?`,
        pseudocodeLine: LINE.PRUNE,
        chosen,
        total,
        isPredictionRequired: total > target,
        criticalJunctionType: total > target ? CriticalJunctionType.PRUNE_BRANCH : null,
        junctionDifficulty: total > target ? JunctionDifficulty.CONCEPTUAL : null,
      })

      frames = frames.map((frame) => (frame.id === id ? { ...frame, returnValue: total, status: 'returned' } : frame))
      push({
        description: `Abandoned: ${reason}. The ${2 ** Math.max(0, n - index + 1) - 1} nodes below this one are never built.`,
        pseudocodeLine: LINE.PRUNE,
        chosen,
        total,
      })
      frames = frames.filter((frame) => frame.id !== id)
      return
    }

    const element = candidates[index]
    search(index + 1, [...chosen, element], total + element, depth + 1, `Take ${element}.`)
    search(index + 1, chosen, total, depth + 1, `Leave ${element} out.`)

    frames = frames.map((frame) => (frame.id === id ? { ...frame, returnValue: total, status: 'returned' } : frame))
    push({
      description: `Both branches below ${chosen.length > 0 ? `{${chosen.join(', ')}}` : 'the empty set'} have been explored. Backtracking: the decision about ${element} is undone and the search carries on above this point.`,
      pseudocodeLine: LINE.SKIP,
      chosen,
      total,
    })
    frames = frames.filter((frame) => frame.id !== id)
  }

  search(0, [], 0, 0, 'Start with nothing chosen.')

  push({
    description: `${solutions.length} subset${solutions.length === 1 ? '' : 's'} sum to ${target}${
      solutions.length > 0 ? `: ${solutions.map((solution) => `{${solution.join(', ')}}`).join(', ')}` : ''
    }. The search visited ${visited} nodes; the full tree has ${withoutPruning}. Pruning is the whole difference between backtracking and trying everything.`,
    pseudocodeLine: LINE.DONE,
    chosen: [],
    total: 0,
    isFinalStep: true,
    currentFrameId: null,
  })

  return snapshots
}
