import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import { AlgorithmMode, CriticalJunctionType, JunctionDifficulty, MisconceptionCategory, PredictionType, ScaffoldingLevel } from '@dsa-tutor/types'
import type {
  AlgorithmSnapshot,
  CodeEvalResponse,
  HintRequest,
  PredictionRequest,
  PredictionResponse,
} from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot, selectIsLiveJunction, selectIsWorkedStep } from '@/store/useAlgorithmStore'
import { selectHintDelaySeconds, usePreferencesStore } from '@/store/usePreferencesStore'
import { workedStepNarration } from '@/utils/workedSteps'
import WorkedStepNotice from './WorkedStepNotice'
import { correctTileIdFor } from '@/utils/correctTile'
import SelfExplanationDialog from './SelfExplanationDialog'
import { offerableSelfExplanation } from '@/utils/selfExplanation'
import { isFirstAttempt } from '@/utils/attempts'
import type { SelfExplanationPrompt } from '@/config/selfExplanationPrompts'
import { useMisconceptionStore } from '@/store/useMisconceptionStore'
import {
  submitPrediction,
  streamPrediction,
  StreamDisconnectedError,
  evaluatePrediction,
  requestHint,
  type StreamedPrediction,
} from '@/api/predictions'
import {
  resolveDisplayedFeedback,
  disconnectedFeedback,
  type DisplayedFeedback,
  type FeedbackCard,
  type FeedbackTone,
} from '@/utils/displayedFeedback'
import { readingHoldMs } from '@/utils/readingTime'
import { cn } from '@/lib/utils'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { firstSentence } from '@/utils/predictionJunction'
import { getHandsOnInstructionText } from '@/utils/handsOnInstructions'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'
import { getPseudocodeText } from '@/utils/pseudocode'
import { getTilesForSnapshot } from '@/utils/tileBuilder'
import XPToast from '@/components/ui/XPToast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import HintAvatar, { DISMISS_HINT_EVENT } from './HintAvatar'
import ValueInput from './ValueInput'
import TileGrid, { type TileOption } from './TileGrid'
import CodeEditorInput from './CodeEditorInput'
import { codeStepFor } from '@/config/codeChallenges'
import { codeModeAdvance } from '@/utils/codeModeAdvance'
import { handsOnSelectionFor } from '@/utils/handsOnSelection'
import { handsOnStayAnswer } from '@/utils/handsOnDrag'
import { runFor } from '@/engine/runFor'

/** A feedback stream opened before the verdict is known (see startFeedbackStream). */
interface FeedbackStream {
  preview: { latest: string | null; show: ((explanationSoFar: string) => void) | null }
  result: Promise<StreamedPrediction>
}

export interface PredictionOutcomeDetail {
  correct: boolean
  stepIndex: number
  predictionSubmitted: string
  misconceptionCategory: MisconceptionCategory | null
  hintsRequestedForStep: number
  timeSpentSeconds: number
  junctionType: CriticalJunctionType
  junctionDifficulty: JunctionDifficulty
  /** How many answer options were on screen (0 for free input or code) -
   * the misconception resolve rule needs it (2 options vs 3 or more). */
  optionCount?: number
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
  /** The learner's first answer at this junction, right or wrong (see isFirstAttempt). */
  firstAttempt: boolean
  /** Which answer at this junction this was, from 1 (the mastery rubric's first-attempt accuracy). */
  attemptIndex: number
  /** Why displayed feedback fell back (validator rule, "truncated",
   * "stream_disconnected", ...); null when everything shown was AI text. */
  aiFailureReason?: string | null
  /** Prompt version and model the feedback came from, for the research log. */
  promptVersion?: string | null
  aiModel?: string | null
}

// Matches the server's award for any correct answer (apps/api config/xp.ts):
// a Code Mode answer is logged as a PREDICTION row like any other.
const CODE_EVAL_XP = 10

