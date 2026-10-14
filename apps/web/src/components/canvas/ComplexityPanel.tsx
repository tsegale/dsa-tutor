import { useParams } from 'react-router-dom'
import { conditionFeatures } from '@/utils/studyCondition'
import { cn } from '@/lib/utils'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { comparisonFormula, isRunCountHidden } from '@/utils/complexityFormula'
import { COMPLEXITY } from '@/config/complexity'

/**
 * The current run measured against its formula (Week 2 2C): "This run:
 * 10 comparisons, 7 swaps for n=5" next to "n(n-1)/2 = 10". On a run with
 * a complexity-prediction question, the count stays hidden until that
 * question has been answered - otherwise this tab would give it away.
 */
function RunMeasurement({ topicSlug }: { topicSlug: string | undefined }) {
  const snapshots = useAlgorithmStore((state) => state.snapshotArray)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const current = snapshots[stepIndex]?.metrics
  if (!current) return null
  const formula = comparisonFormula(topicSlug, current.n)

  const countHidden = isRunCountHidden(snapshots, stepIndex)
  const second =
    current.swaps !== undefined
      ? `${current.swaps} swap${current.swaps === 1 ? '' : 's'}`
      : current.visits !== undefined
        ? `${current.visits} visited`
        : null

  return (
    <div className="rounded-md border border-border bg-surface-sunk p-3" aria-live="polite">
      <p className="text-xs font-bold text-text-primary">This run</p>
      {countHidden ? (
        <p className="mt-1 text-sm text-text-muted">The measured count appears once you have estimated it at the end of the run.</p>
      ) : (
        <p className="mt-1 font-mono text-sm text-text-primary">
          {current.comparisons} comparison{current.comparisons === 1 ? '' : 's'}
          {second ? `, ${second}` : ''} for n={current.n}
        </p>
      )}
      {formula && (
        <p className="mt-1 text-xs text-text-secondary">
          <span className="font-mono">
            {formula.expression} = {formula.value}
          </span>{' '}
          ({formula.note})
        </p>
      )}
    </div>
  )
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
  const features = conditionFeatures(useAlgorithmStore((state) => state.classicMode))
  const data = COMPLEXITY[algorithmSlug ?? '']

  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-md border border-border bg-card p-4 text-center">
        <span className="text-sm text-text-muted dark:text-dark-text-secondary">
          Complexity data for this algorithm will be added soon.
        </span>
      </div>
    )
  }

  const rows = [
    { label: 'Best case', note: data.bestNote, value: data.best, colorClass: 'text-text-primary bg-card' },
    { label: 'Average case', note: data.averageNote, value: data.average, colorClass: 'text-secondary bg-secondary-light' },
    { label: 'Worst case', note: data.worstNote, value: data.worst, colorClass: 'text-error bg-error-light' },
    { label: 'Space', note: data.spaceNote, value: data.space, colorClass: 'text-success bg-success-light' },
  ]

  return (
    <div className="flex h-full flex-col gap-3 rounded-md border border-border bg-card p-4">
      {/* Classic keeps the static table only - no measured counts. */}
      {features.measuredCounts && <RunMeasurement topicSlug={algorithmSlug} />}
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
