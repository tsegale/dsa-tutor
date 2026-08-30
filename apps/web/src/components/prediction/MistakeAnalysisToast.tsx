import { AnimatePresence, motion } from 'framer-motion'

interface MistakeAnalysisToastProps {
  message: string | null
  pseudocodeLine: number | null
  onDismiss: () => void
}

export const SWITCH_TAB_PSEUDOCODE_EVENT = 'switch-tab-pseudocode'

const toastVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export default function MistakeAnalysisToast({
  message,
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
          className="absolute top-0 left-0 z-10 w-full rounded-md border-l-4 border-error bg-error-light p-4"
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
