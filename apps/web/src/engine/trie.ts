import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CanvasType, CriticalJunctionType, JunctionDifficulty, PredictionType } from '@dsa-tutor/types'

export interface TrieNode {
  id: string
  char: string
  children: Map<string, TrieNode>
  isTerminal: boolean
  depth: number
}

export interface TrieState {
  root: TrieNode
  currentWord: string
  currentCharIdx: number
  currentNodeId: string
  /** node ids confirmed on the path so far (green). */
  matchedPath: string[]
  /** node ids created during this operation (bright blue) - only ever
   * non-empty during insert. */
  newNodes: string[]
  operation: 'insert' | 'search' | 'delete'
  found: boolean | null
  /** the character currently being examined - read directly by
   * PredictionZone's TRIE_CHARACTER_MATCH/TRIE_INSERT_NEW tile cases. */
  currentChar: string | null
  /** whether `currentChar` exists as a child of the current node. */
  charExists: boolean | null
  /** whether a new node had to be created for `currentChar` (insert only). */
  needsNewNode: boolean | null
}

export const DEFAULT_TRIE_WORDS = ['apple', 'app', 'apt', 'bat', 'ball', 'band']

let idCounter = 0

function makeNode(char: string, depth: number): TrieNode {
  return { id: `trie-${char}-${idCounter++}`, char, children: new Map(), isTerminal: false, depth }
}

function cloneTrieNode(node: TrieNode): TrieNode {
  const clone: TrieNode = { id: node.id, char: node.char, isTerminal: node.isTerminal, depth: node.depth, children: new Map() }
  for (const [char, child] of node.children) clone.children.set(char, cloneTrieNode(child))
  return clone
}

// Indices match PseudocodePanel's 'trie-insert' / 'trie-search' / 'trie-delete' arrays.
const PSEUDOCODE_LINE = {
  START: 0,
  LOOP: 1,
  CHECK: 2,
  CREATE_OR_ACT: 3,
  ADVANCE: 4,
} as const

interface SnapshotParams {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  state: TrieState
  isFinalStep?: boolean
  criticalJunctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

function makeSnapshot(params: SnapshotParams): AlgorithmSnapshot {
  return {
    stepIndex: params.stepIndex,
    description: params.description,
    pseudocodeLine: params.pseudocodeLine,
    isPredictionRequired: params.isPredictionRequired,
    predictionType: PredictionType.TILE_GRID,
    dataStructureState: {
      ...params.state,
      root: cloneTrieNode(params.state.root),
      matchedPath: [...params.state.matchedPath],
      newNodes: [...params.state.newNodes],
    },
    activeIndices: [],
    highlightIndices: [],
    comparedIndices: [],
    swappedIndices: [],
    isFinalStep: params.isFinalStep ?? false,
    criticalJunctionType: params.criticalJunctionType ?? null,
    junctionDifficulty: params.junctionDifficulty ?? null,
    canvasType: CanvasType.TRIE,
  }
}

/**
 * Pure snapshot engine for Trie insertion. Inserts each word in `words`
 * one at a time into a trie that carries over between insertions (like
 * avlInsertEngine/rbInsertEngine - later words need to see earlier
 * words' shared prefixes). For each character: checks whether it
 * already exists as a child of the current node (TRIE_INSERT_NEW - is a
 * new node needed?), creates one if not, then descends into it.
 */
export function trieInsertEngine(words: string[]): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const root: TrieNode = makeNode('', 0)

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<TrieState>): TrieState {
    return {
      root,
      currentWord: '',
      currentCharIdx: -1,
      currentNodeId: root.id,
      matchedPath: [root.id],
      newNodes: [],
      operation: 'insert',
      found: null,
      currentChar: null,
      charExists: null,
      needsNewNode: null,
      ...overrides,
    }
  }

  words.forEach((rawWord, wordIndex) => {
    const word = rawWord.toLowerCase()
    const isLastWord = wordIndex === words.length - 1
    let current = root
    const matchedPath = [root.id]
    const newNodes: string[] = []

    for (let i = 0; i < word.length; i++) {
      const char = word[i]
      const exists = current.children.has(char)

      push({
        description: `Inserting "${word}": does '${char}' already exist as a child of '${current.char || 'root'}'?`,
        pseudocodeLine: PSEUDOCODE_LINE.CHECK,
        isPredictionRequired: true,
        state: baseState({
          currentWord: word,
          currentCharIdx: i,
          currentNodeId: current.id,
          matchedPath: [...matchedPath],
          newNodes: [...newNodes],
          currentChar: char,
          needsNewNode: !exists,
        }),
        criticalJunctionType: CriticalJunctionType.TRIE_INSERT_NEW,
        junctionDifficulty: JunctionDifficulty.PROCEDURAL,
      })

      if (!exists) {
        const newNode = makeNode(char, current.depth + 1)
        current.children.set(char, newNode)
        newNodes.push(newNode.id)
      }

      current = current.children.get(char)!
      matchedPath.push(current.id)

      push({
        description: exists
          ? `'${char}' already existed. Descending into it.`
          : `Created a new node for '${char}' and descended into it.`,
        pseudocodeLine: PSEUDOCODE_LINE.CREATE_OR_ACT,
        isPredictionRequired: false,
        state: baseState({
          currentWord: word,
          currentCharIdx: i,
          currentNodeId: current.id,
          matchedPath: [...matchedPath],
          newNodes: [...newNodes],
        }),
      })
    }

    current.isTerminal = true
    push({
      description: `"${word}" fully inserted. Node '${current.char}' is now marked as a word ending.`,
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({ currentWord: word, currentNodeId: current.id, matchedPath, newNodes }),
      isFinalStep: isLastWord,
    })
  })

  if (words.length === 0) {
    push({
      description: 'No words were given to insert; the trie remains empty.',
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({}),
      isFinalStep: true,
    })
  }

  return snapshots
}

