import { describe, it, expect } from 'vitest'
import { lastPositionKey, readLastPosition, writeLastPosition } from './lastPosition'

function memory() {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map }
}

describe('lastPosition', () => {
  it('round-trips per user', () => {
    const storage = memory()
    writeLastPosition(storage, 'u1', { topic: 'bubble-sort', step: 24, total: 52, at: '2026-10-11T10:00:00Z' })
    expect(readLastPosition(storage, 'u1')).toEqual({ topic: 'bubble-sort', step: 24, total: 52, at: '2026-10-11T10:00:00Z' })
    expect(readLastPosition(storage, 'u2')).toBeNull()
  })

  it('rejects malformed or out-of-range records', () => {
    const storage = memory()
    for (const bad of ['not json', '{"topic":"x"}', '{"topic":"x","step":9,"total":5,"at":"2026-10-11T10:00:00Z"}', '{"topic":"x","step":1,"total":5,"at":"later"}']) {
      storage.map.set(lastPositionKey('u1'), bad)
      expect(readLastPosition(storage, 'u1')).toBeNull()
    }
  })

  it('survives blocked storage and a missing user', () => {
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(readLastPosition(blocked, 'u1')).toBeNull()
    expect(() => writeLastPosition(blocked, 'u1', { topic: 'x', step: 1, total: 2, at: '2026-10-11T10:00:00Z' })).not.toThrow()
    expect(readLastPosition(memory(), null)).toBeNull()
  })
})
