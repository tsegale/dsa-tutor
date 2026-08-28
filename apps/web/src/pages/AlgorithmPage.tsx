import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlgorithmMode } from '@dsa-tutor/types'
import type { AlgorithmTopicDTO } from '@dsa-tutor/types'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import { apiFetch } from '@/api/client'
import CanvasContainer from '@/components/canvas/CanvasContainer'
import TopBar, { OPEN_SHORTCUTS_MODAL_EVENT } from '@/components/layout/TopBar'
import LeftPanel from '@/components/layout/LeftPanel'
import RightPanel from '@/components/layout/RightPanel'
import FocusModeOverlay from '@/components/layout/FocusModeOverlay'
import KeyboardShortcutsModal from '@/components/layout/KeyboardShortcutsModal'
import PredictionZone, {
  CANVAS_ELEMENT_SELECTED_EVENT,
  CLEAR_CANVAS_SELECTION_EVENT,
} from '@/components/prediction/PredictionZone'
import { SWITCH_TAB_PSEUDOCODE_EVENT } from '@/components/prediction/MistakeAnalysisToast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

// Bubble Sort is the only algorithm with a real snapshot engine until
// Phase 15; every other seeded topic renders a "coming soon" canvas.
const IMPLEMENTED_ALGORITHM_NAME = 'bubble-sort'

export default function AlgorithmPage() {
  const { algorithmName: algorithmNameParam } = useParams<{ algorithmName: string }>()
  const [searchParams] = useSearchParams()
  const isBubbleSort = algorithmNameParam === IMPLEMENTED_ALGORITHM_NAME

  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const setMode = useAlgorithmStore((state) => state.setMode)
  const setSessionId = useAlgorithmStore((state) => state.setSessionId)

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: () => apiFetch<AlgorithmTopicDTO[]>('/api/v1/topics'),
  })
  const currentTopic = topics.find((t) => t.name === algorithmNameParam) ?? null

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState(1)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [canvasSelectedIndex, setCanvasSelectedIndex] = useState<number | null>(null)

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

  // Clear the canvas selection ring whenever the algorithm advances to a
  // new step, so a stale ring doesn't linger on the next prediction.
  useEffect(() => {
    setCanvasSelectedIndex(null)
  }, [stepIndex])

  // Also clear it when PredictionZone resets after an incorrect answer
  // (same step, but the learner should pick fresh).
  useEffect(() => {
    function handleClear() {
      setCanvasSelectedIndex(null)
    }
    window.addEventListener(CLEAR_CANVAS_SELECTION_EVENT, handleClear)
    return () => window.removeEventListener(CLEAR_CANVAS_SELECTION_EVENT, handleClear)
  }, [])

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
      try {
        const { mode, scaffoldingLevel } = useAlgorithmStore.getState()
        const session = await apiFetch<{ id: string }>('/api/v1/sessions', {
          method: 'POST',
          body: JSON.stringify({ algorithmTopicId: currentTopic.id, mode, scaffoldingLevel }),
        })
        if (!cancelled) setSessionId(session.id)
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
  }, [isBubbleSort, currentTopic, setSessionId])

  useKeyboardShortcuts({
    onTabChange: setActiveTab,
    onShortcutsModalOpen: () => setShortcutsModalOpen(true),
  })

  function handleElementClick(index: number) {
    setCanvasSelectedIndex(index)
    window.dispatchEvent(new CustomEvent(CANVAS_ELEMENT_SELECTED_EVENT, { detail: index }))
  }

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
        <LeftPanel collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((c) => !c)} />
      </motion.div>

      <div style={{ gridArea: 'canvas', overflow: 'hidden', position: 'relative' }} data-canvas-area>
        {isBubbleSort ? (
          <>
            <motion.div
              animate={{ scale: focusModeActive ? 1.02 : 1 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex h-full w-full items-center justify-center p-4"
            >
              <CanvasContainer onElementClick={handleElementClick} selectedIndex={canvasSelectedIndex} />
            </motion.div>

            <PredictionZone onSubmit={handlePredictionSubmit} />
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
    </div>
  )
}
