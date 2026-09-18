import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import type { BSTNode, BSTState } from '@/engine/bst'
import type { TraversalState } from '@/engine/treeTraversal'
import type { AVLNode, AVLState } from '@/engine/avlTree'
import type { RBNode, RBState } from '@/engine/redBlackTree'

/** BSTState (insert/search/delete), TraversalState (inorder/preorder/
 * postorder/level-order), AVLState (insert/delete), and RBState (insert/
 * delete) share every field this canvas reads, so all four render here
 * without a second canvas component. Narrower fields (traversalType,
 * balanceFactor, ...) are read defensively per-branch since only one
 * member of the union has them. */
type TreeCanvasState = BSTState | TraversalState | AVLState | RBState

interface TreeCanvasProps {
  width?: number
  height?: number
  /** AVL pages pass true so each node's balance factor renders as a small
   * label beneath it - meaningless for plain BST/traversal snapshots,
   * which never populate `balanceFactor`. */
  showBalanceFactor?: boolean
  /** Red-Black pages pass true so each node fills with its own RED/BLACK
   * colour instead of the generic current/path/found palette. */
  colorByRBColor?: boolean
}

interface LayoutNode {
  node: BSTNode
  x: number
  y: number
  depth: number
}

const BASE_NODE_RADIUS = 22
const MIN_NODE_RADIUS = 13
const LEVEL_HEIGHT = 80
const NODE_GAP = 16
const VIEWBOX_PADDING = 28
const DEFAULT_WIDTH = 600

// Fixed hex palette (not Tailwind dark: classes) for the same reason
// ArrayCanvas's bar states are fixed hex: these values are animated via
// Framer's `animate={{ fill }}`, which needs a literal colour to
// interpolate toward, not a class name. Default node contrast matches
// GraphCanvas's unvisited-node treatment (white fill, near-black text,
// light stroke) rather than the low-contrast lavender this used before.
const DEFAULT_FILL = '#ffffff'
const DEFAULT_TEXT = '#0f172a'
const DEFAULT_STROKE = '#cbd5e1'
const DEFAULT_EDGE = '#94a3b8'
const CURRENT_FILL = '#f59e0b'
const CURRENT_TEXT = '#78350f'
const RB_RED_FILL = '#dc2626'
const RB_BLACK_FILL = '#1f2937'
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

const RB_LEGEND: { label: string; colour: string }[] = [
  { label: 'Red node', colour: RB_RED_FILL },
  { label: 'Black node', colour: RB_BLACK_FILL },
  { label: 'Current (ring)', colour: CURRENT_FILL },
]

interface TreeLayout {
  nodes: LayoutNode[]
  nodeRadius: number
  fontSize: number
  minX: number
  maxX: number
  maxDepth: number
}

const EMPTY_LAYOUT: TreeLayout = { nodes: [], nodeRadius: BASE_NODE_RADIUS, fontSize: 13, minX: 0, maxX: 0, maxDepth: 0 }

/**
 * In-order layout: each node's x is its rank in an in-order traversal,
 * which guarantees no two nodes ever share a column regardless of shape,
 * and y is purely a function of depth. The bounding box this produces is
 * exactly the size of the tree's content (node count x depth), never the
 * size of the container, so a 2-node tree in a wide canvas doesn't get
 * stretched across it - the viewBox fit (see render) handles scaling
 * that content box up or down to the available space.
 */
function layoutBST(root: BSTNode | null): TreeLayout {
  if (!root) return EMPTY_LAYOUT

  let nodeCount = 0
  let maxDepth = 0
  ;(function measure(node: BSTNode | null, depth: number) {
    if (!node) return
    nodeCount++
    maxDepth = Math.max(maxDepth, depth)
    measure(node.left, depth + 1)
    measure(node.right, depth + 1)
  })(root, 0)

  // Deeper or busier trees get smaller nodes so every level still fits
  // legibly; shallow trees keep the full base radius.
  const nodeRadius = Math.max(MIN_NODE_RADIUS, BASE_NODE_RADIUS - Math.max(0, maxDepth - 2) * 2)
  const fontSize = Math.max(10, Math.round(nodeRadius * 0.6))
  const spacing = nodeRadius * 2 + NODE_GAP

  const nodes: LayoutNode[] = []
  let rank = 0
  function assign(node: BSTNode | null, depth: number) {
    if (!node) return
    assign(node.left, depth + 1)
    nodes.push({ node, x: rank * spacing, y: depth * LEVEL_HEIGHT, depth })
    rank++
    assign(node.right, depth + 1)
  }
  assign(root, 0)

  const minX = 0
  const maxX = (nodeCount - 1) * spacing
  return { nodes, nodeRadius, fontSize, minX, maxX, maxDepth }
}

