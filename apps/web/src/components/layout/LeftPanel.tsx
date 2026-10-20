import { useEffect, useState } from 'react'
import { conditionFeatures } from '@/utils/studyCondition'
import { useParams } from 'react-router-dom'
import { preloadPyodide } from '@/utils/pyodideRunner'
import { motion } from 'framer-motion'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { runFor } from '@/engine/runFor'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import AlgorithmControls, { CONTEXTUAL_CONTROL_SLUGS } from './AlgorithmControls'
import ChallengeGenerator, { START_CHALLENGE_EVENT } from '@/components/challenge/ChallengeGenerator'
import FeynmanModeButton, { OPEN_FEYNMAN_MODAL_EVENT } from '@/components/feynman/FeynmanModeButton'
import { MasteryPanel, type MasteryOfferHandlers } from '@/components/mastery/MasteryPanel'
import { useTopics } from '@/hooks/useTopics'
import { useStudyScope } from '@/hooks/useStudyScope'
import { CHALLENGES_PER_TOPIC } from '@/config/pacing'
import { hasChallengeGenerator } from '@/utils/challengeGenerators'
import { masteryPracticeInput } from '@/utils/mastery'
import { useFeynmanAccess } from '@/hooks/useFeynmanAccess'
import { usePipeline } from '@/hooks/usePipeline'
import PipelineTracker from '@/components/pipeline/PipelineTracker'
import VariableWatcher from '@/components/pipeline/VariableWatcher'
import { hasCodeMode } from '@/config/pipeline'
import { cn } from '@/lib/utils'


interface LeftPanelProps {
  collapsed: boolean
  onToggle: () => void
  difficulty: string
  /** Compact-layout tab mode (<1024px): renders full width, always expanded,
   * with no rail/collapse toggle - there's no room for a docked rail once
   * the panel is a full-screen tab instead of a sidebar. */
  fullWidth?: boolean
  /** Docked in a resizable workspace panel, which owns the width: fills
   * it instead of animating its own, keeping the rail and collapse toggle. */
  fillParent?: boolean
}

const EXPANDED_WIDTH = 200
const COLLAPSED_WIDTH = 48

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

/**
 * Topics whose run is not built from a numeric array, so the generic
 * "Custom array" box has nothing to act on and is not shown.
 *
 * Floyd-Warshall is the only one: it operates on a fixed small weighted
 * graph via the MATRIX canvas, and it has no contextual controls of its
 * own either, so it would otherwise fall through to the generic box and
 * offer an input that changes nothing when applied.
 */
export const FIXED_INPUT_SLUGS = new Set(['floyd-warshall'])

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

