/**
 * Every environment variable the API needs in production. Railway variables
 * are set by hand in its dashboard, so a variable added to .env.example is
 * NOT deployed by pushing code - STUDY_ENROLMENT_CODES went unset in
 * production for a week that way, and every enrolment code was rejected.
 *
 * requiredEnv.test.ts fails if the code reads a variable that is not listed
 * here, in .env.example and in DEPLOYMENT.md. At startup the API logs any
 * that are missing, and /health reports them.
 */
export const REQUIRED_PRODUCTION_ENV = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'PORT',
  'NODE_ENV',
  'AI_SERVICE_URL',
  'ALLOWED_ORIGINS',
  'STUDY_ENROLMENT_CODES',
  'STUDY_RESEARCHER_PIN',
] as const

/** Names of required variables that are unset or blank. */
export function missingProductionEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return REQUIRED_PRODUCTION_ENV.filter((name) => !env[name]?.trim())
}
