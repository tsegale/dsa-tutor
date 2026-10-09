import { Link, Navigate, useParams } from 'react-router-dom'
import { getTrackBySlug } from '@/data/tracks'
import { useTopics } from '@/hooks/useTopics'
import { useStudyScope } from '@/hooks/useStudyScope'
import { nextTopicIn, topicsInTrack, trackProgress } from '@/utils/curriculum'
import { AppShell } from '@/components/layout/AppShell'
import { TopicRow } from '@/components/track/TopicRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ProgressRing } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/button'

// Where the topics live: a track's curriculum as a numbered list, in order.
// A curriculum is a sequence, which is what earns the numbering. Rows, not
// cards, so an 18-topic track scans as a list rather than a wall.

function TrackSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading this track">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-full max-w-prose" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="size-[72px] rounded-full" />
      </div>
      <div className="divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-card py-row">
            <Skeleton className="h-4 w-6" />
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

export default function TrackPage() {
  const { track: slug } = useParams<{ track: string }>()
  const track = getTrackBySlug(slug)
  const { restricted } = useStudyScope()
  const { data: topics, isLoading, isFetching, refetch } = useTopics()

  // A study participant has no track pages: their three topics are on Home.
  if (restricted) return <Navigate to="/" replace />

  if (!track) {
    return (
      <AppShell crumbs={[{ label: 'Home', to: '/' }, { label: 'Not found' }]}>
        <h1 className="sr-only">Track not found</h1>
        <EmptyState
          title="There is no track at this address."
          action={
            <Button asChild size="sm">
              <Link to="/">Go to Home</Link>
            </Button>
          }
        />
      </AppShell>
    )
  }

  const crumbs = [{ label: 'Home', to: '/' }, { label: track.name }]

  if (isLoading) {
    return (
      <AppShell crumbs={crumbs}>
        <TrackSkeleton />
      </AppShell>
    )
  }

  if (!topics) {
    return (
      <AppShell crumbs={crumbs}>
        <h1 className="mb-6 text-h1 text-ink">{track.name}</h1>
        <ErrorState
          title={`The ${track.name} topics did not load.`}
          description="Nothing is listed rather than an incomplete track. Check your connection, then try again."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </AppShell>
    )
  }

  const trackTopics = topicsInTrack(topics, track.id)
  const progress = trackProgress(trackTopics)
  const next = nextTopicIn(trackTopics)
  const totalMinutes = trackTopics.reduce((sum, topic) => sum + topic.estimatedMinutes, 0)

  return (
    <AppShell crumbs={crumbs}>
      <header className="mb-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-h1 text-ink">{track.name}</h1>
          <p className="mt-2 max-w-prose text-body text-ink-2">{track.description}</p>
          {trackTopics.length > 0 && (
            <p className="mt-3 text-mono-sm text-ink-2">
              {progress.complete} of {progress.total} complete · about {totalMinutes} min in all
            </p>
          )}
        </div>
        {trackTopics.length > 0 && (
          <ProgressRing value={progress.percent} size={72} strokeWidth={6} tone={progress.percent === 100 ? 'success' : 'brand'} ariaLabel={`${track.name} completion`} />
        )}
      </header>

      {trackTopics.length === 0 ? (
        <EmptyState
          title={`There are no ${track.name} topics to open yet.`}
          description="Pick another track from Home, or search for a topic by name."
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
            {trackTopics.map((topic, index) => (
              <TopicRow key={topic.id} topic={topic} index={index} trackName={track.name} isNext={topic.id === next?.id} />
            ))}
          </ol>
        </section>
      )}
    </AppShell>
  )
}
