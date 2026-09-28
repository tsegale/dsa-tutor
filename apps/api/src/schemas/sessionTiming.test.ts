import { describe, expect, it } from 'vitest'
import * as S from './routes'

describe('session timing telemetry (Week 2 2F)', () => {
  const update = S.sessions.update.body

  it('accepts cumulative wall-clock and active seconds', () => {
    expect(update.safeParse({ wallClockSeconds: 1260, activeSeconds: 1100 }).success).toBe(true)
  })

  it('rejects negative, fractional or absurd values', () => {
    expect(update.safeParse({ wallClockSeconds: -1 }).success).toBe(false)
    expect(update.safeParse({ activeSeconds: 12.5 }).success).toBe(false)
    expect(update.safeParse({ wallClockSeconds: 86_401 }).success).toBe(false)
  })
})
