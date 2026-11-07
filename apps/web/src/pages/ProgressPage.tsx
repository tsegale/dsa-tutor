import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { topicPath } from '@/data/tracks'
import { moduleLabel } from '@/config/curriculum'
import { useLearningPlan } from '@/hooks/useLearningPlan'
import { useStudyScope } from '@/hooks/useStudyScope'
import { orderTopics } from '@/utils/curriculum'
import { getProgressToNextLevel } from '@/utils/xpLevels'
import { AppShell } from '@/components/layout/AppShell'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import BadgesSection from '@/components/dashboard/BadgesSection'
import { AnalyticsSection } from '@/components/profile/AnalyticsSection'

// Everything about how the learning is going, in one place: level and XP,
// mastery per module (or per study topic for a participant), the detailed
// analytics that used to sit on Profile, and badges. Profile is the account:
// identity, study participation, preferences, data and privacy.

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
  const { topicsQuery, syllabus, plan } = useLearningPlan()
  const { data: topics, isLoading, isFetching, refetch } = topicsQuery
  const { hash } = useLocation()

  // Links into the analytics (including old ones to Profile, which redirect
  // here) land on them once the page has rendered past its loading state.
  useEffect(() => {
    if (hash === '#learning-analytics' && topics) {
      document.getElementById('learning-analytics')?.scrollIntoView({ block: 'start' })
    }
  }, [hash, topics])

  if (isLoading) {
    return (
      <AppShell>
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
      <AppShell>
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
    const first = plan?.recommended ?? null
    return (
      <AppShell>
        <h1 className="mb-6 text-h1 text-ink">Progress</h1>
        <EmptyState
          icon={<ChartIcon />}
          title="Your progress starts with your first topic."
          description="Mastery, level and badges appear here as you answer predictions."
          action={
            first ? (
              <Button asChild size="sm">
                <Link to={topicPath(first.topic.name)}>Start {first.topic.displayName}</Link>
              </Button>
            ) : undefined
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
        complete: topic.masteryPercent >= 60,
        label: `${topic.masteryPercent}% mastery`,
      }))
    : syllabus.map(({ module, status }) => ({
        key: module.id,
        name: moduleLabel(module),
        to: `/module/${module.number}`,
        value: status.mean,
        complete: status.state === 'complete',
        label: `${status.mean}% mean mastery · ${status.complete} of ${status.total} complete`,
      }))

  return (
    <AppShell>
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
          {restricted ? 'Study topics' : 'Modules'}
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.key} className="rounded-md border border-rule bg-surface p-card">
              <Link to={row.to} className="text-small font-medium text-ink hover:underline">
                {row.name}
              </Link>
              <div className="mt-2">
                <Progress value={row.value} label={row.label} tone={row.complete ? 'success' : 'brand'} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mb-8">
        <AnalyticsSection />
      </div>

      <BadgesSection />
    </AppShell>
  )
}
