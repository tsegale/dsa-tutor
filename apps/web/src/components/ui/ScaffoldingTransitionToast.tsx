import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface ScaffoldingTransitionToastProps {
  message: string | null
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 3000

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V5l-8-3z" />
    </svg>
  )
}

export default function ScaffoldingTransitionToast({ message, onDismiss }: ScaffoldingTransitionToastProps) {
  useEffect(() => {
    if (message === null) return
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2">
      <AnimatePresence mode="wait">
        {message !== null && (
          <motion.div
            key="scaffolding-transition-toast"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 shadow-lg dark:bg-dark-surface"
          >
            <ShieldIcon />
            <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
