// Canvas zoom and pan as a pure viewBox transform (Week 4, 4A.4). The
// engines and layouts never see it: the canvas computes its content-fitted
// base viewBox as before, and this only narrows or shifts the window onto it.

export interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

/** Zoom is bounded relative to the fitted view: 1 is fit-to-view. */
export const MIN_ZOOM = 1
export const MAX_ZOOM = 6

export function viewBoxToString(v: ViewBox): string {
  return `${v.x} ${v.y} ${v.width} ${v.height}`
}

/** The zoom level of `view` relative to the fitted `base`. */
export function zoomLevel(base: ViewBox, view: ViewBox): number {
  return base.width / view.width
}

/**
 * Zooms `view` by `factor` (above 1 zooms in) about a point given as a
 * fraction of the view (0..1 on each axis), so the point under the cursor
 * stays under the cursor. The result is clamped to MIN_ZOOM..MAX_ZOOM of the
 * base and kept over the content.
 */
export function zoomAt(base: ViewBox, view: ViewBox, factor: number, fx: number, fy: number): ViewBox {
  const level = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel(base, view) * factor))
  const width = base.width / level
  const height = base.height / level
  const px = view.x + fx * view.width
  const py = view.y + fy * view.height
  return clampToBase(base, { x: px - fx * width, y: py - fy * height, width, height })
}

/** Shifts `view` by a drag of (dx, dy) in view units, kept over the content. */
export function panBy(base: ViewBox, view: ViewBox, dx: number, dy: number): ViewBox {
  return clampToBase(base, { ...view, x: view.x - dx, y: view.y - dy })
}

/** Keeps a zoomed-in window inside the fitted content, so the tree or graph can never be panned out of sight. */
export function clampToBase(base: ViewBox, view: ViewBox): ViewBox {
  const x = Math.min(Math.max(view.x, base.x), base.x + base.width - view.width)
  const y = Math.min(Math.max(view.y, base.y), base.y + base.height - view.height)
  return { ...view, x, y }
}
