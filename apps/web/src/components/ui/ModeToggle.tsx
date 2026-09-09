import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const OPTIONS: { label: string; value: AlgorithmMode }[] = [
  { label: 'Demo', value: AlgorithmMode.DEMO },
  { label: 'Practice', value: AlgorithmMode.PRACTICE },
  { label: 'Hands-On', value: AlgorithmMode.HANDS_ON },
]

// Hands-On mode's drag-to-swap canvas interaction only exists for Bubble
// Sort's SWAP_DECISION junctions today - kept visible (not removed) for
// every other algorithm since it's part of the research contribution,
// but disabled with an explanatory tooltip until it's built out further.
const HANDS_ON_ALGORITHM_SLUG = 'bubble-sort'

export default function ModeToggle() {
  const mode = useAlgorithmStore((state) => state.mode)
  const setMode = useAlgorithmStore((state) => state.setMode)
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const handsOnAvailable = algorithmSlug === HANDS_ON_ALGORITHM_SLUG

  return (
    <div id="mode-toggle" className="relative inline-flex rounded-md bg-surface p-1 dark:bg-dark-border">
      {OPTIONS.map((option) => {
        const isActive = mode === option.value
        const isDisabled = option.value === AlgorithmMode.HANDS_ON && !handsOnAvailable

        const button = (
          <button
            key={option.value}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && setMode(option.value)}
            className={`relative z-10 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              isDisabled
                ? 'cursor-default text-text-muted opacity-50 dark:text-dark-text-secondary'
                : isActive
                  ? 'text-white'
                  : 'text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary'
            }`}
          >
            {isActive && !isDisabled && (
              <motion.span
                layoutId="mode-toggle-indicator"
                className="absolute inset-0 -z-10 rounded-md bg-primary"
                transition={{ duration: 0.15 }}
              />
            )}
            {option.label}
          </button>
        )

        if (!isDisabled) return button

        return (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>Available for Bubble Sort only</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
