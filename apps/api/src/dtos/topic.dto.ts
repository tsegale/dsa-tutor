import type { TopicMastery } from '@dsa-tutor/types'

export interface TopicDto {
  id: string
  name: string
  displayName: string
  track: string
  difficulty: string
  description: string
  estimatedMinutes: number
  isLocked: boolean
  masteryPercent: number
  practiceRunCompleted: boolean
  mastery: TopicMastery
}
