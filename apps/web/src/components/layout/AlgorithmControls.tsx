import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
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
import { gridBfsEngine, gridDfsEngine, gridDijkstraEngine, gridAStarEngine, buildEmptyGrid } from '@/engine/gridAlgorithms'
import { mazeGenerationEngine, mazePrimEngine, mazeKruskalEngine } from '@/engine/mazeGeneration'
import type { GridCell, GridAlgorithmState } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'

const inputClass =
  'w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary dark:bg-dark-background dark:text-dark-text-primary'
const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted dark:text-dark-text-secondary'

function parseArrayInput(input: string): number[] | null {
  const parts = input.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
  if (parts.length === 0) return null
  const values = parts.map(Number)
  if (values.some((n) => Number.isNaN(n))) return null
  return values
}

function useApply() {
  const setAlgorithm = useAlgorithmStore((state) => state.setAlgorithm)
  return (slug: string, snapshots: AlgorithmSnapshot[]) => {
    const displayName = getAlgorithmRegistryEntry(slug)?.displayName ?? slug
    setAlgorithm(displayName, snapshots)
  }
}

// Stack, queue, and deque seed states mirror each algorithm's own registry
// default (registry.ts) so a fresh push/enqueue lands on a demo that
// already has something in it, instead of an empty structure every time.
const STACK_SEED = [5, 3, 8, 1, 9]
const QUEUE_SEED = [5, 3, 8, 1, 9]
const CQ_SEED: Array<{ op: 'enqueue'; value: number }> = [
  { op: 'enqueue', value: 5 },
  { op: 'enqueue', value: 3 },
  { op: 'enqueue', value: 8 },
]
const DQ_SEED: Array<{ op: 'pushFront' | 'pushBack'; value: number }> = [
  { op: 'pushBack', value: 5 },
  { op: 'pushFront', value: 3 },
  { op: 'pushBack', value: 8 },
]
const LL_SEED = [3, 7, 1]
const BST_SEED = BST_DEFAULT_SEED

function bstRootFor(values: number[]): BSTNode | null {
  const snapshots = bstInsertEngine(values)
  const last = snapshots[snapshots.length - 1]
  return (last?.dataStructureState as { root: BSTNode | null } | undefined)?.root ?? null
}

const AVL_SEED = [10, 20, 30, 40, 50, 25]

function avlRootFor(values: number[]): AVLNode | null {
  const snapshots = avlInsertEngine(values)
  const last = snapshots[snapshots.length - 1]
  return (last?.dataStructureState as { root: AVLNode | null } | undefined)?.root ?? null
}

const RB_SEED = [10, 20, 30, 40, 50, 25]

function rbRootFor(values: number[]): RBNode | null {
  const snapshots = rbInsertEngine(values)
  const last = snapshots[snapshots.length - 1]
  return (last?.dataStructureState as { root: RBNode | null } | undefined)?.root ?? null
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

function StackControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [value, setValue] = useState('7')

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Stack operations</h3>
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <Button
        variant="outline"
        size="sm"
        onClick={() => apply(slug, stackPushEngine(STACK_SEED, [Number(value) || 0], 6))}
      >
        Push
      </Button>
      <Button variant="outline" size="sm" onClick={() => apply(slug, stackPopEngine(STACK_SEED, 1))}>
        Pop
      </Button>
      <Button variant="outline" size="sm" onClick={() => apply(slug, stackPeekEngine(STACK_SEED))}>
        Peek
      </Button>
    </section>
  )
}

function QueueControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [value, setValue] = useState('7')
  const isCircular = slug === 'circular-queue'

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Queue operations</h3>
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          isCircular
            ? apply(slug, circularQueueEngine(5, [...CQ_SEED, { op: 'enqueue', value: Number(value) || 0 }]))
            : apply(slug, queueEnqueueEngine(QUEUE_SEED, [Number(value) || 0], 6))
        }
      >
        Enqueue
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          isCircular
            ? apply(slug, circularQueueEngine(5, [...CQ_SEED, { op: 'dequeue' }]))
            : apply(slug, queueDequeueEngine(QUEUE_SEED, 1))
        }
      >
        Dequeue
      </Button>
    </section>
  )
}

function DequeControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [value, setValue] = useState('7')

  const run = (op: 'pushFront' | 'pushBack' | 'popFront' | 'popBack') =>
    apply(
      slug,
      dequeEngine(5, [...DQ_SEED, op === 'pushFront' || op === 'pushBack' ? { op, value: Number(value) || 0 } : { op }]),
    )

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Deque operations</h3>
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
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
    </section>
  )
}

// The insert engines auto-pick their own demo value (max of the existing
// list + 1) rather than taking one as a parameter - see the judgment call
// documented in singlyLinkedList.ts. Insert Front/Back here replay that
// built-in demo; the typed value only drives Delete/Search, which do take
// an explicit target.
function LinkedListControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [value, setValue] = useState('7')
  const target = Number(value) || 0

  if (slug === 'circular-linked-list') {
    return (
      <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
        <h3 className={labelClass}>List operations</h3>
        <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
          Value below is used by Delete only - insert always demonstrates the next value in sequence.
        </p>
        <NumberField label="Value (for delete)" value={value} onChange={setValue} min={1} max={99} />
        <Button variant="outline" size="sm" onClick={() => apply(slug, cllInsertEngine(LL_SEED))}>
          Insert
        </Button>
        <Button variant="outline" size="sm" onClick={() => apply(slug, cllDeleteEngine(LL_SEED, target))}>
          Delete
        </Button>
        <Button variant="outline" size="sm" onClick={() => apply(slug, cllTraverseEngine(LL_SEED))}>
          Traverse
        </Button>
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
      <h3 className={labelClass}>List operations</h3>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
        Value below is used by Delete and Search only - insert always demonstrates the next value in sequence.
      </p>
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <Button variant="outline" size="sm" onClick={() => apply(slug, insertFront(LL_SEED))}>
        Insert Front
      </Button>
      <Button variant="outline" size="sm" onClick={() => apply(slug, insertBack(LL_SEED))}>
        Insert Back
      </Button>
      <Button variant="outline" size="sm" onClick={() => apply(slug, del(LL_SEED, target))}>
        Delete
      </Button>
      <Button variant="outline" size="sm" onClick={() => apply(slug, search(LL_SEED, target))}>
        Search
      </Button>
    </section>
  )
}

function HashTableControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [key, setKey] = useState('15')
  const [value, setValue] = useState('')
  const isProbing = slug === 'hash-table-probing'
  const insert = isProbing ? hashInsertLinearProbingEngine : hashInsertChainingEngine
  const search = isProbing ? hashSearchLinearProbingEngine : hashSearchChainingEngine
  const del = isProbing ? hashDeleteLinearProbingEngine : hashDeleteChainingEngine
  const keyNum = Number(key) || 0

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Hash table operations</h3>
      <NumberField label="Key" value={key} onChange={setKey} min={1} max={99} />
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Value (optional)</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="not used by this demo"
          className={inputClass}
        />
      </div>
      <Button variant="outline" size="sm" onClick={() => apply(slug, insert([15, 8, 23, keyNum], 7))}>
        Insert
      </Button>
      <Button variant="outline" size="sm" onClick={() => apply(slug, search([15, 8, 23], keyNum, 7))}>
        Search
      </Button>
      <Button variant="outline" size="sm" onClick={() => apply(slug, del([15, 8, 23], keyNum, 7))}>
        Delete
      </Button>
    </section>
  )
}

function RecursionControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [n, setN] = useState(slug === 'recursion-fibonacci' ? '6' : '6')
  const engine = slug === 'recursion-fibonacci' ? fibonacciEngine : factorialEngine

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Recursion input</h3>
      <NumberField label="n" value={n} onChange={setN} min={1} max={10} />
      <Button
        variant="outline"
        size="sm"
        onClick={() => apply(slug, engine(Math.min(10, Math.max(1, Number(n) || 1))))}
      >
        Run
      </Button>
    </section>
  )
}

function TwoPointerControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [arrayInput, setArrayInput] = useState('1,3,4,5,7,10,11')
  const [target, setTarget] = useState('14')
  const [error, setError] = useState<string | null>(null)

  function run() {
    const values = parseArrayInput(arrayInput)
    if (!values) {
      setError('Enter a comma-separated list of numbers, e.g. 1,3,4,5,7')
      return
    }
    setError(null)
    apply(slug, twoSumSortedEngine(values, Number(target) || 0))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Input array</h3>
      <input
        type="text"
        value={arrayInput}
        onChange={(e) => setArrayInput(e.target.value)}
        placeholder="1,3,4,5,7,10,11"
        className={inputClass}
      />
      <NumberField label="Target sum" value={target} onChange={setTarget} />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={run}>
        Apply
      </Button>
    </section>
  )
}

