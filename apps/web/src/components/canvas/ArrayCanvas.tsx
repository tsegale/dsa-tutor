import { useEffect, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { AlgorithmMode, PredictionType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface ArrayCanvasProps {
  width?: number
  height?: number
  onElementClick?: (index: number) => void
  selectedIndex?: number | null
  /** When set, the canvas plays a "what your answer would cause" trace instead of the real state. */
  mistakePath?: AlgorithmSnapshot[] | null
  onMistakePathComplete?: () => void
}

const PADDING = 32

const BAR_COLOR = {
  success: '#16A34A',
  secondary: '#F59E0B',
  active: '#7C3AED',
  primary: '#4F46E5',
} as const

const MISTAKE_WASH_COLOR = 'rgba(220, 38, 38, 0.12)'
// 0.5x speed of the nominal 800ms step interval used elsewhere.
const MISTAKE_STEP_INTERVAL_MS = 1600
const MISTAKE_PAUSE_MS = 1000

export default function ArrayCanvas({
  width = 600,
  height = 300,
  onElementClick,
  selectedIndex = null,
  mistakePath = null,
  onMistakePathComplete,
}: ArrayCanvasProps) {
  const storeSnapshot = useAlgorithmStore(selectCurrentSnapshot)
  const mode = useAlgorithmStore((state) => state.mode)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const totalSteps = useAlgorithmStore((state) => state.snapshotArray.length)
  const prefersReducedMotion = useReducedMotion()

  const [mistakeStepIndex, setMistakeStepIndex] = useState(0)

  const isMistakeMode = mistakePath !== null && mistakePath.length > 0

  // Animate through the mistake path at half speed, then hand control
  // back to the parent (which clears mistakePath) after a beat.
  useEffect(() => {
    if (!isMistakeMode) {
      setMistakeStepIndex(0)
      return
    }

    setMistakeStepIndex(0)
    let currentStep = 0
    let pauseTimer: ReturnType<typeof setTimeout> | null = null

    const interval = setInterval(
      () => {
        currentStep += 1
        if (currentStep >= mistakePath!.length) {
          clearInterval(interval)
          pauseTimer = setTimeout(() => {
            onMistakePathComplete?.()
          }, MISTAKE_PAUSE_MS)
          return
        }
        setMistakeStepIndex(currentStep)
      },
      prefersReducedMotion ? 0 : MISTAKE_STEP_INTERVAL_MS,
    )

    return () => {
      clearInterval(interval)
      if (pauseTimer) clearTimeout(pauseTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mistakePath, isMistakeMode])

  const snapshot = isMistakeMode ? mistakePath![mistakeStepIndex] : storeSnapshot
  const mistakeAffectedIndices = isMistakeMode
    ? new Set([
        ...mistakePath![mistakeStepIndex].activeIndices,
        ...mistakePath![mistakeStepIndex].comparedIndices,
        ...mistakePath![mistakeStepIndex].swappedIndices,
      ])
    : null

  const bars = useMemo(() => {
    const values = (snapshot?.dataStructureState as number[] | undefined) ?? []
    if (values.length === 0) return []

    const xScale = d3
      .scaleBand<number>()
      .domain(values.map((_, i) => i))
      .range([PADDING, width - PADDING])
      .paddingInner(0.15)

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(values) ?? 0])
      .range([height - PADDING, PADDING])

    const bandwidth = xScale.bandwidth()

    return values.map((value, index) => {
      const x = xScale(index) ?? 0
      const barY = yScale(value)
      const barHeight = height - PADDING - barY

      return {
        index,
        value,
        x,
        y: barY,
        width: bandwidth,
        height: barHeight,
      }
    })
  }, [snapshot, width, height])

  const isInteractive =
    !isMistakeMode &&
    Boolean(onElementClick) &&
    snapshot?.isPredictionRequired === true &&
    snapshot?.predictionType === PredictionType.CANVAS_CLICK &&
    mode === AlgorithmMode.PRACTICE

  if (!snapshot || bars.length === 0) {
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

  const canvasLabel = `${algorithmName}, step ${snapshot.stepIndex + 1} of ${totalSteps}: ${snapshot.description}`

  return (
    <svg width={width} height={height} role="img" aria-label={canvasLabel}>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .bar-group {
          transition: opacity 0.4s ease-in-out, fill 0.4s ease-in-out;
        }
      `}</style>

      {isMistakeMode && (
        <>
          <rect x={0} y={0} width={width} height={height} fill={MISTAKE_WASH_COLOR} />
          <text
            x={width / 2}
            y={18}
            textAnchor="middle"
            className="fill-error text-[12px] italic"
          >
            What your answer would cause...
          </text>
        </>
      )}

      {bars.map((bar) => {
        const isHighlighted = snapshot.highlightIndices.includes(bar.index)
        const isSwapped = snapshot.swappedIndices.includes(bar.index)
        const isActive = snapshot.activeIndices.includes(bar.index)
        const isSpecial = isHighlighted || isSwapped || isActive
        const isMistakeAffected = mistakeAffectedIndices?.has(bar.index) ?? false

        const fill = isHighlighted
          ? BAR_COLOR.success
          : isSwapped
            ? BAR_COLOR.secondary
            : isActive
              ? BAR_COLOR.active
              : BAR_COLOR.primary

        return (
          <motion.g
            key={bar.index}
            layout
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeInOut' }}
            style={{ opacity: isSpecial ? 1 : 0.4 }}
            className={cn(
              'bar-group group',
              isActive && !prefersReducedMotion && 'animate-pulse-ring',
              isInteractive && 'cursor-pointer',
            )}
            onClick={() => {
              if (isInteractive) onElementClick?.(bar.index)
            }}
            role={isInteractive ? 'button' : undefined}
            aria-label={`Index ${bar.index}, value ${bar.value}${isInteractive ? ', selectable' : ''}`}
          >
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={4}
              className="bar-group"
              style={{ fill }}
            />
            {isInteractive && (
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={4}
                fill="none"
                stroke="#4F46E5"
                strokeWidth={2}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              />
            )}
            {selectedIndex === bar.index && (
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={4}
                fill="none"
                stroke={BAR_COLOR.secondary}
                strokeWidth={2}
              />
            )}
            {isMistakeAffected && (
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={4}
                fill="none"
                stroke="#DC2626"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            )}
            <text
              x={bar.x + bar.width / 2}
              y={height - PADDING + 16}
              textAnchor="middle"
              className="fill-text-primary text-xs font-medium dark:fill-dark-text-primary"
            >
              {bar.value}
            </text>
            <text
              x={bar.x + bar.width / 2}
              y={bar.y - 8}
              textAnchor="middle"
              className="fill-text-muted text-[10px] dark:fill-dark-text-secondary"
            >
              {bar.index}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}
