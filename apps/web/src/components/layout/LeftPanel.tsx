import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { bubbleSortEngine } from '@/engine/bubbleSort'

interface LeftPanelProps {
  collapsed: boolean
  onToggle: () => void
}

const EXPANDED_WIDTH = 280
const COLLAPSED_WIDTH = 48

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function SkipBackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h2v14H6V5Zm3.5 7 11-7v14l-11-7Z" />
    </svg>
  )
}

function SkipForwardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 5h2v14h-2V5ZM3.5 5l11 7-11 7V5Z" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function ChevronIcon({ pointRight }: { pointRight: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={pointRight ? '' : 'rotate-180'}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function parseArrayInput(input: string): number[] | null {
  const parts = input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (parts.length === 0) return null
  const values = parts.map(Number)
  if (values.some((n) => Number.isNaN(n))) return null
  return values
}

function generateRandomArray(): number[] {
  const length = Math.floor(Math.random() * 5) + 6 // 6-10
  return Array.from({ length }, () => Math.floor(Math.random() * 20) + 1)
}

export default function LeftPanel({ collapsed, onToggle }: LeftPanelProps) {
  const isPlaying = useAlgorithmStore((state) => state.isPlaying)
  const playbackSpeed = useAlgorithmStore((state) => state.playbackSpeed)
  const startPlayback = useAlgorithmStore((state) => state.startPlayback)
  const stopPlayback = useAlgorithmStore((state) => state.stopPlayback)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const stepBackward = useAlgorithmStore((state) => state.stepBackward)
  const resetAlgorithm = useAlgorithmStore((state) => state.resetAlgorithm)
  const setPlaybackSpeed = useAlgorithmStore((state) => state.setPlaybackSpeed)
  const setAlgorithm = useAlgorithmStore((state) => state.setAlgorithm)

  const [arrayInput, setArrayInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  function handlePlayPause() {
    if (isPlaying) stopPlayback()
    else startPlayback()
  }

  function applyArrayInput() {
    const parsed = parseArrayInput(arrayInput)
    if (!parsed) {
      setInputError('Enter a comma-separated list of numbers, e.g. 5,3,1,4,2')
      return
    }
    setInputError(null)
    setAlgorithm('Bubble Sort', bubbleSortEngine(parsed))
  }

  function handleRandom() {
    const values = generateRandomArray()
    setInputError(null)
    setArrayInput(values.join(','))
    setAlgorithm('Bubble Sort', bubbleSortEngine(values))
  }

  return (
    <motion.div
      id="left-panel"
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex h-full flex-col overflow-hidden border-r border-border bg-white"
    >
      {collapsed ? (
        <div className="flex h-full flex-col items-center gap-2 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex size-9 items-center justify-center rounded-md bg-primary text-white hover:bg-primary-hover"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={stepBackward}
                aria-label="Step Backward"
                className="flex size-9 items-center justify-center rounded-md border border-border hover:bg-surface"
              >
                <SkipBackIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Step Backward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={stepForward}
                aria-label="Step Forward"
                className="flex size-9 items-center justify-center rounded-md border border-border hover:bg-surface"
              >
                <SkipForwardIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Step Forward</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={resetAlgorithm}
                aria-label="Reset"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface"
              >
                <RefreshIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Reset</TooltipContent>
          </Tooltip>

          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand panel"
            className="mt-auto flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface"
          >
            <ChevronIcon pointRight />
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Playback Controls
            </h3>
            <div>
              <Button onClick={handlePlayPause} className="w-full gap-2" size="lg">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <p className="mt-1 text-center text-[11px] text-text-muted">Space</p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Button variant="outline" onClick={stepBackward} className="w-full gap-1.5">
                  <SkipBackIcon />
                  Back
                </Button>
                <p className="mt-1 text-center text-[11px] text-text-muted">←</p>
              </div>
              <div className="flex-1">
                <Button variant="outline" onClick={stepForward} className="w-full gap-1.5">
                  <SkipForwardIcon />
                  Next
                </Button>
                <p className="mt-1 text-center text-[11px] text-text-muted">→</p>
              </div>
            </div>
            <div>
              <Button variant="ghost" onClick={resetAlgorithm} className="w-full gap-1.5">
                <RefreshIcon />
                Reset
              </Button>
              <p className="mt-1 text-center text-[11px] text-text-muted">R</p>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Speed</h3>
              <span className="font-mono text-xs text-text-primary">{playbackSpeed.toFixed(1)}x</span>
            </div>
            <Slider
              min={0.5}
              max={3.0}
              step={0.25}
              value={[playbackSpeed]}
              onValueChange={([value]) => setPlaybackSpeed(value)}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Array Input
            </h3>
            <input
              type="text"
              value={arrayInput}
              onChange={(event) => setArrayInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyArrayInput()
              }}
              placeholder="5,3,1,4,2"
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
            {inputError && <p className="text-xs text-error">{inputError}</p>}
            <Button variant="outline" size="sm" onClick={applyArrayInput}>
              Apply
            </Button>
            <Button variant="outline" size="sm" onClick={handleRandom}>
              Random
            </Button>
          </section>

          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse panel"
            className="mt-auto flex items-center justify-center gap-1 self-start text-text-muted hover:text-text-primary"
          >
            <ChevronIcon pointRight={false} />
          </button>
        </div>
      )}
    </motion.div>
  )
}