export default function TreeCanvas({
  width = DEFAULT_WIDTH,
  height = 400,
  showBalanceFactor = false,
  colorByRBColor = false,
}: TreeCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as TreeCanvasState | undefined

  const { nodes: layout, nodeRadius, fontSize, minX, maxX, maxDepth } = useMemo(
    () => layoutBST(state?.root ?? null),
    [state],
  )

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

  // Content-fitted viewBox: origin and extent come from the tree's own
  // bounding box (padded), not the container. preserveAspectRatio scales
  // that box up or down to whatever space the canvas has, and centres it,
  // so a 2-node tree in a wide panel isn't stretched edge to edge and a
  // deep tree isn't clipped.
  const viewBoxX = minX - nodeRadius - VIEWBOX_PADDING
  const viewBoxY = -nodeRadius - VIEWBOX_PADDING
  const viewBoxWidth = maxX - minX + 2 * (nodeRadius + VIEWBOX_PADDING)
  const viewBoxHeight = maxDepth * LEVEL_HEIGHT + 2 * (nodeRadius + VIEWBOX_PADDING)

  const progressColorClass = progressPercent >= 80 ? 'bg-success' : progressPercent >= 50 ? 'bg-secondary' : 'bg-primary'

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
    const cy = BASE_NODE_RADIUS + VIEWBOX_PADDING
    return (
      <svg width={width} height={height} role="img" aria-label="Empty binary search tree">
        <circle
          cx={cx}
          cy={cy}
          r={BASE_NODE_RADIUS}
          fill="none"
          stroke="#c7c9e8"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <text
          x={cx}
          y={cy + BASE_NODE_RADIUS + 24}
          textAnchor="middle"
          className="fill-text-muted text-sm dark:fill-dark-text-secondary"
        >
          Empty tree: first insertion will become root
        </text>
      </svg>
    )
  }

  const pathValues = state.path.map((id) => idToValue.get(id)).filter((v): v is number => v !== undefined)
  const operationLabel =
    state.operation === 'insert'
      ? 'inserting'
      : state.operation === 'delete'
        ? 'deleting'
        : state.operation === 'traverse'
          ? 'traversing'
          : 'searching for'
  const canvasLabel =
    state.operation === 'traverse'
      ? `${algorithmName}, traversing: ${snapshot?.description ?? ''}`
      : `${algorithmName}, ${operationLabel} ${state.targetValue}: ${snapshot?.description ?? ''}`

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
          <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
            {progressPercent}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(colorByRBColor ? RB_LEGEND : LEGEND).map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ backgroundColor: item.colour }} aria-hidden="true" />
              <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden pt-8">
        <svg
          width="100%"
          height="100%"
          viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={canvasLabel}
        >
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
            const rbColor = colorByRBColor && 'color' in node ? (node as RBNode).color : undefined
            // RB colouring takes priority over the generic palette - the
            // node's own RED/BLACK is the entire point of this canvas
            // mode - but current/found still show through as a ring so
            // the active node stays identifiable against same-coloured
            // siblings.
            const fill = rbColor ? (rbColor === 'RED' ? RB_RED_FILL : RB_BLACK_FILL) : isFound ? FOUND_FILL : isCurrent ? CURRENT_FILL : onPath ? PATH_FILL : DEFAULT_FILL
            const textFill = rbColor ? '#ffffff' : isFound ? FOUND_TEXT : isCurrent ? CURRENT_TEXT : onPath ? PATH_TEXT : DEFAULT_TEXT
            const isUnbalanced = 'unbalancedNodeId' in state && state.unbalancedNodeId === node.id
            const balanceFactor = showBalanceFactor && 'balanceFactor' in node ? (node as AVLNode).balanceFactor : undefined

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
                  r={nodeRadius}
                  animate={{ fill }}
                  stroke={
                    isUnbalanced ? '#dc2626' : rbColor && isCurrent ? '#f59e0b' : fill === DEFAULT_FILL ? DEFAULT_STROKE : 'none'
                  }
                  strokeWidth={isUnbalanced || (rbColor && isCurrent) ? 3 : fill === DEFAULT_FILL ? 1.5 : 0}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeInOut' }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fill: textFill, fontSize, fontWeight: 500 }}
                >
                  {node.value}
                </text>
                {balanceFactor !== undefined && (
                  <text
                    textAnchor="middle"
                    y={nodeRadius + 14}
                    style={{ fill: isUnbalanced ? '#dc2626' : '#6b7280', fontSize: Math.max(9, fontSize - 3), fontWeight: isUnbalanced ? 700 : 500 }}
                  >
                    {`bf=${balanceFactor}`}
                  </text>
                )}
              </motion.g>
            )
          })}
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          {state.operation === 'insert'
            ? `Inserting: ${state.targetValue}`
            : state.operation === 'delete'
              ? `Deleting: ${state.targetValue}`
              : state.operation === 'traverse'
                ? `Traversal: ${state.traversalType}`
                : `Searching for: ${state.targetValue}`}
        </p>
        <p className="text-[12px] text-primary dark:text-dark-primary">
          {state.operation === 'traverse' ? 'Visited so far' : 'Path taken'}:{' '}
          {pathValues.length > 0 ? pathValues.join(' → ') : '—'}
        </p>
        <p className="text-[11px] text-text-muted dark:text-dark-text-secondary">Nodes visited: {state.path.length}</p>
        {'rotationType' in state && state.rotationType && (
          <p className="text-[11px] font-semibold text-error">Rotation applied: {state.rotationType}</p>
        )}
        {'fixupOperation' in state && state.fixupOperation && (
          <p className="text-[11px] font-semibold text-error">Fix-up applied: {state.fixupOperation}</p>
        )}
      </div>
    </div>
  )
}
