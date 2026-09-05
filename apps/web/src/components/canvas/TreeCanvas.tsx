import { useMemo } from 'react'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import type { BSTNode, BSTState } from '@/engine/bst'

interface TreeCanvasProps {
  width?: number
  height?: number
}

interface LayoutNode {
  node: BSTNode
  x: number
  y: number
}

const NODE_RADIUS = 20
const ROW_HEIGHT = 70

/**
 * Minimal recursive layout: each node is placed at its parent's x plus
 * or minus a horizontal gap that halves per level, one row height
 * below its parent. Good enough to make the tree readable for a
 * handful of levels - a full collision-free layout is Phase 17.
 */
function layoutTree(node: BSTNode | null, x: number, y: number, gap: number): LayoutNode[] {
  if (!node) return []
  const nodes: LayoutNode[] = [{ node, x, y }]
  if (node.left) nodes.push(...layoutTree(node.left, x - gap, y + ROW_HEIGHT, gap / 2))
  if (node.right) nodes.push(...layoutTree(node.right, x + gap, y + ROW_HEIGHT, gap / 2))
  return nodes
}

export default function TreeCanvas({ width = 600, height = 300 }: TreeCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const state = snapshot?.dataStructureState as BSTState | undefined

  const layout = useMemo(() => {
    if (!state?.root) return []
    return layoutTree(state.root, width / 2, 36, width / 4)
  }, [state, width])

  const edges = useMemo(() => {
    const byId = new Map(layout.map((l) => [l.node.id, l]))
    const result: { key: string; x1: number; y1: number; x2: number; y2: number }[] = []
    for (const { node, x, y } of layout) {
      if (node.left) {
        const child = byId.get(node.left.id)
        if (child) result.push({ key: `${node.id}-${child.node.id}`, x1: x, y1: y, x2: child.x, y2: child.y })
      }
      if (node.right) {
        const child = byId.get(node.right.id)
        if (child) result.push({ key: `${node.id}-${child.node.id}`, x1: x, y1: y, x2: child.x, y2: child.y })
      }
    }
    return result
  }, [layout])

  if (!state?.root) {
    return (
      <svg width={width} height={height} role="img" aria-label="Empty binary search tree">
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

  return (
    <svg width={width} height={height} role="img" aria-label="Binary search tree">
      {edges.map((edge) => (
        <line key={edge.key} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke="#c7c9e8" strokeWidth={2} />
      ))}
      {layout.map(({ node, x, y }) => {
        const isCurrent = state.currentNode?.id === node.id
        const isFound = state.foundNode?.id === node.id
        const fill = isFound ? '#16a34a' : isCurrent ? '#f59e0b' : '#c7c9e8'
        const textFill = isFound || isCurrent ? '#ffffff' : '#4a4d8a'
        return (
          <g key={node.id}>
            <circle cx={x} cy={y} r={NODE_RADIUS} fill={fill} />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fill: textFill, fontSize: 13, fontWeight: 600 }}
            >
              {node.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
