import { readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { REQUIRED_PRODUCTION_ENV, missingProductionEnv } from './requiredEnv'

const apiRoot = path.resolve(__dirname, '../..')
const repoRoot = path.resolve(apiRoot, '../..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [full] : []
  })
}

/** Every variable the API reads: process.env.X in src, env("X") in the Prisma schema. */
function variablesReadByCode(): Set<string> {
  const names = new Set<string>()
  for (const file of sourceFiles(path.join(apiRoot, 'src'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) names.add(match[1])
  }
  const schema = readFileSync(path.join(apiRoot, 'prisma/schema.prisma'), 'utf8')
  for (const match of schema.matchAll(/env\("([A-Z_][A-Z0-9_]*)"\)/g)) names.add(match[1])
  return names
}

describe('required production environment', () => {
  it('lists every variable the code reads - an unlisted one would go unset in Railway unnoticed', () => {
    const unlisted = [...variablesReadByCode()].filter((name) => !(REQUIRED_PRODUCTION_ENV as readonly string[]).includes(name))
    expect(unlisted).toEqual([])
  })

  it('documents every required variable in .env.example and DEPLOYMENT.md', () => {
    const example = readFileSync(path.join(apiRoot, '.env.example'), 'utf8')
    const deployment = readFileSync(path.join(repoRoot, 'DEPLOYMENT.md'), 'utf8')
    for (const name of REQUIRED_PRODUCTION_ENV) {
      expect(example, `.env.example is missing ${name}`).toMatch(new RegExp(`^${name}=`, 'm'))
      expect(deployment, `DEPLOYMENT.md is missing ${name}`).toContain(`| ${name} |`)
    }
  })

  it('reports unset and blank variables by name', () => {
    const env = Object.fromEntries(REQUIRED_PRODUCTION_ENV.map((name) => [name, 'x'])) as NodeJS.ProcessEnv
    expect(missingProductionEnv(env)).toEqual([])
    expect(missingProductionEnv({ ...env, STUDY_ENROLMENT_CODES: undefined })).toEqual(['STUDY_ENROLMENT_CODES'])
    expect(missingProductionEnv({ ...env, STUDY_ENROLMENT_CODES: '  ' })).toEqual(['STUDY_ENROLMENT_CODES'])
  })
})
