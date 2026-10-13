import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { fetchStudyStatus } from '@/api/study'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { IdentityHeader } from '@/components/profile/IdentityHeader'
import { StudySection } from '@/components/profile/StudySection'
import { AnalyticsSection } from '@/components/profile/AnalyticsSection'
import { PreferencesSection } from '@/components/profile/PreferencesSection'

// The learner and participant hub (Phase 6): identity, study participation
// (participants only), and the guided tour. It must read as complete for a
// non-participant, which most accounts are, the presentation's demo account
// included: their page simply has no study section.

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
  const { user } = useAuth()
  // Launches the walkthrough directly rather than resetting onboarding, which
  // would reopen the welcome modal first (remediation doc 9.7). Its first
  // step points at Home's next-step banner, so it starts from Home.
  const { startTour } = useOnboarding()
  // Shares the ['study', 'status'] cache with the study gate and header chip.
  const { data: studyStatus } = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus })

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        {user ? <IdentityHeader user={user} /> : <h1 className="text-h1 text-ink">Profile</h1>}

        {/* Participants only; absent for everyone else, with no placeholder. */}
        {studyStatus && <StudySection status={studyStatus} />}

        <AnalyticsSection />

        <PreferencesSection />

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
    </AppShell>
  )
}
