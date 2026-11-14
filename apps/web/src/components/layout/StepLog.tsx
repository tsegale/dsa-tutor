import { useEffect, useRef } from 'react'
import { useAlgorithmStore, selectIsLiveJunction } from '@/store/useAlgorithmStore'
import { cn } from '@/lib/utils'

interface StepLogProps {
  /** Same answer-safety gate as SocraticGuidanceBox: false while the
   * current step's prediction is still pending, since several engines'
   * descriptions state the junction's outcome outright. */
  predictionResolved: boolean
}

function TimelineIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-brand" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  )
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
  const isLiveJunction = useAlgorithmStore(selectIsLiveJunction)
  const listRef = useRef<HTMLDivElement>(null)

  const visitedSteps = snapshotArray.slice(0, stepIndex + 1)

  useEffect(() => {
    // Scrolls only the log's own list. scrollIntoView also scrolls every
    // scrollable ancestor - including overflow-x-hidden ones, which stay
    // programmatically scrollable - and was sliding the whole right panel
    // sideways, cutting off its left edge.
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [stepIndex])

  return (
    <div
      className="flex h-full flex-col overflow-x-hidden rounded-md border border-border bg-card shadow-e1 dark:border-dark-border"
      style={{ width: '100%' }}
    >
      <div className="flex items-center justify-between border-b border-border bg-surface-sunk/60 px-3 py-2 dark:border-dark-border">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-primary dark:text-dark-text-primary">
          <TimelineIcon />
          Step log
        </span>
        <span className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] font-medium text-text-muted dark:border-dark-border dark:text-dark-text-secondary">
          {visitedSteps.length} / {snapshotArray.length}
        </span>
      </div>
      <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto p-2">
        {visitedSteps.map((step, index) => {
          const isCurrent = index === stepIndex
          const isUnresolvedJunction = isCurrent && isLiveJunction && !predictionResolved
          return (
            <div
              key={step.stepIndex}
              className={cn(
                'flex items-start gap-2 rounded-sm border px-2 py-1.5 text-[12px] transition-colors',
                isCurrent
                  ? 'border-brand/40 bg-brand-soft/80 font-medium text-text-primary dark:text-dark-text-primary'
                  : 'border-transparent text-text-muted hover:bg-surface-sunk/50 dark:text-dark-text-secondary',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold select-none tabular-nums',
                  isCurrent
                    ? 'bg-brand text-primary-foreground'
                    : 'bg-surface-sunk text-text-muted dark:bg-dark-border dark:text-dark-text-secondary',
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 leading-snug">
                {isUnresolvedJunction ? 'Waiting for your answer...' : step.description}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