function SlidingWindowControls({ slug }: { slug: string }) {
  const apply = useApply()
  const isFixed = slug === 'sliding-window-fixed'
  const [arrayInput, setArrayInput] = useState('2,3,1,2,4,3')
  const [param, setParam] = useState(isFixed ? '3' : '7')
  const [error, setError] = useState<string | null>(null)

  function run(values: number[]) {
    const paramNum = Number(param) || 0
    apply(slug, isFixed ? fixedWindowEngine(values, paramNum) : variableWindowEngine(values, paramNum))
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
  const [target, setTarget] = useState('12')
  const [error, setError] = useState<string | null>(null)

  const engine =
    slug === 'jump-search' ? jumpSearchEngine : slug === 'interpolation-search' ? interpolationSearchEngine : exponentialSearchEngine

  function run() {
    const values = parseArrayInput(arrayInput)
    if (!values) {
      setError('Enter a comma-separated, sorted list of numbers, e.g. 1,3,5,7,9')
      return
    }
    setError(null)
    apply(slug, engine([...values].sort((a, b) => a - b), Number(target) || 0))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Input array (must be sorted)</h3>
      <input
        type="text"
        value={arrayInput}
        onChange={(e) => setArrayInput(e.target.value)}
        placeholder="1,3,5,7,9,12,15"
        className={inputClass}
      />
      <NumberField label="Target" value={target} onChange={setTarget} />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={run}>
        Apply
      </Button>
    </section>
  )
}

// Each BST page (Insert/Search/Delete are now separate algorithm routes)
// shows only its own operation, driven by a single "value" field - not
// all three buttons on every page.
function BSTControls({ slug }: { slug: string }) {
  const apply = useApply()
  const defaultValue =
    slug === 'bst-search'
      ? String(BST_DEFAULT_SEARCH_TARGET)
      : slug === 'bst-delete'
        ? String(BST_DEFAULT_DELETE_TARGET)
        : String(BST_DEFAULT_INSERT_VALUE)
  const [value, setValue] = useState(defaultValue)
  const target = Number(value) || 0

  if (slug === 'bst-search') {
    return (
      <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
        <h3 className={labelClass}>BST Search</h3>
        <NumberField label="Search for value" value={value} onChange={setValue} min={1} max={99} />
        <Button variant="outline" size="sm" onClick={() => apply(slug, bstSearchEngine(bstRootFor(BST_SEED), target))}>
          Search
        </Button>
      </section>
    )
  }

  if (slug === 'bst-delete') {
    return (
      <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
        <h3 className={labelClass}>BST Delete</h3>
        <NumberField label="Delete value" value={value} onChange={setValue} min={1} max={99} />
        <Button variant="outline" size="sm" onClick={() => apply(slug, bstDeleteEngine(bstRootFor(BST_SEED), target))}>
          Delete
        </Button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>BST Insert</h3>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
        Rebuilds the tree from scratch with this value inserted last - unrelated to the practice question above.
      </p>
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <Button variant="outline" size="sm" onClick={() => apply(slug, bstInsertEngine([...BST_SEED, target]))}>
        Insert
      </Button>
    </section>
  )
}

function AVLControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [value, setValue] = useState('7')
  const target = Number(value) || 0
  const isDelete = slug === 'avl-delete'

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>AVL Tree operations</h3>
      <NumberField label={isDelete ? 'Delete value' : 'Value'} value={value} onChange={setValue} min={1} max={99} />
      {isDelete ? (
        <Button variant="outline" size="sm" onClick={() => apply(slug, avlDeleteEngine(avlRootFor(AVL_SEED), target))}>
          Delete
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => apply(slug, avlInsertEngine([...AVL_SEED, target]))}>
          Insert
        </Button>
      )}
    </section>
  )
}

function RBControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [value, setValue] = useState('7')
  const target = Number(value) || 0
  const isDelete = slug === 'rb-delete'

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Red-Black Tree operations</h3>
      <NumberField label={isDelete ? 'Delete value' : 'Value'} value={value} onChange={setValue} min={1} max={99} />
      {isDelete ? (
        <Button variant="outline" size="sm" onClick={() => apply(slug, rbDeleteEngine(rbRootFor(RB_SEED), target))}>
          Delete
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => apply(slug, rbInsertEngine([...RB_SEED, target]))}>
          Insert
        </Button>
      )}
    </section>
  )
}

