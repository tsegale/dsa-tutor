import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startAssessment, submitAssessmentResponse, completeAssessment } from '@/api/assessments'
import { resumeState } from '@/lib/assessmentResume'
import { Button } from '@/components/ui/button'
import { DSATutorLogo } from '@/components/brand'

const CODE_BY_PHASE: Record<string, string> = {
  pre: 'STUDY_PRE_V1',
  post: 'STUDY_POST_V1',
}

export default function AssessmentPage() {
  const { phase } = useParams<{ phase: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const code = phase ? CODE_BY_PHASE[phase] : undefined

  const startMutation = useMutation({
    mutationFn: () => startAssessment(code!),
  })

  useEffect(() => {
    if (code && !startMutation.data && !startMutation.isPending && !startMutation.isError) {
      startMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const attempt = startMutation.data
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const itemStartedAt = useRef<number>(Date.now())
  const [isFinishing, setIsFinishing] = useState(false)
  const [nextError, setNextError] = useState<string | null>(null)
  const hasResumedRef = useRef(false)

  // On first load of an attempt that already has responses (a reload
  // mid-assessment), resume at the first unanswered item instead of
  // restarting from question 1, and restore that item's answer if it was
  // already answered (e.g. every item is answered but completion never
  // went through).
  useEffect(() => {
    if (!attempt || hasResumedRef.current) return
    hasResumedRef.current = true

    const { index: resumeIndex, answer: resumeAnswer } = resumeState(attempt.items, attempt.responses)
    setIndex(resumeIndex)
    setAnswer(resumeAnswer)
    itemStartedAt.current = Date.now()
  }, [attempt])

  const responseMutation = useMutation({
    mutationFn: (body: { itemId: string; response: string; timeSpentSeconds: number }) =>
      submitAssessmentResponse(attempt!.id, body),
  })

  const completeMutation = useMutation({
    mutationFn: () => completeAssessment(attempt!.id),
    // The post-test is the last thing before the study's usability survey;
    // the pre-test just returns to the dashboard to start practice sessions.
    // Completing the pre-test flips pretestRequired server-side - without
    // invalidating first, StudyGate's cached ['study', 'status'] (staleTime
    // 60s) would still show pretestRequired: true right after this
    // navigate and bounce straight back to /assessment/pre.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', 'status'] })
      navigate(phase === 'post' ? '/sus' : '/', { replace: true })
    },
  })

  if (!code) {
    return <div className="p-8 text-text-primary">Unknown assessment.</div>
  }

  if (attempt?.completedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-8 text-center">
        <p className="text-text-primary">This assessment has already been submitted. Thank you.</p>
      </div>
    )
  }

  if (startMutation.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface p-8 text-center">
        <p className="text-text-primary">Could not start this assessment. Check your connection and try again.</p>
        <Button onClick={() => startMutation.mutate()}>Retry</Button>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const item = attempt.items[index]
  const isLast = index === attempt.items.length - 1

  async function handleNext() {
    setNextError(null)
    const timeSpentSeconds = Math.round((Date.now() - itemStartedAt.current) / 1000)
    try {
      await responseMutation.mutateAsync({ itemId: item.id, response: answer, timeSpentSeconds })
    } catch {
      setNextError('Could not save your answer. Check your connection and try again.')
      return
    }
    setAnswer('')
    itemStartedAt.current = Date.now()

    if (isLast) {
      setIsFinishing(true)
      try {
        await completeMutation.mutateAsync()
      } catch {
        setIsFinishing(false)
        setNextError('Could not submit the assessment. Check your connection and try again.')
      }
    } else {
      setIndex((i) => i + 1)
    }
  }

  const canSubmit = answer.trim().length > 0

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center border-b border-border bg-card px-6">
        <DSATutorLogo variant="dark" showTagline={false} />
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="mb-2 text-sm font-medium text-text-muted">
          {attempt.title} - question {index + 1} of {attempt.items.length}
        </p>
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((index + 1) / attempt.items.length) * 100}%` }}
          />
        </div>

        <h1 className="mb-6 text-lg font-semibold text-text-primary">{item.stem}</h1>

        {item.itemType === 'MULTIPLE_CHOICE' && item.options ? (
          <div className="mb-8 flex flex-col gap-3">
            {item.options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-light"
              >
                <input
                  type="radio"
                  name={item.id}
                  value={option.id}
                  checked={answer === option.id}
                  onChange={() => setAnswer(option.id)}
                  className="accent-primary"
                />
                <span className="text-sm text-text-primary">{option.text}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer"
            aria-label="Your answer"
            className="mb-8 w-full rounded-md border border-border px-4 py-3 text-sm outline-none focus:border-primary"
          />
        )}

        {nextError && <p className="mb-3 text-sm text-error">{nextError}</p>}

        <Button onClick={handleNext} disabled={!canSubmit || responseMutation.isPending || isFinishing}>
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </main>
    </div>
  )
}
