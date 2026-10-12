import { useQuery } from '@tanstack/react-query'
import { fetchStudyStatus } from '@/api/study'

/**
 * Whether this user sees the restricted study curriculum: the server returns
 * only the three study topics to an active participant (topic.service.ts,
 * isActiveParticipant: participant code, consent given, not withdrawn).
 * Those three sit in three different tracks, so a restricted user gets no
 * track navigation at all, rather than three one-topic tracks.
 *
 * Shares the ['study', 'status'] cache with App.tsx's StudyGate.
 */
export function useStudyScope(): { restricted: boolean } {
  const { data: status } = useQuery({ queryKey: ['study', 'status'], queryFn: fetchStudyStatus })
  return { restricted: Boolean(status?.isParticipant && !status.consentRequired && !status.withdrawn) }
}
