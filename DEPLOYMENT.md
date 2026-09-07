# Deployment configuration

## apps/api (Railway)

| Variable | Purpose | Where to get it |
|---|---|---|
| DATABASE_URL | PostgreSQL connection | Supabase > Settings > Database > URI |
| REDIS_URL | Redis connection (not yet read by any code path - see note below) | Upstash > Database > Redis URL |
| JWT_SECRET | Token signing key | Generate: openssl rand -hex 32 |
| JWT_EXPIRES_IN | Token lifetime | Set to 7d |
| PORT | Server port | Set to 3001 |
| NODE_ENV | Environment | Set to production |
| AI_SERVICE_URL | AI microservice URL | Railway AI service domain |
| ALLOWED_ORIGINS | CORS allowed origins | Vercel frontend domain |

## apps/ai (Railway)

| Variable | Purpose | Where to get it |
|---|---|---|
| ANTHROPIC_API_KEY | Claude API access | console.anthropic.com |
| CLAUDE_MODEL | Model name | claude-sonnet-4-6 |
| MAX_TOKENS | Max response length | 1000 |
| ALLOWED_ORIGINS | CORS allowed origins | Railway API domain + Vercel domain |
| PORT | Server port | 8000 |

## apps/web (Vercel)

| Variable | Purpose | Where to get it |
|---|---|---|
| VITE_API_URL | Backend API URL | Railway API service domain |

The frontend never calls the AI microservice directly, in development or in
production - every AI-backed request goes through the Node API's own
`/api/v1/ai/*` routes, which forward to `AI_SERVICE_URL` server-side. There is
no `VITE_AI_URL` to configure on the frontend.

Note on REDIS_URL: no code in apps/api currently connects to Redis (no
ioredis/redis dependency, no `process.env.REDIS_URL` read anywhere). The
project's stated architecture calls for it as an AI-response/session cache,
but that layer was never implemented. Provisioning Upstash and setting this
variable is safe and harmless (it is simply unused today) but is not required
for the app to run - skip Step 3 if you would rather not pay for infrastructure
nothing reads yet, and revisit it once caching is actually built.

## Known gotchas (hit during the actual deployment)

**Supabase DATABASE_URL must use the Session Pooler, not the direct connection.**
Supabase's direct connection host (`db.<ref>.supabase.co:5432`) is IPv6-only on
this plan. Railway's outbound networking is IPv4, so a direct-connection
`DATABASE_URL` causes every request to fail with `P1001: Can't reach database
server`. Use Supabase's Dashboard > Connect > Session Pooler string instead
(`postgres.<ref>@aws-0-<region>.pooler.supabase.com:5432` - note the changed
username format). The Session Pooler supports `prisma migrate deploy`, unlike
the Transaction Pooler.

**Railway's Config-as-code (`railway.json`) is deprecated for new services.**
Since 2026-08-28, a service that has never used Config-as-code cannot opt in,
so a committed `railway.json` (like the ones in `apps/api/` and `apps/ai/`) is
silently ignored - Railway falls back to its own Railpack auto-detection
instead, which does not know how to build this monorepo. Set Builder,
Dockerfile Path, Healthcheck Path, and Restart Policy directly in each
service's Settings tab in the Railway dashboard.

**Vercel env vars saved as "Secret" type cannot be inspected or reliably
verified after saving** (Vercel's own security model - write-only). Prefer
"Config" type for non-sensitive build-time values like `VITE_API_URL` so you
can actually confirm what was saved.

**`ALLOWED_ORIGINS` on the API service must include the Vercel domain**, or
the browser blocks reading the response (CORS) even though the request
reaches the server fine - this manifests confusingly as `Unexpected end of
JSON input` in the frontend rather than an obvious CORS error.

## Local development

Copy each .env.example to .env and fill in local values.
Never commit .env files.
