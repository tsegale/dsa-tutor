import { describe, expect, it } from 'vitest'
import { MODULES } from '@/config/curriculum'
import { runFor } from '@/engine/runFor'
import { getPromptForSnapshot } from '@/utils/junctionPrompt'
import { getTilesForSnapshot } from '@/utils/tileBuilder'

/**
 * Every junction must ask the learner something.
 *
 * getPromptForSnapshot falls back to the snapshot's own description for any
 * junction type without a case of its own, and a description narrates the
 * step that just happened. That left three junction types showing a
 * statement above a row of tiles - "Placed 99 at index 2. The array now has
 * 9 elements." with 99 as one of the four options - which is not a
 * question, and worse, answers itself.
 *
 * Driven from real runs of every topic in the curriculum, so a junction
 * type added later without a prompt fails here rather than in front of a
 * student.
 */

const SLUGS = MODULES.flatMap((module) => module.topics)
const INPUT = [12, 3, 14, 1, 7, 9]

interface Junction {
  slug: string
  type: string
  prompt: string
  snapshot: Parameters<typeof getPromptForSnapshot>[0]
}

/** One junction of each type, from the first topic that produces it. */
function junctions(): Junction[] {
  const out = new Map<string, Junction>()
  for (const slug of SLUGS) {
    let run
    try {
      run = runFor(slug, INPUT)
    } catch {
      continue
    }
    for (const snapshot of run) {
      const type = snapshot.criticalJunctionType
      if (!snapshot.isPredictionRequired || !type || out.has(type)) continue
      out.set(type, { slug, type, prompt: getPromptForSnapshot(snapshot, slug), snapshot })
    }
  }
  return [...out.values()]
}

const ALL = junctions()

describe('every junction type in the curriculum', () => {
  it('produces enough junctions to be worth checking', () => {
    expect(ALL.length).toBeGreaterThan(50)
  })

  it('asks a question', () => {
    const statements = ALL.filter((j) => !j.prompt.includes('?')).map((j) => `${j.type} (${j.slug}): "${j.prompt}"`)
    expect(statements, 'these show a statement above the tiles').toEqual([])
  })

  it('asks something, rather than an empty prompt', () => {
    for (const junction of ALL) {
      expect(junction.prompt.trim().length, junction.type).toBeGreaterThan(15)
    }
  })
})

describe('a junction that offers tiles', () => {
  /** The tiles' one correct option, where there is exactly one. */
  const correctLabel = (junction: Junction): string | null => {
    const tiles = getTilesForSnapshot(junction.snapshot, junction.slug)
    const right = tiles.filter((tile) => tile.misconception === null)
    return right.length === 1 ? right[0].label : null
  }

  it('does not put the correct answer in the prompt, where the answer is a bare value', () => {
    // The defect behind the three fixed above: the prompt narrated the
    // completed step and named the value the tiles then asked for. Only
    // bare numeric labels are checked - a worded option ("Swap them") can
    // legitimately share words with the question it answers.
    const leaks: string[] = []
    for (const junction of ALL) {
      const label = correctLabel(junction)
      if (label === null || !/^-?\d+$/.test(label.trim())) continue
      // The value may legitimately appear as part of the state being
      // compared; what must not appear is the answer presented as settled.
      if (new RegExp(`\\b${label.trim()}\\b`).test(junction.prompt) && !junction.prompt.includes('?')) {
        leaks.push(`${junction.type} (${junction.slug}): "${junction.prompt}" answers itself with ${label}`)
      }
    }
    expect(leaks).toEqual([])
  })
})
