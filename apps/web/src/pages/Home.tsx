import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useOnboarding } from '@/hooks/useOnboarding'
import { useLearningPlan } from '@/hooks/useLearningPlan'
import { nextStep } from '@/utils/nextStep'
import { browserStorage, readLastPosition } from '@/utils/lastPosition'
import { useStudyScope } from '@/hooks/useStudyScope'
import { MODULES } from '@/config/curriculum'
import type { LearningPlan, SyllabusModule } from '@/utils/syllabus'
import { AppShell } from '@/components/layout/AppShell'
import { NextStepBanner } from '@/components/home/NextStepBanner'
import { ModuleCard } from '@/components/home/ModuleCard'
import { ProgressStrip } from '@/components/home/ProgressStrip'
import { TopicRow } from '@/components/track/TopicRow'
import StudyProgressBanner from '@/components/dashboard/StudyProgressBanner'
import WelcomeModal from '@/components/onboarding/WelcomeModal'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

// Home answers one question first: what do I do now. One next-step banner
// (Phase 5A), then the stats strip at quiet weight, then the modules.

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your curriculum" className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 w-full rounded-md" />
      <Skeleton className="h-16 w-full rounded-md" />
      <Skeleton className="mt-4 h-7 w-24" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => (
          <SkeletonCard key={module.id} />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { user, refreshUser } = useAuth()
  const { showWelcomeModal, closeWelcomeModal, startTour, completeOnboarding } = useOnboarding()
  const { restricted } = useStudyScope()
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

  // One plan for "what next": the banner, the module summaries and the rail
  // all read it, so they cannot name different topics.
  const { topicsQuery, sessionQuery, syllabus, plan } = useLearningPlan()
  const topics = topicsQuery.data
  const latestSession = sessionQuery.data ?? null
  // The banner words the plan's answer, with where this device last stopped.
  const step = useMemo(() => (plan ? nextStep(plan, readLastPosition(browserStorage(), user?.id)) : null), [plan, user?.id])

  return (
    <AppShell>
      {topicsQuery.isLoading || sessionQuery.isLoading ? (
        <HomeSkeleton />
      ) : !topics ? (
        // No curriculum at all, rather than a partial one presented as
        // complete: say what failed and offer the retry.
        <div className="flex flex-col gap-6">
          <h1 className="text-h1 text-ink">Home</h1>
          <ErrorState
            title="Your curriculum did not load."
            description="Nothing is shown rather than an incomplete list. Check your connection, then try again."
            onRetry={() => {
              void topicsQuery.refetch()
              void sessionQuery.refetch()
              // The profile may have failed with the same outage.
              if (!user) void refreshUser()
            }}
            retrying={topicsQuery.isFetching}
          />
        </div>
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
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>

          <StudyProgressBanner topics={topics} />
          {step && <NextStepBanner step={step} sessionUnavailable={sessionQuery.isError} />}
          {user && <ProgressStrip user={user} topics={topics} />}

          {plan && (restricted ? <StudyTopics syllabus={syllabus} plan={plan} /> : <Modules syllabus={syllabus} plan={plan} />)}
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

function Modules({ syllabus, plan }: { syllabus: SyllabusModule[]; plan: LearningPlan }) {
  // A module with nothing visible to this user is left out, never an empty card.
  return (
    <section aria-labelledby="modules-heading" className="mt-4 flex flex-col gap-4">
      <h2 id="modules-heading" className="text-h2 text-ink">
        Modules
      </h2>
      <ul id="curriculum-tracks" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {syllabus.map((entry) => (
          <li key={entry.module.id}>
            <ModuleCard entry={entry} next={plan.nextByModule.get(entry.module.id) ?? null} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * An active study participant sees exactly their study topics, one per
 * module. Three one-topic module cards would look broken, so they are listed
 * directly, as the rows a module page uses, keeping their real numbers.
 */
function StudyTopics({ syllabus, plan }: { syllabus: SyllabusModule[]; plan: LearningPlan }) {
  const rows = syllabus.flatMap((entry) => entry.topics)
  const next = plan.continue?.entry ?? plan.recommended
  return (
    <section aria-labelledby="study-topics-heading" className="mt-4 flex flex-col gap-4">
      <div>
        <h2 id="study-topics-heading" className="text-h2 text-ink">
          Your study topics
        </h2>
        <p className="mt-1 text-small text-ink-2">These are the topics in your study. Each one opens the same way as in the full curriculum.</p>
      </div>
      <ol id="curriculum-tracks" className="divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
        {rows.map((row) => (
          <TopicRow key={row.topic.id} entry={row} isNext={row.topic.id === next?.topic.id} />
        ))}
      </ol>
    </section>
  )
}
