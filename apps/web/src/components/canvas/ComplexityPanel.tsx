import { cn } from '@/lib/utils'

const ROWS = [
  { label: 'Best case', note: 'already sorted', value: 'O(n)', colorClass: 'text-primary bg-primary-light' },
  { label: 'Average case', note: '', value: 'O(n²)', colorClass: 'text-secondary bg-secondary-light' },
  { label: 'Worst case', note: '', value: 'O(n²)', colorClass: 'text-error bg-error-light' },
  { label: 'Space', note: 'in-place', value: 'O(1)', colorClass: 'text-success bg-success-light' },
]

export default function ComplexityPanel() {
  return (
    <div className="flex h-full flex-col gap-3 rounded-md border border-border bg-white p-4">
      {ROWS.map((row) => (
        <div key={row.label} className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">
            {row.label}
            {row.note && <span className="ml-1 text-xs text-text-muted">({row.note})</span>}
          </span>
          <span className={cn('rounded-md px-2 py-1 font-mono text-sm font-semibold', row.colorClass)}>
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}
