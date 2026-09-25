import { useLayoutEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

// Tracks the on-screen bounds of the canvas area (marked with
// data-canvas-area in AlgorithmPage) so the cutout lines up with it,
// without AlgorithmPage needing to pass this component any props.
function useCanvasRect(active: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    if (!active) return
    const el = document.querySelector('[data-canvas-area]')
    if (!el) return

    const update = () => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [active])

  return rect
}

export default function FocusModeOverlay() {
  const focusModeActive = useAlgorithmStore((state) => state.focusModeActive)
  const toggleFocusMode = useAlgorithmStore((state) => state.toggleFocusMode)
  const rect = useCanvasRect(focusModeActive)

  return (
    <AnimatePresence>
      {focusModeActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeIn' }}
          className="fixed inset-0 z-10"
        >
          {rect ? (
            <div
              className="pointer-events-none absolute rounded-md border-2 border-white"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                boxShadow: '0 0 0 100vmax rgba(0,0,0,0.6)',
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-black/60" />
          )}

          <button
            type="button"
            onClick={toggleFocusMode}
            className="fixed top-4 right-4 z-[11] rounded-md bg-popover px-3 py-1.5 text-sm font-medium text-primary shadow-md"
          >
            Exit Focus Mode
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
