import { Difficulty } from '@dsa-tutor/types'
import { Pill } from '@/components/ui/Pill'
import { DIFFICULTY_LABEL } from '@/utils/difficulty'

interface DifficultyTagProps {
  difficulty: Difficulty
}

// Difficulty is neutral on purpose. Green and red already mean mastered and
// struggling (the mastery pills); if Beginner were green and Advanced red, a
// student could not learn what either colour means. The label carries the
// level, and a 1-3 bar glyph gives a second, non-colour cue.
const BARS: Record<Difficulty, 1 | 2 | 3> = {
  [Difficulty.BEGINNER]: 1,
  [Difficulty.INTERMEDIATE]: 2,
  [Difficulty.ADVANCED]: 3,
}

function Bars({ filled }: { filled: 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1 + i * 4}
          y={8 - i * 3}
          width="2.5"
          height={3 + i * 3}
          rx="0.5"
          fill="currentColor"
          opacity={i < filled ? 1 : 0.3}
        />
      ))}
    </svg>
  )
}

export default function DifficultyTag({ difficulty }: DifficultyTagProps) {
  return (
    <Pill tone="neutral" icon={<Bars filled={BARS[difficulty]} />}>
      {DIFFICULTY_LABEL[difficulty]}
    </Pill>
  )
}
