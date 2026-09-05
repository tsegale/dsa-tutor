import { useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import ArrayCanvas from './ArrayCanvas'
import TreeCanvas from './TreeCanvas'
import GraphCanvas from './GraphCanvas'

interface CanvasContainerProps {
  mistakePath?: AlgorithmSnapshot[] | null
  onMistakePathComplete?: () => void
  mistakeLabel?: string
}

export default function CanvasContainer({
  mistakePath = null,
  onMistakePathComplete,
  mistakeLabel,
}: CanvasContainerProps) {
  // BST is a tree (TreeCanvas) and BFS is a graph (GraphCanvas); every
  // other algorithm is a linear array (ArrayCanvas). Both placeholder
  // canvases render straight from the store's current snapshot and
  // don't yet support the mistake-path replay ArrayCanvas has.
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()

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
      className="relative h-full w-full rounded-md border border-border bg-white shadow-sm dark:bg-dark-surface"
    >
      {algorithmSlug === 'bst' ? (
        <TreeCanvas width={size.width} height={size.height} />
      ) : algorithmSlug === 'bfs' ? (
        <GraphCanvas width={size.width} height={size.height} />
      ) : (
        <ArrayCanvas
          width={size.width}
          height={size.height}
          mistakePath={mistakePath}
          onMistakePathComplete={onMistakePathComplete}
          {...(mistakeLabel !== undefined ? { mistakeLabel } : {})}
        />
      )}
    </div>
  )
}
