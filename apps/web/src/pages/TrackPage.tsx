import { Link, Navigate, useParams } from 'react-router-dom'
import { getTrackBySlug } from '@/data/tracks'
import { moduleByNumber, moduleForTrack, moduleLabel, type Module } from '@/config/curriculum'
import { useTopics } from '@/hooks/useTopics'
import { useStudyScope } from '@/hooks/useStudyScope'
import { buildSyllabus } from '@/utils/syllabus'
import { unmetLabel } from '@/utils/moduleStatus'
import { AppShell } from '@/components/layout/AppShell'
import { TopicRow } from '@/components/track/TopicRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ProgressRing } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/button'

// A module's page: its topics as a numbered list in curriculum order,
// numbered and marked exactly as the curriculum rail shows them. Reached as
// /module/:number (the linkable form) or /track/:track (kept working).

function ModuleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading this module">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-prose" />
        </div>
        <Skeleton className="size-[72px] rounded-full" />
      </div>
      <div className="divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-card py-row">
            <Skeleton className="size-3.5 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

function useModuleFromRoute(): Module | null {
  const { track: slug, number } = useParams<{ track?: string; number?: string }>()
  if (number !== undefined) return moduleByNumber(number)
  const track = getTrackBySlug(slug)
  return track ? moduleForTrack(track.id) : null
}

export default function TrackPage() {
  const module = useModuleFromRoute()
  const { restricted } = useStudyScope()
  const { data: topics, isLoading, isFetching, refetch } = useTopics()

  // A study participant has no module pages: their three topics are on Home.
  if (restricted) return <Navigate to="/" replace />

  if (!module) {
    return (
      <AppShell crumbs={[{ label: 'Home', to: '/' }, { label: 'Not found' }]}>
        <h1 className="sr-only">Module not found</h1>
        <EmptyState
          title="There is no module at this address."
          action={
            <Button asChild size="sm">
              <Link to="/">Go to Home</Link>
            </Button>
          }
        />
      </AppShell>
    )
  }

  const crumbs = [{ label: 'Home', to: '/' }, { label: moduleLabel(module) }]

  if (isLoading) {
    return (
      <AppShell crumbs={crumbs}>
        <ModuleSkeleton />
      </AppShell>
    )
  }

  if (!topics) {
    return (
      <AppShell crumbs={crumbs}>
        <h1 className="mb-6 text-h1 text-ink">{moduleLabel(module)}</h1>
        <ErrorState
          title={`The ${module.title} topics did not load.`}
          description="Nothing is listed rather than an incomplete module. Check your connection, then try again."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </AppShell>
    )
  }

  const entry = buildSyllabus(topics).find((candidate) => candidate.module.id === module.id)
  const totalMinutes = entry ? entry.topics.reduce((sum, t) => sum + t.topic.estimatedMinutes, 0) : 0
  const next = entry?.topics.find((t) => t.openable && t.state !== 'complete' && t.topic.masteryPercent === 0) ?? entry?.topics.find((t) => t.openable && t.state !== 'complete')

  return (
    <AppShell crumbs={crumbs}>
      <header className="mb-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-mono-sm text-ink-2">Module {module.number}</p>
          <h1 className="mt-1 text-h1 text-ink">{module.title}</h1>
          <p className="mt-2 max-w-prose text-body text-ink-2">{module.subtitle}</p>
          {entry && (
            <p className="mt-3 text-mono-sm text-ink-2">
              {entry.status.complete} of {entry.status.total} complete · {entry.status.mean}% mean mastery · about {totalMinutes} min
            </p>
          )}
        </div>
        {entry && (
          <ProgressRing
            value={entry.status.total ? (entry.status.complete / entry.status.total) * 100 : 0}
            size={72}
            strokeWidth={6}
            tone={entry.status.state === 'complete' ? 'success' : 'brand'}
            ariaLabel={`${moduleLabel(module)} completion`}
          />
        )}
      </header>

      {entry?.status.state === 'locked' && entry.status.unmet && (
        <p role="note" className="mb-4 rounded-md border border-rule bg-surface-sunk px-card py-row text-small text-ink">
          {unmetLabel(entry.status.unmet)}. You can still open these topics; they build on{' '}
          <Link to={`/module/${entry.status.unmet.module.number}`} className="font-medium text-accent-foreground underline">
            {moduleLabel(entry.status.unmet.module)}
          </Link>
          .
        </p>
      )}

      {!entry ? (
        <EmptyState
          title={`There are no ${module.title} topics to open yet.`}
          description="Pick another module from the curriculum, or search for a topic by name."
          action={
            <Button asChild size="sm">
              <Link to="/">Back to Home</Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="topics-heading">
          <h2 id="topics-heading" className="sr-only">
            Topics in order
          </h2>
          <ol className="divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
            {entry.topics.map((topicEntry) => (
              <TopicRow key={topicEntry.topic.id} entry={topicEntry} isNext={topicEntry.topic.id === next?.topic.id} />
            ))}
          </ol>
        </section>
      )}
    </AppShell>
  )
}
