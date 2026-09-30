import { apiFetch } from '@/api/client'
import { BADGE_DEFINITIONS, type BadgeCheckStats } from '@/data/badges'

const AWARDED_BADGES_KEY = 'dsa-tutor-awarded-badges'

export interface AwardedBadgeDto {
  id: string
  name: string
  awardedAt: string
}

// The server (UserBadge table) is the source of truth - this is a cache
// only, read for an instant first paint before the server response
// lands, and as a fallback if the server is unreachable. Never the only
// place a badge award is recorded.
export function getCachedAwardedBadgeIds(): string[] {
  try {
    const raw = localStorage.getItem(AWARDED_BADGES_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function cacheAwardedBadgeIds(ids: string[]) {
  try {
    localStorage.setItem(AWARDED_BADGES_KEY, JSON.stringify(ids))
  } catch {
    // Best-effort cache only.
  }
}

/** Badge `name` in the database is the same id used in BADGE_DEFINITIONS
 * (see prisma/seed.ts's BADGES list, kept in sync with badges.ts). */
export async function fetchAwardedBadgeIds(): Promise<string[]> {
  const badges = await apiFetch<AwardedBadgeDto[]>('/api/v1/badges/mine')
  const ids = badges.map((b) => b.name)
  cacheAwardedBadgeIds(ids)
  return ids
}

// Only awards one badge per call, even if multiple conditions newly
// qualify, so BadgeAwardModal never has to stack or queue awards.
export async function checkAndAwardBadges(
  stats: BadgeCheckStats,
  onBadgeEarned: (badgeId: string) => void,
): Promise<void> {
  const awarded = new Set(getCachedAwardedBadgeIds())

  for (const badge of BADGE_DEFINITIONS) {
    if (awarded.has(badge.id)) continue
    if (!badge.checkCondition(stats)) continue

    try {
      const result = await apiFetch<{ newlyAwarded: boolean }>('/api/v1/badges/award', {
        method: 'POST',
        body: JSON.stringify({ badgeName: badge.id }),
      })
      cacheAwardedBadgeIds([...awarded, badge.id])
      // Already recorded server-side (e.g. earned on another device) -
      // no XP, no toast, just bring the local cache in line.
      if (!result.newlyAwarded) break

      // The badge award itself added its XP on the server (4D.5).
      onBadgeEarned(badge.id)
    } catch {
      // Server unreachable - fall back to a local-only award rather than
      // losing it entirely; getUserBadges will reconcile from the server
      // once it's reachable again on a later load.
      cacheAwardedBadgeIds([...awarded, badge.id])
      onBadgeEarned(badge.id)
    }
    break
  }
}
