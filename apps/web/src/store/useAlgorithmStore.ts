import { create } from 'zustand'
import { Mode, ScaffoldingLevel } from '@dsa-tutor/types'

interface AlgorithmStore {
  algorithmName: string
  stepIndex: number
  mode: Mode
  scaffoldingLevel: ScaffoldingLevel
  sessionXP: number
  focusModeActive: boolean
  setStepIndex: (stepIndex: number) => void
  setMode: (mode: Mode) => void
  addXP: (amount: number) => void
  toggleFocusMode: () => void
}

export const useAlgorithmStore = create<AlgorithmStore>((set) => ({
  algorithmName: 'bubble-sort',
  stepIndex: 0,
  mode: Mode.DEMO,
  scaffoldingLevel: ScaffoldingLevel.HIGH,
  sessionXP: 0,
  focusModeActive: false,
  setStepIndex: (stepIndex) => set({ stepIndex }),
  setMode: (mode) => set({ mode }),
  addXP: (amount) => set((state) => ({ sessionXP: state.sessionXP + amount })),
  toggleFocusMode: () =>
    set((state) => ({ focusModeActive: !state.focusModeActive })),
}))
