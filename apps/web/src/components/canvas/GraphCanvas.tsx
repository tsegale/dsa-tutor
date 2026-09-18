import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import type { BFSState } from '@/engine/bfs'

interface GraphCanvasProps {
  width?: number
  height?: number
}

const NODE_RADIUS = 26
const TARGET_RING_RADIUS = 32

// Fixed layout for the default 7-node BFS graph, in a fixed 680x480
// coordinate space. The <svg> below scales this space to the actual
// container size via viewBox + width/height="100%" rather than
// multiplying every coordinate by a JS scale factor - the browser
// handles the resize, so there's nothing to recompute when the panel
// is resized or measured at 0 on first render.
const VIEWBOX_WIDTH = 680
const VIEWBOX_HEIGHT = 480

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  A: { x: 340, y: 60 },
  B: { x: 180, y: 170 },
  C: { x: 500, y: 170 },
  D: { x: 80, y: 300 },
  E: { x: 270, y: 300 },
  F: { x: 460, y: 300 },
  G: { x: 390, y: 410 },
}

// Same fixed-hex-palette rationale as TreeCanvas: these are animated
// via Framer's `animate={{ fill }}`, which needs literal colour
// values, and this palette was already verified legible in dark mode.
const DEFAULT_FILL = '#ffffff'
const DEFAULT_STROKE = '#cbd5e1'
const DEFAULT_TEXT = '#0f172a'
const CURRENT_FILL = '#f59e0b'
const CURRENT_TEXT = '#78350f'
const VISITED_FILL = '#16a34a'
const VISITED_TEXT = '#ffffff'
const QUEUED_FILL = 'rgba(55, 48, 163, 0.7)'
const QUEUED_TEXT = '#ffffff'
const TARGET_RING = '#7c3aed'
const FOUND_PATH_EDGE = '#16a34a'
const TRAVERSED_EDGE = '#3730a3'

const LEGEND: { label: string; colour: string }[] = [
  { label: 'Currently processing', colour: CURRENT_FILL },
  { label: 'In queue', colour: '#3730a3' },
  { label: 'Visited', colour: VISITED_FILL },
  { label: 'Unvisited', colour: DEFAULT_STROKE },
]

