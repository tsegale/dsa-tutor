import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { AlgorithmMode, CriticalJunctionType, JunctionDifficulty, MisconceptionCategory, PredictionType, ScaffoldingLevel } from '@dsa-tutor/types'
import type {
  AlgorithmSnapshot,
  CodeEvalResponse,
  HintRequest,
  PredictionRequest,
} from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot, getJunctionDensityForScaffoldingLevel } from '@/store/useAlgorithmStore'
import { submitPrediction, evaluatePrediction, requestHint } from '@/api/predictions'
import { apiFetch } from '@/api/client'
import { cn } from '@/lib/utils'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { firstSentence } from '@/utils/predictionJunction'
import { getHandsOnInstructionText } from '@/utils/handsOnInstructions'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'
import { getPseudocodeText } from '@/utils/pseudocode'
import { getTilesForSnapshot } from '@/utils/tileBuilder'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { topMisconceptionOf } from '@/utils/junctionTargeting'
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
  /** True when this submission hit the attempt cap and had its answer
   * revealed automatically - the research-data signal for "this junction
   * was never solved independently", distinct from a correct answer
   * reached after retries. */
  bottomedOut: boolean
  /** True for every Code Editor submission (correct or not). Tells the page
   * level to skip the tile-flow's computeMistakePath fallback entirely -
   * a code-eval outcome drives the canvas only via codeEvalBuggyState. */
  isCodeEval?: boolean
  /** Set only for an incorrect, visualisable Code Editor submission - the
   * array state the student's buggy code actually produces, so the page
   * level can play it on the canvas via the Phase 15 mistake path. */
  codeEvalBuggyState?: { resultingState: number[]; activeIndices: number[] } | null
  // What the student actually saw from the feedback mechanism, for
  // research data capture (remediation doc Phase 8.1) - false/null for
  // Code Editor submissions, which don't call the AI prediction endpoint.
  aiGenerated: boolean
  feedbackText: string | null
  hintText: string | null
  counterfactualText: string | null
  aiMisconceptionCategory: MisconceptionCategory | null
  hintIndexAtResolve: number
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
  // Lifted so RightPanel's Socratic guidance box knows whether it's safe to
  // show the current step's narration description - true once the answer
  // is no longer being withheld (correct, or revealed after the attempt
  // cap), false while a prediction is still pending. Showing the
  // description before that would hand the student the answer.
  setPredictionResolved: (value: boolean) => void
}

export const CLEAR_CANVAS_SELECTION_EVENT = 'dsa-tutor:clear-canvas-selection'
export const REQUEST_HINT_EVENT = 'request-hint'
export const ESCAPE_EVENT = 'dsa-tutor:escape'
export const SHOW_EXPLANATION_LINK_EVENT = 'dsa-tutor:show-explanation-link'
export const HANDS_ON_ANSWER_EVENT = 'dsa-tutor:hands-on-answer'

// Every junction ArrayCanvas's getHandsOnDragTarget recognises a drag
// interaction for - keep this list in sync with that function's cases.
const HANDS_ON_DRAG_JUNCTIONS: Set<CriticalJunctionType> = new Set([
  CriticalJunctionType.SWAP_DECISION,
  CriticalJunctionType.NEW_MINIMUM,
  CriticalJunctionType.PARTITION_DECISION,
  CriticalJunctionType.MERGE_DECISION,
  CriticalJunctionType.GAP_COMPARISON,
  CriticalJunctionType.HEAP_COMPARE,
])

