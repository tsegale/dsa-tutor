import { useQuery } from '@tanstack/react-query'
import type { TopicDto } from '@dsa-tutor/types'
import { apiFetch } from '@/api/client'

// The curriculum, shared by Home, the track pages and the command palette
// under the same ['topics'] key AlgorithmPage uses, so it is fetched once.
// For a study participant the API already returns only their study topics.
//
// The topic list only changes on a reseed, but each topic carries this
// user's masteryPercent, which a session changes. The old 10 minute
// staleTime meant coming back from a session showed the mastery from before
// it (AlgorithmPage fetched at session start, Home reused that). 30 seconds
// still spares a refetch when moving between Home, tracks and the palette.
export function useTopics() {
  return useQuery({
    queryKey: ['topics'],
    queryFn: () => apiFetch<TopicDto[]>('/api/v1/topics'),
    staleTime: 30 * 1000,
    // One retry covers a blip; the default three, with backoff, held the
    // skeleton for about seven seconds before the error state could show.
    retry: 1,
  })
}
