import { describe, expect, it } from 'vitest'
import { CriticalJunctionType, MisconceptionCategory, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from './bubbleSort'
import { binarySearchEngine } from './binarySearch'
import { bstDeleteEngine, bstInsertEngine, type BSTNode, type BSTState } from './bst'
import { getTilesForSnapshot } from '@/utils/tileBuilder'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'
import { correctTileIdFor } from '@/utils/correctTile'

/**
 * No asked junction may offer two options that are true for the state on
 * screen: a student who picks the other true one is marked wrong, and a
 * false misconception enters the RQ2 data. Degenerate inputs (one or two
 * elements, a one-node tree, a chain) are where distractors stop being
 * wrong, so every study engine runs here at lengths 1-8.
 *
 * Options are judged by their TEXT, through TRUTH_RULES below, not by id - an
 * option added without a rule fails the test, so whoever adds one has to say
 * when it is true. Each rule judges the option the way its question asks:
 * "what is guaranteed" (pass), "why did it stop" (early stop), "what proves"
 * (completion), plain facts elsewhere. A true fact that does not answer the
 * question is false for that question.
 */

interface Judged {
  snapshot: AlgorithmSnapshot
  n: number
}

type Rule = [RegExp, (j: Judged, match: RegExpMatchArray) => boolean]

const unsortedAfterPass = (j: Judged) => j.n - j.snapshot.highlightIndices.length
const bst = (j: Judged) => j.snapshot.dataStructureState as BSTState
const size = (node: BSTNode | null): number => (node ? 1 + size(node.left) + size(node.right) : 0)
const searchState = (j: Judged) =>
  j.snapshot.dataStructureState as { array: number[]; target: number; mid: number | null; found: boolean }
const probes = (j: Judged) => j.snapshot.metrics?.visits ?? 0

const TRUTH_RULES: Partial<Record<CriticalJunctionType, Rule[]>> = {
  [CriticalJunctionType.SWAP_DECISION]: [
    [/^Swap them$/, (j) => correctTileIdFor(j.snapshot) === 'swap'],
    [/^Leave them$/, (j) => correctTileIdFor(j.snapshot) === 'no-swap'],
  ],
  // "This pass is now complete. What can we guarantee about the array?"
  [CriticalJunctionType.PASS_COMPLETE]: [
    [/largest remaining unsorted element is now in its correct position/, () => true],
    [/entire array is now sorted/, (j) => unsortedAfterPass(j) <= 1],
    [/smallest element moved to the front/, (j) => unsortedAfterPass(j) <= 1],
    [/Every element was compared exactly once/, (j) => unsortedAfterPass(j) <= 1],
  ],
  // "The algorithm stopped before completing all passes. Why?"
  [CriticalJunctionType.EARLY_TERMINATION]: [
    [/No swaps were needed/, () => true],
    [/completed the maximum number of passes/, (j) => j.snapshot.highlightIndices.length >= j.n - 1],
    // The stop condition is the swap flag; equal values are not the mechanism.
    [/Equal elements caused the loop to stop/, () => false],
    [/first element reached its correct position/, () => false],
  ],
  [CriticalJunctionType.COMPLEXITY_PREDICTION]: [
    [/^(\d+) comparisons?$/, (j, m) => Number(m[1]) === j.snapshot.metrics?.comparisons],
  ],
  [CriticalJunctionType.MIDPOINT_DECISION]: [
    [/is smaller - search the left half/, (j) => { const s = searchState(j); return s.target < s.array[s.mid!] }],
    [/is larger - search the right half/, (j) => { const s = searchState(j); return s.target > s.array[s.mid!] }],
    [/equals .* - target found/, (j) => { const s = searchState(j); return s.target === s.array[s.mid!] }],
  ],
  [CriticalJunctionType.BST_DIRECTION]: [
    // Comparison at a node (equal values go right in this tree).
    [/^(-?\d+) is less than (-?\d+) - go left$/, (_j, m) => Number(m[1]) < Number(m[2])],
    [/^(-?\d+) is greater than or equal to (-?\d+) - go right$/, (_j, m) => Number(m[1]) >= Number(m[2])],
    [/This position is empty - insert here/, (j) => bst(j).currentNode === null],
    // The empty slot.
    [/^It becomes the root$/, (j) => bst(j).insertionParentValue == null],
    [/Nothing happens - the tree stays empty/, () => false],
    [/must be compared against an existing value first/, (j) => bst(j).insertionParentValue != null],
    [/^Attach as the (left|right) child of node (-?\d+)$/, (j, m) =>
      (bst(j).targetValue < Number(m[2]) ? 'left' : 'right') === m[1]],
    [/^Compare it against node -?\d+ again$/, () => false],
    // Deleting the node: is this a valid removal for this node?
    [/in-order successor \(the smallest value in its right subtree\), then remove that node/, (j) =>
      bst(j).currentNode?.right != null],
    [/Remove it and reattach both subtrees to its parent/, () => false],
    [/Delete it together with its right subtree/, (j) => bst(j).currentNode?.left == null],
    [/Replace it with its parent's value/, () => false],
    [/Replace it with the largest value in its right subtree/, (j) => size(bst(j).currentNode?.right ?? null) === 1],
    [/Replace it with its left child/, (j) => bst(j).currentNode?.left != null && bst(j).currentNode!.left!.right === null],
    [/Remove it - there is nothing below it to keep/, (j) => size(bst(j).currentNode) === 1],
    [/Its only child takes its place/, (j) => { const c = bst(j).currentNode; return (c?.left == null) !== (c?.right == null) }],
    [/Remove it together with everything below it/, (j) => size(bst(j).currentNode) === 1],
    [/Swap it with its parent, then remove it/, () => false],
    [/Remove its parent as well/, () => false],
  ],
}

// ALGORITHM_COMPLETE differs per algorithm and question.
const COMPLETION_RULES: Record<'sort' | 'search-found' | 'search-missing' | 'bst', Rule[]> = {
  // "What proves the array is fully sorted?" - for n <= 1 anything does.
  sort: [
    [/No adjacent pair is out of order/, () => true],
    [/first and last elements are in their correct positions/, (j) => j.n <= 2],
    [/Every element was visited the same number of times/, (j) => j.n <= 1],
    [/total number of swaps equals the array length/, (j) => j.n <= 1],
    [/Every element was compared at least once/, (j) => j.n <= 1],
  ],
  // "What confirms the target was correctly located?" - a statement that is
  // true of this run is treated as defensible, so it must not be a distractor.
  'search-found': [
    [/confirmed equal to the target/, () => true],
    [/Every element in the array was visited/, (j) => probes(j) >= searchState(j).array.length],
    [/The target must appear at every index checked/, (j) => probes(j) === 1],
    [/array became sorted during the search/, () => false],
    [/kept going until the range was empty/, () => false],
    [/matched at more than one index/, () => false],
  ],
  // "What confirms the search correctly covered the whole space?"
  'search-missing': [
    [/entire valid search space was eliminated/, () => true],
    [/One comparison is enough to prove absence/, (j) => probes(j) === 1],
    [/array must be unsorted/, () => false],
    [/could still be found by starting over/, () => false],
    [/range still had unchecked values/, () => false],
  ],
  // "Which traversal lists the values of any binary search tree in sorted order?"
  bst: [
    [/^In-order/, () => true],
    [/^Pre-order/, () => false],
    [/^Level-order/, () => false],
    [/order they were inserted/, () => false],
  ],
}

function rulesFor(snapshot: AlgorithmSnapshot, algorithm: string): Rule[] {
  if (snapshot.criticalJunctionType !== CriticalJunctionType.ALGORITHM_COMPLETE) {
    return TRUTH_RULES[snapshot.criticalJunctionType!] ?? []
  }
  if (algorithm === 'Binary Search Tree') return COMPLETION_RULES.bst
  if (algorithm === 'Binary Search') {
    return searchState({ snapshot, n: 0 }).found ? COMPLETION_RULES['search-found'] : COMPLETION_RULES['search-missing']
  }
  return COMPLETION_RULES.sort
}

function assertOneTrueOption(run: AlgorithmSnapshot[], algorithm: string, n: number, label: string) {
  for (const snapshot of run) {
    if (!snapshot.isPredictionRequired || !snapshot.criticalJunctionType) continue
    const tiles = getTilesForSnapshot(snapshot, algorithm)
    const rules = rulesFor(snapshot, algorithm)
    const trueIds = tiles
      .filter((tile) => {
        const rule = rules.find(([pattern]) => pattern.test(tile.label))
        if (!rule) throw new Error(`No truth rule for "${tile.label}" (${snapshot.criticalJunctionType}) - add one`)
        return rule[1]({ snapshot, n }, tile.label.match(rule[0])!)
      })
      .map((tile) => tile.id)
    const where = `${label} step ${snapshot.stepIndex} ${snapshot.criticalJunctionType}: ${JSON.stringify(tiles.map((t) => t.label))}`
    expect(trueIds, where).toEqual([correctTileIdFor(snapshot)])
  }
}

// ------------------------------------------------------------------ inputs

function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a * 1103515245 + 12345) % 2147483648
    return a / 2147483648
  }
}

