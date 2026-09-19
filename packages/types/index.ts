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
  // Added in Phase 4 to fit errors the original six taxonomy entries
  // didn't cover - see remediation doc 4.1. Keep in sync with
  // apps/ai/models/request_models.py's MisconceptionCategory.
  COMPARISON_DIRECTION: 'COMPARISON_DIRECTION',
  INVARIANT_MISAPPLICATION: 'INVARIANT_MISAPPLICATION',
  PREMATURE_TERMINATION: 'PREMATURE_TERMINATION',
  STABILITY_CONFUSION: 'STABILITY_CONFUSION',
  TRAVERSAL_ORDER_CONFUSION: 'TRAVERSAL_ORDER_CONFUSION',
  BOUNDARY_CONDITION: 'BOUNDARY_CONDITION',
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
  VISIT_NODE: 'VISIT_NODE',

  // Foundations track — array operations
  INDEX_ACCESS: 'INDEX_ACCESS',
  INSERT_POSITION: 'INSERT_POSITION',
  DELETE_SHIFT: 'DELETE_SHIFT',

  // Foundations track — linked list (singly/doubly/circular)
  POINTER_FOLLOW: 'POINTER_FOLLOW',
  NULL_CHECK: 'NULL_CHECK',
  INSERT_BETWEEN: 'INSERT_BETWEEN',
  DELETE_RELINK: 'DELETE_RELINK',
  TRAVERSE_DIRECTION: 'TRAVERSE_DIRECTION',
  WRAP_CHECK: 'WRAP_CHECK',

  // Foundations track — stack
  STACK_PUSH_RESULT: 'STACK_PUSH_RESULT',
  STACK_POP_RESULT: 'STACK_POP_RESULT',
  OVERFLOW_CHECK: 'OVERFLOW_CHECK',
  UNDERFLOW_CHECK: 'UNDERFLOW_CHECK',

  // Foundations track — queue
  QUEUE_FRONT: 'QUEUE_FRONT',
  QUEUE_REAR: 'QUEUE_REAR',
  CIRCULAR_WRAP: 'CIRCULAR_WRAP',
  DEQUE_END: 'DEQUE_END',

  // Foundations track — hash table
  HASH_BUCKET: 'HASH_BUCKET',
  COLLISION_RESOLVE: 'COLLISION_RESOLVE',
  PROBE_NEXT: 'PROBE_NEXT',
  LOAD_FACTOR: 'LOAD_FACTOR',

  // Foundations track — advanced search
  JUMP_SIZE: 'JUMP_SIZE',
  PROBE_POSITION: 'PROBE_POSITION',
  RANGE_DOUBLE: 'RANGE_DOUBLE',

  // Foundations track — recursion
  BASE_CASE: 'BASE_CASE',
  RECURSIVE_CALL: 'RECURSIVE_CALL',
  RETURN_VALUE: 'RETURN_VALUE',

  // Foundations track — two pointer / sliding window
  POINTER_MOVE: 'POINTER_MOVE',
  WINDOW_EXPAND: 'WINDOW_EXPAND',
  WINDOW_SUM: 'WINDOW_SUM',

  // Sorting track — Shell, Heap, Counting, Radix Sort
  GAP_COMPARISON: 'GAP_COMPARISON',
  HEAP_COMPARE: 'HEAP_COMPARE',
  HEAP_EXTRACT: 'HEAP_EXTRACT',
  COUNT_INCREMENT: 'COUNT_INCREMENT',
  PREFIX_ACCUMULATE: 'PREFIX_ACCUMULATE',
  PLACE_ELEMENT: 'PLACE_ELEMENT',
  DIGIT_BUCKET: 'DIGIT_BUCKET',

  // Trees track — AVL, Red-Black, Heap (as a data structure), Trie
  AVL_BALANCE_CHECK: 'AVL_BALANCE_CHECK',
  AVL_ROTATION_TYPE: 'AVL_ROTATION_TYPE',
  RB_COLOR_DECISION: 'RB_COLOR_DECISION',
  RB_ROTATION_RECOLOR: 'RB_ROTATION_RECOLOR',
  HEAP_SIFT_UP: 'HEAP_SIFT_UP',
  HEAP_SIFT_DOWN: 'HEAP_SIFT_DOWN',
  TRIE_CHARACTER_MATCH: 'TRIE_CHARACTER_MATCH',
  TRIE_INSERT_NEW: 'TRIE_INSERT_NEW',

  // Graphs track — shortest path, MST, graph properties, grid pathfinding
  EDGE_RELAX: 'EDGE_RELAX',
  BELLMAN_PASS_COMPLETE: 'BELLMAN_PASS_COMPLETE',
  MATRIX_UPDATE: 'MATRIX_UPDATE',
  UNION_FIND_CHECK: 'UNION_FIND_CHECK',
  MST_EDGE_SELECT: 'MST_EDGE_SELECT',
  CYCLE_FOUND: 'CYCLE_FOUND',
  NEW_COMPONENT: 'NEW_COMPONENT',
  TOPOLOGICAL_ORDER: 'TOPOLOGICAL_ORDER',
  GRID_NEXT_CELL: 'GRID_NEXT_CELL',
} as const
export type CriticalJunctionType = (typeof CriticalJunctionType)[keyof typeof CriticalJunctionType]

