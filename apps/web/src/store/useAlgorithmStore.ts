import { create } from 'zustand'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { AlgorithmMode, ScaffoldingLevel } from '@dsa-tutor/types'
import { bubbleSortEngine } from '../engine/bubbleSort'

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
}

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

  stepForward: () => {
    const { stepIndex, snapshotArray, isPlaying } = get()
    if (stepIndex >= snapshotArray.length - 1) return

    const newStepIndex = stepIndex + 1
    const newSnapshot = snapshotArray[newStepIndex]
    set({
      stepIndex: newStepIndex,
      isPlaying: isPlaying && newSnapshot.isPredictionRequired ? false : isPlaying,
    })
  },

  stepBackward: () => {
    const { stepIndex } = get()
    if (stepIndex <= 0) return
    set({ stepIndex: stepIndex - 1 })
  },

  resetAlgorithm: () => {
    clearPlaybackInterval()
    set({ stepIndex: 0, isPlaying: false })
  },

  setMode: (mode) => {
    clearPlaybackInterval()
    set({ mode, stepIndex: 0, isPlaying: false })
  },

  setAlgorithm: (name, snapshots) => {
    clearPlaybackInterval()
    set({ algorithmName: name, snapshotArray: snapshots, stepIndex: 0, isPlaying: false })
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

  setScaffoldingLevel: (level) => set({ scaffoldingLevel: level }),

  setScaffoldingReasoning: (reasoning) => set({ scaffoldingReasoning: reasoning }),

  setSessionId: (id) => set({ sessionId: id }),

  setUserId: (id) => set({ userId: id }),

  startPlayback: () => {
    clearPlaybackInterval()
    set({ isPlaying: true })

    const { playbackSpeed } = get()
    playbackInterval = setInterval(() => {
      get().stepForward()

      const after = get()
      const currentSnapshot = after.snapshotArray[after.stepIndex]
      const reachedPredictionStep = currentSnapshot?.isPredictionRequired ?? false
      const reachedFinalStep = after.stepIndex === after.snapshotArray.length - 1

      if (reachedPredictionStep || reachedFinalStep) {
        clearPlaybackInterval()
        set({ isPlaying: false })
      }
    }, 1000 / playbackSpeed)
  },

  stopPlayback: () => {
    clearPlaybackInterval()
    set({ isPlaying: false })
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

export const selectIsPredictionStep = (state: AlgorithmStoreState): boolean => {
  const snapshot = selectCurrentSnapshot(state)
  return snapshot !== null && snapshot.isPredictionRequired && state.mode === AlgorithmMode.PRACTICE
}
