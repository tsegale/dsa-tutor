import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import type { DPTableState } from '@/engine/dpTable'
import { cn } from '@/lib/utils'

/**
 * A table being filled in, with arrows from the cells the current one is
 * computed from.
 *
 * Those arrows are the point. A dynamic programming recurrence written as
 * algebra is a line a student copies; drawn as "this cell, from those
 * cells", it is a shape they can read off the picture and reconstruct the
 * algebra from. Edit distance's cell reaching up, left and diagonally is
 * the clearest statement of what the three edit operations ARE.
 *
 * Shared by four topics - prefix sums, the monotonic stack's answer array,
 * and both dynamic programming topics - because they are the same picture
 * with different numbers of rows. A 1D table is one row; nothing else
 * changes.
 *
 * Unfilled cells are drawn, dimmed, from the first step: the table's shape
 * is a fact about the problem, not something that grows, and a canvas that
 * resized on every step would be unreadable. No brand colour anywhere -
 * this is a canvas, so every colour is an algorithm-state token.
 */

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

  // One cell size for both axes, so the table stays square-celled however
  // long the words are.
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
  const marked = new Set(state.marked)
  const [currentRow, currentCol] = state.current ?? [-1, -1]

  const inputCell = hasInput ? Math.max(MIN_CELL, Math.min(cell, Math.floor((width - 24) / state.input.length))) : 0

  // Read out as a sentence, so a screen reader gets the step rather than a
  // grid of numbers it cannot navigate.
  const canvasLabel = `${algorithmName}, step ${snapshot!.stepIndex + 1}: ${snapshot!.description}`

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center gap-2">
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Progress</span>
        <div className="h-1 w-[100px] overflow-hidden rounded-full bg-border">
          <div className={cn('h-full rounded-full', progressColorClass)} style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="tabular-nums text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
          {progressPercent}%
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto pt-9">
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

          {/* The problem input, above the table it is being read into. */}
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

          {/* Column headings. */}
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

          {/* Row headings, left off entirely for a single-row table, where
              the one label is noise next to the column headings. */}
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
                          : isFilled
                            ? 'var(--state-sorted)'
                            : 'var(--surface-sunk)'
                    }
                    stroke={isFilled || isCurrent || isDependency ? 'none' : 'var(--rule)'}
                    strokeWidth={1}
                    opacity={isFilled || isCurrent || isDependency ? 1 : 0.65}
                  />
                  <text
                    x={xOf(c) + (cell - 2) / 2}
                    y={centre(r, yOf) + 3}
                    textAnchor="middle"
                    className="font-mono text-[11px]"
                    fill={
                      isCurrent
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

          {/* The recurrence, drawn: one arrow per cell the current one
              reads. This is the only part of the picture that is not
              simply the data. */}
          {state.current &&
            state.dependsOn.map(([r, c]) => (
              <line
                key={`dep-${r}-${c}`}
                x1={centre(c, xOf)}
                y1={centre(r, yOf)}
                x2={centre(currentCol, xOf) + (c === currentCol ? 0 : c < currentCol ? -cell * 0.3 : cell * 0.3)}
                y2={centre(currentRow, yOf) + (r === currentRow ? 0 : r < currentRow ? -cell * 0.3 : cell * 0.3)}
                stroke="var(--state-compare)"
                strokeWidth={1.5}
                markerEnd="url(#dp-arrow)"
                opacity={0.9}
              />
            ))}

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
