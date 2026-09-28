import { create } from 'zustand'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { AlgorithmMode, ScaffoldingLevel } from '@dsa-tutor/types'
import { bubbleSortEngine } from '../engine/bubbleSort'
import { WORKED_STEP_DWELL_MS } from '@/config/pacing'
import { endsSegment, isWorkedStep } from '@/utils/workedSteps'

export interface AlgorithmStoreState {
  algorithmName: string
  snapshotArray: AlgorithmSnapshot[]
  stepIndex: number
  mode: AlgorithmMode
  scaffoldingLevel: ScaffoldingLevel
  scaffoldingReasoning: string
  sessionXP: number
  focusModeActive: boolean
  isPlaying: boolean
  playbackSpeed: number
  sessionId: string | null
  userId: string | null

  // Last 10 misconception categories from incorrect predictions this
  // session, most recent last. Feeds AI Challenge generation's "top
  // misconception" signal.
  recentMisconceptions: string[]
  // Educator-facing rationale for the most recently generated AI
  // challenge array. Never shown to the student.
  currentChallengeExplanation: string | null
  // Student-facing framing sentence for the most recently generated AI
  // challenge array, shown in a dismissible banner above the canvas.
  challengeHint: string | null
  // Non-null while the loaded array came from AI Challenge generation
  // (cleared by any other setAlgorithm call), so the final-step
  // completion handler knows whether to award the challenge XP bonus.
  activeChallengeType: string | null
  sessionCorrectPredictions: number
  sessionTotalPredictions: number
  sessionHintsRequested: number
  // When true, the snapshot engine renders SWAP_DECISION junctions as a
  // CODE_EDITOR prediction instead of TILE_GRID. Toggling only affects
  // snapshots generated after the change, not the array already loaded.
  codeEditorMode: boolean
  // Worked-example fading (Week 2 2A) is on for the study topics only;
  // every other topic asks every junction, as before.
  fadingEnabled: boolean
  // The scaffolding level fading uses for the current segment. It only
  // follows scaffoldingLevel at a segment boundary (a conceptual junction,
  // i.e. the end of a Bubble Sort pass), before a run starts, and on a new
  // run - so stepping down mid-session never changes demand mid-pass.
  segmentScaffoldingLevel: ScaffoldingLevel
  // Self-explanation prompts offered this session (Week 2 2B), skipped
  // ones included; capped by SELF_EXPLANATION_MAX_PER_SESSION. Resets with
  // each new session.
  selfExplanationsOffered: number
  // AI Challenges started this session; seeds each challenge reproducibly
  // (challengeSeed) so a logged attempt can be regenerated. Resets with
  // each new session.
  challengesStarted: number

  stepForward: () => void
  stepBackward: () => void
  resetAlgorithm: () => void
  setMode: (mode: AlgorithmMode) => void
  setAlgorithm: (name: string, snapshots: AlgorithmSnapshot[]) => void
  toggleFocusMode: () => void
  addXP: (amount: number) => void
  setPlaybackSpeed: (speed: number) => void
  setScaffoldingLevel: (level: ScaffoldingLevel) => void
  setScaffoldingReasoning: (reasoning: string) => void
  setSessionId: (id: string) => void
  setUserId: (id: string) => void
  startPlayback: () => void
  stopPlayback: () => void
  addMisconception: (category: string) => void
  setChallengeExplanation: (explanation: string | null) => void
  setChallengeHint: (hint: string | null) => void
  setActiveChallengeType: (type: string | null) => void
  recordPredictionResult: (correct: boolean, hintsRequestedForStep: number) => void
  toggleCodeEditorMode: () => void
  setFadingEnabled: (enabled: boolean) => void
  noteSelfExplanationOffered: () => void
  noteChallengeStarted: () => void
}

/** A junction the learner must answer now - not one that runs as a worked
 * step under the current segment's fading. The single definition every
 * caller (auto-advance, playback, the prediction zone, the page) uses. */
