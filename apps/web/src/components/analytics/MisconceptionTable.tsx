import { cn } from '@/lib/utils'

interface MisconceptionTableProps {
  breakdown: Record<string, number>
}

const MISCONCEPTION_DESCRIPTIONS: Record<string, { readable: string; detail: string; dot: string }> = {
  OFF_BY_ONE: {
    readable: 'Off-by-one array indexing',
    detail: 'Selecting index n instead of n-1 as the loop boundary',
    dot: 'var(--category-1)',
  },
  ORDER_OF_OPERATIONS: {
    readable: 'Order of operations error',
    detail: 'Swapping before comparing, or applying the wrong comparison direction',
    dot: 'var(--category-2)',
  },
  STRUCTURAL_PROPERTY_VIOLATION: {
    readable: 'Structural property violation',
    detail: 'Swapping equal elements, breaks the stable sort invariant',
    dot: 'var(--category-3)',
  },
  POINTER_CONFUSION: {
    readable: 'Pointer null reference confusion',
    detail: 'Treating a pointer to a node as the node value itself',
    dot: 'var(--category-4)',
  },
  BASE_CASE_OMISSION: {
    readable: 'Base case omission',
    detail: 'Failing to identify or apply the recursion termination condition',
    dot: 'var(--category-5)',
  },
  COMPLEXITY_MISATTRIBUTION: {
    readable: 'Complexity misattribution',
    detail: 'Incorrectly stating or reasoning about time or space complexity',
    dot: 'var(--category-6)',
  },
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
      <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-text-muted">
        No misconception data yet. Have students complete practice sessions to see patterns here.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
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
              const desc = MISCONCEPTION_DESCRIPTIONS[category]
              return (
                <tr key={category} className="border-t border-border">
                  <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: desc?.dot ?? 'var(--category-other)' }}
                      />
                      <div>
                        <p className="text-text-primary">{desc?.readable ?? formatCategory(category)}</p>
                        {desc && <p className="mt-0.5 text-[10px] text-text-muted">{desc.detail}</p>}
                      </div>
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
