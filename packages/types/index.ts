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

/** One TILE_GRID option for a Critical Junction, with its correctness baked in. */
export interface TileOptionSpec {
  id: string
  label: string
  correct: boolean
}

/**
 * Static TILE_GRID option sets for the three CONCEPTUAL junction types.
 * Correctness here is a fixed property of the algorithm's invariants, not
 * the current array values, so it can be declared once and shared by the
 * frontend (rendering + priming) and mirrored by the AI service (grading).
 * SWAP_DECISION has no entry: its correct option depends on the current
 * array values and is derived dynamically instead.
 */
export const CRITICAL_JUNCTION_TILE_OPTIONS: Partial<Record<CriticalJunctionType, TileOptionSpec[]>> = {
  [CriticalJunctionType.PASS_COMPLETE]: [
    { id: 'largest-in-place', label: 'The largest unsorted element is now in its correct position', correct: true },
    { id: 'fully-sorted', label: 'The entire array is sorted', correct: false },
    { id: 'no-change', label: 'Nothing has changed', correct: false },
    { id: 'smallest-to-front', label: 'The smallest element moved to the front', correct: false },
  ],
  [CriticalJunctionType.EARLY_TERMINATION]: [
    { id: 'no-swaps-needed', label: 'No swaps were needed. The array is already sorted from this point', correct: true },
    { id: 'found-error', label: 'The algorithm found an error', correct: false },
    { id: 'loop-ran-out', label: 'The loop counter ran out', correct: false },
    { id: 'swap-skipped', label: 'A swap was skipped', correct: false },
  ],
  [CriticalJunctionType.ALGORITHM_COMPLETE]: [
    { id: 'no-adjacent-out-of-order', label: 'No adjacent pair is out of order', correct: true },
    { id: 'every-element-visited', label: 'Every element was visited at least once', correct: false },
    { id: 'sum-preserved', label: 'The sum of all elements is preserved', correct: false },
    { id: 'first-last-in-order', label: 'The first and last elements are in order', correct: false },
  ],
}

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
  studentProgress: Array<{
    userId: string
    name: string
    totalSessions: number
    averageCorrectRate: number
    topMisconception: string | null
  }>
}
