import { useEffect, useState, type KeyboardEvent } from 'react'
import { complexityJunctionEnabled } from '@/utils/studyCondition'
import { useStudyScope } from '@/hooks/useStudyScope'
import { arrayAccessEngine, arrayInsertEngine, arrayDeleteEngine, ARRAY_OPERATION_DEFAULTS } from '@/engine/arrayOperations'
import {
  ARRAY_OPERATION_FOR_SLUG,
  indexHint,
  parseArrayText,
  randomArrayOperation,
  validateArrayOperation,
  type ArrayOperation,
} from '@/utils/arrayOperationInput'
import { APPLY_INPUT_EVENT } from './applyInput'
import { Button } from '@/components/ui/button'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { withCodeMode } from '@/engine/codeMode'
import { stackPushEngine, stackPopEngine, stackPeekEngine } from '@/engine/stack'
import { queueEnqueueEngine, queueDequeueEngine, circularQueueEngine, dequeEngine } from '@/engine/queue'
import {
  hashInsertChainingEngine,
  hashSearchChainingEngine,
  hashDeleteChainingEngine,
  hashInsertLinearProbingEngine,
  hashSearchLinearProbingEngine,
  hashDeleteLinearProbingEngine,
} from '@/engine/hashTable'
import {
  sllInsertFrontEngine,
  sllInsertBackEngine,
  sllDeleteEngine,
  sllSearchEngine,
} from '@/engine/singlyLinkedList'
import {
  dllInsertFrontEngine,
  dllInsertBackEngine,
  dllDeleteEngine,
  dllSearchEngine,
} from '@/engine/doublyLinkedList'
import { cllInsertEngine, cllDeleteEngine, cllTraverseEngine } from '@/engine/circularLinkedList'
import { factorialEngine } from '@/engine/recursionFactorial'
import { fibonacciEngine } from '@/engine/recursionFibonacci'
import { twoSumSortedEngine } from '@/engine/twoPointer'
import { fixedWindowEngine, variableWindowEngine } from '@/engine/slidingWindow'
import { jumpSearchEngine } from '@/engine/jumpSearch'
import { interpolationSearchEngine } from '@/engine/interpolationSearch'
import { exponentialSearchEngine } from '@/engine/exponentialSearch'
import {
  bstInsertEngine,
  bstSearchEngine,
  bstDeleteEngine,
  BST_DEFAULT_SEED,
  BST_DEFAULT_SEARCH_TARGET,
  BST_DEFAULT_DELETE_TARGET,
  BST_DEFAULT_INSERT_VALUE,
  type BSTNode,
} from '@/engine/bst'
import { inorderEngine, preorderEngine, postorderEngine, levelorderEngine } from '@/engine/treeTraversal'
import { avlInsertEngine, avlDeleteEngine, type AVLNode } from '@/engine/avlTree'
import { rbInsertEngine, rbDeleteEngine, type RBNode } from '@/engine/redBlackTree'
import {
  maxHeapInsertEngine,
  maxHeapDeleteEngine,
  minHeapInsertEngine,
  minHeapDeleteEngine,
  buildHeapArray,
  HEAP_DEFAULT_SEED,
  HEAP_DEFAULT_INSERT_VALUE,
} from '@/engine/heap'
import { trieInsertEngine, trieSearchEngine, trieDeleteEngine, DEFAULT_TRIE_WORDS, type TrieState, type TrieNode } from '@/engine/trie'
import { countingSortEngine } from '@/engine/countingSort'
import { radixSortEngine } from '@/engine/radixSort'
import { bfsNodeGraphEngine } from '@/engine/bfs'
import { dfsNodeGraphEngine } from '@/engine/dfs'
import { dijkstraEngine } from '@/engine/dijkstra'
import { bellmanFordEngine } from '@/engine/bellmanFord'
import { kruskalEngine } from '@/engine/kruskal'
import { primEngine } from '@/engine/prim'
import { cycleDetectionEngine, connectedComponentsEngine, topologicalSortEngine } from '@/engine/graphProperties'
import { GRAPH_PRESETS, DIRECTED_ACYCLIC, type GraphPresetName, type UnweightedPreset, type WeightedPreset } from '@/engine/graphPresets'
import {
  gridBfsEngine,
  gridDfsEngine,
  gridDijkstraEngine,
  gridAStarEngine,
  buildEmptyGrid,
  buildWalledGrid,
  buildTerrainGrid,
  buildOpenGrid,
  PATHFINDER_BOARD,
  ASTAR_BOARD,
} from '@/engine/gridAlgorithms'
import { mazeGenerationEngine, mazePrimEngine, mazeKruskalEngine, MAZE_BOARD } from '@/engine/mazeGeneration'
import { dp2DWordsEngine } from '@/engine/dynamicProgramming'
import { greedyActivitiesEngine, DEFAULT_ACTIVITIES, type Activity } from '@/engine/greedy'
import { backtrackingEngine, nQueensBacktrackingEngine } from '@/engine/backtracking'
import { cn } from '@/lib/utils'
import type { GridCell, GridAlgorithmState, AlgorithmSnapshot } from '@dsa-tutor/types'

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary dark:text-dark-text-primary'
const labelClass = 'text-micro text-text-muted dark:text-dark-text-secondary'
const chipClass =
  'rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted transition-colors hover:border-primary/50 hover:bg-surface-sunk hover:text-text-primary dark:border-dark-border dark:text-dark-text-secondary dark:hover:text-dark-text-primary'

function parseArrayInput(input: string): number[] | null {
  const parts = input.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
  if (parts.length === 0) return null
  const values = parts.map(Number)
  if (values.some((n) => Number.isNaN(n))) return null
  return values
}

/**
 * Applies a snapshot run while preserving active Code Mode challenges.
 * Pass 'start' for runs the learner intends to step through from step 0,
 * or 'result' for direct data-structure mutations where seeing the mutated
 * structure immediately is primary (with Replay/Practice offered in the tape).
 */
function useApply() {
  const setAlgorithm = useAlgorithmStore((state) => state.setAlgorithm)
  return (slug: string, snapshots: AlgorithmSnapshot[], landOn: 'start' | 'result' = 'result') => {
    const displayName = getAlgorithmRegistryEntry(slug)?.displayName ?? slug
    const prepared = withCodeMode(snapshots, slug, useAlgorithmStore.getState().codeEditorMode)
    setAlgorithm(displayName, prepared, landOn)
  }
}

interface HistoryEntry<TState> {
  id: string
  label: string
  snapshots: AlgorithmSnapshot[]
  prevState: TState
}

