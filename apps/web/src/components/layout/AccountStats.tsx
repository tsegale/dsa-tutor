import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useTopics } from '@/hooks/useTopics'
import { fetchMisconceptionSummary } from '@/api/misconceptionEvents'
import { masteryIndex } from '@/utils/supportBand'

/**
 * Three learner stats in the account menu (Phase 4F), the same figures and
 * sources as Home's progress strip. Plain text, not menu items: nothing here
 * is an action.
 */
export function AccountStats() {
  const { user } = useAuth()
  const { data: topics } = useTopics()
  // Shares Home's cache key, so opening the menu on Home costs no request.
  const { data: misconceptions } = useQuery({ queryKey: ['misconception-events', 'summary'], queryFn: fetchMisconceptionSummary })

  const stats = [
    { label: 'Mastery index', value: topics ? `${masteryIndex(topics)}%` : '-' },
    { label: 'Day streak', value: String(user?.streakCount ?? 0) },
    { label: 'Misconceptions resolved', value: String(misconceptions?.resolved ?? 0) },
  ]

  return (
    <dl className="flex flex-col gap-1 px-2 py-1.5">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-baseline justify-between gap-6">
          <dt className="text-small text-ink-2">{stat.label}</dt>
          <dd className="text-mono text-ink">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}
