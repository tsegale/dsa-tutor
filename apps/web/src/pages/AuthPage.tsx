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
 * half is the form, as plain as it can be.
 *
 * There is no "I am a student / instructor" switch any more. It never
 * changed how the account authenticated, only where the browser went
 * afterwards, so an educator who forgot to flick it landed on the student
 * home. The server already returns the account's real role; that is what
 * decides now, and it cannot be got wrong.
 */

const TOPIC_COUNT = MODULES.reduce((total, module) => total + module.topics.length, 0)

// Each topic moves through these in order. Named here because the number is
// part of what the figures below are claiming.
const STAGES = ['Demo', 'Practice', 'Hands-On', 'Code', 'Feynman'] as const

const FIGURES = [
  { value: String(MODULES.length), label: 'modules' },
  { value: String(TOPIC_COUNT), label: 'topics' },
  { value: String(STAGES.length), label: 'stages each' },
]

const inputClassName =
  'w-full rounded-md border border-rule bg-surface px-3 py-2 text-body text-ink outline-none transition-colors placeholder:text-ink-placeholder focus:border-brand focus:ring-2 focus:ring-brand/20'

const tabTriggerClassName =
  'flex-1 rounded-none border-b-[1.5px] border-rule bg-transparent py-2.5 text-small font-medium text-ink-2 shadow-none transition-colors data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:text-ink data-[state=active]:shadow-none'

/** Where an account goes after it authenticates, by its real role. */
function homeFor(role: string): string {
  return role === 'EDUCATOR' || role === 'ADMIN' ? '/educator' : '/'
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-small text-error">
      {message}
    </p>
  )
}

function LoginForm() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
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
      await refreshUser()
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
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-small font-medium text-ink">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
        />
      </div>
      <FieldError message={error} />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  )
}

function RegisterForm() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
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
      // Self-registration always creates a STUDENT account (apps/api
      // auth.service.ts); educators are provisioned separately.
      const result = await register(email, password, name)
      await refreshUser()
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
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-small font-medium text-ink">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-small font-medium text-ink">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
          aria-describedby="register-password-hint"
        />
        <p id="register-password-hint" className="text-micro font-normal text-ink-2">
          At least 8 characters.
        </p>
      </div>
      <FieldError message={error} />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating account' : 'Create account'}
      </Button>
    </form>
  )
}

// For reviewers and visitors (4D.6): straight in, no registration. Demo
// accounts never join the study and have a capped AI allowance.
function TryDemo() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  async function handleClick() {
    setError(null)
    setIsStarting(true)
    try {
      const result = await startDemo()
      await refreshUser()
      navigate(homeFor(result.user.role))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the demo')
      setIsStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-rule" />
        <span className="text-micro text-ink-2">or</span>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => void handleClick()}
        disabled={isStarting}
      >
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
      {/* The evidence half. Inked ground with no brand colour inside it:
          the one saturated thing on this page should be the button you are
          meant to press. bg-ink/text-paper rather than a literal dark, so
          the panel inverts with the theme like the tooltip does. */}
      <section className="hidden flex-col justify-between bg-ink p-10 lg:flex lg:w-[52%] xl:p-14">
        <DSATutorLogo variant="inverted" showTagline />

        {/* my-auto rather than relying on justify-between alone: on a tall
            viewport that stranded the logo and the footer at the extremes
            with the argument floating in a lot of empty ground. */}
        <div className="my-auto flex max-w-[460px] flex-col gap-9 py-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-h1 text-paper">An algorithms course that watches you think.</h1>
            <p className="text-body text-paper/60">
              Every topic is worked in five stages, from watching it run to explaining it back.
              The tutor reads what you predict at each decision point and answers the mistake you
              actually made.
            </p>
          </div>

          <AuthTrace />

          <div className="flex flex-col gap-4">
            <dl className="flex gap-8">
              {FIGURES.map((figure) => (
                <div key={figure.label} className="flex flex-col gap-0.5">
                  <dt className="sr-only">{figure.label}</dt>
                  <dd className="font-mono text-[26px] leading-none text-paper">{figure.value}</dd>
                  <p className="text-micro font-normal text-paper/50">{figure.label}</p>
                </div>
              ))}
            </dl>
            <p className="font-mono text-[11px] text-paper/35">{STAGES.join('  ->  ')}</p>
          </div>
        </div>

        <p className="text-micro font-normal text-paper/40">
          Honours research project, Department of Computer Science, University of Namibia.
        </p>
      </section>

      {/* The form half. */}
      <main className="flex flex-1 items-center justify-center bg-paper px-6 py-12 sm:px-10">
        <div className="flex w-full max-w-[380px] flex-col gap-7">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <DSATutorLogo showTagline />
          </div>

          {/* Not "Sign in": that word is already the tab and the button,
              and saying it three times in one column reads as a mistake. */}
          <div className="flex flex-col gap-1">
            <h2 className="text-h2 text-ink">Your account</h2>
            <p className="text-small text-ink-2">
              Sign in to pick up where you left the curriculum, or create one to start it.
            </p>
          </div>

          <Tabs defaultValue="login" className="gap-6">
            <TabsList className="w-full gap-0 bg-transparent p-0">
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
