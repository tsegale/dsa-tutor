import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEMO_PLAN, PREDICTIONS_PER_TOPIC, buildDemoProgress, demoMasteryRows, nextLevel } from './demoProgress'
import { computeMastery } from '../config/mastery'

const NOW = new Date('2026-10-13T12:00:00Z')
const sessions = buildDemoProgress(NOW)
const percentOf = (topic: string) => {
  const session = sessions.find((s) => s.topic === topic)
  if (!session) return 0
  return Math.round((session.interactions.filter((i) => i.predictionCorrect).length / session.interactions.length) * 100)
}

describe('buildDemoProgress', () => {
  it('lands every planned topic exactly on its planned mastery percent', () => {
    for (const [topic, percent] of DEMO_PLAN) expect(percentOf(topic)).toBe(percent)
  })

  it('writes one session per started topic, each with the full set of answers', () => {
    expect(sessions).toHaveLength(DEMO_PLAN.filter(([, p]) => p > 0).length)
    for (const session of sessions) expect(session.interactions).toHaveLength(PREDICTIONS_PER_TOPIC)
  })

  it('leaves exactly one session open, the most recent, so Continue resumes it', () => {
    const open = sessions.filter((s) => !s.completed)
    expect(open.map((s) => s.topic)).toEqual(['merge-sort'])
    const latest = [...sessions].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0]
    expect(latest.topic).toBe('merge-sort')
    expect(open[0].endTime).toBeNull()
  })

  it('keeps every timestamp in the past and inside the last three weeks', () => {
    for (const session of sessions) {
      for (const at of [session.startTime, ...session.interactions.map((i) => i.createdAt)]) {
        expect(at.getTime()).toBeLessThan(NOW.getTime())
        expect(NOW.getTime() - at.getTime()).toBeLessThan(23 * 24 * 60 * 60 * 1000)
      }
    }
  })

  it('is deterministic, so a re-seed writes the same answers', () => {
    const again = buildDemoProgress(NOW)
    expect(again.map((s) => s.interactions.map((i) => i.predictionCorrect))).toEqual(sessions.map((s) => s.interactions.map((i) => i.predictionCorrect)))
  })

  it('names only topics the seed creates', () => {
    const seed = readFileSync(join(__dirname, '../../prisma/seed.ts'), 'utf8')
    for (const [topic] of DEMO_PLAN) expect(seed).toContain(`name: '${topic}'`)
  })
})

describe('seeded support fading', () => {
  const order = ['HIGH', 'MEDIUM', 'LOW', 'NONE']

  it('starts every session at full support and only steps down one level at a time', () => {
    for (const session of sessions) {
      expect(session.interactions[0].scaffoldingLevelAtTime).toBe('HIGH')
      session.interactions.forEach((interaction, index) => {
        if (index === 0) return
        const before = order.indexOf(session.interactions[index - 1].scaffoldingLevelAtTime)
        expect(order.indexOf(interaction.scaffoldingLevelAtTime) - before).toBeLessThanOrEqual(1)
      })
    }
  })

  it('fades a strong topic below full support, so the chart shows the mechanism', () => {
    const strong = sessions.find((s) => s.topic === 'array-access')!
    expect(order.indexOf(strong.finalLevel)).toBeGreaterThanOrEqual(order.indexOf('LOW'))
  })

  it('steps down only after the streak the gate requires, and restores support at once', () => {
    expect(nextLevel('HIGH', 90, 2)).toBe('HIGH')
    expect(nextLevel('HIGH', 90, 3)).toBe('MEDIUM')
    expect(nextLevel('LOW', 30, 0)).toBe('HIGH')
  })
})

describe('seeded mastery statuses (Phase 7F)', () => {
  const statuses = new Map(sessions.map((session) => [session.topic, computeMastery(session.topic, demoMasteryRows(session), null)]))
  const seed = readFileSync(join(__dirname, '../../prisma/seed.ts'), 'utf8')
  const seeded = [...seed.matchAll(/\{ name: '([^']+)', displayName: /g)].map((m) => m[1])

  it('masters at least two topics with all four criteria offered and met', () => {
    const full = [...statuses.entries()].filter(
      ([, mastery]) => mastery.status === 'MASTERED' && mastery.criteria.every((c) => c.applicable && c.met),
    )
    expect(full.map(([topic]) => topic).sort()).toEqual(['binary-search', 'bubble-sort'])
  })

  it('shows every other status at least once, including untouched topics', () => {
    const counts = [...statuses.values()].map((mastery) => mastery.status)
    expect(counts).toContain('PROFICIENT')
    expect(counts).toContain('IN_PROGRESS')
    expect(seeded.filter((topic) => !statuses.has(topic)).length).toBeGreaterThan(0)
  })

  it('leaves the Proficient topic one clear step short: its Feynman explanation', () => {
    const linear = statuses.get('linear-search')!
    expect(linear.status).toBe('PROFICIENT')
    expect(linear.criteria.filter((c) => c.applicable && !c.met).map((c) => c.id)).toEqual(['FEYNMAN'])
  })
})

describe('seeded Feynman states (Phase 8F)', () => {
  const web = readFileSync(join(__dirname, '../../../web/src/utils/feynmanRubrics.ts'), 'utf8')
  const offeredNames = new Set([...web.match(/new Set\(\[([\s\S]*?)\]\)/)![1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] ?? m[2]))
  const seed = readFileSync(join(__dirname, '../../prisma/seed.ts'), 'utf8')
  const displayName = (slug: string) => seed.match(new RegExp(`name: '${slug}', displayName: '([^']+)'`))?.[1] ?? ''
  const hasRubric = (slug: string) => offeredNames.has(displayName(slug))

  it('has a topic with Feynman mode completed at the passing score', () => {
    const done = sessions.filter((s) => s.extras.some((e) => e.interactionType === 'FEYNMAN' && (e.rubricScore ?? 0) >= 80))
    expect(done.map((s) => s.topic)).toContain('bubble-sort')
  })

  it('has a topic where Feynman mode is unlocked by a finished run but not yet taken', () => {
    const offered = sessions.filter((s) => s.reachedFinalStep && hasRubric(s.topic) && !s.extras.some((e) => e.interactionType === 'FEYNMAN'))
    expect(offered.length).toBeGreaterThan(0)
    expect(offered.map((s) => s.topic)).toContain('selection-sort')
  })
})