const LENGTHS = [1, 2, 3, 4, 5, 6, 7, 8]

function arraysOfLength(n: number): number[][] {
  const rng = seeded(n * 7919)
  const ascending = Array.from({ length: n }, (_, i) => (i + 1) * 3)
  const out = [ascending, [...ascending].reverse(), Array(n).fill(5)]
  for (let k = 0; k < 6; k++) out.push(Array.from({ length: n }, () => 1 + Math.floor(rng() * 5))) // duplicates likely
  for (let k = 0; k < 6; k++) out.push(Array.from({ length: n }, () => 1 + Math.floor(rng() * 90)))
  return out
}

function balancedOrder(sorted: number[]): number[] {
  const order: number[] = []
  const queue: Array<[number, number]> = [[0, sorted.length - 1]]
  while (queue.length > 0) {
    const [low, high] = queue.shift()!
    if (low > high) continue
    const mid = Math.floor((low + high) / 2)
    order.push(sorted[mid])
    queue.push([low, mid - 1], [mid + 1, high])
  }
  return order
}

function insertOrders(n: number): number[][] {
  const ascending = Array.from({ length: n }, (_, i) => (i + 1) * 10)
  const rng = seeded(n * 104729)
  const shuffled = () => [...ascending].sort(() => rng() - 0.5)
  const orders = [ascending, [...ascending].reverse(), balancedOrder(ascending), shuffled(), shuffled(), shuffled()]
  return [...orders, ...orders.filter((o) => o.length > 0).map((o) => [...o, o[Math.floor(o.length / 2)]])] // with a duplicate
}

