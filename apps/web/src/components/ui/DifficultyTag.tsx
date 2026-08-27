import { Difficulty } from '@dsa-tutor/types'

interface DifficultyTagProps {
  difficulty: Difficulty
}

const STYLES: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'bg-success-light text-success',
  [Difficulty.INTERMEDIATE]: 'bg-secondary-light text-secondary',
  [Difficulty.ADVANCED]: 'bg-error-light text-error',
}

const LABELS: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'Beginner',
  [Difficulty.INTERMEDIATE]: 'Intermediate',
  [Difficulty.ADVANCED]: 'Advanced',
}

export default function DifficultyTag({ difficulty }: DifficultyTagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[difficulty]}`}
    >
      {LABELS[difficulty]}
    </span>
  )
}
