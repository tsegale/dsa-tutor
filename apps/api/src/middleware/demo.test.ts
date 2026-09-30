import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEMO_ACCOUNTS_PER_IP_PER_HOUR,
  DEMO_AI_CALLS_PER_ACCOUNT,
  allowDemoAiCall,
  allowDemoCreation,
  resetDemoLimitsForTests,
} from './demo'

beforeEach(() => resetDemoLimitsForTests())

describe('demo guard rails (4D.6)', () => {
  it('limits demo accounts per IP per hour, and frees the slot after an hour', () => {
    const t0 = Date.parse('2026-09-30T10:00:00Z')
    for (let i = 0; i < DEMO_ACCOUNTS_PER_IP_PER_HOUR; i++) expect(allowDemoCreation('1.2.3.4', t0 + i)).toBe(true)
    expect(allowDemoCreation('1.2.3.4', t0 + 10)).toBe(false)
    expect(allowDemoCreation('5.6.7.8', t0 + 10)).toBe(true)
    expect(allowDemoCreation('1.2.3.4', t0 + 60 * 60 * 1000 + 1)).toBe(true)
  })

  it('caps AI calls per demo account', () => {
    for (let i = 0; i < DEMO_AI_CALLS_PER_ACCOUNT; i++) expect(allowDemoAiCall('demo-1')).toBe(true)
    expect(allowDemoAiCall('demo-1')).toBe(false)
    expect(allowDemoAiCall('demo-2')).toBe(true)
  })
})
