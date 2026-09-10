import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

export interface QueueState {
  items: Array<{ id: string; value: number | string; index: number }>
  frontIndex: number
  rearIndex: number
  capacity: number
  size: number
  lastOperation: 'enqueue' | 'dequeue' | 'peekFront' | 'peekRear' | null
  lastOperationValue: number | string | null
  isFull: boolean
  isEmpty: boolean
  variant: 'linear' | 'circular' | 'deque'
}

interface QueueCanvasProps {
  width?: number
  height?: number
  /** Overrides state.variant when the route already knows the variant (e.g. the circular-queue page). */
  variant?: 'linear' | 'circular' | 'deque'
}

const CELL_WIDTH = 70
const CELL_HEIGHT = 44
const CELL_GAP = 6

const FRONT_FILL = '#16a34a'
const FRONT_TEXT = '#ffffff'
const REAR_FILL = '#f59e0b'
const REAR_TEXT = '#78350f'
const FILLED_FILL = '#3730a3'
const FILLED_TEXT = '#ffffff'
const GHOST_STROKE = '#cbd5e1'
const EMPTY_STROKE = '#cbd5e1'

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
        // A dequeued-but-never-refilled slot below the front index shows
        // as a ghost box: the wasted space a circular queue exists to fix.
        const isGhost = !item && slot < state.frontIndex

        if (item) {
          const fill = isFront ? FRONT_FILL : isRear ? REAR_FILL : FILLED_FILL
          const textFill = isFront ? FRONT_TEXT : isRear ? REAR_TEXT : FILLED_TEXT
          return (
            <motion.g key={item.id} layout transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}>
              <rect x={x} y={y} width={CELL_WIDTH} height={CELL_HEIGHT} rx={4} style={{ fill }} />
              <text x={x + CELL_WIDTH / 2} y={y + CELL_HEIGHT / 2} textAnchor="middle" dominantBaseline="central" style={{ fill: textFill, fontSize: 14, fontWeight: 600 }}>
                {item.value}
              </text>
            </motion.g>
          )
        }

        return (
          <rect
            key={`slot-${slot}`}
            x={x}
            y={y}
            width={CELL_WIDTH}
            height={CELL_HEIGHT}
            rx={4}
            fill="none"
            stroke={isGhost ? GHOST_STROKE : EMPTY_STROKE}
            strokeDasharray={isGhost ? '3 3' : '4 4'}
          />
        )
      })}

      {state.frontIndex >= 0 && state.frontIndex < state.capacity && (
        <text
          x={startX + state.frontIndex * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2}
          y={y - 12}
          textAnchor="middle"
          className="fill-success text-[11px] font-semibold"
        >
          {isDeque ? 'front (enqueue/dequeue)' : 'front ← dequeue'}
        </text>
      )}
      {state.rearIndex >= 0 && state.rearIndex < state.capacity && (
        <text
          x={startX + state.rearIndex * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2}
          y={y + CELL_HEIGHT + 20}
          textAnchor="middle"
          className="fill-secondary text-[11px] font-semibold"
        >
          {isDeque ? 'rear (enqueue/dequeue)' : 'enqueue → rear'}
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
  const radius = Math.min(width, height) / 2 - 60
  const cellSize = 56

  const cellPos = (slot: number) => {
    const angle = (slot / state.capacity) * 2 * Math.PI - Math.PI / 2
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), angle }
  }

  return (
    <svg width={width} height={height} role="img" aria-label={`Circular queue, size ${state.size} of ${state.capacity}`}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e2e8f0" strokeDasharray="2 4" />

      {Array.from({ length: state.capacity }, (_, slot) => {
        const { x, y } = cellPos(slot)
        const item = state.items.find((it) => it.index === slot)
        const fill = item ? FILLED_FILL : 'transparent'
        return (
          <motion.g
            key={`cell-${slot}`}
            layout
            style={{ x: x - cellSize / 2, y: y - cellSize / 2 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeInOut' }}
          >
            <rect
              width={cellSize}
              height={cellSize * 0.6}
              rx={4}
              y={cellSize * 0.2}
              style={{ fill }}
              stroke={item ? 'none' : EMPTY_STROKE}
              strokeDasharray={item ? undefined : '3 3'}
            />
            <text x={cellSize / 2} y={cellSize / 2} textAnchor="middle" dominantBaseline="central" style={{ fill: item ? '#ffffff' : '#94a3b8', fontSize: 13, fontWeight: 600 }}>
              {item ? item.value : slot}
            </text>
          </motion.g>
        )
      })}

      {state.frontIndex >= 0 &&
        (() => {
          const { x, y } = cellPos(state.frontIndex)
          return (
            <motion.g layout transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}>
              <polygon
                points="0,-8 -7,6 7,6"
                fill={FRONT_FILL}
                transform={`translate(${x},${y - 36}) rotate(180)`}
              />
              <text x={x} y={y - 44} textAnchor="middle" className="fill-success text-[10px] font-semibold">
                front
              </text>
            </motion.g>
          )
        })()}

      {state.rearIndex >= 0 &&
        (() => {
          const { x, y } = cellPos(state.rearIndex)
          return (
            <motion.g layout transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: 'easeInOut' }}>
              <polygon points="0,-8 -7,6 7,6" fill={REAR_FILL} transform={`translate(${x},${y + 44})`} />
              <text x={x} y={y + 60} textAnchor="middle" className="fill-secondary text-[10px] font-semibold">
                rear
              </text>
            </motion.g>
          )
        })()}
    </svg>
  )
}

export default function QueueCanvas({ width = 600, height = 320, variant }: QueueCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const masteryPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as QueueState | undefined

  const masteryColorClass = masteryPercent >= 80 ? 'bg-success' : masteryPercent >= 50 ? 'bg-secondary' : 'bg-primary'

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
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center gap-2">
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Mastery</span>
        <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
          <div className={cn('h-full rounded-full', masteryColorClass)} style={{ width: `${masteryPercent}%` }} />
        </div>
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
          {masteryPercent}%
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto pt-10">
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
          Queue is full — cannot enqueue
        </div>
      )}
      {state.isEmpty && (
        <div className="mx-3 mb-2 rounded-md border-l-4 border-error bg-error-light px-3 py-2 text-[12px] text-error">
          Queue is empty — cannot dequeue
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
