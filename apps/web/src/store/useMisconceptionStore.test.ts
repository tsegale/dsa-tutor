import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHECK_IN_FLIGHT_WAIT_MS, useMisconceptionStore } from './useMisconceptionStore'
import type { RemediationPayload } from '@/utils/remediationTasks'

// A task chosen but not yet shown (it is recorded on the server when shown).
const pending = { eventId: 'e1', remediationId: null, payload: {} as RemediationPayload }

async function settled(promise: Promise<void>): Promise<boolean> {
  let done = false
  void promise.then(() => {
    done = true
  })
  await vi.advanceTimersByTimeAsync(0)
  return done
}

describe('waitForRemediation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useMisconceptionStore.setState({ pendingRemediation: null, checksInFlight: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves immediately when nothing is pending or in flight', async () => {
    expect(await settled(useMisconceptionStore.getState().waitForRemediation())).toBe(true)
  })

  it('holds until an open Quick Check is cleared, with no time limit', async () => {
    useMisconceptionStore.setState({ pendingRemediation: pending })
    const wait = useMisconceptionStore.getState().waitForRemediation()

    await vi.advanceTimersByTimeAsync(CHECK_IN_FLIGHT_WAIT_MS * 10)
    expect(await settled(wait)).toBe(false)

    useMisconceptionStore.setState({ pendingRemediation: null })
    expect(await settled(wait)).toBe(true)
  })

  it('waits for an in-flight check that then opens a Quick Check', async () => {
    let finishCheck = () => {}
    const check = new Promise<void>((resolve) => {
      finishCheck = resolve
    })
    void useMisconceptionStore.getState().trackCheck(check)
    const wait = useMisconceptionStore.getState().waitForRemediation()
    expect(await settled(wait)).toBe(false)

    useMisconceptionStore.setState({ pendingRemediation: pending })
    finishCheck()
    await vi.advanceTimersByTimeAsync(0)
    expect(useMisconceptionStore.getState().checksInFlight).toBe(0)
    expect(await settled(wait)).toBe(false)

    useMisconceptionStore.setState({ pendingRemediation: null })
    expect(await settled(wait)).toBe(true)
  })

  it('stops waiting on a slow check after the cap so the run never stalls', async () => {
    void useMisconceptionStore.getState().trackCheck(new Promise<void>(() => {}))
    const wait = useMisconceptionStore.getState().waitForRemediation()

    await vi.advanceTimersByTimeAsync(CHECK_IN_FLIGHT_WAIT_MS - 1)
    expect(await settled(wait)).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await settled(wait)).toBe(true)
  })
})

describe('loadActiveEvents', () => {
  beforeEach(() => {
    useMisconceptionStore.setState({ activeEvents: [] })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // The web suite runs in node, where api/client.ts's localStorage read for
  // the bearer token throws before fetch is ever reached - which the catch
  // in loadActiveEvents would swallow, making every assertion below pass
  // for the wrong reason.
  function stubStatusResponse(data: unknown) {
    vi.stubGlobal('localStorage', { getItem: () => 'test-token', setItem: () => {}, removeItem: () => {} })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data, error: null }), { status: 200 })),
    )
  }

  it('stores the events the API returned', async () => {
    const events = [{ id: 'e1', algorithmTopicId: 't1' }]
    stubStatusResponse(events)
    await useMisconceptionStore.getState().loadActiveEvents('t1')
    expect(useMisconceptionStore.getState().activeEvents).toEqual(events)
  })

  it('keeps the previous events when the response is not a list', async () => {
    // AlgorithmPage calls .find on activeEvents during render, so writing a
    // null straight through used to throw inside the workspace component
    // and white-screen the topic - one render after the write, where this
    // function's own try/catch could no longer help.
    const existing = [{ id: 'e1', algorithmTopicId: 't1' }]
    useMisconceptionStore.setState({ activeEvents: existing as never })
    stubStatusResponse(null)
    await useMisconceptionStore.getState().loadActiveEvents('t1')
    expect(useMisconceptionStore.getState().activeEvents).toEqual(existing)
  })

  it('leaves the events alone when the request fails', async () => {
    vi.stubGlobal('localStorage', { getItem: () => 'test-token', setItem: () => {}, removeItem: () => {} })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down') }))
    await useMisconceptionStore.getState().loadActiveEvents('t1')
    expect(useMisconceptionStore.getState().activeEvents).toEqual([])
  })

  it('never leaves activeEvents as anything but an array', async () => {
    for (const bad of [null, undefined, 'events', 42, { events: [] }]) {
      stubStatusResponse(bad)
      await useMisconceptionStore.getState().loadActiveEvents('t1')
      expect(Array.isArray(useMisconceptionStore.getState().activeEvents)).toBe(true)
    }
  })
})
