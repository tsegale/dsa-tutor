import { useMemo } from 'react'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { buildCallTree, liveStack, redundancy, type CallTreeNode } from '@/utils/callTree'
import { cn } from '@/lib/utils'

/**
 * The call tree, with the live stack beside it.
 *
 * Fibonacci rendered as a stack showed a column growing and shrinking: the
 * student never saw the branching, and never saw the same subproblem being
 * solved again. fib(6) makes 25 calls to answer a question with 7 distinct
 * answers, and that ratio is the whole reason memoisation exists. It is
 * the content of the topic, and a stack cannot show it.
 *
 * Two views, because they answer different questions. The tree is what the
 * run costs; the stack is where the program is right now. The whole tree is
 * drawn from the start, dimmed, and fills in as the student steps, so the
 * shape stays still and the growth is the only thing moving.
 *
 * No brand colour: this is a canvas, and every colour here is an algorithm
 * state token.
 */

interface RecursionTreeCanvasProps {
  width?: number
  height?: number
}

const NODE_RADIUS = 15
const MARGIN = { top: 34, right: 16, bottom: 20, left: 16 }
/** The stack drawer, when there is room for it beside the tree. */
const DRAWER_WIDTH = 150
const DRAWER_MIN_CANVAS_WIDTH = 520

function fillFor(node: CallTreeNode): string {
  if (node.pending) return 'var(--surface-sunk)'
  if (node.current) return 'var(--state-current)'
  if (node.live) return 'var(--state-compare)'
  return 'var(--state-sorted)'
}

function textFor(node: CallTreeNode): string {
  return node.pending ? 'var(--ink-3)' : 'var(--state-current-ink)'
}

export default function RecursionTreeCanvas({ width = 600, height = 400 }: RecursionTreeCanvasProps) {
  const snapshots = useAlgorithmStore((state) => state.snapshotArray)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)

  // Built from every snapshot, so the shape never shifts as the run
  // proceeds; only the node states change. See utils/callTree.ts.
  const tree = useMemo(() => buildCallTree(snapshots, stepIndex), [snapshots, stepIndex])
  const stack = useMemo(
    () => liveStack(snapshots, stepIndex).filter((frame) => frame.status !== 'returned'),
    [snapshots, stepIndex],
  )

  if (!tree) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted dark:text-dark-text-secondary">Load an algorithm to begin</span>
      </div>
    )
  }

  const showDrawer = width >= DRAWER_MIN_CANVAS_WIDTH
  const treeWidth = Math.max(160, width - MARGIN.left - MARGIN.right - (showDrawer ? DRAWER_WIDTH : 0))
  const treeHeight = Math.max(120, height - MARGIN.top - MARGIN.bottom)
  // columns counts leaf slots, so the last slot sits at columns - 1.
  const xStep = treeWidth / Math.max(tree.columns, 1)
  const yStep = treeHeight / Math.max(tree.rows, 1)
  const xOf = (node: CallTreeNode) => MARGIN.left + (node.x + 0.5) * xStep
  const yOf = (node: CallTreeNode) => MARGIN.top + (node.y + 0.5) * yStep
  const radius = Math.min(NODE_RADIUS, Math.max(7, xStep / 2 - 2), Math.max(7, yStep / 2 - 4))

  const { distinct, calls } = redundancy(tree)
  const byId = new Map(tree.nodes.map((node) => [node.id, node]))

  return (
    <svg width={width} height={height} role="img" aria-label={`Call tree: ${tree.callsSoFar} of ${calls} calls made`}>
      <text x={MARGIN.left} y={16} className="fill-text-muted text-[11px] dark:fill-dark-text-secondary">
        {`calls made: ${tree.callsSoFar} of ${calls}`}
      </text>
      {calls > distinct && (
        <text x={MARGIN.left} y={30} className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary">
          {`${calls} calls for ${distinct} distinct answers`}
        </text>
      )}

      {/* Edges first, so nodes sit on top of them. */}
      {tree.nodes.map((node) => {
        const parent = node.parentId ? byId.get(node.parentId) : undefined
        if (!parent) return null
        return (
          <line
            key={`edge-${node.id}`}
            x1={xOf(parent)}
            y1={yOf(parent) + radius}
            x2={xOf(node)}
            y2={yOf(node) - radius}
            stroke={node.pending ? 'var(--rule)' : 'var(--rule-strong)'}
            strokeWidth={1}
          />
        )
      })}

      {tree.nodes.map((node) => (
        <g key={node.id} aria-hidden="true">
          {/* A dashed ring marks a call whose answer the run already has.
              Drawing it on the node rather than in a legend keeps the
              repetition where the student is looking. */}
          {node.recomputed && !node.pending && (
            <circle
              cx={xOf(node)}
              cy={yOf(node)}
              r={radius + 3}
              fill="none"
              stroke="var(--state-error)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}
          <circle
            cx={xOf(node)}
            cy={yOf(node)}
            r={radius}
            fill={fillFor(node)}
            stroke={node.pending ? 'var(--rule)' : 'none'}
            strokeWidth={1}
            opacity={node.pending ? 0.6 : 1}
          />
          <text
            x={xOf(node)}
            y={yOf(node) + 3}
            textAnchor="middle"
            className="font-mono text-[10px]"
            fill={textFor(node)}
          >
            {node.argument}
          </text>
          {/* The answer, once there is one, under the node that found it. */}
          {node.returned && node.returnValue !== null && radius >= 10 && (
            <text
              x={xOf(node)}
              y={yOf(node) + radius + 9}
              textAnchor="middle"
              className="fill-text-muted font-mono text-[9px] dark:fill-dark-text-secondary"
            >
              {node.returnValue}
            </text>
          )}
        </g>
      ))}

      {showDrawer && (
        <g>
          <line
            x1={width - DRAWER_WIDTH}
            y1={MARGIN.top - 14}
            x2={width - DRAWER_WIDTH}
            y2={height - MARGIN.bottom}
            stroke="var(--rule)"
            strokeWidth={1}
          />
          <text
            x={width - DRAWER_WIDTH + 12}
            y={16}
            className="fill-text-muted text-[11px] dark:fill-dark-text-secondary"
          >
            {`stack: ${stack.length}`}
          </text>
          {/* Deepest call at the bottom, the way a stack grows. */}
          {stack.map((frame, index) => {
            const rowHeight = 22
            const y = height - MARGIN.bottom - (stack.length - index) * rowHeight
            if (y < MARGIN.top - 10) return null
            return (
              <g key={frame.id}>
                <rect
                  x={width - DRAWER_WIDTH + 12}
                  y={y}
                  width={DRAWER_WIDTH - 28}
                  height={rowHeight - 4}
                  rx={3}
                  fill={frame.status === 'active' ? 'var(--state-current)' : 'var(--surface-sunk)'}
                />
                <text
                  x={width - DRAWER_WIDTH + 20}
                  y={y + 13}
                  className={cn('font-mono text-[10px]')}
                  fill={frame.status === 'active' ? 'var(--state-current-ink)' : 'var(--ink-2)'}
                >
                  {`${frame.functionName}(${frame.argument})`}
                </text>
              </g>
            )
          })}
          {stack.length === 0 && (
            <text
              x={width - DRAWER_WIDTH + 12}
              y={height - MARGIN.bottom - 8}
              className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary"
            >
              empty
            </text>
          )}
        </g>
      )}
    </svg>
  )
}
