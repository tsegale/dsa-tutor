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
      'Topics are organised into six tracks: Foundations, Sorting, Searching, Techniques, Trees and Graphs. Each card shows your mastery level as the ring fills up.',
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
    position: 'right',
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
      'Switch to Practice Mode and the algorithm pauses at Critical Junctions - the specific moments where the outcome actually depends on your understanding, not every single step. You must predict what happens before it continues. The lightbulb gives you a hint if you need one.',
    targetId: 'mode-toggle',
    position: 'bottom',
    requiresAlgorithmPage: true,
  },
  {
    id: 6,
    title: 'Hands-On Mode',
    description:
      'Hands-On Mode replaces tile selection with direct manipulation - drag the values you think should move. It is the same predictions, in a more physical form.',
    targetId: 'mode-toggle',
    position: 'bottom',
    requiresAlgorithmPage: true,
  },
  {
    id: 7,
    title: 'AI Tutor, Pseudocode and Complexity',
    description:
      'These tabs stay with you throughout: AI Tutor shows Socratic feedback on your last answer, Pseudocode highlights the exact line currently executing, and Complexity tracks the algorithm\'s time and space cost as it runs.',
    targetId: 'right-panel-tabs',
    position: 'left',
    requiresAlgorithmPage: true,
  },
  {
    id: 8,
    title: 'Your support level',
    description:
      'This shows how much scaffolding is currently active. As you answer correctly, support fades from Full toward Independent. If you struggle, it steps back up - this is adaptive, not a fixed difficulty.',
    targetId: 'scaffolding-fader',
    position: 'bottom',
    requiresAlgorithmPage: true,
  },
  {
    id: 9,
    title: 'AI Challenge and Feynman Mode',
    description:
      'AI Challenge generates an array specifically targeting your most common mistake. Feynman Mode asks you to explain the algorithm back in your own words - teaching it is the real test of understanding it.',
    targetId: 'ai-tools-section',
    position: 'right',
    requiresAlgorithmPage: true,
  },
  {
    id: 10,
    title: 'Code Mode',
    description:
      'Instead of picking a tile, write the actual code for a step yourself. It runs for real in your browser, so the result you see is exactly what your code does - bugs included.',
    targetId: 'code-mode-toggle',
    position: 'right',
    requiresAlgorithmPage: true,
  },
]
