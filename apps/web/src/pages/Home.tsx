import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useTopics } from '@/hooks/useTopics'
import { fetchLatestIncompleteSession } from '@/api/sessions'
import { TRACKS } from '@/data/tracks'
import { pickContinue, topicsInTrack } from '@/utils/curriculum'
import { AppShell } from '@/components/layout/AppShell'
import { ContinueCard } from '@/components/home/ContinueCard'
import { TrackCard } from '@/components/home/TrackCard'
import { ProgressStrip } from '@/components/home/ProgressStrip'
import AILearningPathBanner from '@/components/dashboard/AILearningPathBanner'
import StudyProgressBanner from '@/components/dashboard/StudyProgressBanner'
import WelcomeModal from '@/components/onboarding/WelcomeModal'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

// Home answers one question: what do I do now. One Continue card, then the
// six tracks as the only way into the curriculum. No carousels, at most
// eight cards. The curriculum itself lives on the track pages.

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your curriculum" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full rounded-md" />
      <Skeleton className="h-14 w-full rounded-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((track) => (
          <SkeletonCard key={track.slug} />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { user, refreshUser } = useAuth()
  const { showWelcomeModal, closeWelcomeModal, startTour, completeOnboarding } = useOnboarding()
  const [searchParams, setSearchParams] = useSearchParams()
  // Set by AlgorithmPage's redirect when a study participant opens a real
  // algorithm that is not one of their study topics; Home has no other way
  // to explain why they landed here.
  const [showBlockedNotice, setShowBlockedNotice] = useState(searchParams.get('blocked') === 'study')

  useEffect(() => {
    if (searchParams.has('blocked')) {
      searchParams.delete('blocked')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // XP and streak earned during a session (on another page) show here
  // without a full reload.
  useEffect(() => {
    void refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: topics = [], isLoading } = useTopics()
  const { data: latestSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['sessions', 'latest-incomplete'],
    queryFn: fetchLatestIncompleteSession,
    staleTime: 30 * 1000,
  })

  const tracks = TRACKS.map((track) => ({ track, topics: topicsInTrack(topics, track.id) })).filter(({ topics }) => topics.length > 0)
  const firstName = user?.name?.split(' ')[0]

  return (
    <AppShell crumbs={[{ label: 'Home' }]}>
      {isLoading || sessionLoading ? (
        <HomeSkeleton />
      ) : (
        <div className="flex flex-col gap-6">
          {showBlockedNotice && (
            <div role="status" className="flex items-start justify-between gap-4 rounded-md border border-rule bg-surface px-card py-row text-small text-ink">
              <span>That algorithm is not one of your study topics, so it is not available while you are enrolled.</span>
              <button type="button" onClick={() => setShowBlockedNotice(false)} aria-label="Dismiss" className="shrink-0 text-ink-2 hover:text-ink">
                <svg className="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}

          {/* "Back" only once there is something to come back to. */}
          <h1 className="text-h1 text-ink">
            {latestSession ? 'Welcome back' : 'Welcome'}
            {firstName ? `, ${firstName}` : ''}
          </h1>

          <StudyProgressBanner topics={topics} />
          <ContinueCard target={pickContinue(topics, latestSession)} />
          <AILearningPathBanner topics={topics} />
          {user && <ProgressStrip user={user} topics={topics} />}

          <section aria-labelledby="tracks-heading" className="mt-4 flex flex-col gap-4">
            <h2 id="tracks-heading" className="text-h2 text-ink">
              Tracks
            </h2>
            <ul id="curriculum-tracks" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tracks.map(({ track, topics: trackTopics }) => (
                <li key={track.slug}>
                  <TrackCard track={track} topics={trackTopics} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {showWelcomeModal && (
        <WelcomeModal
          userName={user?.name ?? 'there'}
          onStartTour={() => {
            closeWelcomeModal()
            startTour()
          }}
          onSkip={completeOnboarding}
        />
      )}
    </AppShell>
  )
}
