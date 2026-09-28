import { useState } from 'react'
import { CHALLENGES_PER_TOPIC, COMPLEXITY_JUNCTION_ENABLED } from '@/config/pacing'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useParams } from 'react-router-dom'
import { frameChallenge } from '@/api/challenges'
import { apiFetch } from '@/api/client'
import { getAlgorithmRegistryEntry } from '@/engine/registry'
import { topMisconceptionOf } from '@/utils/junctionTargeting'
import {
  buildChallengeRun,
  challengeSeed,
  generateChallenge,
  hasChallengeGenerator,
  type ChallengeCase,
} from '@/utils/challengeGenerators'

interface ChallengeGeneratorProps {
  difficulty: string
}

const CHALLENGE_HINT_VISIBLE_MS = 5000

function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="animate-spin">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
    </svg>
  )
}

interface Framing {
  hint: string
  aiGenerated: boolean
  failureReason: string | null
  promptVersion: string | null
  aiModel: string | null
}

/** The model's framing sentence, or the case's authored one if that is unavailable. */
async function framingFor(challenge: ChallengeCase, algorithmName: string): Promise<Framing> {
  try {
    const response = await frameChallenge({
      algorithmName,
      caseId: challenge.caseId,
      caseExplanation: challenge.explanation,
    })
    return {
      hint: response.hintForStudent ?? challenge.fallbackHint,
      aiGenerated: response.hintForStudent !== null && response.aiGenerated,
      failureReason: response.failureReason,
      promptVersion: response.promptVersion,
      aiModel: response.aiModel,
    }
  } catch {
    return { hint: challenge.fallbackHint, aiGenerated: false, failureReason: 'error', promptVersion: null, aiModel: null }
  }
}

export default function ChallengeGenerator({ difficulty }: ChallengeGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasMisconceptions = useAlgorithmStore((state) => state.recentMisconceptions.length > 0)
  const { algorithmName: topicSlug } = useParams<{ algorithmName: string }>()
  // Hidden on every topic without a deterministic generator, rather than
  // loading data that means nothing for that structure.
  const supported = hasChallengeGenerator(topicSlug)
  // Capped per topic session (Week 2 2F): each challenge is a full extra run.
  const limitReached = useAlgorithmStore((state) => state.challengesStarted >= CHALLENGES_PER_TOPIC)

  async function handleGenerate() {
    if (!hasChallengeGenerator(topicSlug)) return
    if (useAlgorithmStore.getState().challengesStarted >= CHALLENGES_PER_TOPIC) return
    setIsGenerating(true)
    setError(null)
    try {
      const { recentMisconceptions, sessionId, codeEditorMode, challengesStarted, scaffoldingLevel, noteChallengeStarted } =
        useAlgorithmStore.getState()
      const seed = challengeSeed(sessionId, challengesStarted)
      noteChallengeStarted()
      const challenge = generateChallenge({
        topic: topicSlug,
        misconception: topMisconceptionOf(recentMisconceptions),
        difficulty,
        seed,
      })
      const displayName = getAlgorithmRegistryEntry(topicSlug)?.displayName ?? topicSlug

      const { setAlgorithm, setActiveChallengeType, setChallengeExplanation, setChallengeHint } =
        useAlgorithmStore.getState()
      // The data never waits on the model: the run loads now, the framing
      // sentence follows.
      setAlgorithm(displayName, buildChallengeRun(challenge, { withComplexityPrediction: COMPLEXITY_JUNCTION_ENABLED, codeEditorMode }))
      setActiveChallengeType(challenge.caseId)
      setChallengeExplanation(challenge.explanation)

      const framing = await framingFor(challenge, displayName)
      if (useAlgorithmStore.getState().activeChallengeType === challenge.caseId) {
        setChallengeHint(framing.hint)
        setTimeout(() => {
          if (useAlgorithmStore.getState().challengeHint === framing.hint) setChallengeHint(null)
        }, CHALLENGE_HINT_VISIBLE_MS)
      }

      if (sessionId) {
        apiFetch('/api/v1/interactions', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            stepIndex: 0,
            predictionSubmitted: null,
            predictionCorrect: null,
            misconceptionCategory: challenge.targets,
            hintsRequested: 0,
            timeSpentSeconds: 0,
            scaffoldingLevelAtTime: scaffoldingLevel,
            interactionType: 'CHALLENGE_ATTEMPT',
            promptKey: `${topicSlug}.${challenge.caseId}@${seed}`,
            hintText: framing.hint,
            aiGenerated: framing.aiGenerated,
            aiFailureReason: framing.failureReason,
            promptVersion: framing.promptVersion,
            aiModel: framing.aiModel,
          }),
        }).catch(() => {
          // Research logging is best-effort; a failed write never blocks the run.
        })
        apiFetch(`/api/v1/sessions/${sessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ challengeExplanation: challenge.explanation }),
        }).catch(() => {
          // Educator-facing explanation persistence is best-effort; it
          // must never block the learner from receiving the challenge.
        })
      }
    } catch {
      setError('Could not generate a challenge. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!supported) return null

  const button = (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleGenerate}
      disabled={isGenerating || limitReached}
      // White text on the secondary (amber) background fails WCAG AA
      // contrast (~2.15:1) - the variant's own text-secondary-foreground
      // (near-black, ~8.7:1) already exists for exactly this background
      // and was being overridden for no visual reason (see remediation
      // doc 9's Verify block: axe check, serious or above).
      className="w-full gap-1.5"
    >
      {isGenerating ? <SpinnerIcon /> : <TargetIcon />}
      {isGenerating ? 'Generating...' : 'AI Challenge'}
    </Button>
  )

  return (
    <div className="flex flex-col gap-1">
      {hasMisconceptions ? (
        button
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>No errors detected yet, generating a general challenge</TooltipContent>
        </Tooltip>
      )}
      {limitReached && (
        <p className="text-xs text-text-muted dark:text-dark-text-secondary">Challenge limit reached for this topic.</p>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
