import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface OnboardingTooltipProps {
  step: number
  totalSteps: number
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
  targetRef: RefObject<HTMLElement | null>
  onNext: () => void
  onSkip: () => void
  isLastStep: boolean
}

const GAP = 14
const VIEWPORT_MARGIN = 12

const ENTER_OFFSET: Record<OnboardingTooltipProps['position'], { x?: number; y?: number }> = {
  bottom: { y: 8 },
  top: { y: -8 },
  right: { x: 8 },
  left: { x: -8 },
}

export default function OnboardingTooltip({
  step,
  totalSteps,
  title,
  description,
  position,
  targetRef,
  onNext,
  onSkip,
  isLastStep,
}: OnboardingTooltipProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    function computePosition() {
      const target = targetRef.current
      const card = cardRef.current
      if (!target || !card) return

      const targetRect = target.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()

      let top = 0
      let left = 0

      switch (position) {
        case 'bottom':
          top = targetRect.bottom + GAP
          left = targetRect.left + targetRect.width / 2 - cardRect.width / 2
          break
        case 'top':
          top = targetRect.top - cardRect.height - GAP
          left = targetRect.left + targetRect.width / 2 - cardRect.width / 2
          break
        case 'right':
          top = targetRect.top + targetRect.height / 2 - cardRect.height / 2
          left = targetRect.right + GAP
          break
        case 'left':
          top = targetRect.top + targetRect.height / 2 - cardRect.height / 2
          left = targetRect.left - cardRect.width - GAP
          break
      }

      left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - cardRect.width - VIEWPORT_MARGIN)
      top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - cardRect.height - VIEWPORT_MARGIN)

      setCoords({ top, left })
    }

    computePosition()
    window.addEventListener('resize', computePosition)
    return () => window.removeEventListener('resize', computePosition)
  }, [targetRef, position, step])

  const enterOffset = ENTER_OFFSET[position]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        ref={cardRef}
        initial={{ opacity: 0, x: enterOffset.x ?? 0, y: enterOffset.y ?? 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: coords?.top ?? -9999,
          left: coords?.left ?? -9999,
          visibility: coords ? 'visible' : 'hidden',
        }}
        className="z-[51] w-[320px] rounded-lg bg-white p-6 shadow-xl"
      >
        <span
          className={cn(
            'absolute h-3 w-3 rotate-45 bg-white',
            position === 'bottom' && 'top-[-6px] left-1/2 -translate-x-1/2',
            position === 'top' && 'bottom-[-6px] left-1/2 -translate-x-1/2',
            position === 'right' && 'left-[-6px] top-1/2 -translate-y-1/2',
            position === 'left' && 'right-[-6px] top-1/2 -translate-y-1/2',
          )}
        />

        <div className="mb-4 flex items-center gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((pillStep) => (
            <span
              key={pillStep}
              className={cn(
                'size-2 rounded-full',
                pillStep <= step ? 'bg-primary' : 'border border-border bg-transparent',
              )}
            />
          ))}
        </div>

        <h3 className="text-base font-bold text-primary">{title}</h3>
        <p className="mt-1.5 text-[13px] text-text-secondary" style={{ lineHeight: 1.6 }}>
          {description}
        </p>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-text-muted hover:text-text-secondary"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
          >
            {isLastStep ? 'Start learning' : 'Next'}
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-text-muted">
          Press → or Enter to continue, Esc to skip
        </p>
      </motion.div>
    </AnimatePresence>
  )
}