function isLiveJunctionAt(state: AlgorithmStoreState, index: number): boolean {
  if (!state.snapshotArray[index]?.isPredictionRequired) return false
  return !(state.fadingEnabled && isWorkedStep(state.snapshotArray, index, state.segmentScaffoldingLevel))
}

function isWorkedStepAt(state: AlgorithmStoreState, index: number): boolean {
  return state.fadingEnabled && isWorkedStep(state.snapshotArray, index, state.segmentScaffoldingLevel)
}

const MAX_RECENT_MISCONCEPTIONS = 10

const MIN_PLAYBACK_SPEED = 0.5
const MAX_PLAYBACK_SPEED = 3.0

// Intervals are not serializable state, so this lives outside the
// store and is only ever touched by startPlayback/stopPlayback.
let playbackInterval: ReturnType<typeof setInterval> | null = null

function clearPlaybackInterval() {
  if (playbackInterval !== null) {
    clearInterval(playbackInterval)
    playbackInterval = null
  }
}

// A 5-element Bubble Sort's narration alone used to take 52 manual clicks
// to get through in Practice mode - most of them added nothing, since
// only Critical Junctions actually need the learner's input. This timer
// (module-level for the same reason as playbackInterval above) lets
// narration-only steps advance on their own, landing the learner on the
// next junction instead of making them click there one step at a time.
let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null
const PRACTICE_AUTO_ADVANCE_DELAY_MS = 350

function clearAutoAdvanceTimer() {
  if (autoAdvanceTimer !== null) {
    clearTimeout(autoAdvanceTimer)
    autoAdvanceTimer = null
  }
}

/** Test-only escape hatch: this module's auto-advance timer is process-
 * global (see the comment above autoAdvanceTimer), so a test that puts the
 * store in Practice mode on a narration step schedules a real pending
 * timeout that outlives the test itself unless something cancels it.
 * Tests must call this in an afterEach. */
export function __clearAutoAdvanceTimerForTests() {
  clearAutoAdvanceTimer()
}

/** Schedules the next narration-only step to advance itself. Only in
 * Practice mode, only while playback isn't already driving steps (that
 * interval has its own pause-at-junction logic), never past a Critical
 * Junction (isPredictionRequired) or the final step - those need the
 * learner, not a timer. stepForward calls this again for the step it
 * lands on, so a run of narration steps chains forward on its own until
 * the next junction. */
function scheduleNarrationAutoAdvance(get: () => AlgorithmStoreState) {
  clearAutoAdvanceTimer()
  const { mode, isPlaying, stepIndex, snapshotArray } = get()
  if (mode !== AlgorithmMode.PRACTICE || isPlaying) return
  if (stepIndex >= snapshotArray.length - 1) return
  if (isLiveJunctionAt(get(), stepIndex)) return

  // A worked step stays up long enough to read its narration; plain
  // narration moves on almost immediately.
  const delay = isWorkedStepAt(get(), stepIndex) ? WORKED_STEP_DWELL_MS : PRACTICE_AUTO_ADVANCE_DELAY_MS
  autoAdvanceTimer = setTimeout(() => {
    autoAdvanceTimer = null
    get().stepForward()
  }, delay)
}

