import type { EducatorAnalyticsDto } from '@dsa-tutor/types'

interface SummaryStatsProps {
  analytics: EducatorAnalyticsDto
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="16" cy="9" r="2.75" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <path d="M15.5 14.2c2.5.4 4.5 2.5 4.5 5.8" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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

function accuracyColor(rate: number): string {
  if (rate >= 70) return 'var(--tone-green-fg)'
  if (rate >= 50) return 'var(--tone-amber-fg)'
  return 'var(--tone-red-fg)'
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  valueColor,
  valueSizeClass = 'text-[32px]',
  label,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  value: React.ReactNode
  valueColor: string
  valueSizeClass?: string
  label: string
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-md border border-border bg-card p-4">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div>
        <div className={`${valueSizeClass} leading-tight font-bold`} style={{ color: valueColor }}>
          {value}
        </div>
        <div className="text-xs text-text-muted">{label}</div>
      </div>
    </div>
  )
}

export default function SummaryStats({ analytics }: SummaryStatsProps) {
  const topMisconceptionEntry = Object.entries(analytics.misconceptionBreakdown).sort(([, a], [, b]) => b - a)[0]

  return (
    <div className="flex gap-4">
      <StatCard
        icon={<UsersIcon />}
        iconBg="var(--tone-indigo-bg)"
        iconColor="var(--tone-indigo-fg)"
        value={analytics.totalStudents}
        valueColor="var(--tone-indigo-fg)"
        label="Students enrolled"
      />

      <StatCard
        icon={<PlayIcon />}
        iconBg="var(--tone-green-bg)"
        iconColor="var(--tone-green-fg)"
        value={analytics.totalSessions}
        valueColor="var(--tone-green-fg)"
        label="Practice sessions completed"
      />

      <StatCard
        icon={<TargetIcon />}
        iconBg="var(--tone-amber-bg)"
        iconColor="var(--tone-amber-fg)"
        value={`${analytics.averageCorrectRate}%`}
        valueColor={accuracyColor(analytics.averageCorrectRate)}
        label="Mean prediction accuracy"
      />

      <StatCard
        icon={<WarningIcon />}
        iconBg="var(--tone-red-bg)"
        iconColor="var(--tone-red-fg)"
        value={topMisconceptionEntry ? formatCategory(topMisconceptionEntry[0]) : 'None yet'}
        valueColor={topMisconceptionEntry ? 'var(--tone-red-fg)' : 'var(--color-text-muted)'}
        valueSizeClass="text-xl"
        label="Top misconception this period"
      />
    </div>
  )
}
