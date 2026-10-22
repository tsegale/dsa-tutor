import { describe, expect, it } from 'vitest'
import {
  MAX_READING_MS,
  MIN_READING_MS,
  READING_WORDS_PER_MINUTE,
  readingHoldMs,
  readingTimeMs,
} from '@/utils/readingTime'

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ')

/** Inside the clamp, so the arithmetic itself is what is under test. */
const UNCLAMPED_WORDS = 20

describe('readingTimeMs', () => {
  it('holds nothing when there is nothing to read', () => {
    expect(readingTimeMs(null)).toBe(0)
    expect(readingTimeMs('')).toBe(0)
    expect(readingTimeMs('   ')).toBe(0)
  })

  it('is driven by the word count at the stated reading speed', () => {
    const expected = (UNCLAMPED_WORDS / READING_WORDS_PER_MINUTE) * 60_000
    expect(expected).toBeGreaterThan(MIN_READING_MS)
    expect(expected).toBeLessThan(MAX_READING_MS)
    expect(readingTimeMs(words(UNCLAMPED_WORDS))).toBe(Math.round(expected))
  })

  it('gives a longer explanation a longer hold', () => {
    expect(readingTimeMs(words(25))).toBeGreaterThan(readingTimeMs(words(15)))
  })

  it('floors a very short sentence so the hold is noticeable', () => {
    expect(readingTimeMs('Swapping settles the pair.')).toBe(MIN_READING_MS)
  })

  it('caps a long one so the run never looks frozen', () => {
    expect(readingTimeMs(words(400))).toBe(MAX_READING_MS)
  })

  it('shortens the hold for a learner who sped the run up', () => {
    const text = words(UNCLAMPED_WORDS)
    expect(readingTimeMs(text, 2)).toBe(Math.round(readingTimeMs(text) / 2))
    expect(readingTimeMs(text, 0.5)).toBe(readingTimeMs(text) * 2)
  })

  it('treats a nonsense speed as a slow one rather than dividing by zero', () => {
    expect(Number.isFinite(readingTimeMs('a few words here', 0))).toBe(true)
  })
})

describe('readingHoldMs', () => {
  it('charges nothing for time the student has already spent reading', () => {
    const text = words(UNCLAMPED_WORDS)
    const total = readingTimeMs(text)
    expect(readingHoldMs(text, 0)).toBe(total)
    expect(readingHoldMs(text, 2_000)).toBe(total - 2_000)
  })

  it('never returns a negative wait when the text was up longer than it needed', () => {
    expect(readingHoldMs(words(UNCLAMPED_WORDS), 60_000)).toBe(0)
  })

  it('ignores a nonsense elapsed time rather than extending the hold', () => {
    const text = words(UNCLAMPED_WORDS)
    expect(readingHoldMs(text, -5_000)).toBe(readingTimeMs(text))
  })

  it('still holds nothing when there was no text', () => {
    expect(readingHoldMs(null, 0)).toBe(0)
    expect(readingHoldMs('', 500)).toBe(0)
  })

  it('a two-sentence explanation already read for four seconds still gets a beat', () => {
    // The realistic case: ~40 words, streamed in while the run waited on
    // the model's final response. It must neither vanish nor freeze.
    const hold = readingHoldMs(words(40), 4_000)
    expect(hold).toBeGreaterThan(0)
    expect(hold).toBeLessThanOrEqual(MAX_READING_MS)
  })
})
