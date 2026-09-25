import { describe, expect, it } from 'vitest'
import app from '../app'
import { VALIDATOR_MARK } from './validate'
import { registeredRoutes } from './routeTable.testutil'

describe('request validation coverage', () => {
  const routes = registeredRoutes(app)

  it('finds the real route table', () => {
    // A broken walk would return nothing and pass the check below vacuously.
    expect(routes.length).toBeGreaterThanOrEqual(45)
  })

  it('attaches a validate() schema to every registered API route', () => {
    const unvalidated = routes.filter((route) => !route.handlers.some((h) => VALIDATOR_MARK in h))
    expect(unvalidated.map((route) => route.name)).toEqual([])
  })
})
