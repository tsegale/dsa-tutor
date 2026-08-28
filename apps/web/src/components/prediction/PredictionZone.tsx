import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlgorithmMode, PredictionType } from '@dsa-tutor/types'
import type { HintRequest, PredictionRequest } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import { submitPrediction, requestHint } from '@/api/predictions'
import { apiFetch } from '@/api/client'
import { cn } from '@/lib/utils'
import XPToast from '@/components/ui/XPToast'
import HintAvatar, { DISMISS_HINT_EVENT } from './HintAvatar'
import CanvasClickInput from './CanvasClickInput'
import ValueInput from './ValueInput'
import TileGrid, { type TileOption } from './TileGrid'
import MistakeAnalysisToast from './MistakeAnalysisToast'

interface PredictionZoneProps {
  onSubmit: (answer: string) => void
}

export const CANVAS_ELEMENT_SELECTED_EVENT = 'dsa-tutor:canvas-element-selected'
export const CLEAR_CANVAS_SELECTION_EVENT = 'dsa-tutor:clear-canvas-selection'
export const REQUEST_HINT_EVENT = 'request-hint'
export const ESCAPE_EVENT = 'dsa-tutor:escape'

const SWAP_OPTIONS: TileOption[] = [
  { id: 'swap', label: 'Swap them', description: 'The left value is greater, swap' },
  { id: 'no-swap', label: 'No swap needed', description: 'Already in the right order' },
]

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

export default function PredictionZone({ onSubmit }: PredictionZoneProps) {
  const mode = useAlgorithmStore((state) => state.mode)
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const sessionId = useAlgorithmStore((state) => state.sessionId)
  const stepForward = useAlgorithmStore((state) => state.stepForward)
  const addXP = useAlgorithmStore((state) => state.addXP)

  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)
  const [submissionState, setSubmissionState] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [mistakeAnalysis, setMistakeAnalysis] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [shakeToken, setShakeToken] = useState(0)
  const [xpAmount, setXpAmount] = useState(0)
  const [xpVisible, setXpVisible] = useState(false)
  const [hintsRequestedCount, setHintsRequestedCount] = useState(0)
  const [stepStartTime, setStepStartTime] = useState(() => Date.now())

  const isVisible = mode === AlgorithmMode.PRACTICE && snapshot !== null && snapshot.isPredictionRequired
  const stepIndex = snapshot?.stepIndex ?? null

  useEffect(() => {
    setCurrentAnswer(null)
    setSubmissionState('idle')
    setMistakeAnalysis(null)
    setHint(null)
    setHintLoading(false)
    setHintsRequestedCount(0)
    setStepStartTime(Date.now())
  }, [stepIndex])

  useEffect(() => {
    function handleCanvasSelect(event: Event) {
      const index = (event as CustomEvent<number>).detail
      setCurrentAnswer(String(index))
    }
    window.addEventListener(CANVAS_ELEMENT_SELECTED_EVENT, handleCanvasSelect)
    return () => window.removeEventListener(CANVAS_ELEMENT_SELECTED_EVENT, handleCanvasSelect)
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
      void handleRequestHint()
    }
    window.addEventListener(REQUEST_HINT_EVENT, handleRequestHintEvent)
    return () => window.removeEventListener(REQUEST_HINT_EVENT, handleRequestHintEvent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, hintLoading])

  async function handleRequestHint() {
    if (hint !== null || hintLoading || !snapshot) return
    setHintLoading(true)
    setHintsRequestedCount((count) => count + 1)

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

  async function handleSubmit() {
    if (currentAnswer === null || isSubmitting || !snapshot) return
    onSubmit(currentAnswer)
    setIsSubmitting(true)

    const request: PredictionRequest = {
      algorithmName,
      stepIndex: snapshot.stepIndex,
      currentState: {
        dataStructureState: snapshot.dataStructureState,
        activeIndices: snapshot.activeIndices,
      },
      studentAnswer: currentAnswer,
      errorHistory: [],
      scaffoldingLevel,
      sessionId: sessionId ?? 'local-session',
    }

    const response = await submitPrediction(request)
    setIsSubmitting(false)

    const timeSpentSeconds = Math.round((Date.now() - stepStartTime) / 1000)
    if (sessionId) {
      apiFetch('/api/v1/interactions', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          stepIndex: snapshot.stepIndex,
          predictionSubmitted: currentAnswer,
          predictionCorrect: response.correct,
          misconceptionCategory: response.correct ? null : response.misconceptionCategory,
          hintsRequested: hintsRequestedCount,
          timeSpentSeconds,
        }),
      }).catch(() => {
        // Interaction logging is best-effort; it must never block the
        // learner's practice flow if the backend is unreachable.
      })
    }

    if (response.correct) {
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
      await new Promise((resolve) => setTimeout(resolve, 400))
      stepForward()
    } else {
      setSubmissionState('incorrect')
      setMistakeAnalysis(response.consequenceExplanation)
      setShakeToken((token) => token + 1)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSubmissionState('idle')
      setCurrentAnswer(null)
      window.dispatchEvent(new CustomEvent(CLEAR_CANVAS_SELECTION_EVENT))
    }
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
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'absolute bottom-0 left-0 z-20 h-[35%] w-full rounded-t-lg border-t bg-white shadow-lg',
              'transition-colors duration-300',
              submissionState === 'correct' ? 'border-success' : 'border-border',
            )}
          >
            <MistakeAnalysisToast
              message={mistakeAnalysis}
              pseudocodeLine={snapshot.pseudocodeLine}
              onDismiss={() => setMistakeAnalysis(null)}
            />

            <div className="px-4 pt-2 text-[11px] font-semibold tracking-wide text-secondary uppercase">
              Predict the next step
            </div>

            <div className="flex h-[calc(100%-28px)] items-stretch gap-3 px-4 pb-3">
              <div className="flex w-16 shrink-0 items-start justify-center pt-2">
                <HintAvatar
                  hintAvailable
                  onRequestHint={() => void handleRequestHint()}
                  hint={hint}
                  isLoading={hintLoading}
                />
              </div>

              <motion.div
                key={shakeToken}
                animate={
                  submissionState === 'incorrect' ? { x: [0, -4, 4, -4, 4, -4, 4, 0] } : { x: 0 }
                }
                transition={{ duration: 0.2 }}
                className="min-w-0 flex-1"
              >
                {snapshot.predictionType === PredictionType.CANVAS_CLICK && (
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
                    options={SWAP_OPTIONS}
                    onSelect={setCurrentAnswer}
                    selectedId={currentAnswer}
                    submissionState={submissionState}
                  />
                )}
              </motion.div>

              <div className="flex w-[120px] shrink-0 items-center justify-center">
                {submissionState === 'idle' && (
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
                    <span className="text-xs font-medium">Try again</span>
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
