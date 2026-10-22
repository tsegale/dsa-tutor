import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enrolInStudy } from '@/api/study'
import { Button } from '@/components/ui/button'
import { DSATutorLogo } from '@/components/brand'

/**
 * Joining the study: one button.
 *
 * It used to ask for a participant code a researcher had issued by hand.
 * The code still exists - it identifies the participant in the exported
 * data and decides which topic is their Classic condition - but the API
 * assigns it on enrolment, so there is nothing to type and nothing to hand
 * out. The page is kept rather than making the button on Home enrol
 * directly, because a participant should read what they are joining before
 * they join it; consent itself is the next screen.
 */
export default function StudyJoinPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const enrolMutation = useMutation({
    mutationFn: enrolInStudy,
    // The response is the new status: put it in the cache before navigating,
    // so the consent page never reads the cached pre-enrolment status.
    onSuccess: (status) => {
      queryClient.setQueryData(['study', 'status'], status)
      navigate('/consent', { replace: true })
    },
  })

  return (
    <div className="min-h-screen bg-surface-sunk">
      <header className="flex h-16 items-center border-b border-border bg-card px-6">
        <DSATutorLogo variant="dark" showTagline={false} />
      </header>

      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="mb-2 text-xl font-bold text-text-primary">Join the study</h1>
        <p className="mb-4 text-sm text-text-secondary">
          This study looks at how students learn algorithms with an interactive tutor. Taking part means working
          through three topics in the app, with a short test before and after and a questionnaire at the end.
        </p>
        <p className="mb-6 text-sm text-text-secondary">
          You will be asked to give consent on the next screen, and you can withdraw at any time from your profile.
        </p>

        {enrolMutation.isError && (
          <p role="alert" className="mb-4 text-sm text-error">
            {enrolMutation.error instanceof Error ? enrolMutation.error.message : 'Could not join the study.'}
          </p>
        )}

        <Button onClick={() => enrolMutation.mutate()} disabled={enrolMutation.isPending}>
          {enrolMutation.isPending ? 'Joining...' : 'Join the study'}
        </Button>
      </main>
    </div>
  )
}
