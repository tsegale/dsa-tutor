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
    <div
      className="flex items-start gap-3 rounded-[10px] p-3.5"
      style={{ backgroundColor: 'var(--tone-indigo-bg)', border: '0.5px solid var(--tone-indigo-border)' }}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-indigo text-white">
        <SparkleIcon />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-medium tracking-wide text-tone-indigo-label uppercase">AI classroom insight</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={isLoading}
                className="shrink-0 rounded-md bg-brand-indigo px-3 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Generating...' : summary ? 'Regenerate' : 'Generate Report'}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              AI-generated from your current interaction log data. Regenerate after new sessions to refresh.
            </TooltipContent>
          </Tooltip>
        </div>

        {error && <p className="mt-1.5 text-xs text-error">{error}</p>}

        {!summary && !isLoading && !error && (
          <p className="mt-1 text-xs text-tone-indigo">
            Click Generate Report to get an AI-powered analysis of your class performance.
          </p>
        )}

        {isLoading && (
          <div className="mt-2">
            <LoadingLines />
          </div>
        )}

        {summary && !isLoading && (
          <p className="mt-0.5 text-xs leading-[1.6] text-tone-indigo">
            {summary.narrativeSummary}
            {summary.keyFindings[0] && <> {summary.keyFindings[0]}</>}
          </p>
        )}
      </div>
    </div>
  )
}
