import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchLatestIncompleteSession } from '@/api/sessions'
import { useTopics } from '@/hooks/useTopics'
import { buildSyllabus, planNext, type LearningPlan, type SyllabusModule } from '@/utils/syllabus'

/**
 * The syllabus and the one "what next" plan, shared by Home (Continue card,
 * AI recommendation, module cards), the curriculum rail and module pages.
 * Both queries are cached under shared keys, so every caller reads the same
 * answer from one fetch each.
 */
export function useLearningPlan() {
  const topicsQuery = useTopics()
  const sessionQuery = useQuery({
    queryKey: ['sessions', 'latest-incomplete'],
    queryFn: fetchLatestIncompleteSession,
    staleTime: 30 * 1000,
    retry: 1,
  })

  const topics = topicsQuery.data
  const latest = sessionQuery.data ?? null
  const syllabus: SyllabusModule[] = useMemo(() => (topics ? buildSyllabus(topics) : []), [topics])
  const plan: LearningPlan | null = useMemo(() => (topics ? planNext(syllabus, latest) : null), [topics, syllabus, latest])

  return { topicsQuery, sessionQuery, syllabus, plan }
}
