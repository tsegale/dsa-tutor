import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useFeynmanAccess } from '@/hooks/useFeynmanAccess'
import { cn } from '@/lib/utils'

export const OPEN_FEYNMAN_MODAL_EVENT = 'dsa-tutor:open-feynman-modal'

export function BrainIcon() {
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

/**
 * Feynman mode on demand (Phase 8A): available from the start, here and
 * from the rail. It used to wait on a completed Practice run; the only
 * remaining reason it is not offered is a topic with no reviewed rubric,
 * and the disabled button says so in its tooltip.
 */
export default function FeynmanModeButton() {
  const { state, reason } = useFeynmanAccess()
  const disabled = state !== 'AVAILABLE'

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_FEYNMAN_MODAL_EVENT))}
      className={cn(
        'flex w-full items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium',
        disabled
          ? 'cursor-default border-border bg-surface-sunk text-text-muted dark:border-dark-border dark:bg-dark-border dark:text-dark-text-secondary'
          : 'border-active bg-active/10 text-active hover:bg-active/15',
      )}
    >
      <BrainIcon />
      Feynman mode
    </button>
  )

  if (!disabled) return button

  return (
    <Tooltip>
      {/* A disabled button fires no pointer or focus events, so the reason
          lives on a focusable wrapper: hover and keyboard both reach it. */}
      <TooltipTrigger asChild>
        <span tabIndex={0} className="block rounded-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
