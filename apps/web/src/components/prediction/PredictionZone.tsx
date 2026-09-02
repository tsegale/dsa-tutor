import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlgorithmMode, CriticalJunctionType, JunctionDifficulty, PredictionType, ScaffoldingLevel } from '@dsa-tutor/types'
import type {
  AlgorithmSnapshot,
  CodeEvalResponse,
  HintRequest,
  MisconceptionCategory,
  PredictionRequest,
} from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { submitPrediction, requestHint } from '@/api/predictions'
import { apiFetch } from '@/api/client'
import { cn } from '@/lib/utils'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { firstSentence } from '@/utils/predictionJunction'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import XPToast from '@/components/ui/XPToast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import HintAvatar, { DISMISS_HINT_EVENT } from './HintAvatar'
import ValueInput from './ValueInput'
import TileGrid, { type TileOption } from './TileGrid'
import CodeEditorInput from './CodeEditorInput'

export interface PredictionOutcomeDetail {
  correct: boolean
  stepIndex: number
  predictionSubmitted: string
  misconceptionCategory: MisconceptionCategory | null
  hintsRequestedForStep: number
  timeSpentSeconds: number
  junctionType: CriticalJunctionType
  junctionDifficulty: JunctionDifficulty
  /** True for every Code Editor submission (correct or not). Tells the page
   * level to skip the tile-flow's computeMistakePath fallback entirely -
   * a code-eval outcome drives the canvas only via codeEvalBuggyState. */
  isCodeEval?: boolean
  /** Set only for an incorrect, visualisable Code Editor submission - the
   * array state the student's buggy code actually produces, so the page
   * level can play it on the canvas via the Phase 15 mistake path. */
  codeEvalBuggyState?: { resultingState: number[]; activeIndices: number[] } | null
}

const CODE_EVAL_XP = 5

interface PredictionZoneProps {
  onSubmit: (answer: string) => void
  onHintRequested?: () => void
  onPredictionResult?: (detail: PredictionOutcomeDetail) => void
  // Mistake state is owned by the page level now, so the AI Tutor tab
  // (RightPanel) can render the same MisconceptionToast without floating
  // it over the canvas a second time - PredictionZone only ever writes
  // it here, RightPanel is what reads it for display.
  setMistakeAnalysis: (value: string | null) => void
  setMistakeHint: (value: string | null) => void
  setMistakeCounterfactual: (value: string | null) => void
  // Hint text is also lifted so the Socratic guidance box in RightPanel
  // can show it, but PredictionZone still reads it too (HintAvatar).
  hint: string | null
  setHint: (value: string | null) => void
}

export const CLEAR_CANVAS_SELECTION_EVENT = 'dsa-tutor:clear-canvas-selection'
export const REQUEST_HINT_EVENT = 'request-hint'
export const ESCAPE_EVENT = 'dsa-tutor:escape'
export const SHOW_EXPLANATION_LINK_EVENT = 'dsa-tutor:show-explanation-link'
export const HANDS_ON_ANSWER_EVENT = 'dsa-tutor:hands-on-answer'

const PROACTIVE_HINT_DELAY_MS = 8000
const AUTO_RESET_DELAY_MS = 1200
const NONE_ADVANCE_DELAY_MS = 1500
const MAX_ATTEMPTS_BEFORE_ADVANCE = 2

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Fisher-Yates shuffle so the correct tile isn't always in the same position. Tile ids never change, only display order. */
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * The entire Bubble Sort prediction interaction: SWAP_DECISION always
 * offers two neutral action tiles (neither reveals correctness); the
 * three conceptual junctions offer one correct claim plus three
 * research-grounded distractor misconceptions. Correctness lives in the
 * tile id only - shuffling changes display order, never which id is
 * correct, and the backend checks id, not position.
 */
