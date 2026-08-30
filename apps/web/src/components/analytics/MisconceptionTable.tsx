import { cn } from '@/lib/utils'

interface MisconceptionTableProps {
  breakdown: Record<string, number>
}

const CATEGORY_DOT_CLASS: Record<string, string> = {
  OFF_BY_ONE: 'bg-secondary',
  ORDER_OF_OPERATIONS: 'bg-error',
  STRUCTURAL_PROPERTY_VIOLATION: 'bg-purple-500',
  POINTER_CONFUSION: 'bg-orange-500',
  BASE_CASE_OMISSION: 'bg-blue-500',
  COMPLEXITY_MISATTRIBUTION: 'bg-teal-500',
}

function formatCategory(key: string): string {
  return key
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function severity(count: number): { label: string; className: string } {
  if (count > 10) return { label: 'HIGH', className: 'bg-error-light text-error' }
  if (count >= 4) return { label: 'MEDIUM', className: 'bg-secondary-light text-secondary' }
  return { label: 'LOW', className: 'bg-success-light text-success' }
}

export default function MisconceptionTable({ breakdown }: MisconceptionTableProps) {
  const entries = Object.entries(breakdown).sort(([, a], [, b]) => b - a)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-border bg-white p-12 text-center text-sm text-text-muted">
        No misconception data yet. Have students complete practice sessions to see patterns here.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-text-primary text-white">
              <th className="px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide uppercase">Rank</th>
              <th className="px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide uppercase">
                Misconception Category
              </th>
              <th className="px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide uppercase">Count</th>
              <th className="px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide uppercase">Frequency</th>
              <th className="px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide uppercase">Severity</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([category, count], index) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const sev = severity(count)
              return (
                <tr key={category} className="border-t border-border">
                  <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('size-2.5 shrink-0 rounded-full', CATEGORY_DOT_CLASS[category] ?? 'bg-text-muted')} />
                      <span className="text-text-primary">{formatCategory(category)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-text-primary">{count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', sev.className)}>
                      {sev.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-2 text-[11px] text-text-muted italic">
        Data updates after each practice session. Misconception categories are assigned by the AI classification
        layer.
      </p>
    </div>
  )
}
