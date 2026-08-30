import { useLayoutEffect, useRef, useState } from 'react'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import ArrayCanvas from './ArrayCanvas'

interface CanvasContainerProps {
  onElementClick?: (index: number) => void
  selectedIndex?: number | null
}

export default function CanvasContainer({ onElementClick, selectedIndex = null }: CanvasContainerProps) {
  // Only Bubble Sort exists today (Phase 15 gates additional algorithms).
  // Future TreeCanvas/GraphCanvas types will branch on algorithmName here.
  useAlgorithmStore((state) => state.algorithmName)

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }

    // Measure synchronously on mount rather than waiting on the observer's
    // first callback, since ResizeObserver's initial-fire timing is not
    // consistent across every rendering environment.
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)

    // Belt-and-suspenders fallback: a plain window resize is a much more
    // universally reliable signal than ResizeObserver callbacks, and it's
    // exactly the case the "canvas resizes with the browser window"
    // requirement cares about.
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div
      id="algorithm-canvas"
      ref={containerRef}
      className="h-full w-full rounded-md border border-border bg-white shadow-sm dark:bg-dark-surface"
    >
      <ArrayCanvas
        width={size.width}
        height={size.height}
        onElementClick={onElementClick}
        selectedIndex={selectedIndex}
      />
    </div>
  )
}
