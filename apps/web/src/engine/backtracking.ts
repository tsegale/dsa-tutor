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

export interface NQueensBoardState {
  size: number
  /** Column index of the placed queen per row, or -1 when unplaced. */
  queens: number[]
  /** Candidate square currently being tested, if any. */
  tryingCell: [number, number] | null
  /** Square of an earlier queen that attacks `tryingCell`, if conflicted. */
  attackingQueen: [number, number] | null
  /** Solutions found (each entry is a `queens` array). */
  solutions: number[][]
}

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
  /** Present when running the N-Queens chessboard problem instead of Subset Sum. */
  nQueensBoard?: NQueensBoardState
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

/**
 * N-Queens backtracking engine: place N non-attacking queens on an N x N
 * chessboard, one per row, pruning any column or diagonal conflict immediately.
 */
export function nQueensBacktrackingEngine(rawSize: number = 4): AlgorithmSnapshot[] {
  const n = Math.max(4, Math.min(5, Math.round(rawSize)))
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  let frames: CallFrame[] = []
  let nextId = 0
  let visited = 0
  let junctionCount = 0
  const boardSolutions: number[][] = []
  const withoutPruning = Array.from({ length: n + 1 }, (_, k) => n ** k).reduce((a, b) => a + b, 0)

  const pushBoard = (params: {
    description: string
    pseudocodeLine: number
    queens: number[]
    tryingCell: [number, number] | null
    attackingQueen: [number, number] | null
    conflict?: boolean
    isPredictionRequired?: boolean
    criticalJunctionType?: CriticalJunctionType | null
    junctionDifficulty?: JunctionDifficulty | null
    isFinalStep?: boolean
    currentFrameId?: string | null
  }) => {
    const placedCount = params.queens.filter((c) => c >= 0).length
    const state: BacktrackingState = {
      frames: frames.map((f) => ({ ...f })),
      baseCase: n,
      currentFrameId: params.currentFrameId !== undefined ? params.currentFrameId : (frames[frames.length - 1]?.id ?? null),
      candidates: Array.from({ length: n }, (_, i) => i),
      target: 0,
      chosen: params.queens.filter((c) => c >= 0),
      total: params.conflict ? 1 : 0,
      solutions: boardSolutions.map((s) => [...s]),
      visited,
      withoutPruning,
      nQueensBoard: {
        size: n,
        queens: [...params.queens],
        tryingCell: params.tryingCell ? [...params.tryingCell] : null,
        attackingQueen: params.attackingQueen ? [...params.attackingQueen] : null,
        solutions: boardSolutions.map((s) => [...s]),
      },
      watch: {
        row: params.tryingCell ? params.tryingCell[0] : placedCount,
        col: params.tryingCell ? params.tryingCell[1] : '-',
        queensPlaced: placedCount,
        solutionsFound: boardSolutions.length,
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

  const initialQueens = Array.from({ length: n }, () => -1)
  pushBoard({
    description: `Place ${n} queens on a ${n}x${n} board so no two share a row, column, or diagonal. Unpruned row-by-row placement has ${n ** n} leaf boards; conflict pruning cuts whole subtrees immediately.`,
    pseudocodeLine: LINE.SIGNATURE,
    queens: initialQueens,
    tryingCell: null,
    attackingQueen: null,
  })

  function findConflict(queens: number[], row: number, col: number): [number, number] | null {
    for (let r = 0; r < row; r += 1) {
      const qCol = queens[r]
      if (qCol === col || Math.abs(qCol - col) === Math.abs(r - row)) {
        return [r, qCol]
      }
    }
    return null
  }

  function solveRow(row: number, queens: number[]) {
    if (row === n) {
      boardSolutions.push([...queens])
      pushBoard({
        description: `Solution #${boardSolutions.length} found: columns [${queens.join(', ')}]! Backtracking to look for other valid boards.`,
        pseudocodeLine: LINE.SOLUTION,
        queens,
        tryingCell: null,
        attackingQueen: null,
      })
      return
    }

    for (let col = 0; col < n; col += 1) {
      const id = `nq-${nextId++}`
      visited += 1
      frames = [
        ...frames,
        {
          id,
          functionName: 'place',
          argument: row * n + col,
          label: `r${row}c${col}`,
          returnValue: null,
          status: 'active',
          depth: row,
        },
      ]

      const attacker = findConflict(queens, row, col)
      if (attacker) {
        const askHere = junctionCount < 4
        if (askHere) junctionCount += 1
        pushBoard({
          description: askHere
            ? `Testing row ${row}, col ${col}: queen at (${attacker[0]}, ${attacker[1]}) attacks this square. Should the search explore rows below (${row}, ${col}) or prune?`
            : `Row ${row}, col ${col} is attacked by queen at (${attacker[0]}, ${attacker[1]}). Pruning ${n ** (n - 1 - row)} boards below it.`,
          pseudocodeLine: LINE.PRUNE,
          queens,
          tryingCell: [row, col],
          attackingQueen: attacker,
          conflict: true,
          isPredictionRequired: askHere,
          criticalJunctionType: askHere ? CriticalJunctionType.PRUNE_BRANCH : null,
          junctionDifficulty: askHere ? JunctionDifficulty.CONCEPTUAL : null,
        })
        frames = frames.filter((f) => f.id !== id)
      } else {
        const nextQueens = [...queens]
        nextQueens[row] = col
        pushBoard({
          description: `Row ${row}, col ${col} is safe! Placing queen and advancing to row ${row + 1}.`,
          pseudocodeLine: LINE.TAKE,
          queens: nextQueens,
          tryingCell: [row, col],
          attackingQueen: null,
        })
        solveRow(row + 1, nextQueens)
        frames = frames.filter((f) => f.id !== id)
      }
    }
  }

  solveRow(0, initialQueens)

  pushBoard({
    description: `Finished ${n}-Queens search: found ${boardSolutions.length} valid board${boardSolutions.length === 1 ? '' : 's'}. Visited ${visited} placements instead of ${withoutPruning} unpruned nodes.`,
    pseudocodeLine: LINE.DONE,
    queens: boardSolutions[0] ?? initialQueens,
    tryingCell: null,
    attackingQueen: null,
    isFinalStep: true,
    currentFrameId: null,
  })

  return snapshots
}
