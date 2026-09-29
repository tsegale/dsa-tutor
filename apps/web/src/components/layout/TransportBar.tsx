import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { cn } from '@/lib/utils'

// Playback transport (Week 4, 4A.3): a centred pill under the canvas. It
// drives the same store actions the left rail used to, so stepping,
// playback and the Practice-mode gate behave exactly as before.

const SPEEDS = [0.5, 1, 1.5, 2, 3] as const

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border bg-surface px-1 font-mono text-[10px] leading-4 text-text-muted dark:border-dark-border dark:bg-dark-border dark:text-dark-text-secondary">
      {children}
    </kbd>
  )
}

function StepBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M19 20 9 12l10-8v16ZM5 19V5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StepForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="m5 4 10 8-10 8V4ZM19 5v14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5-13-7.5Z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 2.64-6.36" />
      <path d="M3 3v6h6" />
    </svg>
  )
}

const iconButton =
  'flex size-8 items-center justify-center rounded-full text-text-primary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 dark:text-dark-text-primary dark:hover:bg-dark-border'

export default function TransportBar() {
  const isPlaying = useAlgorithmStore((state) => state.isPlaying)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const totalSteps = useAlgorithmStore((state) => state.snapshotArray.length)
  const playbackSpeed = useAlgorithmStore((state) => state.playbackSpeed)
  const startPlayback = useAlgorithmStore((state) => state.startPlayback)
  const stopPlayback = useAlgorithmStore((state) => state.stopPlayback)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const stepBackward = useAlgorithmStore((state) => state.stepBackward)
  const resetAlgorithm = useAlgorithmStore((state) => state.resetAlgorithm)
  const setPlaybackSpeed = useAlgorithmStore((state) => state.setPlaybackSpeed)

  const isAtFinalStep = totalSteps > 0 && stepIndex >= totalSteps - 1
  const playLabel = isPlaying ? 'Pause' : isAtFinalStep ? 'Replay' : 'Play'

  function handlePlayPause() {
    if (isPlaying) stopPlayback()
    else if (isAtFinalStep) resetAlgorithm()
    else startPlayback()
  }

  return (
    <div className="flex shrink-0 justify-center px-4 pb-2">
      <div
        id="transport-bar"
        role="toolbar"
        aria-label="Playback"
        className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-sm dark:border-dark-border"
      >
        <button type="button" onClick={stepBackward} disabled={stepIndex === 0} aria-label="Step back" aria-keyshortcuts="ArrowLeft" className={iconButton}>
          <StepBackIcon />
        </button>
        <Kbd>←</Kbd>

        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={playLabel}
          aria-keyshortcuts="Space"
          className="ml-1 flex size-9 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <Kbd>Space</Kbd>

        <button type="button" onClick={stepForward} disabled={isAtFinalStep} aria-label="Step forward" aria-keyshortcuts="ArrowRight" className={cn(iconButton, 'ml-1')}>
          <StepForwardIcon />
        </button>
        <Kbd>→</Kbd>

        <span className="mx-2 h-5 w-px bg-border dark:bg-dark-border" aria-hidden="true" />

        <div role="radiogroup" aria-label="Playback speed" className="flex items-center rounded-full bg-surface p-0.5 dark:bg-dark-border">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              role="radio"
              aria-checked={playbackSpeed === speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={cn(
                'rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums',
                playbackSpeed === speed
                  ? 'bg-card text-primary shadow-sm dark:bg-dark-surface dark:text-dark-primary'
                  : 'text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary',
              )}
            >
              {speed}x
            </button>
          ))}
        </div>

        <span className="mx-2 h-5 w-px bg-border dark:bg-dark-border" aria-hidden="true" />

        <button
          type="button"
          onClick={resetAlgorithm}
          aria-label="Reset run"
          aria-keyshortcuts="R"
          className="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-text-muted hover:bg-surface hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-dark-border dark:hover:text-dark-text-primary"
        >
          <ResetIcon />
          Reset run
        </button>
        <Kbd>R</Kbd>
      </div>
    </div>
  )
}
