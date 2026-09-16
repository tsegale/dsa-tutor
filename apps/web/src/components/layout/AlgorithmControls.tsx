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
import { bstInsertEngine, bstSearchEngine, bstDeleteEngine, type BSTNode } from '@/engine/bst'
import { inorderEngine, preorderEngine, postorderEngine } from '@/engine/treeTraversal'
import { countingSortEngine } from '@/engine/countingSort'
import { radixSortEngine } from '@/engine/radixSort'
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
const BST_SEED = [8, 4, 12, 2, 6, 10, 14]

function bstRootFor(values: number[]): BSTNode | null {
  const snapshots = bstInsertEngine(values)
  const last = snapshots[snapshots.length - 1]
  return (last?.dataStructureState as { root: BSTNode | null } | undefined)?.root ?? null
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
  const [value, setValue] = useState('7')
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
      <NumberField label="Value" value={value} onChange={setValue} min={1} max={99} />
      <Button variant="outline" size="sm" onClick={() => apply(slug, bstInsertEngine([...BST_SEED, target]))}>
        Insert
      </Button>
    </section>
  )
}

function TreeTraversalControls({ slug }: { slug: string }) {
  const apply = useApply()
  const [arrayInput, setArrayInput] = useState(BST_SEED.join(','))
  const [error, setError] = useState<string | null>(null)

  const engine = slug === 'tree-preorder' ? preorderEngine : slug === 'tree-postorder' ? postorderEngine : inorderEngine

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

function BfsControls() {
  return (
    <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
      <h3 className={labelClass}>Graph</h3>
      <p className="text-xs text-text-muted dark:text-dark-text-secondary">Fixed graph: 7 nodes, A&rarr;G</p>
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
      return <BfsControls />
    case 'bst':
    case 'bst-search':
    case 'bst-delete':
      return <BSTControls slug={slug} />
    case 'tree-inorder':
    case 'tree-preorder':
    case 'tree-postorder':
      return <TreeTraversalControls slug={slug} />
    case 'counting-sort':
      return <CountingSortControls slug={slug} />
    case 'radix-sort':
      return <RadixSortControls slug={slug} />
    default:
      return null
  }
}
