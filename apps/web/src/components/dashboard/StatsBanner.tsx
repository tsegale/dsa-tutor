import { useQuery } from '@tanstack/react-query'
import type { TopicDto, UserProfile } from '@dsa-tutor/types'
import { fetchMisconceptionSummary } from '@/api/misconceptionEvents'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { SCAFFOLDING_LABEL } from '@/components/ui/ZPDScaffoldingPill'

interface StatsBannerProps {
  user: UserProfile
  topics: TopicDto[]
}

function BrainIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M9.5 3a3 3 0 0 0-3 3v.3A3 3 0 0 0 5 12a3 3 0 0 0 1.5 5.7V18a3 3 0 0 0 3 3M14.5 3a3 3 0 0 1 3 3v.3A3 3 0 0 1 19 12a3 3 0 0 1-1.5 5.7V18a3 3 0 0 1-3 3M9.5 3v18M14.5 3v18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChartLineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Neutral (not a warning) icon for the misconceptions card when nothing
// has been detected yet - a red triangle on "0 misconceptions resolved"
// implies a problem before the student has done anything (see
// remediation doc 9.10).
function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c1 3-2 4.5-2 7.5A4.5 4.5 0 0 0 12 14a2.5 2.5 0 0 0 2.5-2.5c0-.9-.4-1.4-.8-1.9 2.3 1.2 3.8 3.6 3.8 6.4a5.5 5.5 0 0 1-11 0C6.5 12 8 9.5 8 7c0-2 1.5-3.8 4-5Z" />
    </svg>
  )
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  valueColor,
  label,
  sublabel,
  secondaryLine,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  value: React.ReactNode
  valueColor: string
  label: string
  sublabel: string
  secondaryLine?: string
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-md border border-border bg-card p-4">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[28px] leading-none font-bold" style={{ color: valueColor }}>
          {value}
        </div>
        <div className="text-xs text-text-muted">{label}</div>
        <div className="truncate text-[11px] text-text-muted">{sublabel}</div>
        {secondaryLine && <div className="truncate text-[11px] text-text-muted">{secondaryLine}</div>}
      </div>
    </div>
  )
}

export default function StatsBanner({ user, topics }: StatsBannerProps) {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)

  // Lifetime counts from the misconception detect-remediate-reprobe loop
  // (see apps/api's misconceptionEvent.service.ts), not a per-session
  // proxy - "resolved" means the deterministic resolve rule actually fired,
  // not just that a wrong answer happened to carry a ground-truth label.
  const { data: misconceptionSummary } = useQuery({
    queryKey: ['misconception-events', 'summary'],
    queryFn: fetchMisconceptionSummary,
  })
  const resolvedCount = misconceptionSummary?.resolved ?? 0
  const inProgressCount = misconceptionSummary?.inProgress ?? 0

  const unlockedTopics = topics.filter((t) => !t.isLocked)
  const overallMastery =
    unlockedTopics.length > 0
      ? Math.round(unlockedTopics.reduce((sum, t) => sum + t.masteryPercent, 0) / unlockedTopics.length)
      : 0
  // On a fresh account every topic ties at 0% mastery, and sort() is
  // stable - without this guard the "most engaged" topic was just
  // whichever one happened to be listed first (Array Access), silently
  // implying progress that was never made (see remediation doc 9.1).
  const mostEngagedTopic = [...unlockedTopics].filter((t) => t.masteryPercent > 0).sort((a, b) => b.masteryPercent - a.masteryPercent)[0]

  return (
    <div id="dashboard-stats-banner" className="flex gap-4 border-b border-border bg-surface px-6 py-4">
      <StatCard
        icon={<BrainIcon />}
        iconBg="#eef2ff"
        iconColor="#3730a3"
        value={`${overallMastery}%`}
        valueColor="#3730a3"
        label="Mastery index"
        sublabel={mostEngagedTopic ? mostEngagedTopic.displayName : 'No topics started yet'}
      />

      <StatCard
        icon={<ChartLineIcon />}
        iconBg="#faeeda"
        iconColor="#854f0b"
        value={scaffoldingLevel}
        valueColor="#854f0b"
        label="Scaffolding level"
        sublabel={SCAFFOLDING_LABEL[scaffoldingLevel]}
      />

      <StatCard
        icon={resolvedCount > 0 ? <AlertTriangleIcon /> : <SearchIcon />}
        iconBg={resolvedCount > 0 ? '#fcebeb' : '#f1f5f9'}
        iconColor={resolvedCount > 0 ? '#a32d2d' : '#64748b'}
        value={resolvedCount}
        valueColor={resolvedCount > 0 ? '#a32d2d' : '#64748b'}
        label="Misconceptions resolved"
        sublabel={resolvedCount === 0 && inProgressCount === 0 ? 'None yet' : ' '}
        secondaryLine={inProgressCount > 0 ? `${inProgressCount} being worked on` : undefined}
      />

      <StatCard
        icon={<FlameIcon />}
        iconBg="#eaf3de"
        iconColor="#3b6d11"
        value={user.streakCount}
        valueColor="#3b6d11"
        label="Day streak"
        sublabel="Practice daily"
      />
    </div>
  )
}
