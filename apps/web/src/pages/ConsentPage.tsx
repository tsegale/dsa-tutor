import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStudyStatus, recordConsent } from '@/api/study'
import { Button } from '@/components/ui/button'
import { DSATutorLogo } from '@/components/brand'

function ConsentPageHeader() {
  return (
    <header className="flex h-16 items-center border-b border-border bg-white px-6">
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
    // Without invalidating first, StudyGate's own ['study', 'status'] read
    // right after this navigate would still see the pre-consent, cached
    // consentRequired: true (staleTime hasn't elapsed) and bounce straight
    // back here - consent would appear to silently do nothing.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', 'status'] })
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
        <p className="mb-6 text-sm text-text-secondary">
          You've been enrolled as a participant in a study evaluating this platform, run as part of a
          final-year Computer Science research project at the University of Namibia. Please read the
          following before continuing.
        </p>

        <div className="mb-6 flex flex-col gap-4 rounded-md border border-border bg-white p-5 text-sm text-text-primary">
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
              Your predictions and answers during practice, the hints and feedback you're shown, your
              pre/post-test responses, and your self-reported effort and confidence ratings. Data is
              linked to a participant code, not your name or email, in every research export.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Your right to withdraw</h2>
            <p className="text-text-secondary">
              Participation is voluntary. You can withdraw from the study at any time from your account
              menu, without giving a reason. Withdrawing removes your data from every research export
              going forward, but does not delete your account or stop you using the platform.
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold">Questions</h2>
            {/* Placeholder contact - replace with the actual, ethics-approved
                researcher contact before running real sessions. */}
            <p className="text-text-secondary">
              Contact the research team at{' '}
              <a href="mailto:research@dsatutor.com" className="text-primary underline">
                research@dsatutor.com
              </a>{' '}
              with any questions about this study.
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
