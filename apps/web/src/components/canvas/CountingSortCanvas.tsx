import { useMemo } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import type { CountingSortState } from '@/engine/countingSort'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'

interface CountingSortCanvasProps {
  width?: number
  height?: number
}

const PADDING = 24
const ROW_GAP = 12
const LABEL_WIDTH = 64
const BOX_HEIGHT = 40

const NEUTRAL_FILL = '#c7c9e8'
const NEUTRAL_TEXT = '#4a4d8a'
const ACTIVE_FILL = '#f59e0b'
const ACTIVE_TEXT = '#78350f'
const DONE_FILL = '#16a34a'
const DONE_TEXT = '#ffffff'
const EMPTY_FILL = 'none'
const EMPTY_STROKE = '#c7c9e8'

function Row({
  label,
  values,
  y,
  height,
  width,
  cellColor,
  emptyLabel,
}: {
  label: string
  values: (number | string | null)[]
  y: number
  height: number
  width: number
  cellColor: (index: number, value: number | string | null) => { fill: string; text: string; isGhost: boolean }
  emptyLabel: string
}) {
  const rowWidth = Math.max(width - LABEL_WIDTH - PADDING, 40)
  const xScale = d3
    .scaleBand<number>()
    .domain(values.map((_, i) => i))
    .range([0, rowWidth])
    .paddingInner(0.15)
  const bandwidth = Math.min(xScale.bandwidth(), 56)

  return (
    <g transform={`translate(${PADDING}, ${y})`}>
      <text x={0} y={height / 2 + 4} className="fill-text-secondary text-[11px] font-semibold dark:fill-dark-text-secondary">
        {label}
      </text>
      {values.length === 0 ? (
        <text x={LABEL_WIDTH} y={height / 2 + 4} className="fill-text-muted text-[11px] italic dark:fill-dark-text-secondary">
          {emptyLabel}
        </text>
      ) : (
        values.map((value, index) => {
          const x = LABEL_WIDTH + (xScale(index) ?? 0)
          const { fill, text, isGhost } = cellColor(index, value)
          return (
            <motion.g key={index} layout transition={{ duration: 0.3, ease: 'easeInOut' }}>
              <rect
                x={x}
                y={(height - BOX_HEIGHT) / 2}
                width={bandwidth}
                height={BOX_HEIGHT}
                rx={6}
                fill={isGhost ? EMPTY_FILL : fill}
                stroke={isGhost ? EMPTY_STROKE : 'none'}
                strokeDasharray={isGhost ? '4 3' : undefined}
              />
              <text
                x={x + bandwidth / 2}
                y={height / 2 + 4}
                textAnchor="middle"
                className="text-[12px] font-medium"
                style={{ fill: isGhost ? EMPTY_STROKE : text }}
              >
                {value === null ? '' : value}
              </text>
              <text
                x={x + bandwidth / 2}
                y={(height - BOX_HEIGHT) / 2 - 4}
                textAnchor="middle"
                className="fill-text-muted text-[9px] dark:fill-dark-text-secondary"
              >
                {index}
              </text>
            </motion.g>
          )
        })
      )}
    </g>
  )
}

/**
 * Counting Sort's three-row canvas: the input array, the count/prefix
 * array (index = value, cell = running count), and the output array
 * being filled in. Reused ArrayCanvas doesn't fit here since Counting
 * Sort has three parallel arrays of different lengths and meanings
 * rather than one array of bars.
 */
export default function CountingSortCanvas({ width = 600, height = 300 }: CountingSortCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((s) => s.algorithmName)

  const state = useMemo(() => {
    const raw = snapshot?.dataStructureState
    if (!raw || typeof raw !== 'object') return null
    return raw as CountingSortState
  }, [snapshot])

  if (!snapshot || !state) {
    return (
      <svg width={width} height={height} role="img" aria-label="No algorithm loaded">
        <text x={width / 2} y={height / 2} textAnchor="middle" className="fill-text-muted text-sm dark:fill-dark-text-secondary">
          Load an algorithm to begin
        </text>
      </svg>
    )
  }

  const rowHeight = (height - PADDING * 2 - ROW_GAP * 2) / 3
  const inputRowY = PADDING
  const countRowY = inputRowY + rowHeight + ROW_GAP
  const outputRowY = countRowY + rowHeight + ROW_GAP

  // Never read the outcome-revealing description while a prediction is
  // pending - a screen reader user must not hear the answer.
  const narration = snapshot.isPredictionRequired
    ? getPromptForSnapshot(snapshot, algorithmName)
    : snapshot.description

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`Counting Sort, step ${snapshot.stepIndex + 1}: ${narration}`}
    >
      <Row
        label="Input →"
        values={state.input}
        y={inputRowY}
        height={rowHeight}
        width={width}
        emptyLabel="(empty)"
        cellColor={(index) => {
          const isActive = state.phase === 'COUNT' && index === state.currentInputIndex
          const isPlacing = state.phase === 'PLACE' && index === state.currentInputIndex
          if (isActive || isPlacing) return { fill: ACTIVE_FILL, text: ACTIVE_TEXT, isGhost: false }
          return { fill: NEUTRAL_FILL, text: NEUTRAL_TEXT, isGhost: false }
        }}
      />

      <Row
        label="Count →"
        values={state.count}
        y={countRowY}
        height={rowHeight}
        width={width}
        emptyLabel="(empty)"
        cellColor={(index) => {
          const isActive =
            (state.phase === 'COUNT' && state.currentInputIndex >= 0 && index === state.input[state.currentInputIndex]) ||
            ((state.phase === 'PREFIX' || state.phase === 'PLACE') && index === state.currentCountIndex)
          if (isActive) return { fill: ACTIVE_FILL, text: ACTIVE_TEXT, isGhost: false }
          return { fill: NEUTRAL_FILL, text: NEUTRAL_TEXT, isGhost: false }
        }}
      />

      <Row
        label="Output →"
        values={state.output}
        y={outputRowY}
        height={rowHeight}
        width={width}
        emptyLabel="(empty)"
        cellColor={(_index, value) => {
          if (value === null) return { fill: EMPTY_FILL, text: EMPTY_STROKE, isGhost: true }
          return { fill: DONE_FILL, text: DONE_TEXT, isGhost: false }
        }}
      />
    </svg>
  )
}
