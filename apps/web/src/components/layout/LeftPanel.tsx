import { useEffect, useState } from 'react'
import { conditionFeatures } from '@/utils/studyCondition'
import { useStudyScope } from '@/hooks/useStudyScope'
import { useParams } from 'react-router-dom'
import { preloadPyodide } from '@/utils/pyodideRunner'
import { motion } from 'framer-motion'
import { AlgorithmMode } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { runFor } from '@/engine/runFor'
import { withCodeMode, withoutCodeMode } from '@/engine/codeMode'
import { autoSearchTarget, getAlgorithmRegistryEntry } from '@/engine/registry'
import { prefixSumEngine } from '@/engine/prefixSum'
import { floydWarshallEngine } from '@/engine/floydWarshall'
import { MEDIUM_WEIGHTED } from '@/engine/graphPresets'
import type { WeightedAdjacencyList } from '@dsa-tutor/types'
import AlgorithmControls, { CONTEXTUAL_CONTROL_SLUGS } from './AlgorithmControls'
import ChallengeGenerator from '@/components/challenge/ChallengeGenerator'
import FeynmanModeButton from '@/components/feynman/FeynmanModeButton'
import DriveCanvasModal from '@/components/prediction/DriveCanvasModal'
import { usePipeline } from '@/hooks/usePipeline'
import PipelineTracker from '@/components/pipeline/PipelineTracker'
import { APPLY_INPUT_EVENT } from './applyInput'
import { stageOffer } from '@/config/pipeline'
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

type FloydPresetName = 'default' | 'dense' | 'chain' | 'shortcut'

const FLOYD_WARSHALL_PRESETS: Record<
  FloydPresetName,
  { label: string; nodeIds: string[]; adjacency: WeightedAdjacencyList }
