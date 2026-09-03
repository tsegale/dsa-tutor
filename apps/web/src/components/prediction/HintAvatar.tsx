import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AITutorAvatar } from '@/components/brand'

interface HintAvatarProps {
  hintAvailable: boolean
  onRequestHint: () => void
  hint: string | null
  isLoading: boolean
}

export const DISMISS_HINT_EVENT = 'dsa-tutor:dismiss-hint'

function LightbulbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="6" fill="currentColor" />
      <rect x="9.5" y="16" width="5" height="4" rx="1" fill="currentColor" />
      <line x1="10.5" y1="8" x2="10.5" y2="11" stroke="white" strokeWidth={1} strokeLinecap="round" />
      <line x1="13.5" y1="8" x2="13.5" y2="11" stroke="white" strokeWidth={1} strokeLinecap="round" />
    </svg>
  )
}

function SpinnerRing() {
  return (
    <motion.svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      className="pointer-events-none absolute -inset-1"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
    >
      <circle
        cx="26"
        cy="26"
        r="23"
        fill="none"
        stroke="#F59E0B"
        strokeWidth={2}
        strokeDasharray="36 108"
        strokeLinecap="round"
      />
    </motion.svg>
  )
}

export default function HintAvatar({ hintAvailable, onRequestHint, hint, isLoading }: HintAvatarProps) {
  const shouldPulse = hintAvailable && hint === null && !isLoading

  return (
    <motion.div layout className="relative">
      <div className="relative">
        {hint !== null ? (
          <div className="flex size-11 items-center justify-center" aria-label="AI Tutor hint">
            <AITutorAvatar size={44} />
          </div>
        ) : (
          <motion.button
            type="button"
            onClick={onRequestHint}
            disabled={!hintAvailable || isLoading}
            aria-label="Request hint"
            animate={shouldPulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={
              shouldPulse ? { duration: 1.2, ease: 'easeInOut', repeat: Infinity } : { duration: 0.2 }
            }
            className="relative flex size-11 items-center justify-center rounded-full bg-secondary-light text-secondary"
          >
            <LightbulbIcon />
          </motion.button>
        )}
        {isLoading && <SpinnerRing />}
      </div>

      {hint !== null && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'absolute bottom-full left-0 z-10 mb-2 w-[280px] max-w-[280px] rounded-md',
            'border-l-4 border-secondary bg-secondary-light p-4',
          )}
        >
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(DISMISS_HINT_EVENT))}
            aria-label="Dismiss hint"
            className="absolute top-1 right-1 flex size-5 items-center justify-center rounded text-text-muted hover:text-text-primary"
          >
            x
          </button>
          <p className="pr-4 font-sans text-[13px] italic text-secondary">{hint}</p>
        </motion.div>
      )}
    </motion.div>
  )
}
