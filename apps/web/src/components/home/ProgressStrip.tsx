import type { ReactNode } from 'react'
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

  const stats: {
    label: string
    value: string
    mono: boolean
    bg: string
    fg: string
    border: string
    icon: ReactNode
  }[] = [
    {
      label: 'Mastery index',
      value: `${mastery}%`,
      mono: true,
      bg: 'var(--tone-indigo-bg)',
      fg: 'var(--tone-indigo-fg)',
      border: 'var(--tone-indigo-border)',
      icon: (
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" />
          <circle cx="10" cy="10" r="4" />
          <circle cx="10" cy="10" r="1.2" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: 'Support level',
      value: SUPPORT_LEVEL[support.level].label,
      mono: false,
      bg: 'var(--tone-sky-bg)',
      fg: 'var(--tone-sky-fg)',
      border: 'var(--tone-sky-border)',
      icon: (
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 2.5 3.5 6 10 9.5 16.5 6 10 2.5Z" strokeLinejoin="round" />
          <path d="M3.5 10 10 13.5 16.5 10" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3.5 14 10 17.5 16.5 14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Misconceptions resolved',
      value: String(misconceptionSummary?.resolved ?? 0),
      mono: true,
      bg: 'var(--tone-emerald-bg)',
      fg: 'var(--tone-emerald-fg)',
      border: 'var(--tone-emerald-border)',
      icon: (
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 2.5 4 5v4.5c0 4.1 2.6 7.3 6 8.5 3.4-1.2 6-4.4 6-8.5V5l-6-2.5Z" strokeLinejoin="round" />
          <path d="m7.5 10 1.8 1.8 3.5-3.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Day streak',
      value: String(user.streakCount),
      mono: true,
      bg: 'var(--tone-amber-bg)',
      fg: 'var(--tone-amber-fg)',
      border: 'var(--tone-amber-border)',
      icon: (
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path
            d="M10.5 2.5c.3 2.6-1.8 4.2-1.8 6.5 0 1.3.9 2.2 2.1 2.2 1.4 0 2.2-1.1 2.3-2.5 1.8 1.3 2.9 3.2 2.9 5.3a6 6 0 1 1-12 0c0-3.2 2.2-5.8 6.5-11.5Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ]

  return (
    <dl
      id="home-progress"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex min-w-0 items-center gap-3 rounded-md border border-rule bg-surface px-card py-row shadow-e1"
        >
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border"
            style={{
              backgroundColor: stat.bg,
              color: stat.fg,
              borderColor: stat.border,
            }}
          >
            {stat.icon}
          </span>
          <div className="flex min-w-0 flex-col">
            <dt className="truncate text-micro text-ink-2">{stat.label}</dt>
            <dd className={stat.mono ? 'text-mono font-semibold text-ink' : 'text-small font-semibold text-ink'}>
              {stat.value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}
