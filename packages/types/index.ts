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
  /** Once per study run, after ALGORITHM_COMPLETE (Week 2 2C): how many
   * comparisons did this run make? Graded against the run's own counter. */
  COMPLEXITY_PREDICTION: 'COMPLEXITY_PREDICTION',
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

  // Techniques track — the seven paradigms beyond the two pointer family
  /** What goes in this cell of the prefix array. */
  PREFIX_CELL: 'PREFIX_CELL',
  /** Answering a range query from two prefix values, in O(1). */
  RANGE_QUERY: 'RANGE_QUERY',
  /** Whether the element on top of the stack is discharged by this one. */
  STACK_DISCHARGE: 'STACK_DISCHARGE',
  /** How the two halves' answers combine into the whole's. */
  COMBINE_RESULT: 'COMBINE_RESULT',
  /** Take the locally best option, or leave it. */
  GREEDY_CHOICE: 'GREEDY_CHOICE',
  /** What goes in this cell of the table, and which cells it reads. */
  DP_CELL: 'DP_CELL',
  /** Whether this partial candidate can still lead to a solution. */
  PRUNE_BRANCH: 'PRUNE_BRANCH',

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
  /**
   * A table being filled in, with the cells the current one reads from.
   *
   * Distinct from MATRIX, which draws Floyd-Warshall's distance matrix and
   * is written against that engine's state. A dynamic programming table is
   * a different picture: it fills in an order, each cell depends on named
   * earlier cells, and that dependency is the recurrence - which is the
   * whole of what there is to learn. Also used for the 1D tables (a prefix
   * array, a 1D DP row) since a single row is the same picture.
   */
  DP_TABLE: 'DP_TABLE',
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
  SEARCHING: 'SEARCHING',
  TECHNIQUES: 'TECHNIQUES',
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
  /**
   * Cumulative work counters up to and including this step (Week 2 2C),
   * so a run's measured cost can be shown against its complexity formula.
   * Additive: set by the study-topic engines only; absent elsewhere.
   */
  metrics?: RunMetrics
}

export interface RunMetrics {
  /** Input size. */
  n: number
  comparisons: number
  /** Sorting engines. */
  swaps?: number
  /** Search and BST engines: elements or nodes examined. */
  visits?: number
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
  /** The chosen tile's label. Tile ids like 'wrong-2' say nothing about
   * what the student picked, so feedback needs the text; grading never
   * reads it. */
  studentAnswerLabel?: string | null
  /** The right tile's label, used only by the AI service's output check so
   * feedback never names the answer while the student can still retry. */
  correctAnswerLabel?: string | null
  /** The Pseudocode tab's exact text for this algorithm (see
   * apps/web/src/utils/pseudocode.ts). The AI service quotes its variable
   * names and array notation instead of its own copy, so a hint can never
   * describe pseudocode the student cannot see. Omitted when the tab has
   * none, in which case the AI service uses its registry copy. */
  pseudocode?: string
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
  /** Two-sentence trace of what would happen if the wrong answer were applied. Empty when correct. */
  counterfactualTrace: string
  /** True for a real model response, false for the rule-based fallback. */
  aiGenerated: boolean
  /** The study prompt version and model this response came from. */
  promptVersion?: string | null
  aiModel?: string | null
}

/**
 * The fast, deterministic half of PredictionResponse - correctness and
 * ground-truth misconception only, no AI call, so the client can show a
 * verdict within a second instead of waiting on the full explanation.
 */
export interface PredictionEvaluateResponse {
  correct: boolean
  misconceptionCategory: MisconceptionCategory | null
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
  /** Same as PredictionRequest.pseudocode. */
  pseudocode?: string
}

export interface HintResponse {
  hint: string
  scaffoldingLevel: ScaffoldingLevel
  /** True for a real model response, false for the rule-based fallback. */
  aiGenerated: boolean
}

/**
 * Demo mode's free-form assistant: the student asks, it explains. The
 * deliberate opposite of HintRequest, which asks the student a question
 * back and is calibrated to a scaffolding level. There is no scaffolding
 * level here because Demo mode never assesses, so there is nothing to
 * calibrate, and Classic mode has no AI surface at all.
 */
export interface AskTurn {
  question: string
  answer: string
}

export interface AskRequest {
  algorithmName: string
  question: string
  /** Same wrapper shape as PredictionRequest.currentState - lets a question
   * about what is on screen right now be answered from the actual state
   * rather than guessed at. */
  currentState?: unknown
  stepIndex?: number
  pseudocode?: string
  /** Oldest first, so a follow-up like "why?" has something to refer back
   * to. The AI service keeps only the last few turns. */
  conversation?: AskTurn[]
}

