import { describe, expect, it } from 'vitest'
import { MODULES } from './curriculum'
import {
  BUTTONS_ARE_HANDS_ON,
  HANDS_ON_ACTIVE,
  HANDS_ON_COMING_SOON,
  NO_HANDS_ON,
  hasCodeMode,
  pipelineFor,
  pipelineProgress,
  type PipelineInput,
  type PipelineStageId,
} from './pipeline'

function input(overrides: Partial<PipelineInput> = {}): PipelineInput {
  return {
    slug: 'bubble-sort',
    runCompletedHere: false,
    practiceCompleted: false,
    feynmanAvailable: false,
    feynmanReason: null,
    classic: false,
    ...overrides,
  }
}

const statusOf = (stages: ReturnType<typeof pipelineFor>, id: PipelineStageId) =>
  stages.find((stage) => stage.id === id)!.status

describe('the hands-on category sets', () => {
  const sets = { NO_HANDS_ON, BUTTONS_ARE_HANDS_ON, HANDS_ON_COMING_SOON, HANDS_ON_ACTIVE }
  const slugs = MODULES.flatMap((module) => module.topics)

  it('places every curriculum topic in exactly one category', () => {
    // A topic in none of them would silently read "Not available for this
    // algorithm"; one in two would depend on check order.
    const counts = slugs.map((slug) => ({
      slug,
      in: Object.entries(sets).filter(([, set]) => set.has(slug)).map(([name]) => name),
    }))
    expect(counts.filter((row) => row.in.length !== 1)).toEqual([])
  })

  it('names no topic the curriculum does not teach', () => {
    const known = new Set(slugs)
    const strays = Object.entries(sets).flatMap(([name, set]) =>
      [...set].filter((slug) => !known.has(slug)).map((slug) => `${name}: ${slug}`),
    )
    expect(strays).toEqual([])
  })
})