function OperationHistoryTape<TState>({
  slug,
  entries,
  onUndo,
  onReset,
}: {
  slug: string
  entries: HistoryEntry<TState>[]
  onUndo: () => void
  onReset: () => void
}) {
  const apply = useApply()
  const setMode = useAlgorithmStore((state) => state.setMode)
  const classicMode = useAlgorithmStore((state) => state.classicMode)

  if (entries.length === 0) return null

  function handlePlayAll() {
    const combined: AlgorithmSnapshot[] = []
    entries.forEach((entry, entryIdx) => {
      const slice = entryIdx === 0 ? entry.snapshots : entry.snapshots.slice(1)
      slice.forEach((snap) => {
        combined.push({
          ...snap,
          stepIndex: combined.length,
          isFinalStep: false,
        })
      })
    })
    if (combined.length === 0) return
    combined[combined.length - 1] = { ...combined[combined.length - 1], isFinalStep: true }
    apply(slug, combined, 'start')
    useAlgorithmStore.getState().startPlayback()
  }

  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-border bg-surface-sunk/40 p-2 dark:border-dark-border">
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] font-semibold tracking-wider text-text-muted uppercase dark:text-dark-text-secondary">
          History ({entries.length})
        </span>
        <div className="flex items-center gap-1">
          {entries.length > 1 && (
            <button type="button" onClick={handlePlayAll} className={chipClass} title="Play all operations in sequence">
              Play all
            </button>
          )}
          <button type="button" onClick={onUndo} className={chipClass} title="Undo last operation">
            Undo
          </button>
          <button type="button" onClick={onReset} className={chipClass} title="Reset to default seed">
            Reset
          </button>
        </div>
      </div>
      <ul className="flex max-h-28 flex-col gap-1 overflow-y-auto">
        {entries.map((entry, idx) => {
          const hasJunction = entry.snapshots.some((s) => s.isPredictionRequired)
          return (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-1 rounded bg-card px-1.5 py-1 text-[11px] ring-1 ring-border dark:border-dark-border"
            >
              <span className="min-w-0 truncate font-mono text-text-primary dark:text-dark-text-primary">
                {idx + 1}. {entry.label}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    apply(slug, entry.snapshots, 'start')
                    useAlgorithmStore.getState().startPlayback()
                  }}
                  className="rounded px-1 py-0.5 text-[10px] font-medium text-text-muted hover:bg-surface-sunk hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
                  title="Play through this operation from step 1"
                >
                  Replay
                </button>
                {!classicMode && hasJunction && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('PRACTICE')
                      apply(slug, entry.snapshots, 'start')
                    }}
                    className="rounded px-1 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
                    title="Practice predicting this operation's junctions"
                  >
                    Practice
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PresetChips({
  presets,
  onSelect,
}: {
  presets: ReadonlyArray<{ label: string; onPick: () => void }>
  onSelect?: () => void
}) {
  const { restricted } = useStudyScope()
  if (restricted || presets.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => {
            p.onPick()
            onSelect?.()
          }}
          className={chipClass}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

const STACK_SEED = [5, 3, 8, 1, 9]
const QUEUE_SEED = [5, 3, 8, 1, 9]
type CQOp = { op: 'enqueue'; value: number } | { op: 'dequeue' }
const CQ_SEED: CQOp[] = [
  { op: 'enqueue', value: 5 },
  { op: 'enqueue', value: 3 },
  { op: 'dequeue' },
  { op: 'enqueue', value: 8 },
  { op: 'enqueue', value: 1 },
  { op: 'enqueue', value: 9 },
]
type DQOp =
  | { op: 'pushFront'; value: number }
  | { op: 'pushBack'; value: number }
  | { op: 'popFront' }
  | { op: 'popBack' }
const DQ_SEED: DQOp[] = [
  { op: 'pushBack', value: 5 },
  { op: 'pushFront', value: 3 },
  { op: 'popFront' },
  { op: 'pushBack', value: 8 },
]
const LL_SEED = [3, 7, 1, 9, 4, 10]
const BST_SEED = BST_DEFAULT_SEED
const AVL_SEED = [10, 20, 30, 40, 50, 25]
const RB_SEED = [10, 20, 30, 40, 50, 25]
const HASH_CHAINING_SEED = [15, 11, 27, 8, 12, 19]
const HASH_PROBING_SEED = [15, 11, 27, 8, 12]
const HEAP_SEED = HEAP_DEFAULT_SEED

function bstRootFor(values: number[]): BSTNode | null {
  const snapshots = bstInsertEngine(values)
  const last = snapshots[snapshots.length - 1]
  return (last?.dataStructureState as { root: BSTNode | null } | undefined)?.root ?? null
}

function avlRootFor(values: number[]): AVLNode | null {
  const snapshots = avlInsertEngine(values)
  const last = snapshots[snapshots.length - 1]
  return (last?.dataStructureState as { root: AVLNode | null } | undefined)?.root ?? null
}

function rbRootFor(values: number[]): RBNode | null {
  const snapshots = rbInsertEngine(values)
  const last = snapshots[snapshots.length - 1]
  return (last?.dataStructureState as { root: RBNode | null } | undefined)?.root ?? null
}

function trieRootFor(words: string[]): TrieNode {
  const snapshots = trieInsertEngine(words)
  return (snapshots[snapshots.length - 1].dataStructureState as TrieState).root
}

function extractLiveStackItems(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const items = (raw as { items?: Array<{ value: number | string }> }).items
  if (!Array.isArray(items)) return null
  return items.map((it) => Number(it.value)).filter((n) => !Number.isNaN(n))
}

function extractLiveLinearQueueItems(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const q = raw as { items?: Array<{ value: number | string; index: number }>; variant?: string }
  if (!Array.isArray(q.items)) return null
  return [...q.items]
    .sort((a, b) => a.index - b.index)
    .map((it) => Number(it.value))
    .filter((n) => !Number.isNaN(n))
}

function reconstructCqOpsFromState(raw: unknown, fallback: CQOp[]): CQOp[] {
  if (!raw || typeof raw !== 'object') return fallback
  const q = raw as {
    items?: Array<{ value: number | string; index: number }>
    frontIndex?: number
    capacity?: number
    variant?: string
  }
  if (q.variant !== 'circular' || !Array.isArray(q.items)) return fallback
  if (q.items.length === 0) return []
  const cap = q.capacity ?? 5
  const front = Math.max(0, q.frontIndex ?? 0)
  const ops: CQOp[] = []
  for (let i = 0; i < front; i++) {
    ops.push({ op: 'enqueue', value: 0 }, { op: 'dequeue' })
  }
  const byIdx = new Map(q.items.map((it) => [it.index, Number(it.value) || 0]))
  for (let k = 0; k < q.items.length; k++) {
    const idx = (front + k) % cap
    const val = byIdx.get(idx)
    if (val !== undefined) ops.push({ op: 'enqueue', value: val })
  }
  return ops
}

function extractLiveLinkedListItems(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const ll = raw as {
    nodes?: Array<{ id: string; value: number | string; nextId: string | null }>
    headId?: string | null
  }
  if (!Array.isArray(ll.nodes)) return null
  if (ll.nodes.length === 0 || !ll.headId) return []
  const byId = new Map(ll.nodes.map((n) => [n.id, n]))
  const ordered: number[] = []
  const visited = new Set<string>()
  let cur: string | null = ll.headId
  while (cur && !visited.has(cur)) {
    visited.add(cur)
    const node = byId.get(cur)
    if (!node) break
    const num = Number(node.value)
    if (!Number.isNaN(num)) ordered.push(num)
    cur = node.nextId
  }
  return ordered
}

function extractLiveHashKeys(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const ht = raw as {
    buckets?: Array<{ chain: Array<{ id: string; key: number | string }> }>
  }
  if (!Array.isArray(ht.buckets)) return null
  const entries = ht.buckets.flatMap((b) => b.chain)
  return entries
    .slice()
    .sort((a, b) => {
      const seqA = Number(String(a.id).split('-').pop()) || 0
      const seqB = Number(String(b.id).split('-').pop()) || 0
      return seqA - seqB
    })
    .map((e) => Number(e.key))
    .filter((n) => !Number.isNaN(n))
}

function extractLiveTreeValues(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object' || !('root' in raw)) return null
  const root = (raw as { root: BSTNode | null }).root
  if (!root) return []
  const result: number[] = []
  const queue: BSTNode[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node.value)
    if (node.left) queue.push(node.left)
    if (node.right) queue.push(node.right)
  }
  return result
}

function extractLiveHeapItems(raw: unknown): number[] | null {
  if (!raw || typeof raw !== 'object') return null
  const arr = (raw as { array?: number[] }).array
  return Array.isArray(arr) ? arr : null
}

function collectTrieWords(node: TrieNode | undefined, prefix = ''): string[] {
  if (!node || !(node.children instanceof Map)) return []
  const words: string[] = []
  const nextPrefix = prefix + (node.char || '')
  if (node.isTerminal && nextPrefix.length > 0) words.push(nextPrefix)
  for (const [, child] of node.children) {
    words.push(...collectTrieWords(child, nextPrefix))
  }
  return words
}

function extractLiveTrieState(raw: unknown): { words: string[]; root: TrieNode } | null {
  if (!raw || typeof raw !== 'object') return null
  const root = (raw as { root?: TrieNode }).root
  if (!root || !(root.children instanceof Map)) return null
  return { words: collectTrieWords(root), root }
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  )
}

const ARRAY_OPERATION_COPY: Record<ArrayOperation, { heading: string; action: (index: string, value: string) => string }> = {
  access: { heading: 'Access an element', action: (i) => `Access arr[${i || '?'}]` },
  insert: { heading: 'Insert an element', action: (i, v) => `Insert ${v || '?'} at index ${i || '?'}` },
  delete: { heading: 'Delete an element', action: (i) => `Delete index ${i || '?'}` },
}

function arrayOperationRun(operation: ArrayOperation, values: number[], index: number, value: number | null) {
  if (operation === 'access') return arrayAccessEngine(values, index)
  if (operation === 'insert') return arrayInsertEngine(values, value ?? ARRAY_OPERATION_DEFAULTS.insertValue, index)
  return arrayDeleteEngine(values, index)
}

/**
 * Array Access, Insertion and Deletion: the learner picks the array, the
 * index and (for insertion) the value.
 *
 * These ran on a hardcoded index 2, value 99 and index 1, with only the
 * generic "Custom array" box beside them - so the one thing each topic is
 * about, where the operation happens, was the one thing the learner could
 * not change. Asking "what does inserting at the front cost compared with
 * the end?" had no way to be tried.
 *
 * Insert and delete refuse an index the operation can't take rather than
 * letting the engine clamp it, which would run a different operation from
 * the one the fields describe. Access accepts any whole number: an
 * out-of-bounds read is a case the engine teaches.
 */
function ArrayOperationControls({ slug }: { slug: string }) {
  const apply = useApply()
  const operation = ARRAY_OPERATION_FOR_SLUG[slug]
  const defaultValues = getAlgorithmRegistryEntry(slug)?.defaultInput ?? [10, 20, 30, 40, 50]
  const [arrayText, setArrayText] = useState(defaultValues.join(','))
  const [indexText, setIndexText] = useState(
    String(
      operation === 'access'
        ? ARRAY_OPERATION_DEFAULTS.accessIndex
        : operation === 'insert'
          ? ARRAY_OPERATION_DEFAULTS.insertIndex
          : ARRAY_OPERATION_DEFAULTS.deleteIndex,
    ),
  )
  const [valueText, setValueText] = useState(String(ARRAY_OPERATION_DEFAULTS.insertValue))
  const [error, setError] = useState<string | null>(null)

  // The end-of-run offer re-runs the topic on a new array through
  // LeftPanel; keep this box describing what is on screen when it does.
  useEffect(() => {
    function handleApplyInput(event: Event) {
      const values = (event as CustomEvent<number[]>).detail
      if (Array.isArray(values) && values.length > 0) {
        setArrayText(values.join(','))
        setError(null)
      }
    }
    window.addEventListener(APPLY_INPUT_EVENT, handleApplyInput)
    return () => window.removeEventListener(APPLY_INPUT_EVENT, handleApplyInput)
  }, [])

  if (!operation) return null
  const copy = ARRAY_OPERATION_COPY[operation]
  const parsedLength = parseArrayText(arrayText)?.length

  function show(values: number[], index: number, value: number | null) {
    const snapshots = arrayOperationRun(operation, values, index, value)
    // useApply keeps Code Mode applied, as it does for every control.
    apply(slug, snapshots, 'start')
  }

  function run() {
    const result = validateArrayOperation(operation, arrayText, indexText, valueText)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    show(result.values, result.index, result.value)
  }

  function handleRandom() {
    const { values, index, value } = randomArrayOperation(operation)
    setArrayText(values.join(','))
    setIndexText(String(index))
    if (value !== null) setValueText(String(value))
    setError(null)
    show(values, index, value)
  }

  const onEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') run()
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>{copy.heading}</h3>
      <div className="flex flex-col gap-1">
        <label htmlFor="array-op-values" className={labelClass}>
          Array
        </label>
        <input
          id="array-op-values"
          type="text"
          inputMode="numeric"
          value={arrayText}
          onChange={(e) => setArrayText(e.target.value)}
          onKeyDown={onEnter}
          placeholder="10,20,30,40,50"
          className={inputClass}
        />
      </div>
      <div className={operation === 'insert' ? 'grid grid-cols-2 gap-2' : 'flex flex-col'}>
        <div className="flex flex-col gap-1">
          <label htmlFor="array-op-index" className={labelClass}>
            Index
          </label>
          <input
            id="array-op-index"
            type="number"
            step={1}
            value={indexText}
            onChange={(e) => setIndexText(e.target.value)}
            onKeyDown={onEnter}
            aria-describedby="array-op-index-hint"
            className={inputClass}
          />
        </div>
        {operation === 'insert' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="array-op-value" className={labelClass}>
              Value
            </label>
            <input
              id="array-op-value"
              type="number"
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              onKeyDown={onEnter}
              className={inputClass}
            />
          </div>
        )}
      </div>
      {parsedLength !== undefined && (
        <p id="array-op-index-hint" className="text-micro font-normal text-text-muted dark:text-dark-text-secondary">
          {indexHint(operation, parsedLength)}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
      <Button variant="outline" size="sm" onClick={run}>
        {copy.action(indexText.trim(), valueText.trim())}
      </Button>
      <Button variant="outline" size="sm" onClick={handleRandom}>
        Random
      </Button>
    </section>
  )
}

function StackControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const [value, setValue] = useState('7')
  const [items, setItems] = useState<number[]>(STACK_SEED)
  const [history, setHistory] = useState<HistoryEntry<number[]>[]>([])

  const activeItems = extractLiveStackItems(currentSnapshot?.dataStructureState) ?? items

  function record(label: string, nextItems: number[], snapshots: AlgorithmSnapshot[]) {
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots, prevState: activeItems }])
    setItems(nextItems)
    apply(slug, snapshots)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setItems(last.prevState)
    const prevSnaps = nextHist[nextHist.length - 1]?.snapshots ?? stackPushEngine([], last.prevState, 6)
    apply(slug, prevSnaps)
  }

  function handleReset(seed: number[] = STACK_SEED) {
    setHistory([])
    setItems(seed)
    apply(slug, stackPushEngine([], seed, 6))
  }

  const num = Number(value) || 0

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Stack operations (size {activeItems.length}/6)</h3>
      <PresetChips
        presets={[
          { label: 'Default', onPick: () => handleReset(STACK_SEED) },
          { label: 'Full (6/6)', onPick: () => handleReset([2, 4, 6, 8, 10, 12]) },
          { label: 'Empty', onPick: () => handleReset([]) },
        ]}
      />
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const snaps = stackPushEngine(activeItems, [num], 6)
            const next = activeItems.length < 6 ? [...activeItems, num] : activeItems
            record(`push(${num})`, next, snaps)
          }}
        >
          Push
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const snaps = stackPopEngine(activeItems, 1)
            const next = activeItems.slice(0, -1)
            record('pop()', next, snaps)
          }}
        >
          Pop
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => record('peek()', activeItems, stackPeekEngine(activeItems))}
        >
          Peek
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function QueueControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const [value, setValue] = useState('7')
  const isCircular = slug === 'circular-queue'
  const [linearItems, setLinearItems] = useState<number[]>(QUEUE_SEED)
  const [cqOps, setCqOps] = useState<CQOp[]>(CQ_SEED)
  const [history, setHistory] = useState<HistoryEntry<{ linear: number[]; cq: CQOp[] }>[]>([])

  const activeLinearItems = extractLiveLinearQueueItems(currentSnapshot?.dataStructureState) ?? linearItems
  const activeCqOps = isCircular ? reconstructCqOpsFromState(currentSnapshot?.dataStructureState, cqOps) : cqOps
  const liveCapacity = (currentSnapshot?.dataStructureState as { capacity?: number } | undefined)?.capacity ?? (isCircular ? 5 : 6)

  const num = Number(value) || 0

  function handleEnqueue() {
    if (isCircular) {
      const nextOps: CQOp[] = [...activeCqOps, { op: 'enqueue', value: num }]
      const snaps = circularQueueEngine(5, nextOps)
      setHistory((h) => [
        ...h,
        { id: `${Date.now()}-${h.length}`, label: `enqueue(${num})`, snapshots: snaps, prevState: { linear: activeLinearItems, cq: activeCqOps } },
      ])
      setCqOps(nextOps)
      apply(slug, snaps)
    } else {
      const snaps = queueEnqueueEngine(activeLinearItems, [num], 6)
      const next = activeLinearItems.length < 6 ? [...activeLinearItems, num] : activeLinearItems
      setHistory((h) => [
        ...h,
        { id: `${Date.now()}-${h.length}`, label: `enqueue(${num})`, snapshots: snaps, prevState: { linear: activeLinearItems, cq: activeCqOps } },
      ])
      setLinearItems(next)
      apply(slug, snaps)
    }
  }

  function handleDequeue() {
    if (isCircular) {
      const nextOps: CQOp[] = [...activeCqOps, { op: 'dequeue' }]
      const snaps = circularQueueEngine(5, nextOps)
      setHistory((h) => [
        ...h,
        { id: `${Date.now()}-${h.length}`, label: 'dequeue()', snapshots: snaps, prevState: { linear: activeLinearItems, cq: activeCqOps } },
      ])
      setCqOps(nextOps)
      apply(slug, snaps)
    } else {
      const snaps = queueDequeueEngine(activeLinearItems, 1)
      const next = activeLinearItems.slice(1)
      setHistory((h) => [
        ...h,
        { id: `${Date.now()}-${h.length}`, label: 'dequeue()', snapshots: snaps, prevState: { linear: activeLinearItems, cq: activeCqOps } },
      ])
      setLinearItems(next)
      apply(slug, snaps)
    }
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setLinearItems(last.prevState.linear)
    setCqOps(last.prevState.cq)
    const fallback = isCircular
      ? circularQueueEngine(5, last.prevState.cq)
      : queueEnqueueEngine([], last.prevState.linear, 6)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? fallback)
  }

  function handleReset() {
    setHistory([])
    setLinearItems(QUEUE_SEED)
    setCqOps(CQ_SEED)
    apply(slug, isCircular ? circularQueueEngine(5, CQ_SEED) : queueEnqueueEngine([], QUEUE_SEED, 6))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>
        {isCircular ? 'Circular queue' : 'Queue'} operations (size {activeLinearItems.length}/{liveCapacity})
      </h3>
      <PresetChips
        presets={
          isCircular
            ? [
                { label: 'Wrap-around', onPick: handleReset },
                {
                  label: 'Full ring',
                  onPick: () => {
                    const full: CQOp[] = [10, 20, 30, 40, 50].map((v) => ({ op: 'enqueue', value: v }))
                    setHistory([])
                    setCqOps(full)
                    apply(slug, circularQueueEngine(5, full))
                  },
                },
                {
                  label: 'Empty',
                  onPick: () => {
                    setHistory([])
                    setCqOps([])
                    apply(slug, circularQueueEngine(5, []))
                  },
                },
              ]
            : [
                { label: 'Default', onPick: handleReset },
                {
                  label: 'Full (6/6)',
                  onPick: () => {
                    const full = [2, 4, 6, 8, 10, 12]
                    setHistory([])
                    setLinearItems(full)
                    apply(slug, queueEnqueueEngine([], full, 6))
                  },
                },
                {
                  label: 'Empty',
                  onPick: () => {
                    setHistory([])
                    setLinearItems([])
                    apply(slug, queueEnqueueEngine([], [], 6))
                  },
                },
              ]
        }
      />
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="outline" size="sm" onClick={handleEnqueue}>
          Enqueue
        </Button>
        <Button variant="outline" size="sm" onClick={handleDequeue}>
          Dequeue
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={handleReset} />
    </section>
  )
}

function DequeControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const [value, setValue] = useState('7')
  const [ops, setOps] = useState<DQOp[]>(DQ_SEED)
  const [history, setHistory] = useState<HistoryEntry<DQOp[]>[]>([])

  const liveDequeValues = extractLiveLinearQueueItems(currentSnapshot?.dataStructureState)
  const activeOps: DQOp[] =
    liveDequeValues !== null
      ? liveDequeValues.map((v) => ({ op: 'pushBack', value: v }))
      : ops

  const run = (op: 'pushFront' | 'pushBack' | 'popFront' | 'popBack') => {
    const num = Number(value) || 0
    const nextOp: DQOp = op === 'pushFront' || op === 'pushBack' ? { op, value: num } : { op }
    const nextOps = [...activeOps, nextOp]
    const snaps = dequeEngine(5, nextOps)
    const label = op === 'pushFront' || op === 'pushBack' ? `${op}(${num})` : `${op}()`
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots: snaps, prevState: activeOps }])
    setOps(nextOps)
    apply(slug, snaps)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setOps(last.prevState)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? dequeEngine(5, last.prevState))
  }

  function handleReset(seed: DQOp[] = DQ_SEED) {
    setHistory([])
    setOps(seed)
    apply(slug, dequeEngine(5, seed))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Deque operations (size {liveDequeValues?.length ?? 0}/5)</h3>
      <PresetChips
        presets={[
          { label: 'Default', onPick: () => handleReset(DQ_SEED) },
          {
            label: 'Alternating ends',
            onPick: () =>
              handleReset([
                { op: 'pushBack', value: 10 },
                { op: 'pushFront', value: 20 },
                { op: 'pushBack', value: 30 },
                { op: 'pushFront', value: 40 },
              ]),
          },
          { label: 'Empty', onPick: () => handleReset([]) },
        ]}
      />
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="outline" size="sm" onClick={() => run('pushFront')}>
          Push Front
        </Button>
        <Button variant="outline" size="sm" onClick={() => run('popFront')}>
          Pop Front
        </Button>
        <Button variant="outline" size="sm" onClick={() => run('pushBack')}>
          Push Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => run('popBack')}>
          Pop Back
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function LinkedListControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const [value, setValue] = useState('7')
  const [items, setItems] = useState<number[]>(LL_SEED)
  const [history, setHistory] = useState<HistoryEntry<number[]>[]>([])
  const target = Number(value) || 0

  const activeItems = extractLiveLinkedListItems(currentSnapshot?.dataStructureState) ?? items

  function record(label: string, nextItems: number[], snapshots: AlgorithmSnapshot[], landOn: 'start' | 'result' = 'result') {
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots, prevState: activeItems }])
    setItems(nextItems)
    apply(slug, snapshots, landOn)
  }

  function rebuildSeed(seed: number[]) {
    if (slug === 'circular-linked-list') {
      return seed.length > 0 ? cllInsertEngine(seed.slice(0, -1), seed[seed.length - 1]) : cllTraverseEngine([])
    }
    if (slug === 'doubly-linked-list') {
      return seed.length > 0 ? dllInsertBackEngine(seed.slice(0, -1), seed[seed.length - 1]) : dllSearchEngine([], 0)
    }
    return seed.length > 0 ? sllInsertBackEngine(seed.slice(0, -1), seed[seed.length - 1]) : sllSearchEngine([], 0)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setItems(last.prevState)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? rebuildSeed(last.prevState))
  }

  function handleReset(seed: number[] = LL_SEED) {
    setHistory([])
    setItems(seed)
    apply(slug, rebuildSeed(seed))
  }

  if (slug === 'circular-linked-list') {
    return (
      <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
        <h3 className={labelClass}>Circular list ({activeItems.length} nodes)</h3>
        <PresetChips
          presets={[
            { label: 'Default', onPick: () => handleReset(LL_SEED) },
            { label: 'Single node', onPick: () => handleReset([42]) },
            { label: 'Empty', onPick: () => handleReset([]) },
          ]}
        />
        <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => record(`insert(${target})`, [...activeItems, target], cllInsertEngine(activeItems, target))}
          >
            Insert
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const idx = activeItems.indexOf(target)
              const next = idx >= 0 ? [...activeItems.slice(0, idx), ...activeItems.slice(idx + 1)] : activeItems
              record(`delete(${target})`, next, cllDeleteEngine(activeItems, target))
            }}
          >
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => record('traverse()', activeItems, cllTraverseEngine(activeItems), 'start')}
          >
            Traverse
          </Button>
        </div>
        <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
      </section>
    )
  }

  const isDoubly = slug === 'doubly-linked-list'
  const insertFront = isDoubly ? dllInsertFrontEngine : sllInsertFrontEngine
  const insertBack = isDoubly ? dllInsertBackEngine : sllInsertBackEngine
  const del = isDoubly ? dllDeleteEngine : sllDeleteEngine
  const search = isDoubly ? dllSearchEngine : sllSearchEngine

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>{isDoubly ? 'Doubly' : 'Singly'} list ({activeItems.length} nodes)</h3>
      <PresetChips
        presets={[
          { label: 'Default', onPick: () => handleReset(LL_SEED) },
          { label: 'Single node', onPick: () => handleReset([42]) },
          { label: 'Empty', onPick: () => handleReset([]) },
        ]}
      />
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => record(`insertFront(${target})`, [target, ...activeItems], insertFront(activeItems, target))}
        >
          Insert Front
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => record(`insertBack(${target})`, [...activeItems, target], insertBack(activeItems, target))}
        >
          Insert Back
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const idx = activeItems.indexOf(target)
            const next = idx >= 0 ? [...activeItems.slice(0, idx), ...activeItems.slice(idx + 1)] : activeItems
            record(`delete(${target})`, next, del(activeItems, target))
          }}
        >
          Delete
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => record(`search(${target})`, activeItems, search(activeItems, target), 'start')}
        >
          Search
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function HashTableControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const isProbing = slug === 'hash-table-probing'
  const defaultKeys = isProbing ? HASH_PROBING_SEED : HASH_CHAINING_SEED
  const [key, setKey] = useState('27')
  const [keys, setKeys] = useState<number[]>(defaultKeys)
  const [history, setHistory] = useState<HistoryEntry<number[]>[]>([])

  const activeKeys = extractLiveHashKeys(currentSnapshot?.dataStructureState) ?? keys

  const insert = isProbing ? hashInsertLinearProbingEngine : hashInsertChainingEngine
  const search = isProbing ? hashSearchLinearProbingEngine : hashSearchChainingEngine
  const del = isProbing ? hashDeleteLinearProbingEngine : hashDeleteChainingEngine
  const keyNum = Number(key) || 0

  function record(label: string, nextKeys: number[], snapshots: AlgorithmSnapshot[], landOn: 'start' | 'result' = 'result') {
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots, prevState: activeKeys }])
    setKeys(nextKeys)
    apply(slug, snapshots, landOn)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setKeys(last.prevState)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? insert(last.prevState, 7))
  }

  function handleReset(seed: number[] = defaultKeys) {
    setHistory([])
    setKeys(seed)
    apply(slug, insert(seed, 7))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Hash table (m = 7, n = {activeKeys.length})</h3>
      <PresetChips
        presets={[
          { label: 'Default', onPick: () => handleReset(defaultKeys) },
          { label: 'All collide (mod 7)', onPick: () => handleReset([7, 14, 21, 28]) },
          { label: 'High load (6/7)', onPick: () => handleReset([10, 18, 25, 32, 4, 11]) },
        ]}
      />
      <NumberField label="Key" value={key} onChange={setKey} min={1} max={99} />
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const canInsert = !isProbing || activeKeys.length < 7
            const next = canInsert && !activeKeys.includes(keyNum) ? [...activeKeys, keyNum] : activeKeys
            record(`insert(${keyNum})`, next, insert([...activeKeys, keyNum], 7))
          }}
        >
          Insert
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => record(`search(${keyNum})`, activeKeys, search(activeKeys, keyNum, 7), 'start')}
        >
          Search
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = activeKeys.filter((k) => k !== keyNum)
            record(`delete(${keyNum})`, next, del(activeKeys, keyNum, 7))
          }}
        >
          Delete
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function RecursionControls({ slug }: { slug: string }) {
  const apply = useApply()
  const { restricted } = useStudyScope()
  const isFib = slug === 'recursion-fibonacci'
  const [n, setN] = useState('6')
  const [memoize, setMemoize] = useState(false)

  function runWith(nextN: number, nextMemo: boolean) {
    const clamped = Math.min(isFib ? 8 : 10, Math.max(1, nextN || 1))
    apply(slug, isFib ? fibonacciEngine(clamped, { memoize: nextMemo }) : factorialEngine(clamped), 'start')
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Recursion input</h3>
      {isFib && !restricted && (
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Execution strategy</span>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-sunk/50 p-0.5 dark:border-dark-border">
            <button
              type="button"
              onClick={() => {
                setMemoize(false)
                runWith(Number(n), false)
              }}
              className={cn(
                'rounded px-2 py-1 text-[11px] font-medium transition-colors',
                !memoize
                  ? 'bg-card text-text-primary shadow-sm dark:text-dark-text-primary'
                  : 'text-text-muted hover:text-text-primary dark:text-dark-text-secondary',
              )}
            >
              Naive O(2^n)
            </button>
            <button
              type="button"
              onClick={() => {
                setMemoize(true)
                runWith(Number(n), true)
              }}
              className={cn(
                'rounded px-2 py-1 text-[11px] font-medium transition-colors',
                memoize
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary dark:text-dark-text-secondary',
              )}
            >
              Memoized O(n)
            </button>
          </div>
        </div>
      )}
      <NumberField label={isFib ? 'n (1-8)' : 'n (1-10)'} value={n} onChange={setN} min={1} max={isFib ? 8 : 10} />
      <Button variant="outline" size="sm" onClick={() => runWith(Number(n), memoize)}>
        Run
      </Button>
    </section>
  )
}

function TwoPointerControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [arrayInput, setArrayInput] = useState('1,2,4,6,8,10,12')
  const [target, setTarget] = useState('14')
  const [error, setError] = useState<string | null>(null)

  function run(rawArray = arrayInput, rawTarget = target) {
    const values = parseArrayInput(rawArray)
    if (!values) {
      setError('Enter a comma-separated list of numbers, e.g. 1,2,4,6,8')
      return
    }
    setError(null)
    apply(slug, twoSumSortedEngine([...values].sort((a, b) => a - b), Number(rawTarget) || 0), 'start')
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Two-pointer input</h3>
      <PresetChips
        presets={[
          {
            label: 'Ends meet',
            onPick: () => {
              setArrayInput('1,2,4,6,8,10,12')
              setTarget('13')
              run('1,2,4,6,8,10,12', '13')
            },
          },
          {
            label: 'No pair',
            onPick: () => {
              setArrayInput('2,5,8,11,14')
              setTarget('99')
              run('2,5,8,11,14', '99')
            },
          },
        ]}
      />
      <input
        type="text"
        value={arrayInput}
        onChange={(e) => setArrayInput(e.target.value)}
        placeholder="1,2,4,6,8,10,12"
        className={inputClass}
      />
      <NumberField label="Target sum" value={target} onChange={setTarget} />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={() => run()}>
        Apply
      </Button>
    </section>
  )
}

function SlidingWindowControls({ slug }: { slug: string }) {
  const apply = useApply()
  const isFixed = slug === 'sliding-window-fixed'
  const [arrayInput, setArrayInput] = useState(isFixed ? '2,1,5,1,3,2,4,1' : '2,3,1,2,4,3')
  const [param, setParam] = useState(isFixed ? '3' : '7')
  const [error, setError] = useState<string | null>(null)

  function run(values: number[]) {
    const paramNum = Number(param) || 0
    apply(slug, isFixed ? fixedWindowEngine(values, paramNum) : variableWindowEngine(values, paramNum), 'start')
  }

  function handleApply() {
    const values = parseArrayInput(arrayInput)
    if (!values) {
      setError('Enter a comma-separated list of numbers, e.g. 2,3,1,2,4,3')
      return
    }
    setError(null)
    run(values)
  }

  function handleRandom() {
    const length = Math.floor(Math.random() * 4) + 5
    const values = Array.from({ length }, () => Math.floor(Math.random() * 9) + 1)
    setArrayInput(values.join(','))
    setError(null)
    run(values)
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Input array</h3>
      <input
        type="text"
        value={arrayInput}
        onChange={(e) => setArrayInput(e.target.value)}
        placeholder="2,3,1,2,4,3"
        className={inputClass}
      />
      <NumberField label={isFixed ? 'Window size (k)' : 'Target sum'} value={param} onChange={setParam} />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={handleApply}>
        Apply
      </Button>
      <Button variant="outline" size="sm" onClick={handleRandom}>
        Random
      </Button>
    </section>
  )
}

function SearchControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [arrayInput, setArrayInput] = useState('1,3,5,7,9,12,15,18,21,25')
  const [target, setTarget] = useState('15')
  const [error, setError] = useState<string | null>(null)

  const engine =
    slug === 'jump-search' ? jumpSearchEngine : slug === 'interpolation-search' ? interpolationSearchEngine : exponentialSearchEngine

  function run(rawArray = arrayInput, rawTarget = target) {
    const values = parseArrayInput(rawArray)
    if (!values) {
      setError('Enter a comma-separated, sorted list of numbers, e.g. 1,3,5,7,9')
      return
    }
    setError(null)
    apply(slug, engine([...values].sort((a, b) => a - b), Number(rawTarget) || 0), 'start')
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Sorted input array</h3>
      <PresetChips
        presets={[
          {
            label: 'Uniform',
            onPick: () => {
              setArrayInput('10,20,30,40,50,60,70,80')
              setTarget('60')
              run('10,20,30,40,50,60,70,80', '60')
            },
          },
          {
            label: 'Exponential skew',
            onPick: () => {
              setArrayInput('1,2,4,8,16,32,64,128,256')
              setTarget('64')
              run('1,2,4,8,16,32,64,128,256', '64')
            },
          },
          {
            label: 'Missing target',
            onPick: () => {
              setArrayInput('1,3,5,7,9,12,15,18')
              setTarget('14')
              run('1,3,5,7,9,12,15,18', '14')
            },
          },
        ]}
      />
      <input
        type="text"
        value={arrayInput}
        onChange={(e) => setArrayInput(e.target.value)}
        placeholder="1,3,5,7,9,12,15"
        className={inputClass}
      />
      <NumberField label="Target" value={target} onChange={setTarget} />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={() => run()}>
        Apply
      </Button>
    </section>
  )
}

function BSTControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const { restricted } = useStudyScope()
  const defaultValue =
    slug === 'bst-search'
      ? String(BST_DEFAULT_SEARCH_TARGET)
      : slug === 'bst-delete'
        ? String(BST_DEFAULT_DELETE_TARGET)
        : String(BST_DEFAULT_INSERT_VALUE)
  const [value, setValue] = useState(defaultValue)
  const [treeValues, setTreeValues] = useState<number[]>(BST_SEED)
  const [history, setHistory] = useState<HistoryEntry<number[]>[]>([])
  const target = Number(value) || 0

  const activeValues = extractLiveTreeValues(currentSnapshot?.dataStructureState) ?? treeValues
  const liveRoot = (currentSnapshot?.dataStructureState as { root?: BSTNode | null } | undefined)?.root

  // Study participants on 'bst' get deterministic study controls without
  // mutating the underlying seed across runs.
  if (restricted) {
    return (
      <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
        <h3 className={labelClass}>BST insert</h3>
        <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            apply(
              slug,
              bstInsertEngine([...BST_SEED, target], {
                withCompletionCheck: slug === 'bst',
                withComplexityPrediction: slug === 'bst' && complexityJunctionEnabled(),
              }),
            )
          }
        >
          Insert
        </Button>
      </section>
    )
  }

  function record(label: string, nextVals: number[], snapshots: AlgorithmSnapshot[], landOn: 'start' | 'result' = 'result') {
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots, prevState: activeValues }])
    setTreeValues(nextVals)
    apply(slug, snapshots, landOn)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setTreeValues(last.prevState)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? bstInsertEngine(last.prevState))
  }

  function handleReset(seed: number[] = BST_SEED) {
    setHistory([])
    setTreeValues(seed)
    apply(
      slug,
      bstInsertEngine(seed, {
        withCompletionCheck: slug === 'bst',
        withComplexityPrediction: slug === 'bst' && complexityJunctionEnabled(),
      }),
    )
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>BST sandbox ({activeValues.length} nodes)</h3>
      <PresetChips
        presets={[
          { label: 'Balanced', onPick: () => handleReset(BST_SEED) },
          { label: 'Right-skewed', onPick: () => handleReset([2, 4, 6, 8, 10]) },
          { label: 'Zig-zag', onPick: () => handleReset([16, 4, 14, 6, 12, 8]) },
        ]}
      />
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = [...activeValues, target]
            record(
              `insert(${target})`,
              next,
              bstInsertEngine(next, {
                withCompletionCheck: slug === 'bst',
                withComplexityPrediction: slug === 'bst' && complexityJunctionEnabled(),
              }),
            )
          }}
        >
          Insert
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            record(`search(${target})`, activeValues, bstSearchEngine(liveRoot !== undefined ? liveRoot : bstRootFor(activeValues), target), 'start')
          }
        >
          Search
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const idx = activeValues.indexOf(target)
            const next = idx >= 0 ? [...activeValues.slice(0, idx), ...activeValues.slice(idx + 1)] : activeValues
            record(`delete(${target})`, next, bstDeleteEngine(liveRoot !== undefined ? liveRoot : bstRootFor(activeValues), target))
          }}
        >
          Delete
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function AVLControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const isDelete = slug === 'avl-delete'
  const [value, setValue] = useState(isDelete ? '30' : '7')
  const [treeValues, setTreeValues] = useState<number[]>(AVL_SEED)
  const [history, setHistory] = useState<HistoryEntry<number[]>[]>([])
  const target = Number(value) || 0

  const activeValues = extractLiveTreeValues(currentSnapshot?.dataStructureState) ?? treeValues
  const liveRoot = (currentSnapshot?.dataStructureState as { root?: AVLNode | null } | undefined)?.root

  function record(label: string, nextVals: number[], snapshots: AlgorithmSnapshot[]) {
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots, prevState: activeValues }])
    setTreeValues(nextVals)
    apply(slug, snapshots)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setTreeValues(last.prevState)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? avlInsertEngine(last.prevState))
  }

  function handleReset(seed: number[] = AVL_SEED) {
    setHistory([])
    setTreeValues(seed)
    apply(slug, avlInsertEngine(seed))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>AVL tree ({activeValues.length} nodes)</h3>
      <PresetChips
        presets={[
          { label: 'Default', onPick: () => handleReset(AVL_SEED) },
          { label: 'LL case (30,20,10)', onPick: () => handleReset([30, 20, 10]) },
          { label: 'RR case (10,20,30)', onPick: () => handleReset([10, 20, 30]) },
          { label: 'LR case (30,10,20)', onPick: () => handleReset([30, 10, 20]) },
          { label: 'RL case (10,30,20)', onPick: () => handleReset([10, 30, 20]) },
        ]}
      />
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = [...activeValues, target]
            record(`insert(${target})`, next, avlInsertEngine(next))
          }}
        >
          Insert
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const idx = activeValues.indexOf(target)
            const next = idx >= 0 ? [...activeValues.slice(0, idx), ...activeValues.slice(idx + 1)] : activeValues
            record(`delete(${target})`, next, avlDeleteEngine(liveRoot !== undefined ? liveRoot : avlRootFor(activeValues), target))
          }}
        >
          Delete
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function RBControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const isDelete = slug === 'rb-delete'
  const [value, setValue] = useState(isDelete ? '30' : '7')
  const [treeValues, setTreeValues] = useState<number[]>(RB_SEED)
  const [history, setHistory] = useState<HistoryEntry<number[]>[]>([])
  const target = Number(value) || 0

  const activeValues = extractLiveTreeValues(currentSnapshot?.dataStructureState) ?? treeValues
  const liveRoot = (currentSnapshot?.dataStructureState as { root?: RBNode | null } | undefined)?.root

  function record(label: string, nextVals: number[], snapshots: AlgorithmSnapshot[]) {
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots, prevState: activeValues }])
    setTreeValues(nextVals)
    apply(slug, snapshots)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setTreeValues(last.prevState)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? rbInsertEngine(last.prevState))
  }

  function handleReset(seed: number[] = RB_SEED) {
    setHistory([])
    setTreeValues(seed)
    apply(slug, rbInsertEngine(seed))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Red-black tree ({activeValues.length} nodes)</h3>
      <PresetChips
        presets={[
          { label: 'Default', onPick: () => handleReset(RB_SEED) },
          { label: 'Ascending 1..7', onPick: () => handleReset([1, 2, 3, 4, 5, 6, 7]) },
          { label: 'Red uncle recolour', onPick: () => handleReset([20, 10, 30, 5]) },
        ]}
      />
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = activeValues.includes(target) ? activeValues : [...activeValues, target]
            record(`insert(${target})`, next, rbInsertEngine(next))
          }}
        >
          Insert
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const idx = activeValues.indexOf(target)
            const next = idx >= 0 ? [...activeValues.slice(0, idx), ...activeValues.slice(idx + 1)] : activeValues
            record(`delete(${target})`, next, rbDeleteEngine(liveRoot !== undefined ? liveRoot : rbRootFor(activeValues), target))
          }}
        >
          Delete
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function HeapControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const [value, setValue] = useState(String(HEAP_DEFAULT_INSERT_VALUE))
  const isMax = slug.startsWith('max-heap')
  const heapType = isMax ? 'max' : 'min'
  const insertEngine = isMax ? maxHeapInsertEngine : minHeapInsertEngine
  const deleteEngine = isMax ? maxHeapDeleteEngine : minHeapDeleteEngine
  const [items, setItems] = useState<number[]>(() => buildHeapArray(heapType, HEAP_SEED))
  const [history, setHistory] = useState<HistoryEntry<number[]>[]>([])
  const target = Number(value) || 0

  const activeItems = extractLiveHeapItems(currentSnapshot?.dataStructureState) ?? items

  function record(label: string, nextItems: number[], snapshots: AlgorithmSnapshot[]) {
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots, prevState: activeItems }])
    setItems(nextItems)
    apply(slug, snapshots)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setItems(last.prevState)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? insertEngine(last.prevState))
  }

  function handleReset(seed: number[] = HEAP_SEED) {
    const built = buildHeapArray(heapType, seed)
    setHistory([])
    setItems(built)
    apply(slug, insertEngine(seed))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>{isMax ? 'Max-heap' : 'Min-heap'} ({activeItems.length} items)</h3>
      <PresetChips
        presets={[
          { label: 'Default', onPick: () => handleReset(HEAP_SEED) },
          { label: 'Reverse order', onPick: () => handleReset(isMax ? [2, 5, 9, 14, 21, 30] : [30, 21, 14, 9, 5, 2]) },
        ]}
      />
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const snaps = insertEngine([...activeItems, target])
            const finalHeap =
              (snaps[snaps.length - 1]?.dataStructureState as { array?: number[] } | undefined)?.array ??
              buildHeapArray(heapType, [...activeItems, target])
            record(`insert(${target})`, finalHeap, snaps)
          }}
        >
          Insert
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const snaps = deleteEngine(activeItems)
            const finalHeap =
              (snaps[snaps.length - 1]?.dataStructureState as { array?: number[] } | undefined)?.array ??
              activeItems.slice(1)
            record('extractRoot()', finalHeap, snaps)
          }}
        >
          Extract Root
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function TrieControls({ slug }: { slug: string }) {
  const apply = useApply()
  const currentSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const [word, setWord] = useState('apple')
  const [words, setWords] = useState<string[]>(DEFAULT_TRIE_WORDS)
  const [history, setHistory] = useState<HistoryEntry<string[]>[]>([])
  const [error, setError] = useState<string | null>(null)

  const liveTrie = extractLiveTrieState(currentSnapshot?.dataStructureState)
  const activeWords = liveTrie?.words ?? words
  const activeRoot = liveTrie?.root ?? trieRootFor(activeWords)

  function validateWord(): string | null {
    const cleaned = word.trim().toLowerCase()
    if (!/^[a-z]+$/.test(cleaned)) {
      setError('Enter a word using letters only, e.g. apple')
      return null
    }
    setError(null)
    return cleaned
  }

  function record(label: string, nextWords: string[], snapshots: AlgorithmSnapshot[], landOn: 'start' | 'result' = 'result') {
    setHistory((h) => [...h, { id: `${Date.now()}-${h.length}`, label, snapshots, prevState: activeWords }])
    setWords(nextWords)
    apply(slug, snapshots, landOn)
  }

  function handleUndo() {
    const last = history[history.length - 1]
    if (!last) return
    const nextHist = history.slice(0, -1)
    setHistory(nextHist)
    setWords(last.prevState)
    apply(slug, nextHist[nextHist.length - 1]?.snapshots ?? trieInsertEngine(last.prevState))
  }

  function handleReset(seed: string[] = DEFAULT_TRIE_WORDS) {
    setHistory([])
    setWords(seed)
    apply(slug, trieInsertEngine(seed))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Trie ({activeWords.length} words)</h3>
      <PresetChips
        presets={[
          { label: 'Default', onPick: () => handleReset(DEFAULT_TRIE_WORDS) },
          { label: 'Shared prefix', onPick: () => handleReset(['car', 'card', 'care', 'cart']) },
        ]}
      />
      <input
        type="text"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="e.g. apple"
        className={inputClass}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const w = validateWord()
            if (!w) return
            const next = activeWords.includes(w) ? activeWords : [...activeWords, w]
            record(`insert(${w})`, next, trieInsertEngine([...activeWords, w]))
          }}
        >
          Insert
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const w = validateWord()
            if (!w) return
            record(`search(${w})`, activeWords, trieSearchEngine(activeRoot, w), 'start')
          }}
        >
          Search
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const w = validateWord()
            if (!w) return
            const next = activeWords.filter((item) => item !== w)
            record(`delete(${w})`, next, trieDeleteEngine(activeRoot, w))
          }}
        >
          Delete
        </Button>
      </div>
      <OperationHistoryTape slug={slug} entries={history} onUndo={handleUndo} onReset={() => handleReset()} />
    </section>
  )
}

function TreeTraversalControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [arrayInput, setArrayInput] = useState(BST_SEED.join(','))
  const [error, setError] = useState<string | null>(null)

  const engine =
    slug === 'tree-preorder'
      ? preorderEngine
      : slug === 'tree-postorder'
        ? postorderEngine
        : slug === 'tree-level-order'
          ? levelorderEngine
          : inorderEngine

  function run(values: number[]) {
    apply(slug, engine(bstRootFor(values)), 'start')
  }

  function handleApply() {
    const values = parseArrayInput(arrayInput)
    if (!values) {
      setError('Enter a comma-separated list of numbers, e.g. 8,4,12,2,6,10,14')
      return
    }
    setError(null)
    run(values)
  }

  function handleRandom() {
    const length = Math.floor(Math.random() * 5) + 6
    const values = Array.from({ length }, () => Math.floor(Math.random() * 20) + 1)
    setArrayInput(values.join(','))
    setError(null)
    run(values)
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Tree values</h3>
      <PresetChips
        presets={[
          {
            label: 'Balanced',
            onPick: () => {
              setArrayInput(BST_SEED.join(','))
              run(BST_SEED)
            },
          },
          {
            label: 'Right chain',
            onPick: () => {
              setArrayInput('2,4,6,8,10')
              run([2, 4, 6, 8, 10])
            },
          },
        ]}
      />
      <input
        type="text"
        value={arrayInput}
        onChange={(e) => setArrayInput(e.target.value)}
        placeholder="8,4,12,2,6,10,14"
        className={inputClass}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={handleApply}>
        Apply
      </Button>
      <Button variant="outline" size="sm" onClick={handleRandom}>
        Random
      </Button>
    </section>
  )
}

function CountingSortControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [arrayInput, setArrayInput] = useState('4,2,2,8,3,3,1')
  const [error, setError] = useState<string | null>(null)

  function run(values: number[]) {
    apply(slug, countingSortEngine(values), 'start')
  }

  function handleApply() {
    const values = parseArrayInput(arrayInput)
    if (!values) {
      setError('Enter a comma-separated list of numbers, e.g. 4,2,8,3,1')
      return
    }
    if (values.some((v) => v < 0 || v > 9 || !Number.isInteger(v))) {
      setError('Only whole numbers from 0 to 9 are supported')
      return
    }
    setError(null)
    run(values)
  }

  function handleRandom() {
    const length = Math.floor(Math.random() * 3) + 6
    const values = Array.from({ length }, () => Math.floor(Math.random() * 10))
    setArrayInput(values.join(','))
    setError(null)
    run(values)
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Input array (0-9)</h3>
      <input
        type="text"
        value={arrayInput}
        onChange={(e) => setArrayInput(e.target.value)}
        placeholder="4,2,8,3,1"
        className={inputClass}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={handleApply}>
        Apply
      </Button>
      <Button variant="outline" size="sm" onClick={handleRandom}>
        Random
      </Button>
    </section>
  )
}

function RadixSortControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [arrayInput, setArrayInput] = useState('170,45,75,90,802,24,2,66')
  const [error, setError] = useState<string | null>(null)

  function run(values: number[]) {
    apply(slug, radixSortEngine(values), 'start')
  }

  function handleApply() {
    const values = parseArrayInput(arrayInput)
    if (!values) {
      setError('Enter a comma-separated list of numbers, e.g. 170,45,75,90')
      return
    }
    if (values.some((v) => v < 0 || v > 999 || !Number.isInteger(v))) {
      setError('Only whole numbers from 0 to 999 are supported')
      return
    }
    setError(null)
    run(values)
  }

  function handleRandom() {
    const length = Math.floor(Math.random() * 3) + 6
    const values = Array.from({ length }, () => Math.floor(Math.random() * 200) + 1)
    setArrayInput(values.join(','))
    setError(null)
    run(values)
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Input array (0-999)</h3>
      <input
        type="text"
        value={arrayInput}
        onChange={(e) => setArrayInput(e.target.value)}
        placeholder="170,45,75,90"
        className={inputClass}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={handleApply}>
        Apply
      </Button>
      <Button variant="outline" size="sm" onClick={handleRandom}>
        Random
      </Button>
    </section>
  )
}

function DP2DControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [sourceWord, setSourceWord] = useState('kitten')
  const [targetWord, setTargetWord] = useState('sitting')
  const [error, setError] = useState<string | null>(null)

  function runPair(src: string, tgt: string) {
    const s = src.trim().toLowerCase().replace(/[^a-z]/g, '')
    const t = tgt.trim().toLowerCase().replace(/[^a-z]/g, '')
    if (s.length === 0 || t.length === 0) {
      setError('Enter two words using letters a-z (1 to 9 letters each).')
      return
    }
    setError(null)
    apply(slug, dp2DWordsEngine(s, t), 'start')
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Edit distance words</h3>
      <PresetChips
        presets={[
          {
            label: 'kitten -> sitting',
            onPick: () => {
              setSourceWord('kitten')
              setTargetWord('sitting')
              runPair('kitten', 'sitting')
            },
          },
          {
            label: 'flaw -> lawn',
            onPick: () => {
              setSourceWord('flaw')
              setTargetWord('lawn')
              runPair('flaw', 'lawn')
            },
          },
          {
            label: 'sunday -> saturday',
            onPick: () => {
              setSourceWord('sunday')
              setTargetWord('saturday')
              runPair('sunday', 'saturday')
            },
          },
        ]}
      />
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Source word</label>
        <input
          type="text"
          maxLength={9}
          value={sourceWord}
          onChange={(e) => setSourceWord(e.target.value)}
          placeholder="kitten"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Target word</label>
        <input
          type="text"
          maxLength={9}
          value={targetWord}
          onChange={(e) => setTargetWord(e.target.value)}
          placeholder="sitting"
          className={inputClass}
        />
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={() => runPair(sourceWord, targetWord)}>
        Apply
      </Button>
    </section>
  )
}

function parseIntervals(raw: string): Activity[] | null {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (parts.length < 2) return null
  const out: Activity[] = []
  for (let i = 0; i < parts.length && out.length < 8; i += 1) {
    const match = /^(\d+)\s*-\s*(\d+)$/.exec(parts[i])
    if (!match) return null
    const start = Number(match[1])
    const finish = Number(match[2])
    if (finish <= start) return null
    out.push({ name: String.fromCharCode(65 + out.length), start, finish })
  }
  return out
}

function GreedyControls({ slug }: { slug: string }) {
  const apply = useApply()
  const defaultText = DEFAULT_ACTIVITIES.map((a) => `${a.start}-${a.finish}`).join(', ')
  const [intervalsInput, setIntervalsInput] = useState(defaultText)
  const [error, setError] = useState<string | null>(null)

  function runActivities(acts: Activity[]) {
    setError(null)
    setIntervalsInput(acts.map((a) => `${a.start}-${a.finish}`).join(', '))
    apply(slug, greedyActivitiesEngine(acts), 'start')
  }

  function handleApply() {
    const parsed = parseIntervals(intervalsInput)
    if (!parsed) {
      setError('Enter at least two start-finish intervals, e.g. 1-4, 3-5, 0-6, 5-7')
      return
    }
    setError(null)
    apply(slug, greedyActivitiesEngine(parsed), 'start')
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Activity intervals (start-finish)</h3>
      <PresetChips
        presets={[
          { label: 'Counterexample', onPick: () => runActivities(DEFAULT_ACTIVITIES) },
          {
            label: 'Back-to-back',
            onPick: () =>
              runActivities([
                { name: 'A', start: 0, finish: 2 },
                { name: 'B', start: 2, finish: 4 },
                { name: 'C', start: 4, finish: 6 },
                { name: 'D', start: 1, finish: 5 },
              ]),
          },
          {
            label: 'All overlap',
            onPick: () =>
              runActivities([
                { name: 'A', start: 1, finish: 8 },
                { name: 'B', start: 2, finish: 6 },
                { name: 'C', start: 3, finish: 5 },
                { name: 'D', start: 0, finish: 9 },
              ]),
          },
        ]}
      />
      <input
        type="text"
        value={intervalsInput}
        onChange={(e) => setIntervalsInput(e.target.value)}
        placeholder="1-4, 3-5, 0-6, 5-7"
        className={inputClass}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={handleApply}>
        Apply
      </Button>
    </section>
  )
}

