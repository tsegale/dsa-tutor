import { useMemo, useState } from 'react'
import { ScaffoldingLevel } from '@dsa-tutor/types'
import type { EducatorAnalyticsDto } from '@dsa-tutor/types'
import MasteryRing from '@/components/ui/MasteryRing'
import { cn } from '@/lib/utils'
import { StudentAvatar } from '@/components/brand'

interface StudentProgressTableProps {
  students: EducatorAnalyticsDto['studentProgress']
  onSelectStudent?: (student: EducatorAnalyticsDto['studentProgress'][0]) => void
}

const SCAFFOLDING_LEVEL_ORDER: string[] = [
  ScaffoldingLevel.HIGH,
  ScaffoldingLevel.MEDIUM,
  ScaffoldingLevel.LOW,
  ScaffoldingLevel.NONE,
]

function hintDependencyPercent(student: EducatorAnalyticsDto['studentProgress'][0]): number | null {
  if (student.totalPredictions === 0) return null
  return Math.round((student.hintsRequested / student.totalPredictions) * 100)
}

// A lightweight local proxy for "declining" - the real AI-computed
// scaffoldingTrend only exists per-student, on demand, once the report
// drawer is opened (an actual Claude call), so the whole-roster table
// can't show it without firing a speculative AI call per row. This
// instead compares the first vs. last scaffolding level already present
// in the enriched analytics payload: needing more support at the end of
// the progression than at the start is the same signal in miniature.
function isLocallyDeclining(student: EducatorAnalyticsDto['studentProgress'][0]): boolean {
  const progression = student.scaffoldingProgression
  if (progression.length < 2) return false
  const startIndex = SCAFFOLDING_LEVEL_ORDER.indexOf(progression[0])
  const endIndex = SCAFFOLDING_LEVEL_ORDER.indexOf(progression[progression.length - 1])
  if (startIndex === -1 || endIndex === -1) return false
  return endIndex < startIndex
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

function AlertTriangleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
                  Hint dependency
                </th>
                <th className="px-4 py-2.5 text-left text-[12px] font-semibold tracking-wide text-text-muted uppercase">
                  Action needed
                </th>
                <th
                  className="px-4 py-2.5 text-center text-[12px] font-semibold tracking-wide text-text-muted uppercase"
                  style={{ width: 60 }}
                >
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((student) => {
                const label = anonymizedLabels.get(student.userId) ?? ''
                const avatarInitials = `S${label.match(/\d+/)?.[0] ?? ''}`
                const hintPct = hintDependencyPercent(student)
                const declining = isLocallyDeclining(student)
                const needsManualReview = student.averageCorrectRate < 50 && (hintPct ?? 0) > 70
                const barStyle =
                  hintPct === null
                    ? null
                    : hintPct < 40
                      ? { bar: '#d1fae5', text: '#065f46' }
                      : hintPct <= 70
                        ? { bar: '#fed7aa', text: '#9a3412' }
                        : { bar: '#fca5a5', text: '#7f1d1d' }

                return (
                <tr
                  key={student.userId}
                  onClick={() => onSelectStudent?.(student)}
                  className={cn(
                    'border-b border-border last:border-0',
                    onSelectStudent && 'cursor-pointer hover:bg-surface',
                  )}
                >
                  <td className="px-4 py-3 text-text-primary">
                    <div className="flex items-center gap-2">
                      <StudentAvatar initials={avatarInitials} size={24} />
                      <span>{showNames ? student.name : label}</span>
                    </div>
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
                    {hintPct === null || !barStyle ? (
                      <span className="text-text-muted">&mdash;</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${hintPct}%`, backgroundColor: barStyle.bar }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: barStyle.text }}>
                          {hintPct}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {needsManualReview ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: '#fecaca', color: '#7f1d1d' }}
                      >
                        <AlertTriangleIcon />
                        Manual review
                      </span>
                    ) : declining ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: '#faeeda', color: '#854f0b' }}
                      >
                        Declining trend
                      </span>
                    ) : (
                      <span className="text-text-muted">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center" style={{ width: 60 }}>
                    <div className="flex justify-center">
                      <MasteryRing
                        progress={student.averageCorrectRate / 100}
                        size={40}
                        strokeWidth={3}
                        showPercent={false}
                      />
                    </div>
                  </td>
                </tr>
                )
              })}
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
