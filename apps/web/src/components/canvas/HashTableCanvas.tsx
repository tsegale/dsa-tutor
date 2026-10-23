import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { canvasMove } from '@/utils/motion'
import { cn } from '@/lib/utils'
import OperationBanner from './OperationBanner'
import { operationLabelFor } from '@/utils/operationLabel'
import type { HashTableState } from '@/engine/hashTable'

interface HashTableCanvasProps {
  width?: number
  height?: number
}

const BUCKET_WIDTH = 44
const BUCKET_HEIGHT = 36
const CHAIN_NODE_WIDTH = 56
const CHAIN_NODE_HEIGHT = 32
const ROW_HEIGHT = 46

const ACTIVE_FILL = 'var(--state-compare)'
const ACTIVE_TEXT = 'var(--state-compare-ink)'
const OCCUPIED_FILL = 'var(--state-current)'
const OCCUPIED_TEXT = 'var(--state-current-ink)'
const EMPTY_TARGET_FILL = 'var(--state-sorted)'
const EMPTY_TARGET_TEXT = 'var(--state-sorted-ink)'
const DELETED_FILL = 'color-mix(in srgb, var(--state-error) 20%, var(--surface))'
const DELETED_TEXT = 'var(--ink)'
const EMPTY_STROKE = 'var(--rule-strong)'

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
              fill={isActive ? ACTIVE_FILL : 'var(--surface-sunk)'}
              stroke="var(--rule)"
            />
            <text x={20 + BUCKET_WIDTH / 2} y={y + BUCKET_HEIGHT / 2} textAnchor="middle" dominantBaseline="central" style={{ fill: isActive ? ACTIVE_TEXT : 'var(--ink)', fontSize: 12, fontWeight: 600 }}>
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
                        <line x1={-20} y1={CHAIN_NODE_HEIGHT / 2} x2={0} y2={CHAIN_NODE_HEIGHT / 2} stroke="var(--state-neutral)" strokeWidth={1.5} markerEnd="url(#hash-chain-arrow)" />
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
              <line x1={20 + BUCKET_WIDTH} y1={y + BUCKET_HEIGHT / 2} x2={20 + BUCKET_WIDTH + 24} y2={y + BUCKET_HEIGHT / 2} stroke="var(--state-neutral)" strokeWidth={1.5} markerEnd="url(#hash-chain-arrow)" />
            )}
          </g>
        )
      })}
      <defs>
        <marker id="hash-chain-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--state-neutral)" />
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
                : 'var(--state-neutral)'

        return (
          <motion.g key={i} layout transition={canvasMove(prefersReducedMotion)}>
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
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as HashTableState | undefined
  const operationLabel = operationLabelFor(snapshot?.dataStructureState)

  const progressColorClass = progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted dark:text-dark-text-secondary">Load an algorithm to begin</span>
      </div>
    )
  }

  const loadFactor = state.capacity > 0 ? state.size / state.capacity : 0
  const isHashBucketPending = snapshot?.isPredictionRequired && snapshot.criticalJunctionType === 'HASH_BUCKET'

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-1 px-3 pt-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
            <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
              <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-semibold',
              loadFactor > 0.7 ? 'bg-error-light text-error' : 'bg-surface-sunk text-text-muted',
            )}
          >
            load factor α = {loadFactor.toFixed(2)}
            {loadFactor > 0.7 ? ' — consider resizing' : ''}
          </span>
        </div>
        <OperationBanner label={operationLabel} />
      </div>


      {state.activeKey !== null && (
        <div className="mt-2 px-3">
          <div className="rounded-md border border-border bg-surface-sunk px-3 py-1.5 text-center font-mono text-[12px] text-text-primary dark:border-dark-border dark:bg-dark-border dark:text-dark-text-primary">
            hash({state.activeKey}) = {state.activeKey} % {state.capacity} ={' '}
            {isHashBucketPending ? '?' : (state.hashResult ?? '?')}
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
