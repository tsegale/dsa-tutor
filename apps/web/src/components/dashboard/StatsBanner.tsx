import { useQuery } from '@tanstack/react-query'
import type { TopicDto, UserProfile } from '@dsa-tutor/types'
import { apiFetch } from '@/api/client'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { SCAFFOLDING_LABEL } from '@/components/ui/ZPDScaffoldingPill'

interface StatsBannerProps {
  user: UserProfile
  topics: TopicDto[]
}

interface SessionDto {
  id: string
  topic: { name: string; displayName: string }
}

interface InteractionDto {
  predictionCorrect: boolean
  misconceptionCategory: string | null
}

function formatCategory(key: string): string {
  return key
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  value: React.ReactNode
  valueColor: string
  label: string
  sublabel: string
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-md border border-border bg-white p-4">
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
      </div>
    </div>
  )
}

export default function StatsBanner({ user, topics }: StatsBannerProps) {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)

  const { data: latestSession } = useQuery({
    queryKey: ['sessions', 'latest', 'completed'],
    queryFn: () => apiFetch<SessionDto | null>('/api/v1/sessions?latest=true&completed=true'),
  })

  // Only the most recent completed session's interactions are available
  // without a "list all my sessions" endpoint, which this screen's UI-only
  // scope can't add - so this is a recent-session proxy, not a lifetime total.
  const { data: latestInteractions = [] } = useQuery({
    queryKey: ['interactions', 'session', latestSession?.id],
    queryFn: () => apiFetch<InteractionDto[]>(`/api/v1/interactions/session/${latestSession!.id}`),
    enabled: !!latestSession?.id,
  })

  const unlockedTopics = topics.filter((t) => !t.isLocked)
  const overallMastery =
    unlockedTopics.length > 0
      ? Math.round(unlockedTopics.reduce((sum, t) => sum + t.masteryPercent, 0) / unlockedTopics.length)
      : 0
  const mostEngagedTopic = [...unlockedTopics].sort((a, b) => b.masteryPercent - a.masteryPercent)[0]

  const misconceptionCounts: Record<string, number> = {}
  let misconceptionsResolved = 0
  latestInteractions.forEach((i) => {
    if (i.misconceptionCategory) {
      misconceptionsResolved += 1
      misconceptionCounts[i.misconceptionCategory] = (misconceptionCounts[i.misconceptionCategory] ?? 0) + 1
    }
  })
  const topMisconception = Object.entries(misconceptionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

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
        icon={<AlertTriangleIcon />}
        iconBg="#fcebeb"
        iconColor="#a32d2d"
        value={misconceptionsResolved}
        valueColor="#a32d2d"
        label="Misconceptions resolved"
        sublabel={topMisconception ? formatCategory(topMisconception) : 'None yet'}
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
