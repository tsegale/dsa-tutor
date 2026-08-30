import type { EducatorAnalyticsDto } from '@dsa-tutor/types'

interface SummaryStatsProps {
  analytics: EducatorAnalyticsDto
}

function UsersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-primary">
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="16" cy="9" r="2.75" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <path d="M15.5 14.2c2.5.4 4.5 2.5 4.5 5.8" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-primary">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TargetIcon({ className }: { className: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-secondary">
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

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

function StatCard({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center gap-3 rounded-md border border-border bg-white p-4">{children}</div>
}

export default function SummaryStats({ analytics }: SummaryStatsProps) {
  const topMisconceptionEntry = Object.entries(analytics.misconceptionBreakdown).sort(([, a], [, b]) => b - a)[0]

  return (
    <div className="flex gap-4">
      <StatCard>
        <UsersIcon />
        <div>
          <div className="text-[32px] leading-none font-bold text-primary">{analytics.totalStudents}</div>
          <div className="text-xs text-text-muted">Students enrolled</div>
        </div>
      </StatCard>

      <StatCard>
        <PlayIcon />
        <div>
          <div className="text-[32px] leading-none font-bold text-text-primary">{analytics.totalSessions}</div>
          <div className="text-xs text-text-muted">Practice sessions completed</div>
        </div>
      </StatCard>

      <StatCard>
        <TargetIcon className={accuracyColorClass(analytics.averageCorrectRate)} />
        <div>
          <div className={`text-[32px] leading-none font-bold ${accuracyColorClass(analytics.averageCorrectRate)}`}>
            {analytics.averageCorrectRate}%
          </div>
          <div className="text-xs text-text-muted">Mean prediction accuracy</div>
        </div>
      </StatCard>

      <StatCard>
        <WarningIcon />
        <div>
          {topMisconceptionEntry ? (
            <div className="text-xl leading-tight font-bold text-text-primary">{formatCategory(topMisconceptionEntry[0])}</div>
          ) : (
            <div className="text-xl leading-tight font-bold text-text-muted">None yet</div>
          )}
          <div className="text-xs text-text-muted">Top misconception this period</div>
        </div>
      </StatCard>
    </div>
  )
}