export interface AskResponse {
  answer: string
  /** False when the model call failed and deterministic fallback text is
   * being returned, so the client can say so rather than presenting it as
   * a tutor reply. */
  aiGenerated: boolean
}

/**
 * Feynman Technique mode (reverse tutoring): the learner explains the
 * algorithm back to a simulated confused peer, which evaluates the
 * explanation against a concept rubric.
 */
/** A short free-text explanation after a correctly answered conceptual
 * junction (Week 2 2B). The question and rubric come from the authored
 * prompt (apps/web/src/config/selfExplanationPrompts.ts). */
export interface SelfExplanationRequest {
  algorithmName: string
  promptKey: string
  question: string
  rubric: Array<{ id: string; criterion: string }>
  studentResponse: string
}

export interface SelfExplanationResponse {
  /** Null when the judgement fell back: not evaluated, rather than failed. */
  results: Array<{ id: string; met: boolean }> | null
  /** Percentage of criteria met, computed in code. Never shown to the student. */
  score: number | null
  acknowledgement: string
  followUpQuestion: string | null
  aiGenerated: boolean
  failureReason: string | null
  promptVersion: string | null
  aiModel: string | null
}

export interface FeynmanRequest {
  algorithmName: string
  algorithmContext: string
  studentExplanation: string
  completionContext: string
  sessionId: string
  /** Every narration description the student has seen so far this run
   * (see StepLog). Used only for the anti-gaming overlap check on the AI
   * service - never fed back into the grading prompt. */
  stepDescriptions?: string[]
  /** The complexity claims the student was asked to defend (Phase 8B),
   * from the topic's facts (apps/web config/complexity.ts). */
  challengePrompt?: string | null
}

export interface FeynmanRubricItemResult {
  conceptLabel: string
  met: boolean
}

export interface FeynmanResponse {
  /** Null when the explanation was not graded (reused on-screen wording,
   * or the model's judgement was unavailable) - distinct from a graded 0. */
  score: number | null
  feedbackSummary: string
  followUpQuestion: string | null
  missingConcepts: string[]
  isComplete: boolean
  /** Per-concept results behind the score - empty when not graded. */
  rubricResults: FeynmanRubricItemResult[]
  /** The AI service rubric that graded it, e.g. 'binary_search_tree'. */
  rubricKey: string | null
  aiGenerated: boolean
  /** e.g. 'reused_wording', 'error', 'rubric_results.labels'. */
  failureReason: string | null
  promptVersion: string | null
  aiModel: string | null
}

export const InteractionType = {
  PREDICTION: 'PREDICTION',
  FEYNMAN: 'FEYNMAN',
} as const
export type InteractionType = (typeof InteractionType)[keyof typeof InteractionType]

/** The data is generated on the client (challengeGenerators.ts); the AI
 * service only frames it in one sentence from the case's explanation. */
export interface ChallengeRequest {
  algorithmName: string
  caseId: string
  caseExplanation: string
}

export interface ChallengeResponse {
  /** Null when the model's sentence was unavailable or failed validation;
   * the client then shows the case's own authored sentence. */
  hintForStudent: string | null
  aiGenerated: boolean
  failureReason: string | null
  promptVersion: string | null
  aiModel: string | null
}

export interface CodeEvalRequest {
  algorithmName: string
  /** The globals the challenge handed the sandbox, by name. Structured
   * rather than number[], so a tree, a graph or a counter grades the same
   * way an array does. */
  currentState: Record<string, unknown>
  activeIndices: number[]
  /** What the engine's own next snapshot says the answer is. Computed,
   * never authored, so it cannot drift from the visualisation. */
  expectedState: unknown
  studentCode: string
  language: 'python'
  stepDescription: string
  /** Computed by actually running the student's code in Pyodide's WASM
   * sandbox in the browser (see apps/web/src/utils/pyodideRunner.ts) - the
   * AI service is never asked to determine these itself. null when
   * execution raised. */
  actualResultingState: unknown
  hasSyntaxError: boolean
  /** Raw Python error message from Pyodide, when hasSyntaxError is true. */
  executionErrorMessage: string | null
}