export default function GraphCanvas({ width = VIEWBOX_WIDTH, height = VIEWBOX_HEIGHT }: GraphCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const stepIndex = useAlgorithmStore((s) => s.stepIndex)
  const snapshotArray = useAlgorithmStore((s) => s.snapshotArray)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as BFSState | undefined
  const prevState =
    stepIndex > 0 ? (snapshotArray[stepIndex - 1]?.dataStructureState as BFSState | undefined) : undefined

  // The edge "just traversed" this step: the one node newly added to
  // the queue since the previous snapshot, connected back to the
  // current node (the one whose neighbours are being explored). Diffed
  // against the previous snapshot's queue rather than parsed out of the
  // description text, so it stays correct regardless of wording.
  const traversedEdge = useMemo(() => {
    if (!state || !prevState || !state.currentNode) return null
    const prevQueue = new Set(prevState.queue)
    const newlyQueued = state.queue.filter((n) => !prevQueue.has(n))
    return newlyQueued.length === 1 ? { from: state.currentNode, to: newlyQueued[0] } : null
  }, [state, prevState])

  const progressColorClass = progressPercent >= 80 ? 'bg-success' : progressPercent >= 50 ? 'bg-secondary' : 'bg-primary'

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
  const edges: { key: string; a: string; b: string; x1: number; y1: number; x2: number; y2: number }[] = []
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
      edges.push({ key: edgeKey, a: node, b: neighbor, x1: from.x, y1: from.y, x2: to.x, y2: to.y })
    }
  }

  const foundPathEdgeKeys = new Set(
    state.foundPath.slice(0, -1).map((node, i) => [node, state.foundPath[i + 1]].sort().join('-')),
  )
  const traversedEdgeKey = traversedEdge ? [traversedEdge.from, traversedEdge.to].sort().join('-') : null

  const canvasLabel = `${algorithmName}, step ${snapshot!.stepIndex + 1}: ${snapshot!.description}`

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
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <span className="size-2 rounded-sm" style={{ backgroundColor: item.colour }} aria-hidden="true" />
              <span className="text-[10px] text-text-secondary dark:text-dark-text-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 pt-8">
        <div className="flex items-center gap-2 px-3">
          <span className="text-11 tracking-wider-caps text-text-muted dark:text-dark-text-secondary">Queue:</span>
          <div className="flex items-center gap-1.5">
            <AnimatePresence initial={false}>
              {state.queue.map((id, i) => (
                <motion.span
                  key={id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.25 }}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md border text-[12px] font-medium',
                    i === 0 ? 'border-primary bg-primary text-white' : 'border-primary text-primary',
                  )}
                >
                  {id}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3 pt-1 pb-1 text-11 text-text-muted dark:text-dark-text-secondary">
          <span>Visited: {state.visited.length > 0 ? state.visited.join(', ') : '—'}</span>
          <span>Level: {state.level}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          role="img"
          aria-label={canvasLabel}
        >
          {edges.map((edge) => {
            const isFoundPathEdge = foundPathEdgeKeys.has(edge.key)
            const isTraversedEdge = !isFoundPathEdge && traversedEdgeKey === edge.key
            return (
              <g key={edge.key}>
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={isFoundPathEdge ? FOUND_PATH_EDGE : DEFAULT_STROKE}
                  strokeWidth={isFoundPathEdge ? 2.5 : 1.5}
                />
                {isTraversedEdge && (
                  <motion.line
                    key={`${edge.key}-${stepIndex}`}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={TRAVERSED_EDGE}
                    strokeWidth={2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: 'easeInOut' }}
                  />
                )}
              </g>
            )
          })}

          {nodeIds.map((id) => {
            const pos = NODE_POSITIONS[id]
            if (!pos) return null
            // Once the search concludes successfully, the engine's final
            // snapshot still has currentNode pointing at the target (it
            // was current the instant it got dequeued and found) - `found`
            // distinguishes "actively processing" from "the run is over",
            // so the target settles into visited/green instead of staying
            // amber forever after a successful search.
            // Before the first dequeue, currentNode is still null (the
            // engine only sets it once the start node is actually
            // processed) - without this, the start node renders as
            // merely "queued" (translucent) on the very first step
            // instead of standing out as the node about to be explored.
            const isFirstStep = state.currentNode === null && state.visited.length === 0
            const isCurrent =
              (state.currentNode === id || (isFirstStep && id === state.startNode)) && !state.found
            const isVisited = state.visited.includes(id)
            const isQueued = !isVisited && state.queue.includes(id)
            const isTarget = id === state.targetNode && !isVisited
            const fill = isCurrent ? CURRENT_FILL : isVisited ? VISITED_FILL : isQueued ? QUEUED_FILL : DEFAULT_FILL
            const textFill = isCurrent ? CURRENT_TEXT : isVisited ? VISITED_TEXT : isQueued ? QUEUED_TEXT : DEFAULT_TEXT

            return (
              <g key={id}>
                {isTarget && (
                  <circle cx={pos.x} cy={pos.y} r={TARGET_RING_RADIUS} fill="none" stroke={TARGET_RING} strokeWidth={3} />
                )}
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS}
                  stroke={DEFAULT_STROKE}
                  strokeWidth={fill === DEFAULT_FILL ? 1.5 : 0}
                  animate={{ fill }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fill: textFill, fontSize: 14, fontWeight: 500 }}
                >
                  {id}
                </text>
                {id === state.startNode && (
                  <text
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 14}
                    textAnchor="middle"
                    style={{ fill: VISITED_FILL, fontSize: 10, fontWeight: 600 }}
                  >
                    Start
                  </text>
                )}
                {id === state.targetNode && (
                  <text
                    x={pos.x}
                    y={pos.y + NODE_RADIUS + 14}
                    textAnchor="middle"
                    style={{ fill: TARGET_RING, fontSize: 10, fontWeight: 600 }}
                  >
                    Target
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
