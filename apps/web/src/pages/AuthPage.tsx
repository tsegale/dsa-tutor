import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { login, register } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

type Role = 'student' | 'instructor'

const inputClassName =
  'w-full rounded-md border-2 border-border px-3 py-2 text-sm outline-none transition-colors focus:border-text-muted'

function ChartBarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BrainIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M9.5 3a3 3 0 0 0-3 3v.3A3 3 0 0 0 5 12a3 3 0 0 0 1.5 5.7V18a3 3 0 0 0 3 3M14.5 3a3 3 0 0 1 3 3v.3A3 3 0 0 1 19 12a3 3 0 0 1-1.5 5.7V18a3 3 0 0 1-3 3M9.5 3v18M14.5 3v18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowsExchangeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M3 8h13l-3-3M21 16H8l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChartLineIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SchoolIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        d="M12 3 2 8l10 5 10-5-10-5ZM6 10.5V16c0 1.1 2.7 3 6 3s6-1.9 6-3v-5.5M22 8v6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface Pillar {
  iconBg: string
  icon: React.ReactNode
  title: string
  desc: string
}

const PILLARS: Pillar[] = [
  {
    iconBg: '#4f46e5',
    icon: <BrainIcon />,
    title: 'Socratic AI guidance',
    desc: 'Real-time misconception feedback powered by Claude, not generic hints',
  },
  {
    iconBg: '#0f6e56',
    icon: <ArrowsExchangeIcon />,
    title: 'Active state manipulation',
    desc: 'Drag, swap, and execute array or tree operations directly on the canvas',
  },
  {
    iconBg: '#854f0b',
    icon: <ChartLineIcon />,
    title: 'Adaptive scaffolding (ZPD)',
    desc: 'Hints fade automatically as your mastery score rises, support only where needed',
  },
]

function LoginForm({ role }: { role: Role }) {
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
      await login(email, password)
      await refreshUser()
      navigate(role === 'instructor' ? '/educator' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm font-medium text-text-primary">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[#3730a3] hover:bg-[#3730a3]/90">
        {isSubmitting ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  )
}

function RegisterForm({ role }: { role: Role }) {
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
      await register(email, password, name)
      await refreshUser()
      navigate(role === 'instructor' ? '/educator' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-name" className="text-sm font-medium text-text-primary">
          Name
        </label>
        <input
          id="register-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-sm font-medium text-text-primary">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-[#3730a3] hover:bg-[#3730a3]/90">
        {isSubmitting ? 'Creating account...' : 'Register'}
      </Button>
    </form>
  )
}

export default function AuthPage() {
  const [role, setRole] = useState<Role>('student')

  return (
    <div className="flex h-screen w-full">
      <div
        className="hidden flex-col justify-between p-8 text-white md:flex"
        style={{ width: '45%', backgroundColor: '#3730a3' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-indigo-600">
            <ChartBarIcon />
          </div>
          <span className="text-[18px] font-medium text-white">DSA Tutor</span>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-6 py-8">
          <div>
            <h1 className="text-[22px] leading-[1.4] font-medium text-white">
              Master data structures through adaptive AI scaffolding and active state manipulation
            </h1>
            <p className="mt-3 text-[13px] leading-[1.6] text-[#a5b4fc]">
              A research-grade ITS grounded in Vygotsky's Zone of Proximal Development, not a passive visualiser
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="flex gap-2.5 rounded-[10px] p-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)' }}
              >
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: pillar.iconBg }}
                >
                  {pillar.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#e0e7ff]">{pillar.title}</p>
                  <p className="mt-0.5 text-[11px] leading-[1.4] text-[#a5b4fc]">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center bg-white p-10">
        <div className="w-full max-w-[320px]">
          <h1 className="mb-6 text-center text-lg font-semibold text-text-primary md:hidden">DSA Tutor</h1>

          <div className="mb-4">
            <p className="mb-2 text-[11px] font-medium tracking-wide text-text-muted uppercase">I am a</p>
            <div className="flex gap-0.5 rounded-lg border-[0.5px] border-border bg-surface p-[3px]">
              {(['student', 'instructor'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors',
                    role === option
                      ? 'border-[0.5px] border-border bg-white text-[#3730a3]'
                      : 'border-[0.5px] border-transparent text-text-secondary',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="w-full bg-transparent p-0">
              <TabsTrigger
                value="login"
                className="flex-1 rounded-none border-b-2 border-transparent bg-transparent text-text-secondary shadow-none data-[state=active]:border-[#3730a3] data-[state=active]:bg-transparent data-[state=active]:text-[#3730a3] data-[state=active]:shadow-none"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="flex-1 rounded-none border-b-2 border-transparent bg-transparent text-text-secondary shadow-none data-[state=active]:border-[#3730a3] data-[state=active]:bg-transparent data-[state=active]:text-[#3730a3] data-[state=active]:shadow-none"
              >
                Register
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm role={role} />
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <RegisterForm role={role} />
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-3">
            <div className="h-[0.5px] flex-1 bg-border" />
            <span className="text-[11px] text-text-muted">or</span>
            <div className="h-[0.5px] flex-1 bg-border" />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border-[0.5px] border-border bg-transparent py-2 text-xs text-text-primary hover:bg-surface"
          >
            <SchoolIcon />
            Continue with university SSO
          </button>

          <p className="mt-4 text-center text-[11px] text-text-muted">
            Forgot password?{' '}
            <button type="button" className="font-medium text-[#3730a3] hover:underline">
              Reset it
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
