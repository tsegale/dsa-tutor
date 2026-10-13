import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// The shared types package is TypeScript source with no build step. The
// compiled api runs on plain Node, so a value import from it crashes the api
// at startup (it did once: Phase 6D, a failed Railway healthcheck). Only
// `import type` is allowed outside tests, which run through Vite.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.ts$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : []
  })
}

describe('imports from @dsa-tutor/types', () => {
  it('are type-only in api source', () => {
    const offenders = sourceFiles(join(__dirname, '..')).filter((file) =>
      /import\s+(?!type\b)[^;]*?from\s+'@dsa-tutor\/types'/s.test(readFileSync(file, 'utf8'))
    )
    expect(offenders).toEqual([])
  })
})
