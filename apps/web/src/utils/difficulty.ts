import { Difficulty } from '@dsa-tutor/types'

/** Difficulty in sentence case, shared by the difficulty tag and topic cards. */
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'Beginner',
  [Difficulty.INTERMEDIATE]: 'Intermediate',
  [Difficulty.ADVANCED]: 'Advanced',
}
