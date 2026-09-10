import { useLayoutEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CanvasType } from '@dsa-tutor/types'
import type { AlgorithmSnapshot } from '@dsa-tutor/types'
import { useAlgorithmStore, selectCurrentSnapshot } from '@/store/useAlgorithmStore'
import ArrayCanvas from './ArrayCanvas'
import TreeCanvas from './TreeCanvas'
import GraphCanvas from './GraphCanvas'
import LinkedListCanvas from './LinkedListCanvas'
import StackCanvas from './StackCanvas'
import QueueCanvas from './QueueCanvas'
import HashTableCanvas from './HashTableCanvas'
import CallStackCanvas from './CallStackCanvas'

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
  const { algorithmName: algorithmSlug } = useParams<{ algorithmName: string }>()
  const snapshot = useAlgorithmStore(selectCurrentSnapshot)

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 480 })

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

  // Every pre-Foundations engine (sorting, search, BST, BFS) predates
  // canvasType and never sets it on its snapshots, so this falls back
  // to the route slug for those - the same routing CanvasContainer
  // already used before canvasType existed. Once those engines are
  // updated to set canvasType directly, this fallback can be deleted.
  const canvasType: CanvasType =
    snapshot?.canvasType ??
    (algorithmSlug === 'bst' ? CanvasType.TREE : algorithmSlug === 'bfs' ? CanvasType.GRAPH : CanvasType.ARRAY)

  function renderCanvas() {
    switch (canvasType) {
      case CanvasType.ARRAY:
      case CanvasType.TWO_POINTER:
      case CanvasType.SLIDING_WINDOW:
        return (
          <ArrayCanvas
            width={size.width}
            height={size.height}
            mistakePath={mistakePath}
            onMistakePathComplete={onMistakePathComplete}
            canvasType={canvasType}
            {...(mistakeLabel !== undefined ? { mistakeLabel } : {})}
          />
        )
      case CanvasType.LINKED_LIST:
        return <LinkedListCanvas width={size.width} height={size.height} />
      case CanvasType.STACK:
        return <StackCanvas width={size.width} height={size.height} />
      case CanvasType.QUEUE:
      case CanvasType.CIRCULAR_QUEUE:
        // Linear vs. circular vs. deque is read from the snapshot's own
        // dataStructureState.variant (the engine's source of truth),
        // not re-derived here - see QueueCanvas.
        return <QueueCanvas width={size.width} height={size.height} />
      case CanvasType.HASH_TABLE:
        return <HashTableCanvas width={size.width} height={size.height} />
      case CanvasType.CALL_STACK:
      case CanvasType.RECURSION_TREE:
        // RECURSION_TREE (branching call tree) has no dedicated canvas
        // yet - a future phase's addition. CallStackCanvas is a safe
        // fallback since it already renders the same CallStackState.
        return <CallStackCanvas width={size.width} height={size.height} />
      case CanvasType.TREE:
        return <TreeCanvas width={size.width} height={size.height} />
      case CanvasType.GRAPH:
        return <GraphCanvas width={size.width} height={size.height} />
      default:
        return (
          <ArrayCanvas
            width={size.width}
            height={size.height}
            mistakePath={mistakePath}
            onMistakePathComplete={onMistakePathComplete}
            {...(mistakeLabel !== undefined ? { mistakeLabel } : {})}
          />
        )
    }
  }

  return (
    <div
      id="algorithm-canvas"
      ref={containerRef}
      className="relative h-full w-full rounded-md border border-border bg-white shadow-sm dark:bg-dark-surface"
    >
      {renderCanvas()}
    </div>
  )
}
