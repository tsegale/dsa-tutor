import { motion } from 'framer-motion'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { CriticalJunctionType } from '@dsa-tutor/types'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

export interface TileOption {
  id: string
  label: string
}

interface TileGridProps {
  prompt: string
  options: TileOption[]
  onSelect: (optionId: string) => void
  selectedId: string | null
  submissionState: 'idle' | 'correct' | 'incorrect'
  snapshot: AlgorithmSnapshot
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Which tile is the correct answer, used only to reveal it after a wrong
 * submission - never before. For SWAP_DECISION the correct tile depends on
 * the current array values; for conceptual junctions the shuffled display
 * order never changes the id, so the correct tile is always id 'correct'.
 */
function isCorrectTile(
  tileId: string,
  snapshot: AlgorithmSnapshot,
  submissionState: 'idle' | 'correct' | 'incorrect',
): boolean {
  if (submissionState !== 'incorrect') return false

  if (snapshot.criticalJunctionType === CriticalJunctionType.SWAP_DECISION) {
    const arr = snapshot.dataStructureState as number[]
    const [i, j] = snapshot.activeIndices
    const shouldSwap = arr[i] > arr[j]
    return tileId === (shouldSwap ? 'swap' : 'no-swap')
  }

  return tileId === 'correct'
}

export default function TileGrid({ prompt, options, onSelect, selectedId, submissionState, snapshot }: TileGridProps) {
  const prefersReducedMotion = useReducedMotion()
  const columns = options.length === 4 ? 'grid-cols-2' : 'grid-cols-1'
  const locked = submissionState !== 'idle'

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <p className="font-sans text-[15px] font-medium text-text-primary dark:text-dark-text-primary">{prompt}</p>
      <div className={cn('grid gap-2', columns)}>
        {options.map((option) => {
          const isSelected = option.id === selectedId
          const isSelectedCorrect = isSelected && submissionState === 'correct'
          const isSelectedIncorrect = isSelected && submissionState === 'incorrect'
          // Revealed only when this tile is the correct one and the
          // learner picked something else - never before submission.
          const isRevealedCorrect = !isSelected && isCorrectTile(option.id, snapshot, submissionState)

          return (
            <motion.button
              key={option.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(option.id)}
              animate={
                isSelectedIncorrect && !prefersReducedMotion ? { x: [0, -4, 4, -4, 4, -4, 4, 0] } : { x: 0 }
              }
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className={cn(
                'flex min-h-[72px] items-center justify-between gap-2 rounded-md border p-4 text-left transition-colors duration-300',
                isSelectedCorrect || isRevealedCorrect
                  ? 'border-success bg-success-light text-success'
                  : isSelectedIncorrect
                    ? 'border-error bg-error-light text-error'
                    : isSelected
                      ? 'border-secondary bg-secondary-light text-text-primary dark:bg-secondary/20 dark:text-dark-text-primary'
                      : 'border-border bg-white text-text-primary dark:bg-dark-background dark:text-dark-text-primary',
              )}
            >
              <span className="text-sm font-medium">{option.label}</span>
              {(isSelectedCorrect || isRevealedCorrect) && <CheckIcon />}
              {isSelectedIncorrect && <XIcon />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
