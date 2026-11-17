import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { login, register, startDemo } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { DSATutorLogo } from '@/components/brand'
import AuthTrace from '@/components/brand/AuthTrace'
import { MODULES } from '@/config/curriculum'

/**
 * Sign in.
 *
 * The left half is the argument that this is a working engine: a binary
 * search actually running, and the curriculum stated in figures. The right
 * half is the form.
 */

const TOPIC_COUNT = MODULES.reduce((total, module) => total + module.topics.length, 0)

const STAGES = ['Demo', 'Practice', 'Hands-On', 'Code', 'Feynman'] as const

const FIGURES = [
  { value: String(MODULES.length), label: 'Curriculum modules' },
  { value: String(TOPIC_COUNT), label: 'Interactive topics' },
  { value: String(STAGES.length), label: 'Learning stages' },
]

const PILLARS = [
  {
    title: 'Critical Junction Predictions',
    desc: 'Pauses at key algorithmic decisions so you predict the next step before it runs.',
  },
  {
    title: 'Counterfactual Mistake Replay',
    desc: 'Animates the exact consequence of a wrong choice and gives Socratic hints.',
  },
  {
    title: 'Hands-On & Live Python Mode',
    desc: 'Manipulate structures directly on the canvas or write real Python in your browser.',
  },
] as const

const inputWithIconClassName =
  'w-full rounded-md border border-rule bg-surface py-2 pr-3 pl-9 text-body text-ink outline-none transition-colors placeholder:text-ink-placeholder focus:border-brand focus:ring-2 focus:ring-brand/20'

const tabTriggerClassName =
  'flex-1 rounded-sm py-2 text-small font-semibold text-ink-2 transition-colors data-[state=active]:bg-surface data-[state=active]:text-brand data-[state=active]:shadow-e1'

function MailIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="m2.5 4.5 5.5 4 5.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="7" width="10" height="6.5" rx="1.5" />
      <path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2" strokeLinecap="round" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4" strokeLinecap="round" />
    </svg>
  )
}

function SparkCheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-state-sorted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m3.5 8.5 2.8 2.8 6.2-6.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlayRocketIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <polygon points="5,3 13,8 5,13" fill="currentColor" fillOpacity="0.2" strokeLinejoin="round" />
    </svg>
  )
}

/** Where an account goes after it authenticates, by its real role. */
function homeFor(role: string): string {
  return role === 'EDUCATOR' || role === 'ADMIN' ? '/educator' : '/'
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-sm border border-error/30 bg-error-light px-3 py-1.5 text-small text-error">
      {message}
    </p>
  )
}

