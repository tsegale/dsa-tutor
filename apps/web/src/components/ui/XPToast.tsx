import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface XPToastProps {
  amount: number
  visible: boolean
  onComplete?: () => void
}

type Phase = 'idle' | 'visible' | 'exiting'

const EXIT_DURATION_MS = 150

const targets = {
  idle: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exiting: { y: -10, opacity: 0 },
}

const enterTransition = { duration: 0.2, ease: 'easeOut' as const }
const exitTransition = { duration: EXIT_DURATION_MS / 1000, ease: 'easeInOut' as const }

export default function XPToast({ amount, visible, onComplete }: XPToastProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const wasShown = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!visible) return
    setPhase('visible')
    wasShown.current = true
    const dismissTimer = setTimeout(() => setPhase('exiting'), 2000)
    return () => clearTimeout(dismissTimer)
  }, [visible])

  useEffect(() => {
    if (phase !== 'exiting' || !wasShown.current) return
    wasShown.current = false
    const completeTimer = setTimeout(() => {
      setPhase('idle')
      onComplete?.()
    }, EXIT_DURATION_MS)
    return () => clearTimeout(completeTimer)
  }, [phase, onComplete])

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      {phase !== 'idle' && (
        <motion.div
          key={phase}
          initial={phase === 'visible' ? targets.idle : targets.visible}
          animate={targets[phase]}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : phase === 'visible'
                ? enterTransition
                : exitTransition
          }
          className="flex items-center gap-2 rounded-md bg-secondary-light px-4 py-2 text-secondary shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
          <span className="font-medium">+{amount} XP</span>
        </motion.div>
      )}
    </div>
  )
}