/**
 * Pure snapshot engine for Trie search. Takes an existing root (e.g. the
 * final root produced by trieInsertEngine) and searches for `word`,
 * checking at every character whether it exists as a child of the
 * current node (TRIE_CHARACTER_MATCH). Never mutates the tree.
 */
export function trieSearchEngine(root: TrieNode, word: string): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const target = word.toLowerCase()

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  function baseState(overrides: Partial<TrieState>): TrieState {
    return {
      root,
      currentWord: target,
      currentCharIdx: -1,
      currentNodeId: root.id,
      matchedPath: [root.id],
      newNodes: [],
      operation: 'search',
      found: null,
      currentChar: null,
      charExists: null,
      needsNewNode: null,
      ...overrides,
    }
  }

  let current = root
  const matchedPath = [root.id]

  for (let i = 0; i < target.length; i++) {
    const char = target[i]
    const exists = current.children.has(char)

    push({
      description: `Searching for "${target}": does '${char}' exist as a child of '${current.char || 'root'}'?`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK,
      isPredictionRequired: true,
      state: baseState({ currentCharIdx: i, currentNodeId: current.id, matchedPath: [...matchedPath], currentChar: char, charExists: exists }),
      criticalJunctionType: CriticalJunctionType.TRIE_CHARACTER_MATCH,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    if (!exists) {
      push({
        description: `'${char}' does not exist here. "${target}" is not in the trie.`,
        pseudocodeLine: PSEUDOCODE_LINE.START,
        isPredictionRequired: false,
        state: baseState({ currentCharIdx: i, matchedPath, found: false }),
        isFinalStep: true,
      })
      return snapshots
    }

    current = current.children.get(char)!
    matchedPath.push(current.id)
  }

  const found = current.isTerminal
  push({
    description: found
      ? `Every character matched and '${current.char}' is marked as a word ending. "${target}" was found.`
      : `Every character matched, but '${current.char}' is not marked as a word ending - "${target}" is only a prefix of other words.`,
    pseudocodeLine: PSEUDOCODE_LINE.START,
    isPredictionRequired: false,
    state: baseState({ currentNodeId: current.id, matchedPath, found }),
    isFinalStep: true,
  })

  return snapshots
}

/**
 * Pure snapshot engine for Trie deletion. Takes an existing root and
 * deletes `word` if present: unmarks its terminal node, then prunes back
 * up the path, removing any node that has become childless and isn't
 * itself a word ending - stopping as soon as a node still needed by
 * another word (or still terminal) is reached. Never mutates the
 * caller's tree.
 */
export function trieDeleteEngine(root: TrieNode, word: string): AlgorithmSnapshot[] {
  const snapshots: AlgorithmSnapshot[] = []
  let stepIndex = 0
  const workingRoot = cloneTrieNode(root)
  const target = word.toLowerCase()

  function push(params: Omit<SnapshotParams, 'stepIndex'>) {
    snapshots.push(makeSnapshot({ ...params, stepIndex: stepIndex++ }))
  }

  // Once the word is confirmed found, every later push (through the
  // whole pruning walk) needs to keep reporting found: true - baseState
  // reads this mutable binding as its default instead of a fixed null,
  // so callers don't have to re-pass `found` on every single push.
  let resultFound: boolean | null = null

  function baseState(overrides: Partial<TrieState>): TrieState {
    return {
      root: workingRoot,
      currentWord: target,
      currentCharIdx: -1,
      currentNodeId: workingRoot.id,
      matchedPath: [workingRoot.id],
      newNodes: [],
      operation: 'delete',
      found: resultFound,
      currentChar: null,
      charExists: null,
      needsNewNode: null,
      ...overrides,
    }
  }

  const path: TrieNode[] = [workingRoot]
  let current = workingRoot

  for (let i = 0; i < target.length; i++) {
    const char = target[i]
    const exists = current.children.has(char)

    push({
      description: `Deleting "${target}": does '${char}' exist as a child of '${current.char || 'root'}'?`,
      pseudocodeLine: PSEUDOCODE_LINE.CHECK,
      isPredictionRequired: true,
      state: baseState({ currentCharIdx: i, currentNodeId: current.id, matchedPath: path.map((n) => n.id), currentChar: char, charExists: exists }),
      criticalJunctionType: CriticalJunctionType.TRIE_CHARACTER_MATCH,
      junctionDifficulty: JunctionDifficulty.PROCEDURAL,
    })

    if (!exists) {
      push({
        description: `'${char}' does not exist here. "${target}" was not found - nothing to delete.`,
        pseudocodeLine: PSEUDOCODE_LINE.START,
        isPredictionRequired: false,
        state: baseState({ found: false }),
        isFinalStep: true,
      })
      return snapshots
    }

    current = current.children.get(char)!
    path.push(current)
  }

  if (!current.isTerminal) {
    push({
      description: `"${target}" is only a prefix of other words, not a word itself - nothing to delete.`,
      pseudocodeLine: PSEUDOCODE_LINE.START,
      isPredictionRequired: false,
      state: baseState({ found: false }),
      isFinalStep: true,
    })
    return snapshots
  }

  current.isTerminal = false
  resultFound = true
  push({
    description: `"${target}" found. Unmarked '${current.char}' as a word ending.`,
    pseudocodeLine: PSEUDOCODE_LINE.CREATE_OR_ACT,
    isPredictionRequired: false,
    state: baseState({ currentNodeId: current.id, matchedPath: path.map((n) => n.id) }),
  })

  for (let i = path.length - 1; i > 0; i--) {
    const node = path[i]
    const parent = path[i - 1]
    if (node.children.size > 0 || node.isTerminal) {
      push({
        description: `'${node.char}' still has children or ends another word - pruning stops here.`,
        pseudocodeLine: PSEUDOCODE_LINE.ADVANCE,
        isPredictionRequired: false,
        state: baseState({ currentNodeId: node.id, matchedPath: path.slice(0, i + 1).map((n) => n.id) }),
        isFinalStep: true,
      })
      return snapshots
    }
    parent.children.delete(node.char)
    push({
      description: `'${node.char}' has no children and doesn't end another word - pruned.`,
      pseudocodeLine: PSEUDOCODE_LINE.ADVANCE,
      isPredictionRequired: false,
      state: baseState({ currentNodeId: parent.id, matchedPath: path.slice(0, i).map((n) => n.id) }),
    })
  }

  if (snapshots.length > 0) snapshots[snapshots.length - 1].isFinalStep = true
  return snapshots
}