export interface CodeEvalResponse {
  isLogicallyCorrect: boolean
  hasSyntaxError: boolean
  /** Whatever the challenge reads back, echoed. Shape depends on the
   * topic, so the caller interprets it against its own challenge. */
  resultingState: unknown
  errorExplanation: string | null
  /** 'off_by_one' | 'wrong_condition' | 'wrong_operation' | 'missing_step'
   *  | 'syntax', or null when the answer was right. */
  bugType: string | null
  /** A Socratic question when wrong; what they got right when correct. */
  correctiveHint: string
  /** Review of the submitted code beyond this one step: edge cases it
   * would miss, and whether it is doing more work than it needs to. Null
   * when there is nothing worth saying. */
  codeReview: string | null
  executeVisually: boolean
}

export interface StudentSummaryRequest {
  /** A participant code only - never a real name or email (see
   * apps/ai/routers/summaries.py's StudentSummaryRequest). */
  studentId: string
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
  /** When the account was created (ISO), shown as "member since". */
  createdAt?: string
  /** A demo account: it has no password the learner can change. */
  isDemo?: boolean
  /** Saved learning preferences, with defaults filled in (Phase 6D). */
  preferences?: LearningPreferences
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
  /** A Practice run of this topic has reached its final step, in any
   * session (Session.reachedFinalStep). Unlocks Feynman mode (Phase 8A). */
  practiceRunCompleted: boolean
  /** The mastery rubric (Phase 7B). A badge and a progress signal only:
   * nothing unlocks or locks on it. */
  mastery: TopicMastery
}

/** not started -> in progress -> proficient (accuracy and breadth) -> mastered (every applicable criterion). */
export type MasteryStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PROFICIENT' | 'MASTERED'

export type MasteryCriterionId = 'ACCURACY' | 'BREADTH' | 'FEYNMAN' | 'CHALLENGE'

export interface MasteryCriterion {
  id: MasteryCriterionId
  /** False when the topic does not offer it yet (no Feynman rubric, no
   * challenge generator): it is left out of Mastered rather than failed. */
  applicable: boolean
  met: boolean
  /** ACCURACY: percent of recent first attempts correct. BREADTH: distinct
   * inputs. FEYNMAN: best score of 100. CHALLENGE: challenges passed. Null
   * when there is nothing to measure yet. */
  value: number | null
  threshold: number
  /** ACCURACY: first attempts counted (the recent window). FEYNMAN and
   * CHALLENGE: attempts made. BREADTH: unused (0). */
  attempts: number
}

