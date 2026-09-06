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

## Local development

Copy each .env.example to .env and fill in local values.
Never commit .env files.
