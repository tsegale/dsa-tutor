import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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

// Bubble Sort is the only algorithm until Phase 15, so the session's
// topic is always this one seeded row - no topic picker exists yet.
const CURRENT_ALGORITHM_TOPIC_NAME = 'bubble-sort'

export default function AlgorithmPage() {
  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)
  const setSessionId = useAlgorithmStore((state) => state.setSessionId)

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

  // Create a database-backed session on mount and close it out on
  // unmount. Best-effort: a failure here shouldn't block the local
  // Zustand-driven practice flow, only the persisted history of it.
  useEffect(() => {
    let cancelled = false

    async function createDbSession() {
      try {
        const topics = await apiFetch<AlgorithmTopicDTO[]>('/api/v1/topics')
        const topic = topics.find((t) => t.name === CURRENT_ALGORITHM_TOPIC_NAME)
        if (!topic || cancelled) return

        const { mode, scaffoldingLevel } = useAlgorithmStore.getState()
        const session = await apiFetch<{ id: string }>('/api/v1/sessions', {
          method: 'POST',
          body: JSON.stringify({ algorithmTopicId: topic.id, mode, scaffoldingLevel }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        <motion.div
          animate={{ scale: focusModeActive ? 1.02 : 1 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex h-full w-full items-center justify-center p-4"
        >
          <CanvasContainer onElementClick={handleElementClick} selectedIndex={canvasSelectedIndex} />
        </motion.div>

        <PredictionZone onSubmit={handlePredictionSubmit} />
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