const HEAP_SEED = HEAP_DEFAULT_SEED

function trieRootFor(words: string[]): TrieNode {
  const snapshots = trieInsertEngine(words)
  return (snapshots[snapshots.length - 1].dataStructureState as TrieState).root
}

function HeapControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [value, setValue] = useState(String(HEAP_DEFAULT_INSERT_VALUE))
  const target = Number(value) || 0
  const isMax = slug.startsWith('max-heap')
  const isDelete = slug.endsWith('delete')
  const insertEngine = isMax ? maxHeapInsertEngine : minHeapInsertEngine
  const deleteEngine = isMax ? maxHeapDeleteEngine : minHeapDeleteEngine
  const heapType = isMax ? 'max' : 'min'

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>{isMax ? 'Max-Heap' : 'Min-Heap'} operations</h3>
      {isDelete ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => apply(slug, deleteEngine(buildHeapArray(heapType, HEAP_SEED)))}
        >
          Delete (remove root)
        </Button>
      ) : (
        <>
          <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
            Rebuilds the heap from scratch with this value inserted last - unrelated to the practice question above.
          </p>
          <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
          <Button variant="outline" size="sm" onClick={() => apply(slug, insertEngine([...HEAP_SEED, target]))}>
            Insert
          </Button>
        </>
      )}
    </section>
  )
}

function TrieControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [word, setWord] = useState('apple')
  const [error, setError] = useState<string | null>(null)

  function run() {
    if (!/^[a-zA-Z]+$/.test(word)) {
      setError('Enter a word using letters only, e.g. apple')
      return
    }
    setError(null)
    if (slug === 'trie-insert') {
      apply(slug, trieInsertEngine([...DEFAULT_TRIE_WORDS, word]))
    } else if (slug === 'trie-search') {
      apply(slug, trieSearchEngine(trieRootFor(DEFAULT_TRIE_WORDS), word))
    } else {
      apply(slug, trieDeleteEngine(trieRootFor(DEFAULT_TRIE_WORDS), word))
    }
  }

  const label = slug === 'trie-insert' ? 'Insert' : slug === 'trie-search' ? 'Search' : 'Delete'

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Trie operations</h3>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">Enter a word (letters only)</p>
      <input
        type="text"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="e.g. apple"
        className={inputClass}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button variant="outline" size="sm" onClick={run}>
        {label}
      </Button>
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
    apply(slug, engine(bstRootFor(values)))
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
    const length = Math.floor(Math.random() * 5) + 6 // 6-10
    const values = Array.from({ length }, () => Math.floor(Math.random() * 20) + 1)
    setArrayInput(values.join(','))
    setError(null)
    run(values)
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Tree values</h3>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
        Values are inserted into a BST, then traversed.
      </p>
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
    apply(slug, countingSortEngine(values))
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
    const length = Math.floor(Math.random() * 3) + 6 // 6-8
    const values = Array.from({ length }, () => Math.floor(Math.random() * 10))
    setArrayInput(values.join(','))
    setError(null)
    run(values)
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Input array</h3>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">Integers 0-9 only</p>
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
    apply(slug, radixSortEngine(values))
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
    const length = Math.floor(Math.random() * 3) + 6 // 6-8
    const values = Array.from({ length }, () => Math.floor(Math.random() * 200) + 1)
    setArrayInput(values.join(','))
    setError(null)
    run(values)
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Input array</h3>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">Integers 0-999 only</p>
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

const WEIGHTED_GRAPH_ALGOS = new Set(['dijkstra', 'bellman-ford', 'kruskal', 'prim'])
const NEEDS_TARGET_NODE = new Set(['bfs', 'dfs', 'dijkstra', 'bellman-ford'])
const NEEDS_START_NODE = new Set(['bfs', 'dfs', 'dijkstra', 'bellman-ford', 'prim'])
// Algorithms where more than one preset from the relevant (weighted/
// unweighted) bucket is actually valid to run - cycle-detection needs
// its one preset that HAS a cycle, and topological-sort needs a DAG
// (no cycle), so neither gets a free choice between the two unweighted
// presets without risking a broken demo.
const HAS_PRESET_CHOICE = new Set(['bfs', 'dfs', 'connected-components', 'dijkstra', 'bellman-ford', 'kruskal', 'prim'])
// Kruskal/Prim assume an undirected graph (a spanning TREE isn't a
// well-defined concept on a directed graph in general), so they don't
// get a directed toggle; topological-sort is only ever meaningful on a
// directed acyclic graph, so it doesn't either.
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
  'two-components': 'Two disconnected groups (8 nodes)',
}

