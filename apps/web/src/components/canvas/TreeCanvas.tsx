import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import type { BSTNode, BSTState } from '@/engine/bst'

interface TreeCanvasProps {
  width?: number
  height?: number
}

interface LayoutNode {
  node: BSTNode
  x: number
  y: number
  depth: number
}

const NODE_RADIUS = 22
const LEVEL_HEIGHT = 90
const MIN_GAP = 48
const TOP_PADDING = 50
const DEFAULT_WIDTH = 600

// Fixed hex palette (not Tailwind dark: classes) for the same reason
// ArrayCanvas's bar states are fixed hex: these values are animated via
// Framer's `animate={{ fill }}`, which needs a literal colour to
// interpolate toward, not a class name - and this exact palette was
// already verified legible in dark mode during Phase 16b.
const DEFAULT_FILL = '#c7c9e8'
const DEFAULT_TEXT = '#4a4d8a'
const DEFAULT_EDGE = '#c7c9e8'
const CURRENT_FILL = '#f59e0b'
const CURRENT_TEXT = '#78350f'
const FOUND_FILL = '#16a34a'
const FOUND_TEXT = '#ffffff'
const PATH_FILL = 'rgba(55, 48, 163, 0.6)'
const PATH_TEXT = '#ffffff'
const PATH_EDGE = '#3730a3'

const LEGEND: { label: string; colour: string }[] = [
  { label: 'Current node', colour: CURRENT_FILL },
  { label: 'Path taken', colour: '#3730a3' },
  { label: 'Found node', colour: FOUND_FILL },
  { label: 'Unvisited', colour: DEFAULT_FILL },
]

/**
 * Reingold-Tilford-style layout simplified for binary trees: each
 * node's x is the midpoint of its children's x values (or its slot's
 * midpoint if it has none), computed bottom-up so no two subtrees can
 * overlap. Post-order (children pushed before their parent) so a
 * parent's x can be computed from already-placed children.
 */
function layoutBST(root: BSTNode | null, containerWidth: number): LayoutNode[] {
  if (!root) return []
  const nodes: LayoutNode[] = []
  const width = containerWidth > 0 ? containerWidth : DEFAULT_WIDTH

  function assignPositions(node: BSTNode | null, depth: number, left: number, right: number): number {
    if (!node) return (left + right) / 2
    const mid = (left + right) / 2
    const leftX = node.left ? assignPositions(node.left, depth + 1, left, mid - MIN_GAP / 2) : mid
    const rightX = node.right ? assignPositions(node.right, depth + 1, mid + MIN_GAP / 2, right) : mid
    const x = node.left && node.right ? (leftX + rightX) / 2 : mid
    nodes.push({ node, x, y: depth * LEVEL_HEIGHT + TOP_PADDING, depth })
    return x
  }

  assignPositions(root, 0, 0, width)
  return nodes
}

export default function TreeCanvas({ width = DEFAULT_WIDTH, height = 400 }: TreeCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const masteryPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as BSTState | undefined

  const layout = useMemo(() => layoutBST(state?.root ?? null, width), [state, width])

  const idToValue = useMemo(() => new Map(layout.map((l) => [l.node.id, l.node.value])), [layout])

  const edges = useMemo(() => {
    const byId = new Map(layout.map((l) => [l.node.id, l]))
    const result: { key: string; parentId: string; childId: string; x1: number; y1: number; x2: number; y2: number }[] = []
    for (const { node, x, y } of layout) {
      if (node.left) {
        const child = byId.get(node.left.id)
        if (child) {
          result.push({ key: `${node.id}-${child.node.id}`, parentId: node.id, childId: child.node.id, x1: x, y1: y, x2: child.x, y2: child.y })
        }
      }
      if (node.right) {
        const child = byId.get(node.right.id)
        if (child) {
          result.push({ key: `${node.id}-${child.node.id}`, parentId: node.id, childId: child.node.id, x1: x, y1: y, x2: child.x, y2: child.y })
        }
      }
    }
    return result
  }, [layout])

  const maxDepth = layout.reduce((max, l) => Math.max(max, l.depth), 0)
  const svgHeight = Math.max(height, maxDepth * LEVEL_HEIGHT + TOP_PADDING + NODE_RADIUS + 24)

  const masteryColorClass = masteryPercent >= 80 ? 'bg-success' : masteryPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  if (!state) {
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

  if (!state.root) {
    const cx = width / 2
    const cy = TOP_PADDING + NODE_RADIUS
    return (
      <svg width={width} height={height} role="img" aria-label="Empty binary search tree">
        <circle
          cx={cx}
          cy={cy}
          r={NODE_RADIUS}
          fill="none"
          stroke="#c7c9e8"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <text
          x={cx}
          y={cy + NODE_RADIUS + 24}
          textAnchor="middle"
          className="fill-text-muted text-sm dark:fill-dark-text-secondary"
        >
          Empty tree: first insertion will become root
        </text>
      </svg>
    )
  }

  const pathValues = state.path.map((id) => idToValue.get(id)).filter((v): v is number => v !== undefined)
  const canvasLabel = `${algorithmName}, ${state.operation === 'insert' ? 'inserting' : 'searching for'} ${state.targetValue}: ${snapshot?.description ?? ''}`

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

      <div className="flex-1 overflow-auto pt-8">
        <svg width={width} height={svgHeight} role="img" aria-label={canvasLabel}>
          {edges.map((edge) => {
            const onPath = state.path.includes(edge.parentId) && state.path.includes(edge.childId)
            return (
              <g key={edge.key}>
                <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke={DEFAULT_EDGE} strokeWidth={1.5} />
                {onPath && (
                  <line
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={PATH_EDGE}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />
                )}
              </g>
            )
          })}

          {layout.map(({ node, x, y }) => {
            const isCurrent = state.currentNode?.id === node.id
            const isFound = state.foundNode?.id === node.id
            const onPath = !isCurrent && !isFound && state.path.includes(node.id)
            const fill = isFound ? FOUND_FILL : isCurrent ? CURRENT_FILL : onPath ? PATH_FILL : DEFAULT_FILL
            const textFill = isFound ? FOUND_TEXT : isCurrent ? CURRENT_TEXT : onPath ? PATH_TEXT : DEFAULT_TEXT

            return (
              <motion.g
                key={node.id}
                layout
                // `initial` only plays on this node's very first mount (a
                // brand new id appearing, i.e. the value just inserted) -
                // an already-mounted node re-renders via `animate` only,
                // so this doesn't need to detect "is this an insert step"
                // from the snapshot description.
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ x, y }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { layout: { duration: 0.35, ease: 'easeInOut' }, default: { duration: 0.3, ease: 'backOut' } }
                }
              >
                <motion.circle
                  r={NODE_RADIUS}
                  animate={{ fill }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeInOut' }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fill: textFill, fontSize: 13, fontWeight: 500 }}
                >
                  {node.value}
                </text>
              </motion.g>
            )
          })}
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          {state.operation === 'insert' ? `Inserting: ${state.targetValue}` : `Searching for: ${state.targetValue}`}
        </p>
        <p className="text-[12px] text-primary dark:text-dark-primary">
          Path taken: {pathValues.length > 0 ? pathValues.join(' → ') : '—'}
        </p>
        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">Nodes visited: {state.path.length}</p>
      </div>
    </div>
  )
}