export const useAlgorithmStore = create<AlgorithmStoreState>((set, get) => ({
  algorithmName: 'Bubble Sort',
  snapshotArray: bubbleSortEngine([5, 3, 1, 4, 2]),
  stepIndex: 0,
  mode: AlgorithmMode.DEMO,
  scaffoldingLevel: ScaffoldingLevel.HIGH,
  scaffoldingReasoning: 'No interaction data yet. Starting with maximum support.',
  sessionXP: 0,
  focusModeActive: false,
  isPlaying: false,
  playbackSpeed: 1.0,
  sessionId: null,
  userId: null,
  recentMisconceptions: [],
  currentChallengeExplanation: null,
  challengeHint: null,
  activeChallengeType: null,
  sessionCorrectPredictions: 0,
  sessionTotalPredictions: 0,
  sessionHintsRequested: 0,
  codeEditorMode: false,
  fadingEnabled: false,
  segmentScaffoldingLevel: ScaffoldingLevel.HIGH,
  selfExplanationsOffered: 0,
  challengesStarted: 0,

  // Advances the step index only. Pausing playback at a prediction step
  // is the playback interval's job (see startPlayback) - stepForward
  // itself has no opinion on mode or isPredictionRequired, since manual
  // stepping (arrow key, Step Forward button) must always advance
  // regardless of mode. The prediction zone appears because the new
  // snapshot has isPredictionRequired: true and mode is PRACTICE, not
  // because stepForward blocked anything. Scheduling narration auto-advance
  // here (rather than only where the button/key handler lives) is what
  // makes a single manual step past a junction chain forward through the
  // narration that follows, instead of requiring one click per step.
  stepForward: () => {
    const { stepIndex, snapshotArray, scaffoldingLevel, segmentScaffoldingLevel } = get()
    if (stepIndex < snapshotArray.length - 1) {
      set({
        stepIndex: stepIndex + 1,
        // Leaving a conceptual junction ends the segment: a level change
        // made during it takes effect from here.
        segmentScaffoldingLevel: endsSegment(snapshotArray, stepIndex) ? scaffoldingLevel : segmentScaffoldingLevel,
      })
      scheduleNarrationAutoAdvance(get)
    }
  },

  stepBackward: () => {
    const { stepIndex } = get()
    if (stepIndex <= 0) return
    // Reviewing a past step is a deliberate choice - a pending
    // auto-advance must not immediately undo it by jumping forward again.
    clearAutoAdvanceTimer()
    set({ stepIndex: stepIndex - 1 })
  },

  resetAlgorithm: () => {
    clearPlaybackInterval()
    clearAutoAdvanceTimer()
    set((state) => ({ stepIndex: 0, isPlaying: false, segmentScaffoldingLevel: state.scaffoldingLevel }))
    scheduleNarrationAutoAdvance(get)
  },

  setMode: (mode) => {
    // Preserves stepIndex: a student mid-run who switches modes (e.g.
    // Demo to Practice) keeps their place instead of silently losing
    // progress back to step 1 with no warning.
    clearPlaybackInterval()
    clearAutoAdvanceTimer()
    set({ mode, isPlaying: false })
    scheduleNarrationAutoAdvance(get)
  },

  setAlgorithm: (name, snapshots) => {
    clearPlaybackInterval()
    clearAutoAdvanceTimer()
    set({
      algorithmName: name,
      snapshotArray: snapshots,
      stepIndex: 0,
      isPlaying: false,
      segmentScaffoldingLevel: get().scaffoldingLevel,
      // A freshly loaded array is not an AI challenge unless the caller
      // opts back in via setActiveChallengeType right after this call.
      activeChallengeType: null,
    })
    scheduleNarrationAutoAdvance(get)
  },

  toggleFocusMode: () => set((state) => ({ focusModeActive: !state.focusModeActive })),

  addXP: (amount) => {
    if (amount < 0) return
    set((state) => ({ sessionXP: state.sessionXP + amount }))
  },

  setPlaybackSpeed: (speed) => {
    const clamped = Math.min(MAX_PLAYBACK_SPEED, Math.max(MIN_PLAYBACK_SPEED, speed))
    set({ playbackSpeed: clamped })
  },

  // Before a run starts (step 0) the segment level follows immediately, so
  // the learner's real level - often loaded just after the algorithm - is
  // in force from the first junction; mid-run it waits for the boundary.
  setScaffoldingLevel: (level) =>
    set((state) => ({
      scaffoldingLevel: level,
      segmentScaffoldingLevel: state.stepIndex === 0 ? level : state.segmentScaffoldingLevel,
    })),

  setScaffoldingReasoning: (reasoning) => set({ scaffoldingReasoning: reasoning }),

  setSessionId: (id) => set({ sessionId: id, selfExplanationsOffered: 0, challengesStarted: 0 }),

  setUserId: (id) => set({ userId: id }),

  startPlayback: () => {
    clearPlaybackInterval()
    // Playback's own interval drives stepping at the chosen speed - a
    // narration auto-advance left pending from manual stepping just
    // before Play was pressed must not also fire and cause a double-step.
    clearAutoAdvanceTimer()
    set({ isPlaying: true })

    const { playbackSpeed } = get()
    playbackInterval = setInterval(() => {
      const { stepIndex, snapshotArray, mode } = get()
      const currentSnapshot = snapshotArray[stepIndex]

      // Stop at the final step regardless of mode.
      if (stepIndex >= snapshotArray.length - 1) {
        clearPlaybackInterval()
        set({ isPlaying: false })
        return
      }

      // PRACTICE and HANDS_ON only: pause at prediction steps so the
      // learner can answer (PredictionZone's own visibility condition is
      // the same PRACTICE-or-HANDS_ON check, mirrored here). DEMO mode
      // ignores isPredictionRequired entirely and plays straight through
      // to the final snapshot.
      const isInteractiveMode = mode === AlgorithmMode.PRACTICE || mode === AlgorithmMode.HANDS_ON
      if (isInteractiveMode && currentSnapshot && isLiveJunctionAt(get(), stepIndex)) {
        clearPlaybackInterval()
        set({ isPlaying: false })
        return
      }

      get().stepForward()
    }, 1000 / playbackSpeed)
  },

  stopPlayback: () => {
    clearPlaybackInterval()
    set({ isPlaying: false })
    scheduleNarrationAutoAdvance(get)
  },

  addMisconception: (category) => {
    set((state) => ({
      recentMisconceptions: [...state.recentMisconceptions, category].slice(-MAX_RECENT_MISCONCEPTIONS),
    }))
  },

  setChallengeExplanation: (explanation) => set({ currentChallengeExplanation: explanation }),

  setChallengeHint: (hint) => set({ challengeHint: hint }),

  setActiveChallengeType: (type) => set({ activeChallengeType: type }),

  recordPredictionResult: (correct, hintsRequestedForStep) => {
    set((state) => ({
      sessionTotalPredictions: state.sessionTotalPredictions + 1,
      sessionCorrectPredictions: state.sessionCorrectPredictions + (correct ? 1 : 0),
      sessionHintsRequested: state.sessionHintsRequested + hintsRequestedForStep,
    }))
  },

  toggleCodeEditorMode: () => set((state) => ({ codeEditorMode: !state.codeEditorMode })),

  noteSelfExplanationOffered: () => set((state) => ({ selfExplanationsOffered: state.selfExplanationsOffered + 1 })),

  noteChallengeStarted: () => set((state) => ({ challengesStarted: state.challengesStarted + 1 })),

  setFadingEnabled: (enabled) => {
    set({ fadingEnabled: enabled })
    scheduleNarrationAutoAdvance(get)
  },
}))

