import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { OPEN_FEYNMAN_MODAL_EVENT } from '@/components/feynman/FeynmanModeButton'
import { pipelineProgress, type PipelineStage, type PipelineStageId } from '@/config/pipeline'
import { cn } from '@/lib/utils'

/**
 * The five stages of a topic, as a route the student can see all of.
 *
 * Locked stages are shown rather than hidden, which is the whole point: a
 * student opening a topic should be able to see that it runs from watching
 * it to explaining it back, including the parts they have not reached. A
 * stage the topic genuinely does not offer says so, with the reason, rather
 * than appearing as something to unlock that never will.
 *
 * Clicking an available stage goes there. The three that are modes switch
 * the mode; Feynman opens its modal; Code flips the Code Mode toggle.
 */

interface PipelineTrackerProps {
  stages: readonly PipelineStage[]
}

function TickIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path d="M4 12.5l5.5 5.5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

/** The mode each stage corresponds to, where it is one. */
const STAGE_MODE: Partial<Record<PipelineStageId, AlgorithmMode>> = {
  DEMO: AlgorithmMode.DEMO,
  PRACTICE: AlgorithmMode.PRACTICE,
  HANDS_ON: AlgorithmMode.HANDS_ON,
}

export default function PipelineTracker({ stages }: PipelineTrackerProps) {
  const mode = useAlgorithmStore((state) => state.mode)
  const codeEditorMode = useAlgorithmStore((state) => state.codeEditorMode)
  const { done, offered } = pipelineProgress(stages)

  function isCurrent(stage: PipelineStage): boolean {
    if (stage.id === 'CODE') return codeEditorMode
    const stageMode = STAGE_MODE[stage.id]
    // Code Mode overlays Practice, so while it is on, Practice is not the
    // stage the student is actually in.
    if (stage.id === 'PRACTICE' && codeEditorMode) return false
    return stageMode !== undefined && stageMode === mode
  }

  function go(stage: PipelineStage) {
    const store = useAlgorithmStore.getState()
    if (stage.id === 'FEYNMAN') {
      window.dispatchEvent(new CustomEvent(OPEN_FEYNMAN_MODAL_EVENT))
      return
    }
    if (stage.id === 'CODE') {
      // Code challenges are answered at Practice junctions, so Practice is
      // where the toggle has anything to act on.
      if (store.mode !== AlgorithmMode.PRACTICE) store.setMode(AlgorithmMode.PRACTICE)
      if (!store.codeEditorMode) store.toggleCodeEditorMode()
      return
    }
    const stageMode = STAGE_MODE[stage.id]
    if (stageMode !== undefined) {
      if (store.codeEditorMode) store.toggleCodeEditorMode()
      store.setMode(stageMode)
    }
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Stages for this topic">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-micro text-text-muted dark:text-dark-text-secondary">Stages</h3>
        <span className="text-mono-sm text-ink-2">
          {done}/{offered}
        </span>
      </div>

      <ol className="flex flex-col">
        {stages.map((stage, index) => {
          const clickable = stage.status === 'AVAILABLE' || stage.status === 'DONE'
          const current = isCurrent(stage)
          const last = index === stages.length - 1

          const row = (
            <div className="flex gap-2">
              {/* The rail: a marker per stage, joined by a line, so the
                  five read as one route rather than five buttons. */}
              <div className="flex flex-col items-center" aria-hidden="true">
                <span
                  className={cn(
                    'flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[9px]',
                    stage.status === 'DONE' && 'border-transparent bg-brand text-white',
                    stage.status === 'AVAILABLE' && !current && 'border-rule-strong text-ink-2',
                    current && stage.status !== 'DONE' && 'border-brand bg-brand-soft text-brand',
                    stage.status === 'LOCKED' && 'border-rule text-ink-3',
                    stage.status === 'NOT_OFFERED' && 'border-dashed border-rule text-ink-3',
                  )}
                >
                  {stage.status === 'DONE' ? (
                    <TickIcon />
                  ) : stage.status === 'LOCKED' ? (
                    <LockIcon />
                  ) : stage.status === 'NOT_OFFERED' ? (
                    '-'
                  ) : (
                    index + 1
                  )}
                </span>
                {!last && (
                  <span
                    className={cn('w-px flex-1', stage.status === 'DONE' ? 'bg-brand/40' : 'bg-rule')}
                    style={{ minHeight: 14 }}
                  />
                )}
              </div>

              <div className={cn('flex min-w-0 flex-col pb-2', last && 'pb-0')}>
                <span
                  className={cn(
                    'text-left text-small',
                    stage.status === 'NOT_OFFERED' || stage.status === 'LOCKED'
                      ? 'text-ink-3'
                      : current
                        ? 'font-medium text-brand'
                        : 'text-ink',
                  )}
                >
                  {stage.label}
                </span>
                <span className="text-left text-micro font-normal text-ink-2">
                  {stage.reason ?? stage.summary}
                </span>
              </div>
            </div>
          )

          return (
            <li key={stage.id}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => go(stage)}
                  aria-current={current ? 'step' : undefined}
                  className="w-full rounded-sm text-left transition-colors hover:bg-surface-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:hover:bg-dark-border"
                >
                  {row}
                </button>
              ) : (
                // Locked and not-offered stages carry their reason in the
                // row itself, so there is nothing hidden behind a hover.
                // The tooltip only repeats it for a truncated line.
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full cursor-default">{row}</div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{stage.reason}</TooltipContent>
                </Tooltip>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
