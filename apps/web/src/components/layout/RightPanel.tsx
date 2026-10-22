import { motion } from 'framer-motion'
import { AlgorithmMode } from '@dsa-tutor/types'
import { conditionFeatures } from '@/utils/studyCondition'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAlgorithmStore, selectCurrentSnapshot, selectIsLiveJunction, selectIsWorkedStep } from '@/store/useAlgorithmStore'
import WorkedStepNotice from '@/components/prediction/WorkedStepNotice'
import { workedStepNarration } from '@/utils/workedSteps'
import PseudocodePanel from '@/components/canvas/PseudocodePanel'
import ComplexityPanel from '@/components/canvas/ComplexityPanel'
import TheoryPanel from '@/components/canvas/TheoryPanel'
import DemoAssistant from '@/components/tutor/DemoAssistant'
import StepLog from './StepLog'
import ScaffoldingFader from './ScaffoldingFader'
import MistakeAnalysisToast from '@/components/prediction/MistakeAnalysisToast'
import type { FeedbackCard } from '@/utils/displayedFeedback'
import { cn } from '@/lib/utils'
import { guidanceFor } from '@/utils/guidanceBox'

interface RightPanelProps {
  collapsed: boolean
  onToggle: () => void
  activeTab: number
  onTabChange: (tab: number) => void
  /** What the feedback card is showing, or null for none. One object so a
   * confirmation can never be rendered with the mistake styling. */
  feedbackCard: FeedbackCard | null
  onDismissFeedback: () => void
  hint: string | null
  /** False while the current step's prediction is still pending (or has
   * been answered wrong but not yet revealed) - the Socratic guidance box
   * must show the answer-safe junction prompt, not the snapshot's own
   * narration description, until this is true. */
  predictionResolved: boolean
  /** Compact-layout tab mode (<1024px): renders full width, always expanded,
   * with no rail/collapse toggle - there's no room for a docked rail once
   * the panel is a full-screen tab instead of a sidebar. */
  fullWidth?: boolean
  /** Docked in a resizable workspace panel, which owns the width: fills
   * it instead of animating its own, keeping the rail and collapse toggle. */
  fillParent?: boolean
}

const EXPANDED_WIDTH = 280
const COLLAPSED_WIDTH = 48

function ExplanationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  )
}

function TheoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 5a2 2 0 0 1 2-2h7v18H6a2 2 0 0 1-2-2z" />
      <path d="M13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      <path d="M8 8h2M8 12h2" />
    </svg>
  )
}

function PseudocodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 4 3 12l5 8M16 4l5 8-5 8" />
    </svg>
  )
}

function ComplexityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

function StepLogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
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

function SocraticGuidanceBox({ hint, predictionResolved }: { hint: string | null; predictionResolved: boolean }) {
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const correct = useAlgorithmStore((state) => state.sessionCorrectPredictions)
  const total = useAlgorithmStore((state) => state.sessionTotalPredictions)
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const isLiveJunction = useAlgorithmStore(selectIsLiveJunction)
  const isWorkedStep = useAlgorithmStore(selectIsWorkedStep)
  const workedNarration = useAlgorithmStore((state) =>
    isWorkedStep ? workedStepNarration(state.snapshotArray, state.stepIndex) : null,
  )

  // Heading and body both come from here, so the label always describes
  // what is under it - this box shows a question, a worked example, the
  // engine's narration or the empty state, and only the first of those is
  // Socratic guidance.
  const guidance = guidanceFor({ snapshot, algorithmName, isLiveJunction, predictionResolved, workedNarration })

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-micro font-bold text-primary">{guidance.heading}</p>
      {guidance.kind === 'worked' ? (
        <WorkedStepNotice narration={guidance.text} className="mt-1.5" />
      ) : (
        <p className="mt-1.5 text-body text-text-primary dark:text-dark-text-primary">{guidance.text}</p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] text-text-muted tabular-nums dark:text-dark-text-secondary">
          {total > 0 ? `${correct}/${total} correct (${accuracy}%)` : 'No predictions yet'}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary" style={{ width: `${accuracy}%` }} />
        </div>
      </div>

      {hint && (
        <div className="mt-3 rounded-md border-l-4 border-ai bg-ai-light p-2.5">
          <p className="text-body text-ai-foreground">{hint}</p>
        </div>
      )}
    </div>
  )
}