const PROACTIVE_HINT_DELAY_MS = 25000
const AUTO_RESET_DELAY_MS = 1200
const BOTTOM_OUT_ADVANCE_DELAY_MS = 1500

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  setPredictionResolved,
}: PredictionZoneProps) {
  const mode = useAlgorithmStore((state) => state.mode)
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  // Keyed by the same route slug PseudocodePanel reads, so the AI is given
  // exactly the text on the Pseudocode tab and cannot quote other notation.
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const pseudocode = getPseudocodeText(algorithmSlug)
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const sessionId = useAlgorithmStore((state) => state.sessionId)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const addXP = useAlgorithmStore((state) => state.addXP)
  const { play } = useSoundEffects()
  const prefersReducedMotion = useReducedMotion()

  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)
  const [currentTiles, setCurrentTiles] = useState<TileOption[]>([])
  const [submissionState, setSubmissionState] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  // True only once the attempt cap is reached or the learner explicitly
  // asks to see the answer - an incorrect submission alone must never
  // reveal it, or the retry that follows has nothing left to attempt.
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  // Only true when the current hint came from a manual H-key / avatar
  // click, never from the proactive hint timer - drives whether
  // HintAvatar's floating canvas bubble is allowed to render at all.
  const [wasRequestedManually, setWasRequestedManually] = useState(false)
  const [shakeToken, setShakeToken] = useState(0)
  const [xpAmount, setXpAmount] = useState(0)
  const [xpVisible, setXpVisible] = useState(false)
  const [hintsRequestedCount, setHintsRequestedCount] = useState(0)
  const [stepStartTime, setStepStartTime] = useState(() => Date.now())
  const [codeEvalPraise, setCodeEvalPraise] = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting] = useState(false)

  const attemptCountRef = useRef(0)
  const proactiveHintFiredRef = useRef(false)
  // Bumped whenever the current attempt's feedback is dismissed or
  // superseded (a new submission, a step change, "Try again") - the slow
  // submitPrediction call's UI side effects (mistake text, ladder hint,
  // delayed auto-advance) check this before applying, so a response that
  // finally arrives after the learner has already moved on is silently
  // dropped instead of painting over a UI they've since navigated past.
  const submissionTokenRef = useRef(0)

  const isVisible =
    (mode === AlgorithmMode.PRACTICE || mode === AlgorithmMode.HANDS_ON) &&
    snapshot !== null &&
    snapshot.isPredictionRequired
  const isHandsOnSwapDecision =
    mode === AlgorithmMode.HANDS_ON &&
    snapshot?.criticalJunctionType !== null &&
    snapshot?.criticalJunctionType !== undefined &&
    HANDS_ON_DRAG_JUNCTIONS.has(snapshot.criticalJunctionType)
  const stepIndex = snapshot?.stepIndex ?? null

  // Tiles (and their shuffled order) are generated once per prediction
  // step and held fixed - regenerating on every render would reshuffle
  // out from under the learner mid-decision.
  useEffect(() => {
    submissionTokenRef.current += 1
    if (snapshot?.isPredictionRequired) {
      setCurrentTiles(getTilesForSnapshot(snapshot, algorithmName))
    }
    setCurrentAnswer(null)
    setSubmissionState('idle')
    setRevealAnswer(false)
    setPredictionResolved(false)
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    setHint(null)
    setHintLoading(false)
    setWasRequestedManually(false)
    setHintsRequestedCount(0)
    setStepStartTime(Date.now())
    setCodeEvalPraise(null)
    setCodeSubmitting(false)
    attemptCountRef.current = 0
    proactiveHintFiredRef.current = false
    // algorithmName is also a dependency, not just stepIndex: when
    // setAlgorithm() swaps in a brand new snapshotArray on mount, it
    // resets stepIndex to 0 - the SAME value it already was - so if an
    // algorithm's very first snapshot is itself a Critical Junction
    // (e.g. BST's single-value insert), this effect would otherwise
    // never re-fire for the real snapshot and currentTiles would stay
    // stuck at its stale/empty value from before the algorithm loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, algorithmName])

  // Hands-On mode: the drag gesture itself is the submission, so this
  // fires handleSubmit directly rather than just staging currentAnswer.
  // A ref keeps the call bound to the latest handleSubmit closure without
  // needing to re-subscribe the listener on every dependency change.
  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit

  useEffect(() => {
    function handleHandsOnAnswer(event: Event) {
      const answer = (
        event as CustomEvent<
          | 'swap'
          | 'no-swap'
          | 'shift'
          | 'stop'
          | 'update'
          | 'keep'
          | 'skip'
          | 'take-left'
          | 'take-right'
          | 'no-shift'
          | 'sift'
          | 'stay'
          | 'extract'
        >
      ).detail
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
    setWasRequestedManually(!proactive)
    if (!proactive) {
      setHintsRequestedCount((count) => count + 1)
      onHintRequested?.()
    }

    const request: HintRequest = {
      algorithmName,
      stepIndex: snapshot.stepIndex,
      // The engine's own snapshot.description is an audit-trail string that
      // states whether the junction's answer is correct (e.g. "a swap is
      // needed") - sending that to the hint model would leak the answer and
      // gives it a denser string to misparse index/value pairs out of.
      // getPromptForSnapshot is the same answer-safe question already shown
      // to the student.
      currentPredictionPrompt: getPromptForSnapshot(snapshot, algorithmName),
      currentState: {
        dataStructureState: snapshot.dataStructureState,
        activeIndices: snapshot.activeIndices,
        criticalJunctionType: snapshot.criticalJunctionType,
      },
      errorHistory: [],
      scaffoldingLevel,
      pseudocode,
    }

    const response = await requestHint(request)
    setHint(response.hint)
    setHintLoading(false)
  }

  // The graduated hint ladder: fires automatically on every wrong attempt
  // below the bottom-out cap, escalating hintIndex each time (0 = Socratic
  // question, 1 = more direct). Unlike handleRequestHint, this always
  // fetches a fresh hint for the new attempt rather than skipping because
  // one is already showing.
  async function requestLadderHint(hintIndex: number) {
    if (!snapshot) return
    setHint(null)
    setHintLoading(true)
    setWasRequestedManually(true)
    setHintsRequestedCount((count) => count + 1)
    onHintRequested?.()

    const request: HintRequest = {
      algorithmName,
      stepIndex: snapshot.stepIndex,
      currentPredictionPrompt: getPromptForSnapshot(snapshot, algorithmName),
      currentState: {
        dataStructureState: snapshot.dataStructureState,
        activeIndices: snapshot.activeIndices,
        criticalJunctionType: snapshot.criticalJunctionType,
      },
      hintIndex,
      errorHistory: [],
      scaffoldingLevel,
      pseudocode,
    }

    const response = await requestHint(request)
    setHint(response.hint)
    setHintLoading(false)
  }

  function handleTryAgain() {
    submissionTokenRef.current += 1
    setSubmissionState('idle')
    setCurrentAnswer(null)
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
  }

  function handleShowAnswer() {
    setRevealAnswer(true)
    setPredictionResolved(true)
  }

  function handleContinueAfterReveal() {
    setSubmissionState('idle')
    setCurrentAnswer(null)
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
    stepForward()
  }

  // The rich explanation/hint/counterfactual text still needs Claude and
  // can take up to ~15s - fetched here in the background, after the
  // verdict itself has already been shown from the fast /evaluate call
  // (remediation doc 12B.3). Guarded by submissionToken: dropped silently
  // if the learner has since retried, dismissed the feedback, or moved to
  // a different step, so a slow response never paints over a UI they've
  // navigated past. onPredictionResult (interaction logging and the
  // misconception pipeline) fires regardless of staleness - that pipeline
  // has its own resolution-aware gating (see AlgorithmPage's
  // junctionRetryInProgress) and must never silently lose a data point.
  async function resolveRichFeedback(
    request: PredictionRequest,
    answer: string,
    submissionToken: number,
    attempt: number,
    isBottomedOut: boolean,
    timeSpentSeconds: number,
    junctionType: CriticalJunctionType,
    junctionDifficulty: JunctionDifficulty,
  ) {
    const response = await submitPrediction(request)

    onPredictionResult?.({
      correct: response.correct,
      stepIndex: request.stepIndex,
      predictionSubmitted: answer,
      misconceptionCategory: response.correct ? null : response.misconceptionCategory,
      hintsRequestedForStep: hintsRequestedCount,
      timeSpentSeconds,
      junctionType,
      junctionDifficulty,
      bottomedOut: isBottomedOut,
      aiGenerated: response.aiGenerated,
      feedbackText: response.consequenceExplanation || null,
      hintText: response.correct ? null : response.socraticHint || null,
      counterfactualText: response.correct ? null : response.counterfactualTrace || null,
      aiMisconceptionCategory: response.correct ? null : response.aiMisconceptionCategory,
      hintIndexAtResolve: attempt,
    })

    if (response.correct || submissionTokenRef.current !== submissionToken) return

    // NONE's mistake text is a static sentence set instantly in
    // handleSubmit - it never needed Claude, so there's nothing to
    // backfill here.
    if (scaffoldingLevel === ScaffoldingLevel.LOW) {
      // Brief, one-sentence analysis only; the counterfactual trace is
      // extra elaboration that contradicts "reason through it independently".
      setMistakeAnalysis(firstSentence(response.consequenceExplanation))
      setMistakeHint(null)
      setMistakeCounterfactual(null)
    } else if (scaffoldingLevel === ScaffoldingLevel.HIGH) {
      setMistakeAnalysis(response.consequenceExplanation)
      setMistakeHint(response.socraticHint)
      setMistakeCounterfactual(response.counterfactualTrace || null)
    } else if (scaffoldingLevel !== ScaffoldingLevel.NONE) {
      setMistakeAnalysis(response.consequenceExplanation)
      setMistakeHint(null)
      setMistakeCounterfactual(response.counterfactualTrace || null)
    }

    if (isBottomedOut) {
      // Graduated ladder bottomed out: the answer is now shown (via
      // revealAnswer, set in handleSubmit) with the AI's own explanation
      // as the justification - wait long enough to read it, then advance
      // regardless of scaffolding level. Retrying further would have
      // nothing left to discover.
      window.dispatchEvent(new CustomEvent(SHOW_EXPLANATION_LINK_EVENT))
      await wait(BOTTOM_OUT_ADVANCE_DELAY_MS)
      if (submissionTokenRef.current !== submissionToken) return
      setSubmissionState('idle')
      setCurrentAnswer(null)
      setMistakeAnalysis(null)
      setMistakeHint(null)
      setMistakeCounterfactual(null)
      window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
      stepForward()
      return
    }

    // Still below the cap: escalate to the next rung of the hint ladder
    // automatically (0 = Socratic question, 1 = more direct) rather than
    // waiting for the learner to notice they can press H. Skipped at HIGH
    // scaffolding - mistakeHint above already carries a hint from the same
    // feedback response, and firing this too showed a second, separate
    // hint (the floating bubble) at the same time (remediation doc 12B.2).
    if (scaffoldingLevel !== ScaffoldingLevel.HIGH) {
      void requestLadderHint(attempt - 1)
    }

    if (scaffoldingLevel === ScaffoldingLevel.HIGH) {
      // Wait for the learner to click "Try again" rather than resetting
      // automatically, so they see what went wrong before retrying.
      return
    }

    await wait(AUTO_RESET_DELAY_MS)
    if (submissionTokenRef.current !== submissionToken) return
    setSubmissionState('idle')
    setCurrentAnswer(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
  }

  async function handleSubmit(explicitAnswer?: string) {
    const answer = explicitAnswer ?? currentAnswer
    if (answer === null || isSubmitting || !snapshot) return
    onSubmit(answer)
    setIsSubmitting(true)
    submissionTokenRef.current += 1
    const submissionToken = submissionTokenRef.current

    // The engine only ever marks isPredictionRequired true alongside a
    // junction type, so these fallbacks are defensive, not expected.
    const junctionType = snapshot.criticalJunctionType ?? CriticalJunctionType.SWAP_DECISION
    const junctionDifficulty = snapshot.junctionDifficulty ?? JunctionDifficulty.PROCEDURAL

    // The tile the student picked carries its own authored ground-truth
    // misconception (see getTilesForSnapshot above) - free-text/code
    // answers never populate currentTiles, so this is null there and the
    // backend's rule-based classifier takes over instead.
    const selectedTile = currentTiles.find((tile) => tile.id === answer)

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
      pseudocode,
      sessionId: sessionId ?? 'local-session',
      junctionType,
      junctionDifficulty,
      groundTruthMisconception: selectedTile?.misconception ?? null,
    }

    // Correctness and the ground-truth misconception are both rule-based -
    // no Claude call - so this resolves in milliseconds and the verdict
    // below never waits on the full explanation (remediation doc 12B.3).
    const evaluation = await evaluatePrediction(request)
    setIsSubmitting(false)

    const timeSpentSeconds = Math.round((Date.now() - stepStartTime) / 1000)

    // NONE gets one fewer attempt than every other level before bottoming
    // out, per the scaffolding contract - it's already offering the least
    // support, so it also gives up the least room to keep guessing.
    const maxAttempts = scaffoldingLevel === ScaffoldingLevel.NONE ? 2 : 3
    let attempt = attemptCountRef.current
    let isBottomedOut = false
    if (!evaluation.correct) {
      attemptCountRef.current += 1
      attempt = attemptCountRef.current
      isBottomedOut = attempt >= maxAttempts
    }

    // xpAwarded is likewise deterministic (10 for correct, 0 otherwise -
    // see FEEDBACK_SYSTEM_PROMPT/get_fallback_prediction_response, both of
    // which hard-code this rule), so awarding it never needs to wait on
    // the AI call either.
    const xpAwarded = evaluation.correct ? 10 : 0

    void resolveRichFeedback(
      request,
      answer,
      submissionToken,
      attempt,
      isBottomedOut,
      timeSpentSeconds,
      junctionType,
      junctionDifficulty,
    )

    if (evaluation.correct) {
      play('correct')
      setSubmissionState('correct')
      setPredictionResolved(true)
      addXP(xpAwarded)
      apiFetch('/api/v1/auth/xp', {
        method: 'POST',
        body: JSON.stringify({ amount: xpAwarded }),
      }).catch(() => {
        // XP persistence is best-effort; the local session XP already
        // reflects the award regardless of whether this call lands.
      })
      setXpAmount(xpAwarded)
      setXpVisible(true)
      play('xp')
      await wait(500)
      stepForward()
      return
    }

    play('incorrect')
    setSubmissionState('incorrect')
    setShakeToken((token) => token + 1)

    if (isBottomedOut) {
      setRevealAnswer(true)
      setPredictionResolved(true)
    }

    if (scaffoldingLevel === ScaffoldingLevel.NONE) {
      // No elaboration from Claude at all, per the NONE scaffolding
      // contract - this never needed the rich response, so it's set here
      // instantly rather than in resolveRichFeedback.
      setMistakeAnalysis('Incorrect. Consider the algorithm state and try again.')
      setMistakeHint(null)
      setMistakeCounterfactual(null)
    }
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
      bottomedOut: false,
      // Code Editor submissions never call the AI prediction endpoint -
      // corrective_hint/bug_type come from a different (code-eval) prompt
      // that this DTO shape doesn't have a slot for yet.
      aiGenerated: false,
      feedbackText: null,
      hintText: result.correctiveHint || null,
      counterfactualText: null,
      aiMisconceptionCategory: null,
      hintIndexAtResolve: 0,
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
      setPredictionResolved(true)
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
        await wait(500)
        const {
          codeEditorMode,
          scaffoldingLevel: currentScaffoldingLevel,
          recentMisconceptions,
          activeChallengeType,
          setAlgorithm: setAlg,
          setActiveChallengeType,
        } = useAlgorithmStore.getState()
        setAlg(
          'Bubble Sort',
          bubbleSortEngine(result.resultingState, {
            codeEditorMode,
            junctionDensity: getJunctionDensityForScaffoldingLevel(currentScaffoldingLevel),
            topMisconception: topMisconceptionOf(recentMisconceptions),
          }),
        )
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
    // Direct feedback on a submission the learner just made, not the idle
    // timer, so it's eligible for the floating bubble like a manual hint.
    setWasRequestedManually(true)
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
              // A real flex item (not an absolute overlay) so the canvas
              // area above shrinks to make room instead of this panel
              // covering whatever canvas content sits under it.
              // overflow-y-auto: the panel's height is capped (h-[35%]/
              // h-[70%] below), and on a short viewport a junction with
              // several tiles (or Code Editor Mode's textarea) can need
              // more room than that cap allows - without a scroll
              // escape hatch, whatever doesn't fit was simply clipped
              // and unreachable rather than visible below a scrollbar
              // (remediation doc 12C.3).
              'relative z-20 flex w-full shrink-0 items-start gap-3 overflow-y-auto rounded-t-lg border-t-2 bg-white px-[14px] py-[10px] shadow-lg dark:bg-dark-surface',
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
                            wasRequestedManually={wasRequestedManually}
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
                      wasRequestedManually={wasRequestedManually}
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
                    prompt={getPromptForSnapshot(snapshot, algorithmName)}
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
                    className="flex min-w-0 flex-1 flex-col"
                  >
                    <span className="mb-1 text-[10px] font-semibold tracking-wide text-[#92400e] uppercase">
                      Predict the next step
                    </span>
                    <p className="mb-1.5 text-[13px] font-bold text-text-primary dark:text-dark-text-primary">
                      {getPromptForSnapshot(snapshot, algorithmName)}
                    </p>

                    <div className="flex flex-1 flex-col justify-center">
                      {isHandsOnSwapDecision && (
                        <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                          ↑ {getHandsOnInstructionText(snapshot.criticalJunctionType)}
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
                          revealAnswer={revealAnswer}
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
                          revealAnswer ? (
                            <button
                              type="button"
                              onClick={handleContinueAfterReveal}
                              className="text-xs font-medium underline underline-offset-2"
                            >
                              Continue
                            </button>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={handleTryAgain}
                                className="text-xs font-medium underline underline-offset-2"
                              >
                                Try again
                              </button>
                              <button
                                type="button"
                                onClick={handleShowAnswer}
                                className="text-[11px] text-text-muted underline underline-offset-2 dark:text-dark-text-secondary"
                              >
                                Show me the answer
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs font-medium">{revealAnswer ? 'Answer revealed' : 'Try again'}</span>
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
