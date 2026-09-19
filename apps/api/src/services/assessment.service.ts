import { prisma } from '../lib/prisma'
import { getStudyStatus } from './study.service'
import type { AssessmentAttemptDto } from '../dtos/assessment.dto'

/** Deterministic scoring only - no LLM anywhere in this path. TRACE items
 * are compared after trimming surrounding whitespace; everything else must
 * match exactly, so the instrument's grading can't drift between runs. */
export function scoreResponse(
  item: { itemType: 'MULTIPLE_CHOICE' | 'TRACE'; correctOptionId: string | null; maxScore: number },
  rawResponse: string,
): { isCorrect: boolean; score: number } {
  const normalized = item.itemType === 'TRACE' ? rawResponse.trim() : rawResponse
  const isCorrect = item.correctOptionId !== null && normalized === item.correctOptionId
  return { isCorrect, score: isCorrect ? item.maxScore : 0 }
}

function toAttemptDto(attempt: {
  id: string
  startedAt: Date
  completedAt: Date | null
  assessment: {
    id: string
    code: string
    phase: 'PRE' | 'POST'
    title: string
    items: Array<{
      id: string
      order: number
      itemType: 'MULTIPLE_CHOICE' | 'TRACE'
      stem: string
      options: unknown
    }>
  }
}): AssessmentAttemptDto {
  return {
    id: attempt.id,
    assessmentId: attempt.assessment.id,
    code: attempt.assessment.code,
    phase: attempt.assessment.phase,
    title: attempt.assessment.title,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
    items: attempt.assessment.items
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        id: item.id,
        order: item.order,
        itemType: item.itemType,
        stem: item.stem,
        // correctOptionId is deliberately never sent to the client.
        options: (item.options as Array<{ id: string; text: string }> | null) ?? null,
      })),
  }
}

/** Starting an already-completed attempt returns it unchanged - the study
 * instrument does not allow retakes, so this is intentionally idempotent
 * rather than an error. */
export async function startAttempt(userId: string, code: string): Promise<AssessmentAttemptDto> {
  const status = await getStudyStatus(userId)
  if (!status.isParticipant) {
    throw new Error('NOT_A_PARTICIPANT')
  }
  // Consent is enforced here too, not just by the frontend's route gate -
  // "no participant reaches ... an assessment without it" has to hold even
  // if a client is scripted directly against the API.
  if (status.consentRequired) {
    throw new Error('CONSENT_REQUIRED')
  }

  const assessment = await prisma.assessment.findUnique({
    where: { code },
    include: { items: true },
  })
  if (!assessment) {
    throw new Error('UNKNOWN_ASSESSMENT')
  }

  if (assessment.phase === 'POST' && !status.posttestAvailable) {
    throw new Error('POSTTEST_NOT_AVAILABLE')
  }

  const existing = await prisma.assessmentAttempt.findUnique({
    where: { userId_assessmentId: { userId, assessmentId: assessment.id } },
  })
  if (existing) {
    return toAttemptDto({ ...existing, assessment })
  }

  const attempt = await prisma.assessmentAttempt.create({
    data: { userId, assessmentId: assessment.id },
  })
  return toAttemptDto({ ...attempt, assessment })
}

/** Scores server-side and stores the result, but never returns isCorrect or
 * score to the caller - the router echoes back only an acknowledgement, so
 * no answer feedback reaches the student during or after the study. */
export async function submitResponse(
  userId: string,
  attemptId: string,
  itemId: string,
  response: string,
  timeSpentSeconds: number,
): Promise<void> {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } })
  if (!attempt || attempt.userId !== userId) {
    throw new Error('UNKNOWN_ATTEMPT')
  }
  if (attempt.completedAt) {
    throw new Error('ATTEMPT_COMPLETED')
  }

  const item = await prisma.assessmentItem.findUnique({ where: { id: itemId } })
  if (!item || item.assessmentId !== attempt.assessmentId) {
    throw new Error('UNKNOWN_ITEM')
  }

  const { isCorrect, score } = scoreResponse(item, response)

  await prisma.assessmentResponse.upsert({
    where: { attemptId_itemId: { attemptId, itemId } },
    create: { attemptId, itemId, response, isCorrect, score, timeSpentSeconds },
    update: { response, isCorrect, score, timeSpentSeconds },
  })
}

export async function completeAttempt(userId: string, attemptId: string): Promise<void> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { responses: true },
  })
  if (!attempt || attempt.userId !== userId) {
    throw new Error('UNKNOWN_ATTEMPT')
  }
  if (attempt.completedAt) {
    return
  }

  const totalScore = attempt.responses.reduce((sum, r) => sum + (r.score ?? 0), 0)
  await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: { completedAt: new Date(), totalScore },
  })
}
