/**
 * How long to hold a run before advancing past text the student is meant to
 * read.
 *
 * A correct answer advances by itself, so anything shown on one is only as
 * useful as the time it stays on screen - the alternative is text that
 * appears and vanishes, which is what made the tutor feel rushed. Derived
 * from the text rather than fixed so a two-sentence explanation is not
 * given the same beat as a six-word one.
 *
 * 200 words per minute is the slow end of adult silent reading (the usual
 * range quoted is 200-300), chosen deliberately: this is unfamiliar
 * technical prose naming specific indices and values, read beside a diagram
 * the student is also looking at.
 */
export const READING_WORDS_PER_MINUTE = 200

/** Below this, the hold is too short to notice and only adds jitter. */
export const MIN_READING_MS = 1_800

/** Above this it stops reading as pacing and starts reading as a freeze. A
 * two-sentence explanation runs ~40 words, which is over this, so the cap
 * is what most explanations actually get. */
export const MAX_READING_MS = 9_000

/** The whole estimate: how long this text wants to be on screen. */
export function readingTimeMs(text: string | null | undefined, speed = 1): number {
  if (!text) return 0
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return 0
  const raw = (words / READING_WORDS_PER_MINUTE) * 60_000
  const clamped = Math.min(MAX_READING_MS, Math.max(MIN_READING_MS, raw))
  // Scaled by the transport speed for the same reason the practice
  // auto-advance is: a learner who has set 2x has asked for less waiting.
  return Math.round(clamped / Math.max(speed, 0.1))
}

/**
 * What is left of that estimate, given the text has been on screen for
 * alreadyVisibleMs. The explanation streams in sentence by sentence while
 * the run waits on the model's final response, so by the time anything can
 * advance the student has usually been reading for a few seconds already -
 * charging them the full estimate on top of that would be a double count,
 * and is what made the first version of this hold feel like a freeze.
 */
export function readingHoldMs(
  text: string | null | undefined,
  alreadyVisibleMs: number,
  speed = 1,
): number {
  const total = readingTimeMs(text, speed)
  if (total === 0) return 0
  return Math.max(0, total - Math.max(0, alreadyVisibleMs))
}
