import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
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

export default function AlgorithmPage() {
  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)
  const stepIndex = useAlgorithmStore((state) => state.stepIndex)

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
