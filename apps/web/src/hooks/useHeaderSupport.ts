import { pinnedLevel } from '@/config/supportLevels'
import { selectScaffolding, usePreferencesStore } from '@/store/usePreferencesStore'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { conditionFeatures } from '@/utils/studyCondition'
import { useTopics } from '@/hooks/useTopics'
import { overallSupport, type SupportAssessment } from '@/utils/supportBand'

// The support state behind the header's scaffolding chip and, below 1024px,
// the account menu's support row (Phases 4C and 4G).

/** The live session level, as the workspace's fading logic last set it. */
function useSessionSupport(): SupportAssessment {
  const level = useAlgorithmStore((state) => state.scaffoldingLevel)
  const reasoning = useAlgorithmStore((state) => state.scaffoldingReasoning)
  const score = useAlgorithmStore((state) => state.scaffoldingScore)
  return { level, reasoning, score }
}

function useOverallSupport(): SupportAssessment | null {
  const { data: topics } = useTopics()
  return topics ? overallSupport(topics) : null
}

const SESSION_BASIS = 'This session, from your answers so far'
const OVERALL_BASIS = 'Your overall band, from mastery across your topics'

/**
 * The support state the header shows, or null where it must not show: in
 * Classic, the study's control condition, whose participants must not see a
 * scaffolding indicator, and while the overall band's topics load. In the
 * workspace it is the live session level; elsewhere the overall band.
 */
export function useHeaderSupport(inWorkspace: boolean): { assessment: SupportAssessment; basis: string; pinned: boolean } | null {
  // The study condition's feature list decides, as it does for every other
  // tutor surface: Classic has no scaffolding indicator.
  const features = conditionFeatures(useAlgorithmStore((state) => state.classicMode))
  const session = useSessionSupport()
  const overall = useOverallSupport()
  // In a session, a level pinned on the profile (Phase 6D) does not step down.
  const pinned = pinnedLevel(usePreferencesStore(selectScaffolding)) !== null
  if (inWorkspace) return features.scaffoldingPill ? { assessment: session, basis: SESSION_BASIS, pinned } : null
  return overall ? { assessment: overall, basis: OVERALL_BASIS, pinned: false } : null
}
