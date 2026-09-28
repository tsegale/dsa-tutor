import { MisconceptionCategory, type AlgorithmSnapshot } from '@dsa-tutor/types'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { binarySearchEngine } from '@/engine/binarySearch'
import { bstDeleteEngine, bstInsertEngine, type BSTNode, type BSTState } from '@/engine/bst'

/**
 * Deterministic AI Challenge generators, one per study-topic structure
 * (Week 2 2D). The data is always built here, from a seed - never by a
 * model. The AI service only writes the one framing sentence shown to the
 * student, from the case's educator-facing explanation, and each case
 * carries an authored fallback for when that call fails.
 *
 * A case is chosen for the learner's top misconception so that the run
 * actually asks the decision that misconception gets wrong (see
 * challengeGenerators.test.ts, which checks this for every category the
 * topic's tiles can produce). With no misconception yet, the seed picks one
 * of the topic's general cases.
 */

export const CHALLENGE_TOPICS = ['bubble-sort', 'binary-search', 'bst'] as const
export type ChallengeTopic = (typeof CHALLENGE_TOPICS)[number]

export type ChallengeInput =
  | { kind: 'array'; array: number[] }
  | { kind: 'search'; array: number[]; target: number }
  | { kind: 'bst-insert'; values: number[] }
  | { kind: 'bst-delete'; values: number[]; deleteValue: number }

export interface ChallengeCase {
  topic: ChallengeTopic
  caseId: string
  seed: number
  /** The misconception this case was chosen for, or null for a general case. */
  targets: MisconceptionCategory | null
  input: ChallengeInput
  /** Educator-facing: why this case, persisted on the session. Also the
   * only thing the AI service sees when it writes the framing sentence. */
  explanation: string
  /** Student-facing framing sentence used when the AI call fails. */
  fallbackHint: string
}

export function hasChallengeGenerator(topicSlug: string | undefined): topicSlug is ChallengeTopic {
  return (CHALLENGE_TOPICS as readonly string[]).includes(topicSlug ?? '')
}

// --------------------------------------------------------------- seeding

