import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { canvasMove } from '@/utils/motion'
import { cn } from '@/lib/utils'
import OperationBanner from './OperationBanner'
import { operationLabelFor } from '@/utils/operationLabel'
import { useElementHeight } from '@/hooks/useElementHeight'
import type { QueueState } from '@/engine/queue'

interface QueueCanvasProps {
  width?: number
  height?: number
  /** Overrides state.variant when the route already knows the variant (e.g. the circular-queue page). */
  variant?: 'linear' | 'circular' | 'deque'
}

const CELL_WIDTH = 70
const CELL_HEIGHT = 44
const CELL_GAP = 6

const FRONT_FILL = 'var(--state-sorted)'
const FRONT_TEXT = 'var(--state-sorted-ink)'
const REAR_FILL = 'var(--state-compare)'
const REAR_TEXT = 'var(--state-compare-ink)'
const FILLED_FILL = 'var(--state-current)'
const FILLED_TEXT = 'var(--state-current-ink)'
const GHOST_STROKE = 'var(--rule-strong)'
const EMPTY_STROKE = 'var(--rule-strong)'

function LinearQueue({
  state,
  width,
  height,
  isDeque,
  prefersReducedMotion,
}: {
  state: QueueState
  width: number
  height: number
  isDeque: boolean
  prefersReducedMotion: boolean
}) {
  const totalWidth = state.capacity * (CELL_WIDTH + CELL_GAP)
  const startX = Math.max(20, (width - totalWidth) / 2)
  const y = height / 2 - CELL_HEIGHT / 2

  return (
    <svg width={width} height={height} role="img" aria-label={`Queue, size ${state.size} of ${state.capacity}`}>
      {Array.from({ length: state.capacity }, (_, slot) => {
        const x = startX + slot * (CELL_WIDTH + CELL_GAP)
        const item = state.items.find((it) => it.index === slot)
        const isFront = slot === state.frontIndex && item
        const isRear = slot === state.rearIndex && item
        const isGhost = !item && slot < state.frontIndex

        if (item) {
          const fill = isFront ? FRONT_FILL : isRear ? REAR_FILL : FILLED_FILL
          const textFill = isFront ? FRONT_TEXT : isRear ? REAR_TEXT : FILLED_TEXT
          return (
            <motion.g key={item.id} layout transition={canvasMove(prefersReducedMotion)}>
              <rect x={x} y={y} width={CELL_WIDTH} height={CELL_HEIGHT} rx={4} style={{ fill }} />
              <text
                x={x + CELL_WIDTH / 2}
                y={y + CELL_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fill: textFill, fontSize: 14, fontWeight: 600 }}
              >
                {item.value}
              </text>
              <text
                x={x + CELL_WIDTH / 2}
                y={y + CELL_HEIGHT + 11}
                textAnchor="middle"
                className="fill-text-muted font-mono text-[9px] dark:fill-dark-text-secondary"
              >
                [{slot}]
              </text>
            </motion.g>
          )
        }

        return (
          <g key={`slot-${slot}`}>
            <rect
              x={x}
              y={y}
              width={CELL_WIDTH}
              height={CELL_HEIGHT}
              rx={4}
              fill="none"
              stroke={isGhost ? GHOST_STROKE : EMPTY_STROKE}
              strokeDasharray={isGhost ? '3 3' : '4 4'}
            />
            <text
              x={x + CELL_WIDTH / 2}
              y={y + CELL_HEIGHT + 11}
              textAnchor="middle"
              className="fill-text-muted font-mono text-[9px] dark:fill-dark-text-secondary"
            >
              [{slot}]
            </text>
          </g>
        )
      })}

      {state.frontIndex >= 0 && state.frontIndex < state.capacity && (
        <text
          x={startX + state.frontIndex * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2}
          y={y - 12}
          textAnchor="middle"
          className="fill-success text-[11px] font-semibold"
        >
          {isDeque ? 'front (enqueue/dequeue)' : 'front <- dequeue'}
        </text>
      )}
      {state.rearIndex >= 0 && state.rearIndex < state.capacity && (
        <text
          x={startX + state.rearIndex * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2}
          y={y + CELL_HEIGHT + 25}
          textAnchor="middle"
          className="fill-secondary text-[11px] font-semibold"
        >
          {isDeque ? 'rear (enqueue/dequeue)' : 'enqueue -> rear'}
        </text>
      )}
    </svg>
  )
}

