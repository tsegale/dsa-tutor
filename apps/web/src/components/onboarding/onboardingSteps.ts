export interface OnboardingStep {
  id: number
  title: string
  description: string
  targetId: string
  position: 'top' | 'bottom' | 'left' | 'right'
  requiresAlgorithmPage: boolean
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to DSA Tutor',
    description:
      'This platform teaches Data Structures and Algorithms by making you predict what happens at each step - not just watch. You learn by doing, not observing.',
    targetId: 'dashboard-stats-banner',
    position: 'bottom',
    requiresAlgorithmPage: false,
  },
  {
    id: 2,
    title: 'Your curriculum',
    description:
      'Topics are organised into four tracks. Start with Foundations and Sorting - they unlock the rest. Each card shows your mastery level as the ring fills up.',
    targetId: 'curriculum-sidebar',
    position: 'right',
    requiresAlgorithmPage: false,
  },
  {
    id: 3,
    title: 'The algorithm canvas',
    description:
      'This is where the algorithm runs. Each bar represents an array element - its height is its value. Watch how elements move as the algorithm executes step by step.',
    targetId: 'algorithm-canvas',
    position: 'bottom',
    requiresAlgorithmPage: true,
  },
  {
    id: 4,
    title: 'Playback controls',
    description:
      'Use these to move through the algorithm at your own pace. Step forward, step backward, or play it through automatically. You can also type your own array to visualise.',
    targetId: 'left-panel',
    position: 'right',
    requiresAlgorithmPage: true,
  },
  {
    id: 5,
    title: 'Practice Mode - predict to proceed',
    description:
      'Switch to Practice Mode and the algorithm pauses at every decision point. You must predict what happens next before it continues. The lightbulb gives you a hint if you need one.',
    targetId: 'mode-toggle',
    position: 'bottom',
    requiresAlgorithmPage: true,
  },
]
