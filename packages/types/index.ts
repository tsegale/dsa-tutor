/**
 * Shared TypeScript interfaces for the Interactive DSA Tutor monorepo.
 * Consumed by `apps/web` and `apps/api`.
 */

// Modeled as const objects + union types (rather than `enum`) so this
// package stays compatible with `erasableSyntaxOnly` / isolatedModules
// consumers (e.g. Vite's TS type-stripping) while still giving
// `Mode.DEMO`-style ergonomics.
export const Mode = {
  DEMO: 'DEMO',
  PRACTICE: 'PRACTICE',
} as const
export type Mode = (typeof Mode)[keyof typeof Mode]

export const ScaffoldingLevel = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  NONE: 'NONE',
} as const
export type ScaffoldingLevel = (typeof ScaffoldingLevel)[keyof typeof ScaffoldingLevel]

/**
 * The current state of an algorithm visualization/session.
 */
export interface AlgorithmState {
  algorithmName: string
  stepIndex: number
  snapshotArray: any[]
  mode: Mode
  scaffoldingLevel: ScaffoldingLevel
  sessionXP: number
  focusModeActive: boolean
}

/**
 * Sent from the frontend/backend to the AI service to request a
 * Socratic prediction/feedback response for the student's current step.
 */
export interface PredictionRequest {
  algorithmName: string
  stepIndex: number
  currentState: any
  studentAnswer: string | null
  errorHistory: string[]
  scaffoldingLevel: string
}

/**
 * The AI service's response: whether the student's prediction was
 * correct, any detected misconception, the consequence of their
 * answer, and a Socratic hint to nudge them forward.
 */
export interface PredictionResponse {
  correct: boolean
  misconceptionCategory: string | null
  consequenceExplanation: string
  socraticHint: string
}

/**
 * A summary of a completed (or in-progress) tutoring session,
 * persisted by the API and surfaced in student progress views.
 */
export interface SessionSummary {
  sessionId: string
  userId: string
  algorithmName: string
  mode: string
  totalSteps: number
  correctPredictions: number
  hintsRequested: number
  startTime: string
  endTime: string
}