function CircularQueue({
  state,
  width,
  height,
  prefersReducedMotion,
}: {
  state: QueueState
  width: number
  height: number
  prefersReducedMotion: boolean
}) {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.max(68, Math.min(width, height) / 2 - 64)
  const cellSize = 54
  const sameSlot = state.frontIndex >= 0 && state.frontIndex === state.rearIndex

  const cellPos = (slot: number) => {
    const angle = (slot / state.capacity) * 2 * Math.PI - Math.PI / 2
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), angle }
  }

  const lastPos = cellPos(Math.max(0, state.capacity - 1))
  const firstPos = cellPos(0)
  const wrapMidAngle = ((state.capacity - 0.5) / Math.max(1, state.capacity)) * 2 * Math.PI - Math.PI / 2
  const wrapCtrlX = cx + (radius + 34) * Math.cos(wrapMidAngle)
  const wrapCtrlY = cy + (radius + 34) * Math.sin(wrapMidAngle)

  return (
    <svg width={width} height={height} role="img" aria-label={`Circular queue, size ${state.size} of ${state.capacity}`}>
      <defs>
        <marker id="cq-wrap-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--state-compare)" />
        </marker>
      </defs>

      {/* Annular ring track */}
      <circle cx={cx} cy={cy} r={radius + 20} fill="none" stroke="var(--rule)" strokeOpacity={0.55} />
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--rule-strong)" strokeDasharray="3 4" />
      <circle cx={cx} cy={cy} r={Math.max(24, radius - 22)} fill="none" stroke="var(--rule)" strokeOpacity={0.55} />

      {/* Center hub readout */}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-text-primary font-mono text-[12px] font-semibold dark:fill-dark-text-primary">
        {`${state.size} / ${state.capacity}`}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="fill-text-muted text-[9px] dark:fill-dark-text-secondary">
        mod ring
      </text>

      {/* Wrap-around arc from slot (cap - 1) -> slot 0 */}
      {state.capacity > 2 && (
        <path
          d={`M${lastPos.x},${lastPos.y} Q${wrapCtrlX},${wrapCtrlY} ${firstPos.x - 14},${firstPos.y + 4}`}
          fill="none"
          stroke="var(--state-compare)"
          strokeWidth={1.25}
          strokeDasharray="3 3"
          markerEnd="url(#cq-wrap-arrow)"
          opacity={0.75}
        />
      )}

      {Array.from({ length: state.capacity }, (_, slot) => {
        const { x, y, angle } = cellPos(slot)
        const item = state.items.find((it) => it.index === slot)
        const isFront = slot === state.frontIndex && !!item
        const isRear = slot === state.rearIndex && !!item
        const fill = item ? (isFront ? FRONT_FILL : isRear ? REAR_FILL : FILLED_FILL) : 'var(--surface)'
        const textFill = item ? (isFront ? FRONT_TEXT : isRear ? REAR_TEXT : FILLED_TEXT) : 'var(--ink-3)'
        const idxRadius = radius - 30
        const ix = cx + idxRadius * Math.cos(angle)
        const iy = cy + idxRadius * Math.sin(angle)
        return (
          <g key={`cell-${slot}`}>
            <text
              x={ix}
              y={iy}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-text-muted font-mono text-[9px] dark:fill-dark-text-secondary"
            >
              [{slot}]
            </text>
            <motion.g
              layout
              style={{ x: x - cellSize / 2, y: y - cellSize / 2 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeInOut' }}
            >
              <rect
                width={cellSize}
                height={cellSize * 0.62}
                rx={6}
                y={cellSize * 0.19}
                style={{ fill }}
                stroke={item ? 'none' : EMPTY_STROKE}
                strokeDasharray={item ? undefined : '3 3'}
              />
              <text
                x={cellSize / 2}
                y={cellSize / 2}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fill: textFill, fontSize: 13, fontWeight: 600 }}
              >
                {item ? item.value : '·'}
              </text>
            </motion.g>
          </g>
        )
      })}

      {state.frontIndex >= 0 &&
        (() => {
          const { angle } = cellPos(state.frontIndex)
          const badgeR = radius + 38
          const bx = cx + badgeR * Math.cos(angle)
          const by = cy + badgeR * Math.sin(angle)
          const label = sameSlot ? 'F·R' : 'FRONT'
          return (
            <motion.g layout transition={canvasMove(prefersReducedMotion)}>
              <rect x={bx - 21} y={by - 8} width={42} height={16} rx={8} fill={FRONT_FILL} />
              <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" style={{ fill: FRONT_TEXT, fontSize: 9, fontWeight: 700 }}>
                {label}
              </text>
            </motion.g>
          )
        })()}

      {state.rearIndex >= 0 &&
        !sameSlot &&
        (() => {
          const { angle } = cellPos(state.rearIndex)
          const badgeR = radius + 38
          const bx = cx + badgeR * Math.cos(angle)
          const by = cy + badgeR * Math.sin(angle)
          return (
            <motion.g layout transition={canvasMove(prefersReducedMotion)}>
              <rect x={bx - 19} y={by - 8} width={38} height={16} rx={8} fill={REAR_FILL} />
              <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" style={{ fill: REAR_TEXT, fontSize: 9, fontWeight: 700 }}>
                REAR
              </text>
            </motion.g>
          )
        })()}
    </svg>
  )
}

