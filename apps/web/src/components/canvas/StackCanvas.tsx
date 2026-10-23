import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { CANVAS_SPRING } from '@/utils/motion'
import { cn } from '@/lib/utils'
import OperationBanner from './OperationBanner'
import { operationLabelFor } from '@/utils/operationLabel'
import { useElementHeight } from '@/hooks/useElementHeight'
import type { StackState } from '@/engine/stack'

interface StackCanvasProps {
  width?: number
  height?: number
}

const ITEM_WIDTH = 160
const ITEM_HEIGHT = 36
const ITEM_GAP = 4
const BASE_Y_OFFSET = 40

const TOP_FILL = 'var(--state-compare)'
const TOP_TEXT = 'var(--state-compare-ink)'
const PLACEHOLDER_STROKE = 'var(--rule-strong)'

function fillForDepth(depthFromTop: number): string {
  const opacity = depthFromTop === 0 ? 0.85 : depthFromTop === 1 ? 0.7 : depthFromTop === 2 ? 0.55 : 0.45
  return `color-mix(in srgb, var(--state-current) ${opacity * 100}%, transparent)`
}

export default function StackCanvas({ width = 400, height: boxHeight = 400 }: StackCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as StackState | undefined
  const operationLabel = operationLabelFor(snapshot?.dataStructureState)
  const headerRef = useRef<HTMLDivElement>(null)
  const headerHeight = useElementHeight(headerRef)
  // The header sits above the drawing and takes real height now, so the
  // drawing gets what is left rather than the whole box - otherwise the
  // bottom of it is cut off by the container, which is what "the
  // visualisations go out of view" was.
  const height = Math.max(boxHeight - headerHeight, 180)
  const scrollRef = useRef<HTMLDivElement>(null)

  const progressColorClass = progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  // the stack grows upward from a floor near the bottom of the svg, which
  // sits below the fold of this overflow-auto wrapper as soon as the svg
  // is taller than the wrapper - keep the floor in view as items change
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state?.items.length])

  if (!state) {
    return (
      <div className="flex h-full flex-col">
        <div className="absolute top-2 right-3 left-3 z-10 flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
          <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-text-muted dark:text-dark-text-secondary">Load an algorithm to begin</span>
        </div>
      </div>
    )
  }

  const centerX = width / 2
  // No prediction-zone offset here. PredictionZone used to be an absolute
  // overlay, so this floor moved up 180px to stay clear of it; it is a
  // real flex sibling now (see AlgorithmPage) and already reserves its own
  // space, so subtracting it again cost the stack 180px of height it had
  // and pushed the top items out of view on a full stack.
  const baseY = height - BASE_Y_OFFSET
  const items = state.items
  const topValue = state.topIndex >= 0 && items[state.topIndex] ? items[state.topIndex].value : null
  const remainingCapacity = state.capacity !== null ? Math.max(0, state.capacity - items.length) : 0

  return (
    <div className="flex h-full flex-col">
      <div ref={headerRef} className="flex shrink-0 flex-col gap-1 px-3 pt-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
          <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="tabular-nums text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
            {progressPercent}%
          </span>
        </div>
        <OperationBanner label={operationLabel} />
      </div>


      <div ref={scrollRef} className="flex-1 overflow-auto pt-2">
        <svg width={width} height={height} role="img" aria-label={`Stack, ${snapshot?.description ?? ''}`}>
          <line x1={centerX - 90} y1={baseY} x2={centerX + 90} y2={baseY} stroke="var(--ink)" strokeWidth={3} />

          {state.capacity !== null &&
            Array.from({ length: remainingCapacity }, (_, i) => {
              const y = baseY - (items.length + i + 1) * (ITEM_HEIGHT + ITEM_GAP)
              return (
                <rect
                  key={`placeholder-${i}`}
                  x={centerX - ITEM_WIDTH / 2}
                  y={y}
                  width={ITEM_WIDTH}
                  height={ITEM_HEIGHT}
                  rx={4}
                  fill="none"
                  stroke={PLACEHOLDER_STROKE}
                  strokeDasharray="4 3"
                />
              )
            })}

          <AnimatePresence>
            {items.map((item, i) => {
              const depthFromTop = items.length - 1 - i
              const isTop = i === state.topIndex
              const y = baseY - (i + 1) * (ITEM_HEIGHT + ITEM_GAP)
              const fill = isTop ? TOP_FILL : fillForDepth(depthFromTop)
              const textFill = isTop ? TOP_TEXT : 'var(--state-current-ink)'

              return (
                <motion.g
                  key={item.id}
                  layout
                  initial={{ y: y - 120, opacity: 0 }}
                  animate={{ y, opacity: 1 }}
                  exit={{ y: y - 60, opacity: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : CANVAS_SPRING
                  }
                >
                  <rect
                    x={centerX - ITEM_WIDTH / 2}
                    y={0}
                    width={ITEM_WIDTH}
                    height={ITEM_HEIGHT}
                    rx={4}
                    style={{ fill }}
                  />
                  <text
                    x={centerX}
                    y={ITEM_HEIGHT / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ fill: textFill, fontSize: 14, fontWeight: 600 }}
                  >
                    {item.value}
                  </text>
                </motion.g>
              )
            })}
          </AnimatePresence>

          {state.topIndex >= 0 && (
            <g>
              <line
                x1={centerX - 120}
                y1={baseY - (state.topIndex + 1) * (ITEM_HEIGHT + ITEM_GAP) + ITEM_HEIGHT / 2}
                x2={centerX - 90}
                y2={baseY - (state.topIndex + 1) * (ITEM_HEIGHT + ITEM_GAP) + ITEM_HEIGHT / 2}
                stroke="var(--state-compare)"
                strokeWidth={2}
                markerEnd="url(#stack-top-arrow)"
              />
              <text
                x={centerX - 125}
                y={baseY - (state.topIndex + 1) * (ITEM_HEIGHT + ITEM_GAP) + ITEM_HEIGHT / 2 + 4}
                textAnchor="end"
                className="fill-secondary text-[11px] font-semibold"
              >
                top
              </text>
            </g>
          )}
          <defs>
            <marker id="stack-top-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--state-compare)" />
            </marker>
          </defs>
        </svg>
      </div>

      {state.isOverflow && (
        <div className="mx-3 mb-2 rounded-md border-l-4 border-error bg-error-light px-3 py-2 text-[12px] text-error">
          Stack overflow — cannot push to a full stack
        </div>
      )}
      {state.isUnderflow && (
        <div className="mx-3 mb-2 rounded-md border-l-4 border-error bg-error-light px-3 py-2 text-[12px] text-error">
          Stack underflow — cannot pop from an empty stack
        </div>
      )}

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          Size: {items.length}
          {state.capacity !== null ? ` / ${state.capacity}` : ''}
        </p>
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          Top: {topValue !== null ? topValue : 'empty'}
        </p>
      </div>
    </div>
  )
}
