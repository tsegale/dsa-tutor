import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlgorithmMode, ScaffoldingLevel } from '@dsa-tutor/types'
import type { AlgorithmSnapshot, AlgorithmTopicDTO } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { useAuth } from '@/context/AuthContext'
import { apiFetch } from '@/api/client'
import CanvasContainer from '@/components/canvas/CanvasContainer'
import TopBar, { OPEN_SHORTCUTS_MODAL_EVENT } from '@/components/layout/TopBar'
import LeftPanel from '@/components/layout/LeftPanel'
import RightPanel from '@/components/layout/RightPanel'
import FocusModeOverlay from '@/components/layout/FocusModeOverlay'
import KeyboardShortcutsModal from '@/components/layout/KeyboardShortcutsModal'
import PredictionZone, {
  SHOW_EXPLANATION_LINK_EVENT,
  type PredictionOutcomeDetail,
} from '@/components/prediction/PredictionZone'
import { SWITCH_TAB_PSEUDOCODE_EVENT } from '@/components/prediction/MistakeAnalysisToast'
import BadgeAwardModal from '@/components/ui/BadgeAwardModal'
import StreakToast from '@/components/ui/StreakToast'
import ScaffoldingTransitionToast from '@/components/ui/ScaffoldingTransitionToast'
import FeynmanModal from '@/components/feynman/FeynmanModal'
import ChallengeHintBanner from '@/components/challenge/ChallengeHintBanner'
import { checkAndAwardBadges } from '@/services/badgeService'
import type { BadgeCheckStats } from '@/data/badges'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { calculateMastery, type MasteryMetrics } from '@/utils/masteryScore'
import { computeMistakePath } from '@/engine/mistakePath'
import { cn } from '@/lib/utils'

const SCAFFOLDING_LEVEL_ORDER: ScaffoldingLevel[] = [
  ScaffoldingLevel.HIGH,
  ScaffoldingLevel.MEDIUM,
  ScaffoldingLevel.LOW,
  ScaffoldingLevel.NONE,
]

const TRANSITION_MESSAGES: Record<string, string> = {
  HIGH_to_MEDIUM: 'Good progress. We are reducing hints as your understanding grows.',
  MEDIUM_to_LOW: 'Strong performance. You are now working more independently.',
  LOW_to_NONE: 'Excellent, you have demonstrated mastery. Full autonomy mode active.',
  MEDIUM_to_HIGH: 'No worries, we are adding more support to help you through this section.',
  LOW_to_MEDIUM: 'We are adding some support back for this section.',
  NONE_to_LOW: 'Bringing back some guidance for the next section.',
}

function getTransitionMessage(from: ScaffoldingLevel, to: ScaffoldingLevel): string {
  const direct = TRANSITION_MESSAGES[`${from}_to_${to}`]
  if (direct) return direct

  const raisingSupport = SCAFFOLDING_LEVEL_ORDER.indexOf(to) < SCAFFOLDING_LEVEL_ORDER.indexOf(from)
  return raisingSupport
    ? `We are adding more support back, moving to ${to} scaffolding.`
    : `Great work, moving to ${to} scaffolding as your understanding grows.`
}

const INITIAL_MASTERY_METRICS: MasteryMetrics = {
  totalPredictions: 0,
  correctPredictions: 0,
  conceptualCorrect: 0,
  conceptualTotal: 0,
  proceduralCorrect: 0,
  proceduralTotal: 0,
  hintsRequested: 0,
  consecutiveCorrect: 0,
}

// Bubble Sort is the only algorithm with a real snapshot engine until
// Phase 15; every other seeded topic renders a "coming soon" canvas.
const IMPLEMENTED_ALGORITHM_NAME = 'bubble-sort'

