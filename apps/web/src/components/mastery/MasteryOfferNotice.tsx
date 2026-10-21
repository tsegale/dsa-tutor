import { useParams } from 'react-router-dom'
import { AlgorithmMode } from '@dsa-tutor/types'
import { Button } from '@/components/ui/button'
import { useTopics } from '@/hooks/useTopics'
import { useStudyScope } from '@/hooks/useStudyScope'
import { useFeynmanAccess } from '@/hooks/useFeynmanAccess'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { nextMasteryOffer, masteryPracticeInput } from '@/utils/mastery'
import { hasChallengeGenerator } from '@/utils/challengeGenerators'
import { CHALLENGES_PER_TOPIC } from '@/config/pacing'
import { CONTEXTUAL_CONTROL_SLUGS } from '@/components/layout/AlgorithmControls'
import { START_CHALLENGE_EVENT } from '@/components/challenge/ChallengeGenerator'
import { OPEN_FEYNMAN_MODAL_EVENT } from '@/components/feynman/FeynmanModeButton'
import { requestInput } from '@/components/layout/applyInput'

/**
 * The one thing worth doing next on this topic, offered when a run ends.
 *
 * This used to be a permanent panel in the sidebar listing all four
 * mastery criteria with their values. That is assessment, and reading it
 * mid-run told a student nothing they could act on; the single ACTION it
 * carried - "you missed three swap decisions, re-run asking only those" -
 * is the useful half, and it is only useful at the end of a run, which is
 * where it is now.
 *
 * One offer, never a list: nextMasteryOffer picks the first unmet
 * criterion in rubric order. Nothing renders when there is no action to
 * take, rather than explaining why an action is unavailable - at the end
 * of a run that is noise.
 *
 * An active study participant is never offered anything here. Their
 * mastery is read-only and nothing on it may change what the study asks
 * of them (Phase 7F).
 */
export function MasteryOfferNotice({ onOpenFeynman }: { onOpenFeynman: () => void }) {
  const { algorithmName: slug } = useParams<{ algorithmName: string }>()
  const { data: topics } = useTopics()
  const { restricted: activeParticipant } = useStudyScope()
  const classicMode = useAlgorithmStore((state) => state.classicMode)
  const challengesStarted = useAlgorithmStore((state) => state.challengesStarted)
  const feynman = useFeynmanAccess()

  const mastery = topics?.find((topic) => topic.name === slug)?.mastery ?? null
  const offer = mastery && !activeParticipant && !classicMode ? nextMasteryOffer(mastery) : null
  if (!offer || !mastery || !slug) return null

  /** Every offer is something to practise, so each one lands in Practice. */
  function practise(run: () => void) {
    const store = useAlgorithmStore.getState()
    if (store.mode !== AlgorithmMode.PRACTICE) store.setMode(AlgorithmMode.PRACTICE)
    run()
  }

  const act = (() => {
    switch (offer.kind) {
      case 'FOCUSED_RUN':
        return () => practise(() => useAlgorithmStore.getState().startFocusedRun(mastery.missedJunctionTypes))
      case 'PRACTISE_AGAIN':
        return () => practise(() => useAlgorithmStore.getState().resetAlgorithm())
      case 'NEW_INPUT': {
        // A topic with its own controls picks its input there; there is no
        // array for this to generate.
        if (CONTEXTUAL_CONTROL_SLUGS.has(slug)) return null
        return () =>
          practise(() => {
            const breadth = mastery.criteria.find((criterion) => criterion.id === 'BREADTH')?.value ?? 0
            const length = getAlgorithmRegistryEntry(slug)?.defaultInput.length ?? 6
            requestInput(masteryPracticeInput(slug, length, breadth))
          })
      }
      case 'FEYNMAN':
        return feynman.state === 'AVAILABLE' ? onOpenFeynman : null
      case 'CHALLENGE':
        if (!hasChallengeGenerator(slug) || challengesStarted >= CHALLENGES_PER_TOPIC) return null
        return () => practise(() => window.dispatchEvent(new CustomEvent(START_CHALLENGE_EVENT)))
    }
  })()

  if (!act) return null

  return (
    <section
      aria-label="What to do next on this topic"
      className="relative z-20 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-t border-rule bg-card px-[14px] py-2.5"
    >
      {/* The detail only: the label is on the button, and printing it in
          both places made the line read its own caption back. */}
      <p className="min-w-0 flex-1 text-small text-ink-2">{offer.detail}</p>
      <Button variant="secondary" size="sm" onClick={act} className="shrink-0">
        {offer.label}
      </Button>
    </section>
  )
}

/** Re-exported so the page can avoid offering Feynman twice at once. */
export { OPEN_FEYNMAN_MODAL_EVENT }
