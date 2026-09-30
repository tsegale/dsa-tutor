import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isOwnChunkFailure, reloadOnceForStaleChunk } from './chunkReload'

describe('reloadOnceForStaleChunk', () => {
  let store: Map<string, string>

  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reloads once for a stale chunk', () => {
    const reload = vi.fn()
    expect(reloadOnceForStaleChunk(100_000, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload again within the window, so a real outage surfaces', () => {
    const reload = vi.fn()
    reloadOnceForStaleChunk(100_000, reload)
    expect(reloadOnceForStaleChunk(105_000, reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('allows another reload after the window has passed', () => {
    const reload = vi.fn()
    reloadOnceForStaleChunk(100_000, reload)
    expect(reloadOnceForStaleChunk(111_000, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('still reloads once when storage is blocked', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const reload = vi.fn()
    expect(reloadOnceForStaleChunk(100_000, reload)).toBe(true)
  })
})

describe('isOwnChunkFailure', () => {
  const origin = 'https://dsa-tutor-web.vercel.app'

  it('treats our own chunks as a stale deploy worth one reload', () => {
    expect(isOwnChunkFailure('Failed to fetch dynamically imported module: https://dsa-tutor-web.vercel.app/assets/AlgorithmPage-abc.js', origin)).toBe(true)
    expect(isOwnChunkFailure('Unable to preload CSS for /assets/index-abc.css', origin)).toBe(true)
  })

  it('leaves a third-party failure alone, so the error surfaces instead of a reload', () => {
    expect(isOwnChunkFailure('Failed to fetch dynamically imported module: https://cdn.jsdelivr.net/npm/pyodide@314.0.7/full/pyodide.asm.mjs', origin)).toBe(false)
  })
})
