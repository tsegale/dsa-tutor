import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import ChallengeGenerator from '@/components/challenge/ChallengeGenerator'
import FeynmanModeButton from '@/components/feynman/FeynmanModeButton'
import { cn } from '@/lib/utils'

interface LeftPanelProps {
  collapsed: boolean
  onToggle: () => void
  difficulty: string
}

const EXPANDED_WIDTH = 200
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

function ArrowLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
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

function CodeBracketsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 4 4 12l4 8M16 4l4 8-4 8" strokeLinecap="round" strokeLinejoin="round" />
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

export default function LeftPanel({ collapsed, onToggle, difficulty }: LeftPanelProps) {
  const isPlaying = useAlgorithmStore((state) => state.isPlaying)
  const playbackSpeed = useAlgorithmStore((state) => state.playbackSpeed)
  const startPlayback = useAlgorithmStore((state) => state.startPlayback)
  const stopPlayback = useAlgorithmStore((state) => state.stopPlayback)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const stepBackward = useAlgorithmStore((state) => state.stepBackward)
  const resetAlgorithm = useAlgorithmStore((state) => state.resetAlgorithm)
  const setPlaybackSpeed = useAlgorithmStore((state) => state.setPlaybackSpeed)
  const setAlgorithm = useAlgorithmStore((state) => state.setAlgorithm)
  const codeEditorMode = useAlgorithmStore((state) => state.codeEditorMode)
  const toggleCodeEditorMode = useAlgorithmStore((state) => state.toggleCodeEditorMode)

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
    setAlgorithm('Bubble Sort', bubbleSortEngine(parsed, codeEditorMode))
  }

  function handleRandom() {
    const values = generateRandomArray()
    setInputError(null)
    setArrayInput(values.join(','))
    setAlgorithm('Bubble Sort', bubbleSortEngine(values, codeEditorMode))
  }

  return (
    <motion.div
      id="left-panel"
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex h-full flex-col overflow-hidden border-r border-border bg-white dark:bg-dark-surface"
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
                className="flex size-9 items-center justify-center rounded-md border border-border hover:bg-surface dark:hover:bg-dark-border"
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
                className="flex size-9 items-center justify-center rounded-md border border-border hover:bg-surface dark:hover:bg-dark-border"
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
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
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
            className="mt-auto flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface dark:text-dark-text-secondary dark:hover:bg-dark-border"
          >
            <ChevronIcon pointRight />
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
          <section className="flex flex-col gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted dark:text-dark-text-secondary">
              Playback
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <button
                  type="button"
                  onClick={stepBackward}
                  style={{ backgroundColor: '#3730a3', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 500 }}
                  className="flex w-full items-center justify-center gap-1.5 text-white"
                >
                  <ArrowLeftIcon />
                  Step back
                </button>
                <p className="mt-1 text-center text-[11px] text-text-muted dark:text-dark-text-secondary">←</p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={stepForward}
                  style={{ backgroundColor: '#3730a3', borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 500 }}
                  className="flex w-full items-center justify-center gap-1.5 text-white"
                >
                  Step forward
                  <ArrowRightIcon />
                </button>
                <p className="mt-1 text-center text-[11px] text-text-muted dark:text-dark-text-secondary">→</p>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={handlePlayPause}
                style={{ borderColor: '#3730a3', color: '#3730a3', fontSize: 12 }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border py-2"
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                {isPlaying ? 'Pause' : 'Auto play'}
              </button>
              <p className="mt-1 text-center text-[11px] text-text-muted dark:text-dark-text-secondary">Space</p>
            </div>
            <button
              type="button"
              onClick={resetAlgorithm}
              style={{ fontSize: 12 }}
              className="flex items-center justify-center gap-1 self-center bg-transparent text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
            >
              <RefreshIcon />
              Reset
            </button>
          </section>

          <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted dark:text-dark-text-secondary">
                Playback speed
              </h3>
              <span className="font-mono text-xs text-text-primary dark:text-dark-text-primary">{playbackSpeed.toFixed(1)}x</span>
            </div>
            <Slider
              min={0.5}
              max={3.0}
              step={0.25}
              value={[playbackSpeed]}
              onValueChange={([value]) => setPlaybackSpeed(value)}
            />
          </section>

          <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted dark:text-dark-text-secondary">
              Custom array
            </h3>
            <input
              type="text"
              value={arrayInput}
              onChange={(event) => setArrayInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') applyArrayInput()
              }}
              placeholder="5,3,1,4,2"
              className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary dark:bg-dark-background dark:text-dark-text-primary"
            />
            {inputError && <p className="text-xs text-error">{inputError}</p>}
            <Button variant="outline" size="sm" onClick={applyArrayInput}>
              Apply
            </Button>
            <Button variant="outline" size="sm" onClick={handleRandom}>
              Random
            </Button>
          </section>

          <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted dark:text-dark-text-secondary">
              AI Tools
            </h3>
            <ChallengeGenerator difficulty={difficulty} />
            <FeynmanModeButton />
          </section>

          <section className="mt-auto flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
            <button
              type="button"
              onClick={toggleCodeEditorMode}
              aria-pressed={codeEditorMode}
              className={cn(
                'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                codeEditorMode
                  ? 'border-primary bg-primary-light text-primary'
                  : 'border-border text-text-primary hover:bg-surface dark:text-dark-text-primary dark:hover:bg-dark-border',
              )}
            >
              <span className="flex items-center gap-1.5">
                <CodeBracketsIcon />
                Code Mode
              </span>
              <span
                className={cn(
                  'flex h-5 w-9 items-center rounded-full px-0.5 transition-colors',
                  codeEditorMode ? 'justify-end bg-primary' : 'justify-start bg-border',
                )}
              >
                <span className="size-4 rounded-full bg-white shadow-sm" />
              </span>
            </button>
          </section>

          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse panel"
            className="flex items-center justify-center gap-1 self-start text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
          >
            <ChevronIcon pointRight={false} />
          </button>
        </div>
      )}
    </motion.div>
  )
}