export default function QueueCanvas({ width = 600, height: boxHeight = 320, variant }: QueueCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as QueueState | undefined
  const operationLabel = operationLabelFor(snapshot?.dataStructureState)
  const headerRef = useRef<HTMLDivElement>(null)
  const headerHeight = useElementHeight(headerRef)
  const height = Math.max(boxHeight - headerHeight, 180)

  const progressColorClass = progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  if (!state) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-text-muted dark:text-dark-text-secondary">Load an algorithm to begin</span>
        </div>
      </div>
    )
  }

  const effectiveVariant = variant ?? state.variant
  const frontValue = state.items.find((it) => it.index === state.frontIndex)?.value ?? null
  const rearValue = state.items.find((it) => it.index === state.rearIndex)?.value ?? null

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

      <div className="flex flex-1 items-center justify-center overflow-auto pt-2">
        <AnimatePresence mode="wait">
          {effectiveVariant === 'circular' ? (
            <CircularQueue state={state} width={width} height={height} prefersReducedMotion={prefersReducedMotion} />
          ) : (
            <LinearQueue
              state={state}
              width={width}
              height={height}
              isDeque={effectiveVariant === 'deque'}
              prefersReducedMotion={prefersReducedMotion}
            />
          )}
        </AnimatePresence>
      </div>

      {state.isFull && (
        <div className="mx-3 mb-2 rounded-md border-l-4 border-error bg-error-light px-3 py-2 text-[12px] text-error">
          Queue is full - cannot enqueue
        </div>
      )}
      {state.isEmpty && (
        <div className="mx-3 mb-2 rounded-md border-l-4 border-error bg-error-light px-3 py-2 text-[12px] text-error">
          Queue is empty - cannot dequeue
        </div>
      )}

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          Size: {state.size} / {state.capacity}
        </p>
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          Front: {frontValue !== null ? frontValue : 'empty'} &middot; Rear: {rearValue !== null ? rearValue : 'empty'}
        </p>
      </div>
    </div>
  )
}
