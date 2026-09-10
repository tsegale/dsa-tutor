import { useEffect, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { motion, useMotionValue, type PanInfo } from 'framer-motion'
import { AlgorithmMode, CriticalJunctionType, CanvasType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
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
  /**
   * TWO_POINTER and SLIDING_WINDOW render an extra overlay on top of
   * the normal bars; every other value (including the default ARRAY)
   * renders exactly as before. Pointer/window positions are read from
   * dataStructureState (see extractTwoPointer/extractWindow below),
   * not passed as separate props, so CanvasContainer only ever needs
   * to forward canvasType - the same call site as plain ARRAY.
   */
  canvasType?: CanvasType
}

// Two-pointer engines are expected to put these fields directly on
// dataStructureState alongside `array`. Falls back to `left`/`right`
// for terser engine code.
function extractTwoPointer(state: unknown): { left: number | null; right: number | null } {
  if (!state || typeof state !== 'object') return { left: null, right: null }
  const s = state as Record<string, unknown>
  const left = typeof s.leftPointerIndex === 'number' ? s.leftPointerIndex : typeof s.left === 'number' ? s.left : null
  const right = typeof s.rightPointerIndex === 'number' ? s.rightPointerIndex : typeof s.right === 'number' ? s.right : null
  return { left, right }
}

// Sliding-window engines are expected to put these fields directly on
// dataStructureState alongside `array`. windowSum is optional - a
// fixed-size window shows "Window size" instead when it's absent.
function extractWindow(state: unknown): { start: number | null; end: number | null; sum: number | null } {
  if (!state || typeof state !== 'object') return { start: null, end: null, sum: null }
  const s = state as Record<string, unknown>
  const start = typeof s.windowStart === 'number' ? s.windowStart : null
  const end = typeof s.windowEnd === 'number' ? s.windowEnd : null
  const sum = typeof s.windowSum === 'number' ? s.windowSum : null
  return { start, end, sum }
}

const DEFAULT_MISTAKE_LABEL = 'What your answer would cause...'

const PADDING = 32

type BarState = 'neutral' | 'comparing' | 'swapping' | 'sorted'

const BAR_COLOURS: Record<BarState, { fill: string; value: string; opacity: number; glow?: string }> = {
  neutral: { fill: '#c7c9e8', value: '#4a4d8a', opacity: 0.4 },
  comparing: { fill: '#f59e0b', value: '#78350f', opacity: 1.0, glow: 'rgba(245,158,11,0.3)' },
  swapping: { fill: '#7c3aed', value: '#ffffff', opacity: 1.0, glow: 'rgba(124,58,237,0.3)' },
  sorted: { fill: '#16a34a', value: '#ffffff', opacity: 1.0 },
}

const MISTAKE_WASH_COLOR = 'rgba(220, 38, 38, 0.12)'
// 0.5x speed of the nominal 800ms step interval used elsewhere.
const MISTAKE_STEP_INTERVAL_MS = 1600
const MISTAKE_PAUSE_MS = 1000

const HANDS_ON_TOOLTIP_STORAGE_KEY = 'dsa-tutor-hands-on-tooltip-shown'
const HANDS_ON_TOOLTIP_DURATION_MS = 5000

// Bubble Sort's dataStructureState is a plain number[]; the Phase 16
// algorithms (Linear/Binary Search, Selection/Insertion Sort) use a
// richer object with the array nested under an `array` field, since
// they also need to carry a target, indices, etc. This extracts the
// bars to render regardless of which shape the current algorithm uses.
// Foundations' palindromeCheckEngine (TWO_POINTER mode) uses a
// character array instead of numbers, so the return type covers both -
// see barHeightValue below for how a character still gets a bar height.
function extractDisplayValues(state: unknown): (number | string)[] {
  if (Array.isArray(state)) return state
  if (state && typeof state === 'object' && Array.isArray((state as { array?: unknown }).array)) {
    return (state as { array: (number | string)[] }).array
  }
  return []
}

// Characters have no natural "height" the way numbers do - this maps
// each character to a small positive number (a=1, b=2, ...) purely so
// palindromeCheckEngine's bars still have some visual variation. The
// bar's displayed label always shows the real character, never this.
function barHeightValue(value: number | string): number {
  if (typeof value === 'number') return value
  const code = value.toLowerCase().charCodeAt(0) - 96
  return code >= 1 && code <= 26 ? code : value.charCodeAt(0)
}

export default function ArrayCanvas({
  width = 600,
  height = 300,
  mistakePath = null,
  onMistakePathComplete,
  mistakeLabel = DEFAULT_MISTAKE_LABEL,
  canvasType = CanvasType.ARRAY,
}: ArrayCanvasProps) {
  const storeSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const mode = useAlgorithmStore((state) => state.mode)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const totalSteps = useAlgorithmStore((state) => state.snapshotArray.length)
  // TODO(mastery-backend): swap for the real backend-computed mastery score
  // once that endpoint exists; step progress is a placeholder for now.
  const masteryPercent = useAlgorithmStore(selectProgressPercent)
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
    const values = extractDisplayValues(snapshot?.dataStructureState)
    if (values.length === 0) return []

    const heightValues = values.map(barHeightValue)

    const xScale = d3
      .scaleBand<number>()
      .domain(values.map((_, i) => i))
      .range([PADDING, width - PADDING])
      .paddingInner(0.15)

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(heightValues) ?? 0])
      .range([height - PADDING, PADDING])

    const bandwidth = xScale.bandwidth()

    return values.map((value, index) => {
      const x = xScale(index) ?? 0
      const barY = yScale(heightValues[index])
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

  const twoPointer = useMemo(
    () => (canvasType === CanvasType.TWO_POINTER ? extractTwoPointer(snapshot?.dataStructureState) : { left: null, right: null }),
    [canvasType, snapshot],
  )
  const windowOverlay = useMemo(
    () => (canvasType === CanvasType.SLIDING_WINDOW ? extractWindow(snapshot?.dataStructureState) : { start: null, end: null, sum: null }),
    [canvasType, snapshot],
  )

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

  const masteryColorClass =
    masteryPercent >= 80 ? 'bg-success' : masteryPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  return (
    <>
    <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Mastery</span>
        <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
          <div className={cn('h-full rounded-full', masteryColorClass)} style={{ width: `${masteryPercent}%` }} />
        </div>
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
          {masteryPercent}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        {(
          [
            ['neutral', 'Neutral'],
            ['comparing', 'Comparing'],
            ['swapping', 'Swapping'],
            ['sorted', 'Sorted'],
          ] as const
        ).map(([state, label]) => (
          <div key={state} className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ backgroundColor: BAR_COLOURS[state].fill }} aria-hidden="true" />
            <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
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
        const isCompared = snapshot.comparedIndices.includes(bar.index)
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

        // Priority order: sorted > swapping > comparing/compared > neutral.
        // comparedIndices and activeIndices share the amber "comparing"
        // colour at every step (not only at prediction junctions), so the
        // canvas reads as alive throughout Demo mode playback, not just at
        // pauses. swappedIndices always wins over both since a bar that
        // just swapped is the more important signal for that one step.
        const barState: BarState = isHighlighted
          ? 'sorted'
          : isSwapped
            ? 'swapping'
            : isActive || isCompared
              ? 'comparing'
              : 'neutral'
        const colours = BAR_COLOURS[barState]

        const barDragX = bar.index === handsOnLeft ? dragXLeft : bar.index === handsOnRight ? dragXRight : undefined

        return (
          <motion.g
            key={bar.index}
            layout
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeInOut' }}
            style={isDraggableBar ? { opacity: colours.opacity, x: barDragX } : { opacity: colours.opacity }}
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
            {colours.glow && (
              <rect
                x={displayX - 2}
                y={bar.y}
                width={bar.width + 4}
                height={bar.height}
                rx={8}
                fill="none"
                stroke={colours.glow}
                strokeWidth={2}
                opacity={0.5}
              />
            )}
            <rect
              x={displayX}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={4}
              className="bar-group"
              style={{ fill: colours.fill }}
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
            <rect
              x={displayX}
              y={bar.y + bar.height}
              width={bar.width}
              height={12}
              rx={3}
              fill="rgba(0,0,0,0.06)"
            />
            <text
              x={displayX + bar.width / 2}
              y={bar.y + bar.height + 9}
              textAnchor="middle"
              className="fill-text-muted text-[9px]"
              style={{ pointerEvents: 'none' }}
            >
              ⠿
            </text>
            <text
              x={displayX + bar.width / 2}
              y={height - PADDING + 16}
              textAnchor="middle"
              className="text-xs font-medium"
              style={{ fill: colours.value }}
            >
              {bar.value}
            </text>
            <text
              x={displayX + bar.width / 2}
              y={height - 12}
              textAnchor="middle"
              className="fill-text-muted text-[10px] dark:fill-dark-text-secondary"
            >
              {bar.index}
            </text>
          </motion.g>
        )
      })}

      {canvasType === CanvasType.TWO_POINTER &&
        twoPointer.left !== null &&
        twoPointer.right !== null &&
        bars[twoPointer.left] &&
        bars[twoPointer.right] && (
          <>
            {twoPointer.left === twoPointer.right ? (
              <g transform={`translate(${bars[twoPointer.left].x + bars[twoPointer.left].width / 2}, ${height - 6})`}>
                <polygon points="0,-8 -7,4 7,4" fill="#7c3aed" />
                <text y={16} textAnchor="middle" className="fill-active text-[11px] font-bold">
                  L=R
                </text>
              </g>
            ) : (
              <>
                <g transform={`translate(${bars[twoPointer.left].x + bars[twoPointer.left].width / 2}, ${height - 6})`}>
                  <polygon points="0,-8 -7,4 7,4" fill="#16a34a" />
                  <text y={16} textAnchor="middle" className="fill-success text-[11px] font-bold">
                    L
                  </text>
                </g>
                <g transform={`translate(${bars[twoPointer.right].x + bars[twoPointer.right].width / 2}, ${height - 6})`}>
                  <polygon points="0,-8 -7,4 7,4" fill="#dc2626" />
                  <text y={16} textAnchor="middle" className="fill-error text-[11px] font-bold">
                    R
                  </text>
                </g>
              </>
            )}
          </>
        )}

      {canvasType === CanvasType.SLIDING_WINDOW &&
        windowOverlay.start !== null &&
        windowOverlay.end !== null &&
        bars[windowOverlay.start] &&
        bars[windowOverlay.end] && (
          <>
            <motion.rect
              layout
              x={bars[windowOverlay.start].x}
              y={PADDING}
              width={bars[windowOverlay.end].x + bars[windowOverlay.end].width - bars[windowOverlay.start].x}
              height={height - PADDING * 2}
              rx={8}
              fill="rgba(55, 48, 163, 0.15)"
              stroke="#3730a3"
              strokeWidth={2}
              transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeInOut' }}
            />
            <motion.text
              layout
              x={
                (bars[windowOverlay.start].x + bars[windowOverlay.end].x + bars[windowOverlay.end].width) / 2
              }
              y={height - 4}
              textAnchor="middle"
              className="fill-active text-[11px] font-semibold"
              transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeInOut' }}
            >
              {windowOverlay.sum !== null
                ? `Window sum: ${windowOverlay.sum}`
                : `Window size: ${windowOverlay.end - windowOverlay.start + 1}`}
            </motion.text>
          </>
        )}
    </svg>
    </>
  )
}
