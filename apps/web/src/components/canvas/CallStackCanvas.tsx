import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore, selectCurrentSnapshot, selectProgressPercent } from '@/store/useAlgorithmStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import type { CallStackState } from '@/engine/recursionFactorial'

interface CallStackCanvasProps {
  width?: number
  height?: number
}

const FRAME_HEIGHT = 48
const FRAME_GAP = 6
const FRAME_WIDTH = 320

export default function CallStackCanvas({ width = 500, height = 400 }: CallStackCanvasProps) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const masteryPercent = useAlgorithmStore(selectProgressPercent)
  const prefersReducedMotion = useReducedMotion()
  const state = snapshot?.dataStructureState as CallStackState | undefined
  const scrollRef = useRef<HTMLDivElement>(null)

  const masteryColorClass = masteryPercent >= 80 ? 'bg-success' : masteryPercent >= 50 ? 'bg-secondary' : 'bg-primary'

  // the deepest (most recent, currently active) frame sits at the floor
  // near the bottom of the svg, which grows taller than this overflow-auto
  // wrapper as recursion deepens - keep the floor in view as frames change
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state?.frames.length])

  if (!state || state.frames.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-text-muted dark:text-dark-text-secondary">Load an algorithm to begin</span>
        </div>
      </div>
    )
  }

  // Bottom frame is the original call, so the array (pushed in call
  // order, deepest last) renders reversed - deepest/most-recent frame
  // sits visually on top, matching how a real call stack grows.
  const framesTopFirst = [...state.frames].reverse()
  const baseCasesReached = state.frames.filter(
    (frame) => frame.argument === state.baseCase && frame.status === 'returned',
  ).length
  const centerX = width / 2
  const totalHeight = state.frames.length * (FRAME_HEIGHT + FRAME_GAP)
  const svgHeight = Math.max(height, totalHeight + 60)
  const baseY = svgHeight - 40

  return (
    <div className="flex h-full flex-col">
      <div className="absolute top-2 right-3 left-3 z-10 flex items-center gap-2">
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">Mastery</span>
        <div className="h-1 w-[120px] overflow-hidden rounded-full bg-border">
          <div className={cn('h-full rounded-full', masteryColorClass)} style={{ width: `${masteryPercent}%` }} />
        </div>
        <span className="text-[10px] font-medium text-text-secondary dark:text-dark-text-secondary">
          Base cases reached: {baseCasesReached}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto pt-10">
        <svg width={width} height={svgHeight} role="img" aria-label={`Call stack, ${snapshot?.description ?? ''}`}>
          <line x1={centerX - FRAME_WIDTH / 2 - 10} y1={baseY} x2={centerX + FRAME_WIDTH / 2 + 10} y2={baseY} stroke="#0f172a" strokeWidth={3} />

          <AnimatePresence>
            {framesTopFirst.map((frame, i) => {
              const y = baseY - (i + 1) * (FRAME_HEIGHT + FRAME_GAP)
              const isBaseCase = frame.argument === state.baseCase
              const fill = frame.status === 'returned' ? 'rgba(22, 163, 74, 0.2)' : frame.status === 'waiting' ? 'rgba(55, 48, 163, 0.3)' : '#ffffff'
              const stroke = isBaseCase ? '#f59e0b' : frame.status === 'active' ? '#3730a3' : 'none'
              const textFill = frame.status === 'waiting' ? '#64748b' : '#0f172a'

              return (
                <motion.g
                  key={frame.id}
                  layout
                  initial={{ y: y - 100, opacity: 0 }}
                  animate={{ y, opacity: 1 }}
                  exit={{ y: y - 40, opacity: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 340, damping: 24 }
                  }
                >
                  <rect
                    x={centerX - FRAME_WIDTH / 2}
                    y={0}
                    width={FRAME_WIDTH}
                    height={FRAME_HEIGHT}
                    rx={6}
                    style={{ fill }}
                    stroke={stroke}
                    strokeWidth={stroke === 'none' ? 0 : 2}
                  />
                  <text
                    x={centerX - FRAME_WIDTH / 2 + 14}
                    y={FRAME_HEIGHT / 2}
                    dominantBaseline="central"
                    className="font-mono"
                    style={{ fill: textFill, fontSize: 13, fontWeight: 500 }}
                  >
                    {frame.functionName}({frame.argument}) = {frame.returnValue ?? '?'}
                  </text>
                  {frame.status === 'returned' && (
                    <text
                      x={centerX + FRAME_WIDTH / 2 - 14}
                      y={FRAME_HEIGHT / 2}
                      textAnchor="end"
                      dominantBaseline="central"
                      className="fill-success text-[12px] font-semibold"
                    >
                      return {frame.returnValue}
                    </text>
                  )}
                  {isBaseCase && frame.status !== 'returned' && (
                    <text x={centerX} y={-8} textAnchor="middle" className="fill-secondary text-[10px] font-semibold">
                      Base case reached
                    </text>
                  )}
                </motion.g>
              )
            })}
          </AnimatePresence>
        </svg>
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2 dark:border-dark-border">
        <p className="text-[12px] text-text-muted dark:text-dark-text-secondary">
          Frames on stack: {state.frames.filter((f) => f.status !== 'returned').length}
        </p>
      </div>
    </div>
  )
}
