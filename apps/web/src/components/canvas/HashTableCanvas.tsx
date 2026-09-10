import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

export interface HashTableState {
  buckets: Array<{
    index: number
    chain: Array<{ id: string; key: number | string; value: number | string }>
  }>
  capacity: number
  size: number
  activeKey: number | string | null
  activeBucket: number | null
  activeProbeSequence: number[]
  collisionOccurred: boolean
  operation: 'insert' | 'search' | 'delete'
  variant: 'chaining' | 'linear_probing' | 'quadratic_probing'
  hashResult: number | null
  /**
   * Open-addressing only: slots that held an entry which was since
   * deleted. Rendered as a distinct "DELETED" tombstone rather than an
   * empty slot, since search must keep probing past these instead of
   * stopping - the key teaching point a plain empty cell would hide.
   */
  deletedIndices?: number[]
}

interface HashTableCanvasProps {
  width?: number
  height?: number
}

const BUCKET_WIDTH = 44
const BUCKET_HEIGHT = 36
const CHAIN_NODE_WIDTH = 56
const CHAIN_NODE_HEIGHT = 32
const ROW_HEIGHT = 46

const ACTIVE_FILL = '#f59e0b'
const ACTIVE_TEXT = '#78350f'
const OCCUPIED_FILL = '#3730a3'
const OCCUPIED_TEXT = '#ffffff'
const EMPTY_TARGET_FILL = '#16a34a'
const EMPTY_TARGET_TEXT = '#ffffff'
const DELETED_FILL = '#fecaca'
const DELETED_TEXT = '#7f1d1d'
const EMPTY_STROKE = '#cbd5e1'

function ChainingCanvas({
  state,
  width,
  prefersReducedMotion,
}: {
  state: HashTableState
  width: number
  prefersReducedMotion: boolean
}) {
  const svgHeight = Math.max(260, state.capacity * ROW_HEIGHT + 40)

  return (
    <svg width={width} height={svgHeight} role="img" aria-label={`Hash table with chaining, ${state.size} entries`}>
      {Array.from({ length: state.capacity }, (_, i) => {
        const bucket = state.buckets.find((b) => b.index === i)
        const y = 20 + i * ROW_HEIGHT
        const isActive = state.activeBucket === i
        return (
          <g key={i}>
            <rect
              x={20}
              y={y}
              width={BUCKET_WIDTH}
              height={BUCKET_HEIGHT}
              rx={4}
              fill={isActive ? ACTIVE_FILL : '#f8fafc'}
              stroke="#e2e8f0"
            />
            <text x={20 + BUCKET_WIDTH / 2} y={y + BUCKET_HEIGHT / 2} textAnchor="middle" dominantBaseline="central" style={{ fill: isActive ? ACTIVE_TEXT : '#0f172a', fontSize: 12, fontWeight: 600 }}>
              {i}
            </text>

            <AnimatePresence>
              {bucket && bucket.chain.length > 0 ? (
                bucket.chain.map((entry, ci) => {
                  const x = 20 + BUCKET_WIDTH + 24 + ci * (CHAIN_NODE_WIDTH + 20)
                  return (
                    <motion.g
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      style={{ x, y }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'backOut' }}
                    >
                      <rect width={CHAIN_NODE_WIDTH} height={CHAIN_NODE_HEIGHT} rx={4} fill={OCCUPIED_FILL} />
                      <text x={CHAIN_NODE_WIDTH / 2} y={CHAIN_NODE_HEIGHT / 2} textAnchor="middle" dominantBaseline="central" style={{ fill: OCCUPIED_TEXT, fontSize: 11, fontWeight: 600 }}>
                        {entry.key}:{entry.value}
                      </text>
                      {ci > 0 && (
                        <line x1={-20} y1={CHAIN_NODE_HEIGHT / 2} x2={0} y2={CHAIN_NODE_HEIGHT / 2} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#hash-chain-arrow)" />
                      )}
                    </motion.g>
                  )
                })
              ) : (
                <text x={20 + BUCKET_WIDTH + 24} y={y + BUCKET_HEIGHT / 2} dominantBaseline="central" className="fill-text-muted text-[11px]">
                  empty
                </text>
              )}
            </AnimatePresence>

            {bucket && bucket.chain.length > 1 && (
              <line x1={20 + BUCKET_WIDTH} y1={y + BUCKET_HEIGHT / 2} x2={20 + BUCKET_WIDTH + 24} y2={y + BUCKET_HEIGHT / 2} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#hash-chain-arrow)" />
            )}
          </g>
        )
      })}
      <defs>
        <marker id="hash-chain-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#94a3b8" />
        </marker>
      </defs>
    </svg>
  )
}

