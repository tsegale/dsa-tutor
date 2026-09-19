import { useState } from 'react'
import { useAlgorithmStore, getJunctionDensityForScaffoldingLevel } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { generateChallenge } from '@/api/challenges'
import { apiFetch } from '@/api/client'
import { bubbleSortEngine } from '@/engine/bubbleSort'
import { topMisconceptionOf } from '@/utils/junctionTargeting'
import { hasChallengeGenerator } from '@/utils/challengeGenerators'

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

export default function ChallengeGenerator({ difficulty }: ChallengeGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasMisconceptions = useAlgorithmStore((state) => state.recentMisconceptions.length > 0)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const supported = hasChallengeGenerator(algorithmName)

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const {
        recentMisconceptions,
        sessionCorrectPredictions,
        sessionTotalPredictions,
        sessionHintsRequested,
        sessionId,
        codeEditorMode,
        scaffoldingLevel,
      } = useAlgorithmStore.getState()

      const correctRate =
        sessionTotalPredictions > 0 ? Math.round((sessionCorrectPredictions / sessionTotalPredictions) * 100) : 0

      const response = await generateChallenge({
        algorithmName: 'Bubble Sort',
        topMisconception: topMisconceptionOf(recentMisconceptions),
        difficulty,
        sessionHistory: {
          correctRate,
          totalPredictions: sessionTotalPredictions,
          hintsRequested: sessionHintsRequested,
        },
      })

      const { setAlgorithm, setActiveChallengeType, setChallengeExplanation, setChallengeHint } =
        useAlgorithmStore.getState()
      setAlgorithm(
        'Bubble Sort',
        bubbleSortEngine(response.array, {
          codeEditorMode,
          junctionDensity: getJunctionDensityForScaffoldingLevel(scaffoldingLevel),
          topMisconception: topMisconceptionOf(recentMisconceptions),
        }),
      )
      setActiveChallengeType(response.challengeType)
      setChallengeExplanation(response.explanation)
      setChallengeHint(response.hintForStudent)
      setTimeout(() => {
        if (useAlgorithmStore.getState().challengeHint === response.hintForStudent) {
          setChallengeHint(null)
        }
      }, CHALLENGE_HINT_VISIBLE_MS)

      if (sessionId) {
        apiFetch(`/api/v1/sessions/${sessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ challengeExplanation: response.explanation }),
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
      disabled={isGenerating}
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
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
