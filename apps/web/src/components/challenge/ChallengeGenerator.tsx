import { useState } from 'react'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { Button } from '@/components/ui/button'
import { generateChallenge } from '@/api/challenges'
import { apiFetch } from '@/api/client'
import { bubbleSortEngine } from '@/engine/bubbleSort'

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

function topMisconceptionOf(recent: string[]): string | null {
  if (recent.length === 0) return null
  const counts: Record<string, number> = {}
  recent.forEach((category) => {
    counts[category] = (counts[category] ?? 0) + 1
  })
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
}

export default function ChallengeGenerator({ difficulty }: ChallengeGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setAlgorithm('Bubble Sort', bubbleSortEngine(response.array, codeEditorMode))
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

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full gap-1.5"
      >
        {isGenerating ? <SpinnerIcon /> : <TargetIcon />}
        {isGenerating ? 'Generating...' : 'AI Challenge'}
      </Button>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