function getTilesForSnapshot(snapshot: AlgorithmSnapshot): TileOption[] {
  switch (snapshot.criticalJunctionType) {
    case CriticalJunctionType.SWAP_DECISION:
      return shuffleArray([
        { id: 'swap', label: 'Swap them' },
        { id: 'no-swap', label: 'Leave them' },
      ])

    case CriticalJunctionType.PASS_COMPLETE:
      return shuffleArray([
        { id: 'correct', label: 'The largest remaining unsorted element is now in its correct position' },
        { id: 'wrong-1', label: 'The entire array is now sorted' },
        { id: 'wrong-2', label: 'The smallest element moved to the front' },
        { id: 'wrong-3', label: 'Every element was compared exactly once' },
      ])

    case CriticalJunctionType.EARLY_TERMINATION:
      return shuffleArray([
        { id: 'correct', label: 'No swaps were needed - the array was already in order' },
        { id: 'wrong-1', label: 'The algorithm completed the maximum number of passes' },
        { id: 'wrong-2', label: 'Equal elements caused the loop to stop' },
        { id: 'wrong-3', label: 'The first element reached its correct position' },
      ])

    case CriticalJunctionType.ALGORITHM_COMPLETE:
      return shuffleArray([
        { id: 'correct', label: 'No adjacent pair is out of order anywhere in the array' },
        { id: 'wrong-1', label: 'Every element was visited the same number of times' },
        { id: 'wrong-2', label: 'The first and last elements are in their correct positions' },
        { id: 'wrong-3', label: 'The total number of swaps equals the array length' },
      ])

    default:
      return []
  }
}

/** The question shown above the tiles, read before the learner chooses. */
function getPromptForSnapshot(snapshot: AlgorithmSnapshot): string {
  const arr = snapshot.dataStructureState as number[]
  const [i, j] = snapshot.activeIndices

  switch (snapshot.criticalJunctionType) {
    case CriticalJunctionType.SWAP_DECISION:
      return `The algorithm is comparing index ${i} (value ${arr[i]}) and index ${j} (value ${arr[j]}). What should happen next?`

    case CriticalJunctionType.PASS_COMPLETE:
      return 'This pass is now complete. What can we guarantee about the array?'

    case CriticalJunctionType.EARLY_TERMINATION:
      return 'The algorithm stopped before completing all passes. Why?'

    case CriticalJunctionType.ALGORITHM_COMPLETE:
      return 'Bubble Sort has finished. What proves the array is fully sorted?'

    default:
      return 'What happens next?'
  }
}

