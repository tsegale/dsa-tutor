import { useLayoutEffect, useRef, useState } from 'react'
import { useAlgorithmStore } from '@/store/useAlgorithmStore'
import ArrayCanvas from './ArrayCanvas'

interface CanvasContainerProps {
  onPredictionSubmit?: (answer: string) => void
}

export default function CanvasContainer({ onPredictionSubmit }: CanvasContainerProps) {
  // Only Bubble Sort exists today (Phase 15 gates additional algorithms).
  // Future TreeCanvas/GraphCanvas types will branch on algorithmName here.
  useAlgorithmStore((state) => state.algorithmName)

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Measure synchronously on mount rather than waiting on the observer's
    // first callback, since ResizeObserver's initial-fire timing is not
    // consistent across every rendering environment.
    const rect = el.getBoundingClientRect()
    setSize({ width: rect.width, height: rect.height })

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleElementClick = (index: number) => {
    onPredictionSubmit?.(String(index))
  }

  return (
    <div
      ref={containerRef}
      className="aspect-video w-full rounded-md border border-border bg-white shadow-sm"
    >
      <ArrayCanvas width={size.width} height={size.height} onElementClick={handleElementClick} />
    </div>
  )
}