/** mulberry32: small, fast, and identical on every platform for a given seed. */
function rngFrom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a over `${sessionId}:${attempt}`, so a logged attempt can be regenerated exactly. */
export function challengeSeed(sessionId: string | null, attempt: number): number {
  const text = `${sessionId ?? 'no-session'}:${attempt}`
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

/** `count` distinct values from 1..40, ascending. */
function distinctAscending(rng: () => number, count: number): number[] {
  const pool = Array.from({ length: 40 }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).sort((a, b) => a - b)
}

function shuffled(rng: () => number, values: number[]): number[] {
  const out = [...values]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function sizeFor(difficulty: string): number {
  if (difficulty === 'BEGINNER') return 5
  if (difficulty === 'ADVANCED') return 7
  return 6
}

/** Median-first insert order, which builds a balanced tree from sorted values. */
function balancedOrder(sorted: number[]): number[] {
  const order: number[] = []
  const queue: Array<[number, number]> = [[0, sorted.length - 1]]
  while (queue.length > 0) {
    const [low, high] = queue.shift()!
    if (low > high) continue
    const m = Math.floor((low + high) / 2)
    order.push(sorted[m])
    queue.push([low, m - 1], [m + 1, high])
  }
  return order
}

function bstRootFor(values: number[]): BSTNode | null {
  return (bstInsertEngine(values).at(-1)?.dataStructureState as BSTState | undefined)?.root ?? null
}

function nodesWithTwoChildren(node: BSTNode | null): number[] {
  if (!node) return []
  const here = node.left && node.right ? [node.value] : []
  return [...here, ...nodesWithTwoChildren(node.left), ...nodesWithTwoChildren(node.right)]
}

// ----------------------------------------------------------------- cases

interface CaseSpec {
  build: (rng: () => number, size: number) => ChallengeInput
  explanation: string
  fallbackHint: string
}

const BUBBLE_CASES = {
  'reverse-sorted': {
    build: (rng, size) => ({ kind: 'array', array: distinctAscending(rng, size).reverse() }),
    explanation:
      'Reverse-sorted array: every adjacent pair is out of order, so every comparison needs a swap and no pass finishes the sort early.',
    fallbackHint: 'Check every pair on its own merits - this one takes the full number of passes.',
  },
  'already-sorted': {
    build: (rng, size) => ({ kind: 'array', array: distinctAscending(rng, size) }),
    explanation:
      'Already-sorted array: no adjacent pair is out of order, so the right call at every comparison is to leave the pair alone.',
    fallbackHint: 'Before you act on a pair, check whether it is really out of order.',
  },
  'all-equal': {
    build: (rng, size) => ({ kind: 'array', array: Array(size).fill(pick(rng, [3, 5, 7, 8, 12])) }),
    explanation:
      'All-equal array: a pass with no swaps ends the sort, and it ends because nothing was out of order, not because the values are equal.',
    fallbackHint: 'Think about exactly what makes the algorithm stop.',
  },
  'adjacent-duplicates': {
    build: (rng, size) => {
      let base = shuffled(rng, distinctAscending(rng, Math.ceil(size / 2)))
      if (base.every((v, i) => i === 0 || base[i - 1] < v)) base = base.reverse()
      return { kind: 'array', array: base.flatMap((v) => [v, v]).slice(0, size) }
    },
    explanation:
      'Adjacent duplicates: some pairs are out of order and some are equal, so each comparison needs the direction of the test checked, and equal pairs stay put.',
    fallbackHint: 'Watch what the comparison says about two values that are the same.',
  },
  'single-element': {
    build: (rng) => ({ kind: 'array', array: [pick(rng, [4, 9, 17, 23])] }),
    explanation: 'Single element: the base case, already sorted before any comparison is made.',
    fallbackHint: 'Ask yourself how much work there is to do here.',
  },
  'two-elements': {
    build: (rng) => {
      const [low, high] = distinctAscending(rng, 2)
      return { kind: 'array', array: [high, low] }
    },
    explanation: 'Two elements out of order: the smallest input with a decision, exactly one comparison and one pass.',
    fallbackHint: 'Count the comparisons before you start.',
  },
} satisfies Record<string, CaseSpec>

// Sorted inputs use even values only, so a target in a gap (an odd value
// between two neighbours) is guaranteed absent.
const evenAscending = (rng: () => number, size: number) => distinctAscending(rng, size).map((v) => v * 2)

const BINARY_SEARCH_CASES = {
  'target-absent': {
    build: (rng, size) => {
      const array = evenAscending(rng, size)
      const gap = Math.floor(rng() * (size - 1))
      return { kind: 'search', array, target: array[gap] + 1 }
    },
    explanation:
      'Target absent, between two values: the search must keep halving until the range is empty, and only an empty range proves the target is missing.',
    fallbackHint: 'Keep going until the range itself tells you the answer.',
  },
  'target-first': {
    build: (rng, size) => {
      const array = evenAscending(rng, size)
      return { kind: 'search', array, target: array[0] }
    },
    explanation: 'Target at the first index: every midpoint is larger than the target, so every decision must go left.',
    fallbackHint: 'At each midpoint, check which side of it the target has to be on.',
  },
  'target-last': {
    build: (rng, size) => {
      const array = evenAscending(rng, size)
      return { kind: 'search', array, target: array[size - 1] }
    },
    explanation: 'Target at the last index: every midpoint is smaller than the target, so every decision must go right.',
    fallbackHint: 'At each midpoint, check which side of it the target has to be on.',
  },
  'even-length': {
    build: (rng, size) => {
      const length = size % 2 === 0 ? size : size + 1
      const array = evenAscending(rng, length)
      return { kind: 'search', array, target: array[1 + Math.floor(rng() * (length - 1))] }
    },
    explanation:
      'Even-length array: there is no single middle element, so each midpoint depends on rounding (low + high) / 2 down.',
    fallbackHint: 'Work out the midpoint index carefully each time.',
  },
  'single-element': {
    build: (rng) => {
      const value = pick(rng, [6, 14, 22, 30])
      return { kind: 'search', array: [value], target: value }
    },
    explanation: 'Single element: low and high start equal, so one midpoint check decides the search.',
    fallbackHint: 'Ask yourself how many checks this search can possibly need.',
  },
} satisfies Record<string, CaseSpec>

const BST_CASES = {
  'ascending-chain': {
    build: (rng, size) => ({ kind: 'bst-insert', values: distinctAscending(rng, size) }),
    explanation:
      'Ascending insert order: every value goes right, so the tree degenerates into a chain and each insert compares against every node so far.',
    fallbackHint: 'Watch the shape the tree takes, and what that shape costs each insert.',
  },
  balanced: {
    build: (rng, size) => ({ kind: 'bst-insert', values: balancedOrder(distinctAscending(rng, size)) }),
    explanation:
      'Balanced insert order: decisions go both left and right, and the finished tree reads differently in-order, pre-order, level-order and insertion order.',
    fallbackHint: 'Compare against each node on the way down, and think about how the finished tree reads.',
  },
  'duplicate-value': {
    build: (rng, size) => {
      const values = balancedOrder(distinctAscending(rng, size - 1))
      return { kind: 'bst-insert', values: [...values, pick(rng, values.slice(1))] }
    },
    explanation:
      'Duplicate value: one insert meets a node with the same value, which this tree sends right - the direction convention is tested exactly.',
    fallbackHint: 'Remember which way this tree sends a value equal to the node.',
  },
  'delete-two-children': {
    build: (rng, size) => {
      const values = balancedOrder(distinctAscending(rng, Math.max(size, 7)))
      return { kind: 'bst-delete', values, deleteValue: pick(rng, nodesWithTwoChildren(bstRootFor(values))) }
    },
    explanation:
      'Delete a node with two children: it cannot simply be removed; its in-order successor takes its place so the ordering holds.',
    fallbackHint: 'Think about what has to replace a node that still has two subtrees below it.',
  },
} satisfies Record<string, CaseSpec>

type CaseTable = Record<string, CaseSpec>

const CASES: Record<ChallengeTopic, CaseTable> = {
  'bubble-sort': BUBBLE_CASES,
  'binary-search': BINARY_SEARCH_CASES,
  bst: BST_CASES,
}

type CaseChoice = string | readonly string[]

/**
 * Which case targets which misconception, per topic. Each entry sends the
 * learner to a case where the decision they get wrong comes up, and where
 * the right answer is the opposite of their habit - never one that rewards
 * it. (The old mapping sent under-swapping to an array of duplicates, where
 * "leave it" is mostly correct, reinforcing the error.)
 */
export const MISCONCEPTION_CASES: Record<ChallengeTopic, Partial<Record<MisconceptionCategory, CaseChoice>>> = {
  'bubble-sort': {
    // Over-swapping: every pair must be left alone.
    [MisconceptionCategory.ORDER_OF_OPERATIONS]: 'already-sorted',
    // Under-swapping: every pair must be swapped.
    [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: 'reverse-sorted',
    // Calling it sorted too soon: n-1 passes, and no pass before the last leaves it sorted.
    [MisconceptionCategory.PREMATURE_TERMINATION]: 'reverse-sorted',
    // Misreading why the loop stops: equal values, stopped by no swaps.
    [MisconceptionCategory.INVARIANT_MISAPPLICATION]: 'all-equal',
    [MisconceptionCategory.COMPARISON_DIRECTION]: 'adjacent-duplicates',
    [MisconceptionCategory.STABILITY_CONFUSION]: 'adjacent-duplicates',
    // The count meets n(n-1)/2 exactly.
    [MisconceptionCategory.COMPLEXITY_MISATTRIBUTION]: 'reverse-sorted',
    [MisconceptionCategory.BOUNDARY_CONDITION]: 'two-elements',
    [MisconceptionCategory.OFF_BY_ONE]: 'two-elements',
    [MisconceptionCategory.BASE_CASE_OMISSION]: 'single-element',
  },
  'binary-search': {
    [MisconceptionCategory.COMPARISON_DIRECTION]: ['target-first', 'target-last'],
    [MisconceptionCategory.PREMATURE_TERMINATION]: 'target-absent',
    [MisconceptionCategory.BOUNDARY_CONDITION]: 'target-absent',
    // "The array must be unsorted for the target to be missing".
    [MisconceptionCategory.INVARIANT_MISAPPLICATION]: 'target-absent',
    // The most probes the array can need.
    [MisconceptionCategory.COMPLEXITY_MISATTRIBUTION]: 'target-absent',
    [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: 'even-length',
    [MisconceptionCategory.OFF_BY_ONE]: 'even-length',
    [MisconceptionCategory.BASE_CASE_OMISSION]: 'single-element',
  },
  bst: {
    // Equal goes right: the direction convention itself.
    [MisconceptionCategory.COMPARISON_DIRECTION]: 'duplicate-value',
    [MisconceptionCategory.STRUCTURAL_PROPERTY_VIOLATION]: 'balanced',
    [MisconceptionCategory.TRAVERSAL_ORDER_CONFUSION]: 'balanced',
    [MisconceptionCategory.INVARIANT_MISAPPLICATION]: 'delete-two-children',
    // Cost follows height: the chain is the worst case.
    [MisconceptionCategory.COMPLEXITY_MISATTRIBUTION]: 'ascending-chain',
  },
}

/** Cases the seed picks from when there is no misconception to target. */
const GENERAL_CASES: Record<ChallengeTopic, readonly string[]> = {
  'bubble-sort': ['reverse-sorted', 'adjacent-duplicates', 'already-sorted', 'all-equal'],
  'binary-search': ['target-absent', 'target-first', 'target-last', 'even-length'],
  bst: ['balanced', 'ascending-chain', 'duplicate-value', 'delete-two-children'],
}

export function challengeCaseIds(topic: ChallengeTopic): string[] {
  return Object.keys(CASES[topic])
}

export interface GenerateChallengeOptions {
  topic: ChallengeTopic
  misconception: string | null
  difficulty: string
  seed: number
  /** Forces a specific case (tests and educator tooling). */
  caseId?: string
}

/** Pure: the same options always produce the same case. */
export function generateChallenge(options: GenerateChallengeOptions): ChallengeCase {
  const { topic, difficulty, seed } = options
  const rng = rngFrom(seed)
  const mapped = MISCONCEPTION_CASES[topic][options.misconception as MisconceptionCategory]
  const targets = mapped ? (options.misconception as MisconceptionCategory) : null
  const choice: CaseChoice = options.caseId ?? mapped ?? GENERAL_CASES[topic]
  const caseId = typeof choice === 'string' ? choice : pick(rng, choice)
  const spec = CASES[topic][caseId]
  if (!spec) throw new Error(`No challenge case "${caseId}" for ${topic}`)
  return {
    topic,
    caseId,
    seed,
    targets,
    input: spec.build(rng, sizeFor(difficulty)),
    explanation: spec.explanation,
    fallbackHint: spec.fallbackHint,
  }
}

export interface ChallengeRunOptions {
  withComplexityPrediction: boolean
  codeEditorMode?: boolean
}

/** The snapshot run for a case, built with the same study options as the topic's normal runs. */
export function buildChallengeRun(challenge: ChallengeCase, options: ChallengeRunOptions): AlgorithmSnapshot[] {
  const { input } = challenge
  switch (input.kind) {
    case 'array':
      return bubbleSortEngine(input.array, {
        withComplexityPrediction: options.withComplexityPrediction,
        codeEditorMode: options.codeEditorMode ?? false,
        topMisconception: challenge.targets,
      })
    case 'search':
      return binarySearchEngine(input.array, input.target, { withComplexityPrediction: options.withComplexityPrediction })
    case 'bst-insert':
      return bstInsertEngine(input.values, {
        withCompletionCheck: true,
        withComplexityPrediction: options.withComplexityPrediction,
      })
    case 'bst-delete':
      return bstDeleteEngine(bstRootFor(input.values), input.deleteValue)
  }
}
