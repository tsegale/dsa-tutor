import { useParams } from 'react-router-dom'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { useTopics } from '@/hooks/useTopics'
import { hasFeynmanRubric } from '@/utils/feynmanRubrics'
import { feynmanAccess, type FeynmanAccess } from '@/utils/feynmanAccess'

/**
 * Feynman mode's state for the open topic: a run completed in an earlier
 * session (the topic list's practiceRunCompleted) or in this one (the store,
 * set the moment a Practice run reaches its final step) unlocks it.
 */
export function useFeynmanAccess(): FeynmanAccess {
  const { algorithmName: slug } = useParams<{ algorithmName: string }>()
  const { data: topics } = useTopics()
  const classic = useAlgorithmStore((state) => state.classicMode)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const completedHere = useAlgorithmStore((state) => slug !== undefined && state.practiceRunCompletedTopics.includes(slug))
  const completedBefore = topics?.find((topic) => topic.name === slug)?.practiceRunCompleted ?? false
  return feynmanAccess({ classic, hasRubric: hasFeynmanRubric(algorithmName), runCompleted: completedHere || completedBefore })
}