export default function AlgorithmPage() {
  const { algorithmName: algorithmNameParam } = useParams<{ algorithmName: string }>()
  const [searchParams] = useSearchParams()
  const isBubbleSort = algorithmNameParam === IMPLEMENTED_ALGORITHM_NAME

  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)
  const algorithmName = useAlgorithmStore((state) => state.algorithmName)
  const snapshotArray = useAlgorithmStore((state) => state.snapshotArray)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const setMode = useAlgorithmStore((state) => state.setMode)
  const setSessionId = useAlgorithmStore((state) => state.setSessionId)
  const mode = useAlgorithmStore((state) => state.mode)
  const isPlaying = useAlgorithmStore((state) => state.isPlaying)
  const sessionId = useAlgorithmStore((state) => state.sessionId)
  const setScaffoldingLevel = useAlgorithmStore((state) => state.setScaffoldingLevel)
  const setScaffoldingReasoning = useAlgorithmStore((state) => state.setScaffoldingReasoning)
  const { user, refreshUser } = useAuth()
  const { play } = useSoundEffects()
  const prefersReducedMotion = useReducedMotion()

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => apiFetch<AlgorithmTopicDTO[]>('/api/v1/topics'),
  })
  const currentTopic = topics.find((t) => t.name === algorithmNameParam) ?? null

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState(1)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [pendingBadge, setPendingBadge] = useState<string | null>(null)
  const [streakToastVisible, setStreakToastVisible] = useState(false)
  const [streakCountForToast, setStreakCountForToast] = useState(0)
  const [masteryMetrics, setMasteryMetrics] = useState<MasteryMetrics>(INITIAL_MASTERY_METRICS)
  const [scaffoldingTransitionMessage, setScaffoldingTransitionMessage] = useState<string | null>(null)
  const [explanationLinkVisible, setExplanationLinkVisible] = useState(false)
  const [mistakePath, setMistakePath] = useState<AlgorithmSnapshot[] | null>(null)
  const [mistakeLabel, setMistakeLabel] = useState<string | undefined>(undefined)
  const [showFeynman, setShowFeynman] = useState(false)

  // Guards against re-triggering the modal every time the learner steps
  // back to the final step and forward again within the same practice
  // run. Reset when a fresh run starts (stepIndex back to 0) so a genuine
  // new completion can trigger it again.
  const feynmanShownRef = useRef(false)

  // Guards against re-awarding the AI Challenge completion bonus every
  // time the learner steps back to the final step and forward again.
  // Reset alongside feynmanShownRef when a fresh run starts.
  const challengeXpAwardedRef = useRef(false)

  // Cumulative, session-scoped counters feeding badge condition checks.
  // Refs (not state) because nothing here needs to trigger a re-render.
  const predictionStatsRef = useRef({ correct: 0, total: 0, hints: 0 })

  function buildBadgeStats(): BadgeCheckStats {
    const { correct, total, hints } = predictionStatsRef.current
    return {
      // No badge currently keys off lifetime session count; the API
      // has no endpoint to fetch it yet, so this is a harmless stub.
      totalSessions: 0,
      correctPredictions: correct,
      totalPredictions: total,
      hintsRequested: hints,
      streakCount: user?.streakCount ?? 0,
      masteredTopics: topics.filter((t) => t.masteryPercent >= 80).length,
      // Phase 16 will add algorithms beyond Bubble Sort; these stay
      // false until a track can actually be completed.
      completedSortingTrack: false,
      completedGraphsTrack: false,
    }
  }

  function runBadgeCheck() {
    void checkAndAwardBadges(buildBadgeStats(), (badgeId) => setPendingBadge(badgeId))
  }

  function handleHintRequested() {
    predictionStatsRef.current.hints += 1
  }

  function handlePredictionResult(detail: PredictionOutcomeDetail) {
    predictionStatsRef.current.total += 1
    useAlgorithmStore.getState().recordPredictionResult(detail.correct, detail.hintsRequestedForStep)
    if (detail.correct) {
      predictionStatsRef.current.correct += 1
      runBadgeCheck()
    } else {
      const snapshotAtSubmission = useAlgorithmStore.getState().snapshotArray[detail.stepIndex]
      if (detail.isCodeEval) {
        // Code Editor Mode drives the canvas only via codeEvalBuggyState (or
        // not at all, e.g. a syntax error) - never via the tile-flow's
        // computeMistakePath, which would misread the submitted code text
        // as a "swap"/"no-swap" tile answer.
        if (detail.codeEvalBuggyState && snapshotAtSubmission) {
          const { resultingState, activeIndices } = detail.codeEvalBuggyState
          setMistakeLabel('Your code produced this...')
          setMistakePath([
            {
              ...snapshotAtSubmission,
              dataStructureState: resultingState,
              activeIndices,
              comparedIndices: activeIndices,
              swappedIndices: [],
              isPredictionRequired: false,
              criticalJunctionType: null,
              junctionDifficulty: null,
              isFinalStep: false,
              description: `Your code produced [${resultingState.join(', ')}].`,
            },
          ])
        } else {
          setMistakeLabel(undefined)
          setMistakePath(null)
        }
      } else {
        const path = snapshotAtSubmission ? computeMistakePath(snapshotAtSubmission, detail.predictionSubmitted) : []
        setMistakeLabel(undefined)
        setMistakePath(path.length > 0 ? path : null)
      }
      if (detail.misconceptionCategory) {
        useAlgorithmStore.getState().addMisconception(detail.misconceptionCategory)
      }
    }

    const isConceptual = detail.junctionDifficulty === 'CONCEPTUAL'
    const nextMetrics: MasteryMetrics = {
      totalPredictions: masteryMetrics.totalPredictions + 1,
      correctPredictions: masteryMetrics.correctPredictions + (detail.correct ? 1 : 0),
      conceptualTotal: masteryMetrics.conceptualTotal + (isConceptual ? 1 : 0),
      conceptualCorrect: masteryMetrics.conceptualCorrect + (isConceptual && detail.correct ? 1 : 0),
      proceduralTotal: masteryMetrics.proceduralTotal + (isConceptual ? 0 : 1),
      proceduralCorrect: masteryMetrics.proceduralCorrect + (!isConceptual && detail.correct ? 1 : 0),
      hintsRequested: masteryMetrics.hintsRequested + detail.hintsRequestedForStep,
      consecutiveCorrect: detail.correct ? masteryMetrics.consecutiveCorrect + 1 : 0,
    }
    setMasteryMetrics(nextMetrics)

    const assessment = calculateMastery(nextMetrics)
    const currentLevel = useAlgorithmStore.getState().scaffoldingLevel
    setScaffoldingReasoning(assessment.reasoning)

    if (sessionId) {
      apiFetch('/api/v1/interactions', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          stepIndex: detail.stepIndex,
          predictionSubmitted: detail.predictionSubmitted,
          predictionCorrect: detail.correct,
          misconceptionCategory: detail.misconceptionCategory,
          hintsRequested: detail.hintsRequestedForStep,
          timeSpentSeconds: detail.timeSpentSeconds,
          criticalJunctionType: detail.junctionType,
          junctionDifficulty: detail.junctionDifficulty,
          scaffoldingLevelAtTime: currentLevel,
          masteryScoreAtTime: assessment.overallScore,
        }),
      }).catch(() => {
        // Interaction logging is best-effort; it must never block the
        // learner's practice flow if the backend is unreachable.
      })
    }

    if (assessment.recommendedLevel !== currentLevel) {
      setScaffoldingLevel(assessment.recommendedLevel)
      setScaffoldingTransitionMessage(getTransitionMessage(currentLevel, assessment.recommendedLevel))

      if (sessionId) {
        apiFetch(`/api/v1/sessions/${sessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ scaffoldingLevel: assessment.recommendedLevel }),
        }).catch(() => {
          // Best-effort: the local scaffolding level already reflects the
          // transition regardless of whether persistence lands.
        })
      }
    }
  }

  function handleBadgeModalClose() {
    setPendingBadge(null)
    runBadgeCheck()
  }

  useEffect(() => {
    function handleOpen() {
      setShortcutsModalOpen(true)
    }
    window.addEventListener(OPEN_SHORTCUTS_MODAL_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_SHORTCUTS_MODAL_EVENT, handleOpen)
  }, [])

  useEffect(() => {
    function handleSwitchTab() {
      setActiveTab(2)
    }
    window.addEventListener(SWITCH_TAB_PSEUDOCODE_EVENT, handleSwitchTab)
    return () => window.removeEventListener(SWITCH_TAB_PSEUDOCODE_EVENT, handleSwitchTab)
  }, [])

  // NONE scaffolding: after the prediction zone auto-advances past a
  // step the learner missed twice, offer a brief link into the
  // explanation tab instead of any further elaboration inline.
  useEffect(() => {
    function handleShowExplanationLink() {
      setExplanationLinkVisible(true)
    }
    window.addEventListener(SHOW_EXPLANATION_LINK_EVENT, handleShowExplanationLink)
    return () => window.removeEventListener(SHOW_EXPLANATION_LINK_EVENT, handleShowExplanationLink)
  }, [])

  useEffect(() => {
    setExplanationLinkVisible(false)
  }, [stepIndex])

  useEffect(() => {
    setMistakePath(null)
  }, [stepIndex])

  useEffect(() => {
    if (stepIndex === 0) {
      feynmanShownRef.current = false
      challengeXpAwardedRef.current = false
    }
  }, [stepIndex])

  // AI Challenge completion bonus: award once per run when the learner
  // finishes a full sort in Practice Mode on an AI-generated array.
  useEffect(() => {
    const snapshot = useAlgorithmStore.getState().snapshotArray[stepIndex]
    const { activeChallengeType } = useAlgorithmStore.getState()
    if (!snapshot?.isFinalStep || mode !== AlgorithmMode.PRACTICE || !activeChallengeType || challengeXpAwardedRef.current) {
      return
    }
    challengeXpAwardedRef.current = true
    const { addXP } = useAlgorithmStore.getState()
    addXP(10)
    play('xp')
    apiFetch('/api/v1/auth/xp', { method: 'POST', body: JSON.stringify({ amount: 10 }) }).catch(() => {
      // XP persistence is best-effort; the local session total already
      // reflects the award regardless of whether it lands server-side.
    })
  }, [stepIndex, mode, play])

  // Feynman Technique mode: when the learner completes a full run in
  // Practice Mode, give the completion animation a beat to finish, then
  // ask them to explain the algorithm back. Never triggers in Demo Mode.
  useEffect(() => {
    const snapshot = useAlgorithmStore.getState().snapshotArray[stepIndex]
    if (!snapshot?.isFinalStep || mode !== AlgorithmMode.PRACTICE || showFeynman || feynmanShownRef.current) return

    const timer = setTimeout(() => {
      feynmanShownRef.current = true
      setShowFeynman(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [stepIndex, mode, showFeynman])

  function openExplanationTab() {
    setExplanationLinkVisible(false)
    setRightCollapsed(false)
    setActiveTab(1)
  }

  // Seed the starting mode from the URL once, on mount. ModeToggle owns
  // in-page switching after this; it never touches the URL, so there's
  // no risk of this effect fighting a manual toggle.
  useEffect(() => {
    const modeParam = searchParams.get('mode')
    setMode(modeParam === 'PRACTICE' ? AlgorithmMode.PRACTICE : AlgorithmMode.DEMO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the breadcrumb in sync with the resolved topic's real display
  // name, without touching the snapshot engine's array/step state.
  useEffect(() => {
    if (currentTopic) {
      useAlgorithmStore.setState({ algorithmName: currentTopic.displayName })
    }
  }, [currentTopic])

  // Create a database-backed session on mount and close it out on
  // unmount. Best-effort: a failure here shouldn't block the local
  // Zustand-driven practice flow, only the persisted history of it.
  // Only Bubble Sort has real content worth logging a session for.
  useEffect(() => {
    let cancelled = false

    async function createDbSession() {
      if (!isBubbleSort || !currentTopic) return
      const streakBefore = user?.streakCount ?? 0
      try {
        const { mode, scaffoldingLevel } = useAlgorithmStore.getState()
        const session = await apiFetch<{ id: string }>('/api/v1/sessions', {
          method: 'POST',
          body: JSON.stringify({ algorithmTopicId: currentTopic.id, mode, scaffoldingLevel }),
        })
        if (!cancelled) setSessionId(session.id)

        // The session POST bumps the streak server-side; refetch the
        // profile to see whether it actually went up before celebrating.
        const refreshed = await refreshUser()
        if (!cancelled && refreshed && refreshed.streakCount > streakBefore) {
          setStreakCountForToast(refreshed.streakCount)
          setStreakToastVisible(true)
          play('levelup')
        }
      } catch {
        // No backend session this run; interaction logging will simply
        // no-op since sessionId stays null.
      }
    }

    void createDbSession()

    return () => {
      cancelled = true
      const activeSessionId = useAlgorithmStore.getState().sessionId
      if (activeSessionId) {
        apiFetch(`/api/v1/sessions/${activeSessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ endTime: new Date().toISOString(), completed: true }),
        }).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBubbleSort, currentTopic, setSessionId])

  useKeyboardShortcuts({
    onTabChange: setActiveTab,
    onShortcutsModalOpen: () => setShortcutsModalOpen(true),
  })

  function handlePredictionSubmit(answer: string) {
    // PredictionZone owns the actual submission flow (API call, XP,
    // stepForward); this is just a notification hook for the page level.
    void answer
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '56px 1fr',
        gridTemplateColumns: 'auto 1fr auto',
        gridTemplateAreas: "'topbar topbar topbar' 'left canvas right'",
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <div style={{ gridArea: 'topbar' }}>
        <TopBar />
      </div>

      <motion.div
        style={{ gridArea: 'left' }}
        animate={{ opacity: focusModeActive ? 0.1 : 1 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <LeftPanel
          collapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed((c) => !c)}
          difficulty={currentTopic?.difficulty ?? 'BEGINNER'}
        />
      </motion.div>

      <div style={{ gridArea: 'canvas', overflow: 'hidden', position: 'relative' }} data-canvas-area>
        {isBubbleSort ? (
          <>
            <motion.div
              animate={{ scale: focusModeActive ? 1.02 : 1 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex h-full w-full items-center justify-center p-4"
            >
              <div
                className={cn(
                  'h-full w-full rounded-[12px]',
                  isPlaying && mode === AlgorithmMode.DEMO && !prefersReducedMotion && 'canvas-pulse-border',
                )}
              >
                <CanvasContainer
                  mistakePath={mistakePath}
                  onMistakePathComplete={() => setMistakePath(null)}
                  mistakeLabel={mistakeLabel}
                />
              </div>
            </motion.div>

            <PredictionZone
              onSubmit={handlePredictionSubmit}
              onHintRequested={handleHintRequested}
              onPredictionResult={handlePredictionResult}
            />

            <ChallengeHintBanner />

            {focusModeActive && (
              <div className="absolute right-4 bottom-4 z-20 rounded-full bg-active px-3 py-1.5 text-xs font-medium text-white shadow-md">
                Focus Mode
              </div>
            )}

            {explanationLinkVisible && (
              <button
                type="button"
                onClick={openExplanationTab}
                className="absolute bottom-4 left-4 z-20 rounded-full border border-primary bg-white px-3 py-1.5 text-xs font-medium text-primary shadow-md dark:bg-dark-surface"
              >
                Explanation available
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-lg font-semibold text-text-primary">
              {currentTopic?.displayName ?? algorithmNameParam} coming soon
            </span>
            <span className="text-sm text-text-muted">
              This algorithm hasn't been built yet. Bubble Sort is the only one available right now.
            </span>
          </div>
        )}
      </div>

      <motion.div
        style={{ gridArea: 'right' }}
        animate={{ opacity: focusModeActive ? 0.1 : 1 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <RightPanel
          collapsed={rightCollapsed}
          onToggle={() => setRightCollapsed((c) => !c)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </motion.div>

      <FocusModeOverlay />
      <KeyboardShortcutsModal open={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} />
      <BadgeAwardModal badgeId={pendingBadge} onClose={handleBadgeModalClose} />
      <StreakToast
        streakCount={streakCountForToast}
        visible={streakToastVisible}
        onDismiss={() => setStreakToastVisible(false)}
      />
      <ScaffoldingTransitionToast
        message={scaffoldingTransitionMessage}
        onDismiss={() => setScaffoldingTransitionMessage(null)}
      />
      {showFeynman && sessionId && (
        <FeynmanModal
          algorithmName={algorithmName}
          completionContext={`You just completed a full ${algorithmName} sort on the array [${
            (snapshotArray[0]?.dataStructureState as number[] | undefined)?.join(', ') ?? ''
          }]`}
          sessionId={sessionId}
          onClose={() => setShowFeynman(false)}
        />
      )}
    </div>
  )
}
