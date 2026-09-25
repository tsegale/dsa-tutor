import type { Express } from 'express'

// Walks Express 4's internal route table so coverage tests can assert
// something about every registered route. Typed only as far as needed.
type Handle = ((...args: unknown[]) => unknown) & { stack?: Layer[]; [key: symbol]: unknown }

interface Layer {
  handle: Handle
  route?: { path: string; methods: Record<string, boolean>; stack: Layer[] }
  regexp?: RegExp
}

export interface RegisteredRoute {
  /** "METHOD /full/path", e.g. "POST /api/v1/interactions/". */
  name: string
  method: string
  path: string
  handlers: Handle[]
}

function collect(stack: Layer[], prefix: string): RegisteredRoute[] {
  return stack.flatMap((layer) => {
    if (layer.route) {
      const method = Object.keys(layer.route.methods).join(',').toUpperCase()
      const path = prefix + layer.route.path
      return [{ name: `${method} ${path}`, method, path, handlers: layer.route.stack.map((l) => l.handle) }]
    }
    if (layer.handle.stack) {
      // Mounted router: recover its mount path from the layer's regexp.
      const mount = layer.regexp?.source.match(/^\^\\(\/[^?]*?)\\\/\?/)?.[1]?.replace(/\\\//g, '/') ?? ''
      return collect(layer.handle.stack, prefix + mount)
    }
    return []
  })
}

/** Every API route, minus the unauthenticated liveness probe. */
export function registeredRoutes(app: Express): RegisteredRoute[] {
  const root = (app as unknown as { _router: { stack: Layer[] } })._router.stack
  return collect(root, '').filter((route) => route.name !== 'GET /health')
}

/** Strips the trailing slash Express leaves on a router's "/" route. */
export function routeKey(route: RegisteredRoute): string {
  return `${route.method} ${route.path.replace(/\/$/, '')}`
}
