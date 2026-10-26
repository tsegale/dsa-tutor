import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { OPEN_FEYNMAN_MODAL_EVENT } from '@/components/feynman/FeynmanModeButton'
import { pipelineProgress, type PipelineStage, type PipelineStageId } from '@/config/pipeline'
import { cn } from '@/lib/utils'

/**
 * The five stages of a topic, as a route the student can see all of.
 *
 * All five are shown, which is the whole point: a student opening a topic
 * should be able to see that it runs from watching it to explaining it back.
 * Every stage the topic offers is open from the start - none waits on
 * another. A stage the topic genuinely does not offer says so, with the
 * reason, rather than appearing as something to unlock that never will.
 *
 * Demo, Practice and Hands-On are status only here, not a second way to
 * switch - the mode toggle above the canvas already does that, always
 * visible, and a click here doing the identical thing was two controls for
 * one action with no way to tell them apart. Code and Feynman stay
 * clickable: flipping the Code Mode toggle or opening the Feynman modal is
 * a step down into the stage, not a duplicate of something already on
 * screen.
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
    // DEMO, PRACTICE and HANDS_ON have no action here - see the mode
    // toggle above the canvas.
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
          const isModeStage = STAGE_MODE[stage.id] !== undefined
          const clickable = !isModeStage && (stage.status === 'AVAILABLE' || stage.status === 'DONE')
          // A mode stage still gets a tooltip once it is reachable, so a
          // click that used to work says where the control moved to
          // instead of just silently stopping.
          const hint = stage.reason ?? (isModeStage && stage.status !== 'NOT_OFFERED' ? 'Switch modes with the Demo / Practice / Hands-On toggle above the canvas.' : null)
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
                    stage.status === 'NOT_OFFERED' && 'border-dashed border-rule text-ink-3',
                  )}
                >
                  {stage.status === 'DONE' ? <TickIcon /> : stage.status === 'NOT_OFFERED' ? '-' : index + 1}
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
                    stage.status === 'NOT_OFFERED' ? 'text-ink-3' : current ? 'font-medium text-brand' : 'text-ink',
                  )}
                >
                  {stage.label}
                </span>
                {/* The second line is only worth its height when it says
                    something the label does not: why a stage is shut, or
                    what the student is doing in the one they are in. Five
                    three-line blocks filled the rail and pushed the live
                    variables below the fold. */}
                {(stage.reason ?? (current ? stage.summary : null)) && (
                  <span className="text-left text-micro font-normal text-ink-2">
                    {stage.reason ?? stage.summary}
                  </span>
                )}
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
              ) : hint ? (
                // Not-offered stages carry their reason in the row itself,
                // so there is nothing hidden behind a hover; the tooltip
                // only repeats it for a truncated line. A mode stage has no
                // reason to show in the row, so the tooltip is the only
                // place it says where its control actually is.
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full cursor-default">{row}</div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{hint}</TooltipContent>
                </Tooltip>
              ) : (
                <div className="w-full cursor-default">{row}</div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
