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
  bfs: {
    best: 'O(1)', bestNote: 'start = target',
    average: 'O(V + E)', averageNote: 'V nodes, E edges',
    worst: 'O(V + E)', worstNote: 'full traversal',
    space: 'O(V)', spaceNote: 'queue + visited',
    stable: false,
  },
}

// "Stable sort" is only a meaningful notion for sorting algorithms;
// search and tree/graph traversal algorithms don't reorder anything.
const SORTING_SLUGS = new Set(['bubble-sort', 'selection-sort', 'insertion-sort', 'merge-sort', 'quick-sort'])

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
  const data = COMPLEXITY[algorithmSlug ?? ''] ?? COMPLEXITY['bubble-sort']

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
