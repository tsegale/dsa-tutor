import type { NextFunction, Request, Response } from 'express'
import type { AuthRequest } from './auth'

// "Try the demo" guard rails (Week 4 4D.6). A public login that needs no
// password must not become a way to spend the study's Claude budget or to
// flood the database, so demo accounts are rate limited at creation and
// capped on AI calls. In memory, per api instance: a deploy resets both,
// which is acceptable for guard rails on a single-instance prototype.

export const DEMO_ACCOUNTS_PER_IP_PER_HOUR = 5
export const DEMO_AI_CALLS_PER_ACCOUNT = 40
const HOUR_MS = 60 * 60 * 1000

/** Creation timestamps per client IP, oldest first. */
const creations = new Map<string, number[]>()
const aiCalls = new Map<string, number>()

export function allowDemoCreation(ip: string, now = Date.now()): boolean {
  const recent = (creations.get(ip) ?? []).filter((t) => now - t < HOUR_MS)
  if (recent.length >= DEMO_ACCOUNTS_PER_IP_PER_HOUR) {
    creations.set(ip, recent)
    return false
  }
  creations.set(ip, [...recent, now])
  return true
}

/** Counts one AI call for a demo account; false once it is over the cap. */
export function allowDemoAiCall(userId: string): boolean {
  const used = aiCalls.get(userId) ?? 0
  if (used >= DEMO_AI_CALLS_PER_ACCOUNT) return false
  aiCalls.set(userId, used + 1)
  return true
}

export function demoCreationLimit(req: Request, res: Response, next: NextFunction): void {
  if (allowDemoCreation(req.ip ?? 'unknown')) {
    next()
    return
  }
  res.status(429).json({
    data: null,
    error: { code: 'DEMO_RATE_LIMITED', message: 'Too many demo accounts from this network. Try again in an hour.' },
  })
}

/** For AI routes: demo accounts get a fixed number of model calls. */
export function demoAiQuota(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.isDemo || allowDemoAiCall(req.userId!)) {
    next()
    return
  }
  res.status(429).json({
    data: null,
    error: { code: 'DEMO_AI_LIMIT', message: 'This demo has used its AI feedback allowance. Register to keep going.' },
  })
}

export function resetDemoLimitsForTests(): void {
  creations.clear()
  aiCalls.clear()
}
