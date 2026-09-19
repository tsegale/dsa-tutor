import { useEffect } from 'react'
import { create } from 'zustand'

const STORAGE_KEY = 'dsa-tutor-onboarding-complete'

interface OnboardingStoreState {
  showWelcomeModal: boolean
  showOnboarding: boolean
  completeOnboarding: () => void
  closeWelcomeModal: () => void
  startTour: () => void
}

// A Zustand store rather than local component state: the welcome modal
// (Dashboard), the "Take the tour" trigger (DashboardNav), and the
// walkthrough controller (mounted globally so it survives navigating
// from the dashboard to the algorithm page mid-tour) all need to react
// to the same onboarding state, not independent per-component copies.
export const useOnboardingStore = create<OnboardingStoreState>((set) => ({
  showWelcomeModal: false,
  showOnboarding: false,
  completeOnboarding: () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    set({ showOnboarding: false, showWelcomeModal: false })
  },
  closeWelcomeModal: () => set({ showWelcomeModal: false }),
  startTour: () => set({ showOnboarding: true }),
}))

// Module-level, not component-level: the localStorage check + 800ms
// delayed reveal must run once per page load, not once per component
// that calls this hook.
let hasScheduledInitialCheck = false

export function useOnboarding() {
  const state = useOnboardingStore()

  useEffect(() => {
    if (hasScheduledInitialCheck) return
    hasScheduledInitialCheck = true

    const complete = localStorage.getItem(STORAGE_KEY)
    if (!complete) {
      // Small delay so the page renders fully before the overlay appears.
      // Deliberately no cleanup/clearTimeout here: StrictMode's dev-only
      // double-invoke (mount -> cleanup -> mount) would cancel this timer
      // on the fake cleanup, and the module-level guard above then blocks
      // the second mount from rescheduling it - net result, it would
      // never fire. The store outlives any component, so an uncancelled
      // timer here is harmless even across a real unmount.
      setTimeout(() => useOnboardingStore.setState({ showWelcomeModal: true }), 800)
    }
  }, [])

  return state
}
