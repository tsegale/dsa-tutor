import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStudyStatus, recordConsent } from '@/api/study'
import { Button } from '@/components/ui/button'
import { DSATutorLogo } from '@/components/brand'
import { STUDY_CONSENT, consentDetailsComplete } from '@/utils/studyConsent'

/** A consent detail, or a visible placeholder where it has not been confirmed yet. */
function Detail({ value, placeholder }: { value: string | null; placeholder: string }) {
  if (value?.trim()) return <>{value}</>
  return <span className="rounded bg-secondary-light px-1 font-medium text-secondary">[{placeholder}]</span>
}

function ConsentPageHeader() {
  return (
    <header className="flex h-16 items-center border-b border-border bg-card px-6">
      <DSATutorLogo variant="dark" showTagline={false} />
    </header>
  )
}

export default function ConsentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Shares the ['study', 'status'] cache with App.tsx's StudyGate and
  // DashboardNav - reaching this page directly by URL (rather than via
  // StudyGate's redirect) is otherwise possible for any authenticated user,
  // so this page checks the same status itself before showing a consent
  // button that cannot work for them.
  const statusQuery = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus, staleTime: 60 * 1000 })

  const consentMutation = useMutation({
    mutationFn: recordConsent,
    // StudyGate reads ['study', 'status'] the moment '/' renders. The fresh
    // status must be in the cache BEFORE navigating: invalidating alone only
    // starts a refetch, so the gate still saw the cached consentRequired:
    // true and bounced straight back here (seen live, 2026-09-29).
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['study', 'status'] })
      navigate('/', { replace: true })
    },
  })

  if (statusQuery.isLoading) return null

  if (statusQuery.isError) {
    return (
      <div className="min-h-screen bg-surface">
        <ConsentPageHeader />
        <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
          <p className="text-text-primary">Could not load your study status. Check your connection and try again.</p>
          <Button onClick={() => statusQuery.refetch()}>Retry</Button>
        </main>
      </div>
    )
  }

  const status = statusQuery.data
  if (!status?.isParticipant) {
    return <Navigate to="/study/join" replace />
  }

  if (status.withdrawn) {
    return (
      <div className="min-h-screen bg-surface">
        <ConsentPageHeader />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <p className="text-text-primary">
            You've withdrawn from this study, so there is no consent form to complete.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <ConsentPageHeader />

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 text-xl font-bold text-text-primary">Before you start: research consent</h1>
        {!consentDetailsComplete() && (
          <p className="mb-4 rounded-md border border-secondary bg-secondary-light p-3 text-sm text-text-primary">
            Draft: some details below are still being confirmed. This page is for piloting only - no real
            participant is enrolled until every detail is final.
          </p>
        )}
        <p className="mb-6 text-sm text-text-secondary">
          You've been enrolled as a participant in a study evaluating this platform, run as part of a
          final-year Computer Science research project at the <Detail value={STUDY_CONSENT.institution} placeholder="institution" />.
          Please read the following before continuing.
        </p>

        <div className="mb-6 flex flex-col gap-4 rounded-md border border-border bg-card p-5 text-sm text-text-primary">
          <div>
            <h2 className="mb-1 font-semibold">Who is running this study</h2>
            <p className="text-text-secondary">
              <Detail value={STUDY_CONSENT.researcherName} placeholder="researcher name" />, supervised by{' '}
              <Detail value={STUDY_CONSENT.supervisorName} placeholder="supervisor" />. Contact:{' '}
              {STUDY_CONSENT.researcherEmail ? (
                <a href={`mailto:${STUDY_CONSENT.researcherEmail}`} className="text-primary underline">
                  {STUDY_CONSENT.researcherEmail}
                </a>
              ) : (
                <Detail value={null} placeholder="institutional email" />
              )}
              .
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">What you'll be doing</h2>
            <p className="text-text-secondary">
              A short pre-test, a set of practice sessions on a few algorithms, two quick questions at the
              end of each session, and a short post-test once those sessions are complete.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">What is recorded</h2>
            <p className="text-text-secondary">
              Your interactions are logged: your predictions and answers during practice, the hints and
              feedback you're shown, how long each step takes, your pre/post-test responses, and your
              self-reported effort and confidence ratings.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Use of an AI service</h2>
            <p className="text-text-secondary">
              To generate feedback, your answers and anything you write - explanations in your own words,
              short written reflections, and any code - are sent to Anthropic, a third-party AI provider, for
              processing. Your name and email address are never sent.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">How your data is identified</h2>
            <p className="text-text-secondary">
              Your data is stored under a participant code, not your name or email. No research export
              contains your name or email.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">What happens to the data afterwards</h2>
            <p className="text-text-secondary">
              <Detail value={STUDY_CONSENT.dataRetention} placeholder="how long the data is kept, and what happens to it" />
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Your right to withdraw</h2>
            <p className="text-text-secondary">
              Participation is voluntary. You can withdraw at any time, with no consequence and without
              giving a reason, from your account menu. Withdrawing removes your data from every research
              export going forward, but does not delete your account or stop you using the platform.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Ethics approval</h2>
            <p className="text-text-secondary">
              <Detail value={STUDY_CONSENT.ethicsApproval} placeholder="ethics approval status - to be confirmed by the supervisor" />
              {' '}Approval reference:{' '}
              <Detail value={STUDY_CONSENT.ethicsApprovalReference} placeholder="to be added once approval is granted" />
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Questions</h2>
            <p className="text-text-secondary">
              For any questions about this study, or to withdraw, contact{' '}
              <Detail value={STUDY_CONSENT.researcherName} placeholder="researcher name" /> at{' '}
              {STUDY_CONSENT.researcherEmail ? (
                <a href={`mailto:${STUDY_CONSENT.researcherEmail}`} className="text-primary underline">
                  {STUDY_CONSENT.researcherEmail}
                </a>
              ) : (
                <Detail value={null} placeholder="institutional email" />
              )}
              .
            </p>
          </div>
        </div>

        {consentMutation.isError && (
          <p className="mb-3 text-sm text-error">Could not record your consent. Check your connection and try again.</p>
        )}

        <Button onClick={() => consentMutation.mutate()} disabled={consentMutation.isPending}>
          {consentMutation.isError ? 'Retry' : 'I understand and consent to take part'}
        </Button>
      </main>
    </div>
  )
}
