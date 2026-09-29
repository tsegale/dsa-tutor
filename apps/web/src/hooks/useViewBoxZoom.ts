import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ViewBox, clampToBase, panBy, viewBoxToString, zoomAt, zoomLevel } from '@/utils/viewBoxZoom'

/** Pointer travel, in pixels, before a press becomes a pan rather than a click on a node. */
const DRAG_THRESHOLD_PX = 4
const WHEEL_STEP = 1.15

/**
 * The view is held relative to the base (zoom level plus the centre as a
 * fraction of the base), so a tree that grows between steps keeps the
 * student's zoom instead of snapping back or drifting off its content.
 */
interface RelativeView {
  level: number
  cx: number
  cy: number
}

const FIT: RelativeView = { level: 1, cx: 0.5, cy: 0.5 }

function toAbsolute(base: ViewBox, rel: RelativeView): ViewBox {
  const width = base.width / rel.level
  const height = base.height / rel.level
  return clampToBase(base, {
    x: base.x + rel.cx * base.width - width / 2,
    y: base.y + rel.cy * base.height - height / 2,
    width,
    height,
  })
}

function toRelative(base: ViewBox, view: ViewBox): RelativeView {
  return {
    level: zoomLevel(base, view),
    cx: (view.x + view.width / 2 - base.x) / base.width,
    cy: (view.y + view.height / 2 - base.y) / base.height,
  }
}

/**
 * Wheel zoom and drag pan for an <svg> with a content-fitted viewBox.
 * Attach `svgRef` to the svg and spread `viewBox` onto it; `fit` restores
 * the fitted view. Clicks on nodes still work: a press only pans once it
 * has moved past DRAG_THRESHOLD_PX.
 */
export function useViewBoxZoom(base: ViewBox) {
  const [rel, setRel] = useState<RelativeView>(FIT)
  const [svg, setSvg] = useState<SVGSVGElement | null>(null)
  const baseRef = useRef(base)
  baseRef.current = base
  const view = useMemo(() => toAbsolute(base, rel), [base, rel])
  const viewRef = useRef(view)
  viewRef.current = view

  // Registered natively: React's onWheel is passive, so it cannot stop the
  // page from scrolling while the student zooms.
  useEffect(() => {
    if (!svg) return
    function onWheel(event: WheelEvent) {
      const ctm = svg!.getScreenCTM()
      if (!ctm) return
      event.preventDefault()
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse())
      const current = viewRef.current
      const fx = (point.x - current.x) / current.width
      const fy = (point.y - current.y) / current.height
      const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP
      setRel(toRelative(baseRef.current, zoomAt(baseRef.current, current, factor, fx, fy)))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [svg])

  const drag = useRef<{ id: number; x: number; y: number; panning: boolean } | null>(null)

  const onPointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, panning: false }
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.id !== event.pointerId) return
    const dxPx = event.clientX - d.x
    const dyPx = event.clientY - d.y
    if (!d.panning) {
      // Nothing to pan at fit-to-view: the whole content is already in sight.
      if (Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX || zoomLevel(baseRef.current, viewRef.current) <= 1) return
      d.panning = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const scale = event.currentTarget.getScreenCTM()?.a ?? 1
    d.x = event.clientX
    d.y = event.clientY
    setRel(toRelative(baseRef.current, panBy(baseRef.current, viewRef.current, dxPx / scale, dyPx / scale)))
  }, [])

  const onPointerUp = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current?.panning) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
  }, [])

  return {
    svgRef: setSvg,
    view,
    viewBox: viewBoxToString(view),
    zoomed: rel.level > 1,
    fit: () => setRel(FIT),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
