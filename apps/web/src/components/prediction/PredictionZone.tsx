import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlgorithmMode, CriticalJunctionType, JunctionDifficulty, PredictionType, ScaffoldingLevel } from '@dsa-tutor/types'
import type { HintRequest, MisconceptionCategory, PredictionRequest } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { submitPrediction, requestHint } from '@/api/predictions'
import { apiFetch } from '@/api/client'
import { cn } from '@/lib/utils'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { firstSentence, getCorrectTileOptionId, getCriticalJunctionTileOptions } from '@/utils/predictionJunction'
import XPToast from '@/components/ui/XPToast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import HintAvatar, { DISMISS_HINT_EVENT } from './HintAvatar'
import CanvasClickInput from './CanvasClickInput'
import ValueInput from './ValueInput'
import TileGrid from './TileGrid'
import MistakeAnalysisToast from './MistakeAnalysisToast'

export interface PredictionOutcomeDetail {
  correct: boolean
  stepIndex: number
  predictionSubmitted: string
  misconceptionCategory: MisconceptionCategory | null
  hintsRequestedForStep: number
  timeSpentSeconds: number
  junctionType: CriticalJunctionType
  junctionDifficulty: JunctionDifficulty
}

interface PredictionZoneProps {
  onSubmit: (answer: string) => void
  onHintRequested?: () => void
  onPredictionResult?: (detail: PredictionOutcomeDetail) => void
}

export const CANVAS_ELEMENT_SELECTED_EVENT = 'dsa-tutor:canvas-element-selected'
export const CLEAR_CANVAS_SELECTION_EVENT = 'dsa-tutor:clear-canvas-selection'
export const REQUEST_HINT_EVENT = 'request-hint'
export const ESCAPE_EVENT = 'dsa-tutor:escape'
export const SHOW_EXPLANATION_LINK_EVENT = 'dsa-tutor:show-explanation-link'
export const HANDS_ON_ANSWER_EVENT = 'dsa-tutor:hands-on-answer'

const PROACTIVE_HINT_DELAY_MS = 8000
const TILE_PRIME_DELAY_MS = 15000
const AUTO_RESET_DELAY_MS = 1200
const NONE_ADVANCE_DELAY_MS = 1500
const MAX_ATTEMPTS_BEFORE_ADVANCE = 2

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

