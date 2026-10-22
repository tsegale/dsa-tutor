import { describe, expect, it } from 'vitest'
import { CANVAS_MIN_PX, canvasHeightFor, predictionPanelSize } from '@/utils/predictionPanelSize'

/** The workspace height on the laptops this is demonstrated on, once the
 *  header, breadcrumb and stage rail are out of the way. */
const WORKSPACES = [560, 640, 790, 900]

describe('the prediction panel never squeezes the canvas flat', () => {
  it('leaves the canvas a usable height in Code Mode, at every size', () => {
    // The defect: Code Mode pinned the panel at 70%, which left about 170px
    // on a 1080-tall window - the bars collapsed and the value labels
    // stacked onto the index labels.
    for (const height of WORKSPACES) {
      expect(canvasHeightFor(height, true), `${height}px workspace`).toBeGreaterThanOrEqual(CANVAS_MIN_PX)
    }
  })

  it('is what the old 70% could not do', () => {
    const old = (workspace: number) => workspace - workspace * 0.7 - 60
    expect(old(790)).toBeLessThan(CANVAS_MIN_PX)
    expect(canvasHeightFor(790, true)).toBeGreaterThan(old(790))
  })

  it('still gives Code Mode more room than a tile grid needs', () => {
    expect(predictionPanelSize(true).maxShare).toBeGreaterThan(0.5)
  })

  it('does not take more than a tile grid may', () => {
    // Tiles size to content between a floor and a ceiling; Code Mode must
    // not end up with a larger ceiling than that.
    expect(predictionPanelSize(true).maxShare).toBeLessThanOrEqual(predictionPanelSize(false).maxShare)
  })

  it('sizes within a range rather than always filling a fixed block', () => {
    for (const code of [true, false]) {
      const { className } = predictionPanelSize(code)
      expect(className, String(code)).toMatch(/min-h-\[\d+%\]/)
      expect(className, String(code)).toMatch(/max-h-\[\d+%\]/)
      // A standalone h-[n%] token, not the one inside max-h-[n%].
      expect(className.split(/\s+/), String(code)).not.toContain(expect.stringMatching(/^h-\[\d+%\]$/))
    }
  })

  it('never returns a negative canvas height for a tiny window', () => {
    expect(canvasHeightFor(100, true)).toBeGreaterThanOrEqual(0)
  })
})
