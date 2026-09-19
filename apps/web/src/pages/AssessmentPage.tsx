import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { startAssessment, submitAssessmentResponse, completeAssessment } from '@/api/assessments'
import { Button } from '@/components/ui/button'
import { DSATutorLogo } from '@/components/brand'

const CODE_BY_PHASE: Record<string, string> = {
  pre: 'STUDY_PRE_V1',
  post: 'STUDY_POST_V1',
}

export default function AssessmentPage() {
  const { phase } = useParams<{ phase: string }>()
  const navigate = useNavigate()
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

  const responseMutation = useMutation({
    mutationFn: (body: { itemId: string; response: string; timeSpentSeconds: number }) =>
      submitAssessmentResponse(attempt!.id, body),
  })

  const completeMutation = useMutation({
    mutationFn: () => completeAssessment(attempt!.id),
    // The post-test is the last thing before the study's usability survey;
    // the pre-test just returns to the dashboard to start practice sessions.
    onSuccess: () => navigate(phase === 'post' ? '/sus' : '/', { replace: true }),
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
    const timeSpentSeconds = Math.round((Date.now() - itemStartedAt.current) / 1000)
    await responseMutation.mutateAsync({ itemId: item.id, response: answer, timeSpentSeconds })
    setAnswer('')
    itemStartedAt.current = Date.now()

    if (isLast) {
      setIsFinishing(true)
      await completeMutation.mutateAsync()
    } else {
      setIndex((i) => i + 1)
    }
  }

  const canSubmit = answer.trim().length > 0

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex h-16 items-center border-b border-border bg-white px-6">
        <DSATutorLogo variant="dark" showTagline={false} />
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="mb-2 text-sm font-medium text-text-muted">
          {attempt.title} - question {index + 1} of {attempt.items.length}
        </p>
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white">
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
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-white p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-light"
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

        <Button onClick={handleNext} disabled={!canSubmit || responseMutation.isPending || isFinishing}>
          {isLast ? 'Finish' : 'Next'}
        </Button>
      </main>
    </div>
  )
}
