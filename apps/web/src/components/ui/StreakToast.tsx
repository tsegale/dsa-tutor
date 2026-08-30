import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface StreakToastProps {
  streakCount: number
  visible: boolean
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 4000

function FlameIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-streak">
      <path d="M12 2c1 3-2 4.5-2 7.5A4.5 4.5 0 0 0 12 14a2.5 2.5 0 0 0 2.5-2.5c0-.9-.4-1.4-.8-1.9 2.3 1.2 3.8 3.6 3.8 6.4a5.5 5.5 0 0 1-11 0C6.5 12 8 9.5 8 7c0-2 1.5-3.8 4-5Z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

export default function StreakToast({ streakCount, visible, onDismiss }: StreakToastProps) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [visible, onDismiss])

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key="streak-toast"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pointer-events-auto flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 shadow-lg"
          >
            <FlameIcon />
            <span className="text-sm font-medium text-text-primary">{streakCount} day streak!</span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss streak notification"
              className="ml-1 text-text-muted hover:text-text-primary"
            >
              <XIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
