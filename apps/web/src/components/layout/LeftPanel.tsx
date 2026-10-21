import { useEffect, useState } from 'react'
import { conditionFeatures } from '@/utils/studyCondition'
import { useParams } from 'react-router-dom'
import { preloadPyodide } from '@/utils/pyodideRunner'
import { motion } from 'framer-motion'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { runFor } from '@/engine/runFor'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import AlgorithmControls, { CONTEXTUAL_CONTROL_SLUGS } from './AlgorithmControls'
import ChallengeGenerator from '@/components/challenge/ChallengeGenerator'
import FeynmanModeButton from '@/components/feynman/FeynmanModeButton'
import { usePipeline } from '@/hooks/usePipeline'
import PipelineTracker from '@/components/pipeline/PipelineTracker'
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
  const pipeline = usePipeline()
  // Code Mode rewrites a junction's prediction into a line of code to
  // write. The toggle used to appear on every topic while a single engine
  // was the only one that could honour it, so on 65 of 66 flipping it did
  // nothing at all; it is driven by whether a challenge exists now.
  const codeModeAvailable = hasCodeMode(algorithmSlug ?? '')
  // The pipeline already words the reason per topic (none written yet
  // against never going to be written), so the panel does not word it a
  // second time and differently.
  const codeUnavailableReason =
    pipeline.find((stage) => stage.id === 'CODE')?.reason ?? 'No code challenge written for this topic yet.'

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
        /* Three zones, one job each, in the order a student needs them:
           where am I in this topic, what is it running on, and what do I
           want the page to be.

           It held six groups of equal weight in one 230px scrolling
           column - the route, a live variable readout, the input
           controls, the mastery criteria, the AI tools and the Code Mode
           switch - with no hierarchy between them. Nothing read as
           primary, and the panel scrolled while the canvas had room to
           spare.

           The variable watcher went because the right panel already
           narrates the step while you work. Mastery went because it is
           assessment rather than a control. Both belong where they are
           read, not beside the thing being taught. */
        <div className="flex h-full flex-col overflow-hidden pt-3">
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-1">
          {/* Zone 1: where am I. */}
          <PipelineTracker stages={pipeline} />
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
        </div>

        {/* Zone 3: what do I want the page to be.
            Pinned outside the scroll container above, so a tall contextual
            controls section can never push these out of view. Feynman and
            Code Mode are peers - each changes what the page asks of you -
            so they sit together, no longer under an "AI tools" heading
            that described how they are built rather than what they do. */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-3 pt-2.5 pb-1 dark:border-dark-border">
          {features.aiChallenge && (
          <section id="ai-tools-section" className="flex flex-col gap-2">
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
                {codeUnavailableReason}
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
