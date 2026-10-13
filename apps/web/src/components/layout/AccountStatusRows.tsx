import { useQuery } from '@tanstack/react-query'
import { fetchStudyStatus } from '@/api/study'
import { useAuth } from '@/context/AuthContext'
import { SUPPORT_LEVEL } from '@/config/supportLevels'
import { studyPhase } from '@/utils/studyPhase'
import { useHeaderSupport } from '@/hooks/useHeaderSupport'

/**
 * Below 1024px the status chips leave the global bar (it would pass seven
 * elements) and appear here, at the top of the account menu, as rows
 * (Phase 4G). The same rules decide whether each shows: no support level
 * for an educator or in Classic, no study row for a non-participant.
 */
export function AccountStatusRows({ inWorkspace }: { inWorkspace: boolean }) {
  const { user } = useAuth()
  const support = useHeaderSupport(inWorkspace)
  const { data: status } = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus })
  const phase = studyPhase(status)

  const rows = [
    ...(support && user?.role !== 'EDUCATOR' ? [{ label: 'Support level', value: SUPPORT_LEVEL[support.assessment.level].label }] : []),
    ...(phase ? [{ label: 'Study', value: phase.label.charAt(0).toUpperCase() + phase.label.slice(1) }] : []),
  ]
  if (!rows.length) return null

  return (
    <dl className="flex flex-col gap-1 px-2 py-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-6">
          <dt className="text-small text-ink-2">{row.label}</dt>
          <dd className="text-small font-medium text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