// Discriminates which canvas component a snapshot should render on.
// Existing algorithms (bubble/selection/insertion/merge/quick sort,
// linear/binary search) don't set this field - CanvasContainer treats
// a missing canvasType as CanvasType.ARRAY, its long-standing default.
export const CanvasType = {
  ARRAY: 'ARRAY',
  LINKED_LIST: 'LINKED_LIST',
  STACK: 'STACK',
  QUEUE: 'QUEUE',
  CIRCULAR_QUEUE: 'CIRCULAR_QUEUE',
  HASH_TABLE: 'HASH_TABLE',
  CALL_STACK: 'CALL_STACK',
  RECURSION_TREE: 'RECURSION_TREE',
  TWO_POINTER: 'TWO_POINTER',
  SLIDING_WINDOW: 'SLIDING_WINDOW',
  GRAPH: 'GRAPH',
  TREE: 'TREE',
  COUNTING_SORT: 'COUNTING_SORT',
  RADIX_SORT: 'RADIX_SORT',
  AVL: 'AVL',
  RED_BLACK: 'RED_BLACK',
  HEAP: 'HEAP',
  TRIE: 'TRIE',
  NODE_GRAPH: 'NODE_GRAPH',
  GRID: 'GRID',
  MATRIX: 'MATRIX',
} as const
export type CanvasType = (typeof CanvasType)[keyof typeof CanvasType]

/**
 * Shared graph/grid data model, used by every node-graph and grid
 * pathfinding engine (bfs, dfs, dijkstra, bellman-ford, floyd-warshall,
 * kruskal, prim, cycle/component/topo-sort, grid-*, maze-*). Kept here
 * (rather than duplicated per engine, the way bfs.ts's own AdjacencyList
 * predates this) so NodeGraphCanvas/GridCanvas/MatrixCanvas can share
 * one rendering contract across every algorithm that uses them.
 */
export type AdjacencyList = Record<string, string[]>

export interface WeightedEdge {
  to: string
  weight: number
}
export type WeightedAdjacencyList = Record<string, WeightedEdge[]>

/** A node's canvas position. x/y are normalised 0-1 (multiplied by the
 * canvas's actual pixel width/height at render time), so a graph's
 * layout survives the canvas being resized or measured at 0 on first
 * render - the same reason TreeCanvas computes its own layout instead
 * of baking pixel coordinates into engine state. */
export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
}

export type CellState = 'empty' | 'wall' | 'start' | 'end' | 'visited' | 'frontier' | 'path'

export interface GridCell {
  row: number
  col: number
  state: CellState
  /** BFS / Dijkstra distance from the start cell. */
  distance?: number
  /** A* total score: gScore + hScore. */
  fScore?: number
  /** A* cost so far from the start cell. */
  gScore?: number
  /** A* heuristic estimate to the end cell. */
  hScore?: number
  /** `'row,col'` of the parent cell, for path reconstruction. */
  parent?: string
}

/** Snapshot state shared by every node-graph algorithm rendered on
 * NodeGraphCanvas. Optional fields are populated only by the engines
 * that produce them (e.g. `distances` by Dijkstra/Bellman-Ford, never
 * by BFS) - NodeGraphCanvas reads each defensively. */