export interface TopicMastery {
  status: MasteryStatus
  /** In the fixed order ACCURACY, BREADTH, FEYNMAN, CHALLENGE. */
  criteria: MasteryCriterion[]
  /** Hints requested per answered junction. Reported, never a criterion. */
  hintsPerStep: number | null
  /** Junction types answered wrong first time in the accuracy window, most
   * missed first: what a focused re-run asks (Phase 7E). */
  missedJunctionTypes: string[]
  /** When every applicable criterion was first met. Mastered stays once earned. */
  masteredAt: string | null
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

/** The independent pre/post-test used as the study's outcome measure. */
export type AssessmentPhase = 'PRE' | 'POST'
export type AssessmentItemType = 'MULTIPLE_CHOICE' | 'TRACE'

export interface StudyStatusDto {
  isParticipant: boolean
  withdrawn: boolean
  consentRequired: boolean
  pretestRequired: boolean
  posttestAvailable: boolean
  posttestCompleted: boolean
  /** Study topics completed under the topic-completion rule, after consent. */
  topicsCompleted: string[]
  /** A researcher opened the post-test without the rule being met. */
  posttestOverride: boolean
  /** The one study topic this participant uses in Classic (the plain
   * visualiser), fixed at enrolment. Null for non-participants. */
  classicTopicSlug: string | null
  /** A throwaway demo account: never a participant, and enrolment refuses
   * it, so the app does not offer it the study. */
  isDemo: boolean
  /** The identifier used in every research export; null for non-participants. */
  participantCode: string | null
  /** When the participant consented (ISO), or null. */
  consentAt: string | null
  /** Whether the end-of-study usability questionnaire (SUS) is in. The score is never sent. */
  susSubmitted: boolean
}

/** An item as delivered to the student - never carries the correct answer. */
export interface AssessmentItemDto {
  id: string
  order: number
  itemType: AssessmentItemType
  stem: string
  options: Array<{ id: string; text: string }> | null
}

export interface AssessmentResponseSummaryDto {
  itemId: string
  response: string
}

export interface AssessmentAttemptDto {
  id: string
  assessmentId: string
  code: string
  phase: AssessmentPhase
  title: string
  items: AssessmentItemDto[]
  // Answers already recorded for this attempt, so a reload can resume where
  // the participant left off instead of restarting from question 1.
  responses: AssessmentResponseSummaryDto[]
  startedAt: string
  completedAt: string | null
}

export interface AssessmentResponseRequest {
  itemId: string
  response: string
  timeSpentSeconds: number
}

/** The response half of misconception handling: detect (Phase 4's
 * tile-derived ground-truth label), remediate, re-probe on a different
 * instance, record the outcome. Resolution is decided by deterministic
 * code (see apps/api's misconceptionEvent.service.ts), never the model. */
export type MisconceptionEventStatus = 'OPEN' | 'REMEDIATED' | 'RESOLVED' | 'PERSISTENT' | 'ABANDONED'

export interface MisconceptionEventDto {
  id: string
  algorithmTopicId: string
  category: string
  status: MisconceptionEventStatus
  remediationCount: number
  probeCount: number
  consecutiveCorrect: number
  junctionsSinceDetection: number
  bottomedOut: boolean
  detectedAt: string
  resolvedAt: string | null
}

export interface RemediationDto {
  id: string
  eventId: string
  taskType: string
  level: number
  payload: unknown
  presentedAt: string
}

export interface ProbeResultDto {
  event: MisconceptionEventDto
  shouldEscalate: boolean
  nextLevel: number
}

export interface MisconceptionSummaryDto {
  resolved: number
  inProgress: number
}

export interface EducatorMisconceptionSummaryRow {
  category: string
  detected: number
  resolved: number
  persistent: number
  abandoned: number
  medianJunctionsToResolution: number | null
}

/**
 * What the consent page tells participants - the values live in
 * studyConsent.json (read by both the web page and the api; the api cannot
 * load runtime values from this .ts file). Every null is a detail that must
 * be confirmed before real enrolment: the api refuses non-PILOT codes until
 * none are left, and the page shows each one as a visible placeholder. Do
 * not invent any of them - the ethics approval line comes from the
 * supervisor (decided 2026-09-29).
 */
export interface StudyConsentDetails {
  /** Researcher's name as it should appear to participants. */
  researcherName: string | null
  /** Institutional (UNAM) address - not a personal one. */
  researcherEmail: string | null
  supervisorName: string | null
  institution: string | null
  /** How long the data is kept and what happens to it afterwards. */
  dataRetention: string | null
  /** Ethics approval status as shown to participants. */
  ethicsApproval: string | null
  /** The approval reference once granted. Null keeps real enrolment locked:
   * the status text above can say "pending", but nobody is enrolled on it. */
  ethicsApprovalReference: string | null
}
/** The profile page's figures, from GET /api/v1/profile/analytics (Phase 6C). */
export interface LearnerAnalyticsDto {
  summary: {
    /** Mean topic mastery over unlocked topics, as Home shows it. */
    masteryIndex: number
    topicsTotal: number
    topicsStarted: number
    topicsCompleted: number
    topicsMastered: number
    /** Sum of Session.activeSeconds. */
    practiceSeconds: number
    predictions: number
    correctPredictions: number
    /** 0-100, or null with no predictions. */
    accuracy: number | null
    hintsUsed: number
    /** Hints per prediction, or null with no predictions. */
    hintsPerPrediction: number | null
  }
  /**
   * The scaffolding trajectory, one entry per session with answered
   * predictions, newest first. masteryScoreAtTime is scored within a session,
   * so each session is its own line: chaining them would restart at every
   * session boundary and hide the fading the chart exists to show.
   */
  trajectory: Array<{ sessionId: string; topic: string; startTime: string; points: Array<{ score: number; level: string }> }>
  /** One row per track, which the web maps to its module. */
  modules: Array<{ track: string; topics: number; complete: number; meanMastery: number }>
  misconceptions: Array<{ category: string; detected: number; resolved: number; open: number }>
  recentSessions: Array<{ id: string; topic: string; mode: string; startTime: string; activeSeconds: number | null; predictions: number; correct: number }>
}

/** Learning preferences set on the profile page (Phase 6D). */
export interface LearningPreferences {
  /** ADAPTIVE is the mechanism under study; the other two are for free use and demos. */
  scaffolding: 'ADAPTIVE' | 'FULL' | 'MINIMAL'
  /** Seconds before a hint appears on its own at Full support, or null for never. */
  hintDelaySeconds: 15 | 25 | 40 | null
  sound: boolean
  reducedMotion: 'SYSTEM' | 'ALWAYS'
  theme: 'LIGHT' | 'DARK' | 'SYSTEM'
}

/** What every account starts with, and what an active participant always gets. */
export const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  scaffolding: 'ADAPTIVE',
  hintDelaySeconds: 25,
  sound: false,
  reducedMotion: 'SYSTEM',
  theme: 'SYSTEM',
}
