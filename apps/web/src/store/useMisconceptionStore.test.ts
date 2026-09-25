import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHECK_IN_FLIGHT_WAIT_MS, useMisconceptionStore } from './useMisconceptionStore'
import type { RemediationPayload } from '@/utils/remediationTasks'

const pending = { eventId: 'e1', remediationId: 'r1', payload: {} as RemediationPayload }

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
