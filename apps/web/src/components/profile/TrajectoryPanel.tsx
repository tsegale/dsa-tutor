import { useId, useState } from 'react'
import type { LearnerAnalyticsDto } from '@dsa-tutor/types'
import { MIN_CHART_POINTS } from '@/utils/trajectory'
import { Select } from '@/components/ui/Input'
import { TrajectoryChart } from './TrajectoryChart'

/**
 * One session's trajectory at a time (Phase 6C). Mastery is scored within a
 * session, so a session is the unit in which fading can be seen. It opens on
 * the most recent session with enough answers to chart.
 */
export function TrajectoryPanel({ sessions }: { sessions: LearnerAnalyticsDto['trajectory'] }) {
  const selectId = useId()
  const initial = sessions.find((s) => s.points.length >= MIN_CHART_POINTS) ?? sessions[0]
  const [selectedId, setSelectedId] = useState(initial?.sessionId ?? null)
  const selected = sessions.find((s) => s.sessionId === selectedId) ?? initial

  if (!selected) return <TrajectoryChart points={[]} />

  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return (
    <div className="flex flex-col gap-3">
      {sessions.length > 1 && (
        <label htmlFor={selectId} className="flex flex-wrap items-center gap-2 text-small text-ink-2">
          Session
          <Select id={selectId} value={selected.sessionId} onChange={(event) => setSelectedId(event.target.value)} className="w-auto min-w-64">
            {sessions.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.topic}, {dateOf(s.startTime)}, {s.points.length} answers
              </option>
            ))}
          </Select>
        </label>
      )}
      <TrajectoryChart points={selected.points} />
    </div>
  )
}