export interface GraphAlgorithmState {
  nodes: GraphNode[]
  adjacency: AdjacencyList | WeightedAdjacencyList
  directed: boolean
  /** Node ids fully processed. */
  visited: string[]
  /** Node ids currently in the queue / stack / priority queue. */
  frontier: string[]
  currentNode: string | null
  /** Final path node ids, populated once the algorithm has one to show. */
  pathNodes: string[]
  /** Final path edges as [from, to] pairs. */
  pathEdges: [string, string][]
  distances?: Record<string, number>
  parents?: Record<string, string | null>
  /** Node id -> component index, for connected-components. */
  components?: Record<string, number>
  topoOrder?: string[]
  discoveryTime?: Record<string, number>
  finishTime?: Record<string, number>
  /** MST edges as [from, to, weight] triples, in the order they were added. */
  mstEdges?: [string, string, number][]
  mstCost?: number
}

export type GridAlgorithmType = 'bfs' | 'dfs' | 'dijkstra' | 'astar'

/** Snapshot state shared by every grid pathfinding algorithm rendered on
 * GridCanvas. The full grid is included in every snapshot (not just a
 * diff) so step-backward stays a pure array index change rather than a
 * recomputation, matching every other engine's immutable-snapshot-array
 * contract. */
export interface GridAlgorithmState {
  grid: GridCell[][]
  rows: number
  cols: number
  startCell: [number, number]
  endCell: [number, number]
  currentCell: [number, number] | null
  frontierCells: [number, number][]
  visitedCount: number
  pathLength?: number
  algorithmType: GridAlgorithmType
}

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
  /**
   * Which canvas component should render this snapshot. Optional and
   * omitted by every pre-Foundations engine (sorting, search, BST,
   * BFS) - CanvasContainer treats a missing value as CanvasType.ARRAY,
   * so none of those engines need updating.
   */
  canvasType?: CanvasType
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
  /** The misconception authored onto the selected tile (see TileOption in
   * apps/web/src/components/prediction/TileGrid.tsx), null for a correct
   * tile or a free-text/code answer with no tile. This is the ground truth
   * label - the AI's own guess is reported separately as
   * PredictionResponse.aiMisconceptionCategory, never stored as fact. */
  groundTruthMisconception?: MisconceptionCategory | null
}

/**
 * The backend's response after processing a prediction: whether it
 * was correct, any detected misconception, the consequence of the
 * student's answer, and a Socratic hint to nudge them forward.
 */
export interface PredictionResponse {
  correct: boolean
  /** The stored, authoritative label: the tile-derived groundTruthMisconception
   * echoed back when the answer was wrong, or the rule-based classifier's
   * guess when there was no tile. Never the model's own guess - that is
   * aiMisconceptionCategory below. */
  misconceptionCategory: MisconceptionCategory | null
  /** The AI's own guess at the misconception, reported separately so
   * agreement between the two can be measured rather than assumed. Null
   * when the answer was correct or the AI call fell back. */
  aiMisconceptionCategory: MisconceptionCategory | null
  consequenceExplanation: string
  socraticHint: string
  xpAwarded: number
  /** Two-sentence trace of what would happen if the wrong answer were applied. Empty when correct. */
  counterfactualTrace: string
  /** True for a real model response, false for the rule-based fallback. */
  aiGenerated: boolean
}

export interface HintRequest {
  algorithmName: string
  stepIndex: number
  currentPredictionPrompt: string
  errorHistory: string[]
  scaffoldingLevel: ScaffoldingLevel
  /** Same wrapper shape as PredictionRequest.currentState (dataStructureState/
   * activeIndices/criticalJunctionType) - lets the AI service ground a hint's
   * index/value references in the actual state instead of only the rendered
   * prompt text. */
  currentState?: unknown
  /** Position on the graduated hint ladder (0-indexed): 0 asks a Socratic
   * question, 1 is more direct about what to look at, and so on. Omitted
   * for a manual H-key/avatar request, which always asks at the base
   * level regardless of how many wrong attempts preceded it. */
  hintIndex?: number
}

export interface HintResponse {
  hint: string
  scaffoldingLevel: ScaffoldingLevel
  /** True for a real model response, false for the rule-based fallback. */
  aiGenerated: boolean
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
