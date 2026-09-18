import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import type { HeapState } from '@/engine/heap'

interface HeapCanvasProps {
  width?: number
  height?: number
}

interface TreeSlot {
  index: number
  x: number
  y: number
}

const NODE_RADIUS = 20
const TREE_LEVEL_HEIGHT = 70
const TREE_TOP_PADDING = 36
const BOX_SIZE = 40
const BOX_GAP = 6
const ARRAY_TOP_PADDING = 28
const DEFAULT_WIDTH = 600

const DEFAULT_FILL = '#c7c9e8'
const DEFAULT_TEXT = '#4a4d8a'
const CURRENT_FILL = '#f59e0b'
const CURRENT_TEXT = '#78350f'
const RELATIVE_FILL = 'rgba(55, 48, 163, 0.6)'
const RELATIVE_TEXT = '#ffffff'

/** Complete-binary-tree layout purely from array indices - a heap has no
 * explicit node/pointer structure, so position is derived arithmetically
 * (depth = floor(log2(i+1)), position within its level slot) rather than
 * walked like a real tree. */
function layoutHeapTree(size: number, containerWidth: number): TreeSlot[] {
  const slots: TreeSlot[] = []
  const width = containerWidth > 0 ? containerWidth : DEFAULT_WIDTH
  for (let i = 0; i < size; i++) {
    const depth = Math.floor(Math.log2(i + 1))
    const levelStart = 2 ** depth - 1
    const posInLevel = i - levelStart
    const slotsInLevel = 2 ** depth
    const x = ((posInLevel + 0.5) / slotsInLevel) * width
    const y = depth * TREE_LEVEL_HEIGHT + TREE_TOP_PADDING
    slots.push({ index: i, x, y })
  }
  return slots
}

export default function HeapCanvas({ width = DEFAULT_WIDTH, height = 400 }: HeapCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as HeapState | undefined

  const treeSlots = useMemo(() => layoutHeapTree(state?.array.length ?? 0, width), [state, width])

  const treeEdges = useMemo(() => {
    const result: { key: string; x1: number; y1: number; x2: number; y2: number }[] = []
    for (const slot of treeSlots) {
      const left = treeSlots[2 * slot.index + 1]
      const right = treeSlots[2 * slot.index + 2]
      if (left) result.push({ key: `${slot.index}-${left.index}`, x1: slot.x, y1: slot.y, x2: left.x, y2: left.y })
      if (right) result.push({ key: `${slot.index}-${right.index}`, x1: slot.x, y1: slot.y, x2: right.x, y2: right.y })
    }
    return result
  }, [treeSlots])

  const progressColorClass = progressPercent >= 80 ? 'bg-success' : progressPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  if (!state) {
    return (
      <svg width={width} height={height} role="img" aria-label="No algorithm loaded">
        <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" className="fill-text-muted text-sm dark:fill-dark-text-secondary">
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  // Rebound to a variable whose own static type is already non-undefined
  // (rather than relying on the `!state` guard above narrowing `state`
  // itself), since TS resets narrowing at the boundary of a nested
  // function declaration like fillFor below.
  const heapState: HeapState = state
  const relativeIndices = new Set(
    [heapState.parentIdx, heapState.leftChildIdx, heapState.rightChildIdx].filter((i): i is number => i !== null),
  )
  const heapLabel = heapState.heapType === 'max' ? 'Max-Heap' : 'Min-Heap'
  const treeMaxDepth = treeSlots.reduce((max, s) => Math.max(max, Math.floor(Math.log2(s.index + 1))), 0)
  const treeHeight = treeMaxDepth * TREE_LEVEL_HEIGHT + TREE_TOP_PADDING + NODE_RADIUS + 16
  const arrayRowWidth = heapState.array.length * (BOX_SIZE + BOX_GAP)

  function fillFor(index: number) {
    if (index === heapState.currentIdx) return { fill: CURRENT_FILL, text: CURRENT_TEXT }
    if (relativeIndices.has(index)) return { fill: RELATIVE_FILL, text: RELATIVE_TEXT }
    return { fill: DEFAULT_FILL, text: DEFAULT_TEXT }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-text-primary dark:text-dark-text-primary">{heapLabel}</span>
          <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">{progressPercent}%</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ backgroundColor: CURRENT_FILL }} aria-hidden="true" />
            <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">Current</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ backgroundColor: '#3730a3' }} aria-hidden="true" />
            <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">Parent / child</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pt-9">
        {state.array.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-text-muted dark:text-dark-text-secondary">Empty heap</span>
          </div>
        ) : (
          <>
            <svg width={width} height={treeHeight} role="img" aria-label={`${heapLabel} tree view, ${state.array.length} elements`}>
              {treeEdges.map((edge) => (
                <line key={edge.key} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke={DEFAULT_FILL} strokeWidth={1.5} />
              ))}
              {treeSlots.map((slot) => {
                const { fill, text } = fillFor(slot.index)
                return (
                  <motion.g
                    key={slot.index}
                    layout
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ x: slot.x, y: slot.y }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { layout: { duration: 0.3, ease: 'easeInOut' }, default: { duration: 0.25, ease: 'backOut' } }
                    }
                  >
                    <motion.circle r={NODE_RADIUS} animate={{ fill }} transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }} />
                    <text textAnchor="middle" dominantBaseline="central" style={{ fill: text, fontSize: 12, fontWeight: 500 }}>
                      {state.array[slot.index]}
                    </text>
                  </motion.g>
                )
              })}
            </svg>

            <div className="border-t border-border px-3 pt-3 dark:border-dark-border">
              <p className="mb-1 text-[10px] font-semibold tracking-[0.06em] text-text-muted uppercase dark:text-dark-text-secondary">
                Array view
              </p>
              <svg width={Math.max(width, arrayRowWidth)} height={BOX_SIZE + ARRAY_TOP_PADDING} role="img" aria-label="Heap array representation">
                {state.array.map((value, index) => {
                  const { fill, text } = fillFor(index)
                  const boxX = index * (BOX_SIZE + BOX_GAP)
                  return (
                    <g key={index}>
                      <text x={boxX + BOX_SIZE / 2} y={ARRAY_TOP_PADDING - 12} textAnchor="middle" className="fill-text-muted text-[10px] dark:fill-dark-text-secondary">
                        {index}
                      </text>
                      <motion.rect
                        x={boxX}
                        y={ARRAY_TOP_PADDING}
                        width={BOX_SIZE}
                        height={BOX_SIZE}
                        rx={6}
                        animate={{ fill }}
                        stroke={index === state.currentIdx ? '#78350f' : 'none'}
                        strokeWidth={index === state.currentIdx ? 2 : 0}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
                      />
                      <text
                        x={boxX + BOX_SIZE / 2}
                        y={ARRAY_TOP_PADDING + BOX_SIZE / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{ fill: text, fontSize: 12, fontWeight: 500 }}
                      >
                        {value}
                      </text>
                      {index === state.currentIdx && (
                        <text x={boxX + BOX_SIZE / 2} y={ARRAY_TOP_PADDING + BOX_SIZE + 14} textAnchor="middle" className="fill-secondary text-[9px] font-semibold">
                          {state.operation === 'insert' ? 'inserting' : 'sifting'}
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          {state.operation === 'insert' ? 'Inserting' : 'Deleting (extract root)'} - {algorithmName}
        </p>
        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">Size: {state.size}</p>
      </div>
    </div>
  )
}
