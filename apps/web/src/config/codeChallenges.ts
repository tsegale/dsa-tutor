import { CriticalJunctionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import type { PythonStepSpec } from '@/utils/pyodideRunner'

/**
 * What a student writes in Code Mode, per topic.
 *
 * Code Mode existed on Bubble Sort alone, because the runner hardcoded one
 * shape (`arr` and `j` in, `arr` out) and the grading contract was
 * `number[]` end to end. A challenge now declares its own inputs and its
 * own read-back, so a tree, a graph, a counter or a string works the same
 * way as an array.
 *
 * Three rules the content follows, all from the brief:
 *
 * The challenge is the CORE LOGIC, never boilerplate. Nobody learns
 * anything writing a for-loop header; the thing worth writing is the
 * comparison, the pointer move, the recurrence, the relaxation test. So
 * the starter code hands over the scaffolding and leaves the decision.
 *
 * It is ONE STEP of the live run, not the whole algorithm. The student is
 * standing at a specific junction with specific values on the canvas, and
 * what they write is graded against what the engine says happens there.
 *
 * The expected answer is COMPUTED FROM THE RUN, never authored. Every
 * `expectedFor` below reads it out of a snapshot the engine produced - the
 * same snapshots driving the canvas the student is looking at. That is why
 * there is no answer key in this file that could drift out of step with
 * the visualisation, and it is the property engine/codeMode.test.ts holds.
 */

/** The live run, and where in it the student is standing. */
export interface ChallengeContext {
  /** Every snapshot of the current run. */
  run: AlgorithmSnapshot[]
  /** The index of the junction being asked. */
  index: number
  /** Shorthand for `run[index]`. */
  snapshot: AlgorithmSnapshot
  /** Shorthand for `run[index + 1] ?? null`. */
  next: AlgorithmSnapshot | null
  /** Shorthand for `run[index - 1] ?? null`. Several structures show the
   * operation as already done at the junction (a push, an insert), so the
   * "before" the student starts from is the step before it. */
  prev: AlgorithmSnapshot | null
}

export interface CodeChallenge {
  /** What the student is asked to write. One sentence, imperative. */
  prompt: string
  /**
   * The junctions this challenge grades. Only these become a code
   * question; every other junction in the run stays a tile prediction.
   *
   * This is what decides which steps Code Mode touches, and it lives with
   * the challenge rather than in the engine. Bubble Sort's engine used to
   * take a `codeEditorMode` flag and set the CODE_EDITOR prediction type
   * itself, which is the whole reason Code Mode existed on one topic: no
   * other engine had the flag. Nothing reads a flag now (see
   * engine/codeMode.ts).
   */
  junctionTypes: CriticalJunctionType[]
  /** Scaffolding, with the decision left out. Python runs; Java is read. */
  starter: { python: string; java: string }
  /**
   * The globals handed to the sandbox, by name. Keep these few, and name
   * them as the topic's own pseudocode names them.
   */
  globalsFor: (context: ChallengeContext) => Record<string, unknown>
  /** The global read back out, and the shape it must keep. */
  readBack: string
  expect: PythonStepSpec['expect']
  /**
   * True when the read-back value IS the data structure on the canvas, so
   * the canvas can be re-seeded from what the student's code produced: it
   * shows their own array carrying on, and shows a buggy one as the
   * mistake path.
   *
   * False for a challenge answering a question ABOUT the structure - an
   * address, a count, a hash bucket, True or False. The canvas handler
   * used to assume the former unconditionally and assign the result
   * straight to dataStructureState, which for a scalar answer would draw
   * a one-cell array under a prompt about memory addresses.
   */
  seedsNextRun: boolean
  /**
   * The correct answer, read out of the run. Null when this junction
   * cannot be graded, which makes it fall back to a tile prediction rather
   * than grade a student against nothing.
   */
  expectedFor: (context: ChallengeContext) => unknown
}

// ----------------------------------------------------------------- state
// Engines store either a bare array or an object with an `array` field
// plus whatever that topic tracks, so these two helpers are how a
// challenge reads either without caring which.

export function arrayOf(snapshot: AlgorithmSnapshot | null | undefined): number[] {
  const state = snapshot?.dataStructureState
  if (Array.isArray(state)) return state as number[]
  if (state && typeof state === 'object' && Array.isArray((state as { array?: unknown }).array)) {
    return (state as { array: number[] }).array
  }
  return []
}

export function field<T>(snapshot: AlgorithmSnapshot | null | undefined, name: string, fallback: T): T {
  const state = snapshot?.dataStructureState
  if (!state || typeof state !== 'object' || Array.isArray(state)) return fallback
  const value = (state as Record<string, unknown>)[name]
  return (value === undefined || value === null ? fallback : value) as T
}

/**
 * The next snapshot that carries the decision this junction asks about.
 *
 * A junction is often followed by narration ("Comparing 5 and 3...")
 * before the step that actually moves the state, so grading against
 * `run[index + 1]` alone would compare the student's answer with a
 * snapshot where nothing has happened yet - and code that does nothing at
 * all would be marked correct.
 */
export function nextWhere(
  context: ChallengeContext,
  changed: (snapshot: AlgorithmSnapshot) => boolean,
): AlgorithmSnapshot | null {
  for (let i = context.index + 1; i < context.run.length; i += 1) {
    const snapshot = context.run[i]
    if (changed(snapshot)) return snapshot
    // Stop at the next junction of any kind: past it, the state belongs to
    // a different decision than the one being asked here.
    if (snapshot.isPredictionRequired) return null
  }
  return null
}

/** The values held by a list of `{ value }` nodes: linked lists, stacks
 * and queues all store their contents that way. */
export function valuesOf(items: unknown): number[] {
  return Array.isArray(items)
    ? items.map((item) => (item && typeof item === 'object' ? (item as { value: number }).value : (item as number)))
    : []
}

/** A challenge that answers a question ABOUT the structure rather than
 * producing the structure: an index, a count, a flag, a name. */
function challenge(options: {
  prompt: string
  junctionTypes: CriticalJunctionType[]
  python: string
  java: string
  globals: (context: ChallengeContext) => Record<string, unknown>
  readBack: string
  expect: PythonStepSpec['expect']
  expected: (context: ChallengeContext) => unknown
  seedsNextRun?: boolean
}): CodeChallenge {
  return {
    prompt: options.prompt,
    junctionTypes: options.junctionTypes,
    starter: { python: options.python, java: options.java },
    globalsFor: options.globals,
    readBack: options.readBack,
    expect: options.expect,
    seedsNextRun: options.seedsNextRun ?? false,
    expectedFor: options.expected,
  }
}

// ---------------------------------------------------------------- shared
//
// Most array topics ask the same question in different words: given the
// array and the positions in play, produce the array as it should be after
// this step. Sharing the shape keeps these challenges honest with each
// other and with the engine.

interface ArrayStepOptions {
  prompt: string
  junctionTypes: CriticalJunctionType[]
  python: string
  java: string
  /** Extra globals beyond `arr`, read from the junction's own state. */
  extras?: (context: ChallengeContext) => Record<string, unknown>
  /** Where `arr` comes from. Defaults to the junction's own array; a
   * junction that already holds the finished result passes `first`, so the
   * student starts from the array before the operation. */
  source?: 'junction' | 'first'
  /** Where the answer comes from. Defaults to the next snapshot whose
   * array differs from the junction's; a junction that is the last step of
   * its run passes `junction`. */
  answer?: 'next' | 'junction'
}

function arrayStepChallenge(options: ArrayStepOptions): CodeChallenge {
  const { source = 'junction', answer = 'next' } = options
  return {
    prompt: options.prompt,
    junctionTypes: options.junctionTypes,
    starter: { python: options.python, java: options.java },
    globalsFor: (context) => ({
      arr: [...arrayOf(source === 'first' ? context.run[0] : context.snapshot)],
      ...(options.extras?.(context) ?? {}),
    }),
    readBack: 'arr',
    expect: 'number[]',
    seedsNextRun: true,
    expectedFor: (context) => {
      if (answer === 'junction') return [...arrayOf(context.snapshot)]
      const here = arrayOf(context.snapshot)
      const settled = nextWhere(context, (s) => {
        const there = arrayOf(s)
        return there.length !== here.length || there.some((value, i) => value !== here[i])
      })
      return settled ? [...arrayOf(settled)] : null
    },
  }
}


// ------------------------------------------------------- structure readers

/** The value of the node after the one the cursor is on, or null when
 * there is none - which is the whole of a singly linked list's idea of
 * "the end". */
function nextNodeValue(snapshot: AlgorithmSnapshot): number | null {
  const nodes = field<{ id: string; value: number; next: string | null }[]>(snapshot, 'nodes', [])
  const currentId = field<string | null>(snapshot, 'currentId', null)
  const current = nodes.find((node) => node.id === currentId)
  if (!current) return null
  return nodes.find((node) => node.id === current.next)?.value ?? null
}

/** The slot linear probing has just found taken. */
function lastProbe(snapshot: AlgorithmSnapshot): number | null {
  const sequence = field<number[]>(snapshot, 'activeProbeSequence', [])
  return sequence.length > 0 ? sequence[sequence.length - 1] : field<number | null>(snapshot, 'hashResult', null)
}

interface Frame {
  id: string
  argument: number
  returnValue: number | null
  status: string
  depth: number
}

function framesOf(snapshot: AlgorithmSnapshot | null | undefined): Frame[] {
  return field<Frame[]>(snapshot, 'frames', [])
}

function frameById(snapshot: AlgorithmSnapshot, id: string): Frame | undefined {
  return framesOf(snapshot).find((frame) => frame.id === id)
}

function activeFrame(snapshot: AlgorithmSnapshot): Frame | undefined {
  const frames = framesOf(snapshot)
  return frames.find((frame) => frame.status === 'active') ?? frames[frames.length - 1]
}

/**
 * The call about to return, the value the call below it handed up, and the
 * value the engine gives it. All three read out of the frame stack, so the
 * answer is the run's, not this file's.
 */
function returningFrame(context: ChallengeContext): { argument: number; below: number; returned: number } | null {
  const frames = framesOf(context.snapshot)
  const deepestReturned = [...frames].reverse().find((frame) => frame.status === 'returned')
  if (!deepestReturned) return null
  const caller = frames.find((frame) => frame.depth === deepestReturned.depth - 1)
  if (!caller) return null
  const settled = nextWhere(context, (s) => frameById(s, caller.id)?.status === 'returned')
  const returned = settled ? frameById(settled, caller.id)?.returnValue : null
  if (returned === null || returned === undefined) return null
  return { argument: caller.argument, below: deepestReturned.returnValue ?? 1, returned }
}


// ------------------------------------------------------------ tree readers

interface TreeNode {
  value: number
  left: TreeNode | null
  right: TreeNode | null
}

/** A node and its subtree as plain data the sandbox can walk: dicts and
 * None, with the engine's ids and colours left out. */
function treeOf(snapshot: AlgorithmSnapshot | null | undefined, key = 'root'): unknown {
  const plain = (node: unknown): unknown => {
    if (!node || typeof node !== 'object') return null
    const typed = node as TreeNode
    return { value: typed.value, left: plain(typed.left), right: plain(typed.right) }
  }
  return plain(field<unknown>(snapshot, key, null))
}

/** The node the cursor is on, and the value being looked for. */
function currentNodeValue(snapshot: AlgorithmSnapshot): number | null {
  const node = field<{ value?: number } | null>(snapshot, 'currentNode', null)
  return node && typeof node.value === 'number' ? node.value : null
}

/** The order the run ends up visiting the tree in: the last snapshot's
 * visitedOrder, which is the traversal the canvas just drew. */
function completeVisitOrder(context: ChallengeContext): number[] | null {
  for (let i = context.run.length - 1; i >= 0; i -= 1) {
    const order = field<number[]>(context.run[i], 'visitedOrder', [])
    if (order.length > 0) return [...order]
  }
  return null
}

/**
 * The BST direction challenge, shared by plain BST insert, search and
 * delete and by the red-black versions: all five ask the same question at
 * the same junction type, and writing it five times is how five copies
 * drift apart.
 */
function bstDirection(slugs: string[]): Record<string, CodeChallenge> {
  const made: Record<string, CodeChallenge> = {}
  for (const slug of slugs) {
    made[slug] = challenge({
      prompt: 'Decide which way to descend. One comparison per node is what makes a search tree faster than scanning.',
      junctionTypes: [CriticalJunctionType.BST_DIRECTION],
      python: '# node_value is the value at this node; target is what we are looking for.\ngo_left = ',
      java: 'boolean goLeft = (target < node.value);',
      globals: (context) => ({
        node_value: currentNodeValue(context.snapshot) ?? 0,
        target: field<number>(context.snapshot, 'targetValue', 0),
      }),
      readBack: 'go_left',
      expect: 'boolean',
      expected: (context) => {
        const here = currentNodeValue(context.snapshot)
        const target = field<number>(context.snapshot, 'targetValue', 0)
        if (here === null || target === here) return null
        return target < here
      },
    })
  }
  return made
}

/** The three recursive traversals, which differ only in the order of the
 * three lines the student writes. */
function treeTraversal(topics: Record<string, { order: string; call: string }>): Record<string, CodeChallenge> {
  const made: Record<string, CodeChallenge> = {}
  for (const [slug, { order, call }] of Object.entries(topics)) {
    made[slug] = challenge({
      prompt: `Write the traversal. The three lines are the same every time; only their order differs, and here it is ${order}.`,
      junctionTypes: [CriticalJunctionType.VISIT_NODE],
      python: `# tree is a dict with "value", "left" and "right"; left or right may be None.\norder = []\n\ndef ${call}(node):\n    if node is None:\n        return\n    \n\n${call}(tree)`,
      java: `void ${call}(Node n) {\n    if (n == null) return;\n    // the three lines, in this traversal's order\n}`,
      globals: (context) => ({ tree: treeOf(context.run[0]) }),
      readBack: 'order',
      expect: 'number[]',
      expected: (context) => completeVisitOrder(context),
    })
  }
  return made
}

// ------------------------------------------------------------ heap readers

function heapChildGlobals(context: ChallengeContext): Record<string, unknown> {
  const i = field<number>(context.snapshot, 'currentIdx', 0)
  return {
    arr: [...arrayOf(context.snapshot)],
    i,
    size: field<number>(context.snapshot, 'size', arrayOf(context.snapshot).length),
    left: field<number | null>(context.snapshot, 'leftChildIdx', null) ?? -1,
    right: field<number | null>(context.snapshot, 'rightChildIdx', null) ?? -1,
  }
}

/** The index the engine sifts towards, or i itself when it stops here. */
function heapSwapTarget(context: ChallengeContext): number | null {
  const i = field<number>(context.snapshot, 'currentIdx', 0)
  const settled = nextWhere(context, (s) => field<number>(s, 'currentIdx', i) !== i)
  if (!settled) return i
  const moved = field<number>(settled, 'currentIdx', i)
  // A sift that has finished resets the cursor rather than moving it to a
  // child; that is "stay where you are", which is i.
  return moved < 0 ? i : moved
}

// ------------------------------------------------------------ trie readers

function trieGlobals(snapshot: AlgorithmSnapshot): Record<string, unknown> {
  return {
    children: childCharsAt(snapshot),
    char: field<string | null>(snapshot, 'currentChar', null) ?? '',
  }
}

/** The characters the node under the cursor already has as children. */
function childCharsAt(snapshot: AlgorithmSnapshot): string[] {
  interface TrieNode {
    id: string
    char: string
    children: Record<string, TrieNode>
  }
  const wanted = field<string | null>(snapshot, 'currentNodeId', null)
  const found: string[] = []
  const walk = (node: TrieNode | null | undefined) => {
    if (!node || found.length > 0) return
    const children = Object.values(node.children ?? {})
    if (node.id === wanted) {
      found.push(...children.map((child) => child.char))
      return
    }
    children.forEach(walk)
  }
  walk(field<TrieNode | null>(snapshot, 'root', null))
  return found
}

function trieMatch(slugs: string[]): Record<string, CodeChallenge> {
  const made: Record<string, CodeChallenge> = {}
  for (const slug of slugs) {
    made[slug] = challenge({
      prompt: 'Decide whether this character continues the path. A trie follows one character at a time, so the cost is the length of the word and not the size of the dictionary.',
      junctionTypes: [CriticalJunctionType.TRIE_CHARACTER_MATCH],
      python: '# children is the list of characters this node has.\n# char is the next character of the word.\nexists = ',
      java: 'boolean exists = node.children.containsKey(c);',
      globals: (context) => trieGlobals(context.snapshot),
      readBack: 'exists',
      expect: 'boolean',
      expected: (context) => field<boolean | null>(context.snapshot, 'charExists', null),
    })
  }
  return made
}

// ----------------------------------------------------------- graph readers

function adjacencyOf(snapshot: AlgorithmSnapshot): Record<string, string[]> {
  const raw = field<Record<string, unknown>>(snapshot, 'adjacency', {})
  const plain: Record<string, string[]> = {}
  for (const [node, edges] of Object.entries(raw)) {
    plain[node] = Array.isArray(edges)
      ? edges.map((edge) => (typeof edge === 'string' ? edge : (edge as { to: string }).to))
      : []
  }
  return plain
}

/** The node the run takes off the frontier next. */
function nextCurrentNode(context: ChallengeContext): string | null {
  const settled = nextWhere(context, (s) => {
    const node = field<string | null>(s, 'currentNode', null)
    return node !== null && node !== field<string | null>(context.snapshot, 'currentNode', null)
  })
  return settled ? field<string | null>(settled, 'currentNode', null) : null
}

function floydGlobals(snapshot: AlgorithmSnapshot): { via_k: number | null; direct: number | null } {
  const dist = field<(number | null)[][]>(snapshot, 'dist', [])
  const k = field<number>(snapshot, 'k', 0)
  const i = field<number>(snapshot, 'i', 0)
  const j = field<number>(snapshot, 'j', 0)
  const ik = dist[i]?.[k] ?? null
  const kj = dist[k]?.[j] ?? null
  return { via_k: ik === null || kj === null ? null : ik + kj, direct: dist[i]?.[j] ?? null }
}

function edgeTargetColour(snapshot: AlgorithmSnapshot): string {
  const colours = field<Record<string, string>>(snapshot, 'colors', {})
  const edge = field<string[]>(snapshot, 'cycleEdge', [])
  const target = edge[1] ?? ''
  return (colours[target] ?? 'white').toLowerCase()
}

/**
 * The grid pathfinders' frontier choice: the same question, the same
 * frontier, and four different one-line answers. BFS takes the front, DFS
 * the back, Dijkstra the lowest g, A* the lowest g + h. Writing the four
 * side by side is the clearest statement of how little separates them,
 * which is why all four get the challenge rather than only the weighted
 * pair.
 */
const GRID_PICK: Record<string, { prompt: string; python: string; java: string }> = {
  'grid-bfs': {
    prompt: 'BFS uses a queue: take the cell that has been waiting longest. The frontier is in arrival order.',
    python: 'best = ',
    java: 'Cell best = queue.poll();',
  },
  'grid-dfs': {
    prompt: 'DFS uses a stack: take the cell discovered most recently. Same frontier, opposite end.',
    python: 'best = ',
    java: 'Cell best = stack.pop();',
  },
  'grid-dijkstra': {
    prompt: 'Dijkstra takes the cell with the lowest g, the distance already walked. It has no estimate of what is left.',
    python: 'best = min(frontier, key=lambda cell: ',
    java: 'Cell best = frontier.stream().min(comparing(c -> c.g)).get();',
  },
  'grid-astar': {
    prompt: 'A* takes the lowest f = g + h. That one added term is the whole difference from Dijkstra.',
    python: 'best = min(frontier, key=lambda cell: ',
    java: 'Cell best = frontier.stream().min(comparing(c -> c.g + c.h)).get();',
  },
}

function gridFrontier(slugs: string[]): Record<string, CodeChallenge> {
  const made: Record<string, CodeChallenge> = {}
  for (const slug of slugs) {
    const pick = GRID_PICK[slug]
    made[slug] = challenge({
      prompt: pick.prompt,
      junctionTypes: [CriticalJunctionType.GRID_NEXT_CELL],
      python: `# frontier is a list of dicts with "row", "col", "g" and "h",\n# in the order the cells were discovered.\n${pick.python}`,
      java: pick.java,
      globals: (context) => ({ frontier: frontierCells(context.snapshot) }),
      readBack: 'best',
      expect: 'json',
      expected: (context) => {
        const taken = nextWhere(context, (s) => field<number[] | null>(s, 'currentCell', null) !== null)
        const cell = taken ? field<number[] | null>(taken, 'currentCell', null) : null
        if (!cell) return null
        const match = frontierCells(context.snapshot).find((c) => c.row === cell[0] && c.col === cell[1])
        return match ?? null
      },
    })
  }
  return made
}

interface GridCell {
  row: number
  col: number
  g: number
  h: number
}

function frontierCells(snapshot: AlgorithmSnapshot): GridCell[] {
  const grid = field<{ gScore?: number; hScore?: number }[][]>(snapshot, 'grid', [])
  return field<number[][]>(snapshot, 'frontierCells', []).map(([row, col]) => ({
    row,
    col,
    g: grid[row]?.[col]?.gScore ?? 0,
    h: grid[row]?.[col]?.hScore ?? 0,
  }))
}


// ------------------------------------------------------- table readers
// The four table topics (prefix sums, the monotonic stack's answer array
// and both dynamic programming topics) share DPTableState, so reading a
// cell is one helper rather than four casts.

function tableCell(snapshot: AlgorithmSnapshot | null | undefined, row: number, col: number): number | null {
  const table = field<(number | null)[][]>(snapshot, 'table', [])
  const value = table[row]?.[col]
  return value === undefined ? null : value
}

/** Divide and conquer's three candidates, from the step's own narration -
 * the same three numbers the canvas has just shown. */
function combineCandidates(snapshot: AlgorithmSnapshot): { left: number; right: number; cross: number } {
  const found = [...snapshot.description.matchAll(/(?:left|right|crossing) (-?\d+)/g)].map((match) => Number(match[1]))
  return { left: found[0] ?? 0, right: found[1] ?? 0, cross: found[2] ?? 0 }
}

function greedyGlobals(snapshot: AlgorithmSnapshot): Record<string, unknown> {
  // The working line reads "X.start 5 >= last finish 4?", which is the
  // comparison the junction is asking about.
  const working = field<string | null>(snapshot, 'working', null) ?? ''
  const numbers = /start (-?\d+) >= last finish (-?\d+|-inf)/.exec(working)
  return {
    start: Number(numbers?.[1] ?? 0),
    // An empty room is "free from the beginning", which Python spells as a
    // float; the student's comparison works either way.
    last_finish: numbers?.[2] === '-inf' ? Number.NEGATIVE_INFINITY : Number(numbers?.[2] ?? 0),
  }
}

/** Edit distance's three neighbours, named for the operation each is. */
function editNeighbours(snapshot: AlgorithmSnapshot): Record<string, unknown> {
  const current = (snapshot.dataStructureState as { current: [number, number] | null }).current
  const [row, col] = current ?? [0, 0]
  return {
    up: tableCell(snapshot, row - 1, col) ?? 0,
    left: tableCell(snapshot, row, col - 1) ?? 0,
    diagonal: tableCell(snapshot, row - 1, col - 1) ?? 0,
  }
}

export const CODE_CHALLENGES: Record<string, CodeChallenge> = {
  // -------------------------------------------------------------- Module 1
  'array-access': {
    // The junction asks what value is stored at the index, so this asks
    // for the same thing in code. The lesson is in how you get it: one
    // index expression and no loop, which is what makes the O(1) on the
    // complexity tab true.
    prompt: 'Read the element at index i. One index expression, no loop: that is what makes this O(1).',
    junctionTypes: [CriticalJunctionType.INDEX_ACCESS],
    starter: {
      python: '# arr and i are given.\nvalue = ',
      java: 'int value = arr[i];',
    },
    globalsFor: (context) => ({
      arr: [...arrayOf(context.snapshot)],
      i: field<number>(context.snapshot, 'targetIndex', 0),
    }),
    readBack: 'value',
    expect: 'number',
    seedsNextRun: false,
    expectedFor: (context) => arrayOf(context.snapshot)[field<number>(context.snapshot, 'targetIndex', 0)] ?? null,
  },

  'array-insert': arrayStepChallenge({
    prompt: 'Shift every element from the end down to pos one place right, then write value at pos.',
    junctionTypes: [CriticalJunctionType.INSERT_POSITION],
    // This junction is the last step of the run and already holds the
    // finished array, so `arr` comes from the start of the run and the
    // answer from the junction itself.
    source: 'first',
    answer: 'junction',
    python: '# arr, pos and value are given.\narr.append(0)\nfor k in range(len(arr) - 1, pos, -1):\n    arr[k] = ',
    java: 'for (int k = arr.length - 1; k > pos; k--) {\n    arr[k] = arr[k - 1];\n}\narr[pos] = value;',
    extras: (context) => ({
      pos: field<number>(context.snapshot, 'targetIndex', 0),
      value: field<number>(context.snapshot, 'operationValue', 0),
    }),
  }),

  'array-delete': arrayStepChallenge({
    prompt: 'Close the gap at pos by shifting every later element one place left, then drop the spare slot.',
    junctionTypes: [CriticalJunctionType.DELETE_SHIFT],
    source: 'first',
    answer: 'junction',
    python: '# arr and pos are given.\nfor k in range(pos, len(arr) - 1):\n    arr[k] = \narr.pop()',
    java: 'for (int k = pos; k < arr.length - 1; k++) {\n    arr[k] = arr[k + 1];\n}',
    extras: (context) => ({ pos: field<number>(context.snapshot, 'targetIndex', 0) }),
  }),

  // -------------------------------------------------------------- Module 3
  'bubble-sort': arrayStepChallenge({
    prompt: 'Swap arr[j] and arr[j+1] if they are out of order, and leave them alone if they are not.',
    junctionTypes: [CriticalJunctionType.SWAP_DECISION],
    python: '# arr and j are given.\n# Swap only when this pair is out of order.\nif ',
    java: 'if (arr[j] > arr[j + 1]) {\n    int tmp = arr[j];\n    arr[j] = arr[j + 1];\n    arr[j + 1] = tmp;\n}',
    extras: (context) => ({ j: context.snapshot.comparedIndices[0] ?? context.snapshot.activeIndices[0] ?? 0 }),
  }),

  'insertion-sort': arrayStepChallenge({
    prompt: 'Shift the sorted prefix right while it is still bigger than the key, then drop the key in.',
    junctionTypes: [CriticalJunctionType.SWAP_DECISION],
    python: '# arr, key and k are given.\nwhile k >= 0 and ',
    java: 'while (k >= 0 && arr[k] > key) {\n    arr[k + 1] = arr[k];\n    k--;\n}\narr[k + 1] = key;',
    extras: (context) => ({
      key: field<number>(context.snapshot, 'currentKey', 0),
      k: field<number>(context.snapshot, 'compareIndex', 0),
    }),
  }),

  'selection-sort': {
    // The array does not move at a NEW_MINIMUM junction: what changes is
    // which index the pass believes holds the smallest value. Grading the
    // array here would mark code that does nothing as correct, because
    // doing nothing is what the array does.
    prompt: 'Keep min_index pointing at the smallest value seen so far: update it only when arr[scan] is smaller.',
    junctionTypes: [CriticalJunctionType.NEW_MINIMUM],
    starter: {
      python: '# arr, min_index and scan are given.\nif ',
      java: 'if (arr[scan] < arr[minIndex]) {\n    minIndex = scan;\n}',
    },
    globalsFor: (context) => ({
      arr: [...arrayOf(context.snapshot)],
      min_index: field<number>(context.snapshot, 'currentMin', 0),
      scan: field<number>(context.snapshot, 'scanIndex', 0),
    }),
    readBack: 'min_index',
    expect: 'number',
    seedsNextRun: false,
    expectedFor: (context) => {
      const here = field<number>(context.snapshot, 'currentMin', -1)
      const resolved = nextWhere(context, (s) => field<number>(s, 'currentMin', here) !== here)
      // No later snapshot moved it, so the answer is "leave it alone".
      return resolved ? field<number>(resolved, 'currentMin', here) : here
    },
  },

  // -------------------------------------------- Module 1, linear structures
  'singly-linked-list': challenge({
    prompt: 'A singly linked list has no length and no back pointer. Decide whether this node is the last one.',
    junctionTypes: [CriticalJunctionType.NULL_CHECK],
    python: '# next_value is the value of the node after this one, or None.\nis_last = ',
    java: 'boolean isLast = (current.next == null);',
    globals: (context) => ({ next_value: nextNodeValue(context.snapshot) }),
    readBack: 'is_last',
    expect: 'boolean',
    expected: (context) => nextNodeValue(context.snapshot) === null,
  }),

  'doubly-linked-list': challenge({
    prompt: 'Append value to the list. With a maintained tail pointer this is O(1): no traversal.',
    junctionTypes: [CriticalJunctionType.INSERT_BETWEEN],
    python: '# values and value are given.\n# Put value on the end.\n',
    java: 'newNode.prev = tail;\ntail.next = newNode;\ntail = newNode;',
    globals: (context) => ({
      values: valuesOf(field<unknown[]>(context.snapshot, 'nodes', [])),
      value: field<number>(context.snapshot, 'operationValue', 0),
    }),
    readBack: 'values',
    expect: 'number[]',
    expected: (context) => {
      const settled = nextWhere(context, (s) => field<unknown[]>(s, 'nodes', []).length !== field<unknown[]>(context.snapshot, 'nodes', []).length)
      return settled ? valuesOf(field<unknown[]>(settled, 'nodes', [])) : null
    },
  }),

  'circular-linked-list': challenge({
    prompt: 'The new node becomes the tail. Say what its next pointer has to point at for the list to stay circular.',
    junctionTypes: [CriticalJunctionType.WRAP_CHECK],
    python: '# values holds the list in order; the new tail is at the end.\nlast_next = ',
    java: 'newNode.next = head;',
    globals: (context) => ({
      values: valuesOf(field<unknown[]>(context.snapshot, 'nodes', [])),
      value: field<number>(context.snapshot, 'operationValue', 0),
    }),
    readBack: 'last_next',
    expect: 'number',
    // The head's value, read out of the run: in a circular list the last
    // node points back to it, which is exactly what has no equivalent in
    // the singly linked version.
    expected: (context) => valuesOf(field<unknown[]>(context.snapshot, 'nodes', []))[0] ?? null,
  }),

  stack: challenge({
    prompt: 'Push value onto the stack, and move top to the slot it now occupies.',
    junctionTypes: [CriticalJunctionType.STACK_PUSH_RESULT],
    python: '# items and value are given; top is the index of the current top.\nitems.append(value)\ntop = ',
    java: 'items[++top] = value;',
    globals: (context) => ({
      items: valuesOf(field<unknown[]>(context.prev, 'items', [])),
      top: field<number>(context.prev, 'topIndex', -1),
      value: field<number>(context.snapshot, 'lastOperationValue', 0),
    }),
    readBack: 'top',
    expect: 'number',
    expected: (context) => field<number>(context.snapshot, 'topIndex', -1),
  }),

  queue: challenge({
    prompt: 'Enqueue at the rear. Move rear to the slot the new element occupies.',
    junctionTypes: [CriticalJunctionType.QUEUE_REAR],
    python: '# rear is the index of the current rear; capacity is the array length.\nrear = ',
    java: 'items[++rear] = value;',
    globals: (context) => ({
      rear: field<number>(context.prev, 'rearIndex', -1),
      capacity: field<number>(context.snapshot, 'capacity', 0),
    }),
    readBack: 'rear',
    expect: 'number',
    expected: (context) => field<number>(context.snapshot, 'rearIndex', -1),
  }),

  'circular-queue': challenge({
    prompt: 'Dequeue, and advance front. A circular queue wraps instead of running off the end, so plain front + 1 is wrong.',
    junctionTypes: [CriticalJunctionType.QUEUE_FRONT],
    python: '# front is the current front index; capacity is the array length.\nfront = ',
    java: 'front = (front + 1) % capacity;',
    globals: (context) => ({
      front: field<number>(context.prev, 'frontIndex', 0),
      capacity: field<number>(context.snapshot, 'capacity', 1),
    }),
    readBack: 'front',
    expect: 'number',
    expected: (context) => field<number>(context.snapshot, 'frontIndex', 0),
  }),

  deque: challenge({
    prompt: 'pushBack adds at the rear. Produce the deque as it looks afterwards.',
    junctionTypes: [CriticalJunctionType.DEQUE_END],
    python: '# items and value are given.\n',
    java: 'items.addLast(value);',
    globals: (context) => ({
      items: valuesOf(field<unknown[]>(context.snapshot, 'items', [])),
      value: field<number>(nextWhere(context, (s) => field<number>(s, 'size', -1) !== field<number>(context.snapshot, 'size', -1)), 'lastOperationValue', 0),
    }),
    readBack: 'items',
    expect: 'number[]',
    expected: (context) => {
      const here = field<number>(context.snapshot, 'size', -1)
      const settled = nextWhere(context, (s) => field<number>(s, 'size', here) !== here)
      return settled ? valuesOf(field<unknown[]>(settled, 'items', [])) : null
    },
  }),

  'hash-table-chaining': challenge({
    prompt: 'Map key to a bucket index. It has to land inside the table however large the key is.',
    junctionTypes: [CriticalJunctionType.HASH_BUCKET],
    python: '# key and capacity are given.\nbucket = ',
    java: 'int bucket = key % capacity;',
    globals: (context) => ({
      key: field<number>(context.snapshot, 'activeKey', 0),
      capacity: field<number>(context.snapshot, 'capacity', 1),
    }),
    readBack: 'bucket',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'hashResult', null),
  }),

  'hash-table-probing': challenge({
    prompt: 'That slot is taken. Say where linear probing looks next, remembering the table wraps.',
    junctionTypes: [CriticalJunctionType.PROBE_NEXT],
    python: '# slot is the slot just found taken; capacity is the table size.\nnext_slot = ',
    java: 'nextSlot = (slot + 1) % capacity;',
    globals: (context) => ({
      slot: lastProbe(context.snapshot),
      capacity: field<number>(context.snapshot, 'capacity', 1),
    }),
    readBack: 'next_slot',
    expect: 'number',
    expected: (context) => {
      const taken = lastProbe(context.snapshot)
      const settled = nextWhere(context, (s) => field<number | null>(s, 'activeBucket', null) !== null)
      const landed = settled ? field<number | null>(settled, 'activeBucket', null) : null
      // Where it actually went, from the run. Only graded when that is the
      // very next probe; a run of taken slots is a different question.
      if (landed === null || taken === null) return null
      const capacity = field<number>(context.snapshot, 'capacity', 1)
      return landed === (taken + 1) % capacity ? landed : null
    },
  }),

  'recursion-factorial': challenge({
    prompt: 'The call below has returned. Combine its result with n to give this call its return value.',
    junctionTypes: [CriticalJunctionType.RETURN_VALUE],
    python: '# n and below are given; below is what factorial(n - 1) returned.\nresult = ',
    java: 'return n * factorial(n - 1);',
    globals: (context) => {
      const frame = returningFrame(context)
      return { n: frame?.argument ?? 0, below: frame?.below ?? 1 }
    },
    readBack: 'result',
    expect: 'number',
    expected: (context) => returningFrame(context)?.returned ?? null,
  }),

  'recursion-fibonacci': challenge({
    prompt: 'Decide whether this call is a base case, the one thing that stops the recursion going forever.',
    junctionTypes: [CriticalJunctionType.BASE_CASE],
    python: '# n is the argument of the call being made.\nis_base = ',
    java: 'if (n <= 1) return n;',
    globals: (context) => ({ n: activeFrame(context.snapshot)?.argument ?? 0 }),
    readBack: 'is_base',
    expect: 'boolean',
    // From the run: the engine stops here and hands back a value rather
    // than making two more calls.
    expected: (context) => {
      const frame = activeFrame(context.snapshot)
      if (!frame) return null
      const settled = nextWhere(context, (s) => frameById(s, frame.id)?.status === 'returned')
      return settled !== null
    },
  }),

  // --------------------------------------------------- Module 2, searching
  'linear-search': challenge({
    prompt: 'Compare the element under the cursor with the target.',
    junctionTypes: [CriticalJunctionType.TARGET_CHECK],
    python: '# arr, i and target are given.\nfound = ',
    java: 'boolean found = (arr[i] == target);',
    globals: (context) => ({
      arr: [...arrayOf(context.snapshot)],
      i: field<number>(context.snapshot, 'currentIndex', 0),
      target: field<number>(context.snapshot, 'target', 0),
    }),
    readBack: 'found',
    expect: 'boolean',
    expected: (context) =>
      arrayOf(context.snapshot)[field<number>(context.snapshot, 'currentIndex', 0)] ===
      field<number>(context.snapshot, 'target', 0),
  }),

  'binary-search': challenge({
    prompt: 'Compute the midpoint of [low, high]. Write it so it cannot overflow on a large range.',
    junctionTypes: [CriticalJunctionType.MIDPOINT_DECISION],
    python: '# low and high are given.\nmid = ',
    java: 'int mid = low + (high - low) / 2;',
    globals: (context) => ({
      low: field<number>(context.snapshot, 'low', 0),
      high: field<number>(context.snapshot, 'high', 0),
    }),
    readBack: 'mid',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'mid', null),
  }),

  'jump-search': challenge({
    prompt: 'Choose the block size. It is the value that balances the jumps against the walk inside a block.',
    junctionTypes: [CriticalJunctionType.JUMP_SIZE],
    python: '# n is the length of the array.\nimport math\njump = ',
    java: 'int jump = (int) Math.sqrt(n);',
    globals: (context) => ({ n: arrayOf(context.snapshot).length }),
    readBack: 'jump',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'jumpSize', null),
  }),

  'interpolation-search': challenge({
    prompt: 'Estimate where the target should be, using how far through the value range it sits.',
    junctionTypes: [CriticalJunctionType.PROBE_POSITION],
    python: '# arr, low, high and target are given.\nprobe = low + ',
    java: 'int probe = low + ((target - arr[low]) * (high - low)) / (arr[high] - arr[low]);',
    globals: (context) => ({
      arr: [...arrayOf(context.snapshot)],
      low: field<number>(context.snapshot, 'low', 0),
      high: field<number>(context.snapshot, 'high', 0),
      target: field<number>(context.snapshot, 'target', 0),
    }),
    readBack: 'probe',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'probedIndex', null),
  }),

  'exponential-search': challenge({
    prompt: 'The target is still beyond the bound. Grow the bound the way this search grows it.',
    junctionTypes: [CriticalJunctionType.RANGE_DOUBLE],
    python: '# bound is the current bound.\nbound = ',
    java: 'bound = bound * 2;',
    globals: (context) => ({ bound: field<number>(context.snapshot, 'bound', 1) }),
    readBack: 'bound',
    expect: 'number',
    expected: (context) => {
      const here = field<number>(context.snapshot, 'bound', 1)
      const settled = nextWhere(context, (s) => field<number>(s, 'bound', here) !== here)
      return settled ? field<number>(settled, 'bound', here) : null
    },
  }),

  // ----------------------------------------------------- Module 3, sorting
  'shell-sort': arrayStepChallenge({
    prompt: 'Insertion sort, but comparing across the gap: shift arr[k] right by gap while it is bigger than the key.',
    junctionTypes: [CriticalJunctionType.GAP_COMPARISON],
    python: '# arr, gap, key and k are given.\nif k >= 0 and ',
    java: 'if (k >= 0 && arr[k] > key) {\n    arr[k + gap] = arr[k];\n}',
    extras: (context) => ({
      gap: field<number>(context.snapshot, 'gap', 1),
      key: arrayOf(context.snapshot)[field<number>(context.snapshot, 'keyIndex', 0)] ?? 0,
      k: field<number>(context.snapshot, 'compareIndex', 0),
    }),
  }),

  'merge-sort': challenge({
    prompt: 'Two sorted runs, one element each under a cursor. Decide which one goes into the merged output next.',
    junctionTypes: [CriticalJunctionType.MERGE_DECISION],
    python: '# left and right are the two values under the cursors.\n# A stable merge takes the left one on a tie.\ntake_left = ',
    java: 'if (left <= right) { out[k++] = left; i++; }\nelse { out[k++] = right; j++; }',
    globals: (context) => ({
      left: arrayOf(context.snapshot)[context.snapshot.activeIndices[0] ?? 0] ?? 0,
      right: arrayOf(context.snapshot)[context.snapshot.comparedIndices[0] ?? 0] ?? 0,
    }),
    readBack: 'take_left',
    expect: 'boolean',
    // Stability is the point: on a tie the left run wins, which is what
    // makes Merge Sort stable and Quick Sort not.
    expected: (context) => {
      const left = arrayOf(context.snapshot)[context.snapshot.activeIndices[0] ?? 0]
      const right = arrayOf(context.snapshot)[context.snapshot.comparedIndices[0] ?? 0]
      if (left === undefined || right === undefined) return null
      return left <= right
    },
  }),

  'quick-sort': challenge({
    prompt: 'This implementation always takes the last element of the range as its pivot. Give its index.',
    junctionTypes: [CriticalJunctionType.PIVOT_SELECTION],
    python: '# lo and hi bound the range being partitioned.\npivot_index = ',
    java: 'int pivotIndex = hi;',
    globals: (context) => {
      const range = field<number[]>(context.snapshot, 'partitionRange', [])
      return { lo: range[0] ?? 0, hi: range[1] ?? arrayOf(context.snapshot).length - 1 }
    },
    readBack: 'pivot_index',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'pivotIndex', null),
  }),

  'heap-sort': arrayStepChallenge({
    prompt: 'Sift the parent down if the child is bigger, so the subtree is a heap again.',
    junctionTypes: [CriticalJunctionType.HEAP_COMPARE],
    python: '# arr, parent and child are given.\nif ',
    java: 'if (arr[child] > arr[parent]) {\n    int tmp = arr[parent];\n    arr[parent] = arr[child];\n    arr[child] = tmp;\n}',
    extras: (context) => ({
      parent: context.snapshot.activeIndices[0] ?? 0,
      child: context.snapshot.comparedIndices[0] ?? context.snapshot.activeIndices[1] ?? 0,
    }),
  }),

  'counting-sort': challenge({
    prompt: 'Count this value. The value is the index into count, which is what makes the sort O(n + k) with no comparison.',
    junctionTypes: [CriticalJunctionType.COUNT_INCREMENT],
    python: '# count, arr and i are given.\n',
    java: 'count[arr[i]]++;',
    globals: (context) => ({
      count: [...field<number[]>(context.snapshot, 'count', [])],
      arr: [...field<number[]>(context.snapshot, 'input', [])],
      i: field<number>(context.snapshot, 'currentInputIndex', 0),
    }),
    readBack: 'count',
    expect: 'number[]',
    expected: (context) => {
      const here = field<number[]>(context.snapshot, 'count', [])
      const settled = nextWhere(context, (s) => field<number[]>(s, 'count', here).some((v, i) => v !== here[i]))
      return settled ? [...field<number[]>(settled, 'count', [])] : null
    },
  }),

  'radix-sort': challenge({
    prompt: 'Pull out the digit this pass sorts on, so the element can go into its bucket.',
    junctionTypes: [CriticalJunctionType.DIGIT_BUCKET],
    python: '# value is the element; place is 1 for ones, 10 for tens, and so on.\ndigit = ',
    java: 'int digit = (value / place) % 10;',
    globals: (context) => ({
      value: field<number>(context.snapshot, 'currentElement', 0),
      place: field<number>(context.snapshot, 'digitPosition', 1),
    }),
    readBack: 'digit',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'currentDigit', null),
  }),

  // -------------------------------------------------- Module 4, techniques
  'two-pointer': challenge({
    prompt: 'The sum is not the target. Move the pointer that can bring the sum towards it, and leave the other alone.',
    junctionTypes: [CriticalJunctionType.POINTER_MOVE],
    python: '# arr, left, right and target are given.\nif arr[left] + arr[right] < target:\n    left = left + 1\nelse:\n    right = ',
    java: 'if (arr[left] + arr[right] < target) left++;\nelse right--;',
    globals: (context) => ({
      arr: [...arrayOf(context.snapshot)],
      left: field<number>(context.snapshot, 'leftPointerIndex', 0),
      right: field<number>(context.snapshot, 'rightPointerIndex', 0),
      target: field<number>(context.snapshot, 'target', 0),
    }),
    readBack: 'pointers',
    expect: 'json',
    expected: (context) => {
      const settled = nextWhere(
        context,
        (s) =>
          field<number>(s, 'leftPointerIndex', -1) !== field<number>(context.snapshot, 'leftPointerIndex', -1) ||
          field<number>(s, 'rightPointerIndex', -1) !== field<number>(context.snapshot, 'rightPointerIndex', -1),
      )
      return settled
        ? [field<number>(settled, 'leftPointerIndex', 0), field<number>(settled, 'rightPointerIndex', 0)]
        : null
    },
  }),

  'sliding-window-fixed': challenge({
    prompt: 'Slide the window one place. Update the sum in O(1) from the element that left and the one that arrived, rather than adding the window up again.',
    // WINDOW_EXPAND, not WINDOW_SUM: the WINDOW_SUM junction asks for the
    // sum of the window as it stands, whose answer is on the canvas. The
    // sliding step is where the O(1) update is the whole technique.
    junctionTypes: [CriticalJunctionType.WINDOW_EXPAND],
    python: '# window_sum, leaving and arriving are given.\nwindow_sum = ',
    java: 'windowSum = windowSum - leaving + arriving;',
    globals: (context) => {
      const arr = arrayOf(context.snapshot)
      const start = field<number>(context.snapshot, 'windowStart', 0)
      const end = field<number>(context.snapshot, 'windowEnd', 0)
      return {
        window_sum: field<number>(context.snapshot, 'windowSum', 0),
        leaving: arr[start] ?? 0,
        arriving: arr[end + 1] ?? 0,
      }
    },
    readBack: 'window_sum',
    expect: 'number',
    expected: (context) => {
      const here = field<number>(context.snapshot, 'windowSum', 0)
      const settled = nextWhere(context, (s) => field<number>(s, 'windowSum', here) !== here)
      return settled ? field<number>(settled, 'windowSum', here) : null
    },
  }),

  'sliding-window-variable': challenge({
    prompt: 'Decide whether to expand the window or shrink it, from the sum you have against the one you want.',
    junctionTypes: [CriticalJunctionType.WINDOW_EXPAND],
    python: '# window_sum and target are given.\nexpand = ',
    java: 'if (windowSum < target) end++;\nelse start++;',
    globals: (context) => ({
      window_sum: field<number>(context.snapshot, 'windowSum', 0),
      target: field<number>(context.snapshot, 'targetSum', 0),
    }),
    readBack: 'expand',
    expect: 'boolean',
    expected: (context) => {
      const end = field<number>(context.snapshot, 'windowEnd', 0)
      const start = field<number>(context.snapshot, 'windowStart', 0)
      const settled = nextWhere(
        context,
        (s) => field<number>(s, 'windowEnd', end) !== end || field<number>(s, 'windowStart', start) !== start,
      )
      return settled ? field<number>(settled, 'windowEnd', end) !== end : null
    },
  }),

  // ------------------------------------- Module 5, hierarchical structures
  ...bstDirection(['bst', 'bst-search', 'bst-delete', 'rb-insert', 'rb-delete']),
  ...treeTraversal({
    'tree-inorder': { order: 'left, node, right', call: 'inorder' },
    'tree-preorder': { order: 'node, left, right', call: 'preorder' },
    'tree-postorder': { order: 'left, right, node', call: 'postorder' },
  }),

  'tree-level-order': challenge({
    prompt: 'Level order is the one traversal that is not recursive: take a node off the queue, then put its children on.',
    junctionTypes: [CriticalJunctionType.VISIT_NODE],
    python: '# tree is a dict with "value", "left" and "right"; left or right may be None.\norder = []\nqueue = [tree]\nwhile queue:\n    node = queue.pop(0)\n    order.append(node["value"])\n    ',
    java: 'while (!queue.isEmpty()) {\n    Node n = queue.poll();\n    order.add(n.value);\n    if (n.left != null) queue.add(n.left);\n    if (n.right != null) queue.add(n.right);\n}',
    globals: (context) => ({ tree: treeOf(context.run[0]) }),
    readBack: 'order',
    expect: 'number[]',
    expected: (context) => completeVisitOrder(context),
  }),

  'avl-insert': challenge({
    prompt: 'Compute this node\'s balance factor: the height of its left subtree minus the height of its right.',
    junctionTypes: [CriticalJunctionType.AVL_BALANCE_CHECK],
    python: '# node is a dict with "value", "left" and "right"; left or right may be None.\ndef height(n):\n    if n is None:\n        return 0\n    return 1 + max(height(n["left"]), height(n["right"]))\n\nbalance = ',
    java: 'int balance = height(node.left) - height(node.right);',
    globals: (context) => ({ node: treeOf(context.snapshot, 'currentNode') }),
    readBack: 'balance',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'balanceFactor', null),
  }),

  'avl-delete': challenge({
    prompt: 'Compute this node\'s balance factor after the deletion, which is what decides whether a rotation is needed.',
    junctionTypes: [CriticalJunctionType.AVL_BALANCE_CHECK],
    python: '# node is a dict with "value", "left" and "right"; left or right may be None.\ndef height(n):\n    if n is None:\n        return 0\n    return 1 + max(height(n["left"]), height(n["right"]))\n\nbalance = ',
    java: 'int balance = height(node.left) - height(node.right);',
    globals: (context) => ({ node: treeOf(context.snapshot, 'currentNode') }),
    readBack: 'balance',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'balanceFactor', null),
  }),

  'max-heap-insert': challenge({
    prompt: 'A heap is an array, not a tree of pointers. Give the index of this node\'s parent.',
    junctionTypes: [CriticalJunctionType.HEAP_SIFT_UP],
    python: '# i is the index of the node that was just added.\nparent = ',
    java: 'int parent = (i - 1) / 2;',
    globals: (context) => ({ i: field<number>(context.snapshot, 'currentIdx', 0) }),
    readBack: 'parent',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'parentIdx', null),
  }),

  'min-heap-insert': challenge({
    prompt: 'Decide whether this node sifts up. A min-heap wants the smaller value nearer the root.',
    junctionTypes: [CriticalJunctionType.HEAP_SIFT_UP],
    python: '# arr, i and parent are given.\nsift = ',
    java: 'boolean sift = (arr[i] < arr[parent]);',
    globals: (context) => ({
      arr: [...arrayOf(context.snapshot)],
      i: field<number>(context.snapshot, 'currentIdx', 0),
      parent: field<number>(context.snapshot, 'parentIdx', 0),
    }),
    readBack: 'sift',
    expect: 'boolean',
    // From the run: the array changes when the engine performs the swap.
    expected: (context) => {
      const here = arrayOf(context.snapshot)
      return nextWhere(context, (s) => arrayOf(s).some((v, i) => v !== here[i])) !== null
    },
  }),

  'max-heap-delete': challenge({
    prompt: 'Sifting down means swapping with the larger child, not either one. Give the index to swap with, or i itself if neither child is bigger.',
    junctionTypes: [CriticalJunctionType.HEAP_SIFT_DOWN],
    python: '# arr, i, size, left and right are given; left or right may be -1.\nlargest = i\n',
    java: 'int largest = i;\nif (left < size && arr[left] > arr[largest]) largest = left;\nif (right < size && arr[right] > arr[largest]) largest = right;',
    globals: (context) => heapChildGlobals(context),
    readBack: 'largest',
    expect: 'number',
    expected: (context) => heapSwapTarget(context),
  }),

  'min-heap-delete': challenge({
    prompt: 'Sifting down in a min-heap means swapping with the smaller child. Give the index to swap with, or i itself if neither child is smaller.',
    junctionTypes: [CriticalJunctionType.HEAP_SIFT_DOWN],
    python: '# arr, i, size, left and right are given; left or right may be -1.\nsmallest = i\n',
    java: 'int smallest = i;\nif (left < size && arr[left] < arr[smallest]) smallest = left;\nif (right < size && arr[right] < arr[smallest]) smallest = right;',
    globals: (context) => heapChildGlobals(context),
    readBack: 'smallest',
    expect: 'number',
    expected: (context) => heapSwapTarget(context),
  }),

  'trie-insert': challenge({
    prompt: 'Decide whether this character needs a new node, which is the only thing insertion does that search does not.',
    junctionTypes: [CriticalJunctionType.TRIE_INSERT_NEW],
    python: '# children is the list of characters this node already has.\n# char is the character being inserted.\nneeds_new = ',
    java: 'boolean needsNew = !node.children.containsKey(c);',
    globals: (context) => trieGlobals(context.snapshot),
    readBack: 'needs_new',
    expect: 'boolean',
    expected: (context) => field<boolean | null>(context.snapshot, 'needsNewNode', null),
  }),

  ...trieMatch(['trie-search', 'trie-delete']),

  // ------------------------------------------------------ Module 6, graphs
  'bfs': challenge({
    prompt: 'BFS takes nodes in the order they arrived. Take the next one off the frontier.',
    junctionTypes: [CriticalJunctionType.NEXT_NODE_SELECTION],
    python: '# frontier is the queue of node names, in arrival order.\nnext_node = ',
    java: 'String nextNode = queue.poll();',
    globals: (context) => ({ frontier: [...field<string[]>(context.snapshot, 'frontier', [])] }),
    readBack: 'next_node',
    expect: 'string',
    expected: (context) => nextCurrentNode(context),
  }),

  'dfs': challenge({
    prompt: 'DFS takes the node it saw most recently. Take the next one off the frontier.',
    junctionTypes: [CriticalJunctionType.NEXT_NODE_SELECTION],
    python: '# frontier is the stack of node names, oldest first.\nnext_node = ',
    java: 'String nextNode = stack.pop();',
    globals: (context) => ({ frontier: [...field<string[]>(context.snapshot, 'frontier', [])] }),
    readBack: 'next_node',
    expect: 'string',
    expected: (context) => nextCurrentNode(context),
  }),

  'dijkstra': challenge({
    prompt: 'Relaxation: decide whether going through this node is a shorter way to reach the other one. An unreached node has distance None.',
    junctionTypes: [CriticalJunctionType.EDGE_RELAX],
    python: '# current is the distance already known (None if unreached);\n# candidate is the distance via this edge.\nimprove = ',
    java: 'boolean improve = (dist[v] == INFINITY || candidate < dist[v]);',
    globals: (context) => ({
      current: field<number | null>(context.snapshot, 'currentDist', null),
      candidate: field<number | null>(context.snapshot, 'newDist', null),
    }),
    readBack: 'improve',
    expect: 'boolean',
    expected: (context) => {
      const current = field<number | null>(context.snapshot, 'currentDist', null)
      const candidate = field<number | null>(context.snapshot, 'newDist', null)
      if (candidate === null) return null
      return current === null || candidate < current
    },
  }),

  'bellman-ford': challenge({
    prompt: 'Say how many relaxation passes Bellman-Ford needs in the worst case, from the number of nodes.',
    junctionTypes: [CriticalJunctionType.BELLMAN_PASS_COMPLETE],
    python: '# node_count is the number of nodes in the graph.\npasses = ',
    java: 'int passes = nodeCount - 1;',
    globals: (context) => ({ node_count: field<unknown[]>(context.snapshot, 'nodes', []).length }),
    readBack: 'passes',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'totalPasses', null),
  }),

  'floyd-warshall': challenge({
    prompt: 'Decide whether routing i to j through k beats the distance already known. An unreachable pair is None.',
    junctionTypes: [CriticalJunctionType.MATRIX_UPDATE],
    python: '# via_k is the distance i -> k -> j (None if either leg is missing);\n# direct is dist[i][j] (None if unreachable).\nimprove = ',
    java: 'if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];',
    globals: (context) => floydGlobals(context.snapshot),
    readBack: 'improve',
    expect: 'boolean',
    expected: (context) => {
      const { via_k, direct } = floydGlobals(context.snapshot)
      if (via_k === null) return false
      return direct === null || via_k < direct
    },
  }),

  'kruskal': challenge({
    prompt: 'Kruskal must not close a cycle. Decide whether these two nodes are already joined by the edges chosen so far.',
    junctionTypes: [CriticalJunctionType.UNION_FIND_CHECK],
    python: '# chosen is the list of [from, to] edges already in the tree.\n# a and b are the ends of the edge being considered.\n# Walk the chosen edges and decide whether b is reachable from a.\nsame = ',
    java: 'boolean same = find(a) == find(b);',
    globals: (context) => ({
      chosen: field<{ from: string; to: string }[]>(context.snapshot, 'mstEdges', []).map((edge) => [edge.from, edge.to]),
      a: field<string>(context.snapshot, 'fromNode', ''),
      b: field<string>(context.snapshot, 'toNode', ''),
    }),
    readBack: 'same',
    expect: 'boolean',
    expected: (context) => field<boolean | null>(context.snapshot, 'sameComponent', null),
  }),

  'prim': challenge({
    prompt: 'Prim grows one tree. Give the weight of the cheapest edge that reaches a node not in it yet.',
    junctionTypes: [CriticalJunctionType.MST_EDGE_SELECT],
    python: '# candidates is a list of [from, to, weight] edges leaving the tree.\nweight = ',
    java: 'int weight = candidates.stream().mapToInt(e -> e.weight).min().orElse(0);',
    globals: (context) => ({
      candidates: field<unknown[][]>(context.snapshot, 'candidateEdges', []).map((edge) => [...edge]),
    }),
    readBack: 'weight',
    expect: 'number',
    // The cost the run itself adds when it takes the edge.
    expected: (context) => {
      const here = field<number>(context.snapshot, 'mstCost', 0)
      const settled = nextWhere(context, (s) => field<number>(s, 'mstCost', here) !== here)
      return settled ? field<number>(settled, 'mstCost', here) - here : null
    },
  }),

  'cycle-detection': challenge({
    prompt: 'A grey node is an ancestor on the current path. Decide whether this edge is a back-edge, which is what a cycle is.',
    junctionTypes: [CriticalJunctionType.CYCLE_FOUND],
    python: '# colour is "white", "grey" or "black" for the node this edge points at.\nis_back_edge = ',
    java: 'boolean isBackEdge = (colour[v] == GREY);',
    globals: (context) => ({ colour: edgeTargetColour(context.snapshot) }),
    readBack: 'is_back_edge',
    expect: 'boolean',
    expected: (context) => field<boolean | null>(context.snapshot, 'isBackEdge', null),
  }),

  'connected-components': challenge({
    prompt: 'Count the components: how many separate pieces this graph falls into.',
    junctionTypes: [CriticalJunctionType.NEW_COMPONENT],
    python: '# adjacency maps each node name to its neighbours.\n# Count how many searches it takes to reach every node.\ntotal = ',
    java: 'for (String n : nodes) if (!seen.contains(n)) { total++; bfs(n); }',
    globals: (context) => ({ adjacency: adjacencyOf(context.snapshot) }),
    readBack: 'total',
    expect: 'number',
    expected: (context) => field<number | null>(context.snapshot, 'totalComponents', null),
  }),

  'topological-sort': challenge({
    prompt: 'This node has no unvisited neighbours left, so every node that depends on it is already placed. Add it to the order.',
    junctionTypes: [CriticalJunctionType.TOPOLOGICAL_ORDER],
    python: '# order is the list built so far; node is the one just finished.\n# A DFS topological sort builds the order from the back.\n',
    java: 'order.addFirst(node);',
    globals: (context) => ({
      order: [...field<string[]>(context.snapshot, 'topoOrder', [])],
      node: field<string>(context.snapshot, 'currentNode', ''),
    }),
    readBack: 'order',
    expect: 'json',
    expected: (context) => {
      const here = field<string[]>(context.snapshot, 'topoOrder', [])
      const settled = nextWhere(context, (s) => field<string[]>(s, 'topoOrder', here).length !== here.length)
      return settled ? [...field<string[]>(settled, 'topoOrder', [])] : null
    },
  }),

  ...gridFrontier(['grid-bfs', 'grid-dfs', 'grid-dijkstra', 'grid-astar']),

  // ----------------------------------------- Module 4, the seven paradigms
  'prefix-sum': challenge({
    prompt: 'Fill this cell of the prefix table from the cell before it, not by adding the range up again.',
    junctionTypes: [CriticalJunctionType.PREFIX_CELL],
    python: '# previous is the cell before this one; element is the array value.\ncell = ',
    java: 'prefix[i + 1] = prefix[i] + arr[i];',
    globals: (context) => {
      const column = (context.snapshot.dataStructureState as { current: [number, number] | null }).current?.[1] ?? 0
      return {
        previous: tableCell(context.snapshot, 0, column - 1) ?? 0,
        element: field<number[]>(context.snapshot, 'input', [])[column - 1] ?? 0,
      }
    },
    readBack: 'cell',
    expect: 'number',
    expected: (context) => {
      const column = (context.snapshot.dataStructureState as { current: [number, number] | null }).current?.[1] ?? 0
      const settled = nextWhere(context, (s) => tableCell(s, 0, column) !== null)
      return settled ? tableCell(settled, 0, column) : null
    },
  }),

  'monotonic-stack': challenge({
    prompt: 'Discharge every waiting index this element answers - all of them, not just the one on top.',
    junctionTypes: [CriticalJunctionType.STACK_DISCHARGE],
    python: '# arr, stack (a list of indices) and i are given.\n# Pop every index arr[i] answers; collect them in popped.\npopped = []\nwhile stack and ',
    java: 'while (!stack.isEmpty() && arr[stack.peek()] < arr[i]) {\n    popped.add(stack.pop());\n}',
    globals: (context) => ({
      arr: [...field<number[]>(context.snapshot, 'input', [])],
      stack: [...field<number[]>(context.snapshot, 'marked', [])],
      i: (context.snapshot.dataStructureState as { current: [number, number] | null }).current?.[1] ?? 0,
    }),
    readBack: 'popped',
    expect: 'number[]',
    // Which indices the run actually discharges before it pushes again.
    expected: (context) => {
      const before = field<number[]>(context.snapshot, 'marked', [])
      const column = (context.snapshot.dataStructureState as { current: [number, number] | null }).current?.[1] ?? 0
      const after = nextWhere(context, (s) => field<number[]>(s, 'marked', before).length !== before.length)
      if (!after) return []
      const remaining = new Set(field<number[]>(after, 'marked', []))
      return before.filter((index) => !remaining.has(index) && index !== column)
    },
  }),

  'divide-and-conquer': challenge({
    prompt: 'Combine the three candidates into this range\'s answer. One of them is the case neither half could see.',
    junctionTypes: [CriticalJunctionType.COMBINE_RESULT],
    python: '# left, right and cross are the three candidate answers.\nbest = ',
    java: 'int best = Math.max(left, Math.max(right, cross));',
    globals: (context) => combineCandidates(context.snapshot),
    readBack: 'best',
    expect: 'number',
    expected: (context) => {
      const { left, right, cross } = combineCandidates(context.snapshot)
      return Math.max(left, right, cross)
    },
  }),

  greedy: challenge({
    prompt: 'Decide whether this activity fits: the room is free from the last accepted finish time onwards.',
    junctionTypes: [CriticalJunctionType.GREEDY_CHOICE],
    python: '# start is this activity\'s start; last_finish is when the room is free.\ntake = ',
    java: 'boolean take = (activity.start >= lastFinish);',
    globals: (context) => greedyGlobals(context.snapshot),
    readBack: 'take',
    expect: 'boolean',
    // From the run: the row records 1 when the engine took it.
    expected: (context) => {
      const column = (context.snapshot.dataStructureState as { current: [number, number] | null }).current?.[1] ?? 0
      const settled = nextWhere(context, (s) => tableCell(s, 0, column) !== null)
      const taken = settled ? tableCell(settled, 0, column) : null
      return taken === null ? null : taken === 1
    },
  }),

  'dp-1d': challenge({
    prompt: 'Fill this cell: extend the best run ending at the previous position, or start a new one here.',
    junctionTypes: [CriticalJunctionType.DP_CELL],
    python: '# previous is best[i - 1]; element is arr[i].\ncell = ',
    java: 'best[i] = Math.max(arr[i], best[i - 1] + arr[i]);',
    globals: (context) => {
      const column = (context.snapshot.dataStructureState as { current: [number, number] | null }).current?.[1] ?? 0
      return {
        previous: tableCell(context.snapshot, 0, column - 1) ?? 0,
        element: field<number[]>(context.snapshot, 'input', [])[column] ?? 0,
      }
    },
    readBack: 'cell',
    expect: 'number',
    expected: (context) => {
      const column = (context.snapshot.dataStructureState as { current: [number, number] | null }).current?.[1] ?? 0
      const settled = nextWhere(context, (s) => tableCell(s, 0, column) !== null)
      return settled ? tableCell(settled, 0, column) : null
    },
  }),

  'dp-2d': challenge({
    prompt: 'The characters differ, so one edit is unavoidable. Fill the cell from the cheapest of the three neighbours.',
    junctionTypes: [CriticalJunctionType.DP_CELL],
    python: '# up is a deletion, left an insertion, diagonal a substitution.\ncell = ',
    java: 'd[i][j] = 1 + Math.min(up, Math.min(left, diagonal));',
    globals: (context) => editNeighbours(context.snapshot),
    readBack: 'cell',
    expect: 'number',
    expected: (context) => {
      const current = (context.snapshot.dataStructureState as { current: [number, number] | null }).current
      if (!current) return null
      const settled = nextWhere(context, (s) => tableCell(s, current[0], current[1]) !== null)
      return settled ? tableCell(settled, current[0], current[1]) : null
    },
  }),

  backtracking: challenge({
    prompt: 'Decide whether this branch can be abandoned. Every element left is positive, which is what makes the test safe.',
    junctionTypes: [CriticalJunctionType.PRUNE_BRANCH],
    python: '# total is the running sum; target is what a solution must reach.\nprune = ',
    java: 'boolean prune = (total > target);',
    globals: (context) => ({
      total: field<number>(context.snapshot, 'total', 0),
      target: field<number>(context.snapshot, 'target', 0),
    }),
    readBack: 'prune',
    expect: 'boolean',
    expected: (context) => field<number>(context.snapshot, 'total', 0) > field<number>(context.snapshot, 'target', 0),
  }),
}

