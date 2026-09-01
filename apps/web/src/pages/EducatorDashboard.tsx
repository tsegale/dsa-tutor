import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import type { EducatorAnalyticsDto } from '@dsa-tutor/types'
import { getAnalytics } from '../api/analytics'
import { useAuth } from '../context/AuthContext'
import AnalyticsNav from '../components/analytics/AnalyticsNav'
import SummaryStats from '../components/analytics/SummaryStats'
import MisconceptionTable from '../components/analytics/MisconceptionTable'
import StepHeatmap from '../components/analytics/StepHeatmap'
import StudentProgressTable from '../components/analytics/StudentProgressTable'
import ClassSummaryCard from '../components/analytics/ClassSummaryCard'
import StudentSummaryDrawer from '../components/analytics/StudentSummaryDrawer'

export default function EducatorDashboard() {
  const { user } = useAuth()
  const [selectedStudent, setSelectedStudent] = useState<EducatorAnalyticsDto['studentProgress'][0] | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (user && user.role !== 'EDUCATOR') {
    return <Navigate to="/" replace />
  }

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
  })

  function handleSelectStudent(student: EducatorAnalyticsDto['studentProgress'][0]) {
    setSelectedStudent(student)
    setDrawerOpen(true)
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
      <main className="mx-auto max-w-7xl space-y-12 px-8 py-8">
        {analytics && (
          <>
            <ClassSummaryCard analytics={analytics} />
            <SummaryStats analytics={analytics} />
            <section>
              <h2 className="mb-6 text-xl font-bold text-primary">Misconception Analysis</h2>
              <MisconceptionTable breakdown={analytics.misconceptionBreakdown} />
            </section>
            <section>
              <StepHeatmap heatmap={analytics.stepDifficultyHeatmap} totalStudents={analytics.totalStudents} />
            </section>
            <section>
              <h2 className="mb-6 text-xl font-bold text-primary">Student Progress</h2>
              <StudentProgressTable students={analytics.studentProgress} onSelectStudent={handleSelectStudent} />
            </section>
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
      <div className="h-16 border-b bg-white" />
      <div className="mx-auto max-w-7xl space-y-12 px-8 py-8">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-md border bg-white" />
          ))}
        </div>
        <div className="h-64 rounded-md border bg-white" />
        <div className="h-48 rounded-md border bg-white" />
        <div className="h-80 rounded-md border bg-white" />
      </div>
    </div>
  )
}
