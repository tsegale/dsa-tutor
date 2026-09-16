import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import type { TrieNode, TrieState } from '@/engine/trie'

interface TrieCanvasProps {
  width?: number
  height?: number
}

interface LayoutNode {
  node: TrieNode
  x: number
  y: number
}

interface LayoutEdge {
  key: string
  char: string
  x1: number
  y1: number
  x2: number
  y2: number
}

const NODE_WIDTH = 36
const NODE_HEIGHT = 32
const LEVEL_HEIGHT = 70
const MIN_GAP = 16
const TOP_PADDING = 40
const DEFAULT_WIDTH = 700

const DEFAULT_FILL = '#c7c9e8'
const DEFAULT_TEXT = '#4a4d8a'
const CURRENT_FILL = '#f59e0b'
const CURRENT_TEXT = '#78350f'
const MATCHED_FILL = '#16a34a'
const MATCHED_TEXT = '#ffffff'
const NEW_FILL = '#2563eb'
const NEW_TEXT = '#ffffff'
const EDGE_COLOR = '#c7c9e8'

const LEGEND: { label: string; colour: string }[] = [
  { label: 'Current', colour: CURRENT_FILL },
  { label: 'Matched path', colour: MATCHED_FILL },
  { label: 'New node', colour: NEW_FILL },
  { label: 'Unvisited', colour: DEFAULT_FILL },
]

/**
 * N-ary layout: a node's x is the midpoint of its children's x values
 * (or its own slot's midpoint if it has none), computed bottom-up via
 * subtree width so siblings' subtrees never overlap. Children are
 * ordered by insertion order into the Map (alphabetical isn't
 * guaranteed, but is stable across re-renders of the same snapshot).
 */
function layoutTrie(root: TrieNode | null, containerWidth: number): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[] = []
  if (!root) return { nodes, edges }
  const width = containerWidth > 0 ? containerWidth : DEFAULT_WIDTH

  function subtreeWidth(node: TrieNode): number {
    if (node.children.size === 0) return NODE_WIDTH + MIN_GAP
    let total = 0
    for (const child of node.children.values()) total += subtreeWidth(child)
    return Math.max(total, NODE_WIDTH + MIN_GAP)
  }

  function place(node: TrieNode, depth: number, left: number, right: number, parent: LayoutNode | null, edgeChar: string | null) {
    const x = (left + right) / 2
    const y = depth * LEVEL_HEIGHT + TOP_PADDING
    const layoutNode: LayoutNode = { node, x, y }
    nodes.push(layoutNode)
    if (parent && edgeChar !== null) {
      edges.push({ key: `${parent.node.id}-${node.id}`, char: edgeChar, x1: parent.x, y1: parent.y, x2: x, y2: y })
    }

    const children = Array.from(node.children.entries())
    if (children.length === 0) return
    const totalWidth = children.reduce((sum, [, child]) => sum + subtreeWidth(child), 0)
    let cursor = left + (right - left - totalWidth) / 2
    for (const [char, child] of children) {
      const childWidth = subtreeWidth(child)
      place(child, depth + 1, cursor, cursor + childWidth, layoutNode, char)
      cursor += childWidth
    }
  }

  place(root, 0, 0, width, null, null)
  return { nodes, edges }
}

