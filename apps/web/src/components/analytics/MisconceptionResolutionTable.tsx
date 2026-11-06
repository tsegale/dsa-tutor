import { useQuery } from '@tanstack/react-query'
import { fetchEducatorMisconceptionSummary } from '@/api/misconceptionEvents'

function formatCategory(key: string): string {
  return key
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// The response half of misconception handling, per class: how many were
// detected, and what happened to them - resolved (the deterministic
// resolve rule fired), persistent (bottomed out after three remediation
// attempts), or abandoned (never retested, excluded from either count).
export default function MisconceptionResolutionTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['misconception-events', 'educator-summary'],
    queryFn: fetchEducatorMisconceptionSummary,
  })
  // Array.isArray, not a `= []` destructuring default: that default only
  // applies to undefined, so a response carrying null put null straight
  // through and the .length below took the whole educator dashboard down.
  const rows = Array.isArray(data) ? data : []

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-md border border-border bg-card" />
  }

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">No misconceptions detected yet.</p>
  }

  const totalDetected = rows.reduce((sum, r) => sum + r.detected, 0)
  const totalResolved = rows.reduce((sum, r) => sum + r.resolved, 0)
  const totalPersistent = rows.reduce((sum, r) => sum + r.persistent, 0)
  const totalAbandoned = rows.reduce((sum, r) => sum + r.abandoned, 0)
  const testedTotal = totalResolved + totalPersistent
  const resolutionRatePct = testedTotal > 0 ? Math.round((totalResolved / testedTotal) * 100) : 0
  const resolvedShare = totalDetected > 0 ? (totalResolved / totalDetected) * 100 : 0
  const persistentShare = totalDetected > 0 ? (totalPersistent / totalDetected) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Detect-Remediate-Reprobe Funnel
            </p>
            <p className="text-xs text-text-muted">
              Tracks how detected misconceptions progress through targeted Socratic remediation and transfer probes
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface-sunk px-2.5 py-1 text-xs font-semibold text-success">
            {resolutionRatePct}% Resolution Rate (of reprobed)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-border bg-surface-sunk px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">1. Detected</p>
            <p className="mt-0.5 text-lg font-bold text-text-primary">{totalDetected}</p>
          </div>
          <div className="rounded-md border border-border bg-surface-sunk px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">2. Resolved</p>
            <p className="mt-0.5 text-lg font-bold text-success">{totalResolved}</p>
          </div>
          <div className="rounded-md border border-border bg-surface-sunk px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">3. Persistent</p>
            <p className="mt-0.5 text-lg font-bold text-error">{totalPersistent}</p>
          </div>
          <div className="rounded-md border border-border bg-surface-sunk px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">4. Unprobed / Active</p>
            <p className="mt-0.5 text-lg font-bold text-text-secondary">{totalAbandoned}</p>
          </div>
        </div>

        {totalDetected > 0 && (
          <div className="mt-3">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-sunk">
              <div
                className="h-full transition-all"
                style={{ width: `${resolvedShare}%`, backgroundColor: 'var(--tone-emerald-fg)' }}
                title={`Resolved: ${totalResolved}`}
              />
              <div
                className="h-full transition-all"
                style={{ width: `${persistentShare}%`, backgroundColor: 'var(--tone-rose-fg)' }}
                title={`Persistent: ${totalPersistent}`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="text-micro border-b border-border bg-surface-sunk text-text-muted">
            <tr>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Detected</th>
              <th className="px-4 py-2">Resolved</th>
              <th className="px-4 py-2">Persistent</th>
              <th className="px-4 py-2">Abandoned</th>
              <th className="px-4 py-2">Resolution rate</th>
              <th className="px-4 py-2">Median junctions to resolution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowTested = row.resolved + row.persistent
              const rowRate = rowTested > 0 ? `${Math.round((row.resolved / rowTested) * 100)}%` : '-'
              return (
                <tr key={row.category} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium text-text-primary">{formatCategory(row.category)}</td>
                  <td className="px-4 py-2">{row.detected}</td>
                  <td className="px-4 py-2 font-medium text-success">{row.resolved}</td>
                  <td className="px-4 py-2 font-medium text-error">{row.persistent}</td>
                  <td className="px-4 py-2 text-text-muted">{row.abandoned}</td>
                  <td className="px-4 py-2 font-mono text-xs text-text-secondary">{rowRate}</td>
                  <td className="px-4 py-2">{row.medianJunctionsToResolution ?? '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
