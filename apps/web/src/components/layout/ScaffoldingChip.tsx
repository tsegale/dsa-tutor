import { cn } from '@/lib/utils'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { conditionFeatures } from '@/utils/studyCondition'
import { useTopics } from '@/hooks/useTopics'
import { SUPPORT_LEVEL, nextLevelDownLine } from '@/config/supportLevels'
import { overallSupport, type SupportAssessment } from '@/utils/supportBand'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// The scaffolding state, made visible in the global bar (Phase 4C). The chip
// names the level and opens a popover in which the mechanism explains
// itself: the level, the reasoning masteryScore.ts gave, the mastery score,
// and what changes at the next level down.
//
// The meter is --ink-2 on --rule-strong, deliberately neither brand (brand
// means interactive) nor a canvas state colour (those mean algorithm state).

function Meter({ filled, className }: { filled: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex items-end gap-0.5', className)}>
      {[0, 1, 2, 3].map((index) => (
        <span key={index} className={cn('h-3 w-1 rounded-[1px]', index < filled ? 'bg-ink-2' : 'bg-rule-strong')} />
      ))}
    </span>
  )
}

/** The live session level, as the workspace's fading logic last set it. */
function useSessionSupport(): SupportAssessment {
  const level = useAlgorithmStore((state) => state.scaffoldingLevel)
  const reasoning = useAlgorithmStore((state) => state.scaffoldingReasoning)
  const score = useAlgorithmStore((state) => state.scaffoldingScore)
  return { level, reasoning, score }
}

function useOverallSupport(): SupportAssessment | null {
  const { data: topics } = useTopics()
  return topics ? overallSupport(topics) : null
}

function ChipView({ assessment, basis }: { assessment: SupportAssessment; basis: string }) {
  const { level } = assessment
  const { label, segments } = SUPPORT_LEVEL[level]
  // Below 1024px the drawer button joins the bar, so the chip leaves it to
  // keep the bar at seven elements (Phase 4G moves it into the account menu).
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Support level: ${label}. Show why`}
            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-sm border border-rule px-2.5 text-small whitespace-nowrap transition-colors duration-quick hover:border-rule-strong hover:bg-surface-sunk"
          >
            <span className="text-micro text-ink-2">Support</span>
            <Meter filled={segments} />
            <span className="font-medium text-ink">{label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent aria-label="Why this level of support">
          <p className="text-micro text-ink-2">{basis}</p>
          <div className="mt-2 flex items-center gap-2.5">
            <Meter filled={segments} className="[&>span]:h-4 [&>span]:w-1.5" />
            <p className="text-h3 text-ink">{label}</p>
            <span className="ml-auto text-mono-sm text-ink-2">Level {segments} of 4</span>
          </div>
          <p className="mt-3 text-small text-ink">{assessment.reasoning}</p>
          <dl className="mt-3 flex items-baseline justify-between border-t border-rule pt-3">
            <dt className="text-small text-ink-2">Mastery score</dt>
            <dd className="text-mono text-ink">{assessment.score} / 100</dd>
          </dl>
          <p className="mt-3 text-small text-ink-2">{nextLevelDownLine(level)}</p>
        </PopoverContent>
      </Popover>
      {/* The hairline between the status chips and search, theme and account:
          rendered with the chip so it never stands alone. */}
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-rule" />
    </div>
  )
}

function SessionChip() {
  return <ChipView assessment={useSessionSupport()} basis="This session, from your answers so far" />
}

function OverallChip() {
  const assessment = useOverallSupport()
  if (!assessment) return null
  return <ChipView assessment={assessment} basis="Your overall band, from mastery across your topics" />
}

/**
 * In the workspace: the live session level, updating as support fades.
 * Elsewhere: the learner's overall band. Never in Classic, the study's
 * control condition, whose participants must not see a scaffolding indicator.
 */
export function ScaffoldingChip({ inWorkspace }: { inWorkspace: boolean }) {
  // The study condition's feature list decides, as it does for every other
  // tutor surface: Classic has no scaffolding indicator.
  const features = conditionFeatures(useAlgorithmStore((state) => state.classicMode))
  if (inWorkspace) return features.scaffoldingPill ? <SessionChip /> : null
  return <OverallChip />
}
