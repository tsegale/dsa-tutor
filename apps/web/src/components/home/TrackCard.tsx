import { Link } from 'react-router-dom'
import type { TopicDto } from '@dsa-tutor/types'
import type { TrackMeta } from '@/data/tracks'
import { nextTopicIn, trackProgress } from '@/utils/curriculum'
import { Card } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui/progress'

// One of Home's track cards: the only way into the curriculum from Home.
// The whole card is the link (a single tab stop), so it lifts on hover.
export function TrackCard({ track, topics }: { track: TrackMeta; topics: TopicDto[] }) {
  const progress = trackProgress(topics)
  const next = nextTopicIn(topics)
  const countLabel = `${topics.length} ${topics.length === 1 ? 'topic' : 'topics'}`

  return (
    <Link
      to={`/track/${track.slug}`}
      aria-label={`${track.name}: ${countLabel}, ${progress.complete} complete${next ? `, next ${next.displayName}` : ''}`}
      className="group block h-full rounded-md"
    >
      <Card interactive className="h-full gap-3 px-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-h3 text-ink">{track.name}</h3>
            <p className="mt-0.5 text-mono-sm text-ink-2">{countLabel}</p>
          </div>
          <ProgressRing value={progress.percent} size={44} tone={progress.percent === 100 ? 'success' : 'brand'} ariaLabel={`${track.name} completion`} />
        </div>
        <p className="line-clamp-2 text-small text-ink-2">{track.description}</p>
        <p className="mt-auto truncate border-t border-rule pt-3 text-small text-ink-2">
          {next ? (
            <>
              Next: <span className="font-medium text-ink">{next.displayName}</span>
            </>
          ) : progress.complete === progress.total ? (
            'All topics complete'
          ) : (
            'Remaining topics are locked'
          )}
        </p>
      </Card>
    </Link>
  )
}
