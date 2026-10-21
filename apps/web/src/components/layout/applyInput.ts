/**
 * "Run this topic on these values", asked from outside the left panel.
 *
 * The panel owns the custom-array box, and its Random button keeps the box
 * in step with the run it just started. Anything else that changes the
 * input has to do the same or the box starts describing a run that is no
 * longer on screen - so it asks the panel rather than reaching past it.
 */
export const APPLY_INPUT_EVENT = 'dsa-tutor:apply-input'

export function requestInput(values: number[]): void {
  window.dispatchEvent(new CustomEvent<number[]>(APPLY_INPUT_EVENT, { detail: values }))
}
