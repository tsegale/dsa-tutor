import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import type { PythonStepSpec } from '@/utils/pyodideRunner'

/**
 * A topic's code curriculum: a short ladder of challenges that builds from
 * one expression to the whole algorithm.
 *
 * Code Mode used to be one challenge per topic, anchored to a single
 * junction - "Read the element at index i" and that was the whole of it.
 * There was nothing to build towards and nothing to finish, which is why
 * the Code stage could never be ticked.
 *
 * A ladder is NOT junction-anchored. Each rung is a question about the
 * algorithm rather than about the step the learner happens to be standing
 * on, so its sandbox and its answer are both derived from the whole run.
 * That is what lets the last rung ask for the entire implementation.
 *
 * Only the three study topics have ladders. Every other topic keeps its
 * single junction-anchored challenge (config/codeChallenges.ts), which
 * behaves as a one-rung ladder so nothing about it regresses.
 */
export interface CodeRung {
  /** Short label for the progress indicator: "Compare a pair". */
  title: string
  /** What to write, in one or two sentences. */
  prompt: string
  /**
   * The editor's starting point. The Python carries comments that name the
   * rule and the variables in scope, because a blank editor beside an
   * unfamiliar algorithm is where a beginner stops. Java is read, not run.
   */
  starter: { python: string; java: string }
  /** The sandbox globals, derived from the run so they match the canvas. */
  globalsFor: (run: AlgorithmSnapshot[]) => Record<string, unknown>
  readBack: string
  expect: PythonStepSpec['expect']
  /** The answer, derived from the same run. */
  expectedFor: (run: AlgorithmSnapshot[]) => unknown
}

// -------------------------------------------------------------- reading
// The three study topics store their state differently - a bare array, an
// object with the search bounds, a tree - so these read each without the
// rungs below caring which.

function arrayState(snapshot: AlgorithmSnapshot | undefined): number[] {
  const state = snapshot?.dataStructureState
  if (Array.isArray(state)) return [...(state as number[])]
  if (state && typeof state === 'object' && Array.isArray((state as { array?: unknown }).array)) {
    return [...(state as { array: number[] }).array]
  }
  return []
}

function objectState(snapshot: AlgorithmSnapshot | undefined): Record<string, unknown> {
  const state = snapshot?.dataStructureState
  return state && typeof state === 'object' && !Array.isArray(state) ? (state as Record<string, unknown>) : {}
}

const first = (run: AlgorithmSnapshot[]) => run[0]
const last = (run: AlgorithmSnapshot[]) => run[run.length - 1]

/**
 * The engine's tree nodes carry an `id` for rendering. A student writing
 * plain dictionaries cannot produce one, so the expected tree is stripped
 * to the three fields the algorithm is actually about.
 */
export interface PlainNode {
  value: number
  left: PlainNode | null
  right: PlainNode | null
}

export function plainTree(node: unknown): PlainNode | null {
  if (!node || typeof node !== 'object') return null
  const n = node as { value?: unknown; left?: unknown; right?: unknown }
  if (typeof n.value !== 'number') return null
  return { value: n.value, left: plainTree(n.left), right: plainTree(n.right) }
}