> = {
  default: {
    label: 'Default (5 nodes, A-E)',
    nodeIds: MEDIUM_WEIGHTED.nodes.slice(0, 5).map((n) => n.id),
    adjacency: MEDIUM_WEIGHTED.adjacency,
  },
  dense: {
    label: 'Dense 4-node (A-D)',
    nodeIds: ['A', 'B', 'C', 'D'],
    adjacency: {
      A: [
        { to: 'B', weight: 8 },
        { to: 'D', weight: 1 },
      ],
      B: [{ to: 'C', weight: 1 }],
      C: [{ to: 'A', weight: 4 }],
      D: [
        { to: 'B', weight: 2 },
        { to: 'C', weight: 9 },
      ],
    },
  },
  chain: {
    label: 'Directed chain (4 nodes)',
    nodeIds: ['A', 'B', 'C', 'D'],
    adjacency: {
      A: [{ to: 'B', weight: 3 }, { to: 'D', weight: 15 }],
      B: [{ to: 'C', weight: 4 }],
      C: [{ to: 'D', weight: 2 }],
      D: [],
    },
  },
  shortcut: {
    label: 'Indirect shortcut (5 nodes)',
    nodeIds: ['A', 'B', 'C', 'D', 'E'],
    adjacency: {
      A: [{ to: 'B', weight: 2 }, { to: 'E', weight: 20 }],
      B: [{ to: 'C', weight: 3 }],
      C: [{ to: 'D', weight: 2 }],
      D: [{ to: 'E', weight: 3 }],
      E: [{ to: 'A', weight: 5 }],
    },
  },
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

export default function LeftPanel({ collapsed, onToggle, difficulty, fullWidth = false, fillParent = false }: LeftPanelProps) {
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const { restricted } = useStudyScope()
  const setAlgorithm = useAlgorithmStore((state) => state.setAlgorithm)
  const codeEditorMode = useAlgorithmStore((state) => state.codeEditorMode)
  const toggleCodeEditorMode = useAlgorithmStore((state) => state.toggleCodeEditorMode)
  // Classic (the study's plain visualiser) has no AI tools or Code Mode.
  const classicMode = useAlgorithmStore((state) => state.classicMode)
  const features = conditionFeatures(classicMode)
  const pipeline = usePipeline()
  // Code Mode rewrites a junction's prediction into a line of code to
  // write. Whether it can be entered is the stage's answer, not this
  // panel's: asking hasCodeMode alone said only that a challenge exists,
  // so the toggle stayed live on a topic whose own tracker, directly
  // above it, read "Finish a Practice run first" - and the reason below
  // it never showed, because that only rendered when no challenge existed.
  const codeOffer = stageOffer(pipeline, 'CODE')
  const codeModeAvailable = codeOffer.enabled
  const codeUnavailableReason = codeOffer.reason ?? 'There is no code challenge for this topic.'

  // Code Mode on: fetch the Python runtime now, in the background, so the
  // first code question does not wait on a ~13MB download.
  useEffect(() => {
    if (codeEditorMode && features.codeMode) preloadPyodide()
  }, [codeEditorMode, features.codeMode])

  const [arrayInput, setArrayInput] = useState('')
  const [targetInput, setTargetInput] = useState('')
  const [rangeFromInput, setRangeFromInput] = useState('')
  const [rangeToInput, setRangeToInput] = useState('')
  const [floydPreset, setFloydPreset] = useState<FloydPresetName>('default')
  const [inputError, setInputError] = useState<string | null>(null)
  const [driveModalOpen, setDriveModalOpen] = useState(false)

  useEffect(() => {
    setTargetInput('')
    setRangeFromInput('')
    setRangeToInput('')
    setInputError(null)
  }, [algorithmSlug])

  const registryEntry = getAlgorithmRegistryEntry(algorithmSlug ?? '')
  const snapshotArray = useAlgorithmStore((s) => s.snapshotArray)
  const currentCanvasType = snapshotArray[0]?.canvasType ?? 'ARRAY'
  const canDriveArrayCanvas =
    !restricted && features.codeMode && Boolean(registryEntry) && currentCanvasType === 'ARRAY'

  function handleToggleCodeMode() {
    const nextEnabled = !codeEditorMode
    toggleCodeEditorMode()
    const state = useAlgorithmStore.getState()
    const transformed = nextEnabled
      ? withCodeMode(state.snapshotArray, algorithmSlug, true)
      : withoutCodeMode(state.snapshotArray)
    if (transformed !== state.snapshotArray) {
      useAlgorithmStore.setState({ snapshotArray: transformed })
    }
    if (nextEnabled && state.mode === AlgorithmMode.DEMO && stageOffer(pipeline, 'PRACTICE').enabled) {
      state.setMode(AlgorithmMode.PRACTICE)
    }
  }

  const isSearchGeneric = algorithmSlug === 'linear-search' || algorithmSlug === 'binary-search'
  const isPrefixSum = algorithmSlug === 'prefix-sum'

  function getActiveArray(): number[] | null {
    const parsed = parseArrayInput(arrayInput)
    if (parsed) return parsed
    if (
      (isSearchGeneric && targetInput.trim().length > 0) ||
      (isPrefixSum && (rangeFromInput.trim().length > 0 || rangeToInput.trim().length > 0))
    ) {
      return registryEntry?.defaultInput && registryEntry.defaultInput.length > 0
        ? [...registryEntry.defaultInput]
        : [5, 3, 1, 4, 2]
    }
    return null
  }

  function runWithCustomParams(values: number[], customTargetRaw = targetInput, fromRaw = rangeFromInput, toRaw = rangeToInput) {
    const displayName = getAlgorithmRegistryEntry(algorithmSlug ?? '')?.displayName ?? 'Bubble Sort'
    const codeModeOn = useAlgorithmStore.getState().codeEditorMode
    if (isSearchGeneric && customTargetRaw.trim().length > 0) {
      const target = Number(customTargetRaw.trim())
      if (Number.isNaN(target) || !Number.isFinite(target)) {
        setInputError('Enter a valid target number.')
        return
      }
      setInputError(null)
      setAlgorithm(displayName, runFor(algorithmSlug, values, { target }))
      return
    }
    if (isPrefixSum && (fromRaw.trim().length > 0 || toRaw.trim().length > 0)) {
      const fromVal = fromRaw.trim().length > 0 ? Number(fromRaw.trim()) : 0
      const toVal = toRaw.trim().length > 0 ? Number(toRaw.trim()) : values.length - 1
      if (
        !Number.isInteger(fromVal) ||
        !Number.isInteger(toVal) ||
        fromVal < 0 ||
        toVal >= values.length ||
        fromVal > toVal
      ) {
        setInputError(`Enter valid indices 0 <= from <= to <= ${values.length - 1}.`)
        return
      }
      setInputError(null)
      const queries =
        fromVal === 0
          ? [{ from: fromVal, to: toVal }, { from: Math.min(1, values.length - 1), to: values.length - 1 }]
          : [{ from: 0, to: Math.min(2, values.length - 1) }, { from: fromVal, to: toVal }]
      setAlgorithm(displayName, withCodeMode(prefixSumEngine(values, queries), algorithmSlug, codeModeOn))
      return
    }
    setInputError(null)
    setAlgorithm(displayName, runFor(algorithmSlug, values))
  }

  function applyArrayInput() {
    const parsed = getActiveArray()
    if (!parsed) {
      setInputError('Enter a comma-separated list of numbers, e.g. 5,3,1,4,2')
      return
    }
    runWithCustomParams(parsed)
  }

  function applyFloydPreset(presetName: FloydPresetName) {
    setFloydPreset(presetName)
    const preset = FLOYD_WARSHALL_PRESETS[presetName]
    const displayName = getAlgorithmRegistryEntry('floyd-warshall')?.displayName ?? 'Floyd-Warshall'
    const codeModeOn = useAlgorithmStore.getState().codeEditorMode
    setAlgorithm(
      displayName,
      withCodeMode(floydWarshallEngine(preset.nodeIds, preset.adjacency), 'floyd-warshall', codeModeOn),
    )
  }

  // Asked from outside the panel (the end-of-run mastery offer). Kept in
  // step with the box exactly as Random is, so the box never describes a
  // run that is no longer on screen.
  useEffect(() => {
    function handleApplyInput(event: Event) {
      const values = (event as CustomEvent<number[]>).detail
      if (!Array.isArray(values) || values.length === 0) return
      setInputError(null)
      setArrayInput(values.join(','))
      const displayName = getAlgorithmRegistryEntry(algorithmSlug ?? '')?.displayName ?? 'Bubble Sort'
      setAlgorithm(displayName, runFor(algorithmSlug, values))
    }
    window.addEventListener(APPLY_INPUT_EVENT, handleApplyInput)
    return () => window.removeEventListener(APPLY_INPUT_EVENT, handleApplyInput)
  }, [algorithmSlug, setAlgorithm])

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
                This algorithm runs on a weighted graph distance matrix rather than a 1D array.
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-micro text-text-muted dark:text-dark-text-secondary">
                  Preset graph
                </label>
                <select
                  aria-label="Floyd-Warshall graph preset"
                  value={floydPreset}
                  onChange={(event) => applyFloydPreset(event.target.value as FloydPresetName)}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-primary dark:text-dark-text-primary"
                >
                  {(Object.keys(FLOYD_WARSHALL_PRESETS) as FloydPresetName[]).map((key) => (
                    <option key={key} value={key}>
                      {FLOYD_WARSHALL_PRESETS[key].label}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="outline" size="sm" onClick={() => applyFloydPreset(floydPreset)}>
                Re-run
              </Button>
            </section>
          ) : (
            <section className="flex flex-col gap-2 border-t-[0.5px] border-border pt-2.5">
              <h3 className="text-micro text-text-muted dark:text-dark-text-secondary">
                Custom array
              </h3>
              {!restricted && (
                <div className="flex flex-wrap gap-1">
                  {(algorithmSlug === 'dp-1d' || algorithmSlug === 'divide-and-conquer'
                    ? [
                        { label: 'Mixed +/-', vals: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
                        { label: 'All negative', vals: [-8, -3, -6, -2, -5, -4] },
                        { label: 'All positive', vals: [2, 4, 1, 5, 3] },
                      ]
                    : algorithmSlug === 'binary-search'
                      ? [
                          { label: 'Sorted 8', vals: [1, 3, 5, 7, 9, 11, 15, 19] },
                          { label: 'Wide gaps', vals: [2, 10, 24, 50, 88, 120, 200] },
                          { label: 'Duplicates', vals: [1, 3, 5, 5, 5, 9, 15, 19] },
                        ]
                      : algorithmSlug === 'linear-search'
                        ? [
                            { label: 'Unsorted', vals: [14, 7, 22, 3, 19, 8, 11] },
                            { label: 'Target at start', vals: [9, 4, 12, 7, 15, 9] },
                            { label: 'Duplicates', vals: [5, 2, 8, 2, 9, 2, 4] },
                          ]
                        : algorithmSlug === 'prefix-sum'
                          ? [
                              { label: 'Default', vals: [3, 1, 4, 1, 5, 9, 2] },
                              { label: 'Unit steps', vals: [1, 2, 3, 4, 5, 6] },
                              { label: 'Mixed +/-', vals: [4, -2, 5, -1, 3, -3, 6] },
                            ]
                          : [
                              { label: 'Sorted', vals: [1, 2, 3, 4, 5, 6] },
                              { label: 'Reversed', vals: [8, 7, 6, 5, 4, 3, 2, 1] },
                              { label: 'Nearly sorted', vals: [1, 2, 5, 3, 4, 6, 7] },
                              { label: 'Duplicates', vals: [4, 2, 4, 1, 2, 4, 1] },
                            ]
                  ).map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setInputError(null)
                        setArrayInput(preset.vals.join(','))
                        runWithCustomParams(preset.vals)
                      }}
                      className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted transition-colors hover:border-primary/50 hover:bg-surface-sunk hover:text-text-primary dark:border-dark-border dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
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
              {isSearchGeneric && !restricted && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-micro text-text-muted dark:text-dark-text-secondary">
                      Target value
                    </label>
                    <div className="flex gap-1">
                      {(
                        [
                          {
                            label: 'First',
                            pick: (arr: number[]) => arr[0],
                          },
                          {
                            label: 'Mid',
                            pick: (arr: number[]) => arr[Math.floor(arr.length / 2)],
                          },
                          {
                            label: 'Last',
                            pick: (arr: number[]) => arr[arr.length - 1],
                          },
                          {
                            label: 'Missing',
                            pick: (arr: number[]) => Math.max(...arr) + 7,
                          },
                        ] as const
                      ).map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => {
                            const active =
                              parseArrayInput(arrayInput) ??
                              (registryEntry?.defaultInput?.length
                                ? [...registryEntry.defaultInput]
                                : [1, 3, 5, 7, 9, 11])
                            const normalized =
                              algorithmSlug === 'binary-search'
                                ? [...active].sort((a, b) => a - b)
                                : active
                            const nextTarget = String(chip.pick(normalized))
                            setTargetInput(nextTarget)
                            runWithCustomParams(normalized, nextTarget)
                          }}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-text-muted transition-colors hover:border-primary/50 hover:text-text-primary dark:border-dark-border dark:text-dark-text-secondary"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    aria-label="Search target"
                    value={targetInput}
                    onChange={(event) => setTargetInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') applyArrayInput()
                    }}
                    placeholder={`Auto (${autoSearchTarget(algorithmSlug ?? '', parseArrayInput(arrayInput) ?? registryEntry?.defaultInput ?? [5, 3, 1, 4, 2])})`}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-text-primary outline-none focus:border-primary dark:text-dark-text-primary"
                  />
                </div>
              )}
              {isPrefixSum && !restricted && (
                <div className="flex flex-col gap-1">
                  <label className="text-micro text-text-muted dark:text-dark-text-secondary">
                    Query range [from .. to]
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      min={0}
                      aria-label="Range from"
                      value={rangeFromInput}
                      onChange={(event) => setRangeFromInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') applyArrayInput()
                      }}
                      placeholder="from (0)"
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-text-primary outline-none focus:border-primary dark:text-dark-text-primary"
                    />
                    <input
                      type="number"
                      min={0}
                      aria-label="Range to"
                      value={rangeToInput}
                      onChange={(event) => setRangeToInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') applyArrayInput()
                      }}
                      placeholder="to (n-1)"
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-text-primary outline-none focus:border-primary dark:text-dark-text-primary"
                    />
                  </div>
                </div>
              )}
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
              onClick={handleToggleCodeMode}
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
            {canDriveArrayCanvas && (
              <>
                <button
                  type="button"
                  onClick={() => setDriveModalOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface-sunk px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/50 hover:text-text-primary dark:border-dark-border dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
                >
                  <CodeBracketsIcon />
                  Drive Canvas (Python)
                </button>
                <DriveCanvasModal
                  open={driveModalOpen}
                  onClose={() => setDriveModalOpen(false)}
                  displayName={registryEntry?.displayName ?? 'Algorithm'}
                  initialArray={
                    (() => {
                      const s0 = useAlgorithmStore.getState().snapshotArray[0]?.dataStructureState
                      return Array.isArray(s0) && s0.every((v) => typeof v === 'number')
                        ? (s0 as number[])
                        : (registryEntry?.defaultInput ?? [5, 3, 1, 4, 2])
                    })()
                  }
                />
              </>
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
