import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { AlgorithmTrack, LearnerAnalyticsDto } from '@dsa-tutor/types'
import { fetchLearnerAnalytics } from '@/api/profile'
import { MODULES, moduleForTrack } from '@/config/curriculum'
import { SUPPORT_LEVEL } from '@/config/supportLevels'
import { useStudyScope } from '@/hooks/useStudyScope'
import { supportFromIndex } from '@/utils/supportBand'
import { formatDuration, misconceptionName, sessionModeLabel } from '@/utils/learnerFormat'
import { SupportMeter } from '@/components/ui/SupportMeter'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { TrajectoryPanel } from './TrajectoryPanel'
import { useTopics } from '@/hooks/useTopics'
import { CRITERION_LABEL, masteryBreakdown } from '@/utils/mastery'

// The profile's longitudinal analytics (Phase 6C): one request, every figure
// computed by the server (GET /api/v1/profile/analytics). Numbers are mono
// with tabular figures; labels are sans. A brand new account sees zeros and
// invitations to start, never a blank panel.

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = `analytics-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <section aria-labelledby={id} className="rounded-md border border-rule bg-surface p-card">
      <h3 id={id} className="text-h3 text-ink">
        {title}
      </h3>
      {description && <p className="mt-1 text-small text-ink-2">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Figure({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-rule bg-surface p-card">
      <dt className="text-micro text-ink-2">{label}</dt>
      <dd className="text-mono-lg text-ink tabular-nums">{children}</dd>
      {note && <p className="text-micro text-ink-2">{note}</p>}
    </div>
  )
}

function SummaryRow({ summary }: { summary: LearnerAnalyticsDto['summary'] }) {
  const support = supportFromIndex(summary.masteryIndex, summary.topicsStarted > 0)
  const { label, segments } = SUPPORT_LEVEL[support.level]
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Figure label="Cumulative mastery index" note="Mean mastery across your topics">
        {summary.masteryIndex}%
      </Figure>
      <Figure label="Topics started · completed · mastered" note={`Of ${summary.topicsTotal}; mastered means every mastery criterion met`}>
        {summary.topicsStarted} · {summary.topicsCompleted} · {summary.topicsMastered}
      </Figure>
      <Figure label="Practice time" note="Time with the workspace open and in view">
        {formatDuration(summary.practiceSeconds)}
      </Figure>
      <Figure
        label="Prediction accuracy"
        note={summary.predictions ? `${summary.correctPredictions} of ${summary.predictions} predictions correct` : 'No predictions answered yet'}
      >
        {summary.accuracy === null ? '-' : `${summary.accuracy}%`}
      </Figure>
      <Figure label="Hints used per prediction" note={summary.predictions ? `${summary.hintsUsed} hints over ${summary.predictions} predictions` : 'No predictions answered yet'}>
        {summary.hintsPerPrediction === null ? '-' : summary.hintsPerPrediction.toFixed(2)}
      </Figure>
      <Figure label="Current support level" note="Your overall band, as the header shows it">
        <span className="flex items-center gap-2.5 font-sans">
          <SupportMeter filled={segments} className="[&>span]:h-4 [&>span]:w-1.5" />
          <span className="text-body font-medium">{label}</span>
        </span>
      </Figure>
    </dl>
  )
}

function ModuleBars({ modules }: { modules: LearnerAnalyticsDto['modules'] }) {
  const { restricted } = useStudyScope()
  const byNumber = new Map(modules.map((row) => [moduleForTrack(row.track as AlgorithmTrack).number, row]))
  const rows = MODULES.filter((module) => byNumber.has(module.number))
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((module) => {
        const row = byNumber.get(module.number)!
        const content = (
          <>
            <span className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-small text-ink">
                <span className="mr-1.5 text-mono-sm text-ink-2">Module {module.number}</span>
                {module.title}
              </span>
              <span className="shrink-0 text-mono-sm text-ink-2 tabular-nums">
                {row.meanMastery}% · {row.complete}/{row.topics}
              </span>
            </span>
            <span aria-hidden="true" className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-surface-sunk">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${row.meanMastery}%` }} />
            </span>
          </>
        )
        const label = `Module ${module.number}: ${module.title}, ${row.meanMastery}% mean mastery, ${row.complete} of ${row.topics} complete`
        return (
          <li key={module.id}>
            {/* A participant has no module pages, so their bars are not links. */}
            {restricted ? (
              <div aria-label={label} className="block">
                {content}
              </div>
            ) : (
              <Link to={`/module/${module.number}`} aria-label={label} className="block rounded-sm py-0.5 hover:[&_span.bg-brand]:bg-brand-hover">
                {content}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Misconceptions({ rows }: { rows: LearnerAnalyticsDto['misconceptions'] }) {
  if (!rows.length) return <p className="text-small text-ink-2">No misconceptions detected yet.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-small">
        <thead>
          <tr className="text-left text-micro text-ink-2">
            <th className="py-1.5 font-medium">Misconception</th>
            <th className="py-1.5 text-right font-medium">Detected</th>
            <th className="py-1.5 text-right font-medium">Resolved</th>
            <th className="py-1.5 text-right font-medium">Still open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-t border-rule">
              <td className="py-2 pr-4 text-ink">{misconceptionName(row.category)}</td>
              <td className="py-2 text-right text-mono-sm text-ink tabular-nums">{row.detected}</td>
              <td className="py-2 text-right text-mono-sm text-ink tabular-nums">{row.resolved}</td>
              <td className="py-2 text-right text-mono-sm text-ink tabular-nums">{row.open}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecentSessions({ rows }: { rows: LearnerAnalyticsDto['recentSessions'] }) {
  if (!rows.length) {
    return (
      <p className="text-small text-ink-2">
        No sessions yet. Open any topic from{' '}
        <Link to="/" className="font-medium text-accent-foreground underline-offset-2 hover:underline">
          Home
        </Link>{' '}
        and it will be listed here.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-small">
        <thead>
          <tr className="text-left text-micro text-ink-2">
            <th className="py-1.5 font-medium">Topic</th>
            <th className="py-1.5 font-medium">Mode</th>
            <th className="py-1.5 font-medium">Date</th>
            <th className="py-1.5 text-right font-medium">Duration</th>
            <th className="py-1.5 text-right font-medium">Predictions</th>
            <th className="py-1.5 text-right font-medium">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-rule">
              <td className="py-2 pr-4 text-ink">{row.topic}</td>
              <td className="py-2 pr-4 text-ink-2">{sessionModeLabel(row.mode)}</td>
              <td className="py-2 pr-4 text-mono-sm text-ink-2 tabular-nums">
                {new Date(row.startTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="py-2 text-right text-mono-sm text-ink tabular-nums">{row.activeSeconds === null ? '-' : formatDuration(row.activeSeconds)}</td>
              <td className="py-2 text-right text-mono-sm text-ink tabular-nums">{row.predictions}</td>
              <td className="py-2 text-right text-mono-sm text-ink tabular-nums">{row.predictions ? `${Math.round((row.correct / row.predictions) * 100)}%` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Phase 7D: across every started topic, how often each mastery criterion is
// met, so the learner sees which one they most often miss. Read from the
// topic list the rest of the app already holds: no extra request.
function MasteryCriteria() {
  const { data: topics } = useTopics()
  if (!topics) return <Skeleton className="h-32 w-full rounded-md" />
  const breakdown = masteryBreakdown(topics)
  if (breakdown.started === 0) {
    return <p className="text-small text-ink-2">Start a topic in Practice mode and its mastery criteria appear here.</p>
  }
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Figure label="Topics mastered" note={`Of ${breakdown.started} started`}>
          {breakdown.mastered}
        </Figure>
        <Figure label="Topics proficient" note="Accuracy and breadth met">
          {breakdown.proficient}
        </Figure>
        <Figure label="Most often missed" note="The criterion unmet on the largest share of your topics">
          <span className="font-sans text-body font-medium">{breakdown.mostMissed ? CRITERION_LABEL[breakdown.mostMissed] : 'None'}</span>
        </Figure>
      </dl>
      <ul className="flex flex-col gap-2.5">
        {breakdown.criteria.map((row) => (
          <li key={row.id} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3">
            <span className="text-small text-ink">{row.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-rule" aria-hidden="true">
              <span className="block h-full rounded-full bg-state-sorted" style={{ width: `${row.total ? (row.met / row.total) * 100 : 0}%` }} />
            </span>
            <span className="text-mono-sm text-ink-2 tabular-nums">
              {row.total ? `${row.met} of ${row.total}` : 'not offered'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AnalyticsSection() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({ queryKey: ['profile', 'analytics'], queryFn: fetchLearnerAnalytics, staleTime: 30 * 1000 })

  return (
    <section aria-labelledby="profile-analytics" className="flex flex-col gap-4">
      <h2 id="profile-analytics" className="text-h2 text-ink">
        Your learning so far
      </h2>
      {isLoading ? (
        <div aria-busy="true" aria-label="Loading your analytics" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      ) : isError || !data ? (
        <ErrorState
          title="Your analytics did not load."
          description="Nothing is shown rather than figures that might be wrong. Check your connection, then try again."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : (
        <>
          <SummaryRow summary={data.summary} />
          <Card title="Scaffolding trajectory" description="Your mastery score after each answer in a session, with the support you had at the time shaded behind it. Shading lightens as support fades.">
            <TrajectoryPanel sessions={data.trajectory} />
          </Card>
          <Card title="Mastery by module" description="Mean mastery and topics complete in each module.">
            <ModuleBars modules={data.modules} />
          </Card>
          <Card title="Mastery criteria" description="How often each criterion is met across the topics you have started. Hints per step is shown on each topic, for reference, and is never a criterion.">
            <MasteryCriteria />
          </Card>
          <Card title="Misconceptions" description="Patterns the tutor noticed in your answers, and whether later answers showed them resolved.">
            <Misconceptions rows={data.misconceptions} />
          </Card>
          <Card title="Recent sessions" description="Your last ten sessions.">
            <RecentSessions rows={data.recentSessions} />
          </Card>
        </>
      )}
    </section>
  )
}