export default function RightPanel({
  collapsed,
  onToggle,
  activeTab,
  onTabChange,
  feedbackCard,
  onDismissFeedback,
  hint,
  predictionResolved,
  fullWidth = false,
  fillParent = false,
}: RightPanelProps) {
  // Classic (the study's plain visualiser) has no AI Tutor tab.
  const features = conditionFeatures(useAlgorithmStore((state) => state.classicMode))
  const pseudocodeLine = useAlgorithmStore((state) => selectCurrentSnapshot(state)?.pseudocodeLine ?? null)
  // Demo mode has no predictions, so every box in the AI Tutor tab below
  // (mistake analysis, Socratic hint, scaffolding fader) is empty there and
  // the tab was a dead end. Demo gets a free-form assistant instead; the
  // Socratic machinery stays with Practice and Hands-on.
  const isDemo = useAlgorithmStore((state) => state.mode === AlgorithmMode.DEMO)

  function expandToTab(tab: number) {
    if (collapsed) onToggle()
    onTabChange(tab)
  }

  return (
    <motion.div
      animate={fullWidth || fillParent ? undefined : { width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={cn(
        'flex h-full flex-col overflow-hidden border-l border-border bg-card',
        (fullWidth || fillParent) && 'w-full',
      )}
      style={{ overflowX: 'hidden' }}
    >
      {!fullWidth && collapsed ? (
        <div className="flex h-full flex-col items-center gap-2 py-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(0)}
                aria-label="Theory"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunk dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <TheoryIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Theory</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(1)}
                aria-label="AI Tutor"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunk dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <ExplanationIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">AI Tutor</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(2)}
                aria-label="Pseudocode"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunk dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <PseudocodeIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Pseudocode</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(3)}
                aria-label="Complexity"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunk dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <ComplexityIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Complexity</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => expandToTab(4)}
                aria-label="Step log"
                className="flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunk dark:text-dark-text-secondary dark:hover:bg-dark-border"
              >
                <StepLogIcon />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Step log</TooltipContent>
          </Tooltip>

          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand panel"
            className="mt-auto flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunk"
          >
            <ChevronIcon pointRight={false} />
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden px-3 py-2.5">
          <Tabs
            value={String(activeTab)}
            onValueChange={(value) => onTabChange(Number(value))}
            className="flex h-full flex-col overflow-hidden"
          >
            {/* Four tabs are wider than the panel at laptop widths. The strip
                scrolls itself; without that, focusing a tab made the browser
                scroll the overflow-hidden Tabs root sideways to reveal it,
                cutting off the whole panel's left edge. */}
            <TabsList id="right-panel-tabs" className="w-full max-w-full shrink-0 justify-start overflow-x-auto">
              {/* Theory is first and is Demo mode's default: a student who
                  has never met the algorithm reads the briefing before any
                  animation plays. Its id is 0 so the existing tab ids, the
                  keyboard shortcuts and the Classic remap all keep working. */}
              <TabsTrigger value="0" className="shrink-0 px-[10px] py-2 text-[12px] tracking-normal">
                Theory
              </TabsTrigger>
              {features.aiTutorTab && (
                <TabsTrigger value="1" className="shrink-0 px-[10px] py-2 text-[12px] tracking-normal">
                  AI Tutor
                </TabsTrigger>
              )}
              <TabsTrigger value="2" className="shrink-0 px-[10px] py-2 text-[12px] tracking-normal">
                Pseudocode
              </TabsTrigger>
              <TabsTrigger value="3" className="shrink-0 px-[10px] py-2 text-[12px] tracking-normal">
                Complexity
              </TabsTrigger>
              <TabsTrigger value="4" className="shrink-0 px-[10px] py-2 text-[12px] tracking-normal">
                Step log
              </TabsTrigger>
            </TabsList>
            <TabsContent value="0" className="flex-1 overflow-y-auto">
              <TheoryPanel />
            </TabsContent>
            {features.aiTutorTab && (
            <TabsContent
              value="1"
              className={cn('flex flex-1 flex-col gap-3', isDemo ? 'min-h-0 overflow-hidden' : 'overflow-y-auto')}
            >
              {isDemo ? (
                <DemoAssistant />
              ) : (
                <>
                  <ScaffoldingFader />
                  <MistakeAnalysisToast
                    message={feedbackCard?.analysis ?? null}
                    hint={feedbackCard?.hint}
                    counterfactualTrace={feedbackCard?.counterfactual}
                    tone={feedbackCard?.tone}
                    pseudocodeLine={pseudocodeLine}
                    onDismiss={onDismissFeedback}
                  />
                  <SocraticGuidanceBox hint={hint} predictionResolved={predictionResolved} />
                </>
              )}
            </TabsContent>
            )}
            <TabsContent value="2" className="flex-1 overflow-y-auto">
              <PseudocodePanel />
            </TabsContent>
            <TabsContent value="3" className="flex-1 overflow-y-auto">
              <ComplexityPanel />
            </TabsContent>
            <TabsContent value="4" className="flex-1 overflow-y-auto">
              <StepLog predictionResolved={predictionResolved} />
            </TabsContent>
          </Tabs>
          {!fullWidth && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse panel"
              className="mt-2 flex items-center justify-center self-end text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
            >
              <ChevronIcon pointRight />
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
