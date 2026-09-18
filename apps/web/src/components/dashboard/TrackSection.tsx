import { AlgorithmTrack } from '@dsa-tutor/types'
import type { TopicDto } from '@dsa-tutor/types'
import ProgressBar from '@/components/ui/ProgressBar'
import AlgorithmCard from './AlgorithmCard'
import { SortingBadge, TreesBadge, GraphsBadge } from '@/components/brand'

interface TrackSectionProps {
  track: AlgorithmTrack
  topics: TopicDto[]
  onStart: (topicName: string, mode: 'DEMO' | 'PRACTICE') => void
}

const TRACK_LABELS: Record<AlgorithmTrack, string> = {
  [AlgorithmTrack.FOUNDATIONS]: 'Foundations',
  [AlgorithmTrack.SORTING]: 'Sorting',
  [AlgorithmTrack.TREES]: 'Trees',
  [AlgorithmTrack.GRAPHS]: 'Graphs',
}

const TRACK_DESCRIPTIONS: Record<AlgorithmTrack, string> = {
  [AlgorithmTrack.FOUNDATIONS]: 'Core data structures and search fundamentals',
  [AlgorithmTrack.SORTING]: 'Algorithms that arrange elements in order',
  [AlgorithmTrack.TREES]: 'Hierarchical data structures and traversal',
  [AlgorithmTrack.GRAPHS]: 'Network structures and pathfinding',
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  )
}

function FoundationsIcon() {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#3730a3]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} aria-hidden="true">
        <rect x="3" y="3" width="8" height="18" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    </div>
  )
}

function TrackIcon({ track }: { track: AlgorithmTrack }) {
  switch (track) {
    case AlgorithmTrack.SORTING:
      return <SortingBadge size={36} />
    case AlgorithmTrack.TREES:
      return <TreesBadge size={36} />
    case AlgorithmTrack.GRAPHS:
      return <GraphsBadge size={36} />
    case AlgorithmTrack.FOUNDATIONS:
      return <FoundationsIcon />
  }
}

export default function TrackSection({ track, topics, onStart }: TrackSectionProps) {
  const meanMastery =
    topics.length > 0 ? Math.round(topics.reduce((sum, t) => sum + t.masteryPercent, 0) / topics.length) : 0

  const allLocked = topics.every((t) => t.isLocked)
  const allUnlocked = topics.every((t) => !t.isLocked)

  return (
    <section>
      <div className="mb-3 flex items-center gap-4">
        <TrackIcon track={track} />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">{TRACK_LABELS[track]}</h2>
            {allLocked && (
              <span className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-muted">
                <LockIcon />
                Locked
              </span>
            )}
            {allUnlocked && (
              <span className="rounded-full bg-success-light px-2 py-0.5 text-[11px] font-medium text-success">
                Unlocked
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">{TRACK_DESCRIPTIONS[track]}</p>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <div className="w-full max-w-[220px]">
            <ProgressBar percent={meanMastery} colorCoded animate={false} />
          </div>
          <span className="text-xs font-medium text-text-muted">{meanMastery}%</span>
        </div>
      </div>

      <div className="scrollbar-hide flex flex-nowrap gap-4 overflow-x-auto pb-2">
        {topics.map((topic) => (
          <AlgorithmCard key={topic.id} topic={topic} onStart={onStart} />
        ))}
      </div>
    </section>
  )
}