export default function LeftPanel({ collapsed, onToggle, difficulty, fullWidth = false, fillParent = false }: LeftPanelProps) {
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const setAlgorithm = useAlgorithmStore((state) => state.setAlgorithm)
  const codeEditorMode = useAlgorithmStore((state) => state.codeEditorMode)
  const toggleCodeEditorMode = useAlgorithmStore((state) => state.toggleCodeEditorMode)
  // Classic (the study's plain visualiser) has no AI tools or Code Mode.
  const classicMode = useAlgorithmStore((state) => state.classicMode)
  const features = conditionFeatures(classicMode)
  // Shares the ['topics'] cache; each topic carries its mastery (Phase 7D).
  // Not shown on a Classic topic, which has no junctions to answer.
  const { data: topics } = useTopics()
  const mastery = classicMode ? null : (topics?.find((topic) => topic.name === algorithmSlug)?.mastery ?? null)
  const { restricted: activeParticipant } = useStudyScope()
  const feynman = useFeynmanAccess()
  const challengesStarted = useAlgorithmStore((state) => state.challengesStarted)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const pipeline = usePipeline()
  // Code Mode rewrites a junction's prediction into a line of code to
  // write, and only one engine builds those junctions. The toggle used to
  // appear on every topic regardless, so on 65 of 66 flipping it did
  // nothing at all.
  const codeModeAvailable = hasCodeMode(algorithmSlug ?? '')

  // Code Mode on: fetch the Python runtime now, in the background, so the
  // first code question does not wait on a ~13MB download.
  useEffect(() => {
    if (codeEditorMode && features.codeMode) preloadPyodide()
  }, [codeEditorMode, features.codeMode])

  const [arrayInput, setArrayInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  function applyArrayInput() {
    const parsed = parseArrayInput(arrayInput)
    if (!parsed) {
      setInputError('Enter a comma-separated list of numbers, e.g. 5,3,1,4,2')
      return
    }
    setInputError(null)
    const displayName = getAlgorithmRegistryEntry(algorithmSlug ?? '')?.displayName ?? 'Bubble Sort'
    setAlgorithm(
      displayName,
      runFor(algorithmSlug, parsed),
    )
  }

  function handleRandom() {
    const values = generateRandomArray()
    setInputError(null)
    setArrayInput(values.join(','))
    const displayName = getAlgorithmRegistryEntry(algorithmSlug ?? '')?.displayName ?? 'Bubble Sort'
    setAlgorithm(
      displayName,
      runFor(algorithmSlug, values),
    )
  }

  // The mastery panel's one remediation offer (Phase 7E). An active
  // participant gets none: their mastery is read-only, and nothing on it
  // may change what the study asks them (Phase 7F).
  function practise(run: () => void) {
    const store = useAlgorithmStore.getState()
    if (store.mode !== AlgorithmMode.PRACTICE) store.setMode(AlgorithmMode.PRACTICE)
    run()
  }
  const offerHandlers: MasteryOfferHandlers | undefined =
    activeParticipant || !mastery
      ? undefined
      : {
          FOCUSED_RUN: () => practise(() => useAlgorithmStore.getState().startFocusedRun(mastery.missedJunctionTypes)),
          PRACTISE_AGAIN: () => practise(() => useAlgorithmStore.getState().resetAlgorithm()),
          NEW_INPUT:
            algorithmSlug && !CONTEXTUAL_CONTROL_SLUGS.has(algorithmSlug)
              ? () =>
                  practise(() => {
                    const breadth = mastery.criteria.find((c) => c.id === 'BREADTH')?.value ?? 0
                    const length = getAlgorithmRegistryEntry(algorithmSlug)?.defaultInput.length ?? 6
                    const values = masteryPracticeInput(algorithmSlug, length, breadth)
                    setArrayInput(values.join(','))
                    setInputError(null)
                    const displayName = getAlgorithmRegistryEntry(algorithmSlug)?.displayName ?? algorithmName
                    setAlgorithm(displayName, runFor(algorithmSlug, values))
                  })
              : 'Pick a different value or preset in the controls above.',
          FEYNMAN:
            feynman.state === 'AVAILABLE'
              ? () => window.dispatchEvent(new CustomEvent(OPEN_FEYNMAN_MODAL_EVENT))
              : (feynman.reason ?? 'Feynman mode is not available here.'),
          CHALLENGE: !features.aiChallenge || !hasChallengeGenerator(algorithmSlug)
            ? 'AI Challenge is not available for this topic.'
            : challengesStarted >= CHALLENGES_PER_TOPIC
              ? 'Challenge limit reached for this session; open the topic again for another.'
              : () => practise(() => window.dispatchEvent(new CustomEvent(START_CHALLENGE_EVENT))),
        }

  return (
    <motion.div
      id="left-panel"
      animate={fullWidth || fillParent ? undefined : { width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={cn(
        'flex h-full flex-col overflow-hidden border-r border-border bg-card',
        (fullWidth || fillParent) && 'w-full',
      )}
    >
      {!fullWidth && collapsed ? (
        <div className="flex h-full flex-col items-center gap-2 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand panel"
            className="mt-auto flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunk dark:text-dark-text-secondary dark:hover:bg-dark-border"
          >
            <ChevronIcon pointRight />
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden pt-3">
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-1">
          {/* First in the panel: the route through this topic, before the
              controls for whichever stage you happen to be in. */}
          <PipelineTracker stages={pipeline} />
          {/* Directly under the route, above the controls: this is live
              state a student reads while stepping, so it has to be visible
              without scrolling the panel. */}
          <VariableWatcher />
          {algorithmSlug && CONTEXTUAL_CONTROL_SLUGS.has(algorithmSlug) ? (
            <AlgorithmControls slug={algorithmSlug} />
          ) : algorithmSlug && FIXED_INPUT_SLUGS.has(algorithmSlug) ? (
            <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
              <h3 className="text-micro text-text-muted dark:text-dark-text-secondary">Input</h3>
              <p className="text-micro font-normal text-text-muted dark:text-dark-text-secondary">
                This algorithm runs on a fixed weighted graph, so there is no array to change.
              </p>
            </section>
          ) : (
            <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
              <h3 className="text-micro text-text-muted dark:text-dark-text-secondary">
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
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary dark:text-dark-text-primary"
              />
              {inputError && <p className="text-xs text-error">{inputError}</p>}
              <Button variant="outline" size="sm" onClick={applyArrayInput}>
                Apply
              </Button>
              <Button variant="outline" size="sm" onClick={handleRandom}>
                Random
              </Button>
            </section>
          )}
          {mastery && <MasteryPanel mastery={mastery} handlers={offerHandlers} />}
        </div>

        {/* Pinned outside the scroll container above so a tall Playback/
            Controls section (e.g. Dijkstra's contextual controls) can never
            push AI Tools out of view. */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-3 pt-2.5 pb-1 dark:border-dark-border">
          {features.aiChallenge && (
          <section id="ai-tools-section" className="flex flex-col gap-2">
            <h3 className="text-micro text-text-muted dark:text-dark-text-secondary">
              AI tools
            </h3>
            <ChallengeGenerator difficulty={difficulty} />
            {features.feynman && <FeynmanModeButton />}
          </section>
          )}

          {features.codeMode && (
          <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
            <button
              id="code-mode-toggle"
              type="button"
              onClick={toggleCodeEditorMode}
              disabled={!codeModeAvailable}
              aria-pressed={codeEditorMode}
              aria-label="Toggle Code Mode"
              className={cn(
                'flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                !codeModeAvailable
                  ? 'cursor-default border-border text-text-muted opacity-50 dark:text-dark-text-secondary'
                  : codeEditorMode
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-border text-text-primary hover:bg-surface-sunk dark:text-dark-text-primary dark:hover:bg-dark-border',
              )}
            >
              <span className="flex items-center gap-1.5">
                <CodeBracketsIcon />
                Code Mode
              </span>
              <span
                className={cn(
                  'flex h-5 w-9 items-center rounded-full px-0.5 transition-colors',
                  codeEditorMode && codeModeAvailable ? 'justify-end bg-primary' : 'justify-start bg-border',
                )}
              >
                <span className="size-4 rounded-full bg-background shadow-sm" />
              </span>
            </button>
            {!codeModeAvailable && (
              <p className="text-micro font-normal text-text-muted dark:text-dark-text-secondary">
                No code challenge written for this topic yet.
              </p>
            )}
          </section>
          )}

          {!fullWidth && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse panel"
              className="flex items-center justify-center gap-1 self-start text-text-muted hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
            >
              <ChevronIcon pointRight={false} />
            </button>
          )}
        </div>
        </div>
      )}
    </motion.div>
  )
}
