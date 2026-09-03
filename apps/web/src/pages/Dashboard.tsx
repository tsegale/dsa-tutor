import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'
import type { TopicDto } from '@dsa-tutor/types'
import { useAuth } from '../context/AuthContext'
import { AlgorithmTrack } from '@dsa-tutor/types'
import { useOnboarding } from '../hooks/useOnboarding'
import DashboardNav from '../components/layout/DashboardNav'
import CurriculumSidebar from '../components/dashboard/CurriculumSidebar'
import TrackSection from '../components/dashboard/TrackSection'
import StatsBanner from '../components/dashboard/StatsBanner'
import BadgesSection from '../components/dashboard/BadgesSection'
import AILearningPathBanner from '../components/dashboard/AILearningPathBanner'
import WelcomeModal from '../components/onboarding/WelcomeModal'
import { EmptyStateIllustration } from '../components/brand'

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="h-16 w-full animate-pulse border-b border-border bg-white" />
      <div className="h-24 w-full animate-pulse border-b border-border bg-white" />
      <div className="flex">
        <div className="h-[calc(100vh-160px)] w-[260px] shrink-0 animate-pulse border-r border-border bg-white" />
        <main className="flex-1 space-y-12 p-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 w-full animate-pulse rounded-md bg-white" />
          ))}
        </main>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const { showWelcomeModal, closeWelcomeModal, startTour, completeOnboarding } = useOnboarding()

  // Re-fetch the profile every time the dashboard is landed on, so XP
  // and streak earned during a practice session (on a different page)
  // show up here without requiring a full reload.
  useEffect(() => {
    void refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => apiFetch<TopicDto[]>('/api/v1/topics'),
  })

  function handleStart(topicName: string, mode: 'DEMO' | 'PRACTICE') {
    navigate(`/algorithm/${topicName}?mode=${mode}`)
  }

  if (isLoading) return <DashboardSkeleton />

  const trackOrder: AlgorithmTrack[] = [
    AlgorithmTrack.FOUNDATIONS,
    AlgorithmTrack.SORTING,
    AlgorithmTrack.TREES,
    AlgorithmTrack.GRAPHS,
  ]

  return (
    <div className="min-h-screen bg-surface">
      <DashboardNav />
      {user && <StatsBanner user={user} topics={topics} />}
      <div className="flex">
        <CurriculumSidebar topics={topics} activeTopic={null} onTopicSelect={(name) => handleStart(name, 'DEMO')} />
        <main className="flex-1 overflow-y-auto px-8 pt-8 pb-10">
          <div className="space-y-12">
            {topics.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <EmptyStateIllustration size={120} />
                <p className="text-sm font-medium text-text-primary">No topics available yet</p>
                <p className="max-w-xs text-xs text-text-muted">
                  Start your first practice session to begin building your mastery profile.
                </p>
              </div>
            ) : (
              <>
                <AILearningPathBanner topics={topics} onStart={handleStart} />

                {trackOrder.map((track) => {
                  const trackTopics = topics.filter((t) => t.track === track)
                  if (trackTopics.length === 0) return null
                  return <TrackSection key={track} track={track} topics={trackTopics} onStart={handleStart} />
                })}
              </>
            )}

            <BadgesSection />
          </div>
        </main>
      </div>

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
    </div>
  )
}
