import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlgorithmMode } from '@dsa-tutor/types'
import type { GraphAlgorithmState, GraphNode } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface NodeGraphCanvasProps {
  width?: number
  height?: number
}

const NODE_RADIUS = 32
const VIEWBOX_WIDTH = 700
const VIEWBOX_HEIGHT = 480

const DEFAULT_FILL = '#f1f5f9'
const DEFAULT_STROKE = '#94a3b8'
const DEFAULT_TEXT = '#334155'
const FRONTIER_FILL = '#fef3c7'
const FRONTIER_STROKE = '#f59e0b'
const FRONTIER_TEXT = '#78350f'
const CURRENT_FILL = '#f59e0b'
const CURRENT_TEXT = '#ffffff'
const VISITED_FILL = '#4338ca'
const VISITED_TEXT = '#ffffff'
const PATH_FILL = '#16a34a'
const PATH_TEXT = '#ffffff'
const START_LABEL = '#16a34a'
const TARGET_LABEL = '#7c3aed'
const EDGE_DEFAULT = '#cbd5e1'
const EDGE_CURRENT = '#f59e0b'
const EDGE_PATH = '#16a34a'
const EDGE_MST = '#d97706'

// Up to 8 distinct, colourblind-considerate colours for connected
// components - reused (cycling) if a graph somehow has more than 8.
const COMPONENT_COLOURS = ['#4338ca', '#16a34a', '#dc2626', '#0891b2', '#d97706', '#7c3aed', '#db2777', '#65a30d']

const LEGEND: { label: string; colour: string }[] = [
  { label: 'Current', colour: CURRENT_FILL },
  { label: 'Frontier', colour: FRONTIER_STROKE },
  { label: 'Visited', colour: VISITED_FILL },
  { label: 'Path', colour: PATH_FILL },
  { label: 'Unvisited', colour: DEFAULT_STROKE },
]

function isWeighted(adjacency: GraphAlgorithmState['adjacency']): adjacency is Record<string, { to: string; weight: number }[]> {
  for (const key in adjacency) {
    const entry = adjacency[key]
    return entry.length > 0 && typeof entry[0] !== 'string'
  }
  return false
}

function neighborsOf(adjacency: GraphAlgorithmState['adjacency'], id: string): { to: string; weight?: number }[] {
  const entry = adjacency[id] ?? []
  if (entry.length === 0) return []
  if (typeof entry[0] === 'string') return (entry as string[]).map((to) => ({ to }))
  return (entry as { to: string; weight: number }[]).map((e) => ({ to: e.to, weight: e.weight }))
}

