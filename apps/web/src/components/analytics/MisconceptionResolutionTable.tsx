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
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['misconception-events', 'educator-summary'],
    queryFn: fetchEducatorMisconceptionSummary,
  })

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-md border border-border bg-card" />
  }

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">No misconceptions detected yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs text-text-muted uppercase">
          <tr>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Detected</th>
            <th className="px-4 py-2">Resolved</th>
            <th className="px-4 py-2">Persistent</th>
            <th className="px-4 py-2">Abandoned</th>
            <th className="px-4 py-2">Median junctions to resolution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-b border-border last:border-0">
              <td className="px-4 py-2 font-medium text-text-primary">{formatCategory(row.category)}</td>
              <td className="px-4 py-2">{row.detected}</td>
              <td className="px-4 py-2 text-success">{row.resolved}</td>
              <td className="px-4 py-2 text-error">{row.persistent}</td>
              <td className="px-4 py-2 text-text-muted">{row.abandoned}</td>
              <td className="px-4 py-2">{row.medianJunctionsToResolution ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
