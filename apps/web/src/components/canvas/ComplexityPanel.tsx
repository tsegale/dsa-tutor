import { useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface ComplexityRow {
  best: string
  bestNote: string
  average: string
  averageNote: string
  worst: string
  worstNote: string
  space: string
  spaceNote: string
  stable: boolean
}

const COMPLEXITY: Record<string, ComplexityRow> = {
  'bubble-sort': {
    best: 'O(n)', bestNote: 'sorted',
    average: 'O(n²)', averageNote: '',
    worst: 'O(n²)', worstNote: 'reverse sorted',
    space: 'O(1)', spaceNote: 'in-place',
    stable: true,
  },
  'selection-sort': {
    best: 'O(n²)', bestNote: 'always',
    average: 'O(n²)', averageNote: '',
    worst: 'O(n²)', worstNote: 'always',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'insertion-sort': {
    best: 'O(n)', bestNote: 'sorted',
    average: 'O(n²)', averageNote: '',
    worst: 'O(n²)', worstNote: 'reverse sorted',
    space: 'O(1)', spaceNote: 'in-place',
    stable: true,
  },
  'merge-sort': {
    best: 'O(n log n)', bestNote: 'always',
    average: 'O(n log n)', averageNote: '',
    worst: 'O(n log n)', worstNote: 'always',
    space: 'O(n)', spaceNote: 'auxiliary array',
    stable: true,
  },
  'quick-sort': {
    best: 'O(n log n)', bestNote: 'good pivot',
    average: 'O(n log n)', averageNote: '',
    worst: 'O(n²)', worstNote: 'sorted input',
    space: 'O(log n)', spaceNote: 'call stack',
    stable: false,
  },
  'shell-sort': {
    best: 'O(n log n)', bestNote: 'nearly sorted',
    average: 'O(n log² n)', averageNote: 'gap-sequence dependent',
    worst: 'O(n²)', worstNote: 'poor gap sequence',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'heap-sort': {
    best: 'O(n log n)', bestNote: 'always',
    average: 'O(n log n)', averageNote: '',
    worst: 'O(n log n)', worstNote: 'always',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'counting-sort': {
    best: 'O(n + k)', bestNote: 'always',
    average: 'O(n + k)', averageNote: '',
    worst: 'O(n + k)', worstNote: 'always',
    space: 'O(n + k)', spaceNote: 'count + output arrays',
    stable: true,
  },
  'radix-sort': {
    best: 'O(nk)', bestNote: 'k = digit count',
    average: 'O(nk)', averageNote: '',
    worst: 'O(nk)', worstNote: 'always',
    space: 'O(n + k)', spaceNote: 'buckets',
    stable: true,
  },
  'linear-search': {
    best: 'O(1)', bestNote: 'first element',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'not found',
    space: 'O(1)', spaceNote: 'in-place',
    stable: true,
  },
  'binary-search': {
    best: 'O(1)', bestNote: 'midpoint',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'not found',
    space: 'O(1)', spaceNote: 'in-place',
    stable: true,
  },
  bst: {
    best: 'O(log n)', bestNote: 'balanced',
    average: 'O(log n)', averageNote: '',
    worst: 'O(n)', worstNote: 'skewed tree',
    space: 'O(n)', spaceNote: 'tree nodes',
    stable: false,
  },
  'bst-search': {
    best: 'O(log n)', bestNote: 'balanced, target near root',
    average: 'O(log n)', averageNote: '',
    worst: 'O(n)', worstNote: 'skewed tree',
    space: 'O(h)', spaceNote: 'call stack, h = tree height',
    stable: false,
  },
  'bst-delete': {
    best: 'O(log n)', bestNote: 'balanced',
    average: 'O(log n)', averageNote: '',
    worst: 'O(n)', worstNote: 'skewed tree',
    space: 'O(h)', spaceNote: 'call stack, h = tree height',
    stable: false,
  },
  'tree-inorder': {
    best: 'O(n)', bestNote: 'every node visited once',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'every node visited once',
    space: 'O(h)', spaceNote: 'call stack, h = tree height',
    stable: false,
  },
  'tree-preorder': {
    best: 'O(n)', bestNote: 'every node visited once',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'every node visited once',
    space: 'O(h)', spaceNote: 'call stack, h = tree height',
    stable: false,
  },
  'tree-postorder': {
    best: 'O(n)', bestNote: 'every node visited once',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'every node visited once',
    space: 'O(h)', spaceNote: 'call stack, h = tree height',
    stable: false,
  },
  'tree-level-order': {
    best: 'O(n)', bestNote: 'every node visited once',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'every node visited once',
    space: 'O(w)', spaceNote: 'queue holds one level, w = max width',
    stable: false,
  },
  'avl-insert': {
    best: 'O(log n)', bestNote: 'guaranteed by self-balancing',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'guaranteed by self-balancing',
    space: 'O(log n)', spaceNote: 'call stack, height is always O(log n)',
    stable: false,
  },
  'avl-delete': {
    best: 'O(log n)', bestNote: 'guaranteed by self-balancing',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'guaranteed by self-balancing',
    space: 'O(log n)', spaceNote: 'call stack, height is always O(log n)',
    stable: false,
  },
  'rb-insert': {
    best: 'O(log n)', bestNote: 'guaranteed by self-balancing',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'guaranteed by self-balancing',
    space: 'O(log n)', spaceNote: 'call stack, height is always O(log n)',
    stable: false,
  },
  'rb-delete': {
    best: 'O(log n)', bestNote: 'guaranteed by self-balancing',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'guaranteed by self-balancing',
    space: 'O(log n)', spaceNote: 'call stack, height is always O(log n)',
    stable: false,
  },
  'max-heap-insert': {
    best: 'O(1)', bestNote: 'new value already satisfies the property',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'sifts up to the root',
    space: 'O(n)', spaceNote: 'the array itself',
    stable: false,
  },
  'max-heap-delete': {
    best: 'O(1)', bestNote: 'heap has 0 or 1 elements',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'sifts down to a leaf',
    space: 'O(n)', spaceNote: 'the array itself',
    stable: false,
  },
  'min-heap-insert': {
    best: 'O(1)', bestNote: 'new value already satisfies the property',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'sifts up to the root',
    space: 'O(n)', spaceNote: 'the array itself',
    stable: false,
  },
  'min-heap-delete': {
    best: 'O(1)', bestNote: 'heap has 0 or 1 elements',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'sifts down to a leaf',
    space: 'O(n)', spaceNote: 'the array itself',
    stable: false,
  },
  'trie-insert': {
    best: 'O(m)', bestNote: 'm = word length',
    average: 'O(m)', averageNote: '',
    worst: 'O(m)', worstNote: 'm = word length, independent of trie size',
    space: 'O(total characters)', spaceNote: 'across all inserted words',
    stable: false,
  },
  'trie-search': {
    best: 'O(1)', bestNote: 'first character missing',
    average: 'O(m)', averageNote: 'm = word length',
    worst: 'O(m)', worstNote: 'm = word length, independent of trie size',
    space: 'O(1)', spaceNote: 'no extra structure needed',
    stable: false,
  },
  'trie-delete': {
    best: 'O(m)', bestNote: 'm = word length',
    average: 'O(m)', averageNote: '',
    worst: 'O(m)', worstNote: 'm = word length, independent of trie size',
    space: 'O(1)', spaceNote: 'no extra structure needed',
    stable: false,
  },
  bfs: {
    best: 'O(1)', bestNote: 'start = target',
    average: 'O(V + E)', averageNote: 'V nodes, E edges',
    worst: 'O(V + E)', worstNote: 'full traversal',
    space: 'O(V)', spaceNote: 'queue + visited',
    stable: false,
  },
  stack: {
    best: 'O(1)', bestNote: 'push/pop/peek',
    average: 'O(1)', averageNote: '',
    worst: 'O(1)', worstNote: 'push/pop/peek',
    space: 'O(n)', spaceNote: 'n items on the stack',
    stable: false,
  },
  queue: {
    best: 'O(1)', bestNote: 'enqueue/dequeue',
    average: 'O(1)', averageNote: '',
    worst: 'O(1)', worstNote: 'enqueue/dequeue',
    space: 'O(n)', spaceNote: 'n items in the queue',
    stable: false,
  },
  'circular-queue': {
    best: 'O(1)', bestNote: 'enqueue/dequeue',
    average: 'O(1)', averageNote: '',
    worst: 'O(1)', worstNote: 'enqueue/dequeue',
    space: 'O(n)', spaceNote: 'fixed-capacity buffer',
    stable: false,
  },
  deque: {
    best: 'O(1)', bestNote: 'either end',
    average: 'O(1)', averageNote: '',
    worst: 'O(1)', worstNote: 'either end',
    space: 'O(n)', spaceNote: 'n items in the deque',
    stable: false,
  },
  'singly-linked-list': {
    best: 'O(1)', bestNote: 'insert/delete at front',
    average: 'O(n)', averageNote: 'search or delete by value',
    worst: 'O(n)', worstNote: 'insert/delete at back',
    space: 'O(n)', spaceNote: 'n nodes',
    stable: false,
  },
  'doubly-linked-list': {
    best: 'O(1)', bestNote: 'insert/delete at either end',
    average: 'O(n)', averageNote: 'search or delete by value',
    worst: 'O(n)', worstNote: 'search to the far end',
    space: 'O(n)', spaceNote: 'n nodes, two pointers each',
    stable: false,
  },
  'circular-linked-list': {
    best: 'O(1)', bestNote: 'insert at tail',
    average: 'O(n)', averageNote: 'search or delete by value',
    worst: 'O(n)', worstNote: 'full loop traversal',
    space: 'O(n)', spaceNote: 'n nodes',
    stable: false,
  },
  'array-access': {
    best: 'O(1)', bestNote: 'always',
    average: 'O(1)', averageNote: '',
    worst: 'O(1)', worstNote: 'always',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'array-insert': {
    best: 'O(1)', bestNote: 'insert at end',
    average: 'O(n)', averageNote: 'shifts remaining elements',
    worst: 'O(n)', worstNote: 'insert at front',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'array-delete': {
    best: 'O(1)', bestNote: 'delete at end',
    average: 'O(n)', averageNote: 'shifts remaining elements',
    worst: 'O(n)', worstNote: 'delete at front',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'hash-table-chaining': {
    best: 'O(1)', bestNote: 'no collision',
    average: 'O(1)', averageNote: 'good hash, low load factor',
    worst: 'O(n)', worstNote: 'all keys collide',
    space: 'O(n)', spaceNote: 'n entries across buckets',
    stable: false,
  },
  'hash-table-probing': {
    best: 'O(1)', bestNote: 'no collision',
    average: 'O(1)', averageNote: 'good hash, low load factor',
    worst: 'O(n)', worstNote: 'heavy clustering',
    space: 'O(n)', spaceNote: 'n entries in the table',
    stable: false,
  },
  'two-pointer': {
    best: 'O(n)', bestNote: 'single pass',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'single pass',
    space: 'O(1)', spaceNote: 'two pointers only',
    stable: false,
  },
  'sliding-window-fixed': {
    best: 'O(n)', bestNote: 'single pass',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'single pass',
    space: 'O(1)', spaceNote: 'running sum only',
    stable: false,
  },
  'sliding-window-variable': {
    best: 'O(n)', bestNote: 'each pointer moves at most n times',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'each pointer moves at most n times',
    space: 'O(1)', spaceNote: 'running sum only',
    stable: false,
  },
  'jump-search': {
    best: 'O(1)', bestNote: 'first block',
    average: 'O(√n)', averageNote: '',
    worst: 'O(√n)', worstNote: 'not found',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'interpolation-search': {
    best: 'O(1)', bestNote: 'exact estimate',
    average: 'O(log log n)', averageNote: 'uniformly distributed data',
    worst: 'O(n)', worstNote: 'non-uniform distribution',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'exponential-search': {
    best: 'O(1)', bestNote: 'target near the start',
    average: 'O(log n)', averageNote: '',
    worst: 'O(log n)', worstNote: 'bounded binary search',
    space: 'O(1)', spaceNote: 'in-place',
    stable: false,
  },
  'recursion-factorial': {
    best: 'O(n)', bestNote: 'always n recursive calls',
    average: 'O(n)', averageNote: '',
    worst: 'O(n)', worstNote: 'always n recursive calls',
    space: 'O(n)', spaceNote: 'call stack depth',
    stable: false,
  },
  'recursion-fibonacci': {
    best: 'O(2ⁿ)', bestNote: 'naive, no memoisation',
    average: 'O(2ⁿ)', averageNote: '',
    worst: 'O(2ⁿ)', worstNote: 'naive, no memoisation',
    space: 'O(n)', spaceNote: 'max call stack depth',
    stable: false,
  },
}

// "Stable sort" is only a meaningful notion for sorting algorithms;
// search and tree/graph traversal algorithms don't reorder anything.
const SORTING_SLUGS = new Set([
  'bubble-sort',
  'selection-sort',
  'insertion-sort',
  'merge-sort',
  'quick-sort',
  'shell-sort',
  'heap-sort',
  'counting-sort',
  'radix-sort',
])

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export default function ComplexityPanel() {
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const data = COMPLEXITY[algorithmSlug ?? '']

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-md border border-border bg-white p-4 text-center dark:bg-dark-surface">
        <span className="text-sm text-text-muted dark:text-dark-text-secondary">
          Complexity data for this algorithm will be added soon.
        </span>
      </div>
    )
  }

  const rows = [
    { label: 'Best case', note: data.bestNote, value: data.best, colorClass: 'text-primary bg-primary-light' },
    { label: 'Average case', note: data.averageNote, value: data.average, colorClass: 'text-secondary bg-secondary-light' },
    { label: 'Worst case', note: data.worstNote, value: data.worst, colorClass: 'text-error bg-error-light' },
    { label: 'Space', note: data.spaceNote, value: data.space, colorClass: 'text-success bg-success-light' },
  ]

  return (
    <div className="flex h-full flex-col gap-3 rounded-md border border-border bg-white p-4 dark:bg-dark-surface">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between">
          <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
            {row.label}
            {row.note && (
              <span className="ml-1 text-xs text-text-muted dark:text-dark-text-secondary">({row.note})</span>
            )}
          </span>
          <span className={cn('rounded-md px-2 py-1 font-mono text-sm font-semibold', row.colorClass)}>
            {row.value}
          </span>
        </div>
      ))}

      {SORTING_SLUGS.has(algorithmSlug ?? '') && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary dark:text-dark-text-secondary">Stable sort</span>
          <span
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold',
              data.stable ? 'text-success bg-success-light' : 'text-error bg-error-light',
            )}
          >
            {data.stable ? <CheckIcon /> : <XIcon />}
            {data.stable ? 'Stable' : 'Not stable'}
          </span>
        </div>
      )}
    </div>
  )
}
