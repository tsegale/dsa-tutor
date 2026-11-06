import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import NotFound from '@/pages/NotFound'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { startAssessment, submitAssessmentResponse, completeAssessment } from '@/api/assessments'
import { fetchStudyStatus } from '@/api/study'
import { resumeState } from '@/lib/assessmentResume'
import { STUDY_TOPIC_SLUGS } from '@/utils/misconceptionProbes'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { topicPath } from '@/data/tracks'
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

  const { data: studyStatus } = useQuery({
    queryKey: ['study', 'status'],
    queryFn: fetchStudyStatus,
    enabled: phase === 'post',
    staleTime: 30_000,
  })

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
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['study', 'status'] })
      navigate(phase === 'post' ? '/sus' : '/', { replace: true })
    },
  })

  if (!code) {
    return <NotFound />
  }

  if (attempt?.completedAt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunk p-8 text-center">
        <p className="text-text-primary">This assessment has already been submitted. Thank you.</p>
        <Button asChild variant="secondary">
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    )
  }

  const startedButEmpty =
    startMutation.isSuccess && (!startMutation.data || !Array.isArray(startMutation.data.items))

  if (startMutation.isError || startedButEmpty) {
    const isPostLocked = phase === 'post' && (!studyStatus || !studyStatus.posttestAvailable)
    const completedSet = new Set(studyStatus?.topicsCompleted ?? [])

    if (isPostLocked) {
      return (
        <div className="min-h-screen bg-surface-sunk">
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
            <DSATutorLogo variant="dark" showTagline={false} />
            <Button asChild variant="secondary" size="sm">
              <Link to="/">Back to Home</Link>
            </Button>
          </header>

          <main className="mx-auto max-w-xl px-6 py-12">
            <section className="rounded-md border border-border bg-card p-6 shadow-sm">
              <p className="text-micro font-semibold text-primary uppercase">Post-Test Prerequisites</p>
              <h1 className="mt-1 text-h2 text-ink">
                {studyStatus?.isParticipant
                  ? 'Finish all three study topics to unlock the post-test'
                  : 'Enrol in the research study to take the post-test'}
              </h1>
              <p className="mt-2 text-small text-ink-2">
                {studyStatus?.isParticipant
                  ? 'The post-test opens automatically once you have completed a run on each of the three study topics below.'
                  : 'This assessment belongs to the controlled evaluation study. You can enrol from your profile page or return to the curriculum.'}
              </p>

              {studyStatus?.isParticipant && (
                <ul className="mt-5 divide-y divide-border rounded-md border border-border">
                  {STUDY_TOPIC_SLUGS.map((slug) => {
                    const done = completedSet.has(slug)
                    const label = getAlgorithmRegistryEntry(slug)?.displayName ?? slug
                    return (
                      <li key={slug} className="flex items-center justify-between gap-3 px-4 py-3 text-small">
                        <span className="font-medium text-ink">{label}</span>
                        {done ? (
                          <span className="rounded-full bg-state-sorted/20 px-2.5 py-0.5 text-mono-sm font-medium text-ink">
                            Completed
                          </span>
                        ) : (
                          <Link
                            to={topicPath(slug)}
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            Open topic
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button asChild>
                  <Link to={studyStatus?.isParticipant ? '/' : '/profile'}>
                    {studyStatus?.isParticipant ? 'Continue study topics' : 'Go to Profile'}
                  </Link>
                </Button>
                <Button variant="secondary" onClick={() => startMutation.mutate()}>
                  Check again
                </Button>
              </div>
            </section>
          </main>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunk p-8 text-center">
        <p className="text-text-primary">Could not start this assessment. Check your connection and try again.</p>
        <div className="flex items-center gap-3">
          <Button onClick={() => startMutation.mutate()}>Retry</Button>
          <Button asChild variant="secondary">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-sunk">
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
    <div className="min-h-screen bg-surface-sunk">
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
