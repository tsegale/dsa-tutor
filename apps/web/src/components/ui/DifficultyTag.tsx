import { Difficulty } from '@dsa-tutor/types'
import { Pill, type PillTone } from '@/components/ui/Pill'

interface DifficultyTagProps {
  difficulty: Difficulty
}

const TONES: Record<Difficulty, PillTone> = {
  [Difficulty.BEGINNER]: 'success',
  [Difficulty.INTERMEDIATE]: 'warning',
  [Difficulty.ADVANCED]: 'danger',
}

const LABELS: Record<Difficulty, string> = {
  [Difficulty.BEGINNER]: 'Beginner',
  [Difficulty.INTERMEDIATE]: 'Intermediate',
  [Difficulty.ADVANCED]: 'Advanced',
}

export default function DifficultyTag({ difficulty }: DifficultyTagProps) {
  return <Pill tone={TONES[difficulty]}>{LABELS[difficulty]}</Pill>
}
