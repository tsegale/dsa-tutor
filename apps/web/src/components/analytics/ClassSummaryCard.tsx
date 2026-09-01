import { useState } from 'react'
import type { EducatorAnalyticsDto, ClassSummaryResponse } from '@dsa-tutor/types'
import { getClassSummary } from '@/api/summaries'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ClassSummaryCardProps {
  analytics: EducatorAnalyticsDto
}

// Only Bubble Sort has real content until Phase 16 adds more algorithms.
const ALGORITHM_NAME = 'Bubble Sort'

function SparkleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 13.8 9.2 21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2Z" />
    </svg>
  )
}

function LightbulbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.5.8.5 1.3V16h6v-.8c0-.5.1-1 .5-1.3A6 6 0 0 0 12 3Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function buildRequest(analytics: EducatorAnalyticsDto) {
  const topMisconceptions = Object.entries(analytics.misconceptionBreakdown)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  return {
    algorithmName: ALGORITHM_NAME,
    totalStudents: analytics.totalStudents,
    averageCorrectRate: analytics.averageCorrectRate,
    topMisconceptions,
    stepDifficultyHeatmap: analytics.stepDifficultyHeatmap.map((s) => ({
      stepIndex: s.stepIndex,
      errorCount: s.errorCount,
    })),
    scaffoldingDistribution: analytics.scaffoldingDistribution,
  }
}

function LoadingLines() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-4/5 animate-pulse rounded bg-border" />
      <div className="h-3 w-3/5 animate-pulse rounded bg-border" />
      <div className="h-3 w-[90%] animate-pulse rounded bg-border" />
    </div>
  )
}

export default function ClassSummaryCard({ analytics }: ClassSummaryCardProps) {
  const [summary, setSummary] = useState<ClassSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getClassSummary(buildRequest(analytics))
      setSummary(result)
    } catch {
      setError('Could not generate the class report. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-md border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-secondary">
            <SparkleIcon />
          </span>
          <h2 className="text-[18px] font-bold text-primary">AI Class Report</h2>
        </div>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isLoading}
          className="rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : summary ? 'Regenerate report' : 'Generate Report'}
        </button>
      </div>

      <div className="mt-4">
        {error && <p className="mb-3 text-sm text-error">{error}</p>}

        {!summary && !isLoading && (
          <div className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-text-muted">
            Click Generate Report to get an AI-powered analysis of your class performance.
          </div>
        )}

        {isLoading && <LoadingLines />}

        {summary && !isLoading && (
          <div>
            <p className="text-[14px] leading-[1.6] text-text-primary">{summary.narrativeSummary}</p>

            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-primary uppercase">Key Findings</h3>
                <ul className="mt-2 space-y-1.5">
                  {summary.keyFindings.map((finding, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-text-primary">
                      <span className="text-primary">&bull;</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-wide text-secondary uppercase">
                  Recommended Interventions
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {summary.recommendedInterventions.map((intervention, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-text-primary">
                      <span className="text-secondary">&bull;</span>
                      <span>{intervention}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {summary.curriculumAdjustment && (
              <div className="mt-4 flex gap-2 rounded-md border-l-4 border-secondary bg-secondary-light p-3">
                <span className="mt-0.5 shrink-0 text-secondary">
                  <LightbulbIcon />
                </span>
                <p className="text-[13px] text-text-primary">{summary.curriculumAdjustment}</p>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    className="text-[12px] text-text-muted hover:text-text-primary hover:underline"
                  >
                    Regenerate
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  AI-generated from your current interaction log data. Regenerate after new sessions to refresh.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
