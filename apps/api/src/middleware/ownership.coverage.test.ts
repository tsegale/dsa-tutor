import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import app from '../app'
import { OWNERSHIP_EXEMPT, OWNERSHIP_MARK, RESOURCE_KEYS, SHARED_IDS, type OwnedField } from './ownership'
import { VALIDATOR_MARK, type RequestSchema } from './validate'
import { registeredRoutes, routeKey, type RegisteredRoute } from './routeTable.testutil'

type Location = 'params' | 'body' | 'query'

/** Every field a route accepts, from its path and its validate() schema. */
function acceptedFields(route: RegisteredRoute): { in: Location; key: string }[] {
  const params = [...route.path.matchAll(/:(\w+)/g)].map((m) => ({ in: 'params' as const, key: m[1] }))
  const schema = route.handlers.find((h) => VALIDATOR_MARK in h)?.[VALIDATOR_MARK] as RequestSchema | undefined
  const shapeKeys = (part: z.ZodType | undefined) =>
    Object.keys((part as unknown as { shape?: Record<string, unknown> } | undefined)?.shape ?? {})
  const body = shapeKeys(schema?.body).map((key) => ({ in: 'body' as const, key }))
  const query = shapeKeys(schema?.query).map((key) => ({ in: 'query' as const, key }))
  return [...params, ...body, ...query]
}

const isIdLike = (key: string) => key === 'id' || /Id$/.test(key) || key === 'code'

describe('ownership coverage', () => {
  const routes = registeredRoutes(app)

  it('finds the real route table', () => {
    expect(routes.length).toBeGreaterThanOrEqual(45)
  })

  it('guards every owned resource id a route accepts, or documents why not', () => {
    const unguarded = routes.flatMap((route) => {
      const guarded = (route.handlers.find((h) => OWNERSHIP_MARK in h)?.[OWNERSHIP_MARK] ?? []) as OwnedField[]
      const exempt = OWNERSHIP_EXEMPT[routeKey(route)]?.keys ?? []
      return acceptedFields(route)
        .filter((field) => field.key in RESOURCE_KEYS)
        .filter((field) => !guarded.some((g) => g.in === field.in && g.key === field.key))
        .filter((field) => !exempt.includes(field.key))
        .map((field) => `${route.name} ${field.in}.${field.key}`)
    })
    expect(unguarded).toEqual([])
  })

  it('classifies every id-like field as owned or shared', () => {
    // A new id type (say, an artifactId) must be added to RESOURCE_KEYS or
    // SHARED_IDS deliberately - it cannot ship unclassified.
    const unclassified = routes.flatMap((route) =>
      acceptedFields(route)
        .filter((field) => isIdLike(field.key))
        .filter((field) => !(field.key in RESOURCE_KEYS) && !(field.key in SHARED_IDS))
        .map((field) => `${route.name} ${field.in}.${field.key}`),
    )
    expect(unclassified).toEqual([])
  })

  it('only exempts routes that exist', () => {
    const keys = new Set(routes.map(routeKey))
    expect(Object.keys(OWNERSHIP_EXEMPT).filter((key) => !keys.has(key))).toEqual([])
  })
})
