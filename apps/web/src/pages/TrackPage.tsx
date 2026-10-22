import { Link, Navigate, useParams } from 'react-router-dom'
import { getTrackBySlug } from '@/data/tracks'
import { moduleByNumber, moduleForTrack, moduleLabel, type Module } from '@/config/curriculum'
import { useLearningPlan } from '@/hooks/useLearningPlan'
import { useStudyScope } from '@/hooks/useStudyScope'
import type { ModuleStatus } from '@/utils/moduleStatus'
import { AppShell, Breadcrumb } from '@/components/layout/AppShell'
import { ContextBar } from '@/components/layout/ContextBar'
import { ModuleSection } from '@/components/home/ModuleSection'
import { TopicGrid } from '@/components/home/TopicGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/button'

// A module's page: Home's module section and topic cards for this one module
// (Phase 5D), numbered and marked exactly as the curriculum rail shows them.
// Reached as /module/:number (the linkable form) or /track/:track (kept
// working).

function ModuleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading this module">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-full max-w-prose" />
        </div>
        <Skeleton className="size-[72px] rounded-full" />
      </div>
      <div className="divide-y divide-rule overflow-hidden rounded-md border border-rule bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-card py-row">
            <Skeleton className="size-3.5 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** The module page's context bar: its breadcrumb, then its progress. */
function ModuleContext({ module, status }: { module: Module; status?: ModuleStatus }) {
  return (
    <ContextBar
      label="Module"
      start={<Breadcrumb crumbs={[{ label: 'Home', to: '/' }, { label: moduleLabel(module) }]} />}
      end={
        status && (
          <div className="flex shrink-0 items-center gap-3">
            <Progress
              value={status.total ? (status.complete / status.total) * 100 : 0}
              tone={status.state === 'complete' ? 'success' : 'brand'}
              className="h-1 w-24"
              aria-label={`${moduleLabel(module)} completion`}
            />
            <span className="text-mono-sm whitespace-nowrap text-ink-2">
              {status.complete} of {status.total} complete
            </span>
          </div>
        )
      }
    />
  )
}

function useModuleFromRoute(): Module | null {
  const { track: slug, number } = useParams<{ track?: string; number?: string }>()
  if (number !== undefined) return moduleByNumber(number)
  const track = getTrackBySlug(slug)
  return track ? moduleForTrack(track.id) : null
}

export default function TrackPage() {
  const module = useModuleFromRoute()
  const { restricted } = useStudyScope()
  const { topicsQuery, syllabus, plan } = useLearningPlan()
  const { data: topics, isLoading, isFetching, refetch } = topicsQuery

  // A study participant has no module pages: their three topics are on Home.
  if (restricted) return <Navigate to="/" replace />

  if (!module) {
    return (
      <AppShell>
        <h1 className="sr-only">Module not found</h1>
        <EmptyState
          title="There is no module at this address."
          action={
            <Button asChild size="sm">
              <Link to="/">Go to Home</Link>
            </Button>
          }
        />
      </AppShell>
    )
  }

  if (isLoading) {
    return (
      <AppShell context={<ModuleContext module={module} />}>
        <ModuleSkeleton />
      </AppShell>
    )
  }

  if (!topics) {
    return (
      <AppShell context={<ModuleContext module={module} />}>
        <h1 className="mb-6 text-h1 text-ink">{moduleLabel(module)}</h1>
        <ErrorState
          title={`The ${module.title} topics did not load.`}
          description="Nothing is listed rather than an incomplete module. Check your connection, then try again."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </AppShell>
    )
  }

  const entry = syllabus.find((candidate) => candidate.module.id === module.id)
  // The shared plan's next topic for this module, as Home's section names it.
  const next = plan?.nextByModule.get(module.id) ?? null

  // The same section and cards as Home (Phase 5D), for this module only:
  // always open, every topic shown, its heading the page's h1.
  return (
    <AppShell context={<ModuleContext module={module} status={entry?.status} />}>
      {!entry ? (
        <>
          <h1 className="mb-6 text-h1 text-ink">{moduleLabel(module)}</h1>
          <EmptyState
            title={`There are no ${module.title} topics to open yet.`}
            description="Pick another module from the curriculum, or search for a topic by name."
            action={
              <Button asChild size="sm">
                <Link to="/">Back to Home</Link>
              </Button>
            }
          />
        </>
      ) : (
        <ModuleSection
          entry={entry}
          expanded
          headingLevel="h1"
          showAllTopics
          renderTopics={(topics) => (
            <TopicGrid topics={topics} next={next} />
          )}
        />
      )}
    </AppShell>
  )
}
