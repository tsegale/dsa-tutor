# Deployment configuration

## Regions

Both Railway services (api and ai) run in **EU West (Amsterdam)**, next to the
Supabase database (eu-west-2, London). They were in US West until 2026-09-29,
which put every database query across the Atlantic: a status request with a few
queries took a median 1,211 ms from Namibia before the move and 363 ms after.
Keep the services in the same region as the database (Settings > Scale >
Regions & Replicas).

## apps/api (Railway)

Every variable in this table except REDIS_URL is required (the API logs any missing at
startup, and `GET /health` lists them). Railway does not pick up variables from
`.env.example` - add each one by hand in the service's Variables tab. The list
in code is `apps/api/src/config/requiredEnv.ts`; a test keeps it, this table
and `.env.example` in sync.

| Variable | Purpose | Where to get it |
|---|---|---|
| DATABASE_URL | PostgreSQL connection | Supabase > Settings > Database > URI |
| DIRECT_URL | PostgreSQL connection for migrations | Supabase Session Pooler URI (see below) |
| REDIS_URL | Redis connection (not yet read by any code path - see note below) | Upstash > Database > Redis URL |
| JWT_SECRET | Token signing key | Generate: openssl rand -hex 32 |
| JWT_EXPIRES_IN | Token lifetime | Set to 7d |
| PORT | Server port | Set to 3001 |
| NODE_ENV | Environment | Set to production |
| AI_SERVICE_URL | AI microservice URL | Railway AI service domain |
| ALLOWED_ORIGINS | CORS allowed origins | Vercel frontend domain |
| STUDY_RESEARCHER_PIN | Researcher-only PIN that lets a participant take the post-test without meeting the topic-completion rule (recorded) | Choose one; never give it to participants |

### Showcase demo account

A signed-in learner with realistic progress (Module 1 largely complete, Modules
2 and 3 part done, Module 4 complete, Module 5 available, Module 6 locked), for
walkthroughs and screenshots. Run against the target database, after the seed:

    DEMO_SEED_EMAIL=... DEMO_SEED_PASSWORD=... pnpm --filter api seed-demo-account

The variables are read by the script only, not by the running api, so they are
not in the table above. The account is `isDemo` with no participant code, so it
is excluded from research exports, educator analytics and study enrolment, and
its AI calls are capped like any demo account. Re-running the script resets its
progress; it refuses an email that belongs to a real account.

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

**Every public table needs row level security on.** Supabase serves the public
schema through its Data API to anyone holding the anon key. Migration
`20261013090000_enable_row_level_security` turns RLS on, with no policies, for
every table that existed then; the app is unaffected because Prisma connects as
the table owner. A table added later needs `ALTER TABLE public."Name" ENABLE ROW
LEVEL SECURITY;` in its migration (the Security Advisor flags it otherwise).
Migrations are applied by hand (`prisma migrate deploy` with DATABASE_URL set to
the Session Pooler); the container does not run them.

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
