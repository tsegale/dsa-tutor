import { prisma } from '../lib/prisma'
import type { MisconceptionEventDto } from '../dtos/misconceptionEvent.dto'

export type MisconceptionStatus = 'OPEN' | 'REMEDIATED' | 'RESOLVED' | 'PERSISTENT' | 'ABANDONED'

export function toEventDto(event: {
  id: string
  algorithmTopicId: string
  category: string
  status: string
  remediationCount: number
  probeCount: number
  consecutiveCorrect: number
  junctionsSinceDetection: number
  bottomedOut: boolean
  detectedAt: Date
  resolvedAt: Date | null
}): MisconceptionEventDto {
  return {
    id: event.id,
    algorithmTopicId: event.algorithmTopicId,
    category: event.category,
    status: event.status,
    remediationCount: event.remediationCount,
    probeCount: event.probeCount,
    consecutiveCorrect: event.consecutiveCorrect,
    junctionsSinceDetection: event.junctionsSinceDetection,
    bottomedOut: event.bottomedOut,
    detectedAt: event.detectedAt.toISOString(),
    resolvedAt: event.resolvedAt?.toISOString() ?? null,
  }
}

const ABANDON_JUNCTION_THRESHOLD = 25
const ABANDON_SESSION_GAP = 2
const BOTTOM_OUT_REMEDIATION_COUNT = 3

// --- Pure, deterministic decision rules (unit-testable without Prisma) ---

/** 2-option junctions need two clean (no-hint) correct probes in a row;
 * 3+ option junctions need only one, since guessing correctly twice in a
 * row on a binary choice is far more likely than guessing right once on
 * a 3+-way choice. */
export function requiredConsecutiveCorrect(optionCount: number): number {
  return optionCount >= 3 ? 1 : 2
}

export interface ProbeEvaluationInput {
  consecutiveCorrect: number
  remediationCount: number
  optionCount: number
  correct: boolean
  hintUsed: boolean
}

export interface ProbeEvaluationResult {
  consecutiveCorrect: number
  remediationCount: number
  status: 'OPEN' | 'RESOLVED' | 'PERSISTENT'
  shouldEscalate: boolean
  bottomedOut: boolean
}

/** The single place the resolve/persist rule lives. A wrong probe resets
 * progress and escalates. A correct-but-hinted probe breaks the streak
 * without counting as a failure - the resolve rule requires "no hint on
 * either" probe, so a hint withholds credit but is not itself evidence
 * the misconception persists. */
export function evaluateProbe(input: ProbeEvaluationInput): ProbeEvaluationResult {
  if (input.correct && !input.hintUsed) {
    const consecutiveCorrect = input.consecutiveCorrect + 1
    const resolved = consecutiveCorrect >= requiredConsecutiveCorrect(input.optionCount)
    return {
      consecutiveCorrect,
      remediationCount: input.remediationCount,
      status: resolved ? 'RESOLVED' : 'OPEN',
      shouldEscalate: false,
      bottomedOut: false,
    }
  }

  if (input.correct && input.hintUsed) {
    return {
      consecutiveCorrect: 0,
      remediationCount: input.remediationCount,
      status: 'OPEN',
      shouldEscalate: false,
      bottomedOut: false,
    }
  }

  // Incorrect probe: resets progress and escalates.
  const remediationCount = input.remediationCount + 1
  const bottomedOut = remediationCount >= BOTTOM_OUT_REMEDIATION_COUNT
  return {
    consecutiveCorrect: 0,
    remediationCount,
    status: bottomedOut ? 'PERSISTENT' : 'OPEN',
    shouldEscalate: !bottomedOut,
    bottomedOut,
  }
}

export function nextRemediationLevel(remediationCount: number): number {
  return remediationCount + 1
}

export function shouldAbandonByJunctionCount(junctionsSinceDetection: number): boolean {
  return junctionsSinceDetection > ABANDON_JUNCTION_THRESHOLD
}

export function shouldAbandonBySessionGap(completedSessionsSinceDetection: number): boolean {
  return completedSessionsSinceDetection >= ABANDON_SESSION_GAP
}

// --- Orchestration (Prisma-touching) ---

const ACTIVE_STATUSES = ['OPEN', 'REMEDIATED']

/** Creates a new OPEN event, or escalates the existing OPEN/REMEDIATED
 * event for this (user, topic, category) instead of creating a second
 * one - enforced here since Prisma has no portable partial-unique index
 * for "unique while status is OPEN or REMEDIATED". */
export async function detectOrEscalate(
  userId: string,
  algorithmTopicId: string,
  category: string,
  detectedInteractionId: string,
) {
  const existing = await prisma.misconceptionEvent.findFirst({
    where: { userId, algorithmTopicId, category, status: { in: ACTIVE_STATUSES } },
  })

  if (existing) {
    return prisma.misconceptionEvent.update({
      where: { id: existing.id },
      data: { remediationCount: { increment: 1 } },
    })
  }

  return prisma.misconceptionEvent.create({
    data: { userId, algorithmTopicId, category, detectedInteractionId, status: 'OPEN' },
  })
}

