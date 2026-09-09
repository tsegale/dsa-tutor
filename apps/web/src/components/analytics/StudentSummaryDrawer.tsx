import { useEffect, useState } from 'react'
import type { EducatorAnalyticsDto, StudentSummaryResponse } from '@dsa-tutor/types'
import { getStudentSummary } from '@/api/summaries'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface StudentSummaryDrawerProps {
  student: EducatorAnalyticsDto['studentProgress'][0] | null
  open: boolean
  onClose: () => void
}

// Only Bubble Sort has real content until Phase 16 adds more algorithms.
const ALGORITHM_NAME = 'Bubble Sort'

const TREND_STYLE: Record<StudentSummaryResponse['scaffoldingTrend'], { label: string; bg: string; color: string }> = {
  improving: { label: 'Trend: Improving', bg: '#d1fae5', color: '#065f46' },
  stable: { label: 'Trend: Stable', bg: '#e0e7ff', color: '#3730a3' },
  declining: { label: 'Trend: Declining', bg: '#fecaca', color: '#7f1d1d' },
  insufficient_data: { label: 'Trend: Not enough data', bg: 'var(--color-surface)', color: 'var(--color-text-muted)' },
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LoadingLines() {
  return (
    <div className="space-y-2 p-4">
      <div className="h-3 w-1/3 animate-pulse rounded bg-border" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-border" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-border" />
      <div className="h-3 w-[90%] animate-pulse rounded bg-border" />
    </div>
  )
}

export default function StudentSummaryDrawer({ student, open, onClose }: StudentSummaryDrawerProps) {
  const [summary, setSummary] = useState<StudentSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchSummary() {
    if (!student) return
    setIsLoading(true)
    setError(null)
    try {
      // The real name is never sent to the AI service - only the same
      // anonymised label the drawer itself displays, so the generated
      // narrative can't leak the student's actual name into the report.
      const result = await getStudentSummary({
        studentId: student.userId,
        studentName: `Student ${student.userId.slice(-4)}`,
        algorithmName: ALGORITHM_NAME,
        totalSessions: student.totalSessions,
        totalPredictions: student.totalPredictions,
        correctPredictions: student.correctPredictions,
        hintsRequested: student.hintsRequested,
        misconceptionBreakdown: student.misconceptionBreakdown,
        scaffoldingProgression: student.scaffoldingProgression,
        feynmanScores: student.feynmanScores,
        averageTimePerStep: student.averageTimePerStep,
      })
      setSummary(result)
    } catch {
      setError('Could not generate the student report. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && student && student.totalSessions > 0) {
      setSummary(null)
      void fetchSummary()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, student?.userId])

  const anonymizedName = student ? `Student ${student.userId.slice(-4)}` : ''
  const hasNoSessions = student?.totalSessions === 0

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-lg">Student Report</SheetTitle>
          <p className="text-sm text-text-muted">{anonymizedName}</p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {hasNoSessions ? (
            <p className="text-sm text-text-muted">
              {anonymizedName} has not completed any practice sessions yet. No summary available.
            </p>
          ) : (
            <>
              {error && <p className="mb-3 text-sm text-error">{error}</p>}

              {isLoading && <LoadingLines />}

              {summary && !isLoading && (
                <div className="flex flex-col gap-5">
                  <div>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: TREND_STYLE[summary.scaffoldingTrend].bg,
                        color: TREND_STYLE[summary.scaffoldingTrend].color,
                      }}
                    >
                      {TREND_STYLE[summary.scaffoldingTrend].label}
                    </span>
                  </div>

                  <p className="text-[14px] leading-[1.6] text-text-primary">{summary.narrativeSummary}</p>

                  {summary.strengthAreas.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-success uppercase">Strengths</h3>
                      <ul className="mt-2 space-y-1.5">
                        {summary.strengthAreas.map((strength, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-text-primary">
                            <span className="mt-0.5 shrink-0 text-success">
                              <CheckIcon />
                            </span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.concernAreas.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold tracking-wide text-secondary uppercase">Concerns</h3>
                      <ul className="mt-2 space-y-1.5">
                        {summary.concernAreas.map((concern, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-text-primary">
                            <span className="mt-0.5 shrink-0 text-secondary">
                              <WarningIcon />
                            </span>
                            <span>{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-md border-l-4 border-primary bg-primary-light p-3">
                    <p className="text-xs font-semibold text-primary uppercase">Recommended Action</p>
                    <p className="mt-1 text-[14px] font-bold text-text-primary">{summary.recommendedAction}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void fetchSummary()}
                    className="self-start text-[12px] text-text-muted hover:text-text-primary hover:underline"
                  >
                    Regenerate
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
