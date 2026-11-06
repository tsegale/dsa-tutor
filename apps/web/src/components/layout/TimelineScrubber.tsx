import { useRef, useState } from 'react'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { cn } from '@/lib/utils'

/**
 * Interactive Execution Timeline Scrubber:
 * - Click or drag along the step track to jump directly to any reachable step.
 * - Renders diamond markers at every Critical Junction, colour-coded by outcome
 *   (correct, incorrect, worked, or pending).
 * - In Practice / Hands-On modes, forward scrubbing stops at the next unanswered
 *   Critical Junction (enforced by store.jumpToStep).
 */
export default function TimelineScrubber() {
  const snapshotArray = useAlgorithmStore((state) => state.snapshotArray)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const mode = useAlgorithmStore((state) => state.mode)
  const classicMode = useAlgorithmStore((state) => state.classicMode)
  const stepOutcomes = useAlgorithmStore((state) => state.stepOutcomes)
  const predictionResolved = useAlgorithmStore((state) => state.predictionResolved)
  const jumpToStep = useAlgorithmStore((state) => state.jumpToStep)

  const trackRef = useRef<HTMLDivElement>(null)
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const total = snapshotArray.length
  if (total < 2) return null

  const isInteractive = !classicMode && (mode === AlgorithmMode.PRACTICE || mode === AlgorithmMode.HANDS_ON)

  // First unanswered live junction index (blocks scrubbing beyond it in interactive modes).
  let maxScrubbableIndex = total - 1
  if (isInteractive) {
    for (let i = 0; i < total; i++) {
      const snap = snapshotArray[i]
      const answered = i in stepOutcomes || (i === stepIndex && predictionResolved)
      if (snap?.isPredictionRequired && !answered) {
        maxScrubbableIndex = i
        break
      }
    }
  }

  function stepFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return stepIndex
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * (total - 1))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    jumpToStep(stepFromClientX(event.clientX))
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const idx = stepFromClientX(event.clientX)
    setHoveredStep(idx)
    if (isDragging) {
      jumpToStep(idx)
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (isDragging) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      setIsDragging(false)
    }
  }

  const progressRatio = stepIndex / (total - 1)
  const reachableRatio = maxScrubbableIndex / (total - 1)

  const hoveredSnap = hoveredStep !== null ? snapshotArray[hoveredStep] : null
  const hoveredLocked = isInteractive && hoveredStep !== null && hoveredStep > maxScrubbableIndex
  const hoveredTooltip =
    hoveredStep !== null && hoveredSnap
      ? hoveredLocked
        ? `Step ${hoveredStep + 1} · Answer step ${maxScrubbableIndex + 1} first`
        : hoveredSnap.isPredictionRequired && isInteractive && !(hoveredStep in stepOutcomes)
          ? `Step ${hoveredStep + 1} · Prediction checkpoint`
          : `Step ${hoveredStep + 1} · ${hoveredSnap.description.slice(0, 68)}${hoveredSnap.description.length > 68 ? '...' : ''}`
      : null

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-1 px-3 pt-1">
      {hoveredTooltip && hoveredStep !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 z-20 max-w-xs -translate-x-1/2 truncate rounded border border-border bg-popover px-2 py-0.5 font-mono text-[10px] text-text-primary shadow-sm dark:border-dark-border dark:text-dark-text-primary"
          style={{ left: `${Math.max(10, Math.min(90, (hoveredStep / (total - 1)) * 100))}%` }}
        >
          {hoveredTooltip}
        </div>
      )}

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Execution timeline"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={stepIndex + 1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setHoveredStep(null)
          setIsDragging(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Home') {
            e.preventDefault()
            jumpToStep(0)
          } else if (e.key === 'End') {
            e.preventDefault()
            jumpToStep(maxScrubbableIndex)
          }
        }}
        className="group relative flex h-5 cursor-pointer items-center select-none touch-none"
      >
        {/* Full track rail */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-sunk dark:bg-dark-border">
          {/* Reachable horizon in interactive modes */}
          {isInteractive && maxScrubbableIndex < total - 1 && (
            <div
              className="absolute inset-y-0 left-0 bg-border/60 dark:bg-surface/20"
              style={{ width: `${reachableRatio * 100}%` }}
            />
          )}
          {/* Active progress fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-100"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>

        {/* Critical Junction diamond markers */}
        {!classicMode &&
          snapshotArray.map((snap, idx) => {
            if (!snap.isPredictionRequired) return null
            const pct = (idx / (total - 1)) * 100
            const outcome = stepOutcomes[idx]
            const isCurrent = idx === stepIndex
            const markerClass =
              outcome === 'correct'
                ? 'bg-state-sorted border-surface'
                : outcome === 'incorrect'
                  ? 'bg-state-swapped border-surface'
                  : outcome === 'worked'
                    ? 'bg-ink-3 border-surface'
                    : isCurrent
                      ? 'bg-state-current border-surface scale-125'
                      : 'bg-surface border-primary'
            return (
              <span
                key={idx}
                aria-hidden="true"
                style={{ left: `${pct}%` }}
                className={cn(
                  'pointer-events-none absolute size-2 -translate-x-1/2 rotate-45 border transition-transform',
                  markerClass,
                )}
              />
            )
          })}

        {/* Playhead thumb */}
        <span
          aria-hidden="true"
          style={{ left: `${progressRatio * 100}%` }}
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 rounded-full border-2 border-surface bg-primary shadow-sm transition-transform group-hover:scale-110"
        />
      </div>
    </div>
  )
}