export async function presentRemediation(
  userId: string,
  eventId: string,
  taskType: string,
  level: number,
  payload: unknown,
) {
  const owned = await prisma.misconceptionEvent.findFirst({ where: { id: eventId, userId } })
  if (!owned) throw new Error('UNKNOWN_EVENT')

  const [remediation] = await prisma.$transaction([
    prisma.remediation.create({ data: { eventId, taskType, level, payload: payload as object } }),
    prisma.misconceptionEvent.update({ where: { id: eventId }, data: { status: 'REMEDIATED' } }),
  ])
  return remediation
}

export async function completeRemediation(
  userId: string,
  remediationId: string,
  outcome: { correct: boolean | null; skipped: boolean },
) {
  const owned = await prisma.remediation.findFirst({ where: { id: remediationId, event: { userId } } })
  if (!owned) throw new Error('UNKNOWN_REMEDIATION')

  return prisma.remediation.update({
    where: { id: remediationId },
    data: { completedAt: new Date(), correct: outcome.correct, skipped: outcome.skipped },
  })
}

export async function recordProbe(
  userId: string,
  eventId: string,
  interactionId: string,
  junctionType: string,
  optionCount: number,
  correct: boolean,
  hintUsed: boolean,
) {
  const event = await prisma.misconceptionEvent.findFirst({ where: { id: eventId, userId } })
  if (!event) throw new Error('UNKNOWN_EVENT')
  if (!ACTIVE_STATUSES.includes(event.status)) {
    // Already resolved/persistent/abandoned - a late-arriving probe for a
    // junction the student answered after the event closed is just logged
    // for the record, not re-evaluated.
    await prisma.misconceptionProbe.create({
      data: { eventId, interactionId, junctionType, optionCount, correct, hintUsed },
    })
    return { event, shouldEscalate: false }
  }

  const evaluation = evaluateProbe({
    consecutiveCorrect: event.consecutiveCorrect,
    remediationCount: event.remediationCount,
    optionCount,
    correct,
    hintUsed,
  })

  const [, updatedEvent] = await prisma.$transaction([
    prisma.misconceptionProbe.create({
      data: { eventId, interactionId, junctionType, optionCount, correct, hintUsed },
    }),
    prisma.misconceptionEvent.update({
      where: { id: eventId },
      data: {
        probeCount: { increment: 1 },
        consecutiveCorrect: evaluation.consecutiveCorrect,
        remediationCount: evaluation.remediationCount,
        status: evaluation.status,
        bottomedOut: evaluation.bottomedOut,
        resolvedAt: evaluation.status === 'RESOLVED' ? new Date() : undefined,
      },
    }),
  ])

  return { event: updatedEvent, shouldEscalate: evaluation.shouldEscalate }
}

/** Called on every interaction for a topic that has active events, so the
 * abandonment clock advances regardless of whether this particular
 * junction happened to probe the category. */
export async function incrementJunctionsSinceDetection(userId: string, algorithmTopicId: string) {
  const activeEvents = await prisma.misconceptionEvent.findMany({
    where: { userId, algorithmTopicId, status: { in: ACTIVE_STATUSES } },
  })

  for (const event of activeEvents) {
    const junctionsSinceDetection = event.junctionsSinceDetection + 1
    await prisma.misconceptionEvent.update({
      where: { id: event.id },
      data: {
        junctionsSinceDetection,
        status: shouldAbandonByJunctionCount(junctionsSinceDetection) ? 'ABANDONED' : event.status,
      },
    })
  }
}

/** Called when a new session starts on a topic - catches the "left and
 * didn't come back" abandonment path the per-junction counter above can't
 * see, since no junctions fire at all while the student is elsewhere. */
export async function checkStaleEventsOnSessionStart(userId: string, algorithmTopicId: string) {
  const activeEvents = await prisma.misconceptionEvent.findMany({
    where: { userId, algorithmTopicId, status: { in: ACTIVE_STATUSES } },
  })

  for (const event of activeEvents) {
    const completedSessionsSinceDetection = await prisma.session.count({
      where: { userId, algorithmTopicId, completed: true, startTime: { gt: event.detectedAt } },
    })
    if (shouldAbandonBySessionGap(completedSessionsSinceDetection)) {
      await prisma.misconceptionEvent.update({ where: { id: event.id }, data: { status: 'ABANDONED' } })
    }
  }
}

export async function getEventStatusForTopic(userId: string, algorithmTopicId: string) {
  return prisma.misconceptionEvent.findMany({
    where: { userId, algorithmTopicId, status: { in: ACTIVE_STATUSES } },
  })
}

export async function getDashboardSummary(userId: string): Promise<{ resolved: number; inProgress: number }> {
  const [resolved, inProgress] = await Promise.all([
    prisma.misconceptionEvent.count({ where: { userId, status: 'RESOLVED' } }),
    prisma.misconceptionEvent.count({ where: { userId, status: { in: ACTIVE_STATUSES } } }),
  ])
  return { resolved, inProgress }
}
