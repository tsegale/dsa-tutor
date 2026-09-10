import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

export interface LinkedListNode {
  id: string
  value: number | string
  next: string | null
  prev?: string | null
}

export interface LinkedListState {
  nodes: LinkedListNode[]
  headId: string | null
  tailId: string | null
  currentId: string | null
  highlightedId: string | null
  activePointer: 'next' | 'prev' | null
  operation: 'insert' | 'delete' | 'search' | 'traverse' | 'reverse'
  operationValue: number | null
  insertPosition: number | null
  markedForDelete: string | null
}

interface LinkedListCanvasProps {
  width?: number
  height?: number
  /** Renders the three-compartment (prev | value | next) node shape and bidirectional arrows. */
  isDLL?: boolean
  /** Draws the wraparound arrow from the tail back to the head instead of a null terminator. */
  isCircular?: boolean
}

const NODE_WIDTH = 90
const NODE_HEIGHT = 44
const ARROW_GAP = 50
const ROW_HEIGHT = 130
const NODES_PER_ROW = 8
const LEFT_PADDING = 60
const TOP_PADDING = 70

// Same fixed-hex-palette rationale as the other canvases: Framer's
// `animate={{ fill }}` needs literal colour values to interpolate
// toward, not a Tailwind class name.
const DEFAULT_FILL = '#ffffff'
const DEFAULT_STROKE = '#e2e8f0'
const DEFAULT_TEXT = '#0f172a'
const CURRENT_FILL = '#f59e0b'
const CURRENT_TEXT = '#78350f'
const FOUND_FILL = '#16a34a'
const FOUND_TEXT = '#ffffff'
const DELETE_FILL = '#dc2626'
const DELETE_TEXT = '#ffffff'
const POINTER_BG = '#f8fafc'
const ARROW_ACTIVE = '#3730a3'
const ARROW_INACTIVE = '#94a3b8'

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
  // Walk the chain from head so layout order matches traversal order,
  // not array insertion order - guards against an out-of-order `nodes`
  // array (e.g. after a delete/relink) drawing a visually tangled list.
  while (cursor && !seen.has(cursor)) {
    const node = byId.get(cursor)
    if (!node) break
    ordered.push(node)
    seen.add(cursor)
    cursor = node.next
  }
  // Any node unreachable from head (shouldn't normally happen) still
  // gets drawn so nothing silently disappears from the canvas.
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
  height = 320,
  isDLL = false,
  isCircular = false,
}: LinkedListCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const masteryPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as LinkedListState | undefined

  const layout = useMemo(() => layoutNodes(state?.nodes ?? [], state?.headId ?? null), [state])
  const rowCount = layout.reduce((max, l) => Math.max(max, l.row + 1), 1)
  const svgHeight = Math.max(height, TOP_PADDING + rowCount * ROW_HEIGHT + 40)
  const svgWidth = Math.max(width, LEFT_PADDING + NODES_PER_ROW * (NODE_WIDTH + ARROW_GAP))

  const masteryColorClass = masteryPercent >= 80 ? 'bg-success' : masteryPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  if (!state || state.nodes.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Mastery</span>
            <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
              <div className={cn('h-full rounded-full', masteryColorClass)} style={{ width: `${masteryPercent}%` }} />
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

  return (
    <div className="flex h-full flex-col">
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
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ backgroundColor: item.colour }} aria-hidden="true" />
              <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto pt-10">
        <svg width={svgWidth} height={svgHeight} role="img" aria-label={canvasLabel}>
          <defs>
            <marker id="ll-arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={ARROW_ACTIVE} />
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

              if (isLast) return null
              if (!nextLayout) return null

              // Same row: straight arrow between pointer box edges. Wrapped
              // to a new row: curve down from the row's right edge and back
              // in from the left, rather than drawing a long diagonal
              // across unrelated nodes.
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
                  stroke={isActiveEdge ? ARROW_ACTIVE : ARROW_INACTIVE}
                  strokeWidth={isActiveEdge ? 2.5 : 1.5}
                  markerEnd={`url(#ll-arrow-${isActiveEdge ? 'active' : 'inactive'})`}
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
                const x1 = x
                const y1 = y + NODE_HEIGHT / 2 + 10
                const x2 = prevLayout.x + NODE_WIDTH
                return (
                  <motion.path
                    key={`${node.id}-prev`}
                    layout
                    d={`M${x1},${y1} L${x2},${y1}`}
                    fill="none"
                    stroke={isActiveEdge ? ARROW_ACTIVE : ARROW_INACTIVE}
                    strokeWidth={isActiveEdge ? 2.5 : 1.5}
                    strokeDasharray="4 3"
                    markerEnd={`url(#ll-arrow-${isActiveEdge ? 'active' : 'inactive'})`}
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
              const valueWidth = isDLL ? NODE_WIDTH * 0.4 : NODE_WIDTH * 0.6
              const isHead = node.id === state.headId
              const isTail = node.id === state.tailId

              return (
                <motion.g
                  key={node.id}
                  layout
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  style={{ x, y }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { layout: { duration: 0.3, ease: 'easeInOut' }, default: { duration: 0.3, ease: 'backOut' } }
                  }
                >
                  {isHead && (
                    <text x={0} y={-24} textAnchor="middle" className="fill-primary text-[10px] font-semibold">
                      &#9660; head
                    </text>
                  )}
                  {isTail && (
                    <text
                      x={NODE_WIDTH}
                      y={-24}
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
                        width={NODE_WIDTH * 0.3}
                        height={NODE_HEIGHT}
                        rx={6}
                        fill={POINTER_BG}
                        stroke={DEFAULT_STROKE}
                      />
                      <text x={NODE_WIDTH * 0.15} y={NODE_HEIGHT / 2} textAnchor="middle" dominantBaseline="central" className="fill-text-muted text-[11px]">
                        &larr;
                      </text>
                    </>
                  )}

                  <rect
                    x={isDLL ? NODE_WIDTH * 0.3 : 0}
                    y={0}
                    width={valueWidth}
                    height={NODE_HEIGHT}
                    rx={6}
                    fill={fill}
                    stroke={fill === DEFAULT_FILL ? DEFAULT_STROKE : 'none'}
                  />
                  <text
                    x={(isDLL ? NODE_WIDTH * 0.3 : 0) + valueWidth / 2}
                    y={NODE_HEIGHT / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                      fill: textFill,
                      fontSize: 14,
                      fontWeight: 500,
                      textDecoration: isMarked ? 'line-through' : 'none',
                    }}
                  >
                    {node.value}
                  </text>

                  <rect
                    x={isDLL ? NODE_WIDTH * 0.7 : NODE_WIDTH * 0.6}
                    y={0}
                    width={NODE_WIDTH * (isDLL ? 0.3 : 0.4)}
                    height={NODE_HEIGHT}
                    rx={6}
                    fill={POINTER_BG}
                    stroke={DEFAULT_STROKE}
                  />
                  <text
                    x={isDLL ? NODE_WIDTH * 0.85 : NODE_WIDTH * 0.8}
                    y={NODE_HEIGHT / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      node.next ? 'text-[14px] fill-text-primary dark:fill-dark-text-primary' : 'fill-text-muted text-[10px]',
                    )}
                  >
                    {node.next ? '→' : isCircular && i === layout.length - 1 ? '→' : 'null'}
                  </text>

                  <text x={NODE_WIDTH / 2} y={NODE_HEIGHT + 16} textAnchor="middle" className="fill-text-muted text-[10px] dark:fill-dark-text-secondary">
                    {node.id}
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
