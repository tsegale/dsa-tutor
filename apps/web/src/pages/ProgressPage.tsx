import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { TRACKS } from '@/data/tracks'
import { useTopics } from '@/hooks/useTopics'
import { topicsInTrack, trackProgress } from '@/utils/curriculum'
import { getProgressToNextLevel } from '@/utils/xpLevels'
import { AppShell } from '@/components/layout/AppShell'
import { Progress } from '@/components/ui/progress'
import BadgesSection from '@/components/dashboard/BadgesSection'

// Progress over the whole curriculum: level and XP (moved here from the old
// dashboard header), completion per track, and badges. Phase 2D adds its
// loading, error and no-history states.
export default function ProgressPage() {
  const { user } = useAuth()
  const { data: topics = [] } = useTopics()
  const xp = getProgressToNextLevel(user?.xpTotal ?? 0)
  const tracks = TRACKS.map((track) => ({ track, progress: trackProgress(topicsInTrack(topics, track.id)) })).filter(
    ({ progress }) => progress.total > 0
  )

  return (
    <AppShell crumbs={[{ label: 'Home', to: '/' }, { label: 'Progress' }]}>
      <h1 className="mb-6 text-h1 text-ink">Progress</h1>

      <section aria-labelledby="level-heading" className="mb-8 rounded-md border border-rule bg-surface p-card shadow-e1">
        <h2 id="level-heading" className="text-micro text-ink-2">
          Level
        </h2>
        <p className="mt-1 text-h3 text-ink">{xp.level.title}</p>
        <div className="mt-3 max-w-md">
          <Progress
            value={xp.percent}
            label={xp.nextLevel ? `${(xp.xpForNextLevel ?? 0) - (user?.xpTotal ?? 0)} XP to ${xp.nextLevel.title}` : 'Highest level reached'}
          />
        </div>
        <p className="mt-2 text-mono-sm text-ink-2">{user?.xpTotal ?? 0} XP</p>
      </section>

      <section aria-labelledby="tracks-heading" className="mb-8">
        <h2 id="tracks-heading" className="mb-3 text-h2 text-ink">
          Tracks
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tracks.map(({ track, progress }) => (
            <li key={track.slug} className="rounded-md border border-rule bg-surface p-card">
              <Link to={`/track/${track.slug}`} className="text-small font-medium text-ink hover:underline">
                {track.name}
              </Link>
              <div className="mt-2">
                <Progress value={progress.percent} label={`${progress.complete} of ${progress.total} complete`} tone={progress.percent === 100 ? 'success' : 'brand'} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <BadgesSection />
    </AppShell>
  )
}