interface PredictionZoneProps {
  onSubmit: (answer: string) => void
  onHintRequested?: () => void
  onPredictionResult?: (detail: PredictionOutcomeDetail) => void
  // Feedback state is owned by the page level now, so the AI Tutor tab
  // (RightPanel) can render the same card without floating it over the
  // canvas a second time - PredictionZone only ever writes it here,
  // RightPanel is what reads it for display. One card rather than three
  // setters because its parts were only ever written together, and the
  // tone has to travel with the text it describes.
  setFeedbackCard: (card: FeedbackCard | null) => void
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

const AUTO_RESET_DELAY_MS = 1200
const BOTTOM_OUT_ADVANCE_DELAY_MS = 1500

/**
 * What a correct answer's feedback ended up showing, and when it first
 * appeared. Returned so the advance can wait out the rest of the reading
 * time instead of charging for seconds the student already spent reading
 * while the model was still writing. Null on every wrong-answer path -
 * those hold the run through the hint ladder instead.
 */
interface ShownFeedback {
  analysis: string | null
  shownAt: number | null
}

// How long a correct answer's advance waits for the explanation of why it
// was right. The model streams its first sentence in about a second, so
// this is a ceiling for a slow call, not the expected wait - past it the
// run advances with whatever is on screen rather than stalling on the AI.
const CONFIRM_FEEDBACK_WAIT_MS = 6000

// How long an advance waits for this junction's earlier answers to finish
// reporting (their feedback stream, then the interaction write that starts
// misconception detection). Bounded so a stalled stream never holds the run.
const OUTCOME_REPORT_WAIT_MS = 12000

/**
 * Waits out a reading hold, but gives it up the moment the learner advances
 * the run themselves. Without that, clicking Step forward while reading
 * would advance once immediately and once again when the hold expired -
 * skipping a step - and the card would sit stale over the new one. With it
 * the hold reads as "moves on when you have read it, or sooner if you say
 * so", which is the transport behaving the way it does everywhere else.
 */
function holdForReading(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    const startedAt = useAlgorithmStore.getState().stepIndex
    let unsubscribe = () => {}
    const finish = () => {
      clearTimeout(timer)
      unsubscribe()
      resolve()
    }
    const timer = setTimeout(finish, ms)
    unsubscribe = useAlgorithmStore.subscribe((state) => {
      if (state.stepIndex !== startedAt) finish()
    })
  })
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}


