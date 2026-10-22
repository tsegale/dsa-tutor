import { useQuery } from '@tanstack/react-query'
import type { TopicDto, UserProfile } from '@dsa-tutor/types'
import { fetchMisconceptionSummary } from '@/api/misconceptionEvents'
import { SUPPORT_LEVEL } from '@/config/supportLevels'
import { masteryIndex, overallSupport } from '@/utils/supportBand'

// The four stats the old dashboard showed as large coloured tiles, folded
// into one quiet row: context for the Continue card, never the headline.
// Same sources and rules as before (StatsBanner): mastery is the mean over
// topics, and "resolved" counts misconception events the
// deterministic resolve rule closed, not merely wrong answers.
export function ProgressStrip({ user, topics }: { user: UserProfile; topics: TopicDto[] }) {
  const { data: misconceptionSummary } = useQuery({
    queryKey: ['misconception-events', 'summary'],
    queryFn: fetchMisconceptionSummary,
  })

  const mastery = masteryIndex(topics)
  // The same overall band the header's scaffolding chip shows.
  const support = overallSupport(topics)

  const stats: { label: string; value: string; mono: boolean }[] = [
    { label: 'Mastery index', value: `${mastery}%`, mono: true },
    { label: 'Support level', value: SUPPORT_LEVEL[support.level].label, mono: false },
    { label: 'Misconceptions resolved', value: String(misconceptionSummary?.resolved ?? 0), mono: true },
    { label: 'Day streak', value: String(user.streakCount), mono: true },
  ]

  return (
    <dl
      id="home-progress"
      className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-rule bg-surface-sunk px-card py-row sm:grid-cols-4"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="truncate text-micro text-ink-2">{stat.label}</dt>
          <dd className={stat.mono ? 'text-mono text-ink' : 'text-small font-medium text-ink'}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
