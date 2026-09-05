import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import type { BFSState } from '@/engine/bfs'

interface GraphCanvasProps {
  width?: number
  height?: number
}

const NODE_RADIUS = 22

// Fixed layout for the default 7-node BFS graph. A full force-directed
// or generic layout is Phase 17; this placeholder only needs to place
// the known default graph legibly.
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  A: { x: 340, y: 60 },
  B: { x: 200, y: 160 },
  C: { x: 480, y: 160 },
  D: { x: 120, y: 260 },
  E: { x: 280, y: 260 },
  F: { x: 420, y: 260 },
  G: { x: 400, y: 360 },
}

export default function GraphCanvas({ width = 600, height = 420 }: GraphCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const state = snapshot?.dataStructureState as BFSState | undefined

  // Guards against the transient render right after navigating to this
  // page, before setAlgorithm() has replaced the store's default
  // snapshot (whichever algorithm was last loaded) with a real BFS one
  // - dataStructureState briefly has some other shape with no `graph`
  // field at all, which Object.keys() below would otherwise throw on.
  if (!state || !state.graph) {
    return (
      <svg width={width} height={height} role="img" aria-label="Empty graph">
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

  const nodeIds = Object.keys(state.graph)
  const edges: { key: string; x1: number; y1: number; x2: number; y2: number }[] = []
  const seen = new Set<string>()
  for (const node of nodeIds) {
    const from = NODE_POSITIONS[node]
    if (!from) continue
    for (const neighbor of state.graph[node]) {
      const edgeKey = [node, neighbor].sort().join('-')
      if (seen.has(edgeKey)) continue
      seen.add(edgeKey)
      const to = NODE_POSITIONS[neighbor]
      if (!to) continue
      edges.push({ key: edgeKey, x1: from.x, y1: from.y, x2: to.x, y2: to.y })
    }
  }

  return (
    <svg width={width} height={height} role="img" aria-label="Graph for Breadth-First Search">
      {edges.map((edge) => (
        <line key={edge.key} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke="#c7c9e8" strokeWidth={2} />
      ))}
      {nodeIds.map((id) => {
        const pos = NODE_POSITIONS[id]
        if (!pos) return null
        const isCurrent = state.currentNode === id
        const isVisited = state.visited.includes(id)
        const isQueued = state.queue.includes(id)
        const fill = isCurrent ? '#f59e0b' : isVisited ? '#16a34a' : isQueued ? '#7c3aed' : '#c7c9e8'
        const textFill = isCurrent || isVisited || isQueued ? '#ffffff' : '#4a4d8a'
        return (
          <g key={id}>
            <circle cx={pos.x} cy={pos.y} r={NODE_RADIUS} fill={fill} />
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fill: textFill, fontSize: 14, fontWeight: 600 }}
            >
              {id}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
