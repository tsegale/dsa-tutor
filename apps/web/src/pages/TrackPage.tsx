import { Link, useParams } from 'react-router-dom'
import { getTrackBySlug, topicPath } from '@/data/tracks'
import { useTopics } from '@/hooks/useTopics'
import { topicsInTrack } from '@/utils/curriculum'
import { AppShell } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'

// Interim (Design Phase 2A): the route the Tracks menu and the workspace
// breadcrumb link to, listing the track's topics in curriculum order.
// Phase 2C replaces the rows with the full design.
export default function TrackPage() {
  const { track: slug } = useParams<{ track: string }>()
  const track = getTrackBySlug(slug)
  const { data: topics = [] } = useTopics()

  if (!track) {
    return (
      <AppShell crumbs={[{ label: 'Home', to: '/' }, { label: 'Not found' }]}>
        <EmptyState title="There is no track at this address." action={<Link to="/" className="text-small font-medium text-accent-foreground underline">Go to Home</Link>} />
      </AppShell>
    )
  }

  const trackTopics = topicsInTrack(topics, track.id)

  return (
    <AppShell crumbs={[{ label: 'Home', to: '/' }, { label: track.name }]}>
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-h1 text-ink">{track.name}</h1>
        <p className="max-w-prose text-body text-ink-2">{track.description}</p>
      </header>
      <ol className="flex flex-col divide-y divide-rule rounded-md border border-rule bg-surface">
        {trackTopics.map((topic, index) => (
          <li key={topic.id}>
            <Link to={topicPath(topic.name)} className="flex items-baseline gap-4 px-card py-row hover:bg-surface-sunk">
              <span className="w-6 text-mono-sm text-ink-2">{String(index + 1).padStart(2, '0')}</span>
              <span className="text-small font-medium text-ink">{topic.displayName}</span>
            </Link>
          </li>
        ))}
      </ol>
    </AppShell>
  )
}
