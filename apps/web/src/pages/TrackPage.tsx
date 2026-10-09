import { Link, useParams } from 'react-router-dom'
import { getTrackBySlug } from '@/data/tracks'
import { useTopics } from '@/hooks/useTopics'
import { nextTopicIn, topicsInTrack, trackProgress } from '@/utils/curriculum'
import { AppShell } from '@/components/layout/AppShell'
import { TopicRow } from '@/components/track/TopicRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressRing } from '@/components/ui/progress'

// Where the topics live: a track's curriculum as a numbered list, in order.
// A curriculum is a sequence, which is what earns the numbering. Rows, not
// cards, so an 18-topic track scans as a list rather than a wall.
export default function TrackPage() {
  const { track: slug } = useParams<{ track: string }>()
  const track = getTrackBySlug(slug)
  const { data: topics = [] } = useTopics()

  if (!track) {
    return (
      <AppShell crumbs={[{ label: 'Home', to: '/' }, { label: 'Not found' }]}>
        <EmptyState
          title="There is no track at this address."
          action={
            <Link to="/" className="text-small font-medium text-accent-foreground underline">
              Go to Home
            </Link>
          }
        />
      </AppShell>
    )
  }

  const trackTopics = topicsInTrack(topics, track.id)
  const progress = trackProgress(trackTopics)
  const next = nextTopicIn(trackTopics)
  const totalMinutes = trackTopics.reduce((sum, topic) => sum + topic.estimatedMinutes, 0)

  return (
    <AppShell crumbs={[{ label: 'Home', to: '/' }, { label: track.name }]}>
      <header className="mb-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-h1 text-ink">{track.name}</h1>
          <p className="mt-2 max-w-prose text-body text-ink-2">{track.description}</p>
          <p className="mt-3 text-mono-sm text-ink-2">
            {progress.complete} of {progress.total} complete · about {totalMinutes} min in all
          </p>
        </div>
        <ProgressRing value={progress.percent} size={72} strokeWidth={6} tone={progress.percent === 100 ? 'success' : 'brand'} ariaLabel={`${track.name} completion`} />
      </header>

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
    </AppShell>
  )
}
