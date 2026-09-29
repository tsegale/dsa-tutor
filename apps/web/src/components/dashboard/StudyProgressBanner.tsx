import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { TopicDto } from '@dsa-tutor/types'
import { fetchStudyStatus, overridePosttest } from '@/api/study'
import { Button } from '@/components/ui/button'
import { STUDY_TOPIC_SLUGS } from '@/utils/misconceptionProbes'

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * A study participant's progress toward the post-test, and the only way into
 * it. Completion follows apps/api/src/config/topicCompletion.ts (tutor: final
 * step plus a conceptual answer; Classic: final step). The copy is worded to
 * fit both, since conditions are never labelled to participants.
 * A researcher can open the post-test early with their PIN - the server
 * records that it happened, so the write-up can report it.
 */
export default function StudyProgressBanner({ topics }: { topics: TopicDto[] }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: status } = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus, staleTime: 60 * 1000 })
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [pin, setPin] = useState('')

  const override = useMutation({
    mutationFn: () => overridePosttest(pin),
    onSuccess: (next) => {
      queryClient.setQueryData(['study', 'status'], next)
      setOverrideOpen(false)
      setPin('')
    },
  })

  if (!status?.isParticipant || status.withdrawn || status.consentRequired || status.pretestRequired) return null

  const nameOf = (slug: string) => topics.find((t) => t.name === slug)?.displayName ?? slug
  const done = new Set(status.topicsCompleted)

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label="Study progress">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text-primary">
            Study progress: {done.size} of {STUDY_TOPIC_SLUGS.length} topics complete
          </h2>
          <ul className="flex flex-wrap gap-2">
            {STUDY_TOPIC_SLUGS.map((slug) => (
              <li
                key={slug}
                className={
                  done.has(slug)
                    ? 'flex items-center gap-1 rounded-full bg-success-light px-2.5 py-0.5 text-xs text-success'
                    : 'rounded-full bg-surface px-2.5 py-0.5 text-xs text-text-muted'
                }
              >
                {done.has(slug) && <CheckIcon />}
                {nameOf(slug)}
              </li>
            ))}
          </ul>
          {!status.posttestAvailable && (
            <p className="text-xs text-text-muted">
              A topic is complete when you work through a run to the end, answering any questions it asks.
            </p>
          )}
        </div>

        {status.posttestCompleted ? (
          <p className="text-sm text-text-secondary">Post-test done - thank you.</p>
        ) : status.posttestAvailable ? (
          <Button onClick={() => navigate('/assessment/post')}>Take the post-test</Button>
        ) : (
          <button
            type="button"
            onClick={() => setOverrideOpen((open) => !open)}
            className="text-xs text-text-muted underline"
          >
            Researcher override
          </button>
        )}
      </div>

      {overrideOpen && !status.posttestAvailable && (
        <form
          className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (pin.trim()) override.mutate()
          }}
        >
          <label className="text-xs text-text-secondary" htmlFor="researcher-pin">
            Researcher PIN (opens the post-test early; this is recorded)
          </label>
          <input
            id="researcher-pin"
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            className="w-32 rounded-md border border-border bg-background px-2 py-1 text-sm text-text-primary outline-none focus:border-primary"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!pin.trim() || override.isPending}>
            Open post-test
          </Button>
          {override.isError && (
            <p className="w-full text-xs text-error">
              {override.error instanceof Error ? override.error.message : 'Could not record the override.'}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
