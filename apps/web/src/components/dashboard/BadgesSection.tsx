import { useQuery } from '@tanstack/react-query'
import { BADGE_DEFINITIONS, type BadgeTier } from '@/data/badges'
import { fetchAwardedBadgeIds, getCachedAwardedBadgeIds } from '@/services/badgeService'
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
  // The server (UserBadge table) is authoritative; the cached ids give an
  // instant first paint (and a fallback if the fetch fails) instead of
  // showing every badge as locked while the request is in flight.
  const { data: serverAwardedIds } = useQuery({
    queryKey: ['badges', 'mine'],
    queryFn: fetchAwardedBadgeIds,
    placeholderData: getCachedAwardedBadgeIds,
  })
  const awardedIds = new Set(serverAwardedIds ?? [])
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
              className="relative flex items-center gap-3 rounded-md border-2 bg-card p-4"
              style={{
                borderColor: isAwarded ? TIER_BORDER[badge.tier] : 'var(--border)',
              }}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isAwarded ? `${TIER_BORDER[badge.tier]}22` : 'var(--surface)',
                  color: isAwarded ? TIER_BORDER[badge.tier] : '#94A3B8',
                }}
              >
                <BadgeIcon icon={badge.icon} size={22} />
              </div>
              <div className="min-w-0">
                {/* Locked badges used to fade the whole card to 30%
                    opacity, which (like the canvas bars in 9.9) also faded
                    the text below WCAG AA contrast - an axe scan turned
                    this up as a serious violation. The lock icon and
                    neutral icon/border colours above already communicate
                    "locked" without needing the text itself to fade. */}
                <div
                  className={isAwarded ? 'truncate text-sm font-semibold text-text-primary' : 'truncate text-sm font-semibold text-text-muted'}
                >
                  {badge.title}
                </div>
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
