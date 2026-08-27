import { create } from 'zustand'
import { AlgorithmMode, ScaffoldingLevel } from '@dsa-tutor/types'

interface AlgorithmStore {
  algorithmName: string
  stepIndex: number
  mode: AlgorithmMode
  scaffoldingLevel: ScaffoldingLevel
  sessionXP: number
  focusModeActive: boolean
  setStepIndex: (stepIndex: number) => void
  setMode: (mode: AlgorithmMode) => void
  addXP: (amount: number) => void
  toggleFocusMode: () => void
}

export const useAlgorithmStore = create<AlgorithmStore>((set) => ({
  algorithmName: 'bubble-sort',
  stepIndex: 0,
  mode: AlgorithmMode.DEMO,
  scaffoldingLevel: ScaffoldingLevel.HIGH,
  sessionXP: 0,
  focusModeActive: false,
  setStepIndex: (stepIndex) => set({ stepIndex }),
  setMode: (mode) => set({ mode }),
  addXP: (amount) => set((state) => ({ sessionXP: state.sessionXP + amount })),
  toggleFocusMode: () =>
    set((state) => ({ focusModeActive: !state.focusModeActive })),
}))
