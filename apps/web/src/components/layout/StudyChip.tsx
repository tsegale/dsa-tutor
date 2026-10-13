import { useQuery } from '@tanstack/react-query'
import { fetchStudyStatus } from '@/api/study'
import { useTopics } from '@/hooks/useTopics'
import { studyPhase } from '@/utils/studyPhase'
import { StudyProgressDetail } from '@/components/dashboard/StudyProgressBanner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * A participant's place in the protocol, at a glance (Phase 4E): "Study ·
 * topic 2 of 3". It opens the same progress detail Home's banner shows.
 * Absent for everyone who is not an active participant, the demo account
 * included.
 */
export function StudyChip() {
  // Shares the ['study', 'status'] cache with the study gate and the banner.
  const { data: status } = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus })
  const { data: topics } = useTopics()
  const phase = studyPhase(status)
  if (!status || !phase) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Study: ${phase.label}. Show study progress`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-rule px-2.5 text-small whitespace-nowrap transition-colors duration-quick hover:border-rule-strong hover:bg-surface-sunk"
        >
          <span className="text-micro text-ink-2">Study</span>
          <span aria-hidden="true" className="text-ink-3">
            ·
          </span>
          <span className="font-medium text-ink">{phase.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent aria-label="Study progress">
        <StudyProgressDetail status={status} topics={topics ?? []} heading="p" />
      </PopoverContent>
    </Popover>
  )
}
