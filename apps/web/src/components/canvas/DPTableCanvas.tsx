import { useAlgorithmStore, selectCurrentSnapshot, selectIsLiveJunction, selectProgressPercent } from '@/store/useAlgorithmStore'
import type { DPTableState } from '@/engine/dpTable'
import { cn } from '@/lib/utils'

interface DPTableCanvasProps {
  width?: number
  height?: number
}

const MIN_CELL = 26
const MAX_CELL = 52
const LABEL_GUTTER = 34
const INPUT_STRIP = 46

export default function DPTableCanvas({ width = 600, height = 400 }: DPTableCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const isLiveJunction = useAlgorithmStore(selectIsLiveJunction)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const progressPercent = useAlgorithmStore(selectProgressPercent)
  const state = snapshot?.dataStructureState as DPTableState | undefined

  if (!state || state.table.length === 0) {
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

  const rows = state.table.length
  const cols = state.table[0]?.length ?? 0
  const hasInput = state.input.length > 0
  const inputHeight = hasInput ? INPUT_STRIP : 0
  const progressColorClass =
    progressPercent >= 80 ? 'bg-state-sorted' : progressPercent >= 50 ? 'bg-state-compare' : 'bg-state-current'

  const cell = Math.max(
    MIN_CELL,
    Math.min(
      MAX_CELL,
      Math.floor((width - LABEL_GUTTER - 24) / Math.max(cols, 1)),
      Math.floor((height - inputHeight - LABEL_GUTTER - 70) / Math.max(rows, 1)),
    ),
  )

  const tableTop = inputHeight + LABEL_GUTTER + 14
  const tableLeft = LABEL_GUTTER + 8
  const xOf = (col: number) => tableLeft + col * cell
  const yOf = (row: number) => tableTop + row * cell
  const centre = (index: number, origin: (i: number) => number) => origin(index) + cell / 2

  const filled = new Set(state.filled.map(([r, c]) => `${r},${c}`))
  const dependsOn = new Set(state.dependsOn.map(([r, c]) => `${r},${c}`))
  const tracebackSet = new Set((state.traceback ?? []).map(([r, c]) => `${r},${c}`))
  const marked = new Set(state.marked)
  const [currentRow, currentCol] = state.current ?? [-1, -1]
  const hideOpLabels = Boolean(snapshot?.isPredictionRequired) && isLiveJunction
  const showEditOpLabels = rows > 1 && cols > 1 && state.dependsOn.length === 3 && cell >= 34 && !hideOpLabels

  const inputCell = hasInput ? Math.max(MIN_CELL, Math.min(cell, Math.floor((width - 24) / state.input.length))) : 0

  const canvasLabel = `${algorithmName}, step ${snapshot!.stepIndex + 1}: ${snapshot!.description}`
  const greedyActivities = state.activities
  const greedyLastFinish = state.lastFinish
  const monotonicStackFrames = state.stackFrames
  const stackPushes = state.pushes
  const stackPops = state.pops

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
          <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="tabular-nums text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
            {progressPercent}%
          </span>
        </div>
        {tracebackSet.size > 0 && (
          <span className="rounded bg-surface-sunk px-2 py-0.5 font-mono text-[10px] text-text-secondary dark:text-dark-text-secondary">
            optimal alignment path highlighted
          </span>
        )}
      </div>

      {monotonicStackFrames !== undefined && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 pt-9 pb-1.5 text-[11px] dark:border-dark-border">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-text-primary dark:text-dark-text-primary">Monotonic Stack (idx:val):</span>
            {monotonicStackFrames.length === 0 ? (
              <span className="font-mono text-[10px] text-text-muted">empty</span>
            ) : (
              monotonicStackFrames.map((frame, idx) => {
                const isTop = idx === monotonicStackFrames.length - 1
                return (
                  <span
                    key={frame.index}
                    className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-dark-border"
                    style={
                      isTop
                        ? { backgroundColor: 'var(--state-compare)', color: 'var(--state-compare-ink)', borderColor: 'transparent' }
                        : { backgroundColor: 'var(--surface-sunk)', color: 'var(--ink)' }
                    }
                  >
                    {`[${frame.index}]=${frame.value}`}
                  </span>
                )
              })
            )}
            {monotonicStackFrames.length > 0 && <span className="font-mono text-[9px] text-text-muted">&larr;top</span>}
          </div>
          <span className="font-mono text-[10px] text-text-muted">
            pushes: {stackPushes ?? 0} | pops: {stackPops ?? 0}
          </span>
        </div>
      )}

      {greedyActivities && greedyActivities.length > 0 && (
        <div className="flex shrink-0 flex-col gap-1 border-b border-border px-4 pt-9 pb-2 dark:border-dark-border">
          <div className="flex items-center justify-between text-[10px] text-text-secondary dark:text-dark-text-secondary">
            <span className="font-semibold text-text-primary dark:text-dark-text-primary">
              Interval Schedule Timeline (sorted by finish time)
            </span>
            <span className="font-mono">
              {greedyLastFinish !== null && greedyLastFinish !== undefined
                ? `Room free from t = ${greedyLastFinish}`
                : 'Room free from t = 0'}
            </span>
          </div>
          {(() => {
            const maxTime = Math.max(12, ...greedyActivities.map((a) => a.finish))
            return (
              <div className="relative flex flex-col gap-1 pt-1">
                {greedyActivities.map((act, idx) => {
                  const leftPct = (act.start / maxTime) * 100
                  const widthPct = Math.max(4, ((act.finish - act.start) / maxTime) * 100)
                  const isCurrent = idx === currentCol
                  const bg =
                    act.status === 'taken'
                      ? 'var(--state-sorted)'
                      : isCurrent
                        ? 'var(--state-compare)'
                        : 'var(--surface-sunk)'
                  const fg =
                    act.status === 'taken'
                      ? 'var(--state-sorted-ink)'
                      : isCurrent
                        ? 'var(--state-compare-ink)'
                        : 'var(--ink-2)'
                  return (
                    <div key={act.name} className="relative flex h-4 items-center">
                      <span className="w-5 shrink-0 font-mono text-[10px] font-semibold text-text-secondary">{act.name}</span>
                      <div className="relative h-3.5 flex-1 rounded bg-surface-sunk/40">
                        <div
                          className="absolute top-0 bottom-0 flex items-center justify-center rounded px-1 font-mono text-[9px] font-semibold transition-all"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: bg,
                            color: fg,
                            opacity: act.status === 'skipped' && !isCurrent ? 0.4 : 1,
                            textDecoration: act.status === 'skipped' ? 'line-through' : 'none',
                          }}
                        >
                          {`${act.start}-${act.finish}`}
                        </div>
                        {greedyLastFinish !== null && greedyLastFinish !== undefined && (
                          <div
                            className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-primary"
                            style={{ left: `${(greedyLastFinish / maxTime) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      <div className={cn('flex flex-1 items-center justify-center overflow-auto', !monotonicStackFrames && !greedyActivities && 'pt-9')}>
        <svg
          width={Math.max(tableLeft + cols * cell + 16, state.input.length * inputCell + 24)}
          height={tableTop + rows * cell + 46}
          role="img"
          aria-label={canvasLabel}
        >
          <defs>
            <marker id="dp-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0,1 L7,4 L0,7 Z" fill="var(--state-compare)" />
            </marker>
          </defs>

          {hasInput && (
            <g>
              {state.input.map((value, index) => (
                <g key={index}>
                  <rect
                    x={12 + index * inputCell}
                    y={10}
                    width={inputCell - 3}
                    height={24}
                    rx={3}
                    fill={marked.has(index) ? 'var(--state-current)' : 'var(--surface-sunk)'}
                    stroke="var(--rule)"
                    strokeWidth={1}
                  />
                  <text
                    x={12 + index * inputCell + (inputCell - 3) / 2}
                    y={25}
                    textAnchor="middle"
                    className="font-mono text-[10px]"
                    fill={marked.has(index) ? 'var(--state-current-ink)' : 'var(--ink-2)'}
                  >
                    {state.inputLabels?.[index] ?? value}
                  </text>
                </g>
              ))}
              {state.markerLabel && (
                <text x={12} y={44} className="fill-text-muted text-[10px] dark:fill-dark-text-secondary">
                  {`blue: ${state.markerLabel}`}
                </text>
              )}
            </g>
          )}

          {state.colLabels.map((label, col) => (
            <text
              key={`col-${col}`}
              x={centre(col, xOf)}
              y={tableTop - 7}
              textAnchor="middle"
              className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary"
            >
              {label}
            </text>
          ))}

          {rows > 1 &&
            state.rowLabels.map((label, row) => (
              <text
                key={`row-${row}`}
                x={tableLeft - 7}
                y={centre(row, yOf) + 3}
                textAnchor="end"
                className="fill-text-muted font-mono text-[10px] dark:fill-dark-text-secondary"
              >
                {label}
              </text>
            ))}

          {state.table.map((row, r) =>
            row.map((value, c) => {
              const key = `${r},${c}`
              const isCurrent = r === currentRow && c === currentCol
              const isDependency = dependsOn.has(key)
              const isFilled = filled.has(key)
              const onTraceback = tracebackSet.has(key)
              return (
                <g key={key}>
                  <rect
                    x={xOf(c)}
                    y={yOf(r)}
                    width={cell - 2}
                    height={cell - 2}
                    rx={2}
                    fill={
                      isCurrent
                        ? 'var(--state-current)'
                        : isDependency
                          ? 'var(--state-compare)'
                          : onTraceback
                            ? 'var(--state-current)'
                            : isFilled
                              ? 'var(--state-sorted)'
                              : 'var(--surface-sunk)'
                    }
                    stroke={onTraceback ? 'var(--ink)' : isFilled || isCurrent || isDependency ? 'none' : 'var(--rule)'}
                    strokeWidth={onTraceback ? 1.5 : 1}
                    opacity={isFilled || isCurrent || isDependency || onTraceback ? 1 : 0.65}
                  />
                  <text
                    x={xOf(c) + (cell - 2) / 2}
                    y={centre(r, yOf) + 3}
                    textAnchor="middle"
                    className="font-mono text-[11px]"
                    fill={
                      isCurrent || onTraceback
                        ? 'var(--state-current-ink)'
                        : isDependency
                          ? 'var(--state-compare-ink)'
                          : isFilled
                            ? 'var(--state-sorted-ink)'
                            : 'var(--ink-3)'
                    }
                  >
                    {value === null ? '' : value}
                  </text>
                </g>
              )
            }),
          )}

          {/* Optimal traceback polyline on final step */}
          {state.traceback && state.traceback.length > 1 && (
            <polyline
              points={state.traceback.map(([r, c]) => `${centre(c, xOf)},${centre(r, yOf)}`).join(' ')}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={1.75}
              strokeDasharray="4 2"
              opacity={0.75}
            />
          )}

          {/* Dependency arrows + optional operation tags */}
          {state.current &&
            state.dependsOn.map(([r, c]) => {
              const x1 = centre(c, xOf)
              const y1 = centre(r, yOf)
              const x2 = centre(currentCol, xOf) + (c === currentCol ? 0 : c < currentCol ? -cell * 0.3 : cell * 0.3)
              const y2 = centre(currentRow, yOf) + (r === currentRow ? 0 : r < currentRow ? -cell * 0.3 : cell * 0.3)
              const opTag =
                showEditOpLabels
                  ? r === currentRow - 1 && c === currentCol
                    ? 'del'
                    : r === currentRow && c === currentCol - 1
                      ? 'ins'
                      : r === currentRow - 1 && c === currentCol - 1
                        ? 'sub'
                        : null
                  : null
              return (
                <g key={`dep-${r}-${c}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--state-compare)"
                    strokeWidth={1.5}
                    markerEnd="url(#dp-arrow)"
                    opacity={0.9}
                  />
                  {opTag && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 2}
                      textAnchor="middle"
                      className="font-mono text-[8px] font-bold"
                      fill="var(--ink)"
                    >
                      {opTag}
                    </text>
                  )}
                </g>
              )
            })}

          {state.working && (
            <text
              x={tableLeft}
              y={tableTop + rows * cell + 20}
              className="fill-text-secondary font-mono text-[11px] dark:fill-dark-text-secondary"
            >
              {state.working}
            </text>
          )}
          {state.answer !== null && (
            <text
              x={tableLeft}
              y={tableTop + rows * cell + 38}
              className="fill-text-primary text-[12px] font-semibold dark:fill-dark-text-primary"
            >
              {`answer: ${state.answer}`}
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
