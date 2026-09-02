import { AnimatePresence, motion } from 'framer-motion'

interface MistakeAnalysisToastProps {
  message: string | null
  hint?: string | null
  counterfactualTrace?: string | null
  pseudocodeLine: number | null
  onDismiss: () => void
}

export const SWITCH_TAB_PSEUDOCODE_EVENT = 'switch-tab-pseudocode'

const toastVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

function BranchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M12 3v6M12 9 6 15M12 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function MistakeAnalysisToast({
  message,
  hint,
  counterfactualTrace,
  pseudocodeLine,
  onDismiss,
}: MistakeAnalysisToastProps) {
  return (
    <AnimatePresence>
      {message !== null && (
        <motion.div
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full shrink-0 rounded-md border-l-4 border-error bg-error-light p-4"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute top-2 right-2 flex size-5 items-center justify-center rounded text-text-muted hover:text-text-primary"
          >
            x
          </button>
          <p className="pr-4 text-xs font-bold text-error">What went wrong</p>
          <p className="mt-1 pr-4 text-[13px] text-text-primary">{message}</p>
          {hint && (
            <p className="mt-2 pr-4 text-[13px] text-secondary italic">
              <span className="font-bold not-italic">Hint: </span>
              {hint}
            </p>
          )}
          {counterfactualTrace && (
            <div className="mt-2 border-l-2 border-secondary py-0.5 pr-4 pl-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                <BranchIcon />
                What would have happened:
              </p>
              <p className="mt-1 text-[13px] text-secondary italic">{counterfactualTrace}</p>
            </div>
          )}
          {pseudocodeLine !== null && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(SWITCH_TAB_PSEUDOCODE_EVENT))}
              className="mt-1 text-xs font-medium text-primary underline"
            >
              See line {pseudocodeLine} in pseudocode
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
