import type { TopicDto, UserProfile } from '@dsa-tutor/types'
import MasteryRing from '@/components/ui/MasteryRing'

interface StatsBannerProps {
  user: UserProfile
  topics: TopicDto[]
}

function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-secondary">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  )
}

function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-streak">
      <path d="M12 2c1 3-2 4.5-2 7.5A4.5 4.5 0 0 0 12 14a2.5 2.5 0 0 0 2.5-2.5c0-.9-.4-1.4-.8-1.9 2.3 1.2 3.8 3.6 3.8 6.4a5.5 5.5 0 0 1-11 0C6.5 12 8 9.5 8 7c0-2 1.5-3.8 4-5Z" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth={2}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13v3M9 20h6M10 17h4v3h-4v-3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatCard({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center gap-3 rounded-md border border-border bg-white p-4">{children}</div>
}

export default function StatsBanner({ user, topics }: StatsBannerProps) {
  const masteredCount = topics.filter((t) => t.masteryPercent >= 80).length
  const unlockedTopics = topics.filter((t) => !t.isLocked)
  const overallMastery =
    unlockedTopics.length > 0
      ? Math.round(unlockedTopics.reduce((sum, t) => sum + t.masteryPercent, 0) / unlockedTopics.length)
      : 0

  return (
    <div id="dashboard-stats-banner" className="flex gap-4 border-b border-border bg-surface px-6 py-4">
      <StatCard>
        <BoltIcon />
        <div>
          <div className="text-[28px] leading-none font-bold text-text-primary">{user.xpTotal}</div>
          <div className="text-xs text-text-muted">Total XP</div>
        </div>
      </StatCard>

      <StatCard>
        <FlameIcon />
        <div>
          <div className={`text-[28px] leading-none font-bold ${user.streakCount === 0 ? 'text-text-muted' : 'text-text-primary'}`}>
            {user.streakCount}
          </div>
          <div className="text-xs text-text-muted">Day Streak</div>
          {user.streakCount === 0 && <div className="text-[11px] text-text-muted">Practice today to start one</div>}
        </div>
      </StatCard>

      <StatCard>
        <TrophyIcon />
        <div>
          <div className="text-[28px] leading-none font-bold text-text-primary">{masteredCount}</div>
          <div className="text-xs text-text-muted">Mastered</div>
        </div>
      </StatCard>

      <StatCard>
        <MasteryRing progress={overallMastery / 100} size={60} />
        <div className="text-xs text-text-muted">Overall</div>
      </StatCard>
    </div>
  )
}
