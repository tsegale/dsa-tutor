/**
 * How much of the workspace the prediction panel may take, and what it
 * leaves the canvas.
 *
 * Code Mode used to pin the panel at a flat 70% of the workspace. On a
 * 1080-tall window that leaves the canvas roughly 170px once the transport
 * bar is out, which is not enough to draw a bar chart: the bars collapse to
 * stubs and the value labels stack on top of the index labels. The
 * visualisation is the thing being learned from, so it cannot be the part
 * that gets squeezed out by the editor beneath it.
 *
 * The panel scrolls (overflow-y-auto), so a cap costs nothing: anything
 * that does not fit is reachable rather than clipped. The editor needs
 * about 360px for its prompt, rung bar, language tabs, the editor itself
 * (min-h-[9.5em]) and its button, which 55% of a normal workspace clears.
 */

/** Below this the canvas stops being a chart and becomes a smear. */
export const CANVAS_MIN_PX = 180

export interface PanelSize {
  /** Tailwind classes for the panel's own height. */
  className: string
  /** The share of the workspace the panel may take, at most. */
  maxShare: number
}

export function predictionPanelSize(isCodeEditor: boolean): PanelSize {
  // Code Mode asks for more room than a tile grid, but takes it as a range
  // it can size within rather than a fixed block it always fills.
  if (isCodeEditor) return { className: 'min-h-[40%] max-h-[55%]', maxShare: 0.55 }
  return { className: 'min-h-[35%] max-h-[60%]', maxShare: 0.6 }
}

/** What the canvas is left with, for a given workspace height. */
export function canvasHeightFor(workspaceHeight: number, isCodeEditor: boolean, transportHeight = 60): number {
  const panel = workspaceHeight * predictionPanelSize(isCodeEditor).maxShare
  return Math.max(0, workspaceHeight - panel - transportHeight)
}
