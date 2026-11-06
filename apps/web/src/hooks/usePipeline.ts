import { useParams } from 'react-router-dom'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { useTopics } from '@/hooks/useTopics'
import { useFeynmanAccess } from '@/hooks/useFeynmanAccess'
import { pipelineFor, type PipelineStage } from '@/config/pipeline'

/**
 * The five stages for the open topic.
 *
 * Gathers the facts config/pipeline.ts needs and leaves every decision
 * to it, so the rules live in one tested place rather than in a component.
 * Feynman's own availability rules stay with useFeynmanAccess, which
 * already owns them.
 */
export function usePipeline(): PipelineStage[] {
  const { algorithmName: slug } = useParams<{ algorithmName: string }>()
  const { data: topics } = useTopics()
  const classic = useAlgorithmStore((state) => state.classicMode)
  const feynman = useFeynmanAccess()

  const topic = topics?.find((entry) => entry.name === slug)
  const completedHere = useAlgorithmStore(
    (state) => slug !== undefined && state.practiceRunCompletedTopics.includes(slug),
  )
  const handsOnCompleted = useAlgorithmStore(
    (state) => slug !== undefined && state.handsOnCompletedTopics.includes(slug),
  )
  const codeCompleted = useAlgorithmStore(
    (state) => slug !== undefined && state.codeCompletedTopics.includes(slug),
  )
  const feynmanCompletedHere = useAlgorithmStore(
    (state) => slug !== undefined && state.feynmanCompletedTopics.includes(slug),
  )
  const feynmanCriterionMet = topic?.mastery?.criteria?.some((c) => c.id === 'FEYNMAN' && c.met) ?? false

  return pipelineFor({
    slug: slug ?? '',
    runCompletedHere: completedHere,
    practiceCompleted: completedHere || (topic?.practiceRunCompleted ?? false),
    handsOnCompleted,
    feynmanAvailable: feynman.state === 'AVAILABLE',
    feynmanCompleted: feynmanCompletedHere || feynmanCriterionMet,
    feynmanReason: feynman.reason ?? null,
    classic,
    codeCompleted,
  })
}
