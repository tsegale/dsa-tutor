import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { FeynmanResponse } from '@dsa-tutor/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { submitFeynmanExplanation } from '@/api/feynman'
import { apiFetch } from '@/api/client'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import FeynmanAvatar from './FeynmanAvatar'

interface FeynmanModalProps {
  algorithmName: string
  completionContext: string
  sessionId: string
  onClose: () => void
  /** True only when the run actually reached its final step. The Feynman
   * button in the left panel can also open this modal mid-run (after just
   * one prediction), so the copy must not claim a completion that hasn't
   * happened. */
  isFullCompletion: boolean
}

type Phase = 'prompt' | 'loading' | 'feedback'

const MIN_CHARS_TO_SUBMIT = 100
const BASE_XP = 30
const COMPLETE_BONUS_XP = 20

// The AI service's rubric matching is keyed on this description; it is
// server-side unused today (only algorithm_name/completion_context/
// student_explanation feed the prompt) but the request contract expects
// it, so a short static description is enough.
const ALGORITHM_CONTEXT =
  'Bubble Sort repeatedly compares adjacent elements and swaps them if the left one is greater, ' +
  'making multiple passes over the array until no swaps are needed.'

function scoreColorClass(score: number): string {
  if (score >= 75) return 'bg-success'
  if (score >= 50) return 'bg-secondary'
  return 'bg-error'
}

function scoreTextColorClass(score: number): string {
  if (score >= 75) return 'text-success'
  if (score >= 50) return 'text-secondary'
  return 'text-error'
}

function expressionForScore(score: number): 'happy' | 'neutral' | 'confused' {
  if (score >= 75) return 'happy'
  if (score >= 50) return 'neutral'
  return 'confused'
}

