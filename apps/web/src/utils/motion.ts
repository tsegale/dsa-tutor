import type { Transition } from 'framer-motion'

// Canvas motion (Week 4, 4B.1). Position and layout changes on the canvases
// use one spring, so moving elements settle with a little weight instead of
// a linear tween. Colour changes keep their tweens: a spring on a fill only
// adds overshoot to a hue. Reduced motion keeps its existing instant
// transition; callers pass the flag from useReducedMotion.

export const CANVAS_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 } as const satisfies Transition

const INSTANT = { duration: 0 } as const satisfies Transition

/** The transition for a canvas element changing position: the spring, or instant under reduced motion. */
export function canvasMove(prefersReducedMotion: boolean): Transition {
  return prefersReducedMotion ? INSTANT : CANVAS_SPRING
}
