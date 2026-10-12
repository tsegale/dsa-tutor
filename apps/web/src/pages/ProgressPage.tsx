import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { TRACKS, topicPath } from '@/data/tracks'
import { useTopics } from '@/hooks/useTopics'
import { useStudyScope } from '@/hooks/useStudyScope'
import { orderTopics, pickContinue, topicsInTrack, trackProgress } from '@/utils/curriculum'
import { getProgressToNextLevel } from '@/utils/xpLevels'
import { AppShell } from '@/components/layout/AppShell'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import BadgesSection from '@/components/dashboard/BadgesSection'

// Progress over the curriculum: level and XP (moved here from the old
// dashboard header), completion per track (or per study topic for a study
// participant), and badges.

function ChartIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 16h14M6 13V9m4 4V5m4 8v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function ProgressPage() {
  const { user } = useAuth()
  const { restricted } = useStudyScope()
  const { data: topics, isLoading, isFetching, refetch } = useTopics()
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Progress' }]

  if (isLoading) {
    return (
      <AppShell crumbs={crumbs}>
        <div aria-busy="true" aria-label="Loading your progress" className="flex flex-col gap-6">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-36 w-full rounded-md" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  if (!topics) {
    return (
      <AppShell crumbs={crumbs}>
        <h1 className="mb-6 text-h1 text-ink">Progress</h1>
        <ErrorState
          title="Your progress did not load."
          description="Nothing is shown rather than numbers that could be wrong. Check your connection, then try again."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </AppShell>
    )
  }

  const xpTotal = user?.xpTotal ?? 0
  const hasHistory = xpTotal > 0 || topics.some((topic) => topic.masteryPercent > 0)

  if (!hasHistory) {
    const first = pickContinue(topics, null)
    return (
      <AppShell crumbs={crumbs}>
        <h1 className="mb-6 text-h1 text-ink">Progress</h1>
        <EmptyState
          icon={<ChartIcon />}
          title="Your progress starts with your first topic."
          description="Mastery, level and badges appear here as you answer predictions."
          action={
            first.kind === 'done' ? undefined : (
              <Button asChild size="sm">
                <Link to={topicPath(first.topic.name)}>Start {first.topic.displayName}</Link>
              </Button>
            )
          }
        />
      </AppShell>
    )
  }

  const xp = getProgressToNextLevel(xpTotal)
  const rows = restricted
    ? orderTopics(topics).map((topic) => ({
        key: topic.name,
        name: topic.displayName,
        to: topicPath(topic.name),
        value: topic.masteryPercent,
        label: `${topic.masteryPercent}% mastery`,
      }))
    : TRACKS.map((track) => ({ track, progress: trackProgress(topicsInTrack(topics, track.id)) }))
        .filter(({ progress }) => progress.total > 0)
        .map(({ track, progress }) => ({
          key: track.slug,
          name: track.name,
          to: `/track/${track.slug}`,
          value: progress.percent,
          label: `${progress.complete} of ${progress.total} complete`,
        }))

  return (
    <AppShell crumbs={crumbs}>
      <h1 className="mb-6 text-h1 text-ink">Progress</h1>

      <section aria-labelledby="level-heading" className="mb-8 rounded-md border border-rule bg-surface p-card shadow-e1">
        <h2 id="level-heading" className="text-micro text-ink-2">
          Level
        </h2>
        <p className="mt-1 text-h3 text-ink">{xp.level.title}</p>
        <div className="mt-3 max-w-md">
          <Progress value={xp.percent} label={xp.nextLevel ? `${(xp.xpForNextLevel ?? 0) - xpTotal} XP to ${xp.nextLevel.title}` : 'Highest level reached'} />
        </div>
        <p className="mt-2 text-mono-sm text-ink-2">{xpTotal} XP</p>
      </section>

      <section aria-labelledby="breakdown-heading" className="mb-8">
        <h2 id="breakdown-heading" className="mb-3 text-h2 text-ink">
          {restricted ? 'Study topics' : 'Tracks'}
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.key} className="rounded-md border border-rule bg-surface p-card">
              <Link to={row.to} className="text-small font-medium text-ink hover:underline">
                {row.name}
              </Link>
              <div className="mt-2">
                <Progress value={row.value} label={row.label} tone={row.value >= (restricted ? 80 : 100) ? 'success' : 'brand'} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <BadgesSection />
    </AppShell>
  )
}
