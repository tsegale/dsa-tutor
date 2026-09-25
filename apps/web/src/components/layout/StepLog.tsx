import { useEffect, useRef } from 'react'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

interface StepLogProps {
  /** Same answer-safety gate as SocraticGuidanceBox: false while the
   * current step's prediction is still pending, since several engines'
   * descriptions state the junction's outcome outright. */
  predictionResolved: boolean
}

/**
 * Every narration step up to and including the current one, in a
 * scrollable list. Practice mode auto-advances through narration-only
 * steps (see scheduleNarrationAutoAdvance in useAlgorithmStore.ts) so
 * they no longer sit on screen long enough to read one at a time - this
 * is where that text still lives, so nothing is lost.
 */
export default function StepLog({ predictionResolved }: StepLogProps) {
  const snapshotArray = useAlgorithmStore((state) => state.snapshotArray)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const bottomRef = useRef<HTMLDivElement>(null)

  const visitedSteps = snapshotArray.slice(0, stepIndex + 1)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [stepIndex])

  return (
    <div
      className="flex h-full flex-col overflow-x-hidden rounded-md border border-border bg-card"
      style={{ width: '100%' }}
    >
      <div className="border-b border-border px-4 py-2">
        <span className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Step log</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {visitedSteps.map((step, index) => {
          const isCurrent = index === stepIndex
          const isUnresolvedJunction = isCurrent && step.isPredictionRequired && !predictionResolved
          return (
            <div
              key={step.stepIndex}
              className="flex gap-2 rounded px-2 py-1.5 text-[12px]"
              style={{ backgroundColor: isCurrent ? 'rgba(79,70,229,0.08)' : 'transparent' }}
            >
              <span className="w-5 shrink-0 text-right text-text-muted select-none dark:text-dark-text-secondary">
                {index + 1}
              </span>
              <span
                className={
                  isCurrent
                    ? 'font-medium text-text-primary dark:text-dark-text-primary'
                    : 'text-text-muted dark:text-dark-text-secondary'
                }
              >
                {isUnresolvedJunction ? 'Waiting for your answer...' : step.description}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
