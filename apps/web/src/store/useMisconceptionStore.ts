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
import { getProbingJunctions, isProbingJunction } from '@/utils/misconceptionProbes'
import { generateRemediationTask, type RemediationPayload } from '@/utils/remediationTasks'

interface PendingRemediation {
  eventId: string
  payload: RemediationPayload
  /** Created on the server when the task is actually shown (presentedAt),
   * not when it was chosen - see markPresented. */
  remediationId: Promise<string | null> | null
}

/** One answered junction, as the loop sees it (Week 3 3C.3). */
export interface JunctionOutcome {
  algorithmTopicId: string
  algorithmTopicSlug: string
  interactionId: string
  junctionType: string
  /** Identifies this junction instance: the same junction on the same
   * state is the same instance, whichever run it appears in. */
  instanceKey: string
  /** How many options were actually on screen. */
  optionCount: number
  correct: boolean
  hintUsed: boolean
  /** The tile's ground-truth label on a wrong answer, if any. */
  category: string | null
  firstAttempt: boolean
}

/** A stable key for a junction instance: its type, step and on-screen state. */
export function junctionInstanceKey(junctionType: string, stepIndex: number, state: unknown): string {
  return `${junctionType}:${stepIndex}:${JSON.stringify(state)}`
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
  /** Junction instances the loop has already acted on - never used again. */
  handledJunctions: Set<string>
  handleJunctionOutcome: (outcome: JunctionOutcome) => Promise<void>
  /** Records the pending task as presented, once it is actually on screen. */
  markPresented: () => void
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

/** The next task for an event, at level remediationCount + 1. Not sent to
 * the server until it is shown (markPresented). */
function prepareTaskForEvent(event: MisconceptionEventDto, algorithmTopicSlug: string): PendingRemediation | null {
  const payload = generateRemediationTask(event.category, algorithmTopicSlug, event.remediationCount + 1)
  return payload ? { eventId: event.id, payload, remediationId: null } : null
}

// Detect, remediate, re-probe on a different instance, record the outcome.
// Resolution/persistence/abandonment are decided entirely by the deterministic
// rules in apps/api's misconceptionEvent.service.ts - this store only
// orchestrates when to call detect/probe and what to show while waiting.
export const useMisconceptionStore = create<MisconceptionStoreState>((set, get) => ({
  activeEvents: [],
  handledJunctions: new Set<string>(),
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

  // The whole loop for one answered junction (Week 3 3C.3):
  // - Only the first attempt counts. Retries after feedback on the same
  //   junction never change an event (answering after being told is not
  //   evidence either way), so one junction changes the loop at most once.
  // - A junction instance already acted on is never used again: a probe is
  //   always a DIFFERENT instance from the detection and earlier probes.
  // - A wrong answer carrying a mapped category: no open event -> detect;
  //   an open event -> a wrong probe if this junction type probes it, else a
  //   repeat detection (the server escalates both the same way).
  // - Anything else -> a probe of the first open event this junction type
  //   probes (correct, or wrong for another reason).
  // - Never stack: at most one task per junction, and none while one waits.
  async handleJunctionOutcome(outcome) {
    const { algorithmTopicId, algorithmTopicSlug, instanceKey } = outcome
    if (!outcome.firstAttempt || get().handledJunctions.has(instanceKey)) return
    set((state) => ({ handledJunctions: new Set(state.handledJunctions).add(instanceKey) }))

    // The abandonment clock counts junctions, not attempts.
    if (get().activeEvents.some((e) => e.algorithmTopicId === algorithmTopicId)) {
      tickJunction(algorithmTopicId).catch(() => {})
    }

    const onTopic = get().activeEvents.filter((e) => e.algorithmTopicId === algorithmTopicId)
    const category = !outcome.correct && outcome.category && getProbingJunctions(outcome.category).length > 0 ? outcome.category : null
    const openForCategory = category ? onTopic.find((e) => e.category === category) : undefined

    try {
      let result: { event: MisconceptionEventDto; shouldEscalate: boolean }
      if (category && (!openForCategory || !isProbingJunction(category, outcome.junctionType))) {
        const { event } = await detectMisconception(algorithmTopicId, category, outcome.interactionId)
        // A new event, or a repeat detection the server escalated.
        result = { event, shouldEscalate: event.status === 'OPEN' || event.status === 'REMEDIATED' }
      } else {
        const event = openForCategory ?? onTopic.find((e) => isProbingJunction(e.category, outcome.junctionType))
        if (!event) return
        result = await recordProbe(event.id, outcome.interactionId, outcome.junctionType, outcome.optionCount, outcome.correct, outcome.hintUsed)
      }
      set((state) => ({ activeEvents: upsertEvent(state.activeEvents, result.event) }))

      if (result.event.bottomedOut && result.event.status === 'PERSISTENT') {
        set({ lastBottomedOutCategory: result.event.category })
        return
      }
      if (result.shouldEscalate && !get().pendingRemediation) {
        const pending = prepareTaskForEvent(result.event, algorithmTopicSlug)
        if (pending) set({ pendingRemediation: pending })
      }
    } catch {
      // Best-effort: a failed loop call must never block practice.
    }
  },

  markPresented() {
    const pending = get().pendingRemediation
    if (!pending || pending.remediationId) return
    const { payload } = pending
    const remediationId = presentRemediation(pending.eventId, payload.taskType, payload.level, payload)
      .then((remediation) => remediation.id)
      .catch(() => null)
    set({ pendingRemediation: { ...pending, remediationId } })
  },

  async completePendingRemediation(outcome) {
    const pending = get().pendingRemediation
    if (!pending) return
    set({ pendingRemediation: null })
    try {
      const remediationId = await pending.remediationId
      if (remediationId) await completeRemediation(remediationId, outcome.correct, outcome.skipped)
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
