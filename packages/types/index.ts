/**
 * Shared TypeScript interfaces for the Interactive DSA Tutor monorepo.
 * Consumed by `apps/web` and `apps/api`.
 */

// Modeled as const objects + union types (rather than `enum`) so this
// package stays compatible with `erasableSyntaxOnly` / isolatedModules
// consumers (e.g. Vite's TS type-stripping) while still giving
// `AlgorithmMode.DEMO`-style ergonomics.
export const AlgorithmMode = {
  DEMO: 'DEMO',
  PRACTICE: 'PRACTICE',
  HANDS_ON: 'HANDS_ON',
} as const
export type AlgorithmMode = (typeof AlgorithmMode)[keyof typeof AlgorithmMode]

export const ScaffoldingLevel = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  NONE: 'NONE',
} as const
export type ScaffoldingLevel = (typeof ScaffoldingLevel)[keyof typeof ScaffoldingLevel]

export const PredictionType = {
  CANVAS_CLICK: 'CANVAS_CLICK',
  VALUE_INPUT: 'VALUE_INPUT',
  TILE_GRID: 'TILE_GRID',
  CODE_EDITOR: 'CODE_EDITOR',
} as const
export type PredictionType = (typeof PredictionType)[keyof typeof PredictionType]

export const MisconceptionCategory = {
  OFF_BY_ONE: 'OFF_BY_ONE',
  ORDER_OF_OPERATIONS: 'ORDER_OF_OPERATIONS',
  STRUCTURAL_PROPERTY_VIOLATION: 'STRUCTURAL_PROPERTY_VIOLATION',
  POINTER_CONFUSION: 'POINTER_CONFUSION',
  BASE_CASE_OMISSION: 'BASE_CASE_OMISSION',
  COMPLEXITY_MISATTRIBUTION: 'COMPLEXITY_MISATTRIBUTION',
} as const
export type MisconceptionCategory =
  (typeof MisconceptionCategory)[keyof typeof MisconceptionCategory]

export const CriticalJunctionType = {
  SWAP_DECISION: 'SWAP_DECISION',
  PASS_COMPLETE: 'PASS_COMPLETE',
  EARLY_TERMINATION: 'EARLY_TERMINATION',
  ALGORITHM_COMPLETE: 'ALGORITHM_COMPLETE',
  TARGET_CHECK: 'TARGET_CHECK',
  MIDPOINT_DECISION: 'MIDPOINT_DECISION',
  NEW_MINIMUM: 'NEW_MINIMUM',
  MERGE_DECISION: 'MERGE_DECISION',
  PIVOT_SELECTION: 'PIVOT_SELECTION',
  PARTITION_DECISION: 'PARTITION_DECISION',
  BST_DIRECTION: 'BST_DIRECTION',
  NEXT_NODE_SELECTION: 'NEXT_NODE_SELECTION',
} as const
export type CriticalJunctionType = (typeof CriticalJunctionType)[keyof typeof CriticalJunctionType]

// CONCEPTUAL junctions test understanding of WHY (PASS_COMPLETE,
// EARLY_TERMINATION, ALGORITHM_COMPLETE); PROCEDURAL junctions test
// correct execution (SWAP_DECISION).
export const JunctionDifficulty = {
  CONCEPTUAL: 'CONCEPTUAL',
  PROCEDURAL: 'PROCEDURAL',
} as const
export type JunctionDifficulty = (typeof JunctionDifficulty)[keyof typeof JunctionDifficulty]

export const AlgorithmTrack = {
  FOUNDATIONS: 'FOUNDATIONS',
  SORTING: 'SORTING',
  TREES: 'TREES',
  GRAPHS: 'GRAPHS',
} as const
export type AlgorithmTrack = (typeof AlgorithmTrack)[keyof typeof AlgorithmTrack]

export const Difficulty = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
} as const
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty]

