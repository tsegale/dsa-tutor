import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import type { UserProfile } from '@dsa-tutor/types'
import { deleteAccount } from '@/api/profile'
import { useAuth } from '@/context/AuthContext'
import { STUDY_CONSENT } from '@/utils/studyConsent'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'

// Data and privacy (Phase 6E): what the platform records, in plain language;
// how a participant gets a copy of their data; where an educator exports
// it; and deleting the account.

const RECORDED = [
  'Each prediction you make: the step, your answer, whether it was right, and any hints you asked for.',
  'Timing: when a session starts and ends, and how long the workspace was open and in view.',
  'Text you write in Feynman mode and in self-explanation prompts.',
  'Your answers to the pre-test, post-test and usability questionnaire, if you take part in the study.',
]

function DeleteAccountDialog({ open, onOpenChange, participant }: { open: boolean; onOpenChange: (open: boolean) => void; participant: boolean }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [password, setPassword] = useState('')
  const remove = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => {
      logout()
      navigate('/auth', { replace: true })
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setPassword('')
          remove.reset()
        }
        onOpenChange(value)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogDescription>
          This permanently deletes your account and everything recorded for it: your progress, sessions, answers and badges. It cannot be undone.
        </DialogDescription>
        {participant && (
          <p className="rounded-sm border border-rule bg-surface-sunk px-card py-row text-small text-ink">
            You are taking part in the study. If you only want to leave the study, withdraw instead (in the Research study section above): your
            account keeps working and your data leaves every research export. Deleting the account also removes your study data.
          </p>
        )}
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (password) remove.mutate()
          }}
        >
          <label className="flex flex-col gap-1 text-small text-ink">
            Enter your password to confirm
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              error={remove.error instanceof Error ? remove.error.message : null}
            />
          </label>
          <div className="mt-1 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
              Keep my account
            </Button>
            <Button type="submit" variant="danger" className="flex-1" loading={remove.isPending}>
              Delete account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DataPrivacySection({
  user,
  isParticipant,
  activeParticipant,
}: {
  user: UserProfile
  /** Has a participant code, withdrawn or not: they can still ask for their data. */
  isParticipant: boolean
  /** Currently in the study: deleting is pointed at withdrawal first. */
  activeParticipant: boolean
}) {
  const [deleting, setDeleting] = useState(false)
  const educator = user.role === 'EDUCATOR'

  return (
    <section aria-labelledby="profile-privacy" className="rounded-md border border-rule bg-surface p-card">
      <h2 id="profile-privacy" className="text-h3 text-ink">
        Data and privacy
      </h2>

      <h3 className="mt-4 text-small font-medium text-ink">What the platform records</h3>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-small text-ink-2">
        {RECORDED.map((item) => (
          <li key={item}>{item}</li>
        ))}
        <li>
          Text you write, and the step it is about, is sent to Anthropic&apos;s API so the AI tutor can respond. It is used to produce that response.
        </li>
      </ul>

      {isParticipant && STUDY_CONSENT.researcherEmail && (
        <p className="mt-4 text-small text-ink">
          To request a copy of your data, contact the researcher at{' '}
          <a href={`mailto:${STUDY_CONSENT.researcherEmail}`} className="font-medium text-accent-foreground underline underline-offset-2">
            {STUDY_CONSENT.researcherEmail}
          </a>
          .
        </p>
      )}

      {educator && (
        <p className="mt-4 text-small text-ink">
          Research data is exported from the{' '}
          <Link to="/educator#research-exports" className="font-medium text-accent-foreground underline underline-offset-2">
            research exports on the educator dashboard
          </Link>
          .
        </p>
      )}

      {/* Educator accounts hold the research exports and the demo account is
          the presentation account: neither is deleted from here. */}
      {!educator && !user.isDemo && (
        <div className="mt-5 border-t border-rule pt-4">
          <h3 className="text-small font-medium text-ink">Delete your account</h3>
          <p className="mt-1 text-small text-ink-2">Removes your account and everything recorded for it. This cannot be undone.</p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleting(true)}>
            Delete account
          </Button>
          <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} participant={activeParticipant} />
        </div>
      )}
    </section>
  )
}
