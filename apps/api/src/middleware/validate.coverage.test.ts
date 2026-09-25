import { describe, expect, it } from 'vitest'
import app from '../app'
import { VALIDATOR_MARK } from './validate'

// Express 4 internals, typed only as far as this walk needs them.
interface Layer {
  handle: ((...args: unknown[]) => unknown) & { stack?: Layer[]; [VALIDATOR_MARK]?: unknown }
  route?: { path: string; methods: Record<string, boolean>; stack: Layer[] }
  regexp?: RegExp
}

function collectRoutes(stack: Layer[], prefix = ''): { name: string; validated: boolean }[] {
  return stack.flatMap((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase()
      const validated = layer.route.stack.some((l) => VALIDATOR_MARK in l.handle)
      return [{ name: `${methods} ${prefix}${layer.route.path}`, validated }]
    }
    if (layer.handle.stack) {
      // Mounted router: recover its mount path from the layer's regexp.
      const mount = layer.regexp?.source.match(/^\^\\(\/[^?]*?)\\\/\?/)?.[1]?.replace(/\\\//g, '/') ?? ''
      return collectRoutes(layer.handle.stack, prefix + mount)
    }
    return []
  })
}

describe('request validation coverage', () => {
  const routes = collectRoutes((app as unknown as { _router: { stack: Layer[] } })._router.stack).filter(
    // The unauthenticated liveness probe takes no input and is not an API route.
    (route) => route.name !== 'GET /health',
  )

  it('finds the real route table', () => {
    // A broken walk would return nothing and pass the check below vacuously.
    expect(routes.length).toBeGreaterThanOrEqual(45)
  })

  it('attaches a validate() schema to every registered API route', () => {
    expect(routes.filter((route) => !route.validated).map((route) => route.name)).toEqual([])
  })
})
