import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import CanvasContainer from '@/components/canvas/CanvasContainer'
import TopBar, { OPEN_SHORTCUTS_MODAL_EVENT } from '@/components/layout/TopBar'
import LeftPanel from '@/components/layout/LeftPanel'
import RightPanel from '@/components/layout/RightPanel'
import FocusModeOverlay from '@/components/layout/FocusModeOverlay'
import KeyboardShortcutsModal from '@/components/layout/KeyboardShortcutsModal'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function AlgorithmPage() {
  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)

  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState(1)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)

  useEffect(() => {
    function handleOpen() {
      setShortcutsModalOpen(true)
    }
    window.addEventListener(OPEN_SHORTCUTS_MODAL_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_SHORTCUTS_MODAL_EVENT, handleOpen)
  }, [])

  useKeyboardShortcuts({
    onTabChange: setActiveTab,
    onShortcutsModalOpen: () => setShortcutsModalOpen(true),
  })

  function handlePredictionSubmit(answer: string) {
    // Temporary: Phase 9 wires this to the AI microservice for real
    // Socratic feedback instead of just logging the raw answer.
    console.log('Prediction submitted:', answer)
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
          <CanvasContainer onPredictionSubmit={handlePredictionSubmit} />
        </motion.div>
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
