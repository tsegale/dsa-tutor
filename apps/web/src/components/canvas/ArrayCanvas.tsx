import { useEffect, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { motion, useMotionValue, type PanInfo } from 'framer-motion'
import { AlgorithmMode, CriticalJunctionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { CLEAR_CANVAS_SELECTION_EVENT, HANDS_ON_ANSWER_EVENT } from '@/components/prediction/PredictionZone'

interface ArrayCanvasProps {
  width?: number
  height?: number
  /** When set, the canvas plays a "what your answer would cause" trace instead of the real state. */
  mistakePath?: AlgorithmSnapshot[] | null
  onMistakePathComplete?: () => void
  /** Caption shown over the mistake wash. Defaults to the tile-prediction wording. */
  mistakeLabel?: string
}

const DEFAULT_MISTAKE_LABEL = 'What your answer would cause...'

const PADDING = 32

const BAR_COLOR = {
  success: '#16A34A',
  secondary: '#F59E0B',
  active: '#7C3AED',
  primary: '#4F46E5',
} as const

const MISTAKE_WASH_COLOR = 'rgba(220, 38, 38, 0.12)'
// 0.5x speed of the nominal 800ms step interval used elsewhere.
const MISTAKE_STEP_INTERVAL_MS = 1600
const MISTAKE_PAUSE_MS = 1000

const HANDS_ON_TOOLTIP_STORAGE_KEY = 'dsa-tutor-hands-on-tooltip-shown'
const HANDS_ON_TOOLTIP_DURATION_MS = 5000

export default function ArrayCanvas({
  width = 600,
  height = 300,
  mistakePath = null,
  onMistakePathComplete,
  mistakeLabel = DEFAULT_MISTAKE_LABEL,
}: ArrayCanvasProps) {
  const storeSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const mode = useAlgorithmStore((state) => state.mode)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const totalSteps = useAlgorithmStore((state) => state.snapshotArray.length)
  const prefersReducedMotion = useReducedMotion()

  const [mistakeStepIndex, setMistakeStepIndex] = useState(0)

  const isMistakeMode = mistakePath !== null && mistakePath.length > 0

  // Animate through the mistake path at half speed, then hand control
  // back to the parent (which clears mistakePath) after a beat.
  useEffect(() => {
    if (!isMistakeMode) {
      setMistakeStepIndex(0)
      return
    }

    setMistakeStepIndex(0)
    let currentStep = 0
    let pauseTimer: ReturnType<typeof setTimeout> | null = null

    const interval = setInterval(
      () => {
        currentStep += 1
        if (currentStep >= mistakePath!.length) {
          clearInterval(interval)
          pauseTimer = setTimeout(() => {
            onMistakePathComplete?.()
          }, MISTAKE_PAUSE_MS)
          return
        }
        setMistakeStepIndex(currentStep)
      },
      prefersReducedMotion ? 0 : MISTAKE_STEP_INTERVAL_MS,
    )

    return () => {
      clearInterval(interval)
      if (pauseTimer) clearTimeout(pauseTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mistakePath, isMistakeMode])

  const snapshot = isMistakeMode ? mistakePath![mistakeStepIndex] : storeSnapshot
  const mistakeAffectedIndices = isMistakeMode
    ? new Set([
        ...mistakePath![mistakeStepIndex].activeIndices,
        ...mistakePath![mistakeStepIndex].comparedIndices,
        ...mistakePath![mistakeStepIndex].swappedIndices,
      ])
    : null

  // Hands-On mode: direct-manipulation drag-to-swap replaces the click-to-
  // select flow, but only at SWAP_DECISION junctions. Conceptual junctions
  // (PASS_COMPLETE, EARLY_TERMINATION, ALGORITHM_COMPLETE) fall back to the
  // TILE_GRID input rendered by PredictionZone, same as Practice mode.
  const isHandsOnSwapStep =
    !isMistakeMode &&
    mode === AlgorithmMode.HANDS_ON &&
    snapshot?.isPredictionRequired === true &&
    snapshot?.criticalJunctionType === CriticalJunctionType.SWAP_DECISION
  const [handsOnLeft, handsOnRight] = isHandsOnSwapStep ? snapshot!.activeIndices : []

  const [handsOnSwapped, setHandsOnSwapped] = useState(false)
  const [handsOnLocked, setHandsOnLocked] = useState(false)
  const [handsOnTooltipVisible, setHandsOnTooltipVisible] = useState(false)
  const [draggingBarIndex, setDraggingBarIndex] = useState<number | null>(null)

  // The drag gesture's own transform is a separate offset layered on top
  // of each bar's rendered x. Framer's `layout` prop animates the FLIP
  // between old/new x once handsOnSwapped changes, but it doesn't know to
  // zero out a still-active drag offset on its own - left uncleared, the
  // dragged bar ends up sitting at (new x + leftover drag offset) instead
  // of cleanly at the new slot. These are reset to 0 the instant the drag
  // ends, so the FLIP animates from a clean starting point.
  const dragXLeft = useMotionValue(0)
  const dragXRight = useMotionValue(0)

  useEffect(() => {
    setHandsOnSwapped(false)
    setHandsOnLocked(false)
    setDraggingBarIndex(null)
    dragXLeft.set(0)
    dragXRight.set(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.stepIndex])

  // PredictionZone fires this on every retry reset (auto-reset, "Try
  // again", or the NONE-level advance), which is exactly when the drag
  // gesture should become available again too.
  useEffect(() => {
    function handleClear() {
      setHandsOnSwapped(false)
      setHandsOnLocked(false)
      dragXLeft.set(0)
      dragXRight.set(0)
    }
    window.addEventListener(CLEAR_CANVAS_SELECTION_EVENT, handleClear)
    return () => window.removeEventListener(CLEAR_CANVAS_SELECTION_EVENT, handleClear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isHandsOnSwapStep) return
    if (localStorage.getItem(HANDS_ON_TOOLTIP_STORAGE_KEY) === 'true') return

    setHandsOnTooltipVisible(true)
    const timer = setTimeout(() => {
      setHandsOnTooltipVisible(false)
      localStorage.setItem(HANDS_ON_TOOLTIP_STORAGE_KEY, 'true')
    }, HANDS_ON_TOOLTIP_DURATION_MS)
    return () => clearTimeout(timer)
  }, [isHandsOnSwapStep])

  function dismissHandsOnTooltip() {
    if (!handsOnTooltipVisible) return
    setHandsOnTooltipVisible(false)
    localStorage.setItem(HANDS_ON_TOOLTIP_STORAGE_KEY, 'true')
  }

  const bars = useMemo(() => {
    const values = (snapshot?.dataStructureState as number[] | undefined) ?? []
    if (values.length === 0) return []

    const xScale = d3
      .scaleBand<number>()
      .domain(values.map((_, i) => i))
      .range([PADDING, width - PADDING])
      .paddingInner(0.15)

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(values) ?? 0])
      .range([height - PADDING, PADDING])

    const bandwidth = xScale.bandwidth()

    return values.map((value, index) => {
      const x = xScale(index) ?? 0
      const barY = yScale(value)
      const barHeight = height - PADDING - barY

      return {
        index,
        value,
        x,
        y: barY,
        width: bandwidth,
        height: barHeight,
      }
    })
  }, [snapshot, width, height])

  // Distance in px between the two draggable bars' slots: one bar
  // position's worth of travel is exactly what the drag constraints and
  // the swap threshold (its midpoint) need.
  const slotDistance =
    isHandsOnSwapStep && bars[handsOnLeft] && bars[handsOnRight] ? bars[handsOnRight].x - bars[handsOnLeft].x : 0

  function handleHandsOnDragEnd(barIndex: number, offsetX: number) {
    setDraggingBarIndex(null)
    // Zero the raw drag transform immediately so it doesn't linger as an
    // extra offset once `displayX` (below) moves the bar to its new slot.
    dragXLeft.set(0)
    dragXRight.set(0)
    if (!isHandsOnSwapStep || handsOnLocked || slotDistance === 0) return
    const threshold = slotDistance / 2
    const crossed = barIndex === handsOnLeft ? offsetX > threshold : offsetX < -threshold
    setHandsOnSwapped(crossed)
    setHandsOnLocked(true)
    window.dispatchEvent(new CustomEvent(HANDS_ON_ANSWER_EVENT, { detail: crossed ? 'swap' : 'no-swap' }))
  }

  // SVG paints in DOM order, so without this the bar being actively
  // dragged can visually pass *behind* the bar it's being dragged over
  // (whichever one already sits later in the array). Rendering the
  // currently-dragged bar last keeps it floating on top the whole time.
  const renderBars =
    draggingBarIndex === null
      ? bars
      : [...bars].sort((a, b) => (a.index === draggingBarIndex ? 1 : b.index === draggingBarIndex ? -1 : 0))

  if (!snapshot || bars.length === 0) {
    return (
      <svg width={width} height={height} role="img" aria-label="No algorithm loaded">
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-text-muted text-sm dark:fill-dark-text-secondary"
        >
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  const canvasLabel = `${algorithmName}, step ${snapshot.stepIndex + 1} of ${totalSteps}: ${snapshot.description}`

  return (
    <>
    {handsOnTooltipVisible && (
      <div className="absolute top-2 left-1/2 z-30 w-[280px] max-w-[80%] -translate-x-1/2 rounded-md border-l-4 border-secondary bg-secondary-light p-3 text-center shadow-md">
        <p className="text-[13px] text-secondary">
          Drag the bars to swap them, or leave them in place if no swap is needed.
        </p>
      </div>
    )}
    <svg width={width} height={height} role="img" aria-label={canvasLabel}>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .bar-group {
          transition: opacity 0.4s ease-in-out, fill 0.4s ease-in-out;
        }
      `}</style>

      {isMistakeMode && (
        <>
          <rect x={0} y={0} width={width} height={height} fill={MISTAKE_WASH_COLOR} />
          <text
            x={width / 2}
            y={18}
            textAnchor="middle"
            className="fill-error text-[12px] italic"
          >
            {mistakeLabel}
          </text>
        </>
      )}

      {isHandsOnSwapStep && !handsOnLocked && bars[handsOnLeft] && bars[handsOnRight] && (
        <rect
          x={bars[handsOnLeft].x}
          y={PADDING}
          width={bars[handsOnRight].x + bars[handsOnRight].width - bars[handsOnLeft].x}
          height={height - PADDING * 2}
          rx={6}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      )}

      {renderBars.map((bar) => {
        const isHighlighted = snapshot.highlightIndices.includes(bar.index)
        const isSwapped = snapshot.swappedIndices.includes(bar.index)
        const isActive = snapshot.activeIndices.includes(bar.index)
        const isSpecial = isHighlighted || isSwapped || isActive
        const isMistakeAffected = mistakeAffectedIndices?.has(bar.index) ?? false

        const isDraggableBar =
          isHandsOnSwapStep && !handsOnLocked && (bar.index === handsOnLeft || bar.index === handsOnRight)

        // In Hands-On mode, a completed swap moves the two bars' visual
        // slots without touching the real dataStructureState (that only
        // changes once the answer is actually submitted and graded).
        const displayX =
          isHandsOnSwapStep && handsOnSwapped && bar.index === handsOnLeft
            ? bars[handsOnRight].x
            : isHandsOnSwapStep && handsOnSwapped && bar.index === handsOnRight
              ? bars[handsOnLeft].x
              : bar.x

        const fill = isHighlighted
          ? BAR_COLOR.success
          : isSwapped
            ? BAR_COLOR.secondary
            : isActive
              ? BAR_COLOR.active
              : BAR_COLOR.primary

        const barDragX = bar.index === handsOnLeft ? dragXLeft : bar.index === handsOnRight ? dragXRight : undefined

        return (
          <motion.g
            key={bar.index}
            layout
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeInOut' }}
            style={isDraggableBar ? { opacity: isSpecial ? 1 : 0.4, x: barDragX } : { opacity: isSpecial ? 1 : 0.4 }}
            className={cn(
              'bar-group group',
              isActive && !prefersReducedMotion && 'animate-pulse-ring',
              isDraggableBar && 'cursor-grab active:cursor-grabbing',
            )}
            aria-label={`Index ${bar.index}, value ${bar.value}${isDraggableBar ? ', draggable' : ''}`}
            {...(isDraggableBar
              ? {
                  drag: 'x' as const,
                  dragConstraints: { left: -slotDistance, right: slotDistance },
                  dragElastic: 0.15,
                  dragMomentum: false,
                  onDragStart: () => {
                    dismissHandsOnTooltip()
                    setDraggingBarIndex(bar.index)
                  },
                  onDragEnd: (_event: unknown, info: PanInfo) => handleHandsOnDragEnd(bar.index, info.offset.x),
                }
              : {})}
          >
            <rect
              x={displayX}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={4}
              className="bar-group"
              style={{ fill }}
            />
            {isMistakeAffected && (
              <rect
                x={displayX}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={4}
                fill="none"
                stroke="#DC2626"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
            <text
              x={displayX + bar.width / 2}
              y={height - PADDING + 16}
              textAnchor="middle"
              className="fill-text-primary text-xs font-medium dark:fill-dark-text-primary"
            >
              {bar.value}
            </text>
            <text
              x={displayX + bar.width / 2}
              y={bar.y - 8}
              textAnchor="middle"
              className="fill-text-muted text-[10px] dark:fill-dark-text-secondary"
            >
              {bar.index}
            </text>
          </motion.g>
        )
      })}
    </svg>
    </>
  )
}