export default function NodeGraphCanvas({ width = VIEWBOX_WIDTH, height = VIEWBOX_HEIGHT }: NodeGraphCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const stepIndex = useAlgorithmStore((s) => s.stepIndex)
  const mode = useAlgorithmStore((s) => s.mode)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as GraphAlgorithmState | undefined

  // Drag-to-reposition overrides, keyed by node id, in the same 0-1
  // normalised space as GraphNode.x/y. Separate from snapshot state
  // (which is immutable and re-derived per algorithm run) so repositioning
  // persists across step-forward/back within the same run, but naturally
  // resets when a new graph (different node id set) loads.
  const [dragOverrides, setDragOverrides] = useState<Record<string, { x: number; y: number }>>({})
  const dragNodeId = useRef<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const nodeIdSetKey = state ? state.nodes.map((n) => n.id).join(',') : ''
  const lastNodeIdSetKey = useRef(nodeIdSetKey)
  if (lastNodeIdSetKey.current !== nodeIdSetKey) {
    lastNodeIdSetKey.current = nodeIdSetKey
    if (Object.keys(dragOverrides).length > 0) setDragOverrides({})
  }

  const isInteractive = mode !== AlgorithmMode.PRACTICE && stepIndex === 0

  const progressColorClass = progressPercent >= 80 ? 'bg-success' : progressPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>()
    if (!state) return map
    for (const node of state.nodes) {
      const override = dragOverrides[node.id]
      const nx = override?.x ?? node.x
      const ny = override?.y ?? node.y
      map.set(node.id, { x: nx * width, y: ny * height })
    }
    return map
  }, [state, dragOverrides, width, height])

  const weighted = state ? isWeighted(state.adjacency) : false

  const edges = useMemo(() => {
    if (!state) return []
    const result: { key: string; from: string; to: string; weight?: number; x1: number; y1: number; x2: number; y2: number }[] = []
    const seen = new Set<string>()
    for (const node of state.nodes) {
      for (const { to, weight } of neighborsOf(state.adjacency, node.id)) {
        const key = state.directed ? `${node.id}->${to}` : [node.id, to].sort().join('-')
        if (!state.directed && seen.has(key)) continue
        seen.add(key)
        const from = positions.get(node.id)
        const target = positions.get(to)
        if (!from || !target) continue
        result.push({ key, from: node.id, to, weight, x1: from.x, y1: from.y, x2: target.x, y2: target.y })
      }
    }
    return result
  }, [state, positions])

  const pathEdgeKeys = useMemo(() => {
    if (!state) return new Set<string>()
    return new Set(
      state.pathEdges.map(([a, b]) => (state.directed ? `${a}->${b}` : [a, b].sort().join('-'))),
    )
  }, [state])

  const mstEdgeKeys = useMemo(() => {
    if (!state?.mstEdges) return new Set<string>()
    return new Set(state.mstEdges.map(([a, b]) => [a, b].sort().join('-')))
  }, [state])

  function handlePointerDown(nodeId: string) {
    if (!isInteractive) return
    dragNodeId.current = nodeId
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragNodeId.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const fy = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    setDragOverrides((prev) => ({ ...prev, [dragNodeId.current!]: { x: fx, y: fy } }))
  }

  function handlePointerUp() {
    dragNodeId.current = null
  }

  if (!state) {
    return (
      <svg width={width} height={height} role="img" aria-label="No algorithm loaded">
        <text x={width / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" className="fill-text-muted text-sm dark:fill-dark-text-secondary">
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  const startId = state.nodes[0]?.id ?? null
  const canvasLabel = `${algorithmName}, step ${snapshot!.stepIndex + 1}: ${snapshot!.description}`

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
          <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">{progressPercent}%</span>
        </div>
        <div className="flex items-center gap-3">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.colour }} aria-hidden="true" />
              <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <GraphStateStrip state={state} algorithmName={algorithmName} />

      <div className="flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="100%"
          role="img"
          aria-label={canvasLabel}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={EDGE_DEFAULT} />
            </marker>
          </defs>

          {edges.map((edge) => {
            const isPath = pathEdgeKeys.has(edge.key)
            const isMst = mstEdgeKeys.has(edge.key)
            const isCurrent = !isPath && !isMst && state.currentNode === edge.from && state.frontier.includes(edge.to)
            const stroke = isMst ? EDGE_MST : isPath ? EDGE_PATH : isCurrent ? EDGE_CURRENT : EDGE_DEFAULT
            const strokeWidth = isMst ? 4 : isPath ? 3 : isCurrent ? 3 : 2
            // Shorten the line so it stops at the node's edge rather than
            // its centre - otherwise a directed arrowhead lands underneath
            // the circle instead of pointing at it.
            const dx = edge.x2 - edge.x1
            const dy = edge.y2 - edge.y1
            const len = Math.hypot(dx, dy) || 1
            const x2 = edge.x2 - (dx / len) * (NODE_RADIUS + 2)
            const y2 = edge.y2 - (dy / len) * (NODE_RADIUS + 2)

            return (
              <g key={edge.key}>
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={state.directed ? x2 : edge.x2}
                  y2={state.directed ? y2 : edge.y2}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isCurrent ? '6 3' : undefined}
                  markerEnd={state.directed ? 'url(#arrowhead)' : undefined}
                />
                {weighted && edge.weight !== undefined && (
                  <g>
                    <rect
                      x={(edge.x1 + edge.x2) / 2 - 12}
                      y={(edge.y1 + edge.y2) / 2 - 9}
                      width={24}
                      height={18}
                      rx={9}
                      // Knockout behind the weight must match the canvas card,
                      // or dark mode paints light text on a white pill.
                      fill="var(--card)"
                      stroke={EDGE_DEFAULT}
                      strokeWidth={1}
                    />
                    <text
                      x={(edge.x1 + edge.x2) / 2}
                      y={(edge.y1 + edge.y2) / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-text-primary text-[10px] font-semibold dark:fill-dark-text-primary"
                    >
                      {edge.weight}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {state.nodes.map((node) => (
            <GraphNodeCircle
              key={node.id}
              node={node}
              pos={positions.get(node.id) ?? { x: node.x * width, y: node.y * height }}
              state={state}
              isStart={node.id === startId}
              interactive={isInteractive}
              prefersReducedMotion={prefersReducedMotion}
              onPointerDown={() => handlePointerDown(node.id)}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

function GraphNodeCircle({
  node,
  pos,
  state,
  isStart,
  interactive,
  prefersReducedMotion,
  onPointerDown,
}: {
  node: GraphNode
  pos: { x: number; y: number }
  state: GraphAlgorithmState
  isStart: boolean
  interactive: boolean
  prefersReducedMotion: boolean
  onPointerDown: () => void
}) {
  const isCurrent = state.currentNode === node.id
  const isPath = !isCurrent && state.pathNodes.includes(node.id)
  const isVisited = !isCurrent && !isPath && state.visited.includes(node.id)
  const isFrontier = !isCurrent && !isPath && !isVisited && state.frontier.includes(node.id)
  const isTarget = state.pathNodes.length > 0 ? node.id === state.pathNodes[state.pathNodes.length - 1] : false
  const componentColour =
    state.components && state.components[node.id] !== undefined
      ? COMPONENT_COLOURS[state.components[node.id] % COMPONENT_COLOURS.length]
      : null

  const fill = componentColour
    ? componentColour
    : isCurrent
      ? CURRENT_FILL
      : isPath
        ? PATH_FILL
        : isVisited
          ? VISITED_FILL
          : isFrontier
            ? FRONTIER_FILL
            : DEFAULT_FILL
  const textFill = componentColour
    ? '#ffffff'
    : isCurrent
      ? CURRENT_TEXT
      : isPath
        ? PATH_TEXT
        : isVisited
          ? VISITED_TEXT
          : isFrontier
            ? FRONTIER_TEXT
            : DEFAULT_TEXT
  const stroke = isFrontier && !componentColour ? FRONTIER_STROKE : DEFAULT_STROKE

  const distance = state.distances?.[node.id]
  const discovery = state.discoveryTime?.[node.id]
  const finish = state.finishTime?.[node.id]
  const topoIndex = state.topoOrder?.indexOf(node.id)

  return (
    <motion.g
      style={{ x: pos.x, y: pos.y, cursor: interactive ? 'grab' : 'default' }}
      onPointerDown={onPointerDown}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeInOut' }}
    >
      {isTarget && (
        <circle r={NODE_RADIUS + 6} fill="none" stroke={TARGET_LABEL} strokeWidth={2} strokeDasharray="4 3" />
      )}
      <motion.circle
        r={NODE_RADIUS}
        stroke={stroke}
        strokeWidth={isFrontier ? 2.5 : isPath ? 3 : 1.5}
        animate={{ fill }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
      />
      <text textAnchor="middle" dominantBaseline="central" style={{ fill: textFill, fontSize: 14, fontWeight: 600 }}>
        {node.label}
      </text>
      {discovery !== undefined && (
        <text textAnchor="middle" y={NODE_RADIUS - 8} style={{ fill: textFill, fontSize: 8, fontFamily: 'monospace' }}>
          {finish !== undefined ? `${discovery}/${finish}` : `${discovery}/-`}
        </text>
      )}
      {topoIndex !== undefined && topoIndex >= 0 && (
        <g>
          <circle cx={NODE_RADIUS - 4} cy={-NODE_RADIUS + 4} r={9} fill="#1f2937" />
          <text x={NODE_RADIUS - 4} y={-NODE_RADIUS + 4} textAnchor="middle" dominantBaseline="central" style={{ fill: '#ffffff', fontSize: 9, fontWeight: 700 }}>
            {topoIndex + 1}
          </text>
        </g>
      )}
      {distance !== undefined && (
        <text textAnchor="middle" y={NODE_RADIUS + 16} className="fill-text-muted text-[10px] dark:fill-dark-text-secondary">
          {distance === Infinity ? 'dist=∞' : `dist=${distance}`}
        </text>
      )}
      {isStart && (
        <text textAnchor="middle" y={NODE_RADIUS + (distance !== undefined ? 30 : 16)} style={{ fill: START_LABEL, fontSize: 10, fontWeight: 600 }}>
          Start
        </text>
      )}
      {isTarget && (
        <text textAnchor="middle" y={NODE_RADIUS + (distance !== undefined ? 30 : 16)} style={{ fill: TARGET_LABEL, fontSize: 10, fontWeight: 600 }}>
          Target
        </text>
      )}
    </motion.g>
  )
}

/** Compact horizontal strip above the canvas showing algorithm-specific
 * live state - the queue/stack contents, MST running cost, or the
 * topological order built so far. */
function GraphStateStrip({ state, algorithmName }: { state: GraphAlgorithmState; algorithmName: string }) {
  const lower = algorithmName.toLowerCase()

  let content: React.ReactNode = null
  if (state.mstEdges !== undefined) {
    content = (
      <span>
        MST cost so far: <strong>{state.mstCost ?? 0}</strong> ({state.mstEdges.length} edge{state.mstEdges.length === 1 ? '' : 's'})
      </span>
    )
  } else if (state.topoOrder !== undefined) {
    content = <span>Order so far: {state.topoOrder.length > 0 ? state.topoOrder.join(' → ') : '—'}</span>
  } else if (lower.includes('dijkstra') || lower.includes('bellman')) {
    const shown = 3
    const top = state.frontier
      .slice(0, shown)
      .map((id) => `(${id}, ${state.distances?.[id] === Infinity ? '∞' : (state.distances?.[id] ?? '?')})`)
    const remaining = state.frontier.length - shown
    content = (
      <span>
        Priority queue: [{top.join(', ')}
        {remaining > 0 ? `, +${remaining} more` : ''}]
      </span>
    )
  } else {
    content = <span>{lower.includes('dfs') ? 'Stack' : 'Queue'}: [{state.frontier.join(', ')}]</span>
  }

  return (
    <div className="shrink-0 border-b border-border px-3 pt-9 pb-1.5 text-[11px] text-text-secondary dark:border-dark-border dark:text-dark-text-secondary">
      {content}
      <span className="ml-3 text-text-muted dark:text-dark-text-secondary">Visited: {state.visited.length}</span>
    </div>
  )
}
