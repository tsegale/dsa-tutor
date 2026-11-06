import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CriticalJunctionType } from '@dsa-tutor/types'
import {
  useAlgorithmStore,
  selectCurrentSnapshot,
  selectIsUnansweredJunction,
  selectProgressPercent,
} from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { CANVAS_SPRING } from '@/utils/motion'
import { cn } from '@/lib/utils'
import type { CallStackState } from '@/engine/recursionFactorial'

interface CallStackCanvasProps {
  width?: number
  height?: number
}

const FRAME_HEIGHT = 48
const FRAME_GAP = 6
const FRAME_WIDTH = 320
const TOP_HEADROOM = 56
const BOTTOM_FLOOR_MARGIN = 36

export default function CallStackCanvas({ width = 500, height = 400 }: CallStackCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const unansweredJunction = useAlgorithmStore(selectIsUnansweredJunction)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as CallStackState | undefined
  const scrollRef = useRef<HTMLDivElement>(null)

  const progressColorClass =
    progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  // Original call sits on the floor (baseY); deeper recursive calls stack
  // upward toward y = TOP_HEADROOM. Scroll so the active top-of-stack frame
  // stays cleanly in view without clipping.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !state || state.frames.length === 0) return
    const totalStackPx = state.frames.length * (FRAME_HEIGHT + FRAME_GAP)
    const svgH = Math.max(height, totalStackPx + TOP_HEADROOM + BOTTOM_FLOOR_MARGIN)
    const topFrameY = svgH - BOTTOM_FLOOR_MARGIN - totalStackPx
    el.scrollTop = Math.max(0, topFrameY - 32)
  }, [state?.frames.length, height, state])

  if (!state || state.frames.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-text-muted dark:text-dark-text-secondary">Load an algorithm to begin</span>
        </div>
      </div>
    )
  }

  const baseCasesReached = state.frames.filter(
    (frame) => frame.argument === state.baseCase && frame.status === 'returned',
  ).length
  const centerX = width / 2
  const totalHeight = state.frames.length * (FRAME_HEIGHT + FRAME_GAP)
  const svgHeight = Math.max(height, totalHeight + TOP_HEADROOM + BOTTOM_FLOOR_MARGIN)
  const baseY = svgHeight - BOTTOM_FLOOR_MARGIN
  const hideActiveReturn =
    unansweredJunction && snapshot?.criticalJunctionType === CriticalJunctionType.RETURN_VALUE

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-1.5 dark:border-dark-border">
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
        <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
          <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
          Base cases reached: {baseCasesReached}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto">
        <svg width={width} height={svgHeight} role="img" aria-label={`Call stack, step ${(snapshot?.stepIndex ?? 0) + 1}`}>
          <line
            x1={centerX - FRAME_WIDTH / 2 - 10}
            y1={baseY}
            x2={centerX + FRAME_WIDTH / 2 + 10}
            y2={baseY}
            stroke="var(--ink)"
            strokeWidth={3}
          />

          <AnimatePresence>
            {state.frames.map((frame, i) => {
              // i = 0 is the root call resting on baseY; higher i stacks upward.
              const y = baseY - (i + 1) * (FRAME_HEIGHT + FRAME_GAP)
              const isBaseCase = frame.argument === state.baseCase
              const fill =
                frame.status === 'returned'
                  ? 'color-mix(in srgb, var(--state-sorted) 20%, transparent)'
                  : frame.status === 'waiting'
                    ? 'color-mix(in srgb, var(--state-current) 30%, transparent)'
                    : 'var(--surface)'
              const stroke = isBaseCase
                ? 'var(--state-compare)'
                : frame.status === 'active'
                  ? 'var(--state-current)'
                  : 'var(--rule-strong)'
              const textFill = frame.status === 'waiting' ? 'var(--ink-2)' : 'var(--ink)'
              const shownReturn =
                hideActiveReturn && frame.status !== 'returned' ? null : frame.returnValue

              return (
                <motion.g
                  key={frame.id}
                  layout
                  initial={{ y: y - 40, opacity: 0 }}
                  animate={{ y, opacity: 1 }}
                  exit={{ y: y - 24, opacity: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : CANVAS_SPRING}
                >
                  <rect
                    x={centerX - FRAME_WIDTH / 2}
                    y={0}
                    width={FRAME_WIDTH}
                    height={FRAME_HEIGHT}
                    rx={6}
                    style={{ fill }}
                    stroke={stroke}
                    strokeWidth={frame.status === 'active' || isBaseCase ? 2 : 1}
                  />
                  <text
                    x={centerX - FRAME_WIDTH / 2 + 14}
                    y={FRAME_HEIGHT / 2}
                    dominantBaseline="central"
                    className="font-mono"
                    style={{ fill: textFill, fontSize: 13, fontWeight: 500 }}
                  >
                    {frame.functionName}({frame.argument}) = {shownReturn ?? '?'}
                  </text>
                  {frame.status === 'returned' && shownReturn !== null && (
                    <text
                      x={centerX + FRAME_WIDTH / 2 - 14}
                      y={FRAME_HEIGHT / 2}
                      textAnchor="end"
                      dominantBaseline="central"
                      className="fill-success text-[12px] font-semibold"
                    >
                      return {shownReturn}
                    </text>
                  )}
                  {isBaseCase && frame.status !== 'returned' && (
                    <text x={centerX} y={-8} textAnchor="middle" className="fill-secondary text-[10px] font-semibold">
                      Base case reached
                    </text>
                  )}
                </motion.g>
              )
            })}
          </AnimatePresence>
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          Frames on stack: {state.frames.filter((f) => f.status !== 'returned').length}
        </p>
      </div>
    </div>
  )
}
