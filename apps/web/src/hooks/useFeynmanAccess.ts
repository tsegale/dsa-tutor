import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { hasFeynmanRubric } from '@/utils/feynmanRubrics'
import { feynmanAccess, type FeynmanAccess } from '@/utils/feynmanAccess'

/**
 * Feynman mode's state for the open topic. It no longer depends on whether a
 * Practice run has been completed - nothing gates the mode but the topic
 * having a reviewed rubric, and Classic, where it is not offered at all.
 */
export function useFeynmanAccess(): FeynmanAccess {
  const classic = useAlgorithmStore((state) => state.classicMode)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  return feynmanAccess({ classic, hasRubric: hasFeynmanRubric(algorithmName) })
}