/** One bubble pass, as rung 3 asks for it. */
function onePass(values: number[]): number[] {
  const arr = [...values]
  for (let j = 0; j < arr.length - 1; j += 1) {
    if (arr[j] > arr[j + 1]) [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
  }
  return arr
}

// --------------------------------------------------------- bubble sort

const BUBBLE_SORT: CodeRung[] = [
  {
    title: 'Compare a pair',
    prompt: 'Decide whether the pair at j and j + 1 is in the wrong order. Set should_swap to True or False.',
    starter: {
      python: [
        '# arr and j are given.',
        '# Bubble Sort swaps a pair only when the left value is larger',
        '# than the right one. Nothing is swapped yet - just the decision.',
        'should_swap = ',
      ].join('\n'),
      java: 'boolean shouldSwap = arr[j] > arr[j + 1];',
    },
    globalsFor: (run) => ({ arr: arrayState(first(run)), j: 0 }),
    readBack: 'should_swap',
    expect: 'boolean',
    expectedFor: (run) => {
      const arr = arrayState(first(run))
      return arr.length >= 2 ? arr[0] > arr[1] : null
    },
  },
  {
    title: 'Swap the pair',
    prompt: 'Now carry it out: swap the two values at j and j + 1, whichever way round they are.',
    starter: {
      python: [
        '# arr and j are given.',
        '# Swap the values at j and j + 1 in place - arr itself must change,',
        '# not a copy. Python does this in one line with tuple assignment:',
        '#   a, b = b, a',
        '',
      ].join('\n'),
      java: 'int temp = arr[j];\narr[j] = arr[j + 1];\narr[j + 1] = temp;',
    },
    globalsFor: (run) => ({ arr: arrayState(first(run)), j: 0 }),
    readBack: 'arr',
    expect: 'number[]',
    expectedFor: (run) => {
      const arr = arrayState(first(run))
      if (arr.length < 2) return null
      const swapped = [...arr]
      ;[swapped[0], swapped[1]] = [swapped[1], swapped[0]]
      return swapped
    },
  },
  {
    title: 'One full pass',
    prompt: 'Walk the whole array once, swapping every pair that is out of order. One pass carries the largest value to the end.',
    starter: {
      python: [
        '# arr is given.',
        '# A pass walks j from 0 to the second-to-last index, using the',
        '# comparison and the swap you have already written.',
        'for j in range(len(arr) - 1):',
        '    ',
      ].join('\n'),
      java: 'for (int j = 0; j < arr.length - 1; j++) {\n    if (arr[j] > arr[j + 1]) {\n        int temp = arr[j];\n        arr[j] = arr[j + 1];\n        arr[j + 1] = temp;\n    }\n}',
    },
    globalsFor: (run) => ({ arr: arrayState(first(run)) }),
    readBack: 'arr',
    expect: 'number[]',
    expectedFor: (run) => {
      const arr = arrayState(first(run))
      return arr.length >= 2 ? onePass(arr) : null
    },
  },
  {
    title: 'The whole sort',
    prompt: 'Sort the array. Repeat the pass until nothing is left to swap - each pass settles one more value at the end.',
    starter: {
      python: [
        '# arr is given. Sort it in place.',
        '# Bubble Sort repeats the pass you just wrote. After pass i the last',
        '# i values are already in their final positions, so the next pass can',
        '# stop i earlier - that is the "- i" in the inner range.',
        'for i in range(len(arr)):',
        '    for j in range(len(arr) - 1 - i):',
        '        ',
      ].join('\n'),
      java: 'for (int i = 0; i < arr.length; i++) {\n    for (int j = 0; j < arr.length - 1 - i; j++) {\n        if (arr[j] > arr[j + 1]) {\n            int temp = arr[j];\n            arr[j] = arr[j + 1];\n            arr[j + 1] = temp;\n        }\n    }\n}',
    },
    globalsFor: (run) => ({ arr: arrayState(first(run)) }),
    readBack: 'arr',
    expect: 'number[]',
    // The engine's own final state: the student's sort has to agree with
    // the run they watched, not with a second implementation written here.
    expectedFor: (run) => (run.length > 0 ? arrayState(last(run)) : null),
  },
]

// -------------------------------------------------------- binary search

const searchInput = (run: AlgorithmSnapshot[]) => {
  const state = objectState(first(run))
  const arr = arrayState(first(run))
  const target = typeof state.target === 'number' ? state.target : null
  return { arr, target }
}

const BINARY_SEARCH: CodeRung[] = [
  {
    title: 'Find the midpoint',
    prompt: 'Set mid to the index halfway between low and high.',
    starter: {
      python: [
        '# arr, low and high are given.',
        '# Use integer division (//) so mid is an index and not a decimal.',
        'mid = ',
      ].join('\n'),
      java: 'int mid = (low + high) / 2;',
    },
    globalsFor: (run) => ({ arr: searchInput(run).arr, low: 0, high: Math.max(searchInput(run).arr.length - 1, 0) }),
    readBack: 'mid',
    expect: 'number',
    expectedFor: (run) => {
      const { arr } = searchInput(run)
      return arr.length > 0 ? Math.floor((0 + (arr.length - 1)) / 2) : null
    },
  },
  {
    title: 'Choose a half',
    prompt: "Compare the value at mid with the target and set half to 'found', 'left' or 'right'.",
    starter: {
      python: [
        '# arr, target and mid are given.',
        '# The array is sorted, which is what makes this work: if the value',
        '# at mid is too small the target can only be to the right of it.',
        "# Set half to 'found', 'left' or 'right'.",
        'if arr[mid] == target:',
        "    half = 'found'",
        '',
      ].join('\n'),
      java: "String half = arr[mid] == target ? \"found\" : arr[mid] < target ? \"right\" : \"left\";",
    },
    globalsFor: (run) => {
      const { arr, target } = searchInput(run)
      return { arr, target, mid: Math.floor((arr.length - 1) / 2) }
    },
    readBack: 'half',
    expect: 'string',
    expectedFor: (run) => {
      const { arr, target } = searchInput(run)
      if (arr.length === 0 || target === null) return null
      const mid = Math.floor((arr.length - 1) / 2)
      if (arr[mid] === target) return 'found'
      return arr[mid] < target ? 'right' : 'left'
    },
  },
  {
    title: 'Narrow the range',
    prompt: 'Do one whole iteration: find mid, compare it with the target, and set bounds to the [low, high] the next iteration would use.',
    starter: {
      python: [
        '# arr, target, low and high are given.',
        '# Half the range is thrown away every iteration. The half that',
        '# cannot hold the target is discarded by moving low past mid, or',
        '# high back before it.',
        'mid = (low + high) // 2',
        '',
        '',
        '# Leave the new range here, as a two-item list.',
        'bounds = [low, high]',
      ].join('\n'),
      java: 'int mid = (low + high) / 2;\nif (arr[mid] < target) { low = mid + 1; } else { high = mid - 1; }',
    },
    globalsFor: (run) => {
      const { arr, target } = searchInput(run)
      return { arr, target, low: 0, high: Math.max(arr.length - 1, 0) }
    },
    readBack: 'bounds',
    expect: 'number[]',
    expectedFor: (run) => {
      const { arr, target } = searchInput(run)
      if (arr.length === 0 || target === null) return null
      const high = arr.length - 1
      const mid = Math.floor(high / 2)
      if (arr[mid] === target) return [mid, mid]
      return arr[mid] < target ? [mid + 1, high] : [0, mid - 1]
    },
  },
  {
    title: 'The whole search',
    prompt: 'Search the array for the target. Set result to the index where it was found, or -1 if it is not there.',
    starter: {
      python: [
        '# arr and target are given. arr is sorted.',
        '# Keep narrowing the range until it is empty. Use the midpoint and',
        '# the comparison you have already written.',
        'low = 0',
        'high = len(arr) - 1',
        'result = -1',
        '',
        'while low <= high:',
        '    ',
      ].join('\n'),
      java: 'int low = 0, high = arr.length - 1, result = -1;\nwhile (low <= high) {\n    int mid = (low + high) / 2;\n    if (arr[mid] == target) { result = mid; break; }\n    if (arr[mid] < target) { low = mid + 1; } else { high = mid - 1; }\n}',
    },
    globalsFor: (run) => {
      const { arr, target } = searchInput(run)
      return { arr, target }
    },
    readBack: 'result',
    expect: 'number',
    // The run's own verdict, so the student's search has to agree with the
    // search they watched - including when the target is not there.
    expectedFor: (run) => {
      const state = objectState(last(run))
      const index = state.foundIndex
      return typeof index === 'number' ? index : -1
    },
  },
]

// ------------------------------------------------------------------ bst

/**
 * The values to insert, in an order that rebuilds the exact tree the run
 * ended with: its own pre-order traversal.
 *
 * Reading the run's targetValue sequence instead looks more direct and is
 * wrong - inserting [4, 4, 2, 9] gives a root 4 with a second 4 to its
 * right, but the two 4s are adjacent in that sequence and indistinguishable
 * from one value being looked at twice. Pre-order cannot lose a node,
 * because it IS the tree: visit a node before its subtrees and every node
 * lands under the same parent it has now.
 */
const bstValues = (run: AlgorithmSnapshot[]): number[] => {
  const out: number[] = []
  const visit = (node: PlainNode | null) => {
    if (!node) return
    out.push(node.value)
    visit(node.left)
    visit(node.right)
  }
  visit(plainTree(objectState(last(run)).root))
  return out
}

const BST: CodeRung[] = [
  {
    title: 'Which way?',
    prompt: "A Binary Search Tree keeps smaller values left and larger values right. Set go to 'left' or 'right' for this value.",
    starter: {
      python: [
        '# node_value and target are given.',
        '# That one rule is the whole of a BST: everything smaller than a',
        "# node sits in its left subtree, everything larger in its right.",
        "# Set go to 'left' or 'right'.",
        'go = ',
      ].join('\n'),
      java: 'String go = target < nodeValue ? "left" : "right";',
    },
    globalsFor: (run) => {
      const values = bstValues(run)
      return { node_value: values[0] ?? 0, target: values[1] ?? 0 }
    },
    readBack: 'go',
    expect: 'string',
    expectedFor: (run) => {
      const values = bstValues(run)
      if (values.length < 2) return null
      return values[1] < values[0] ? 'left' : 'right'
    },
  },
  {
    title: 'Make a node',
    prompt: 'Every value in the tree is a node with a value and two empty children. Build one for target.',
    starter: {
      python: [
        '# target is given.',
        '# A node is a dictionary with exactly these three keys. A new node',
        '# is always a leaf, so both of its children start out as None.',
        "node = {'value': , 'left': , 'right': }",
      ].join('\n'),
      java: 'Node node = new Node(target, null, null);',
    },
    globalsFor: (run) => ({ target: bstValues(run)[0] ?? 0 }),
    readBack: 'node',
    expect: 'json',
    expectedFor: (run) => {
      const value = bstValues(run)[0]
      return typeof value === 'number' ? { value, left: null, right: null } : null
    },
  },
  {
    title: 'Insert one value',
    prompt: 'Walk down from the root using the left/right rule until you find an empty place, and put a new node there.',
    starter: {
      python: [
        '# tree and target are given. tree is a node dictionary.',
        '# Walk down with a cursor: at each node go left or right by the',
        "# rule, and when that child is None you have found the empty place.",
        'node = tree',
        'while True:',
        "    side = 'left' if target < node['value'] else 'right'",
        '    if node[side] is None:',
        "        node[side] = {'value': target, 'left': None, 'right': None}",
        '        break',
        '    ',
      ].join('\n'),
      java: 'Node node = tree;\nwhile (true) {\n    if (target < node.value) {\n        if (node.left == null) { node.left = new Node(target); break; }\n        node = node.left;\n    } else {\n        if (node.right == null) { node.right = new Node(target); break; }\n        node = node.right;\n    }\n}',
    },
    globalsFor: (run) => {
      const values = bstValues(run)
      return { tree: buildBst(values.slice(0, 3)), target: values[3] ?? 0 }
    },
    readBack: 'tree',
    expect: 'json',
    expectedFor: (run) => {
      const values = bstValues(run)
      if (values.length < 4) return null
      return buildBst(values.slice(0, 4))
    },
  },
  {
    title: 'Build the whole tree',
    prompt: 'Insert every value in order, starting from an empty tree. The result must match the tree on the canvas.',
    starter: {
      python: [
        '# values is given: the values to insert, in order.',
        '# The first value becomes the root. Every later one walks down from',
        '# the root with the insert you just wrote. Build the tree in `tree`.',
        'tree = None',
        '',
        'for target in values:',
        '    if tree is None:',
        "        tree = {'value': target, 'left': None, 'right': None}",
        '        continue',
        '    ',
      ].join('\n'),
      java: 'Node tree = null;\nfor (int target : values) {\n    tree = insert(tree, target);\n}',
    },
    globalsFor: (run) => ({ values: bstValues(run) }),
    readBack: 'tree',
    expect: 'json',
    // The engine's own tree, stripped of the render-only node ids: the
    // student's tree has to match the one they watched being built.
    expectedFor: (run) => plainTree(objectState(last(run)).root),
  },
]

/** The same insertion the rungs teach, for building their fixtures. */
export function buildBst(values: readonly number[]): PlainNode | null {
  let root: PlainNode | null = null
  for (const value of values) {
    const fresh: PlainNode = { value, left: null, right: null }
    if (root === null) {
      root = fresh
      continue
    }
    let node = root
    for (;;) {
      const side = value < node.value ? 'left' : 'right'
      if (node[side] === null) {
        node[side] = fresh
        break
      }
      node = node[side] as PlainNode
    }
  }
  return root
}

export const CODE_LADDERS: Record<string, CodeRung[]> = {
  'bubble-sort': BUBBLE_SORT,
  'binary-search': BINARY_SEARCH,
  bst: BST,
}

export function codeLadderFor(slug: string | undefined): CodeRung[] | null {
  return (slug && CODE_LADDERS[slug]) || null
}

export function hasCodeLadder(slug: string | undefined): boolean {
  return !!slug && slug in CODE_LADDERS
}

/**
 * One code question, however the topic defines it.
 *
 * Three topics have a ladder; the other twenty-seven have a single
 * junction-anchored challenge. The panel should not have to know which, so
 * both arrive here in the same shape - a single challenge is a ladder of
 * one, already on its last rung.
 */
export interface CodeTask {
  prompt: string
  title: string | null
  starter: { python: string; java: string }
  spec: PythonStepSpec
  expected: unknown
  seedsNextRun: boolean
  /** 1-based position in the topic's ladder. */
  rung: number
  rungCount: number
  /** True when solving this one finishes the topic's Code stage. */
  isLast: boolean
}

/** The task for a rung of a topic's ladder, or null when the rung's answer
 *  cannot be derived from this run (too few values to ask it of). */
export function codeTaskForRung(slug: string | undefined, run: AlgorithmSnapshot[], rungIndex: number): CodeTask | null {
  const rungs = codeLadderFor(slug)
  if (!rungs || run.length === 0) return null
  const index = Math.min(Math.max(rungIndex, 0), rungs.length - 1)
  const rung = rungs[index]
  const expected = rung.expectedFor(run)
  if (expected === null || expected === undefined) return null
  return {
    prompt: rung.prompt,
    title: rung.title,
    starter: rung.starter,
    spec: { globals: rung.globalsFor(run), readBack: rung.readBack, expect: rung.expect },
    expected,
    // A ladder rung never re-seeds the run: it is a question about the
    // algorithm, not a step of the run the canvas is showing.
    seedsNextRun: false,
    rung: index + 1,
    rungCount: rungs.length,
    isLast: index === rungs.length - 1,
  }
}

/** A single junction-anchored challenge, in the same shape: a ladder of one
 *  that is already on its last rung, so the panel treats both alike. */
export function codeTaskFromStep(step: {
  challenge: { prompt: string; starter: { python: string; java: string }; seedsNextRun: boolean }
  spec: PythonStepSpec
  expected: unknown
}): CodeTask {
  return {
    prompt: step.challenge.prompt,
    title: null,
    starter: step.challenge.starter,
    spec: step.spec,
    expected: step.expected,
    seedsNextRun: step.challenge.seedsNextRun,
    rung: 1,
    rungCount: 1,
    isLast: true,
  }
}