/** Topics that offer a code challenge. */
export function codeChallengeFor(slug: string | undefined): CodeChallenge | null {
  return (slug && CODE_CHALLENGES[slug]) || null
}

export function hasCodeChallenge(slug: string | undefined): boolean {
  return !!slug && slug in CODE_CHALLENGES
}

/**
 * Everything one code question needs, assembled from the live run: what to
 * hand the sandbox, what to read back, and the answer to grade against.
 *
 * Null when this junction is not one the topic's challenge grades, or when
 * the expected answer cannot be computed - the caller then leaves the
 * junction as an ordinary tile prediction rather than grading against
 * nothing.
 */
export interface CodeStep {
  challenge: CodeChallenge
  spec: PythonStepSpec
  expected: unknown
}

export function codeStepFor(slug: string | undefined, run: AlgorithmSnapshot[], index: number): CodeStep | null {
  const challenge = codeChallengeFor(slug)
  const snapshot = run[index]
  if (!challenge || !snapshot) return null
  const junction = snapshot.criticalJunctionType
  if (!junction || !challenge.junctionTypes.includes(junction)) return null
  const context: ChallengeContext = {
    run,
    index,
    snapshot,
    next: run[index + 1] ?? null,
    prev: index > 0 ? run[index - 1] : null,
  }
  const expected = challenge.expectedFor(context)
  if (expected === null || expected === undefined) return null
  return {
    challenge,
    spec: {
      globals: challenge.globalsFor(context),
      readBack: challenge.readBack,
      expect: challenge.expect,
    },
    expected,
  }
}
