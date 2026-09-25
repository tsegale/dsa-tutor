import { NextFunction, RequestHandler, Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthRequest } from './auth'

// Shape is validated by validate(); ownership is validated here. Every id
// that names a user-owned row is checked against the authenticated user
// before the handler runs, so a service can never be handed someone
// else's session, interaction, attempt, event or remediation.

export type OwnedResource = 'session' | 'interaction' | 'attempt' | 'event' | 'remediation'

/** Which request field carries which kind of owned id. */
export const RESOURCE_KEYS: Record<string, OwnedResource> = {
  sessionId: 'session',
  interactionId: 'interaction',
  detectedInteractionId: 'interaction',
  attemptId: 'attempt',
  eventId: 'event',
  remediationId: 'remediation',
}

/**
 * Id fields that look like resource ids but are deliberately not
 * ownership-checked, keyed by "METHOD /full/path". Each needs a reason;
 * the coverage test fails on any resource id not guarded or listed here.
 */
export const OWNERSHIP_EXEMPT: Record<string, { keys: string[]; reason: string }> = {
  'POST /api/v1/ai/predictions': {
    keys: ['sessionId'],
    reason:
      'Forwarded to the stateless AI service only, never used to read or write data. The client sends "local-session" when it has no session.',
  },
  'POST /api/v1/ai/predictions/stream': {
    keys: ['sessionId'],
    reason: 'Same as /ai/predictions - forwarded to the AI service, no data access.',
  },
  'POST /api/v1/ai/predictions/evaluate': {
    keys: ['sessionId'],
    reason: 'Same as /ai/predictions - forwarded to the AI service, no data access.',
  },
  'POST /api/v1/ai/feynman': {
    keys: ['sessionId'],
    reason: 'Forwarded to the AI service for grading only; the interaction write goes through POST /interactions, which is guarded.',
  },
}

/**
 * Id fields that name shared rows every user may reference, so there is no
 * owner to check. Listed so the coverage test can tell "shared on purpose"
 * from "forgot to classify".
 */
export const SHARED_IDS: Record<string, string> = {
  algorithmTopicId: 'Algorithm topics are the shared curriculum catalog.',
  itemId: 'Assessment items are shared questions; the attempt they are answered in is ownership-checked.',
  code: 'Assessment codes name shared assessments; the attempt itself is per user.',
  studentId: 'Only accepted on the educator-only /ai/summaries/student route.',
}

type OwnershipCheck =(id: string, userId: string) => Promise<boolean>

const CHECKS: Record<OwnedResource, OwnershipCheck> = {
  session: async (id, userId) => (await prisma.session.count({ where: { id, userId } })) > 0,
  interaction: async (id, userId) => (await prisma.interaction.count({ where: { id, session: { userId } } })) > 0,
  attempt: async (id, userId) => (await prisma.assessmentAttempt.count({ where: { id, userId } })) > 0,
  event: async (id, userId) => (await prisma.misconceptionEvent.count({ where: { id, userId } })) > 0,
  remediation: async (id, userId) => (await prisma.remediation.count({ where: { id, event: { userId } } })) > 0,
}

export interface OwnedField {
  in: 'params' | 'body' | 'query'
  key: keyof typeof RESOURCE_KEYS
}

export const OWNERSHIP_MARK = Symbol('ownershipGuard')

type MarkedHandler = RequestHandler & { [OWNERSHIP_MARK]: OwnedField[] }

/**
 * Rejects the request with 404 - not 403 - unless every listed id belongs
 * to the caller, so another user's ids cannot be told apart from ids that
 * do not exist. Mount after authenticate and validate(). An absent
 * optional field is skipped; its presence is validate()'s job.
 */
export function requireOwnership(...fields: OwnedField[]): MarkedHandler {
  const handler = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      for (const field of fields) {
        const source = req[field.in] as Record<string, unknown> | undefined
        const id = source?.[field.key]
        if (id === undefined) continue
        const owned = typeof id === 'string' && req.userId !== undefined && (await CHECKS[RESOURCE_KEYS[field.key]](id, req.userId))
        if (!owned) {
          res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Resource not found' } })
          return
        }
      }
      next()
    } catch (err) {
      next(err)
    }
  }

  return Object.assign(handler, { [OWNERSHIP_MARK]: fields }) as MarkedHandler
}