function BacktrackingControls({ slug }: { slug: string }) {
  const apply = useApply()
  const { restricted } = useStudyScope()
  const [problem, setProblem] = useState<'subset' | 'nqueens'>('subset')
  const [candidatesInput, setCandidatesInput] = useState('3,4,5,2')
  const [boardSize, setBoardSize] = useState<'4' | '5'>('4')
  const [error, setError] = useState<string | null>(null)

  function runSubset(raw = candidatesInput) {
    const parsed = parseArrayInput(raw)
    if (!parsed || parsed.filter((v) => v > 0).length < 3) {
      setError('Enter 3 to 5 positive integers, e.g. 3,4,5,2')
      return
    }
    setError(null)
    apply(slug, backtrackingEngine(parsed), 'start')
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Backtracking problem</h3>
      {!restricted && (
        <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-sunk/50 p-0.5 dark:border-dark-border">
          <button
            type="button"
            onClick={() => {
              setProblem('subset')
              runSubset()
            }}
            className={cn(
              'rounded px-2 py-1 text-[11px] font-medium transition-colors',
              problem === 'subset'
                ? 'bg-card text-text-primary shadow-sm dark:text-dark-text-primary'
                : 'text-text-muted hover:text-text-primary dark:text-dark-text-secondary',
            )}
          >
            Subset Sum
          </button>
          <button
            type="button"
            onClick={() => {
              setProblem('nqueens')
              apply(slug, nQueensBacktrackingEngine(Number(boardSize)), 'start')
            }}
            className={cn(
              'rounded px-2 py-1 text-[11px] font-medium transition-colors',
              problem === 'nqueens'
                ? 'bg-card text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary dark:text-dark-text-secondary',
            )}
          >
            N-Queens
          </button>
        </div>
      )}

      {problem === 'nqueens' ? (
        <>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Board size</label>
            <select
              value={boardSize}
              onChange={(e) => {
                const next = e.target.value as '4' | '5'
                setBoardSize(next)
                apply(slug, nQueensBacktrackingEngine(Number(next)), 'start')
              }}
              className={inputClass}
            >
              <option value="4">4 x 4 board (2 solutions)</option>
              <option value="5">5 x 5 board (10 solutions)</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => apply(slug, nQueensBacktrackingEngine(Number(boardSize)), 'start')}
          >
            Run N-Queens
          </Button>
        </>
      ) : (
        <>
          <PresetChips
            presets={[
              {
                label: 'Default (3,4,5,2)',
                onPick: () => {
                  setCandidatesInput('3,4,5,2')
                  runSubset('3,4,5,2')
                },
              },
              {
                label: 'Heavy pruning (6,7,8,2)',
                onPick: () => {
                  setCandidatesInput('6,7,8,2')
                  runSubset('6,7,8,2')
                },
              },
            ]}
          />
          <input
            type="text"
            value={candidatesInput}
            onChange={(e) => setCandidatesInput(e.target.value)}
            placeholder="3,4,5,2"
            className={inputClass}
          />
          {error && <p className="text-xs text-error">{error}</p>}
          <Button variant="outline" size="sm" onClick={() => runSubset()}>
            Apply
          </Button>
        </>
      )}
    </section>
  )
}

const WEIGHTED_GRAPH_ALGOS = new Set(['dijkstra', 'bellman-ford', 'kruskal', 'prim'])
const NEEDS_TARGET_NODE = new Set(['bfs', 'dfs', 'dijkstra', 'bellman-ford'])
const NEEDS_START_NODE = new Set(['bfs', 'dfs', 'dijkstra', 'bellman-ford', 'prim'])
const HAS_PRESET_CHOICE = new Set([
  'bfs',
  'dfs',
  'connected-components',
  'cycle-detection',
  'dijkstra',
  'bellman-ford',
  'kruskal',
  'prim',
])
const HAS_DIRECTED_TOGGLE = new Set(['bfs', 'dfs', 'connected-components', 'cycle-detection', 'dijkstra', 'bellman-ford'])

const GRAPH_DEFAULT_PRESET: Record<string, GraphPresetName> = {
  bfs: 'small-7',
  dfs: 'small-7',
  'connected-components': 'two-components',
  'cycle-detection': 'directed-cycle',
  dijkstra: 'medium-weighted',
  'bellman-ford': 'medium-weighted',
  kruskal: 'grid-like',
  prim: 'grid-like',
}

const GRAPH_DISPLAY_NAME: Record<string, string> = {
  'small-7': 'Small (7 nodes)',
  'medium-weighted': 'Medium, weighted (8 nodes)',
  'grid-like': 'Grid-like mesh (9 nodes)',
  'directed-cycle': 'Directed, has a cycle (6 nodes)',
  'directed-acyclic': 'Directed DAG, no cycle (6 nodes)',
  'two-components': 'Two disconnected groups (8 nodes)',
}

function runGraphAlgorithm(
  slug: string,
  preset: UnweightedPreset | WeightedPreset,
  directed: boolean,
  startId: string,
  targetId: string,
): AlgorithmSnapshot[] {
  switch (slug) {
    case 'bfs':
      return bfsNodeGraphEngine(preset.nodes, preset.adjacency as never, directed, startId, targetId)
    case 'dfs':
      return dfsNodeGraphEngine(preset.nodes, preset.adjacency as never, directed, startId)
    case 'dijkstra':
      return dijkstraEngine(preset.nodes, preset.adjacency as never, directed, startId, targetId)
    case 'bellman-ford':
      return bellmanFordEngine(preset.nodes, preset.adjacency as never, directed, startId)
    case 'kruskal':
      return kruskalEngine(preset.nodes, preset.adjacency as never)
    case 'prim':
      return primEngine(preset.nodes, preset.adjacency as never, startId)
    case 'cycle-detection':
      return cycleDetectionEngine(preset.nodes, preset.adjacency as never, directed)
    case 'connected-components':
      return connectedComponentsEngine(preset.nodes, preset.adjacency as never)
    case 'topological-sort':
      return topologicalSortEngine(preset.nodes, preset.adjacency as never)
    default:
      return []
  }
}

