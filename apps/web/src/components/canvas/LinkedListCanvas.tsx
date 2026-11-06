import { useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { CANVAS_SPRING } from '@/utils/motion'
import { cn } from '@/lib/utils'
import OperationBanner from './OperationBanner'
import { operationLabelFor } from '@/utils/operationLabel'
import { useElementHeight } from '@/hooks/useElementHeight'
import type { LinkedListNode, LinkedListState } from '@/engine/singlyLinkedList'

interface LinkedListCanvasProps {
  width?: number
  height?: number
  /** Renders the three-compartment (prev | value | next) node shape and bidirectional arrows. */
  isDLL?: boolean
  /** Draws the wraparound arrow from the tail back to the head instead of a null terminator. */
  isCircular?: boolean
}

const NODE_WIDTH = 112
const NODE_HEIGHT = 44
const ARROW_GAP = 52
const ROW_HEIGHT = 138
const NODES_PER_ROW = 7
const LEFT_PADDING = 60
const TOP_PADDING = 72

function simAddress(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0x0fff
  }
  const aligned = (0x1000 + ((hash & 0x0ff0) || 0x0040)).toString(16).toUpperCase()
  return `0x${aligned}`
}

const DEFAULT_FILL = 'var(--surface)'
const DEFAULT_STROKE = 'var(--rule)'
const DEFAULT_TEXT = 'var(--ink)'
const CURRENT_FILL = 'var(--state-compare)'
const CURRENT_TEXT = 'var(--state-compare-ink)'
const FOUND_FILL = 'var(--state-sorted)'
const FOUND_TEXT = 'var(--state-sorted-ink)'
const DELETE_FILL = 'var(--state-error-text)'
const DELETE_TEXT = 'var(--state-error-ink)'
const POINTER_BG = 'var(--surface-sunk)'
const ARROW_ACTIVE = 'var(--state-current)'
const ARROW_REWIRE = 'var(--state-compare)'
const ARROW_INACTIVE = 'var(--state-neutral)'

const LEGEND: { label: string; colour: string }[] = [
  { label: 'Current', colour: CURRENT_FILL },
  { label: 'Found', colour: FOUND_FILL },
  { label: 'Marked for delete', colour: DELETE_FILL },
  { label: 'Unvisited', colour: DEFAULT_FILL },
]

interface LayoutNode {
  node: LinkedListNode
  x: number
  y: number
  row: number
  col: number
}

function layoutNodes(nodes: LinkedListNode[], headId: string | null): LayoutNode[] {
  if (nodes.length === 0 || !headId) return []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const ordered: LinkedListNode[] = []
  const seen = new Set<string>()
  let cursor: string | null = headId
  while (cursor && !seen.has(cursor)) {
    const node = byId.get(cursor)
    if (!node) break
    ordered.push(node)
    seen.add(cursor)
    cursor = node.next
  }
  for (const node of nodes) {
    if (!seen.has(node.id)) ordered.push(node)
  }

  return ordered.map((node, i) => ({
    node,
    row: Math.floor(i / NODES_PER_ROW),
    col: i % NODES_PER_ROW,
    x: LEFT_PADDING + (i % NODES_PER_ROW) * (NODE_WIDTH + ARROW_GAP),
    y: TOP_PADDING + Math.floor(i / NODES_PER_ROW) * ROW_HEIGHT,
  }))
}

