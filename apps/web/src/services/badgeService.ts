import { apiFetch } from '@/api/client'
import { BADGE_DEFINITIONS, type BadgeCheckStats } from '@/data/badges'

const AWARDED_BADGES_KEY = 'dsa-tutor-awarded-badges'
const BADGE_XP_AWARD = 50

export function getAwardedBadgeIds(): string[] {
  try {
    const raw = localStorage.getItem(AWARDED_BADGES_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function markBadgeAwarded(badgeId: string) {
  const awarded = getAwardedBadgeIds()
  localStorage.setItem(AWARDED_BADGES_KEY, JSON.stringify([...awarded, badgeId]))
}

// Only awards one badge per call, even if multiple conditions newly
// qualify, so BadgeAwardModal never has to stack or queue awards.
export async function checkAndAwardBadges(
  stats: BadgeCheckStats,
  onBadgeEarned: (badgeId: string) => void,
): Promise<void> {
  const awarded = new Set(getAwardedBadgeIds())

  for (const badge of BADGE_DEFINITIONS) {
    if (awarded.has(badge.id)) continue
    if (!badge.checkCondition(stats)) continue

    markBadgeAwarded(badge.id)
    try {
      await apiFetch('/api/v1/auth/xp', {
        method: 'POST',
        body: JSON.stringify({ amount: BADGE_XP_AWARD }),
      })
    } catch {
      // XP persistence is best-effort; the badge award itself already
      // landed in localStorage regardless of whether this call lands.
    }
    onBadgeEarned(badge.id)
    break
  }
}