function GraphControls({ slug }: { slug: string }) {
  const apply = useApply()
  const defaultPreset = GRAPH_DEFAULT_PRESET[slug] ?? 'small-7'
  const [presetName, setPresetName] = useState<GraphPresetName>(defaultPreset)
  const preset = GRAPH_PRESETS[presetName]
  const [directed, setDirected] = useState(preset.directed)
  const nodeIds = preset.nodes.map((n) => n.id)
  const [startId, setStartId] = useState(nodeIds[0])
  const [targetId, setTargetId] = useState(nodeIds[nodeIds.length - 1])

  const presetOptions: GraphPresetName[] = WEIGHTED_GRAPH_ALGOS.has(slug)
    ? ['medium-weighted', 'grid-like']
    : slug === 'connected-components'
      ? ['two-components', 'small-7', 'directed-cycle']
      : slug === 'cycle-detection'
        ? ['directed-cycle', 'directed-acyclic', 'small-7']
        : ['small-7', 'directed-cycle', 'directed-acyclic']

  function changePreset(name: GraphPresetName) {
    setPresetName(name)
    const nextPreset = GRAPH_PRESETS[name]
    setDirected(nextPreset.directed)
    const ids = nextPreset.nodes.map((n) => n.id)
    setStartId(ids[0])
    setTargetId(ids[ids.length - 1])
    apply(slug, runGraphAlgorithm(slug, nextPreset, nextPreset.directed, ids[0], ids[ids.length - 1]), 'start')
  }

  function run() {
    apply(slug, runGraphAlgorithm(slug, preset, directed, startId, targetId), 'start')
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Graph controls</h3>

      {HAS_PRESET_CHOICE.has(slug) ? (
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Preset graph</label>
          <select value={presetName} onChange={(e) => changePreset(e.target.value as GraphPresetName)} className={inputClass}>
            {presetOptions.map((name) => (
              <option key={name} value={name}>
                {GRAPH_DISPLAY_NAME[name]}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
          Fixed graph: {GRAPH_DISPLAY_NAME[presetName]}
        </p>
      )}

      {NEEDS_START_NODE.has(slug) && (
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Start node</label>
          <select
            value={startId}
            onChange={(e) => {
              const nextStart = e.target.value
              setStartId(nextStart)
              apply(slug, runGraphAlgorithm(slug, preset, directed, nextStart, targetId), 'start')
            }}
            className={inputClass}
          >
            {nodeIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      )}

      {NEEDS_TARGET_NODE.has(slug) && (
        <div className="flex flex-col gap-1">
          <label className={labelClass}>Target node</label>
          <select
            value={targetId}
            onChange={(e) => {
              const nextTarget = e.target.value
              setTargetId(nextTarget)
              apply(slug, runGraphAlgorithm(slug, preset, directed, startId, nextTarget), 'start')
            }}
            className={inputClass}
          >
            {nodeIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      )}

      {HAS_DIRECTED_TOGGLE.has(slug) && (
        <label className="flex items-center gap-2 text-[12px] text-text-primary dark:text-dark-text-primary">
          <input
            type="checkbox"
            checked={directed}
            onChange={(e) => {
              const nextDirected = e.target.checked
              setDirected(nextDirected)
              apply(slug, runGraphAlgorithm(slug, preset, nextDirected, startId, targetId), 'start')
            }}
          />
          Directed
        </label>
      )}

      <Button variant="outline" size="sm" onClick={run}>
        Apply
      </Button>
    </section>
  )
}

type DagPresetName = 'diamond' | 'chain' | 'courses'

const DAG_PRESETS: Record<DagPresetName, { label: string; graph: UnweightedPreset }> = {
  diamond: {
    label: 'Diamond DAG (6 nodes)',
    graph: DIRECTED_ACYCLIC,
  },
  chain: {
    label: 'Linear chain (5 nodes)',
    graph: {
      directed: true,
      nodes: [
        { id: 'A', label: 'A', x: 0.12, y: 0.5 },
        { id: 'B', label: 'B', x: 0.31, y: 0.3 },
        { id: 'C', label: 'C', x: 0.5, y: 0.5 },
        { id: 'D', label: 'D', x: 0.69, y: 0.7 },
        { id: 'E', label: 'E', x: 0.88, y: 0.5 },
      ],
      adjacency: {
        A: ['B'],
        B: ['C'],
        C: ['D'],
        D: ['E'],
        E: [],
      },
    },
  },
  courses: {
    label: 'Parallel prerequisites (6 nodes)',
    graph: {
      directed: true,
      nodes: DIRECTED_ACYCLIC.nodes,
      adjacency: {
        A: ['C', 'D'],
        B: ['D', 'E'],
        C: ['F'],
        D: ['F'],
        E: ['F'],
        F: [],
      },
    },
  },
}

function TopologicalSortControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [dagName, setDagName] = useState<DagPresetName>('diamond')

  function runDag(name: DagPresetName) {
    const dag = DAG_PRESETS[name].graph
    apply(slug, topologicalSortEngine(dag.nodes, dag.adjacency), 'start')
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Graph controls</h3>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Preset DAG</label>
        <select
          value={dagName}
          onChange={(e) => {
            const next = e.target.value as DagPresetName
            setDagName(next)
            runDag(next)
          }}
          className={inputClass}
        >
          {(Object.keys(DAG_PRESETS) as DagPresetName[]).map((name) => (
            <option key={name} value={name}>
              {DAG_PRESETS[name].label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
        Topological order only exists for a directed, acyclic graph (DAG).
      </p>
      <Button variant="outline" size="sm" onClick={() => runDag(dagName)}>
        Re-run
      </Button>
    </section>
  )
}

type GridSizeName = 'default' | 'small' | 'medium' | 'large'

type SizeOption = { label: string; rows: number; cols: number; start: [number, number]; end: [number, number] }
type Board = { readonly rows: number; readonly cols: number; readonly start?: readonly number[]; readonly end?: readonly number[] }

function sizeOptionsFor(board: Board): Record<GridSizeName, SizeOption> {
  const mid = Math.floor(board.rows / 2)
  return {
    default: {
      label: `Default (${board.rows}\u00d7${board.cols})`,
      rows: board.rows,
      cols: board.cols,
      start: [board.start?.[0] ?? mid, board.start?.[1] ?? 1] as [number, number],
      end: [board.end?.[0] ?? mid, board.end?.[1] ?? board.cols - 2] as [number, number],
    },
    small: { label: 'Small (15\u00d725)', rows: 15, cols: 25, start: [7, 2], end: [7, 22] },
    medium: { label: 'Medium (20\u00d735)', rows: 20, cols: 35, start: [10, 2], end: [10, 32] },
    large: { label: 'Large (25\u00d745)', rows: 25, cols: 45, start: [12, 2], end: [12, 42] },
  }
}

const GRID_ENGINE_FOR: Record<string, typeof gridBfsEngine> = {
  'grid-bfs': gridBfsEngine,
  'grid-dfs': gridDfsEngine,
  'grid-dijkstra': gridDijkstraEngine,
  'grid-astar': gridAStarEngine,
}

function GridControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [size, setSize] = useState<GridSizeName>('default')
  const engine = GRID_ENGINE_FOR[slug] ?? gridBfsEngine
  const options = sizeOptionsFor(slug === 'grid-astar' ? ASTAR_BOARD : PATHFINDER_BOARD)

  const buildBoard =
    slug === 'grid-astar' ? buildOpenGrid : slug === 'grid-dijkstra' ? buildTerrainGrid : buildWalledGrid

  function runOn(sizeName: GridSizeName, grid?: GridCell[][]) {
    const cfg = options[sizeName]
    apply(slug, engine(grid ?? buildBoard(cfg.rows, cfg.cols), cfg.start[0], cfg.start[1], cfg.end[0], cfg.end[1]), 'start')
  }

  function handleClearWalls() {
    const cfg = options[size]
    runOn(size, buildEmptyGrid(cfg.rows, cfg.cols))
  }

  function handleSizeChange(next: GridSizeName) {
    setSize(next)
    runOn(next)
  }

  function handleGenerateMaze() {
    const cfg = options[size]
    const mazeSnapshots = mazeGenerationEngine(cfg.rows, cfg.cols)
    const finalGrid = (mazeSnapshots[mazeSnapshots.length - 1].dataStructureState as GridAlgorithmState).grid
    runOn(size, finalGrid)
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Grid controls</h3>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Grid size</label>
        <select value={size} onChange={(e) => handleSizeChange(e.target.value as GridSizeName)} className={inputClass}>
          {(Object.keys(options) as GridSizeName[]).map((name) => (
            <option key={name} value={name}>
              {options[name].label}
            </option>
          ))}
        </select>
      </div>
      <Button variant="outline" size="sm" onClick={handleClearWalls}>
        Clear walls
      </Button>
      <Button variant="outline" size="sm" onClick={handleGenerateMaze}>
        Generate maze
      </Button>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
        Click or drag on the grid itself to paint walls - the run updates live.
      </p>
    </section>
  )
}

const MAZE_ENGINE_FOR: Record<string, typeof mazeGenerationEngine> = {
  'maze-generation': mazeGenerationEngine,
  'maze-prim': mazePrimEngine,
  'maze-kruskal': mazeKruskalEngine,
}

function MazeControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [size, setSize] = useState<GridSizeName>('default')
  const options = sizeOptionsFor(MAZE_BOARD)
  const [lastMaze, setLastMaze] = useState<GridAlgorithmState | null>(null)
  const engine = MAZE_ENGINE_FOR[slug] ?? mazeGenerationEngine

  function generate(sizeName: GridSizeName) {
    const cfg = options[sizeName]
    const snapshots = engine(cfg.rows, cfg.cols)
    setLastMaze(snapshots[snapshots.length - 1].dataStructureState as GridAlgorithmState)
    apply(slug, snapshots, 'start')
  }

  function runAStarOnMaze() {
    if (!lastMaze) return
    apply(
      slug,
      gridAStarEngine(lastMaze.grid, lastMaze.startCell[0], lastMaze.startCell[1], lastMaze.endCell[0], lastMaze.endCell[1]),
      'start',
    )
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Maze controls</h3>
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Grid size</label>
        <select
          value={size}
          onChange={(e) => {
            const next = e.target.value as GridSizeName
            setSize(next)
            generate(next)
          }}
          className={inputClass}
        >
          {(Object.keys(options) as GridSizeName[]).map((name) => (
            <option key={name} value={name}>
              {options[name].label}
            </option>
          ))}
        </select>
      </div>
      <Button variant="outline" size="sm" onClick={() => generate(size)}>
        Regenerate
      </Button>
      {lastMaze && (
        <Button variant="outline" size="sm" onClick={runAStarOnMaze}>
          Run A* on maze
        </Button>
      )}
    </section>
  )
}

/** Slugs that get a contextual controls section instead of LeftPanel's
 * generic "Custom array" box. Exported so LeftPanel can decide which
 * section to render without duplicating this list. */
export const CONTEXTUAL_CONTROL_SLUGS = new Set([
  'array-access',
  'array-insert',
  'array-delete',
  'stack',
  'queue',
  'circular-queue',
  'deque',
  'singly-linked-list',
  'doubly-linked-list',
  'circular-linked-list',
  'hash-table-chaining',
  'hash-table-probing',
  'recursion-factorial',
  'recursion-fibonacci',
  'two-pointer',
  'sliding-window-fixed',
  'sliding-window-variable',
  'jump-search',
  'interpolation-search',
  'exponential-search',
  'bfs',
  'bst',
  'bst-search',
  'bst-delete',
  'tree-inorder',
  'tree-preorder',
  'tree-postorder',
  'tree-level-order',
  'avl-insert',
  'avl-delete',
  'rb-insert',
  'rb-delete',
  'max-heap-insert',
  'max-heap-delete',
  'min-heap-insert',
  'min-heap-delete',
  'trie-insert',
  'trie-search',
  'trie-delete',
  'dfs',
  'dijkstra',
  'bellman-ford',
  'kruskal',
  'prim',
  'cycle-detection',
  'connected-components',
  'topological-sort',
  'grid-bfs',
  'grid-dfs',
  'grid-dijkstra',
  'grid-astar',
  'maze-generation',
  'maze-prim',
  'maze-kruskal',
  'counting-sort',
  'radix-sort',
  'dp-2d',
  'greedy',
  'backtracking',
])

export default function AlgorithmControls({ slug }: { slug: string | undefined }) {
  if (!slug) return null

  switch (slug) {
    case 'array-access':
    case 'array-insert':
    case 'array-delete':
      // Keyed: moving between the three through the curriculum list keeps
      // this component mounted, and each needs its own default index.
      return <ArrayOperationControls key={slug} slug={slug} />
    case 'stack':
      return <StackControls key={slug} slug={slug} />
    case 'queue':
    case 'circular-queue':
      return <QueueControls key={slug} slug={slug} />
    case 'deque':
      return <DequeControls key={slug} slug={slug} />
    case 'singly-linked-list':
    case 'doubly-linked-list':
    case 'circular-linked-list':
      return <LinkedListControls key={slug} slug={slug} />
    case 'hash-table-chaining':
    case 'hash-table-probing':
      return <HashTableControls key={slug} slug={slug} />
    case 'recursion-factorial':
    case 'recursion-fibonacci':
      return <RecursionControls key={slug} slug={slug} />
    case 'two-pointer':
      return <TwoPointerControls key={slug} slug={slug} />
    case 'sliding-window-fixed':
    case 'sliding-window-variable':
      return <SlidingWindowControls key={slug} slug={slug} />
    case 'jump-search':
    case 'interpolation-search':
    case 'exponential-search':
      return <SearchControls key={slug} slug={slug} />
    case 'bfs':
    case 'dfs':
    case 'dijkstra':
    case 'bellman-ford':
    case 'kruskal':
    case 'prim':
    case 'cycle-detection':
    case 'connected-components':
      return <GraphControls key={slug} slug={slug} />
    case 'topological-sort':
      return <TopologicalSortControls key={slug} slug={slug} />
    case 'grid-bfs':
    case 'grid-dfs':
    case 'grid-dijkstra':
    case 'grid-astar':
      return <GridControls key={slug} slug={slug} />
    case 'maze-generation':
    case 'maze-prim':
    case 'maze-kruskal':
      return <MazeControls key={slug} slug={slug} />
    case 'bst':
    case 'bst-search':
    case 'bst-delete':
      return <BSTControls key={slug} slug={slug} />
    case 'tree-inorder':
    case 'tree-preorder':
    case 'tree-postorder':
    case 'tree-level-order':
      return <TreeTraversalControls key={slug} slug={slug} />
    case 'avl-insert':
    case 'avl-delete':
      return <AVLControls key={slug} slug={slug} />
    case 'rb-insert':
    case 'rb-delete':
      return <RBControls key={slug} slug={slug} />
    case 'max-heap-insert':
    case 'max-heap-delete':
    case 'min-heap-insert':
    case 'min-heap-delete':
      return <HeapControls key={slug} slug={slug} />
    case 'trie-insert':
    case 'trie-search':
    case 'trie-delete':
      return <TrieControls key={slug} slug={slug} />
    case 'counting-sort':
      return <CountingSortControls key={slug} slug={slug} />
    case 'radix-sort':
      return <RadixSortControls key={slug} slug={slug} />
    case 'dp-2d':
      return <DP2DControls key={slug} slug={slug} />
    case 'greedy':
      return <GreedyControls key={slug} slug={slug} />
    case 'backtracking':
      return <BacktrackingControls key={slug} slug={slug} />
    default:
      return null
  }
}