// `preset.adjacency as never` below: `preset` is typed as the union of
// both preset shapes since the dropdown can offer either, but
// `presetOptions` (derived from WEIGHTED_GRAPH_ALGOS) only ever lets the
// student choose from the bucket matching this specific `slug` - so by
// the time an engine call is reached, the adjacency shape it expects is
// already guaranteed at runtime, just not provable to the type checker
// without a much larger per-branch type-narrowing rewrite.
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
      : ['small-7', 'directed-cycle']

  function changePreset(name: GraphPresetName) {
    setPresetName(name)
    const nextPreset = GRAPH_PRESETS[name]
    setDirected(nextPreset.directed)
    const ids = nextPreset.nodes.map((n) => n.id)
    setStartId(ids[0])
    setTargetId(ids[ids.length - 1])
  }

  function run() {
    apply(slug, runGraphAlgorithm(slug, preset, directed, startId, targetId))
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
          <select value={startId} onChange={(e) => setStartId(e.target.value)} className={inputClass}>
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
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={inputClass}>
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
          <input type="checkbox" checked={directed} onChange={(e) => setDirected(e.target.checked)} />
          Directed
        </label>
      )}

      <Button variant="outline" size="sm" onClick={run}>
        Apply
      </Button>
    </section>
  )
}

// Topological sort is only ever meaningful on a directed *acyclic*
// graph, which rules out both of the "unweighted bucket" presets
// (small-7 is undirected; directed-cycle - as its name says - has an
// actual cycle) - it gets its own fixed DAG rather than a dropdown of
// choices that could silently produce a broken demo.
function TopologicalSortControls({ slug }: { slug: string }) {
  const apply = useApply()

  function run() {
    apply(slug, topologicalSortEngine(DIRECTED_ACYCLIC.nodes, DIRECTED_ACYCLIC.adjacency))
  }

  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Graph controls</h3>
      <p className="text-[10px] text-text-muted dark:text-dark-text-secondary">
        Fixed DAG (6 nodes) - topological order only exists for a directed, acyclic graph.
      </p>
      <Button variant="outline" size="sm" onClick={run}>
        Re-run
      </Button>
    </section>
  )
}

type GridSizeName = 'small' | 'medium' | 'large'

const GRID_SIZE_OPTIONS: Record<GridSizeName, { label: string; rows: number; cols: number; start: [number, number]; end: [number, number] }> = {
  small: { label: 'Small (15×25)', rows: 15, cols: 25, start: [7, 2], end: [7, 22] },
  medium: { label: 'Medium (20×35)', rows: 20, cols: 35, start: [10, 2], end: [10, 32] },
  large: { label: 'Large (25×45)', rows: 25, cols: 45, start: [12, 2], end: [12, 42] },
}

const GRID_ENGINE_FOR: Record<string, typeof gridBfsEngine> = {
  'grid-bfs': gridBfsEngine,
  'grid-dfs': gridDfsEngine,
  'grid-dijkstra': gridDijkstraEngine,
  'grid-astar': gridAStarEngine,
}

function GridControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [size, setSize] = useState<GridSizeName>('medium')
  const engine = GRID_ENGINE_FOR[slug] ?? gridBfsEngine

  function runOn(sizeName: GridSizeName, grid?: GridCell[][]) {
    const cfg = GRID_SIZE_OPTIONS[sizeName]
    apply(slug, engine(grid ?? buildEmptyGrid(cfg.rows, cfg.cols), cfg.start[0], cfg.start[1], cfg.end[0], cfg.end[1]))
  }

  function handleSizeChange(next: GridSizeName) {
    setSize(next)
    runOn(next)
  }

  function handleGenerateMaze() {
    const cfg = GRID_SIZE_OPTIONS[size]
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
          {(Object.keys(GRID_SIZE_OPTIONS) as GridSizeName[]).map((name) => (
            <option key={name} value={name}>
              {GRID_SIZE_OPTIONS[name].label}
            </option>
          ))}
        </select>
      </div>
      <Button variant="outline" size="sm" onClick={() => runOn(size)}>
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
  const [size, setSize] = useState<GridSizeName>('medium')
  const [lastMaze, setLastMaze] = useState<GridAlgorithmState | null>(null)
  const engine = MAZE_ENGINE_FOR[slug] ?? mazeGenerationEngine

  function generate(sizeName: GridSizeName) {
    const cfg = GRID_SIZE_OPTIONS[sizeName]
    const snapshots = engine(cfg.rows, cfg.cols)
    setLastMaze(snapshots[snapshots.length - 1].dataStructureState as GridAlgorithmState)
    apply(slug, snapshots)
  }

  function runAStarOnMaze() {
    if (!lastMaze) return
    apply(slug, gridAStarEngine(lastMaze.grid, lastMaze.startCell[0], lastMaze.startCell[1], lastMaze.endCell[0], lastMaze.endCell[1]))
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
          {(Object.keys(GRID_SIZE_OPTIONS) as GridSizeName[]).map((name) => (
            <option key={name} value={name}>
              {GRID_SIZE_OPTIONS[name].label}
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
])

/**
 * Renders the algorithm-specific input section that replaces the generic
 * "Custom array" box for algorithms whose input isn't a plain number array.
 * Returns null for sorting algorithms (and anything else unlisted), which
 * keeps LeftPanel's existing custom-array controls.
 */
export default function AlgorithmControls({ slug }: { slug: string | undefined }) {
  if (!slug) return null

  switch (slug) {
    case 'stack':
      return <StackControls slug={slug} />
    case 'queue':
    case 'circular-queue':
      return <QueueControls slug={slug} />
    case 'deque':
      return <DequeControls slug={slug} />
    case 'singly-linked-list':
    case 'doubly-linked-list':
    case 'circular-linked-list':
      return <LinkedListControls slug={slug} />
    case 'hash-table-chaining':
    case 'hash-table-probing':
      return <HashTableControls slug={slug} />
    case 'recursion-factorial':
    case 'recursion-fibonacci':
      return <RecursionControls slug={slug} />
    case 'two-pointer':
      return <TwoPointerControls slug={slug} />
    case 'sliding-window-fixed':
    case 'sliding-window-variable':
      return <SlidingWindowControls slug={slug} />
    // binary-search and linear-search are part of the original algorithm
    // set and already work correctly through LeftPanel's default custom-
    // array Apply/Random (engineForSlug already routes them) - only the
    // three newer search algorithms need their own section here.
    case 'jump-search':
    case 'interpolation-search':
    case 'exponential-search':
      return <SearchControls slug={slug} />
    case 'bfs':
    case 'dfs':
    case 'dijkstra':
    case 'bellman-ford':
    case 'kruskal':
    case 'prim':
    case 'cycle-detection':
    case 'connected-components':
      return <GraphControls slug={slug} />
    case 'topological-sort':
      return <TopologicalSortControls slug={slug} />
    case 'grid-bfs':
    case 'grid-dfs':
    case 'grid-dijkstra':
    case 'grid-astar':
      return <GridControls slug={slug} />
    case 'maze-generation':
    case 'maze-prim':
    case 'maze-kruskal':
      return <MazeControls slug={slug} />
    case 'bst':
    case 'bst-search':
    case 'bst-delete':
      return <BSTControls key={slug} slug={slug} />
    case 'tree-inorder':
    case 'tree-preorder':
    case 'tree-postorder':
    case 'tree-level-order':
      return <TreeTraversalControls slug={slug} />
    case 'avl-insert':
    case 'avl-delete':
      return <AVLControls slug={slug} />
    case 'rb-insert':
    case 'rb-delete':
      return <RBControls slug={slug} />
    case 'max-heap-insert':
    case 'max-heap-delete':
    case 'min-heap-insert':
    case 'min-heap-delete':
      return <HeapControls slug={slug} />
    case 'trie-insert':
    case 'trie-search':
    case 'trie-delete':
      return <TrieControls slug={slug} />
    case 'counting-sort':
      return <CountingSortControls slug={slug} />
    case 'radix-sort':
      return <RadixSortControls slug={slug} />
    default:
      return null
  }
}
