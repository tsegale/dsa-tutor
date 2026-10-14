import type { FeynmanRubricItemResult } from '@dsa-tutor/types'
import { COMPLEXITY_CRITERIA_LABELS } from '@/config/complexity'

function Met({ met }: { met: boolean }) {
  return met ? (
    <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function Group({ title, rows }: { title: string; rows: FeynmanRubricItemResult[] }) {
  if (rows.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      <p className="text-micro text-ink-2">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.conceptLabel} className="flex gap-1.5 text-small text-ink">
            <Met met={row.met} />
            <span>{row.conceptLabel}</span>
            <span className="sr-only">{row.met ? ', met' : ', not yet'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The graded result, criterion by criterion (Phase 8D): what the
 * explanation covered of how the algorithm works, and of its complexity,
 * which is graded as its own group because it is the interview bar.
 */
export function FeynmanCriteria({ results }: { results: FeynmanRubricItemResult[] }) {
  const complexity = results.filter((row) => COMPLEXITY_CRITERIA_LABELS.includes(row.conceptLabel))
  const mechanics = results.filter((row) => !COMPLEXITY_CRITERIA_LABELS.includes(row.conceptLabel))
  return (
    <div className="flex flex-col gap-3">
      <Group title="How it works" rows={mechanics} />
      <Group title="Complexity" rows={complexity} />
    </div>
  )
}
