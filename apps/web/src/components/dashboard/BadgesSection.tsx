import { BADGE_DEFINITIONS, type BadgeTier } from '@/data/badges'
import { getAwardedBadgeIds } from '@/services/badgeService'
import BadgeIcon from '@/components/ui/BadgeIcon'

const TIER_BORDER: Record<BadgeTier, string> = {
  bronze: '#CD7F32',
  silver: '#A8A9AD',
  gold: '#D4AF37',
  platinum: '#8E9AAF',
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  )
}

export default function BadgesSection() {
  const awardedIds = new Set(getAwardedBadgeIds())
  const awardedCount = BADGE_DEFINITIONS.filter((b) => awardedIds.has(b.id)).length

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xl font-bold text-primary">Achievements</h2>
        <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary">
          {awardedCount} / {BADGE_DEFINITIONS.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BADGE_DEFINITIONS.map((badge) => {
          const isAwarded = awardedIds.has(badge.id)
          return (
            <div
              key={badge.id}
              className="relative flex items-center gap-3 rounded-md border-2 bg-white p-4"
              style={{
                borderColor: isAwarded ? TIER_BORDER[badge.tier] : '#E2E8F0',
                opacity: isAwarded ? 1 : 0.3,
              }}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isAwarded ? `${TIER_BORDER[badge.tier]}22` : '#F8FAFC',
                  color: isAwarded ? TIER_BORDER[badge.tier] : '#94A3B8',
                }}
              >
                <BadgeIcon icon={badge.icon} size={22} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-text-primary">{badge.title}</div>
                <div className="truncate text-xs text-text-muted">{badge.description}</div>
              </div>

              {!isAwarded && (
                <div className="absolute top-2 right-2 text-text-muted">
                  <LockIcon />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