function OpenAddressingCanvas({
  state,
  width,
  prefersReducedMotion,
}: {
  state: HashTableState
  width: number
  prefersReducedMotion: boolean
}) {
  const cellWidth = Math.min(70, (width - 40) / state.capacity)

  return (
    <svg width={width} height={140} role="img" aria-label={`Hash table with ${state.variant.replace('_', ' ')}, ${state.size} entries`}>
      {Array.from({ length: state.capacity }, (_, i) => {
        const x = 20 + i * cellWidth
        const entry = state.buckets.find((b) => b.index === i)?.chain[0]
        const isDeleted = !entry && (state.deletedIndices?.includes(i) ?? false)
        const wasProbed = state.activeProbeSequence.includes(i)
        const isFinalTarget = state.activeBucket === i && !entry
        const fill = entry
          ? OCCUPIED_FILL
          : isDeleted
            ? DELETED_FILL
            : isFinalTarget
              ? EMPTY_TARGET_FILL
              : wasProbed
                ? ACTIVE_FILL
                : 'transparent'
        const textFill = entry
          ? OCCUPIED_TEXT
          : isDeleted
            ? DELETED_TEXT
            : isFinalTarget
              ? EMPTY_TARGET_TEXT
              : wasProbed
                ? ACTIVE_TEXT
                : '#94a3b8'

        return (
          <motion.g key={i} layout transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}>
            <rect x={x} y={40} width={cellWidth - 4} height={44} rx={4} fill={fill} stroke={entry || isFinalTarget || wasProbed || isDeleted ? 'none' : EMPTY_STROKE} strokeDasharray={entry || isFinalTarget || wasProbed || isDeleted ? undefined : '3 3'} />
            <text x={x + (cellWidth - 4) / 2} y={40 + 22} textAnchor="middle" dominantBaseline="central" style={{ fill: textFill, fontSize: isDeleted ? 9 : 12, fontWeight: 600 }}>
              {entry ? `${entry.key}` : isDeleted ? 'DELETED' : ''}
            </text>
            <text x={x + (cellWidth - 4) / 2} y={94} textAnchor="middle" className="fill-text-muted text-[10px] dark:fill-dark-text-secondary">
              {i}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}

export default function HashTableCanvas({ width = 600 }: HashTableCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const masteryPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as HashTableState | undefined

  const masteryColorClass = masteryPercent >= 80 ? 'bg-success' : masteryPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted dark:text-dark-text-secondary">Load an algorithm to begin</span>
      </div>
    )
  }

  const loadFactor = state.capacity > 0 ? state.size / state.capacity : 0

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Mastery</span>
          <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', masteryColorClass)} style={{ width: `${masteryPercent}%` }} />
          </div>
        </div>
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-[10px] font-semibold',
            loadFactor > 0.7 ? 'bg-error-light text-error' : 'bg-surface text-text-muted',
          )}
        >
          load factor α = {loadFactor.toFixed(2)}
          {loadFactor > 0.7 ? ' — consider resizing' : ''}
        </span>
      </div>

      {state.activeKey !== null && (
        <div className="mt-9 px-3">
          <div className="rounded-md border border-border bg-surface px-3 py-1.5 text-center font-mono text-[12px] text-text-primary dark:border-dark-border dark:bg-dark-border dark:text-dark-text-primary">
            hash({state.activeKey}) = {state.activeKey} % {state.capacity} = {state.hashResult ?? '?'}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto pt-6">
        {state.variant === 'chaining' ? (
          <ChainingCanvas state={state} width={width} prefersReducedMotion={prefersReducedMotion} />
        ) : (
          <OpenAddressingCanvas state={state} width={width} prefersReducedMotion={prefersReducedMotion} />
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          Size: {state.size} / {state.capacity} buckets
          {state.collisionOccurred ? ' · collision resolved' : ''}
        </p>
      </div>
    </div>
  )
}
