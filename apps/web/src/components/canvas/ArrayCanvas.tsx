import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as d3 from 'd3'
import { motion, useMotionValue, type PanInfo } from 'framer-motion'
import { AlgorithmMode, CanvasType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot, selectIsLiveJunction, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { canvasMove } from '@/utils/motion'
import { cn } from '@/lib/utils'
import { CLEAR_CANVAS_SELECTION_EVENT, HANDS_ON_ANSWER_EVENT } from '@/components/prediction/PredictionZone'
import { getHandsOnDragTarget } from '@/utils/handsOnDrag'
import { extractMemoryView, extractSearchRange, extractShiftView, hex } from '@/utils/arrayOverlays'
import { operationLabelFor } from '@/utils/operationLabel'
import OperationBanner from './OperationBanner'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'
import { useResolveColour } from './useResolveColour'

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

// 60, not a smaller value: two different absolute-positioned badges sit
// over this same canvas area at the top-left - the progress meter
// (top-2, bottom edge ~24px) and, when a misconception is open for this
// topic, OpenMisconceptionIndicator (top-4, an opaque bg-popover pill,
// bottom edge ~48px - see its own "never covers the canvas" comment,
// which this PADDING value is what actually keeps that promise). The
// tallest bar's value label renders at bar.y - 10 (see the label's own y
// calculation below), and bar.y equals PADDING for the max-value bar, so
// PADDING needs enough headroom above that label position to clear
// whichever badge is taller - 32 put the max-value bar's label directly
// under both (remediation doc 12C.3).
const PADDING = 60
// The index axis hangs off the bars' own baseline rather than off the
// bottom edge of the svg. Pinned to the edge it had nothing between it
// and the end of the box, and the pulsing highlight on a target bar
// scales its group just enough to push the digit out of view.
const INDEX_LABEL_DROP = 40
// The band the header occupies used to be this constant, guessed at the
// height of one headline and one line of detail. A detail that wrapped to
// two lines - the circular queue's does - ran straight back over the
// drawing. It is measured from the header itself now, so the two cannot
// disagree; this is only the floor for the first paint.
const OPERATION_LABEL_SPACE = 34

type BarState = 'neutral' | 'comparing' | 'swapping' | 'sorted' | 'eliminated'

// neutral used to be a pale lavender (#c7c9e8) at 40% opacity, following
// the "inactive elements: 40% opacity" convention - but no opacity over a
// white canvas can reach WCAG's 3:1 non-text contrast minimum once the
// base colour is light to begin with (even solid black at 40% opacity
// only reaches ~1.6:1). Neutral bars are now fully opaque with a darker
// tone instead (--state-neutral, 3.1:1 on white), staying visually de-emphasised next to the saturated
// comparing/swapping/sorted colours through hue and saturation rather
// than transparency (see remediation doc 9.9).
const NEUTRAL_FILL = 'var(--state-neutral)'
const BAR_COLOURS: Record<BarState, { fill: string; opacity: number; glow?: string }> = {
  neutral: { fill: NEUTRAL_FILL, opacity: 1.0 },
  comparing: { fill: 'var(--state-compare)', opacity: 1.0, glow: 'color-mix(in srgb, var(--state-compare) 30%, transparent)' },
  swapping: { fill: 'var(--state-swap)', opacity: 1.0, glow: 'color-mix(in srgb, var(--state-swap) 30%, transparent)' },
  sorted: { fill: 'var(--state-sorted)', opacity: 1.0 },
  // Search only: out of the remaining range. The inactive 40% rule.
  eliminated: { fill: NEUTRAL_FILL, opacity: 0.4 },
}

// The four colours (neutral/comparing/swapping/sorted) are reused across
// every algorithm that renders through ArrayCanvas, but what each colour
// actually MEANS differs by algorithm - sorting calls a highlighted bar
// "Sorted", sliding window calls the same green "Window". Same colour
// slots, different words, keyed by algorithm/canvasType context.
const DEFAULT_LEGEND: Partial<Record<BarState, string>> = {
  neutral: 'Neutral',
  comparing: 'Comparing',
  swapping: 'Swapping',
  sorted: 'Sorted',
}
const SLIDING_WINDOW_LEGEND: Partial<Record<BarState, string>> = {
  neutral: 'Window',
  comparing: 'Current',
  swapping: 'Max window',
  sorted: 'Outside',
}
const JUMP_SEARCH_LEGEND: Partial<Record<BarState, string>> = {
  neutral: 'Jump position',
  comparing: 'Backtrack range',
  swapping: 'Found',
  sorted: 'Unvisited',
}
// Array access, insert and delete never compare, swap or sort anything,
// so the sorting slots above described operations the algorithm does not
// perform. These name what the states actually mean here.
const ARRAY_OPERATION_LEGEND: Partial<Record<BarState, string>> = {
  neutral: 'Untouched',
  comparing: 'Target',
  swapping: 'Moving',
  sorted: 'Settled',
}
const ARRAY_OPERATION_SLUGS = new Set(['array-access', 'array-insert', 'array-delete'])

// Search states come from the search's own state (the midpoint compared,
// the eliminated range, the found index), not the sorting slots - the old
// mapping labelled the compared midpoint "Eliminated" and the found element
// "Unvisited", and never drew the eliminated range at all.
const SEARCH_LEGEND: Partial<Record<BarState, string>> = {
  comparing: 'Current',
  eliminated: 'Eliminated',
  sorted: 'Found',
  neutral: 'Unvisited',
}
const SEARCH_ALGORITHM_SLUGS = new Set([
  'linear-search',
  'binary-search',
  'interpolation-search',
  'exponential-search',
])

function legendForContext(canvasType: CanvasType, algorithmSlug: string | undefined): Partial<Record<BarState, string>> {
  if (canvasType === CanvasType.SLIDING_WINDOW) return SLIDING_WINDOW_LEGEND
  if (algorithmSlug && ARRAY_OPERATION_SLUGS.has(algorithmSlug)) return ARRAY_OPERATION_LEGEND
  if (algorithmSlug === 'jump-search') return JUMP_SEARCH_LEGEND
  if (algorithmSlug && SEARCH_ALGORITHM_SLUGS.has(algorithmSlug)) return SEARCH_LEGEND
  return DEFAULT_LEGEND
}

const MISTAKE_WASH_COLOR = 'color-mix(in srgb, var(--state-error) 12%, transparent)'
// 0.5x speed of the nominal 800ms step interval used elsewhere.
const MISTAKE_STEP_INTERVAL_MS = 1600
const MISTAKE_PAUSE_MS = 1000


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
  // A worked step (Week 2 2A) is a junction candidate the learner watches:
  // no drag target, and its narration may be read aloud.
  const isLiveJunction = useAlgorithmStore(selectIsLiveJunction)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const legend = legendForContext(canvasType, algorithmSlug)
  const isSearch = !!algorithmSlug && SEARCH_ALGORITHM_SLUGS.has(algorithmSlug)
  const totalSteps = useAlgorithmStore((state) => state.snapshotArray.length)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const resolveColour = useResolveColour()
  // Bars spring when a value changes, not when the canvas itself resizes
  // (the prediction panel opening, a panel drag): there the whole layout
  // shifts at once, and springing only the bars left them visibly out of
  // step with their labels for a moment.
  const lastSize = useRef({ width, height })
  const canvasResized = lastSize.current.width !== width || lastSize.current.height !== height
  useEffect(() => {
    lastSize.current = { width, height }
  }, [width, height])
  const barMove = canvasMove(prefersReducedMotion || canvasResized)

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
  const eliminatedIndices = new Set<number>(
    isSearch ? ((snapshot?.dataStructureState as { eliminated?: number[] } | undefined)?.eliminated ?? []) : [],
  )
  const mistakeAffectedIndices = isMistakeMode
    ? new Set([
        ...mistakePath![mistakeStepIndex].activeIndices,
        ...mistakePath![mistakeStepIndex].comparedIndices,
        ...mistakePath![mistakeStepIndex].swappedIndices,
      ])
    : null

  // Hands-On mode: direct-manipulation drag replaces the click-to-select
  // flow, but only at junctions getHandsOnDragTarget recognises (every
  // sorting algorithm's per-element comparison). Conceptual junctions
  // (PASS_COMPLETE, EARLY_TERMINATION, ALGORITHM_COMPLETE) fall back to the
  // TILE_GRID input rendered by PredictionZone, same as Practice mode.
  const handsOnDragTarget =
    !isMistakeMode && mode === AlgorithmMode.HANDS_ON && isLiveJunction ? getHandsOnDragTarget(snapshot ?? null) : null
  const isHandsOnSwapStep = handsOnDragTarget !== null
  // handsOnLeft/handsOnRight are the same two indices in screen (index)
  // order, used only for the dashed drop-zone box and drag distance - the
  // dragTarget's own A/B order (not necessarily left-to-right on screen)
  // is what determines which answer a given drag direction produces.
  let handsOnLeft = -1
  let handsOnRight = -1
  if (handsOnDragTarget !== null) {
    if (handsOnDragTarget.indexA <= handsOnDragTarget.indexB) {
      handsOnLeft = handsOnDragTarget.indexA
      handsOnRight = handsOnDragTarget.indexB
    } else {
      handsOnLeft = handsOnDragTarget.indexB
      handsOnRight = handsOnDragTarget.indexA
    }
  }

  const [handsOnSwapped, setHandsOnSwapped] = useState(false)
  // Which bar index the learner picked, for the 'pick-one' interaction
  // (Merge Sort) - unlike handsOnSwapped's true/false, either index is a
  // valid pick, so this needs to remember which one.
  const [handsOnPicked, setHandsOnPicked] = useState<number | null>(null)
  const [handsOnLocked, setHandsOnLocked] = useState(false)
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
    setHandsOnPicked(null)
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
      setHandsOnPicked(null)
      setHandsOnLocked(false)
      dragXLeft.set(0)
      dragXRight.set(0)
    }
    window.addEventListener(CLEAR_CANVAS_SELECTION_EVENT, handleClear)
    return () => window.removeEventListener(CLEAR_CANVAS_SELECTION_EVENT, handleClear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // What the run is doing, in words. Without it an inserted value simply
  // appeared among the bars with nothing saying it was being inserted.
  const operationLabel = useMemo(() => operationLabelFor(snapshot?.dataStructureState), [snapshot])

  // ...and how much room it actually takes, read off the header rather
  // than assumed, so a longer label pushes the chart down instead of
  // being drawn over.
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(OPERATION_LABEL_SPACE)
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setHeaderHeight(el.getBoundingClientRect().height))
    observer.observe(el)
    setHeaderHeight(el.getBoundingClientRect().height)
    return () => observer.disconnect()
  }, [])

  /** Everything drawn at the top of the svg clears the header by this. */
  const labelOffset = operationLabel ? Math.max(headerHeight - 18, OPERATION_LABEL_SPACE) : 0

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
      // The chart starts lower when the operation banner is above it: the
      // tallest bar's value label would otherwise be drawn straight
      // through the banner's second line.
      .range([height - PADDING, PADDING + labelOffset])

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
  }, [snapshot, width, height, labelOffset])

  const twoPointer = useMemo(
    () => (canvasType === CanvasType.TWO_POINTER ? extractTwoPointer(snapshot?.dataStructureState) : { left: null, right: null }),
    [canvasType, snapshot],
  )
  // Colour alone was carrying the whole story on these: a binary search
  // step recoloured some bars and left the student to infer that the range
  // had halved, and a shift was only visible as the numbers being somewhere
  // else in the next frame. See utils/arrayOverlays.ts.
  const valueCount = useMemo(() => extractDisplayValues(snapshot?.dataStructureState).length, [snapshot])
  const searchRange = useMemo(
    () => (isSearch || algorithmSlug === 'jump-search' ? extractSearchRange(snapshot?.dataStructureState, valueCount) : null),
    [isSearch, algorithmSlug, snapshot, valueCount],
  )
  const memoryView = useMemo(
    () => extractMemoryView(snapshot?.dataStructureState, valueCount),
    [snapshot, valueCount],
  )
  const shiftView = useMemo(
    () => extractShiftView(snapshot?.dataStructureState, valueCount),
    [snapshot, valueCount],
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

  // Any drag past this many pixels counts as a deliberate pick for the
  // 'pick-one' interaction (Merge Sort) - small enough to register a real
  // drag, large enough that a stray click-without-moving doesn't submit.
  const PICK_ONE_THRESHOLD_PX = 12

  function handleHandsOnDragEnd(barIndex: number, offsetX: number) {
    setDraggingBarIndex(null)
    // Zero the raw drag transform immediately so it doesn't linger as an
    // extra offset once `displayX` (below) moves the bar to its new slot.
    dragXLeft.set(0)
    dragXRight.set(0)
    if (!handsOnDragTarget || handsOnLocked) return

    if (handsOnDragTarget.kind === 'pick-one') {
      if (Math.abs(offsetX) < PICK_ONE_THRESHOLD_PX) return
      const answer = barIndex === handsOnDragTarget.indexA ? handsOnDragTarget.answerA : handsOnDragTarget.answerB
      setHandsOnPicked(barIndex)
      setHandsOnLocked(true)
      window.dispatchEvent(new CustomEvent(HANDS_ON_ANSWER_EVENT, { detail: answer }))
      return
    }

    if (slotDistance === 0) return
    // Any drag-end at all used to commit an answer and lock the junction,
    // so brushing a bar silently answered "leave them" on the learner's
    // behalf. A deliberate movement is required now; "leave them" has its
    // own control in the prediction zone.
    if (Math.abs(offsetX) < PICK_ONE_THRESHOLD_PX) return
    const { indexA, indexB, answerA, answerB } = handsOnDragTarget
    // "Crossed" means indexA's bar ended up on the opposite side of
    // indexB's original position from where it started - purely a
    // geometric fact, computed from actual screen positions rather than
    // assumed, since which of A/B starts left vs right differs per
    // algorithm (see getHandsOnDragTarget's per-case comments).
    const aStartsLeftOfB = bars[indexA].x < bars[indexB].x
    const threshold = Math.abs(slotDistance) / 2
    const draggedA = barIndex === indexA
    const crossed = aStartsLeftOfB
      ? draggedA
        ? offsetX > threshold
        : offsetX < -threshold
      : draggedA
        ? offsetX < -threshold
        : offsetX > threshold
    setHandsOnSwapped(crossed)
    setHandsOnLocked(true)
    window.dispatchEvent(new CustomEvent(HANDS_ON_ANSWER_EVENT, { detail: crossed ? answerA : answerB }))
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

  // Never read the outcome-revealing description while a prediction is
  // pending - a screen reader user must not hear the answer to the
  // question the prediction zone is asking.
  const canvasNarration = snapshot.isPredictionRequired && isLiveJunction
    ? getPromptForSnapshot(snapshot, algorithmName)
    : snapshot.description
  const canvasLabel = `${algorithmName}, step ${snapshot.stepIndex + 1} of ${totalSteps}: ${canvasNarration}`

  const progressColorClass =
    progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  return (
    <>
    <div ref={headerRef} className="absolute top-2 right-3 left-3 z-10 flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
        <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
          <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="tabular-nums text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
          {progressPercent}%
        </span>
      </div>
      <div className="flex items-center gap-3">
        {(Object.entries(legend) as [BarState, string][]).map(([state, label]) => (
          <div key={state} className="flex items-center gap-1">
            <span
              className="size-2 rounded-sm"
              style={{ backgroundColor: BAR_COLOURS[state].fill, opacity: BAR_COLOURS[state].opacity }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
    {/* In the header's own column, so it cannot land on the progress row
        above it or on the tallest bar's value label below - the chart
        makes room for it, see OPERATION_LABEL_SPACE. */}
    <OperationBanner label={operationLabel} />
    </div>
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
          stroke="var(--state-compare)"
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
              : eliminatedIndices.has(bar.index)
                ? 'eliminated'
                : 'neutral'
        const colours = BAR_COLOURS[barState]

        const barDragX = bar.index === handsOnLeft ? dragXLeft : bar.index === handsOnRight ? dragXRight : undefined

        // Merge Sort's 'pick-one' interaction: once a bar is picked, the
        // one NOT picked fades to signal it wasn't chosen - there's no
        // "swap" animation to show since picking doesn't move anything.
        const isUnpickedPeer =
          handsOnDragTarget?.kind === 'pick-one' &&
          handsOnPicked !== null &&
          bar.index !== handsOnPicked &&
          (bar.index === handsOnDragTarget.indexA || bar.index === handsOnDragTarget.indexB)
        const displayOpacity = isUnpickedPeer ? 0.35 : colours.opacity

        return (
          <motion.g
            key={bar.index}
            layout
            transition={barMove}
            style={isDraggableBar ? { x: barDragX } : undefined}
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
                    setDraggingBarIndex(bar.index)
                  },
                  onDragEnd: (_event: unknown, info: PanInfo) => handleHandsOnDragEnd(bar.index, info.offset.x),
                }
              : {})}
          >
            {colours.glow && (
              <motion.rect
                x={displayX - 2}
                initial={false}
                animate={{ attrY: bar.y, height: bar.height }}
                transition={barMove}
                width={bar.width + 4}
                rx={8}
                fill="none"
                stroke={colours.glow}
                strokeWidth={2}
                opacity={0.5}
              />
            )}
            {/* Opacity lives on the bar body only (the CLAUDE.md "inactive
                elements: 40% opacity" rule), not the whole group - the
                value/index labels below stay fully legible regardless of
                whether this bar is the active one this step. */}
            {/* Height and top spring to the new value (4B.1), so a swap
                visibly settles instead of jumping. attrY, not y: on SVG,
                Framer Motion's y is a CSS translate, not the attribute. */}
            <motion.rect
              x={displayX}
              initial={false}
              // fill is animated with the geometry: on a motion.rect a
              // changing style fill is not re-applied, which left every bar
              // stuck on its first colour.
              animate={{ attrY: bar.y, height: bar.height, fill: resolveColour(colours.fill) }}
              transition={{ attrY: barMove, height: barMove, fill: { duration: prefersReducedMotion ? 0 : 0.2 } }}
              width={bar.width}
              rx={4}
              opacity={displayOpacity}
              className="bar-group"
            />
            {isMistakeAffected && (
              <rect
                x={displayX}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={4}
                fill="none"
                stroke="var(--state-error)"
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
            {/* On or just above the bar, horizontal, at readable size and
                AA contrast - clamped so a tall (max-value) bar's label
                never clips past the canvas's own top edge. */}
            <motion.text
              x={displayX + bar.width / 2}
              initial={false}
              animate={{ attrY: Math.max(bar.y - 10, 16) }}
              transition={barMove}
              textAnchor="middle"
              className="fill-text-primary text-[13px] font-semibold dark:fill-dark-text-primary"
              style={{ pointerEvents: 'none' }}
            >
              {bar.value}
            </motion.text>
            <text
              x={displayX + bar.width / 2}
              y={height - PADDING + INDEX_LABEL_DROP}
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
                <polygon points="0,-8 -7,4 7,4" fill="var(--state-swap)" />
                <text y={16} textAnchor="middle" className="fill-active text-[11px] font-bold">
                  L=R
                </text>
              </g>
            ) : (
              <>
                <g transform={`translate(${bars[twoPointer.left].x + bars[twoPointer.left].width / 2}, ${height - 6})`}>
                  <polygon points="0,-8 -7,4 7,4" fill="var(--state-sorted)" />
                  <text y={16} textAnchor="middle" className="fill-success text-[11px] font-bold">
                    L
                  </text>
                </g>
                <g transform={`translate(${bars[twoPointer.right].x + bars[twoPointer.right].width / 2}, ${height - 6})`}>
                  <polygon points="0,-8 -7,4 7,4" fill="var(--state-error)" />
                  <text y={16} textAnchor="middle" className="fill-error text-[11px] font-bold">
                    R
                  </text>
                </g>
              </>
            )}
          </>
        )}

      {/* The part of the array still in play. The band shrinking by half
          is what binary search does; recolouring alone left that to be
          inferred. Drawn behind nothing: it sits over the bars at low
          opacity so the values stay readable through it. */}
      {searchRange && bars[searchRange.low] && bars[searchRange.high] && (
        <>
          <motion.rect
            layout
            x={bars[searchRange.low].x - 4}
            y={PADDING - 10}
            width={bars[searchRange.high].x + bars[searchRange.high].width - bars[searchRange.low].x + 8}
            height={height - PADDING * 2 + 20}
            rx={6}
            // Outline only. A fill over the live range washes the whole
            // canvas on the first step, where the range is still the
            // whole array, and the shrinking is the signal anyway.
            fill="none"
            stroke="var(--state-current)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            transition={barMove}
            pointerEvents="none"
          />
          <motion.text
            layout
            x={bars[searchRange.low].x - 4}
            y={PADDING - 16 + labelOffset}
            className="fill-text-muted text-[10px] dark:fill-dark-text-secondary"
            transition={barMove}
          >
            {`still in play: ${searchRange.high - searchRange.low + 1} of ${valueCount}`}
          </motion.text>
        </>
      )}

      {/* Array access looks exactly like a linear search on a bar chart,
          so the one thing that makes it constant time is invisible. The
          address arithmetic is the content. Base and cell size match the
          Theory tab's schematic for this topic. */}
      {memoryView && bars[memoryView.index] && (
        <g pointerEvents="none">
          <motion.rect
            layout
            x={bars[memoryView.index].x}
            y={height - PADDING + 6}
            width={bars[memoryView.index].width}
            height={18}
            rx={3}
            fill="color-mix(in srgb, var(--state-current) 18%, transparent)"
            transition={barMove}
          />
          <motion.text
            layout
            x={bars[memoryView.index].x + bars[memoryView.index].width / 2}
            y={height - PADDING + 19}
            textAnchor="middle"
            className="fill-text-primary font-mono text-[10px] dark:fill-dark-text-primary"
            transition={barMove}
          >
            {hex(memoryView.address)}
          </motion.text>
          {/* Above the baseline, not below it: the index axis labels live
              down there and the two ran into each other. */}
          <text
            x={PADDING}
            y={PADDING - 16 + labelOffset}
            className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary"
          >
            {`base ${hex(memoryView.base)} + ${memoryView.index} x ${memoryView.cellBytes} = ${hex(memoryView.address)}`}
          </text>
        </g>
      )}

      {/* Which cells move, and which way. The cost of an insert or a
          delete is the shifting, and between two frames that read only as
          the numbers having landed somewhere else. */}
      {shiftView && bars[shiftView.from] && bars[shiftView.to] && (
        <g pointerEvents="none">
          {bars.slice(shiftView.from, shiftView.to + 1).map((bar) => {
            const span = bar.width * 0.5
            const dx = shiftView.direction === 'right' ? span : -span
            const midX = bar.x + bar.width / 2
            const y = height - PADDING + 14
            return (
              <g key={`shift-${bar.index}`}>
                <line
                  x1={midX - dx / 2}
                  y1={y}
                  x2={midX + dx / 2}
                  y2={y}
                  stroke="var(--state-current)"
                  strokeWidth={1.5}
                />
                <polygon
                  points={`${midX + dx / 2},${y} ${midX + dx / 2 - Math.sign(dx) * 5},${y - 3} ${midX + dx / 2 - Math.sign(dx) * 5},${y + 3}`}
                  fill="var(--state-current)"
                />
              </g>
            )
          })}
          <text
            x={PADDING}
            y={PADDING - 16 + labelOffset}
            className="fill-text-muted text-[10px] dark:fill-dark-text-secondary"
          >
            {`${shiftView.to - shiftView.from + 1} ${shiftView.to === shiftView.from ? 'cell shifts' : 'cells shift'} ${shiftView.direction}`}
          </text>
        </g>
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
              fill="color-mix(in srgb, var(--state-current) 15%, transparent)"
              stroke="var(--state-current)"
              strokeWidth={2}
              transition={barMove}
            />
            <motion.text
              layout
              x={
                (bars[windowOverlay.start].x + bars[windowOverlay.end].x + bars[windowOverlay.end].width) / 2
              }
              y={height - 4}
              textAnchor="middle"
              className="fill-active text-[11px] font-semibold"
              transition={barMove}
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