export default function LinkedListCanvas({
  width = 700,
  height: boxHeight = 320,
  isDLL = false,
  isCircular = false,
}: LinkedListCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as LinkedListState | undefined
  const operationLabel = operationLabelFor(snapshot?.dataStructureState)
  const headerRef = useRef<HTMLDivElement>(null)
  const headerHeight = useElementHeight(headerRef)
  const height = Math.max(boxHeight - headerHeight, 180)

  const layout = useMemo(() => layoutNodes(state?.nodes ?? [], state?.headId ?? null), [state])
  const rowCount = layout.reduce((max, l) => Math.max(max, l.row + 1), 1)
  const svgHeight = Math.max(height, TOP_PADDING + rowCount * ROW_HEIGHT + 44)
  const svgWidth = Math.max(width, LEFT_PADDING + NODES_PER_ROW * (NODE_WIDTH + ARROW_GAP))

  const progressColorClass = progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  if (!state || state.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
            <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
              <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="rounded-md border border-border px-4 py-2 font-mono text-sm text-text-muted dark:border-dark-border dark:text-dark-text-secondary">
            head &rarr; null
          </span>
        </div>
      </div>
    )
  }

  const byId = new Map(layout.map((l) => [l.node.id, l]))
  const canvasLabel = `${algorithmName}, ${state.operation}: ${snapshot?.description ?? ''}`
  const isRewiringOp = state.operation === 'insert' || state.operation === 'delete' || state.operation === 'reverse'

  return (
    <div className="flex h-full flex-col">
      <div ref={headerRef} className="flex shrink-0 flex-col gap-1 px-3 pt-2 pb-1">
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
            {LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <span className="size-2 rounded-sm" style={{ backgroundColor: item.colour }} aria-hidden="true" />
                <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <OperationBanner label={operationLabel} />
      </div>

      <div className="flex-1 overflow-auto pt-2">
        <svg width={svgWidth} height={svgHeight} role="img" aria-label={canvasLabel}>
          <defs>
            <marker id="ll-arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={ARROW_ACTIVE} />
            </marker>
            <marker id="ll-arrow-rewire" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={ARROW_REWIRE} />
            </marker>
            <marker id="ll-arrow-inactive" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={ARROW_INACTIVE} />
            </marker>
          </defs>

          <AnimatePresence>
            {layout.map(({ node, x, y }, i) => {
              const isLast = i === layout.length - 1
              const nextLayout = node.next ? byId.get(node.next) : null
              const isActiveEdge = state.currentId === node.id && state.activePointer !== 'prev'
              const isRewiringEdge = isActiveEdge && isRewiringOp

              if (isLast) return null
              if (!nextLayout) return null

              const sameRow = nextLayout.y === y
              const x1 = x + NODE_WIDTH
              const y1 = y + NODE_HEIGHT / 2
              const x2 = nextLayout.x
              const y2 = nextLayout.y + NODE_HEIGHT / 2
              const path = sameRow
                ? `M${x1},${y1} L${x2 - 6},${y2}`
                : `M${x1},${y1} C${x1 + 40},${y1} ${x1 + 40},${y2} ${x2 - 6},${y2}`

              return (
                <motion.path
                  key={`${node.id}-next`}
                  layout
                  d={path}
                  fill="none"
                  stroke={isRewiringEdge ? ARROW_REWIRE : isActiveEdge ? ARROW_ACTIVE : ARROW_INACTIVE}
                  strokeWidth={isActiveEdge ? 2.5 : 1.5}
                  strokeDasharray={isRewiringEdge ? '6 3' : undefined}
                  markerEnd={`url(#ll-arrow-${isRewiringEdge ? 'rewire' : isActiveEdge ? 'active' : 'inactive'})`}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
                />
              )
            })}

            {isCircular && layout.length > 0 && (
              <motion.path
                key="circular-wrap"
                layout
                d={(() => {
                  const tail = layout[layout.length - 1]
                  const head = layout[0]
                  const x1 = tail.x + NODE_WIDTH
                  const y1 = tail.y + NODE_HEIGHT / 2
                  const x2 = head.x
                  const y2 = head.y - 18
                  return `M${x1},${y1} C${x1 + 30},${y1 + 40} ${head.x - 20},${y2 + 40} ${x2},${y2}`
                })()}
                fill="none"
                stroke={ARROW_ACTIVE}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                markerEnd="url(#ll-arrow-active)"
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              />
            )}

            {isDLL &&
              layout.map(({ node, x, y }) => {
                if (!node.prev) return null
                const prevLayout = byId.get(node.prev)
                if (!prevLayout || prevLayout.y !== y) return null
                const isActiveEdge = state.currentId === node.id && state.activePointer === 'prev'
                const isRewiringEdge = isActiveEdge && isRewiringOp
                const x1 = x
                const y1 = y + NODE_HEIGHT / 2 + 10
                const x2 = prevLayout.x + NODE_WIDTH
                return (
                  <motion.path
                    key={`${node.id}-prev`}
                    layout
                    d={`M${x1},${y1} L${x2},${y1}`}
                    fill="none"
                    stroke={isRewiringEdge ? ARROW_REWIRE : isActiveEdge ? ARROW_ACTIVE : ARROW_INACTIVE}
                    strokeWidth={isActiveEdge ? 2.5 : 1.5}
                    strokeDasharray="4 3"
                    markerEnd={`url(#ll-arrow-${isRewiringEdge ? 'rewire' : isActiveEdge ? 'active' : 'inactive'})`}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                  />
                )
              })}

            {layout.map(({ node, x, y }, i) => {
              const isCurrent = state.currentId === node.id
              const isFound = state.highlightedId === node.id
              const isMarked = state.markedForDelete === node.id
              const fill = isMarked ? DELETE_FILL : isFound ? FOUND_FILL : isCurrent ? CURRENT_FILL : DEFAULT_FILL
              const textFill = isMarked ? DELETE_TEXT : isFound ? FOUND_TEXT : isCurrent ? CURRENT_TEXT : DEFAULT_TEXT
              const prevWidth = isDLL ? NODE_WIDTH * 0.28 : 0
              const valueWidth = isDLL ? NODE_WIDTH * 0.44 : NODE_WIDTH * 0.56
              const nextWidth = isDLL ? NODE_WIDTH * 0.28 : NODE_WIDTH * 0.44
              const isHead = node.id === state.headId
              const isTail = node.id === state.tailId
              const nodeAddr = simAddress(node.id)
              const nextTargetId = node.next ?? (isCircular && i === layout.length - 1 ? state.headId : null)
              const nextAddrShort = nextTargetId ? simAddress(nextTargetId).slice(2) : 'null'
              const prevAddrShort = node.prev ? simAddress(node.prev).slice(2) : 'null'
              const highlightNextBox = isCurrent && isRewiringOp && state.activePointer !== 'prev'
              const highlightPrevBox = isCurrent && isRewiringOp && state.activePointer === 'prev'

              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0, x, y }}
                  animate={{ opacity: 1, scale: 1, x, y }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { x: CANVAS_SPRING, y: CANVAS_SPRING, default: { duration: 0.3, ease: 'backOut' } }
                  }
                >
                  {isHead && (
                    <text x={14} y={-10} textAnchor="middle" className="fill-state-current text-[10px] font-semibold">
                      &#9660; head
                    </text>
                  )}
                  {isTail && (
                    <text
                      x={NODE_WIDTH - 14}
                      y={-10}
                      textAnchor="middle"
                      className="fill-text-muted text-[10px] font-semibold dark:fill-dark-text-secondary"
                    >
                      &#9660; tail
                    </text>
                  )}

                  {isDLL && (
                    <>
                      <rect
                        x={0}
                        y={0}
                        width={prevWidth}
                        height={NODE_HEIGHT}
                        rx={5}
                        fill={POINTER_BG}
                        stroke={highlightPrevBox ? ARROW_REWIRE : DEFAULT_STROKE}
                        strokeWidth={highlightPrevBox ? 2 : 1}
                      />
                      <text
                        x={prevWidth / 2}
                        y={NODE_HEIGHT / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-text-muted font-mono text-[8px] dark:fill-dark-text-secondary"
                      >
                        {prevAddrShort}
                      </text>
                    </>
                  )}

                  <rect
                    x={prevWidth}
                    y={0}
                    width={valueWidth}
                    height={NODE_HEIGHT}
                    rx={5}
                    fill={fill}
                    stroke={fill === DEFAULT_FILL ? DEFAULT_STROKE : 'none'}
                  />
                  <text
                    x={prevWidth + valueWidth / 2}
                    y={NODE_HEIGHT / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                      fill: textFill,
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: isMarked ? 'line-through' : 'none',
                    }}
                  >
                    {node.value}
                  </text>

                  <rect
                    x={prevWidth + valueWidth}
                    y={0}
                    width={nextWidth}
                    height={NODE_HEIGHT}
                    rx={5}
                    fill={POINTER_BG}
                    stroke={highlightNextBox ? ARROW_REWIRE : DEFAULT_STROKE}
                    strokeWidth={highlightNextBox ? 2 : 1}
                  />
                  <text
                    x={prevWidth + valueWidth + nextWidth / 2}
                    y={NODE_HEIGHT / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      'font-mono',
                      nextTargetId ? 'fill-text-primary text-[9px] dark:fill-dark-text-primary' : 'fill-text-muted text-[9px]',
                    )}
                  >
                    {nextTargetId ? `0x${nextAddrShort}` : 'null'}
                  </text>

                  {/* Simulated memory address beneath node */}
                  <text
                    x={NODE_WIDTH / 2}
                    y={NODE_HEIGHT + 13}
                    textAnchor="middle"
                    className="fill-text-muted font-mono text-[9px] dark:fill-dark-text-secondary"
                  >
                    @{nodeAddr}
                  </text>
                </motion.g>
              )
            })}
          </AnimatePresence>

          {!isCircular &&
            layout.length > 0 &&
            (() => {
              const tail = layout[layout.length - 1]
              return (
                <text
                  x={tail.x + NODE_WIDTH + ARROW_GAP / 2}
                  y={tail.y + NODE_HEIGHT / 2 + 5}
                  textAnchor="middle"
                  className="fill-text-muted text-[16px]"
                >
                  &#8709;
                </text>
              )
            })()}
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          {state.operation === 'insert' && state.operationValue !== null
            ? `Inserting: ${state.operationValue}`
            : state.operation === 'delete'
              ? 'Deleting node'
              : state.operation === 'reverse'
                ? 'Reversing list'
                : `Operation: ${state.operation}`}
        </p>
        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">Nodes: {state.nodes.length}</p>
      </div>
    </div>
  )
}