describe('no asked junction has two true options', () => {
  it('Bubble Sort, lengths 1-8', () => {
    for (const n of LENGTHS) {
      for (const input of arraysOfLength(n)) {
        for (const topMisconception of [null, MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]) {
          const run = bubbleSortEngine(input, { withComplexityPrediction: true, topMisconception })
          assertOneTrueOption(run, 'Bubble Sort', n, `[${input}]`)
        }
      }
    }
  })

  it('Binary Search, lengths 1-8, every target position and every gap', () => {
    for (const n of LENGTHS) {
      const array = Array.from({ length: n }, (_, i) => (i + 1) * 2)
      const targets = [...array, 1, ...array.map((v) => v + 1)]
      for (const target of targets) {
        const run = binarySearchEngine(array, target, { withComplexityPrediction: true })
        assertOneTrueOption(run, 'Binary Search', n, `[${array}] target ${target}`)
      }
    }
  })

  it('BST insert, sizes 1-8, including chains and duplicates', () => {
    for (const n of LENGTHS) {
      for (const order of insertOrders(n)) {
        const run = bstInsertEngine(order, { withCompletionCheck: true, withComplexityPrediction: true })
        assertOneTrueOption(run, 'Binary Search Tree', order.length, `insert [${order}]`)
      }
    }
  })

  it('BST delete of every node (and an absent value), sizes 1-8', () => {
    for (const n of LENGTHS) {
      for (const order of insertOrders(n).slice(0, 6)) {
        const root = (bstInsertEngine(order).at(-1)?.dataStructureState as BSTState).root
        for (const target of [...order, 999]) {
          assertOneTrueOption(bstDeleteEngine(root, target), 'Binary Search Tree', n, `delete ${target} from [${order}]`)
        }
      }
    }
  })

  it('asks the BST traversal question of every BST, not the tree on screen', () => {
    const run = bstInsertEngine([10, 20, 30], { withCompletionCheck: true })
    const question = run.find((s) => s.criticalJunctionType === CriticalJunctionType.ALGORITHM_COMPLETE)!
    expect(getPromptForSnapshot(question, 'Binary Search Tree')).toContain('any binary search tree')
  })
})
