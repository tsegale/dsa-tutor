import { useMemo } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import type { RadixSortState } from '@/engine/radixSort'

interface RadixSortCanvasProps {
  width?: number
  height?: number
}

const PADDING = 24
const ARRAY_ROW_HEIGHT = 64
const CHIP_HEIGHT = 22
const CHIP_GAP = 4
const BOX_HEIGHT = 40

const NEUTRAL_FILL = '#c7c9e8'
const NEUTRAL_TEXT = '#4a4d8a'
const ACTIVE_FILL = '#f59e0b'
const ACTIVE_TEXT = '#78350f'
const BUCKET_FILL = '#7c3aed'

function digitLabel(digitPosition: number): string {
  if (digitPosition === 1) return 'ones digit'
  if (digitPosition === 10) return 'tens digit'
  if (digitPosition === 100) return 'hundreds digit'
  return `10^${Math.log10(digitPosition)} digit`
}

/**
 * Radix Sort's canvas: the current array as a row of boxes up top
 * (reusing ArrayCanvas's colour language but not ArrayCanvas itself,
 * since the bucket grid below has no equivalent there), and 10 labelled
 * bucket columns (0-9) below it, each a vertical stack of the values
 * assigned to that digit so far this pass.
 */
export default function RadixSortCanvas({ width = 600, height = 300 }: RadixSortCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)

  const state = useMemo(() => {
    const raw = snapshot?.dataStructureState
    if (!raw || typeof raw !== 'object') return null
    return raw as RadixSortState
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

  const arrayXScale = d3
    .scaleBand<number>()
    .domain(state.array.map((_, i) => i))
    .range([PADDING, width - PADDING])
    .paddingInner(0.15)
  const arrayBandwidth = arrayXScale.bandwidth()

  const bucketAreaY = PADDING + ARRAY_ROW_HEIGHT + 28
  const bucketAreaHeight = height - bucketAreaY - PADDING
  const bucketXScale = d3
    .scaleBand<number>()
    .domain(Array.from({ length: 10 }, (_, i) => i))
    .range([PADDING, width - PADDING])
    .paddingInner(0.2)
  const bucketWidth = bucketXScale.bandwidth()
  const maxChipsVisible = Math.max(1, Math.floor((bucketAreaHeight - 20) / (CHIP_HEIGHT + CHIP_GAP)))

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`Radix Sort, step ${snapshot.stepIndex + 1}: ${snapshot.description}`}
    >
      <text x={PADDING} y={16} className="fill-text-secondary text-[11px] font-semibold dark:fill-dark-text-secondary">
        {state.passNumber > 0 ? `Pass ${state.passNumber} of ${state.maxDigits} - sorting by: ${digitLabel(state.digitPosition)}` : 'Preparing to sort'}
      </text>

      {state.array.map((value, index) => {
        const x = arrayXScale(index) ?? 0
        const isActive = index === state.currentElementIndex
        const fill = isActive ? ACTIVE_FILL : NEUTRAL_FILL
        const text = isActive ? ACTIVE_TEXT : NEUTRAL_TEXT
        return (
          <motion.g key={index} layout transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <rect
              x={x}
              y={PADDING + (ARRAY_ROW_HEIGHT - BOX_HEIGHT) / 2}
              width={arrayBandwidth}
              height={BOX_HEIGHT}
              rx={6}
              fill={fill}
            />
            <text
              x={x + arrayBandwidth / 2}
              y={PADDING + ARRAY_ROW_HEIGHT / 2 + 4}
              textAnchor="middle"
              className="text-[12px] font-medium"
              style={{ fill: text }}
            >
              {value}
            </text>
            {isActive && state.currentDigit >= 0 && (
              <text
                x={x + arrayBandwidth / 2}
                y={PADDING + (ARRAY_ROW_HEIGHT - BOX_HEIGHT) / 2 - 6}
                textAnchor="middle"
                className="fill-secondary text-[10px] font-semibold"
              >
                digit {state.currentDigit}
              </text>
            )}
          </motion.g>
        )
      })}

      <line
        x1={PADDING}
        y1={bucketAreaY - 8}
        x2={width - PADDING}
        y2={bucketAreaY - 8}
        stroke="var(--border)"
        strokeWidth={1}
      />

      {Array.from({ length: 10 }, (_, digit) => {
        const x = bucketXScale(digit) ?? 0
        const bucket = state.buckets[digit] ?? []
        const overflow = bucket.length > maxChipsVisible
        const visibleChips = overflow ? bucket.slice(bucket.length - maxChipsVisible + 1) : bucket

        return (
          <g key={digit}>
            <rect
              x={x}
              y={bucketAreaY}
              width={bucketWidth}
              height={bucketAreaHeight}
              rx={6}
              fill="none"
              stroke="var(--border)"
              strokeDasharray="4 3"
            />
            <text
              x={x + bucketWidth / 2}
              y={bucketAreaY + bucketAreaHeight + 14}
              textAnchor="middle"
              className="fill-text-secondary text-[11px] font-semibold dark:fill-dark-text-secondary"
            >
              {digit}
            </text>
            {overflow && (
              <text
                x={x + bucketWidth / 2}
                y={bucketAreaY + 12}
                textAnchor="middle"
                className="fill-text-muted text-[9px] dark:fill-dark-text-secondary"
              >
                +{bucket.length - visibleChips.length} more
              </text>
            )}
            {visibleChips.map((value, i) => {
              const chipY = bucketAreaY + bucketAreaHeight - (i + 1) * (CHIP_HEIGHT + CHIP_GAP)
              return (
                <motion.g key={`${digit}-${i}-${value}`} layout transition={{ duration: 0.25, ease: 'easeInOut' }}>
                  <rect
                    x={x + 3}
                    y={chipY}
                    width={bucketWidth - 6}
                    height={CHIP_HEIGHT}
                    rx={4}
                    fill={BUCKET_FILL}
                  />
                  <text
                    x={x + bucketWidth / 2}
                    y={chipY + CHIP_HEIGHT / 2 + 4}
                    textAnchor="middle"
                    className="fill-white text-[10px] font-medium"
                  >
                    {value}
                  </text>
                </motion.g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
