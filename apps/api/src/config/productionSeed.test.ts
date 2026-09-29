import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// Production runs only `prisma db seed` (seed.ts) at startup. The pre/post
// assessments lived in a separate by-hand script and were never loaded in
// production, so the pre-test 404'd for the first participant (2026-09-29).
describe('production startup seed', () => {
  it('loads the study assessments, additively', () => {
    const seed = readFileSync(path.resolve(__dirname, '../../prisma/seed.ts'), 'utf8')
    expect(seed).toMatch(/await seedAssessments\(prisma, \{ replaceItems: false \}\)/)
  })
})
