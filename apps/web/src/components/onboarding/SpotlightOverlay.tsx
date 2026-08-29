import { useEffect, useState, type RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface SpotlightOverlayProps {
  targetRef: RefObject<HTMLElement | null>
  padding?: number
  visible: boolean
  onDismiss?: () => void
  children?: React.ReactNode
}

interface CutoutRect {
  x: number
  y: number
  width: number
  height: number
}

export default function SpotlightOverlay({
  targetRef,
  padding = 8,
  visible,
  onDismiss,
  children,
}: SpotlightOverlayProps) {
  const [cutout, setCutout] = useState<CutoutRect | null>(null)

  useEffect(() => {
    function measure() {
      const el = targetRef.current
      if (!el) {
        setCutout(null)
        return
      }
      const rect = el.getBoundingClientRect()
      setCutout({
        x: rect.left - padding,
        y: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      })
    }

    measure()
    window.addEventListener('resize', measure)

    const el = targetRef.current
    const observer = el ? new ResizeObserver(measure) : null
    if (el && observer) observer.observe(el)

    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [targetRef, padding])

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!onDismiss) return
    if (!cutout) {
      onDismiss()
      return
    }
    const { clientX, clientY } = event
    const insideCutout =
      clientX >= cutout.x &&
      clientX <= cutout.x + cutout.width &&
      clientY >= cutout.y &&
      clientY <= cutout.y + cutout.height
    if (!insideCutout) onDismiss()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClick}
          className="fixed inset-0 z-50"
        >
          <svg className="absolute inset-0 h-full w-full">
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {cutout && (
                  <rect
                    x={cutout.x}
                    y={cutout.y}
                    width={cutout.width}
                    height={cutout.height}
                    rx={8}
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#spotlight-mask)" />
          </svg>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
