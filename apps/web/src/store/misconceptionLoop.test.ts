import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MisconceptionEventDto } from '@dsa-tutor/types'
import { junctionInstanceKey, useMisconceptionStore, type JunctionOutcome } from './useMisconceptionStore'

const api = vi.hoisted(() => ({
  detectMisconception: vi.fn(),
  recordProbe: vi.fn(),
  presentRemediation: vi.fn(),
  completeRemediation: vi.fn(),
  tickJunction: vi.fn(),
  checkStaleEventsOnSessionStart: vi.fn(),
  fetchEventStatusForTopic: vi.fn(),
}))
vi.mock('@/api/misconceptionEvents', () => api)

function event(overrides: Partial<MisconceptionEventDto> = {}): MisconceptionEventDto {
  return {
    id: 'e1',
    algorithmTopicId: 't1',
    category: 'ORDER_OF_OPERATIONS',
    status: 'OPEN',
    remediationCount: 0,
    probeCount: 0,
    consecutiveCorrect: 0,
    junctionsSinceDetection: 0,
    bottomedOut: false,
    ...overrides,
  } as MisconceptionEventDto
}

function outcome(overrides: Partial<JunctionOutcome> = {}): JunctionOutcome {
  return {
    algorithmTopicId: 't1',
    algorithmTopicSlug: 'bubble-sort',
    interactionId: 'i1',
    junctionType: 'SWAP_DECISION',
    instanceKey: junctionInstanceKey('SWAP_DECISION', 3, [2, 5]),
    optionCount: 2,
    correct: false,
    hintUsed: false,
    category: 'ORDER_OF_OPERATIONS',
    firstAttempt: true,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  api.tickJunction.mockResolvedValue(undefined)
  useMisconceptionStore.setState({
    activeEvents: [],
    handledJunctions: new Set(),
    pendingRemediation: null,
    lastBottomedOutCategory: null,
  })
})

describe('misconception loop (3C.3)', () => {
  it('detects on a wrong tile with a label, and queues a level-1 task without recording it yet', async () => {
    api.detectMisconception.mockResolvedValue({ event: event() })
    await useMisconceptionStore.getState().handleJunctionOutcome(outcome())
    expect(api.detectMisconception).toHaveBeenCalledWith('t1', 'ORDER_OF_OPERATIONS', 'i1')
    const pending = useMisconceptionStore.getState().pendingRemediation
    expect(pending?.payload.level).toBe(1)
    expect(pending?.payload.taskType).toBe('MICRO_PREDICTION')
    // presentedAt is when it is shown, not when it was chosen.
    expect(api.presentRemediation).not.toHaveBeenCalled()
    api.presentRemediation.mockResolvedValue({ id: 'r1' })
    useMisconceptionStore.getState().markPresented()
    expect(api.presentRemediation).toHaveBeenCalledOnce()
  })

  it('never acts on a retry of the same junction, so one junction escalates at most once', async () => {
    api.detectMisconception.mockResolvedValue({ event: event() })
    await useMisconceptionStore.getState().handleJunctionOutcome(outcome())
    await useMisconceptionStore.getState().handleJunctionOutcome(outcome({ interactionId: 'i2', firstAttempt: false }))
    await useMisconceptionStore.getState().handleJunctionOutcome(outcome({ interactionId: 'i3', correct: true, category: null, firstAttempt: false }))
    expect(api.detectMisconception).toHaveBeenCalledOnce()
    expect(api.recordProbe).not.toHaveBeenCalled()
  })

  it('never re-probes the identical junction instance, even in a replayed run', async () => {
    useMisconceptionStore.setState({ activeEvents: [event()] })
    api.recordProbe.mockResolvedValue({ event: event({ consecutiveCorrect: 1 }), shouldEscalate: false })
    const same = outcome({ correct: true, category: null })
    await useMisconceptionStore.getState().handleJunctionOutcome(same)
    await useMisconceptionStore.getState().handleJunctionOutcome({ ...same, interactionId: 'replay' })
    expect(api.recordProbe).toHaveBeenCalledOnce()
  })

  it('probes an open event on a different instance of a probing junction', async () => {
    useMisconceptionStore.setState({ activeEvents: [event()] })
    api.recordProbe.mockResolvedValue({ event: event({ consecutiveCorrect: 1 }), shouldEscalate: false })
    await useMisconceptionStore.getState().handleJunctionOutcome(
      outcome({ instanceKey: junctionInstanceKey('SWAP_DECISION', 7, [4, 9]), correct: true, category: null, hintUsed: false }),
    )
    expect(api.recordProbe).toHaveBeenCalledWith('e1', 'i1', 'SWAP_DECISION', 2, true, false)
  })

  it('treats the same mistake on a probing junction as a wrong probe (escalating to the next level)', async () => {
    useMisconceptionStore.setState({ activeEvents: [event()] })
    api.recordProbe.mockResolvedValue({ event: event({ remediationCount: 1 }), shouldEscalate: true })
    await useMisconceptionStore.getState().handleJunctionOutcome(outcome({ instanceKey: 'other' }))
    expect(api.detectMisconception).not.toHaveBeenCalled()
    expect(useMisconceptionStore.getState().pendingRemediation?.payload.level).toBe(2)
  })

  it('delivers the bottom-out once, and no further task, when an event becomes persistent', async () => {
    useMisconceptionStore.setState({ activeEvents: [event({ remediationCount: 2 })] })
    api.recordProbe.mockResolvedValue({
      event: event({ remediationCount: 3, status: 'PERSISTENT', bottomedOut: true }),
      shouldEscalate: false,
    })
    await useMisconceptionStore.getState().handleJunctionOutcome(outcome({ instanceKey: 'third' }))
    expect(useMisconceptionStore.getState().lastBottomedOutCategory).toBe('ORDER_OF_OPERATIONS')
    expect(useMisconceptionStore.getState().pendingRemediation).toBeNull()
    expect(useMisconceptionStore.getState().activeEvents).toEqual([])
  })

  it('never stacks: no second task while one is waiting', async () => {
    useMisconceptionStore.setState({
      activeEvents: [event()],
      pendingRemediation: { eventId: 'x', payload: { level: 1 } as never, remediationId: null },
    })
    api.recordProbe.mockResolvedValue({ event: event({ remediationCount: 1 }), shouldEscalate: true })
    await useMisconceptionStore.getState().handleJunctionOutcome(outcome({ instanceKey: 'next' }))
    expect(useMisconceptionStore.getState().pendingRemediation?.eventId).toBe('x')
  })
})