export default function PredictionZone({ onSubmit, onHintRequested, onPredictionResult }: PredictionZoneProps) {
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
  const [submissionState, setSubmissionState] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [mistakeAnalysis, setMistakeAnalysis] = useState<string | null>(null)
  const [mistakeHint, setMistakeHint] = useState<string | null>(null)
  const [mistakeCounterfactual, setMistakeCounterfactual] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [shakeToken, setShakeToken] = useState(0)
  const [xpAmount, setXpAmount] = useState(0)
  const [xpVisible, setXpVisible] = useState(false)
  const [hintsRequestedCount, setHintsRequestedCount] = useState(0)
  const [stepStartTime, setStepStartTime] = useState(() => Date.now())
  const [primedOptionId, setPrimedOptionId] = useState<string | null>(null)

  const attemptCountRef = useRef(0)
  const proactiveHintFiredRef = useRef(false)

  const isVisible =
    (mode === AlgorithmMode.PRACTICE || mode === AlgorithmMode.HANDS_ON) &&
    snapshot !== null &&
    snapshot.isPredictionRequired
  const isHandsOnSwapDecision =
    mode === AlgorithmMode.HANDS_ON && snapshot?.criticalJunctionType === CriticalJunctionType.SWAP_DECISION
  const stepIndex = snapshot?.stepIndex ?? null

  useEffect(() => {
    setCurrentAnswer(null)
    setSubmissionState('idle')
    setMistakeAnalysis(null)
    setMistakeHint(null)
    setMistakeCounterfactual(null)
    setHint(null)
    setHintLoading(false)
    setHintsRequestedCount(0)
    setStepStartTime(Date.now())
    setPrimedOptionId(null)
    attemptCountRef.current = 0
    proactiveHintFiredRef.current = false
  }, [stepIndex])

  useEffect(() => {
    function handleCanvasSelect(event: Event) {
      const index = (event as CustomEvent<number>).detail
      setCurrentAnswer(String(index))
    }
    window.addEventListener(CANVAS_ELEMENT_SELECTED_EVENT, handleCanvasSelect)
    return () => window.removeEventListener(CANVAS_ELEMENT_SELECTED_EVENT, handleCanvasSelect)
  }, [])

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
  }, [])

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

  // HIGH scaffolding only: after a longer stretch of inactivity on a
  // TILE_GRID prompt, lightly prime (not reveal) the correct option.
  useEffect(() => {
    if (!isVisible || scaffoldingLevel !== ScaffoldingLevel.HIGH || !snapshot) return
    if (snapshot.predictionType !== PredictionType.TILE_GRID) return
    if (currentAnswer !== null || submissionState !== 'idle') return

    const timer = setTimeout(() => {
      setPrimedOptionId(getCorrectTileOptionId(snapshot.criticalJunctionType))
    }, TILE_PRIME_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isVisible, scaffoldingLevel, snapshot, currentAnswer, submissionState])

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
              'absolute bottom-0 left-0 z-20 h-[35%] w-full rounded-t-lg border-t bg-white shadow-lg dark:bg-dark-surface',
              'transition-colors duration-300',
              submissionState === 'correct' ? 'border-success' : 'border-border',
            )}
            role="region"
            aria-label="Predict the next step"
          >
            <MistakeAnalysisToast
              message={mistakeAnalysis}
              hint={mistakeHint}
              counterfactualTrace={mistakeCounterfactual}
              pseudocodeLine={snapshot.pseudocodeLine}
              onDismiss={() => {
                setMistakeAnalysis(null)
                setMistakeHint(null)
                setMistakeCounterfactual(null)
              }}
            />

            <div className="px-4 pt-2 text-[11px] font-semibold tracking-wide text-secondary uppercase">
              Predict the next step
            </div>

            <div className="flex h-[calc(100%-28px)] items-stretch gap-3 px-4 pb-3">
              <div className="flex w-16 shrink-0 items-start justify-center pt-2">
                {scaffoldingLevel !== ScaffoldingLevel.NONE &&
                  (scaffoldingLevel === ScaffoldingLevel.LOW ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="opacity-50">
                          <HintAvatar
                            hintAvailable
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
                      hintAvailable
                      onRequestHint={() => void handleRequestHint(false)}
                      hint={hint}
                      isLoading={hintLoading}
                    />
                  ))}
              </div>

              <motion.div
                key={shakeToken}
                animate={
                  submissionState === 'incorrect' && !prefersReducedMotion
                    ? { x: [0, -4, 4, -4, 4, -4, 4, 0] }
                    : { x: 0 }
                }
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                className="min-w-0 flex-1"
              >
                {snapshot.predictionType === PredictionType.CANVAS_CLICK && isHandsOnSwapDecision && (
                  <div className="flex h-full flex-col justify-center gap-1">
                    <p className="font-sans text-[15px] font-medium text-text-primary dark:text-dark-text-primary">
                      {snapshot.description}
                    </p>
                    <p className="text-xs text-text-muted dark:text-dark-text-secondary">
                      ↑ Drag the bars in the canvas above to answer
                    </p>
                  </div>
                )}
                {snapshot.predictionType === PredictionType.CANVAS_CLICK && !isHandsOnSwapDecision && (
                  <CanvasClickInput
                    prompt={snapshot.description}
                    onSelect={(index) => setCurrentAnswer(String(index))}
                    selectedIndex={currentAnswer !== null ? Number(currentAnswer) : null}
                  />
                )}
                {snapshot.predictionType === PredictionType.VALUE_INPUT && (
                  <ValueInput
                    prompt={snapshot.description}
                    onValueChange={setCurrentAnswer}
                    value={currentAnswer ?? ''}
                    submissionState={submissionState}
                    onSubmit={() => void handleSubmit()}
                  />
                )}
                {snapshot.predictionType === PredictionType.TILE_GRID && (
                  <TileGrid
                    prompt={snapshot.description}
                    options={(getCriticalJunctionTileOptions(snapshot.criticalJunctionType) ?? []).map((option) => ({
                      id: option.id,
                      label: option.label,
                    }))}
                    onSelect={setCurrentAnswer}
                    selectedId={currentAnswer}
                    submissionState={submissionState}
                    primedOptionId={primedOptionId}
                  />
                )}
              </motion.div>

              <div className="flex w-[120px] shrink-0 items-center justify-center">
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
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-secondary py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <XPToast amount={xpAmount} visible={xpVisible} onComplete={() => setXpVisible(false)} />
    </>
  )
}