function TypingIndicator() {
  const prefersReducedMotion = useReducedMotion()
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-2 rounded-full bg-secondary"
          animate={prefersReducedMotion ? { scale: 1 } : { scale: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function FeynmanModal({
  algorithmName,
  completionContext,
  sessionId,
  onClose,
  isFullCompletion,
}: FeynmanModalProps) {
  const scaffoldingLevel = useAlgorithmStore((state) => state.scaffoldingLevel)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const addXP = useAlgorithmStore((state) => state.addXP)
  const { play } = useSoundEffects()

  const [phase, setPhase] = useState<Phase>('prompt')
  const [explanation, setExplanation] = useState('')
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [result, setResult] = useState<FeynmanResponse | null>(null)
  const [terminal, setTerminal] = useState(false)
  const [awaitingFollowUp, setAwaitingFollowUp] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [xpAwarded, setXpAwarded] = useState<number | null>(null)
  const openedAtRef = useRef(Date.now())

  async function finalizeSession(finalResult: FeynmanResponse, submittedText: string) {
    setTerminal(true)
    setAwaitingFollowUp(false)

    const amount = BASE_XP + (finalResult.isComplete ? COMPLETE_BONUS_XP : 0)
    setXpAwarded(amount)
    addXP(amount)
    play('xp')
    apiFetch('/api/v1/auth/xp', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }).catch(() => {
      // Best-effort: local session XP already reflects the award.
    })

    if (sessionId) {
      apiFetch('/api/v1/interactions', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          stepIndex,
          predictionSubmitted: submittedText,
          predictionCorrect: finalResult.isComplete,
          misconceptionCategory: null,
          hintsRequested: 0,
          timeSpentSeconds: Math.round((Date.now() - openedAtRef.current) / 1000),
          interactionType: 'FEYNMAN',
          scaffoldingLevelAtTime: scaffoldingLevel,
          masteryScoreAtTime: finalResult.score,
        }),
      }).catch(() => {
        // Interaction logging is best-effort; must never block the flow.
      })
    }
  }

  async function handleSubmitExplanation() {
    if (explanation.length < MIN_CHARS_TO_SUBMIT) return
    setErrorMessage(null)
    setPhase('loading')
    try {
      const response = await submitFeynmanExplanation({
        algorithmName,
        algorithmContext: ALGORITHM_CONTEXT,
        studentExplanation: explanation,
        completionContext,
        sessionId,
      })
      setResult(response)
      if (response.isComplete || !response.followUpQuestion) {
        await finalizeSession(response, explanation)
      } else {
        setAwaitingFollowUp(true)
      }
      setPhase('feedback')
    } catch {
      setErrorMessage('Something went wrong evaluating your explanation. Please try again.')
      setPhase('prompt')
    }
  }

  async function handleSubmitFollowUp() {
    if (!result || followUpAnswer.trim().length === 0) return
    setErrorMessage(null)
    setPhase('loading')
    const combined = `${explanation}\n\nFollow-up question: ${result.followUpQuestion}\nMy answer: ${followUpAnswer}`
    try {
      const response = await submitFeynmanExplanation({
        algorithmName,
        algorithmContext: ALGORITHM_CONTEXT,
        studentExplanation: combined,
        completionContext,
        sessionId,
      })
      setResult(response)
      await finalizeSession(response, combined)
      setPhase('feedback')
    } catch {
      setErrorMessage('Something went wrong evaluating your answer. Please try again.')
      setPhase('feedback')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        onPointerDownOutside={(event) => event.preventDefault()}
        className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-md"
      >
        {phase === 'prompt' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <FeynmanAvatar expression="confused" />
              <div className="flex flex-col gap-1 pt-1">
                <DialogTitle className="text-xl font-bold">Explain it to me!</DialogTitle>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
                  {isFullCompletion
                    ? `You just completed ${algorithmName}. Explain to me how it works in plain English, like I have never heard of it before. The more detail the better.`
                    : `Let's check your understanding of ${algorithmName} so far. Explain what you've learned about it in plain English, like I have never heard of it before. The more detail the better.`}
                </p>
              </div>
            </div>

            <textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              placeholder="Type your explanation here..."
              className="min-h-[120px] resize-y rounded-md border border-border bg-white p-3 text-sm text-text-primary outline-none focus:border-primary dark:bg-dark-background dark:text-dark-text-primary"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted dark:text-dark-text-secondary">
                {explanation.length} / {MIN_CHARS_TO_SUBMIT} characters minimum
              </span>
            </div>

            {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}

            <button
              type="button"
              onClick={() => void handleSubmitExplanation()}
              disabled={explanation.length < MIN_CHARS_TO_SUBMIT}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit Explanation
            </button>
            <button
              type="button"
              onClick={onClose}
              className="self-center text-xs text-text-muted underline dark:text-dark-text-secondary"
            >
              Skip for now
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <FeynmanAvatar expression="thinking" />
            <DialogTitle className="sr-only">Evaluating your explanation</DialogTitle>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Reading your explanation...</p>
            <TypingIndicator />
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-text-muted underline dark:text-dark-text-secondary"
            >
              Skip for now
            </button>
          </div>
        )}

        {phase === 'feedback' && result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <FeynmanAvatar expression={expressionForScore(result.score)} />
              <DialogTitle className="pt-1 text-xl font-bold">
                {terminal ? (result.isComplete ? 'Great explanation!' : 'Keep practicing') : 'Almost there!'}
              </DialogTitle>
            </div>

            <div className="rounded-md border-l-4 border-secondary bg-white p-3 text-[14px] text-text-primary italic dark:bg-dark-surface dark:text-dark-text-primary">
              {result.feedbackSummary}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary">
                Explanation score: {result.score}/100
              </span>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface dark:bg-dark-border">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', scoreColorClass(result.score))}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>

            {result.missingConcepts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary">
                  Concepts to review:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingConcepts.map((concept) => (
                    <span
                      key={concept}
                      className="rounded-full bg-secondary-light px-2.5 py-0.5 text-xs text-secondary"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!terminal && awaitingFollowUp && result.followUpQuestion && (
              <div className="flex flex-col gap-2 border-t border-border pt-3 dark:border-dark-border">
                <span className="text-[13px] font-bold text-primary">I still have a question:</span>
                <p className="text-sm text-text-primary dark:text-dark-text-primary">{result.followUpQuestion}</p>
                <textarea
                  value={followUpAnswer}
                  onChange={(event) => setFollowUpAnswer(event.target.value)}
                  placeholder="Type your answer here..."
                  className="min-h-[80px] resize-y rounded-md border border-border bg-white p-3 text-sm text-text-primary outline-none focus:border-primary dark:bg-dark-background dark:text-dark-text-primary"
                />
                {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}
                <button
                  type="button"
                  onClick={() => void handleSubmitFollowUp()}
                  disabled={followUpAnswer.trim().length === 0}
                  className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit Answer
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="self-center text-xs text-text-muted underline dark:text-dark-text-secondary"
                >
                  Skip for now
                </button>
              </div>
            )}

            {terminal && (
              <div className="flex flex-col gap-3 border-t border-border pt-3 dark:border-dark-border">
                <div className={cn('flex items-center gap-2 text-sm font-medium', scoreTextColorClass(result.score))}>
                  {result.isComplete ? (
                    <>
                      <CheckmarkIcon />
                      <span>Great explanation! You clearly understand {algorithmName}.</span>
                    </>
                  ) : (
                    <span className="text-text-primary dark:text-dark-text-primary">
                      Keep practicing, review the explanation panel and try again later.
                    </span>
                  )}
                </div>
                {xpAwarded !== null && (
                  <span className="text-xs font-medium text-secondary">+{xpAwarded} XP earned</span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-white"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CheckmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
