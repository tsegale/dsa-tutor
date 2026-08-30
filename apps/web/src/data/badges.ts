export interface BadgeCheckStats {
  totalSessions: number
  correctPredictions: number
  totalPredictions: number
  hintsRequested: number
  streakCount: number
  masteredTopics: number
  completedSortingTrack: boolean
  completedGraphsTrack: boolean
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export type BadgeIconType = 'footsteps' | 'bars' | 'node' | 'lightbulb-off' | 'flame' | 'trophy'

export interface BadgeDefinition {
  id: string
  title: string
  description: string
  icon: BadgeIconType
  tier: BadgeTier
  checkCondition: (stats: BadgeCheckStats) => boolean
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-step',
    title: 'First Step',
    description: 'Submit your first prediction',
    icon: 'footsteps',
    tier: 'bronze',
    checkCondition: (stats) => stats.totalPredictions >= 1,
  },
  {
    id: 'sorting-guru',
    title: 'Sorting Guru',
    description: 'Complete the entire Sorting track',
    icon: 'bars',
    tier: 'silver',
    checkCondition: (stats) => stats.completedSortingTrack,
  },
  {
    id: 'graph-explorer',
    title: 'Graph Explorer',
    description: 'Complete the entire Graphs track',
    icon: 'node',
    tier: 'silver',
    checkCondition: (stats) => stats.completedGraphsTrack,
  },
  {
    id: 'no-hints',
    title: 'No Hints Needed',
    description: 'Answer 5 predictions correctly in a session without requesting a hint',
    icon: 'lightbulb-off',
    tier: 'gold',
    checkCondition: (stats) => stats.correctPredictions >= 5 && stats.hintsRequested === 0,
  },
  {
    id: 'week-warrior',
    title: 'Week Warrior',
    description: 'Keep a 7 day practice streak alive',
    icon: 'flame',
    tier: 'gold',
    checkCondition: (stats) => stats.streakCount >= 7,
  },
  {
    id: 'dsa-champion',
    title: 'DSA Champion',
    description: 'Reach 80% mastery in 4 or more topics',
    icon: 'trophy',
    tier: 'platinum',
    checkCondition: (stats) => stats.masteredTopics >= 4,
  },
]
