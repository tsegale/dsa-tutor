import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { OPEN_FEYNMAN_MODAL_EVENT } from '@/components/feynman/FeynmanModeButton'
import { pipelineProgress, type PipelineStage, type PipelineStageId } from '@/config/pipeline'
import { cn } from '@/lib/utils'

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
      if (store.mode !== AlgorithmMode.PRACTICE) store.setMode(AlgorithmMode.PRACTICE)
      if (!store.codeEditorMode) store.toggleCodeEditorMode()
      return
    }
  }

  // Number offered stages sequentially (1, 2, 3, 4) so skipped stages never
  // create awkward gaps like "1, 2, -, 4, 5".
  let offeredCounter = 0
  const stageNumbers = stages.map((stage) => {
    if (stage.status === 'NOT_OFFERED') return null
    offeredCounter += 1
    return offeredCounter
  })

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
          const hint =
            stage.reason ??
            (isModeStage && stage.status !== 'NOT_OFFERED'
              ? 'Switch modes with the Demo / Practice / Hands-On toggle above the canvas.'
              : null)
          const current = isCurrent(stage)
          const last = index === stages.length - 1
          const displayNumber = stageNumbers[index]

          const row = (
            <div className="flex gap-2">
              <div className="flex flex-col items-center" aria-hidden="true">
                <span
                  className={cn(
                    'flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[9px] tabular-nums',
                    stage.status === 'DONE' && 'border-transparent bg-brand text-white',
                    stage.status === 'AVAILABLE' && !current && 'border-rule-strong text-ink-2',
                    current && stage.status !== 'DONE' && 'border-brand bg-brand-soft text-brand',
                    stage.status === 'NOT_OFFERED' && 'border-dashed border-rule text-ink-3',
                  )}
                >
                  {stage.status === 'DONE' ? <TickIcon /> : displayNumber !== null ? displayNumber : '·'}
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