// There is no computeExpectedNextState here any more. It re-implemented
// Bubble Sort's swap rule to produce the answer Code Mode graded against,
// which is a second copy of the algorithm living next to the engine, and
// only ever correct for Bubble Sort. The expected answer now comes from
// the engine's own next snapshot (config/codeChallenges.ts), so the
// question and the canvas cannot disagree.

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
  setFeedbackCard,
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
  // This junction's code question, assembled from the live run: what to
  // hand the sandbox and - from the engine's own next snapshot - what the
  // answer is. Null when the topic's challenge does not grade this
  // junction, which is also what makes the CODE_EDITOR branch below fall
  // back to tiles rather than render an ungradeable editor.
  const run = useAlgorithmStore((state) => state.snapshotArray)
  const stepIndexForCode = useAlgorithmStore((state) => state.stepIndex)
  const codeStep = codeStepFor(algorithmSlug, run, stepIndexForCode)
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const sessionId = useAlgorithmStore((state) => state.sessionId)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const addXP = useAlgorithmStore((state) => state.addXP)
  // Scales the reading hold below: a learner who has set 2x has asked for
  // less waiting, the same way the practice auto-advance is scaled.
  const playbackSpeed = useAlgorithmStore((state) => state.playbackSpeed)
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
  // This step's code challenge is solved and the run is waiting on the
  // learner to move it on. Not set where the correct answer re-seeds the
  // run, because that moves it on by itself.
  const [codeSolved, setCodeSolved] = useState(false)
  const [codeSubmitting, setCodeSubmitting] = useState(false)

  const attemptCountRef = useRef(0)
  // One per submission at this junction: resolves once that answer has been
  // reported (onPredictionResult), which is when its misconception check
  // starts. A wrong answer is reported only after its feedback stream ends,
  // so a quick retry could otherwise advance before the check existed and
  // the Quick Check would surface a junction late.
  const outcomeReportsRef = useRef<Promise<void>[]>([])
  const proactiveHintFiredRef = useRef(false)
  // Seconds before a hint appears unasked at Full support; a participant always gets the default.
  const hintDelaySeconds = usePreferencesStore(selectHintDelaySeconds)
  // Bumped whenever the current attempt's feedback is dismissed or
  // superseded (a new submission, a step change, "Try again") - the slow
  // submitPrediction call's UI side effects (mistake text, ladder hint,
  // delayed auto-advance) check this before applying, so a response that
  // finally arrives after the learner has already moved on is silently
  // dropped instead of painting over a UI they've since navigated past.
  const submissionTokenRef = useRef(0)

  // Live junctions only: a worked step (Week 2 2A) is a junction candidate
  // the learner watches, shown below as a "Watch this one" strip instead.
  const isLiveJunction = useAlgorithmStore(selectIsLiveJunction)
  const isWorkedStep = useAlgorithmStore(selectIsWorkedStep)
  const workedNarration = useAlgorithmStore((state) =>
    isWorkedStep ? workedStepNarration(state.snapshotArray, state.stepIndex) : null,
  )
  const isVisible =
    (mode === AlgorithmMode.PRACTICE || mode === AlgorithmMode.HANDS_ON) &&
    snapshot !== null &&
    isLiveJunction
  const isHandsOnDrag =
    mode === AlgorithmMode.HANDS_ON &&
    snapshot?.criticalJunctionType !== null &&
    snapshot?.criticalJunctionType !== undefined &&
    HANDS_ON_DRAG_JUNCTIONS.has(snapshot.criticalJunctionType)
  // The second hands-on gesture: pointing at the thing the algorithm
  // would take, on a tree, a graph or a grid. Same submission path as the
  // drag, so the panel treats the two alike - it shows what to do with
  // the canvas instead of tiles to click.
  const handsOnSelection =
    mode === AlgorithmMode.HANDS_ON && isLiveJunction ? handsOnSelectionFor(snapshot) : null
  const isHandsOnGesture = isHandsOnDrag || handsOnSelection !== null
  // The "leave them where they are" half of a threshold drag, labelled
  // from the tile the grid would have offered for it.
  const stayAnswerId = isHandsOnDrag && isLiveJunction ? handsOnStayAnswer(snapshot) : null
  const stayAnswer = stayAnswerId ? (currentTiles.find((tile) => tile.id === stayAnswerId) ?? null) : null
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
    setFeedbackCard(null)
    setHint(null)
    setHintLoading(false)
    setWasRequestedManually(false)
    setHintsRequestedCount(0)
    setStepStartTime(Date.now())
    setCodeEvalPraise(null)
    setCodeSolved(false)
    setCodeSubmitting(false)
    attemptCountRef.current = 0
    outcomeReportsRef.current = []
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
    // The delay is a learning preference (Phase 6D): null turns it off.
    if (hintDelaySeconds === null) return
    if (submissionState !== 'idle' || hint !== null || hintLoading) return
    if (proactiveHintFiredRef.current) return

    const timer = setTimeout(() => {
      proactiveHintFiredRef.current = true
      void handleRequestHint(true)
    }, hintDelaySeconds * 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, scaffoldingLevel, submissionState, hint, hintLoading, stepIndex, hintDelaySeconds])

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
    setFeedbackCard(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
  }

  function handleShowAnswer() {
    setRevealAnswer(true)
    setPredictionResolved(true)
  }

  // A self-explanation prompt (Week 2 2B) the run is waiting on; resolved
  // when the learner skips or continues.
  const [selfExplanation, setSelfExplanation] = useState<{
    prompt: SelfExplanationPrompt
    snapshot: AlgorithmSnapshot
    resolve: () => void
  } | null>(null)

  function askSelfExplanation(prompt: SelfExplanationPrompt, forSnapshot: AlgorithmSnapshot): Promise<void> {
    return new Promise((resolve) => setSelfExplanation({ prompt, snapshot: forSnapshot, resolve }))
  }

  // Every post-resolution advance goes through here: a Quick Check this
  // junction triggered is presented, and answered or skipped, before the
  // run moves on, never on top of the next junction (Week 1, 1A.2).
  async function waitForRemediation() {
    await Promise.race([Promise.allSettled(outcomeReportsRef.current), wait(OUTCOME_REPORT_WAIT_MS)])
    return useMisconceptionStore.getState().waitForRemediation()
  }

  async function handleContinueAfterReveal() {
    const submissionToken = submissionTokenRef.current
    await waitForRemediation()
    if (submissionTokenRef.current !== submissionToken) return
    setSubmissionState('idle')
    setCurrentAnswer(null)
    setFeedbackCard(null)
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
  // Opened alongside /evaluate rather than after it: the verdict still
  // arrives first, but the explanation no longer waits the ~1.4s the
  // verdict call takes before it even starts. Preview text that lands
  // before the verdict is held, and shown once the answer is known wrong.
  function startFeedbackStream(request: PredictionRequest): FeedbackStream {
    const preview: FeedbackStream['preview'] = { latest: null, show: null }
    const result = streamPrediction(request, (explanationSoFar) => {
      preview.latest = explanationSoFar
      preview.show?.(explanationSoFar)
    })
    // Awaited in resolveRichFeedback; this only keeps a failure that
    // happens before that await from surfacing as an unhandled rejection.
    result.catch(() => undefined)
    return { preview, result }
  }

  async function resolveRichFeedback(
    feedbackStream: FeedbackStream,
    request: PredictionRequest,
    answer: string,
    submissionToken: number,
    attempt: number,
    isBottomedOut: boolean,
    timeSpentSeconds: number,
    junctionType: CriticalJunctionType,
    junctionDifficulty: JunctionDifficulty,
    verdictCorrect: boolean,
    onReported: () => void,
  ): Promise<ShownFeedback | null> {
    // Streams the explanation into the feedback card (Week 1 addendum
    // A2.4): the verdict is already shown, so text appearing about a second
    // in replaces a ~5s wait. Each streamed piece is one sentence the AI
    // service has already validated, so nothing unchecked is ever shown,
    // and whatever appears is kept - the final response's explanation is
    // exactly the sentences previewed. If the stream drops mid-response the
    // partial is discarded and a neutral fallback shown instead; only a
    // stream that never opened falls back to the JSON endpoint.
    // Previewed on a correct answer too: it is the same call and the same
    // validated sentences, and the reading hold below is measured from the
    // moment the first of them appears.
    const showPreview = scaffoldingLevel !== ScaffoldingLevel.NONE
    const tone: FeedbackTone = verdictCorrect ? 'confirm' : 'mistake'
    let shownAt: number | null = null
    let response: PredictionResponse | null = null
    let displayed: DisplayedFeedback
    try {
      if (showPreview) {
        feedbackStream.preview.show = (explanationSoFar) => {
          if (submissionTokenRef.current !== submissionToken) return
          shownAt ??= Date.now()
          setFeedbackCard({
            analysis: scaffoldingLevel === ScaffoldingLevel.LOW ? firstSentence(explanationSoFar) : explanationSoFar,
            hint: null,
            counterfactual: null,
            tone,
          })
        }
        if (feedbackStream.preview.latest) feedbackStream.preview.show(feedbackStream.preview.latest)
      }
      const streamed = await feedbackStream.result
      response = streamed.response
      displayed = resolveDisplayedFeedback(
        scaffoldingLevel,
        response,
        streamed.fallbackFields,
        streamed.failureReason,
        verdictCorrect,
      )
    } catch (err) {
      if (err instanceof StreamDisconnectedError) {
        displayed = disconnectedFeedback(scaffoldingLevel, verdictCorrect, err.reason)
      } else {
        // Never opened (network, or the api not yet deployed with the
        // stream route): nothing was shown, so the JSON endpoint is safe.
        response = await submitPrediction(request)
        displayed = resolveDisplayedFeedback(
          scaffoldingLevel,
          response,
          response.aiGenerated ? [] : ['consequence_explanation', 'socratic_hint', 'counterfactual_trace'],
          response.aiGenerated ? null : 'json_fallback',
          verdictCorrect,
        )
      }
    }

    const correct = response?.correct ?? verdictCorrect
    onPredictionResult?.({
      correct,
      stepIndex: request.stepIndex,
      predictionSubmitted: answer,
      misconceptionCategory: correct ? null : (response?.misconceptionCategory ?? request.groundTruthMisconception ?? null),
      hintsRequestedForStep: hintsRequestedCount,
      timeSpentSeconds,
      junctionType,
      junctionDifficulty,
      bottomedOut: isBottomedOut,
      // What the student was shown, not what the model wrote - see
      // resolveDisplayedFeedback.
      ...displayed.log,
      aiMisconceptionCategory: correct ? null : (response?.aiMisconceptionCategory ?? null),
      hintIndexAtResolve: attempt,
      firstAttempt: isFirstAttempt(verdictCorrect, attempt),
      // attempt is the wrong-attempt counter, already bumped by a wrong answer.
      attemptIndex: verdictCorrect ? attempt + 1 : attempt,
      optionCount: currentTiles.length,
      promptVersion: response?.promptVersion ?? null,
      aiModel: response?.aiModel ?? null,
    })
    onReported()

    if (submissionTokenRef.current !== submissionToken) return null

    // NONE's text is a static sentence set instantly in handleSubmit - it
    // never needed Claude, so displayed.card is empty.
    if (displayed.card) {
      shownAt ??= Date.now()
      setFeedbackCard(displayed.card)
    }

    // A correct answer has no ladder to escalate and no retry to wait for,
    // so everything below is the wrong-answer path. What it does need is
    // for the advance to wait until the explanation has been read, which
    // is what handleSubmit uses this return value for.
    if (correct) return { analysis: displayed.card?.analysis ?? null, shownAt }

    if (isBottomedOut) {
      // Graduated ladder bottomed out: the answer is now shown (via
      // revealAnswer, set in handleSubmit) with the AI's own explanation
      // as the justification - wait long enough to read it, then advance
      // regardless of scaffolding level. Retrying further would have
      // nothing left to discover.
      window.dispatchEvent(new CustomEvent(SHOW_EXPLANATION_LINK_EVENT))
      await wait(BOTTOM_OUT_ADVANCE_DELAY_MS)
      await waitForRemediation()
      if (submissionTokenRef.current !== submissionToken) return null
      setSubmissionState('idle')
      setCurrentAnswer(null)
      setFeedbackCard(null)
      window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
      stepForward()
      return null
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
      return null
    }

    await wait(AUTO_RESET_DELAY_MS)
    if (submissionTokenRef.current !== submissionToken) return null
    setSubmissionState('idle')
    setCurrentAnswer(null)
    window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
    return null
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
        // The count question is graded against the run's own counter; the
        // feedback needs that count to explain the student's estimate.
        ...(junctionType === CriticalJunctionType.COMPLEXITY_PREDICTION && snapshot.metrics
          ? { metrics: snapshot.metrics }
          : {}),
      },
      studentAnswer: answer,
      studentAnswerLabel: selectedTile?.label ?? null,
      // What the feedback must not reveal while the student can try again
      // (the AI service rejects a field containing it).
      correctAnswerLabel: currentTiles.find((tile) => tile.id === correctTileIdFor(snapshot))?.label ?? null,
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
    const feedbackStream = startFeedbackStream(request)
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

    let markReported: () => void = () => {}
    // Only a wrong answer can open or escalate a misconception (and so
    // queue a Quick Check); holding on a correct answer's report would only
    // delay the advance by its feedback stream.
    if (!evaluation.correct) outcomeReportsRef.current.push(new Promise<void>((resolve) => (markReported = resolve)))
    // Settles the report even if feedback fails before reaching
    // onPredictionResult, so an advance never waits on it for nothing.
    const richFeedback = resolveRichFeedback(
      feedbackStream,
      request,
      answer,
      submissionToken,
      attempt,
      isBottomedOut,
      timeSpentSeconds,
      junctionType,
      junctionDifficulty,
      evaluation.correct,
      () => markReported(),
    ).finally(() => markReported())

    if (evaluation.correct) {
      play('correct')
      setSubmissionState('correct')
      setPredictionResolved(true)
      addXP(xpAwarded)
      setXpAmount(xpAwarded)
      setXpVisible(true)
      play('xp')
      await wait(500)
      // A conceptual junction answered right first time may earn one short
      // "explain why" before the run moves on (capped per session).
      const selfExplanationPrompt = offerableSelfExplanation({
        topicSlug: algorithmSlug,
        snapshot,
        correct: true,
        firstAttempt: attempt === 0,
        offeredThisSession: useAlgorithmStore.getState().selfExplanationsOffered,
        offeredKeys: useAlgorithmStore.getState().selfExplanationKeysOffered,
      })
      if (selfExplanationPrompt && submissionTokenRef.current === submissionToken) {
        useAlgorithmStore.getState().noteSelfExplanationOffered(selfExplanationPrompt.key)
        await askSelfExplanation(selfExplanationPrompt, snapshot)
      }
      await waitForRemediation()
      if (submissionTokenRef.current !== submissionToken) return

      // Hold the advance until the explanation of why this was right has
      // actually been read. A correct answer advances on its own, so
      // without this the text Claude wrote appears and is gone - which is
      // what made the tutor feel rushed and its teaching feel thin. The
      // race bounds the wait on a slow model; the text streams in while it
      // runs, so shownAt is usually already some seconds in the past and
      // readingHoldMs only charges for what is left.
      const shown = await Promise.race([richFeedback, wait(CONFIRM_FEEDBACK_WAIT_MS).then(() => null)])
      if (submissionTokenRef.current !== submissionToken) return
      if (shown?.analysis) {
        const stepBeforeReading = useAlgorithmStore.getState().stepIndex
        await holdForReading(readingHoldMs(shown.analysis, Date.now() - (shown.shownAt ?? Date.now()), playbackSpeed))
        if (submissionTokenRef.current !== submissionToken) return
        if (useAlgorithmStore.getState().stepIndex !== stepBeforeReading) {
          // They advanced it themselves while reading. That was the advance.
          setFeedbackCard(null)
          return
        }
      }
      setFeedbackCard(null)
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
      setFeedbackCard({
        analysis: 'Incorrect. Consider the algorithm state and try again.',
        hint: null,
        counterfactual: null,
        tone: 'mistake',
      })
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
      // Code submissions carry no misconception category, so the loop
      // never acts on them either way.
      firstAttempt: true,
      attemptIndex: 1,
      isCodeEval: true,
      // Only for a challenge whose read-back is the data structure: a
      // scalar answer (an address, a count, True/False) has nothing to put
      // on the canvas, and dropping one in as dataStructureState would
      // render a one-cell array next to a prompt about memory addresses.
      codeEvalBuggyState:
        !result.isLogicallyCorrect &&
        !result.hasSyntaxError &&
        result.executeVisually &&
        codeStep?.challenge.seedsNextRun &&
        Array.isArray(result.resultingState)
          ? { resultingState: result.resultingState as number[], activeIndices: snapshot.activeIndices }
          : null,
    })

    if (result.hasSyntaxError) {
      // CodeEditorInput already renders the red border and inline error;
      // nothing else to show, and the canvas must not animate.
      return
    }

    // One rule for both routes out of a solved step, shared with the test
    // that sweeps every challenge: re-seed the run, or offer Continue.
    const advance = codeStep ? codeModeAdvance(result, codeStep.challenge) : 'stay'

    if (result.isLogicallyCorrect) {
      play('correct')
      setSubmissionState('correct')
      setPredictionResolved(true)
      setCodeSolved(advance === 'continue')
      setCodeEvalPraise(result.correctiveHint)
      addXP(CODE_EVAL_XP)
      setXpAmount(CODE_EVAL_XP)
      setXpVisible(true)
      play('xp')

      // Re-seed the run from what the student's own code produced, so the
      // canvas carries on from their array rather than the engine's.
      // Only for a challenge whose read-back IS the data structure: this
      // used to call bubbleSortEngine unconditionally, which on any other
      // topic would have replaced the canvas with a Bubble Sort run, and
      // on a challenge that reads back a number or a boolean would have
      // sorted a one-element array. runFor keeps it the open topic's own
      // engine, and Code Mode is reapplied by the same pass as everywhere.
      if (advance === 'reseed') {
        await wait(500)
        const { activeChallengeType, setAlgorithm: setAlg, setActiveChallengeType } = useAlgorithmStore.getState()
        setAlg(algorithmName, runFor(algorithmSlug, result.resultingState as number[]))
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
    setFeedbackCard({
      analysis: result.errorExplanation ?? 'Your code does not correctly implement this step.',
      hint: null,
      counterfactual: null,
      tone: 'mistake',
    })
    // Direct feedback on a submission the learner just made, not the idle
    // timer, so it's eligible for the floating bubble like a manual hint.
    setWasRequestedManually(true)
    setHint(result.correctiveHint)
  }

  return (
    <>
      {selfExplanation && (
        <SelfExplanationDialog
          prompt={selfExplanation.prompt}
          algorithmName={algorithmName}
          level={scaffoldingLevel}
          sessionId={sessionId}
          snapshot={selfExplanation.snapshot}
          onDone={() => {
            selfExplanation.resolve()
            setSelfExplanation(null)
          }}
        />
      )}
      <AnimatePresence>
        {workedNarration && (
          <motion.div
            key="worked-step"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="relative z-20 w-full shrink-0 px-[14px] py-[10px]"
          >
            <WorkedStepNotice narration={workedNarration} />
          </motion.div>
        )}
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
              'relative z-20 flex w-full shrink-0 items-start gap-3 overflow-y-auto rounded-t-lg border-t-2 bg-card px-[14px] py-[10px] shadow-lg',
              // Code Editor Mode needs real room for a multi-line textarea,
              // language tabs and its own submit button - the 35% budget
              // that fits a single tile prompt comfortably clips it.
              // Every other type sizes to its content, from a 35% floor up
              // to a 60% ceiling: a fixed 35% put BST's last tile 714px
              // down, below the fold on a 1366x768 laptop, reachable only
              // by scrolling this panel (Week 1, 1A.4).
              snapshot.predictionType === PredictionType.CODE_EDITOR && !isHandsOnGesture
                ? 'h-[70%]'
                : 'min-h-[35%] max-h-[60%]',
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

              {!isHandsOnGesture && snapshot.predictionType === PredictionType.CODE_EDITOR && codeStep ? (
                <div className="flex min-w-0 flex-1 flex-col">
                  {codeEvalPraise && (
                    <div className="mb-2 shrink-0 rounded-md border-l-4 border-success bg-success-light p-2.5">
                      <p className="text-xs font-bold text-success">Your code is correct!</p>
                      <p className="mt-0.5 text-[13px] text-text-primary">{codeEvalPraise}</p>
                    </div>
                  )}
                  <CodeEditorInput
                    key={snapshot.stepIndex}
                    stepDescription={snapshot.description}
                    step={codeStep}
                    activeIndices={snapshot.activeIndices}
                    algorithmName={algorithmName}
                    onSubmit={(result, code) => void handleCodeEvalResult(result, code)}
                    onLoadingChange={setCodeSubmitting}
                    solved={codeSolved}
                    onContinue={() => {
                      // The step-change effect clears the rest; these two go
                      // now so the card and the button do not flash stale.
                      setCodeSolved(false)
                      setCodeEvalPraise(null)
                      stepForward()
                    }}
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
                    <span className="text-micro mb-1 text-tone-amber">
                      Predict the next step
                    </span>
                    <p className="mb-1.5 text-[13px] font-bold text-text-primary dark:text-dark-text-primary">
                      {getPromptForSnapshot(snapshot, algorithmName)}
                    </p>

                    <div className="flex flex-1 flex-col justify-center">
                      {isHandsOnGesture && (
                        <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                          ↑ {handsOnSelection?.hint ?? getHandsOnInstructionText(snapshot.criticalJunctionType)}
                        </p>
                      )}
                      {!isHandsOnGesture && snapshot.predictionType === PredictionType.VALUE_INPUT && (
                        <ValueInput
                          prompt=""
                          onValueChange={setCurrentAnswer}
                          value={currentAnswer ?? ''}
                          submissionState={submissionState}
                          onSubmit={() => void handleSubmit()}
                        />
                      )}
                      {!isHandsOnGesture && snapshot.predictionType === PredictionType.TILE_GRID && (
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
                    {submissionState === 'idle' && isHandsOnGesture && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-center text-xs text-text-muted dark:text-dark-text-secondary">
                          {handsOnSelection
                            ? 'Click on the canvas to answer'
                            : stayAnswer
                              ? 'Drag one past the other, or:'
                              : 'Drag to answer'}
                        </span>
                        {/* The other half of a threshold drag. It was only
                            expressible by picking a bar up and putting it
                            back, which nothing said - so on an already
                            ordered pair there appeared to be no answer
                            available at all. Worded from the same tile the
                            grid would have shown, so both modes say the
                            same thing. */}
                        {stayAnswer && (
                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent(HANDS_ON_ANSWER_EVENT, { detail: stayAnswer.id }))}
                            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-sunk dark:text-dark-text-primary dark:hover:bg-dark-border"
                          >
                            {stayAnswer.label}
                          </button>
                        )}
                      </div>
                    )}
                    {submissionState === 'idle' && !isHandsOnGesture && (
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
                              onClick={() => void handleContinueAfterReveal()}
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