describe('pipelineFor', () => {
  it('always shows five stages, so the whole route is visible from the start', () => {
    const stages = pipelineFor(input())
    expect(stages.map((stage) => stage.id)).toEqual(['DEMO', 'PRACTICE', 'HANDS_ON', 'CODE', 'FEYNMAN'])
  })

  it('opens Demo and Practice immediately', () => {
    const stages = pipelineFor(input())
    expect(statusOf(stages, 'DEMO')).toBe('AVAILABLE')
    expect(statusOf(stages, 'PRACTICE')).toBe('AVAILABLE')
  })

  it('locks Hands-on and Code behind a completed Practice run', () => {
    const stages = pipelineFor(input({ slug: 'bubble-sort' }))
    expect(statusOf(stages, 'HANDS_ON')).toBe('LOCKED')
    expect(statusOf(stages, 'CODE')).toBe('LOCKED')
  })

  it('opens them once Practice is done', () => {
    const stages = pipelineFor(input({ slug: 'bubble-sort', practiceCompleted: true }))
    expect(statusOf(stages, 'HANDS_ON')).toBe('AVAILABLE')
    expect(statusOf(stages, 'CODE')).toBe('AVAILABLE')
  })

  it('marks Demo done once Practice has been completed', () => {
    const stages = pipelineFor(input({ practiceCompleted: true }))
    expect(statusOf(stages, 'DEMO')).toBe('DONE')
    expect(statusOf(stages, 'PRACTICE')).toBe('DONE')
  })

  it('marks Demo done after a run finishes in this session', () => {
    expect(statusOf(pipelineFor(input({ runCompletedHere: true })), 'DEMO')).toBe('DONE')
  })

  describe('Hands-on by topic category', () => {
    it('is never offered where no construction gesture makes sense', () => {
      const stages = pipelineFor(input({ slug: 'binary-search', practiceCompleted: true }))
      expect(statusOf(stages, 'HANDS_ON')).toBe('NOT_OFFERED')
      expect(stages.find((s) => s.id === 'HANDS_ON')!.reason).toMatch(/Code instead/)
    })

    it("points at the structure's own controls where those are the interaction", () => {
      const stages = pipelineFor(input({ slug: 'stack', practiceCompleted: true }))
      expect(statusOf(stages, 'HANDS_ON')).toBe('NOT_OFFERED')
      expect(stages.find((s) => s.id === 'HANDS_ON')!.reason).toMatch(/controls/)
    })

    it('says so plainly where the drag interaction is not built yet', () => {
      const stages = pipelineFor(input({ slug: 'array-insert', practiceCompleted: true }))
      expect(stages.find((s) => s.id === 'HANDS_ON')!.reason).toMatch(/not built yet/)
    })
  })

  describe('Code', () => {
    it('is offered only where a code challenge actually exists', () => {
      // The toggle used to appear on all 66 topics while one engine read
      // it, so on 65 of them flipping it did nothing at all.
      expect(hasCodeMode('bubble-sort')).toBe(true)
      expect(hasCodeMode('dijkstra')).toBe(false)
      expect(statusOf(pipelineFor(input({ slug: 'dijkstra', practiceCompleted: true })), 'CODE')).toBe('NOT_OFFERED')
    })
  })

  describe('Feynman', () => {
    it('opens as soon as it is available, without waiting on Hands-on or Code', () => {
      // It is one of the four mastery criteria. Putting it last behind a
      // code challenge would quietly put mastery out of reach in a timed
      // session, because almost nobody gets that far.
      const stages = pipelineFor(input({ slug: 'binary-search', practiceCompleted: true, feynmanAvailable: true }))
      expect(statusOf(stages, 'FEYNMAN')).toBe('AVAILABLE')
      expect(statusOf(stages, 'HANDS_ON')).toBe('NOT_OFFERED')
    })

    it('locks, rather than hides, when a run is still needed', () => {
      const stages = pipelineFor(input({ feynmanReason: 'Finish a Practice run first.' }))
      expect(statusOf(stages, 'FEYNMAN')).toBe('LOCKED')
    })

    it('is not offered when the topic has no rubric', () => {
      const stages = pipelineFor(input({ feynmanReason: 'Feynman mode is not available here.' }))
      expect(statusOf(stages, 'FEYNMAN')).toBe('NOT_OFFERED')
    })
  })

  describe('Classic', () => {
    it('shows one stage and advertises nothing it will never offer', () => {
      const stages = pipelineFor(input({ classic: true, practiceCompleted: true }))
      expect(stages).toHaveLength(1)
      expect(stages[0].id).toBe('DEMO')
      expect(stages[0].status).toBe('AVAILABLE')
    })
  })

  it('gives every stage a reason whenever it is not open', () => {
    for (const slug of MODULES.flatMap((module) => module.topics)) {
      for (const stages of [pipelineFor(input({ slug })), pipelineFor(input({ slug, practiceCompleted: true }))]) {
        for (const stage of stages) {
          if (stage.status === 'LOCKED' || stage.status === 'NOT_OFFERED') {
            expect(stage.reason, `${slug} ${stage.id}`).toBeTruthy()
          } else {
            expect(stage.reason, `${slug} ${stage.id}`).toBeNull()
          }
        }
      }
    }
  })
})

describe('pipelineProgress', () => {
  it('counts only the stages this topic offers', () => {
    // binary-search has no Hands-on and no code challenge, so "1 of 5"
    // would understate a student who has done everything there is.
    const stages = pipelineFor(input({ slug: 'binary-search', practiceCompleted: true, feynmanAvailable: true }))
    expect(pipelineProgress(stages)).toEqual({ done: 2, offered: 3 })
  })

  it('reaches done equals offered when everything available is finished', () => {
    const stages = pipelineFor(input({ slug: 'binary-search', practiceCompleted: true, feynmanAvailable: true }))
    const { done, offered } = pipelineProgress(stages)
    expect(done).toBeLessThanOrEqual(offered)
  })
})
