import { create } from 'zustand'
import type { MisconceptionEventDto } from '@dsa-tutor/types'
import {
  detectMisconception,
  presentRemediation,
  completeRemediation,
  recordProbe,
  tickJunction,
  checkStaleEventsOnSessionStart,
  fetchEventStatusForTopic,
} from '@/api/misconceptionEvents'
import { getProbingJunctions, getRemediationTaskType } from '@/utils/misconceptionProbes'
import { generateRemediationTask, type RemediationPayload } from '@/utils/remediationTasks'

interface PendingRemediation {
  eventId: string
  remediationId: string
  payload: RemediationPayload
}

interface MisconceptionStoreState {
  activeEvents: MisconceptionEventDto[]
  pendingRemediation: PendingRemediation | null
  lastBottomedOutCategory: string | null
  /** Detection/probe round trips started but not yet settled - any one of
   * them may still set pendingRemediation. */
  checksInFlight: number

  loadActiveEvents: (algorithmTopicId: string) => Promise<void>
  checkSessionStart: (algorithmTopicId: string) => Promise<void>
  handleDetection: (
    algorithmTopicId: string,
    algorithmTopicSlug: string,
    category: string,
    detectedInteractionId: string,
  ) => Promise<void>
  handleProbe: (
    algorithmTopicId: string,
    algorithmTopicSlug: string,
    interactionId: string,
    junctionType: string,
    optionCount: number,
    correct: boolean,
    hintUsed: boolean,
  ) => Promise<void>
  tickJunctionForTopic: (algorithmTopicId: string) => void
  completePendingRemediation: (outcome: { correct: boolean | null; skipped: boolean }) => Promise<void>
  dismissBottomOut: () => void
  /** Registers a detection/probe chain so waitForRemediation can hold the
   * run until it settles. Returns the same promise. */
  trackCheck: <T>(work: Promise<T>) => Promise<T>
  /** Resolves once no Quick Check is pending. Waits up to
   * CHECK_IN_FLIGHT_WAIT_MS for in-flight checks to settle first, then
   * without limit for an open Quick Check to be answered or skipped, so the
   * run never advances to the next junction underneath it. */
  waitForRemediation: () => Promise<void>
}

// Long enough for the interaction write plus a detect/present round trip
// on a warm API, short enough that a slow backend never stalls the run.
export const CHECK_IN_FLIGHT_WAIT_MS = 3000

function upsertEvent(events: MisconceptionEventDto[], updated: MisconceptionEventDto): MisconceptionEventDto[] {
  const withoutUpdated = events.filter((e) => e.id !== updated.id)
  const isActive = updated.status === 'OPEN' || updated.status === 'REMEDIATED'
  return isActive ? [...withoutUpdated, updated] : withoutUpdated
}

async function presentTaskForEvent(
  event: MisconceptionEventDto,
  algorithmTopicSlug: string,
): Promise<PendingRemediation | null> {
  const taskType = getRemediationTaskType(event.category)
  if (!taskType) return null

  const level = event.remediationCount + 1
  const payload = generateRemediationTask(event.category, algorithmTopicSlug, level)
  if (!payload) return null

  const remediation = await presentRemediation(event.id, taskType, level, payload)
  return { eventId: event.id, remediationId: remediation.id, payload }
}

// Detect, remediate, re-probe on a different instance, record the outcome.
// Resolution/persistence/abandonment are decided entirely by the deterministic
// rules in apps/api's misconceptionEvent.service.ts - this store only
// orchestrates when to call detect/probe and what to show while waiting.
export const useMisconceptionStore = create<MisconceptionStoreState>((set, get) => ({
  activeEvents: [],
  pendingRemediation: null,
  lastBottomedOutCategory: null,
  checksInFlight: 0,

  async loadActiveEvents(algorithmTopicId) {
    try {
      const events = await fetchEventStatusForTopic(algorithmTopicId)
      set({ activeEvents: events })
    } catch {
      // Non-blocking - the algorithm page's indicator just stays hidden.
    }
  },

  async checkSessionStart(algorithmTopicId) {
    try {
      await checkStaleEventsOnSessionStart(algorithmTopicId)
      await get().loadActiveEvents(algorithmTopicId)
    } catch {
      // Best-effort abandonment check; never blocks starting the session.
    }
  },

  async handleDetection(algorithmTopicId, algorithmTopicSlug, category, detectedInteractionId) {
    if (getProbingJunctions(category).length === 0) return
    // Never stack remediation on remediation - one task at a time, even
    // when a second category is detected while one is already pending.
    if (get().pendingRemediation) return

    try {
      const { event } = await detectMisconception(algorithmTopicId, category, detectedInteractionId)
      set((state) => ({ activeEvents: upsertEvent(state.activeEvents, event) }))

      const pending = await presentTaskForEvent(event, algorithmTopicSlug)
      if (pending) set({ pendingRemediation: pending })
    } catch {
      // Best-effort: a failed detection call must never block practice.
    }
  },

  async handleProbe(algorithmTopicId, algorithmTopicSlug, interactionId, junctionType, optionCount, correct, hintUsed) {
    const matchingEvents = get().activeEvents.filter(
      (e) => e.algorithmTopicId === algorithmTopicId && getProbingJunctions(e.category).includes(junctionType as never),
    )
    if (matchingEvents.length === 0 || get().pendingRemediation) return

    // Never more than one remediation prompt per junction, even when two
    // events are open - only the first matching event's probe is recorded
    // this turn; the rest catch up on the next matching junction.
    const event = matchingEvents[0]

    try {
      const result = await recordProbe(event.id, interactionId, junctionType, optionCount, correct, hintUsed)
      set((state) => ({ activeEvents: upsertEvent(state.activeEvents, result.event) }))

      if (result.event.bottomedOut) {
        set({ lastBottomedOutCategory: event.category })
        return
      }
      if (result.shouldEscalate) {
        const pending = await presentTaskForEvent(result.event, algorithmTopicSlug)
        if (pending) set({ pendingRemediation: pending })
      }
    } catch {
      // Best-effort: a failed probe call must never block practice.
    }
  },

  tickJunctionForTopic(algorithmTopicId) {
    if (get().activeEvents.some((e) => e.algorithmTopicId === algorithmTopicId)) {
      tickJunction(algorithmTopicId).catch(() => {})
    }
  },

  async completePendingRemediation(outcome) {
    const pending = get().pendingRemediation
    if (!pending) return
    set({ pendingRemediation: null })
    try {
      await completeRemediation(pending.remediationId, outcome.correct, outcome.skipped)
    } catch {
      // The task is already dismissed client-side; a failed write here
      // only affects the research record, not the student's flow.
    }
  },

  dismissBottomOut() {
    set({ lastBottomedOutCategory: null })
  },

  trackCheck(work) {
    set((state) => ({ checksInFlight: state.checksInFlight + 1 }))
    return work.finally(() => set((state) => ({ checksInFlight: state.checksInFlight - 1 })))
  },

  waitForRemediation() {
    const deadline = Date.now() + CHECK_IN_FLIGHT_WAIT_MS
    const isClear = () => {
      const { pendingRemediation, checksInFlight } = get()
      if (pendingRemediation) return false
      return checksInFlight === 0 || Date.now() >= deadline
    }
    if (isClear()) return Promise.resolve()

    return new Promise<void>((resolve) => {
      const finish = () => {
        if (!isClear()) return
        unsubscribe()
        clearTimeout(timer)
        resolve()
      }
      const unsubscribe = useMisconceptionStore.subscribe(finish)
      const timer = setTimeout(finish, CHECK_IN_FLIGHT_WAIT_MS)
    })
  },
}))
