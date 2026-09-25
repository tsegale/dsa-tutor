import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { EducatorAnalyticsDto } from '@dsa-tutor/types'
import { getAnalytics } from '../api/analytics'
import { useAuth } from '../context/AuthContext'
import AnalyticsNav from '../components/analytics/AnalyticsNav'
import SummaryStats from '../components/analytics/SummaryStats'
import MisconceptionTable from '../components/analytics/MisconceptionTable'
import MisconceptionResolutionTable from '../components/analytics/MisconceptionResolutionTable'
import StepHeatmap from '../components/analytics/StepHeatmap'
import StudentProgressTable from '../components/analytics/StudentProgressTable'
import ClassSummaryCard from '../components/analytics/ClassSummaryCard'
import StudentSummaryDrawer from '../components/analytics/StudentSummaryDrawer'
import ResearchExports from '../components/analytics/ResearchExports'

export default function EducatorDashboard() {
  const { user } = useAuth()
  const [selectedStudent, setSelectedStudent] = useState<EducatorAnalyticsDto['studentProgress'][0] | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Hook must run unconditionally on every render (rules-of-hooks) - `enabled`
  // is how we skip the actual fetch for a non-educator about to be redirected.
  const {
    data: analytics,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['educator-analytics'],
    queryFn: getAnalytics,
    refetchInterval: 30000,
    enabled: !user || user.role === 'EDUCATOR',
  })

  function handleSelectStudent(student: EducatorAnalyticsDto['studentProgress'][0]) {
    setSelectedStudent(student)
    setDrawerOpen(true)
  }

  if (user && user.role !== 'EDUCATOR') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-center dark:bg-dark-background">
        <div>
          <p className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            This area is for educators
          </p>
          <p className="mt-1 text-sm text-text-muted dark:text-dark-text-secondary">
            Your account doesn't have educator access, so there's nothing here to show you.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) return <EducatorDashboardSkeleton />

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <p className="font-medium text-error">Failed to load analytics data.</p>
          <p className="mt-1 text-sm text-text-muted">Make sure you are logged in as an educator.</p>
          <button onClick={() => refetch()} className="mt-4 text-sm text-primary underline">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <AnalyticsNav refetch={refetch} isFetching={isFetching} />
      <main className="mx-auto max-w-7xl px-8 py-8">
        {analytics && (
          <>
            <div style={{ marginBottom: 16 }}>
              <ClassSummaryCard analytics={analytics} />
            </div>
            <div className="space-y-12">
              <SummaryStats analytics={analytics} />
              <section>
                <h2 className="mb-6 text-xl font-bold text-primary">Misconception Analysis</h2>
                <MisconceptionTable breakdown={analytics.misconceptionBreakdown} />
              </section>
              <section>
                <h2 className="mb-6 text-xl font-bold text-primary">Misconception Resolution</h2>
                <MisconceptionResolutionTable />
              </section>
              <section>
                <StepHeatmap heatmap={analytics.stepDifficultyHeatmap} totalStudents={analytics.totalStudents} />
              </section>
              <section>
                <h2 className="mb-6 text-xl font-bold text-primary">Student Progress</h2>
                <StudentProgressTable students={analytics.studentProgress} onSelectStudent={handleSelectStudent} />
              </section>
              <section>
                <ResearchExports />
              </section>
            </div>
          </>
        )}
      </main>
      <StudentSummaryDrawer student={selectedStudent} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

function EducatorDashboardSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-surface">
      <div className="h-16 border-b bg-card" />
      <div className="mx-auto max-w-7xl space-y-12 px-8 py-8">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-md border bg-card" />
          ))}
        </div>
        <div className="h-64 rounded-md border bg-card" />
        <div className="h-48 rounded-md border bg-card" />
        <div className="h-80 rounded-md border bg-card" />
      </div>
    </div>
  )
}
