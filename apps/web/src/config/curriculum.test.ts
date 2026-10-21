import { describe, expect, it } from 'vitest'
import { ALGORITHM_REGISTRY } from '@/engine/registry'
import { MODULES, isCurriculumTopic, placeOfTopic } from './curriculum'

// The syllabus must list exactly the topics the app can run, in the seed's
// curriculum order. A drift in either direction is a missing or phantom
// topic in the rail.

// Read as raw text through Vite, so the test needs no Node typings.
const SEED = Object.values(
  import.meta.glob<string>('../../../api/prisma/seed.ts', { query: '?raw', import: 'default', eager: true })
)[0]

describe('syllabus topics', () => {
  it('has 14 / 5 / 9 / 10 / 18 / 17 topics, 73 in all', () => {
    expect(MODULES.map((m) => m.topics.length)).toEqual([14, 5, 9, 10, 18, 17])
    expect(MODULES.reduce((sum, m) => sum + m.topics.length, 0)).toBe(73)
  })

  it('lists each topic once', () => {
    const all = MODULES.flatMap((m) => m.topics)
    expect(new Set(all).size).toBe(all.length)
  })

  it('lists exactly the topics the engine registry implements, each under its own track', () => {
    const registry = new Map(ALGORITHM_REGISTRY.map((entry) => [entry.algorithmName, entry.track]))
    expect([...registry.keys()].filter((name) => !isCurriculumTopic(name))).toEqual([])
    for (const module of MODULES) {
      for (const name of module.topics) expect(registry.get(name), name).toBe(module.track)
    }
  })

  it('follows the seed order within each module', () => {
    expect(SEED, 'seed.ts was not found').toBeTypeOf('string')
    const seedOrder = [...SEED.matchAll(/\{ name: '([^']+)',.*?track: '(\w+)'.*?order: (\d+) \}/g)].map((m) => ({ name: m[1], track: m[2], order: Number(m[3]) }))
    for (const module of MODULES) {
      const expected = seedOrder.filter((t) => t.track === module.track).sort((a, b) => a.order - b.order).map((t) => t.name)
      expect(module.topics, module.title).toEqual(expected)
    }
  })

  it('places a topic by module and position', () => {
    expect(placeOfTopic('binary-search')).toMatchObject({ module: { number: 2 }, index: 1 })
    expect(placeOfTopic('linked-list')).toBeNull()
  })
})
