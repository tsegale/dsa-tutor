import type { PredictionRequest, PredictionResponse } from '@dsa-tutor/types'

// Mock implementation for Phase 9. Phase 10 will replace this with a real
// API call to the AI microservice.
export async function submitPrediction(_request: PredictionRequest): Promise<PredictionResponse> {
  await new Promise((resolve) => setTimeout(resolve, 400)) // simulate network delay

  // Temporary mock: 60% correct rate. The real backend (Phase 10) will
  // actually evaluate the student's answer against the snapshot.
  const isCorrect = Math.random() > 0.4

  return {
    correct: isCorrect,
    misconceptionCategory: isCorrect ? null : 'ORDER_OF_OPERATIONS',
    consequenceExplanation: isCorrect
      ? ''
      : 'If we skip this swap, the larger value remains on the left. On the next pass it will need to be compared again, making the sort less efficient and potentially leaving the array unsorted.',
    socraticHint:
      'Look at the two highlighted values. Which one is larger? Which position should the larger value occupy at the end of sorting?',
    xpAwarded: isCorrect ? 3 : 0,
  }
}
