export interface XPLevel {
  title: string
  minXP: number
  maxXP: number
  colour: string
}

export const XP_LEVELS: XPLevel[] = [
  { title: 'Novice', minXP: 0, maxXP: 99, colour: '#94A3B8' },
  { title: 'Apprentice', minXP: 100, maxXP: 249, colour: '#60A5FA' },
  { title: 'Learner', minXP: 250, maxXP: 499, colour: '#34D399' },
  { title: 'Practitioner', minXP: 500, maxXP: 999, colour: '#4F46E5' },
  { title: 'Skilled', minXP: 1000, maxXP: 1999, colour: '#7C3AED' },
  { title: 'Proficient', minXP: 2000, maxXP: 3499, colour: '#EC4899' },
  { title: 'Expert', minXP: 3500, maxXP: 5499, colour: '#F59E0B' },
  { title: 'Master', minXP: 5500, maxXP: 7999, colour: '#EA580C' },
  { title: 'DSA Champion', minXP: 8000, maxXP: Infinity, colour: '#D4AF37' },
]

export function getLevelForXP(xp: number): XPLevel {
  const match = [...XP_LEVELS].reverse().find((level) => xp >= level.minXP)
  return match ?? XP_LEVELS[0]
}

export interface LevelProgress {
  level: XPLevel
  nextLevel: XPLevel | null
  percent: number
  xpIntoLevel: number
  xpForNextLevel: number | null
}

export function getProgressToNextLevel(xp: number): LevelProgress {
  const level = getLevelForXP(xp)
  const levelIndex = XP_LEVELS.indexOf(level)
  const nextLevel = XP_LEVELS[levelIndex + 1] ?? null

  const xpIntoLevel = xp - level.minXP
  if (!nextLevel) {
    return { level, nextLevel: null, percent: 100, xpIntoLevel, xpForNextLevel: null }
  }

  const xpSpan = nextLevel.minXP - level.minXP
  const percent = Math.min(100, Math.round((xpIntoLevel / xpSpan) * 100))
  return { level, nextLevel, percent, xpIntoLevel, xpForNextLevel: nextLevel.minXP }
}