export const UserRole = {
  STUDENT: 'STUDENT',
  EDUCATOR: 'EDUCATOR',
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

/**
 * The full state of the data structure/algorithm at one step, as
 * produced by the snapshot engine.
 */
export interface AlgorithmSnapshot {
  stepIndex: number
  description: string
  pseudocodeLine: number
  isPredictionRequired: boolean
  predictionType: PredictionType
  dataStructureState: unknown
  activeIndices: number[]
  highlightIndices: number[]
  comparedIndices: number[]
  swappedIndices: number[]
  isFinalStep: boolean
  /** Non-null only on steps that are actually a Critical Junction (isPredictionRequired: true). */
  criticalJunctionType: CriticalJunctionType | null
  junctionDifficulty: JunctionDifficulty | null
}

/**
 * The current state of an algorithm visualization/session (the
 * Zustand store shape).
 */
export interface AlgorithmState {
  algorithmName: string
  snapshotArray: AlgorithmSnapshot[]
  stepIndex: number
  mode: AlgorithmMode
  scaffoldingLevel: ScaffoldingLevel
  sessionXP: number
  focusModeActive: boolean
  isPlaying: boolean
  playbackSpeed: number
}

/**
 * Sent from the frontend to the backend when a learner submits a
 * prediction for the current step.
 */
export interface PredictionRequest {
  algorithmName: string
  stepIndex: number
  currentState: unknown
  studentAnswer: string | null
  errorHistory: string[]
  scaffoldingLevel: ScaffoldingLevel
  sessionId: string
  junctionType?: CriticalJunctionType | null
  junctionDifficulty?: JunctionDifficulty | null
}

/**
 * The backend's response after processing a prediction: whether it
 * was correct, any detected misconception, the consequence of the
 * student's answer, and a Socratic hint to nudge them forward.
 */
export interface PredictionResponse {
  correct: boolean
  misconceptionCategory: MisconceptionCategory | null
  consequenceExplanation: string
  socraticHint: string
  xpAwarded: number
  /** Two-sentence trace of what would happen if the wrong answer were applied. Empty when correct. */
  counterfactualTrace: string
}

export interface HintRequest {
  algorithmName: string
  stepIndex: number
  currentPredictionPrompt: string
  errorHistory: string[]
  scaffoldingLevel: ScaffoldingLevel
}

export interface HintResponse {
  hint: string
  scaffoldingLevel: ScaffoldingLevel
}

/**
 * Feynman Technique mode (reverse tutoring): the learner explains the
 * algorithm back to a simulated confused peer, which evaluates the
 * explanation against a concept rubric.
 */
export interface FeynmanRequest {
  algorithmName: string
  algorithmContext: string
  studentExplanation: string
  completionContext: string
  sessionId: string
}

export interface FeynmanResponse {
  score: number
  feedbackSummary: string
  followUpQuestion: string | null
  missingConcepts: string[]
  isComplete: boolean
}

export const InteractionType = {
  PREDICTION: 'PREDICTION',
  FEYNMAN: 'FEYNMAN',
} as const
export type InteractionType = (typeof InteractionType)[keyof typeof InteractionType]

export interface ChallengeRequest {
  algorithmName: string
  topMisconception: string | null
  difficulty: string
  sessionHistory: Record<string, unknown>
  arraySize?: number
}

export interface ChallengeResponse {
  array: number[]
  challengeType: string
  explanation: string
  hintForStudent: string
}

export interface CodeEvalRequest {
  algorithmName: string
  currentArrayState: number[]
  activeIndices: number[]
  expectedNextState: number[]
  studentCode: string
  language: 'pseudocode' | 'python' | 'java'
  stepDescription: string
}

export interface CodeEvalResponse {
  isLogicallyCorrect: boolean
  hasSyntaxError: boolean
  resultingState: number[] | null
  errorExplanation: string | null
  bugType: string | null
  correctiveHint: string
  executeVisually: boolean
}

export interface StudentSummaryRequest {
  studentId: string
  studentName: string
  algorithmName: string
  totalSessions: number
  totalPredictions: number
  correctPredictions: number
  hintsRequested: number
  misconceptionBreakdown: Record<string, number>
  scaffoldingProgression: string[]
  feynmanScores: number[]
  averageTimePerStep: number
}

export interface StudentSummaryResponse {
  narrativeSummary: string
  strengthAreas: string[]
  concernAreas: string[]
  recommendedAction: string
  scaffoldingTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data'
}

export interface ClassSummaryRequest {
  algorithmName: string
  totalStudents: number
  averageCorrectRate: number
  topMisconceptions: Array<{ category: string; count: number }>
  stepDifficultyHeatmap: Array<{ stepIndex: number; errorCount: number }>
  scaffoldingDistribution: Record<string, number>
}

export interface ClassSummaryResponse {
  narrativeSummary: string
  keyFindings: string[]
  recommendedInterventions: string[]
  curriculumAdjustment: string | null
}

/**
 * A summary of a completed (or in-progress) tutoring session,
 * persisted by the API and surfaced in student progress views.
 */
export interface SessionSummary {
  sessionId: string
  userId: string
  algorithmName: string
  mode: AlgorithmMode
  totalSteps: number
  correctPredictions: number
  incorrectPredictions: number
  hintsRequested: number
  misconceptionBreakdown: Record<MisconceptionCategory, number>
  startTime: string
  endTime: string | null
  xpEarned: number
}

export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  xpTotal: number
  streakCount: number
  lastActiveDate: string | null
}

export interface AlgorithmTopicDTO {
  id: string
  name: string
  displayName: string
  track: AlgorithmTrack
  difficulty: Difficulty
  description: string
  estimatedMinutes: number
  isLocked: boolean
  masteryPercent: number
}

/** Alias kept for call sites that refer to this shape as `TopicDto`. */
export type TopicDto = AlgorithmTopicDTO

/**
 * The standard API response wrapper: exactly one of `data`/`error`
 * is non-null.
 */
export interface ApiResponse<T> {
  data: T | null
  error: { code: string; message: string } | null
}

/** What gets written to the database per prediction. */
export interface InteractionLog {
  sessionId: string
  stepIndex: number
  predictionSubmitted: string
  predictionCorrect: boolean
  misconceptionCategory: MisconceptionCategory | null
  hintsRequested: number
  timeSpentSeconds: number
  criticalJunctionType: CriticalJunctionType | null
  junctionDifficulty: JunctionDifficulty | null
  scaffoldingLevelAtTime: ScaffoldingLevel
  masteryScoreAtTime: number
  /** 'PREDICTION' (default) for a normal step submission, 'FEYNMAN' for a reverse-tutoring evaluation. */
  interactionType: InteractionType
}

/** Aggregated class-wide data for the educator analytics dashboard. */
export interface EducatorAnalyticsDto {
  totalStudents: number
  totalSessions: number
  averageCorrectRate: number
  misconceptionBreakdown: Record<string, number>
  stepDifficultyHeatmap: Array<{
    stepIndex: number
    errorCount: number
    algorithmName: string
  }>
  scaffoldingDistribution: Record<string, number>
  studentProgress: Array<{
    userId: string
    name: string
    totalSessions: number
    averageCorrectRate: number
    topMisconception: string | null
    challengeExplanation: string | null
    totalPredictions: number
    correctPredictions: number
    hintsRequested: number
    misconceptionBreakdown: Record<string, number>
    scaffoldingProgression: string[]
    feynmanScores: number[]
    averageTimePerStep: number
  }>
}