function LoginForm() {
  const navigate = useNavigate()
  const { applySessionUser, refreshUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await login(email, password)
      applySessionUser(result.user)
      void refreshUser()
      navigate(homeFor(result.user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-small font-medium text-ink">
          Email
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3">
            <MailIcon />
          </span>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputWithIconClassName}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-small font-medium text-ink">
          Password
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3">
            <LockIcon />
          </span>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputWithIconClassName}
          />
        </div>
      </div>
      <FieldError message={error} />
      <Button type="submit" disabled={isSubmitting} className="w-full font-semibold">
        {isSubmitting ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  )
}

function RegisterForm() {
  const navigate = useNavigate()
  const { applySessionUser, refreshUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await register(email, password, name)
      applySessionUser(result.user)
      void refreshUser()
      navigate(homeFor(result.user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-name" className="text-small font-medium text-ink">
          Name
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3">
            <UserIcon />
          </span>
          <input
            id="register-name"
            type="text"
            autoComplete="name"
            placeholder="Your full name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputWithIconClassName}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-small font-medium text-ink">
          Email
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3">
            <MailIcon />
          </span>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputWithIconClassName}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-small font-medium text-ink">
          Password
        </label>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-3">
            <LockIcon />
          </span>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputWithIconClassName}
            aria-describedby="register-password-hint"
          />
        </div>
        <p id="register-password-hint" className="text-micro font-normal text-ink-2">
          At least 8 characters.
        </p>
      </div>
      <FieldError message={error} />
      <Button type="submit" disabled={isSubmitting} className="w-full font-semibold">
        {isSubmitting ? 'Creating account' : 'Create account'}
      </Button>
    </form>
  )
}

// For reviewers and visitors (4D.6): straight in, no registration. Demo
// accounts never join the study and have a capped AI allowance.
function TryDemo() {
  const navigate = useNavigate()
  const { applySessionUser, refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  async function handleClick() {
    setError(null)
    setIsStarting(true)
    try {
      const result = await startDemo()
      applySessionUser(result.user)
      void refreshUser()
      navigate(homeFor(result.user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the demo')
      setIsStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-rule bg-surface-sunk/70 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-micro font-semibold text-ink">Quick Sandbox Access</span>
        <span className="rounded-full border border-rule bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-2">
          No sign-up needed
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-1.5 bg-surface font-semibold hover:border-brand hover:text-brand"
        onClick={() => void handleClick()}
        disabled={isStarting}
      >
        <PlayRocketIcon />
        {isStarting ? 'Starting' : 'Explore without an account'}
      </Button>
      <p className="text-micro font-normal text-ink-2">
        A temporary account that lasts one day. It never counts as study data.
      </p>
      <FieldError message={error} />
    </div>
  )
}

export default function AuthPage() {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left showcase panel */}
      <section
        className="hidden flex-col justify-between border-r border-rule bg-ink p-10 lg:flex lg:w-[54%] xl:p-14"
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in srgb, var(--paper) 12%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <DSATutorLogo variant="inverted" showTagline />

        <div className="my-auto flex max-w-[500px] flex-col gap-6 py-8">
          <div className="flex flex-col gap-2.5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-paper/15 bg-paper/[0.08] px-3 py-1 font-mono text-[11px] font-medium text-paper/80">
              <span className="size-1.5 rounded-full bg-state-sorted" />
              Interactive CS Learning Environment
            </span>
            <h1 className="text-h1 text-paper">An algorithms course that watches you think.</h1>
            <p className="text-body text-paper/70">
              Every topic is worked in five stages, from watching it run to explaining it back.
              The tutor reads what you predict at each decision point and answers the mistake you
              actually made.
            </p>
          </div>

          <AuthTrace />

          {/* 3 Visual Feature Rows */}
          <ul className="grid grid-cols-1 gap-2">
            {PILLARS.map((pillar) => (
              <li
                key={pillar.title}
                className="flex items-start gap-2.5 rounded-md border border-paper/10 bg-paper/[0.04] px-3 py-2"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-paper/10">
                  <SparkCheckIcon />
                </span>
                <div className="min-w-0">
                  <p className="text-small font-semibold text-paper">{pillar.title}</p>
                  <p className="text-micro font-normal text-paper/60">{pillar.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-3 gap-3">
              {FIGURES.map((figure) => (
                <div
                  key={figure.label}
                  className="flex flex-col gap-0.5 rounded-md border border-paper/15 bg-paper/[0.06] px-3.5 py-2.5"
                >
                  <dt className="sr-only">{figure.label}</dt>
                  <dd className="font-mono text-[24px] leading-none font-bold text-paper">{figure.value}</dd>
                  <p className="mt-1 text-micro font-normal text-paper/65">{figure.label}</p>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-1.5 pt-1" aria-label="Five learning stages">
              {STAGES.map((stage, i) => (
                <span key={stage} className="inline-flex items-center gap-1.5">
                  <span className="rounded-full border border-paper/15 bg-paper/[0.08] px-2.5 py-0.5 font-mono text-[11px] font-medium text-paper/80">
                    {i + 1}. {stage}
                  </span>
                  {i < STAGES.length - 1 && (
                    <span className="font-mono text-[11px] text-paper/35" aria-hidden="true">
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-micro font-normal text-paper/45">
          Honours research project, Department of Computer Science, University of Namibia.
        </p>
      </section>

      {/* Right form panel */}
      <main className="flex flex-1 items-center justify-center bg-dot-grid px-6 py-12 sm:px-10">
        <div className="flex w-full max-w-[420px] flex-col gap-6 rounded-lg border border-t-4 border-rule border-t-brand bg-surface p-7 shadow-e2 sm:p-8">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <DSATutorLogo showTagline />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-h2 text-ink">Your account</h2>
            <p className="text-small text-ink-2">
              Sign in to pick up where you left the curriculum, or create one to start it.
            </p>
          </div>

          <Tabs defaultValue="login" className="gap-5">
            <TabsList className="h-auto w-full gap-1 rounded-md border border-rule bg-surface-sunk p-1">
              <TabsTrigger value="login" className={tabTriggerClassName}>
                Sign in
              </TabsTrigger>
              <TabsTrigger value="register" className={tabTriggerClassName}>
                Create account
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>

          <TryDemo />
        </div>
      </main>
    </div>
  )
}
