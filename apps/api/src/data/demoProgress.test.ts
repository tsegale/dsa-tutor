import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEMO_PLAN, PREDICTIONS_PER_TOPIC, buildDemoProgress } from './demoProgress'

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
