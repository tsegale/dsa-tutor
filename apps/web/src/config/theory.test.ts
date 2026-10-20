import { describe, expect, it } from 'vitest'
import { TOPIC_THEORY, theoryFor } from './theory'
import { COMPLEXITY } from './complexity'
import { MODULES } from './curriculum'

/**
 * The Theory tab is Demo mode's default and the first thing a beginner
 * reads, so a briefing that is missing, empty or too wide for the panel is
 * a visible defect rather than a cosmetic one.
 */
describe('topic theory briefings', () => {
  const entries = Object.entries(TOPIC_THEORY)

  it('returns null for a topic with no briefing, rather than throwing', () => {
    expect(theoryFor('not-a-real-topic')).toBeNull()
  })

  it.each(entries)('%s has a usable briefing', (_slug, theory) => {
    expect(theory.analogy.length).toBeGreaterThan(40)
    expect(theory.mechanism.length).toBeGreaterThanOrEqual(2)
    expect(theory.mechanism.length).toBeLessThanOrEqual(4)
    for (const step of theory.mechanism) expect(step.trim().length).toBeGreaterThan(10)
    expect(theory.whenToUse.trim().length).toBeGreaterThan(20)
  })

  it.each(entries)('%s has a schematic that fits the panel', (_slug, theory) => {
    const lines = theory.schematic.split('\n')
    expect(lines.length).toBeGreaterThan(1)
    // The right panel is 280px at its default width. A line wider than this
    // forces a horizontal scrollbar inside the tab.
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(36)
  })

  it.each(entries)('%s uses no notation in its analogy', (_slug, theory) => {
    // The analogy is the hook for someone who does not yet know what the
    // algorithm is. Big-O there defeats the purpose; it belongs in the
    // complexity section, which reads from complexity.json.
    expect(theory.analogy).not.toMatch(/O\(/)
  })

  it('every topic with a briefing also has complexity facts to show', () => {
    const missing = Object.keys(TOPIC_THEORY).filter((slug) => !COMPLEXITY[slug])
    expect(missing).toEqual([])
  })

  it('every topic in the curriculum has a briefing', () => {
    // The Theory tab is the default tab, so a curriculum topic without a
    // briefing shows a panel's empty state as the first thing a student
    // sees. Adding a topic to a module means writing its briefing too.
    const slugs = MODULES.flatMap((m) => m.topics)
    const missing = slugs.filter((slug) => !theoryFor(slug))
    expect(missing).toEqual([])
  })

  it('has no briefing for a topic the curriculum does not teach', () => {
    const slugs = new Set(MODULES.flatMap((m) => m.topics))
    const orphans = Object.keys(TOPIC_THEORY).filter((slug) => !slugs.has(slug))
    expect(orphans).toEqual([])
  })
})
