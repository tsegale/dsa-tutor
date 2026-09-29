import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, clampToBase, panBy, viewBoxToString, zoomAt, zoomLevel } from './viewBoxZoom'

const base = { x: -50, y: -30, width: 400, height: 200 }

describe('canvas viewBox zoom (4A.4)', () => {
  it('keeps the point under the cursor fixed while zooming in', () => {
    const view = zoomAt(base, base, 2, 0.25, 0.5)
    expect(zoomLevel(base, view)).toBe(2)
    // The point a quarter across the base stays a quarter across the view.
    const before = base.x + 0.25 * base.width
    const after = view.x + 0.25 * view.width
    expect(after).toBeCloseTo(before)
  })

  it('never zooms out past fit-to-view, or in past MAX_ZOOM', () => {
    expect(zoomAt(base, base, 0.5, 0.5, 0.5)).toEqual(base)
    let view = base
    for (let i = 0; i < 40; i++) view = zoomAt(base, view, 1.5, 0.5, 0.5)
    expect(zoomLevel(base, view)).toBeCloseTo(MAX_ZOOM)
  })

  it('pans within the content and stops at its edges', () => {
    const zoomed = zoomAt(base, base, 2, 0.5, 0.5)
    const moved = panBy(base, zoomed, 20, 0)
    expect(moved.x).toBeCloseTo(zoomed.x - 20)
    const farLeft = panBy(base, zoomed, 10_000, 10_000)
    expect(farLeft.x).toBe(base.x)
    expect(farLeft.y).toBe(base.y)
    const farRight = panBy(base, zoomed, -10_000, -10_000)
    expect(farRight.x + farRight.width).toBeCloseTo(base.x + base.width)
    expect(farRight.y + farRight.height).toBeCloseTo(base.y + base.height)
  })

  it('leaves the fitted view where it is: there is nothing to pan to', () => {
    expect(clampToBase(base, { ...base, x: base.x + 30 })).toEqual(base)
    expect(viewBoxToString(base)).toBe('-50 -30 400 200')
  })
})
