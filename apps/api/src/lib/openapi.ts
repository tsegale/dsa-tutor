import type { Express } from 'express'
import { z } from 'zod'
import { VALIDATOR_MARK, type RequestSchema } from '../middleware/validate'
import { registeredRoutes } from './routeTable'

// OpenAPI 3.1 built from the running app (Week 4 4D.3): the paths are
// Express's own route table and every request shape is the zod schema that
// route's validate() enforces, converted with zod's native JSON Schema
// support. Nothing is written by hand, so the spec cannot drift from what
// the api accepts.

/** Routes callable without a token. Everything else takes a Bearer JWT. */
const PUBLIC_ROUTES = new Set(['POST /api/v1/auth/register', 'POST /api/v1/auth/login', 'POST /api/v1/auth/demo', 'GET /api/v1/docs', 'GET /api/v1/docs/openapi.json'])

type JsonSchema = Record<string, unknown>

function toJsonSchema(schema: z.ZodType | undefined): JsonSchema | null {
  if (!schema) return null
  try {
    const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as JsonSchema
    delete json.$schema
    return json
  } catch {
    return { description: 'Validated server-side; this shape has no JSON Schema form.' }
  }
}

function parameters(schema: z.ZodType | undefined, location: 'path' | 'query') {
  const json = toJsonSchema(schema)
  const properties = (json?.properties ?? {}) as Record<string, JsonSchema>
  const required = new Set((json?.required as string[] | undefined) ?? [])
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: location,
    required: location === 'path' || required.has(name),
    schema: property,
  }))
}

const envelope = (data: JsonSchema = {}) => ({
  type: 'object',
  required: ['data', 'error'],
  properties: { data, error: { oneOf: [{ type: 'null' }, { $ref: '#/components/schemas/Error' }] } },
})

export function buildOpenApi(app: Express, version: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {}

  for (const route of registeredRoutes(app)) {
    const path = route.path.replace(/\/$/, '') || '/'
    const key = `${route.method} ${path}`
    const validator = route.handlers.find((h) => VALIDATOR_MARK in h) as { [VALIDATOR_MARK]: RequestSchema } | undefined
    const schema = validator?.[VALIDATOR_MARK] ?? {}
    const openApiPath = path.replace(/:(\w+)/g, '{$1}')
    const tag = path.split('/')[3] ?? 'meta'
    const body = toJsonSchema(schema.body)
    const hasBody = body && Object.keys((body.properties as object) ?? {}).length > 0

    for (const method of route.method.toLowerCase().split(',')) {
      paths[openApiPath] ??= {}
      paths[openApiPath][method] = {
        tags: [tag],
        operationId: `${method}_${openApiPath.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')}`,
        ...(PUBLIC_ROUTES.has(key) ? { security: [] } : {}),
        parameters: [...parameters(schema.params, 'path'), ...parameters(schema.query, 'query')],
        ...(hasBody ? { requestBody: { required: true, content: { 'application/json': { schema: body } } } } : {}),
        responses: {
          200: { description: 'Success. JSON routes return the { data, error } envelope; *.csv routes return text/csv.', content: { 'application/json': { schema: envelope() } } },
          400: { description: 'The request did not match this schema (VALIDATION_ERROR, with details).', content: { 'application/json': { schema: envelope({ type: 'null' }) } } },
          ...(PUBLIC_ROUTES.has(key) ? {} : { 401: { description: 'Missing or invalid Bearer token.' } }),
        },
      }
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'DSA Tutor API',
      version,
      description:
        'REST api for the DSA Tutor research platform. Every response is { data, error }. Request schemas are generated from the zod validators the api enforces.',
    },
    servers: [{ url: '/' }],
    security: [{ bearer: [] }],
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: {
          type: 'object',
          required: ['code', 'message'],
          properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} },
        },
      },
    },
    paths,
  }
}

/** A static page that renders the spec with Redoc (loaded from jsDelivr). */
export function docsPage(specUrl: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DSA Tutor API</title>
<style>body { margin: 0; }</style>
</head>
<body>
<redoc spec-url="${specUrl}"></redoc>
<script src="https://cdn.jsdelivr.net/npm/redoc@2/bundles/redoc.standalone.js"></script>
</body>
</html>`
}
