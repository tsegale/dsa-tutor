import { useMemo } from 'react'
import { useAlgorithmStore, selectIsLiveJunction } from '@/store/useAlgorithmStore'
import { buildCallTree, liveStack, redundancy, type CallTreeNode } from '@/utils/callTree'
import type { CallStackState } from '@/engine/recursionFactorial'
import type { NQueensBoardState } from '@/engine/backtracking'
import { cn } from '@/lib/utils'

interface RecursionTreeCanvasProps {
  width?: number
  height?: number
}

const NODE_RADIUS = 15
const MARGIN = { top: 38, right: 16, bottom: 20, left: 16 }
const DRAWER_WIDTH = 154
const BOARD_DRAWER_WIDTH = 192
const DRAWER_MIN_CANVAS_WIDTH = 500

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
  const isLiveJunction = useAlgorithmStore(selectIsLiveJunction)

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

  const currentSnapshot = snapshots[stepIndex]
  const currentState = currentSnapshot?.dataStructureState as
    | (CallStackState & { nQueensBoard?: NQueensBoardState })
    | undefined
  const nQueensBoard = currentState?.nQueensBoard
  const isMemoized = currentState?.memoized === true
  const cacheHits = currentState?.cacheHits ?? 0
  const memoEntries = currentState?.computedValues
    ? Object.entries(currentState.computedValues).sort(([a], [b]) => Number(a) - Number(b))
    : []

  const hidePruneLeak =
    Boolean(currentSnapshot?.isPredictionRequired) &&
    isLiveJunction &&
    currentSnapshot?.criticalJunctionType === 'PRUNE_BRANCH'

  const sidePanelWidth = nQueensBoard ? BOARD_DRAWER_WIDTH : DRAWER_WIDTH
  const showDrawer = width >= DRAWER_MIN_CANVAS_WIDTH
  const topOffset = isMemoized ? MARGIN.top + 18 : MARGIN.top
  const treeWidth = Math.max(160, width - MARGIN.left - MARGIN.right - (showDrawer ? sidePanelWidth : 0))
  const treeHeight = Math.max(120, height - topOffset - MARGIN.bottom)
  const xStep = treeWidth / Math.max(tree.columns, 1)
  const yStep = treeHeight / Math.max(tree.rows, 1)
  const xOf = (node: CallTreeNode) => MARGIN.left + (node.x + 0.5) * xStep
  const yOf = (node: CallTreeNode) => topOffset + (node.y + 0.5) * yStep
  const radius = Math.min(NODE_RADIUS, Math.max(7, xStep / 2 - 2), Math.max(7, yStep / 2 - 4))

  const { distinct, calls } = redundancy(tree)
  const runFinished = stepIndex >= snapshots.length - 1 || tree.callsSoFar >= calls
  const repeatsMatter = currentState?.highlightRepeats === true
  const byId = new Map(tree.nodes.map((node) => [node.id, node]))

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={
        runFinished ? `Call tree: ${tree.callsSoFar} of ${calls} calls made` : `Call tree: ${tree.callsSoFar} calls made so far`
      }
    >
      <text x={MARGIN.left} y={16} className="fill-text-muted text-[11px] dark:fill-dark-text-secondary">
        {runFinished ? `calls made: ${tree.callsSoFar} of ${calls}` : `calls made: ${tree.callsSoFar}`}
        {isMemoized ? ` · cache hits: ${cacheHits}` : ''}
      </text>
      {runFinished && repeatsMatter && calls > distinct && (
        <text x={MARGIN.left} y={30} className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary">
          {`${calls} calls for ${distinct} distinct answers`}
        </text>
      )}

      {/* Memoization cache strip */}
      {isMemoized && (
        <g>
          <text x={MARGIN.left} y={32} className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary">
            memo:
          </text>
          {memoEntries.length === 0 ? (
            <text x={MARGIN.left + 38} y={32} className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary">
              empty
            </text>
          ) : (
            memoEntries.slice(0, 9).map(([k, v], idx) => {
              const px = MARGIN.left + 38 + idx * 42
              return (
                <g key={`memo-${k}`}>
                  <rect
                    x={px}
                    y={21}
                    width={38}
                    height={15}
                    rx={4}
                    fill="var(--surface-sunk)"
                    stroke="var(--state-sorted)"
                    strokeWidth={1}
                  />
                  <text
                    x={px + 19}
                    y={29}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-text-primary font-mono text-[9px] dark:fill-dark-text-primary"
                  >
                    {`${k}:${v}`}
                  </text>
                </g>
              )
            })
          )}
        </g>
      )}

      {/* Edges */}
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

      {/* Nodes */}
      {tree.nodes.map((node) => (
        <g key={node.id} aria-hidden="true">
          {repeatsMatter && node.recomputed && !node.pending && (
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
          {isMemoized && node.recomputed && !node.pending && (
            <circle
              cx={xOf(node)}
              cy={yOf(node)}
              r={radius + 3}
              fill="none"
              stroke="var(--state-sorted)"
              strokeWidth={1.5}
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
          <text x={xOf(node)} y={yOf(node) + 3} textAnchor="middle" className="font-mono text-[10px]" fill={textFor(node)}>
            {node.label ?? node.argument}
          </text>
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

      {/* Side drawer: N-Queens chessboard OR live call stack */}
      {showDrawer && nQueensBoard ? (
        (() => {
          const panelLeft = width - sidePanelWidth
          const n = Math.max(4, nQueensBoard.size)
          const availW = sidePanelWidth - 28
          const availH = Math.max(120, height - 92)
          const sq = Math.max(18, Math.floor(Math.min(availW, availH) / n))
          const boardOriginX = panelLeft + 18
          const boardOriginY = 38
          const cellCenter = (r: number, c: number) => ({
            cx: boardOriginX + c * sq + sq / 2,
            cy: boardOriginY + r * sq + sq / 2,
          })

          return (
            <g>
              <line x1={panelLeft} y1={14} x2={panelLeft} y2={height - MARGIN.bottom} stroke="var(--rule)" strokeWidth={1} />
              <text x={boardOriginX} y={18} className="fill-text-primary text-[11px] font-semibold dark:fill-dark-text-primary">
                {`${n}-Queens Board`}
              </text>
              <text x={boardOriginX} y={30} className="fill-text-muted font-mono text-[9px] dark:fill-dark-text-secondary">
                {`solutions: ${nQueensBoard.solutions.length}`}
              </text>

              {Array.from({ length: n }, (_, r) =>
                Array.from({ length: n }, (__, c) => {
                  const isDark = (r + c) % 2 === 1
                  const hasQueen = nQueensBoard.queens[r] === c
                  const isTrying = nQueensBoard.tryingCell?.[0] === r && nQueensBoard.tryingCell?.[1] === c
                  const isAttacker =
                    !hidePruneLeak && nQueensBoard.attackingQueen?.[0] === r && nQueensBoard.attackingQueen?.[1] === c
                  const sx = boardOriginX + c * sq
                  const sy = boardOriginY + r * sq
                  return (
                    <g key={`sq-${r}-${c}`}>
                      <rect
                        x={sx}
                        y={sy}
                        width={sq}
                        height={sq}
                        fill={isDark ? 'var(--surface-sunk)' : 'var(--surface)'}
                        stroke={isTrying ? 'var(--state-compare)' : 'var(--rule)'}
                        strokeWidth={isTrying ? 1.75 : 0.75}
                      />
                      {hasQueen && (
                        <g>
                          <circle
                            cx={sx + sq / 2}
                            cy={sy + sq / 2}
                            r={Math.max(6, sq * 0.36)}
                            fill={isAttacker ? 'var(--state-error)' : 'var(--state-sorted)'}
                          />
                          <text
                            x={sx + sq / 2}
                            y={sy + sq / 2 + 0.5}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{
                              fill: isAttacker ? 'var(--state-error-ink)' : 'var(--state-sorted-ink)',
                              fontSize: Math.max(9, sq * 0.45),
                              fontWeight: 700,
                            }}
                          >
                            Q
                          </text>
                        </g>
                      )}
                      {!hasQueen && isTrying && (
                        <g>
                          <circle cx={sx + sq / 2} cy={sy + sq / 2} r={Math.max(5, sq * 0.3)} fill="var(--state-compare)" />
                          <text
                            x={sx + sq / 2}
                            y={sy + sq / 2 + 0.5}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ fill: 'var(--state-compare-ink)', fontSize: Math.max(8, sq * 0.4), fontWeight: 700 }}
                          >
                            ?
                          </text>
                        </g>
                      )}
                    </g>
                  )
                }),
              )}

              {/* Attack ray when conflict is revealed */}
              {!hidePruneLeak &&
                nQueensBoard.attackingQueen &&
                nQueensBoard.tryingCell &&
                (() => {
                  const from = cellCenter(nQueensBoard.attackingQueen[0], nQueensBoard.attackingQueen[1])
                  const to = cellCenter(nQueensBoard.tryingCell[0], nQueensBoard.tryingCell[1])
                  return (
                    <>
                      <line
                        x1={from.cx}
                        y1={from.cy}
                        x2={to.cx}
                        y2={to.cy}
                        stroke="var(--state-error)"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                      />
                      <text
                        x={boardOriginX}
                        y={boardOriginY + n * sq + 15}
                        className="fill-error font-mono text-[9px] font-semibold"
                      >
                        {`conflict (${nQueensBoard.attackingQueen[0]},${nQueensBoard.attackingQueen[1]}) -> prune`}
                      </text>
                    </>
                  )
                })()}
            </g>
          )
        })()
      ) : showDrawer ? (
        <g>
          <line
            x1={width - sidePanelWidth}
            y1={MARGIN.top - 14}
            x2={width - sidePanelWidth}
            y2={height - MARGIN.bottom}
            stroke="var(--rule)"
            strokeWidth={1}
          />
          <text x={width - sidePanelWidth + 12} y={16} className="fill-text-muted text-[11px] dark:fill-dark-text-secondary">
            {`stack: ${stack.length}`}
          </text>
          {stack.map((frame, index) => {
            const rowHeight = 22
            const y = height - MARGIN.bottom - (stack.length - index) * rowHeight
            if (y < MARGIN.top - 10) return null
            return (
              <g key={frame.id}>
                <rect
                  x={width - sidePanelWidth + 12}
                  y={y}
                  width={sidePanelWidth - 28}
                  height={rowHeight - 4}
                  rx={3}
                  fill={frame.status === 'active' ? 'var(--state-current)' : 'var(--surface-sunk)'}
                />
                <text
                  x={width - sidePanelWidth + 20}
                  y={y + 13}
                  className={cn('font-mono text-[10px]')}
                  fill={frame.status === 'active' ? 'var(--state-current-ink)' : 'var(--ink-2)'}
                >
                  {`${frame.functionName}(${frame.label ?? frame.argument})`}
                </text>
              </g>
            )
          })}
          {stack.length === 0 && (
            <text
              x={width - sidePanelWidth + 12}
              y={height - MARGIN.bottom - 8}
              className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary"
            >
              empty
            </text>
          )}
        </g>
      ) : null}
    </svg>
  )
}