export default function TrieCanvas({ width = DEFAULT_WIDTH, height = 400 }: TrieCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const masteryPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as TrieState | undefined

  const { nodes, edges } = useMemo(() => layoutTrie(state?.root ?? null, width), [state, width])

  const masteryColorClass = masteryPercent >= 80 ? 'bg-success' : masteryPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  if (!state) {
    return (
      <svg width={width} height={height} role="img" aria-label="No algorithm loaded">
        <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" className="fill-text-muted text-sm dark:fill-dark-text-secondary">
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  const matchedSet = new Set(state.matchedPath)
  const newSet = new Set(state.newNodes)
  const maxDepth = nodes.reduce((max, n) => Math.max(max, Math.round((n.y - TOP_PADDING) / LEVEL_HEIGHT)), 0)
  const svgHeight = Math.max(height - 60, maxDepth * LEVEL_HEIGHT + TOP_PADDING + NODE_HEIGHT + 20)
  const canvasLabel = `Trie ${state.operation}, word "${state.currentWord}": ${snapshot?.description ?? ''}`

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Mastery</span>
          <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', masteryColorClass)} style={{ width: `${masteryPercent}%` }} />
          </div>
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">{masteryPercent}%</span>
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

      <div className="shrink-0 border-b border-border px-3 pt-9 pb-2 dark:border-dark-border">
        <p className="mb-1 text-[10px] font-semibold tracking-[0.06em] text-text-muted uppercase dark:text-dark-text-secondary">
          Current word
        </p>
        <div className="flex gap-1">
          {state.currentWord.split('').map((char, i) => (
            <div
              key={i}
              className={cn(
                'flex size-6 items-center justify-center rounded-md text-xs font-semibold',
                i === state.currentCharIdx
                  ? 'bg-secondary text-white'
                  : i < state.currentCharIdx
                    ? 'bg-success text-white'
                    : 'bg-surface text-text-muted dark:bg-dark-border dark:text-dark-text-secondary',
              )}
            >
              {char}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <svg width={Math.max(width, nodes.length * (NODE_WIDTH + MIN_GAP))} height={svgHeight} role="img" aria-label={canvasLabel}>
          {edges.map((edge) => (
            <g key={edge.key}>
              <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke={EDGE_COLOR} strokeWidth={1.5} />
              <text x={(edge.x1 + edge.x2) / 2} y={(edge.y1 + edge.y2) / 2 - 4} textAnchor="middle" className="fill-text-muted text-[10px] dark:fill-dark-text-secondary">
                {edge.char}
              </text>
            </g>
          ))}

          {nodes.map(({ node, x, y }) => {
            const isCurrent = state.currentNodeId === node.id
            const isMatched = !isCurrent && matchedSet.has(node.id)
            const isNew = !isCurrent && newSet.has(node.id)
            const fill = isCurrent ? CURRENT_FILL : isNew ? NEW_FILL : isMatched ? MATCHED_FILL : DEFAULT_FILL
            const textFill = isCurrent ? CURRENT_TEXT : isNew ? NEW_TEXT : isMatched ? MATCHED_TEXT : DEFAULT_TEXT

            return (
              <motion.g
                key={node.id}
                layout
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ x, y }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { layout: { duration: 0.3, ease: 'easeInOut' }, default: { duration: 0.25, ease: 'backOut' } }
                }
              >
                <motion.rect
                  x={-NODE_WIDTH / 2}
                  y={-NODE_HEIGHT / 2}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  animate={{ fill }}
                  stroke={node.isTerminal ? '#1f2937' : 'none'}
                  strokeWidth={node.isTerminal ? 2 : 0}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
                />
                {node.isTerminal && (
                  <rect
                    x={-NODE_WIDTH / 2 - 3}
                    y={-NODE_HEIGHT / 2 - 3}
                    width={NODE_WIDTH + 6}
                    height={NODE_HEIGHT + 6}
                    rx={10}
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth={1}
                  />
                )}
                <text textAnchor="middle" dominantBaseline="central" style={{ fill: textFill, fontSize: 13, fontWeight: 600 }}>
                  {node.char || '•'}
                </text>
              </motion.g>
            )
          })}
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          {state.operation === 'insert' ? 'Inserting' : state.operation === 'search' ? 'Searching for' : 'Deleting'}: "
          {state.currentWord}"
        </p>
        {state.found !== null && (
          <p className={cn('text-[11px] font-semibold', state.found ? 'text-success' : 'text-error')}>
            {state.found ? 'Found' : 'Not found'}
          </p>
        )}
      </div>
    </div>
  )
}
