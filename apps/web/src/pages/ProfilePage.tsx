import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { fetchStudyStatus, withdrawFromStudy } from '@/api/study'
import { studyPhase } from '@/utils/studyPhase'
import { AppShell } from '@/components/layout/AppShell'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IdentityHeader } from '@/components/profile/IdentityHeader'

// The account menu's Profile destination (Phase 4F): the account, the study
// enrolment controls that used to sit in the menu (join, withdraw), and the
// guided tour. Withdrawal must stay one obvious step away for any
// participant, so it lives here rather than disappearing with the menu item.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`profile-${title}`} className="rounded-md border border-rule bg-surface p-card">
      <h2 id={`profile-${title}`} className="text-h3 text-ink">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  // Launches the walkthrough directly rather than resetting onboarding, which
  // would reopen the welcome modal first (remediation doc 9.7). Its first
  // step points at Home's Continue card, so it starts from Home.
  const { startTour } = useOnboarding()
  // Shares the ['study', 'status'] cache with the study gate and header chip.
  const { data: studyStatus } = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus })
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)

  const withdrawMutation = useMutation({
    mutationFn: withdrawFromStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study', 'status'] })
      setConfirmingWithdraw(false)
    },
  })

  const phase = studyPhase(studyStatus)

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        {user ? <IdentityHeader user={user} /> : <h1 className="text-h1 text-ink">Profile</h1>}

        {/* Educators and demo accounts are never study participants (enrolment
            refuses a demo account), so neither gets a join offer. */}
        {studyStatus && user?.role !== 'EDUCATOR' && (phase || studyStatus.withdrawn || (!studyStatus.isParticipant && !studyStatus.isDemo)) && (
          <Section title="Research study">
            {phase ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-small text-ink">You are taking part in the study. Current step: {phase.label}.</p>
                <Button variant="secondary" size="sm" onClick={() => setConfirmingWithdraw(true)}>
                  Withdraw from study
                </Button>
              </div>
            ) : studyStatus.withdrawn ? (
              <p className="text-small text-ink-2">You have withdrawn from the study. Your data is excluded from every research export.</p>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-small text-ink-2">If a researcher gave you a participant code, you can join the study here.</p>
                <Button variant="secondary" size="sm" onClick={() => navigate('/study/join')}>
                  Join the study
                </Button>
              </div>
            )}
          </Section>
        )}

        <Section title="Guided tour">
          <div className="flex flex-col items-start gap-3">
            <p className="text-small text-ink-2">A short walkthrough of Home and the algorithm workspace.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigate('/')
                startTour()
              }}
            >
              Take the tour
            </Button>
          </div>
        </Section>
      </div>

      <Dialog open={confirmingWithdraw} onOpenChange={setConfirmingWithdraw}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Withdraw from the study?</DialogTitle>
          <DialogDescription>
            Your data will be removed from every research export going forward. Your account and progress stay exactly as they are: this only stops you
            being studied, not your access.
          </DialogDescription>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmingWithdraw(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => withdrawMutation.mutate()} loading={withdrawMutation.isPending} className="flex-1">
              Withdraw
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
