import { useMemo, useState } from 'react'
import type { EducatorAnalyticsDto } from '@dsa-tutor/types'
import MasteryRing from '@/components/ui/MasteryRing'
import { cn } from '@/lib/utils'

interface StudentProgressTableProps {
  students: EducatorAnalyticsDto['studentProgress']
  onSelectStudent?: (student: EducatorAnalyticsDto['studentProgress'][0]) => void
}

type SortColumn = 'student' | 'sessions' | 'accuracy' | 'misconception'
type SortDirection = 'asc' | 'desc'

function formatCategory(key: string): string {
  return key
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function accuracyColorClass(rate: number): string {
  if (rate >= 70) return 'text-success'
  if (rate >= 50) return 'text-secondary'
  return 'text-error'
}

function generateCSV(students: EducatorAnalyticsDto['studentProgress']): string {
  const header = 'Student,Sessions,Accuracy Rate,Top Misconception,AI Challenge Type'
  const rows = students.map((s, i) =>
    [
      `Student ${i + 1}`,
      s.totalSessions,
      `${s.averageCorrectRate}%`,
      s.topMisconception ? formatCategory(s.topMisconception) : 'None',
      s.challengeExplanation ? `"${s.challengeExplanation.replace(/"/g, '""')}"` : 'None',
    ].join(','),
  )
  return [header, ...rows].join('\n')
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function SortArrow({ direction }: { direction: SortDirection }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
      {direction === 'asc' ? (
        <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

const COLUMNS: { key: SortColumn; label: string }[] = [
  { key: 'student', label: 'Student' },
  { key: 'sessions', label: 'Sessions completed' },
  { key: 'accuracy', label: 'Accuracy rate' },
  { key: 'misconception', label: 'Top misconception' },
]

export default function StudentProgressTable({ students, onSelectStudent }: StudentProgressTableProps) {
  const [showNames, setShowNames] = useState(false)
  const [sortColumn, setSortColumn] = useState<SortColumn>('accuracy')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Stable per-student pseudonym based on original (unsorted) array
  // position, so a given student's label never changes when the table
  // is re-sorted or when the data is exported to CSV.
  const anonymizedLabels = useMemo(() => {
    const map = new Map<string, string>()
    students.forEach((s, i) => map.set(s.userId, `Student ${i + 1}`))
    return map
  }, [students])

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const sorted = useMemo(() => {
    const copy = [...students]
    const dir = sortDirection === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      switch (sortColumn) {
        case 'student': {
          const nameA = showNames ? a.name : (anonymizedLabels.get(a.userId) ?? '')
          const nameB = showNames ? b.name : (anonymizedLabels.get(b.userId) ?? '')
          return nameA.localeCompare(nameB, undefined, { numeric: true }) * dir
        }
        case 'sessions':
          return (a.totalSessions - b.totalSessions) * dir
        case 'accuracy':
          return (a.averageCorrectRate - b.averageCorrectRate) * dir
        case 'misconception': {
          const mA = a.topMisconception ?? ''
          const mB = b.topMisconception ?? ''
          return mA.localeCompare(mB) * dir
        }
        default:
          return 0
      }
    })
    return copy
  }, [students, sortColumn, sortDirection, showNames, anonymizedLabels])

  function handleExport() {
    // Always export in stable, anonymized-label order derived from the
    // original prop array - never the real names, regardless of the
    // show/hide toggle, and never affected by the current on-screen sort.
    const csv = generateCSV(students)
    downloadCSV(csv, 'student-progress.csv')
  }

  return (
    <div className="rounded-md border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">
          {students.length} {students.length === 1 ? 'student' : 'students'}
        </span>
        <button
          type="button"
          onClick={() => setShowNames((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showNames ? 'Hide names' : 'Show names'}
        </button>
      </div>

      {students.length === 0 ? (
        <div className="p-12 text-center text-sm text-text-muted">
          No student data yet. Students will appear here after completing their first practice session.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1 text-[12px] font-semibold tracking-wide text-text-muted uppercase hover:text-text-primary"
                    >
                      {col.label}
                      {sortColumn === col.key && <SortArrow direction={sortDirection} />}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide text-text-muted uppercase">
                  AI Challenge Type
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide text-text-muted uppercase">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((student) => (
                <tr
                  key={student.userId}
                  onClick={() => onSelectStudent?.(student)}
                  className={cn(
                    'border-b border-border last:border-0',
                    onSelectStudent && 'cursor-pointer hover:bg-surface',
                  )}
                >
                  <td className="px-4 py-3 text-text-primary">
                    {showNames ? student.name : anonymizedLabels.get(student.userId)}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{student.totalSessions}</td>
                  <td className={cn('px-4 py-3 font-semibold', accuracyColorClass(student.averageCorrectRate))}>
                    {student.averageCorrectRate}%
                  </td>
                  <td className="px-4 py-3">
                    {student.topMisconception ? (
                      <span className="text-text-primary">{formatCategory(student.topMisconception)}</span>
                    ) : (
                      <span className="text-text-muted">None</span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    {student.challengeExplanation ? (
                      <span className="text-text-primary" title={student.challengeExplanation}>
                        {student.challengeExplanation}
                      </span>
                    ) : (
                      <span className="text-text-muted">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <MasteryRing progress={student.averageCorrectRate / 100} size={32} strokeWidth={3} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={students.length === 0}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>
    </div>
  )
}
