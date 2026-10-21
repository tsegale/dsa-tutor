import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { StudyStatusDto } from '@dsa-tutor/types'
import { withdrawFromStudy } from '@/api/study'
import { studyPhase, type StudyPhaseKey } from '@/utils/studyPhase'
import { STUDY_TOPIC_SLUGS } from '@/utils/misconceptionProbes'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// The profile's study section (Phase 6B), for participants only: the
// identifier used in every export, when they consented, where they are in
// the protocol, and how to withdraw.
//
// Deliberately absent: any group or condition label (the design is
// within-subject, so there are no groups) and anything about which topic
// is a participant's control. Only status fields that say nothing about
// condition are read here.

const ORDER: StudyPhaseKey[] = ['consent', 'pretest', 'topics', 'posttest', 'questionnaire', 'complete']

function StepMark({ state }: { state: 'done' | 'current' | 'upcoming' }) {
  if (state === 'done') {
    return (
      <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-success" aria-hidden="true">
        <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
      <span className={state === 'current' ? 'size-2.5 rounded-full bg-brand' : 'size-2.5 rounded-full border border-rule-strong'} />
    </span>
  )
}

export function StudySection({ status }: { status: StudyStatusDto }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const withdraw = useMutation({
    mutationFn: withdrawFromStudy,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['study', 'status'] })
      setConfirming(false)
    },
  })

  // Nobody signs up for a study on a profile page, but it is where they
  // look for anything about it - and the join box is linked from nowhere
  // else, so an unenrolled participant found a blank where their study
  // ought to be.
  if (!status.participantCode) {
    if (status.isDemo) return null
    return (
      <section aria-labelledby="profile-study" className="rounded-md border border-rule bg-surface p-card">
        <h2 id="profile-study" className="text-h3 text-ink">
          Research study
        </h2>
        <p className="mt-2 text-small text-ink-2">
          You are not taking part. If your researcher gave you a participant code, you can enter it to join.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/study/join')}>
          Enter your code
        </Button>
      </section>
    )
  }

  const consented = status.consentAt ? new Date(status.consentAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const phase = studyPhase(status)
  const at = phase ? ORDER.indexOf(phase.key) : -1
  const stateOf = (key: StudyPhaseKey): 'done' | 'current' | 'upcoming' => {
    const index = ORDER.indexOf(key)
    return index < at ? 'done' : index === at ? 'current' : 'upcoming'
  }
  const total = STUDY_TOPIC_SLUGS.length
  const steps: { key: StudyPhaseKey; label: string; detail?: string }[] = [
    { key: 'consent', label: 'Consent', detail: consented ? `given ${consented}` : 'outstanding' },
    { key: 'pretest', label: 'Pre-test' },
    { key: 'topics', label: 'Study topics', detail: `${Math.min(status.topicsCompleted.length, total)} of ${total} complete` },
    { key: 'posttest', label: 'Post-test' },
    { key: 'questionnaire', label: 'Usability questionnaire', detail: status.susSubmitted ? 'submitted' : 'outstanding' },
  ]

  return (
    <section aria-labelledby="profile-study" className="rounded-md border border-rule bg-surface p-card">
      <h2 id="profile-study" className="text-h3 text-ink">
        Research study
      </h2>

      <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-small">
        <dt className="text-ink-2">Participant code</dt>
        <dd className="text-mono text-ink">{status.participantCode}</dd>
        <dt className="text-ink-2">Consent</dt>
        <dd className="text-ink">{consented ? `Given ${consented}` : 'Not yet given'}</dd>
      </dl>

      {status.withdrawn ? (
        <p role="status" className="mt-4 rounded-sm border border-rule bg-surface-sunk px-card py-row text-small text-ink">
          You have withdrawn from the study. Your account keeps working, and your data is excluded from every research export.
        </p>
      ) : (
        <>
          <h3 className="mt-5 text-small font-medium text-ink">Where you are</h3>
          <ol className="mt-2 flex flex-col gap-2">
            {steps.map((step) => {
              const state = phase?.key === 'complete' ? 'done' : stateOf(step.key)
              return (
                <li key={step.key} className="flex items-center gap-2.5 text-small">
                  <StepMark state={state} />
                  <span className={state === 'upcoming' ? 'text-ink-2' : 'text-ink'}>
                    {step.label}
                    {step.detail && <span className="text-ink-2"> · {step.detail}</span>}
                    {state === 'current' && <span className="sr-only"> (current step)</span>}
                  </span>
                </li>
              )
            })}
          </ol>
          {phase?.key === 'complete' && <p className="mt-3 text-small text-ink-2">Every step is complete. Thank you for taking part.</p>}

          <div className="mt-5 border-t border-rule pt-4">
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
              Withdraw from the study
            </Button>
          </div>
        </>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Withdraw from the study?</DialogTitle>
          <DialogDescription>
            Your account keeps working exactly as it does now, with your progress intact. Your data leaves every research export from this point on.
          </DialogDescription>
          {withdraw.isError && <p className="text-small text-error">Withdrawal did not go through. Check your connection and try again.</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => withdraw.mutate()} loading={withdraw.isPending} className="flex-1">
              Withdraw
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
