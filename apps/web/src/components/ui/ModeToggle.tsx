import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { usePipeline } from '@/hooks/usePipeline'
import { NO_HANDS_ON, stageOffer } from '@/config/pipeline'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const OPTIONS: { label: string; value: AlgorithmMode }[] = [
  { label: 'Demo', value: AlgorithmMode.DEMO },
  { label: 'Practice', value: AlgorithmMode.PRACTICE },
  { label: 'Hands-On', value: AlgorithmMode.HANDS_ON },
]

/**
 * Whether a mode may be entered is the stage tracker's question, already
 * answered, so this asks it rather than deciding again.
 *
 * It used to read the four hands-on sets itself. Those say whether a
 * gesture exists on a topic, not whether the student has reached it, so
 * Hands-On stayed clickable on a topic whose tracker said "Finish a
 * Practice run first" - and clicking it entered a mode with nothing to do.
 *
 * Visibility is still this component's own call: a topic that will never
 * have a gesture drops the button rather than showing a dead one.
 */
export default function ModeToggle() {
  const mode = useAlgorithmStore((state) => state.mode)
  const setMode = useAlgorithmStore((state) => state.setMode)
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const stages = usePipeline()
  const handsOn = stageOffer(stages, 'HANDS_ON')
  const handsOnHidden = NO_HANDS_ON.has(algorithmSlug ?? '')

  const visibleOptions = OPTIONS.filter((option) => option.value !== AlgorithmMode.HANDS_ON || !handsOnHidden)

  return (
    <div id="mode-toggle" className="relative inline-flex rounded-md bg-surface-sunk p-0.5 dark:bg-dark-border">
      {visibleOptions.map((option) => {
        const isActive = mode === option.value
        const isDisabled = option.value === AlgorithmMode.HANDS_ON && !handsOn.enabled

        const button = (
          <button
            key={option.value}
            type="button"
            disabled={isDisabled}
            aria-pressed={isActive}
            onClick={() => !isDisabled && setMode(option.value)}
            className={`relative z-10 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
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
            {/* The stage's own wording, so the tooltip and the tracker
                cannot describe the same lock differently. */}
            <TooltipContent>{handsOn.reason ?? 'Not available for this algorithm.'}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
