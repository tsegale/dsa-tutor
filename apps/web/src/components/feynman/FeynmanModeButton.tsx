import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const OPEN_FEYNMAN_MODAL_EVENT = 'dsa-tutor:open-feynman-modal'

function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M9.5 3a3 3 0 0 0-3 3v.3A3 3 0 0 0 5 12a3 3 0 0 0 1.5 5.7V18a3 3 0 0 0 3 3M14.5 3a3 3 0 0 1 3 3v.3A3 3 0 0 1 19 12a3 3 0 0 1-1.5 5.7V18a3 3 0 0 1-3 3M9.5 3v18M14.5 3v18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function FeynmanModeButton() {
  const totalPredictions = useAlgorithmStore((state) => state.sessionTotalPredictions)
  const disabled = totalPredictions === 0

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_FEYNMAN_MODAL_EVENT))}
      className={cn(
        'flex w-full items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium',
        disabled
          ? 'cursor-default border-border bg-surface text-text-muted dark:border-dark-border dark:bg-dark-border dark:text-dark-text-secondary'
          : 'border-active bg-active/10 text-active hover:bg-active/15',
      )}
    >
      <BrainIcon />
      Feynman Mode
    </button>
  )

  if (!disabled) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>Complete some practice steps first</TooltipContent>
    </Tooltip>
  )
}
