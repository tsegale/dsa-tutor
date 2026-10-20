import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import {
  BUTTONS_ARE_HANDS_ON,
  HANDS_ON_ACTIVE,
  HANDS_ON_COMING_SOON,
  NO_HANDS_ON,
} from '@/config/pipeline'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const OPTIONS: { label: string; value: AlgorithmMode }[] = [
  { label: 'Demo', value: AlgorithmMode.DEMO },
  { label: 'Practice', value: AlgorithmMode.PRACTICE },
  { label: 'Hands-On', value: AlgorithmMode.HANDS_ON },
]

// The four hands-on situations (no gesture possible / the structure's own
// buttons already are it / drag not built yet / a real drag canvas) live in
// config/pipeline.ts, because the left panel's stage tracker needs exactly
// the same answers and two copies would drift.
export default function ModeToggle() {
  const mode = useAlgorithmStore((state) => state.mode)
  const setMode = useAlgorithmStore((state) => state.setMode)
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const slug = algorithmSlug ?? ''
  const handsOnHidden = NO_HANDS_ON.has(slug)
  const handsOnUsesButtons = BUTTONS_ARE_HANDS_ON.has(slug)
  const handsOnComingSoon = HANDS_ON_COMING_SOON.has(slug)
  const handsOnAvailable = HANDS_ON_ACTIVE.has(slug)

  const visibleOptions = OPTIONS.filter((option) => option.value !== AlgorithmMode.HANDS_ON || !handsOnHidden)

  return (
    <div id="mode-toggle" className="relative inline-flex rounded-md bg-surface-sunk p-0.5 dark:bg-dark-border">
      {visibleOptions.map((option) => {
        const isActive = mode === option.value
        const isDisabled = option.value === AlgorithmMode.HANDS_ON && !handsOnAvailable

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
            <TooltipContent>
              {handsOnComingSoon
                ? 'Drag interaction coming soon'
                : handsOnUsesButtons
                  ? "This structure's own buttons (insert, search, delete...) are the hands-on interaction"
                  : 'Not available for this algorithm'}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