export const selectCurrentSnapshot = (state: AlgorithmStoreState): AlgorithmSnapshot | null =>
  state.snapshotArray[state.stepIndex] ?? null

export const selectIsAtStart = (state: AlgorithmStoreState): boolean => state.stepIndex === 0

export const selectIsAtEnd = (state: AlgorithmStoreState): boolean =>
  state.stepIndex === state.snapshotArray.length - 1

export const selectProgressPercent = (state: AlgorithmStoreState): number => {
  if (state.snapshotArray.length < 2) return 0
  return Math.round((state.stepIndex / (state.snapshotArray.length - 1)) * 100)
}

export const selectIsPredictionStep = (state: AlgorithmStoreState): boolean =>
  state.mode === AlgorithmMode.PRACTICE && isLiveJunctionAt(state, state.stepIndex)

/** A junction the learner must answer now (worked steps excluded). */
export const selectIsLiveJunction = (state: AlgorithmStoreState): boolean => isLiveJunctionAt(state, state.stepIndex)

/** The current step is a worked demonstration in an interactive mode. */
export const selectIsWorkedStep = (state: AlgorithmStoreState): boolean =>
  (state.mode === AlgorithmMode.PRACTICE || state.mode === AlgorithmMode.HANDS_ON) &&
  isWorkedStepAt(state, state.stepIndex)