/** What the array looks like after correctly resolving a SWAP_DECISION junction - the same rule the engine itself applies. */
function computeExpectedNextState(snapshot: AlgorithmSnapshot): number[] {
  const arr = [...(snapshot.dataStructureState as number[])]
  const [i, j] = snapshot.activeIndices
  if (i === undefined || j === undefined || arr[i] === undefined || arr[j] === undefined) return arr
  if (arr[i] > arr[j]) {
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

function Spinner() {
  return (
    <motion.svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeDasharray="14 42"
        strokeLinecap="round"
      />
    </motion.svg>
  )
}

export default function PredictionZone({
  onSubmit,
  onHintRequested,
  onPredictionResult,
  setMistakeAnalysis,
  setMistakeHint,
  setMistakeCounterfactual,
  hint,
  setHint,
}: PredictionZoneProps) {
  const mode = useAlgorithmStore((state) => state.mode)
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const sessionId = useAlgorithmStore((state) => state.sessionId)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const addXP = useAlgorithmStore((state) => state.addXP)
  const { play } = useSoundEffects()
  const prefersReducedMotion = useReducedMotion()

  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)
  const [currentTiles, setCurrentTiles] = useState<TileOption[]>([])
  const [submissionState, setSubmissionState] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  const [shakeToken, setShakeToken] = useState(0)
  const [xpAmount, setXpAmount] = useState(0)
  const [xpVisible, setXpVisible] = useState(false)
  const [hintsRequestedCount, setHintsRequestedCount] = useState(0)
  const [stepStartTime, setStepStartTime] = useState(() => Date.now())
  const [codeEvalPraise, setCodeEvalPraise] = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting] = useState(false)

  const attemptCountRef = useRef(0)
  const proactiveHintFiredRef = useRef(false)

  const isVisible =
    (mode === AlgorithmMode.PRACTICE || mode === AlgorithmMode.HANDS_ON) &&
    snapshot !== null &&
    snapshot.isPredictionRequired
  const isHandsOnSwapDecision =
    mode === AlgorithmMode.HANDS_ON && snapshot?.criticalJunctionType === CriticalJunctionType.SWAP_DECISION
  const stepIndex = snapshot?.stepIndex ?? null

  // Tiles (and their shuffled order) are generated once per prediction
  // step and held fixed - regenerating on every render would reshuffle
  // out from under the learner mid-decision.
  useEffect(() => {
    if (snapshot?.isPredictionRequired) {
      setCurrentTiles(getTilesForSnapshot(snapshot))
    }
    setCurrentAnswer(null)
    setSubmissionState('idle')
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    setHint(null)
    setHintLoading(false)
    setHintsRequestedCount(0)
    setStepStartTime(Date.now())
    setCodeEvalPraise(null)
    setCodeSubmitting(false)
    attemptCountRef.current = 0
    proactiveHintFiredRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex])

  // Hands-On mode: the drag gesture itself is the submission, so this
  // fires handleSubmit directly rather than just staging currentAnswer.
  // A ref keeps the call bound to the latest handleSubmit closure without
  // needing to re-subscribe the listener on every dependency change.
  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit

  useEffect(() => {
    function handleHandsOnAnswer(event: Event) {
      const answer = (event as CustomEvent<'swap' | 'no-swap'>).detail
      setCurrentAnswer(answer)
      void handleSubmitRef.current(answer)
    }
    window.addEventListener(HANDS_ON_ANSWER_EVENT, handleHandsOnAnswer)
    return () => window.removeEventListener(HANDS_ON_ANSWER_EVENT, handleHandsOnAnswer)
  }, [])

  useEffect(() => {
    function handleDismiss() {
      setHint(null)
    }
    window.addEventListener(DISMISS_HINT_EVENT, handleDismiss)
    window.addEventListener(ESCAPE_EVENT, handleDismiss)
    return () => {
      window.removeEventListener(DISMISS_HINT_EVENT, handleDismiss)
      window.removeEventListener(ESCAPE_EVENT, handleDismiss)
    }
  }, [setHint])

  useEffect(() => {
    function handleRequestHintEvent() {
      void handleRequestHint(false)
    }
    window.addEventListener(REQUEST_HINT_EVENT, handleRequestHintEvent)
    return () => window.removeEventListener(REQUEST_HINT_EVENT, handleRequestHintEvent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, hintLoading])

  // HIGH scaffolding only: surface a hint on its own after a stretch of
  // inactivity, rather than waiting for the learner to press H. Fires at
  // most once per step so it doesn't nag after a manual dismissal.
  useEffect(() => {
    if (!isVisible || scaffoldingLevel !== ScaffoldingLevel.HIGH) return
    if (submissionState !== 'idle' || hint !== null || hintLoading) return
    if (proactiveHintFiredRef.current) return

    const timer = setTimeout(() => {
      proactiveHintFiredRef.current = true
      void handleRequestHint(true)
    }, PROACTIVE_HINT_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, scaffoldingLevel, submissionState, hint, hintLoading, stepIndex])

  async function handleRequestHint(proactive: boolean) {
    if (hint !== null || hintLoading || !snapshot) return
    setHintLoading(true)
    if (!proactive) {
      setHintsRequestedCount((count) => count + 1)
      onHintRequested?.()
    }

    const request: HintRequest = {
      algorithmName,
      stepIndex: snapshot.stepIndex,
      currentPredictionPrompt: snapshot.description,
      errorHistory: [],
      scaffoldingLevel,
    }

    const response = await requestHint(request)
    setHint(response.hint)
    setHintLoading(false)
  }

  function handleTryAgain() {
    setSubmissionState('idle')
    setCurrentAnswer(null)
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
  }

  async function handleSubmit(explicitAnswer?: string) {
    const answer = explicitAnswer ?? currentAnswer
    if (answer === null || isSubmitting || !snapshot) return
    onSubmit(answer)
    setIsSubmitting(true)

    // The engine only ever marks isPredictionRequired true alongside a
    // junction type, so these fallbacks are defensive, not expected.
    const junctionType = snapshot.criticalJunctionType ?? CriticalJunctionType.SWAP_DECISION
    const junctionDifficulty = snapshot.junctionDifficulty ?? JunctionDifficulty.PROCEDURAL

    const request: PredictionRequest = {
      algorithmName,
      stepIndex: snapshot.stepIndex,
      currentState: {
        dataStructureState: snapshot.dataStructureState,
        activeIndices: snapshot.activeIndices,
        criticalJunctionType: snapshot.criticalJunctionType,
      },
      studentAnswer: answer,
      errorHistory: [],
      scaffoldingLevel,
      sessionId: sessionId ?? 'local-session',
      junctionType,
      junctionDifficulty,
    }

    const response = await submitPrediction(request)
    setIsSubmitting(false)

    const timeSpentSeconds = Math.round((Date.now() - stepStartTime) / 1000)

    onPredictionResult?.({
      correct: response.correct,
      stepIndex: snapshot.stepIndex,
      predictionSubmitted: answer,
      misconceptionCategory: response.correct ? null : response.misconceptionCategory,
      hintsRequestedForStep: hintsRequestedCount,
      timeSpentSeconds,
      junctionType,
      junctionDifficulty,
    })

    if (response.correct) {
      play('correct')
      setSubmissionState('correct')
      addXP(response.xpAwarded)
      if (response.xpAwarded > 0) {
        apiFetch('/api/v1/auth/xp', {
          method: 'POST',
          body: JSON.stringify({ amount: response.xpAwarded }),
        }).catch(() => {
          // XP persistence is best-effort; the local session XP already
          // reflects the award regardless of whether this call lands.
        })
      }
      setXpAmount(response.xpAwarded)
      setXpVisible(true)
      play('xp')
      await wait(400)
      stepForward()
      return
    }

    play('incorrect')
    setSubmissionState('incorrect')
    setShakeToken((token) => token + 1)
    attemptCountRef.current += 1
    const attempt = attemptCountRef.current

    if (scaffoldingLevel === ScaffoldingLevel.NONE) {
      // No elaboration from Claude at all, per the NONE scaffolding contract.
      setMistakeAnalysis('Incorrect. Consider the algorithm state and try again.')
      setMistakeHint(null)
      setMistakeCounterfactual(null)
    } else if (scaffoldingLevel === ScaffoldingLevel.LOW) {
      // Brief, one-sentence analysis only; the counterfactual trace is
      // extra elaboration that contradicts "reason through it independently".
      setMistakeAnalysis(firstSentence(response.consequenceExplanation))
      setMistakeHint(null)
      setMistakeCounterfactual(null)
    } else if (scaffoldingLevel === ScaffoldingLevel.HIGH) {
      setMistakeAnalysis(response.consequenceExplanation)
      setMistakeHint(response.socraticHint)
      setMistakeCounterfactual(response.counterfactualTrace || null)
    } else {
      setMistakeAnalysis(response.consequenceExplanation)
      setMistakeHint(null)
      setMistakeCounterfactual(response.counterfactualTrace || null)
    }

    if (scaffoldingLevel === ScaffoldingLevel.NONE && attempt >= MAX_ATTEMPTS_BEFORE_ADVANCE) {
      window.dispatchEvent(new CustomEvent(SHOW_EXPLANATION_LINK_EVENT))
      await wait(NONE_ADVANCE_DELAY_MS)
      setSubmissionState('idle')
      setCurrentAnswer(null)
      setMistakeAnalysis(null)
      window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
      stepForward()
      return
    }

    if (scaffoldingLevel === ScaffoldingLevel.HIGH) {
      // Wait for the learner to click "Try again" rather than resetting
      // automatically, so they see what went wrong before retrying.
      return
    }

    await wait(AUTO_RESET_DELAY_MS)
    setSubmissionState('idle')
    setCurrentAnswer(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
  }

  // Code Editor Mode's entire submission flow: CodeEditorInput owns the
  // evaluateCode call itself and hands back the full response here, since
  // its response shape (CodeEvalResponse) and XP rule (flat 5 XP) are
  // unrelated to the tile/value flow's submitPrediction contract above.
  async function handleCodeEvalResult(result: CodeEvalResponse, submittedCode: string) {
    if (!snapshot) return

    const timeSpentSeconds = Math.round((Date.now() - stepStartTime) / 1000)
    const junctionType = snapshot.criticalJunctionType ?? CriticalJunctionType.SWAP_DECISION
    const junctionDifficulty = snapshot.junctionDifficulty ?? JunctionDifficulty.PROCEDURAL

    onPredictionResult?.({
      correct: result.isLogicallyCorrect,
      stepIndex: snapshot.stepIndex,
      predictionSubmitted: submittedCode,
      // bug_type uses its own taxonomy (off_by_one/wrong_condition/missing_swap/
      // wrong_index/syntax) that doesn't map cleanly onto MisconceptionCategory,
      // so this deliberately never feeds the AI Challenge misconception signal.
      misconceptionCategory: null,
      hintsRequestedForStep: hintsRequestedCount,
      timeSpentSeconds,
      junctionType,
      junctionDifficulty,
      isCodeEval: true,
      codeEvalBuggyState:
        !result.isLogicallyCorrect && !result.hasSyntaxError && result.executeVisually && result.resultingState
          ? { resultingState: result.resultingState, activeIndices: snapshot.activeIndices }
          : null,
    })

    if (result.hasSyntaxError) {
      // CodeEditorInput already renders the red border and inline error;
      // nothing else to show, and the canvas must not animate.
      return
    }

    if (result.isLogicallyCorrect) {
      play('correct')
      setSubmissionState('correct')
      setCodeEvalPraise(result.correctiveHint)
      addXP(CODE_EVAL_XP)
      apiFetch('/api/v1/auth/xp', { method: 'POST', body: JSON.stringify({ amount: CODE_EVAL_XP }) }).catch(() => {
        // XP persistence is best-effort; the local session XP already
        // reflects the award regardless of whether this call lands.
      })
      setXpAmount(CODE_EVAL_XP)
      setXpVisible(true)
      play('xp')

      if (result.executeVisually && result.resultingState) {
        await wait(400)
        const { codeEditorMode, activeChallengeType, setAlgorithm: setAlg, setActiveChallengeType } =
          useAlgorithmStore.getState()
        setAlg('Bubble Sort', bubbleSortEngine(result.resultingState, codeEditorMode))
        // setAlgorithm always clears activeChallengeType for a fresh load;
        // restore it so an in-progress AI Challenge run's completion bonus
        // (Feature 2) still fires when this run eventually finishes.
        if (activeChallengeType) setActiveChallengeType(activeChallengeType)
      }
      return
    }

    play('incorrect')
    setSubmissionState('incorrect')
    setShakeToken((token) => token + 1)
    setMistakeAnalysis(result.errorExplanation ?? 'Your code does not correctly implement this step.')
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    setHint(result.correctiveHint)
  }

  return (
    <>
      <AnimatePresence>
        {isVisible && snapshot && (
          <motion.div
            key="prediction-zone"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
            className={cn(
              'absolute bottom-0 left-0 z-20 flex w-full items-start gap-3 rounded-t-lg border-t-2 bg-white px-4 py-3 shadow-lg dark:bg-dark-surface',
              // Code Editor Mode needs real room for a multi-line textarea,
              // language tabs and its own submit button - the 35% budget
              // that fits a single tile prompt comfortably clips it.
              snapshot.predictionType === PredictionType.CODE_EDITOR ? 'h-[70%]' : 'h-[35%]',
              'transition-colors duration-300',
              submissionState === 'correct' ? 'border-t-success' : 'border-t-[#f59e0b]',
            )}
            role="region"
            aria-label="Predict the next step"
          >
            <div className="flex w-12 shrink-0 items-start justify-center pt-1">
              {scaffoldingLevel !== ScaffoldingLevel.NONE &&
                (scaffoldingLevel === ScaffoldingLevel.LOW ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="opacity-50">
                          <HintAvatar
                            hintAvailable={!codeSubmitting}
                            onRequestHint={() => void handleRequestHint(false)}
                            hint={hint}
                            isLoading={hintLoading}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        You are performing well. Try to reason through this independently.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <HintAvatar
                      hintAvailable={!codeSubmitting}
                      onRequestHint={() => void handleRequestHint(false)}
                      hint={hint}
                      isLoading={hintLoading}
                    />
                  ))}
              </div>

              {!isHandsOnSwapDecision && snapshot.predictionType === PredictionType.CODE_EDITOR ? (
                <div className="flex min-w-0 flex-1 flex-col">
                  {codeEvalPraise && (
                    <div className="mb-2 shrink-0 rounded-md border-l-4 border-success bg-success-light p-2.5">
                      <p className="text-xs font-bold text-success">Your code is correct!</p>
                      <p className="mt-0.5 text-[13px] text-text-primary">{codeEvalPraise}</p>
                    </div>
                  )}
                  <CodeEditorInput
                    key={snapshot.stepIndex}
                    prompt={getPromptForSnapshot(snapshot)}
                    stepDescription={snapshot.description}
                    currentArrayState={snapshot.dataStructureState as number[]}
                    activeIndices={snapshot.activeIndices}
                    expectedNextState={computeExpectedNextState(snapshot)}
                    algorithmName={algorithmName}
                    onSubmit={(result, code) => void handleCodeEvalResult(result, code)}
                    onLoadingChange={setCodeSubmitting}
                  />
                </div>
              ) : (
                <>
                  <motion.div
                    key={shakeToken}
                    animate={
                      submissionState === 'incorrect' &&
                      !prefersReducedMotion &&
                      snapshot.predictionType !== PredictionType.TILE_GRID
                        ? { x: [0, -4, 4, -4, 4, -4, 4, 0] }
                        : { x: 0 }
                    }
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                    className="flex min-w-0 flex-1 flex-col gap-1"
                  >
                    <span className="text-[10px] font-semibold tracking-wide text-[#92400e] uppercase">
                      Predict the next step
                    </span>
                    <p className="text-[13px] font-bold text-text-primary dark:text-dark-text-primary">
                      {getPromptForSnapshot(snapshot)}
                    </p>

                    <div className="flex flex-1 flex-col justify-center">
                      {isHandsOnSwapDecision && (
                        <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                          ↑ Drag the bars in the canvas above to answer
                        </p>
                      )}
                      {!isHandsOnSwapDecision && snapshot.predictionType === PredictionType.VALUE_INPUT && (
                        <ValueInput
                          prompt=""
                          onValueChange={setCurrentAnswer}
                          value={currentAnswer ?? ''}
                          submissionState={submissionState}
                          onSubmit={() => void handleSubmit()}
                        />
                      )}
                      {!isHandsOnSwapDecision && snapshot.predictionType === PredictionType.TILE_GRID && (
                        <TileGrid
                          prompt=""
                          options={currentTiles}
                          onSelect={setCurrentAnswer}
                          selectedId={currentAnswer}
                          submissionState={submissionState}
                          snapshot={snapshot}
                        />
                      )}
                    </div>
                  </motion.div>

                  <div className="flex shrink-0 items-center justify-center">
                    {submissionState === 'idle' && isHandsOnSwapDecision && (
                      <span className="text-center text-xs text-text-muted dark:text-dark-text-secondary">
                        Drag to answer
                      </span>
                    )}
                    {submissionState === 'idle' && !isHandsOnSwapDecision && (
                      <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={currentAnswer === null || isSubmitting}
                        className="flex items-center justify-center gap-1.5 rounded-md bg-secondary px-6 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isSubmitting ? <Spinner /> : 'Submit'}
                      </button>
                    )}
                    {submissionState === 'correct' && (
                      <div className="flex flex-col items-center gap-1 text-success">
                        <CheckIcon />
                        <span className="text-xs font-medium">Correct!</span>
                      </div>
                    )}
                    {submissionState === 'incorrect' && (
                      <div className="flex flex-col items-center gap-1 text-error">
                        <XIcon />
                        {scaffoldingLevel === ScaffoldingLevel.HIGH ? (
                          <button
                            type="button"
                            onClick={handleTryAgain}
                            className="text-xs font-medium underline underline-offset-2"
                          >
                            Try again
                          </button>
                        ) : (
                          <span className="text-xs font-medium">Try again</span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
        )}
      </AnimatePresence>

      <XPToast amount={xpAmount} visible={xpVisible} onComplete={() => setXpVisible(false)} />
    </>
  )
}
